#!/usr/bin/env node
'use strict';

// Heli rescuer aboard (tester report of 2026-10-17): the patient was unloaded at the hospital with the heli rescuer still aboard and the mission
// offered END MISSION and RECEIVE NEW DISPATCH. The macro heli rescuer aboard gate keeps the end away while somebody is aboard and asks where to leave
// the heli rescuer(s): here, at the loading point or (at the hospital) at the home base. Static checks of the production sources: command order and
// branching only; the behaviour in the simulator is PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((n) => n.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const text = (name) => JSON.stringify(macros[name]);
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

// 1. the gate: a modal with the options, no way to end the mission or to ask for a new dispatch
const gate = macros['heli rescuer aboard gate'];
assert.ok(Array.isArray(gate), 'the macro heli rescuer aboard gate exists');
const gateText = JSON.stringify(gate.filter((c) => !(c && typeof c === 'object' && '#comment' in c)));      // the commands, without the comment
const modals = collect(gate, (n) => n.set_modal && n.set_modal.options);
assert.equal(modals.length, 2, 'two modals: the base (2 options) and the hospital (3 options)');
const titles = modals.map((m) => m.set_modal.options.map((o) => o.text));
assert.deepEqual(titles[0], ['DROP HELI RESCUER HERE (BASE)', 'GO BACK TO THE LOADING POINT'], 'at the base: drop here or go back to the loading point');
assert.deepEqual(titles[1], ['DROP HELI RESCUER HERE', 'GO BACK TO THE LOADING POINT', 'RETURN TO HOME BASE'], 'at the hospital: drop here, loading point, home base');
assert.ok(!/END MISSION|NEW DISPATCH|MISSION_END_WAITING|shared repeated block 048/.test(gateText), 'the gate never ends the mission and never asks for a new dispatch');
assert.ok(gateText.includes('"helirescuers_drop_here_monitor"') && gateText.includes('"call_macro":"drop heli rescuer ground here"'), 'the ground drop is the one of the original DROP HELIRESCUER HERE action');
for (const mode of ['base', 'hospital', 'hospital_user']) assert.ok(gateText.includes(`"helirescuers_drop_here_mode"},"value":"${mode}"`), `drop mode ${mode}`);
assert.ok(gateText.includes('"SIM ON GROUND"'), 'the ground drop waits for the landing');
assert.ok(gateText.includes('"local":"FPL_NMBR"},"value":5') && gateText.includes('"heli_rescuer_location"') && gateText.includes('"PREVIOUS_FPL"},"value":6'), 'the way back to the loading point is the original one and the route goes on to the base afterwards');
assert.ok(gateText.includes('"shared repeated block 046"'), 'RETURN TO HOME BASE is the return to base of the end menu');
assert.ok(gateText.includes('"set_modal":{}'), 'the modal is closed when the heli rescuer is dropped meanwhile by the action');
assert.ok(gateText.includes('"return":{"param":"hrg_ret"}'), 'the result tells the caller that the user flies home with the heli rescuer(s)');
assert.ok(!gateText.includes('"speak"'), 'no spoken text in the gate');

// 2. the callers: the hospital menu runs the gate before its first modal and stops when the user flies home; the base runs it before the end menu
const menu = macros['Return to base or continue menu'];
const menuText = JSON.stringify(menu);
const gateAt = menuText.indexOf('"call_macro":"heli rescuer aboard gate"');
const firstModal = menuText.indexOf('"set_modal"');
assert.ok(gateAt > 0 && gateAt < firstModal, 'the gate comes before the first modal of Return to base or continue menu');
assert.ok(menuText.includes('"where":"hospital"') && menuText.includes('"result":"hrg_res"') && /"param":"hrg_res"\},"eq":"base","then":\[\{"return":0\}\]/.test(menuText), 'the menu stops when the user chose to fly home with the heli rescuer(s)');
assert.ok(menuText.indexOf('crew hospital finish') < gateAt, 'the crew emergency of the hospital keeps its own flow');
const rtb = JSON.stringify(macros['return to base']);
const rtbGate = rtb.indexOf('"call_macro":"heli rescuer aboard gate"');
assert.ok(rtbGate > 0 && rtb.includes('"where":"base"'), 'return to base runs the gate with where base');
assert.ok(rtbGate < rtb.lastIndexOf('"call_macro":"crew base scene need"') && rtbGate < rtb.lastIndexOf('"call_macro":"end menu"'), 'and before the base scene and the end menu at the end of the macro');

// 3. nobody else writes the end of the shift because of this: MISSION_END_WAITING is untouched by the gate
assert.equal((gateText.match(/MISSION_END_WAITING/g) || []).length, 0);

console.log('Heli rescuer gate PASS: the end of the mission (END MISSION, NEW DISPATCH, end menu) waits until the heli rescuer(s) are left here, at the loading point or at the base. Runtime in the simulator PENDING.');
