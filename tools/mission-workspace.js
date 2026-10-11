#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { assertCicersBranch } = require('./assert-cicers-branch');
const { assertBuildIntent, markBuildConsumed } = require('./release-contract');
const { formatJsonText } = require('./mission-formatter');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_PATH = path.join(REPOSITORY_ROOT, 'everywhere_all.json');
const SOURCE_ROOT = path.join(REPOSITORY_ROOT, 'mission-src');
const MANIFEST_PATH = path.join(SOURCE_ROOT, 'manifest.json');
const MANIFEST_SCHEMA = 2;

// Every root key of the mission lives in mission-src. A "keyed" section is an object whose members are spread
// over several module files (macros, data, threads, icons). The pseudo-section "root" holds the remaining root
// keys (title, id, author, start_info, aircraft, applicable, api_version, locations, objects, userActions,
// objectives, briefing) as members of its module files; manifest.artifactKeyOrder gives the root order.
const ROOT_SECTION = 'root';

function orderProperty(section) {
  if (section === 'macros') return 'macroOrder';
  if (section === 'data') return 'dataOrder';
  return `${section}Order`;
}

function fail(message) {
  console.error(`mission-workspace: ${message}`);
  process.exitCode = 1;
}

function skipWhitespace(source, index) {
  while (index < source.length && /\s/.test(source[index])) index += 1;
  return index;
}

function stringEnd(source, start) {
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '"') {
      return index + 1;
    }
  }
  throw new Error(`unterminated JSON string at offset ${start}`);
}

function valueEnd(source, start) {
  const first = source[start];
  if (first === '"') return stringEnd(source, start);
  if (first !== '{' && first !== '[') {
    let index = start;
    while (index < source.length && source[index] !== ',' && source[index] !== '}') index += 1;
    return index;
  }

  const stack = [first];
  let inString = false;
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
    } else if (character === '{' || character === '[') {
      stack.push(character);
    } else if (character === '}' || character === ']') {
      const open = stack.pop();
      if ((open === '{' && character !== '}') || (open === '[' && character !== ']')) {
        throw new Error(`mismatched JSON delimiter at offset ${index}`);
      }
      if (stack.length === 0) return index + 1;
    }
  }
  throw new Error(`unterminated JSON value at offset ${start}`);
}

function objectMembers(source) {
  let index = skipWhitespace(source, 0);
  if (source[index] !== '{') throw new Error('expected a JSON object');
  index += 1;
  const members = [];

  while (true) {
    index = skipWhitespace(source, index);
    if (source[index] === '}') return members;
    if (source[index] !== '"') throw new Error(`expected a JSON key at offset ${index}`);
    const keyStart = index;
    const keyEnd = stringEnd(source, keyStart);
    const key = JSON.parse(source.slice(keyStart, keyEnd));
    index = skipWhitespace(source, keyEnd);
    if (source[index] !== ':') throw new Error(`expected ':' after ${key}`);
    index = skipWhitespace(source, index + 1);
    const start = index;
    const end = valueEnd(source, start);
    members.push({ key, keyStart, valueStart: start, valueEnd: end, value: source.slice(start, end) });
    index = skipWhitespace(source, end);
    if (source[index] === ',') {
      index += 1;
      continue;
    }
    if (source[index] === '}') return members;
    throw new Error(`expected ',' or '}' after ${key}`);
  }
}

