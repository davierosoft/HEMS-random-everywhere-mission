#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(ROOT, 'mission-src');
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const exists = (relative) => fs.existsSync(path.join(ROOT, relative));

const manifest = JSON.parse(read('mission-src/manifest.json'));
const mission = JSON.parse(read('everywhere_all.json'));
const packageJson = JSON.parse(read('package.json'));
const workspaceMap = read('docs/WORKSPACE_MAP.md');
const sourceReadme = read('mission-src/README.md');

function collectSection(sectionName, orderProperty) {
  const definitions = manifest.modules?.[sectionName] || [];
  const seenFiles = new Set();
  const seenKeys = new Map();
  let largestModuleBytes = 0;

  for (const definition of definitions) {
    expect(typeof definition.description === 'string' && definition.description.trim().length > 0, `${sectionName} module ${definition.file} has no description`);
    expect(!seenFiles.has(definition.file), `${sectionName} module is duplicated: ${definition.file}`);
    seenFiles.add(definition.file);
    const relative = `mission-src/${definition.file}`;
    expect(exists(relative), `manifest module is missing: ${relative}`);
    expect(workspaceMap.includes(path.basename(definition.file)), `workspace map omits ${definition.file}`);
    if (!exists(relative)) continue;

    const stat = fs.statSync(path.join(ROOT, relative));
    largestModuleBytes = Math.max(largestModuleBytes, stat.size);
    expect(stat.size <= 1024 * 1024, `${relative} exceeds the 1 MiB focused-module limit`);
    const parsed = JSON.parse(read(relative));
    for (const key of Object.keys(parsed)) {
      expect(!seenKeys.has(key), `${sectionName}.${key} is duplicated in ${seenKeys.get(key)} and ${definition.file}`);
      seenKeys.set(key, definition.file);
    }
  }

  const order = manifest[orderProperty] || [];
  expect(new Set(order).size === order.length, `${orderProperty} contains duplicate keys`);
  expect(isDeepStrictEqual(new Set(order), new Set(seenKeys.keys())), `${orderProperty} does not match keys present in ${sectionName} modules`);
  return { moduleCount: definitions.length, entryCount: seenKeys.size, largestModuleBytes };
}

const macros = collectSection('macros', 'macroOrder');
const data = collectSection('data', 'dataOrder');

expect(macros.entryCount === Object.keys(mission.macros || {}).length, 'modular macro count differs from the deployed artifact');
expect(data.entryCount === Object.keys(mission.data || {}).length, 'modular data count differs from the deployed artifact');
expect(sourceReadme.includes(`${macros.moduleCount} subsystem files`) && sourceReadme.includes(`all ${macros.entryCount} command macros`), 'mission-src README macro counts are stale');
expect(sourceReadme.includes(`${data.moduleCount} files`) && sourceReadme.includes(`all ${data.entryCount} persistent tables`), 'mission-src README data counts are stale');

const artifactOnly = Object.keys(mission).filter((key) => !manifest.modularSections.includes(key));
expect(isDeepStrictEqual(artifactOnly, manifest.artifactOnlySections), 'artifactOnlySections is stale or reordered');
expect(isDeepStrictEqual(manifest.modularSections, ['macros', 'data']), 'only macros and data may be modular without updating the assembler contract');
expect(manifest.format?.macros?.headers?.length === macros.entryCount, 'macro formatting metadata count is stale');
expect(manifest.format?.data?.headers?.length === data.entryCount, 'data formatting metadata count is stale');

for (const [name, command] of Object.entries(packageJson.scripts || {})) {
  const match = command.match(/^node\s+([^\s]+)/);
  if (match) expect(exists(match[1]), `package script ${name} references missing ${match[1]}`);
}
expect(packageJson.scripts?.test === 'node tools/check-workspace.js', 'npm test must remain the complete workspace gate');
expect(exists('.githooks/pre-commit'), 'pre-commit safeguard is missing');
expect(exists('.githooks/pre-push'), 'pre-push safeguard is missing');
expect(exists('.gitattributes'), 'line-ending and binary-file policy is missing');
expect(packageJson.scripts?.['hooks:install'] === 'git config core.hooksPath .githooks', 'hook installation script is missing or inconsistent');

