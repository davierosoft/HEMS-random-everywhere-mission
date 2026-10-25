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
  // the keys with a variant for the medical team (.T) and the blood supply (.B): the mission adds the suffix voice_sfx (user, 2026-10-21)
  const withSuffix = [...all.matchAll(/"key":\{"text":"([A-Z0-9.{}]+)\{(\d)\}","params":\[(?:[^\]]*,)?\{"local":"voice_sfx"\}\]\}/g)].map((m) => m[1]);
  const suffixed = new Set(['ORG.INF', 'ORG.PCK', 'ORG.PCK.G', 'ORG.PCK.R', 'HOS.ORG', 'HOS.ORG.LT', 'ORG.DEL.LT', 'APR.ORG.PLT']);
  for (const key of suffixed) { assert.ok(withSuffix.includes(key), `${key} is said with the suffix of the payload`); used.add(key); }
  for (const key of ['OBJ.ORG', 'BRF.ORG.PLT', 'APR.ORG.PLT', 'DSP.ANS.ORG', 'PCK.CALL.ORG', 'PCK.REPLY.ORG', ...suffixed]) {
    for (const sfx of ['T', 'B']) {
      assert.ok(keys.has(`${key}.${sfx}`), `${key}.${sfx} is a message of the base pack EN`);
      const at = pack.indexOf(`<message key="${key}.${sfx}"`);
      assert.equal(count(pack.slice(at, pack.indexOf('</message>', at)), '<o>'), 6, `${key}.${sfx} has six options`);
    }
  }
  for (const key of ['CRT.POL.OUT', 'CRT.POL.BCK', 'CRT.AMB.BCK', 'CRT.POL.OPR', 'CRT.WALK', 'MID.SET', 'MID.HND', 'TRF.HND', 'ORG.PCK', 'APR.MID.PLT', 'APR.MID.DOC', 'APR.MID.CHF', 'APR.MID.END', 'APR.MUL', 'APR.FIR']) {
    assert.ok(used.has(key), `${key} must be used by the mission`);
    const block = pack.slice(pack.indexOf(`<message key="${key}"`), pack.indexOf('</message>', pack.indexOf(`<message key="${key}"`)));
    assert.equal(count(block, '<o>'), 6, `${key} has six options`);
  }
  assert.ok(Number((/<voicepack name="EN"[^>]* version="(\d+)"/.exec(pack) || [])[1]) >= 27, 'the base pack EN is version 27 or later');
  const dePath = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'DE.xml');
  if (fs.existsSync(dePath)) {
    const de = fs.readFileSync(dePath, 'utf8');
    { const m = /<voicepack name="DE"[^>]* version="(\d+)" basever="(\d+)"/.exec(de); assert.ok(m && Number(m[1]) >= 15 && Number(m[2]) >= 27, 'the pack DE is version 15 or later on the base 27 or later'); }
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
assert.ok(text(macros['organ pick up scene1']).includes('"key":{"text":"ORG.PCK{0}","params":[{"local":"voice_sfx"}]}'), 'the organ pickup (with the suffix of the payload)');
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

// 8. flight log of 2026-10-19: (a) a dispatch that arrives with nobody aboard is read back by the crew when it boards; (b) at the hangar the technician, the copilot and the
// pilot greet each other by the hour of the simulator, by name, with a few words of circumstance
const triageRun = text(macros['voice dispatch triage run']);
assert.ok(triageRun.includes('"while":{"param":"tr_ok"},"eq":0') && triageRun.includes('"call_macro":"voice crew all aboard"') &&triageRun.includes('"call_macro":"voice crew speaker","params":{"first":"copilot","aboard":1,"skip":0},"result":"tr_who"'), 'the triage waits until a crew member is aboard');
assert.ok(triageRun.includes('"param":"tr_w"},"gte":1800') && triageRun.includes('"local":"vda_open"},"ne":"yes"') && triageRun.includes('"param":"seq"},"ne":{"local":"voice_dispatch_seq"}'), 'the wait ends with a newer dispatch, the acceptance, or after 30 minutes');
assert.ok(triageRun.indexOf('"call_macro":"voice dispatch readback"') > triageRun.indexOf('"param":"tr_who"') && triageRun.indexOf('"call_macro":"voice dispatch readback"') < triageRun.indexOf('"key":"DSA.ASK"'), 'a dispatch read with the radio off is read back after the crew is aboard and before the questions');
assert.ok(triageRun.includes('"param":"tr_q"},"eq":0') && triageRun.includes('"key":"DSA.ASKP"') && triageRun.includes('"param":"tr_qr"},"eq":0'), 'with the radio off the crew asks the pilot again once, a minute after the question');
const day = text(macros['voice day period']);
assert.ok(day.includes('E:LOCAL TIME') && day.includes('"gte":18000') && day.includes('"lt":43200') && day.includes('"gte":43200') && day.includes('"lt":64800') && day.includes('"return":3'), 'good morning from 05:00, good afternoon from 12:00, good evening from 18:00 of the local time of the simulator');
const greet = text(macros['voice hangar greeting']);
for (const key of ['GRT.TEC', 'GRT.CPL', 'GRT.PLT']) assert.ok(greet.includes(`<say:${key}.{0}>`), `voice hangar greeting says ${key} with the part of the day`);
for (const key of ['CHT.TEC', 'CHT.CPL', 'CHT.TEC2']) assert.ok(greet.includes(`<say:${key}>`), `voice hangar greeting says ${key}`);
assert.ok(greet.includes('"local":"VCP"},"eq":"APP"') && greet.includes('"local":"TTS"},"eq":1') && greet.includes('"global":"AUDIO_DECLUT"},"eq":0') && greet.includes('"global":"AUDIO_DECLUT"},"gt":3'), 'only with the Mission Companion and the chatter levels of the original lines');
const hangarMacro = Object.values(macros).map(text).find((body) => body.includes('"call_macro":"voice hangar greeting"'));
assert.ok(hangarMacro && hangarMacro.includes('"local":"VCP"},"eq":"APP","then":[{"call_macro":"voice hangar greeting"}]') && hangarMacro.includes('L:FRA{local:VCP}7') && hangarMacro.includes('"local":"VCP"},"ne":"APP"') && hangarMacro.includes('L:CPL{local:VCP}23'), 'the boarding at the hangar: the greeting with the Companion, the original lines FRA 7 and CPL 23 with a wav pack');
assert.ok(all.includes('<pack:EN:27>') && !all.includes('<pack:EN:26>'), 'the mission declares the pack EN 27 (SVC and SCN lines on top of HOS.PAP on top of the radio calls of the flight of 2026-10-20)');
if (pack) {
  const dePack = fs.existsSync(path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'DE.xml')) ? fs.readFileSync(path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'DE.xml'), 'utf8') : null;
  const block = (xml, key) => { const at = xml.indexOf(`<message key="${key}"`); return xml.slice(at, xml.indexOf('</message>', at)); };
  const technician = ['GRT.TEC.M', 'GRT.TEC.A', 'GRT.TEC.E', 'CHT.TEC', 'CHT.TEC2'];
  const others = ['GRT.CPL.M', 'GRT.CPL.A', 'GRT.CPL.E', 'GRT.PLT.M', 'GRT.PLT.A', 'GRT.PLT.E', 'CHT.CPL'];
  for (const xml of [pack, dePack].filter(Boolean)) {
    for (const key of technician) { const b = block(xml, key); assert.ok(b.includes('actor="6"') && count(b, '<o sex="m">') === 6 && count(b, '<o sex="f">') === 6, `${key}: the technician, six options of each sex`); }
    for (const key of others) { const b = block(xml, key); assert.equal(count(b, '<o>'), 6, `${key} has six options`); assert.ok(b.includes('to="tech"'), `${key} is said to the technician`); }
    for (const key of ['GRT.TEC.M', 'GRT.CPL.M', 'GRT.PLT.M']) assert.ok(/\{@(PLT|CPL|TECH)\}/.test(block(xml, key)), `${key} says names`);
  }
  assert.ok(block(pack, 'GRT.TEC.M').includes('Good morning') && block(pack, 'GRT.TEC.A').includes('Good afternoon') && block(pack, 'GRT.TEC.E').includes('Good evening') && !block(pack, 'GRT.TEC.E').includes('morning') && !block(pack, 'GRT.TEC.A').includes('morning'), 'the greeting words follow the part of the day');
}

