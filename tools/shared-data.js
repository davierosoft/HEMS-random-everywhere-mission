#!/usr/bin/env node
'use strict';

// The shared data of the mission (user request 2026-10-18): the custom hangar and hospital waypoints and the changes to the offline databases of the H145
// (airports, aprons, hospital helipads, helipads) live in `shared-data/` of this repository. The Mission Companion downloads them from GitHub, writes the
// table `table_R&E_shared_waypoints.json` in the work folder (the mission reads it) and, only when the user allows it, applies the database changes to the
// offline databases of HPG. Anyone can add a point with a pull request: this tool checks the files and keeps the manifest (revision and hashes) up to date.
//
//   node tools/shared-data.js check     validate every file and the manifest (used by test-shared-data.js and check-workspace)
//   node tools/shared-data.js build     recompute the hashes; the revision goes up by one only when a file changed
//   node tools/shared-data.js extract   one-off: write waypoints.json from the two built-in lists of the mission (data/02-waypoints-and-categories.json)
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'shared-data');
const MANIFEST = 'manifest.json';
const WAYPOINTS = 'waypoints.json';
// offline database files of HPG (html_ui\HPGH145-System\db\<name>.json): name -> shape of one record
const DB_TYPES = {
  airport: { fields: ['lat', 'lon', 'name', 'icao', 'iata'] },
  'airport-nocode': { fields: ['lat', 'lon', 'name', 'icao', 'iata'] },
  'airport-mil': { fields: ['lat', 'lon', 'name', 'icao', 'iata'] },
  apron: { fields: ['lat', 'lon', 'name'] },
  H_civil: { fields: ['lat', 'lon', 'name'] },
  H_hospital: { fields: ['lat', 'lon', 'pad_name', 'name'] },
  runway: { fields: ['lat', 'lon', 'name'] },
};
// the files the repository publishes (a type not listed here is understood by the program but has no shared file yet)
const PUBLISHED_DB = ['airport', 'apron', 'H_hospital', 'H_civil'];
const yesNo = ['yes', 'no'];

const normalized = (text) => text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
const sha256 = (text) => crypto.createHash('sha256').update(normalized(text), 'utf8').digest('hex');
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const okLat = (v) => isNum(v) && v >= -90 && v <= 90;
const okLon = (v) => isNum(v) && v >= -180 && v <= 180;

function readJson(rel, errors) {
  const file = path.join(dir, rel);
  if (!fs.existsSync(file)) { errors.push(`${rel}: missing`); return null; }
  const text = fs.readFileSync(file, 'utf8');
  try { return { data: JSON.parse(normalized(text)), text }; } catch (e) { errors.push(`${rel}: not valid JSON (${e.message})`); return null; }
}

function checkPoints(where, rec, kind, errors) {
  const e = (msg) => errors.push(`${where}: ${msg}`);
  const total = rec.WPtot;
  if (!Number.isInteger(total) || total < 0 || total > 3) e(`WPtot must be 0, 1, 2 or 3 (${total})`);
  for (let k = 1; k <= 3; k++) {
    const lat = rec[`WP${k}lat`], lon = rec[`WP${k}lon`];
    if (Number.isInteger(total) && k <= total) {
      if (!okLat(lat) || !okLon(lon)) e(`WP${k} must have latitude and longitude (WPtot is ${total})`);
    } else if ((lat !== null && lat !== undefined) || (lon !== null && lon !== undefined)) e(`WP${k} is given but WPtot is ${total}: use null`);
  }
  if (!yesNo.includes(rec.marshal_present)) e('marshal_present must be "yes" or "no"');
  if (rec.marshal_present === 'yes' && (!okLat(rec.WPMarshalLAT) || !okLon(rec.WPMarshalLON))) e('marshal_present is yes: WPMarshalLAT and WPMarshalLON are required');
  if (rec.marshal_present === 'no' && ((rec.WPMarshalLAT ?? null) !== null || (rec.WPMarshalLON ?? null) !== null)) e('marshal_present is no: WPMarshalLAT and WPMarshalLON must be null');
  if (kind === 'hangar') {
    if (!okLat(rec.WPspawnlat) || !okLon(rec.WPspawnlon)) e('WPspawnlat and WPspawnlon are required');
    if (!isNum(rec.max_rng_m) || rec.max_rng_m < 1 || rec.max_rng_m > 5000) e('max_rng_m must be a number between 1 and 5000');
    for (const key of ['technician_boarding', 'technician_deboarding']) if (!yesNo.includes(rec[key])) e(`${key} must be "yes" or "no"`);
  } else if (!okLat(rec.WPdoorlat) || !okLon(rec.WPdoorlon)) e('WPdoorlat and WPdoorlon are required');
}

