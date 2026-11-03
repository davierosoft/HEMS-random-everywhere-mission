#!/usr/bin/env node
'use strict';
// Report of Daikan (2026-11-03, snapshot drive_watchdog_police_state failed): the watchdog thread of an earlier call of "drive X safe"
// fired while a later call had the shared state moving again, set it to failed and moved the vehicle to the fallback of the old call
// (drv_pol_start at 819 s, drv_pol_timeout "after 360s" at 843 s; the call of 483 s had the same 360 s timeout).
// The watchdog now acts only when the newest call has run for its own timeout.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros/08-ground-response.json'), 'utf8'));
const names = Object.keys(m).filter((k) => /^drive .*safe/.test(k));
assert.strictEqual(names.length, 18, 'all the 18 safe drive macros');
for (const name of names) {
  const text = JSON.stringify(m[name]);
  const state = text.match(/drive_watchdog_[a-z0-9_]*state/)[0];
  const base = state.replace(/state$/, '');
  assert.ok(text.includes(`"local":"${base}t0"`) && text.includes(`"local":"${base}tmo"`), name + ': start stamp and timeout of the call');
  assert.ok(text.includes(`"subtract":[{"local":"${base}tmo"},2]`) || text.includes(`{"subtract":[{"local":"${base}tmo"},2]}`) || /"gte":\{"subtract":\[\{"local":"[a-z0-9_]*tmo"\},2\]\}/.test(text), name + ': the watchdog waits for the timeout of the newest call');
}
// the snap of the police to POL (speed = distance, about one second) does not wait 360 s
const snap = JSON.stringify(m.police_return_after_crew_pickup);
assert.ok(!/"fallback":"POL","speed":\{[^}]*\},"var1":1,"timeout":360/.test(snap), 'police snap to POL has a short timeout');
console.log('drive watchdog generation ok');
