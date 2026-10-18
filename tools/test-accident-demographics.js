#!/usr/bin/env node
'use strict';

// Tester report of 2026-10-18 (video, minute 33): the clinical record of a patient nobody has visited mixed what is known and what is not, and the dispatch texts did
// not always agree with the patient (a text that says "his" with a woman, students of 60, a "young patient" of 80). User rules: (1) the record shows what the rescue team
// reported (age, sex, state), the symptoms only when they are known, the diagnosis only after the assessment; (2) a dispatch text that names a sex gets that sex and a
// text that names a trade or an activity gets plausible ages (the table `accident demographics`); wording that is only a pronoun is neutral, or exists as a variant of
// the same accident with the other sex. Static check; the generation itself is HPG runtime behaviour (PENDING).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const data = read('mission-src/data/02-waypoints-and-categories.json');
const health = read('mission-src/data/05-health-profiles.json');
const accidents = data.accidents;
const table = data['accident demographics'];
assert.ok(Array.isArray(table) && table.length > 0, 'static accident demographics exists');

const macros = {};
const dir = path.join(root, 'mission-src', 'macros');
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
const text = (name) => JSON.stringify(macros[name]);

// 1. the table
const seen = new Set();
const byId = new Map();
for (const rec of table) {
  assert.ok(Number.isInteger(rec.id), 'record id');
  assert.ok(!seen.has(rec.id), `demographics of ${rec.id} twice`);
  seen.add(rec.id);
  const accident = accidents.find((a) => a.ID_CARD === rec.id);
  assert.ok(accident, `ID_CARD ${rec.id} is not an accident`);
  byId.set(rec.id, rec);
  for (const [key, value] of Object.entries(rec)) {
    if (key === 'id') continue;
    if (/^sex[1-4]$/.test(key)) assert.ok(value === 'male' || value === 'female', `${rec.id} ${key}`);
    else if (/^age_(min|max)[1-4]?$/.test(key)) assert.ok(Number.isInteger(value) && value >= 0 && value <= 110, `${rec.id} ${key}`);
    else assert.fail(`${rec.id}: unknown field ${key}`);
  }
  for (const suffix of ['', '1', '2', '3', '4']) {
    const lo = rec[`age_min${suffix}`], hi = rec[`age_max${suffix}`];
    assert.ok((lo === undefined) === (hi === undefined), `${rec.id}: age_min${suffix} and age_max${suffix} go together`);
    if (lo !== undefined) assert.ok(lo <= hi, `${rec.id}: age range ${suffix}`);
  }
  // a sex needs at least one profile of the pool that accepts it (else the engine drops it after a long loop)
  for (let j = 1; j <= 4; j += 1) {
    const sex = rec[`sex${j}`];
    if (!sex) continue;
    const pool = health[`health${accident[`pathologytype${j}`]}`];
    assert.ok(pool && pool.some((p) => !p.sex || p.sex === sex), `${rec.id} variant ${j}: no profile of the pool accepts ${sex}`);
  }
}

// 2. a text that names a sex has that sex, nothing gendered is left in the names
const MALE = /\b(he|his|him|himself|man|men|male|husband|father|dad|son|boy|boys|gentleman|grandfather|grandpa|fisherman)\b/i;
const FEMALE = /\b(she|her|herself|woman|women|female|wife|mother|mum|mom|daughter|girl|girls|lady|grandmother|grandma|saleswoman)\b/i;
for (const accident of accidents) {
  const rec = byId.get(accident.ID_CARD) || {};
  for (const field of ['name', 'general_description']) {
    const value = accident[field] || '';
    assert.ok(!MALE.test(value) && !FEMALE.test(value), `${accident.ID_CARD} ${field} names a sex: "${value}"`);
  }
  for (let j = 1; j <= 4; j += 1) {
    const value = accident[`description${j}`];
    const pool = health[`health${accident[`pathologytype${j}`]}`] || [];
    const poolSex = pool.length && pool.every((p) => p.sex === 'male') ? 'male' : (pool.length && pool.every((p) => p.sex === 'female') ? 'female' : null);
    const sex = rec[`sex${j}`] || poolSex;
    if (MALE.test(value)) assert.equal(sex, 'male', `${accident.ID_CARD} variant ${j} says male but the patient is ${sex || 'any'}: "${value}"`);
    if (FEMALE.test(value)) assert.equal(sex, 'female', `${accident.ID_CARD} variant ${j} says female but the patient is ${sex || 'any'}: "${value}"`);
  }
}
// the two sexes exist for the quad and the tractor, and the husband has a wife
const sexes = (id) => [1, 2, 3, 4].map((j) => byId.get(id)[`sex${j}`]);
assert.deepEqual(sexes(8), ['male', 'female', 'male', 'female']);
assert.equal(byId.get(11).sex1, 'male');
assert.equal(byId.get(11).sex2, 'female');
assert.equal(byId.get(56).sex3, 'male');
assert.equal(byId.get(56).sex4, 'female');
assert.ok(accidents.find((a) => a.ID_CARD === 56).description4.startsWith('Wife'));
assert.ok(health.health88.every((p) => p.sex === 'female'), 'the profile of the wife is female');

