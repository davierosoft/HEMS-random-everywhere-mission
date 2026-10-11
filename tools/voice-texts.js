#!/usr/bin/env node
'use strict';

// Keys of the texts that the mission speaks as free text, for the voice packs of the Mission Companion (translations).
//
//   node tools/voice-texts.js check     verify the sources and tools/voice-texts.json (and the base pack of the Companion when its folder is next to this one)
//   node tools/voice-texts.js assign    write a key <text:CHK.<macro>.<nn>> in front of every checklist text that has none (macros/22-checklists.json)
//   node tools/voice-texts.js sync      rewrite tools/voice-texts.json from the sources
//
// The spoken English stays in the mission (it is also the text spoken when a pack has no translation of it): <text:KEY>English text.
// A key never changes once it is in the sources; a new text takes the next number. The Companion pack EN holds the same texts under the same keys
// (node tools/sync-pack-texts.js in the Companion folder) and the translated packs copy it. See docs/VOICE_APP_MODE.md.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const macroDir = path.join(root, 'mission-src', 'macros');
const checklistFile = path.join(macroDir, '22-checklists.json');
const accidentFile = path.join(root, 'mission-src', 'data', '02-waypoints-and-categories.json');
const outFile = path.join(__dirname, 'voice-texts.json');
const companionPack = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'EN.xml');

const KEY_RX = /^[A-Za-z0-9_.-]{1,40}$/;
const TEXT_TAG_RX = /<text:([^<>\[\]]{1,60})>/;
// texts that have placeholders: the mission sends the filled English and the values after //  (the pack text has {0} {1})
const TEMPLATES = {
  'DSC.VEH': 'Vehicle: {0} {1}.',
};

function fail(lines) {
  for (const line of lines) console.error(line);
  process.exit(1);
}

function macroFiles() {
  return fs.readdirSync(macroDir).filter((name) => name.endsWith('.json')).sort();
}

function walk(value, visit) {
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else if (value && typeof value === 'object') {
    if ('speak' in value) visit(value);
    Object.values(value).forEach((child) => walk(child, visit));
  }
}

const speakText = (command) => (typeof command.speak === 'string' ? command.speak : (command.speak && typeof command.speak.text === 'string' ? command.speak.text : ''));
const hasWords = (text) => /[A-Za-z]/.test(text.replace(/<[^<>]*>|\[[^\[\]]*\]/g, ''));

function readMacroFiles() {
  const files = {};
  for (const file of macroFiles()) files[file] = JSON.parse(fs.readFileSync(path.join(macroDir, file), 'utf8'));
  return files;
}

// the checklist texts: key -> English, and the speak commands that have no key (macrosByFile: { file: { macro: [commands] } })
function scanSpeaks(macrosByFile = readMacroFiles()) {
  const keyed = new Map();
  const problems = [];
  const unkeyed = [];
  for (const [file, macros] of Object.entries(macrosByFile)) {
    for (const [name, body] of Object.entries(macros)) {
      walk(body, (command) => {
        const text = speakText(command);
        if (!text) return;
        const tag = TEXT_TAG_RX.exec(text);
        if (!tag) {
          if (hasWords(text) && !/<say:|<say\s/.test(text)) unkeyed.push({ file, name, text });
          return;
        }
        const key = tag[1];
        if (!KEY_RX.test(key) && !/\{\d+\}/.test(key)) problems.push(`${file} / ${name}: the key "${key}" may only have letters, digits, . _ - (up to 40)`);
        if (/\{\d+\}/.test(key)) return;                  // the key is built by the macro (DSC.{0}.{1}): checked with the table
        const english = text.slice(tag.index + tag[0].length);
        if (typeof command.speak === 'object') return;      // a text with parameters: its template is in TEMPLATES
        if (/\/\//.test(english)) problems.push(`${file} / ${name}: the text of ${key} has //, which separates the values`);
        if (keyed.has(key) && keyed.get(key).english !== english) problems.push(`${key} is used for two different texts (${file} / ${name})`);
        keyed.set(key, { english, file, name });
      });
    }
  }
  return { keyed, problems, unkeyed };
}

// the dispatch descriptions of the incident table: DSC.<ID_CARD>.<variant>
function accidentTexts(table = JSON.parse(fs.readFileSync(accidentFile, 'utf8')).accidents) {
  const texts = {};
  const problems = [];
  const seen = new Set();
  for (const accident of table) {
    const id = accident.ID_CARD;
    if (!Number.isInteger(id) || id < 0) { problems.push(`accident "${accident.id}" has no whole number ID_CARD`); continue; }
    if (seen.has(id)) problems.push(`ID_CARD ${id} is used twice (accident "${accident.id}")`);
    seen.add(id);
    for (let variant = 1; variant <= 4; variant += 1) {
      const text = accident[`description${variant}`];
      if (typeof text !== 'string' || !text.trim()) { problems.push(`accident ${id} has no description${variant}`); continue; }
      if (/\/\/|[<>]/.test(text)) problems.push(`accident ${id} description${variant} has // or a tag character`);
      texts[`DSC.${id}.${variant}`] = text;
    }
  }
  return { texts, problems };
}

function build() {
  const speaks = scanSpeaks();
  const accidents = accidentTexts();
  const texts = {};
  for (const [key, entry] of [...speaks.keyed.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))) texts[key] = entry.english;
  for (const [key, text] of Object.entries(accidents.texts)) texts[key] = text;
  for (const [key, text] of Object.entries(TEMPLATES)) texts[key] = text;
  return { texts, problems: [...speaks.problems, ...accidents.problems], unkeyed: speaks.unkeyed };
}

