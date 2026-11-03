#!/usr/bin/env node
'use strict';
// Report of Steph and Andrew (2026-11-03): after the heli rescuers were left at the landing spot the helicopter landed far away and they
// walked to it wherever it was. The margin is the radius of the landing spot of the ground operations (ldg_spot_area_size,
// LANDING_SPOT_GND). Macro "ground return gate" runs before the walk back to the helicopter: inside = go, outside = wait, tell the
// pilot, and let the user choose (bring the helicopter closer, hover for the hoist when allowed, or WALK TO THE HELICOPTER ANYWAY).
// The macro is executed here by a small coroutine interpreter (the crew and a heli rescuer can wait at the same time).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const macros = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros/09-hoist-ground-ops.json'), 'utf8'));
const gate = macros['ground return gate'];
assert.ok(Array.isArray(gate), 'the macro exists');

function world(init) {
  return { locals: { ldg_spot_area_size: 150, ...(init.locals || {}) }, vars: { 'L:MISSION_HOIST': 0, 'SIM ON GROUND': 1, ...(init.vars || {}) },
    dist: init.dist, hasSpot: init.hasSpot !== false, actions: new Map(), messages: [], checkpoints: [], time: 0 };
}
function* run(w, body, params) {
  const P = { ...params };
  const ev = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return x.map(ev);
    const k = Object.keys(x);
    if ('local' in x && k.length === 1) return w.locals[x.local] ?? null;
    if ('param' in x && k.length === 1) return P[x.param] ?? null;
    if ('var' in x && k.length === 1) { const n = x.var[0]; return w.vars[n]; }
    if ('round' in x) { const v = ev(x.round); return Math.round(v); }
    if ('location' in x && x.var === 'distance:m') return w.dist;
    if ('add' in x) return ev(x.add).reduce((a, b) => a + b, 0);
    throw new Error('unsupported expression ' + JSON.stringify(x));
  };
  const OPS = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b };
  const operand = (c) => ('if' in c ? c.if : ('while' in c ? c.while : c.require));
  const test = (c) => {
    const o = operand(c);
    let left;
    if (o && typeof o === 'object' && 'has_location' in o) left = (o.has_location === 'landing_spot' && w.hasSpot) ? 1 : 0;
    else if (o && typeof o === 'object' && 'has_user_action' in o) left = w.actions.has(o.has_user_action) ? 1 : 0;
    else left = ev(o);
    for (const op of Object.keys(OPS)) if (op in c) return OPS[op](left, ev(c[op]));
    return !!left;
  };
  const cond = (c) => {
    const o = operand(c);
    if (o && o.or) return o.or.some((x) => test(x)) === (c.eq === undefined ? true : c.eq === 1);
    if (o && o.and) return o.and.every((x) => test(x)) === (c.eq === undefined ? true : c.eq === 1);
    return test(c);
  };
  function* walk(list) {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.set) { const v = ev(c.value); if (c.set.local) w.locals[c.set.local] = v; else if (c.set.param) P[c.set.param] = v; else throw new Error('set kind'); }
      else if (c.if) yield* walk(cond(c) ? c.then : (c.else || []));
      else if (c.while) { let g = 0; while (cond(c)) { yield* walk(c.do); if (++g > 5000) throw new Error('loop'); } }
      else if (c.sleep !== undefined) yield c.sleep;
      else if (c.set_message) {
        let t = c.set_message.text; (c.set_message.params || []).forEach((p, i) => { t = t.replace('{' + i + '}', String(ev(p))); }); w.messages.push(t);
      } else if (c.create_user_action) { w.actions.set(c.create_user_action.id, c.create_user_action); }
      else if (c.destroy_user_action) { w.actions.delete(c.destroy_user_action); }
      else if (c.call_macro === 'ground ops checkpoint') {
        const d = c.params.detail; let t = typeof d === 'string' ? d : d.text.replace(/\{(\d)\}/g, (_, i) => String(ev(d.params[Number(i)])));
        w.checkpoints.push(c.params.id + ': ' + t);
      } else throw new Error('unsupported command ' + JSON.stringify(c).slice(0, 90));
    }
  }
  yield* walk(body);
}
// executes the coroutines, one step per second of the simulated clock, and lets the test change the world between steps
function exec(w, jobs, script = () => {}, maxSeconds = 600) {
  const running = jobs.map((j) => ({ ...j, gen: run(w, gate, j.params), done: false }));
  for (let t = 0; t <= maxSeconds && running.some((j) => !j.done); t++) {
    w.time = t; script(t, w);
    for (const j of running) { if (j.done) continue; const r = j.gen.next(); if (r.done) { j.done = true; j.at = t; } }
  }
  return running;
}
const crew = { name: 'crew', params: { source: '3 crew ground ops', hover_ok: 0 } };
const hr = { name: 'hr', params: { source: 'gnd ops heli rescuer down', hover_ok: 1 } };

