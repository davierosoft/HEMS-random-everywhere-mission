#!/usr/bin/env node
'use strict';
// Merges the manual treatment patch of Dr.DougRoss (FINAL 2026-11-13, tools/pending-patches/) into the health tables of mission-src/data.
// NOT applied to the sources yet: the macros must first know the 23 profiles (see docs/architecture/MANUAL_TREATMENT_PATCH.md); with the data merged and the
// old macros the phase buttons of 'patient health' do not show a correct answer for the new profiles and the manual treatment stalls.
// Usage: node tools/apply-treatment-patch.js [--write]   (without --write: dry run, prints what would change)
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const patch = JSON.parse(fs.readFileSync(path.join(__dirname, 'pending-patches', 'HEMS_manual_treatment_patch_FINAL-2026-11-13.json'), 'utf8'));
const files = ['05-health-profiles', '05b-health-profiles-continued', '06-special-health-and-messages'].map((name) => ({ file: path.join(root, 'mission-src', 'data', `${name}.json`) }));
for (const item of files) item.json = JSON.parse(fs.readFileSync(item.file, 'utf8'));
const REVIEW_ONLY = new Set(['table', 'index', 'changed', 'vitals']);
let rows = 0; let changedIds = 0;
for (const entry of patch.entries) {
  const item = files.find((candidate) => entry.table in candidate.json);
  if (!item) throw new Error(`table ${entry.table} not found`);
  const row = item.json[entry.table][entry.index];
  if (!row) throw new Error(`${entry.table}[${entry.index}] not found`);
  if (row.id !== entry.id) changedIds += 1;
  for (const [key, value] of Object.entries(entry)) if (!REVIEW_ONLY.has(key)) row[key] = value;
  for (const [key, value] of Object.entries(entry.vitals || {})) row[key] = value;
  rows += 1;
}
console.log(`${rows} pathologies, ${changedIds} with a different id`);
if (process.argv.includes('--write')) {
  for (const item of files) fs.writeFileSync(item.file, `${JSON.stringify(item.json, null, 2)}\n`);
  console.log('written; run node tools/mission-formatter.js sources and git checkout mission-src/icons/01-interface-icons.json mission-src/root/03-briefing.json');
}
