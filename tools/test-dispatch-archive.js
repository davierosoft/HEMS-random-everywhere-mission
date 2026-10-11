#!/usr/bin/env node
'use strict';

// Persistent multi-dispatch diagnostics: Debug_Dispatch_Table survives the second dispatch and is cleared only
// when a first dispatch starts. Production macros run on the shared HPG subset interpreter; HPG/MSFS is NOT modeled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', `${name}.json`), 'utf8'));
const diagnostics = read('19-location-diagnostics');
const lifecycle = read('11-mission-lifecycle');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'data', '04-vehicles-and-scene-assets.json'), 'utf8'));

// ---- structure -------------------------------------------------------------------------------
assert.equal(data.Debug_Dispatch_Table, 'R&E_debug_dispatch_snapshots', 'the dispatch diagnostics file needs its own persistent table');
function collect(value, predicate, found = []) {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') {
    if (predicate(value)) found.push(value);
    Object.values(value).forEach((child) => collect(child, predicate, found));
  }
  return found;
}
const objectiveCalls = collect(lifecycle.objective1, (c) => c.call_macro === 'start location diagnostics');
assert.equal(objectiveCalls.length, 1);
assert.equal(objectiveCalls[0].params?.init, 1, 'objective1 must tell start location diagnostics that a mission is starting');
const nextCalls = collect(lifecycle.next_dispatch, (c) => c.call_macro === 'start location diagnostics');
assert.equal(nextCalls.length, 1);
assert.equal(nextCalls[0].params, undefined, 'next_dispatch must never clear the persistent file');
function arrays(value, predicate, found = []) {
  if (Array.isArray(value)) { if (predicate(value)) found.push(value); value.forEach((item) => arrays(item, predicate, found)); }
  else if (value && typeof value === 'object') Object.values(value).forEach((child) => arrays(child, predicate, found));
  return found;
}
const archiveBeforeWipe = arrays(lifecycle.next_dispatch, (c) => c.some((x) => x?.call_macro === 'archive closing dispatch'))[0];
assert.ok(archiveBeforeWipe, 'next_dispatch must archive the closing dispatch');
assert.ok(archiveBeforeWipe.findIndex((x) => x.call_macro === 'archive closing dispatch') < archiveBeforeWipe.findIndex((x) => x.call_macro === 'start location diagnostics'), 'archive must run before the automatic table is wiped');
assert.ok(JSON.stringify(diagnostics['trace dispatch handoff']).includes('"call_macro":"snapshot dispatch diagnostics"'), 'every handoff stage refreshes the file');
assert.ok(JSON.stringify(diagnostics['ground ops watch start']).includes('"stage":"ground_ops_stall"'), 'a ground ops stall refreshes the file');
const start = JSON.stringify(diagnostics['start location diagnostics']);
assert.ok(start.includes('"require":{"param":"init"},"eq":1') && start.includes('SECOND_DISPATCH_ACCEPTED'), 'the first-dispatch reset is conditional on init and no accepted second dispatch');
assert.ok(/^[\x20-\x7e\n]*$/.test(JSON.stringify([diagnostics['snapshot dispatch diagnostics'], diagnostics['archive closing dispatch'], diagnostics['copy automatic snapshot to previous mission']], null, 1)), 'new macros must be ASCII');
assert.equal(data.Debug_Prev_Table, 'R&E_debug_previous_mission_snapshots', 'the previous mission snapshot needs its own persistent table');
{
  // The previous mission copy runs first in start location diagnostics, before the first-dispatch reset and the automatic wipe.
  const commands = diagnostics['start location diagnostics'];
  const copyAt = commands.findIndex((c) => c.call_macro === 'copy automatic snapshot to previous mission');
  assert.ok(copyAt >= 0 && copyAt < commands.findIndex((c) => c.if) && copyAt < commands.findIndex((c) => c.open_table?.static === 'Debug_Auto_Table'), 'the copy runs before any wipe');
  const copy = diagnostics['copy automatic snapshot to previous mission'];
  const keys = collect(copy, (c) => c.set?.table?.static === 'Debug_Prev_Table' && typeof c.set.key === 'string' && c.value?.table?.static === 'Debug_Auto_Table').map((c) => c.set.key);
  assert.equal(keys.length, 49);
  assert.equal(new Set(keys).size, 49, 'every key once');
  assert.ok(keys.every((key) => collect(copy, (c) => c.value?.table?.static === 'Debug_Auto_Table' && c.value.key === key).length === 1));
  // every key the automatic snapshot macros write is copied
  const written = new Set(collect([diagnostics['capture diagnostic snapshot'], diagnostics['capture automatic snapshot'], diagnostics['start location diagnostics']], (c) => c.set?.table && typeof c.set.key === 'string' && (c.set.table.static === 'Debug_Auto_Table' || c.set.table.param === 'snapshot_table')).map((c) => c.set.key));
  for (const key of written) assert.ok(keys.includes(key), 'key not copied to the previous mission file: ' + key);
}

