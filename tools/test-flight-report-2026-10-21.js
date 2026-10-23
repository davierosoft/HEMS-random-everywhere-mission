#!/usr/bin/env node
'use strict';

// Answers of the user of 2026-10-21 to the report of 2026-10-20 (sources only, runtime PENDING): the time bar of the timed secondary missions, the work light after the
// fire fighters, the pages of the checklists on the fire buttons, the terrain test of the heli rescuer, the new incidents 69-74 and the secondary missions 101 and 102.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const load = (dir) => {
  const out = {};
  for (const file of fs.readdirSync(path.join(root, 'mission-src', dir)).filter((name) => name.endsWith('.json'))) Object.assign(out, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', dir, file), 'utf8')));
  return out;
};
const macros = load('macros');
const data = load('data');
const text = (value) => JSON.stringify(value);

// 1. the bar of the time left: grey from 100 to 30, yellow from below 30 to 10, red below 10; the organ and the timed secondary missions show it instead of the ground operations
{
  const ui = text(macros['Mission dispatch']);
  for (const [color, cond] of [['gray', '"gte":30'], ['yellow', '"lt":30'], ['red', '"lt":10']]) {
    const bar = `"progressbar":{"min":0,"max":100,"color":"${color}","var":["L:TIMED_LEFT_PCT","number"]}`;
    const at = ui.indexOf(bar);
    assert.ok(at > 0, `the ${color} bar of the time left`);
    assert.ok(ui.slice(at, at + 520).includes(cond), `the ${color} bar has its range (${cond})`);
  }
  assert.ok(ui.includes('"image":"bar","show_condition":{"and":[{"require":{"local":"ops_progress_active"},"ne":1},{"require":{"local":"timed_bar_active"},"ne":1}]'), 'the separator bar is hidden while the time bar is shown');
  assert.ok(ui.includes('"color":"gray","var":["L:SATISFACTION","number"]},"show_condition":{"and":[{"require":{"local":"ops_progress_active"},"eq":1},{"require":{"local":"timed_bar_active"},"ne":1}]'), 'the bar of the ground operations is hidden while the time bar is shown');
  const bar = text(macros['timed mission bar']);
  for (const k of ['"param":"label"', '"param":"expiration"', 'L:TIMED_LEFT_PCT', '"local":"timed_bar_active"', 'L:SAVED', 'L:DISPATCH_ENDED', '"multiply":[{"divide":[{"local":"timed_bar_left"},{"local":"timed_bar_total"}]},100]']) assert.ok(bar.includes(k), 'timed mission bar: ' + k);
  assert.ok(text(macros['organ life decrease']).includes('"call_macro":"timed mission bar","params":{"label":{"local":"organ_bar_label"},"expiration":{"local":"organexpiration"}}'), 'the organ countdown starts the time bar (organ, team and blood)');
  assert.ok(text(macros['objective1']).includes('"timed_bar_active"},"value":0'), 'the bar is reset at every dispatch');
  const kind = text(macros['organ kind setup']);
  assert.ok(kind.includes('"organ_margin_min"},"value":240') && kind.includes('"organ_margin_min"},"value":150') && kind.includes('"organ_margin_min"},"value":300'), 'a random latest arrival: organ 300 to 1200, team 240 to 720, blood 150 to 480');
  assert.ok(text(macros['timefororgantransport']).includes('{"rand":[{"local":"organ_margin_min"},{"local":"organ_margin_max"}]}') && text(macros['timefororgantransport']).includes('"call_macro":"organ kind setup"'), 'the deadline uses the margin of the payload');
}

// 2. the work light: 7 m ahead of the fire engine, after the fire fighters
{
  const wl = text(macros['fire scene worklight']);
  assert.ok(wl.includes('"bearing2":0,"dist":7,"heading":0,"object":"firetruck1"'), 'the work light is 7 m ahead of the fire engine');
  assert.ok(!text(macros['park_firetruck1']).includes('fire scene worklight'), 'the parking does not make the light');
  const crew = text(macros['deploy_firetruck1_crew']);
  assert.ok(crew.lastIndexOf('"call_macro":"fire scene worklight"') > crew.lastIndexOf('{"create_object":{"name":"fireman2"'), 'the light comes after the fire fighters');
  const fire1 = text(macros['Firetruck1']);
  assert.ok(fire1.lastIndexOf('"call_macro":"fire scene worklight"') > fire1.lastIndexOf('{"create_object":{"name":"fireman2"'), 'the light comes after the fire fighters of the second branch');
}