// 3. ages: trades and activities are adults, students are young
const ageOf = (id, suffix = '') => [byId.get(id)[`age_min${suffix}`], byId.get(id)[`age_max${suffix}`]];
for (const id of [8, 11, 13, 14, 15, 16, 36, 48, 4, 17, 37, 42, 63]) assert.ok(ageOf(id)[0] >= 18, `${id}: adults only`);
for (const id of [13, 14, 15, 16, 36, 48]) assert.ok(ageOf(id)[1] <= 65, `${id}: workers up to 65`);
for (const id of [34, 61]) assert.ok(ageOf(id)[0] >= 11 && ageOf(id)[1] <= 19, `${id}: students are young`);
assert.deepEqual(ageOf(49, '3'), [18, 35], 'the young patient of the doctor');

// 4. the macros and where they run: sex before the engine, ages after it (not for a saved game)
for (const name of ['accident demographics sex', 'accident demographics ages']) {
  const body = text(name);
  assert.ok(body.includes('"static":"accident demographics"'), `${name} reads the table`);
  assert.ok(body.includes('{"var":["L:RELOADSAVED","number"]},"ne":1'), `${name} leaves a saved game alone`);
  assert.ok(body.includes('"local":"VAR_MISSION_NUMBER"'), `${name} finds the accident by ID_CARD`);
}
assert.ok(text('accident demographics sex').includes('"path":"sex{local:CRASH_VARIABLE}"'));
assert.ok(text('accident demographics ages').includes('"path":"age_min{local:CRASH_VARIABLE}"'));
for (const n of [1, 2, 3]) assert.ok(text('accident demographics ages').includes(`"gte":${n},"then"`) || text('accident demographics ages').includes(`"gte":${n}}`) || text('accident demographics ages').includes(`"local":"HELOVICTIMS"},"gte":${n}`), `ages: patient ${n} only when he exists`);
const loading = JSON.stringify(macros.objective1 ? macros.objective1 : macros);
const lifecycle = Object.entries(macros).filter(([, body]) => JSON.stringify(body).includes('{"call_macro":"accident demographics sex"}'));
assert.equal(lifecycle.length, 1, 'the sex is set in one place');
const lb = JSON.stringify(lifecycle[0][1]);
const at = (needle) => { const i = lb.indexOf(needle); assert.ok(i >= 0, needle); return i; };
assert.ok(at('{"call_macro":"accident demographics sex"}') < at('{"call_macro":"pathology random engine"}'), 'sex before the pathology engine');
assert.ok(at('{"wait_for":{"local":"pathology_random_ready"},"eq":1}') < at('{"call_macro":"accident demographics ages"}'), 'ages after the engine is ready');
assert.ok(at('{"call_macro":"accident demographics ages"}') < at('{"call_macro":"Mission dispatch"}'));
void loading;

// 5. the clinical record
const record = JSON.stringify(macros['select medical patient page'] ? macros['select medical patient page'] : '') + Object.entries(macros).filter(([, body]) => JSON.stringify(body).includes('PATIENT {0} CLINICAL RECORD')).map(([, body]) => JSON.stringify(body)).join('');
assert.ok(record.includes('"text":"Patient: UNKNOWN, {0}yrs, {1}"'), 'age and sex of the rescue team report');
assert.ok(record.includes('"text":"Status reported by the rescue team: {0}"'), 'the state reported');
assert.ok(record.includes('"text":"Info from rescue team on scene: {0}"'), 'the report alone');
assert.ok(record.includes('"text":"Preliminary diagnosys: {0}"'), 'the diagnosis apart');
assert.ok(!record.includes('"text":"Info from rescue team on scene: {0}, Preliminary diagnosys: {1}"'), 'the diagnosis is not glued to the report');
assert.ok(record.includes('{"require":{"local":"medical_display_assessment_complete"},"eq":"yes"}'), 'the diagnosis waits for the assessment');
assert.ok(!/"show_condition":\{"or"/.test(record.slice(record.indexOf('Preliminary diagnosys'), record.indexOf('Preliminary diagnosys') + 700)), 'no OR in a renderer condition');
// the update of the ambulance: symptoms only when known, the same for every patient
const parts = text('symptoms parts');
for (const k of [1, 2, 3]) {
  assert.ok(parts.includes(`"local":"medical_symptoms${k}"},"ne":"NO INFO"`), `symptoms ${k}: NO INFO says nothing`);
  assert.ok(parts.includes(`"local":"medical_symptoms${k}"},"ne":"No info received"`));
}
const ambulance = Object.entries(macros).filter(([, body]) => JSON.stringify(body).includes('Medical update:')).map(([, body]) => JSON.stringify(body)).join('');
assert.ok(!/Symptoms: \{local:medical_symptoms1\}|symptoms: \{local:generic_pathology|symptoms: \{local:medical_symptoms/.test(ambulance), 'no text prints a symptom directly');
assert.ok(ambulance.includes('{local:symptoms_part1}') && ambulance.includes('{local:symptoms_part2}') && ambulance.includes('{local:symptoms_part3}'));
assert.ok(ambulance.indexOf('{"call_macro":"symptoms parts"}') >= 0 && ambulance.indexOf('{"call_macro":"symptoms parts"}') < ambulance.indexOf('Medical update:'), 'the parts are built before the texts');

console.log(`accident demographics PASS: ${table.length} accidents with rules, no sex in a name, every sex word agrees with the patient, adults for trades and sports, the clinical record shows what is known. Runtime PENDING.`);
