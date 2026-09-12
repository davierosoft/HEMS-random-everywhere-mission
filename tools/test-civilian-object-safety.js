#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'mission-src/macros/06-scene-generation.json');
const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
let total = 0;
let unsafe = 0;

function walk(value, protectedByGuard = false) {
  if (Array.isArray(value)) {
    value.forEach((entry) => walk(entry, protectedByGuard));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const protectedNow = protectedByGuard || Boolean(value.if?.has_object) || Array.isArray(value.try);
  for (const key of ['point_object', 'move_object']) {
    if (typeof value[key] === 'string' && value[key].startsWith('civilian')) {
      total += 1;
      if (!protectedNow) unsafe += 1;
    }
  }
  if (typeof value.set?.object === 'string' && value.set.object.startsWith('civilian')) {
    total += 1;
    if (!protectedNow) unsafe += 1;
  }
  Object.values(value).forEach((entry) => walk(entry, protectedNow));
}

walk(scene);
if (total !== 97 || unsafe !== 0) {
  throw new Error(`Civilian object safety FAIL: total=${total}, unsafe=${unsafe}`);
}
console.log(`Civilian object safety PASS: ${total} operations guarded.`);