if (exists('.githooks/pre-commit')) {
  const preCommit = read('.githooks/pre-commit');
  for (const command of ['node tools/assert-cicers-branch.js', 'node tools/check-workspace.js', 'git diff --cached --check']) {
    expect(preCommit.includes(command), `pre-commit safeguard omits: ${command}`);
  }
}
if (exists('.githooks/pre-push')) {
  expect(read('.githooks/pre-push').includes('node tools/assert-safe-push.js'), 'pre-push safeguard does not invoke the push-target guard');
}
if (exists('.gitattributes')) {
  const attributes = read('.gitattributes');
  for (const rule of ['*.js text eol=lf', '*.json text eol=lf', '*.md text eol=lf', '*.sh text eol=lf', '*.wav binary']) {
    expect(attributes.includes(rule), `.gitattributes omits: ${rule}`);
  }
}

const requiredAgents = ['AGENTS.md', 'docs/AGENTS.md', 'docs/testing/AGENTS.md', 'mission-src/AGENTS.md', 'tools/AGENTS.md'];
for (const file of requiredAgents) expect(exists(file), `required guidance file is missing: ${file}`);
const agentSizes = Object.fromEntries(requiredAgents.filter(exists).map((file) => [file, Buffer.byteLength(read(file))]));
expect((agentSizes['AGENTS.md'] || 0) <= 8192, 'root AGENTS.md exceeds the 8 KiB concise-guidance limit');
for (const [file, size] of Object.entries(agentSizes)) {
  if (file !== 'AGENTS.md') expect(size <= 4096, `${file} exceeds the 4 KiB nested-guidance limit`);
}
const chains = [
  ['AGENTS.md'],
  ['AGENTS.md', 'docs/AGENTS.md'],
  ['AGENTS.md', 'docs/AGENTS.md', 'docs/testing/AGENTS.md'],
  ['AGENTS.md', 'mission-src/AGENTS.md'],
  ['AGENTS.md', 'tools/AGENTS.md'],
];
for (const chain of chains) {
  const bytes = chain.reduce((total, file) => total + (agentSizes[file] || 0), 0);
  expect(bytes < 32768, `AGENTS chain exceeds Codex's default 32 KiB limit: ${chain.join(' -> ')}`);
}

const markdownFiles = [];
function collectMarkdown(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === '.workspace-state') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectMarkdown(absolute);
    else if (entry.name.endsWith('.md')) markdownFiles.push(absolute);
  }
}
collectMarkdown(ROOT);
const retiredNames = ['HANDOFF_CHATGPT_SOL.md', 'HANDOFF_SOL_MULTI_PATIENT_ARCHITECTURE.md'];
for (const retired of retiredNames) {
  expect(!exists(retired), `retired handoff still exists: ${retired}`);
  const references = markdownFiles.filter((file) => fs.readFileSync(file, 'utf8').includes(retired));
  expect(references.length === 0, `retired handoff is still referenced: ${retired}`);
}

for (const required of [
  'docs/WORKSPACE_MAP.md',
  'docs/testing/RUNTIME_VALIDATION.md',
  'DEVELOPMENT_RELEASE_CHECKLIST.md',
  'tools/mission-workspace.js',
  'tools/check-mission-scope.js',
  'tools/assert-safe-push.js',
]) expect(exists(required), `required workspace contract is missing: ${required}`);

if (errors.length) {
  console.error(JSON.stringify({ result: 'FAIL', errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  result: 'PASS',
  macroModules: macros.moduleCount,
  macros: macros.entryCount,
  dataModules: data.moduleCount,
  dataEntries: data.entryCount,
  largestModuleBytes: Math.max(macros.largestModuleBytes, data.largestModuleBytes),
  guidanceFiles: requiredAgents.length,
  retiredHandoffs: retiredNames.length,
}, null, 2));
