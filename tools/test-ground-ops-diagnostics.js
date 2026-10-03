#!/usr/bin/env node
'use strict';

// Ground ops diagnostics: dedicated checkpoint ring, state sampler, watcher with stall detection,
// snapshot persistence and the instrumentation of the crew deboarding chain. Diagnostics must never
// change control flow, so every try/catch added here may only log. HPG/MSFS behavior is NOT modeled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', `${name}.json`), 'utf8'));
const modules = {
  ground: read('08-ground-response'),
  hoist: read('09-hoist-ground-ops'),
  shared: read('14-shared-runtime'),
  diagnostics: read('19-location-diagnostics'),
};

// ---- structure -------------------------------------------------------------------------------
function collect(value, predicate, found = []) {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') {
    if (predicate(value)) found.push(value);
    Object.values(value).forEach((child) => collect(child, predicate, found));
  }
  return found;
}
const checkpointIds = (macro) => new Set(collect(macro, (c) => c.call_macro === 'ground ops checkpoint').map((c) => c.params.id));
const requireIds = (label, macro, ids) => {
  const found = checkpointIds(macro);
  for (const id of ids) assert.ok(found.has(id), `${label} is missing checkpoint ${id}`);
};

requireIds('ground ops', modules.hoist['ground ops'], [
  'go_entered', 'go_wait', 'go_wait_ok', 'go_or_wait', 'go_or_wait_ok', 'go_landing_gate_passed',
  'go_rotor_gate_passed', 'go_progress_monitor_call', 'go_progress_monitor_returned', 'go_user_action_create',
  'go_user_action_created', 'go_crew_ops_call', 'go_crew_ops_returned', 'go_EXCEPTION',
]);
for (const [macro, prefix] of [['4 or 5 crew ground ops', 'c45'], ['3 crew ground ops', 'c3']]) {
  requireIds(macro, modules.hoist[macro], [
    `${prefix}_first_target_returned`, `${prefix}_thread_started`,
    `${prefix}_trace`, `${prefix}_wait`, `${prefix}_wait_ok`, `${prefix}_nr_gate_call`, `${prefix}_nr_gate_returned`,
    `${prefix}_spawn_launch_call`, `${prefix}_spawn_wait_returned`, `${prefix}_police_cond`, `${prefix}_police_cond_true`,
    `${prefix}_police_cond_false`, `${prefix}_drive_start`, `${prefix}_drive_done`, `${prefix}_tour_call`,
    `${prefix}_thread_body_end`, `${prefix}_thread_EXCEPTION`,
  ]);
}
requireIds('ground ops NR gate', modules.shared['ground ops NR gate'], ['nr_gate_enter', 'nr_gate_wait', 'nr_gate_passed']);
requireIds('crew spawn launch', modules.shared['crew spawn launch'], ['spawn_launch']);
requireIds('crew spawn wait', modules.shared['crew spawn wait'], ['spawn_wait_enter', 'spawn_wait_done']);
requireIds('crew spawn failure', modules.shared['crew spawn failure'], ['spawn_failure']);
requireIds('police_preposition_to_landing_spot', modules.ground.police_preposition_to_landing_spot, [
  'lz_macro_entered', 'lz_thread_started', 'lz_police_cond', 'lz_police_cond_true', 'lz_police_cond_false', 'lz_thread_body_end', 'lz_thread_EXCEPTION',
]);

// Diagnostics only log: every try added for them has a catch made of one checkpoint call.
let diagnosticTries = 0;
for (const module of Object.values(modules)) {
  for (const [name, macro] of Object.entries(module)) {
    for (const command of collect(macro, (c) => Array.isArray(c.try) && Array.isArray(c.catch) && c.catch.length === 1 && c.catch[0].call_macro === 'ground ops checkpoint')) {
      assert.equal(command.catch[0].params.detail?.param, '$ERROR', `${name}: diagnostic catch must record $ERROR`);
      diagnosticTries += 1;
    }
  }
}
assert.equal(diagnosticTries, 4, 'expected exactly one diagnostic try per ground ops, 4/5 crew, 3 crew and police thread');

// The worker must keep the legacy NR gate / crew spawn / tour order inside the diagnostic try.
for (const [macro, prefix] of [['4 or 5 crew ground ops', 'c45'], ['3 crew ground ops', 'c3']]) {
  const text = JSON.stringify(modules.hoist[macro]);
  const order = ['ground ops NR gate', 'crew spawn launch', 'police_cond', 'multipatient registry crew tour safe'].map((token) => text.indexOf(token));
  assert.ok(order.every((index) => index > 0) && order.every((index, i) => i === 0 || index > order[i - 1]), `${macro}: instrumented order changed`);
  assert.ok(text.includes(`"${prefix}_thread_EXCEPTION"`));
}

