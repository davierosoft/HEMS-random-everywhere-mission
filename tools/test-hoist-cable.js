#!/usr/bin/env node
'use strict';

// Hoist cable casualties: ground impacts, injury and death of the hoist operator and of the patient on the hook, what the hook does (releases or keeps the person), where they appear,
// the watch and release of an injured operator, the hoist out ladders, the lifecycle of the cable flags, the trace. The production macros run on a small HPG subset interpreter with scripted world answers
// (hook height, reel length, aircraft signals, random draws). HPG/MSFS and the real cable are NOT modeled: runtime behavior stays PENDING in the simulator.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const json = (name) => JSON.stringify(macros[name]);
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

class Returned extends Error { constructor(value) { super('return'); this.value = value; } }
class Stop extends Error {}

class World {
  constructor() {
    this.locals = {};
    this.globals = { HOIST_SAFETY_MONITOR: 'yes' };
    this.vars = {};
    this.objects = { hoist_crew: { COUPLED: 1, 'VAR 1': -1 } };
    this.locations = {};
    this.created = [];
    this.destroyed = [];
    this.messages = [];
    this.trace = [];
    this.calls = [];
    this.stubCalls = [];
    this.threads = [];
    this.triggers = [];
    this.rands = [];
    this.time = 0;
    this.fnValues = { 'hoist_get_distance_from_ground:ft': 0, 'hoist_get_reel_distance:ft': 100, 'hoist_get_distance_from_ground:m': 0, 'hoist_get_reel_distance:m': 30 };
    this.sig = { ax: 0, ay: 32.2, az: 0, gs: 0 };
    this.onSleep = null;
    this.patients = [];
    this.crewScores = { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100 };
    this.stubs = {};
    Object.assign(this.locals, {
      HOIST_OUT: 0, HOIST_CREW_ON_CABLE: 0, HOIST_CABLE_PATIENT: 0, HOIST_CABLE_INJURED: 0, HOIST_CABLE_PHASE: '', HOIST_CABLE_PERSON_TYPE: 'crew', HOIST_CABLE_BUSY: 'no', HOIST_STRESS_ACTIVE: 0,
      HOIST_CABLE_EVENTS: 0, HOIST_CABLE_IMPACTS: 0, HOIST_CABLE_MAX_RATE_FPS: 0, HOIST_CABLE_RELEASES: 0, HOIST_INJURED_WATCH: 0, CREW_FATAL_POSITION_FIXED: 'no', HEMS_PATIENT_NUMBER: 0, LIFESCORE: 70, LIFESCORE2: 70, LIFESCORE3: 70, CREW_FATAL_ON_HOOK: 'no', HELIRESCUER_BOARDED: 0, CREW: 3, CREW_LIFESCORE_2: 100, CREW_LIFESCORE_3: 100, CREW_LIFESCORE_4: 100, CREW_LIFESCORE_5: 100
    });
  }
  has(name) { return Object.hasOwn(this.objects, name); }
  rand() { return this.rands.length ? this.rands.shift() : 99; }
  q(x, p = {}) {
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return x.map((item) => this.q(item, p));
    if (Object.hasOwn(x, 'local')) return this.locals[x.local] ?? null;
    if (Object.hasOwn(x, 'param')) { let v = p[x.param] ?? null; if (x.path) v = v?.[x.path] ?? null; return v; }
    if (Object.hasOwn(x, 'global')) return this.globals[x.global] ?? null;
    if (typeof x.fn === 'string') return this.fnValues[x.fn] ?? 0;
    if (Array.isArray(x.var)) {
      const key = x.var[0];
      if (key === 'GPS GROUND SPEED') return this.sig.gs;
      if (key === 'ACCELERATION BODY X') return this.sig.ax;
      if (key === 'ACCELERATION BODY Y') return this.sig.ay;
      if (key === 'ACCELERATION BODY Z') return this.sig.az;
      return this.vars[key] ?? 0;
    }
    if (Object.hasOwn(x, 'has_object')) return this.has(this.q(x.has_object, p)) ? 1 : 0;
    if (Object.hasOwn(x, 'has_location')) return Object.hasOwn(this.locations, x.has_location) ? 1 : 0;
    if (Object.hasOwn(x, 'object') && typeof x.var === 'string') return this.objects[x.object]?.[x.var] ?? null;
    if (x.require !== undefined) return this.cmp(this.q(x.require, p), x, p);
    if (x.and) return Number(x.and.every((item) => this.q(item, p)));
    if (x.or) return Number(x.or.some((item) => this.q(item, p)));
    if (x.add) return x.add.map((item) => this.q(item, p)).reduce((sum, n) => sum + n, 0);
    if (x.subtract) { const [a, ...rest] = x.subtract.map((item) => this.q(item, p)); return rest.reduce((sum, n) => sum - n, a); }
    if (x.multiply) return x.multiply.map((item) => this.q(item, p)).reduce((product, n) => product * n, 1);
    if (x.divide) { const [a, b] = x.divide.map((item) => this.q(item, p)); return a / b; }
    if (x.clamp) { const [v, lo, hi] = x.clamp.map((item) => this.q(item, p)); return Math.min(hi, Math.max(lo, v)); }
    if (x.floor !== undefined) return Math.floor(this.q(x.floor, p));
    if (x.rand !== undefined) { const [lo, hi] = Array.isArray(x.rand) ? x.rand : [0, x.rand]; return lo + (this.rand() / 100) * (this.q(hi, p) - lo); }
    if (x.text !== undefined) return x.params ? x.text.replace(/\{(\d+)\}/g, (_, n) => String(this.q(x.params[Number(n)], p))) : x.text;
    if (Object.hasOwn(x, 'if')) return this.cmp(this.q(x.if, p), x, p) ? this.q(x.then, p) : this.q(x.else, p);
    if (x.create_struct) return Object.fromEntries(Object.entries(x.create_struct).map(([k, v]) => [k, this.q(v, p)]));
    throw new Error(`Unsupported query ${JSON.stringify(x).slice(0, 140)}`);
  }
  cmp(a, node, p) {
    const op = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].find((key) => Object.hasOwn(node, key));
    assert.ok(op, JSON.stringify(node).slice(0, 140));
    const b = this.q(node[op], p);
    return { eq: a === b, ne: a !== b, gt: a > b, gte: a >= b, lt: a < b, lte: a <= b }[op];
  }
  interpolate(text) { return String(text).replace(/\{local:([A-Za-z0-9_]+)\}/g, (_, name) => this.locals[name]); }
  run(list, p) {
    for (const c of list) {
      if (c['#comment'] !== undefined && Object.keys(c).length === 1) continue;
      if (c.sleep !== undefined) { this.time += Array.isArray(c.sleep) ? c.sleep[0] : c.sleep; if (this.onSleep) this.onSleep(this); if (this.time > (this.horizon ?? 1e9)) throw new Stop(); }
      else if (c.set && c.set.param === 'mutation') { assert.equal(c.value?.function, 'assign'); Object.assign(p[c.value.params[0].param], this.q(c.value.params[1], p)); }
      else if (c.set) {
        const value = this.q(c.value, p);
        if (c.set.local) this.locals[c.set.local] = value;
        else if (c.set.global) this.globals[c.set.global] = value;
        else if (c.set.param) p[c.set.param] = value;
        else if (c.set.object) (this.objects[c.set.object] ??= {})[c.set.var] = value;
        else if (Array.isArray(c.set.var)) this.vars[c.set.var[0]] = value;
        else throw new Error(`Unsupported set ${JSON.stringify(c.set)}`);
      } else if (c.if !== undefined) this.run(this.cmp(this.q(c.if, p), c, p) ? c.then || [] : c.else || [], p);
      else if (c.while !== undefined) { let guard = 0; while (this.cmp(this.q(c.while, p), c, p)) { assert.ok(++guard < 20000, 'loop guard'); this.run(c.do, p); } }
      else if (c.for_each !== undefined) { for (const item of this.q(c.for_each, p)) this.run(c.do, { ...p, $item: item }); }
      else if (c.try) { try { this.run(c.try, p); } catch (error) { if (error instanceof Returned || error instanceof Stop) throw error; this.run(c.catch, { ...p, $ERROR: String(error.message) }); } }
      else if (c.call_macro) this.callMacro(c, p);
      else if (c.create_thread) this.threads.push(c.create_thread.commands);
      else if (Object.hasOwn(c, 'return')) throw new Returned(this.q(c.return, p));
      else if (c.create_location) this.locations[c.create_location] = c.zones;
      else if (c.copy_location) this.locations[c.to] = this.locations[c.copy_location];
      else if (c.create_object) { this.created.push(c.create_object); this.objects[c.create_object.name] = { 'VAR 1': 0 }; }
      else if (c.destroy_object) { this.destroyed.push(c.destroy_object); delete this.objects[c.destroy_object]; }
      else if (c.set_message) this.messages.push(c.set_message.params ? this.q(c.set_message, p) : c.set_message.text);
      else if (c.trigger) this.triggers.push(c.trigger);
      else if (c.hoist_control !== undefined) continue;
      else if (c.wait_for !== undefined || c.or !== undefined || c.and !== undefined) { if (this.strictWaits) this.blockOn(c, p); } // lenient by default: the winch waits are scripted by the world values
      else throw new Error(`Unsupported command ${JSON.stringify(c).slice(0, 140)}`);
    }
  }
  satisfied(c, p) {
    if (c.wait_for !== undefined) return this.cmp(this.q(c.wait_for, p), c, p);
    if (c.or) return c.or.some((item) => this.satisfied(item, p));
    if (c.and) return c.and.every((item) => this.satisfied(item, p));
    throw new Error('Unsupported wait ' + JSON.stringify(c).slice(0, 100));
  }
  blockOn(c, p) {
    let guard = 0;
    while (!this.satisfied(c, p)) {
      assert.ok(++guard < 3000, 'wait would never end: ' + JSON.stringify(c).slice(0, 140));
      this.time += 0.1;
      if (this.onSleep) this.onSleep(this);
    }
  }
  callMacro(c, p) {
    const args = Object.fromEntries(Object.entries(c.params || {}).map(([k, v]) => [k, this.q(v, p)]));
    this.calls.push(c.call_macro);
    let result;
    switch (c.call_macro) {
      case 'ground crew runtime trace': this.trace.push(this.interpolate(args.state)); return;
      case 'apply crew lifescore impact':
        this.stubCalls.push({ macro: c.call_macro, ...args });
        if (this.globals.HOIST_SAFETY_MONITOR === 'yes' && args.score > 0) { const key = `CREW_LIFESCORE_${args.member}`; this.locals[key] = Math.min(100, Math.max(0, this.locals[key] - args.score)); }
        return;
      case 'multipatient registry acceleration impact':
        this.stubCalls.push({ macro: c.call_macro, ...args });
        if (this.stubs.realRegistry) { try { this.run(macros[c.call_macro], { ...args }); } catch (error) { if (!(error instanceof Returned)) throw error; } }
        return;
      case 'multipatient registry summary': case 'multipatient registry physiology update': return;
      case 'start hoist attached risk monitor':
        if (this.stubs.realMonitors) { try { this.run(macros[c.call_macro], { ...args }); } catch (error) { if (!(error instanceof Returned)) throw error; } } else this.stubCalls.push({ macro: c.call_macro, ...args });
        return;
      default:
        assert.ok(macros[c.call_macro], `unknown macro ${c.call_macro}`);
        try { this.run(macros[c.call_macro], { ...args }); result = undefined; } catch (error) { if (!(error instanceof Returned)) throw error; result = error.value; }
    }
    if (c.result !== undefined) p[c.result] = result;
  }
  exec(name, args = {}) { const p = { ...args }; try { this.run(macros[name], p); return undefined; } catch (error) { if (error instanceof Returned) return error.value; throw error; } }
  hvarOffs() { return Object.keys(this.vars).filter((key) => /_OFF$/.test(key) && this.vars[key] === 0).map((key) => key.replace('H:{local:HXX}_SDK_HOIST_OBJ_', '')); }
}
const cableWorld = (locals = {}, fn = {}) => {
  const w = new World();
  Object.assign(w.locals, { HOIST_CREW_ON_CABLE: 1, HOIST_CABLE_PHASE: 'up' }, locals);
  Object.assign(w.fnValues, fn);
  return w;
};
const hvarsTouched = (w) => w.hvarOffs().sort();
const casualty = (w, args) => w.exec('hoist cable casualty', { severity: 1, score: 8, cause: 'TEST', source: 'impact', ...args });
const AIR = { 'hoist_get_distance_from_ground:ft': 60 };
const userPosition = (w) => w.locations.crew_fatal_position?.[0]?.zone?.location;

