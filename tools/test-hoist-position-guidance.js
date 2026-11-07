#!/usr/bin/env node
'use strict';
// User decision of 2026-11-07: the engine guidance (play_guidance_message, fixed LVARs H145_<GUID> that sound.xml binds to the English and the Italian files at once) is
// gone; the mission speaks its own callouts with the LVARs of the chosen voice pack, inside 10 m of the target on both axes.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'mission-src/macros');
let all = '';
for (const f of fs.readdirSync(dir)) all += fs.readFileSync(path.join(dir, f), 'utf8') + '\n';
const executable = all.split('\n').filter((l) => !l.trim().startsWith('{"#comment"')).join('\n');
assert.ok(!executable.includes('play_guidance_message'), 'the engine guidance call is not used any more');
const m = JSON.parse(fs.readFileSync(path.join(dir, '10-transfer-special-missions.json'), 'utf8'));
const step = JSON.stringify(m['hoist position guidance']);
const say = JSON.stringify(m['hoist guidance say']);
assert.ok(step && say, 'the guidance macros exist');
assert.ok(step.includes('Math.sin') && step.includes('Math.cos') && step.includes('"$USER"'), 'bearing from the aircraft, sin and cos');
assert.ok(step.includes('{"lt":10}') || (step.match(/"lt":10/g) || []).length >= 2, 'only inside 10 m on both axes');
for (const n of [27, 28, 31, 32, 35, 36, 39, 40, 41]) assert.ok((step + say).includes(`L:{local:VCP}${n}"`), `callout ${n} is raised through the voice pack LVAR`);
for (const n of [29, 30]) assert.ok(!(step + say).includes(`L:{local:VCP}${n}"`), `number ${n} is not used`);
assert.ok(!(step + say).includes('{param:'), 'no interpolated parameter in a variable name');
// every pack of sound.xml binds the same callouts to its own prefixed file and to its own LVAR
const xml = fs.readFileSync(path.join(root, 'basepack/Simobjects/Airplanes/hpg-airbus-h145-ems/Sound/sound.xml'), 'utf8');
const packs = { ANDREW: 'AND.', DUSTIN: 'DUS.', ITALIAN: 'ITA.', KEKKERU: 'KEK.', KEKRADIO: 'KEKR.' };
for (const [lv, pre] of Object.entries(packs)) {
  for (const n of [27, 28, 31, 32, 35, 36, 39, 40, 41, 43, 44, 45, 46, 47, 48]) {
    const re = new RegExp(`FileName="([^"]*)"[^>]*LocalVar="${lv}${n}"`);
    const mm = xml.match(re);
    assert.ok(mm, `${lv}${n} is bound in sound.xml`);
    assert.ok(mm[1].startsWith(pre), `${lv}${n} plays a ${pre} file (${mm[1]})`);
  }
}
// protections and speakers (user rules of 2026-11-07)
const thread = JSON.stringify(m['crash site approach']);
assert.ok(thread.includes('"GPS GROUND SPEED","knots"]},"lt":7'), 'under 7 kt inside the box');
assert.ok(thread.includes('hoist guidance cable'), 'the cable hold runs every cycle');
const cable = JSON.stringify(m['hoist guidance cable']);
assert.ok(cable.includes('hoist_get_reel_distance:ft') && cable.includes('"hg_hold"'), 'hold while the cable is out');
assert.ok(cable.includes('"hg_prev_dist"') && cable.includes('guidance_rearmed'), 'rearmed only when farther than during the hoist');
assert.ok(step.includes('"hg_hold"'), 'the step stays silent during the hold');
assert.ok(say.includes('<actor{0}><say:PAX1.{1}>') && say.includes('hoist operator actor'), 'the TTS line is spoken by the hoist operator');
const life = JSON.parse(fs.readFileSync(path.join(dir, '11-mission-lifecycle.json'), 'utf8'));
const lc = JSON.stringify(life);
for (const [n, kt] of [[34, 25], [33, 15], [32, 7]]) assert.ok(lc.includes('"GPS GROUND SPEED","knots"]}, "lte": ' + kt) || lc.includes('"GPS GROUND SPEED","knots"]},"lte":' + kt) , 'distance callout ' + n + ' speed ' + kt);
const crew = JSON.parse(fs.readFileSync(path.join(dir, '03-aircraft-crew-checklists.json'), 'utf8'));
const hoa = JSON.stringify(crew['hoist operator actor']);
assert.ok(hoa.includes('SEAT_P2') && hoa.includes('voice crew member ok'), 'operator from the seat tracker, only a member able to speak');
console.log('hoist position guidance ok');
