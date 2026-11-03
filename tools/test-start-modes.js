#!/usr/bin/env node
'use strict';
// Start modes (location_ref), as specified by the author on 2026-11-03:
//  $USER: the starting point moves to the helicopter at every accept (fixed by objective1 after the restart);
//  START (default): LVARs written once and never overwritten, calculated again only when they are 0 (flight reloaded in MSFS);
//  CUSTOM: created at the start from the starting point, behaves like START, customizable.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros', f), 'utf8'));
const lc = rd('11-mission-lifecycle.json');
const o1 = JSON.stringify(lc.objective1);
const acc = JSON.stringify(lc.accept_dispatch);
// START and CUSTOM reuse the LVARs, $USER recalculates
assert.ok(o1.includes('start_location_reused') && o1.includes('start_location_new') && o1.includes('start_location_recalculated'), 'rows reused, new, recalculated');
assert.ok(/"require":\{"var":\["L:MISSION_START_LOCATION LAT","number"\]\},"ne":0\},\{"require":\{"global":"location_ref"\},"ne":"\$USER"/.test(o1), 'reuse only when the LVARs are not 0 and the mode is not $USER');
// second dispatch accept: only $USER moves the start to the helicopter
assert.ok(/"if":\{"global":"location_ref"\},"eq":"\$USER","then":\[\{"create_location":"mission_start_location","zones":\[\{"zone":\{"location":"\$USER"\}\}\]\}\]/.test(acc), 'accept: $USER takes the helicopter position');
// custom centre created from the start, then from its LVARs
assert.ok(o1.includes('"create_location":"custom_center_location"') && o1.includes('L:CUSTOM_CENTER_LOCATION'), 'custom centre created at the start');
// START is the default
const defaults = JSON.stringify(lc);
assert.ok(/"global":"location_ref"\},"eq":null,"then":\[\{"set":\{"global":"location_ref"\},"value":"mission_start_location"/.test(defaults), 'default START');
const ac = fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros/03-aircraft-crew-checklists.json'), 'utf8');
assert.ok(!/"location_ref"\},\s*"value":\s*"\$USER"/.test(ac), 'aircraft profile defaults are START');
console.log('start modes ok');
