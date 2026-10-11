#!/usr/bin/env node
'use strict';

// Ambulance shelter of a single patient (conditions, monitor, physical sequence, abort, release, hooks). The production macros run on a small HPG subset interpreter
// with scripted world answers (objects, distances, registry macros). HPG/MSFS is NOT modeled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

class Returned extends Error { constructor(value) { super('return'); this.value = value; } }
class Broke extends Error {}
class Stop extends Error {}

class World {
  constructor(overrides = {}) {
    this.locals = {};
    this.vars = { 'AMBIENT PRECIP STATE': 2, 'AMBIENT TEMPERATURE': 15, 'L:RESCUED': 0, 'L:CPR': 0, 'L:VARPOLICEAVAIL': 0, 'L:MISSION_TIME': 100, 'L:DISPATCH_ENDED': 1, 'L:HOLDAMBU': 0 };
    this.objects = { ambulance1: { 'VAR 2': 0 }, ambumedic7: { 'VAR 1': 0 }, injured_human: { 'VAR 1': 0 }, police: {} };
    this.locations = new Set(['accident_location']);
    this.distances = { 'ambulance1|accident_location': 12, 'ambustretcher7|ambulance1': 0.5, 'injured_human|ambulance1': 0.6 };
    this.accidents = [{ ID_CARD: 7, preload: 'enable' }, { ID_CARD: 8, preload: 'disable' }];
    this.threads = [];
    this.calls = [];
    this.moves = [];
    this.drives = [];
    this.driveLog = [];
    this.points = [];
    this.realCrewMove = false;
    this.destroyed = [];
    this.messages = [];
    this.record = { slot: 1, object: 'injured_human', location: 'injured_human', shelter: null };
    this.registry = { crewMove: 1, claim: 'acquired', throwOnDrive: false, throwOnAnchorDrive: false, releases: 0 };
    this.time = 0;
    Object.assign(this.locals, {
      patient_live_mode: 1, HELOVICTIMS: 1, CREW: 3, VAR_MISSION_NUMBER: 7, MISSION_PHASE: 6, crewvisiting1: 'no', patientlife: 'alive', LIFESCORE: 60,
      ambulance1_assessment_complete: 'yes', P1_AMBULANCE_DECISION: 'declined_ground_transport', ambulance1_transport_ticket: null, poli1arrived: 'yes', poli7arrived: 'no', POLICE_AVAIL: 0,
      ambuname: 'AMBULANCE 1', patient_crew_visit_generation: 3, Dispatcher_Messages: [], CLOCK_MODE: 'local', ambulance_shelter_state: null, AMBU1_X: 'AMB1X180'
    });
    this.objects.police = {};
    Object.assign(this, overrides);
  }
  has(name) { return Object.hasOwn(this.objects, name); }
  dist(a, b) { return this.distances[`${a}|${b}`] ?? 0; }
  // queries ------------------------------------------------------------
  q(x, p = {}) {
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return x.map((item) => this.q(item, p));
    if (Object.hasOwn(x, 'local')) return this.locals[x.local] ?? null;
    if (Object.hasOwn(x, 'param')) { let v = p[x.param] ?? null; if (x.path) v = v?.[x.path] ?? null; return v; }
    if (Object.hasOwn(x, 'global')) return null;
    if (Array.isArray(x.var)) return this.vars[x.var[0]] ?? 0;
    if (Object.hasOwn(x, 'has_object')) return this.has(this.q(x.has_object, p)) ? 1 : 0;
    if (Object.hasOwn(x, 'has_location')) return this.locations.has(x.has_location) ? 1 : 0;
    if (Object.hasOwn(x, 'location') && x.var === 'distance:m') return this.dist(x.location, x.to);
    if (Object.hasOwn(x, 'object') && typeof x.var === 'string') return this.objects[x.object]?.[x.var] ?? null;
    if (Object.hasOwn(x, 'struct')) { const s = this.q(x.struct, p); return s?.[x.path] ?? null; }
    if (x.require !== undefined) return this.cmp(this.q(x.require, p), x, p);
    if (x.and) return Number(x.and.every((item) => this.q(item, p)));
    if (x.or) return Number(x.or.some((item) => this.q(item, p)));
    if (x.add) return x.add.map((item) => this.q(item, p)).reduce((sum, n) => sum + n, 0);
    if (x.floor !== undefined) return Math.floor(this.q(x.floor, p));
    if (x.round !== undefined) { const f = 10 ** (x.to ?? 0); return Math.round(this.q(x.round, p) * f) / f; }
    if (x.text !== undefined) return x.params ? x.text.replace(/\{(\d+)(?::[A-Z]+)?\}/g, (_, n) => String(this.q(x.params[Number(n)], p))) : x.text;
    if (Object.hasOwn(x, 'if')) return this.cmp(this.q(x.if, p), x, p) ? this.q(x.then, p) : this.q(x.else, p);
    if (x.create_struct) return Object.fromEntries(Object.entries(x.create_struct).map(([k, v]) => [k, this.q(v, p)]));
    if (x.create_array !== undefined) return [];
    throw new Error(`Unsupported query ${JSON.stringify(x).slice(0, 140)}`);
  }
  cmp(a, node, p) {
    const op = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].find((key) => Object.hasOwn(node, key));
    assert.ok(op, JSON.stringify(node).slice(0, 140));
    const b = this.q(node[op], p);
    return { eq: a === b, ne: a !== b, gt: a > b, gte: a >= b, lt: a < b, lte: a <= b }[op];
  }
  // commands -----------------------------------------------------------
  run(list, p) {
    for (const c of list) {
      if (c['#comment'] !== undefined && Object.keys(c).length === 1) continue;
      if (c.sleep !== undefined) { this.time += Array.isArray(c.sleep) ? c.sleep[0] : c.sleep; this.vars['L:MISSION_TIME'] += Array.isArray(c.sleep) ? c.sleep[0] : c.sleep; if (this.time > (this.horizon ?? 1e9)) throw new Stop(); }
      else if (c.set && c.set.param === 'mutation') { assert.equal(c.value?.function, 'assign'); Object.assign(p[c.value.params[0].param], this.q(c.value.params[1], p)); }
      else if (c.set) {
        const value = this.q(c.value, p);
        if (c.set.local) this.locals[c.set.local] = value;
        else if (c.set.param) p[c.set.param] = value;
        else if (c.set.object) (this.objects[c.set.object] ??= {})[c.set.var] = value;
        else if (c.set.var) this.vars[c.set.var[0]] = value;
        else throw new Error(`Unsupported set ${JSON.stringify(c.set)}`);
      } else if (c.if !== undefined) this.run(this.cmp(this.q(c.if, p), c, p) ? c.then || [] : c.else || [], p);
      else if (c.while !== undefined) { let guard = 0; while (this.cmp(this.q(c.while, p), c, p)) { assert.ok(++guard < 100000, 'loop guard'); this.run(c.do, p); } }
      else if (c.for_each !== undefined) { const items = c.for_each.static ? this.accidents : this.q(c.for_each, p); for (const item of items) { try { this.run(c.do, { ...p, $item: item }); } catch (error) { if (error instanceof Broke) break; throw error; } } }
      else if (c.break !== undefined) throw new Broke();
      else if (c.try) { try { this.run(c.try, p); } catch (error) { if (error instanceof Returned || error instanceof Stop || error instanceof Broke) throw error; this.run(c.catch, { ...p, $ERROR: String(error.message) }); } }
      else if (c.call_macro) this.callMacro(c, p);
      else if (c.create_thread) this.threads.push(c.create_thread.commands);
      else if (Object.hasOwn(c, 'return')) throw new Returned(this.q(c.return, p));
      else if (c.create_location) this.locations.add(c.create_location);
      else if (c.move_object) { this.moves.push([c.move_object, c.to]); }
      else if (c.drive_object) { if (this.registry.throwOnDrive || (this.registry.throwOnAnchorDrive && c.drive_object.name === 'injured_human')) throw new Error('drive failed'); this.drives.push(c.drive_object.name); this.driveLog.push(c.drive_object); (this.objects[c.drive_object.name] ??= {})['VAR 1'] = c.drive_object.VAR1; }
      else if (c.point_object) this.points.push([c.point_object, c.to]);
      else if (c.wait_for !== undefined) { this.drain(); assert.ok(this.cmp(this.q(c.wait_for, p), c, p), 'wait_for would block: ' + JSON.stringify(c)); }
      else if (c.destroy_object) { this.destroyed.push(c.destroy_object); delete this.objects[c.destroy_object]; }
      else if (c.set_message) this.messages.push(String(c.set_message.text).replace(/\{local:([A-Za-z0-9_]+)\}/g, (_, name) => this.locals[name]));
      else if (c.modify_array) { const arr = this.q(c.modify_array, p); if (c.prepend) arr.unshift(this.q(c.prepend, p)); else if (c.append) arr.push(this.q(c.append, p)); }
      else throw new Error(`Unsupported command ${JSON.stringify(c).slice(0, 140)}`);
    }
  }
  drain() { while (this.threads.length) { const thread = this.threads.shift(); this.run(thread, {}); } }
  callMacro(c, p) {
    const args = Object.fromEntries(Object.entries(c.params || {}).map(([k, v]) => [k, this.q(v, p)]));
    this.calls.push(c.call_macro);
    let result;
    switch (c.call_macro) {
      case 'ground crew runtime trace': this.trace = [...(this.trace ?? []), args]; return;
      case 'UpdateRescueTrack': return;
      case 'multipatient registry live sync': return;
      case 'multipatient registry crew record': result = { object: 'injured_human', ambulance1: null }; break;
      case 'multipatient registry get': result = this.record; break;
      case 'multipatient registry crew acquire': result = this.registry.claim; break;
      case 'multipatient registry crew release': this.registry.releases += 1; return;
      case 'multipatient registry live ensure stretcher': this.objects.ambustretcher7 ??= { 'VAR 1': 0, 'VAR 2': 1 }; return;
      case 'multipatient registry ambulance scene point': return;
      case 'multipatient registry crew move':
        if (this.realCrewMove) { try { this.run(macros[c.call_macro], { ...args }); result = undefined; } catch (error) { if (!(error instanceof Returned)) throw error; result = error.value; } } else result = this.registry.crewMove;
        break;
      case 'multipatient registry crew set ground standing': case 'multipatient registry crew set standing': case 'multipatient registry pax3 pilot standing': case 'multipatient registry crew drive closest': case 'multipatient registry crew drive side': case 'multipatient registry crew movement sample': return;
      default:
        assert.ok(macros[c.call_macro], `unknown macro ${c.call_macro}`);
        try { this.run(macros[c.call_macro], { ...args }); result = undefined; } catch (error) { if (!(error instanceof Returned)) throw error; result = error.value; }
    }
    if (c.result !== undefined) p[c.result] = result;
  }
  exec(name, args = {}) { const p = { ...args }; try { this.run(macros[name], p); return undefined; } catch (error) { if (error instanceof Returned) return error.value; throw error; } }
}

