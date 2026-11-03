#!/usr/bin/env node
'use strict';

// Daikan report of 2026-11-01 (170.03): after RETURN TO HOME BASE the macro `return to base` never ran (FPL_NMBR 100, no dispatch handoff row after the end of the mission,
// location_name still the hospital, the crew never got out at the base, the tablet kept the old message). The suspect is the base selection modal (a singleton: another modal
// replaces it, a modal raised from the click of the previous one can be lost). The modal now lives in its own macro, its answer is kept in base_selection_state, a guard shows it
// again while it is pending and takes the answer Return to starting point when the aircraft already stands at the base, and every step of the end of the mission is traced in
// base_return_log (standing request: all diagnostics at once). Static check of the production sources plus a run of the answer macros; the behaviour is HPG runtime, PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'mission-src');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'macros', file), 'utf8')));
const live = (list) => list.filter((entry) => !(entry && typeof entry === 'object' && '#comment' in entry));
const text = (value) => JSON.stringify(value);
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};
const traceCalls = (value) => collect(value, (c) => c.call_macro === 'trace return to base').map((c) => c.params.stage);

// ---- the menu: the modal is a macro, the selection is pending until answered, a guard watches it ------------------------------------
const menu = macros['return to base menu'];
assert.equal(menu.filter((c) => c.call_macro !== 'rtb step')[0].call_macro, 'mission failure statistics', 'the failure statistics stay the first command');
const mode = menu.find((c) => c.if?.global === 'DESTINATION_SELECTION_MODE');
const thenText = text(live(mode.then));
assert.ok(thenText.includes('"local":"base_selection_ops_over"},"value":0') && thenText.includes('"local":"base_selection_state"},"value":"pending"') && thenText.includes('"call_macro":"base selection modal"') && thenText.includes('"create_thread":{"commands":[{"call_macro":"base selection guard"}]}'), 'selection mode 1: state pending, modal shown by its macro, guard started in its own thread');
assert.ok(!text(menu).includes('set_modal'), 'the menu holds no inline modal any more');
assert.ok(text(live(mode.else)).includes('"call_macro":"return to base"'), 'without selection mode 1 the return to base starts at once, as before');

const modal = macros['base selection modal'].find((c) => c.set_modal).set_modal;
assert.equal(modal.title, 'DISPATCH ENDED. Destination base selection');
assert.deepEqual(modal.options.map((o) => o.text), ['Return to starting point', 'Select a base from map']);
assert.ok(!text(modal).includes('"params":[') || !/"text":"[^"]*\{0/.test(text(modal)), 'no params in the modal text (simulator test 2026-10-30)');
assert.ok(text(modal.options[0].commands).includes('"call_macro":"base selection start point"') && text(modal.options[1].commands).includes('"call_macro":"base selection map"'), 'the buttons call the answer macros');

// ---- the answers run once -------------------------------------------------------------------------------------------------
const run = (name, state, params = {}) => {
  const locals = { base_selection_state: state };
  const log = [];
  const walk = (list) => {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.call_macro === 'rtb step') continue; // step markers (rtb step) are checked by test-rtb-step-trace.js
      if (c.if) {
        const value = locals[c.if.local];
        const hit = c.eq !== undefined ? value === c.eq : value !== c.ne;
        walk(hit ? c.then : (c.else || []));
      } else if (c.set?.local) locals[c.set.local] = c.value;
      else if (c.call_macro) log.push(c.call_macro === 'trace return to base' ? `trace:${c.params.stage}` : c.call_macro);
      else if (c.create_location) log.push('create_location');
      else if (c.copy_stringtoken) log.push('copy_stringtoken');
      else if (c.set?.var) log.push('set_var');
      else throw new Error(`Unsupported ${JSON.stringify(c).slice(0, 80)}`);
    }
  };
  walk(macros[name]);
  return { locals, log };
};
const first = run('base selection start point', 'pending');
assert.equal(first.locals.base_selection_state, 'start_point');
assert.deepEqual(first.log, ['trace:modal_choice', 'set_var', 'create_location', 'copy_stringtoken', 'return to base'], 'the starting point answer sets the base and starts the return to base');
const again = run('base selection start point', 'start_point');
assert.deepEqual(again.log, ['trace:modal_choice_ignored'], 'a second answer (modal shown again, clicked after the guard decided) does nothing');
const viaMap = run('base selection map', 'pending');
assert.equal(viaMap.log.at(-1), 'return to base');
assert.deepEqual(run('base selection map', 'map').log, ['trace:modal_choice_ignored']);
assert.deepEqual(run('base selection map', 'start_point').log, ['trace:modal_choice_ignored'], 'one answer only, whichever button comes second');