// 3. the checklists: the fire buttons change the page
{
  const nav = text(macros['checklist page nav']);
  const pages = Object.entries(macros).filter(([, v]) => /"link":"NEXT PAGE \(/.test(text(v)) || /"link":"< PREV PAGE \(/.test(text(v)));
  assert.ok(pages.length >= 20, 'the paged checklists are found');
  for (const [name, body] of pages) {
    const t = text(body);
    assert.ok(t.includes(`"call_macro":"ckl_never"`) === false, name);
    assert.ok(t.includes(`{"set":{"local":"ckl_cur"},"value":"${name}"}`), `${name}: sets the page on the screen`);
    const next = /"link":"NEXT PAGE \([^"]*\) >"[^]*?"call_macro":"([^"]+)"/.exec(t);
    const prev = /"link":"< PREV PAGE \([^"]*\)"[^]*?"call_macro":"([^"]+)"/.exec(t);
    assert.ok(t.includes(`"ckl_has_next"},"value":${next ? 1 : 0}`) && t.includes(`"ckl_has_prev"},"value":${prev ? 1 : 0}`), `${name}: the flags of the neighbours`);
    if (next) assert.ok(nav.includes(`"eq":"${name}","then":[{"if":{"local":"checklist_${name}_advanced"},"eq":0,"then":[{"set":{"local":"checklist_${name}_advanced"},"value":1},{"call_macro":"${next[1]}"}`), `${name}: next page ${next[1]}`);
    if (prev) assert.ok(nav.includes(`"eq":"${name}","then":[{"set":{"local":"checklist_${name}_advanced"},"value":1},{"call_macro":"${prev[1]}"}`), `${name}: previous page ${prev[1]}`);
  }
  const primary = text(macros['H145_SDK_PRIMARY_ACTION_COMMAND'] || macros['Mission dispatch']);
  const all = text(macros);
  assert.ok(all.includes('"create_event_handler":"H145_SDK_PRIMARY_ACTION_COMMAND","commands":[{"if":{"and":[{"require":{"local":"ckl_has_next"},"eq":1},{"require":{"var":["L:CHECKLIST_STEP","number"]},"gte":{"local":"ckl_end"}}]}'), 'the primary fire button goes on to the next page at the end of a page');
  assert.ok(all.includes('"create_event_handler":"H145_SDK_SECONDARY_ACTION_COMMAND","commands":[{"if":{"and":[{"require":{"local":"ckl_has_prev"},"eq":1},{"require":{"var":["L:CHECKLIST_STEP","number"]},"lte":{"local":"ckl_first"}}]}'), 'the secondary fire button goes back to the previous page on the first row');
  assert.ok(text(macros['checklist home']).includes('"ckl_has_next"},"value":0') && text(macros['Mission dispatch']).includes('"ckl_has_next"},"value":0'), 'the home page and the main page clear the flags');
  assert.ok(primary.length > 0);
}

// 4. the terrain test of the heli rescuer: uneven ground = the patient walks, level ground = the stretcher
{
  const down = text(macros['gnd ops heli rescuer down']);
  for (const p of ['lup', 'rup', 'rdwn', 'ldwn']) assert.ok(down.includes(`{"set":{"local":"hr_alt_${p}"},"value":{"object":"jolly","var":"AALT"}}`), `the altitude of the heli rescuer at ${p}`);
  assert.ok(down.indexOf('"call_macro":"hr terrain evaluate"') > down.indexOf('hr_alt_ldwn') && down.indexOf('"call_macro":"hr terrain evaluate"') < down.indexOf('"HR_SKID_SECURED"},"value":1'), 'the terrain is evaluated after the last point, before the area is declared secured');
  const ev = text(macros['hr terrain evaluate']);
  assert.equal((ev.match(/"hr_dz"\},"gt":\{"local":"hr_thr"\}/g) || []).length, 7, 'six pairs of points and the helicopter against the patient');
  assert.ok(ev.includes('0.4663') && ev.includes('"hr_thr"},"gt":2') && ev.includes('"PLANE ALTITUDE","feet"') && ev.includes('"object":"injured_human","var":"AALT"'), '2 m or 25 degrees (tan 0.4663), helicopter against patient');
  for (const name of ['3 crew ground ops', '4 or 5 crew ground ops']) assert.ok(text(macros[name]).includes('{"require":{"local":"HR_TERRAIN_STEEP"},"eq":1}'), `${name}: the patient walks only on uneven ground`);
}