// ---- strings are ASCII and carry no interpolation hazards ----------------------------------------
const newMacros = ['ground ops checkpoint', 'sample ground ops state', 'ground ops watch start'];
for (const name of newMacros) {
  assert.ok(Array.isArray(modules.diagnostics[name]), `${name} is missing`);
  assert.ok(/^[\x20-\x7e\n]*$/.test(JSON.stringify(modules.diagnostics[name], null, 1)), `${name} contains non-ASCII text`);
}
for (const command of collect(modules, (c) => c.call_macro === 'ground ops checkpoint')) {
  const detail = command.params.detail;
  if (typeof detail === 'string') assert.ok(!/[{}]/.test(detail), `checkpoint detail must not carry braces: ${detail}`);
  assert.ok(/^[\x20-\x7e]*$/.test(JSON.stringify(command)), `non-ASCII checkpoint ${JSON.stringify(command)}`);
}

// ---- snapshot ----------------------------------------------------------------------------------
const capture = JSON.stringify(modules.diagnostics['capture crew movement snapshot']);
for (const key of ['ground_ops_checkpoint_log', 'ground_ops_watch_log', 'ground_ops_state']) {
  assert.ok(capture.includes(`"key":"${key}"`), `snapshot does not persist ${key}`);
}
const sampler = modules.diagnostics['sample ground ops state'];
const sampled = collect(sampler, (c) => c.create_struct)[0].create_struct;
for (const field of [
  'nr', 'ecp_main_1', 'ecp_main_2', 'on_ground', 'hoisted', 'step', 'hold', 'show_hoist_command', 'show_skid_command', 'gndopsNR',
  'gate_state', 'gate_log', 'trace_45', 'trace_3', 'spawn_state', 'spawn_log', 'hoist_crew_created_var', 'pax3_created_var',
  'dist_aircraft_to_landing_spot_m', 'dist_landing_spot_to_accident_m', 'dist_landing_spot_to_injured_m', 'custom_lz',
  'police_bring_crew_min_dist', 'policeloadingenabled', 'police_lz_transfer_state', 'police_lz_force_pickup', 'last_checkpoint',
  'post_rotor_gate', 'ops_progress_stage', 'whobringpatient', 'hems_visit_object', 'marshall_restart_state',
  'marshall_guidance_state', 'marshall_rotor_signal_sent', 'marshall_landing_confirmed', 'deboard', 'dispatcher_auto',
]) assert.ok(field in sampled, `ground ops state is missing ${field}`);

