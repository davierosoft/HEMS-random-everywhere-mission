#!/usr/bin/env node
'use strict';

// Prints the notes of a published release (the body of the GitHub release, shown by the Mission Companion in its update window):
// the entries of CHANGELOG_USER.en.md whose build history reaches a build of the 0.997 169.x line from --from to --to, grouped
// by FIXES, UI and NEW FUNCTIONS. Entries that name another build string (for example "Mission Companion app 0.10") can be added
// with --include. Read-only: the output goes to stdout.
//   node tools/user-release-notes.js --release "0.997 169.46" --from 23 --to 46 [--include "Mission Companion app 0.10"]
const fs = require('fs');
const path = require('path');

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : fallback;
}
function options(name) {
  const values = [];
  process.argv.forEach((arg, index) => { if (arg === name && index + 1 < process.argv.length) values.push(process.argv[index + 1]); });
  return values;
}

const release = option('--release');
const from = Number(option('--from'));
const to = Number(option('--to'));
if (!release || !Number.isInteger(from) || !Number.isInteger(to) || from > to) {
  console.error('usage: node tools/user-release-notes.js --release "0.997 169.46" --from 23 --to 46 [--include "text"]');
  process.exit(2);
}
const includes = options('--include');

const text = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG_USER.en.md'), 'utf8').replace(/\r\n/g, '\n');
const ledger = text.indexOf('## Build coverage ledger');
const body = text.slice(0, ledger >= 0 ? ledger : text.length);

const sectionNames = ['FIXES', 'UI', 'NEW FUNCTIONS'];
const result = new Map(sectionNames.map((name) => [name, []]));
let section = null;
let entry = null;
const entries = [];
for (const line of body.split('\n')) {
  const heading = line.match(/^## (.+)$/);
  if (heading) { section = sectionNames.includes(heading[1]) ? heading[1] : null; entry = null; continue; }
  if (!section) continue;
  const title = line.match(/^### (.+)$/);
  if (title) { entry = { section, title: title[1], bullets: [], history: '' }; entries.push(entry); continue; }
  if (!entry) continue;
  const history = line.match(/^- \*\*Build history:\*\* (.*)$/);
  if (history) { entry.history = history[1]; continue; }
  if (/^- \*\*Test:\*\*/.test(line)) continue;
  if (line.startsWith('- ')) entry.bullets.push(line.slice(2));
}

function reaches(history) {
  for (const match of history.matchAll(/169\.(\d+)(?:\s*-\s*(?:169\.)?(\d+))?/g)) {
    const first = Number(match[1]);
    const last = match[2] === undefined ? first : Number(match[2]);
    if (first <= to && last >= from) return true;
  }
  return false;
}

let count = 0;
for (const item of entries) {
  if (item.bullets.length === 0) continue;
  if (!reaches(item.history) && !includes.some((extra) => item.history.includes(extra))) continue;
  result.get(item.section).push(item);
  count += 1;
}

const lines = [`# HEMS Random Everywhere Missions ${release}: what is new`, ''];
lines.push(`Changes since the previous published release (builds 0.997 169.${from} to 169.${to}), as written for pilots. All of it still needs simulator confirmation.`, '');
for (const name of sectionNames) {
  const list = result.get(name);
  if (list.length === 0) continue;
  lines.push(`## ${name}`, '');
  for (const item of list) {
    lines.push(`### ${item.title}`, '');
    for (const bullet of item.bullets) lines.push(`- ${bullet}`);
    lines.push('');
  }
}
process.stdout.write(lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n');
process.stderr.write(`${count} entries\n`);
