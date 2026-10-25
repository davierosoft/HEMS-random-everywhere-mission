#!/usr/bin/env node
'use strict';

// Keys of the texts the mission speaks as free text (translated packs of the Mission Companion): the sources and tools/voice-texts.json agree,
// every spoken text has a key, the dispatch reading builds the key from the incident and keeps its English, and the checker catches what it must.
// Static checks of the production sources: no HPG/MSFS behaviour is modeled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scanSpeaks, accidentTexts, build, render, TEMPLATES } = require('./voice-texts');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

// 1. the committed list is the one of the sources, nothing is spoken without a key, the keys are valid
const built = build();
assert.deepEqual(built.problems, [], 'the sources have no key problem');
assert.deepEqual(built.unkeyed, [], 'every spoken text has a key (node tools/voice-texts.js assign)');
assert.equal(fs.readFileSync(path.join(__dirname, 'voice-texts.json'), 'utf8'), render(built.texts), 'tools/voice-texts.json is the list of the sources (node tools/voice-texts.js sync)');
const keys = Object.keys(built.texts);
assert.equal(keys.filter((key) => key.startsWith('CHK.')).length, 377, 'the checklist rows');
assert.equal(keys.filter((key) => /^DSC\.\d+\.[1-4]$/.test(key)).length, 320, 'the dispatch descriptions: 80 incidents with 4 variants');
for (const key of keys) assert.match(key, /^[A-Za-z0-9_.-]{1,40}$/, `${key} is a valid pack key`);
assert.ok(!keys.some((key) => key.startsWith('DSP.')), 'DSP.* is the prefix of the dispatcher messages of the base pack: the descriptions use DSC');

// 2. the dispatch reading: key from the incident (VAR_MISSION_NUMBER = ID_CARD, CRASH_VARIABLE), the shown English after it, the vehicle apart
const read = JSON.stringify(macros['voice read dispatch']);
assert.ok(read.includes('<actor8><radio:ext><text:DSC.{0}.{1}>{2}'), 'the description is spoken with its key and its English');
assert.ok(read.includes('"VAR_MISSION_NUMBER"') && read.includes('"CRASH_VARIABLE"'), 'the key is built from the incident and the variant');
assert.ok(read.includes('<text:DSC.VEH>{0}//{1}//{2}'), 'the vehicle sentence has its own key and the values after the English');
assert.ok(!read.includes('<plain>'), 'the description is not spoken as <plain> any more');
assert.ok(TEMPLATES['DSC.VEH'] === 'Vehicle: {0} {1}.', 'the template of the vehicle sentence');
const incidents = JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'data', '02-waypoints-and-categories.json'), 'utf8')).accidents;
assert.ok(incidents.every((incident) => Number.isInteger(incident.ID_CARD)), 'every incident has the whole number ID_CARD that VAR_MISSION_NUMBER takes');
const lifecycle = fs.readFileSync(path.join(root, 'mission-src', 'macros', '11-mission-lifecycle.json'), 'utf8');
const pairs = [...lifecycle.matchAll(/"VAR_MISSION_NUMBER"\},"value":\{"struct":\{"param":"(\$item|nextaccident)"\},"path":"ID_CARD"\}/g)].length;
assert.ok(pairs >= 1, 'VAR_MISSION_NUMBER is set from ID_CARD of the incident (the key and the description come from the same incident)');

// 3. the vehicle of the search missions: the base text and the pieces are kept for the reading, without a stale value
const car = JSON.stringify(macros['SAR car dispatch text']);
for (const local of ['sar_desc_base', 'sar_veh_color', 'sar_veh_model', 'sar_veh_text', 'sar_desc_final']) assert.ok(car.includes(`"local":"${local}"`), `${local} is kept by SAR car dispatch text`);
assert.ok(car.indexOf('"local":"sar_desc_base"') < car.indexOf('"{0} {1}","params":[{"local":"accident_description"}'), 'the base description is kept before the vehicle is appended');

// 4. the checker catches what it must (synthetic sources, nothing is written)
const synthetic = (commands) => scanSpeaks({ 'x.json': { demo: commands } });
assert.equal(synthetic([{ speak: 'Hello there' }]).unkeyed.length, 1, 'a spoken text without a key is reported');
assert.equal(synthetic([{ speak: '<text:CHK.a.01>Hello there' }]).unkeyed.length, 0, 'a keyed text is fine');
assert.equal(synthetic([{ speak: '<say:CPL.5>' }, { speak: '<names:random>' }, { speak: '<defaultactor:11>' }]).unkeyed.length, 0, 'say and tag-only speaks are fine');
assert.equal(synthetic([{ speak: '<text:CHK.a.01>One' }, { speak: '<text:CHK.a.01>Another' }]).problems.length, 1, 'one key for two texts is reported');
assert.equal(synthetic([{ speak: '<text:bad key!>One' }]).problems.length, 1, 'an invalid key is reported');
assert.equal(synthetic([{ speak: '<text:CHK.a.01>One//two' }]).problems.length, 1, 'a // inside the English is reported');
assert.equal(synthetic([{ if: { local: 'a' }, then: [{ speak: '<text:CHK.a.02>Nested' }] }]).keyed.size, 1, 'a speak inside a branch is found');
assert.ok(accidentTexts([{ ID_CARD: 1, description1: 'a', description2: 'b', description3: 'c', description4: '' }]).problems.length >= 1, 'an empty description is reported');
assert.ok(accidentTexts([{ ID_CARD: 1, description1: 'a', description2: 'b', description3: 'c', description4: 'd' }, { ID_CARD: 1, description1: 'a', description2: 'b', description3: 'c', description4: 'd' }]).problems.length >= 1, 'a repeated ID_CARD is reported');

// 5. the command line: check passes on the repository (and, when the Companion folder is next to it, on its base pack)
const run = spawnSync(process.execPath, [path.join(__dirname, 'voice-texts.js'), 'check'], { encoding: 'utf8' });
assert.equal(run.status, 0, `voice-texts.js check: ${run.stdout}${run.stderr}`);

console.log(`Voice texts PASS: ${keys.length} keyed texts (${keys.filter((key) => key.startsWith('CHK.')).length} checklist rows, 320 dispatch descriptions, the vehicle template).`);