const WAYPOINT_KEYS = {
  hangar: ['id', 'by', 'WPspawnlat', 'WPspawnlon', 'max_rng_m', 'WPtot', 'WP1lat', 'WP1lon', 'WP2lat', 'WP2lon', 'WP3lat', 'WP3lon', 'technician_boarding', 'technician_deboarding', 'marshal_present', 'WPMarshalLAT', 'WPMarshalLON'],
  hospital: ['id', 'by', 'WPdoorlat', 'WPdoorlon', 'WPtot', 'WP1lat', 'WP1lon', 'WP2lat', 'WP2lon', 'WP3lat', 'WP3lon', 'marshal_present', 'WPMarshalLAT', 'WPMarshalLON'],
};

function checkWaypoints(data, errors) {
  const lists = { hangar_wps: 'hangar', hospitals_wps: 'hospital' };
  for (const key of Object.keys(data)) if (!lists[key]) errors.push(`${WAYPOINTS}: unknown key ${key}`);
  for (const [key, kind] of Object.entries(lists)) {
    const list = data[key];
    if (!Array.isArray(list)) { errors.push(`${WAYPOINTS}: ${key} must be an array`); continue; }
    const seen = new Set();
    list.forEach((rec, i) => {
      const where = `${WAYPOINTS} ${key}[${i}]${rec && rec.id ? ` "${String(rec.id).slice(0, 40)}"` : ''}`;
      if (!rec || typeof rec !== 'object' || Array.isArray(rec)) { errors.push(`${where}: not a record`); return; }
      if (typeof rec.id !== 'string' || !rec.id.trim()) errors.push(`${where}: id is required`);
      else {
        const low = rec.id.trim().toLowerCase();
        if (seen.has(low)) errors.push(`${where}: duplicate id`);
        seen.add(low);
      }
      for (const k of Object.keys(rec)) if (!WAYPOINT_KEYS[kind].includes(k)) errors.push(`${where}: unknown field ${k}`);
      checkPoints(where, rec, kind, errors);
    });
  }
}

function checkDbDelta(type, data, errors) {
  const where = `db/${type}.json`;
  const shape = DB_TYPES[type];
  for (const key of Object.keys(data)) if (!['add', 'remove', 'note'].includes(key)) errors.push(`${where}: unknown key ${key}`);
  const add = data.add ?? [];
  const remove = data.remove ?? [];
  if (!Array.isArray(add)) errors.push(`${where}: add must be an array`);
  else add.forEach((rec, i) => {
    const w = `${where} add[${i}]`;
    if (!Array.isArray(rec) || rec.length !== shape.fields.length) { errors.push(`${w}: a record is [${shape.fields.join(', ')}]`); return; }
    if (!okLat(rec[0]) || !okLon(rec[1])) errors.push(`${w}: latitude and longitude out of range`);
    for (let k = 2; k < rec.length; k++) if (typeof rec[k] !== 'string') errors.push(`${w}: ${shape.fields[k]} must be a string (empty when unknown)`);
    if (shape.fields.includes('icao') && !/^[A-Z0-9]{0,4}$/.test(rec[3] || '')) errors.push(`${w}: icao is up to 4 capitals or digits`);
    if (shape.fields.includes('iata') && !/^[A-Z0-9]{0,3}$/.test(rec[4] || '')) errors.push(`${w}: iata is up to 3 capitals or digits`);
    if (type === 'H_hospital' && !(rec[2] || rec[3])) errors.push(`${w}: a hospital needs a pad_name or a name`);
  });
  if (!Array.isArray(remove)) errors.push(`${where}: remove must be an array`);
  else remove.forEach((rec, i) => {
    const w = `${where} remove[${i}]`;
    if (!rec || typeof rec !== 'object') { errors.push(`${w}: not a record`); return; }
    if (!okLat(rec.lat) || !okLon(rec.lon)) errors.push(`${w}: lat and lon are required`);
    if (rec.radius_m !== undefined && (!isNum(rec.radius_m) || rec.radius_m < 1 || rec.radius_m > 500)) errors.push(`${w}: radius_m is a number from 1 to 500 (30 when missing)`);
    if (rec.name !== undefined && typeof rec.name !== 'string') errors.push(`${w}: name must be a string`);
    for (const k of Object.keys(rec)) if (!['lat', 'lon', 'radius_m', 'name'].includes(k)) errors.push(`${w}: unknown field ${k}`);
  });
}

