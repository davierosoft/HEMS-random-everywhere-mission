#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const profiles = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/03-aircraft-crew-checklists.json'), 'utf8'));
const presets = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/02-save-load-presets.json'), 'utf8'));
const settings = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/04-dispatch-tablet-ui.json'), 'utf8'));
const tracker = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/16-release-test-tracker.json'), 'utf8'));
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
requireTrue(contains(lifecycle.objective1, (entry) => entry?.if?.global === 'SAVENAME' && entry.eq === null && entry.then?.some((command) => command.set?.global === 'SAVENAME')), 'mission startup must initialize saved-profile state through set: global');

const marker = profiles['mark aircraft profile custom'];
requireTrue(hasCall(marker, 'save custom aircraft profile'), 'settings changes do not persist immediately');
requireTrue(contains(marker, (entry) => entry && entry.set && entry.set.global === 'AIRCRAFT_PROFILE_SLOT' && entry.value === 'Aircraft_Profile_Table1'), 'factory changes do not seed CUS.PROFILE 0');

const store = presets['store aircraft profile on file'];
const copy = presets['copy saved aircraft profile to actual set'];
const profileSave = presets['save custom aircraft profile'];
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
requireTrue(contains(profileSave, (entry) => entry && entry.set && entry.set.local === 'SAVE_LOCAL_TIMESTAMP'), 'profile save does not construct a local timestamp');
requireTrue(contains(profileSave, (entry) => entry && entry.set && entry.set.table && entry.set.key === 'saved_at' && entry.value && entry.value.local === 'SAVE_LOCAL_TIMESTAMP'), 'profile save does not store the local timestamp');
for (const [macro, slot] of [['savetemp', 0], ['save1', 1], ['save2', 2], ['save3', 3]]) {
  const commands = presets[macro];
  const serialized = JSON.stringify(commands);
  requireTrue(serialized.includes('toLocaleDateString') && serialized.includes('toLocaleTimeString'), `${macro} does not format a local date and time`);
  requireTrue(!serialized.match(/toLocaleTimeString[^}]*params[^\]]*,\s*\{/), `${macro} passes unsupported locale options to toLocaleTimeString`);
  requireTrue(contains(commands, (entry) => entry && entry.set && entry.set.global === `SAVE_TIMESTAMP${slot}` && entry.value && entry.value.local === 'SAVE_LOCAL_TIMESTAMP'), `${macro} does not store its local timestamp`);
}
for (const slot of [1, 2, 3]) requireTrue(contains(presets[`delete${slot}`], (entry) => entry && entry.set && entry.set.global === `SAVE_TIMESTAMP${slot}` && entry.value === null), `delete${slot} does not clear its timestamp`);

const renderer = profiles['aircraft profiles page'].find((entry) => Array.isArray(entry.set_dispatch));
requireTrue(renderer, 'aircraft profile renderer is missing');
const profilePage = profiles['aircraft profiles page'];
const savedTableOpen = profilePage.findIndex((entry) => entry && entry.open_table && entry.open_table.static === 'Aircraft_Profile_Saved_Preset');
const rendererIndex = profilePage.indexOf(renderer);
requireTrue(savedTableOpen >= 0 && savedTableOpen < rendererIndex, 'saved-preset table is not opened before the renderer reads it');
requireTrue(contains(profilePage.slice(0, rendererIndex), (entry) => entry && entry.set && entry.set.local === 'AIRCRAFT_PROFILE_SAVED_PRESET_VALID' && entry.value && entry.value.table && entry.value.table.static === 'Aircraft_Profile_Saved_Preset'), 'saved-preset validity is not materialized before rendering');
const rows = renderer.set_dispatch;
const buttonRows = rows.filter((row) => Array.isArray(row.buttonbar));
const buttons = buttonRows.flatMap((row) => row.buttonbar.map((button) => ({ row, button })));
const titles = buttons.map(({ button }) => button.title);
requireTrue(titles.includes('SAVE ACTUAL CONFIG TO FILE'), 'file-store button is missing');
requireTrue(buttons.some(({ button }) => button.text === 'LAST FILE SAVE: {0}' && button.params && button.params[0] && button.params[0].local === 'AIRCRAFT_PROFILE_SAVED_PRESET_AT'), 'file-store timestamp is not displayed beside its button');
requireTrue(!titles.includes('SAVE CUSTOM') && !titles.includes('RELOAD CUSTOM') && !titles.includes('UNLINK'), 'legacy save/reload/unlink controls remain');
const copyControl = buttons.find(({ button }) => button.title === 'COPY SAVED CONFIG IN SELECTED PROFILE');
requireTrue(copyControl && copyControl.row.show_condition && copyControl.row.show_condition.require && copyControl.row.show_condition.require.global === 'AIRCRAFT_PROFILE_ACTIVE' && copyControl.row.show_condition.eq === 'CUSTOM', 'copy control is not hidden for factory profiles');
requireTrue(copyControl.button.disabled_condition && copyControl.button.disabled_condition.require && copyControl.button.disabled_condition.require.local === 'AIRCRAFT_PROFILE_SAVED_PRESET_VALID' && copyControl.button.disabled_condition.ne === 'yes', 'copy control is not gated on the opened saved preset state');
const copyCommand = copyControl.button.commands && copyControl.button.commands[0];
requireTrue(copyCommand && copyCommand.call_macro === 'copy saved aircraft profile to actual set' && !copyCommand.params, 'copy control passes a dynamic destination table');
for (const label of ['MSN LIST DFLT', 'MSN LIST 1', 'MSN LIST 2', 'MSN LIST 3', 'MSN LIST 4', 'MSN LIST 5']) requireTrue(titles.includes(label), `missing link label ${label}`);

const trackerLabel = 'TEST AIRCRAFT PROFILES: SELECT CUS.PROFILE 1; SETTINGS/MEDICAL OPTIONS: SWITCH AUTOMATIC OR MANUAL; REOPEN CUS.PROFILE 1';
requireTrue(JSON.stringify(tracker['test tracker page']).includes(trackerLabel), 'Test Tracker does not state the exact aircraft-profile test flow');
requireTrue(!hasCall(profilePage, 'test tracker begin') && !hasCall(profilePage, 'test tracker complete'), 'opening the profile page changes the test result without verification');
requireTrue(contains(settings.settings, (entry) => entry && entry.call_macro === 'test tracker begin' && entry.params && entry.params.test_id === 'aircraft_profiles'), 'Medical Options mode switch does not begin the aircraft-profile test');
requireTrue(contains(settings.settings, (entry) => entry && entry.set && entry.set.table && entry.set.table.static === 'Debug_Table' && entry.set.key === 'test_aircraft_profiles_medical_mode'), 'Medical Options mode switch does not record the expected saved value');
const selectCustom = presets['select custom aircraft profile'];
requireTrue(contains(selectCustom, (entry) => entry && entry.open_table && entry.open_table.static === 'Debug_Table'), 'custom profile reload does not open test state before reading it');
requireTrue(contains(selectCustom, (entry) => entry && entry.call_macro === 'test tracker complete' && entry.params && entry.params.test_id === 'aircraft_profiles'), 'custom profile reload does not complete the verified test');

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