function render(texts) {
  const lines = Object.entries(texts).map(([key, text]) => `    ${JSON.stringify(key)}: ${JSON.stringify(text)}`);
  return `{\n  "format": 1,\n  "note": "Generated by node tools/voice-texts.js sync. Key -> the English text that the mission speaks (CHK checklist rows, DSC dispatch descriptions, templates with {0} {1}). The Mission Companion pack EN holds the same texts; translated packs copy it.",\n  "texts": {\n${lines.join(',\n')}\n  }\n}\n`;
}

function slug(name) {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
}

function assign() {
  const raw = fs.readFileSync(checklistFile, 'utf8');
  const lines = raw.split(/(?<=\n)/);
  const macroRx = /^ {2}"([^"]+)": \[/;
  const speakRx = /\{"speak":"((?:[^"\\]|\\.)*)"/;
  // the highest number already used for each macro
  const used = new Map();
  let macro = '';
  for (const line of lines) {
    const m = macroRx.exec(line);
    if (m) macro = m[1];
    const k = /<text:CHK\.([A-Za-z0-9]+)\.(\d+)>/.exec(line);
    if (k) used.set(k[1], Math.max(used.get(k[1]) || 0, Number(k[2])));
  }
  let added = 0;
  macro = '';
  const keys = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    const m = macroRx.exec(lines[i]);
    if (m) macro = m[1];
    const s = speakRx.exec(lines[i]);
    if (!s) continue;
    if (TEXT_TAG_RX.test(s[1]) || !hasWords(JSON.parse(`"${s[1]}"`))) continue;
    if ((lines[i].match(/\{"speak":/g) || []).length !== 1) fail([`line ${i + 1}: more than one speak command on a line, key it by hand`]);
    const id = slug(macro);
    const number = (used.get(id) || 0) + 1;
    used.set(id, number);
    const key = `CHK.${id}.${String(number).padStart(2, '0')}`;
    if (key.length > 40 || keys.has(key)) fail([`cannot make a key for macro "${macro}" (${key})`]);
    keys.add(key);
    lines[i] = lines[i].replace(speakRx, (all, text) => `{"speak":"<text:${key}>${text}"`);
    added += 1;
  }
  if (added) fs.writeFileSync(checklistFile, lines.join(''), 'utf8');
  console.log(`voice-texts assign: ${added} text(s) got a key in mission-src/macros/22-checklists.json`);
}