// ---- 1. the conditions: one reason at a time, in the documented order, weather limits as in the original
const base = () => new World();
const verdict = (world) => { const ok = world.exec('ambulance shelter conditions'); return [ok, world.locals.ambulance_shelter_reason]; };
{
  // everything required but no weather reason: waits for a need
  let w = base();
  assert.deepEqual(verdict(w), [0, 'no_shelter_need'], 'every condition holds but nothing asks for a shelter');
  assert.equal(w.locals.ambulance_previsit_eligible, 1);
  assert.equal(w.locals.ambulance_previsit_allowed, 0);
  const wet = (world) => { world.vars['AMBIENT PRECIP STATE'] = 4; return world; };
  w = wet(base());
  assert.deepEqual(verdict(w), [1, 'ok']);
  assert.equal(w.locals.ambulance_shelter_need, 'rain or snow');
  assert.equal(w.locals.ambulance_previsit_allowed, 1);
  // weather limits of the original: precipitation state 4 or more, above 30 or below 3 degrees C
  const need = (mutate) => { const world = base(); mutate(world); return verdict(world); };
  assert.deepEqual(need((x) => { x.vars['AMBIENT PRECIP STATE'] = 3; }), [0, 'no_shelter_need'], 'precipitation state 3 is not enough');
  assert.deepEqual(need((x) => { x.vars['AMBIENT PRECIP STATE'] = 8; }), [1, 'ok'], 'snow');
  assert.deepEqual(need((x) => { x.vars['AMBIENT TEMPERATURE'] = 30; }), [0, 'no_shelter_need'], '30 C is not above 30');
  assert.deepEqual(need((x) => { x.vars['AMBIENT TEMPERATURE'] = 30.5; }), [1, 'ok']);
  assert.deepEqual(need((x) => { x.vars['AMBIENT TEMPERATURE'] = 3; }), [0, 'no_shelter_need'], '3 C is not below 3');
  assert.deepEqual(need((x) => { x.vars['AMBIENT TEMPERATURE'] = 2.9; }), [1, 'ok']);
  { const world = base(); world.objects.VFXA = {}; assert.deepEqual(verdict(world), [1, 'ok']); assert.equal(world.locals.ambulance_shelter_need, 'fire on scene'); }
  { const world = base(); world.vars['AMBIENT TEMPERATURE'] = 35; verdict(world); assert.equal(world.locals.ambulance_shelter_need, 'heat'); }
  { const world = base(); world.vars['AMBIENT TEMPERATURE'] = -5; verdict(world); assert.equal(world.locals.ambulance_shelter_need, 'cold'); }

  // each condition of the specification, one at a time (weather bad in all of them)
  const bad = (mutate) => { const world = base(); world.vars['AMBIENT PRECIP STATE'] = 4; mutate(world); return verdict(world); };
  const table = [
    ['not_live_mode', (x) => { x.locals.patient_live_mode = 0; }],
    ['multi_patient', (x) => { x.locals.HELOVICTIMS = 2; }],
    ['data_disabled', (x) => { x.locals.VAR_MISSION_NUMBER = 8; }],
    ['hems_landed', (x) => { x.locals.MISSION_PHASE = 7; }],
    ['hems_landed', (x) => { x.objects.hoist_crew = {}; }],
    ['hems_landed', (x) => { x.vars['L:RESCUED'] = 1; }],
    ['hems_landed', (x) => { x.locals.crewvisiting1 = 'yes'; }],
    ['patient_gone', (x) => { delete x.objects.injured_human; }],
    ['patient_died', (x) => { x.locals.patientlife = 'died'; }],
    ['no_ambulance', (x) => { delete x.objects.ambulance1; }],
    ['no_medic', (x) => { delete x.objects.ambumedic7; }],
    ['ambulance_busy', (x) => { x.locals.ambulance1_transport_ticket = { slot: 1 }; }],
    ['ambulance_far', (x) => { x.distances['ambulance1|accident_location'] = 601; }],
    ['pre_visit_pending', (x) => { x.locals.ambulance1_assessment_complete = 'no'; }],
    ['ground_transport_ok', (x) => { x.locals.P1_AMBULANCE_DECISION = 'clinically_suitable'; }],
    ['decision_pending', (x) => { x.locals.P1_AMBULANCE_DECISION = null; }],
    ['not_movable', (x) => { x.locals.LIFESCORE = 40; }],
    ['cpr_active', (x) => { x.vars['L:CPR'] = 2; }],
    ['police_pending', (x) => { x.locals.poli1arrived = 'no'; }]
  ];
  for (const [reason, mutate] of table) assert.deepEqual(bad(mutate), [0, reason], `reason ${reason}`);
  assert.deepEqual(bad((x) => { x.distances['ambulance1|accident_location'] = 600; }), [1, 'ok'], '600 m is still near');
  assert.deepEqual(bad((x) => { x.locals.LIFESCORE = 41; }), [1, 'ok'], 'LifeScore above 40 can be moved');
  assert.deepEqual(bad((x) => { x.locals.poli1arrived = 'no'; x.locals.poli7arrived = 'yes'; }), [1, 'ok'], 'the second police unit counts');
  assert.deepEqual(bad((x) => { x.locals.poli1arrived = 'no'; x.locals.POLICE_AVAIL = 1; }), [1, 'ok']);
  // order: the first failing condition is the reported one
  assert.deepEqual(bad((x) => { x.locals.HELOVICTIMS = 2; x.locals.P1_AMBULANCE_DECISION = null; }), [0, 'multi_patient']);
  // every helicopter crew (3, 4 or 5) shelters: the visits are the registry ones, only the transport differs afterwards
  for (const crew of [3, 4, 5]) assert.deepEqual(bad((x) => { x.locals.CREW = crew; }), [1, 'ok'], `crew ${crew}`);
  assert.deepEqual(bad((x) => { x.locals.P1_AMBULANCE_DECISION = null; x.locals.LIFESCORE = 10; }), [0, 'decision_pending']);
}

