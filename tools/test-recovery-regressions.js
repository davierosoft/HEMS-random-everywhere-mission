#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'test-live-patient-transport.js'), 'utf8');
const context = {require, __dirname, structuredClone, console, module: {exports: {}}};
vm.runInNewContext(source.slice(0, source.indexOf("for (const resource of")) + '\nmodule.exports = Live;', context);
const Live = context.module.exports;
function find(value, predicate) {
  if (!value || typeof value !== 'object') return null;
  if (predicate(value)) return value;
  for (const child of Object.values(value)) { const result = find(child, predicate); if (result) return result; }
  return null;
}
function stabilization(slot, interrupt) {
  const h = new Live();
  Object.assign(h.locals, {medical_display_patient: slot, medical_display_report_finalized: 'no', 'SIM ON GROUND': 1, 'L:RESCUED': 1, 'L:SAVED': 0, 'L:CPR': 0});
  h.locals[`LIFESCORE${slot === 1 ? '' : slot}`] = 14;
  h.call('multipatient registry live sync');
  const record = h.call('multipatient registry get', {slot});
  Object.assign(record, {resource: 'hems', transport_state: 'loaded', active: 1});
  const originalCall = h.call.bind(h);
  h.call = (name, params = {}) => {
    if (name === 'sync medical patient display') {
      h.locals.medical_display_lifescore = h.locals[`LIFESCORE${h.locals.medical_display_patient === 1 ? '' : h.locals.medical_display_patient}`];
      return;
    }
    return originalCall(name, params);
  };
  h.sleepHook = interrupt;
  const before = [h.locals.LIFESCORE, h.locals.LIFESCORE2, h.locals.LIFESCORE3];
  const button = find(h.macros['patient health'], x => x.title === 'Stabilize patient for transport');
  h.macros.__stabilize_test = button.commands;
  h.call('__stabilize_test');
  return {h, before};
}
for (const slot of [1, 2, 3]) {
  const {h, before} = stabilization(slot);
  const expected = [...before]; expected[slot - 1] = 19;
  assert.deepEqual([h.locals.LIFESCORE, h.locals.LIFESCORE2, h.locals.LIFESCORE3], expected, `stabilization must affect only P${slot}`);
}
{
  const {h, before} = stabilization(2, scene => { scene.locals.medical_display_patient = 3; });
  assert.deepEqual([h.locals.LIFESCORE, h.locals.LIFESCORE2, h.locals.LIFESCORE3], before, 'changing the displayed patient cancels delayed stabilization');
}
function prepareCpr(slot, onboard = false, mcpr = false) {
  const h = new Live(); h.maxLoopTicks = 90;
  Object.assign(h.locals, {patient_live_generation: 1, cpr_patient_slot: slot, 'L:CPR': 0, cpr_active: 0, cpr_armed: 0, cpr_manual_stop: 0, 'SIM ON GROUND': 0});
  h.globals.MCPR_ONBOARD = mcpr ? 'yes' : 'no';
  for (const cue of [17, 19, 20]) h.locals[`L:PAX3{local:VCP}${cue}`] = 0;
  h.locals[`LIFESCORE${slot === 1 ? '' : slot}`] = 10;
  for (const [key, value] of Object.entries({BPM: 20, SPO2: 75, BP_SYS: 70, BP_DIA: 40, RR: 8})) h.locals[slot === 1 ? key : `P${slot}_${key}`] = value;
  h.locals.patient_crew_visits[slot - 1].owner = 'hems';
  h.call('multipatient registry live sync');
  const record = h.call('multipatient registry get', {slot}); record.cpr_eligible = 1;
  if (onboard) Object.assign(record, {resource: 'hems', transport_state: 'loaded'});
  assert.equal(h.call('multipatient registry CPR acquire', {slot, provider: 'hems', timeout_seconds: 180}), 1);
  h.call('CPR');
  return h;
}
for (const slot of [1, 2, 3]) {
  const h = prepareCpr(slot);
  const generation = h.locals.patient_cpr_generation;
  h.sleepHook = scene => {
    scene.call('multipatient registry live physiology step', {seconds: 5});
    // Keep this simulated arrest refractory so the real worker reaches STOP.
    scene.locals[`LIFESCORE${slot === 1 ? '' : slot}`] = 10;
    scene.locals[slot === 1 ? 'BPM' : `P${slot}_BPM`] = 20;
    assert.equal(scene.locals.patient_cpr_generation, generation, 'An active worker must keep its lease beyond 180 seconds');
    if (scene.locals.cpr_elapsed >= 305) scene.locals['L:CPR'] = 5;
  };
  h.runThread(h.threads[0]);
  assert.ok(h.locals.cpr_elapsed >= 300, 'STOP after five minutes must be reachable');
  assert.equal(h.threads.length, 1, 'Heartbeat must not create replacement workers');
  assert.equal(h.locals.active_cpr_slot, 0);
  assert.equal(h.call('multipatient registry CPR renew', {slot, generation}), 0, 'Released workers cannot renew their lease');
}
for (const slot of [1, 2, 3]) {
  const h = prepareCpr(slot, true, false);
  let ticks = 0;
  h.sleepHook = scene => {
    ticks++;
    if (ticks <= 4) {
      assert.equal(scene.locals.cpr_elapsed, 0, 'Manual compressions cannot run in flight');
      assert.equal(scene.locals.cpr_active, 0);
      assert.equal(scene.locals.cpr_mode, 'awaiting_landing');
    }
    scene.call('multipatient registry live physiology step', {seconds: 5});
    if (ticks === 4) {
      assert.ok(scene.locals[`LIFESCORE${slot === 1 ? '' : slot}`] < 10, 'Waiting for landing must not freeze deterioration');
      scene.locals['SIM ON GROUND'] = 1;
    }
    if (ticks === 5) {
      assert.equal(scene.locals.cpr_elapsed, 5);
      assert.equal(scene.locals.cpr_mode, 'ground_manual');
      scene.locals['L:CPR'] = 5;
    }
  };
  h.runThread(h.threads[0]);
  assert.equal(ticks, 5);
}
{
  const h = prepareCpr(2, true, true);
  h.sleepHook = scene => {
    assert.equal(scene.locals.cpr_elapsed, 5, 'mCPR remains available in flight');
    scene.locals['L:CPR'] = 5;
  };
  h.runThread(h.threads[0]);
}
// Exercise the production pump-off branch at the exact latch boundary for both controllers.
for (const role of ['marshall', 'pisteur3']) for (const rpm of [19, 20, 40, 79, 80]) {
  const h = new Live(); h.objects.add(role);
  const state = `${role}_restart_state`;
  const branch = find(h.macros['marshaller animation monitor'], x => x.if?.var?.[0].endsWith('_SDK_OH_FUEL_ENG1_PRIME') && x.eq === 0 && find(x, y => y.set?.local === state));
  assert.ok(branch, `Missing ${role} pump-off branch`);
  h.macros.__pump = [branch];
  Object.assign(h.locals, {[state]: 2, [`${role}_guidance_state`]: 1,
    'L:{local:HXX}_SDK_ROTOR_RPM': rpm, 'L:{local:HXX}_SDK_OH_FUEL_ENG1_PRIME': 0, 'L:{local:HXX}_SDK_OH_FUEL_ENG2_PRIME': 0});
  h.call('__pump');
  assert.equal(h.locals[state], rpm < 20 ? 0 : 2, `${role} must retain startup from NR 20%`);
}
// Use real fallback commands and record the requested HPG locations.
for (const skipped of ['yes', 'no', null]) {
  const h = new Live(), created = [];
  h.locations.rescue_location = [45, 8]; h.locals.query_skipped = skipped;
  const run = h.commands.bind(h);
  h.commands = (commands, p) => {
    for (const c of commands) {
      if (c.wait_for?.local === 'CONTINUE_LOADING') continue;
      if (c.create_location) created.push(c);
      run([c], p);
    }
  };
  h.call('random residential road nodes launcher');
  assert.equal(h.threads.length, skipped === 'yes' ? 1 : 2, 'Only explicit skip suppresses the query worker');
  h.runThread(h.threads[0]);
  assert.equal(created.length, 6);
  for (const c of created) {
    const offset = c.zones[0].zone.location;
    assert.equal(offset.object, 'rescue_location');
    assert.ok([0, 90, 270].includes(offset.bearing2));
    assert.equal(offset.bearing, undefined);
  }
  assert.equal(h.locals.CONTINUE_LOADING, 'yes');
  assert.equal(h.locals.roadnode_query_status, 'fallback');
}
for (const cancel of [false, true]) {
  const h = new Live(); h.maxLoopTicks = 300;
  Object.assign(h.locals, {roadnode_query_generation: 7, roadqueryattempt: 0, NATION: 'test'});
  const query = h.query.bind(h), run = h.commands.bind(h);
  h.query = (q, p) => q?.static === 'marker posts' ? {test: {title: 'marker'}} : query(q, p);
  h.commands = (commands, p) => {
    for (const c of commands) {
      if (c.osm_query_data) assert.equal(p.my_data, null, 'A new query must clear stale response data');
      else run([c], p);
    }
  };
  if (cancel) h.sleepHook = scene => { scene.locals.roadnode_query_generation++; };
  assert.equal(h.call('road nodes generator', {road_generation: 7, my_data: {stale: true}}), 0);
  assert.equal(h.events.filter(event => event[0] === 'sleep').length, cancel ? 1 : 240);
  if (!cancel) assert.equal(h.locals.roadnode_query_status, 'query_timeout');
}
for (const initial of [1, -1]) {
  const h = new Live(); h.objects.add('pax1'); let created = initial;
  const query = h.query.bind(h), run = h.commands.bind(h);
  h.query = (q, p) => q?.object && q.var === 'CREATED' ? created : query(q, p);
  h.commands = (commands, p) => {
    for (const c of commands) {
      if (c.wait_for?.and) {
        assert.equal(h.locals.CREW_SPAWN_DEBUG_STATE, 'create_object_failed'); created = 1;
      } else run([c], p);
    }
  };
  h.call('crew spawn wait', {crew_name: 'pax1', crew_title: 'crew', crew_fallback: 'fallback'});
  assert.equal(h.locals.CREW_SPAWN_DEBUG_NAME, 'pax1');
  assert.equal(h.locals.CREW_SPAWN_DEBUG_STATE, initial === 1 ? 'created' : 'recovered_created');
  assert.equal(h.locals.CREW_SPAWN_DEBUG_HAS_OBJECT, 1);
  assert.equal(h.locals.CREW_SPAWN_DEBUG_CREATED_VAR, 1);
}
class Diagnostics extends Live {
  query(q, p) {
    if (q?.static === 'Debug_Auto_Table') return 'automatic';
    if (q?.fn === 'get_time_string') return '12:00:00';
    if (q?.location && ['lat', 'lon'].includes(q.var)) return this.locations[q.location][q.var === 'lat' ? 0 : 1];
    // HPG distance queries against absent scene objects are boundary inputs here.
    if (q?.location && q.var === 'distance:m') return 0;
    if (q?.object) return this.objects.has(this.query(q.object, p)) ? 1 : -1;
    return super.query(q, p);
  }
}
{
  const h = new Diagnostics(); h.locations.rescue_location = [45.5, 8.25];
  h.call('capture diagnostic snapshot', {snapshot_table: 'manual'});
  const manual = JSON.stringify(h.savedTables.manual);
  h.savedTables.automatic = {valid: 'yes', snapshot_medical: 'stale', location_history: ['stale']};
  h.call('start location diagnostics');
  assert.equal(h.savedTables.automatic.valid, 'no');
  assert.equal(h.savedTables.automatic.snapshot_medical, null);
  assert.equal(h.savedTables.automatic.location_history.length, 0);
  let tick = 0, saves = 0;
  const originalCommands = h.commands.bind(h);
  h.commands = (commands, p) => {
    for (const command of commands) { if (command.save_table) saves++; originalCommands([command], p); }
  };
  h.sleepHook = scene => {
    if (++tick === 1) {
      assert.equal(scene.savedTables.automatic.valid, 'yes');
      assert.equal(scene.locals['L:DIAG_rescue_location_LAT'], 45.5);
      assert.equal(scene.locals['L:DIAG_rescue_location_LON'], 8.25);
    }
    if (tick === 3) scene.locals.location_diagnostic_monitor_active = 'no';
  };
  h.runThread(h.threads.at(-1));
  assert.equal(h.locals.location_diagnostic_history.length, 1, 'Unchanged samples must not append history');
  assert.equal(saves, 3, 'Unchanged samples must not rewrite automatic snapshots');
  assert.equal(JSON.stringify(h.savedTables.manual), manual, 'Automatic capture must preserve the manual snapshot');
  h.call('start location diagnostics');
  const currentGeneration = h.locals.location_diagnostic_generation;
  h.runThread(h.threads[0]);
  assert.equal(h.locals.location_diagnostic_history.length, 0, 'Old-generation monitor must stop');
  h.locals.location_diagnostic_history = Array.from({length: 200}, (_, index) => ({index}));
  h.sleepHook = scene => { scene.locals.location_diagnostic_monitor_active = 'no'; };
  h.runThread(h.threads.at(-1));
  assert.equal(h.locals.location_diagnostic_history.length, 200);
  assert.equal(h.locals.location_diagnostic_history[0].index, 1, 'History drops the oldest entry');
  assert.equal(h.locals.location_diagnostic_generation, currentGeneration);
  assert.equal(JSON.stringify(h.savedTables.manual), manual);
  const capture = find(h.macros['debug page'], x => x.title === 'CAPTURE SNAPSHOT');
  assert.equal(capture.commands[0].call_macro, 'capture diagnostic snapshot');
}
// Every tracked location mutation records its owner immediately after the command.
{
  const h = new Live(); let count = 0;
  function walk(value, owner) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) value.forEach((command, i) => {
      const target = command?.create_location || command?.move_location || command?.destroy_location || (command?.copy_location && command.to);
      if (['accident_location', 'rescue_location', 'userA', 'landing_spot'].includes(target)) {
        assert.equal(value[i + 1]?.set?.local, 'location_diagnostic_source_macro', owner);
        assert.equal(value[i + 1].value, owner);
        assert.equal(value[i + 2]?.set?.local, `location_diagnostic_writer_${target}`, owner); count++;
      }
      walk(command, owner);
    }); else Object.values(value).forEach(child => walk(child, owner));
  }
  for (const [name, commands] of Object.entries(h.macros)) walk(commands, name);
  assert.ok(count > 70, 'Location ownership coverage unexpectedly shrank');
}
console.log('Recovery regressions PASS: selected-patient stabilization, sustained CPR and landing, both marshaller latches, shared snapshots, reset, bounded history and location ownership.');
