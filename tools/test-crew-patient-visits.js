#!/usr/bin/env node
'use strict';

// Execute production macro lists. The object harness verifies ordering and identity,
// not HPG pathfinding, animation or simulator scheduling.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const macros = Object.assign({}, ...fs.readdirSync(path.join(root, 'mission-src/macros'))
  .filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8'))));
// Reuse the existing small command interpreter, without executing its test suite.
const interpreter = fs.readFileSync(path.join(__dirname, 'test-multipatient-registry.js'), 'utf8');
const end = interpreter.indexOf('const create = () =>');
assert.ok(end > 0);
const context = { require, __dirname, structuredClone, console, module: { exports: {} } };
vm.runInNewContext(interpreter.slice(0, end) + '\nmodule.exports = HpgRegistry;', context);
const Base = context.module.exports;
const prefix = 'multipatient registry crew ';
const resources = ['ambulance1', 'ambulance2', 'hems'];
const patientObject = n => `injured_human${n === 1 ? '' : n}`;
const crewVisit = macros['multipatient registry crew visit'];
const lifecycle = macros['objective2'];
const tourUpdate = macros['multipatient registry RescueTrack tour update'];
const crewDriveSide = macros['multipatient registry crew drive side'];
assert.ok(!JSON.stringify(crewVisit).includes('{param:actor}'), 'Crew visits must resolve actor through an explicit local');
assert.ok(JSON.stringify(crewVisit).includes('patient_crew_visit_actor'), 'Crew visits must snapshot the actor before state writes');
const lifecycleText = JSON.stringify(lifecycle);
assert.ok(lifecycleText.includes('{local:AGE2} {local:SEX2} {local:consciousness2}'), 'Three-patient injured update must use patient 2 sex');
assert.ok(lifecycleText.includes('{local:AGE3} {local:SEX3} {local:consciousness3}'), 'Three-patient injured update must use patient 3 sex');
assert.ok(JSON.stringify(tourUpdate).includes('multipatient_rescuetrack_sender'), 'Tour updates must normalize their RescueTrack sender');
assert.ok(JSON.stringify(tourUpdate).includes('Ambulance {0} crew'), 'Ambulance visit reports must identify the vehicle crew, not only its callsign');
assert.ok(JSON.stringify(tourUpdate).includes('multipatient_rescuetrack_label'), 'Tour updates must separate the sender identity from its display label');
const crewDriveSideText = JSON.stringify(crewDriveSide);
assert.ok(crewDriveSideText.includes('AMBU7_MOVE_TARGET'), 'Ambulance 1 medic requires a dedicated movement target local');
assert.ok(crewDriveSideText.includes('AMBU2_MOVE_TARGET'), 'Ambulance 2 medic requires a dedicated movement target local');
function findDriveObjects(value, drives = []) {
  if (Array.isArray(value)) value.forEach(item => findDriveObjects(item, drives));
  else if (value && typeof value === 'object') {
    if (value.drive_object) drives.push(value.drive_object);
    Object.values(value).forEach(item => findDriveObjects(item, drives));
  }
  return drives;
}
for (const drive of findDriveObjects(crewDriveSide)) {
  const target = JSON.stringify(drive.to);
  if (drive.name === 'ambumedic7') assert.ok(target.includes('AMBU7_MOVE_TARGET'), 'ambumedic7 must use its dedicated movement target');
  if (drive.name === 'ambumedic2') assert.ok(target.includes('AMBU2_MOVE_TARGET'), 'ambumedic2 must use its dedicated movement target');
}
class Scene extends Base {
  constructor() {
    super(macros); this.events = []; this.sleepHook = null; this.moveHook = null; this.failedMovement = false;
    this.objects = new Set(['ambumedic7', 'ambumedic2', 'hoist_crew', 'pax3', ...[1, 2, 3].map(patientObject)]);
    for (const id of this.objects) this.locations[id] = [0, 0];
    Object.assign(this.locations, { LUP: [10, 10], RUP: [10, -10], RDWN: [-10, -10], LDWN: [-10, 10] });
    this.globals = { P1_MANUAL_MEDICAL_MODE: 'automatic', LIFESCORE_THR_HI: 40 };
    Object.assign(this.locals, { HELOVICTIMS: 3, LIFESCORE: 75, LIFESCORE2: 65, LIFESCORE3: 55,
      TIME1SHORT: 1, TIME2SHORT: 1, TIME3SHORT: 1, Dispatcher_Messages: [] });
    for (const slot of [1, 2, 3]) this.locals[`P${slot}_MEDICAL_ACTION_COUNT`] = 4;
    this.call(prefix + 'reset');
  }
  text(x, p) {
    if (x && typeof x === 'object' && x.param) return p[x.param];
    if (x && typeof x === 'object' && x.local) return this.locals[x.local];
    if (x && typeof x === 'object' && x.text) return x.text.replace(/\{(\d+)\}/g, (_, i) => this.text(x.params[Number(i)], p));
    return String(x)
      .replace(/\{param:([^}]+)\}/g, (_, k) => p[k])
      .replace(/\{local:([^}]+)\}/g, (_, k) => this.locals[k]);
  }
  query(q, p) {
    if (q?.global) return this.globals[q.global] ?? null;
    if (q?.fn === 'get_time_string') return '00:00:00';
    if (q?.has_object !== undefined) return Number(this.objects.has(this.query(q.has_object, p)));
    if (q?.location && typeof q.location === 'string') {
      return super.query({ ...q, location: this.text(q.location, p), to: this.text(q.to, p) }, p);
    }
    return super.query(q, p);
  }
  commands(list, p) {
    for (const c of list) {
      if (c.sleep !== undefined) { this.events.push(['sleep', this.query(c.sleep, p)]); this.sleepHook?.(this, p); }
      else if (c.while) {
        let ticks = 0;
        while (this.compare(this.query(c.while, p), c, p)) {
          assert.ok(++ticks < (this.maxLoopTicks || 20), 'Visit lock must be released or cancelled'); this.commands(c.do, p);
        }
      } else if (c.drive_object) {
        const actor = this.text(c.drive_object.name, p); const route = c.drive_object.to;
        assert.ok(this.objects.has(actor), 'Moving actor must exist');
        if (this.failedMovement) throw new Error('simulated drive_object failure');
        const last = route.at(-1);
        if (last.object) {
          const object = this.text(last.object, p); assert.ok(this.objects.has(object));
          const side = this.query(last.bearing2, p); assert.ok([0, 90, 180, 270].includes(side));
          this.events.push(['arrival', actor, object, side]);
          this.locations[actor] = this.failedMovement ? [100, 100] : [...this.locations[object]];
          this.moveHook?.(this, actor, object);
        } else this.events.push(['waypoint', actor]);
      } else if (c.move_object) {
        const actor = this.text(c.move_object, p); assert.ok(this.objects.has(actor), 'Recovery actor must exist');
        const target = c.to;
        const last = Array.isArray(target) ? target.at(-1) : target;
        const object = this.text(last.object, p); assert.ok(this.objects.has(object), 'Recovery target must exist');
        if (!this.failedMovement) this.locations[actor] = [...this.locations[object]];
        this.events.push([this.failedMovement ? 'recovery_failed' : 'recovery', actor, object]);
      } else if (c.create_thread) {
        // The harness is synchronous; execute thread bodies inline without
        // introducing a fake movement watchdog or scheduler timing.
        this.commands(c.create_thread.commands, p);
      } else if (c.wait_for) {
        assert.ok(this.compare(this.query(c.wait_for, p), c, p), 'Synchronous worker wait did not complete');
      } else if (c.set?.object) {
        assert.ok(this.objects.has(this.text(c.set.object, p)));
        this.events.push(['animation', this.text(c.set.object, p), this.query(c.value, p)]);
      } else super.commands([c], p);
    }
  }
  call(name, p = {}) {
    if (name === 'sync medical patient display' || name === 'multipatient registry tablet mark visit') return;
    if (name === 'request manual patient visit') {
      this.events.push(['manual', p.patient]); this.locals[`manual_p${p.patient}_visit_completed`] = 'yes';
      this.locals[`P${p.patient}_MEDICAL_ACTIONS_COMPLETED`] = 1; return;
    }
    // Effects have their own clinical regression gate. This harness records their
    // synchronous completion and checks the visit/assignment boundary around them.
    if (/^apply patient[123] medical action effect$/.test(name)) {
      this.events.push(['effect', Number(name.match(/patient([123])/)[1]), this.locals.medical_action_effect_step]); return;
    }
    if (name === 'ambulance assess patient' || name === 'crew physical HEMS assessment') {
      const actor = name.startsWith('ambulance') ? this.currentActor : 'hoist_crew';
      assert.ok(this.events.some(e => e[0] === 'arrival' && e[1] === actor && e[2] === patientObject(p.patient)), 'Assessment before physical arrival');
      this.events.push(['assessment', actor, p.patient]);
    }
    return super.call(name, p);
  }
  tour(resource) {
    this.currentActor = {ambulance1: 'ambumedic7', ambulance2: 'ambumedic2', hems: 'hoist_crew'}[resource];
    return this.call(prefix + 'tour', {resource, actor: this.currentActor, provider: resource, walk: resource === 'hems' ? 3 : 1});
  }
}

