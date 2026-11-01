#!/usr/bin/env node
'use strict';

// Tester report of 2026-11-01 (170.00, Daikan): after the mission a dispatch was proposed without the ACCEPT bar. The bar of a finished mission needs MISSION_PHASE above 8 and
// SECOND_DISPATCH 1 and accept_dispatch reloads the mission for a second dispatch only with that flag; ready dispatch is the only writer. Static check of the production
// source (the behaviour is HPG runtime, PENDING): ready dispatch traces its wait and its offer and writes the flag again at the end, the accept restores it from
// second_dispatch_offered, a second bar shows the ACCEPT when only the flag was lost, and the snapshot rows carry the fields that tell the cause.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
const dir = path.join(root, 'mission-src', 'macros');
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
const live = (list) => list.filter((entry) => !(entry && typeof entry === 'object' && '#comment' in entry));
const text = (value) => JSON.stringify(value);

const ready = text(live(macros['ready dispatch']));
for (const stage of ['ready_enter', 'ready_wait_start', 'ready_wait_end', 'ready_randomized', 'ready_offered']) {
  assert.ok(ready.includes(`"stage":"${stage}"`), `ready dispatch traces ${stage}`);
}
assert.ok(ready.indexOf('"stage":"ready_wait_start"') < ready.indexOf('"sleep":{"local":"WAIT_SECOND_DISPATCH"}') && ready.indexOf('"sleep":{"local":"WAIT_SECOND_DISPATCH"}') < ready.indexOf('"stage":"ready_wait_end"'), 'the wait is traced before and after the sleep');
assert.ok(ready.includes('{"set":{"local":"second_dispatch_offered"},"value":1}'), 'the offer is recorded in second_dispatch_offered');
const flagWrites = [...ready.matchAll(/\{"set":\{"local":"SECOND_DISPATCH"\},"value":1\}/g)].map((m) => m.index);
assert.equal(flagWrites.length, 3, 'ready dispatch writes SECOND_DISPATCH 1 three times: before the draw, right after it and again at the end');
assert.ok(flagWrites[0] < ready.indexOf('"call_macro":"randomize"'), 'the flag is raised before the draw, so a draw that does not come back cannot leave it at 0');
assert.ok(/"try":\[\{"call_macro":"randomize"\}\],"catch":\[[^\]]*"stage":"ready_randomize_error"/.test(ready), 'the draw runs in a try that leaves the row ready_randomize_error');
assert.ok(flagWrites[2] > ready.lastIndexOf('"call_macro":"Mission description"') && flagWrites[2] < ready.indexOf('"stage":"ready_offered"'), 'the last write comes after the last macro of the dispatch, before the offer row');

// a draw that did not end ready (no active missions, an error) must not offer the previous dispatch again: flags lowered, a row, a pause and the end of the macro
assert.ok(/"local":"randomize_result"\},"ne":"ready","then":\[\{"set":\{"local":"SECOND_DISPATCH"\},"value":0\},\{"set":\{"local":"second_dispatch_offered"\},"value":0\},\{"call_macro":"trace dispatch handoff","params":\{"stage":"ready_randomize_failed"\}\},\{"sleep":30\},\{"return":0\}\]/.test(ready), 'ready dispatch stops after a draw that is not ready');
assert.ok(ready.indexOf('"stage":"ready_randomize_failed"') < ready.indexOf('"stage":"ready_randomized"'), 'the failed draw ends the macro before the offer');

const accept = text(live(macros.accept_dispatch));
assert.ok(accept.includes('"stage":"accept_flag_restored"') && accept.includes('"local":"second_dispatch_offered"},"eq":1'), 'accept_dispatch restores the flag from second_dispatch_offered');
assert.ok(accept.indexOf('accept_flag_restored') < accept.indexOf('"stage":"accept_second"'), 'the flag is restored before the second dispatch is accepted');

const objective1 = text(live(macros.objective1));
assert.ok(objective1.includes('{"set":{"local":"second_dispatch_offered"},"value":0}'), 'objective1 clears second_dispatch_offered with the flag');
const objective4 = text(live(macros.objective4));
assert.ok(objective4.includes('"stage":"second_flag_cleared_objective4"') && objective4.includes('{"set":{"local":"second_dispatch_offered"},"value":0}'), 'objective4 says in a row when it clears a raised flag');

const briefing = fs.readFileSync(path.join(root, 'mission-src', 'root', '03-briefing.json'), 'utf8');
const bars = briefing.match(/"show_condition": \{"and":\[\{"require":\{"local":"MISSION_PHASE"\},"gt":8\},[^\n]*\n/g) || [];
assert.equal(bars.length, 2, 'two ACCEPT bars for a finished mission');
assert.ok(bars.some((line) => line.includes('"local":"SECOND_DISPATCH"},"eq":1')), 'the bar of the flag');
assert.ok(bars.some((line) => line.includes('"local":"second_dispatch_offered"},"eq":1') && line.includes('"local":"SECOND_DISPATCH"},"ne":1')), 'the bar for an offered dispatch whose flag was lost');
assert.ok(!/\bor\b/.test(bars.join('')), 'renderer conditions stay AND only');

const diagnostics = fs.readFileSync(path.join(dir, '19-location-diagnostics.json'), 'utf8');
for (const field of ['second_offered', 'dispatch_phase', 'dispatch_ended', 'newdispatch', 'progressive_unaccepted', 'wait_second_s', 'endwait_second', 'display_dispatch', 'hoc']) {
  assert.ok(diagnostics.includes(`"${field}":{`), `the handoff row carries ${field}`);
}
assert.ok(text(macros['refresh_unaccepted_dispatch_map']).includes('"stage":"preview_without_second_flag"'), 'a finished preview after the mission without the flag leaves a row');
console.log('Second dispatch flag PASS: wait, offer and flag are traced, the flag is written again at the end of ready dispatch, accept restores it, a second bar covers a lost flag. HPG/MSFS PENDING.');
