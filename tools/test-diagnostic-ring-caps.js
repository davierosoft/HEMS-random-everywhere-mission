#!/usr/bin/env node
'use strict';

// Diagnostic arrays must stay bounded. 169.26 tester log: `ground crew runtime trace` grew without a cap (13293 rows, 2 MB after 90 minutes,
// 92 percent of them registry polling breadcrumbs) and every automatic snapshot copied it whole; a stuck mission left alone ended with
// "RangeError: Maximum call stack size exceeded" on {"modify_array":{"local":"ground_ops_watch_log"},"removeIndex":0}. The stack of a thread
// only unwinds at a sleep (docs/architecture/CREW_LIFESCORE_ROLES.md), so the trimming `while` loops are one `if` per append now.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const directory = path.join(__dirname, '..', 'mission-src', 'macros');
const macros = {};
for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

// ---- static contract --------------------------------------------------------------------------
const rings = { ground_crew_runtime_trace: 4000, ambulance_monitor_log: 600, dispatch_handoff_log: 80, ground_ops_checkpoint_log: 600, ground_ops_watch_log: 300, dispatch_archive: 3 };
for (const [local, cap] of Object.entries(rings)) {
  const trims = [];
  for (const [name, commands] of Object.entries(macros)) for (const node of collect(commands, (c) => c.modify_array?.local === local && c.removeIndex === 0)) trims.push([name, node]);
  assert.ok(trims.length >= 1, `${local} is trimmed`);
  const guards = [];
  for (const commands of Object.values(macros)) guards.push(...collect(commands, (c) => c.if?.struct?.local === local && c.if.path === 'length' && c.gt === cap && Array.isArray(c.then) && c.then.length === 1 && c.then[0].modify_array?.local === local));
  assert.ok(guards.length >= 1, `${local}: one removal guarded by length > ${cap}`);
  const loops = [];
  for (const commands of Object.values(macros)) loops.push(...collect(commands, (c) => c.while?.struct?.local === local));
  assert.equal(loops.length, 0, `${local}: no while loop that trims without a sleep`);
}
// location_diagnostic_history is a FIFO of 200 rows kept by counting: the guarded removeIndex never trimmed it in the simulator (1315 rows held
// against a cap of 200), so at 200 rows it is rebuilt with the newest 100, with only set, create_array, for_each and append.
{
  const monitor = JSON.stringify(macros['location diagnostics monitor']);
  assert.ok(!monitor.includes('"removeIndex"'), 'the location history no longer relies on removeIndex');
  const loop = macros['location diagnostics monitor'].find((c) => c.while);
  const then = loop.do.find((c) => c.if?.param === 'signature').then;
  const iReset = then.findIndex((c) => c.if?.local === 'location_diagnostic_history_count' && c.gte === 200);
  const iAppend = then.findIndex((c) => c.modify_array?.local === 'location_diagnostic_history' && c.append);
  const iCount = then.findIndex((c) => c.set?.local === 'location_diagnostic_history_count' && c.value?.add);
  assert.ok(iReset >= 0 && iReset < iAppend && iAppend < iCount, 'rebuild when 200 rows are held, then append, then count');
  const rebuild = then[iReset].then;
  assert.equal(rebuild[1].for_each.local, 'location_diagnostic_history');
  assert.equal(rebuild[1].do[0].gte, 100, 'the newest 100 rows are kept');
  assert.deepEqual(rebuild[3], { set: { local: 'location_diagnostic_history_count' }, value: 100 });
  assert.ok(JSON.stringify(macros['start location diagnostics']).includes('"local":"location_diagnostic_history_count"},"value":0'), 'the count starts with the array');
  // the production commands, run on a scripted history
  let history = []; let count = null; let tail = null;
  for (let i = 0; i < 1000; i += 1) {
    if (count === null) count = 0;
    if (count >= 200) {
      tail = [];
      history.forEach((item, index) => { if (index >= 100) tail.push(item); });
      history = tail; count = 100;
    }
    history.push(i);
    count += 1;
    assert.ok(history.length <= 200 && history.length === count, 'never more than 200 rows, the count follows the length');
    if (i >= 150) assert.ok(history.length >= 100 && history.at(-1) === i && history.at(-100) === i - 99, 'the newest 100 rows are always there, in order');
  }
}

// no trimming loop of any ring runs without a sleep
for (const [name, commands] of Object.entries(macros)) {
  for (const loop of collect(commands, (c) => c.while !== undefined && JSON.stringify(c.do ?? []).includes('"removeIndex":0'))) {
    assert.ok(JSON.stringify(loop.do).includes('"sleep"'), `${name}: a loop that removes rows must sleep`);
  }
}
// the stall of the watcher unwinds between its heavy snapshot calls
const watch = JSON.stringify(macros['ground ops watch start']);
assert.ok(/"sleep":0\.2\},\s*\{"call_macro":"capture automatic snapshot".*"sleep":0\.5\},\s*\{"call_macro":"snapshot dispatch diagnostics"/.test(watch.replace(/\s+/g, ' ')) || (watch.indexOf('"sleep":0.2') < watch.indexOf('capture automatic snapshot') && watch.indexOf('"sleep":0.5') < watch.indexOf('snapshot dispatch diagnostics')), 'sleeps around the stall snapshots');

