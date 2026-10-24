#!/usr/bin/env node
'use strict';

// User proposal 2026-10-24: the helicopter comes back damaged and the crew is taken by the van (hangar farther than L:VANACTION): the technician
// arrives from the hangar with the "Airbus H145 Service Truck" (VAR 1 1 = lights on) and stops behind the helicopter, away from the route of the
// van; the copilot asks the dispatcher for technical assistance and the dispatcher answers. Police and ambulance waiting at the landing point
// are announced by the dispatcher too (crew casualty and deceased patient scenes).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const audit = require('./audit-drive-speeds.js');

const macros = audit.macros;
const text = (name) => JSON.stringify(macros[name] || null);
const walk = (node, visit) => {
  if (Array.isArray(node)) node.forEach((child) => walk(child, visit));
  else if (node && typeof node === 'object') { visit(node); Object.values(node).forEach((v) => walk(v, visit)); }
};

// 1. the damage state uses the failure ladder, the crash events and the damage of the engines and gearboxes
const dds = text('deboarding damage state');
for (const need of ['L:CRASH', 'L:VNE', 'L:FLI', 'PERSIST_DAMAGE_ENG1_PCT', 'PERSIST_DAMAGE_ENG2_PCT', 'PERSIST_DAMAGE_MGB_PCT', 'PERSIST_DAMAGE_TGB_PCT', 'FAIL_FADEC1', 'FAIL_MGB_CHIP', 'FAIL_COLLECTIVE_SEMA2', 'FAIL_FUEL_SUPPLY2', 'GENERAL ENG FAILED:1', 'ENG ON FIRE:2', '"return"']) assert.ok(dds.includes(need), `damage state reads ${need}`);

// 2. the truck is called only in the van branch (hangar farther than VANACTION) when the helicopter is damaged
const deb = text('deboarding');
const vanAt = deb.indexOf('"name":"servicecar2","title"');
const callAt = deb.indexOf('"call_macro":"service truck"');
assert.ok(callAt > 0 && callAt < vanAt, 'the truck thread starts before the van is created');
const vanBranch = deb.lastIndexOf('"object":"hangar","var":"distance"},"gt":{"var":["L:VANACTION","number"]}', callAt);
assert.ok(vanBranch > 0 && deb.indexOf('"call_macro":"deboarding damage state"') > vanBranch, 'only in the branch of the van');
assert.ok(deb.includes('"param":"deb_damage"},"eq":1'), 'only with damage');
assert.ok(deb.indexOf('"destroy_object":"servicetruck"') > deb.indexOf('"set":{"local":"deboard_pilot_done"},"value":0}'), 'the truck is removed once the pilot is done (the flag is reset before the wait)');

// 3. the truck: title, lights, lights kept on, route behind the helicopter (rear sector), never the front sector of the van
const truck = text('service truck');
assert.ok(truck.includes('"title":"Airbus H145 Service Truck"'), 'the Airbus H145 Service Truck');
assert.ok((truck.match(/"var":"VAR 1"\},"value":1/g) || []).length >= 2, 'lights on (VAR 1 1) before and after the drive');
assert.ok(truck.includes('"VAR1":1'), 'the drive keeps the lights on');
let rearOnly = true;
let driveSeen = false;
walk(macros['service truck'], (node) => {
  if (!node.drive_object) return;
  driveSeen = true;
  const pts = [];
  walk(node.drive_object.to, (p) => { if (typeof p.bearing === 'number' && typeof p.dist === 'number') pts.push(p); });
  assert.ok(pts.length >= 4, 'two sets of candidates');
  for (const p of pts) if (!(p.bearing >= 100 && p.bearing <= 260)) rearOnly = false;
  assert.ok(node.drive_object.to.every((w) => Array.isArray(w.closest) && w.to === 'hangar'), 'the side closer to the hangar');
});
assert.ok(driveSeen && rearOnly, 'every point of the truck is in the rear sector (bearing 100 to 260)');
// the van route and the walk of the crew use the front sector (bearing 290 to 60): the truck never uses it
const van = JSON.stringify(macros.deboarding);
for (const frontPoint of ['"bearing":295,"dist":25', '"bearing":320,"dist":20', '"bearing":10,"dist":22']) assert.ok(van.includes(frontPoint), `the van route point ${frontPoint} is where the test expects it`);
for (const key of ['SVC.REQ', 'SVC.ACK', 'SVC.ARR']) assert.ok(truck.includes(`"key":"${key}"`), `the truck says ${key}`);