// ---- 1. gate and lock
{
  const w = cableWorld();
  w.globals.HOIST_SAFETY_MONITOR = 'no';
  assert.equal(casualty(w, { severity: 3, score: 100 }), 0);
  assert.equal(w.stubCalls.length, 0, 'the crew health setting off must not hurt anybody');
  const busy = cableWorld({ HOIST_CABLE_BUSY: 'yes' });
  assert.equal(casualty(busy, { severity: 3, score: 100 }), 0);
  const nobody = cableWorld({ HOIST_CREW_ON_CABLE: 0 });
  assert.equal(casualty(nobody, { severity: 3, score: 100 }), 1);
  assert.equal(nobody.stubCalls.length, 0, 'nobody on the cable: nothing to hurt');
  assert.equal(nobody.locals.HOIST_CABLE_BUSY, 'no', 'the lock is released');
}

// ---- 2. injury of the operator keeps at least 20; below the floor nothing is applied
{
  const w = cableWorld({ HOIST_CABLE_PHASE: 'up' }, AIR);
  w.locals.CREW_LIFESCORE_2 = 100;
  casualty(w, { severity: 1, score: 8 });
  assert.equal(w.locals.CREW_LIFESCORE_2, 92);
  const low = cableWorld({ HOIST_CABLE_PHASE: 'up' }, AIR);
  low.locals.CREW_LIFESCORE_2 = 25;
  casualty(low, { severity: 2, score: 30 }); // r2 = 99: no fatal roll
  assert.equal(low.locals.CREW_LIFESCORE_2, 20, 'an injury that is not fatal never leaves less than 20');
  const at20 = cableWorld({ HOIST_CABLE_PHASE: 'up' }, AIR);
  at20.locals.CREW_LIFESCORE_2 = 20;
  casualty(at20, { severity: 2, score: 30 });
  assert.equal(at20.locals.CREW_LIFESCORE_2, 20);
  assert.equal(at20.stubCalls.filter((call) => call.macro === 'apply crew lifescore impact').length, 0, 'at the floor no impact is applied at all');
  const rescuer = cableWorld({ HOIST_CABLE_PERSON_TYPE: 'helirescuer', HELIRESCUER_BOARDED: 2 }, AIR);
  casualty(rescuer, { severity: 1, score: 8 });
  assert.equal(rescuer.locals.CREW_LIFESCORE_5, 92);
  const rescuer4 = cableWorld({ HOIST_CABLE_PERSON_TYPE: 'helirescuer', HELIRESCUER_BOARDED: 1 }, AIR);
  casualty(rescuer4, { severity: 1, score: 8 });
  assert.equal(rescuer4.locals.CREW_LIFESCORE_4, 92);
  // the hoisted medic (pax6) is member 2 with every crew size, never the copilot; a rescuer is the member after the regular crew
  assert.equal(w.locals.CREW_LIFESCORE_3, 100, 'the copilot is not on the cable');
  const five = cableWorld({ CREW: 5 }, AIR);
  casualty(five, { severity: 1, score: 8 });
  assert.equal(five.locals.CREW_LIFESCORE_2, 92, 'the medic is member 2 with every crew size');
  assert.equal(five.locals.CREW_LIFESCORE_5, 100);
  assert.equal(five.locals.CREW_LIFESCORE_3, 100);
  const second = cableWorld({ CREW: 5, HOIST_CABLE_MEMBER: 4, HOIST_CABLE_OBJECT: 'hpax1' }, AIR);
  casualty(second, { severity: 1, score: 8 });
  assert.equal(second.locals.CREW_LIFESCORE_4, 92, 'the second operator on the hook is member 4 (the person of PAX_1)');
  assert.equal(second.locals.CREW_LIFESCORE_2, 100, 'the medic is not touched');
  assert.equal(second.locals.CREW_IMPACT_OBJECT, 'hpax1', 'and its actor is hpax1');
  const medicOn = cableWorld({ CREW: 5, HOIST_CABLE_MEMBER: 2, HOIST_CABLE_OBJECT: 'hoist_crew' }, AIR);
  casualty(medicOn, { severity: 1, score: 8 });
  assert.equal(medicOn.locals.CREW_LIFESCORE_2, 92);
  assert.equal(medicOn.locals.CREW_IMPACT_OBJECT, 'hoist_crew');
  const rescuerStale = cableWorld({ CREW: 3, HOIST_CABLE_PERSON_TYPE: 'helirescuer', HELIRESCUER_BOARDED: 1, HOIST_CABLE_MEMBER: 2, HOIST_CABLE_OBJECT: 'hpax1' }, AIR);
  casualty(rescuerStale, { severity: 1, score: 8 });
  assert.equal(rescuerStale.locals.CREW_LIFESCORE_4, 92, 'a heli rescuer ignores the member left by the last crew descent');
  const four = cableWorld({ CREW: 4, HOIST_CABLE_PERSON_TYPE: 'helirescuer', HELIRESCUER_BOARDED: 1 }, AIR);
  casualty(four, { severity: 1, score: 8 });
  assert.equal(four.locals.CREW_LIFESCORE_5, 92, 'with four crew the first rescuer is member 5');
  assert.equal(four.locals.CREW_LIFESCORE_4, 100, 'the rear crew member HEMS 1 is untouched');
}

