#!/usr/bin/env node
'use strict';
// Dead macros: macros that no thread, root section or data entry reaches, directly or through other macros.
// A macro is referenced when a string value equals its name (call_macro, a local that holds a page name, scene_macro, location_macro, ...),
// or when a call_macro string with a placeholder (for example "ELT {local:ELT}") matches its name. Comments do not count.
// A macro reached only by dead macros is dead too. Known unconnected helpers are listed with their reason in tools/dead-macros-allowlist.json;
// the check fails for a dead macro that is not listed and for a listed one that is no longer dead (the list must not grow stale).
// Usage: node tools/check-dead-macros.js [--list]
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'mission-src');
const readDir = (d) => fs.readdirSync(path.join(src, d)).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(src, d, f), 'utf8')));

function analyse() {
  const macros = Object.assign({}, ...readDir('macros'));
  const names = Object.keys(macros);
  const nameSet = new Set(names);
  const patterns = [];
  const collect = (node, out) => {
    if (Array.isArray(node)) { node.forEach((n) => collect(n, out)); return; }
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (k === '#comment') continue;
      if (typeof v === 'string') {
        if (nameSet.has(v)) out.add(v);
        else if (k === 'call_macro' && /\{[^}]+\}/.test(v)) {
          const re = new RegExp('^' + v.split(/\{[^}]+\}/).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+') + '$');
          patterns.push(v);
          names.filter((n) => re.test(n)).forEach((n) => out.add(n));
        }
      } else collect(v, out);
    }
  };
  const graph = {};
  for (const n of names) { const out = new Set(); collect(macros[n], out); out.delete(n); graph[n] = out; }
  const roots = new Set();
  for (const d of ['threads', 'root', 'data']) readDir(d).forEach((j) => collect(j, roots));
  const seen = new Set(roots);
  const stack = [...roots];
  while (stack.length) for (const r of graph[stack.pop()] || []) if (!seen.has(r)) { seen.add(r); stack.push(r); }
  return { total: names.length, dead: names.filter((n) => !seen.has(n)), patterns: [...new Set(patterns)] };
}

if (require.main === module) {
  const res = analyse();
  const allow = JSON.parse(fs.readFileSync(path.join(__dirname, 'dead-macros-allowlist.json'), 'utf8'));
  if (process.argv.includes('--list')) { console.log(JSON.stringify(res, null, 2)); process.exit(0); }
  const unlisted = res.dead.filter((n) => !(n in allow));
  const stale = Object.keys(allow).filter((n) => !res.dead.includes(n));
  if (unlisted.length || stale.length) {
    if (unlisted.length) console.error('Dead macros not in the allowlist: ' + unlisted.join(', '));
    if (stale.length) console.error('Allowlisted macros that are not dead (or do not exist): ' + stale.join(', '));
    process.exit(1);
  }
  console.log(`Dead macro check PASS: ${res.total} macros, ${res.dead.length} unconnected helpers listed with their reason.`);
}
module.exports = { analyse };
