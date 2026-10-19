#!/usr/bin/env node
'use strict';

// Flight log of 2026-10-19 (hoist operation, patient taken by the ambulance): the doctor never went up. HOISTING waited "for ambulance crew operations" until
// L:STEP was above 6 or L:AMBUSTRETCHERFULL was 0, which only the legacy ambulance macros set; the dispatch was cancelled with the doctor still down; and the
// hoist operation had no progress bar. Static checks of the production sources; no HPG/MSFS behaviour is modeled, runtime PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const text = (value) => JSON.stringify(value);

// 1. the live ambulance releases the wait of HOISTING (primary defect) and the wait has a limit (secondary safeguard)
const load = text(macros['multipatient registry live ground load']);
assert.ok(load.includes('"set":{"var":["L:AMBUSTRETCHERFULL","number"]},"value":0') && load.indexOf('"set":{"var":["L:AMBUSTRETCHERFULL","number"]},"value":0') > load.indexOf('loaded_stretcher_and_medic_destroyed'), 'the live ground load clears L:AMBUSTRETCHERFULL once the patient is loaded');
const hoisting = text(macros['HOISTING']);
assert.ok(hoisting.includes('Waiting for ambulance crew operations to be completed') && hoisting.includes('"var":["L:AMBUSTRETCHERFULL","number"]},"eq":0') && hoisting.includes('"local":"hoist_amb_wait"},"eq":"yes"') && hoisting.includes('"sleep":480'), 'the wait for the ambulance ends with the flag, with L:STEP above 6, or after 8 minutes');

// 2. no cancellation while the HEMS crew is out in a hoist or skid operation
const evaluation = text(macros['dispatch cancellation evaluation']);
assert.ok(evaluation.includes('"var":["L:MISSION_HOIST","number"]},"ne":0,"then":[{"set":{"local":"helicopter_on_scene"},"value":1}]'), 'the crew out in a hoist or skid operation counts as the helicopter on the scene: no cancellation');

// 3. the dispatcher informs when the crew is aboard again, once
const notice = text(macros['dispatch ambulance notice']);
assert.ok(notice.includes('"local":"dispatch_cancellation_pending"},"ne":"done"') && notice.includes('"local":"dispatch_cancellation_pending"},"value":"done"') && notice.includes('AMB.CAN.DSP') && notice.includes('Dispatcher_Messages') && !notice.includes('MISSION_PHASE') && !notice.includes('return to base menu'), 'the notice is said once, with the dispatcher message and the voice, and does not end the dispatch');
const dest = text(macros['user destination menu']);
assert.ok(dest.indexOf('"wait_for":{"var":["L:HOISTED","number"]},"eq":1},{"call_macro":"dispatch ambulance notice"}') > dest.indexOf('"whobringpatient"},"eq":"ambulance"'), 'the notice comes when the crew is aboard (L:HOISTED 1), in the ambulance case');

// 4. the progress bar of the hoist operation
const down = hoisting.indexOf('"id":"hoist_crew_down"');
assert.ok(down > 0 && hoisting.indexOf('"call_macro":"on-site operations progress monitor"') > down && hoisting.indexOf('"local":"ops_progress_active"},"value":1') > down && hoisting.indexOf('"var":["L:SATISFACTION","number"]},"value":0') > down, 'the progress monitor starts when the crew is on the ground');
const monitor = text(macros['on-site operations progress monitor']);
assert.ok(monitor.includes('"var":["L:MISSION_HOIST","number"]},"eq":0,"then":[{"call_macro":"voice ground update"}]'), 'the hoist keeps its own voices: voice ground update runs only without hoist or skid');
assert.ok(monitor.includes('"var":["L:HOISTED","number"]},"eq":1') && monitor.includes('"ops_progress_stage"},"value":"ON-SITE OPERATIONS COMPLETE"'), 'the monitor ends when the crew is hoisted back');

console.log('Hoist return PASS: the live ambulance releases the wait, a limit of 8 minutes, no cancellation with the crew out, the dispatcher informs once the crew is aboard, the progress bar of the hoist. HPG/MSFS PENDING.');