// ---- 3. the injured operator of a descent is watched for the release; one hurt on the way up is not
{
  const down = cableWorld({ HOIST_CABLE_PHASE: 'down' }, { 'hoist_get_distance_from_ground:ft': 2 });
  casualty(down, { severity: 1, score: 8 });
  assert.equal(down.locals.HOIST_CABLE_INJURED, 1);
  assert.equal(down.locals.HOIST_INJURED_WATCH, 1);
  assert.equal(down.threads.length, 1, 'one watch thread');
  assert.equal(JSON.stringify(down.threads[0]), JSON.stringify([{ call_macro: 'hoist cable injured watch' }]));
  casualty(down, { severity: 1, score: 8 }); // busy lock released, second event
  assert.equal(down.threads.length, 1, 'a running watch is not started twice');
  const up = cableWorld({ HOIST_CABLE_PHASE: 'up' }, { 'hoist_get_distance_from_ground:ft': 2 });
  casualty(up, { severity: 1, score: 8 });
  assert.equal(up.locals.HOIST_CABLE_INJURED, 0, 'a person on the way up keeps rising with the cable: there is nothing to release');
  assert.equal(up.threads.length, 0);
}

// ---- 4. fatal at the ground: the hook releases the operator, who appears where the user aircraft is now
{
  const w = cableWorld({ HOIST_CABLE_PHASE: 'down' }, { 'hoist_get_distance_from_ground:ft': 0.5 });
  casualty(w, { severity: 3, score: 100, detach: 'yes', text: 'Fatal impact.' });
  assert.equal(w.locals.CREW_LIFESCORE_2, 0);
  assert.deepEqual(hvarsTouched(w), ['HUMAN_1_BAG_OFF', 'HUMAN_1_OFF']);
  assert.equal(w.locals.CREW_FATAL_ON_HOOK, 'no');
  assert.equal(w.locals.HOIST_CREW_ON_CABLE, 0);
  assert.equal(userPosition(w).object, '$USER', 'the dead operator appears at the user aircraft');
  assert.equal(w.locals.CREW_FATAL_POSITION_FIXED, 'yes', 'replace deceased crew object must keep this position');
  assert.equal(w.messages[0], 'Fatal impact.');
  assert.ok(w.messages.some((m) => /Hook released/.test(m)));
  assert.equal(w.locals.HOIST_CABLE_EVENTS, 1);
  assert.ok(w.trace.some((row) => /^casualty src=impact sev=3/.test(row)));
  assert.ok(w.trace.some((row) => /^fall_position/.test(row)));
  assert.ok(w.trace.some((row) => /^operator_lost detach=1/.test(row)));
}