// ---- the guard --------------------------------------------------------------------------------------------------------------
const guard = macros['base selection guard'];
const loop = guard.find((c) => c.while);
assert.deepEqual([loop.while, loop.eq], [{ local: 'base_selection_state' }, 'pending'], 'the guard runs while the selection is pending');
const body = text(loop.do);
assert.ok(body.startsWith('[{"sleep":10}'), 'every pass sleeps (the stack unwinds at a sleep)');
assert.ok(body.includes('"local":"base_selection_gen"},"ne":{"param":"gen"}') && body.includes('{"break":1}'), 'a guard of an older selection stops');
assert.ok(body.includes('"local":"base_selection_ops_over"},"eq":0') && body.includes('"var":["SIM ON GROUND","bool"]},"eq":0') && body.includes('"stage":"modal_guard_clock_start"') && body.includes('{"require":{"local":"base_selection_ops_over"},"eq":1}'), 'the 30 s clock and the automatic answer wait for the end of the operations (the aircraft has left the ground after the menu)');
assert.ok(body.indexOf('"stage":"modal_guard_clock_start"') < body.indexOf('"stage":"modal_guard_reshow"'), 'the clock starts before any show again');
assert.ok(body.includes('"var":["SIM ON GROUND","bool"]},"eq":1') && body.includes('"var":["GPS GROUND SPEED","knots"]},"lte":1') && body.includes('"local":"trb_dist_start"},"lt":700') && body.includes('"call_macro":"base selection start point","params":{"source":"guard"}'), 'on the ground, stopped, within 700 m of the starting point: the guard answers Return to starting point');
assert.ok(body.includes('"param":"ticks"},"gte":3') && body.includes('"local":"base_selection_shows"},"lt":20') && body.includes('"call_macro":"base selection modal"'), 'the modal is shown again every 30 s, 20 times at most');
assert.ok(traceCalls(guard).includes('modal_guard_reshow') && traceCalls(guard).includes('modal_guard_auto') && traceCalls(guard).includes('modal_guard_end'), 'every action of the guard is traced');

// ---- the trace --------------------------------------------------------------------------------------------------------------
const trace = macros['trace return to base'];
const row = text(live(trace));
for (const field of ['stage', 'detail', 'time', 'mission_timer', 'phase', 'dispatch_phase', 'dispatch_ended', 'fpl', 'rtb', 'end_waiting', 'selection_mode', 'bs_state', 'bs_shows', 'bs_gen', 'bs_ops_over', 'location_name', 'destination_confirmed', 'on_ground', 'ground_speed_kt', 'collective_ft', 'rotor_rpm', 'dist_start_m', 'dist_rtb_m', 'ready', 'step', 'hold', 'crew', 'copilot', 'hoist_crew', 'pax3', 'whobringpatient', 'second_dispatch']) assert.ok(row.includes(`"${field}":`), `the row carries ${field}`);
assert.ok(trace.some((c) => c.if?.struct?.local === 'base_return_log' && c.if.path === 'length' && c.gt === 300 && c.then.length === 1 && c.then[0].modify_array?.local === 'base_return_log' && c.then[0].removeIndex === 0), 'ring of 300 rows, one guarded removal');
assert.ok(/^[\x20-\x7e]*$/.test(text(macros['base selection modal']) + text(guard) + row), 'ASCII only');
const stages = new Set(collect(macros, (c) => c.call_macro === 'trace return to base').map((c) => c.params.stage));
const objectives = JSON.parse(fs.readFileSync(path.join(root, 'root', '02-objectives.json'), 'utf8'));
for (const stage of traceCalls(objectives)) stages.add(stage);
for (const stage of ['menu_enter', 'menu_modal_show', 'menu_direct', 'modal_choice', 'modal_choice_ignored', 'modal_guard_clock_start', 'modal_guard_reshow', 'modal_guard_auto', 'modal_guard_end', 'rtb_button', 'rtb_enter', 'rtb_route_set', 'rtb_heartbeat', 'rtb_within_2km', 'rtb_within_0_7km', 'rtb_landed', 'rtb_deboarding_launch', 'deboarding_enter', 'deboarding_wait_pilot', 'deboarding_pilot_done', 'accomplished_menu', 'end_mission_button', 'end_waiting_write', 'objective10_enter', 'objective10_done', 'objective_return_to_base', 'objective_mission_accomplished']) assert.ok(stages.has(stage), `stage ${stage} is traced`);

// every write of MISSION_END_WAITING is announced by a row just before it
let writes = 0;
const checkWrites = (value, where) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (item?.set?.local === 'MISSION_END_WAITING') {
        writes += 1;
        const before = value[index - 1];
        assert.ok(before?.call_macro === 'trace return to base' && before.params.stage === 'end_waiting_write', `${where}: the write of MISSION_END_WAITING is preceded by an end_waiting_write row`);
      }
      checkWrites(item, where);
    });
  } else if (value && typeof value === 'object') Object.values(value).forEach((child) => checkWrites(child, where));
};
for (const [name, commands] of Object.entries(macros)) if (name !== 'trace return to base') checkWrites(commands, name);
assert.equal(writes, 19, `all ${writes} writers of MISSION_END_WAITING are traced`);

// the buttons, the snapshots
assert.equal(macros['shared repeated block 046'][0].call_macro, 'rtb watch start', 'the step watcher starts first');
assert.equal(macros['shared repeated block 046'][1].call_macro, 'trace return to base', 'RETURN TO HOME BASE is traced right after the watcher starts');
assert.ok(text(macros['return to base menu']).indexOf('"stage":"menu_modal_show"') > text(macros['return to base menu']).indexOf('"value":100'), 'the modal row is written after FPL_NMBR 100');
for (const name of ['capture crew movement snapshot', 'snapshot dispatch diagnostics']) {
  const json = text(macros[name]);
  assert.ok(json.includes('"key":"base_return_log"},"value":{"json:copy":{"local":"base_return_log"}}') && json.indexOf('"local":"base_return_log"},"eq":null') < json.indexOf('"key":"base_return_log"'), `${name}: base_return_log goes into the snapshot table, initialised before the copy`);
}
assert.ok(text(macros['Debug_Dispatch_Page'] || macros).includes('RETURN TO BASE | RTB {0} | END WAITING {1} | SELECTION MODE {2}'), 'the SUMMARY page shows the selection state');

console.log('Return to base modal PASS: the base selection modal is its own macro, its answer is kept once in base_selection_state, a guard shows it again every 30 s (20 times) and answers Return to starting point when the aircraft stands at the base, every step of the end of the mission and every write of MISSION_END_WAITING is traced in base_return_log. HPG/MSFS PENDING.');
