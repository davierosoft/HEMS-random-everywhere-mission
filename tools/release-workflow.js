#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertCicersBranch } = require('./assert-cicers-branch');
const { analyzeScope, readBaseline, scopeViolations } = require('./check-mission-scope');
const {
  assertBuildIntent,
  assertReleaseIdentity,
  compareRelease,
  intentPath,
  parseRelease,
  readIntent,
  sha256,
  writeIntent,
} = require('./release-contract');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT = path.join(ROOT, 'everywhere_all.json');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.en.md');

function valuesAfter(argv, option) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== option) continue;
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${option} requires a value`);
    values.push(value);
  }
  return values;
}

function oneValue(argv, option) {
  const values = valuesAfter(argv, option);
  if (values.length !== 1) throw new Error(`${option} must be provided exactly once`);
  return values[0];
}

function ascii(value, label) {
  if (!value || !/^[\x20-\x7E\r\n\t]+$/.test(value)) throw new Error(`${label} must be non-empty ASCII text`);
  return value.trim();
}

function writeTextAtomic(file, text) {
  const temporary = `${file}.codex-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, text);
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function runNodeGate(repositoryRoot, script) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { cwd: repositoryRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} failed with exit status ${result.status}`);
}

function releaseScope(argv) {
  const scope = {
    roots: ['title', ...valuesAfter(argv, '--allow-root')],
    macros: valuesAfter(argv, '--allow-macro'),
    data: valuesAfter(argv, '--allow-data'),
  };
  scope.roots = [...new Set(scope.roots)];
  scope.macros = [...new Set(scope.macros)];
  scope.data = [...new Set(scope.data)];
  if (scope.macros.length + scope.data.length + scope.roots.filter((key) => key !== 'title').length === 0) {
    throw new Error('declare at least one requested macro, data key, or non-title root key');
  }
  return scope;
}

function updateRuntimeReleaseBuild(repositoryRoot, build) {
  const source = path.join(repositoryRoot, 'mission-src', 'macros', '11-mission-lifecycle.json');
  const text = fs.readFileSync(source, 'utf8');
  const pattern = /("set"\s*:\s*\{\s*"var"\s*:\s*\[\s*"L:RELEASE_BUILD"\s*,\s*"number"\s*\]\s*\}\s*,\s*"value"\s*:\s*)\d+/g;
  const matches = [...text.matchAll(pattern)];
  if (matches.length !== 1) throw new Error(`expected exactly one L:RELEASE_BUILD assignment in ${path.relative(repositoryRoot, source)}`);
  writeTextAtomic(source, text.replace(pattern, `$1${build}`));
}

function updateRuntimeReleaseIdentity(repositoryRoot, release) {
  const source = path.join(repositoryRoot, 'mission-src', 'macros', '01-bootstrap-settings.json');
  if (!fs.existsSync(source)) return;
  const text = fs.readFileSync(source, 'utf8');
  const pattern = /("set"\s*:\s*\{\s*"local"\s*:\s*"RELEASE_IDENTITY"\s*\}\s*,\s*"value"\s*:\s*)"[^"]*"/;
  if (!pattern.test(text)) throw new Error(`runtime release identity assignment is missing in ${path.relative(repositoryRoot, source)}`);
  writeTextAtomic(source, text.replace(pattern, `$1${JSON.stringify(release)}`));
}

function replaceArtifactTitle(artifact, oldTitle, newTitle) {
  const titlePattern = /^(\s*"title"\s*:\s*)"([^"\r\n]*)"/m;
  const match = titlePattern.exec(artifact);
  if (!match || match[2] !== oldTitle) throw new Error('artifact root title is missing or changed unexpectedly');
  return artifact.replace(titlePattern, `${match[1]}${JSON.stringify(newTitle)}`);
}

function beginRelease(repositoryRoot, release, note, scope) {
  const currentIntentPath = intentPath(repositoryRoot);
  if (fs.existsSync(currentIntentPath)) {
    const existing = readIntent(repositoryRoot);
    if (existing.status === 'prepared') throw new Error(`release ${existing.release} is still prepared; build it or intentionally retire it before starting another release`);
    if (compareRelease(release, existing.release) <= 0) throw new Error(`release ${release} must be higher than prior ${existing.release}`);
  }

  const artifact = fs.readFileSync(path.join(repositoryRoot, 'everywhere_all.json'), 'utf8');
  const identity = assertReleaseIdentity(repositoryRoot, artifact);
  const ledgerPath = path.join(repositoryRoot, 'tools', 'release-ledger.json');
  if (fs.existsSync(ledgerPath)) {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    if (ledger.schema !== 1 || typeof ledger.lastSuppliedRelease !== 'string') throw new Error('invalid release ledger');
    if (compareRelease(release, ledger.lastSuppliedRelease) <= 0) {
      throw new Error(`release ${release} must be higher than last supplied release ${ledger.lastSuppliedRelease}`);
    }
  }
  if (compareRelease(release, identity.release) <= 0) throw new Error(`release ${release} must be higher than current ${identity.release}`);

  const newTitle = identity.mission.title.replace(/\d+\.\d+\s+\d+(?:\.\d+)?\s*$/, release);
  const updatedArtifact = replaceArtifactTitle(artifact, identity.mission.title, newTitle);
  JSON.parse(updatedArtifact);
  const changelogPath = path.join(repositoryRoot, 'CHANGELOG.en.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const updatedChangelog = `## Release ${release}\n\n- ${note}\n\n${changelog}`;
  const scopedMacros = [...new Set(['objective1', ...scope.macros])];
  scope = { ...scope, macros: scopedMacros };

  updateRuntimeReleaseBuild(repositoryRoot, parseRelease(release).build);
  updateRuntimeReleaseIdentity(repositoryRoot, release);
  writeTextAtomic(changelogPath, updatedChangelog);
  writeTextAtomic(path.join(repositoryRoot, 'everywhere_all.json'), updatedArtifact);
  const intent = {
    schema: 1,
    kind: 'release',
    release,
    status: 'prepared',
    createdAt: new Date().toISOString(),
    scope,
    note,
    preparedArtifactSha256: sha256(updatedArtifact),
  };
  writeIntent(repositoryRoot, intent);
  return intent;
}

