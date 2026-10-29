#!/usr/bin/env node
'use strict';

// Keeps the incident list of the custom script train.json aligned with the mission sources.
// The script needs, before the mission is loaded, only what the briefing shows (descriptions,
// objective, SAR, mountain rescuers) for every incident except the editable CUSTOM entry (999),
// which is the full definition read by the mission and is never touched here.
//
//   node tools/sync-train-accidents.js           rewrite train.json
//   node tools/sync-train-accidents.js --check   exit 1 if train.json is not aligned

const fs = require('fs');
const path = require('path');
const { formatJsonText } = require('./mission-formatter');

const root = path.resolve(__dirname, '..');
const trainPath = path.join(root, 'train.json');
const sourcePath = path.join(root, 'mission-src', 'data', '02-waypoints-and-categories.json');
const check = process.argv.includes('--check');

const FIELDS = ['description1', 'description2', 'description3', 'description4', 'objective', 'SAR', 'mountain_helirescuers'];

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
}

function missionAccidents() {
  const source = JSON.parse(readText(sourcePath));
  const list = (source.data || source).accidents || source.accidents;
  if (!Array.isArray(list)) throw new Error('accidents not found in ' + sourcePath);
  return list.filter((entry) => Number.isInteger(entry.ID_CARD) && entry.ID_CARD !== 999);
}

function briefingEntry(entry) {
  const result = { id: entry.id };
  for (const field of FIELDS) {
    if (entry[field] === undefined) throw new Error('ID ' + entry.ID_CARD + ' lacks ' + field);
    result[field] = entry[field];
  }
  result.ID_CARD = entry.ID_CARD;
  return result;
}

const script = JSON.parse(readText(trainPath));
const accidents = script.data && script.data.accidents;
if (!Array.isArray(accidents) || !accidents.length || accidents[0].ID_CARD !== 999) throw new Error('train.json: the CUSTOM entry 999 must be the first incident');

const generated = missionAccidents().map(briefingEntry);
const ids = generated.map((entry) => entry.ID_CARD);
if (new Set(ids).size !== ids.length) throw new Error('duplicate ID_CARD in the mission accidents');

script.data.accidents = [accidents[0], ...generated];
const next = formatJsonText(JSON.stringify(script));
if (/[^\x00-\x7F]/.test(next)) throw new Error('Non-ASCII text in train.json');

if (check) {
  if (next !== fs.readFileSync(trainPath, 'utf8')) {
    console.error('train.json is NOT aligned with mission-src (run node tools/sync-train-accidents.js)');
    process.exit(1);
  }
  console.log('train.json aligned (' + generated.length + ' incidents + CUSTOM 999)');
} else {
  fs.writeFileSync(trainPath, next, 'utf8');
  console.log('train.json updated: ' + generated.length + ' incidents + CUSTOM 999');
}
