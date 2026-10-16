#!/usr/bin/env node
'use strict';

// Tester and user reports of 2026-10-16 (mission 169.55): the ambulance that drives off with the patient, the cancellation of the dispatch, the radio call to
// the heli rescue base, the doors of the lowerings and of the re-entry, the voices of the hoist visits and of the heli rescuer, the farewell and the walk of the
// heli rescuers left at the hospital, the name of the dispatcher. Static checks of the production sources and, when the Companion repository is next to this
// one, of its base pack: no HPG/MSFS behaviour is modeled, the runtime stays PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
const moduleOf = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8'));
  Object.assign(macros, data);
  for (const name of Object.keys(data)) moduleOf[name] = file;
}
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};
const text = (macro) => { assert.ok(macros[macro], `macro exists: ${macro}`); return JSON.stringify(macros[macro]); };

// 1. ambulance: the ground suitability follows the thresholds, a loaded patient is announced, the cancellation covers the ambulance
const suit = text('multipatient registry live ground suitability');
for (const v of ['LIFESCORE', 'LIFESCORE2', 'LIFESCORE3']) assert.ok(suit.includes(`"local":"${v}"`), `suitability reads ${v}`);
assert.ok(suit.includes('"global":"AMBULOCK"') && suit.includes('LIFESCORE_THR_LO') && suit.includes('LIFESCORE_THR_HI'), 'the ambulance suitability uses AMBULOCK and the two thresholds');
assert.ok(text('multipatient registry live ground load').includes('"call_macro":"ambulance departs notice"'), 'the load of the ambulance calls ambulance departs notice');
const depart = text('ambulance departs notice');
assert.ok(depart.includes('AMB.DEP.DSP') && depart.includes('post dispatcher message'), 'the departure is shown and said');
const cancelEval = text('dispatch cancellation evaluation');
assert.ok(cancelEval.includes('"ambulance"') && cancelEval.includes('ground_covers_all') && cancelEval.includes('multipatient registry live pending'), 'the cancellation evaluation knows the ambulance reason');
assert.ok(text('cancel HEMS dispatch').includes('AMB.CAN.DSP'), 'the cancellation by the ambulance is said by the dispatcher');
assert.ok(text('ground ops').includes('"call_macro":"cancel HEMS dispatch"'), 'ground ops ends the dispatch when every patient is assigned to an ambulance');

// 2. doors: no bare open_door of the passenger or cargo doors outside the helper, which reads the door LVAR first
const bare = [];
for (const [name, body] of Object.entries(macros)) {
  if (name === 'ensure door') continue;
  collect(body, (n) => typeof n.open_door === 'string' && /^(pax_right|cargo_left|cargo_right)$/.test(n.open_door)).forEach((n) => bare.push(`${name}:${n.open_door}`));
}
assert.deepEqual(bare, [], 'every opening of pax_right, cargo_left and cargo_right goes through ensure door');
const door = text('ensure door');
for (const v of ['SDK_DOOR_PAX_R', 'SDK_DOOR_CARGO_L', 'SDK_DOOR_CARGO_R']) assert.ok(door.includes(v), `ensure door reads ${v}`);
assert.ok(text('hoist heli rescuer down').includes('"door":"pax_right"'), 'the heli rescuer is lowered with the door opened by ensure door');
const doorCalls = collect(macros, (n) => n.call_macro === 'ensure door').length;
assert.ok(doorCalls >= 100, `ensure door replaces the plain openings (${doorCalls} calls)`);

// 3. the cabin is ready only with somebody aboard; the farewell and the walk of the heli rescuers
assert.ok(text('cabin has crew aboard').includes('CREW_OUT_'), 'cabin has crew aboard reads the seat tracker');
assert.ok(text('drop heli rescuer ground').includes('cabin has crew aboard') && text('drop heli rescuer hoist').includes('cabin has crew aboard'), 'the cabin ready counter is gated by the cabin check');
for (const name of ['drop heli rescuer ground', 'drop heli rescuer hoist']) assert.ok(text(name).includes('heli rescuer drop farewell'), `${name} says the farewell`);
const farewell = text('heli rescuer drop farewell');
for (const key of ['HRD.PLT', 'HRD.HRT', 'HRD.BASE.Q', 'HRD.BASE.A']) assert.ok(farewell.includes(key), `farewell says ${key}`);
const follow = text('helirescuers_follow_destination');
assert.ok(follow.includes('helirescuer walk to hospital'), 'the rescuers left at the hospital walk to it');
const walk = text('helirescuer walk to hospital');
assert.ok(walk.includes('hospital_wp') && walk.includes('hospital_door'), 'the walk follows the route points of the paperwork and ends at the door');

