#!/usr/bin/env node
'use strict';
// User request of 2026-11-04 (audit item H3, limits chosen by common sense): the hoist operator calls PAUSE (PAX2.5) at 10 kt of ground speed or 15 degrees
// of bank and ABORT (PAX2.6) at 25 kt or 30 degrees, while somebody or the patient rides the cable down or up. The loop is executed by a small interpreter.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const macros = {};
for (const f of fs.readdirSync(path.join(root, 'mission-src/macros'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8')));
const mon = macros['hoist drift monitor'];
assert.ok(Array.isArray(mon), 'macro exists');
for (const [name, text] of [['hoist down', JSON.stringify(macros['hoist down'])], ['hoist up 1 operator', JSON.stringify(macros['hoist up 1 operator'])], ['hoist up operator+injured', JSON.stringify(macros['hoist up operator+injured'])]]) assert.ok(text.includes('"hoist drift monitor"'), name + ' starts the monitor');
assert.ok(JSON.stringify(macros['hoist panel']).includes('HOIST_PAUSE_STATE'), 'the panel shows the call');

function make() {
  const env = { locals: { HOIST_CREW_ON_CABLE: 1, HOIST_CABLE_PATIENT: 0, HOIST_CABLE_PHASE: 'down', VCP: 'APP' }, lvars: {}, messages: [], threads: 0, gs: 0, bk: 0 };
  const val = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if ('local' in x) return env.locals[x.local] === undefined ? null : env.locals[x.local];
    if ('var' in x) { const n = x.var[0]; if (n === 'GPS GROUND SPEED') return env.gs; if (n === 'PLANE BANK DEGREES') return env.bk; return env.lvars[n.replace('{local:VCP}', env.locals.VCP)] || 0; }
    if ('floor' in x) return Math.floor(val(x.floor));
    if ('add' in x) return x.add.map(val).reduce((a, b) => a + b, 0);
    throw new Error('unsupported ' + JSON.stringify(x));
  };
  const cmp = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b };
  const op = (c) => Object.keys(cmp).find((k) => k in c);
  const test = (c, o) => {
    let left;
    if (o && typeof o === 'object' && 'and' in o) left = o.and.every((r) => test(r, r.require)) ? 1 : 0;
    else if (o && typeof o === 'object' && 'or' in o) left = o.or.some((r) => test(r, r.require)) ? 1 : 0;
    else left = val(o);
    return cmp[op(c)](left, val(c[op(c)]));
  };
  let loop = null;
  const exec = (cmds) => {
    for (const c of cmds) {
      if (c['#comment'] !== undefined || c.sleep !== undefined) continue;
      if (c.set) {
        if (c.set.var) { const n = c.set.var[0].replace('{local:VCP}', env.locals.VCP); env.lvars[n] = val(c.value); } else env.locals[c.set.local] = val(c.value);
      } else if (c.if) { if (test(c, c.if)) exec(c.then || []); else if (c.else) exec(c.else); }
      else if (c.set_message) env.messages.push(c.set_message.text);
      else if (c.create_thread) { env.threads++; loop = c.create_thread.commands.find((x) => x.while); }
      else throw new Error('unsupported ' + JSON.stringify(c).slice(0, 90));
    }
  };
  env.start = () => exec(mon);
  env.step = (gs, bk, o = {}) => { env.gs = gs; env.bk = bk; Object.assign(env.locals, o); if (env.locals.HOIST_DRIFT_ACTIVE === 1 && loop) exec(loop.do); };
  return env;
}
const pauses = (e) => e.lvars['L:PAX2APP5'] || 0, aborts = (e) => e.lvars['L:PAX2APP6'] || 0;
let e = make(); e.start(); e.start();
assert.strictEqual(e.threads, 1, 'one monitor at a time');
e.step(3, 2); assert.strictEqual(pauses(e) + aborts(e), 0, 'calm: no call');
e.step(12, 2); assert.strictEqual(pauses(e), 1, '12 kt: pause'); assert.strictEqual(e.locals.HOIST_PAUSE_STATE, 'pause');
e.step(13, 2); e.step(14, 2); assert.strictEqual(pauses(e), 1, 'the pause is said once');
for (let i = 0; i < 3; i++) e.step(4, 3); assert.strictEqual(e.locals.HOIST_PAUSE_STATE, 'pause', 'not over before 2 s of calm');
e.step(4, 3); assert.strictEqual(e.locals.HOIST_PAUSE_STATE, '', 'over after 2 s of calm');
e.step(8, 12); assert.strictEqual(pauses(e), 1, '8 kt and 12 degrees: inside the limits');
e.step(2, -16); assert.strictEqual(pauses(e), 2, 'bank -16: a new pause');
e.step(30, 3); assert.strictEqual(aborts(e), 1, '30 kt: abort'); assert.strictEqual(e.locals.HOIST_PAUSE_STATE, 'abort');
e.step(31, 3); e.step(2, -31); assert.strictEqual(aborts(e), 1, 'abort once for each trip');
e.step(2, 2, { HOIST_CABLE_PHASE: 'ground' }); assert.strictEqual(e.locals.HOIST_PAUSE_STATE, '', 'on the ground: no call');
e.step(40, 2, { HOIST_CABLE_PHASE: 'out' }); assert.strictEqual(e.locals.HOIST_PAUSE_STATE, '', 'hoist out: its own ladders');
assert.strictEqual(aborts(e), 1);
e.step(2, 2, { HOIST_CABLE_PHASE: 'up', HOIST_CREW_ON_CABLE: 0, HOIST_CABLE_PATIENT: 0 }); assert.strictEqual(e.locals.HOIST_DRIFT_ACTIVE, 0, 'nobody on the hook: the monitor ends');
e = make(); e.start(); e.locals.HOIST_CREW_ON_CABLE = 0; e.locals.HOIST_CABLE_PATIENT = 1; e.locals.HOIST_CABLE_PHASE = 'up';
e.step(11, 0); assert.strictEqual(pauses(e), 1, 'the patient on the hook counts');
console.log('hoist drift monitor ok');
