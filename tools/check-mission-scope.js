#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { gzipSync, gunzipSync } = require('zlib');
const { assertCicersBranch } = require('./assert-cicers-branch');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const MISSION_PATH = path.join(REPOSITORY_ROOT, 'everywhere_all.json');
const BASELINE_PATH = path.join(REPOSITORY_ROOT, '.workspace-state', 'mission-scope-baseline.json.gz');

function valuesAfter(argv, option) {
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === option) values.push(argv[index + 1]);
  }
  return values;
}

function changedKeys(before, after) {
  return [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])]
    .filter((key) => !isDeepStrictEqual(before?.[key], after?.[key]));
}

function unexpected(actual, allowed) {
  const permitted = new Set(allowed);
  return actual.filter((item) => !permitted.has(item));
}

const argv = process.argv.slice(2);
const command = argv[0] || 'check';
const strict = argv.includes('--strict');
const allowedRoots = valuesAfter(argv, '--allow-root');
const allowedMacros = valuesAfter(argv, '--allow-macro');
const allowedData = valuesAfter(argv, '--allow-data');
let branch;
try {
  branch = assertCicersBranch(REPOSITORY_ROOT);
} catch (error) {
  console.error(`Mission scope FAIL: ${error.message}.`);
  process.exit(1);
}

if (command === 'snapshot') {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  fs.writeFileSync(BASELINE_PATH, gzipSync(fs.readFileSync(MISSION_PATH)));
  console.log(`Mission scope baseline saved for ${branch}.`);
  process.exit(0);
}

if (command !== 'check') {
  console.error(`Mission scope FAIL: expected 'snapshot' or 'check', found ${command}.`);
  process.exit(1);
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.error('Mission scope FAIL: no baseline; run node tools/check-mission-scope.js snapshot before editing.');
  process.exit(1);
}

const before = JSON.parse(gunzipSync(fs.readFileSync(BASELINE_PATH)).toString('utf8'));
const after = JSON.parse(fs.readFileSync(MISSION_PATH, 'utf8'));
const rootChanges = changedKeys(before, after).filter((key) => key !== 'macros' && key !== 'data');
const macroChanges = changedKeys(before.macros, after.macros);
const dataChanges = changedKeys(before.data, after.data);

console.log(JSON.stringify({ branch, rootChanges, macroChanges, dataChanges }, null, 2));

if (!strict) process.exit(0);

const violations = [];
violations.push(...unexpected(rootChanges, allowedRoots).map((key) => `root:${key}`));
violations.push(...unexpected(macroChanges, allowedMacros).map((key) => `macro:${key}`));
violations.push(...unexpected(dataChanges, allowedData).map((key) => `data:${key}`));

if (violations.length) {
  console.error(`Mission scope FAIL: unexpected changes: ${violations.join(', ')}`);
  process.exit(1);
}

console.log('Mission scope PASS.');
