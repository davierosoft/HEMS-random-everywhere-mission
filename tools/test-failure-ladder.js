#!/usr/bin/env node
'use strict';

// Aircraft failure severity ladder and fuel leakage. The production macros run on a small HPG subset interpreter
// (seeded random numbers, a clock advanced by sleeps, a fuel model). HPG/MSFS is NOT modeled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const original = JSON.parse(fs.readFileSync(path.join(root, 'starting point', 'baseline-0.997-original-fully-functional.json'), 'utf8'));
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

class Stop extends Error {}
class Returned extends Error {}
class Sim {
  constructor(seed = 1) {
    this.seed = seed; this.locals = {}; this.globals = { ENGINE_FAILURES_ENABLED: 'yes' }; this.vars = {}; this.threads = [];
    this.applied = []; this.time = 0; this.horizon = Infinity; this.levelPercent = 60; this.capacityKg = 500;
  }
  random() { this.seed = (this.seed + 0x6D2B79F5) >>> 0; let z = this.seed; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; }
  read(name) {
    if (name === 'FUEL TOTAL QUANTITY WEIGHT') return (this.levelPercent * this.capacityKg) / 100;
    if (name === 'FUEL TANK CENTER LEVEL') return this.levelPercent;
    return this.vars[name] ?? null;
  }
  q(x, p = {}) {
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return x.map((item) => this.q(item, p));
    if (Object.hasOwn(x, 'local')) return this.locals[x.local] ?? null;
    if (Object.hasOwn(x, 'param')) return p[x.param] ?? null;
    if (Object.hasOwn(x, 'global')) return this.globals[x.global] ?? null;
    if (Array.isArray(x.var)) return this.read(x.var[0]);
    if (x.require !== undefined) return this.cmp(this.q(x.require, p), x, p);
    if (x.and) return Number(x.and.every((item) => this.q(item, p)));
    if (x.or) return Number(x.or.some((item) => this.q(item, p)));
    if (x.add) return x.add.map((item) => this.q(item, p)).reduce((sum, n) => sum + n, 0);
    if (x.multiply) return x.multiply.map((item) => this.q(item, p)).reduce((product, n) => product * n, 1);
    if (x.subtract) return this.q(x.subtract[0], p) - this.q(x.subtract[1], p);
    if (x.divide) return this.q(x.divide[0], p) / this.q(x.divide[1], p);
    if (x.clamp) { const [v, lo, hi] = x.clamp.map((item) => this.q(item, p)); return Math.min(hi, Math.max(lo, v)); }
    if (x.round !== undefined) { const f = 10 ** (x.to ?? 0); return Math.round(this.q(x.round, p) * f) / f; }
    if (x.floor !== undefined) return Math.floor(this.q(x.floor, p));
    if (x.rand !== undefined) { const [a, b] = x.rand.map((item) => this.q(item, p)); return a + this.random() * (b - a); }
    if (x.text !== undefined) return x.params ? x.text.replace(/\{(\d+)\}/g, (_, n) => this.q(x.params[Number(n)], p)) : x.text;
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
      if (c.sleep !== undefined) { const wait = this.q(c.sleep, p); this.time += Array.isArray(wait) ? wait[0] : wait; if (this.time > this.horizon) throw new Stop(); }
      else if (c.set) {
        const value = this.q(c.value, p);
        if (c.set.local) this.locals[c.set.local] = value;
        else if (c.set.var) { if (c.set.var[0] === 'FUEL TANK CENTER LEVEL') this.levelPercent = value; else this.vars[c.set.var[0]] = value; this.log?.push(['set', c.set.var[0], value]); }
        else throw new Error(`Unsupported set ${JSON.stringify(c.set)}`);
      } else if (c.if !== undefined) this.run(this.cmp(this.q(c.if, p), c, p) ? c.then || [] : c.else || [], p);
      else if (c.while !== undefined) { let guard = 0; while (this.cmp(this.q(c.while, p), c, p)) { assert.ok(++guard < 100000); this.run(c.do, p); } }
      else if (c.call_macro) this.call(c.call_macro, Object.fromEntries(Object.entries(c.params || {}).map(([k, v]) => [k, this.q(v, p)])));
      else if (c.create_thread) this.threads.push(c.create_thread.commands);
      else if (Object.hasOwn(c, 'return')) throw new Returned();
      else throw new Error(`Unsupported command ${JSON.stringify(c).slice(0, 140)}`);
    }
  }
  call(name, args = {}) {
    if (name === 'ground crew runtime trace') return;
    if (name === 'apply aircraft failure') { this.applied.push(args.code); return; }
    assert.ok(macros[name], `unknown macro ${name}`);
    try { this.run(macros[name], args); } catch (error) { if (!(error instanceof Returned)) throw error; }
  }
  runThreads(horizon) {
    this.horizon = horizon;
    while (this.threads.length) { const body = this.threads.shift(); this.time = 0; try { this.run(body); } catch (error) { if (!(error instanceof Stop)) throw error; } }
  }
}

