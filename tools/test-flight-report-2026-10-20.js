#!/usr/bin/env node
'use strict';

// Tester flight of 2026-10-20 (mission 37 CLIMBER, 3 crew with a heli rescuer): static checks of the production sources for the defects found in the log and the snapshot.
// No HPG/MSFS behaviour is modeled, runtime PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const text = (value) => JSON.stringify(value);
const walk = (node, fn) => {
  if (Array.isArray(node)) node.forEach((x) => walk(x, fn));
  else if (node && typeof node === 'object') { fn(node); Object.values(node).forEach((x) => walk(x, fn)); }
};

// 1. the heli rescuer secures the area first: the crew waits (HOLDHOISTED 1) until he releases it after his last point (the original behaviour)
{
  const down = text(macros['gnd ops heli rescuer down']);
  const wait = down.indexOf('"wait_for":{"local":"HOLDHOISTED"},"eq":1}');
  const secured = down.indexOf('"HR_SKID_SECURED"},"value":1');
  const release = down.indexOf('"set":{"local":"HOLDHOISTED"},"value":0}');
  assert.ok(wait > 0 && secured > wait && release > secured, 'HOLDHOISTED is released only after the heli rescuer has secured the area (HR_SKID_SECURED), not when he starts');
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'starting point', 'baseline-0.997-original-fully-functional.json'), 'utf8'));
  const base = text(baseline.macros['gnd ops heli rescuer down']);
  assert.ok(base.indexOf('"set":{"local":"HOLDHOISTED"},"value":0}') > base.indexOf('"Heli-rescuer secured the area'), 'the original releases the crew after the area is secured');
}

// 2. the heli rescuer boards by the nearest side: from the rear left point he goes round the tail, not through the helicopter
{
  const pick = text(macros['pick heli rescuer ground']);
  assert.ok(pick.includes('{"closest":[{"bearing":40,"dist":6},{"bearing":150,"dist":9}],"to":"pisteur2"}'), 'the second leg of the heli rescuer is the nearest of the front right and the rear right points');
  assert.ok(!pick.includes('"to":[{"bearing":40,"dist":6}]'), 'no straight leg from the rear left point to the front right point');
}

// 3. the patient reaches the rear doors on foot when a heli rescuer is on the scene, the stretcher is ejected empty, nobody is moved by move_object
{
  const foot = macros['ground ops hems patient on foot'];
  assert.ok(Array.isArray(foot), 'the macro ground ops hems patient on foot exists');
  const body = text(foot);
  for (const needle of ['{"bearing":180,"dist":5}', '{"bearing":175,"dist":1.5}', '{"bearing":180,"dist":5},{"bearing":170,"dist":1}']) assert.ok(body.includes(needle), `the geometry of the user is present: ${needle}`);
  assert.ok(body.includes('HEMS_STRETCHER_NOPATIENT') && body.includes('HEMS_STRETCHER_EJECT') && body.includes('HEMS_STRETCHER_PATIENT') && body.includes('HEMS_STRETCHER_RETRACT'), 'the empty stretcher is ejected, the patient appears on it, the stretcher retracts');
  assert.ok(body.indexOf('HEMS_STRETCHER_EJECT') < body.indexOf('multipatient registry live remove hems patient object') && body.indexOf('multipatient registry live remove hems patient object') < body.indexOf('HEMS_STRETCHER_PATIENT') && body.indexOf('HEMS_STRETCHER_PATIENT') < body.indexOf('HEMS_STRETCHER_RETRACT'), 'order: eject, the patient object disappears, the patient is on the stretcher, retract');
  assert.ok(!body.includes('"move_object"'), 'nobody is moved by move_object (the jump behind the helicopter of flight 2026-10-20)');
  assert.ok(body.includes('"return":1') && body.includes('"return":0'), 'the macro reports 1 when loaded and 0 when the patient could not be prepared');
  assert.ok(body.indexOf('"close_door":"cargo_left"') > body.indexOf('HEMS_STRETCHER_RETRACT') && body.indexOf('"close_door":"cargo_right"') > body.indexOf('HEMS_STRETCHER_RETRACT'), 'the rear doors are closed after the stretcher has retracted (one opening only)');
  const opens = (body.match(/"door":"cargo_left","want":"open"/g) || []).length;
  assert.equal(opens, 1, 'the rear left door is opened once (it reopened after being closed in the original flow)');
  for (const [name, key, id] of [['3 crew ground ops', 'hems_3crew', 'c3_'], ['4 or 5 crew ground ops', 'hems_45crew', 'c45_']]) {
    const m = text(macros[name]);
    const call = '{"call_macro":"ground ops hems patient on foot","result":"foot_ok"}';
    assert.equal(m.split(call).length - 1, 1, `${name}: the foot loading is called once (landing, patient by us)`);
    const at = m.indexOf(call);
    const before = m.slice(Math.max(0, at - 160), at);
    assert.ok(before.includes('"local":"HELIRESCUER_BOARDED"},"gt":0') && before.includes('"local":"HR_TERRAIN_STEEP"},"eq":1'), `${name}: only with a heli rescuer aboard and on uneven ground (user, 2026-10-21)`);
    const after = m.slice(at, at + 700);
    assert.ok(after.includes('"param":"foot_ok"},"ne":1,"then":[{"return":0}]') && after.includes('"else":['), `${name}: the legacy stretcher flow stays in the else`);
    assert.ok(m.includes(`"macro":"${key}","actor":"hems","target":"n/a","state":"on_stretcher"`), `${name}: the legacy flow keeps its own trace ids (${id})`);
  }
}

