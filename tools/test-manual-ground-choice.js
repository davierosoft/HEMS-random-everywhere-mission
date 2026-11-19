#!/usr/bin/env node
'use strict';

// Report of Dr.DougRoss 2026-11-19 (patch N1): a patient whose manual transport choice is GROUND
// was still reserved by the helicopter and loaded, then had to be unloaded. The helicopter reserve
// must skip a ground-suitable patient whose manual choice is the ambulance, for each of the three patients.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const macros = JSON.parse(fs.readFileSync(path.join(__dirname, '../mission-src/macros/17-multipatient-runtime.json'), 'utf8'));
const reserve = macros['multipatient registry live reserve'];
const text = JSON.stringify(reserve);
for (const p of [1, 2, 3]) {
  const skip = `{"if":{"and":[{"require":{"param":"resource"},"eq":"hems"},{"require":{"param":"ground"},"eq":1},{"require":{"local":"manual_p${p}_transport_choice"},"eq":"ambulance"}]},"eq":1,"then":[{"set":{"param":"rank"},"value":1000001},{"set":{"param":"hems_skip"},"value":1}],"else":[{"set":{"param":"hems_skip"},"value":0}]}`;
  assert.equal(text.split(skip).length - 1, 1, `patient ${p}: one skip rule`);
  // the skip is set after the ground suitability of this patient and before its candidate test
  const iSuit = text.indexOf(`"multipatient registry live ground suitability","params":{"patient":${p}}`);
  const iSkip = text.indexOf(skip);
  assert.ok(iSuit >= 0 && iSuit < iSkip, `patient ${p}: skip after the suitability`);
}
const cand = '{"require":{"param":"hems_skip"},"ne":1}';
assert.equal(text.split(cand).length - 1, 3, 'the candidate test of every patient honours hems_skip');
assert.ok(!text.includes('"if":{"or":[{"require":{"param":"resource"},"eq":"hems"},{"require":{"param":"ground"},"eq":1}]},"eq":1,"then"'), 'no candidate test without the skip');
console.log('PASS: helicopter reserve skips a ground-suitable patient chosen for GROUND (patients 1-3)');