// ---- 5. fatal in the air: the hook releases in 60 percent of the cases (the draw), otherwise the operator stays on the hook and no dead asset is left on the ground
{
  const released = cableWorld({ HOIST_CABLE_PHASE: 'up' }, AIR);
  released.objects = {};
  released.rands = [10]; // detach roll under 60
  casualty(released, { severity: 3, score: 100, source: 'test' });
  assert.equal(released.locals.CREW_LIFESCORE_2, 0);
  assert.deepEqual(hvarsTouched(released), ['HUMAN_1_BAG_OFF', 'HUMAN_1_OFF']);
  assert.equal(userPosition(released).object, '$USER');
  const kept = cableWorld({ HOIST_CABLE_PHASE: 'up' }, AIR);
  kept.objects = {};
  kept.rands = [80];
  casualty(kept, { severity: 3, score: 100, source: 'test' });
  assert.equal(kept.locals.CREW_LIFESCORE_2, 0, 'the operator is dead either way');
  assert.equal(kept.locals.CREW_FATAL_ON_HOOK, 'yes');
  assert.deepEqual(hvarsTouched(kept), [], 'the cable objects stay: the dead is brought aboard with the cable');
  assert.equal(kept.locals.HOIST_CREW_ON_CABLE, 1);
  assert.equal(kept.locals.CREW_FATAL_POSITION_FIXED ?? 'no', 'no');
  assert.ok(kept.messages.some((m) => /Bring him aboard/.test(m)));
  // replace deceased crew object: no dead asset while the operator is on the hook; the position of the release is kept; the flag is consumed
  const replace = macros['replace deceased crew object'];
  const branch = replace.find((c) => c.if && c.if.local === 'CREW_IMPACT_OBJECT' && c.eq === 'hoist_crew');
  assert.equal(branch.then[1].if.local, 'CREW_FATAL_ON_HOOK');
  assert.equal(branch.then[1].ne, 'yes');
  const onHook = new World();
  Object.assign(onHook.locals, { CREW_IMPACT_OBJECT: 'hoist_crew', CREW_FATAL_ON_HOOK: 'yes' });
  onHook.exec('replace deceased crew object');
  assert.equal(onHook.created.length, 0, 'no dead asset for an operator that stays on the hook');
  const fixed = new World();
  Object.assign(fixed.locals, { CREW_IMPACT_OBJECT: 'hoist_crew', CREW_FATAL_ON_HOOK: 'no', CREW_FATAL_POSITION_FIXED: 'yes' });
  fixed.locations.crew_fatal_position = 'AT_USER';
  fixed.exec('replace deceased crew object');
  assert.equal(fixed.locations.crew_fatal_position, 'AT_USER', 'the position of the release is kept, not taken from the coupled hoist_crew');
  assert.equal(fixed.created.length, 1);
  assert.equal(fixed.created[0].name, 'hoist_crew');
  assert.equal(fixed.locals.CREW_FATAL_POSITION_FIXED, 'no', 'the flag is consumed');
  const ordinary = new World();
  Object.assign(ordinary.locals, { CREW_IMPACT_OBJECT: 'hoist_crew', CREW_FATAL_ON_HOOK: 'no', CREW_FATAL_POSITION_FIXED: 'no' });
  ordinary.locations.crew_fatal_position = 'OLD';
  ordinary.exec('replace deceased crew object');
  assert.equal(ordinary.locations.crew_fatal_position[0].zone.location.object, 'hoist_crew', 'any other crew death keeps taking the position of the object');
}

// ---- 5b. two people that let go at different times appear at the aircraft position of each moment
{
  const w = cableWorld({ HOIST_CABLE_PHASE: 'up', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1 }, AIR);
  w.objects = {};
  w.exec('hoist cable fall position');
  const first = JSON.stringify(w.locations.crew_fatal_position);
  w.exec('hoist cable fall position');
  assert.equal(w.trace.filter((row) => /^fall_position/.test(row)).length, 2, 'the position is taken again at every release');
  assert.equal(first, JSON.stringify(w.locations.crew_fatal_position));
  assert.equal(JSON.stringify(macros['hoist cable fall position']).includes('hoist_hook_spot'), false, 'no stored hook point any more');
}

// ---- 6. serious: the operator dies in 25 percent (draw under 25), the patient in 45
{
  const dies = cableWorld({ HOIST_CABLE_PHASE: 'up' }, AIR);
  dies.objects = {};
  dies.rands = [99, 10]; // detach roll 99 (the hook keeps him), operator roll 10
  casualty(dies, { severity: 2, score: 35, source: 'test' });
  assert.equal(dies.locals.CREW_LIFESCORE_2, 0);
  const lives = cableWorld({ HOIST_CABLE_PHASE: 'up' }, AIR);
  lives.objects = {};
  lives.rands = [99, 30];
  casualty(lives, { severity: 2, score: 35, source: 'test' });
  assert.equal(lives.locals.CREW_LIFESCORE_2, 65, 'a serious injury that is not fatal costs the damage');
}

