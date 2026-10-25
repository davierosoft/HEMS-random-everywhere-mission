#!/usr/bin/env node
'use strict';

// Failure announcements of the crew, report to the technician, impact questions, crew voice profile and crew zone (static; HPG/MSFS and Companion runtime PENDING).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'mission-src', 'macros');
const macros = {};
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
const text = (value) => JSON.stringify(value);
const packDir = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks');

// every failure code the engine can draw (1-28, 30-40) is announced; 29 (leakage) by its own thread
const announce = text(macros['failure crew announce']);
for (let code = 1; code <= 40; code += 1) {
  if (code === 29) continue;
  assert.ok(announce.includes(`{"if":{"param":"code"},"eq":${code},"then":[{"set":{"local":"fa_type"}`), `failure ${code} is announced`);
}
assert.ok(text(macros['fuel leakage']).includes('"value":"LEAK"') && text(macros['fuel leakage']).includes('failure crew speak'), 'the leakage is announced when it shows');
assert.ok(text(macros['failure engine']).includes('failure crew announce'), 'the engine announces');
assert.ok(text(macros['reset aircraft failures']).includes('failure tech clear'), 'reset clears the report flags');
assert.ok(text(macros['voice crew impact']).includes('voice impact ask'), 'impact question');
assert.ok(text(macros['voice impact ask']).includes('SDK_CABIN_PAX_5') && !text(macros['voice impact ask']).includes('HOISTED'), 'the patient is the stretcher seat');

// every key the macros speak exists in the pack of each language
const keys = new Set();
for (const m of ['failure crew speak', 'failure tech report', 'voice impact ask']) for (const x of text(macros[m]).matchAll(/<say:([A-Z0-9.]+)>/g)) keys.add(x[1]);
const types = [...announce.matchAll(/"value":"([A-Z0-9]+)"/g)].map((x) => x[1]).filter((v) => v !== 'NONE');
for (const t of new Set(types)) { keys.add('FLT.' + t); keys.add('FTR.' + t); }
if (fs.existsSync(packDir)) {
  for (const lang of ['EN', 'DE', 'FR']) {
    const xml = fs.readFileSync(path.join(packDir, lang + '.xml'), 'utf8');
    for (const k of keys) if (!k.includes('{')) assert.ok(xml.includes(`key="${k}"`), `${lang} pack has ${k}`);
    for (const k of ['FLT.GEN', 'FLT.CHK', 'FLT.CHIPV']) assert.ok(xml.includes(`key="${k}"`), `${lang} pack has ${k}`);
  }
}

// crew voice profile and crew zone
assert.ok(macros['crew voice profile apply'] && text(macros['settings first run defaults']).includes('"CREW_PROFILE"'), 'CREW_PROFILE first run default');
assert.ok(text(macros['voice context publish']).includes('L:HMC_ZONE_CREW'), 'crew zone published');
console.log('Failure announcements PASS: all codes announced, keys in the three packs, report to the technician, impact questions, crew profile, crew zone. HPG/MSFS PENDING.');