// 4. the radio call before the pick-up of the heli rescuers
const pick = text('pick heli rescuer');
assert.ok(pick.includes('heli rescuer pickup request') && pick.includes('heli rescuer pickup arrival'), 'pick heli rescuer asks by radio and announces the arrival');
assert.ok(text('heli rescuer pickup request').includes('HRQ.BRF.') && text('heli rescuer pickup request').includes('HRQ.PLT.Q'), 'the request names the kind of mission');
assert.ok(JSON.stringify(macros.settings || '').length > 0 && text('heli rescuer pickup recheck').includes('HRQ.COR.PLT'), 'a change of SECOND_HR corrects the request');
const secondHr = collect(macros, (n) => n.call_macro === 'heli rescuer pickup recheck');
assert.ok(secondHr.length >= 2, 'both SECOND_HR buttons call the recheck');

// 5. the voices of the hoist visits and of the heli rescuer
assert.ok(text('voice hoist visit').includes('HST.'), 'voice hoist visit builds HST keys');
assert.ok(text('multipatient registry crew visit').includes('voice hoist visit'), 'the visit of the doctor calls voice hoist visit');
for (const key of ['HRS.START', 'HRS.MID', 'HRS.DONE']) assert.ok(text('hoist heli rescuer down').includes(key), `hoist heli rescuer down says ${key}`);

// 6. the name of the dispatcher: published by the mission, spoken by the app
const pub = text('voice dispatcher publish');
assert.ok(pub.includes('<dsp:') && pub.includes('GRPIDX') && pub.includes('base_city_name'), 'the mission publishes the group and the city of the base');
assert.ok(text('voice dispatcher name start').includes('query_closest_result') || text('voice dispatcher name start').includes('create_location'), 'the city of the base is searched by the mission');
assert.ok(text('voice app connect').includes('voice dispatcher name start'), 'the connection to the Companion starts the dispatcher name');
const publishers = Object.keys(macros).filter((name) => name !== 'voice dispatcher publish' && JSON.stringify(macros[name]).includes('"call_macro":"voice dispatcher publish"'));
assert.ok(publishers.some((name) => moduleOf[name] === '15-debug-and-df-ui.json'), 'the CARLS group selection publishes the dispatcher');

// 6b. build 169.56 (tester and user reports of 2026-10-16, second part)
// - the old closing lines of the vehicles (76, PAX3 3) do not repeat voice crew vehicles when the Companion speaks
const lifecycle = JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', '11-mission-lifecycle.json'), 'utf8')));
const confIdx = lifecycle.indexOf('"var":["L:CONFONSCENE","number"]},"eq":1},{"require":{"and":[{"require":{"local":"VCP"},"eq":"APP"},{"require":{"local":"TTS"},"eq":1}]},"ne":1}');
assert.ok(confIdx > 0, 'the closing vehicle lines (L:{VCP}76, PAX3 3) are skipped with the Companion');
// - the city of the base: not with SKIP_QUERY 1, city or town first, village as the fallback, all in a thread that never blocks the mission
const city = text('voice dispatcher name start');
assert.ok(city.includes('"L:SKIP_QUERY"') && city.includes('(city|town)') && city.includes('base_village'), 'the city query respects SKIP_QUERY and falls back to a village');
assert.ok(city.indexOf('"create_thread"') >= 0 && city.indexOf('"create_thread"') < city.indexOf('"create_location":"base_city"'), 'the query runs in its own thread');
// - the voices drawn: shift (dispatcher), dispatch (ground unit, heli rescuer), connection
assert.ok(text('voice new shift').includes('<voices:shift>') && text('voice read dispatch').includes('<voices:dispatch>') && text('voice app connect').includes('<voices:all>'), 'the mission asks for the voice draws');
// - the call sign on the tablet: global CALLSIGN, helper, setting page, profiles, reset, cancellation texts
assert.ok(text('callsign word').includes('"global":"CALLSIGN"') && text('callsign word').includes('"HEMS"'), 'callsign word returns the custom name or HEMS');
assert.ok(text('cancel HEMS dispatch').includes('callsign word') && text('cancel HEMS dispatch').includes('{local:cs_word}'), 'the cancellation texts use the call sign');
assert.ok(text('save custom aircraft profile').includes('"key":"CALLSIGN"') && text('load custom aircraft profile').includes('"key":"CALLSIGN"') && text('resetdefault').includes('"global":"CALLSIGN"},"value":null'), 'CALLSIGN is saved, loaded and reset with the profiles');
assert.ok(JSON.stringify(macros.settings).includes('"textbox":"callsign_input"'), 'the settings page has the call sign text box');
// - the doors: the state four seconds after the command
assert.ok(text('ensure door').includes('ensure door trace') && text('ensure door trace').includes('result (state read 4 s later'), 'ensure door logs the result');