// ---- 7. the patient on the hook: damage through the registry, the lost patient is the injured packed in the stretcher, subject filter
{
  const hurt = cableWorld({ HOIST_CABLE_PHASE: 'up', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 2 }, AIR);
  casualty(hurt, { severity: 1, score: 8, source: 'test' });
  const impact = hurt.stubCalls.find((call) => call.macro === 'multipatient registry acceleration impact');
  assert.equal(impact.damage, 12, 'the patient takes 1.5 times the damage');
  assert.equal(impact.slot, 2, 'the registry slot of the HEMS patient');
  assert.equal(hurt.locals.CREW_LIFESCORE_2, 92, 'the operator takes the damage too');
  const only = cableWorld({ HOIST_CABLE_PHASE: 'up', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1 }, AIR);
  casualty(only, { severity: 1, score: 8, source: 'test', subject: 'operator' });
  assert.equal(only.stubCalls.some((call) => call.macro === 'multipatient registry acceleration impact'), false, 'subject operator leaves the patient alone');
  const patientOnly = cableWorld({ HOIST_CABLE_PHASE: 'up', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1 }, AIR);
  casualty(patientOnly, { severity: 1, score: 8, source: 'test', subject: 'patient' });
  assert.equal(patientOnly.locals.CREW_LIFESCORE_2, 100, 'subject patient leaves the operator alone');
  const floor = cableWorld({ HOIST_CABLE_PHASE: 'up', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1, LIFESCORE: 14 }, AIR);
  casualty(floor, { severity: 1, score: 20, source: 'test', subject: 'patient' });
  assert.equal(floor.stubCalls.find((call) => call.macro === 'multipatient registry acceleration impact').damage, 4, 'the patient floor is 10: a LifeScore of 14 takes 4 only');
  const lost = cableWorld({ HOIST_CABLE_PHASE: 'up', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1 }, AIR);
  lost.objects = {};
  lost.rands = [10];
  casualty(lost, { severity: 3, score: 100, source: 'test', subject: 'patient', cause: 'FATAL HOIST OPERATOR GROUND IMPACT' });
  const death = lost.stubCalls.find((call) => call.macro === 'multipatient registry acceleration impact');
  assert.equal(death.damage, 100);
  assert.equal(death.cause, 'FATAL HOIST OPERATOR GROUND IMPACT');
  assert.ok(lost.hvarOffs().includes('STRETCHER_OFF'));
  assert.equal(lost.created.at(-1).name, 'hoist_lost_patient');
  assert.equal(lost.created.at(-1).title, 'Airbus H145 Injured Human', 'the injured, not a dead asset');
  assert.equal(lost.created.at(-1).location, 'crew_fatal_position');
  assert.equal(lost.objects.hoist_lost_patient['VAR 1'], 1, 'packed in the hoistable stretcher (Injured Human VAR 1 1)');
  assert.equal(userPosition(lost).object, '$USER');
  assert.equal(lost.locals.HOIST_CABLE_PATIENT, 0);
  const kept = cableWorld({ HOIST_CABLE_PHASE: 'up', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1 }, AIR);
  kept.objects = {};
  kept.rands = [80];
  casualty(kept, { severity: 3, score: 100, source: 'test', subject: 'patient' });
  assert.equal(kept.stubCalls.filter((call) => call.macro === 'multipatient registry acceleration impact')[0].damage, 100);
  assert.equal(kept.hvarOffs().includes('STRETCHER_OFF'), false, 'a patient that stays on the hook is brought aboard with it');
  assert.equal(kept.created.length, 0);
  // the operator and the patient let go at different times: two draws, two positions taken at their own moment
  const apart = cableWorld({ HOIST_CABLE_PHASE: 'up', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1 }, AIR);
  apart.objects = {};
  apart.rands = [10, 99, 99];
  casualty(apart, { severity: 3, score: 100, source: 'test' });
  assert.equal(apart.trace.filter((row) => /^fall_position/.test(row)).length, 2, 'one position for the operator, one for the patient');
}

// ---- 8. hoist out (flight with the casualty): both are on the hook, the messages of the original ladders are not doubled
{
  const w = new World();
  Object.assign(w.locals, { HOIST_OUT: 1, HOIST_CABLE_PHASE: 'out', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1 });
  w.objects = {};
  casualty(w, { severity: 3, score: 100, subject: 'both', source: 'hoist_out', detach: 'yes', cause: 'HOIST LOSS (HIGH SPEED)' });
  assert.equal(w.locals.CREW_LIFESCORE_2, 0);
  assert.ok(w.stubCalls.some((call) => call.macro === 'multipatient registry acceleration impact' && call.damage === 100));
  assert.deepEqual(hvarsTouched(w), ['HUMAN_1_BAG_OFF', 'HUMAN_1_OFF', 'STRETCHER_OFF']);
  assert.equal(w.messages.length, 0, 'the hoist out ladders print their own messages');
  assert.equal(userPosition(w).object, '$USER', 'a fall in flight lands where the aircraft is');
  assert.equal(w.created.at(-1).name, 'hoist_lost_patient');
  const trouble = new World();
  Object.assign(trouble.locals, { HOIST_OUT: 1, HOIST_CABLE_PHASE: 'out', HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1 });
  casualty(trouble, { severity: 1, score: 45, subject: 'operator', source: 'hoist_out', cause: 'HOIST CABLE STRESS' });
  assert.equal(trouble.locals.CREW_LIFESCORE_2, 55);
  assert.equal(trouble.locals.HOIST_CABLE_INJURED, 0, 'with the hoist out nobody is released at the ground');
}