for (const order of resources.flatMap(first => resources.filter(x => x !== first).map(second => [first, second, resources.find(x => x !== first && x !== second)]))) {
  const h = new Scene();
  for (const resource of order) assert.equal(h.tour(resource), 1);
  for (const patient of h.locals.patient_crew_visits) for (const resource of resources) assert.equal(patient[resource], 'completed');
  assert.equal(h.events.filter(e => e[0] === 'assessment').length, 9);
  assert.equal(h.tour(order[0]), 1);
  assert.equal(h.events.filter(e => e[0] === 'assessment').length, 9, 'Duplicate entry must not repeat visits');
}
for (const [resource, expected] of [['ambulance1', [1, 2, 3]], ['ambulance2', [3, 2, 1]], ['hems', [1, 2, 3]]]) {
  const h = new Scene();
  assert.equal(h.tour(resource), 1);
  assert.deepEqual(h.events.filter(e => e[0] === 'assessment' && e[1] === h.currentActor).map(e => e[2]), expected,
    `${resource} must visit patients in its assigned order`);
}
for (const count of [1, 2]) {
  const h = new Scene();
  for (let slot = count + 1; slot <= 3; slot++) h.objects.delete(patientObject(slot));
  for (const resource of resources) assert.equal(h.tour(resource), 1);
  assert.equal(h.events.filter(e => e[0] === 'assessment').length, count * 3);
}
for (const slot of [1, 2, 3]) {
  const h = new Scene(); h.locals[`P${slot}_GROUND_PROVIDER`] = 'ambulance2';
  assert.equal(h.tour('ambulance1'), 1);
  assert.ok(!h.events.some(e => e[0] === 'arrival' && e[2] === patientObject(slot)), 'Assigned patient must not be approached');
  assert.equal(h.locals.patient_crew_visits[slot - 1].ambulance1, 'assigned');
}
{
  const h = new Scene();
  for (const slot of [1, 2, 3]) {
    h.locals[`P${slot}_CLINICAL_OWNER`] = 'another clinician';
    h.locals[`P${slot}_MEDICAL_ACTIONS_STARTED`] = 1;
    h.locals[`P${slot}_MEDICAL_ACTIONS_COMPLETED`] = 1;
    h.locals[`P${slot}_AMBULANCE_COMPLETED_ACTIONS`] = 4;
    h.locals[`crewvisiting${slot}`] = 'yes';
  }
  assert.equal(h.tour('ambulance2'), 1);
  for (const slot of [1, 2, 3]) {
    assert.equal(h.locals[`P${slot}_MEDICAL_ACTIONS_COMPLETED`], 1);
    assert.equal(h.locals[`P${slot}_AMBULANCE_COMPLETED_ACTIONS`], 4);
    assert.equal(h.locals[`P${slot}_CLINICAL_OWNER`], 'another clinician');
  }
  assert.equal(h.events.filter(e => e[0] === 'assessment').length, 3);
}
{
  const h = new Scene(); h.moveHook = (scene, actor, object) => {
    if (object === 'injured_human2') scene.locals.P2_GROUND_PROVIDER = 'hems';
  };
  h.tour('ambulance1');
  assert.ok(!h.events.some(e => e[0] === 'assessment' && e[2] === 2), 'Recheck assignment after arrival');
}
{
  const h = new Scene(); const patient = h.locals.patient_crew_visits[0];
  patient.owner = 'ambulance1';
  h.sleepHook = () => { patient.owner = 'none'; };
  assert.equal(h.tour('hems'), 1, 'HEMS must continue its tour when an ambulance owns one patient');
  assert.deepEqual(h.events.filter(e => e[0] === 'assessment').map(e => e[2]), [1, 2, 3], 'HEMS must retry the busy patient after the ambulance releases it');
}
{
  const h = new Scene(); const patient = h.locals.patient_crew_visits[0]; patient.owner = 'hems';
  h.sleepHook = () => { patient.owner = 'none'; };
  assert.equal(h.tour('ambulance1'), 1);
  assert.equal(patient.owner, 'none');
}
{
  // HEMS must retry a claim held by an ambulance; `busy` must not close the
  // tour without assessing that patient.
  const h = new Scene(); const patient = h.locals.patient_crew_visits[0];
  patient.owner = 'ambulance1'; let released = false;
  h.sleepHook = () => {
    if (!released) {
      released = true;
      h.locals.patient_crew_visits[0].owner = 'none';
    }
  };
  assert.equal(h.tour('hems'), 1);
  assert.ok(h.events.some(e => e[0] === 'assessment' && e[1] === 'hoist_crew' && e[2] === 1),
    'HEMS must assess a patient after an ambulance releases its claim');
}
{
  const h = new Scene(); h.failedMovement = true;
  assert.equal(h.tour('ambulance2'), 0);
  assert.equal(h.events.filter(e => e[0] === 'assessment').length, 0);
  assert.equal(h.locals.patient_crew_visits[0].ambulance2, 'pending');
  assert.equal(h.locals.patient_crew_visits[1].ambulance2, 'pending');
  assert.equal(h.locals.patient_crew_visits[2].ambulance2, 'movement_failed');
}
{
  const h = new Scene(); h.locals.LIFESCORE2 = 0;
  h.tour('ambulance2');
  assert.equal(h.locals.patient_crew_visits[1].ambulance2, 'deceased');
  assert.ok(!h.events.some(e => e[0] === 'assessment' && e[2] === 2));
}
{
  const h = new Scene();
  assert.equal(h.call(prefix + 'tour', {resource:'hems', actor:'hoist_crew', provider:'HEMS', walk:3, assistant:'pax3', assistant_walk:16}), 1);
  for (const slot of [1,2,3]) {
    const arrivals=h.events.filter(e=>e[0]==='arrival' && e[2]===patientObject(slot));
    assert.ok(arrivals.some(e=>e[1]==='hoist_crew' && e[3]===90));
    assert.ok(arrivals.some(e=>e[1]==='pax3' && e[3]===270));
  }
}
{
  const h = new Scene(); let reset = false;
  h.sleepHook = () => { if (!reset) { reset = true; h.call(prefix + 'reset'); } };
  assert.equal(h.tour('ambulance1'), 0);
  assert.ok(h.locals.patient_crew_visits.every(x => x.ambulance1 === 'pending'), 'Old tour must not enter the next dispatch');
}
{
  // Negative control: a coordinator with its physical movement removed cannot pass a tour.
  const h = new Scene(); h.macros = {...macros, [prefix + 'move']: [{return:0}]};
  assert.equal(h.tour('ambulance1'), 0);
  assert.equal(h.events.filter(e => e[0] === 'assessment').length, 0);
}
{
  const h = new Scene(); h.globals.P1_MANUAL_MEDICAL_MODE = 'manual';
  h.locals.manual_p1_visit_completed = 'yes';
  h.locals.P1_MEDICAL_ACTIONS_COMPLETED = 1;
  h.tour('hems');
  assert.deepEqual(h.events.filter(e => e[0] === 'manual').map(e => e[1]), [2, 3]);
  assert.equal(h.events.filter(e => e[0] === 'assessment').length, 3);
}
{
  const h = new Scene(); h.tour('ambulance1'); const previous = h.locals.patient_crew_visits;
  h.call(prefix + 'reset');
  assert.notEqual(h.locals.patient_crew_visits, previous);
  assert.ok(h.locals.patient_crew_visits.every(x => x.ambulance1 === 'pending'));
  const p = h.locals.patient_crew_visits[0];
  assert.equal(h.call(prefix + 'acquire', {visit: p, patient: 1, resource: 'hems', generation: 1}), 'cancelled');
}
for (const name of ['3 crew ground ops', '4 or 5 crew ground ops', 'HOISTING', '3 crew SKID LDG', '4 crew SKID LDG', '5 crew SKID LDG']) {
  const text = JSON.stringify(macros[name]);
  assert.ok(text.includes(`"call_macro":"${prefix}tour safe"`), name);
  assert.ok(text.includes('HEMS_VISIT_OBJECT'), `${name}: separate approach target`);
  assert.ok(!text.includes('"call_macro":"patient clinical visit gate","params":{"patient":2'), `${name}: duplicate P2 visit`);
}
assert.ok(JSON.stringify(macros['ambustretcher full']).includes(prefix + 'tour safe'));
assert.ok(JSON.stringify(macros['ambulance2 secondary rescue']).includes(prefix + 'tour'), 'Secondary ambulance must execute the common physical tour through its guarded call');
assert.ok(macros['ambulance2 secondary rescue'].some(command=>command.if?.and?.some(c=>c.require?.local==='HELOVICTIMS' && c.gte===1)), 'Ambulance2 must also visit a sole unassigned P1');
assert.ok(JSON.stringify(macros['debug page']).includes('patient_crew_visits'));
console.log('Crew patient visits PASS: all crews/slots, existing treatment, assignments, movement failure, lock contention, manual revisits, reset and HEMS integration. Simulator validation PENDING.');