function beginDraft(repositoryRoot, note, scope) {
  const currentIntentPath = intentPath(repositoryRoot);
  if (fs.existsSync(currentIntentPath) && readIntent(repositoryRoot).status === 'prepared') {
    throw new Error('a build intent is still prepared; build it or intentionally retire it before starting a draft');
  }
  const artifact = fs.readFileSync(path.join(repositoryRoot, 'everywhere_all.json'), 'utf8');
  const identity = assertReleaseIdentity(repositoryRoot, artifact);
  const intent = {
    schema: 1,
    kind: 'draft',
    draftId: `draft-${Date.now()}`,
    release: identity.release,
    status: 'prepared',
    createdAt: new Date().toISOString(),
    scope: { ...scope, macros: [...new Set(['objective1', ...scope.macros])] },
    note,
    preparedArtifactSha256: sha256(artifact),
  };
  writeIntent(repositoryRoot, intent);
  return intent;
}

function amendPreparedRelease(repositoryRoot, note, scope) {
  const intent = readIntent(repositoryRoot);
  if (!['prepared', 'built'].includes(intent.status)) throw new Error(`release ${intent.release} is ${intent.status}; only a prepared or unverified built release can be amended`);
  const amendment = ascii(note, 'amendment note');
  const mergedScope = {
    roots: [...new Set([...(intent.scope.roots || []), ...scope.roots])],
    macros: [...new Set(['objective1', ...(intent.scope.macros || []), ...scope.macros])],
    data: [...new Set([...(intent.scope.data || []), ...scope.data])],
  };
  const changelogPath = path.join(repositoryRoot, 'CHANGELOG.en.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const header = `## Release ${intent.release}\n\n`;
  if (!changelog.startsWith(header)) throw new Error(`release ${intent.release} is not the current changelog heading`);
  const updatedChangelog = changelog.replace(header, `${header}- ${amendment}\n`);
  intent.scope = mergedScope;
  intent.note = `${intent.note} ${amendment}`;
  if (intent.kind === 'draft') {
    intent.status = 'prepared';
    delete intent.builtAt;
    delete intent.builtArtifactSha256;
  }
  intent.amendedAt = new Date().toISOString();
  writeTextAtomic(changelogPath, updatedChangelog);
  writeIntent(repositoryRoot, intent);
  return intent;
}

function createLocalTestArtifact(repositoryRoot, intent, artifact) {
  if (intent.kind === 'draft') {
    const canonical = path.join(repositoryRoot, 'everywhere_all.json');
    if (fs.readFileSync(canonical, 'utf8') !== artifact) {
      throw new Error('draft verification must reference the current canonical artifact');
    }
    return canonical;
  }
  const outputDirectory = path.join(repositoryRoot, 'outputs', `${intent.release.replace(' ', '-')}-local-test`);
  const artifactPath = path.join(outputDirectory, 'everywhere_all.json');
  const receiptPath = path.join(outputDirectory, 'test-receipt.json');
  if (fs.existsSync(outputDirectory)) {
    if (!fs.existsSync(artifactPath) || fs.readFileSync(artifactPath, 'utf8') !== artifact) {
      throw new Error(`local test artifact already exists with different contents: ${outputDirectory}`);
    }
  } else {
    fs.mkdirSync(outputDirectory, { recursive: true });
    writeTextAtomic(artifactPath, artifact);
  }
  writeTextAtomic(receiptPath, `${JSON.stringify({
    schema: 1,
    kind: 'LOCAL_TEST',
    release: intent.release,
    artifact: 'everywhere_all.json',
    artifactSha256: sha256(artifact),
    staticVerifiedAt: intent.staticVerifiedAt,
    runtimeValidation: 'NOT RUN',
    createdAt: new Date().toISOString(),
  }, null, 2)}\n`);
  return artifactPath;
}

function verifyStatic(repositoryRoot) {
  const intent = assertBuildIntent(repositoryRoot, fs.readFileSync(path.join(repositoryRoot, 'everywhere_all.json'), 'utf8'), { purpose: 'static' });
  const branch = assertCicersBranch(repositoryRoot);
  const baseline = readBaseline(branch);
  const before = JSON.parse(baseline.mission);
  const artifact = fs.readFileSync(path.join(repositoryRoot, 'everywhere_all.json'), 'utf8');
  const after = JSON.parse(artifact);
  const scope = analyzeScope(before, after);
  const violations = scopeViolations(scope, intent.scope);
  if (violations.length) throw new Error(`undeclared semantic scope: ${violations.join(', ')}`);

  require('./mission-workspace').check();
  runNodeGate(repositoryRoot, 'check-workspace.js');
  intent.status = 'static_pass';
  intent.staticVerifiedAt = new Date().toISOString();
  intent.staticArtifactSha256 = sha256(artifact);
  const localTestArtifact = createLocalTestArtifact(repositoryRoot, intent, artifact);
  intent.localTestArtifact = path.relative(repositoryRoot, localTestArtifact).replace(/\\/g, '/');
  writeIntent(repositoryRoot, intent);
  return { intent, localTestArtifact, scope };
}

function packageRelease(repositoryRoot, runtimeSignoff) {
  const artifact = fs.readFileSync(path.join(repositoryRoot, 'everywhere_all.json'), 'utf8');
  const intent = assertBuildIntent(repositoryRoot, artifact, { purpose: 'package' });
  if (sha256(artifact) !== intent.staticArtifactSha256) throw new Error('artifact changed after static verification; rebuild and rerun the static gate');
  const identity = assertReleaseIdentity(repositoryRoot, artifact);
  if (identity.release !== intent.release) throw new Error('artifact release changed after static verification');

  const outputDirectory = path.join(repositoryRoot, 'outputs', intent.release.replace(' ', '-'));
  if (fs.existsSync(outputDirectory)) throw new Error(`delivery directory already exists: ${outputDirectory}`);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const artifactPath = path.join(outputDirectory, 'everywhere_all.json');
  const receiptPath = path.join(outputDirectory, 'release-receipt.json');
  writeTextAtomic(artifactPath, artifact);
  writeTextAtomic(receiptPath, `${JSON.stringify({
    schema: 1,
    release: intent.release,
    artifact: 'everywhere_all.json',
    artifactSha256: sha256(artifact),
    staticVerifiedAt: intent.staticVerifiedAt,
    runtimeSignoff,
    packagedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  intent.status = 'packaged';
  intent.packagedAt = new Date().toISOString();
  intent.deliveryPath = path.relative(repositoryRoot, artifactPath).replace(/\\/g, '/');
  writeIntent(repositoryRoot, intent);
  return { intent, artifactPath };
}

function printHelp() {
  console.log('Usage:\n  node tools/release-workflow.js draft --note "ASCII draft note" --allow-macro "name" [--allow-data "name"] [--allow-root "name"]\n  node tools/release-workflow.js begin --release "0.997 112" --note "ASCII delivery note" --allow-macro "name" [--allow-data "name"] [--allow-root "name"]\n  node tools/release-workflow.js amend --note "ASCII amendment note" --allow-macro "name" [--allow-data "name"] [--allow-root "name"]\n  node tools/mission-workspace.js build\n  node tools/release-workflow.js static (drafts verify the canonical file without copying; releases create the requested local-test artifact)\n  node tools/release-workflow.js package --runtime-signoff "User-confirmed simulator scenarios"\n  node tools/release-workflow.js status');
}

function main(argv = process.argv.slice(2)) {
  const command = argv[0];
  if (!command || command === '--help' || command === '-h') return printHelp();
  assertCicersBranch(ROOT);
  if (command === 'draft') {
    const intent = beginDraft(ROOT, ascii(oneValue(argv, '--note'), 'draft note'), releaseScope(argv));
    console.log(JSON.stringify({ result: 'DRAFT PREPARED', release: intent.release, draftId: intent.draftId, scope: intent.scope }, null, 2));
  } else if (command === 'begin') {
    const intent = beginRelease(ROOT, oneValue(argv, '--release'), ascii(oneValue(argv, '--note'), 'release note'), releaseScope(argv));
    console.log(JSON.stringify({ result: 'PREPARED', release: intent.release, scope: intent.scope }, null, 2));
  } else if (command === 'amend') {
    const intent = amendPreparedRelease(ROOT, oneValue(argv, '--note'), releaseScope(argv));
    console.log(JSON.stringify({ result: 'AMENDED', release: intent.release, scope: intent.scope }, null, 2));
  } else if (command === 'static') {
    const result = verifyStatic(ROOT);
    console.log(JSON.stringify({ result: 'STATIC PASS', release: result.intent.release, localTestArtifact: result.localTestArtifact, scope: result.scope }, null, 2));
  } else if (command === 'package') {
    const result = packageRelease(ROOT, ascii(oneValue(argv, '--runtime-signoff'), 'runtime signoff'));
    console.log(JSON.stringify({ result: 'PACKAGED', release: result.intent.release, artifact: result.artifactPath }, null, 2));
  } else if (command === 'status') {
    const intent = readIntent(ROOT);
    console.log(JSON.stringify({ result: 'STATUS', ...intent }, null, 2));
  } else {
    throw new Error(`unknown release workflow command: ${command}`);
  }
}

module.exports = { amendPreparedRelease, beginDraft, beginRelease, createLocalTestArtifact, packageRelease, releaseScope, replaceArtifactTitle, runNodeGate, updateRuntimeReleaseBuild, verifyStatic };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Release workflow FAIL: ${error.message}.`);
    process.exit(1);
  }
}