// ---- 1. The ladder: light to heavy, in the order requested, every code once ------------------------------------------
const EXPECTED = [
  ['APCP', [14, 25]], ['autopilot 1/2 and the eight SEMA', [11, 12, 22, 23, 30, 31, 32, 33, 34, 35, 36, 37]], ['MGB chip', [15, 26]], ['FADEC level 1', [3, 4]], ['backup', [13, 24]],
  ['FADEC level 2', [16, 17, 27, 28]], ['fuel + main + supply + leakage', [9, 10, 20, 21, 29, 38, 39, 40]], ['hydraulic', [7, 8]], ['T/MGB mechanical', [18, 19]], ['engine failed', [1, 2]], ['engine fire', [5, 6]],
];
for (let level = 1; level <= 11; level += 1) {
  const all = new Set();
  for (let seed = 1; seed <= 400; seed += 1) { const sim = new Sim(seed); sim.call('aircraft failure ladder', { level }); all.add(sim.locals.ladder_code); }
  assert.deepEqual([...all].sort((a, b) => a - b), [...EXPECTED[level - 1][1]].sort((a, b) => a - b), `level ${level} ${EXPECTED[level - 1][0]}`);
}
const everyCode = EXPECTED.flatMap(([, codes]) => codes).sort((a, b) => a - b);
assert.deepEqual(everyCode, Array.from({ length: 40 }, (_, i) => i + 1), 'every failure code (1 to 28, the leakage 29 and the SEMA and fuel failures 30 to 40) belongs to exactly one level');

{
  // level 2: autopilot 1, autopilot 2 and the eight SEMA failures have the same chance each (autopilot picks one of its two codes after)
  const failureOf = (code) => ({ 11: 'AP1', 22: 'AP1', 12: 'AP2', 23: 'AP2' })[code] ?? `SEMA code ${code}`;
  const runs = 20000;
  const counts = new Map();
  for (let seed = 1; seed <= runs; seed += 1) {
    const sim = new Sim(seed * 7919);
    sim.call('aircraft failure ladder', { level: 2 });
    counts.set(failureOf(sim.locals.ladder_code), (counts.get(failureOf(sim.locals.ladder_code)) || 0) + 1);
  }
  assert.equal(counts.size, 10, 'ten failures in the autopilot level');
  for (const [name, n] of counts) assert.ok(Math.abs(n / runs - 0.1) < 0.015, `${name} has about 10 percent of the draws of its level (${(n / runs * 100).toFixed(1)})`);
  for (const [failure, codes] of [['AP1', [11, 22]], ['AP2', [12, 23]]]) {
    const seen = new Set();
    for (let seed = 1; seed <= 3000; seed += 1) { const sim = new Sim(seed * 104729); sim.call('aircraft failure ladder', { level: 2 }); if (failureOf(sim.locals.ladder_code) === failure) seen.add(sim.locals.ladder_code); }
    assert.deepEqual([...seen].sort((a, b) => a - b), codes, `${failure} still uses both of its codes`);
  }
}