function xmlUnescape(text) {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

// the base pack of the Companion (only when its folder is next to this repository)
function companionKeys() {
  if (!fs.existsSync(companionPack)) return null;
  const xml = fs.readFileSync(companionPack, 'utf8');
  const found = new Map();
  const rx = /<message\b[^>]*\bkey="([^"]+)"[^>]*>([\s\S]*?)<\/message>/g;
  let m;
  while ((m = rx.exec(xml))) {
    const option = /<o\b[^>]*>([\s\S]*?)<\/o>/.exec(m[2]);
    found.set(m[1], option ? xmlUnescape(option[1]).replace(/\s+/g, ' ').trim() : '');
  }
  return found;
}

const normal = (text) => text.replace(/\s+/g, ' ').trim().replace(/\.$/, '');

function check() {
  const built = build();
  const errors = [...built.problems];
  for (const item of built.unkeyed) errors.push(`${item.file} / ${item.name}: spoken text without a key: "${item.text.slice(0, 60)}" (run: node tools/voice-texts.js assign)`);
  const lifecycle = JSON.stringify(JSON.parse(fs.readFileSync(path.join(macroDir, '03-aircraft-crew-checklists.json'), 'utf8'))['voice read dispatch'] || null);
  if (!lifecycle.includes('<text:DSC.{0}.{1}>')) errors.push('voice read dispatch must speak the description with the key <text:DSC.{0}.{1}> (VAR_MISSION_NUMBER and CRASH_VARIABLE)');
  if (!lifecycle.includes('<text:DSC.VEH>')) errors.push('voice read dispatch must speak the vehicle sentence with <text:DSC.VEH>');
  const current = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (current !== render(built.texts)) errors.push('tools/voice-texts.json differs from the sources (run: node tools/voice-texts.js sync)');
  if (errors.length) fail([...errors.slice(0, 40), errors.length > 40 ? `... and ${errors.length - 40} more` : '', `voice-texts check: FAILED (${errors.length})`].filter(Boolean));
  const base = companionKeys();
  const notes = [];
  if (base) {
    const missing = Object.keys(built.texts).filter((key) => !base.has(key));
    if (missing.length) fail([`The base pack of the Companion (${path.relative(root, companionPack)}) lacks ${missing.length} text(s), first: ${missing.slice(0, 5).join(', ')}`, 'Update it: in the Companion folder run node tools/sync-pack-texts.js, then build the program with the new pack (the pack version goes up).', 'voice-texts check: FAILED']);
    const stale = Object.entries(built.texts).filter(([key, text]) => !/\{\d+\}/.test(text) && normal(base.get(key)) !== normal(text)).length;
    if (stale) notes.push(`${stale} text(s) of the Companion base pack differ from the mission (run node tools/sync-pack-texts.js there)`);
    const extra = [...base.keys()].filter((key) => /^(CHK|DSC)\./.test(key) && !(key in built.texts)).length;
    if (extra) notes.push(`${extra} CHK/DSC key(s) of the Companion base pack are no longer in the mission`);
  } else notes.push('the Companion folder is not next to this repository: its base pack was not compared');
  console.log(`voice-texts check: PASS (${Object.keys(built.texts).length} texts: ${Object.keys(built.texts).filter((k) => k.startsWith('CHK.')).length} checklist rows, ${Object.keys(built.texts).filter((k) => k.startsWith('DSC.') && k !== 'DSC.VEH').length} dispatch descriptions)`);
  for (const note of notes) console.log(`  note: ${note}`);
}

function sync() {
  const built = build();
  if (built.problems.length || built.unkeyed.length) fail([...built.problems, ...built.unkeyed.map((item) => `${item.file} / ${item.name}: spoken text without a key (run: node tools/voice-texts.js assign)`), 'voice-texts sync: refused']);
  fs.writeFileSync(outFile, render(built.texts), 'utf8');
  console.log(`voice-texts sync: ${Object.keys(built.texts).length} texts written to tools/voice-texts.json`);
}

module.exports = { scanSpeaks, accidentTexts, build, render, TEMPLATES, TEXT_TAG_RX };

if (require.main === module) {
  const command = process.argv[2];
  if (command === 'check') check();
  else if (command === 'assign') assign();
  else if (command === 'sync') sync();
  else fail(['usage: node tools/voice-texts.js check | assign | sync']);
}
