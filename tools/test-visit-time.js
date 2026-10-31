#!/usr/bin/env node
'use strict';

// SLOW (custom): the slot is the maximum visit time (CREW_SLOTH). Only the clinical visit counts (never the walks): the six steps of every
// casualty are random inside the slot, so TIMERGND (the timer) and the estimate that follows it stay inside the maximum.
// Production macros run on the shared HPG subset interpreter; HPG/MSFS is NOT modeled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'test-live-patient-transport.js'), 'utf8');
const context = { require, __dirname, structuredClone, console, module: { exports: {} } };
vm.runInNewContext(source.slice(0, source.indexOf('for (const resource of')) + '\nmodule.exports = Live;', context);
const Live = context.module.exports;
class Harness extends Live {
  name(n) { return n.replace(/\{local:(\w+)\}/g, (_, k) => this.locals[k]); }
  query(q, p) {
    if (q?.tofixed !== undefined) return String(Number(this.query(q.tofixed, p)).toFixed(q.digits ?? 0));
    if (Array.isArray(q?.var) && q.var[0].includes('{local:')) return this.locals[this.name(q.var[0])] ?? 0;
    return super.query(q, p);
  }
  commands(list, p) {
    for (const command of list) {
      if (Array.isArray(command.set?.var) && command.set.var[0].includes('{local:')) this.locals[this.name(command.set.var[0])] = this.query(command.value, p);
      else super.commands([command], p);
    }
  }
}

function groundTime({ max, victims, mode = 2 }) {
  const h = new Harness();
  h.sleepHook = null;
  Object.assign(h.locals, { HXX: 'H', VCP: 'V', HELOVICTIMS: victims, LIFESCORE: 80, 'L:H_PERSIST_MISSION_WAIT_TIME': mode, 'L:VDISPATCH2': 0 });
  h.globals = h.globals || {};
  h.globals.CREW_SLOTH = max;
  h.globals.ULTRASHORT = 'no';
  h.call('Ground time');
  return h;
}

const results = new Map();
for (const [max, victims] of [[360, 1], [360, 2], [900, 1], [900, 3], [1800, 2], [3600, 3]]) {
  const totals = [];
  for (let i = 0; i < 60; i += 1) {
    const h = groundTime({ max, victims });
    const steps = [h.locals.TIME1SHORT, h.locals.TIME2SHORT, h.locals.TIME3SHORT].slice(0, victims);
    assert.ok(steps.every((s) => Number.isInteger(s) && s >= 5), `steps are whole seconds of at least 5: ${JSON.stringify({ max, victims, steps })}`);
    // the visit only: TIMERGND is inside the maximum (the bias of +-10 s and the low life score add at most 70 s)
    assert.ok(h.locals.TIMERGND <= max + 70, `timer ${h.locals.TIMERGND} s for a maximum of ${max} s with ${victims} casualties`);
    totals.push(h.locals.TIMERGND);
  }
  results.set(`${max}/${victims}`, totals);
}
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
assert.ok(avg(results.get('900/1')) > avg(results.get('360/1')), 'a longer maximum gives a longer visit');
assert.ok(avg(results.get('360/1')) > 0.5 * 360, 'the visit really uses the slot, it is not squeezed to the minimum');
// the other levels keep their own ranges
{
  const h = groundTime({ max: 360, victims: 1, mode: 0 });
  assert.ok(h.locals.TIME1SHORT >= 20 && h.locals.TIME1SHORT < 40, 'MEDIUM keeps 20-40 s per step');
  const s = groundTime({ max: 360, victims: 1, mode: 1 });
  assert.ok(s.locals.TIME1SHORT >= 12 && s.locals.TIME1SHORT < 25, 'FAST keeps 12-25 s per step');
}
// the waits of the other flows: in SLOW the visit is the long wait only
const read = (name) => fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', `${name}.json`), 'utf8');
const hoist = read('09-hoist-ground-ops');
assert.equal((hoist.match(/"ne": 2,\s*"then": \[\s*\{"sleep":\{"rand":\[\{"local":"TIME1SHORT"\},50\]\}\}/g) || []).length, 2, 'both heli-rescuer visits skip the short and medium waits in SLOW');
assert.ok(/"patient_wait_interval": \[\s*\{"#comment":[^\n]*\n\s*\{"if": \{"var":\["L:\{local:HXX\}_PERSIST_MISSION_WAIT_TIME","number"\]\}, "eq": 0,/.test(read('07-patient-medical')), 'the medium wait of the legacy waits is for MEDIUM only');
console.log('Visit time PASS: in SLOW (custom) the maximum visit time is the slot of the clinical steps, the timer and the estimate follow it, the other levels are unchanged. HPG/MSFS PENDING.');
