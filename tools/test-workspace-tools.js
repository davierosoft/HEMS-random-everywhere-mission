#!/usr/bin/env node

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { assertCicersBranch, currentBranch } = require('./assert-cicers-branch');
const { pushedBranchTargets, unsafePushTargets } = require('./assert-safe-push');
const { analyzeScope, createBaselineRecord, scopeViolations, validateBaselineRecord } = require('./check-mission-scope');
const { assertBuildIntent, compareRelease, markBuildConsumed, readIntent } = require('./release-contract');
const { amendPreparedRelease, beginRelease, createLocalTestArtifact } = require('./release-workflow');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(action, pattern, message) {
  try {
    action();
  } catch (error) {
    assert(pattern.test(error.message), `${message}: unexpected error ${error.message}`);
    return;
  }
  throw new Error(`${message}: expected an error`);
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hems-workspace-tools-'));
try {
  const gitDirectory = path.join(temporaryRoot, '.git');
  fs.mkdirSync(gitDirectory);
  fs.writeFileSync(path.join(gitDirectory, 'HEAD'), 'ref: refs/heads/main\n');
  assert(currentBranch(temporaryRoot) === 'main', 'branch reader did not resolve main');
  expectThrow(() => assertCicersBranch(temporaryRoot), /expected CICERS/, 'main branch guard');

  fs.writeFileSync(path.join(gitDirectory, 'HEAD'), 'ref: refs/heads/CICERS/tool-test\n');
  assert(assertCicersBranch(temporaryRoot) === 'CICERS/tool-test', 'CICERS branch guard rejected a valid branch');

  fs.writeFileSync(path.join(gitDirectory, 'HEAD'), '0123456789abcdef\n');
  expectThrow(() => assertCicersBranch(temporaryRoot), /detached HEAD/, 'detached-head guard');
} finally {
  const resolvedTemporary = path.resolve(temporaryRoot);
  assert(resolvedTemporary.startsWith(path.resolve(os.tmpdir())), 'refusing to remove a temporary directory outside the OS temp root');
  fs.rmSync(resolvedTemporary, { recursive: true, force: true });
}

const before = { title: 'A', macros: { alpha: [1], beta: [2] }, data: { profile: { value: 1 } } };
const after = { title: 'A', macros: { alpha: [9], beta: [2] }, data: { profile: { value: 2 } } };
const scope = analyzeScope(before, after);
assert(isDeepStrictEqual(scope.rootChanges, []), 'scope checker reported an unchanged root');
assert(isDeepStrictEqual(scope.macroChanges, ['alpha']), 'scope checker missed a macro change');
assert(isDeepStrictEqual(scope.dataChanges, ['profile']), 'scope checker missed a data change');
assert(isDeepStrictEqual(scopeViolations(scope, { roots: [], macros: ['alpha'], data: [] }), ['data:profile']), 'scope allowlist did not reject the unlisted data change');
assert(scopeViolations(scope, { roots: [], macros: ['alpha'], data: ['profile'] }).length === 0, 'scope allowlist rejected declared changes');

const missionText = JSON.stringify(before);
const baseline = createBaselineRecord('CICERS/tool-test', missionText, '2026-01-01T00:00:00.000Z');
assert(validateBaselineRecord(baseline, 'CICERS/tool-test') === baseline, 'valid baseline was rejected');
expectThrow(() => validateBaselineRecord({ ...baseline, branch: 'CICERS/other' }, 'CICERS/tool-test'), /belongs to/, 'cross-branch baseline');
expectThrow(() => validateBaselineRecord({ ...baseline, mission: `${missionText} ` }, 'CICERS/tool-test'), /payload\/hash mismatch/, 'tampered baseline');

const safePush = 'refs/heads/CICERS/tool-test abc refs/heads/CICERS/tool-test def\n';
assert(isDeepStrictEqual(pushedBranchTargets(safePush), ['refs/heads/CICERS/tool-test']), 'push parser missed the CICERS destination');
assert(unsafePushTargets(safePush).length === 0, 'push guard rejected a CICERS destination');
assert(isDeepStrictEqual(unsafePushTargets('refs/heads/CICERS/tool-test abc refs/heads/main def\n'), ['refs/heads/main']), 'push guard did not reject main');
assert(isDeepStrictEqual(unsafePushTargets('refs/heads/CICERS/tool-test abc refs/heads/release def\n'), ['refs/heads/release']), 'push guard did not reject another non-CICERS branch');
expectThrow(() => pushedBranchTargets('malformed input\n'), /malformed/, 'malformed pre-push input');

const releaseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hems-release-workflow-'));
const releaseAssignment = (build) => ({ set: { var: ['L:RELEASE_BUILD', 'number'] }, value: build });
const releaseArtifact = (build) => `${JSON.stringify({ title: `HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 ${build}`, macros: { objective1: [releaseAssignment(build)] }, data: {} }, null, 2)}\n`;
const releaseSource = (build) => `${JSON.stringify({ objective1: [releaseAssignment(build)] }, null, 2)}\n`;
try {
  fs.mkdirSync(path.join(releaseRoot, '.git'));
  fs.mkdirSync(path.join(releaseRoot, 'mission-src', 'macros'), { recursive: true });
  fs.writeFileSync(path.join(releaseRoot, '.git', 'HEAD'), 'ref: refs/heads/CICERS/release-test\n');
  fs.writeFileSync(path.join(releaseRoot, 'everywhere_all.json'), releaseArtifact(111));
  fs.writeFileSync(path.join(releaseRoot, 'mission-src', 'macros', '11-mission-lifecycle.json'), releaseSource(111));
  fs.writeFileSync(path.join(releaseRoot, 'CHANGELOG.en.md'), '## Release 0.997 111\n\n- Previous release.\n');
  const releaseIntent = beginRelease(releaseRoot, '0.997 112', 'Release workflow gate test.', { roots: ['title'], macros: ['example macro'], data: [] });
  assert(releaseIntent.status === 'prepared' && releaseIntent.release === '0.997 112', 'release workflow did not prepare the next release');
  assert(releaseIntent.scope.macros.includes('objective1'), 'release workflow did not declare the automatic runtime build update');
  const preparedArtifact = fs.readFileSync(path.join(releaseRoot, 'everywhere_all.json'), 'utf8');
  assert(preparedArtifact.includes('0.997 112'), 'release workflow did not update the artifact title');
  assert(fs.readFileSync(path.join(releaseRoot, 'mission-src', 'macros', '11-mission-lifecycle.json'), 'utf8').includes('"value": 112'), 'release workflow did not update the runtime build LVAR source');
  assert(fs.readFileSync(path.join(releaseRoot, 'CHANGELOG.en.md'), 'utf8').startsWith('## Release 0.997 112'), 'release workflow did not update the changelog heading');
  const amendedIntent = amendPreparedRelease(releaseRoot, 'Declare a late macro.', { roots: ['title'], macros: ['late macro'], data: ['late data'] });
  assert(amendedIntent.status === 'prepared' && amendedIntent.scope.macros.includes('example macro') && amendedIntent.scope.macros.includes('late macro') && amendedIntent.scope.data.includes('late data'), 'prepared release amendment did not merge declared scope');
  assert(fs.readFileSync(path.join(releaseRoot, 'CHANGELOG.en.md'), 'utf8').includes('- Declare a late macro.'), 'prepared release amendment did not record its note');
  expectThrow(() => assertBuildIntent(releaseRoot, preparedArtifact, { purpose: 'build' }), /runtime release build mismatch/, 'build rejects a title with a stale runtime build');
  const builtArtifact = releaseArtifact(112);
  fs.writeFileSync(path.join(releaseRoot, 'everywhere_all.json'), builtArtifact);
  assert(assertBuildIntent(releaseRoot, builtArtifact, { purpose: 'build' }).release === '0.997 112', 'prepared release intent did not authorize build');
  expectThrow(() => beginRelease(releaseRoot, '0.997 112', 'Duplicate release.', { roots: ['title'], macros: ['example macro'], data: [] }), /still prepared/, 'active release intent');
  markBuildConsumed(releaseRoot, builtArtifact);
  assert(readIntent(releaseRoot).status === 'built', 'local build did not consume the release intent');
  expectThrow(() => assertBuildIntent(releaseRoot, builtArtifact, { purpose: 'build' }), /is built/, 'reused local build intent');
  assert(assertBuildIntent(releaseRoot, builtArtifact, { purpose: 'static' }).release === '0.997 112', 'built release intent did not authorize static checks');
  const localTestArtifact = createLocalTestArtifact(releaseRoot, { ...releaseIntent, status: 'static_pass', staticVerifiedAt: '2026-01-01T00:00:00.000Z' }, builtArtifact);
  assert(path.basename(localTestArtifact) === 'everywhere_all.json' && fs.readFileSync(localTestArtifact, 'utf8') === builtArtifact, 'static verification did not create the local test artifact');
  assert(fs.readFileSync(path.join(path.dirname(localTestArtifact), 'test-receipt.json'), 'utf8').includes('LOCAL_TEST'), 'local test artifact is missing its non-runtime receipt');
  const nextIntent = beginRelease(releaseRoot, '0.997 113', 'Next local build.', { roots: ['title'], macros: ['example macro'], data: [] });
  assert(nextIntent.status === 'prepared' && nextIntent.release === '0.997 113', 'higher local build did not supersede the consumed build');
  assert(fs.readFileSync(path.join(releaseRoot, 'mission-src', 'macros', '11-mission-lifecycle.json'), 'utf8').includes('"value": 113'), 'higher local build did not update the runtime build LVAR source');
  const pendingNextArtifact = fs.readFileSync(path.join(releaseRoot, 'everywhere_all.json'), 'utf8');
  assert(pendingNextArtifact.includes('0.997 113'), 'higher local build did not update the artifact title');
  expectThrow(() => assertBuildIntent(releaseRoot, pendingNextArtifact, { purpose: 'build' }), /runtime release build mismatch/, 'next build rejects stale artifact runtime identity');
  const nextArtifact = releaseArtifact(113);
  fs.writeFileSync(path.join(releaseRoot, 'everywhere_all.json'), nextArtifact);
  assert(assertBuildIntent(releaseRoot, nextArtifact, { purpose: 'build' }).release === '0.997 113', 'higher local build did not authorize the matching runtime identity');
  expectThrow(() => compareRelease('0.997 112', 'broken'), /invalid release/, 'release identity parser');
  fs.writeFileSync(path.join(releaseRoot, 'CHANGELOG.en.md'), '## Release 0.997 111\n');
  expectThrow(() => assertBuildIntent(releaseRoot, nextArtifact, { purpose: 'build' }), /identity mismatch/, 'build rejects stale changelog identity');
} finally {
  fs.rmSync(releaseRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({
  result: 'PASS',
  scenarios: ['main-branch-block', 'CICERS-branch-allow', 'detached-head-block', 'scope-detection', 'scope-allowlist', 'baseline-branch-binding', 'baseline-integrity', 'safe-push-target', 'main-push-block', 'non-CICERS-push-block', 'malformed-push-input', 'release-begin', 'runtime-build-lvar-update', 'stale-runtime-build-rejection', 'mandatory-local-test-artifact', 'release-intent-build-authorisation', 'prepared-release-scope-amendment', 'local-build-intent-consumption', 'next-local-build-progression', 'release-identity-rejection'],
}, null, 2));