// 7. the pack EN of the Companion repository (when it is next to this one)
const packFile = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'EN.xml');
if (fs.existsSync(packFile)) {
  const xml = fs.readFileSync(packFile, 'utf8');
  const messages = {};
  for (const m of xml.matchAll(/<message\b([^>]*)>([\s\S]*?)<\/message>/g)) messages[(m[1].match(/\bkey="([^"]+)"/) || [])[1]] = { attrs: m[1], inner: m[2] };
  const keys = ['AMB.DEP.DSP', 'AMB.CAN.DSP', 'HRS.START', 'HRS.MID', 'HRS.DONE', 'HRD.PLT', 'HRD.HRT', 'HRD.BASE.Q', 'HRD.BASE.A',
    'HRQ.PLT.Q', 'HRQ.BASE.A', 'HRQ.BRF.ACC', 'HRQ.BRF.SAR', 'HRQ.BRF.TRF', 'HRQ.BRF.ORG', 'HRQ.BRF.INJ', 'HRQ.BASE.OK', 'HRQ.COR.PLT', 'HRQ.COR.A', 'HRQ.ARR.PLT', 'HRQ.ARR.A', 'DSP.NAME.MAN'];
  for (const stage of ['ARR', 'DONE']) for (const s of ['S', 'M', 'C']) keys.push(`HST.${stage}.${s}`);
  for (let i = 0; i < 16; i += 1) keys.push(`DSP.NAME.${i}`);
  for (const key of keys) {
    const msg = messages[key];
    assert.ok(msg, `pack EN has ${key}`);
    const options = [...msg.inner.matchAll(/<o\b[^>]*>([^<]*)<\/o>/g)].map((o) => o[1]);
    assert.ok(options.length >= 1 && options.every((o) => o.length > 3 && /^[\x20-\x7e]+$/.test(o)), `${key}: ASCII texts`);
  }
  const usedKeys = new Set(collect(macros, (n) => n.call_macro === 'voice say' && n.params && typeof n.params.key === 'string' && /^(AMB|HRS|HRD|HRQ)\./.test(n.params.key)).map((n) => n.params.key));
  for (const key of usedKeys) assert.ok(messages[key], `the key ${key} used by the mission exists in the pack`);
  assert.ok(Number((xml.match(/<voicepack\b[^>]*\bversion="(\d+)"/) || [])[1]) >= 15, 'the base pack is at least version 15');
  for (const key of ['CPL.23', 'PAX1.37', 'PAX1.38', 'PAX2.2', 'PAX2.3', 'PLT.5', 'PLT.9', 'PLT.21', 'PLT.26']) assert.ok(/ to="tech"/.test(messages[key].attrs), key + ' is said to the technician (to="tech")');
  assert.ok(Number((text('voice app connect').match(/<pack:EN:(\d+)>/) || [])[1]) >= 15, 'the mission declares at least pack EN 15');
  for (const key of ['HOS.CALL.P', 'HOS.REPLY', 'DSA.NUDGE', 'DSP.RQ', 'DSP.ANS.ACC']) assert.ok(/\{@(HEMS|DSP)\}/.test(messages[key].inner), `${key} uses the call sign or the dispatcher name`);
} else {
  console.log('heli rescuer and ambulance: the Companion repository is not next to this one, the pack checks are skipped');
}
console.log('Heli rescuer and ambulance PASS: ambulance suitability, departure and cancellation, doors through ensure door, cabin ready gate, farewell and walk of the heli rescuers, radio call to the base, hoist voices, dispatcher name. Simulator runtime PENDING.');