// ---- 9. the ground impact monitor (measured descent rate of the hook): three tiers through the casualty, one thread per cable trip, every touch down traced
const impactRun = (rateFtPerTick, extra = {}) => {
  const w = cableWorld({ HOIST_CABLE_PHASE: 'down', ...extra }, { 'hoist_get_distance_from_ground:ft': 14, 'hoist_get_reel_distance:ft': 100 });
  w.stubs.realMonitors = true;
  w.strictWaits = true;
  w.exec('start hoist attached risk monitor');
  assert.equal(w.threads.length, 1, 'one impact thread (no stress thread: the temporary hoist has no acceleration model)');
  const thread = w.threads.shift();
  let tick = 0;
  w.onSleep = (world) => {
    tick += 1;
    world.fnValues['hoist_get_distance_from_ground:ft'] = Math.max(0.3, 14 - rateFtPerTick * tick);
    if (tick >= 40) world.locals.HOIST_CREW_ON_CABLE = 0;
  };
  w.run(thread, {});
  return w;
};
{
  const guard = new World();
  guard.stubs.realMonitors = true;
  guard.locals.HOIST_ATTACHED_ACTIVE = 1;
  guard.exec('start hoist attached risk monitor');
  assert.equal(guard.threads.length, 0, 'a running monitor is not started twice');
  const off = new World();
  off.globals.HOIST_SAFETY_MONITOR = 'no';
  off.exec('start hoist attached risk monitor');
  assert.equal(off.threads.length, 0, 'no monitor with the crew health simulation off');

  const soft = impactRun(0.45); // 3 ft/s: no impact
  assert.equal(soft.locals.HOIST_CABLE_EVENTS, 0);
  assert.equal(soft.locals.HOIST_CABLE_IMPACTS, 0);
  assert.ok(soft.trace.some((row) => /^impact_touch rate=(2\.9|3)/.test(row)), 'a touch down without damage is traced too');
  assert.ok(soft.trace.some((row) => /^impact_monitor_start/.test(row)) && soft.trace.some((row) => /^impact_monitor_end/.test(row)));
  const normal = impactRun(0.86); // 5.7 ft/s: the descent rate of the 169.31 test that hurt the medic
  assert.equal(normal.locals.HOIST_CABLE_EVENTS, 0, 'a normal descent of the hook costs nothing');
  assert.equal(normal.locals.CREW_LIFESCORE_2, 100);
  assert.ok(Math.abs(normal.locals.HOIST_CABLE_MAX_RATE_FPS - 5.73) < 0.05, 'the rate is still kept and traced');
  const abrupt = impactRun(1.35); // 9 ft/s
  assert.equal(abrupt.locals.HOIST_CABLE_EVENTS, 1);
  assert.equal(abrupt.locals.CREW_LIFESCORE_2, 92);
  assert.equal(abrupt.locals.HOIST_CABLE_IMPACTS, 1);
  assert.ok(Math.abs(abrupt.locals.HOIST_CABLE_MAX_RATE_FPS - 9) < 0.01, 'the highest descent rate of the trip is kept');
  assert.ok(abrupt.messages.some((m) => /touched down abruptly/.test(m)));
  const hard = impactRun(1.95); // 13 ft/s
  assert.equal(hard.locals.CREW_LIFESCORE_2, 70);
  assert.equal(hard.locals.HOIST_CABLE_INJURED, 1, 'hurt on the way down: the watch for the release starts');
  assert.ok(hard.threads.some((thread) => JSON.stringify(thread).includes('hoist cable injured watch')));
  const fatal = impactRun(3.5); // 21 ft/s on the last step, which ends at the ground
  assert.equal(fatal.locals.CREW_LIFESCORE_2, 0);
  assert.deepEqual(hvarsTouched(fatal), ['HUMAN_1_BAG_OFF', 'HUMAN_1_OFF'], 'at the ground the hook always releases the dead operator');
  assert.equal(fatal.locals.CREW_FATAL_ON_HOOK, 'no');
  assert.equal(fatal.locals.HOIST_ATTACHED_ACTIVE, 0, 'the thread ends and can be started again');
  const both = impactRun(1.95, { HOIST_CABLE_PATIENT: 1, HEMS_PATIENT_NUMBER: 1 });
  assert.equal(both.stubCalls.find((call) => call.macro === 'multipatient registry acceleration impact').damage, 45, 'the patient on the hook takes the impact too');
}

// ---- 10. an operator hurt on the way down is released when the hook rests at the same height on the ground; the watch is traced
const runWatch = (w, script, ticks) => {
  let tick = 0;
  w.locals.HOIST_INJURED_WATCH = 1;
  w.onSleep = (world) => { tick += 1; script?.(tick, world); if (tick >= ticks) world.locals.HOIST_CREW_ON_CABLE = 0; };
  w.exec('hoist cable injured watch');
};
{
  const w = cableWorld({ HOIST_CABLE_PHASE: 'down', HOIST_CABLE_INJURED: 1 }, { 'hoist_get_distance_from_ground:ft': 3, 'hoist_get_reel_distance:ft': 100 });
  w.objects.hoist_crew = { COUPLED: 1, 'VAR 1': -1 };
  runWatch(w, null, 40);
  assert.equal(w.locals.HOIST_CABLE_INJURED, 0, 'released');
  assert.equal(w.locals.HOIST_CABLE_RELEASES, 1);
  assert.deepEqual(hvarsTouched(w), ['HUMAN_1_BAG_OFF', 'HUMAN_1_OFF']);
  assert.equal(w.objects.hoist_crew.COUPLED, 0);
  assert.equal(w.objects.hoist_crew['VAR 1'], 1, 'the operator stands (standing with the backpack)');
  assert.ok(w.messages.some((m) => /released on the ground/.test(m)));
  for (const pattern of [/^injured_watch_start/, /^injured_watch_rest/, /^injured_released/]) assert.ok(w.trace.some((row) => pattern.test(row)), String(pattern));
  assert.equal(w.locals.HOIST_INJURED_WATCH, 0, 'the watch ends');
  // while the hook keeps moving he is not released
  const moving = cableWorld({ HOIST_CABLE_PHASE: 'down', HOIST_CABLE_INJURED: 1 }, { 'hoist_get_reel_distance:ft': 100 });
  runWatch(moving, (tick, world) => { world.fnValues['hoist_get_distance_from_ground:ft'] = 5 - (tick % 2) * 3; }, 40);
  assert.equal(moving.hvarOffs().length, 0);
  assert.ok(moving.trace.some((row) => /^injured_watch_end person gone/.test(row)));
  // too high: not released
  const high = cableWorld({ HOIST_CABLE_PHASE: 'down', HOIST_CABLE_INJURED: 1 }, { 'hoist_get_distance_from_ground:ft': 30, 'hoist_get_reel_distance:ft': 100 });
  runWatch(high, null, 40);
  assert.equal(high.hvarOffs().length, 0);
  // the watch gives up after 2 minutes
  const long = cableWorld({ HOIST_CABLE_PHASE: 'down', HOIST_CABLE_INJURED: 1 }, { 'hoist_get_distance_from_ground:ft': 30, 'hoist_get_reel_distance:ft': 100 });
  runWatch(long, null, 100000);
  assert.ok(long.trace.some((row) => /^injured_watch_end timeout/.test(row)));
  assert.equal(long.locals.HOIST_CABLE_INJURED, 0);
  // a heli rescuer is released without touching hoist_crew
  const rescuer = cableWorld({ HOIST_CABLE_PHASE: 'down', HOIST_CABLE_INJURED: 1, HOIST_CABLE_PERSON_TYPE: 'helirescuer' }, { 'hoist_get_distance_from_ground:ft': 3, 'hoist_get_reel_distance:ft': 100 });
  runWatch(rescuer, null, 40);
  assert.equal(rescuer.locals.HOIST_CABLE_INJURED, 0);
  assert.equal(rescuer.objects.hoist_crew.COUPLED, 1, 'a heli rescuer is not hoist_crew');
  assert.deepEqual(hvarsTouched(rescuer), ['HUMAN_1_BAG_OFF', 'HUMAN_1_OFF']);
}

