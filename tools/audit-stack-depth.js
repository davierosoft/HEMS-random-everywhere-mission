#!/usr/bin/env node
'use strict';

// Audit of the call stack risk (kingle 2026-11-11 and 2026-11-13, "RangeError: Maximum call stack size exceeded"): the stack of a thread only unwinds
// at a sleep (docs/architecture/CREW_LIFESCORE_ROLES.md), so repetitive work done without one piles up. Static, conservative measures on mission-src/macros:
//   LOOP   a while / for_each whose body can run without a sleep and calls macros or runs more than LOOP_COMMANDS commands per pass.
//   CYCLE  a macro that can call itself (directly or through others) on a path without a sleep.
//   CHAIN  the number of nested macro calls reachable from a macro before a sleep, above CHAIN_LIMIT.
//   RUN    commands executed one after another in one block (counting the macros called without a sleep) above RUN_LIMIT.
// Strict mode (part of check-workspace) fails on LOOP and CYCLE findings; CHAIN and RUN are information.
// Usage: node tools/audit-stack-depth.js [--strict] [--json]. With --strict the exit code is 1 on any finding that is not in the accepted list.
const fs = require('node:fs');
const path = require('node:path');

const LOOP_COMMANDS = 12;
const CHAIN_LIMIT = 14;
const RUN_LIMIT = 400;
const directory = path.join(__dirname, '..', 'mission-src', 'macros');
const macros = {};
for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.json')).sort()) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8')));

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const calledName = (node) => (typeof node.call_macro === 'string' ? node.call_macro : null);

// Does a command list contain a sleep that every path runs before the next command? Conservative: any sleep key anywhere counts as "may unwind".
const containsSleep = (value) => {
  if (Array.isArray(value)) return value.some(containsSleep);
  if (!isObject(value)) return false;
  if ('sleep' in value) return true;
  return Object.entries(value).some(([key, child]) => !DETACHED.has(key) && containsSleep(child));
};
// Event callbacks run later on their own stack: buttons (commands, click_commands), user actions and the body of create_thread are not part of the caller's stack.
const DETACHED = new Set(['commands', 'click_commands', 'create_thread', 'create_user_action', 'trigger_commands']);
const containsWait = (value) => {
  if (Array.isArray(value)) return value.some(containsWait);
  if (!isObject(value)) return false;
  if ('wait_for' in value) return true;
  return Object.entries(value).some(([key, child]) => !DETACHED.has(key) && containsWait(child));
};
const callsIn = (value, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => callsIn(item, found));
  else if (isObject(value)) {
    const name = calledName(value);
    if (name) found.push(name);
    for (const [key, child] of Object.entries(value)) if (!DETACHED.has(key)) callsIn(child, found);
  }
  return found;
};
const countCommands = (value) => {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countCommands(item), 0);
  if (!isObject(value)) return 0;
  const own = Object.keys(value).some((key) => ['call_macro', 'set', 'set_message', 'create_object', 'destroy_object', 'drive_object', 'modify_array', 'create_array', 'set_dispatch', 'set_modal', 'create_location', 'create_user_action', 'destroy_user_action'].includes(key)) ? 1 : 0;
  return own + Object.entries(value).reduce((sum, [key, child]) => sum + (DETACHED.has(key) ? 0 : countCommands(child)), 0);
};

// macro -> does its body contain a sleep, and which macros it calls
const info = {};
for (const [name, body] of Object.entries(macros)) info[name] = { sleeps: containsSleep(body), waits: containsWait(body), calls: [...new Set(callsIn(body))].filter((callee) => macros[callee]), commands: countCommands(body) };

// macro reaches a sleep on every call? Use "all paths may sleep" approximation: a macro unwinds when it contains a sleep or every call it makes does. Conservative: only own sleep.
const unwinds = (name) => info[name]?.sleeps === true;

