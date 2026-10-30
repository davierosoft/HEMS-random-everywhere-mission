'use strict';
// The destination modals show the proposed hospital and its distance, so later set_message calls cannot hide the selection.
// Runtime test 2026-10-30 (standalone-tests/modal-params-test.json): a modal text or title built into a local shows its values,
// a params array inside the modal object does not.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const macros = {};
const dir = path.join(root, 'mission-src', 'macros');
for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.json'))) {
  Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
}

// Every command array with its index, so a modal can be checked against the commands that precede it.
const modals = [];
function walk(node, owner) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        for (const key of ['set_modal', 'wait_modal']) {
          if (item[key] && typeof item[key] === 'object') modals.push({ owner, key, modal: item[key], commands: node, index });
        }
      }
      walk(item, owner);
    });
  } else if (node && typeof node === 'object') {
    for (const value of Object.values(node)) walk(value, owner);
  }
}
for (const [name, commands] of Object.entries(macros)) walk(commands, name);

assert.ok(modals.length >= 15, `expected the mission modals, found ${modals.length}`);

// 1. params inside a modal object are not read by the simulator: never use them.
for (const { owner, key, modal } of modals) {
  assert.ok(!Object.hasOwn(modal, 'params'), `${owner}: ${key} uses params, the simulator does not read them in a modal (build the text into a local)`);
}

// 2. The text macro: base text plus hospital and distance, plain base text when no hospital is proposed yet.
const textMacro = macros['destination modal text'];
assert.ok(Array.isArray(textMacro), 'macro "destination modal text" is missing');
const textMacroJson = JSON.stringify(textMacro);
assert.ok(textMacroJson.includes('"has_location":"hospital_user"'), 'the text macro must check hospital_user exists');
assert.ok(textMacroJson.includes('{2}. Selected: {1} (distance {0} Km)'), 'the text macro must show the hospital and the distance');
assert.ok(textMacroJson.includes('"distance:km"') && textMacroJson.includes('"hospital_name"') && textMacroJson.includes('"destination_modal_base"'), 'the text macro must use distance, hospital name and base text');
assert.equal((textMacroJson.match(/"destination_modal_text"/g) || []).length, 2, 'the text macro must set destination_modal_text in both branches');

// 3. Every modal that proposes a hospital builds its text first and reads it from the local.
const destinationModals = modals.filter(({ modal }) => ['CHOOSE DESTINATION', 'CHOOSE AMBULANCE DESTINATION', 'CONFIRM DESTINATION'].includes(modal.title));
const expected = [
  ['user destination menu', 'Select destination helipad for patient transport'],
  ['user destination menu', 'Select helipad for doctor pickup'],
  ['user destination menu', 'Confirm organ transport destination helipad'],
  ['crew emergency destination menu', 'Crew emergency: select the hospital for the injured crew'],
];
for (const [owner, base] of expected) {
  const found = destinationModals.filter((entry) => entry.owner === owner && entry.key === 'set_modal' && String(JSON.stringify(entry.commands[entry.index - 2])).includes(JSON.stringify(base)));
  assert.ok(found.length >= 1, `${owner}: no destination modal built from "${base}"`);
  for (const { commands, index, modal } of found) {
    assert.deepEqual(modal.text, { local: 'destination_modal_text' }, `${owner}: the modal text must come from destination_modal_text`);
    assert.deepEqual(commands[index - 2], { set: { local: 'destination_modal_base' }, value: base }, `${owner}: the base text must be set right before the text macro`);
    assert.deepEqual(commands[index - 1], { call_macro: 'destination modal text' }, `${owner}: the text macro must be called right before the modal`);
  }
}
// The two patient modals of the "user destination menu" (no ambulance / closest ambulance) share the same base text.
assert.equal(destinationModals.filter((entry) => entry.owner === 'user destination menu' && entry.modal.title === 'CHOOSE DESTINATION' && entry.modal.text && entry.modal.text.local === 'destination_modal_text').length, 2, 'both patient destination modals must show the hospital');

// 4. The ambulance-far modal has no hospital yet and stays a plain text.
const farAmbulance = modals.filter(({ modal }) => modal.text && typeof modal.text === 'string' && modal.text.startsWith('Ambulance is far from the accident'));
assert.equal(farAmbulance.length, 1, 'the ambulance-far modal must stay a plain text');

console.log(`destination modal text: ${destinationModals.length} destination modals checked, ${modals.length} modals without params`);