// ---- 2. the physical sequence
const world = () => { const w = base(); w.vars['AMBIENT PRECIP STATE'] = 4; return w; };
const REAR6 = { bearing2: 180, dist: 6, object: 'ambulance1' };
// first waypoint of a visitor: the closest of three points around the ambulance, so that the way to the rear doors does not cross it
const AROUND = (actor) => ({ closest: [{ bearing2: 90, dist: 5, object: 'ambulance1' }, { bearing2: 270, dist: 5, object: 'ambulance1' }, { bearing2: 180, dist: 10, object: 'ambulance1' }], to: actor });
{
  const w = world();
  const result = w.exec('ambulance shelter patient');
  assert.equal(result, 1, 'state ' + w.locals.ambulance_shelter_state + ' reason ' + w.locals.ambulance_shelter_reason);
  assert.equal(w.locals.ambulance_shelter_state, 'sheltered');
  assert.equal(w.locals.ambulance_shelter_prev_var1, 0, 'the previous VAR 1 of the patient is kept');
  assert.equal(w.locals.ambulance_shelter_anchor_done, 'done');
  assert.equal(w.objects.injured_human['VAR 1'], -1, 'the identity anchor is hidden (documented Hidden state)');
  assert.ok(w.has('injured_human') && !w.destroyed.includes('injured_human'), 'the identity anchor is never destroyed');
  assert.equal(w.moves.length, 0, 'nothing is moved with move_object: the anchor is driven');
  assert.equal(w.objects.ambustretcher7['VAR 2'], 3, 'the stretcher carries the patient');
  assert.equal(w.objects.ambulance1['VAR 2'], 1, 'the rear of the ambulance is open');
  assert.equal(w.record.shelter, 'ambulance1', 'the registry record is sheltered');
  assert.equal(w.record.location, 'ambulance1');
  assert.equal(w.registry.releases, 1, 'the claim on the patient is released');
  assert.equal(w.locals.ambulance_shelter_claimed, 'no');
  assert.equal(w.vars['L:HOLDAMBU'], 0);
  assert.equal(w.threads.length, 1, 'the sampler runs in its own thread (the anchor thread has finished)');
  assert.ok(w.messages.some((m) => /patient moved into the ambulance \(rain or snow\).*rear doors/.test(m)), 'the pilot is told: ' + w.messages.join(' | '));
  assert.equal(w.locals.ambulance_shelter_attempts, 1);
  assert.ok(['start', 'stretcher_to_patient', 'patient_on_stretcher', 'sheltered', 'medic_at_patient'].every((step) => w.trace.some((row) => row.target === step)), 'steps: ' + w.trace.map((row) => row.target).join(','));
  // both the stretcher and the anchor are driven to ambulance1 through the waypoint behind the rear doors
  const stretcher = w.driveLog.find((d) => d.name === 'ambustretcher7');
  const anchor = w.driveLog.find((d) => d.name === 'injured_human');
  assert.deepEqual(stretcher.to.slice(-2), [REAR6, 'ambulance1'], 'the stretcher enters through the rear doors and stops at ambulance1');
  assert.deepEqual(anchor.to.slice(-4), [REAR6, { bearing2: 180, dist: 1, object: 'ambulance1' }, { bearing2: 270, dist: 0.6, object: 'ambulance1' }, 'ambulance1'], 'the anchor ends with a leg toward the right side of the ambulance: perpendicular heading');
  assert.equal(anchor.VAR1, -1, 'the anchor is driven hidden');
  assert.ok(!w.drives.includes('hoist_crew'));
  assert.ok(!w.dispatcherSent && !w.locals.Dispatcher_Messages.length, 'no dispatcher message after the dispatch ended');

  // the same sequence for a 4 and a 5 crew helicopter (the sequence only uses the ambulance, its medic and the patient)
  for (const crew of [4, 5]) {
    const c = world(); c.locals.CREW = crew;
    assert.equal(c.exec('ambulance shelter patient'), 1, `crew ${crew}: state ${c.locals.ambulance_shelter_state} reason ${c.locals.ambulance_shelter_reason}`);
    assert.equal(c.locals.ambulance_shelter_state, 'sheltered', `crew ${crew}`);
    assert.equal(c.record.shelter, 'ambulance1', `crew ${crew}`);
    assert.equal(c.objects.injured_human['VAR 1'], -1, `crew ${crew}`);
  }

  // the dispatcher message comes from the unit, while the dispatch is open
  const open = world(); open.vars['L:DISPATCH_ENDED'] = 0;
  open.exec('ambulance shelter patient');
  assert.equal(open.locals.Dispatcher_Messages.length, 1);
  assert.equal(open.locals.Dispatcher_Messages[0].from, 'AMBULANCE 1', 'a unit speaks for itself');
  assert.match(open.locals.Dispatcher_Messages[0].text, /^Patient sheltered in the ambulance \(rain or snow\)\. HEMS doctor required\.$/);

  // the sampler hides the anchor again when another flow shows it, and logs it
  w.threads.length = 0;
  w.objects.injured_human['VAR 1'] = 1; // another flow wrote VAR 1
  w.horizon = w.time + 6;
  try { w.run(macros['ambulance shelter sampler'], {}); } catch (error) { if (!(error instanceof Stop)) throw error; }
  assert.equal(w.locals.ambulance_shelter_leaks, 1);
  assert.equal(w.objects.injured_human['VAR 1'], -1);
  assert.ok(w.trace.some((row) => row.target === 'anchor_visible'));
}

