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
const start = body.findIndex((c) => c && c.call_macro === 'rtb watch start');
const end = body.findIndex((c) => c && c.call_macro === 'trace return to base' && c.params && c.params.stage === 'rtb_route_set');
if (start < 0 || end < 0 || end < start) fail('watch start or rtb_route_set missing');
if (!JSON.stringify(lifecycle['rtb watch start'] || []).includes('rtb step watch')) fail('the watcher thread is not started');
let steps = 0;
for (let i = start; i < end; i++) {
  const c = body[i];
  const text = JSON.stringify(c);
  if (c.set && (c.set.local === 'rtb_watch' || c.set.local === 'rtb_step')) continue;
  if (c.call_macro === 'rtb watch start') continue;
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
// the button and the menus before return to base: every command carries a step marker
const shared = load('14-shared-runtime.json');
function stepped(list, label) {
  let n = 0;
  list.forEach((c, i) => {
    if (!c || c.call_macro === 'rtb step' || c.call_macro === 'rtb watch start' || (c.set && c.set.local === 'rtb_step') || c['#comment'] !== undefined) return;
    if (c.call_macro === 'trace return to base') return;
    if (!(list[i - 1] && list[i - 1].call_macro === 'rtb step')) fail(label + ' command ' + i + ' has no rtb step before it: ' + JSON.stringify(c).slice(0, 110));
    n++;
  });
  return n;
}
if (!JSON.stringify(shared['shared repeated block 046']).includes('rtb watch start')) fail('the RETURN TO HOME BASE button does not start the watcher');
const nBtn = stepped(shared['shared repeated block 046'], 'button block 046');
const menu = lifecycle['return to base menu'];
const nMenu = stepped(menu.filter((c) => !(c && c.if)), 'return to base menu');
const sel = menu.find((c) => c && c.if && JSON.stringify(c).includes('menu_modal_show'));
if (!sel) fail('selection mode branch missing');
const nThen = stepped(sel.then.filter((c) => !(c && c.if) && !(c && c.create_thread) && !(c && c.set && ['base_selection_gen', 'base_selection_state', 'base_selection_shows', 'base_selection_ops_over'].includes(c.set.local))), 'menu modal branch');
const nElse = stepped(sel.else, 'menu direct branch');
const nStart = stepped(lifecycle['base selection start point'][1].then.filter((c) => !(c && c.set && c.set.local === 'base_selection_state')), 'base selection start point');
const nMap = stepped(lifecycle['base selection map'][0].then.filter((c) => !(c && c.set && c.set.local === 'base_selection_state')), 'base selection map');
for (const name of ['scene responders release later', 'mission failure statistics', 'base selection modal']) {
  if (!JSON.stringify(lifecycle[name]).includes('"rtb_step"')) fail(name + ' does not mark rtb_step');
}
if (!lifecycle['rtb step'] || !lifecycle['rtb step watch']) fail('rtb step macros missing');
console.log('RTB step trace PASS: every command of return to base from the entry to the route set is preceded by a step row (' + steps + ' steps; button ' + nBtn + ', menu ' + (nMenu + nThen + nElse) + ', choices ' + (nStart + nMap) + '), the nested macros mark rtb_step, the watcher thread writes the last step until the route is set. HPG/MSFS PENDING.');
