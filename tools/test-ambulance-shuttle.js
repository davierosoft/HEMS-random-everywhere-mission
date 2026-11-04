#!/usr/bin/env node
'use strict';
// Report of Daikan (2026-11-03): helicopter landed 288 m from the patient, the ambulance was on the scene, the crew walked back to the
// helicopter for the stretcher. Static contract of the ambulance shuttle (3, 4 and 5 crew): macros exist, every macro they call exists,
// the decision is taken once at the start of the stretcher branch, each leg keeps the original walk as the else branch, and the
// ambulance stand down waits for the hold.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'mission-src/macros');
const all = {};
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) Object.assign(all, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
const NEW = ['ambulance shuttle decide', 'ambulance shuttle release', 'ambulance crew shuttle', 'ambulance shuttle board hoist_crew',
  'ambulance shuttle board pax3', 'ambulance shuttle unload hoist_crew', 'ambulance shuttle unload pax3'];
for (const n of NEW) assert.ok(Array.isArray(all[n]), 'macro exists: ' + n);
function calls(node, out = []) {
  if (Array.isArray(node)) node.forEach((c) => calls(c, out));
  else if (node && typeof node === 'object') { if (typeof node.call_macro === 'string') out.push(node.call_macro); Object.values(node).forEach((v) => calls(v, out)); }
  return out;
}
for (const n of NEW) for (const c of calls(all[n])) assert.ok(all[c], n + ' calls a missing macro: ' + c);
for (const n of ['3 crew ground ops', '4 or 5 crew ground ops']) {
  const text = JSON.stringify(all[n]);
  assert.strictEqual((text.match(/"call_macro":"ambulance shuttle decide"/g) || []).length, 1, n + ': one decision');
  assert.strictEqual((text.match(/"call_macro":"ambulance crew shuttle"/g) || []).length, n === '3 crew ground ops' ? 3 : 2, n + ': 3 crew three legs; 4 or 5 crew two (first leg started by the decision)');
  assert.ok(text.includes('"call_macro":"ambulance shuttle release"'), n + ': hold released at the helicopter');
  assert.ok(text.includes('"wait_for":{"local":"ambu_shuttle_leg3"'), n + ': pax3 thread waits for the shuttle');
  assert.ok(text.includes('"else":['), n + ': original walk kept as else');
}
// the decision keeps the original behaviour unless every condition holds
const dec = JSON.stringify(all['ambulance shuttle decide']);
for (const need of ['patient_live_mode', 'AMBU_AVAIL', 'ambulance_return_crew_min_dist', 'multipatient registry ambulance reach', 'ambulance1_shuttle_hold', 'SIM ON GROUND'])
  assert.ok(dec.includes(need), 'decision uses ' + need);
// never stall: the hold has a watchdog and the leg a forced move
assert.ok(dec.includes('"shuttle_deadline"') && dec.includes('1500'), 'watchdog of the hold on the mission clock');
assert.ok(JSON.stringify(all['ambulance crew shuttle']).includes('shuttle_force'), 'forced move on timeout');
assert.ok(JSON.stringify(all['ambulance1 stand down']).includes('"ambulance1_shuttle_hold"'), 'stand down waits for the hold');
console.log('ambulance shuttle contract ok');