// CHAIN: longest nested call path from a macro that never passes through a macro containing a sleep.
const chainMemo = new Map();
const chain = (name, trail = new Set()) => {
  if (chainMemo.has(name)) return chainMemo.get(name);
  if (trail.has(name)) return { depth: 0, path: [name], cycle: true };
  trail.add(name);
  let best = { depth: 1, path: [name], cycle: false };
  for (const callee of info[name].calls) {
    if (unwinds(callee)) continue;
    const sub = chain(callee, trail);
    if (sub.depth + 1 > best.depth) best = { depth: sub.depth + 1, path: [name, ...sub.path], cycle: best.cycle || sub.cycle };
  }
  trail.delete(name);
  chainMemo.set(name, best);
  return best;
};

const findings = [];
// CYCLE: Tarjan-free simple search of cycles through macros without sleep
const cycles = new Set();
const dfs = (start, current, trail) => {
  for (const callee of info[current].calls) {
    if (unwinds(callee) && callee !== start) continue;
    if (callee === start) { cycles.add([...trail].join(' > ')); continue; }
    if (trail.includes(callee) || trail.length > 8) continue;
    dfs(start, callee, [...trail, callee]);
  }
};
// A macro that contains a sleep or a wait (the checklist chains call the next one at the end, after waits of minutes) gives the stack back before it calls itself.
for (const name of Object.keys(info)) if (!unwinds(name) && !info[name].waits) dfs(name, name, [name]);
for (const cycle of cycles) findings.push({ kind: 'CYCLE', where: cycle.split(' > ')[0], detail: cycle });

// LOOP
// A loop is safe when its body yields: a sleep or wait_for of its own, or a call to a macro that contains one (loop yield is the standard one).
const yieldsBody = (body) => containsSleep(body) || containsWait(body) || callsIn(body).some((callee) => info[callee]?.sleeps || info[callee]?.waits);
const walkLoops = (value, macro) => {
  if (Array.isArray(value)) return value.forEach((item) => walkLoops(item, macro));
  if (!isObject(value)) return;
  for (const key of ['while', 'for_each']) {
    if (key in value && Array.isArray(value.do) && !yieldsBody(value.do)) findings.push({ kind: 'LOOP', where: macro, detail: `${key} ${JSON.stringify(value[key]).slice(0, 60)} without a sleep, a wait_for or a call to loop yield` });
  }
  Object.values(value).forEach((child) => walkLoops(child, macro));
};
for (const [name, body] of Object.entries(macros)) walkLoops(body, name);

// CHAIN and RUN
const reach = (name, seen = new Set()) => {
  if (seen.has(name)) return 0;
  seen.add(name);
  let total = info[name].commands;
  for (const callee of info[name].calls) if (!unwinds(callee)) total += reach(callee, seen);
  return total;
};
for (const name of Object.keys(info)) {
  const c = chain(name);
  if (!c.cycle && c.depth > CHAIN_LIMIT) findings.push({ kind: 'CHAIN', where: name, detail: `${c.depth} nested calls without a sleep: ${c.path.slice(0, 6).join(' > ')} ...` });
  if (!unwinds(name)) { const total = reach(name); if (total > RUN_LIMIT) findings.push({ kind: 'RUN', where: name, detail: `${total} commands reachable without a sleep` }); }
}

const accepted = fs.existsSync(path.join(__dirname, 'audit-stack-depth-accepted.json')) ? Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname, 'audit-stack-depth-accepted.json'), 'utf8'))) : [];
const key = (f) => `${f.kind}|${f.where}`;
const open = findings.filter((f) => !accepted.includes(key(f)) && (f.kind === 'LOOP' || f.kind === 'CYCLE'));
if (process.argv.includes('--json')) console.log(JSON.stringify(findings, null, 1));
else {
  for (const f of findings) console.log(`${accepted.includes(key(f)) ? 'accepted' : 'OPEN    '} ${f.kind.padEnd(5)} ${f.where} :: ${f.detail}`);
  console.log(`\nstack audit: ${findings.length} finding(s), ${open.length} open`);
}
if (process.argv.includes('--strict') && open.length) process.exit(1);