function writeFileAtomic(target, contents) {
  const temporary = `${target}.codex-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, contents, 'utf8');
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function loadManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (manifest.schemaVersion !== MANIFEST_SCHEMA) throw new Error(`unsupported manifest schema ${manifest.schemaVersion}`);
  return manifest;
}

function collectModules(moduleDefinitions, sectionName) {
  const entriesByKey = new Map();
  const ownerByKey = new Map();
  const discoveredOrder = [];
  for (const definition of moduleDefinitions) {
    const source = fs.readFileSync(path.join(SOURCE_ROOT, definition.file), 'utf8');
    JSON.parse(source);
    for (const entry of objectMembers(source)) {
      if (entriesByKey.has(entry.key)) {
        throw new Error(`${sectionName}.${entry.key} appears in both ${ownerByKey.get(entry.key)} and ${definition.file}`);
      }
      entriesByKey.set(entry.key, entry);
      ownerByKey.set(entry.key, definition.file);
      discoveredOrder.push(entry.key);
    }
  }

  return { discoveredOrder, entriesByKey, ownerByKey };
}

function loadModules(moduleDefinitions, expectedOrder, sectionName) {
  const { entriesByKey, ownerByKey } = collectModules(moduleDefinitions, sectionName);

  const expected = new Set(expectedOrder);
  const missing = expectedOrder.filter((key) => !entriesByKey.has(key));
  const unexpected = [...entriesByKey.keys()].filter((key) => !expected.has(key));
  if (missing.length) throw new Error(`${sectionName} entries missing from modules: ${missing.join(', ')}`);
  if (unexpected.length) throw new Error(`${sectionName} entries absent from manifest order: ${unexpected.join(', ')}`);

  return {
    entries: expectedOrder.map((key) => entriesByKey.get(key)),
    ownerByKey,
  };
}

function reindexSection(manifest, sectionName) {
  const property = orderProperty(sectionName);
  const collected = collectModules(manifest.modules[sectionName], sectionName);
  const oldOrder = manifest[property];
  const present = new Set(collected.discoveredOrder);
  const oldSet = new Set(oldOrder);
  const newOrder = oldOrder.filter((key) => present.has(key));
  newOrder.push(...collected.discoveredOrder.filter((key) => !oldSet.has(key)));

  // macros and data also carry byte-preserving separator metadata
  const oldFormat = manifest.format?.[sectionName];
  if (oldFormat) {
    const oldIndex = new Map(oldOrder.map((key, index) => [key, index]));
    const headers = newOrder.map((key) => {
      const index = oldIndex.get(key);
      return index === undefined ? `${JSON.stringify(key)}: ` : oldFormat.headers[index];
    });
    const separatorByPair = new Map(oldOrder.slice(0, -1).map((key, index) => [`${key}\u0000${oldOrder[index + 1]}`, oldFormat.separators[index]]));
    const separators = newOrder.slice(0, -1).map((key, index) => (
      separatorByPair.get(`${key}\u0000${newOrder[index + 1]}`) || ',\n    '
    ));
    manifest.format[sectionName] = { prefix: oldFormat.prefix, headers, separators, suffix: oldFormat.suffix };
  }

  manifest[property] = newOrder;
  return {
    added: newOrder.filter((key) => !oldSet.has(key)),
    removed: oldOrder.filter((key) => !present.has(key)),
  };
}

function reindex() {
  assertCicersBranch(REPOSITORY_ROOT);
  const manifest = loadManifest();
  const report = {};
  for (const section of manifest.keyedSections) report[section] = reindexSection(manifest, section);
  writeFileAtomic(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  console.log('Manifest reindexed. Run build, inspect the semantic diff, then run check.');
}

function compose() {
  const manifest = loadManifest();
  const artifact = fs.readFileSync(ARTIFACT_PATH, 'utf8');
  const sections = {};
  for (const name of manifest.keyedSections) {
    sections[name] = loadModules(manifest.modules[name], manifest[orderProperty(name)], name);
  }
  const rootEntries = new Map(sections[ROOT_SECTION].entries.map((entry) => [entry.key, entry]));
  const resultObject = {};
  for (const key of manifest.artifactKeyOrder) {
    if (key !== ROOT_SECTION && sections[key]) {
      resultObject[key] = Object.fromEntries(sections[key].entries.map((entry) => [entry.key, JSON.parse(entry.value)]));
    } else if (rootEntries.has(key)) {
      resultObject[key] = JSON.parse(rootEntries.get(key).value);
    } else {
      throw new Error(`root key ${key} is in neither a keyed section nor the root modules`);
    }
  }
  const unused = [...rootEntries.keys()].filter((key) => !manifest.artifactKeyOrder.includes(key));
  if (unused.length) throw new Error(`root modules hold keys absent from artifactKeyOrder: ${unused.join(', ')}`);
  const result = formatJsonText(JSON.stringify(resultObject));
  JSON.parse(result);
  return { artifact, result, manifest, macros: sections.macros, data: sections.data, sections };
}

function check() {
  const { artifact, result, manifest } = compose();
  if (artifact !== result) {
    const artifactObject = JSON.parse(artifact);
    const resultObject = JSON.parse(result);
    if (JSON.stringify(artifactObject) === JSON.stringify(resultObject)) {
      throw new Error('modules are semantically equal but formatting drift prevents a byte-exact rebuild; run build intentionally or restore fragment formatting');
    }
    throw new Error('modules and everywhere_all.json differ; run build only after reviewing the intended source changes');
  }
  const counts = manifest.keyedSections.map((section) => `${manifest[orderProperty(section)].length} ${section}`).join(', ');
  console.log(`Mission workspace PASS (${counts}; byte-exact artifact).`);
}

function build() {
  assertCicersBranch(REPOSITORY_ROOT);
  const { artifact, result } = compose();
  const intent = assertBuildIntent(REPOSITORY_ROOT, result, { purpose: 'build' });
  if (artifact === result) {
    markBuildConsumed(REPOSITORY_ROOT, artifact);
    console.log(`Mission artifact already matches the modular sources byte-for-byte; consumed local build ${intent.release}.`);
    return;
  }
  writeFileAtomic(ARTIFACT_PATH, result);
  markBuildConsumed(REPOSITORY_ROOT, result);
  console.log(`Rebuilt everywhere_all.json from mission-src as local build ${intent.release}; review the semantic scope before continuing.`);
}

function locate(query) {
  if (!query) throw new Error('locate requires a macro, data, thread, icon or root-key substring');
  const manifest = loadManifest();
  const normalized = query.toLowerCase();
  const matches = [];
  for (const section of manifest.keyedSections) {
    const loaded = loadModules(manifest.modules[section], manifest[orderProperty(section)], section);
    const label = section === 'macros' ? 'macro' : section === 'threads' ? 'thread' : section === 'icons' ? 'icon' : section;
    for (const [key, owner] of loaded.ownerByKey) {
      if (key.toLowerCase().includes(normalized)) matches.push(`${label}\t${key}\tmission-src/${owner}`);
    }
  }
  if (!matches.length) throw new Error(`no mission entry contains ${JSON.stringify(query)}`);
  console.log(matches.join('\n'));
}

function printHelp() {
  console.log(`Usage: node tools/mission-workspace.js <command>\n\nCommands:\n  reindex            Update manifest order after adding, renaming, or removing entries (macros, data, threads, icons, root keys) or moving them between modules.\n  check              Require a byte-exact rebuild from modular sources.\n  build              Rebuild everywhere_all.json from modular sources.\n  locate <text>      Find the source module for a macro, data, thread, icon or root entry.`);
}

function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === 'reindex') reindex();
  else if (command === 'check') check();
  else if (command === 'build') build();
  else if (command === 'locate') locate(argument);
  else if (!command || command === '--help' || command === '-h') printHelp();
  else throw new Error(`unknown command ${command}`);
}

module.exports = { build, check, compose, locate, objectMembers, reindex };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    fail(error.message);
  }
}