// ---- behavior of the trace macro --------------------------------------------------------------
const locals = {};
const globals = {};
const run = (list, p) => {
  const q = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if (Object.hasOwn(x, 'local')) return locals[x.local] ?? null;
    if (Object.hasOwn(x, 'global')) return globals[x.global] ?? null;
    if (Object.hasOwn(x, 'param')) return p[x.param] ?? null;
    if (Object.hasOwn(x, 'var')) return 0;
    if (x.add) return x.add.map(q).reduce((a, b) => a + b, 0);
    if (x.create_array !== undefined) return [];
    if (x.create_struct) return Object.fromEntries(Object.entries(x.create_struct).map(([k, v]) => [k, q(v)]));
    if (x.struct && x.path === 'length') return (locals[x.struct.local] ?? []).length;
    if (x.require) return cmp(q(x.require), x);
    if (x.or) return Number(x.or.some((item) => q(item)));
    throw new Error(`Unsupported ${JSON.stringify(x)}`);
  };
  const cmp = (a, node) => { const k = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].find((key) => Object.hasOwn(node, key)); const b = q(node[k]); return { eq: a === b, ne: a !== b, gt: a > b, gte: a >= b, lt: a < b, lte: a <= b }[k]; };
  for (const c of list) {
    if (c['#comment']) continue;
    if (c.set) { const v = q(c.value); if (c.set.local) locals[c.set.local] = v; else p[c.set.param] = v; }
    else if (c.if) run(cmp(q(c.if), c) ? c.then : (c.else || []), p);
    else if (c.modify_array) { const arr = locals[c.modify_array.local]; if (c.append) arr.push(q(c.append)); else if (c.removeIndex !== undefined) arr.splice(c.removeIndex, 1); }
    else throw new Error(`Unsupported command ${JSON.stringify(c).slice(0, 100)}`);
  }
};
const trace = (macro, target, state = 'x', level) => run(macros['ground crew runtime trace'], { macro, actor: 'a', target, state, level });
for (let i = 0; i < 2000; i += 1) for (const target of ['multipatient registry live reserve', 'multipatient registry crew eligibility', 'multipatient registry crew barrier']) trace('hems_visit', target, 'call_x');
assert.equal(locals.ground_crew_runtime_trace.length, 300, 'the three registry polling targets are recorded one in 20');
for (let i = 0; i < 6000; i += 1) trace('crash_ops', 'crash', 'row ' + i);
assert.equal(locals.ground_crew_runtime_trace.length, 4000, 'the ring never exceeds 4000 rows');
assert.equal(locals.ground_crew_runtime_trace.at(-1).state, 'row 5999', 'the newest row is kept');
trace('hems_visit', 'multipatient registry crew tour', 'tour step');
assert.equal(locals.ground_crew_runtime_trace.at(-1).state, 'tour step', 'other hems_visit rows are recorded in full');
const sequences = locals.ground_crew_runtime_trace.map((row) => row.sequence);
assert.ok(sequences.every((value, index) => index === 0 || value > sequences[index - 1]), 'the sequence stays increasing');

// ---- log level (settings page, PERFORMANCE) -----------------------------------------------------
locals.ground_crew_runtime_trace = [];
const rows = () => locals.ground_crew_runtime_trace.length;
let before = rows();
trace('crash_ops', 'crash', 'loop_alive tick=1', 'adv');
trace('fire_ops', 'firetruck1', 'drive_start');
assert.equal(rows(), before + 2, 'ADVANCED (default, option unset) records every row');
globals.PERF_LOG_LEVEL = 'advanced';
before = rows();
trace('hems_visit', 'multipatient registry crew tour', 'tour step');
assert.equal(rows(), before + 1, 'ADVANCED records the chatty channels');
globals.PERF_LOG_LEVEL = 'basic';
before = rows();
trace('crash_ops', 'crash', 'loop_alive tick=2', 'adv');
trace('fire_ops', 'firetruck1', 'drive_start');
trace('police_ops', 'police7', 'park');
trace('hems_visit', 'multipatient registry crew tour', 'tour step');
trace('crew_seats', 'crew', 'tick');
assert.equal(rows(), before, 'BASIC drops the advanced-only rows and the chatty channels');
for (const macro of ['crash_ops', 'hoist_cable', 'crew_events', 'ambulance_ops', 'ground_ops', 'hems_3crew', 'hems_45crew', 'mission_start', 'multipatient registry transition', 'live_recover']) trace(macro, 'x', 'kept ' + macro);
assert.equal(rows(), before + 10, 'BASIC keeps crash, hoist cable, crew, ambulance, ground operations, mission and registry rows');
// the options exist in every layer of the profile and the monitors honour them
const crashLoop = JSON.stringify(macros['crash monitor loop']);
assert.ok(crashLoop.includes('{"sleep":{"local":"cm_sleep"}}') && crashLoop.includes('"global":"PERF_SAMPLING"') && crashLoop.includes('"global":"PERF_ALTITUDE_GATE"'), 'the impact monitor tick follows PERF_SAMPLING and the altitude gate PERF_ALTITUDE_GATE');
assert.ok(JSON.stringify(macros['location diagnostics monitor']).includes('"global":"PERF_LOG_LEVEL"') && JSON.stringify(macros['ground ops watch start']).includes('"global":"PERF_LOG_LEVEL"') && JSON.stringify(macros['ambulance operations monitor']).includes('"global":"PERF_LOG_LEVEL"'), 'the diagnostic monitors slow down in BASIC');

console.log('Diagnostic ring caps PASS: every diagnostic array is a ring (trimmed by one guarded removal, the location history a counted FIFO that keeps the newest 100 rows at 200), the runtime trace is capped at 4000 rows with the registry polling breadcrumbs thinned one in 20, the watcher unwinds between its stall snapshots. HPG/MSFS PENDING.');