// 1) inside the landing spot area: nothing to wait for, nothing shown
{
  const w = world({ dist: 90 });
  const r = exec(w, [crew]);
  assert.ok(r[0].done && r[0].at === 0, 'inside: passes at once');
  assert.deepEqual(w.messages, []); assert.strictEqual(w.actions.size, 0);
  assert.ok(w.checkpoints.some((c) => /ret_gate_passed: .*inside the landing spot area/.test(c)), 'traced');
}
// 2) outside: the crew does not walk, the pilot is told how far, the button exists, a closer helicopter ends the wait
{
  const w = world({ dist: 1500 });
  const r = exec(w, [crew], (t, ww) => { if (t === 40) ww.dist = 120; });
  assert.ok(r[0].done && r[0].at >= 40 && r[0].at <= 42, 'waits while the helicopter is far (until ' + r[0].at + ')');
  assert.ok(w.messages.length === 1 && /1500 m from the landing spot, the limit is 150 m/.test(w.messages[0]), 'the pilot is told the distance and the limit: ' + w.messages[0]);
  assert.strictEqual(w.actions.size, 0, 'the button is gone when nobody waits');
  assert.ok(w.checkpoints.some((c) => /ret_gate_enter/.test(c)) && w.checkpoints.filter((c) => /ret_gate_wait/.test(c)).length >= 3, 'every 10 s a row says it still waits');
  assert.strictEqual(w.locals.grg_waiters, 0);
}
// 3) the user chooses to walk
{
  const w = world({ dist: 1500 });
  let seen = false;
  const r = exec(w, [crew], (t, ww) => {
    if (t === 15) { const a = ww.actions.get('grg_walk'); assert.ok(a, 'the button WALK TO THE HELICOPTER ANYWAY exists'); assert.strictEqual(a.title, 'WALK TO THE HELICOPTER ANYWAY'); seen = true;
      // the click commands of the action, executed like the engine does
      ww.locals.grg_walk_far = a.click_commands[0].value; ww.actions.delete('grg_walk'); }
  });
  assert.ok(seen && r[0].done && r[0].at <= 17, 'the user choice lets them walk');
  assert.ok(w.checkpoints.some((c) => /reason=the user chose to walk/.test(c)));
}
// 4) hover: ends the wait of the heli rescuers only
{
  const w = world({ dist: 1500, vars: { 'SIM ON GROUND': 0 } });
  const r = exec(w, [hr, crew], (t, ww) => { if (t === 60) ww.dist = 100; });
  assert.ok(r[0].done && r[0].at <= 1, 'a hovering helicopter: the heli rescuers go to the hoist at once');
  assert.ok(r[1].done && r[1].at >= 60, 'the crew keep waiting while it hovers far away (until ' + r[1].at + ')');
  assert.strictEqual(w.locals.grg_waiters, 0, 'both left');
  assert.strictEqual(w.actions.size, 0, 'the button is destroyed by the last one that leaves');
}
// 5) both wait on the ground: the button stays until the last one leaves, and the first one leaving does not release the other
{
  const w = world({ dist: 800 });
  const r = exec(w, [crew, hr], (t, ww) => { if (t === 30) ww.vars['SIM ON GROUND'] = 0; if (t === 80) { ww.vars['SIM ON GROUND'] = 1; ww.dist = 60; } });
  assert.ok(r[1].done && r[1].at >= 30 && r[1].at <= 32, 'the heli rescuers leave when the helicopter hovers');
  assert.ok(r[0].done && r[0].at >= 80, 'the crew leave only when the helicopter is inside the area again (' + r[0].at + ')');
}
// 6) skid landing operations and a mission without landing spot keep their own rules
{
  const w = world({ dist: 3000, vars: { 'L:MISSION_HOIST': 2 } });
  const r = exec(w, [crew]); assert.ok(r[0].done && r[0].at === 0 && w.messages.length === 0, 'skid ops: no wait here');
  const w2 = world({ dist: 3000, hasSpot: false });
  const r2 = exec(w2, [crew]); assert.ok(r2[0].done && r2[0].at === 0 && w2.messages.length === 0, 'no landing spot: nothing to compare');
}
// 7) a user choice made earlier in the same scene is not erased by the next gate, and it is cleared at the start of the operations
{
  const w = world({ dist: 1500, locals: { grg_walk_far: 1 } });
  const r = exec(w, [crew]); assert.ok(r[0].done && r[0].at === 0, 'a choice already made passes the gate');
}