// ---- behavior (production macros on the shared HPG subset interpreter) ------------------------------------
const source = fs.readFileSync(path.join(__dirname, 'test-live-patient-transport.js'), 'utf8');
const context = { require, __dirname, structuredClone, console, module: { exports: {} } };
vm.runInNewContext(source.slice(0, source.indexOf('for (const resource of')) + '\nmodule.exports = Live;', context);
const Live = context.module.exports;
class Harness extends Live {
  query(q, p) {
    if (q?.static === 'Debug_Auto_Table') return 'automatic';
    if (q?.fn === 'get_time_string') return '12:00:00';
    if (q?.location && q.var === 'distance:m') return 12.34;
    if (q?.object && typeof q.object === 'string' && q.var === 'distance:m') return 5.5;
    if (q?.object && q.var === 'CREATED') return this.objects.has(q.object) ? 1 : -1;
    // A bare location reference is only meaningful as the value of an LVAR write (see commands below).
    if (q?.location && q.var === undefined && Object.keys(q).length === 1) return this.locations[q.location];
    // Other distance reads of scene objects are boundary inputs here.
    if (q?.object) return this.objects.has(this.query(q.object, p)) ? 1 : -1;
    return super.query(q, p);
  }
  commands(list, p) {
    for (const command of list) {
      const target = command.set?.var?.[0];
      if (target && command.value?.location && command.value.var === undefined && Object.keys(command.value).length === 1) {
        // Writing an LVAR from a location publishes "<name> LAT" and "<name> LON" (the mechanism used by the PRE_* variables).
        const location = this.locations[command.value.location];
        assert.ok(location, `Unknown location ${command.value.location}`);
        this.locals[target] = 0; this.locals[`${target} LAT`] = location[0]; this.locals[`${target} LON`] = location[1];
      } else super.commands([command], p);
    }
  }
}
{
  const h = new Harness();
  Object.assign(h.locals, { 'L:MISSION_TIME': 500, 'L:HOISTED': 0, 'L:STEP': 0, 'L:HOLD': 1, CREW: 4, MISSION_PHASE: 7, 'L:{local:HXX}_SDK_ROTOR_RPM': 99.44 });
  h.call('ground ops checkpoint', { id: 'first' });
  assert.deepEqual(Object.keys(h.locals.ground_ops_checkpoint_log[0]).sort(), ['crew', 'detail', 'hoisted', 'hold', 'id', 'nr', 'on_ground', 'pc', 'phase', 'seq', 't', 'step'].sort());
  assert.equal(h.locals.ground_ops_checkpoint_log[0].detail, '', 'a missing detail is stored as an empty string');
  for (let i = 0; i < 650; i += 1) h.call('ground ops checkpoint', { id: `cp${i}`, detail: 'x' });
  assert.equal(h.locals.ground_ops_checkpoint_log.length, 600, 'checkpoint log is a ring of 600 rows');
  assert.equal(h.locals.ground_ops_checkpoint_log.at(-1).id, 'cp649');
  assert.equal(h.locals.ground_ops_checkpoint_log[0].seq, 52, 'oldest rows are dropped first');
  assert.equal(h.locals.ground_ops_last_checkpoint, 'cp649');
  assert.equal(h.locals.ground_ops_checkpoint_seq, 651);
}
{
  const h = new Harness();
  Object.assign(h.locals, { 'L:HOISTED': 0, 'L:MISSION_TIME': 700 });
  h.call('sample ground ops state');
  const state = h.locals.ground_ops_state_now;
  assert.equal(state.trace_45, '<unset>', 'an unset local must be visible, not a missing key');
  assert.equal(state.gate_state, '<unset>');
  assert.equal(state.dist_landing_spot_to_accident_m, -1, 'no distance without both ends');
  h.locations.landing_spot = [0, 0]; h.locations.accident_location = [0, 0];
  h.locals.GNDOPS_45_CREW_TRACE = 'NR gate passed';
  h.call('sample ground ops state');
  assert.equal(h.locals.ground_ops_state_now.trace_45, 'NR gate passed');
  assert.equal(h.locals.ground_ops_state_now.dist_landing_spot_to_accident_m, 12.3);
  h.call('capture diagnostic snapshot', { snapshot_table: 'manual' });
  const saved = h.savedTables.manual;
  assert.ok(Array.isArray(saved.ground_ops_checkpoint_log) && Array.isArray(saved.ground_ops_watch_log), 'snapshot logs are initialized arrays');
  assert.equal(saved.ground_ops_state.trace_45, 'NR gate passed');
}
{
  // Watcher: logs signature changes, records a STALL plus an automatic snapshot after the rotor gate, ends on HOISTED.
  const h = new Harness();
  Object.assign(h.locals, { 'L:MISSION_TIME': 500, 'L:HOISTED': 0, 'L:DISPATCH_ENDED': 0, 'L:HOLD': 0, 'L:STEP': 0, CREW: 4, MISSION_PHASE: 7, 'L:{local:HXX}_SDK_ROTOR_RPM': 90 });
  h.call('ground ops checkpoint', { id: 'go_rotor_gate_passed' });
  h.call('ground ops watch start');
  h.locals.ground_ops_post_rotor = 1;
  let tick = 0;
  h.sleepHook = (scene) => {
    tick += 1;
    if (tick === 2) scene.locals['L:MISSION_TIME'] = 520;
    if (tick === 3) scene.locals['L:MISSION_TIME'] = 600;
    if (tick === 4) scene.locals['L:{local:HXX}_SDK_ROTOR_RPM'] = 70;
    if (tick === 6) scene.locals['L:HOISTED'] = 1;
  };
  h.runThread(h.threads.at(-1));
  const rows = h.locals.ground_ops_watch_log;
  assert.ok(rows.length >= 3, `first sample, the NR change and the stall are logged: ${JSON.stringify(rows.map((row) => row.sig))} ticks=${tick}`);
  assert.equal(rows.filter((row) => row.sig.startsWith('STALL after checkpoint go_rotor_gate_passed')).length, 1, 'one STALL row per stalled checkpoint');
  assert.equal(h.savedTables.automatic.automatic_event, 'ground_ops_stall');
  assert.ok(rows.some((row) => row.state.nr === 70), 'the NR drop is captured in the state');
  assert.equal(tick, 6, 'watcher stops when the crew is hoisted');
  h.call('ground ops watch start');
  const generation = h.locals.ground_ops_watch_generation;
  h.locals['L:HOISTED'] = 0;
  h.sleepHook = (scene) => { scene.locals.ground_ops_watch_generation = generation + 1; };
  h.runThread(h.threads.at(-1));
}
console.log('Ground ops diagnostics PASS: checkpoint ring, state sampler, watcher with stall detection, snapshot persistence and instrumented crew chain. HPG/MSFS PENDING.');
