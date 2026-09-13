#!/usr/bin/env node

'use strict';

const primary = require('../mission-src/data/05-health-profiles.json');
const special = require('../mission-src/data/06-special-health-and-messages.json');

const groups = { ...primary, ...special };
let checked = 0;
for (const [name, entries] of Object.entries(groups)) {
  if (!name.startsWith('health') || !Array.isArray(entries)) continue;
  checked += 1;
  const generic = entries.filter((entry) => String(entry.medical_symptoms || '').startsWith('Reported '));
  const noInfo = entries.filter((entry) => entry.medical_symptoms === 'NO INFO');
  if (generic.length < Math.ceil(entries.length * 0.45)) {
    throw new Error(`${name}: generic symptom coverage is below 45 percent`);
  }
  if (generic.length + noInfo.length !== entries.length) {
    throw new Error(`${name}: every profile must contain a Reported symptom or NO INFO`);
  }
  for (const entry of entries) {
    if ([...String(entry.medical_symptoms)].some((character) => character.charCodeAt(0) > 127)) {
      throw new Error(`${name}: symptom text is not ASCII-only`);
    }
  }
}

console.log(`Health symptom coverage PASS (${checked} categories, minimum 45 percent per category).`);