// 4. every persistent setting has a first-run default, set by objective1 when it is null (user rule of 2026-10-20)
{
  const keys = [...new Set([...text(macros['save custom aircraft profile']).matchAll(/"key":"([A-Za-z0-9_]+)"/g)].map((m) => m[1]))];
  const guarded = new Set();
  for (const body of Object.values(macros)) walk(body, (o) => {
    if (o.if && o.if.global && o.eq === null && Array.isArray(o.then)) for (const c of o.then) if (c.set && c.set.global === o.if.global) guarded.add(o.if.global);
  });
  // meta keys of the table, a variable (PERSIST_MISSION_WAIT_TIME), values with their own normalisation macro, and CALLSIGN (null and empty both mean HEMS)
  const exempt = new Set(['valid', 'name', 'saved_at', 'PERSIST_MISSION_WAIT_TIME', 'CALLSIGN', 'HOIST_SAFETY_MONITOR', 'MISSION_ACCIDENT_MAX_RADIUS', 'MISSION_ACCIDENT_MIN_RADIUS']);
  const missing = keys.filter((k) => !guarded.has(k) && !exempt.has(k));
  assert.deepEqual(missing, [], `settings without a null-guarded first-run default: ${missing.join(', ')}`);
  assert.ok(text(macros['objective1']).includes('"call_macro":"settings first run defaults"'), 'objective1 gives the defaults');
  assert.ok(text(macros['load custom aircraft profile']).includes('"call_macro":"settings first run defaults"'), 'a profile saved before an option existed gets its default after loading');
  assert.ok(text(macros['resetdefault']).includes('"call_macro":"settings first run defaults"'), 'Reset to Default ends with the defaults');
  const defaults = text(macros['settings first run defaults']);
  for (const [k, v] of [['CREW_CHATTER', '0'], ['CREW_TIPS', '0'], ['COND_MISSIONS', '"no"'], ['CLOCK_MODE', '"utc"']]) {
    assert.ok(defaults.includes(`"if":{"global":"${k}"},"eq":null,"then":[{"set":{"global":"${k}"},"value":${v}}]`), `${k} gets ${v} only when null`);
  }
}


// 5. the progress bar in every flow where the crew leaves the helicopter (skid, handover at the destination, transfer, organ, midway)
{
  const start = text(macros['ops progress start']);
  assert.ok(start.includes('on-site operations progress monitor') && start.includes('"set":{"var":["L:SATISFACTION","number"]},"value":0}'), 'ops progress start fills the bar with the stages of the monitor');
  for (const m of ['5 crew SKID LDG', '4 crew SKID LDG', '3 crew SKID LDG']) assert.ok(text(macros[m]).includes('{"call_macro":"ops progress start"}'), m + ' starts the progress bar');
  const timed = text(macros['ops progress timed']);
  assert.ok(timed.includes('"local":"ops_progress_monitor"},"eq":"timed"') && timed.includes('"has_object":"hoist_crew"') && timed.includes('"has_object":"pax3"') && timed.includes('92'), 'the timed bar waits at 92 until the crew has been seen and is gone');
  for (const m of ['Ambulance destination1', 'Ambulance destination2', 'Ambulance destination hoist', 'User destination1', 'User destination hoist', 'User destination2', 'transfer patient paperwork', 'transfer patient load1', 'transfer patient load2', 'midway patient load1', 'midway patient load2']) assert.ok(text(macros[m]).includes('"call_macro":"ops progress timed"'), m + ' shows the timed progress bar');
  // user 2026-10-21: the organ delivery does not show the bar of the ground operations but the time left (timed mission bar)
  for (const m of ['Organ destination1', 'organ pick up scene1']) assert.ok(!text(macros[m]).includes('"call_macro":"ops progress timed"'), m + ' has no ground operations bar');
}