// 9. weather remarks of the crew at the hangar before and after the flight, farewell by the hour, and the weather of the briefing (user request of 2026-10-19)
const wclass = text(macros['voice weather class']);
for (const sv of ['AMBIENT PRECIP STATE', 'AMBIENT PRECIP RATE', 'AMBIENT TEMPERATURE', 'AMBIENT WIND VELOCITY', 'AMBIENT WIND DIRECTION', 'AMBIENT VISIBILITY']) assert.ok(wclass.includes(sv), `voice weather class reads ${sv}`);
for (const sfx of ['RL', 'RH', 'SN', 'HT', 'CD', 'FZ', 'FG', 'WD', 'FR']) assert.ok(wclass.includes(`"local":"vw_sfx"},"value":"${sfx}"`), `voice weather class sets the suffix ${sfx}`);
assert.ok(wclass.includes('"local":"vw_precip"},"eq":4') && wclass.includes('"local":"vw_precip"},"eq":8') && wclass.includes('"return":{"local":"vw_code"}'), 'rain 4, snow 8, the class is returned');
assert.ok(greet.includes('"call_macro":"voice weather class"') && greet.includes('<say:WXH.{0}>') && greet.includes('<say:WXC.{0}>') && greet.indexOf('<say:WXH.{0}>') > greet.indexOf('<say:GRT.PLT.{0}>') && greet.indexOf('<say:WXH.{0}>') < greet.indexOf('<say:CHT.TEC>'), 'the weather remark is between the greetings and the circumstances');
const debo = text(macros['deboarding']);
assert.ok(debo.indexOf('"call_macro":"voice deboarding chat","params":{"stage":1}') > 0 && debo.indexOf('"call_macro":"voice deboarding chat","params":{"stage":1}') < debo.indexOf('"L:PLT{local:VCP}8"') && debo.indexOf('"call_macro":"voice deboarding chat","params":{"stage":2}') > debo.indexOf('"L:PLT{local:VCP}8"'), 'deboarding: the weather remark before the thanks of the pilot (PLT 8), the farewell after it');
const debChat = text(macros['voice deboarding chat']);
for (const key of ['WXD.{0}', 'WXC.{0}', 'DEB.BYE.TEC.{0}']) assert.ok(debChat.includes(`<say:${key}>`), `voice deboarding chat says ${key}`);
assert.ok(debChat.includes('<say:DEB.BYE.PLT>') && debChat.includes('"local":"VCP"},"eq":"APP"') && debChat.includes('"local":"TTS"},"eq":1'), 'the pilot answers; only with the Mission Companion');
const brief = text(macros['voice briefing chat']);
assert.ok(brief.indexOf('"call_macro":"voice weather brief"') > brief.indexOf('L:PLT{local:VCP}50'), 'the weather comes at the end of the briefing thread');
assert.ok(text(macros['voice weather brief']).includes('<say:WXB.{0}>{1}//{2}//{3}//{4}') && text(macros['voice weather brief']).includes('"value":"OK"'), 'the briefing says the wind, the temperature and the visibility; WXB.OK when nothing is remarkable');
if (pack) {
  const dePack2 = fs.existsSync(path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'DE.xml')) ? fs.readFileSync(path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'DE.xml'), 'utf8') : null;
  const blk = (xml, key) => { const at = xml.indexOf(`<message key="${key}"`); assert.ok(at >= 0, `${key} is in the pack`); return xml.slice(at, xml.indexOf('</message>', at)); };
  for (const xml of [pack, dePack2].filter(Boolean)) {
    for (const sfx of ['RL', 'RH', 'SN', 'HT', 'CD', 'FZ', 'FG', 'WD', 'FR']) {
      for (const pre of ['WXH', 'WXD', 'WXC', 'WXB']) assert.equal(count(blk(xml, `${pre}.${sfx}`), '<o>'), 6, `${pre}.${sfx} has six options`);
      assert.ok(blk(xml, `WXB.${sfx}`).includes('{0}') && blk(xml, `WXB.${sfx}`).includes('{3}'), `WXB.${sfx} uses the wind and the visibility`);
      assert.ok(blk(xml, `WXC.${sfx}`).includes('to="tech"'), `WXC.${sfx} is said to the technician`);
    }
    assert.equal(count(blk(xml, 'WXB.OK'), '<o>'), 6, 'WXB.OK has six options');
    for (const key of ['DEB.BYE.TEC.M', 'DEB.BYE.TEC.A', 'DEB.BYE.TEC.E', 'DEB.BYE.PLT']) assert.equal(count(blk(xml, key), '<o>'), 6, `${key} has six options`);
  }
  assert.ok(/pouring|downpour|buckets/.test(blk(pack, 'WXH.RH')) && /freezing|numb|ice/.test(blk(pack, 'WXH.FZ')) && /hot|heat|sun/i.test(blk(pack, 'WXH.HT')), 'the remarks are about the rain, the freezing cold and the heat');
  assert.ok(/evening|night/.test(blk(pack, 'DEB.BYE.TEC.E')) && /day/.test(blk(pack, 'DEB.BYE.TEC.M')) && /afternoon/.test(blk(pack, 'DEB.BYE.TEC.A')), 'the farewell follows the hour');
}

console.log('Communications uniformity PASS: landing, skid, hoist, police and ambulance crew transfer, midway meeting, transfer, organ, briefings, CPR and the keys of the base pack. HPG/MSFS PENDING.');