// ---- behavior --------------------------------------------------------------------------------
const source = fs.readFileSync(path.join(__dirname, 'test-live-patient-transport.js'), 'utf8');
const context = { require, __dirname, structuredClone, console, module: { exports: {} } };
vm.runInNewContext(source.slice(0, source.indexOf('for (const resource of')) + '\nmodule.exports = Live;', context);
const Live = context.module.exports;
class Harness extends Live {
  query(q, p) {
    if (q?.static === 'Debug_Auto_Table') return 'automatic';
    if (q?.static === 'Debug_Dispatch_Table') return 'dispatch';
    if (q?.static === 'Debug_Prev_Table') return 'previous';
    if (q?.fn === 'get_time_string') return '12:00:00';
    if (q?.location && q.var === 'distance:m') return 0;
    if (q?.location && q.var === undefined && Object.keys(q).length === 1) return this.locations[q.location];
    if (q?.object && typeof q.object === 'string' && q.var === 'distance:m') return 1;
    if (q?.object) return this.objects.has(this.query(q.object, p)) ? 1 : -1;
    return super.query(q, p);
  }
  commands(list, p) {
    for (const command of list) {
      const target = command.set?.var?.[0];
      if (target && command.value?.location && command.value.var === undefined && Object.keys(command.value).length === 1) {
        const location = this.locations[command.value.location];
        this.locals[target] = 0; this.locals[`${target} LAT`] = location[0]; this.locals[`${target} LON`] = location[1];
      } else super.commands([command], p);
    }
  }
}
const harness = () => {
  const h = new Harness();
  h.sleepHook = null;
  Object.assign(h.locals, { RELEASE_IDENTITY: '0.997 test', 'L:MISSION_TIME': 900 });
  return h;
};
const rows = (n, key) => Array.from({ length: n }, (_, i) => ({ [key]: i }));

