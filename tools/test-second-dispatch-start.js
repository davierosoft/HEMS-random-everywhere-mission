#!/usr/bin/env node
'use strict';
// Report of Daikan (2026-11-03): after accepting the second dispatch the mission restarts (reload_mission) and the starting point
// became the position of the helicopter, the option "start location" was ignored and the mission did not end at the original
// starting point. The restore of objective1 is the one of the baseline (L:SECOND_DISPATCH_ACCEPTED and the LVAR L:MISSION_START_LOCATION);
// the cause could not be proved from the snapshots, so the accept keeps the starting point and a pending mark in globals and objective1
// repairs the flag and the LVARs before anything reads them, and every branch writes a row of dispatch_handoff_log with its values.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'mission-src/macros');
const life = JSON.parse(fs.readFileSync(path.join(root, '11-mission-lifecycle.json'), 'utf8'));
const diag = JSON.parse(fs.readFileSync(path.join(root, '19-location-diagnostics.json'), 'utf8'));
const text = (x) => JSON.stringify(x);

// accept: globals first, then the restart, one row
const acc = life.accept_dispatch;
const t = text(acc);
const iFlag = t.indexOf('"set":{"var":["L:SECOND_DISPATCH_ACCEPTED","number"]},"value":1');
const iGlobLat = t.indexOf('"set":{"global":"SECOND_RESTART_LAT"}');
const iGlobLon = t.indexOf('"set":{"global":"SECOND_RESTART_LON"}');
const iPend = t.indexOf('"set":{"global":"SECOND_RESTART_PENDING"},"value":1');
const iRow = t.indexOf('"stage":"accept_second_start"');
const iReload = t.indexOf('"reload_mission":1');
assert.ok(iFlag > 0 && iGlobLat > iFlag && iGlobLon > iGlobLat && iPend > iGlobLon && iRow > iPend && iReload > iRow, 'accept: flag, then the starting point and the mark in globals, then the row, then reload_mission');
assert.ok(t.includes('"set":{"var":["L:MISSION_START_LOCATION","number"]},"value":{"location":"mission_start_location"}'), 'accept: the LVAR of the starting point is refreshed from the live location first');

// objective1: the repair is before start location diagnostics and before both branches, the mark is cleared at once
const o = text(life.objective1);
const iDefaults = o.indexOf('"call_macro":"settings first run defaults"');
const iRepair = o.indexOf('"global":"SECOND_RESTART_PENDING"},"eq":1');
const iDiag = o.indexOf('"call_macro":"start location diagnostics"');
const iNew = o.indexOf('"stage":"start_location_new"');
const iRestored = o.indexOf('"stage":"start_location_restored"');
assert.ok(iDefaults > 0 && iRepair > iDefaults && iDiag > iRepair && iNew > iDiag && iRestored > iDiag, 'objective1: repair before the diagnostics and the two branches');
const repair = o.slice(iRepair, iDiag);
assert.ok(repair.includes('"var":["L:SECOND_DISPATCH_ACCEPTED","number"]},"ne":1') && repair.includes('"set":{"var":["L:SECOND_DISPATCH_ACCEPTED","number"]},"value":1'), 'the lost flag is set again');
assert.ok(repair.includes('"set":{"var":["L:MISSION_START_LOCATION LAT","number"]},"value":{"global":"SECOND_RESTART_LAT"}') && repair.includes('"set":{"var":["L:MISSION_START_LOCATION LON","number"]},"value":{"global":"SECOND_RESTART_LON"}'), 'the overwritten starting point is written back');
assert.ok(repair.lastIndexOf('"SECOND_RESTART_PENDING"},"value":0') > repair.lastIndexOf('"set":{"var":["L:MISSION_START_LOCATION LON","number"]}'), 'the mark is cleared after the repairs');
// the mark is only set in the accept
const marks = Object.entries({ ...life, ...diag }).filter(([, b]) => text(b).includes('"SECOND_RESTART_PENDING"},"value":1')).map(([n]) => n);
assert.deepStrictEqual(marks, ['accept_dispatch'], 'only the accept sets the mark');

// the rows carry a detail
assert.ok(text(diag['trace dispatch handoff']).includes('"detail":{"param":"detail"}'), 'trace dispatch handoff writes the detail');
console.log('Second dispatch start PASS: the accept keeps the starting point and a mark in globals before reload_mission, objective1 repairs the flag and the LVARs before anything reads them and clears the mark, both branches write a row with their values. HPG/MSFS PENDING.');

// location_ref diagnostics (Daikan 2026-11-03): rows with the dispatcher centre option at the points where the starting point is decided
{
  const lc = fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros/11-mission-lifecycle.json'), 'utf8');
  for (const stage of ['start_location_new', 'start_location_restored', 'accept_second_start', 'objective1_location_ref']) {
    assert.ok(lc.includes('"call_macro": "trace location reference"') ? lc.includes(`"stage": "${stage}"`) : lc.includes(`"stage":"${stage}"`), 'row ' + stage);
  }
  const diag = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros/19-location-diagnostics.json'), 'utf8'));
  const text = JSON.stringify(diag['trace location reference']);
  for (const need of ['location_ref', 'CUSTOM_CENTER_LOCATION', 'MISSION_START_LOCATION', 'heli_to_start_m']) assert.ok(text.includes(need), 'diagnostic carries ' + need);
}
