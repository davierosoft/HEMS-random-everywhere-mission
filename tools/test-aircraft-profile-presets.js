#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profiles = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/03-aircraft-crew-checklists.json'), 'utf8'));
const presets = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/02-save-load-presets.json'), 'utf8'));
const lifecycle = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/11-mission-lifecycle.json'), 'utf8'));
const tables = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/data/01-persistence-tables.json'), 'utf8'));

function fail(message) { throw new Error(`Aircraft profile preset gate: ${message}`); }
function requireTrue(condition, message) { if (!condition) fail(message); }
function contains(value, predicate) {
  if (predicate(value)) return true;
  if (Array.isArray(value)) return value.some((entry) => contains(entry, predicate));
  if (value && typeof value === 'object') return Object.values(value).some((entry) => contains(entry, predicate));
  return false;
}
function hasCall(value, name) { return contains(value, (entry) => entry && entry.call_macro === name); }
function hasSetTable(value, table, key, expectedValue) {
  return contains(value, (entry) => entry && entry.set && entry.set.table && entry.set.table.static === table && entry.set.key === key && JSON.stringify(entry.value) === JSON.stringify(expectedValue));
}

requireTrue(tables.Aircraft_Profile_Saved_Preset === 'Andrews_saved_aircraft_profile', 'independent saved-preset table is missing');

const marker = profiles['mark aircraft profile custom'];
requireTrue(hasCall(marker, 'save custom aircraft profile'), 'settings changes do not persist immediately');
requireTrue(contains(marker, (entry) => entry && entry.set && entry.set.global === 'AIRCRAFT_PROFILE_SLOT' && entry.value === 'Aircraft_Profile_Table1'), 'factory changes do not seed CUSTOM DEFAULT');

const store = presets['store aircraft profile on file'];
const copy = presets['copy saved aircraft profile to actual set'];
requireTrue(Array.isArray(store) && hasCall(store, 'save custom aircraft profile'), 'file-store macro is missing');
requireTrue(contains(store, (entry) => entry && entry.call_macro === 'save custom aircraft profile' && entry.params && entry.params.PROFILE_TABLE === 'Aircraft_Profile_Saved_Preset'), 'file-store macro does not target the independent backup');
requireTrue(Array.isArray(copy) && hasCall(copy, 'load custom aircraft profile') && hasCall(copy, 'save custom aircraft profile'), 'saved preset is not copied through the existing profile schema');
const profileSlots = ['Aircraft_Profile_Table1', 'Aircraft_Profile_Table2', 'Aircraft_Profile_Table3', 'Aircraft_Profile_Table4', 'Aircraft_Profile_Table5', 'Aircraft_Profile_Table6'];
const savedCopy = copy.find((entry) => entry && entry.if && entry.if.table && entry.if.table.static === 'Aircraft_Profile_Saved_Preset' && entry.if.key === 'valid');
requireTrue(savedCopy && Array.isArray(savedCopy.then), 'saved-preset copy has no valid-table branch');
for (const slot of profileSlots) {
  const branch = savedCopy.then.find((entry) => entry && entry.if && entry.if.global === 'AIRCRAFT_PROFILE_SLOT' && entry.eq === slot);
  requireTrue(branch, `saved-preset copy does not support ${slot}`);
  requireTrue(contains(branch, (entry) => entry && entry.call_macro === 'save custom aircraft profile' && entry.params && entry.params.PROFILE_TABLE === slot), `saved-preset copy does not save to static ${slot}`);
  requireTrue(contains(branch, (entry) => entry && entry.call_macro === 'load custom aircraft profile' && entry.params && entry.params.PROFILE_TABLE === slot), `saved-preset copy does not reload static ${slot}`);
}
requireTrue(!contains(copy, (entry) => entry && entry.params && entry.params.PROFILE_TABLE && entry.params.PROFILE_TABLE.param === 'PROFILE_TABLE'), 'saved-preset copy passes a dynamic table into static table commands');

const renderer = profiles['aircraft profiles page'].find((entry) => Array.isArray(entry.set_dispatch));
requireTrue(renderer, 'aircraft profile renderer is missing');
const rows = renderer.set_dispatch;
const buttonRows = rows.filter((row) => Array.isArray(row.buttonbar));
const buttons = buttonRows.flatMap((row) => row.buttonbar.map((button) => ({ row, button })));
const titles = buttons.map(({ button }) => button.title);
requireTrue(titles.includes('STORE PRESET ON FILE'), 'file-store button is missing');
requireTrue(!titles.includes('SAVE CUSTOM') && !titles.includes('RELOAD CUSTOM') && !titles.includes('UNLINK'), 'legacy save/reload/unlink controls remain');
const copyControl = buttons.find(({ button }) => button.title === 'COPY SAVED PRESET TO ACTUAL SET');
requireTrue(copyControl && copyControl.row.show_condition && copyControl.row.show_condition.require && copyControl.row.show_condition.require.global === 'AIRCRAFT_PROFILE_ACTIVE' && copyControl.row.show_condition.eq === 'CUSTOM', 'copy control is not hidden for factory profiles');
requireTrue(copyControl.button.disabled_condition && copyControl.button.disabled_condition.ne === 'yes', 'copy control is not gated on an available saved preset');
const copyCommand = copyControl.button.commands && copyControl.button.commands[0];
requireTrue(copyCommand && copyCommand.call_macro === 'copy saved aircraft profile to actual set' && !copyCommand.params, 'copy control passes a dynamic destination table');
for (const label of ['MSN LIST DFLT', 'MSN LIST 1', 'MSN LIST 2', 'MSN LIST 3', 'MSN LIST 4', 'MSN LIST 5']) requireTrue(titles.includes(label), `missing link label ${label}`);

const missionTables = ['Config_Table1', 'Config_Table3', 'Config_Table4', 'Config_Table5', 'Config_Table6', 'Config_Table7'];
const link = presets['link aircraft profile to mission'];
for (const mission of missionTables) {
  const branch = link.find((entry) => entry.if && entry.if.param === 'MISSION_TABLE' && entry.eq === mission);
  requireTrue(branch, `missing link branch for ${mission}`);
  requireTrue(hasSetTable(branch, 'Aircraft_Profile_Links', mission, null), `linked ${mission} cannot be toggled off`);
}

requireTrue(presets['switch mission preset'].at(-1).call_macro === 'apply linked aircraft profile', 'interactive mission preset changes do not apply a linked aircraft profile');
requireTrue(presets['load current mission preset'].at(-1).call_macro === 'apply linked aircraft profile', 'current mission preset reload does not apply a linked aircraft profile');
const startup = lifecycle.objective1;
const liveryIndex = startup.findIndex((entry) => JSON.stringify(entry).includes('LIVERY_PRESET'));
const linkedProfileIndex = startup.findIndex((entry, index) => index > liveryIndex && entry.call_macro === 'apply linked aircraft profile');
requireTrue(liveryIndex >= 0 && linkedProfileIndex > liveryIndex, 'livery-selected startup preset does not apply a linked aircraft profile after selection');

console.log('Aircraft profile preset gate PASS.');