{
  // First dispatch: init clears the persistent state and the file.
  const h = harness();
  Object.assign(h.locals, { dispatch_handoff_log: rows(3, 'h'), dispatch_archive: rows(2, 'a'), ground_ops_checkpoint_log: rows(5, 'c'), ground_ops_watch_log: rows(4, 'w'), dispatch_sequence: 3, 'L:SECOND_DISPATCH_ACCEPTED': 0 });
  h.call('start location diagnostics', { init: 1 });
  assert.equal(h.locals.dispatch_handoff_log.length, 0);
  assert.equal(h.locals.dispatch_archive.length, 0);
  assert.equal(h.locals.ground_ops_checkpoint_log.length, 0);
  assert.equal(h.locals.ground_ops_watch_log.length, 0);
  assert.equal(h.locals.dispatch_sequence, 1);
  assert.equal(h.savedTables.dispatch.valid, 'no');
  assert.equal(h.savedTables.dispatch.last_stage, 'first_dispatch_reset');
  assert.equal(h.savedTables.dispatch.dispatch_archive, null);
}
{
  // Second dispatch start (flag accepted) and the new dispatch preview keep everything.
  for (const [params, flag] of [[{ init: 1 }, 1], [{}, 0], [{}, 1]]) {
    const h = harness();
    Object.assign(h.locals, { dispatch_handoff_log: rows(3, 'h'), dispatch_archive: rows(1, 'a'), ground_ops_checkpoint_log: rows(5, 'c'), ground_ops_watch_log: rows(4, 'w'), dispatch_sequence: 2, 'L:SECOND_DISPATCH_ACCEPTED': flag });
    h.call('start location diagnostics', params);
    assert.equal(h.locals.dispatch_handoff_log.length, 3, JSON.stringify({ params, flag }));
    assert.equal(h.locals.dispatch_archive.length, 1);
    assert.equal(h.locals.ground_ops_checkpoint_log.length, 5);
    assert.equal(h.locals.dispatch_sequence, 2);
    assert.equal(h.savedTables.dispatch, undefined, 'the persistent file is untouched');
  }
}
{
  // Closing dispatch 1, wipe of the automatic table, then dispatch 2: the file keeps dispatch 1.
  const h = harness();
  Object.assign(h.locals, {
    ground_crew_runtime_trace: rows(1000, 'seq'), crew_movement_log: rows(2, 'm'), ambulance_monitor_log: rows(3, 'b'),
    location_diagnostic_history: rows(4, 'l'), dispatch_handoff_log: rows(2, 'h'), 'L:SECOND_DISPATCH_ACCEPTED': 0,
    GNDOPS_45_CREW_TRACE: 'NR gate passed',
  });
  h.call('archive closing dispatch');
  assert.equal(h.locals.dispatch_archive.length, 1);
  const archived = h.locals.dispatch_archive[0];
  assert.equal(archived.dispatch, 1);
  assert.equal(archived.ground_crew_runtime_trace_tail.length, 400, 'the trace tail is bounded');
  assert.equal(archived.ground_crew_runtime_trace_tail[0].seq, 600);
  assert.equal(archived.ground_crew_runtime_trace_tail.at(-1).seq, 999);
  assert.equal(archived.ground_ops_state.trace_45, 'NR gate passed');
  assert.ok(archived.snapshot_flow && archived.snapshot_locations, 'the closing sections are captured before the wipe');
  assert.equal(h.locals.dispatch_sequence, 2);
  assert.equal(h.savedTables.dispatch.last_stage, 'dispatch_closed');
  assert.equal(h.savedTables.dispatch.dispatch_archive.length, 1);
  assert.equal(h.locals.dispatch_archive_error, undefined);
  h.call('start location diagnostics');
  assert.equal(h.savedTables.automatic.valid, 'no', 'the automatic table is still wiped for the new dispatch');
  assert.equal(h.locals.ground_crew_runtime_trace.length, 0);
  assert.equal(h.savedTables.dispatch.dispatch_archive.length, 1, 'the wipe does not reach the persistent file');
  // Dispatch 2 starts: init with the accepted flag keeps the file, a handoff stage refreshes it.
  h.locals['L:SECOND_DISPATCH_ACCEPTED'] = 1;
  h.call('start location diagnostics', { init: 1 });
  h.call('trace dispatch handoff', { stage: 'objective1_rebuilt' });
  assert.equal(h.savedTables.dispatch.last_stage, 'objective1_rebuilt');
  assert.equal(h.savedTables.dispatch.dispatch_archive.length, 1);
  assert.equal(h.savedTables.dispatch.dispatch_handoff_log.at(-1).stage, 'objective1_rebuilt');
  assert.equal(h.savedTables.dispatch.dispatch_sequence, 2);
  // Only a new first dispatch clears it.
  h.locals['L:SECOND_DISPATCH_ACCEPTED'] = 0;
  h.call('start location diagnostics', { init: 1 });
  assert.equal(h.savedTables.dispatch.valid, 'no');
  assert.equal(h.locals.dispatch_archive.length, 0);
}
{
  // At most three closed dispatches are kept; an archive error never stops the flow.
  const h = harness();
  h.locals.dispatch_archive = rows(3, 'a');
  h.call('archive closing dispatch');
  assert.equal(h.locals.dispatch_archive.length, 3);
  assert.equal(h.locals.dispatch_archive[0].a, 1, 'the oldest archive is dropped first');
  const failing = harness();
  failing.query = (q, p) => { if (q?.table && q.key === 'snapshot_flow') throw new Error('boom'); return Harness.prototype.query.call(failing, q, p); };
  failing.call('archive closing dispatch');
  assert.match(failing.locals.dispatch_archive_error, /boom/);
  assert.equal(failing.locals.dispatch_sequence, 2, 'the sequence still advances');
  assert.equal(failing.savedTables.dispatch.last_stage, 'dispatch_closed');
  assert.match(failing.savedTables.dispatch.dispatch_archive_error, /boom/);
}
{
  // The automatic snapshot of the mission that ends survives the wipe in the previous mission file.
  const autoTable = () => ({ valid: 'yes', time: '12:52:51', automatic_event: 'state_changed', release_identity: '0.997 test', snapshot_flow: { stage: 'ground', nested: { a: 1 } }, ground_crew_runtime_trace: rows(5, 'seq'), crash_event_log: rows(2, 'c'), location_history: rows(3, 'l'), gndops_3_crew_trace: 'exit sent' });
  const h = harness();
  h.tables.automatic = autoTable();
  h.call('start location diagnostics', { init: 1 });
  const previous = h.savedTables.previous;
  assert.ok(previous, 'the previous mission file is saved');
  const expected = autoTable();
  for (const key of Object.keys(expected)) assert.deepEqual(previous[key], expected[key], key);
  assert.equal(previous.prev_copy_keys, 49);
  assert.equal(previous.prev_copy_missing, 0, 'every populated key was copied');
  assert.equal(previous.prev_copied_at, '12:00:00');
  assert.equal(h.savedTables.automatic.valid, 'no', 'the automatic table is still wiped');
  assert.equal(h.savedTables.automatic.snapshot_flow, null);
  // a second wipe (new dispatch preview, then the start) must not replace the good copy with the wiped table
  h.call('start location diagnostics');
  h.call('start location diagnostics', { init: 1 });
  assert.deepEqual(h.savedTables.previous.snapshot_flow, expected.snapshot_flow);
  assert.equal(h.savedTables.previous.valid, 'yes');
  // the next mission snapshot replaces it at its own start
  h.tables.automatic = { ...autoTable(), time: '13:40:00', automatic_event: 'end_shift' };
  h.call('start location diagnostics', { init: 1 });
  assert.equal(h.savedTables.previous.time, '13:40:00');
  assert.equal(h.savedTables.previous.automatic_event, 'end_shift');
  // a first start without any snapshot creates nothing
  const first = harness();
  first.call('start location diagnostics', { init: 1 });
  assert.equal(first.savedTables.previous, undefined);
  // a copy that fails is visible in the file: one missing-key check per key feeds prev_copy_missing
  const checks = collect(diagnostics['copy automatic snapshot to previous mission'], (c) => c.set?.local === 'prev_copy_missing' && c.value?.add);
  assert.equal(checks.length, 49, 'every key is verified after the copy');
}
console.log('Dispatch archive PASS: persistent multi-dispatch file, first-dispatch reset only, archive before wipe, bounded history and the previous mission snapshot copy. HPG/MSFS PENDING.');
