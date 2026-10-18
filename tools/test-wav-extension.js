#!/usr/bin/env node
'use strict';

// User request of 2026-10-18: the wavs of the spreadsheet docs/AND_voice_messages.xlsx that no macro called, wired where the mission has the condition of
// its column E ("trigger"). Each increment is the wav LVAR of the packs and, with the Companion, the pack message of the same LVAR. Static checks of the
// production sources: no HPG/MSFS behaviour is modeled, runtime PENDING. The spreadsheet is read when present (a minimal reader of its XML: rows of
// the wavs and their LVARs) to check that every LVAR wired here is one of its rows.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const root = path.join(__dirname, '..');
const readModules = (dir) => {
  const out = {};
  for (const file of fs.readdirSync(path.join(root, 'mission-src', dir)).filter((name) => name.endsWith('.json'))) Object.assign(out, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', dir, file), 'utf8')));
  return out;
};
const macros = readModules('macros');
const threads = readModules('threads');
const text = (value) => JSON.stringify(value);
const inc = (lvar) => `{"set":{"var":["${lvar}","number"]},"value":{"add":[{"var":["${lvar}","number"]},1]}}`;
const count = (haystack, needle) => haystack.split(needle).length - 1;

// the LVARs wired here are rows of the spreadsheet (xlsx = zip; the sheet is the only worksheet)
const xlsx = path.join(root, 'docs', 'AND_voice_messages.xlsx');
const wired = ['MAR{local:VCP}5', 'PAX3{local:VCP}30', 'PAX3{local:VCP}31', 'PAX3{local:VCP}32', 'PAX3{local:VCP}33', 'PAX3{local:VCP}34', 'PAX3{local:VCP}35', 'PAX3{local:VCP}37', 'CPL{local:VCP}64'];
if (fs.existsSync(xlsx)) {
  const buf = fs.readFileSync(xlsx);
  // central directory scan for xl/worksheets/sheet1.xml
  let eocd = buf.length - 22; while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd -= 1;
  const entries = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16); let sheet = null;
  for (let i = 0; i < entries; i += 1) {
    const method = buf.readUInt16LE(p + 10); const csize = buf.readUInt32LE(p + 20); const nlen = buf.readUInt16LE(p + 28); const elen = buf.readUInt16LE(p + 30); const clen = buf.readUInt16LE(p + 32); const off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    if (name === 'xl/worksheets/sheet1.xml') {
      const lh = off; const dataStart = lh + 30 + buf.readUInt16LE(lh + 26) + buf.readUInt16LE(lh + 28);
      const raw = buf.subarray(dataStart, dataStart + csize);
      sheet = (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
    }
    p += 46 + nlen + elen + clen;
  }
  assert.ok(sheet, 'the spreadsheet has its worksheet');
  const lvars = new Set([...sheet.matchAll(/<x:c r="A\d+"[^>]*><x:v>(L:[^<]+)<\/x:v>/g)].map((m) => m[1]));
  assert.ok(lvars.size > 240, 'the spreadsheet lists the wavs of the pack');
  for (const w of wired) assert.ok(lvars.has('L:' + w.replace('{local:VCP}', 'AND')), `${w} is a row of the spreadsheet`);
}

// 1. ground units: the arrival flags of the parking macros call the helper once per arrival
const ground = text({ a: macros.park_ambulance1_scene, b: macros.park_ambulance1, c: macros.park_closest_ambulance, d: macros.park_police, e: macros.park_firetruck1 });
const groundAll = text(Object.fromEntries(Object.entries(macros).filter(([name]) => /^(park_|Ambulance1|Police1|Firetruck1)/.test(name))));
assert.equal(count(groundAll, '"call_macro":"wav unit arrival","params":{"unit":"ambulance"}'), 3, 'the three ambulance 1 arrival sites call the helper');
assert.equal(count(groundAll, '"call_macro":"wav unit arrival","params":{"unit":"police"}'), 1, 'the police arrival calls the helper');
assert.equal(count(groundAll, '"call_macro":"wav unit arrival","params":{"unit":"fire"}'), 2, 'the fire engine 1 parking sites call the helper');
assert.ok(ground.length > 0);
const unit = text(macros['wav unit arrival']);
assert.ok(unit.includes('"local":"MISSION_PHASE"},"gte":5') && unit.includes('"local":"MISSION_PHASE"},"lte":7'), 'only while the crew is on the way or on scene');
for (const n of [32, 34, 35]) assert.ok(unit.includes(inc(`L:PAX3{local:VCP}${n}`)), `PAX3 ${n} is incremented by the helper`);
assert.ok(unit.includes('"local":"random_fire"},"ne":"no"') && unit.indexOf('"local":"random_fire"') < unit.indexOf(inc('L:PAX3{local:VCP}35')), 'the fire hazard line only with a fire or smoke hazard');
assert.ok(count(unit, '"add":[{"local":"wua_t_') === 3 && count(unit, '120') >= 3, 'each unit is announced once in 120 s (several parking branches set the arrival)');

// 2. secondary rescue: PAX3 33, PAX3 37 later with more than one casualty
assert.ok(text(macros['ambulance2 secondary rescue']).includes('"call_macro":"wav secondary rescue"'), 'the secondary rescue calls the helper');
const second = text(macros['wav secondary rescue']);
assert.ok(second.includes(inc('L:PAX3{local:VCP}33')) && second.includes(inc('L:PAX3{local:VCP}37')) && second.includes('"local":"HELOVICTIMS"},"gte":2'), 'PAX3 33 at the assignment, PAX3 37 only with additional patients');

// 3. CPR: PAX3 30 CPR awaits the landing (airborne, patient aboard, no mCPR) once per CPR start, PAX3 31 the STOP CPR button (both pages)
const medical = text(macros['CPR']);
assert.ok(medical.includes(inc('L:PAX3{local:VCP}30')) && medical.includes('"var":["SIM ON GROUND","bool"]},"eq":0,"then":[{"set":{"var":["L:PAX3{local:VCP}30"'), 'PAX3 30 only in the air');
assert.equal(count(text(macros), '{"title":"STOP CPR","commands":[{"set":{"var":["L:CPR","number"]},"value":5},' + inc('L:PAX3{local:VCP}31')), 2, 'both STOP CPR buttons call PAX3 31');
assert.equal(count(medical, '"value":"awaiting_landing"'), 2, 'the CPR loop keeps its own awaiting_landing (not a call site: it repeats every 5 s)');

// 4. marshal: MAR 5 when the landing is committed inside the landing area
const commit = text(macros['marshaller animation monitor']);
assert.ok(commit.includes('{"set":{"local":"marshall_landing_commit"},"value":1},' + inc('L:MAR{local:VCP}5')), 'MAR 5 at the landing commit');
assert.equal(count(commit, 'L:MAR{local:VCP}'), 2, 'the marshal corrections MAR 1-4 are not wired: the animation states are not documented (see docs/architecture/VOICE_APP_MODE.md)');

// 5. engine start held by the marshal guard or the pisteur guidance: CPL 64 in both engine threads
for (const name of ['ENG 1_2', 'ENG 2_1']) {
  const eng = text(threads[name]);
  assert.ok(eng.includes(inc('L:CPL{local:VCP}64')) && eng.includes('"or":[{"require":{"local":"marshall_engine_guard_active"},"eq":1},{"require":{"local":"pisteur3_guidance_active"},"eq":1}]'), `${name}: CPL 64 when the guard holds the copilot engine start`);
}

// 6. death: PAX3 7 is not said again after the CPR failure line PAX3 19
assert.ok(text(macros['voice patient died']).includes('"var":["L:CPR","number"]},"ne":4'), 'PAX3 7 is skipped after a failed CPR (PAX3 19 was said)');
console.log('Wav extension PASS: 9 wavs of the spreadsheet wired at their conditions (MAR 5, PAX3 30-35 and 37, CPL 64). HPG/MSFS PENDING.');
