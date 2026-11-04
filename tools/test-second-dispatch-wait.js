#!/usr/bin/env node
'use strict';
// Report of Daikan (2026-11-04, 170.09): the second dispatch comes at once whatever the configured waiting time (up to 2 h). The snapshot of 170.05
// shows ready_wait_start with WAIT_SECOND_DISPATCH 1960 s and ready_wait_end 6 s later. The wait of "ready dispatch" is a loop of 5 s sleeps that
// counts the seconds; the loop is executed here by a small interpreter with a clock.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const macros = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros/11-mission-lifecycle.json'), 'utf8'));
const rd = macros['ready dispatch'];
const text = JSON.stringify(rd);
assert.ok(!/"sleep":\{"local":"WAIT_SECOND_DISPATCH"\}/.test(text), 'no long sleep of the local any more');
function find(node, pred, out = []) { if (Array.isArray(node)) node.forEach((c) => find(c, pred, out)); else if (node && typeof node === 'object') { if (pred(node)) out.push(node); Object.values(node).forEach((c) => find(c, pred, out)); } return out; }
const loops = find(rd, (n) => n.while && n.while.local === 'rdw_waited');
assert.strictEqual(loops.length, 1, 'one wait loop');
function findArrays(node, out = []) { if (Array.isArray(node)) { out.push(node); node.forEach((c) => findArrays(c, out)); } else if (node && typeof node === 'object') Object.values(node).forEach((c) => findArrays(c, out)); return out; }
const arr = findArrays(rd).find((a) => a.includes(loops[0]));
const idx = arr.indexOf(loops[0]);
assert.deepStrictEqual(arr[idx - 1].set, { local: 'rdw_waited' }, 'the counter is set to 0 before the loop');
assert.strictEqual(arr[idx - 1].value, 0);
assert.strictEqual(arr[idx + 1].params.stage, 'ready_wait_end', 'the row ready_wait_end follows the loop');
assert.ok(JSON.stringify(arr[idx + 1].params.detail).includes('rdw_waited'), 'the row says how long it waited');

function run(waitSeconds) {
  const env = { WAIT_SECOND_DISPATCH: waitSeconds, rdw_waited: null };
  let clock = 0;
  const ev = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if ('local' in x) return env[x.local];
    if ('add' in x) return x.add.map(ev).reduce((a, b) => a + b, 0);
    throw new Error('unsupported ' + JSON.stringify(x));
  };
  const cmp = { lt: (a, b) => a < b };
  const exec = (cmds) => {
    for (const c of cmds) {
      if (c.set) env[c.set.local] = ev(c.value);
      else if (c.sleep !== undefined) clock += ev(c.sleep);
      else if (c.while) { let guard = 0; while (cmp.lt(ev(c.while), ev(c.lt))) { exec(c.do); if (++guard > 100000) throw new Error('endless loop'); } }
    }
  };
  exec(arr.slice(idx - 1, idx + 1));
  return { clock, waited: env.rdw_waited };
}
for (const w of [1, 4.2, 300, 1960.479487694622, 7200]) {
  const r = run(w);
  assert.ok(r.clock >= w, `waited ${r.clock} s for ${w}`);
  assert.ok(r.clock < w + 5, `no more than one step over ${w}`);
  assert.strictEqual(r.waited, r.clock);
}
console.log('second dispatch wait ok: the loop waits the configured time');
