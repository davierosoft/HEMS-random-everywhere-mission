#!/usr/bin/env node
'use strict';
// Calls of the hoist operator on the cable (user request of 2026-11-04, pack EN 37): DOWN, GND, UP, DOOR (keys HCL.*) in the three packs,
// the macro "voice hoist cable", its call sites in the four cable macros, the heli rescuer keeps his own lines, the mission declares the pack.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const macros = {};
for (const f of fs.readdirSync(path.join(root, 'mission-src/macros'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8')));
const txt = (n) => JSON.stringify(macros[n]);
assert.ok(macros['voice hoist cable'], 'macro exists');
const vm = txt('voice hoist cable');
assert.ok(vm.includes('"voice say"') && vm.includes('"declut":1'), 'spoken through voice say as chatter');
assert.ok(vm.includes('"helirescuer"') && vm.includes('"DOWN"') && vm.includes('"GND"'), 'the heli rescuer going down is not said twice (HRS.*)');
assert.ok(/"stage":"DOWN"/.test(txt('hoist down')) && /"stage":"GND"/.test(txt('hoist down')), 'hoist down: DOWN and GND');
assert.ok(/"stage":"UP"/.test(txt('hoist up 1 operator')) && /"stage":"DOOR"/.test(txt('hoist up 1 operator')), 'hoist up 1 operator: UP and DOOR');
assert.ok(/"stage":"UP"/.test(txt('hoist up operator+injured')) && /"stage":"DOOR"/.test(txt('hoist up operator+injured')), 'hoist up operator+injured: UP and DOOR');
assert.ok(!txt('hoist up empty').includes('voice hoist cable'), 'the empty hook going up is not announced');
const versions = {};
for (const L of ['EN', 'DE', 'FR']) {
  const xml = fs.readFileSync(path.join(root, 'voicepacks', L + '.xml'), 'utf8');
  for (const s of ['DOWN', 'GND', 'UP', 'DOOR']) {
    const m = xml.match(new RegExp(`<message key="HCL\\.${s}"[^>]*>([\\s\\S]*?)</message>`));
    assert.ok(m, `${L} has HCL.${s}`);
    assert.ok((m[1].match(/<o>/g) || []).length >= 3, `${L} HCL.${s} has variants`);
  }
  versions[L] = Number((xml.match(/<voicepack\b[^>]*\bversion="(\d+)"/) || [])[1]);
  if (L !== 'EN') assert.strictEqual(Number((xml.match(/basever="(\d+)"/) || [])[1]), 37, L + ' translates the base pack 37');
}
assert.ok(versions.EN >= 37, 'base pack 37 or later');
assert.ok(txt('voice app connect').includes('<pack:EN:37>') || JSON.stringify(macros).includes('<pack:EN:37>'), 'the mission declares the pack EN 37');
console.log('hoist cable calls ok');

// Hoist panel (manual hoist) and the LINK line of the briefing (user request of 2026-11-04)
{
  const ui = JSON.stringify(macros['hoist panel']);
  for (const need of ['HOIST PANEL', 'L:H145_SDK_OH_HOIST', '_SDK_HOIST_CABLE_FT', 'HOIST_CABLE_PHASE', 'RADIO HEIGHT', 'AIRSPEED INDICATED', 'PLANE BANK DEGREES', 'shared repeated block 029']) assert.ok(ui.includes(need), 'hoist panel uses ' + need);
  assert.ok(JSON.stringify(macros['Mission dispatch']).includes('"call_macro":"hoist panel"'), 'link on the Mission dispatch page');
  const brief = fs.readFileSync(path.join(root, 'mission-src/root/03-briefing.json'), 'utf8');
  assert.ok(brief.includes('"call_macro":"hoist panel"'), 'link in the briefing');
  assert.ok(brief.includes('"text": "DISPATCHER: {0}/{1}"') && brief.includes('Voice app not connected') && brief.includes('HOC_MISMATCH'), 'connection rows in the briefing (dispatcher, voice app, yellow HOC)');
}
console.log('hoist panel and link line ok');