// 5. the new incidents and the secondary missions
{
  const acc = data.accidents;
  const byId = (id) => acc.find((a) => a.ID_CARD === id);
  const newIds = [69, 70, 71, 72, 73, 74, 101, 102];
  const codes = new Set();
  for (const id of newIds) {
    const a = byId(id);
    assert.ok(a, `incident ${id}`);
    assert.equal(a.id.startsWith(`ID:${id}/`), true, `${id}: the id string`);
    for (const k of ['description1', 'description2', 'description3', 'description4', 'general_description', 'objective', 'scene_macro', 'location_macro']) assert.ok(a[k], `${id}: ${k}`);
    assert.ok(macros[a.scene_macro] || ['default rtc'].includes(a.scene_macro), `${id}: the scene macro ${a.scene_macro} exists`);
    assert.ok(macros[a.location_macro], `${id}: the query ${a.location_macro} exists`);
    for (let j = 1; j <= 4; j += 1) assert.ok(data[`health${a[`pathologytype${j}`]}`] || a.mnumber === 4, `${id}: the pathology ${j}`);
    assert.ok(!/[^\x20-\x7e]/.test(JSON.stringify(Object.assign({}, a, { requirements: undefined }))), `${id}: ASCII only (the name of the French pack in the requirements is the name of the add-on)`);
    const code = `${a.mnumber}/${a.type}/${a.camping}`;
    assert.ok(!codes.has(code), `${id}: the code ${code} is not shared with another new mission`);
    codes.add(code);
    for (const o of acc) {
      if (o.ID_CARD === id) continue;
      assert.ok(`${o.mnumber}/${o.type}/${o.camping}` !== code, `${id}: the code ${code} is already used by ${o.ID_CARD}`);
      if (a.mnumber === 1 && o.mnumber === 1) assert.notEqual(o.type, a.type, `${id}: the scene type is unique among the missions 1 (the multiplayer update finds it by type)`);
      if (a.mnumber === 2 && o.mnumber === 2) assert.notEqual(o.camping, a.camping, `${id}: camping is unique among the missions 2 (the multiplayer update finds it by camping)`);
      if (a.mnumber === 4 && o.mnumber === 4) assert.notEqual(o.type, a.type, `${id}: the scene type is unique among the missions 4`);
    }
  }
  // the multiplayer update finds the secondary missions by their type too
  assert.ok(text(macros['missionupdatemultiplayer']).includes('"require":{"struct":{"param":"$item"},"path":"mnumber"},"eq":4},{"require":{"struct":{"param":"$item"},"path":"type"},"eq":{"local":"MISSION_SCENE_TYPE"}}'), 'mission 4: found by type in the multiplayer update');
  // queries, scenes
  assert.ok(text(macros['Query random motorway']).includes('motorway|trunk') && text(macros['Query random motorway']).includes('"roadtype"},"value":"road"'), 'Query random motorway');
  assert.ok(text(macros['Query random pitch']).includes('leisure=pitch') && text(macros['Query random riding']).includes('horse_riding'), 'the queries of the pitch and of the riding place');
  assert.ok(text(macros['CRASH_SITE']).includes('"local":"MISSION_SCENE_TYPE"},"eq":28'), 'CRASH_SITE: the pile-up of the motorway (type 28)');
  const sports = text(macros['SPORTS FIELD']);
  assert.equal((sports.match(/"name":"civilian\d"/g) || []).length, 6, 'six people on the field') ;
  assert.equal((sports.match(/"title":"Airbus H145 Cargo Bag"/g) || []).length, 3, 'three bags on the field');
  const walk = (node, fn) => { if (Array.isArray(node)) node.forEach((x) => walk(x, fn)); else if (node && typeof node === 'object') { fn(node); Object.values(node).forEach((x) => walk(x, fn)); } };
  const bearings = [];
  walk(macros['SPORTS FIELD'], (n) => { if (n.create_object && /^(civilian|bag)\d$/.test(n.create_object.name)) bearings.push(n.create_object.location.bearing); });
  assert.equal(bearings.length, 9, 'six people and three bags');
  assert.ok(bearings.every((b) => b >= 200 && b <= 320), 'the people and the bags stand on the west side (200 to 320), the landing room stays free on the other');  assert.ok(text(macros['HORSE RIDING']).includes('"title":"30West Horse"'), 'the horse');
  assert.ok(text(macros['MTB TRAIL']).includes('"title":"Airbus H145 FR Crash VTT DOWN"'), 'the crashed mountain bike');
  const res = text(macros['residential']);
  assert.ok(res.includes('"local":"CAMPING_VARIABLE"},"eq":49') && res.includes('"title":"30West Ladder fallen"') && res.includes('"local":"CAMPING_VARIABLE"},"eq":50') && res.includes('"title":"Airbus H145 Fire extinguisher"'), 'residential: the ladder (49) and the workshop (50)');
  // the secondary missions ride on the organ transfer
  const ot = text(macros['organ transfer']);
  assert.ok(ot.includes('"VAR_MISSION_NUMBER"},"eq":101,"then":[{"set":{"local":"organ_type"},"value":"T"}') && ot.includes('"VAR_MISSION_NUMBER"},"eq":102,"then":[{"set":{"local":"organ_type"},"value":"B"}'), 'the team (T) and the blood (B)');
  const hs = data.healthsecondary;
  assert.ok(hs.filter((h) => h.type === 5).length >= 2 && hs.filter((h) => h.type === 6).length >= 2, 'the transfer pathologies of the team (5) and of the blood supply (6)');
  assert.equal(new Set(data['accident demographics'].map((r) => r.id)).size, data['accident demographics'].length, 'demographics once for each incident');
}

