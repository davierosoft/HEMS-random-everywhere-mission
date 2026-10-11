#!/usr/bin/env node
'use strict';

// Crash detection: the production `monitor aircraft crash impact` and `crash monitor loop` run on a small HPG subset
// interpreter fed with scripted sensor values (one tick per 0.02 s sleep). The damage macros are stubs that record the tier
// they are called for. HPG/MSFS sensors are NOT modeled: this proves the decision logic (arming, chain, escalation) only.
// Optional argument: a mission file whose macros are used instead of the sources (e.g. everywhere_all.json).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
let macros = {};
if (process.argv[2]) macros = JSON.parse(fs.readFileSync(path.resolve(process.argv[2]), 'utf8')).macros;
else for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));

class Stop extends Error {}
class Returned extends Error { constructor(value) { super('return'); this.value = value; } }

class Impact {
  constructor(script, maxTicks) {
    this.script = script; this.maxTicks = maxTicks; this.tick = 0;
    this.locals = {}; this.vars = {}; this.applied = []; this.trace = []; this.log = []; this.threads = [];
    this.globals = { HOIST_SAFETY_MONITOR: 'yes' }; this.waitTicks = 0; this.sleeps = 0; this.globalsAt = {};
    this.sensors(0);
  }
  sensors(tick) {
    const s = this.script[Math.min(tick, this.script.length - 1)];
    this.vars['ACCELERATION BODY X'] = s.a[0]; this.vars['ACCELERATION BODY Y'] = s.a[1]; this.vars['ACCELERATION BODY Z'] = s.a[2];
    this.vars['VELOCITY WORLD X'] = s.v[0]; this.vars['VELOCITY WORLD Y'] = s.v[1]; this.vars['VELOCITY WORLD Z'] = s.v[2];
    this.vars['PLANE TOUCHDOWN NORMAL VELOCITY'] = 0; this.vars['PLANE ALT ABOVE GROUND'] = s.agl ?? 5; this.vars['IS SLEW ACTIVE'] = 0;
    this.vars['L:CRASH'] = 0; this.vars['SIM ON GROUND'] = s.ground ?? 0; this.vars['VERTICAL SPEED'] = 0; this.vars['GROUND VELOCITY'] = 0; this.vars['L:MISSION_TIME'] = 100;
  }
  q(x, p = {}) {
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return x.map((item) => this.q(item, p));
    if (Object.hasOwn(x, 'local')) return this.locals[x.local] ?? null;
    if (Object.hasOwn(x, 'global')) return this.globals[x.global] ?? null;
    if (Object.hasOwn(x, 'param')) return p[x.param] ?? null;
    if (Array.isArray(x.var)) return this.vars[x.var[0]] ?? null;
    if (x.require !== undefined) return this.cmp(this.q(x.require, p), x, p);
    if (x.and) return Number(x.and.every((item) => this.q(item, p)));
    if (x.or) return Number(x.or.some((item) => this.q(item, p)));
    if (x.add) return x.add.map((item) => this.q(item, p)).reduce((sum, n) => sum + n, 0);
    if (x.multiply) return x.multiply.map((item) => this.q(item, p)).reduce((product, n) => product * n, 1);
    if (x.subtract) return this.q(x.subtract[0], p) - this.q(x.subtract[1], p);
    if (x.round !== undefined) { const f = 10 ** (x.to ?? 0); return Math.round(this.q(x.round, p) * f) / f; }
    if (x.floor !== undefined) return Math.floor(this.q(x.floor, p));
    if (x.rand !== undefined) return this.q(x.rand[0], p);
    if (x.text !== undefined) return x.params ? x.text.replace(/\{(\d+)\}/g, (_, n) => this.q(x.params[Number(n)], p)) : x.text;
    if (x.create_struct) return Object.fromEntries(Object.entries(x.create_struct).map(([k, v]) => [k, this.q(v, p)]));
    if (x.create_array !== undefined) return [];
    throw new Error(`Unsupported query ${JSON.stringify(x).slice(0, 120)}`);
  }
  cmp(a, node, p) {
    const op = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].find((key) => Object.hasOwn(node, key));
    assert.ok(op, JSON.stringify(node).slice(0, 120));
    const b = this.q(node[op], p);
    return { eq: a === b, ne: a !== b, gt: a > b, gte: a >= b, lt: a < b, lte: a <= b }[op];
  }
  run(list, p = {}) {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.sleep !== undefined) { this.sleeps += 1; this.advance(); }
      else if (c.wait_for) {
        while (!this.cmp(this.q(c.wait_for, p), c, p)) { this.waitTicks += 1; this.advance(); }
      } else if (c.or && c.or.length && c.or.every((item) => item.wait_for)) {
        // an `or` of wait_for conditions: time passes (one scripted step per poll) until one of them holds
        while (!c.or.some((item) => this.cmp(this.q(item.wait_for, p), item, p))) { this.waitTicks += 1; this.advance(); }
      } else if (c.set) {
        if (!c.set.local) throw new Error(`Unsupported set ${JSON.stringify(c.set)}`);
        this.locals[c.set.local] = this.q(c.value, p);
      } else if (c.if !== undefined) this.run(this.cmp(this.q(c.if, p), c, p) ? c.then || [] : c.else || [], p);
      else if (c.while !== undefined) { let guard = 0; while (this.cmp(this.q(c.while, p), c, p)) { assert.ok(++guard < 100000); this.run(c.do, p); } }
      else if (c.try) {
        try { this.run(c.try, p); } catch (error) { if (error instanceof Stop || error instanceof Returned) throw error; p.$ERROR = error.message; this.run(c.catch || [], p); }
      } else if (c.call_macro) this.call(c.call_macro, Object.fromEntries(Object.entries(c.params || {}).map(([k, v]) => [k, this.q(v, p)])));
      else if (c.create_thread) this.threads.push(c.create_thread.commands);
      else if (c.modify_array) {
        const name = c.modify_array.local;
        if (c.append) this.locals[name] = [...(this.locals[name] || []), this.q(c.append, p)];
      } else if (c.set_message) continue;
      else if (Object.hasOwn(c, 'return')) throw new Returned(this.q(c.return, p));
      else throw new Error(`Unsupported command ${JSON.stringify(c).slice(0, 140)}`);
    }
  }
  advance() { this.tick += 1; if (this.tick > this.maxTicks) throw new Stop(); this.sensors(this.tick); this.locals.__tick = this.tick; Object.assign(this.globals, this.globalsAt[this.tick] || {}); }
  call(name, args = {}) {
    switch (name) {
      case 'apply aircraft crash lifescore impact': this.applied.push(`${args.cause}@${this.tick}`); return;
      case 'ground crew runtime trace': this.trace.push(String(args.state ?? '')); return;
      case 'crew presence flags': case 'crew impact events': case 'crash random failures': return;
      default: assert.ok(macros[name], `unknown macro ${name}`);
    }
    try { this.run(macros[name], args); } catch (error) { if (!(error instanceof Returned)) throw error; }
  }
  start() {
    this.call('monitor aircraft crash impact');
    const body = this.threads.shift();
    assert.ok(body, 'the loop thread starts');
    try { this.run(body); } catch (error) { if (!(error instanceof Stop)) throw error; }
    return this;
  }
}

