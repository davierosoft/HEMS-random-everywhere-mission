#!/usr/bin/env node
'use strict';

// Points N2 and N4-N8 of the next patch of Dr.DougRoss (2026-11-19), integrated into the modular sources.
// N1 is tools/test-manual-ground-choice.js. N3 (transport evaluation with a Life Score penalty) approved by the owner 2026-11-19.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '../mission-src/macros', f), 'utf8'));
const m07 = rd('07-patient-medical.json'), m04 = rd('04-dispatch-tablet-ui.json');
const J = JSON.stringify;
// N2: GROUND only with an ambulance and a ground-suitable patient, reason shown, checked again at the click
const check = J(m07['manual transport check']);
for (const frag of ['"has_object":"ambulance1"', '"has_object":"ambulance2"', '"gte":90', '"gte":50', '"lte":120', '"gte":8', '"L:HEALTH"', '"L:HEALTH2"', '"L:HEALTH3"', 'GROUND not available: no ambulance on scene', 'GROUND not available: patient not stable for ground transport']) assert.ok(check.includes(frag), `manual transport check: ${frag}`);
assert.ok(!check.includes('AMBULOCK'), 'the manual choice stays above the heli-only setting (live suitability rule)');
const complete = J(m07['complete manual patient visit']);
assert.ok(complete.includes('"manual transport check"') && complete.includes('"medical_display_ground_ok"'), 'GROUND is checked again at the click');
const health = J(m07['patient health']);
assert.ok(health.includes('"disabled_condition":{"require":{"local":"medical_display_ground_ok"},"ne":1}'), 'GROUND button follows ground_ok');
assert.ok(health.includes('"params":[{"local":"medical_display_ground_reason"}],"color":"orange"'), 'reason line');
assert.ok(J(m04['sync medical patient display']).includes('"manual transport check"'), 'refresh hook');
// N3: transport evaluation
for (const n of [1, 2, 3]) {
  const c = J(m07['complete manual patient visit']);
  assert.ok(c.includes(`"manual_p${n}_transport_recommend"},"eq":"ambulance"`) && c.includes(`"manual_p${n}_error_count"`) && c.includes('{"floor":{"rand":[2,6]}}'), `patient ${n}: helicopter for a patient recommended for GROUND counts an error and -2..-5 Life Score`);
  assert.ok(check.includes(`"manual_p${n}_transport_recommend"`) && check.includes('LIFESCORE_THR_HI'), `patient ${n}: recommendation`);
}
// N4: vital signs after ROSC, four points per patient
for (const [n, p] of [[1, ''], [2, 'P2_'], [3, 'P3_']]) {
  const s = J(m07[`apply patient${n} medical action effect`]);
  const sinus = s.split(`"P${n}_ECG_RHYTHM"},"value":"SINUS"}`).length - 1;
  assert.equal(sinus, 4, `patient ${n}: four ROSC points`);
  assert.equal(s.split(`{"set":{"local":"${p}BP_SYS"},"value":{"floor":{"rand":[80,111]}}}`).length - 1, 4, `patient ${n}: ROSC blood pressure at every point`);
  assert.equal(s.split(`{"floor":{"rand":[85,95]}}`).length - 1, 4, `patient ${n}: ROSC SpO2 85-94`);
  // N5: a wrong defibrillation no longer creates pVT; N6 vasopressor up to 230
  const t = J(m07[`manual patient${n} treatment choice`]);
  assert.ok(!t.includes('"value":"pVT"'), `patient ${n}: no pVT after a wrong defibrillation`);
  assert.ok(/\{"rand":\[170,230\]\},0,230\]/.test(t), `patient ${n}: vasopressor systolic up to 230`);
}
// N8: both buttons write the global too
const set = J(m04);
for (const v of [0, 1]) assert.ok(set.includes(`{"set":{"local":"GNDOPS_ROTOR"},"value":${v}},{"set":{"global":"GNDOPS_ROTOR"},"value":${v}},{"call_macro":"mark aircraft profile custom"}`), `GNDOPS_ROTOR ${v} written to the global`);
// N7: German dialog text
const de = JSON.parse(fs.readFileSync(path.join(__dirname, '../uitexts/DE.json'), 'utf8'));
const strings = de.texts || de.strings || de;
assert.ok(J(de).includes('Wähle die Art des manuellen Ziels') && J(de).includes('MANUELLEN TYP WÄHLEN'), 'German manual type dialog');
console.log('PASS: next patch N2 and N4-N8 integrated');
