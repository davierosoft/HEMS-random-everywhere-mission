#!/usr/bin/env node
'use strict';

// Daikan report of 2026-11-01 (170.03): the tablet still said "Wait for copilot to board again" on the MISSION ACCOMPLISHED screen, with the copilot already back on board.
// After the return to base FPL_NMBR is 100, none of the destination messages 1-8 of the engine checks applies and nothing replaced the text. The engine checks (preflight,
// engine1, engine2, quickstart) now finish with a message when FPL_NMBR is above 8, which is shown a few seconds and removed. Standing request of the same day: weight diagnostics
// in every phase (payload_weight_log). Static check of the production sources; the behaviour is HPG runtime, PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', 'mission-src', 'macros');
const macros = {};
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
const live = (list) => list.filter((entry) => !(entry && typeof entry === 'object' && '#comment' in entry));
const text = (value) => JSON.stringify(value);

const back = text(live(macros['copilot back message']));
assert.ok(/"create_thread":\{"commands":\[\{"set_message":\{"text":"Copilot is back on board[^"]*"\}\},\{"sleep":6\},\{"set_message":\{"text":""\}\}\]\}/.test(back), 'the message is shown in its own thread, then removed');
assert.ok(/^[\x20-\x7e]*$/.test(back), 'ASCII only');
const call = '{"if":{"local":"FPL_NMBR"},"gt":8,"then":[{"call_macro":"copilot back message"}]}';
for (const name of ['preflight', 'engine1', 'engine2', 'quickstart']) {
  const body = text(live(macros[name]));
  assert.ok(body.includes(call), `${name} completes and removes the message after the mission`);
  assert.ok(body.indexOf(call) < body.indexOf('{"set":{"var":["L:READY","number"]},"value":1}', body.indexOf(call)) && body.indexOf(call) > body.indexOf('"hospital_user"'), `${name}: after the destination messages, before READY`);
}

// weight diagnostics
const trace = text(live(macros['trace payload weights']));
for (const field of ['stage', 'time', 'mission_timer', 'phase', 'crew', 'kit_option', 'impl_pilot0', 'impl_pilot1', 'pilot_out', 'copilot', 'pax1', 'pax2', 'pax5', 'pax3', 'total_kg']) assert.ok(trace.includes(`"${field}":`), `the weight row carries ${field}`);
for (let n = 1; n <= 6; n += 1) for (const prefix of ['hoistocc_', 'set_', 'person_', 'kit_']) assert.ok(trace.includes(`"${prefix}${n}":`), `the weight row carries ${prefix}${n}`);
assert.ok(trace.includes('"PAYLOAD STATION WEIGHT:1","kilograms"'), 'the written weights are read back from the simulator');
assert.ok(/"struct":\{"local":"payload_weight_log"\},"path":"length"\},"gt":300/.test(trace), 'a ring of 300 rows');
const recompute = text(live(macros['station weights recompute']));
assert.ok(recompute.endsWith('{"call_macro":"trace payload weights","params":{"stage":"recompute"}}]'), 'every recompute (every change, every phase) leaves a row');
assert.ok(!/call_macro":"(station weights (read|recompute)|set station weight)"/.test(trace), 'the trace macro never calls the weight macros (no recursion)');
for (const name of ['engine1', 'engine2']) {
  const body = text(live(macros[name]));
  assert.equal([...body.matchAll(new RegExp(`"stage":"copilot_out_${name}"`, 'g'))].length, 1, `${name}: a row when the copilot leaves`);
  assert.equal([...body.matchAll(new RegExp(`"stage":"copilot_back_${name}"`, 'g'))].length, 3, `${name}: a row at each of the three returns`);
}
const diagnostics = fs.readFileSync(path.join(dir, '19-location-diagnostics.json'), 'utf8');
assert.ok(diagnostics.includes('"key":"payload_weight_log"},"value":{"json:copy":{"local":"payload_weight_log"}}'), 'the log goes into the snapshot tables');
assert.equal([...diagnostics.matchAll(/"key":"payload_weight_log"\},"value":\{"json:copy"/g)].length, 2, 'manual and dispatch snapshot tables');
console.log('Copilot message and weight diagnostics PASS: the post-mission message is completed and removed, payload_weight_log records every weight recompute and the copilot exits and returns. HPG/MSFS PENDING.');