const calm = { a: [0, 0, 0], v: [0, 0, 0] };
const scenario = (events, ticks = 70) => {
  const script = Array.from({ length: ticks }, () => ({ ...calm }));
  let current = calm;
  for (let t = 0; t < ticks; t += 1) {
    if (events[t]) current = events[t];
    script[t] = { a: events[t]?.a ?? [0, 0, 0], v: current.v };
  }
  return script;
};
const run = (events, ticks = 70) => new Impact(scenario(events, ticks), ticks).start();
// the crash tiers only (the minor injuries of the same impact are not the subject)
const crash = (sim) => sim.applied.map((entry) => entry.split('@')[0]).filter((cause) => /CRASH IMPACT$/.test(cause));

// 1. The reported case: a light impact (about 26 ft/s lost), then 0.04 s later (the crash path is not rearmed yet) one of
//    about 120 ft/s. The heavy impact must be graded: the tiers above the chain tier (severe and heavy) apply, not the light tier twice.
{
  const sim = run({ 11: { a: [0, 0, 200], v: [0, -30, 0] }, 23: { a: [0, 0, 3000], v: [0, -150, 0] } });
  const causes = crash(sim);
  assert.deepEqual(causes, ['AIRCRAFT CRASH IMPACT', 'SEVERE AIRCRAFT CRASH IMPACT', 'HEAVY AIRCRAFT CRASH IMPACT'], `applied tiers: ${sim.applied}`);
  assert.equal(sim.locals.crash_event_count, 2, 'two impacts are logged');
  assert.equal(sim.locals.crash_event_log[1].tiers, '0110', 'the log shows the escalated tiers (the light tier is suppressed)');
}
// 2. The same chain with a second light impact: nothing is applied twice.
{
  const sim = run({ 11: { a: [0, 0, 200], v: [0, -30, 0] }, 23: { a: [0, 0, 3000], v: [0, -60, 0] } });
  assert.deepEqual(crash(sim), ['AIRCRAFT CRASH IMPACT'], `applied tiers: ${sim.applied}`);
}
// 3. A heavy impact first, then a lighter one inside the chain: only the first counts.
{
  const sim = run({ 11: { a: [0, 0, 3000], v: [0, -120, 0] }, 25: { a: [0, 0, 3000], v: [0, -110, 0] } }, 90);
  assert.deepEqual(crash(sim), ['AIRCRAFT CRASH IMPACT', 'SEVERE AIRCRAFT CRASH IMPACT', 'HEAVY AIRCRAFT CRASH IMPACT'], `applied tiers: ${sim.applied}`);
}
// 4. After a calm period the crash path rearms and a new light impact counts again (chain reset).
{
  const sim = run({ 11: { a: [0, 0, 200], v: [0, -30, 0] }, 17: { a: [0, 0, 0], v: [0, 0, 0] }, 40: { a: [0, 0, 200], v: [0, -30, 0] } }, 80);
  assert.deepEqual(crash(sim), ['AIRCRAFT CRASH IMPACT', 'AIRCRAFT CRASH IMPACT'], `applied tiers: ${sim.applied}`);
}
// 5. A catastrophic impact is applied once per chain and the escalation then stops (chain tier 6).
{
  const sim = run({ 11: { a: [0, 0, 3000], v: [0, -200, 0] }, 27: { a: [0, 0, 5000], v: [0, -400, 0] } }, 100);
  assert.equal(crash(sim).filter((cause) => cause.startsWith('CATASTROPHIC')).length, 1, `applied tiers: ${sim.applied}`);
}
// 6. A calm flight never applies a tier; a spike of acceleration without velocity change is ignored.
{
  assert.equal(crash(run({})).length, 0);
  const spike = run({ 11: { a: [0, 0, 300], v: [0, 0, 0] } });
  assert.equal(crash(spike).length, 0, 'an acceleration spike alone is not an impact');
}
// 7. Performance options (settings page, PERFORMANCE): sampling and altitude gate.
const profile = (globals, script, ticks) => { const sim = new Impact(script, ticks); sim.globals = { HOIST_SAFETY_MONITOR: 'yes', ...globals }; return sim.start(); };
const flight = (ticks, step) => Array.from({ length: ticks }, (_, t) => ({ a: [0, 0, 0], v: [0, 0, 0], agl: 1000, ...step(t) }));
{
  // sampling: unset = fast (0.02 s), balanced 0.05 s, light 0.1 s
  const cases = [[{}, 0.02], [{ PERF_SAMPLING: 'fast' }, 0.02], [{ PERF_SAMPLING: 'balanced' }, 0.05], [{ PERF_SAMPLING: 'light' }, 0.1]];
  for (const [globals, expected] of cases) assert.equal(profile({ ...globals, PERF_ALTITUDE_GATE: 'no' }, flight(60, () => ({ agl: 5 })), 60).locals.cm_sleep, expected, `sampling ${JSON.stringify(globals)}`);
  // a descent that ends in a catastrophic impact: tick 320 at 5 ft above the ground, the aircraft was at 1000 ft until tick 300
  const crashScript = flight(400, (t) => (t >= 300 ? { agl: t >= 320 ? 5 : 300, a: t >= 320 ? [0, 0, 5000] : [0, 0, 0], v: t >= 320 ? [0, -200, 0] : [0, 0, 0] } : {}));
  const gated = profile({}, crashScript, 400);
  assert.ok(crash(gated).some((cause) => cause.startsWith('CATASTROPHIC')), `the gate (default ON) still grades the impact: ${gated.applied}`);
  assert.ok(gated.waitTicks > 200 && gated.sleeps < 150, `the loop sleeps while the aircraft is above 450 ft (waited ${gated.waitTicks} steps, ${gated.sleeps} ticks run)`);
  assert.ok(gated.trace.some((s) => s.startsWith('gate_sleep')) && gated.trace.some((s) => s === 'gate_wake'), 'the gate is traced (advanced log only)');
  const open = profile({ PERF_ALTITUDE_GATE: 'no' }, crashScript, 400);
  assert.ok(crash(open).some((cause) => cause.startsWith('CATASTROPHIC')), 'OFF grades the same impact');
  assert.equal(open.waitTicks, 0, 'OFF never sleeps');
  // the first tick after the wake is not an impact: the velocity changed a lot while the loop slept (a teleport, a long pause)
  const teleport = flight(200, (t) => ({ v: t >= 100 ? [0, -300, 0] : [0, 0, 0], agl: t >= 120 ? 50 : 1000 }));
  const woke = profile({}, teleport, 200);
  assert.equal(crash(woke).length, 0, `a velocity change during the sleep must not be graded after the wake: ${woke.applied}`);
  assert.ok(woke.waitTicks > 50, 'the loop slept before the teleport');
  // the gate does not engage below the wake height or while a path is disarmed
  const low = profile({}, flight(120, () => ({ agl: 300 })), 120);
  assert.equal(low.waitTicks, 0, 'below 450 ft the loop keeps running');
}
// 8. Crew health simulation off: the impact loop waits (no tick runs, nothing is graded) and resumes cleanly when the option is turned on.
{
  const crashScript = flight(400, (t) => (t >= 300 ? { agl: 5, a: t >= 320 ? [0, 0, 5000] : [0, 0, 0], v: t >= 320 ? [0, -200, 0] : [0, 0, 0] } : { agl: 5 }));
  const off = new Impact(crashScript, 400); off.globals.HOIST_SAFETY_MONITOR = 'no'; off.start();
  assert.equal(crash(off).length, 0, 'with the crew health simulation off nothing is graded');
  assert.ok(off.sleeps < 5 && off.waitTicks > 300, `the loop waits instead of ticking (ran ${off.sleeps} ticks, waited ${off.waitTicks} steps)`);
  assert.ok(off.trace.includes('health_off_sleep'), 'the wait is traced (advanced log only)');
  // turned on at tick 100: the loop wakes, re-seeds, and then grades the impact at tick 320; a velocity jump while it slept is not an impact
  const jump = flight(400, (t) => ({ agl: 5, v: t >= 50 ? [0, -300, 0] : [0, 0, 0], a: t === 320 ? [0, 0, 5000] : [0, 0, 0] }));
  const woke = new Impact(jump, 400); woke.globals.HOIST_SAFETY_MONITOR = 'no'; woke.globalsAt = { 100: { HOIST_SAFETY_MONITOR: 'yes' } }; woke.start();
  assert.ok(woke.trace.includes('health_on_wake'), 'the loop wakes when the option is turned on');
  assert.equal(crash(woke).length, 0, `no impact is graded for the velocity change that happened while the loop waited: ${woke.applied}`);
  assert.ok(woke.sleeps > 100, 'the loop runs normally after the wake');
}
console.log('Crash detection PASS: arming, chain and escalation of the crash tiers, sampling options, altitude gate and crew health simulation wait on scripted sensors. HPG/MSFS sensors PENDING.');
