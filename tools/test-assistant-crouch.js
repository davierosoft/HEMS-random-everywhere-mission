#!/usr/bin/env node
'use strict';
// Report of MPR (2026-11-03, skid operations, 4 crew): the rear crew member walked to the patient and stayed standing while the primary
// one crouched for the assessment. Also: a saved custom centre option without a custom centre falls back to the starting point.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const rd = (f) => fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros', f), 'utf8');
const rt = JSON.parse(rd('17-multipatient-runtime.json'));
const up = JSON.stringify(rt['multipatient registry assistant stand up']);
for (const need of ['CREW_ASSISTANT_CROUCHED', 'multipatient registry crew leave assessment', 'multipatient registry crew set standing', 'CREW_ASSISTANT_BUSY']) assert.ok(up.includes(need), 'stand up uses ' + need);
const disp = JSON.stringify(rt['multipatient registry assistant dispatch']);
assert.ok(disp.includes('"multipatient registry crew set assessment"') && disp.includes('"CREW_ASSISTANT_HEMS"'), 'the assistant crouches only in a HEMS visit with 4 or 5 crew');
assert.ok(disp.includes('"ne":3') || disp.includes('"ne": 3'), 'not with 3 crew (pax3 is the pilot)');
const visit = JSON.stringify(rt['multipatient registry crew visit']);
assert.ok((visit.match(/multipatient registry assistant stand up/g) || []).length >= 2, 'the assistant stands up at the end of the visit and when it fails');
assert.ok(visit.includes('"hems"'), 'the dispatch says whether the visit is a HEMS one');
const lc = rd('11-mission-lifecycle.json');
assert.ok(/custom_center_location[\s\S]{0,700}"value":\s*"mission_start_location"/.test(lc), 'objective1: missing custom centre falls back to the starting point');
const tab = rd('04-dispatch-tablet-ui.json');
assert.strictEqual((tab.match(/"has_location":\s*"custom_center_location"\},\s*"ne":\s*1/g) || []).length, 2, 'tablet: cancelled custom selection falls back to the starting point');
console.log('assistant crouch and custom centre fallback ok');
