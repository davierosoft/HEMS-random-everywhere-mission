#!/usr/bin/env node
'use strict';
// Rule of the user (2026-11-03): when a macro stops and the point is not known, EVERY step from the last valid
// step to the failing one is monitored from the first build. Every command of "return to base" between the
// entry and the route set must be preceded by a call to "rtb step" (or be part of the marker/watch machinery),
// the nested macros it calls must set rtb_step, and the watcher thread must run until the route is set.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const load = (f) => JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8'));
const lifecycle = load('11-mission-lifecycle.json');
const nav = load('05-navigation-queries.json');
const marshal = load('12-marshalling.json');
const fail = (m) => { console.error('RTB step trace FAIL: ' + m); process.exit(1); };

const body = lifecycle['return to base'];
if (!Array.isArray(body)) fail('macro return to base missing');
const isStep = (c) => c && c.call_macro === 'rtb step';
const start = body.findIndex((c) => c && c.set && c.set.local === 'rtb_watch');
const end = body.findIndex((c) => c && c.call_macro === 'trace return to base' && c.params && c.params.stage === 'rtb_route_set');
if (start < 0 || end < 0 || end < start) fail('watch start or rtb_route_set missing');
if (!body.some((c) => c && c.create_thread && JSON.stringify(c).includes('rtb step watch'))) fail('the watcher thread is not started');
let steps = 0;
for (let i = start; i < end; i++) {
  const c = body[i];
  const text = JSON.stringify(c);
  if (c.set && (c.set.local === 'rtb_watch' || c.set.local === 'rtb_step')) continue;
  if (c.create_thread && text.includes('rtb step watch')) continue;
  if (c.call_macro === 'trace return to base' && c.params.stage === 'rtb_enter') continue;
  if (isStep(c)) { steps++; continue; }
  if (!isStep(body[i - 1])) fail('command ' + i + ' has no rtb step before it: ' + text.slice(0, 120));
}
if (steps < 14) fail('only ' + steps + ' steps marked');
if (!JSON.stringify(body[end + 1]).length || !body.slice(start, end + 1).some((c) => c.set && c.set.local === 'rtb_watch' && c.value === 0)) fail('the watcher is not stopped at the route set');
for (const [mod, name, mark] of [[lifecycle, 'Update_raw from dispatchphase', 'update_raw:enter'], [nav, 'routeupdate', 'routeupdate:'], [marshal, 'restore return base marshall', 'restore_marshall:enter']]) {
  if (!JSON.stringify(mod[name]).includes('"rtb_step"') || !JSON.stringify(mod[name]).includes(mark)) fail(name + ' does not mark rtb_step');
}
const ru = JSON.stringify(nav.routeupdate);
for (const m of ['wait_lock', 'lock_taken', 'target_checked', 'create_route_start', 'route_start_created', 'sleep_2', 'set_route', 'done']) {
  if (!ru.includes('routeupdate:' + m)) fail('routeupdate step ' + m + ' missing');
}
if (!lifecycle['rtb step'] || !lifecycle['rtb step watch']) fail('rtb step macros missing');
console.log('RTB step trace PASS: every command of return to base from the entry to the route set is preceded by a step row (' + steps + ' steps), the nested macros mark rtb_step, the watcher thread writes the last step until the route is set. HPG/MSFS PENDING.');
