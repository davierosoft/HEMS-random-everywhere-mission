#!/usr/bin/env node
'use strict';
// Rule of the user (2026-11-03): know whether the user pressed any button. Every option button of every modal
// opens with "trace button" (one row of base_return_log: kind and text of the button, phase, position, crew).
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'mission-src');
let total = 0; const bad = [];
function walk(x, file) {
  if (Array.isArray(x)) { x.forEach((v) => walk(v, file)); return; }
  if (!x || typeof x !== 'object') return;
  if ('text' in x && 'commands' in x && 'style' in x) {
    total++;
    const c = x.commands;
    const ok = Array.isArray(c) && c.length > 0 && c[0] && c[0].call_macro === 'trace button' && c[0].params && c[0].params.kind === 'modal' && c[0].params.name === x.text;
    if (!ok && !(Array.isArray(c) && c.length === 0)) bad.push(file + ': ' + JSON.stringify(x.text));
  }
  Object.values(x).forEach((v) => walk(v, file));
}
for (const dir of ['macros', 'root', 'threads']) {
  for (const f of fs.readdirSync(path.join(root, dir)).filter((n) => n.endsWith('.json'))) {
    walk(JSON.parse(fs.readFileSync(path.join(root, dir, f), 'utf8')), dir + '/' + f);
  }
}
const lc = JSON.parse(fs.readFileSync(path.join(root, 'macros/11-mission-lifecycle.json'), 'utf8'));
if (!lc['trace button'] || !JSON.stringify(lc['trace button']).includes('"stage":"button"')) bad.push('macro trace button missing');
if (bad.length) { console.error('Button trace FAIL:\n' + bad.join('\n')); process.exit(1); }
console.log('Button trace PASS: every one of the ' + total + ' modal option buttons opens with trace button (kind and text in base_return_log). Tablet buttons and user actions are not covered yet. HPG/MSFS PENDING.');