// ---- 11. the cable flags belong to the callers that put a person on the hook; every step is traced
{
  const person = new World();
  person.exec('hoist down', { person: 1, person_type: 'helirescuer' });
  assert.equal(person.locals.HOIST_CREW_ON_CABLE, 1);
  assert.equal(person.locals.HOIST_CABLE_PERSON_TYPE, 'helirescuer');
  assert.equal(person.locals.HOIST_CABLE_PHASE, 'ground');
  assert.ok(person.stubCalls.some((call) => call.macro === 'start hoist attached risk monitor'));
  assert.ok(person.trace.some((row) => /^person_on type=helirescuer/.test(row)) && person.trace.some((row) => /^hook_at_ground/.test(row)));
  const empty = new World();
  empty.exec('hoist down');
  assert.equal(empty.locals.HOIST_CREW_ON_CABLE, 0, 'an empty hook that goes down to pick people up has nobody on the cable');
  assert.equal(empty.stubCalls.length, 0);
  const up = new World();
  up.exec('hoist up 1 operator');
  assert.equal(up.locals.HOIST_CREW_ON_CABLE, 0);
  assert.equal(up.locals.HOIST_CABLE_PHASE, '');
  assert.ok(up.trace.some((row) => /^up_start/.test(row)) && up.trace.some((row) => /^up_end/.test(row)));
  const withPatient = new World();
  withPatient.exec('hoist up operator+injured');
  assert.equal(withPatient.locals.HOIST_CABLE_PATIENT, 0, 'with the persons aboard the patient flag is cleared');
  assert.ok(withPatient.trace.some((row) => /^up_start .*patient=1/.test(row)) && withPatient.trace.some((row) => /^up_end/.test(row)));
  const out = new World();
  out.locals.HOIST_OUT = 1;
  out.exec('hoist up operator+injured');
  assert.equal(out.locals.HOIST_CABLE_PATIENT, 1, 'with the hoist out the patient stays on the hook');
  assert.equal(out.locals.HOIST_CABLE_PHASE, 'out');
  const released = new World();
  released.locals.HOIST_CREW_ON_CABLE = 1;
  released.exec('hoist cable person released');
  assert.equal(released.locals.HOIST_CREW_ON_CABLE, 0);
  assert.ok(released.trace.some((row) => /^person_released/.test(row)));
  const reset = new World();
  Object.assign(reset.locals, { HOIST_CREW_ON_CABLE: 1, HOIST_CABLE_PATIENT: 1, HOIST_CABLE_INJURED: 1, HOIST_CABLE_PHASE: 'up', HOIST_CABLE_BUSY: 'yes', CREW_FATAL_ON_HOOK: 'yes', CREW_FATAL_POSITION_FIXED: 'yes', HOIST_CABLE_EVENTS: 4, HOIST_INJURED_WATCH: 1 });
  reset.exec('hoist cable reset');
  assert.deepEqual([reset.locals.HOIST_CREW_ON_CABLE, reset.locals.HOIST_CABLE_PATIENT, reset.locals.HOIST_CABLE_INJURED, reset.locals.HOIST_CABLE_PHASE, reset.locals.HOIST_CABLE_BUSY, reset.locals.CREW_FATAL_ON_HOOK, reset.locals.CREW_FATAL_POSITION_FIXED, reset.locals.HOIST_CABLE_EVENTS, reset.locals.HOIST_INJURED_WATCH], [0, 0, 0, '', 'no', 'no', 'no', 0, 0]);
  const tracer = new World();
  tracer.exec('hoist cable trace', { state: 'ladder_notice test' });
  assert.deepEqual(tracer.trace, ['ladder_notice test']);
}

// ---- 12. the registry impact reaches the HEMS patient on the cable (any transport state of that slot), the loaded patients as before
{
  const registry = (patients, args) => {
    const w = new World();
    w.stubs.realRegistry = true;
    w.locals.patients = patients;
    w.exec('multipatient registry acceleration impact', args);
    return w;
  };
  const record = (slot, state, life) => ({ slot, active: 1, death_recorded: 0, transport_state: state, lifescore: life, medical: { SPO2: 95, BPM: 80, BP_SYS: 120, RR: 16, GCS_EYE: 4, GCS_VERBAL: 5, GCS_MOTOR: 6 } });
  const loadedOnly = registry([record(1, 'loaded', 60), record(2, 'loading', 60)], { damage: 20 });
  assert.equal(loadedOnly.locals.patients[0].lifescore, 40, 'the loaded patient takes the impact as before');
  assert.equal(loadedOnly.locals.patients[1].lifescore, 60, 'a patient that is not loaded does not');
  const bySlot = registry([record(1, 'loaded', 60), record(2, 'loading', 60)], { damage: 20, slot: 2, cause: 'FATAL HOIST OPERATOR GROUND IMPACT' });
  assert.equal(bySlot.locals.patients[1].lifescore, 40, 'the slot of the patient on the hook takes it whatever its state');
  assert.equal(bySlot.locals.LIFESCORE2, 40, 'and the local score, which the physiology pump copies to the registry');
  const death = registry([record(1, 'loading', 20)], { damage: 100, slot: 1, cause: 'FATAL HOIST OPERATOR GROUND IMPACT' });
  assert.equal(death.locals.patients[0].lifescore, 0);
  assert.equal(death.locals.PATIENT_DEATH_CAUSE, 'FATAL HOIST OPERATOR GROUND IMPACT');
  const piloting = registry([record(1, 'loaded', 20)], { damage: 100 });
  assert.equal(piloting.locals.PATIENT_DEATH_CAUSE, 'PILOTING (IMPACT DAMAGE)', 'the crash path keeps its death cause');
}

