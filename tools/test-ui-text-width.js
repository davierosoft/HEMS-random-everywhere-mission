#!/usr/bin/env node
'use strict';
// Width of translated buttons (user request of 2026-11-11, report of kingle: the "custom location" button is cut off in German).
// The tablet draws a button bar on one row: the buttons never wrap to a second row, a button only wraps between words (or at a hyphen), so the width a bar needs is
// the longest word of its label plus, for every button, its longest word and the padding. A bar that fits in English must fit in every translation.
//   Rule A: in a bar with a label or with more than one button, no button word is longer than 13 letters, unless the English word is longer than
//           9 letters (then English + 3). A longer compound is reworded or split with a hyphen.
//   Rule B: in a bar whose English width fits one row (up to 56, bars of 16 conditional buttons are not one row), label word + sum of (longest word of each button + 2.5) stays within max(English width + 3, 50).
// Calibration: German "Einsatzgebiet... BENUTZERPOSITION / STARTPOSITION / EIGENE POSITION" measured 60.5 and was cut off on the tablet; the English row measures 44.5.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'ui-texts.json'), 'utf8'));
const fields = new Map(manifest.fields.map((f) => [f.key, f]));
const strip = (s) => s.replace(/\{[^{}]*\}/g, '00');
const longest = (s) => Math.max(0, ...strip(s).split(/[\s-]+/).map((w) => w.length));

const bars = new Map();
for (const f of manifest.fields) {
  for (const p of f.paths) {
    const i = p.indexOf('/buttonbar/');
    if (i < 0) continue;
    const base = p.slice(0, i + 10);
    const bar = bars.get(base) || { label: null, buttons: [] };
    const rest = p.slice(i + 11);
    if (f.kind === 'button') bar.buttons.push(f.key);
    else if (f.kind === 'text' && /^\d+\/text$/.test(rest)) bar.label = f.key;
    bars.set(base, bar);
  }
}
const unique = [];
const seen = new Set();
for (const bar of bars.values()) {
  if (!bar.buttons.length) continue;
  const sig = `${bar.label}|${bar.buttons.join(',')}`;
  if (seen.has(sig)) continue;
  seen.add(sig);
  unique.push(bar);
}

const problems = [];
for (const code of ['DE', 'FR', 'IT']) {
  const file = path.join(root, 'uitexts', `${code}.json`);
  if (!fs.existsSync(file)) continue;
  const texts = JSON.parse(fs.readFileSync(file, 'utf8')).texts;
  const tr = (k) => texts[k] ?? fields.get(k).en;
  for (const bar of unique) {
    if (bar.label || bar.buttons.length > 1) {
      for (const k of bar.buttons) {
        const w = longest(tr(k));
        const ew = longest(fields.get(k).en);
        const limit = ew > 9 ? ew + 3 : 13;
        if (w > limit) problems.push(`${code} ${k} word of ${w} letters (limit ${limit}): ${tr(k)}  [${fields.get(k).en}]`);
      }
    }
    const wide = (get) => (bar.label ? longest(get(bar.label)) : 0) + bar.buttons.reduce((n, k) => n + longest(get(k)) + 2.5, 0);
    if (wide((k) => fields.get(k).en) <= 56) {
      const width = (get) => (bar.label ? longest(get(bar.label)) : 0) + bar.buttons.reduce((n, k) => n + longest(get(k)) + 2.5, 0);
      const t = width(tr);
      const e = width((k) => fields.get(k).en);
      if (t > Math.max(e + 3, 50)) problems.push(`${code} bar ${t.toFixed(1)} > ${Math.max(e + 3, 50).toFixed(1)} (English ${e.toFixed(1)}): ${bar.buttons.map(tr).join(' / ')}`);
    }
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\nUI text width FAILED: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('UI text width ok');
