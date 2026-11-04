#!/usr/bin/env node
'use strict';
// Report of Daikan (2026-11-04, 170.09): the second dispatch comes at once whatever the configured waiting time (up to 2 h). The snapshot of 170.05
// shows ready_wait_start with WAIT_SECOND_DISPATCH 1960 s and ready_wait_end 6 s later: the long sleep of a local was not honoured. The end of the
// wait of "ready dispatch" is the mission clock: wait_for L:MISSION_TIME reaches ENDWAIT_SECOND_DISPATCH (MISSION_TIME + WAIT_SECOND_DISPATCH, set
// before the first sleep). The commands of the wait are executed here by a small interpreter with a clock.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const macros = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros/11-mission-lifecycle.json'), 'utf8'));
const rd = macros['ready dispatch'];
const text = JSON.stringify(rd);
assert.ok(!/"sleep":\{"local":"WAIT_SECOND_DISPATCH"\}/.test(text), 'no long sleep of the local any more');
function findArrays(node, out = []) { if (Array.isArray(node)) { out.push(node); node.forEach((c) => findArrays(c, out)); } else if (node && typeof node === 'object') Object.values(node).forEach((c) => findArrays(c, out)); return out; }
const isClockWait = (c) => c && c.wait_for && JSON.stringify(c.wait_for) === '{"var":["L:MISSION_TIME","number"]}' && c.gte && c.gte.local === 'ENDWAIT_SECOND_DISPATCH';
const arr = findArrays(rd).find((a) => a.some(isClockWait));
assert.ok(arr, 'the wait ends on the mission clock');
assert.strictEqual(arr.filter(isClockWait).length, 1, 'one clock wait');
const idx = arr.findIndex(isClockWait);
// order of the whole sequence in the same branch: end computed, row start, short sleep, availability, message, clock wait, row end
const names = arr.map((c) => (c.set && c.set.local) || (c.call_macro ? c.call_macro + ':' + c.params.stage : c.sleep !== undefined ? 'sleep' : c.set_message ? 'message' : c.or ? 'or' : isClockWait(c) ? 'clockwait' : c['#comment'] ? '#' : '?'));
const pos = (n) => names.indexOf(n);
assert.ok(pos('ENDWAIT_SECOND_DISPATCH') < pos('trace dispatch handoff:ready_wait_start'), 'end computed before the start row');
assert.ok(pos('trace dispatch handoff:ready_wait_start') < pos('sleep') && pos('sleep') < pos('clockwait') && pos('clockwait') < pos('trace dispatch handoff:ready_wait_end'), 'start row, short sleep, clock wait, end row');
assert.ok(JSON.stringify(arr[idx + 1].params.detail).includes('rdw_t0'), 'the end row says the seconds waited');
const endSet = arr.find((c) => c.set && c.set.local === 'ENDWAIT_SECOND_DISPATCH');
assert.ok(JSON.stringify(endSet.value).includes('L:MISSION_TIME') && JSON.stringify(endSet.value).includes('WAIT_SECOND_DISPATCH'), 'end = clock + wait');

// execution with a clock: sleep advances it, the clock wait jumps to the end
function run(waitSeconds) {
  const env = { WAIT_SECOND_DISPATCH: waitSeconds, ENDWAIT_SECOND_DISPATCH: null };
  let clock = 1000;
  const ev = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if ('local' in x) return env[x.local];
    if ('var' in x) return clock;
    if ('add' in x) return x.add.map(ev).reduce((a, b) => a + b, 0);
    throw new Error('unsupported ' + JSON.stringify(x));
  };
  const start = clock;
  for (const c of arr) {
    if (c.set && c.set.local === 'ENDWAIT_SECOND_DISPATCH') env.ENDWAIT_SECOND_DISPATCH = ev(c.value);
    else if (c.set && c.set.local === 'rdw_t0') env.rdw_t0 = ev(c.value);
    else if (c.sleep !== undefined) clock += Array.isArray(c.sleep) ? c.sleep[1] : 0;
    else if (isClockWait(c)) clock = Math.max(clock, env.ENDWAIT_SECOND_DISPATCH);
    if (c.call_macro === 'trace dispatch handoff' && c.params.stage === 'ready_wait_end') break;
  }
  return clock - start;
}
for (const w of [1, 4.2, 300, 1960.479487694622, 7200]) {
  const waited = run(w);
  assert.ok(waited >= w, `waited ${waited} s for ${w}`);
}
console.log('second dispatch wait ok: the clock wait ends at MISSION_TIME + the configured wait');