// ---- 3. every failure goes back to the flow without shelter
const failures = {
  'stretcher_not_at_patient': (x) => { x.registry.crewMove = 0; },
  'claim busy': (x) => { x.registry.claim = 'busy'; },
  'exception': (x) => { x.registry.throwOnDrive = true; },
  'anchor_drive_failed': (x) => { x.registry.throwOnAnchorDrive = true; }
};
for (const [name, mutate] of Object.entries(failures)) {
  const w = world();
  w.objects.injured_human['VAR 1'] = 4; // the patient had VAR 1 4 before
  mutate(w);
  const result = w.exec('ambulance shelter patient');
  assert.equal(result, 0, name);
  assert.equal(w.locals.ambulance_shelter_state, 'aborted', name);
  assert.ok(String(w.locals.ambulance_shelter_reason).startsWith(name.split(' ')[0]), `${name}: ${w.locals.ambulance_shelter_reason}`);
  assert.ok(w.has('injured_human'), `${name}: the patient is still there`);
  if (name !== 'claim busy') assert.equal(w.objects.injured_human['VAR 1'], 4, `${name}: the patient is shown again with its own VAR 1`);
  assert.equal(w.record.shelter, null, `${name}: no shelter record`);
  assert.equal(w.vars['L:HOLDAMBU'], 0, `${name}: HOLDAMBU back to 0`);
  assert.equal(w.locals.ambulance_shelter_claimed, 'no', `${name}: claim released`);
  assert.equal(w.threads.length, 0, `${name}: no sampler`);
  if (name === 'claim busy') assert.equal(w.registry.releases, 0, 'nothing to release when the claim was refused');
  else assert.equal(w.registry.releases, 1, `${name}: the claim is released once`);
}
{
  // a long vehicle stops the stretcher and the anchor far from its centre: the drives are synchronous, so the distance is traced and never aborts the shelter
  const w = world();
  w.distances['ambustretcher7|ambulance1'] = 9;
  w.distances['injured_human|ambulance1'] = 9;
  assert.equal(w.exec('ambulance shelter patient'), 1);
  assert.equal(w.locals.ambulance_shelter_state, 'sheltered');
  assert.ok(w.trace.some((row) => row.target === 'stretcher_after_drive' && /stretcher 9 m and anchor 9 m/.test(String(row.state))), 'the distances are traced');
}
{
  // a condition that stopped holding after the claim aborts before anything moves
  const w = world();
  w.locals.ambulance_shelter_state = 'watching';
  w.locals.LIFESCORE = 30;
  const result = w.exec('ambulance shelter patient');
  assert.equal(result, 0);
  assert.equal(w.locals.ambulance_shelter_state, 'aborted');
  assert.match(w.locals.ambulance_shelter_reason, /^recheck not_movable$/);
  assert.equal(w.moves.length, 0);
  assert.equal(w.drives.length, 0);
}