// 6. the packs (when the Companion folder is next to this repository): the pause tag, the variety of the pilot answers, the German descriptions
{
  const dir = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks');
  if (fs.existsSync(dir)) {
    for (const lang of ['EN', 'DE']) {
      const xml = fs.readFileSync(path.join(dir, lang + '.xml'), 'utf8');
      const block = (key) => { const at = xml.indexOf(`<message key="${key}"`); return xml.slice(at, xml.indexOf('</message>', at)); };
      const both = block('CRW.VEH.BOTH');
      assert.equal((both.match(/<o>[^<]*\[pause:1\][^<]*<\/o>/g) || []).length, 6, `${lang}: CRW.VEH.BOTH has one second of silence between the two parts, in every option`);
      for (const id of [69, 70, 71, 72, 73, 74, 101, 102]) for (let v = 1; v <= 4; v += 1) assert.ok(xml.includes(`<message key="DSC.${id}.${v}"`), `${lang}: DSC.${id}.${v}`);
    }
    const en = fs.readFileSync(path.join(dir, 'EN.xml'), 'utf8');
    const ok = en.slice(en.indexOf('<message key="GRD.PLT.OK"'), en.indexOf('</message>', en.indexOf('<message key="GRD.PLT.OK"')));
    assert.ok(/Copy, thanks/.test(ok) && /Roger, standing by/.test(ok) && /Understood, thanks/.test(ok) && /<o>Okay\./.test(ok), 'the pilot answers with and without thanks, with copy, roger, okay');
  }
}
// 8. the report of the same day: the crashed vehicle is created once (no "creating duplicate object: wreckedcar1"), the ambulances stop where the injured are
{
  const launcher = macros['random crashed launcher'];
  const roadIf = launcher[3].then[1];
  const loop = roadIf.then[0];
  assert.equal(loop.while.local, 'has_accident_location');
  assert.ok(!text(loop.do).includes('random crashed1'), 'the road loop does not create the crashed vehicle at every retry');
  assert.ok(text(roadIf.then.slice(1)).includes('"call_macro":"random crashed1"'), 'the crashed vehicle is created once after the loop');
  assert.ok(text(roadIf.then.slice(1)).includes('"has_accident_location"') && text(roadIf.then.slice(1)).includes('"ne":"failed"'), 'and not when the park fallback creates its own');
  const ref = text(macros['injured scene reference']);
  assert.ok(ref.includes('"create_location":"injured_scene"') && ref.includes('"object":"injured_human"') && ref.includes('"object":"accident_location"'), 'injured_scene is the place of the injured, accident_location when there is none');
  for (const name of ['park_ambulance1', 'park_ambulance1_scene', 'park_ambulance2', 'park_ambulance2_scene']) {
    const body = text(macros[name]);
    assert.ok(body.includes('"call_macro":"injured scene reference"'), `${name} takes the place of the injured`);
    assert.ok(!body.includes('"accident_location"'), `${name} measures the stop from the injured, not from the fire`);
  }
  const a2 = text(macros.Ambulance2);
  assert.ok(a2.includes('"call_macro":"injured scene reference"') && a2.includes('"object":"injured_scene"'), 'the approach of ambulance 2 is measured from the injured');
}
console.log('Flight report 2026-10-21 PASS: time bar, work light, checklist pages, terrain test of the heli rescuer, incidents 69-74 and secondary missions 101-102.');
