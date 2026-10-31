#!/usr/bin/env node
'use strict';

// Keys of the texts that the mission shows on screen, for the screen language files of the Mission Companion (issue 65 of KeKKERUUU/RandomEverywhereInstaller).
//
//   node tools/ui-texts.js check    verify the artifact against tools/ui-text-keys.json and ui-texts.json (the gate of the workspace tests)
//   node tools/ui-texts.js sync     add the keys of new texts to tools/ui-text-keys.json and rewrite ui-texts.json from everywhere_all.json
//   node tools/ui-texts.js stats    counts by kind and the longest texts
//
// ui-texts.json is the manifest published next to everywhere_all.json in every release: version 1, { mission, fields: [ { key, kind, en, max, paths } ] }.
// paths are RFC 6901 JSON pointers into everywhere_all.json; the app replaces only the string values still equal to `en`.
// A key names one text of one kind and never changes: a changed English text takes a new key and the old key stays in the registry, unused.
// Texts that are spoken (`speak`, the voice packs), the data records (descriptions, medical lines), names, conditions and every value that is
// compared or stored are not fields: see docs/architecture/UI_TRANSLATION.md.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const artifactFile = path.join(root, 'everywhere_all.json');
const registryFile = path.join(__dirname, 'ui-text-keys.json');
const manifestFile = path.join(root, 'ui-texts.json');

const COMMAND_OWNERS = new Set(['set_dispatch', 'briefing', 'set_modal', 'wait_modal']);
// property -> kind, for the rows of a dispatch page / the briefing and for a modal
const ROW_KINDS = { text: 'text', description: 'text', label: 'text', link: 'link', linkText: 'link', title: 'title' };
const MODAL_KINDS = { text: 'modal', title: 'modal' };
// containers that may sit between the owner command and a text of it (arrays of rows, the buttons of a bar, the options of a modal)
const TRANSPARENT = new Set(['buttonbar', 'options']);

function fail(lines) {
  for (const line of lines) console.error(line);
  process.exit(1);
}

function escapePointer(token) {
  return String(token).replace(/~/g, '~0').replace(/\//g, '~1');
}

const PLACEHOLDER_RX = /\{[^{}]*\}/g;
function translatable(text) {
  const letters = text.replace(PLACEHOLDER_RX, '').replace(/[^A-Za-z]/g, '');
  return letters.length >= 2;
}

function maxLength(kind, english) {
  const length = english.length;
  if (kind === 'button' || kind === 'link' || kind === 'title') return Math.ceil(length * 1.35) + 4;
  return Math.ceil(length * 1.5) + 10;
}

// Collect every on-screen string with its pointer. `chain` holds the property names (and '#' for an array index) from the root.
function collect(artifact) {
  const found = [];
  function add(kind, text, pointerTokens) {
    if (typeof text !== 'string' || !translatable(text)) return;
    found.push({ kind, en: text, pointer: '/' + pointerTokens.map(escapePointer).join('/') });
  }
  function walk(value, tokens, owner, between) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, tokens.concat(String(index)), owner, between));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '#comment') continue;
      const next = tokens.concat(key);
      if (key === 'set_message') {
        if (typeof child === 'string') add('set_message', child, next);
        else if (child && typeof child === 'object' && typeof child.text === 'string') add('set_message', child.text, next.concat('text'));
        continue;
      }
      if (key === 'set_objective_title') {
        if (typeof child === 'string') add('title', child, next);
        continue;
      }
      if (typeof child === 'string') {
        if (owner && !between.some((b) => !TRANSPARENT.has(b))) {
          const rowKinds = owner === 'set_modal' || owner === 'wait_modal' ? MODAL_KINDS : ROW_KINDS;
          let kind = rowKinds[key];
          if (kind === 'title' && between.includes('buttonbar')) kind = 'button';
          if (kind) add(kind, child, next);
        }
        continue;
      }
      if (child && typeof child === 'object') {
        if (COMMAND_OWNERS.has(key)) walk(child, next, key, []);
        else if (owner && TRANSPARENT.has(key)) walk(child, next, owner, between.concat(key));
        else walk(child, next, null, []);
      }
    }
  }
  // the root briefing is the same kind of row list as a set_dispatch command
  walk(artifact.briefing, ['briefing'], 'briefing', []);
  const { briefing, ...rest } = artifact;
  walk(rest, [], null, []);
  return found;
}

function loadRegistry() {
  if (!fs.existsSync(registryFile)) return { version: 1, keys: [] };
  const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
  const seen = new Set();
  for (const [key, kind, en] of registry.keys) {
    if (seen.has(key)) fail([`Repeated key in ${path.basename(registryFile)}: ${key}`]);
    seen.add(key);
    if (typeof kind !== 'string' || typeof en !== 'string') fail([`Bad registry row for ${key}`]);
  }
  return registry;
}

