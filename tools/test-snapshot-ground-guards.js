'use strict';
// Issue 46 point 7 (mission repository): ground / HEMS null guards of the diagnostic snapshot, static part.
// Static only: a local that is read by a snapshot section and is never set anywhere (macro, root, thread) is read as unset. Whether the
// simulator turns that into null or an error is NOT proven here (runtime pending); this gate freezes today's known set so that no new
// never-initialised local enters the ground, patient, inventory, medical or scene sections unnoticed.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = (dir) => fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(root, dir, f), 'utf8')));
const macros = Object.assign({}, ...read('mission-src/macros'));
const others = [read('mission-src/root'), read('mission-src/threads')];

const setLocals = new Set();
(function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node && typeof node === 'object') {
    if (node.set && typeof node.set.local === 'string') setLocals.add(node.set.local);
    for (const key of ['create_param', 'for_each']) if (node[key] && typeof node[key] === 'object' && typeof node[key].local === 'string') setLocals.add(node[key].local);
    Object.values(node).forEach(walk);
  }
})([macros, others]);

function reads(node, out) {
  if (Array.isArray(node)) return node.forEach((x) => reads(x, out));
  if (node && typeof node === 'object') {
    if (typeof node.local === 'string' && Object.keys(node).length === 1) out.add(node.local);
    Object.values(node).forEach((v) => reads(v, out));
  }
}

// Known today (2026-11-18): read by a section, set nowhere. Reviewed, not proven harmless in the simulator.
const KNOWN = {
  snapshot_medical: ['CREW_LIFESCORE_ALERT_LEVEL'],
  snapshot_ground: ['drive_watchdog_ambulance7_state'],
  snapshot_patients: ['ambulance1_ground_claimed', 'HEMS_DECISION_SUMMARY'],
  snapshot_scene: ['CAMPING_OBJECTS', 'VFXA'],
  snapshot_inventory: ['cpr_check', 'drive_watchdog_ambulance7_last_failure', 'drive_watchdog_ambulance7_mult_state', 'drive_watchdog_ftruck_mult_state',
    'drive_watchdog_truckerf_mult_state', 'hos1', 'hos1coor', 'hos2', 'hos2coor', 'hos3', 'hos3coor', 'hos4', 'hos4coor', 'hos5', 'hos5coor', 'LIVERY_ACTIVATION',
    'MISSION_GUIDANCE_OVERRIDE', 'rescuetrack_0', 'rescuetrack_1', 'rescuetrack_2', 'rescuetrack_3', 'rescuetrack_4', 'rescuetrack_5', 'rescuetrack_6',
    'rescuetrack_7', 'rescuetrack_8', 'rescuetrack_9', 'saveloc', 'STATION_1', 'STATION_2', 'STATION_3', 'STATION_4', 'STATION_5', 'STATION_6']
};

const builder = macros['capture diagnostic snapshot'];
assert.ok(Array.isArray(builder), 'capture diagnostic snapshot exists');
let sections = 0;
for (const command of builder) {
  if (!(command.set && typeof command.set.key === 'string' && /^snapshot_/.test(command.set.key))) continue;
  sections++;
  const found = new Set();
  reads(command.value, found);
  const unset = [...found].filter((name) => !setLocals.has(name)).sort();
  assert.deepEqual(unset, [...(KNOWN[command.set.key] || [])].sort(), `${command.set.key}: locals read and never set changed; review them (null guard) before extending the list`);
}
assert.ok(sections >= 11, 'all snapshot sections inspected');

// The ground and HEMS sections never keep a location reference: only has_location flags and numbers (issue 46 point 6)
for (const command of builder) {
  if (command.set && /^snapshot_(ground|locations)$/.test(command.set.key || '')) {
    const text = JSON.stringify(command.value);
    assert.ok(!/{"location":"[A-Za-z0-9_]+"}/.test(text), `${command.set.key}: no bare location reference stored in the table (a distance read is a number)`);
  }
}
// The registry part runs inside a try, a failure there cannot stop the snapshot
assert.ok(builder.some((c) => c.try), 'the registry capture is inside a try');
console.log(`snapshot ground guards: ${sections} sections, never-set locals frozen (static only, runtime pending)`);