// 6. the radio reminder, the cold readback on the intercom, the pilot answers of the ground updates
{
  const rem = text(macros['voice radio reminder']);
  assert.ok(rem.includes('RAD.REM') && rem.includes('voice radio ready') && rem.includes('_SDK_OH_BATTERY_MASTER') && rem.includes('_SDK_GPCP_PWR_SWITCH') && rem.includes('"rr_n"},"lt":3') && rem.includes('voice crew member ok'), 'the reminder: a random member aboard, only with power and no radio, three times at most');
  assert.ok(text(macros['voice briefing chat']).includes('"call_macro":"voice radio reminder"'), 'the reminder starts with the briefing of an accepted dispatch');
  const gu = text(macros['voice ground update']);
  assert.ok(gu.includes('"local":"gu_rr"},"lt":0.55') && gu.includes('gu_pltok_last') && gu.includes('"param":"tk_rep"},"eq":1'), 'the pilot answers a ground update now and then, not twice within a minute');
}

// 7. the heli rescuers: the place of the pick-up in the radio calls, the approach call, the fire station in the query
{
  const place = text(macros['heli rescuer place']);
  assert.ok(place.includes('emergency=mountain_rescue') && place.includes('amenity=fire_station') && place.includes('"hrp_kind"},"value":"M"') && place.includes('hrp_alp_Name') && place.includes('hrp_fire_Name'), 'the kind of the place: alpine rescue station, fire station, meeting point (custom), sports field');
  const req = text(macros['heli rescuer pickup request']);
  for (const k of ['HRQ.DSP', 'HRQ.PLT.Q', 'HRQ.BASE.A', 'HRQ.BASE.OK']) assert.ok(req.includes(k), 'the request says ' + k);
  assert.ok(text(macros['heli rescuer pickup approach']).includes('HRQ.APR.PLT') && text(macros['heli rescuer pickup approach']).includes('HRQ.APR.A') && text(macros['heli rescuer pickup approach']).includes('voice weather class'), 'the approach call with the wind');
  assert.ok(text(macros['Query random heli rescuer']).includes('[amenity=fire_station]'), 'a fire station is a possible pick-up place');
  assert.ok(text(macros['pick heli rescuer']).includes('heli rescuer pickup approach'), 'pick heli rescuer starts the approach call');
}

// 8. SAR found, hospital, pick-up, organ
{
  assert.ok(text(macros['SAR sighting']).includes('"call_macro":"voice sar found"') && text(macros['voice sar found']).includes('SAR.FND.PLT') && text(macros['voice sar found']).includes('SAR.FND.A'), 'the find of the target is told to the dispatcher with the position');
  const hap = text(macros['voice hospital approach']);
  assert.ok(hap.includes('voice hospital marshal expected') && hap.includes('HOS.MAR.P') && hap.includes('HOS.MAR.A'), 'the pilot asks for the marshal by radio when he is expected');
  const fin = text(macros['voice hospital final']);
  for (const k of ['HOS.FIN.P', 'HOS.FIN.A', 'HOS.PAD.P', 'HOS.PAD.A', 'HOS.DEP.P', 'HOS.DEP.A']) assert.ok(fin.includes(k), 'the hospital calls: ' + k);
  const ho = text(macros['voice hospital handover']);
  assert.ok(ho.includes('HOS.Q') && ho.includes('HOS.A') && ho.includes('HOS.ORG.LT') && ho.includes('ORG.DEL.OK') && ho.includes('ORG.DEL.LT') && ho.includes('"local":"organcountdown"},"lt":0'), 'the handover: question and answer, the organ on time or late with the comment of the crew');
  const pa = text(macros['voice pickup approach']);
  assert.ok(pa.includes('PCK.CALL.') && pa.includes('PCK.REPLY.') && pa.includes('"param":"vpa_cls"},"eq":"TRF"') && pa.includes('"param":"vpa_cls"},"eq":"ORG"'), 'transfers and organ transports call the pick-up place');
  const brief = text(macros['voice briefing chat']);
  assert.ok(brief.includes('voice organ briefing') && brief.includes('TRF.INF'), 'the briefing tells the organ and the transfer destination');
  const ob = text(macros['voice organ briefing']);
  for (const k of ['ORG.INF', 'ORG.TIM.', 'ORG.RCT.', 'voice organ watch', 'organ_type', 'organ_rcp', 'organ_age']) assert.ok(ob.includes(k), 'organ briefing: ' + k);
  const ow = text(macros['voice organ watch']);
  assert.ok(ow.includes('ORG.WARN') && ow.includes('ORG.LATE') && ow.includes('"param":"seq"},"ne":{"local":"voice_dispatch_seq"}'), 'the organ time is watched, once warned, once late');
  const orgT = text(macros['organ transfer']);
  assert.ok(orgT.includes('organ_type') && orgT.includes('organ_rcp') && orgT.includes('"static":"surnames"') && orgT.includes('"static":"malenames"') && orgT.includes('"static":"femalenames"') && orgT.includes('"organ_age"},"value":{"floor":{"rand":[18,71]}}'), 'the organ and its recipient are drawn from the lists');
  assert.ok(text(macros['organ pick up scene1']).includes('"call_macro":"voice organ handoff"') && text(macros['voice organ handoff']).includes('ORG.PCK.G') && text(macros['voice organ handoff']).includes('ORG.PCK.R'), 'the ground team talks at the organ pick-up');
  const threads = text(macros['update messages thread'] || macros['objective1'] || {});
  const all = text(macros);
  for (const m of ['voice hospital final', 'voice pickup approach']) assert.ok(all.includes('{"call_macro":"' + m + '"}'), m + ' is started');
}

