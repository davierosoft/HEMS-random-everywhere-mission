#!/usr/bin/env node
'use strict';

// User rule 2026-10-24 (report of a tester: the crew walks slowly to the patient and back to the helicopter): every crew walk without the stretcher
// is at least 5 km/h (except a whole drive under 2 m), and the walks from the helicopter to the scene points LUP/RUP/LDWN/RDWN (or to the visited
// object) take the speed from the distance: more than 15 m 7 km/h, more than 10 m 6, more than 5 m 5, else 4, never below the speed the drive had.
const assert = require('node:assert/strict');
const audit = require('./audit-drive-speeds.js');

const text = (value) => JSON.stringify(value);
for (const name of ['crew walk speed', 'crew walk speed visit']) {
  const body = text(audit.macros[name] || null);
  assert.ok(audit.macros[name], `macro ${name} exists`);
  for (const need of ['"gt":5', '"gt":10', '"gt":15', '"value":7', '"value":6', '"value":5', '"value":4', '"vmin"', '"vmax"', '"return"', '"var":"distance:m"']) assert.ok(body.includes(need), `${name} uses ${need}`);
}
assert.ok(text(audit.macros['crew walk speed']).includes('"location":"LUP"'), 'the distance to the scene points is measured to LUP');
assert.ok(text(audit.macros['crew walk speed visit']).includes('"object":{"param":"target"}'), 'the visit variant measures to the object of the visit');

// every call has the actor, the limits and the result that the drive reads
let calls = 0;
const walk = (node, visit) => {
  if (Array.isArray(node)) node.forEach((child) => walk(child, visit));
  else if (node && typeof node === 'object') { visit(node); Object.values(node).forEach((v) => walk(v, visit)); }
};
for (const body of Object.values(audit.macros)) {
  walk(body, (node) => {
    if (typeof node.call_macro === 'string' && node.call_macro.startsWith('crew walk speed')) {
      calls += 1;
      assert.ok(node.params && node.params.actor !== undefined && typeof node.params.vmin === 'number' && typeof node.params.vmax === 'number' && node.params.vmax >= node.params.vmin, 'call with actor, vmin and vmax');
      assert.equal(node.result, 'cws_sp', 'the result is read by the drive');
      if (node.call_macro.endsWith('visit')) assert.ok(node.params.target, 'visit call with a target');
    }
  });
}
assert.ok(calls >= 100, `the walks to the scene use the macro (${calls} calls)`);
let readers = 0;
for (const body of Object.values(audit.macros)) walk(body, (node) => { if (node.drive_object && node.drive_object.speed && node.drive_object.speed.param === 'cws_sp') readers += 1; });
assert.equal(readers, calls, 'every call is read by exactly one drive');

// no crew walk under 5 km/h unless it is a whole drive under 2 m, a stretcher or a very short capped route
const slow = audit.drives.filter((d) => !audit.isVehicleName(d.name) && d.speedNum !== null && d.speedNum < 5 && !/stretcher/i.test(String(d.name)) && !d.route.provenShort);
const capped = slow.filter((d) => d.node && d.speedNum >= Math.floor(audit.guardCap(d.node) * 10) / 10 - 1e-9);
assert.equal(slow.length - capped.length, 0, `crew walks under 5 km/h left: ${slow.filter((d) => !capped.includes(d)).slice(0, 5).map((d) => d.macro + ':' + d.name + '@' + d.speedNum).join(', ')}`);
assert.equal(audit.findings.length, 0, 'the drive audit has no finding');
console.log(`Crew walk speed PASS: ${calls} walks by distance (7/6/5/4 km/h), ${capped.length} capped short routes, no other crew walk under 5 km/h outside the 2 m drives and the stretchers. Simulator runtime PENDING (distance expression with a location and a param actor).`);
