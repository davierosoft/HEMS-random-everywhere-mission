#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const offenders = [];
function walk(value, file, pathText) {
  if (typeof value === 'string') {
    if (/[^\x20-\x7E\r\n\t]/.test(value)) offenders.push(`${file}:${pathText}: ${JSON.stringify(value)}`);
    return;
  }
  if (Array.isArray(value)) return value.forEach((item, i) => walk(item, file, `${pathText}[${i}]`));
  if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) walk(item, file, `${pathText}.${key}`);
}
for (const section of ['macros']) {
  const dir = path.join(root, 'mission-src', section);
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
    walk(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')), `${section}/${file}`, '$');
  }
}
if (offenders.length) throw new Error(`User-facing/source text contains non-ASCII characters:\n${offenders.join('\n')}`);
console.log('User-facing ASCII gate PASS: all mission source strings are printable ASCII.');