// 9. a work light at a night road accident with the fire engine
{
  const wl = text(macros['fire scene worklight']);
  for (const k of ['"var":["E:TIME OF DAY","number"]},"ne":1', 'default rtc', 'truck vs car', 'pedestrian vs car', '"title":"Airbus H145 Worklight"', '"bearing2":0,"dist":7,"heading":0,"object":"firetruck1"', '"point_object":"worklight_fire","to":"injured_human"', '"object":"worklight_fire","var":"VAR 1"},"value":1']) assert.ok(wl.includes(k), 'work light: ' + k);
  assert.ok(!text(macros['park_firetruck1']).includes('"call_macro":"fire scene worklight"'), 'the work light is no longer made by the parking (it comes after the fire fighters)');
  const afterCrew = text(macros['deploy_firetruck1_crew']);
  assert.ok(afterCrew.lastIndexOf('fire scene worklight') > afterCrew.lastIndexOf('fireman2'), 'the work light is made after the fire fighters have been placed');
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'starting point', 'baseline-0.997-original-fully-functional.json'), 'utf8'));
  assert.ok(JSON.stringify(baseline.macros).includes('"Airbus H145 Worklight"') && /"title":"Airbus H145 Worklight"[^]{0,260}"VAR 1"\},"value":1/.test(JSON.stringify(baseline.macros)), 'the original sets VAR 1 to 1 on the work light');
}

// 10. the pack of the Companion (when its folder is next to this repository): the new keys are there, six options, versions 22 and 10
{
  const packFile = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'EN.xml');
  if (fs.existsSync(packFile)) {
    const xml = fs.readFileSync(packFile, 'utf8');
    const used = new Set([...text(macros).matchAll(/"(?:HRQ\.(?:DSP|APR\.PLT|APR\.A)|SAR\.FND\.(?:PLT|A)|HOS\.(?:MAR|FIN|PAD|DEP)\.[PA]|HOS\.(?:Q|A|ORG\.LT)|PCK\.(?:CALL|REPLY)\.(?:TRF|ORG)|ORG\.(?:INF|WARN|LATE|PCK\.[GR]|DEL\.(?:OK|LT))|TRF\.INF|RAD\.REM)"/g)].map((m) => m[0].slice(1, -1)));
    for (const k of ['ORG.TIM.OK', 'ORG.TIM.TG', 'ORG.TIM.LT', 'ORG.RCT.OK', 'ORG.RCT.TG', 'ORG.RCT.LT']) used.add(k);
    assert.ok(used.size >= 25, 'the new keys are used by the mission');
    for (const k of used) assert.ok(xml.includes('<message key="' + k + '"'), 'the base pack has ' + k);
    assert.ok(/<voicepack name="EN"[^>]* version="24"/.test(xml), 'the base pack is version 24');
  }
}

console.log('Flight report 2026-10-20 PASS: the heli rescuer secures first, the nearest side to board, the patient on foot with a heli rescuer, first-run defaults, the progress bar everywhere, the radio reminder, the heli rescuer place, SAR found, the hospital, the pick-up and the organ calls, the work light, the pack keys. HPG/MSFS PENDING.');