function filesOfRepo() {
  const files = [WAYPOINTS, ...PUBLISHED_DB.map((t) => `db/${t}.json`)];
  return files;
}

function check() {
  const errors = [];
  const manifest = readJson(MANIFEST, errors);
  const waypoints = readJson(WAYPOINTS, errors);
  if (waypoints) checkWaypoints(waypoints.data, errors);
  for (const type of PUBLISHED_DB) {
    const delta = readJson(`db/${type}.json`, errors);
    if (delta) checkDbDelta(type, delta.data, errors);
  }
  if (manifest) {
    const m = manifest.data;
    if (m.schema !== 1) errors.push(`${MANIFEST}: schema must be 1`);
    if (!Number.isInteger(m.revision) || m.revision < 1) errors.push(`${MANIFEST}: revision must be a whole number from 1`);
    const listed = Object.keys(m.files || {}).sort();
    const expected = filesOfRepo().slice().sort();
    if (JSON.stringify(listed) !== JSON.stringify(expected)) errors.push(`${MANIFEST}: files must be exactly ${expected.join(', ')} (run: node tools/shared-data.js build)`);
    for (const rel of expected) {
      const entry = (m.files || {})[rel];
      const file = path.join(dir, rel);
      if (!entry || !fs.existsSync(file)) continue;
      const text = fs.readFileSync(file, 'utf8');
      if (entry.sha256 !== sha256(text)) errors.push(`${MANIFEST}: ${rel} changed, the hash is old (run: node tools/shared-data.js build)`);
    }
  }
  return { errors, waypoints: waypoints && waypoints.data, manifest: manifest && manifest.data };
}

function pretty(obj) {
  return `${JSON.stringify(obj, null, 2)}\n`;
}

// records of a waypoint list: one field per line, a blank line between records (like the data of the mission)
function writeWaypoints(data) {
  const out = ['{'];
  const keys = Object.keys(data);
  keys.forEach((key, ki) => {
    out.push(`  "${key}": [`);
    data[key].forEach((rec, i) => {
      const lines = JSON.stringify(rec, null, 2).split('\n').map((l) => `    ${l}`);
      out.push(...lines.slice(0, -1), `    }${i < data[key].length - 1 ? ',' : ''}`);
      if (i < data[key].length - 1) out.push('');
    });
    out.push(`  ]${ki < keys.length - 1 ? ',' : ''}`);
  });
  out.push('}');
  fs.writeFileSync(path.join(dir, WAYPOINTS), `${out.join('\n')}\n`);
}

function extract() {
  const source = JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'data', '02-waypoints-and-categories.json'), 'utf8'));
  fs.mkdirSync(dir, { recursive: true });
  writeWaypoints({ hangar_wps: source['hangar wps'], hospitals_wps: source['hospitals wps'] });
  fs.mkdirSync(path.join(dir, 'db'), { recursive: true });
  for (const type of PUBLISHED_DB) {
    const file = path.join(dir, 'db', `${type}.json`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, pretty({ add: [], remove: [] }));
  }
}

function build() {
  const old = fs.existsSync(path.join(dir, MANIFEST)) ? JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), 'utf8')) : { revision: 0, files: {} };
  const files = {};
  for (const rel of filesOfRepo()) {
    const text = fs.readFileSync(path.join(dir, rel), 'utf8');
    files[rel] = { sha256: sha256(text), bytes: Buffer.byteLength(normalized(text), 'utf8') };
  }
  const changed = JSON.stringify(files) !== JSON.stringify(old.files);
  const manifest = { schema: 1, revision: changed ? old.revision + 1 : old.revision, files };
  fs.writeFileSync(path.join(dir, MANIFEST), pretty(manifest));
  return { changed, manifest };
}

module.exports = { check, DB_TYPES, PUBLISHED_DB, sha256, dir };

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'extract') { extract(); console.log('shared-data/waypoints.json written from the mission data'); }
  else if (cmd === 'build') { const r = build(); console.log(`manifest revision ${r.manifest.revision}${r.changed ? ' (files changed)' : ' (unchanged)'}`); }
  else if (cmd === 'check' || cmd === undefined) {
    const r = check();
    if (r.errors.length) { console.error(r.errors.join('\n')); process.exit(1); }
    console.log(`shared-data OK: revision ${r.manifest.revision}, ${r.waypoints.hangar_wps.length} hangar and ${r.waypoints.hospitals_wps.length} hospital waypoints`);
  } else { console.error('usage: node tools/shared-data.js check|build|extract'); process.exit(2); }
}
