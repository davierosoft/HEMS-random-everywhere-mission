#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(root, 'CHANGELOG_USER.en.md'), 'utf8');

function fail(message) {
  throw new Error(`user changelog contract: ${message}`);
}

const fixes = text.indexOf('## FIXES');
const ui = text.indexOf('## UI');
const functions = text.indexOf('## NEW FUNCTIONS');
const ledger = text.indexOf('## Build coverage ledger');
if (fixes < 0 || ui < 0 || functions < 0 || ledger < 0 || !(fixes < ui && ui < functions && functions < ledger)) {
  fail('sections must be ordered FIXES, UI, NEW FUNCTIONS, Build coverage ledger');
}
if (!/0\.997 1 through 0\.997 142/.test(text)) fail('coverage must explicitly include builds 0.997 1 through 0.997 142');

const coveredBuilds = new Set();
const ledgerText = text.slice(ledger);
for (const match of ledgerText.matchAll(/0\.997\s+(\d+)(?:-(\d+))?/g)) {
  const first = Number(match[1]);
  const last = Number(match[2] || match[1]);
  for (let build = first; build <= last; build += 1) coveredBuilds.add(build);
}
for (let build = 1; build <= 142; build += 1) {
  if (!coveredBuilds.has(build)) fail(`build 0.997 ${build} is absent from the coverage ledger`);
}

const technicalTerms = /\b(?:ambustretcher|drive_object|wait_for|lvar|var ?1|macro|renderer|query|sdk|json|hpg|object identifier|source file|internal state)\b/i;
if (technicalTerms.test(text)) fail('must use final-user language, not code or internal mission terminology');

const entries = [...text.matchAll(/^### (.+)$/gm)];
if (entries.length < 40) fail('must list detailed final-user behaviors, not a short thematic summary');
const names = new Set();
for (let index = 0; index < entries.length; index += 1) {
  const name = entries[index][1].trim().toLowerCase();
  if (names.has(name)) fail(`duplicate entry heading: ${entries[index][1]}`);
  names.add(name);
  const end = index + 1 < entries.length ? entries[index + 1].index : text.length;
  const body = text.slice(entries[index].index, end);
  if (!/\*\*Build history:\*\*/.test(body)) fail(`missing Build history for ${entries[index][1]}`);
  if (!/\*\*Test:\*\*/.test(body)) fail(`missing Test for ${entries[index][1]}`);
}
console.log(`User changelog contract PASS: ${entries.length} final-behavior entries, ordered sections, and stated build coverage.`);