// ---- 4. release (a ticket asks for the patient): the anchor is driven out through the rear doors, then shown again with its own VAR 1
{
  const w = world();
  w.objects.injured_human['VAR 1'] = 2;
  w.exec('ambulance shelter patient');
  w.driveLog.length = 0;
  assert.equal(w.exec('ambulance shelter release', { reason: 'ticket' }), 1);
  assert.equal(w.locals.ambulance_shelter_state, 'released');
  assert.deepEqual(w.driveLog.map((d) => [d.name, d.to, d.VAR1]), [['injured_human', [REAR6], -1]], 'hidden, out through the rear doors (heading away from the ambulance)');
  assert.equal(w.objects.injured_human['VAR 1'], 2, 'shown again with its own VAR 1');
  assert.equal(w.objects.ambustretcher7['VAR 2'], 1, 'the stretcher is empty again');
  assert.ok(w.has('ambustretcher7'), 'the stretcher stays at the ambulance for the loading flows');
  assert.equal(w.exec('ambulance shelter release', { reason: 'ticket' }), 0, 'idempotent');
  const idle = world();
  assert.equal(idle.exec('ambulance shelter release', { reason: 'recover' }), 0, 'nothing sheltered, nothing released');
  assert.equal(idle.driveLog.length, 0);
  // a drive that fails leaves the patient where it is, visible and traced
  const stuck = world(); stuck.objects.injured_human['VAR 1'] = 2;
  stuck.exec('ambulance shelter patient');
  stuck.registry.throwOnAnchorDrive = true;
  assert.equal(stuck.exec('ambulance shelter release', { reason: 'ticket' }), 1);
  assert.equal(stuck.objects.injured_human['VAR 1'], 2);
  assert.ok(stuck.trace.some((row) => row.target === 'release_drive_failed'));
}

