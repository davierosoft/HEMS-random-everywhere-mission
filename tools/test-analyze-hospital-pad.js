#!/usr/bin/env node
'use strict';

// The analyzer of the hospital pad diagnosis (tools/analyze-hospital-pad.js): a synthetic geometry with known numbers must give them, and a snapshot
// without the rows of the diagnosis (a build before 169.51) must say so instead of printing an empty analysis.
const assert = require('node:assert/strict');
const tool = require('./analyze-hospital-pad.js');

const text = tool.selftest();
assert.ok(text.includes('DAMBWP 18.0 m @340.0'), 'the waypoint DAMBWP comes back at 18 m, bearing 340 from the helicopter');
assert.ok(text.includes('hoist_crew to stretcher 1.5 m'), 'the medic stands 1.5 m from the stretcher in the baseline layout');
assert.ok(/route hoist_crew walk with the trolley: legs [0-9.]+ \+/.test(text), 'the routes are printed with their legs');

const empty = tool.report(tool.analyze({ ground_crew_runtime_trace: '' }), 'empty');
assert.ok(empty.includes('no pad_points rows'), 'a snapshot without the diagnosis rows says so');

const array = tool.analyze({ ground_crew_runtime_trace: [{ time: 1, target: 'other', state: 'x' }, { time: 2, target: 'hospital pad', state: 'pad_points t | heli_lat=1 | heli_lon=2 | heli_hdg=0' }] });
assert.equal(array.rows, 1, 'only the rows of the hospital pad are kept');
assert.equal(array.stages.length, 1, 'a trace given as an array of rows is read like the text of a snapshot');

console.log('Hospital pad analyzer PASS: known geometry rebuilt, a snapshot without the diagnosis is reported, arrays and text traces are read.');