function keyNumber(key) {
  return Number(key.slice(3));
}

function build(artifact, registry, allowNew) {
  const index = new Map(registry.keys.map(([key, kind, en]) => [`${kind}\u0000${en}`, key]));
  let next = registry.keys.reduce((max, [key]) => Math.max(max, keyNumber(key)), 0) + 1;
  const created = [];
  const byKey = new Map();
  const unkeyed = [];
  for (const item of collect(artifact)) {
    const id = `${item.kind}\u0000${item.en}`;
    let key = index.get(id);
    if (!key) {
      if (!allowNew) { unkeyed.push(item); continue; }
      key = 'UI.' + String(next++).padStart(4, '0');
      index.set(id, key);
      created.push([key, item.kind, item.en]);
    }
    const field = byKey.get(key) || { key, kind: item.kind, en: item.en, max: maxLength(item.kind, item.en), paths: [] };
    field.paths.push(item.pointer);
    byKey.set(key, field);
  }
  const fields = [...byKey.values()].sort((a, b) => keyNumber(a.key) - keyNumber(b.key));
  return { fields, created, unkeyed };
}

function missionBuild(artifact) {
  const match = /0\.997 \d+(?:\.\d+)?/.exec(artifact.title || '');
  return match ? match[0] : '';
}

function manifestText(artifact, fields) {
  const lines = fields.map((f) => `    ${JSON.stringify(f)}`);
  return `{\n  "version": 1,\n  "mission": ${JSON.stringify(missionBuild(artifact))},\n  "fields": [\n${lines.join(',\n')}\n  ]\n}\n`;
}

function registryText(registry) {
  const lines = registry.keys.map((row) => `    ${JSON.stringify(row)}`);
  return `{\n  "version": 1,\n  "keys": [\n${lines.join(',\n')}\n  ]\n}\n`;
}

function resolvePointer(artifact, pointer) {
  let value = artifact;
  for (const token of pointer.split('/').slice(1)) {
    const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
    if (value === null || typeof value !== 'object' || !(key in value)) return undefined;
    value = value[key];
  }
  return value;
}

function validate(artifact, fields) {
  const problems = [];
  for (const field of fields) {
    if (!/^[\x20-\x7e]+$/.test(field.en)) problems.push(`${field.key}: the English text is not ASCII`);
    for (const pointer of field.paths) {
      if (resolvePointer(artifact, pointer) !== field.en) problems.push(`${field.key}: ${pointer} does not hold the English text`);
    }
  }
  return problems;
}

function main() {
  const command = process.argv[2] || 'check';
  if (!['check', 'sync', 'stats'].includes(command)) fail(['usage: node tools/ui-texts.js [check|sync|stats]']);
  const artifact = JSON.parse(fs.readFileSync(artifactFile, 'utf8'));
  const registry = loadRegistry();
  if (command === 'stats') {
    const { fields } = build(artifact, registry, true);
    const kinds = {};
    for (const f of fields) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
    console.log(JSON.stringify({ fields: fields.length, occurrences: fields.reduce((n, f) => n + f.paths.length, 0), kinds }, null, 1));
    return;
  }
  if (command === 'sync') {
    const { fields, created } = build(artifact, registry, true);
    const problems = validate(artifact, fields);
    if (problems.length) fail(problems.slice(0, 20));
    registry.keys.push(...created);
    fs.writeFileSync(registryFile, registryText(registry));
    fs.writeFileSync(manifestFile, manifestText(artifact, fields));
    console.log(`UI texts synced: ${fields.length} texts, ${fields.reduce((n, f) => n + f.paths.length, 0)} places, ${created.length} new keys, mission ${missionBuild(artifact)}.`);
    return;
  }
  const { fields, unkeyed } = build(artifact, registry, false);
  const problems = [];
  for (const item of unkeyed.slice(0, 15)) problems.push(`Screen text without a key (${item.kind}): ${item.en}`);
  if (unkeyed.length > 15) problems.push(`... and ${unkeyed.length - 15} more screen texts without a key`);
  problems.push(...validate(artifact, fields));
  const expected = manifestText(artifact, fields);
  const actual = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, 'utf8') : '';
  if (!problems.length && actual !== expected) problems.push('ui-texts.json is out of date: run node tools/ui-texts.js sync');
  if (problems.length) fail(['UI texts FAIL:', ...problems.slice(0, 25)]);
  console.log(`UI texts PASS: ${fields.length} keyed texts, ${fields.reduce((n, f) => n + f.paths.length, 0)} places, manifest current.`);
}

main();