// ---- 4b. the visit goes to the rear doors (crew move, sheltered branch)
{
  const visit = (setup, actor, side) => {
    const w = world();
    w.realCrewMove = true;
    w.objects.hoist_crew = {}; w.objects.pax3 = {};
    w.locals.ambulance_shelter_state = setup;
    const result = w.exec('multipatient registry crew move', { actor, object: 'injured_human', walk: 3, side });
    return { w, result };
  };
  for (const actor of ['hoist_crew', 'pax3', 'ambumedic7']) {
    const { w, result } = visit('sheltered', actor, null);
    assert.equal(result, 1, actor);
    assert.ok(!w.calls.includes('multipatient registry crew drive closest'), actor + ': no drive to a scene corner point (LUP, RUP, RDWN, LDWN) of the normal visit');
    assert.ok(w.calls.includes('ambulance shelter approach') && w.calls.includes('multipatient registry crew drive side'), actor + ': the waypoint behind the rear doors, then the normal side movement (the patient lies across the ambulance, side 90 is the rear doors)');
    assert.deepEqual(w.driveLog.map((d) => [d.name, d.to]), [[actor, [AROUND(actor), REAR6]]], actor + ': around the ambulance, then behind the rear doors');
  }
  {
    // the assistant (side 270) would walk to the cab side of the patient: it stops outside the rear doors instead
    const { w, result } = visit('sheltered', 'pax3', 270);
    assert.equal(result, 1);
    assert.ok(!w.calls.includes('multipatient registry crew drive side'), 'no side movement for the assistant');
    assert.deepEqual(w.driveLog.map((d) => d.to), [[AROUND('pax3'), REAR6], [{ bearing2: 180, dist: 3.5, object: 'ambulance1' }]]);
    assert.deepEqual(w.points, [['pax3', 'ambulance1']], 'it faces the ambulance');
  }
  for (const crew of [4, 5]) {
    for (const side of [null, 270]) {
      const w = world(); w.realCrewMove = true; w.locals.CREW = crew;
      w.objects.hoist_crew = {}; w.objects.pax3 = {}; w.locals.ambulance_shelter_state = 'sheltered';
      assert.equal(w.exec('multipatient registry crew move', { actor: 'pax3', object: 'injured_human', walk: 3, side }), 1, `crew ${crew} side ${side}`);
      const drive = w.driveLog.find((d) => d.name === 'pax3');
      assert.equal(drive.VAR1, 3, `crew ${crew}: pax3 walks as a rear crew member (VAR1 3), never as the pilot (16)`);
      assert.equal(w.objects.pax3['VAR 1'], 1, `crew ${crew}: pax3 ends standing with backpack (VAR 1 1), never the pilot state 14`);
    }
    const h = world(); h.realCrewMove = true; h.locals.CREW = crew; h.objects.hoist_crew = {}; h.locals.ambulance_shelter_state = 'sheltered';
    assert.equal(h.exec('multipatient registry crew move', { actor: 'hoist_crew', object: 'injured_human', walk: 3, side: null }), 1, `crew ${crew} hoist_crew`);
    assert.ok(h.calls.includes('ambulance shelter approach'), `crew ${crew}: the hoist crew goes to the rear doors`);
  }
  for (const state of [null, 'watching', 'released', 'aborted', 'skipped', 'loading']) {
    const { w } = visit(state, 'hoist_crew', null);
    assert.ok(w.calls.includes('multipatient registry crew drive closest') && !w.calls.includes('ambulance shelter approach'), `state ${state}: the normal visit`);
  }
  {
    const { w } = visit('sheltered', 'hoist_crew', null); // another patient object is not the sheltered one
    const other = world(); other.realCrewMove = true; other.objects.hoist_crew = {}; other.objects.injured_human2 = {}; other.locals.ambulance_shelter_state = 'sheltered';
    other.exec('multipatient registry crew move', { actor: 'hoist_crew', object: 'injured_human2', walk: 3, side: null });
    assert.ok(other.calls.includes('multipatient registry crew drive closest') && !other.calls.includes('ambulance shelter approach'), 'only the sheltered patient');
    assert.ok(w);
  }
}

