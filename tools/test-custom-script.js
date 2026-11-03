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
const fields = ['title', 'lat', 'lon', 'var1', 'var2', 'aim', 'aimlat', 'aimlon', 'fallback', 'heading'];

const objects = commands.filter((c) => c.modify_array && c.modify_array.local === 'CUS_OBJECTS');
assert(objects.length <= 30, 'at most 30 custom objects');
for (const [index, command] of objects.entries()) {
  const item = command.append && command.append.create_struct;
  assert(item, 'object ' + (index + 1) + ' must append a create_struct');
  for (const key of Object.keys(item)) assert(fields.includes(key), 'unknown object field ' + key);
  assert.strictEqual(typeof item.title, 'string', 'object ' + (index + 1) + ' needs a title');
  assert(Number.isFinite(item.lat) && Number.isFinite(item.lon), 'object ' + (index + 1) + ' needs lat and lon');
  assert(Number.isInteger(item.aim) && item.aim >= 0 && item.aim <= 6, 'object ' + (index + 1) + ' aim must be 0 to 6');
  assert(item.aim !== 6 || index > 0, 'the first object has no previous object to face');
  assert(item.aim !== 5 || (item.aimlat !== 0 && item.aimlon !== 0), 'object ' + (index + 1) + ' aim 5 needs aimlat and aimlon');
}
const initIndex = commands.findIndex((c) => c.set && c.set.local === 'CUS_OBJECTS');
assert(initIndex >= 0, 'CUS_OBJECTS must be initialised');
assert(commands.findIndex((c) => c.modify_array) > initIndex, 'objects are appended after the initialisation');
assert(!commands.some((c) => c.set && c.set.local && /^OBJECT\d+$/.test(c.set.local)), 'the old numbered OBJECTn locals are not used by the script any more');

const navigation = read('mission-src/macros/05-navigation-queries.json');
assert(navigation.includes('"custom objects engine": ['), 'engine macro missing');
assert(navigation.includes('{"call_macro":"custom objects engine"}'), 'engine macro not called by the object thread');
assert(navigation.includes('{"if": {"local":"ce_i"}, "lt": 30,'), 'the engine must stop at 30 objects');

// point_object takes literal names (a local as subject is rejected: "unknown locRef"): one macro per object slot.
for (let n = 1; n <= 30; n++) {
  assert(navigation.includes('"custom point CUSOBJ' + n + '": ['), 'missing pointing macro for slot ' + n);
  assert(navigation.includes('{"point_object":"CUSOBJ' + n + '","to":"accident_location"}'), 'slot ' + n + ' must point with its literal name');
}
assert(navigation.includes('{"call_macro":"custom object point"}'), 'the engine must call the pointing dispatcher');
assert(!/"point_object":\{/.test(navigation), 'point_object subject must be a literal name');

const missionText = fs.readdirSync(path.join(root, 'mission-src', 'macros')).map((f) => read('mission-src/macros/' + f)).join('\n');
for (const command of commands) {
  const name = command.set && command.set.var && command.set.var[0];
  if (!name || !name.startsWith('L:CUS')) continue;
  assert(missionText.includes(name), 'the script sets ' + name + ' but no mission macro reads it');
}

// Versions (user rule 2026-10-30, original logic kept): the script states the mission version AND build it needs (MIN_VERSION, MIN_BUILD)
// and its own build (SCRIPT_BUILD); the mission publishes its build (CUS_LAST_BUILD) and the oldest script build it works with
// (CUS_MIN_SCRIPT_BUILD); the briefing of the script checks both ways. Nothing is an option for the user.
const bootstrap = read('mission-src/macros/01-bootstrap-settings.json');
const local = (name) => { const c = commands.find((x) => x.set && x.set.local === name); return c && c.value; };
const identity = (bootstrap.match(/"RELEASE_IDENTITY"\},"value":"\S+ (\d+)\.(\d+)"/) || []);
const buildN = Number(identity[1]) * 1000 + Number(identity[2]);
assert.strictEqual(local('MIN_VERSION'), 0.997, 'MIN_VERSION is the mission version the script needs (the mission publishes 0.997)');
assert(local('MIN_BUILD') > 0 && local('MIN_BUILD') <= buildN, 'MIN_BUILD must be a build that exists');
const minScriptBuild = Number((bootstrap.match(/"CUS_MIN_SCRIPT_BUILD"\},"value":(\d+)/) || [])[1]);
assert(minScriptBuild > 0 && minScriptBuild <= buildN, 'version check must set CUS_MIN_SCRIPT_BUILD');
assert(local('SCRIPT_BUILD') >= minScriptBuild, 'the script build is below the oldest script build the mission accepts');
assert(local('SCRIPT_BUILD') <= buildN, 'the script is newer than this mission');
assert(bootstrap.includes('"CUS_LAST_BUILD"},"value":{"local":"BUILD_N"}'), 'the mission must publish its build in CUS_LAST_BUILD');
assert(!JSON.stringify(commands).includes('CUS_SCRIPT_API'), 'no script API number: the versions are MIN_VERSION, MIN_BUILD, SCRIPT_BUILD');
const label = '169.' + (local('MIN_BUILD') % 1000);
const briefingChecks = script.briefing.filter((item) => item.text && /This script (requires|needs|is obsolete)|your mission version was/.test(item.text));
assert.strictEqual(briefingChecks.length, 4, 'briefing: version check, two build checks (no build reported / build too old), obsolete script check');
assert(briefingChecks.every((item) => item.show_condition), 'every minimum text is a check');
assert(!/"or"/.test(JSON.stringify(briefingChecks.map((item) => item.show_condition))), 'show_condition does not work with or: one row per case');
assert(JSON.stringify(briefingChecks[0].show_condition) === '{"require":{"local":"MIN_VERSION"},"gt":{"global":"first_run"}}', 'the version check is the original one');
assert(briefingChecks[1].text.includes(label) && JSON.stringify(briefingChecks[1].show_condition) === '{"require":{"global":"CUS_LAST_BUILD"},"eq":null}', 'the first build check covers a mission that reports no build');
assert(briefingChecks[2].text === briefingChecks[1].text && JSON.stringify(briefingChecks[2].show_condition).includes('"gt":{"global":"CUS_LAST_BUILD"}'), 'the second build check covers a reported build below MIN_BUILD');
assert(JSON.stringify(briefingChecks[3].show_condition).includes('"gt":{"local":"SCRIPT_BUILD"}') && briefingChecks[3].params.some((p) => p.local === 'SCRIPT_BUILD'), 'the obsolete script check compares CUS_MIN_SCRIPT_BUILD with SCRIPT_BUILD');
assert(!missionText.includes('custom script compatibility'), 'the mission-side compatibility macro was removed (versions are checked in the script briefing)');

