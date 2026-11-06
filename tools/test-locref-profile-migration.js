#!/usr/bin/env node
'use strict';
// Report of Daikan (2026-11-05): after the second dispatch the starting point is not where he expects. The saved option of the dispatcher area may be
// $USER: before 170.08 it was the default, not a choice, and since 170.08 it moves the starting point to the helicopter at every accepted second
// dispatch. A profile without the mark location_ref_v 2 that holds $USER loads as START LOCATION; the mark is written at every save.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const macros = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros/02-save-load-presets.json'), 'utf8'));
function find(node, pred, out = []) { if (Array.isArray(node)) node.forEach((c) => find(c, pred, out)); else if (node && typeof node === 'object') { if (pred(node)) out.push(node); Object.values(node).forEach((c) => find(c, pred, out)); } return out; }
const saves = find(macros, (n) => n.set && n.set.key === 'location_ref_v' && n.value === 2);
assert.strictEqual(saves.length, 1, 'the save writes the mark location_ref_v 2');
const loads = find(macros, (n) => n.if && n.if.key === 'location_ref_v' && n.ne === 2);
assert.strictEqual(loads.length, 1, 'one migration at the load');
const mig = loads[0];
function load(table, current) {
  const g = { location_ref: current };
  const test = (c, o) => {
    const left = o.table ? table[o.key] : g[o.global];
    return Object.entries({ eq: (a, b) => a === b, ne: (a, b) => a !== b }).some(([k, f]) => k in c && f(left === undefined ? null : left, c[k]));
  };
  if (test(mig, mig.if)) for (const c of mig.then) if (test(c, c.if)) for (const s of c.then) g[s.set.global] = s.value;
  return g.location_ref;
}
assert.strictEqual(load({}, '$USER'), 'mission_start_location', 'legacy $USER becomes START LOCATION');
assert.strictEqual(load({ location_ref_v: 2 }, '$USER'), '$USER', '$USER saved with the mark stays');
assert.strictEqual(load({}, 'mission_start_location'), 'mission_start_location', 'START stays');
assert.strictEqual(load({}, 'custom_center_location'), 'custom_center_location', 'CUSTOM stays');
assert.strictEqual(load({}, null), null, 'no value: the default of objective1 applies');
// the migration comes after the load of the value
function findArrays(node, out = []) { if (Array.isArray(node)) { out.push(node); node.forEach((c) => findArrays(c, out)); } else if (node && typeof node === 'object') Object.values(node).forEach((c) => findArrays(c, out)); return out; }
const arr = findArrays(macros).find((a) => a.includes(mig));
const iSet = arr.findIndex((c) => c.set && c.set.global === 'location_ref' && c.value && c.value.key === 'location_ref');
assert.ok(iSet >= 0 && iSet < arr.indexOf(mig), 'the migration follows the load of the value');
// the briefing does not show the option (user rule 2026-11-06: no debug values on the briefing)
assert.ok(!fs.readFileSync(path.join(__dirname, '..', 'mission-src/root/03-briefing.json'), 'utf8').includes('location_ref'), 'briefing has no location_ref');
console.log('location_ref profile migration ok');
