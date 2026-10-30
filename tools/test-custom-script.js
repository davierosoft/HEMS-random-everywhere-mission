#!/usr/bin/env node
'use strict';

// Static contract between the custom script train.json and the mission sources:
// incident list aligned, objects block well formed (at most 30, known fields),
// every CUS_* variable the script sets is read by the mission, the engine macro exists
// and is hooked in the object thread. Runtime stays pending.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/^﻿/, '');

const sync = spawnSync(process.execPath, [path.join(__dirname, 'sync-train-accidents.js'), '--check'], { encoding: 'utf8' });
assert.strictEqual(sync.status, 0, 'train.json incident list is not aligned: ' + sync.stderr);

const script = JSON.parse(read('train.json'));
// Formatting rule (2026-10-30): train.json keeps the layout of the original script, not the mission formatter's.
const { formatTrainScript } = require('./train-script-format');
assert.strictEqual(fs.readFileSync(path.join(root, 'train.json'), 'utf8'), formatTrainScript(script), 'train.json layout differs from the original script layout (node tools/sync-train-accidents.js rewrites it)');
const commands = script.objectives[0].commands;
const fields = ['title', 'lat', 'lon', 'var1', 'var2', 'point', 'fallback', 'heading'];

const objects = commands.filter((c) => c.modify_array && c.modify_array.local === 'CUS_OBJECTS');
assert(objects.length <= 30, 'at most 30 custom objects');
for (const [index, command] of objects.entries()) {
  const item = command.append && command.append.create_struct;
  assert(item, 'object ' + (index + 1) + ' must append a create_struct');
  for (const key of Object.keys(item)) assert(fields.includes(key), 'unknown object field ' + key);
  assert.strictEqual(typeof item.title, 'string', 'object ' + (index + 1) + ' needs a title');
  assert(Number.isFinite(item.lat) && Number.isFinite(item.lon), 'object ' + (index + 1) + ' needs lat and lon');
}
const initIndex = commands.findIndex((c) => c.set && c.set.local === 'CUS_OBJECTS');
assert(initIndex >= 0, 'CUS_OBJECTS must be initialised');
assert(commands.findIndex((c) => c.modify_array) > initIndex, 'objects are appended after the initialisation');
assert(!commands.some((c) => c.set && c.set.local && /^OBJECT\d+$/.test(c.set.local)), 'the old numbered OBJECTn locals are not used by the script any more');

const navigation = read('mission-src/macros/05-navigation-queries.json');
assert(navigation.includes('"custom objects engine": ['), 'engine macro missing');
assert(navigation.includes('{"call_macro":"custom objects engine"}'), 'engine macro not called by the object thread');
assert(navigation.includes('{"if": {"local":"ce_i"}, "lt": 30,'), 'the engine must stop at 30 objects');

const missionText = fs.readdirSync(path.join(root, 'mission-src', 'macros')).map((f) => read('mission-src/macros/' + f)).join('\n');
for (const command of commands) {
  const name = command.set && command.set.var && command.set.var[0];
  if (!name || !name.startsWith('L:CUS')) continue;
  assert(missionText.includes(name), 'the script sets ' + name + ' but no mission macro reads it');
}

// Version contract: the script declares its API and the oldest build it needs; the mission accepts it.
const bootstrap = read('mission-src/macros/01-bootstrap-settings.json');
const apiMin = Number((bootstrap.match(/"CUS_SCRIPT_API_MIN"\},"value":(\d+)/) || [])[1]);
assert(apiMin >= 1, 'version check must set CUS_SCRIPT_API_MIN');
const scriptValue = (name) => {
  const c = commands.find((x) => x.set && x.set.var && x.set.var[0] === name);
  return c && c.value;
};
assert(scriptValue('L:CUS_SCRIPT_API') >= apiMin, 'script API is below the minimum the mission accepts');
const identity = (bootstrap.match(/"RELEASE_IDENTITY"\},"value":"\S+ (\d+)\.(\d+)"/) || []);
const buildN = Number(identity[1]) * 1000 + Number(identity[2]);
assert(scriptValue('L:CUS_SCRIPT_BUILD') <= buildN, 'script needs a newer build than this mission');
assert(commands.some((c) => c.set && c.set.local === 'MIN_BUILD' && c.value === scriptValue('L:CUS_SCRIPT_BUILD')), 'MIN_BUILD must equal CUS_SCRIPT_BUILD');
assert(bootstrap.includes('"CUS_LAST_BUILD"'), 'the mission must publish CUS_LAST_BUILD');
assert(missionText.includes('"custom script compatibility"') && missionText.includes('{"call_macro":"custom script compatibility"}'), 'compatibility macro missing or not called');

// Legacy (original 0.997 script, kept until 0.998): every variable it sets is still read by the mission.
assert(bootstrap.includes('"MISSION_VERSION"},"value":"0.997"'), 'legacy scripts look at 0.997: do not change MISSION_VERSION before 0.998');
const legacyText = read('tools/fixtures/train-legacy-0.997.json');
const unread = [...new Set([...legacyText.matchAll(/"(L:[A-Za-z0-9_ ]+)"/g)].map((m) => m[1]))].filter((n) => n !== 'L:SKIPIFCLOSE' && !missionText.includes(n));
assert.deepStrictEqual(unread, [], 'the mission no longer reads variables of the legacy script: ' + unread.join(', '));
for (const name of ['OBJECT1', 'OBJECT15']) assert(missionText.includes('"' + name + '"'), 'legacy ' + name + ' path removed');

const everything = JSON.stringify(script);
assert(!/[^\x00-\x7F]/.test(everything), 'train.json must stay ASCII');

console.log('test-custom-script.js: PASS (' + objects.length + ' objects, static only, runtime pending)');
