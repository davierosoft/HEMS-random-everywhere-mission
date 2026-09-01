#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { isDeepStrictEqual } = require('util');
const { gzipSync, gunzipSync } = require('zlib');
const { assertCicersBranch } = require('./assert-cicers-branch');
const { compose } = require('./mission-workspace');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const MISSION_PATH = path.join(REPOSITORY_ROOT, 'everywhere_all.json');
const BASELINE_PATH = path.join(REPOSITORY_ROOT, '.workspace-state', 'mission-scope-baseline.json.gz');
const BASELINE_SCHEMA = 1;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

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

function changedKeys(before, after) {
  return [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])]
    .filter((key) => !isDeepStrictEqual(before?.[key], after?.[key]));
}

function analyzeScope(before, after) {
  return {
    rootChanges: changedKeys(before, after).filter((key) => key !== 'macros' && key !== 'data'),
    macroChanges: changedKeys(before.macros, after.macros),
    dataChanges: changedKeys(before.data, after.data),
  };
}

function unexpected(actual, allowed) {
  const permitted = new Set(allowed);
  return actual.filter((item) => !permitted.has(item));
}

function scopeViolations(scope, allowed) {
  return [
    ...unexpected(scope.rootChanges, allowed.roots).map((key) => `root:${key}`),
    ...unexpected(scope.macroChanges, allowed.macros).map((key) => `macro:${key}`),
    ...unexpected(scope.dataChanges, allowed.data).map((key) => `data:${key}`),
  ];
}

function createBaselineRecord(branch, mission, createdAt = new Date().toISOString()) {
  return {
    schemaVersion: BASELINE_SCHEMA,
    branch,
    createdAt,
    missionSha256: sha256(mission),
    mission,
  };
}

function validateBaselineRecord(record, branch) {
  if (!record || record.schemaVersion !== BASELINE_SCHEMA) throw new Error('baseline schema is missing or outdated; create a new snapshot');
  if (record.branch !== branch) throw new Error(`baseline belongs to ${record.branch}, not ${branch}; create a new snapshot`);
  if (typeof record.mission !== 'string' || record.missionSha256 !== sha256(record.mission)) throw new Error('baseline payload/hash mismatch; create a new snapshot');
  JSON.parse(record.mission);
  return record;
}

function writeBaseline(record) {
  fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
  const temporary = `${BASELINE_PATH}.codex-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, gzipSync(JSON.stringify(record)));
    fs.renameSync(temporary, BASELINE_PATH);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function readBaseline(branch) {
  if (!fs.existsSync(BASELINE_PATH)) throw new Error('no baseline; run node tools/check-mission-scope.js snapshot before editing');
  const record = JSON.parse(gunzipSync(fs.readFileSync(BASELINE_PATH)).toString('utf8'));
  return validateBaselineRecord(record, branch);
}

function main(argv = process.argv.slice(2)) {
  const command = argv[0] || 'check';
  const branch = assertCicersBranch(REPOSITORY_ROOT);

  if (command === 'snapshot') {
    const { artifact, result } = compose();
    if (artifact !== result) throw new Error('modular sources and artifact differ; reconcile them before taking a baseline');
    const record = createBaselineRecord(branch, artifact);
    writeBaseline(record);
    console.log(`Mission scope baseline saved for ${branch} (${record.missionSha256.slice(0, 12)}, ${record.createdAt}).`);
    return;
  }

  if (command !== 'check') throw new Error(`expected 'snapshot' or 'check', found ${command}`);

  const strict = argv.includes('--strict');
  const allowed = {
    roots: valuesAfter(argv, '--allow-root'),
    macros: valuesAfter(argv, '--allow-macro'),
    data: valuesAfter(argv, '--allow-data'),
  };
  const baseline = readBaseline(branch);
  const before = JSON.parse(baseline.mission);
  const after = JSON.parse(fs.readFileSync(MISSION_PATH, 'utf8'));
  const scope = analyzeScope(before, after);
  console.log(JSON.stringify({ branch, baselineCreatedAt: baseline.createdAt, baselineSha256: baseline.missionSha256, ...scope }, null, 2));

  if (!strict) return;
  const violations = scopeViolations(scope, allowed);
  if (violations.length) throw new Error(`unexpected changes: ${violations.join(', ')}`);
  console.log('Mission scope PASS.');
}

module.exports = {
  analyzeScope,
  createBaselineRecord,
  scopeViolations,
  validateBaselineRecord,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Mission scope FAIL: ${error.message}.`);
    process.exit(1);
  }
}