// ---- 13. structure: callers, ladders, resets, diagnostics
{
  const calls = (name, predicate) => collect(macros[name], (node) => predicate(node));
  for (const [name, count] of [['HOISTING', 2], ['hoist heli rescuer down', 1], ['drop heli rescuer hoist', 2]]) {
    const downs = calls(name, (node) => node.call_macro === 'hoist down');
    assert.equal(downs.length, count, name);
    assert.ok(downs.every((node) => node.params?.person === 1 && ['crew', 'helirescuer'].includes(node.params.person_type)), `${name}: every descent says who rides the hook`);
    assert.equal(calls(name, (node) => node.call_macro === 'hoist cable person released').length, count, `${name}: the person is released from the cable flag after the hook let him go`);
  }
  assert.ok(collect(macros.HOISTING, (node) => node.call_macro === 'hoist down').every((node) => node.params.person_type === 'crew'));
  {
    // who is lowered: the second operator (member 4, hpax1) first, the medic (member 2, hoist_crew) second; the same order going up
    const downs = collect(macros.HOISTING, (node) => node.call_macro === 'hoist down');
    assert.deepEqual(downs.map((n) => [n.params.member, n.params.object]), [[4, 'hpax1'], [2, 'hoist_crew']]);
    const ups = collect(macros['Hoisting back up'], (node) => node.call_macro === 'hoist up 1 operator');
    assert.deepEqual(ups.map((n) => [n.params.member, n.params.object]), [[4, 'hpax1'], [2, 'hoist_crew']]);
    assert.ok(/"call_macro":"hoist up operator\+injured"/.test(JSON.stringify(macros['Hoisting back up'])) && json('hoist up operator+injured').includes('"local":"HOIST_CABLE_MEMBER"'), 'the medic goes up with the patient');
    const dead = macros['replace deceased crew object'].find((c) => c.if && c.eq === 'hpax1');
    assert.ok(dead && JSON.stringify(dead).includes('CREW_FATAL_ON_HOOK') && JSON.stringify(dead).includes('deadmen'), 'the dead second operator is replaced like the medic');
  }
  assert.ok(collect(macros['hoist heli rescuer down'], (node) => node.call_macro === 'hoist down').every((node) => node.params.person_type === 'helirescuer'));
  for (const name of ['Hoisting back up', 'pick heli rescuer hoist', 'hoist heli rescuer up']) {
    assert.ok(calls(name, (node) => node.call_macro === 'hoist down').every((node) => node.params === undefined), `${name}: the hook is empty on the way down`);
  }
  // the three hoist out ladders (speed, bank, load) keep the original thresholds and feed the casualty; their notices are traced
  const both = calls('Hoisting back up', (node) => node.call_macro === 'hoist cable casualty' && node.params.subject === 'both');
  const patient = calls('Hoisting back up', (node) => node.call_macro === 'hoist cable casualty' && node.params.subject === 'patient');
  const operator = calls('Hoisting back up', (node) => node.call_macro === 'hoist cable casualty' && node.params.subject === 'operator');
  assert.equal(both.length, 3);
  assert.equal(patient.length, 3);
  assert.equal(operator.length, 2, 'the medic outside is hurt at the speed and bank stretcher tiers, not at the load tier');
  assert.deepEqual(both.map((node) => node.params.cause).sort(), ['HOIST LOSS (EXCESSIVE BANK)', 'HOIST LOSS (EXCESSIVE LOAD)', 'HOIST LOSS (HIGH SPEED)']);
  assert.ok([...both, ...patient, ...operator].every((node) => node.params.source === 'hoist_out'));
  assert.equal(calls('Hoisting back up', (node) => node.call_macro === 'hoist cable trace').length, 6, 'the six non-fatal ladder notices are traced');
  const ladder = JSON.stringify(macros['Hoisting back up']);
  for (const threshold of ['"gt":75', '"gt":95', '"gt":105', '"gt":115', '"gt":0.55', '"gt":0.7', '"gt":0.8', '"gt":0.9', '"gt":45', '"gt":46', '"gt":48.9', '"gt":50', '"gt":51']) assert.ok(ladder.includes(threshold), `the original ladder threshold ${threshold} is kept`);
  assert.equal(ladder.includes('hoist out fatal failure'), false);
  assert.equal(Boolean(macros['hoist out fatal failure']) || Boolean(macros['stop fatal hoist operation']), false, 'the unfinished first attempt is gone');
  assert.equal(Boolean(macros['hoist cable stress monitor']), false, 'no acceleration model for the temporary hoist: the operator died in normal hoist operations of the earlier versions');
  assert.equal(JSON.stringify(macros).includes('HOIST_STRESS'), false, 'the stress flags are gone');
  // no hoist macro is left without a caller (the call graph of this topic is closed)
  const hoistNames = Object.keys(macros).filter((name) => /^hoist cable /.test(name) || ['start hoist attached risk monitor', 'start hoist out risk monitor', 'apply hoist crew lifescore impact'].includes(name));
  for (const name of hoistNames) assert.ok(Object.entries(macros).some(([other, body]) => other !== name && JSON.stringify(body).includes(`"call_macro":"${name}"`)), `${name} must have a caller`);
  // reset, diagnostics
  assert.ok(json('objective1').includes('"call_macro":"hoist cable reset"'));
  const everything = JSON.stringify(macros);
  for (const key of ['HOIST_CABLE_PHASE', 'HOIST_CABLE_IMPACTS', 'HOIST_CABLE_MAX_RATE_FPS', 'HOIST_CABLE_RELEASES', 'HOIST_CABLE_EVENTS', 'HOIST_CABLE_LAST', 'CREW_FATAL_ON_HOOK', 'CREW_FATAL_POSITION_FIXED', 'HOIST_INJURED_WATCH']) {
    assert.ok(everything.includes(`"local:${key}"`), `snapshot: ${key}`);
    assert.ok(json('debug page').includes(`"local":"${key}"`), `debug page: ${key}`);
  }
  assert.equal(everything.includes('HOIST_ATTACHED_ACCEL_BAND'), false, 'the stale hoist diagnostics are gone');
  assert.ok(json('start hoist attached risk monitor').startsWith('[{"if":{"global":"HOIST_SAFETY_MONITOR"},"eq":"yes"'));
  assert.equal(json('start hoist attached risk monitor').includes('ACCELERATION BODY'), false, 'the ground impact monitor stays on the measured descent rate');
  assert.ok(json('hoist cable casualty').includes('"macro":"hoist_cable"'));
}

console.log('Hoist cable casualties: PASS (gate and lock, injury floor 20, watch and release of the injured at the ground, fatal with and without the hook, position of the user aircraft, packed injured patient, hoist out ladders and their trace, ground impact tiers, registry slot, callers and resets).');