// 4. police and ambulance announced by the dispatcher
const ccs = text('crew casualty scene vehicles');
assert.ok(ccs.includes('"key":"SCN.POL.AMB"') && ccs.includes('"key":"SCN.POL"'), 'ambulance and police, or police alone, announced at the crew casualty scene');
assert.ok(text('deceased patient police scene').includes('"key":"SCN.POL"'), 'police announced at the deceased patient scene');

// 5. the packs of the Companion carry the texts (EN base, DE and FR translations, versions)
const packDir = path.join(__dirname, '..', '..', 'HPG-Mission-Companion', 'voicepacks');
if (fs.existsSync(packDir)) {
  const keys = ['SVC.REQ', 'SVC.ACK', 'SVC.ARR', 'SCN.POL.AMB', 'SCN.POL'];
  for (const lang of ['EN', 'DE', 'FR']) {
    const xml = fs.readFileSync(path.join(packDir, `${lang}.xml`), 'utf8');
    for (const key of keys) {
      const m = new RegExp(`<message key="${key.replace('.', '\\.')}"[^>]*>([\\s\\S]*?)</message>`).exec(xml);
      assert.ok(m && (m[1].match(/<o>/g) || []).length === 6, `${lang} pack has six variants of ${key}`);
      assert.ok(/\{@DSP\}/.test(m[1]), `${lang} ${key} names the dispatcher`);
    }
  }
  assert.ok(/<voicepack name="EN"[^>]* version="27"/.test(fs.readFileSync(path.join(packDir, 'EN.xml'), 'utf8')), 'pack EN 27');
  assert.ok(/<voicepack name="DE"[^>]* version="15" basever="27"/.test(fs.readFileSync(path.join(packDir, 'DE.xml'), 'utf8')), 'pack DE 15 on the base 27');
  assert.ok(/<voicepack name="FR"[^>]* version="17"[^>]* basever="27"/.test(fs.readFileSync(path.join(packDir, 'FR.xml'), 'utf8')), 'pack FR 17 on the base 27');
}
// 6. every radio call with the dispatcher or the hospital (dispatcher lines and the crew lines to it) is an external radio call: double beep going out and coming in (user 2026-10-24)
if (fs.existsSync(packDir)) {
  for (const lang of ['EN', 'DE', 'FR']) {
    const xml = fs.readFileSync(path.join(packDir, `${lang}.xml`), 'utf8');
    const onCalls = [...xml.matchAll(/<message key="([^"]+)"[^>]* actor="(2|8)"[^>]* radio="on"/g)].map((m) => m[1]);
    assert.deepEqual(onCalls, [], `${lang}: no dispatcher or crew radio call of actor 2 or 8 left on the plain radio (${onCalls.join(', ')})`);
    for (const key of ['SVC.REQ', 'SVC.ACK', 'SVC.ARR', 'SCN.POL.AMB', 'SCN.POL', 'DSP.RQ']) assert.ok(new RegExp(`<message key="${key.replace('.', '\\.')}"[^>]* radio="ext"`).test(xml), `${lang} ${key} is an external radio call (double beep)`);
    for (const key of ['GRT.TEC.R3', 'GRT.TEC.R4', 'GRT.TEC.R5']) assert.ok(xml.includes(`<message key="${key}"`), `${lang} has ${key}`);
  }
}
// 7. the technician of the hangar greets the doctor and the rear crew too, not only the pilot and the copilot (user 2026-10-24: he greeted two persons)
const greet = JSON.stringify(macros['voice hangar greeting']);
assert.ok(greet.includes('<say:GRT.TEC.R{0}>') && greet.includes('"local":"CREW_MEMBER_CAP"'), 'the technician greeting of the rest of the crew by the size of the crew');
assert.ok(greet.indexOf('GRT.TEC.R{0}') > greet.indexOf('GRT.TEC.{0}') && greet.indexOf('GRT.TEC.R{0}') < greet.indexOf('GRT.CPL.{0}'), 'right after the first technician greeting');
assert.ok(JSON.stringify(macros['voice app connect']).includes('<pack:EN:27>'), 'the mission declares the pack EN 27');
console.log('Service truck PASS: damage state, truck only in the van branch with damage, lights on, rear sector away from the van and the crew walk, radio SVC.* and SCN.*, packs EN 27 / DE 15 / FR 17. Simulator runtime PENDING (VAR 1 of the truck, the route, the sound of the radio).');
