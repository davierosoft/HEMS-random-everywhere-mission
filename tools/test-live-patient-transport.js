#!/usr/bin/env node
'use strict';

// Execute live production adapters and transactions. HPG movement/aircraft events
// are simulated boundary inputs; this is not simulator sign-off.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'test-crew-patient-visits.js'), 'utf8');
const context = {require, __dirname, structuredClone, console, module: {exports: {}}};
vm.runInNewContext(source.slice(0, source.indexOf('for (const order')) + '\nmodule.exports = Scene;', context);
const Scene = context.module.exports;
const prefix = 'multipatient registry ';
class Live extends Scene {
  constructor() {
    super(); this.macros = {...this.macros}; this.threads = []; this.call(prefix + 'initialize'); this.locals.patient_live_mode = 1;
    for (const slot of [1, 2, 3]) Object.assign(this.locals, slot === 1 ? {SPO2: 96, BPM: 80, GCS_TOTAL: 14} : {[`P${slot}_SPO2`]: 96, [`P${slot}_BPM`]: 80, [`P${slot}_GCS_TOTAL`]: 14});
    for (const name of ['ambulance1', 'ambulance2', 'ambustretcher7', 'ambustretcher2', 'ambumedic7', 'ambumedic2', 'hoist_crew', 'pax3']) {this.objects.add(name); this.locations[name] = [0, 0];}
    Object.assign(this.locals, {VAR_MISSION_NUMBER: 9, 'L:TEMPACCIDENT_LOCATION LAT': 45, 'L:TEMPACCIDENT_LOCATION LON': 8});
    this.locations.accident_location = [0, 0]; this.locations.$USER = [0, 0];
  }
  query(q, p) {
    if (q?.if) return this.query(this.compare(this.query(q.if, p), q, p) ? q.then : q.else, p);
    if (q?.table) return this.tables[this.query(q.table, p)]?.[this.query(q.key, p)] ?? null;
    return super.query(q, p);
  }
  commands(list, p) {
    for (const command of list) {
      if (command.create_thread) {
        this.threads.push({commands: command.create_thread.commands, params: {...p}});
      } else if (command.set_dispatch_dialog !== undefined) {
        this.events.push(['dialog']);
      } else if (command.set?.var) {
        this.locals[command.set.var[0]] = this.query(command.value, p);
      } else if (command.move_object) {
        const name = this.text(command.move_object, p);
        const destination = Array.isArray(command.to) ? command.to.at(-1) : command.to;
        const target = typeof destination === 'string' ? this.text(destination, p) : this.text(destination.object, p);
        assert.ok(this.objects.has(name)); assert.ok(this.locations[target]);
        this.locations[name] = [...this.locations[target]];
      } else if (command.wait_for?.param === 'request') {
        this.call(prefix + 'pump');
        assert.equal(p.request.status, 'done', 'Service must acknowledge the queued request');
      } else if (command.create_object) {
        const name = this.text(command.create_object.name, p);
        this.objects.add(name); this.locations[name] = [0, 0];
      } else if (command.destroy_object) {
        const name = this.text(command.destroy_object, p);
        this.events.push(['destroy', name]); this.objects.delete(name);
      } else if (command.create_location) {
        this.locations[command.create_location] = [100, 100];
      } else if (command.create_route) {
        this.events.push(['route', command.create_route.name]); p['$CREATE_ROUTE:DURATION'] = 900;
      } else if (command.wait_for?.has_location) {
        assert.ok(this.locations[command.wait_for.has_location]);
      } else if (command.wait_for?.local) {
        while (!this.compare(this.query(command.wait_for, {}), command, {})) {
          const worker = this.threads.shift();
          assert.ok(worker, 'Synchronous worker wait has no queued worker');
          this.commands(worker.commands, worker.params);
        }
        while (this.threads.length) {
          const worker = this.threads.shift();
          this.commands(worker.commands, worker.params);
        }
      } else super.commands([command], p);
    }
  }
  call(name, p = {}) {
    if (name === 'test tracker begin' || name === 'test tracker complete') return;
    if (/^prepare patient[123] manual treatment phase$/.test(name)) {this.locals[`manual_p${name.match(/patient([123])/)[1]}_state`] = 'choose'; return;}
    if (/^set manual patient[123] procedure duration$/.test(name)) {this.locals[`manual_p${name.match(/patient([123])/)[1]}_action_duration`] = 1; return;}
    if (/^record manual patient[123] action result$/.test(name)) return;
    if (/^(update|initialize) patient[123] physiology$/.test(name)) return;
    if (/^from_any_injured[23]?_to_ready_for_transport$/.test(name)) {this.events.push(['pack', name]); return;}
    if (/^capture patient[123] ground handover$/.test(name)) this.events.push(['report', name]);
    if (name === 'Query closest hospital unrelated for stretcher') {this.locations.unhospital = [100, 100]; return;}
    if (/^drive ambulance[12] safe multiplier$/.test(name)) {
      assert.equal(p.timeout, 900 / p.speedMultiplier + 120);
      assert.ok(this.locations[p.fallback], 'Route recovery must use a verified location');
      this.events.push(['hospital', name]); return;
    }
    if (/^park_ambulance[12]$/.test(name)) return;
    return super.call(name, p);
  }
  reserve(resource) {return this.call(prefix + 'submit', {operation: 'live_reserve', arguments: {resource}});}
  runThread(thread) {this.macros.__test_worker = thread.commands; return this.call('__test_worker', thread.params);}
}