// ---- 5. the monitor
{
  const w = world();
  w.locals.P1_AMBULANCE_DECISION = null; // the ambulance treatment is still going on
  w.threads.length = 0;
  // the decision arrives after 9 s: the monitor shelters the patient
  const original = macros['ambulance shelter conditions'];
  let ticks = 0;
  w.callHook = null;
  const sleepEvery = () => { ticks += 1; if (ticks === 3) w.locals.P1_AMBULANCE_DECISION = 'declined_ground_transport'; };
  const runSleep = w.run.bind(w);
  w.run = function patched(list, p) { for (const c of list) if (c.sleep === 3) sleepEvery(); return runSleep(list, p); };
  w.exec('ambulance shelter monitor');
  assert.equal(w.locals.ambulance_shelter_state, 'sheltered', 'sheltered once the ambulance declines the ground transport: ' + w.locals.ambulance_shelter_reason);
  assert.ok(w.trace.some((row) => row.target === 'wait'), 'the waiting reason is logged');
  assert.equal(w.trace.filter((row) => row.target === 'wait').length, 1, 'the reason is logged only when it changes');
  assert.equal(w.exec('ambulance shelter monitor'), 0, 'a second monitor does nothing');
  assert.equal(original, macros['ambulance shelter conditions']);
}
{
  const w = world();
  w.locals.HELOVICTIMS = 2;
  w.exec('ambulance shelter monitor');
  assert.equal(w.locals.ambulance_shelter_state, 'skipped');
  assert.equal(w.locals.ambulance_shelter_reason, 'multi_patient');
  assert.equal(w.moves.length, 0);
}
{
  const w = world();
  w.locals.P1_AMBULANCE_DECISION = null;
  w.horizon = 100000;
  const runSleep = w.run.bind(w);
  w.run = function patched(list, p) { for (const c of list) if (c.sleep === 3 && w.time > 50) w.objects.hoist_crew = {}; return runSleep(list, p); };
  w.exec('ambulance shelter monitor');
  assert.equal(w.locals.ambulance_shelter_state, 'skipped', 'the helicopter landed before the decision: no shelter');
  assert.equal(w.locals.ambulance_shelter_reason, 'hems_landed');
}
{
  const body = JSON.stringify(macros['ambulance shelter monitor']);
  assert.ok(body.includes('"lt":600') && body.includes('"sleep":3') && body.includes('timeout'), 'every 3 s for at most 30 minutes');
  assert.equal((body.match(/"call_macro":"ambulance shelter patient"/g) || []).length, 1, 'one attempt, no retry');
}