// Legacy (original 0.997 script, kept until 0.998): every variable it sets is still read by the mission.
assert(bootstrap.includes('"MISSION_VERSION"},"value":"0.997"'), 'legacy scripts look at 0.997: do not change MISSION_VERSION before 0.998');
const legacyText = read('tools/fixtures/train-legacy-0.997.json');
const unread = [...new Set([...legacyText.matchAll(/"(L:[A-Za-z0-9_ ]+)"/g)].map((m) => m[1]))].filter((n) => n !== 'L:SKIPIFCLOSE' && n !== 'L:CUS_USERA LAT' && n !== 'L:CUS_USERA LON' && !missionText.includes(n));
assert.deepStrictEqual(unread, [], 'the mission no longer reads variables of the legacy script: ' + unread.join(', '));
for (const name of ['OBJECT1', 'OBJECT15']) assert(missionText.includes('"' + name + '"'), 'legacy ' + name + ' path removed');

// 169.94: CUS_USERA is gone (userA is the accident place), heading is measured from north, CUS_HELIRESCUER is read.
assert(!fs.readdirSync(path.join(root, 'mission-src/macros')).some((n) => read('mission-src/macros/' + n).includes('CUS_USERA')), 'the mission must not read CUS_USERA any more');
assert(!JSON.stringify(script).includes('CUS_USERA'), 'the script must not set CUS_USERA');
assert(JSON.stringify(commands).includes('L:CUS_HELIRESCUER LAT') && JSON.stringify(commands).includes('L:CUS_HELIRESCUER LON'), 'the script sets CUS_HELIRESCUER');
assert(navigation.includes('"L:CUS_HELIRESCUER LAT"') && navigation.includes('"L:CUS_HELIRESCUER LON"'), 'Query random heli rescuer reads CUS_HELIRESCUER');
assert(/"ce_hdg_rel"\},"value":\{"subtract":\[\{"local":"ce_hdg"\},\{"var":\["PLANE HEADING DEGREES TRUE"/.test(navigation), 'the fixed heading is converted from north to the helicopter nose');
assert(!navigation.includes('"heading":{"local":"ce_hdg"}'), 'create_object must use the converted heading');

// 169.95: the script may choose the language in which the dispatcher reads the dispatch (local CUS_DISPATCH_LANGUAGE, a language code, empty = the voice pack).
const voiceModule = read('mission-src/macros/03-aircraft-crew-checklists.json');
assert(voiceModule.includes('"voice dispatch language tag": [') && voiceModule.includes('{"text":"<language:{0}>","params":[{"local":"CUS_DISPATCH_LANGUAGE"}]}'), 'the mission builds the <language:XX> tag from CUS_DISPATCH_LANGUAGE');
assert(voiceModule.includes('<actor8><radio:ext>{3}<text:DSC.{0}.{1}>{2}') && voiceModule.includes('<actor8><radio:ext>{3}<text:DSC.VEH>'), 'the dispatcher lines of the description and of the vehicle carry the language tag');
assert(voiceModule.includes('"lang":{"param":"vo_lt"}') && voiceModule.includes('"{2}<say:{0}>{1}"'), 'the objective carries the language tag through voice say');
const dispatchLanguage = commands.find((c) => c.set && c.set.local === 'CUS_DISPATCH_LANGUAGE');
if (dispatchLanguage) assert(typeof dispatchLanguage.value === 'string' && /^([A-Za-z]{2})?$/.test(dispatchLanguage.value), 'CUS_DISPATCH_LANGUAGE must be empty or a two-letter language code');

// Older scripts with a newer mission (decision of 2026-11-03, docs/architecture/CUSTOM_SCRIPT_TRAIN.md "Older scripts"): the mission keeps working
// with a script that does not set what was added later, so CUS_MIN_SCRIPT_BUILD is not raised for additions. Every variable that older scripts
// do not set is read with a guard that gives the default; the frozen original script is the proof that the premise holds (no checkout history
// is needed, the continuous integration clones one commit only).
{
  const macrosDir = path.join(root, 'mission-src/macros');
  const allMacros = {};
  for (const name of fs.readdirSync(macrosDir).filter((n) => n.endsWith('.json'))) Object.assign(allMacros, JSON.parse(read('mission-src/macros/' + name)));
  const readers = (needle) => Object.entries(allMacros).filter(([, body]) => JSON.stringify(body).includes(needle)).map(([name]) => name);
  const additions = ['CUS_INJURED', 'CUS_HELIRESCUER', 'CUS_DISPATCH_LANGUAGE', 'CUS_OBJECTS', 'CUS_HOSPITAL'];
  for (const name of additions) assert(!legacyText.includes(name), 'the original script is the premise: it does not set ' + name);
  // what each reader does when the script does not set it
  const guard = (needle, guardText, why) => {
    const found = readers(needle);
    assert(found.length > 0, needle + ' is no longer read by the mission');
    for (const macro of found) {
      if (JSON.stringify(allMacros[macro]).includes(guardText)) continue;
      // the guard may live in the only macros that call the reader (one level)
      const callers = readers('"call_macro":"' + macro + '"');
      assert(callers.length > 0 && callers.every((c) => JSON.stringify(allMacros[c]).includes(guardText)), macro + ' reads ' + needle + ' without the guard (and its callers do not hold it): ' + why);
    }
  };
  guard('"CUS_INJURED"', '{"require":{"local":"CUS_INJURED"},"ne":null}', 'an unset list leaves the mission choice of the injured');
  assert.deepStrictEqual(readers('"CUS_INJURED"'), ['custom injured assets prepare'], 'CUS_INJURED is read in one place only');
  assert(JSON.stringify(allMacros['custom injured assets prepare']).includes('{"require":{"local":"player"},"eq":"custom"}'), 'the injured list is used only in a custom mission');
  guard('"CUS_DISPATCH_LANGUAGE"', '{"require":{"local":"CUS_DISPATCH_LANGUAGE"},"ne":null}', 'an unset language is the language of the voice pack');
  guard('"CUS_DISPATCH_LANGUAGE"', '{"require":{"local":"CUS_DISPATCH_LANGUAGE"},"ne":""}', 'an empty language is the language of the voice pack');
  guard('L:CUS_HELIRESCUER LAT', '"if":{"var":["L:CUS_HELIRESCUER LAT","number"]},"ne":0', 'an unset pick-up point (0) means the mission searches one');
  guard('L:CUS_HOSPITAL LAT', '{"require":{"var":["L:CUS_HOSPITAL LAT","number"]},"ne":0}', 'an unset hospital (0) means the nearest one');
  guard('"CUS_OBJECTS"', '"if":{"local":"CUS_OBJECTS"},"ne":null', 'an unset list of objects goes to the numbered OBJECT1..15 path of the original script');
  guard('"resolve_location":{"create_array":[{"var":["L:CUS_RESCUE LAT","number"]},{"var":["L:CUS_RESCUE LON","number"]}', '"if":{"var":["L:CUS_RESCUE LAT","number"]},"eq":0', 'an unset rescue point (0) means the accident place');
  // the decision itself: raise it only when a change of the mission makes older scripts impossible, and say why in the document
  assert.strictEqual(minScriptBuild, 169089, 'CUS_MIN_SCRIPT_BUILD changed: raise it only when a change of the mission makes older scripts impossible (not for an addition that older scripts do not set) and write the reason in docs/architecture/CUSTOM_SCRIPT_TRAIN.md, section "Older scripts with a newer mission"');
}

const everything = JSON.stringify(script);
assert(!/[^\x00-\x7F]/.test(everything), 'train.json must stay ASCII');

console.log('test-custom-script.js: PASS (' + objects.length + ' objects, static only, runtime pending)');
