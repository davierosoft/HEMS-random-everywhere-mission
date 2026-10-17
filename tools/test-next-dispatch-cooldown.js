#!/usr/bin/env node
'use strict';

// Tester report of 2026-10-17 (169.58, DATAQUERYSERVICE 1): the NEXT DISPATCH button stays inactive forever. The button is disabled while nddisabled is not null;
// next_dispatch locks it and a second thread releases it after the cooldown (sleep of cooldowntimer, then nddisabled null). The original sets the lock and the
// cooldown first thing; the archive, the location diagnostics and the map clean-up were put before them, they save tables and give way, the second thread read a
// stale cooldown (0 the first time), released the button and the first thread set the lock afterwards, for good. Static check of the production source (the
// timing itself is an HPG runtime behaviour, runtime PENDING): the lock and the cooldown are decided before any thread starts, nothing that can give way runs
// before them, and the first thread no longer sets them.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'mission-src', 'macros');
const macros = {};
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
const body = macros.next_dispatch.filter((entry) => !(entry && typeof entry === 'object' && '#comment' in entry));
const text = (value) => JSON.stringify(value);

const threads = body.map((entry, index) => ({ entry, index })).filter((x) => x.entry.create_thread);
assert.equal(threads.length, 2, 'two threads: the dispatch and the release of the button');
const head = body.slice(0, threads[0].index);
const headText = text(head);

// 1. before the first thread: the run flag, the lock and the cooldown
assert.deepEqual(head[0], { set: { local: 'nd_run' }, value: 0 }, 'nd_run starts at 0');
assert.ok(headText.includes('"local":"nddisabled"},"eq":null') && headText.includes('"local":"CREW_EMERGENCY_ACTIVE"},"ne":"yes"'), 'the gate (button free, no crew emergency) is decided before the threads');
assert.ok(headText.includes('{"set":{"local":"nddisabled"},"value":"disabled"}'), 'the lock is set before the threads');
assert.ok(headText.includes('"global":"DATAQUERYSERVICE"},"eq":3') && headText.includes('"value":{"global":"NEXT_DISPATCH_COOLDOWN_FAST"}') && headText.includes('"add":[{"global":"NEXT_DISPATCH_COOLDOWN"},{"local":"cooldowntimer"}]'), 'the cooldown (fast value with the service 3, the normal one with the others) is set before the threads');
// the two values are globals a tester can edit, created with the original defaults (10 and 25 s) only when missing
assert.ok(headText.includes('{"if":{"global":"NEXT_DISPATCH_COOLDOWN"},"eq":null,"then":[{"set":{"global":"NEXT_DISPATCH_COOLDOWN"},"value":25}]}'), 'NEXT_DISPATCH_COOLDOWN defaults to 25 when missing');
assert.ok(headText.includes('{"if":{"global":"NEXT_DISPATCH_COOLDOWN_FAST"},"eq":null,"then":[{"set":{"global":"NEXT_DISPATCH_COOLDOWN_FAST"},"value":10}]}'), 'NEXT_DISPATCH_COOLDOWN_FAST defaults to 10 when missing');
assert.ok(headText.indexOf('"value":25}') < headText.indexOf('"value":{"global":"NEXT_DISPATCH_COOLDOWN_FAST"}'), 'the defaults are set before they are read');
assert.ok(headText.includes('"local":"cooldowntimer"},"eq":null'), 'a missing cooldown counts as 0 (add of a missing value would never end the sleep)');
assert.ok(headText.indexOf('"value":"disabled"') < headText.indexOf('"value":10'), 'the lock comes before the cooldown');
const calls = [...headText.matchAll(/"call_macro":"([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(calls, ['ground crew runtime trace'], 'nothing that can give way runs before the threads (only the trace row)');
assert.ok(!/"sleep"|"wait_for"|"create_thread"/.test(headText), 'no sleep or wait before the threads');

// 2. the first thread runs only when the head let it, and no longer sets the lock or the cooldown
const first = text(threads[0].entry);
assert.ok(first.includes('"local":"nd_run"},"eq":1'), 'the dispatch thread runs on nd_run 1');
assert.ok(first.includes('"call_macro":"archive closing dispatch"') && first.includes('"call_macro":"randomize"'), 'the dispatch itself is unchanged');
assert.ok(!first.includes('"local":"nddisabled"') && !first.includes('"local":"cooldowntimer"'), 'the dispatch thread does not touch the lock or the cooldown');

// 3. the second thread: the cooldown, then the release
const second = threads[1].entry.create_thread.commands.filter((entry) => !(entry && '#comment' in entry));
assert.deepEqual(second[0], { sleep: { local: 'cooldowntimer' } }, 'the release thread sleeps the cooldown that was set before it started');
assert.deepEqual(second[1], { set: { local: 'nddisabled' }, value: null }, 'then releases the button');
assert.ok(text(second[2]).includes('button released'), 'and writes a trace row');

// 4. the button still depends on the lock only
const briefing = fs.readFileSync(path.join(root, 'mission-src', 'root', '03-briefing.json'), 'utf8');
assert.equal((briefing.match(/"title":"NEXT DISPATCH","disabled_condition":\{"require":\{"local":"nddisabled"\},"ne":null\}/g) || []).length, 2, 'both NEXT DISPATCH buttons are disabled while nddisabled is not null');
console.log('Next dispatch cooldown PASS: the lock and the cooldown are set before both threads, nothing that gives way runs before them, the release thread reads the set cooldown. Simulator runtime PENDING.');
