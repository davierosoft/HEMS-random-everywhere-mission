#!/usr/bin/env node
'use strict';

// Version contract of the voice packs (rule of 2026-11-22): the version of voicepacks/<LANG>.xml is NOT chosen by hand.
// voicepacks/pack-ledger.json records, per pack, the version and the SHA-256 of the content (line endings and the version
// attribute itself ignored). A version identifies exactly one content: same content, same version; different content,
// the next version. Nobody (neither the author nor a contributor merging a translation) bumps the number.
//   node tools/pack-versions.js          check: fails when a pack differs from its ledger entry
//   node tools/pack-versions.js apply    writes the version of every changed pack (ledger version + 1) and the ledger
// The Companion copies the packs (tools/Sync-VoicePacks.ps1 there) and may never hold a version the mission has not pushed.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const LEDGER = path.join(root, 'voicepacks', 'pack-ledger.json');
const PACKS = ['EN', 'DE', 'FR'];

function normalized(text) {
  return text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/(<voicepack\b[^>]*?\sversion=")\d+(")/, '$10$2');
}
function hashOf(text) { return crypto.createHash('sha256').update(normalized(text), 'utf8').digest('hex'); }
function versionOf(text) {
  const m = text.match(/<voicepack\b[^>]*?\sversion="(\d+)"/);
  if (!m) throw new Error('voicepack tag without version');
  return Number(m[1]);
}
function setVersion(text, v) { return text.replace(/(<voicepack\b[^>]*?\sversion=")\d+(")/, `$1${v}$2`); }
function loadLedger() { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); }

function evaluate() {
  const ledger = loadLedger(); const rows = [];
  for (const p of PACKS) {
    const file = path.join(root, 'voicepacks', `${p}.xml`); const text = fs.readFileSync(file, 'utf8');
    const entry = ledger.packs[p]; const h = hashOf(text); const v = versionOf(text);
    let problem = null; let target = entry.version;
    if (h !== entry.sha256) { target = entry.version + 1; problem = `content changed since version ${entry.version}: it must become version ${target}`; }
    else if (v !== entry.version) problem = `same content as version ${entry.version} but the file says version ${v}`;
    else if (h === entry.sha256 && v === entry.version) problem = null;
    rows.push({ pack: p, file, text, hash: h, version: v, ledgerVersion: entry.version, target, problem });
  }
  return { ledger, rows };
}

function main() {
  const apply = process.argv[2] === 'apply';
  const { ledger, rows } = evaluate();
  let bad = 0;
  for (const r of rows) {
    if (!r.problem) { console.log(`OK   ${r.pack} version ${r.version} (${r.hash.slice(0, 12)})`); continue; }
    if (!apply) { bad++; console.log(`FAIL ${r.pack}: ${r.problem}`); continue; }
    const text = setVersion(r.text, r.target); fs.writeFileSync(r.file, text, 'utf8');
    ledger.packs[r.pack] = { version: r.target, sha256: hashOf(text) };
    console.log(`SET  ${r.pack} version ${r.target} (${ledger.packs[r.pack].sha256.slice(0, 12)})`);
  }
  if (apply) fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
  if (bad) { console.error('Pack versions FAIL: run node tools/pack-versions.js apply (never edit version="" by hand), then sync the Companion copy.'); process.exit(1); }
  console.log(apply ? 'Pack versions applied.' : 'Pack versions PASS.');
}
module.exports = { hashOf, versionOf, normalized };
if (require.main === module) main();
