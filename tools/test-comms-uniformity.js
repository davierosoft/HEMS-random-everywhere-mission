#!/usr/bin/env node
'use strict';

// User request of 2026-10-18: the communications of the crew are uniform across the operations (landing 3/4/5 crew, skid 3/4/5 crew, hoist, heli rescuer,
// police or ambulance taking the crew, meeting with the ambulance half way, briefings by kind of mission, patient death and CPR). Static checks of the
// production sources and of the base pack EN of the Companion repository (when it is next to this one): every voice key used exists in the pack and the
// moments that were missing in a mode have their line. No HPG/MSFS behaviour is modeled, runtime PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const loadDir = (dir) => {
  const out = {};
  for (const file of fs.readdirSync(path.join(root, 'mission-src', dir)).filter((name) => name.endsWith('.json'))) Object.assign(out, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', dir, file), 'utf8')));
  return out;
};
const macros = loadDir('macros');
const text = (value) => JSON.stringify(value);
const count = (haystack, needle) => haystack.split(needle).length - 1;
const all = text(macros);
const lv = (n) => `"L:{local:VCP}${n}","number"`;

// 1. every static voice key used by the mission is a message of the base pack EN
const packPath = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'EN.xml');
let pack = null;
if (fs.existsSync(packPath)) {
  pack = fs.readFileSync(packPath, 'utf8');
  const keys = new Set([...pack.matchAll(/<message key="([^"]+)"/g)].map((m) => m[1]));
  const used = new Set([...all.matchAll(/"call_macro":"voice say","params":\{"key":"([A-Z0-9.]+)"/g)].map((m) => m[1]));
  for (const m of all.matchAll(/<say:([A-Z0-9.]+)>/g)) if (m[1] !== 'KEY') used.add(m[1]);      // KEY is the placeholder of a comment
  for (const key of used) assert.ok(keys.has(key), `the voice key ${key} is used by the mission but is not in the base pack EN`);
  for (const key of ['CRT.POL.OUT', 'CRT.POL.BCK', 'CRT.AMB.BCK', 'CRT.POL.OPR', 'CRT.WALK', 'MID.SET', 'MID.HND', 'TRF.HND', 'ORG.PCK', 'APR.MID.PLT', 'APR.MID.DOC', 'APR.MID.CHF', 'APR.MID.END', 'APR.MUL', 'APR.FIR']) {
    assert.ok(used.has(key), `${key} must be used by the mission`);
    const block = pack.slice(pack.indexOf(`<message key="${key}"`), pack.indexOf('</message>', pack.indexOf(`<message key="${key}"`)));
    assert.equal(count(block, '<o>'), 6, `${key} has six options`);
  }
  assert.ok(/<voicepack name="EN"[^>]* version="19"/.test(pack), 'the base pack EN is version 19');
  const dePath = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'DE.xml');
  if (fs.existsSync(dePath)) {
    const de = fs.readFileSync(dePath, 'utf8');
    assert.ok(/<voicepack name="DE"[^>]* version="7" basever="19"/.test(de), 'the pack DE is version 7 on the base 19');
    for (const key of ['CRT.POL.OUT', 'CRT.POL.BCK', 'CRT.AMB.BCK', 'CRT.POL.OPR', 'CRT.WALK', 'MID.SET', 'MID.HND', 'TRF.HND', 'ORG.PCK', 'APR.MID.PLT', 'APR.MID.DOC', 'APR.MID.CHF', 'APR.MID.END', 'APR.MUL', 'APR.FIR']) assert.ok(de.includes(`<message key="${key}"`), `${key} is translated in the pack DE`);
  }
}

// 2. skid with 3 crew: the ambulance and the patient on board are said like with 4 and 5 crew; nobody says "will travel by ambulance" for a patient who died
for (const name of ['3 crew SKID LDG', '4 crew SKID LDG', '5 crew SKID LDG']) {
  const body = text(macros[name]);
  assert.ok(body.includes(lv(20)), `${name}: "the patient will travel by ambulance" (PAX1 20)`);
  assert.ok(body.includes(lv(65)), `${name}: "the doctor and patient will travel by ambulance" (PAX1 65)`);
  assert.ok(body.includes('"L:PAX3{local:VCP}10"'), `${name}: "the patient is on board" (PAX3 10)`);
  const at = body.indexOf('"whobringpatient"},"eq":"ambulance"');
  assert.ok(at >= 0, `${name}: the ambulance branch exists`);
}
assert.ok(text(macros['3 crew SKID LDG']).includes('"Ground medical services will manage patient transport. Return to the skid landing area to pick up the cabin crew"}},{"set":{"var":[' + lv(20)), '3 crew skid: PAX1 20 only for a patient who did not die (else branch of the death check)');
for (const name of ['4 crew SKID LDG', '5 crew SKID LDG']) {
  const body = text(macros[name]);
  assert.ok(body.includes('"whobringpatient"},"eq":"ambulance","then":[') && /"eq":"ambulance","then":\[(\{"sleep":\[1,3\]\},)?\{"if":\{"local":"patientlife"\},"ne":"died","then":\[\{"set":\{"var":\[/.test(body), `${name}: PAX1 20 only for a patient who did not die`);
}

// 3. hoist and skid visits: the chief says the time left like the ground update of the landing operations (GRD.ETA from MINGND), once every 5 minutes
const visit = text(macros['voice hoist visit']);
for (const key of ['GRD.ETA.0', 'GRD.ETA.1', 'GRD.ETA.N']) assert.ok(visit.includes(`"${key}"`), `voice hoist visit: ${key}`);
assert.ok(visit.includes('"local":"MINGND"') && visit.includes('"add":[{"local":"vhv_eta_t"},300]') && visit.includes('"param":"stage"},"eq":"ARR"'), 'the time left is said at the arrival of the doctor, from MINGND, at most once every 300 s');
assert.ok(visit.includes('"create_thread"') && visit.includes('"set":{"param":"vhe_key"},"value":{"local":"vhv_eta_key"}'), 'the time left is said by a thread that copies its values into its own params (the visit does not wait)');

// 4. the crew leaves or comes back with the police or the ambulance: the doctor or the rear crew tell it (landing operations with 3, 4 and 5 crew)
assert.equal(count(all, '"call_macro":"voice say","params":{"key":"CRT.POL.OUT"}'), 2, 'CRT.POL.OUT after the message of the police car to the scene (4/5 crew and 3 crew)');
assert.equal(count(all, '"call_macro":"voice say","params":{"key":"CRT.AMB.BCK"}'), 2, 'CRT.AMB.BCK after the message of the ambulance back (4/5 crew and 3 crew)');
assert.equal(count(all, '"call_macro":"voice say","params":{"key":"CRT.POL.BCK"}'), 3, 'CRT.POL.BCK: back by police car (4/5 crew, 3 crew, closest police car)');
assert.equal(count(all, '"call_macro":"voice say","params":{"key":"CRT.POL.OPR"}'), 2, 'CRT.POL.OPR: the doctor goes with the ambulance, the rear crew comes back by police car');
assert.equal(count(all, '"call_macro":"voice say","params":{"key":"CRT.WALK"}'), 1, 'CRT.WALK: no police car close enough');

// 5. meeting half way, transfer of a patient and organ transport
assert.equal(count(all, '"key":"MID.SET"'), 1, 'MID.SET when the meeting point is accepted');
assert.ok(all.slice(all.indexOf('REACH THE CONCORDED MEETING POINT'), all.indexOf('REACH THE CONCORDED MEETING POINT') + 400).includes('"key":"MID.SET"'), 'MID.SET comes right after the objective of the meeting point');
assert.equal(count(text(macros['midway patient load1']) + text(macros['midway patient load2']), '"key":"MID.HND"'), 2, 'MID.HND in both midway loadings');
assert.ok(text(macros['transfer patient paperwork']).includes('"key":"TRF.HND"'), 'the handover at the hospital of a patient transfer');
assert.ok(text(macros['organ pick up scene1']).includes('"key":"ORG.PCK"'), 'the organ pickup');
const mid = text(macros['voice midway briefing']);
for (const key of ['APR.MID.PLT', 'APR.MID.DOC', 'APR.MID.CHF', 'APR.MID.END']) assert.ok(mid.includes(`"${key}"`), `voice midway briefing: ${key}`);
assert.ok(mid.includes('"local":"VCP"},"eq":"APP"') && mid.includes('"declut":1'), 'the midway briefing is for the app and is chatter');
assert.equal(count(all, '"call_macro":"voice midway briefing"'), 1, 'the midway briefing is called once, from the 2 NM thread of the loading point when L:MIDWAY is 1');
assert.ok(all.includes('"var":["L:MIDWAY","number"]},"eq":1,"then":[{"sleep":4},{"call_macro":"voice midway briefing"}]'), 'the midway briefing only with L:MIDWAY 1');

// 6. the approach briefing carries information of the mission: more than one patient, fire on scene
const approach = text(macros['voice approach briefing']);
assert.ok(approach.includes('"local":"HELOVICTIMS"},"gte":2') && approach.includes('<say:APR.MUL>'), 'the approach briefing says that more than one patient is expected');
assert.ok(approach.includes('"local":"random_fire"},"eq":"yes"') && approach.includes('"local":"random_fire"},"eq":"forced"') && approach.includes('<say:APR.FIR>'), 'the approach briefing says that there is a fire on scene');
assert.ok(approach.indexOf('<say:APR.FIR>') < approach.indexOf('<say:APR.END>'), 'the closing line of the briefing stays last');

// 7. CPR on the ground: the doctor says that it starts (hoist and skid), that it worked, that the patient does not respond
const cpr = text(macros['CPR']);
assert.ok(cpr.includes('"L:MISSION_HOIST","number"]},"ne":0') && cpr.includes('"L:PAX3{local:VCP}17"'), 'CPR in progress is said also on the ground in the hoist and skid operations');
assert.ok(/"local":"cpr_provider"\},"eq":"HEMS","then":\[\{"set":\{"var":\["L:PAX3\{local:VCP\}20"/.test(cpr), 'CPR successful is said whenever the crew did the CPR');
assert.ok(cpr.includes('"L:PAX3{local:VCP}21"'), 'the patient does not respond to CPR (the key that was never called)');

console.log('Communications uniformity PASS: landing, skid, hoist, police and ambulance crew transfer, midway meeting, transfer, organ, briefings, CPR and the keys of the base pack. HPG/MSFS PENDING.');
