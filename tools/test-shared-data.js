#!/usr/bin/env node
'use strict';

// Shared waypoints and offline database changes (user request 2026-10-18): the files of `shared-data/` are valid, the manifest is up to date, every built-in
// hangar and hospital record of the mission is also in shared-data/waypoints.json (nothing exists only in the mission), and the mission reads the table of the
// Companion first and its own records as a fallback. Static check; what HPG does with the table is runtime behaviour (PENDING: tablet test with the app).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const shared = require('./shared-data.js');

const root = path.join(__dirname, '..');

// 1. the repository files
const result = shared.check();
assert.deepEqual(result.errors, [], `shared-data: ${result.errors.join(' | ')}`);

// 2. the built-in records of the mission are all in the shared file (same fields), so the file is the one source to edit
const builtin = JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'data', '02-waypoints-and-categories.json'), 'utf8'));
for (const [key, list] of [['hangar wps', 'hangar_wps'], ['hospitals wps', 'hospitals_wps']]) {
  for (const rec of builtin[key]) {
    const copy = result.waypoints[list].find((r) => r.id === rec.id);
    assert.ok(copy, `${key} "${rec.id}" is missing from shared-data/waypoints.json`);
    const { by, ...rest } = copy;
    assert.deepEqual(rest, rec, `${key} "${rec.id}" differs between the mission and shared-data/waypoints.json`);
  }
}

// 3. the mission: the table has a data name, one loader macro, and the three consumers read its result
const macros = {};
const dir = path.join(root, 'mission-src', 'macros');
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
const tables = JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'data', '01-persistence-tables.json'), 'utf8'));
assert.equal(tables.Shared_Waypoints_Table, 'R&E_shared_waypoints', 'data name of the shared table (the Companion writes table_R&E_shared_waypoints.json)');
const text = (name) => JSON.stringify(macros[name]);
const loader = text('shared wps load');
assert.ok(loader.includes('"var":["L:HMC_DATA_REV","number"]'), 'the loader reads the revision the Companion raises');
assert.ok(loader.includes('{"open_table":{"static":"Shared_Waypoints_Table"}}'), 'the loader opens the table again when the revision changed');
assert.ok(loader.indexOf('"key":"hangar_wps"') < loader.indexOf('{"for_each":{"static":"hangar wps"}'), 'table records first, built-in hangars after them');
assert.ok(loader.indexOf('"key":"hospitals_wps"') < loader.indexOf('{"for_each":{"static":"hospitals wps"}'), 'table records first, built-in hospitals after them');
assert.ok(loader.includes('"try"') && loader.includes('"catch"'), 'a damaged table never stops the mission: the built-in records stay');
assert.ok(!loader.includes('SHARED_WPS_LOCK'), 'no lock: a thread killed while holding it would block every later call');
assert.ok(loader.indexOf('{"set":{"local":"shared_hangars_all"}') > loader.indexOf('{"for_each":{"static":"hospitals wps"}'), 'the result lists are assigned at the end (built in params)');
for (const [name, list] of [['user hospital WP', 'shared_hospitals_all'], ['user hospital WP for transfer', 'shared_hospitals_all'], ['user hangar WP', 'shared_hangars_all']]) {
  const body = text(name);
  assert.ok(body.includes('{"call_macro":"shared wps load"}'), `${name} loads the shared list`);
  assert.ok(body.includes(`{"for_each":{"local":"${list}"}`), `${name} walks the shared list`);
  assert.ok(!body.includes('{"static":"hangar wps"}') && !body.includes('{"static":"hospitals wps"}'), `${name} no longer walks the built-in list alone`);
  assert.ok(body.indexOf('shared wps load') < body.indexOf(`"${list}"`), `${name}: load before walking`);
}
const unlisted = Object.keys(macros).filter((name) => text(name).includes('{"static":"hangar wps"}') || text(name).includes('{"static":"hospitals wps"}'));
assert.deepEqual(unlisted, ['shared wps load'], `only the loader reads the built-in lists: ${unlisted.join(', ')}`);

console.log(`shared-data tests passed (revision ${result.manifest.revision}, ${result.waypoints.hangar_wps.length} hangars, ${result.waypoints.hospitals_wps.length} hospitals)`);