// 8) call sites
const text = (x) => JSON.stringify(x);
for (const [macro, src] of [['4 or 5 crew ground ops', 'c45'], ['3 crew ground ops', 'c3']]) {
  const t = text(macros[macro]);
  const g = t.indexOf('"call_macro":"ground return gate","params":{"source":"' + macro + '","hover_ok":0}');
  const msg = t.indexOf('Ground crew operations are almost complete');
  const nr = t.indexOf('"id":"' + src + '_nr_gate_call"', msg);
  assert.ok(g > 0 && msg > 0 && nr > 0 && msg < g && g < nr, macro + ': the gate runs after the "almost complete" message and before the NR gate of the return');
  assert.strictEqual(t.split('"call_macro":"ground return gate"').length - 1, 1, macro + ': one gate');
}
for (const [macro, src, waitKey] of [['gnd ops heli rescuer down', 'gnd ops heli rescuer down', '"local":"HOLDHOISTED"},"eq":1'], ['hoist heli rescuer down', 'hoist heli rescuer down', '"local":"HR_HOISTING_LOCK"},"eq":0']]) {
  const t = text(macros[macro]);
  const w = t.lastIndexOf(waitKey);
  const g = t.indexOf('"call_macro":"ground return gate","params":{"source":"' + src + '","hover_ok":1}');
  const br = t.indexOf('"call_macro":"gnd ops heli rescuer up"');
  assert.ok(w > 0 && g > w && g < t.indexOf('"var":["SIM ON GROUND","bool"]},"ne":1', g) && g < br, macro + ': the gate runs after the wait and before the choice between hoist and ground');
  assert.ok(t.startsWith('[{"set":{"local":"grg_walk_far"},"value":0}'), macro + ': the user choice is cleared at the start of the heli rescuer');
}
assert.ok(text(macros['ground ops'].slice(0, 6)).includes('"grg_walk_far"'), 'ground ops clears the user choice at its start');
console.log('Ground return gate PASS: inside the landing spot area they go, outside they wait and the pilot is told the distance and the limit, the user can bring the helicopter closer, hover for the hoist (heli rescuers) or choose to walk, the crew and a heli rescuer can wait together, skid operations keep their own rule, the four call sites. HPG/MSFS PENDING.');
