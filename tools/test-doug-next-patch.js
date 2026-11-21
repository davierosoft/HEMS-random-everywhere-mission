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
// N2, rules of the owner 2026-11-20: GROUND needs a free ambulance, HEMS one patient only; the mistake is allowed and has consequences
const check = J(m07['manual transport check']);
for (const frag of ['"has_object":"ambulance1"', '"has_object":"ambulance2"', 'GROUND not available: no ambulance on scene', 'GROUND not available: every ambulance on scene already takes a patient', 'Only one patient can go by helicopter', '"mtc_other_ground"', '"mtc_other_hems"', '"medical_display_hems_ok"', '"medical_display_ground_ok"', '"gte":90', '"L:HEALTH2"', '"L:HEALTH3"']) assert.ok(check.includes(frag), `manual transport check: ${frag}`);
assert.ok(!check.includes('AMBULOCK'), 'the manual choice stays above the heli-only setting (live suitability rule)');
const complete = J(m07['complete manual patient visit']);
assert.ok(complete.includes('"manual transport check"') && complete.includes('"medical_display_ground_ok"') && complete.includes('"medical_display_hems_ok"'), 'both choices are checked again at the click');
for (const n of [1, 2, 3]) assert.ok(complete.includes(`"manual_p${n}_transport_recommend"},"eq":"helicopter"`) && complete.includes('Unstable patient: ground transport is risky'), `patient ${n}: GROUND for an unstable patient counts an error`);
const health = J(m07['patient health']);
assert.ok(health.includes('"disabled_condition":{"require":{"local":"medical_display_ground_ok"},"ne":1}') && health.includes('"disabled_condition":{"require":{"local":"medical_display_hems_ok"},"ne":1}'), 'both buttons follow their flags');
assert.ok(health.includes('"params":[{"local":"medical_display_ground_reason"}],"color":"orange"') && health.includes('"params":[{"local":"medical_display_hems_reason"}],"color":"orange"'), 'reason lines');
assert.ok(J(m04['sync medical patient display']).includes('"manual transport check"'), 'refresh hook');
// the live suitability follows the manual GROUND choice above the vital signs
const suit = J(rd('17-multipatient-runtime.json')['multipatient registry live ground suitability']);
for (const n of [1, 2, 3]) assert.ok(suit.includes(`{"require":{"or":[{"require":{"local":"manual_p${n}_transport_choice"},"eq":"ambulance"},{"require":{"and":[`), `patient ${n}: manual GROUND above the vital-sign gate`);
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