// ---- 2. The existing logic is untouched ----------------------------------------------------------------------------------
{
  const table = macros['apply aircraft failure'].filter((c) => c.if);
  const originalBranches = original.macros['failure engine'][0].create_thread.commands[0].do.filter((c) => c.if && c.if.var && c.if.var[0] === 'L:FAILURE');
  assert.equal(table.length, 39, 'the table keeps the 28 original codes and adds 11 (30 to 40)');
  const addedVars = { 30: 'PITCH_SEMA1', 31: 'ROLL_SEMA1', 32: 'YAW_SEMA1', 33: 'COLLECTIVE_SEMA1', 34: 'PITCH_SEMA2', 35: 'ROLL_SEMA2', 36: 'YAW_SEMA2', 37: 'COLLECTIVE_SEMA2', 38: 'FUEL_MAIN', 39: 'FUEL_SUPPLY1', 40: 'FUEL_SUPPLY2' };
  for (const [code, name] of Object.entries(addedVars)) {
    const branch = table.find((c) => c.eq === Number(code));
    assert.ok(branch && JSON.stringify(branch.then) === JSON.stringify([{ set: { var: [`L:{local:HXX}_FAIL_${name}`, 'number'] }, value: 1 }]), `code ${code} sets FAIL_${name} to 1`);
  }
  assert.ok(originalBranches.every((branch, index) => JSON.stringify(branch.then) === JSON.stringify(table[index].then) && branch.eq === table[index].eq), 'every original code does the original damage');
  const engine = JSON.stringify(macros['failure engine']);
  assert.ok(engine.includes('"call_macro":"apply aircraft failure"') && !engine.includes('ladder') && engine.includes('"lt":29'), 'the in-flight failure engine still applies the L:FAILURE code of the table and ends at 29');
  const repairNames = JSON.stringify(macros['reset aircraft failures']);
  for (const target of new Set(collect(macros['apply aircraft failure'], (c) => c.set?.var).map((c) => c.set.var[0]).filter((name) => !/^L:CPL/.test(name)))) assert.ok(repairNames.includes(`"${target}"`), `the repair clears ${target}`);
  assert.ok(repairNames.includes('"fuel_leak_active"'), 'the repair also stops the fuel leakage');
  // the take-off caution check and the two deboarding failure lists read the added failures as well
  for (const name of Object.values(addedVars)) {
    const key = `L:{local:HXX}_FAIL_${name}`;
    const count = (macro) => JSON.stringify(macros[macro]).split(`"${key}"`).length - 1;
    assert.equal(count('beforetockl'), 1, `beforetockl waits for FAIL_${name} to be 0`);
    assert.equal(count('deboarding'), 2, `deboarding checks FAIL_${name} in both failure lists`);
  }
}

// ---- 3. Which levels each crash tier draws -------------------------------------------------------------------------------
const draws = (first, last, count = 1, runs = 600) => {
  const levelOf = new Map(EXPECTED.flatMap(([, codes], index) => codes.map((code) => [code, index + 1])));
  const seen = new Set();
  for (let seed = 1; seed <= runs; seed += 1) {
    const sim = new Sim(seed);
    sim.call('crash random failures', { count, first, last });
    sim.runThreads(0);
    const codes = [...sim.applied];
    // leakage (29) is applied through its own macro: it started when the flag is set
    if (sim.locals.fuel_leak_active === 'yes') codes.push(29);
    assert.equal(codes.length, count, `${count} failure(s) per call`);
    codes.forEach((code) => seen.add(levelOf.get(code)));
  }
  return [...seen].sort((a, b) => a - b);
};
assert.deepEqual(draws(1, 10, 2), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'the severe tier: from the lightest failure (APCP) to the engine failure, never the engine fire');
assert.deepEqual(draws(7, 11), [7, 8, 9, 10, 11], 'the two highest tiers: from the fuel failures to the engine fire, never the light failures');
{
  const sim = new Sim(3); sim.globals.ENGINE_FAILURES_ENABLED = 'no';
  sim.call('crash random failures', { count: 3, first: 1, last: 11 });
  assert.equal(sim.applied.length, 0, 'no failure without ENGINE_FAILURES_ENABLED');
}
{
  const calls = collect(macros['crash monitor loop'], (c) => c.call_macro === 'crash random failures').map((c) => JSON.stringify(c.params));
  assert.equal(calls.length, 3);
  assert.ok(calls[0].includes('"first":1,"last":10') && calls[1].includes('"first":7,"last":11') && calls[2].includes('"first":7,"last":11'), 'tier by tier levels: ' + calls.join(' '));
}