for (const resource of ['ambulance1', 'ambulance2']) {
  const h = new Live();
  h.sleepHook = () => assert.equal(h.reserve(resource), null, 'Neither assessment nor a timer can complete the tour');
  assert.equal(h.tour(resource), 1); h.sleepHook = null;
  const ticket = h.reserve(resource);
  assert.equal(ticket.slot, 3);
  assert.equal(h.reserve(resource), null, 'One resource cannot reserve a second patient');
}
for (const slot of [1, 2, 3]) for (const resource of ['ambulance1', 'ambulance2', 'hems']) {
  const h = new Live();
  for (const other of [1, 2, 3].filter(x => x !== slot)) h.objects.delete(`injured_human${other === 1 ? '' : other}`);
  assert.equal(h.tour(resource), 1);
  const ticket = h.reserve(resource);
  assert.equal(ticket.slot, slot); assert.equal(ticket.resource, resource);
  const packed = slot === 1 ? 'from_any_injured_to_ready_for_transport' : `from_any_injured${slot}_to_ready_for_transport`;
  if (resource === 'hems') {
    Object.assign(h.locals, {HEMS_TRANSPORT_TICKET: ticket, HEMS_PATIENT_NUMBER: slot});
    assert.equal(h.call('prepare selected HEMS patient'), 1);
    assert.equal(h.call(prefix + 'live hems loaded'), 1);
  } else {
    const medic = resource === 'ambulance1' ? 'ambumedic7' : 'ambumedic2';
    assert.equal(h.call(prefix + 'live ground load', {ticket, vehicle: resource, medic, stretcher: resource === 'ambulance1' ? 'ambustretcher7' : 'ambustretcher2'}), 1);
    assert.equal(h.locals[slot === 1 ? 'ambulance_final_provider' : `P${slot}_AMBULANCE_FINAL_PROVIDER`], resource);
  }
  assert.deepEqual(Array.from(h.events.filter(e => e[0] === 'pack'), e => e[1]), [packed],
    'the casualty must be packed (compatible model, VAR 1 1) when the loading starts, as in the original HEMS flow');
  const record = h.call(prefix + 'get', {slot});
  assert.equal(record.report.lifescore, h.locals[`LIFESCORE${slot === 1 ? '' : slot}`]);
  assert.equal(h.call(prefix + 'live prepare patient', {ticket: {...ticket, generation: ticket.generation - 1}}), 0);
}
// The load after the patient left its place is committed (the patient lives only on the stretcher): a long vehicle that stops the stretcher far from its
// centre, or a walk that raises an error, must still end with the stretcher and the medic loaded and the ticket loaded or already transported (tester report 2026-10-11,
// German ambulance: the old distance gate aborted the load and the ambulance left without the patient).
for (const resource of ['ambulance1', 'ambulance2']) for (const mode of ['far', 'error']) {
  const h = new Live();
  for (const other of [2, 3]) h.objects.delete(`injured_human${other}`);
  assert.equal(h.tour(resource), 1);
  const ticket = h.reserve(resource);
  const stretcher = resource === 'ambulance1' ? 'ambustretcher7' : 'ambustretcher2';
  const medic = resource === 'ambulance1' ? 'ambumedic7' : 'ambumedic2';
  if (mode === 'far') h.moveHook = (scene, actor) => { if (actor === stretcher) scene.locations[actor] = [9, 0]; };
  else {
    const original = h.call.bind(h);
    h.call = (name, p = {}) => { const result = original(name, p); if (name === prefix + 'live load patient') h.failedMovement = true; return result; };
  }
  assert.equal(h.call(prefix + 'live ground load', {ticket, vehicle: resource, medic, stretcher}), 1, `${resource} ${mode}: the committed load completes`);
  assert.ok(h.events.some((e) => e[0] === 'destroy' && e[1] === stretcher), `${resource} ${mode}: the stretcher is loaded`);
  assert.ok(h.events.some((e) => e[0] === 'destroy' && e[1] === medic), `${resource} ${mode}: the medic is loaded`);
  assert.ok(['loaded', 'transported'].includes(h.call(prefix + 'get', {slot: ticket.slot}).transport_state), `${resource} ${mode}: the ticket is loaded (and on its way)`);
}
{
  const h = new Live(); h.locals.AMBU_AVAIL = 0; h.locals.SPO2 = 70;
  h.objects.delete('injured_human2'); h.objects.delete('injured_human3'); h.tour('ambulance1');
  assert.equal(h.reserve('ambulance1'), null, 'Insufficient capacity must never override clinical suitability');
  h.tour('hems'); assert.equal(h.reserve('hems').slot, 1);
}
{
  const h = new Live(); h.locals.SPO2 = 80; h.locals.P3_SPO2 = 70;
  h.locals.LIFESCORE = 80; h.locals.LIFESCORE2 = 10; h.locals.LIFESCORE3 = 20;
  h.tour('hems'); h.call('select HEMS patient');
  assert.equal(h.locals.HEMS_PATIENT_NUMBER, 3, 'Urgency first, then clinical severity; never slot order');
  const ticket = h.locals.HEMS_TRANSPORT_TICKET;
  h.locals.crewvisitended = 'no'; h.locals.whobringpatient = 'ambulance'; h.call('select HEMS patient');
  assert.equal(h.locals.HEMS_TRANSPORT_TICKET, ticket, 'An established assignment survives repeated selector calls');
  assert.equal(h.locals.HEMS_PATIENT_NUMBER, 3);
  assert.equal(h.locals.whobringpatient, 'us', 'Legacy hoist routing must follow the reserved HEMS ticket');
}
{
  const h = new Live();
  assert.equal(h.call('select HEMS patient'), 0, 'HEMS selection must wait for the physical HEMS tour');
  assert.equal(h.locals.HEMS_TRANSPORT_TICKET ?? null, null, 'HEMS selection must not create a ticket before the tour');
}
{
  // Negative control: accepting every patient must be detected by the capacity test.
  const broken = new Live(); broken.locals.SPO2 = 70;
  broken.objects.delete('injured_human2'); broken.objects.delete('injured_human3');
  broken.macros[prefix + 'live ground suitability'] = [{return: 1}];
  broken.tour('ambulance1');
  assert.throws(() => assert.equal(broken.reserve('ambulance1'), null, 'Unsafe capacity override'), /Unsafe capacity override/);
}
{
  const h = new Live(); h.locals.manual_active_patient = 2; h.locals.manual_p2_state = 'in_progress';
  h.call('complete manual patient visit', {transport: 'helicopter'});
  assert.notEqual(h.locals.manual_p2_visit_completed, 'yes', 'Async treatment must finish before manual confirmation');
  h.locals.P2_MEDICAL_ACTIONS_COMPLETED = 1; h.locals.manual_p2_state = 'review';
  h.call('complete manual patient visit', {transport: 'helicopter'});
  assert.equal(h.locals.manual_p2_visit_completed, 'yes');
}
{
  const h = new Live(); h.call(prefix + 'live sync');
  Object.assign(h.locals, {P1_DECR_RATE: 1, P2_DECR_RATE: 2, P3_DECR_RATE: 3, 'L:RESCUED': 1, MISSION_PHASE: 8});
  h.call(prefix + 'live physiology step', {seconds: 60});
  assert.equal(h.locals.LIFESCORE, 74); assert.equal(h.locals.LIFESCORE2, 63); assert.equal(h.locals.LIFESCORE3, 52);
  assert.deepEqual([h.locals['L:HEALTH'], h.locals['L:HEALTH2'], h.locals['L:HEALTH3']], [3, 2, 2]);
  h.locals.LIFESCORE2 = 0;
  h.call(prefix + 'live physiology step', {seconds: 5}); h.call(prefix + 'live physiology step', {seconds: 5});
  assert.equal(h.messages.filter(x => x === 'Patient 2 died.').length, 1);
  assert.equal(h.locals.patient_pending_transport, 2, 'A primary rescue flag must not stop the other patients');
}
{
  // Before the crew reaches the patient (phase below 8) the decay is halved and nobody falls below the floor; at the patient the full rate applies; after the grace time nothing protects
  const h = new Live(); h.call(prefix + 'live sync');
  Object.assign(h.locals, {P1_DECR_RATE: 2, P2_DECR_RATE: 2, P3_DECR_RATE: 2, MISSION_PHASE: 7, LIFESCORE: 30, LIFESCORE2: 8.5, LIFESCORE3: 30});
  h.call(prefix + 'live physiology step', {seconds: 60});
  assert.equal(h.locals.LIFESCORE, 29, 'half rate before the crew arrives');
  assert.equal(h.locals.LIFESCORE2, 8, 'the floor holds before the crew arrives');
  h.locals.MISSION_PHASE = 8;
  h.call(prefix + 'live physiology step', {seconds: 60});
  assert.equal(h.locals.LIFESCORE, 27, 'full rate once the crew is at the patient');
  h.locals.MISSION_PHASE = 7; h.locals.patient_registry_clock = 1800; h.locals.LIFESCORE3 = 4;
  h.call(prefix + 'live physiology step', {seconds: 5});
  assert.ok(h.locals.LIFESCORE3 < 4, 'after the grace time nothing protects the patient');
}
{
  // LIFE_FREEZE_NEAR: no decay while the helicopter is farther than 2 NM (3704 m) from the scene and the crew is not at the patient; the first time it is within 2 NM the latch opens and the protected decay runs
  const h = new Live(); h.call(prefix + 'live sync');
  Object.assign(h.locals, {P1_DECR_RATE: 2, P2_DECR_RATE: 2, P3_DECR_RATE: 2, MISSION_PHASE: 6, LIFESCORE: 40, LIFESCORE2: 40, LIFESCORE3: 40});
  h.globals.LIFE_FREEZE_NEAR = 'yes'; h.locations.$USER = [0, 9000];
  h.call(prefix + 'live physiology step', {seconds: 60});
  assert.equal(h.locals.LIFESCORE, 40, 'frozen while far from the scene'); assert.equal(h.locals.LIFESCORE3, 40);
  h.locations.$USER = [0, 3000];
  h.call(prefix + 'live physiology step', {seconds: 60});
  assert.equal(h.locals.LIFESCORE, 39, 'within 2 NM the decay runs at the protected half rate');
  assert.equal(h.locals.LIFE_NEAR_LATCH, 1);
  h.locations.$USER = [0, 9000];
  h.call(prefix + 'live physiology step', {seconds: 60});
  assert.equal(h.locals.LIFESCORE, 38, 'once close, flying away does not freeze it again');
  const off = new Live(); off.call(prefix + 'live sync');
  Object.assign(off.locals, {P1_DECR_RATE: 2, MISSION_PHASE: 6, LIFESCORE: 40}); off.globals.LIFE_FREEZE_NEAR = 'no'; off.locations.$USER = [0, 9000];
  off.call(prefix + 'live physiology step', {seconds: 60});
  assert.equal(off.locals.LIFESCORE, 39, 'the option off keeps the protected half rate');
}
for (const slot of [1, 2, 3]) {
  const h = new Live(); h.locals[`LIFESCORE${slot === 1 ? '' : slot}`] = 41 + slot;
  h.locals[`P${slot}_PATIENT_GIVEN_NAME`] = 'Preserved'; h.tour('ambulance1');
  const ticket = h.reserve('ambulance1');
  h.call(prefix + 'live save', {slot}); h.call(prefix + 'live preload', {slot});
  h.commands(h.macros.reloadtemp.slice(0, 3), {});
  const restored = new Live(); restored.savedTables = structuredClone(h.savedTables);
  restored.locals['L:RELOADSAVED'] = 1;
  Object.assign(restored.globals, {TEMPVAR_MISSION_NUMBER: 9, 'TEMPACCIDENT_LOCATION LAT': 45, 'TEMPACCIDENT_LOCATION LON': 8});
  restored.call(prefix + 'live restore open'); restored.call(prefix + 'live sync');
  assert.equal(restored.locals[`LIFESCORE${slot === 1 ? '' : slot}`], 41 + slot);
  assert.equal(restored.locals[`P${slot}_PATIENT_GIVEN_NAME`], 'Preserved');
  assert.equal(restored.call(prefix + 'live ticket valid', {ticket}), 0, 'Reload must invalidate interrupted reservations');
  assert.equal(restored.locals.patient_crew_tours.hems, 'pending');
  restored.tour('ambulance1');
  assert.equal(restored.locals[`P${slot}_AMBULANCE_COMPLETED_ACTIONS`], 2);
  assert.equal(restored.events.filter(event => event[0] === 'effect').length, 0, 'Restored completed ground actions must not execute again');
  const wrongScene = new Live(); wrongScene.savedTables = structuredClone(h.savedTables);
  wrongScene.locals['L:RELOADSAVED'] = 1;
  Object.assign(wrongScene.globals, {TEMPVAR_MISSION_NUMBER: 9, 'TEMPACCIDENT_LOCATION LAT': 46, 'TEMPACCIDENT_LOCATION LON': 8});
  wrongScene.call(prefix + 'live restore open'); assert.equal(wrongScene.locals.patient_live_saved, null);
}
for (const slot of [1, 2, 3]) {
  const h = new Live(); h.call(prefix + 'live sync'); h.locals.cpr_patient_slot = slot;
  const scores = [h.locals.LIFESCORE, h.locals.LIFESCORE2, h.locals.LIFESCORE3];
  h.call(prefix + 'live CPR read'); h.locals.cpr_patient_LIFESCORE += 2; h.call(prefix + 'live CPR write');
  scores[slot - 1] += 2;
  assert.deepEqual([h.locals.LIFESCORE, h.locals.LIFESCORE2, h.locals.LIFESCORE3], scores, 'CPR cannot overwrite another patient');
}
{
  const h = new Live(); h.tour('ambulance1'); const ticket = h.reserve('ambulance1');
  h.call(prefix + 'live prepare patient', {ticket});
  h.locations.injured_human3 = [100, 100];
  assert.equal(h.call(prefix + 'live recover', {ticket}), 0, 'No release before physical recovery');
  assert.equal(h.call(prefix + 'live recover worker', {ticket}), 1);
  assert.equal(h.call(prefix + 'live ticket valid', {ticket}), 0);
  assert.equal(h.locals.P3_GROUND_PROVIDER, null);
}
for (const slot of [1, 2, 3]) {
  const h = new Live(); Object.assign(h.locals, {[`P${slot}_AMBULANCE_COMPLETED_ACTIONS`]: 2, [`crewvisiting${slot}`]: 'yes', manual_active_patient: slot});
  h.call(`start patient${slot} manual treatment`);
  for (const step of [3, 4]) {
    assert.equal(h.locals[slot === 1 ? 'medical_actions_current_step' : `P${slot}_MEDICAL_ACTIONS_CURRENT_STEP`], step);
    h.call(`manual patient${slot} treatment choice`, {correct: true, label: 'Test'});
    assert.notEqual(h.locals[`manual_p${slot}_state`], 'review');
    h.runThread(h.threads.at(-1));
    assert.equal(h.locals[`P${slot}_AMBULANCE_COMPLETED_ACTIONS`], step);
  }
  assert.equal(h.locals[`P${slot}_MEDICAL_ACTIONS_COMPLETED`], 1);
  h.call('complete manual patient visit', {transport: 'helicopter'});
  assert.equal(h.locals[`manual_p${slot}_visit_completed`], 'yes');
  assert.deepEqual(Array.from(h.events.filter(x => x[0] === 'effect'), x => x[2]), [3, 4], 'Manual handover must not repeat completed actions');
}
for (const slot of [1, 2, 3]) {
  const h = new Live();
  Object.assign(h.locals, {patient_live_generation: 1, cpr_patient_slot: slot, 'L:CPR': 0, cpr_active: 0, cpr_armed: 0, cpr_manual_stop: 0,
    [`LIFESCORE${slot === 1 ? '' : slot}`]: 10});
  for (const [key, value] of Object.entries({BPM: 20, SPO2: 75, BP_SYS: 70, BP_DIA: 40, RR: 8})) h.locals[slot === 1 ? key : `P${slot}_${key}`] = value;
  h.locals.patient_crew_visits[slot - 1].owner = 'hems';
  h.call(prefix + 'live sync'); const record = h.call(prefix + 'get', {slot}); record.cpr_eligible = 1;
  assert.equal(h.call(prefix + 'CPR acquire', {slot, provider: 'hems', timeout_seconds: 180}), 1);
  const before = [h.locals.LIFESCORE, h.locals.LIFESCORE2, h.locals.LIFESCORE3];
  h.call('CPR'); assert.equal(h.threads.length, 1, 'Each physical patient can start the real CPR worker');
  h.sleepHook = (scene) => {scene.locals['L:CPR'] = 5;};
  h.runThread(h.threads[0]);
  assert.equal(h.locals.active_cpr_slot, 0);
  assert.equal(h.locals['L:CPR'], 0, 'Stopping one patient must leave the controller available for another');
  assert.equal(record.cpr_state, 'stopped');
  for (const other of [1, 2, 3].filter(x => x !== slot)) assert.equal(h.locals[`LIFESCORE${other === 1 ? '' : other}`], before[other - 1]);
  h.sleepHook = null;
  const threadsBeforeStep = h.threads.length;
  h.call(prefix + 'live physiology step', {seconds: 5});
  assert.equal(h.threads.length, threadsBeforeStep, 'A stopped procedure must not automatically restart on the same patient');
}
{
  const h = new Live(); Object.assign(h.locals, {patient_live_generation: 1, LIFESCORE: 10, BPM: 20, SPO2: 75, BP_SYS: 70, BP_DIA: 40, RR: 8, 'L:CPR': 0, cpr_armed: 0, cpr_manual_stop: 0});
  h.locals.patient_crew_visits[0].owner = 'hems';
  h.call(prefix + 'live physiology step', {seconds: 0}); const expired = h.threads[0];
  h.call(prefix + 'live physiology step', {seconds: 181});
  assert.equal(h.threads.length, 2, 'The live service must expire and recover a stalled CPR lease');
  const score = h.locals.LIFESCORE, deadline = h.locals.patient_cpr_deadline;
  h.runThread(expired);
  assert.equal(h.locals.LIFESCORE, score); assert.equal(h.locals.patient_cpr_deadline, deadline);
  assert.equal(h.locals['L:CPR'], 1, 'An old worker cannot clear a newer CPR procedure');
}
{
  const h = new Live(); delete h.locals.patients;
  Object.assign(h.locals, {patient_live_mode: 0, LIFESCORE: 10, BPM: 20, SPO2: 75, BP_SYS: 70, BP_DIA: 40, RR: 8, 'L:CPR': 0, 'L:RESCUED': 0, crewvisiting1: 'yes', cpr_armed: 0, cpr_manual_stop: 0});
  h.call('CPR'); h.sleepHook = scene => {scene.locals['L:CPR'] = 5;}; h.runThread(h.threads[0]);
  assert.equal(h.locals['L:CPR'], 5); assert.equal(h.locals.cpr_manual_stop, 1, 'Non-registry missions retain legacy CPR controls');
}
// Ambulance out of reach (tester report 2026-10-11: off-road patient, ambulance stopped on a distant road, patient shown as "transported by ambulance" and left on
// the mountain). The stretcher walks from the vehicle to the patient and back, so a parked ambulance farther than ambulance_patient_reach_m (150 m) cannot reserve him:
// HEMS takes him. At the limit and below nothing changes; a missing vehicle or patient never blocks.
for (const resource of ['ambulance1', 'ambulance2']) {
  for (const [meters, reaches] of [[0, true], [100, true], [150, true], [151, false], [1500, false]]) {
    const h = new Live();
    for (const other of [2, 3]) h.objects.delete(`injured_human${other}`);
    h.locations[resource] = [0, meters];
    assert.equal(h.tour(resource), 1);
    const ticket = h.reserve(resource);
    if (reaches) { assert.equal(ticket?.slot, 1, `${resource} at ${meters} m reserves the patient`); continue; }
    assert.equal(ticket, null, `${resource} at ${meters} m must not reserve the patient`);
    assert.equal(h.reserve(resource), null); assert.equal(h.reserve(resource), null);
    const rows = (h.locals.ground_crew_runtime_trace || []).filter(row => row.macro === 'ambulance_reach');
    assert.equal(rows.length, 1, 'a blocked ambulance polling every second writes one trace row, not one per poll');
    assert.match(rows[0].state, /blocked/);
    assert.equal(h.tour('hems'), 1);
    const hems = h.reserve('hems');
    assert.equal(hems?.slot, 1, 'HEMS reserves the patient the ambulance cannot reach');
    assert.equal(hems.resource, 'hems');
  }
}
{
  const h = new Live();
  for (const other of [2, 3]) h.objects.delete(`injured_human${other}`);
  h.locations.ambulance1 = [0, 5000]; h.objects.delete('ambulance1');
  assert.equal(h.call(prefix + 'ambulance reach', {vehicle: 'ambulance1', patient: 1}), 1, 'no vehicle: the check cannot be made and never blocks');
  h.objects.add('ambulance1'); h.objects.delete('injured_human');
  assert.equal(h.call(prefix + 'ambulance reach', {vehicle: 'ambulance1', patient: 1}), 1, 'no patient object: never blocks');
  assert.equal(h.call(prefix + 'ambulance reach', {vehicle: 'ambulance1', patient: 4}), 1, 'a slot without a patient object never blocks');
}
// the same patient reserved by HEMS first leaves the far ambulance without a patient: its medic does not walk to him
{
  const h = new Live();
  for (const other of [2, 3]) h.objects.delete(`injured_human${other}`);
  h.locations.ambulance1 = [0, 1500]; h.locations.ambumedic7 = [0, 1500];
  h.locals.MISSION_TIME = 0; h.locals['L:MISSION_TIME'] = 10000;
  // the stand down ends with a wait for the minimum time on the mission clock, which this harness does not advance: the medic part has run by then
  try { h.call('ambulance1 stand down'); } catch (error) { assert.match(String(error.message), /Synchronous worker wait did not complete/); }
  assert.ok(!h.events.some(e => e[0] === 'arrival' && e[1] === 'ambumedic7'), 'the medic of an ambulance 1500 m from the patient does not walk to him');
  assert.ok(h.events.some(e => e[0] === 'destroy' && e[1] === 'ambumedic7'), 'the medic boards at once');
}
// A ground provider left by the previous dispatch (locals survive reload_mission) made crew eligibility answer "assigned" for patient 1 of the next one: neither the
// ambulance nor HEMS visited him (tester report 2026-10-11, mission 62). The live initialisation of a mission clears it.
{
  const h = new Live();
  Object.assign(h.locals, {P1_GROUND_PROVIDER: 'ambulance1', P2_GROUND_PROVIDER: 'ambulance1', P3_GROUND_PROVIDER: 'ambulance2'});
  assert.equal(h.call(prefix + 'crew eligibility', {patient: 1}), 'assigned', 'a stale provider hides the patient from every crew');
  h.call(prefix + 'live initialize');
  for (const patient of [1, 2, 3]) assert.equal(h.locals[`P${patient}_GROUND_PROVIDER`], null, `provider of patient ${patient} cleared`);
  assert.equal(h.call(prefix + 'crew eligibility', {patient: 1}), 'eligible', 'after the start of the next dispatch the patient is visited again');
}
console.log('Live patient transport PASS: visit barrier, queue ownership, nine slot/resource combinations, clinical priority, recovery, independent physiology, real CPR/manual workers and three save slots. HPG/MSFS PENDING.');