// ---- 6. hooks and invariants
{
  const text = (name) => JSON.stringify(macros[name]);
  assert.ok(text('ambustretcher full').includes('{"create_thread":{"commands":[{"call_macro":"ambulance shelter monitor"}]}}'), 'the monitor starts in the live branch of the ambulance crew');
  const live = collect(macros['ambustretcher full'], (c) => c.if?.local === 'patient_live_mode' && c.eq === 1 && JSON.stringify(c.then).includes('live ground dispatch'));
  assert.equal(live.length, 1);
  assert.equal(live[0].then[0].create_thread.commands[0].call_macro, 'ambulance shelter monitor', 'the monitor starts before the ticket request');
  assert.ok(text('multipatient registry live prepare patient').includes('"call_macro":"ambulance shelter release","params":{"reason":"ticket"}'), 'a ticket releases the shelter');
  assert.ok(macros['multipatient registry live recover worker'][0].call_macro === 'ambulance shelter release', 'the recovery releases the shelter first');
  const dispatch = macros['multipatient registry live ground dispatch'];
  const guard = dispatch.findIndex((c) => c.wait_for?.local === 'ambulance_shelter_state' && c.ne === 'loading');
  assert.ok(guard > 0 && dispatch[guard + 1].call_macro === 'multipatient registry live ensure stretcher', 'the ambulance never loads while the shelter moves the patient');
  assert.equal(macros['multipatient registry live shelter commit'], undefined, 'the old shelter commit (destroyed the anchor) is gone');
  assert.equal(macros['ambulance previsit load'], undefined);
  assert.equal(macros['ambulance previsit monitor'], undefined);
  assert.equal(macros['ambulance previsit doctor enter'], undefined, 'the legacy doctor-enter macro is gone');
  const everything = JSON.stringify(macros);
  for (const legacy of ['ambulance_previsit_active', 'ambulance_previsit_decision', 'ambulance_previsit_monitor', 'ambulance_previsit_patient_loaded', 'ambulance_previsit_roll', 'previsit doctor enter', 'ambulance previsit load', 'set ambulance previsit rules']) assert.ok(!everything.includes(legacy), 'the legacy pre-visit train is gone: ' + legacy);
  // the identity anchor is never destroyed by the shelter macros and is only hidden with VAR 1 -1
  for (const name of ['ambulance shelter patient', 'ambulance shelter abort', 'ambulance shelter release', 'ambulance shelter sampler', 'ambulance shelter monitor', 'ambulance shelter conditions']) {
    assert.ok(!text(name).includes('"destroy_object":"injured_human"'), `${name} never destroys the patient`);
  }
  assert.ok(!collect(macros['ambulance shelter patient'], (c) => c.drive_object && JSON.stringify(c.drive_object).includes('"param"') && JSON.stringify([c.drive_object.name, c.drive_object.VAR1]).includes('param')).length, 'drive_object name and VAR1 are literals');
  // ground offsets use only cardinal bearing2
  const offsets = collect(macros['ambulance shelter patient'], (c) => Object.hasOwn(c, 'bearing2'));
  assert.ok(offsets.length > 0 && offsets.every((c) => [0, 90, 180, 270].includes(c.bearing2)), 'only cardinal bearing2');
  // the shelter point is where live ensure stretcher parks the stretcher (rear, 3 m)
  assert.ok(!text('ambulance shelter patient').includes('move_object') && !text('ambulance shelter patient').includes('shelter_point'), 'the anchor is driven, never moved, and no point 3 m behind the ambulance');
  assert.ok(collect(macros['ambulance shelter patient'], (c) => c.create_thread && JSON.stringify(c.create_thread).includes('"drive_object":{"name":"injured_human"') && JSON.stringify(c.create_thread).includes('"try"')).length === 1, 'the anchor is driven in its own thread, with a try');
  assert.ok(text('multipatient registry crew move').includes('"call_macro":"ambulance shelter approach"'), 'the visit goes to the rear doors of a sheltered patient');
  // every local is reset at the mission start and shown in the Debug Center and the snapshot
  const reset = macros.objective1.filter((c) => c.set?.local?.startsWith('ambulance_shelter_')).map((c) => c.set.local);
  const used = new Set(collect(Object.fromEntries(Object.entries(macros).filter(([name]) => name.startsWith('ambulance shelter'))), (c) => c.local?.startsWith?.('ambulance_shelter_')).map((c) => c.local));
  for (const name of used) assert.ok(reset.includes(name), `${name} is reset at the mission start`);
  const debug = JSON.stringify(macros['debug page']);
  for (const name of ['ambulance_shelter_state', 'ambulance_shelter_reason', 'ambulance_shelter_conds', 'ambulance_shelter_last', 'ambulance_shelter_leaks']) assert.ok(debug.includes(`"local":"${name}"`), `${name} in the Debug Center`);
  const snapshot = JSON.stringify(macros['capture diagnostic snapshot']);
  for (const name of ['ambulance_shelter_state', 'ambulance_shelter_reason', 'ambulance_shelter_conds', 'ambulance_shelter_last', 'ambulance_shelter_attempts', 'ambulance_shelter_leaks']) assert.ok(snapshot.includes(`"local:${name}"`), `${name} in the snapshot`);
}

console.log('Ambulance shelter PASS: conditions in order (one patient, any crew of 3, 4 or 5, accident data, helicopter not landed, ambulance visit done and ground transport declined, movable patient, police, weather limits of the original), physical sequence with the identity anchor kept, abort of every failure, release by a ticket, monitor, hooks and diagnostics. HPG/MSFS PENDING.');
