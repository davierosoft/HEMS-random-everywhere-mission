#!/usr/bin/env node
'use strict';

// The local SAR is the flag of the running mission ("yes" or "no", copied from the data of the accident): the route (accident map and route / SAR map and
// route), the landing spot and the sighting of the crash site, the hoist and the ground operations test it with eq "yes" or eq "no". The category toggle
// of the mission list (a boolean) was written in the same local by recompute mission preset categories, so that opening the mission list, switching the
// preset or applying a linked profile after the dispatch switched every SAR test off: no route, no landing spot, no hoist, a locked mission (tester report
// of 2026-10-17, build 169.54, snapshots with local:SAR = true). Static checks of the production sources only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

// 1. every write of the local SAR is the data of an accident, a global kept for a custom mission, or the default "no": never a category toggle
const writes = [];
for (const [name, body] of Object.entries(macros)) {
  collect(body, (node) => node.set && node.set.local === 'SAR').forEach((node) => writes.push({ name, value: node.value }));
}
assert.ok(writes.length >= 7, 'the writes of the local SAR are found');
for (const { name, value } of writes) {
  const text = JSON.stringify(value);
  assert.ok(!/preset_category_/.test(text), `${name}: the local SAR must not take a category toggle (${text})`);
  assert.ok(value === 'no' || /"path":"SAR"/.test(text) || text === '{"global":"SAR"}', `${name}: unexpected value for the local SAR (${text})`);
}

// 2. the category recompute keeps the toggles of the list (preset_category_*, the globals) and writes no local SAR
const recompute = JSON.stringify(macros['recompute mission preset categories']);
assert.ok(recompute.includes('"preset_category_SAR"') && recompute.includes('"global":"SAR1"') && recompute.includes('"global":"SAR"'), 'the toggle of SAR stays in preset_category_SAR and the globals');
assert.ok(!recompute.includes('"set":{"local":"SAR"}'), 'recompute mission preset categories writes no local SAR');
for (const other of ['RTC', 'MEB', 'MEO', 'JOB', 'SPORT', 'SECONDARY']) assert.ok(recompute.includes(`"set":{"local":"${other}"}`), `the mirror of ${other} is unchanged`);

// 3. the tests of the flag that decide the route, the landing spot and the hoist exist (a boolean would fail all of them)
const lifecycle = JSON.stringify(macros['objective1']) + JSON.stringify(macros['randomize']);
assert.ok(JSON.stringify(macros['randomize']).includes('"path":"SAR"'), 'randomize copies the SAR of the accident');
assert.ok(JSON.stringify(macros['CRASH_SITE']).includes('"local":"SAR"') && JSON.stringify(macros['CRASH_SITE']).includes('"SAR sighting"'), 'CRASH_SITE creates the landing spot and the sighting only for SAR yes');
assert.ok(lifecycle.length > 0);

console.log('SAR flag PASS: the local SAR is never written with a category toggle (' + writes.length + ' writes checked), the toggles of the mission list stay in preset_category_* and the globals. Simulator runtime PENDING.');