// ---- 4. Fuel leakage -------------------------------------------------------------------------------------------------------------
{
  const sim = new Sim(7);
  sim.call('fuel leakage');
  const step = sim.locals.fuel_leak_kg;
  assert.ok(step >= 0.2 && step <= 0.8, `the constant amount is drawn once in 0.2-0.8 kg: ${step}`);
  assert.ok(step * 12 <= 10, 'never more than 10 kg a minute');
  const before = sim.read('FUEL TOTAL QUANTITY WEIGHT');
  sim.call('fuel leakage'); // a second call does not start a second leak
  assert.equal(sim.threads.length, 2, 'one leak at a time (the loss thread and the thread that makes the crew notice it)');
  sim.runThreads(60.5);
  const lost = before - sim.read('FUEL TOTAL QUANTITY WEIGHT');
  assert.ok(Math.abs(lost - step * 12) < 1e-6, `12 steps of ${step} kg in a minute, lost ${lost}`);
  assert.ok(lost <= 10, `at most 10 kg in a minute: ${lost}`);
  assert.equal(sim.locals.fuel_leak_kg, step, 'the amount stays constant');
  assert.ok(Math.abs(sim.locals.fuel_leak_lost_kg - lost) < 1e-6);
  // the level falls in proportion to the weight: 60% of 500 kg
  assert.ok(Math.abs(sim.levelPercent - (60 * (before - lost)) / before) < 1e-9);
}
{
  // The repair stops the leak.
  const sim = new Sim(9);
  sim.call('fuel leakage');
  sim.call('reset aircraft failures');
  assert.equal(sim.locals.fuel_leak_active, 'no');
  const before = sim.read('FUEL TOTAL QUANTITY WEIGHT');
  sim.runThreads(120);
  assert.equal(sim.read('FUEL TOTAL QUANTITY WEIGHT'), before, 'no fuel is lost after the repair');
  sim.call('fuel leakage');
  assert.equal(sim.locals.fuel_leak_active, 'yes', 'a new leak can start after the repair');
}
{
  // The leak ends with the fuel and never makes it negative.
  const sim = new Sim(11); sim.levelPercent = 0.05; // 0.25 kg
  sim.call('fuel leakage');
  sim.runThreads(300);
  assert.ok(sim.levelPercent >= 0 && sim.levelPercent < 0.05);
  sim.levelPercent = 0;
  sim.threads.push(macros['fuel leakage'].find((c) => c.create_thread).create_thread.commands);
  sim.runThreads(sim.time + 30);
  assert.equal(sim.levelPercent, 0);
}
// ---- 5. The RESET FAILURES button: active only while a failure or damage is present --------------------------------------
{
  const cleared = macros['reset aircraft failures'].filter((c) => c.set?.var).map((c) => c.set.var[0]);
  assert.ok(!cleared.includes('L:FAILURE') && !collect(macros['refresh aircraft failures flag'], (c) => c.if?.var).some((c) => c.if.var[0] === 'L:FAILURE'), 'the reset leaves the random failure draw L:FAILURE alone, and the flag does not read it');
  { const sim = new Sim(2); sim.vars['L:FAILURE'] = 17; sim.call('reset aircraft failures'); assert.equal(sim.vars['L:FAILURE'], 17, 'a random failure draw already present is not changed by the reset'); }
  const refreshed = collect(macros['refresh aircraft failures flag'], (c) => c.if?.var).map((c) => c.if.var[0]);
  assert.deepEqual([...refreshed].sort(), [...cleared].sort(), 'the flag reads exactly the variables the reset clears (L:FAILURE, the draw of a failure not yet occurred, is not read)');
  const fresh = () => { const sim = new Sim(5); for (const name of cleared) sim.vars[name] = 0; return sim; };
  const sim = fresh();
  sim.call('refresh aircraft failures flag');
  assert.equal(sim.locals.FAILURES_ACTIVE, 0, 'every variable at 0: the button is inactive');
  for (const name of cleared) {
    const one = fresh(); one.vars[name] = 1;
    one.call('refresh aircraft failures flag');
    assert.equal(one.locals.FAILURES_ACTIVE, 1, `${name} set: the button is active`);
    one.call('reset aircraft failures');
    assert.equal(one.locals.FAILURES_ACTIVE, 0, `${name}: inactive again after the reset`);
  }
  const leak = fresh(); leak.call('fuel leakage');
  assert.equal(leak.locals.FAILURES_ACTIVE, 1, 'the fuel leakage activates the button');
  leak.call('reset aircraft failures');
  assert.equal(leak.locals.FAILURES_ACTIVE, 0);
  // hooks: every new failure refreshes the flag, the settings page refreshes it when opened, the button resets and says so
  assert.equal(macros['apply aircraft failure'].at(-1).call_macro, 'refresh aircraft failures flag', 'every failure refreshes the flag');
  assert.equal(macros['reset aircraft failures'].at(-1).call_macro, 'refresh aircraft failures flag');
  const settings = JSON.stringify(Object.values(macros).filter((m) => JSON.stringify(m).includes('(P)Helicopter failures:')));
  assert.ok(settings.includes('{"link":"+ FLIGHT ASSISTS","commands":[{"set":{"local":"tab11"},"value":1},{"call_macro":"refresh aircraft failures flag"}]'), 'opening the flight assists refreshes the flag');
  assert.ok(settings.includes('{"title":"RESET FAILURES","disabled_condition":{"require":{"local":"FAILURES_ACTIVE"},"ne":1},"select_condition":{"require":{"local":"FAILURES_ACTIVE"},"eq":1},"commands":[{"call_macro":"reset aircraft failures"}'), 'one RESET FAILURES button in the Helicopter failures bar: disabled without a failure, selected with one');
  assert.equal(settings.split('"title":"RESET FAILURES"').length - 1, 1, 'a single RESET FAILURES button');
  // the flag follows the aircraft in real time (user rule 2026-10-25): a thread loops, waits for any failure (or), then for none (and)
  const monitor = JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'threads', '03-flight-monitors.json'), 'utf8'))['aircraft failures monitor']);
  assert.ok(monitor.includes('"while":1') && monitor.includes('"or":[') && monitor.includes('"and":[') && monitor.indexOf('"value":1') < monitor.indexOf('"and":['), 'the monitor thread loops and waits for any failure, then for none');
  assert.equal(monitor.split('"wait_for":{"var":').length - 1, 60, 'thirty failure variables in each wait');
  assert.ok(monitor.includes('"local":"fuel_leak_active"'), 'the fuel leakage counts');
  // the in-flight failure engine applies the code and then draws a new one (original 0.997): without the new draw the same failure came back every 2 to 60 minutes
  const engineLoop = JSON.stringify(macros['failure engine']);
  assert.ok(engineLoop.includes('{"call_macro":"apply aircraft failure","params":{"code":{"var":["L:FAILURE","number"]}}},{"call_macro":"failure crew announce","params":{"code":{"var":["L:FAILURE","number"]}}},{"set":{"var":["L:FAILURE","number"]},"value":{"floor":{"rand":[1,300]}}}'), 'the failure engine draws a new L:FAILURE after every applied failure');
  // a critical or dead crew member marks the repair at the next mission start (reload or manual restart: the flag is a global)
  const event = JSON.stringify(macros['crew member state event']);
  assert.equal(event.split('"global":"CREW_DEATH_REPAIR_PENDING"').length - 1, 10, 'five deaths and five critical members set the repair flag');
}
console.log('Failure ladder PASS: light to heavy order of the avarie, tier ranges, original codes and failure engine untouched, constant fuel leakage within 10 kg a minute, RESET FAILURES button state. HPG/MSFS PENDING.');
