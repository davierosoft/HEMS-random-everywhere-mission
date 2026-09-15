#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {formatSourceText, formatJsonText} = require('./mission-formatter');
const root = path.resolve(__dirname, '..');
const normalize = text => text.replace(/\r\n/g, '\n');
for (const section of ['macros', 'data']) {
  for (const file of fs.readdirSync(path.join(root, 'mission-src', section)).filter(name => name.endsWith('.json'))) {
    const source = fs.readFileSync(path.join(root, 'mission-src', section, file), 'utf8');
    const formatted = formatSourceText(source, section === 'macros' ? 'commands' : 'data');
    assert.deepEqual(JSON.parse(formatted), JSON.parse(source), `${file}: formatter changed semantics`);
    assert.equal(formatSourceText(formatted, section === 'macros' ? 'commands' : 'data'), formatted, `${file}: formatting is not stable`);
    assert.equal(normalize(source), formatted, `${file}: mandatory source formatting drift`);
  }
}
for (const file of ['everywhere_all.json', 'train.json']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const formatted = formatJsonText(source);
  assert.deepEqual(JSON.parse(formatted), JSON.parse(source));
  assert.equal(normalize(source), formatted, `${file}: mandatory artifact formatting drift`);
}
const fixture = {example: [{set: {local: 'a'}, value: 1}, {if: {local: 'a'}, eq: 1, then: [{sleep: 1}], else: [{sleep: 2}]}]};
const formatted = formatSourceText(JSON.stringify(fixture), 'commands');
assert.ok(formatted.includes('{"set":{"local":"a"},"value":1}'));
assert.ok(formatted.includes('],"else": ['));
assert.notEqual(JSON.stringify(fixture, null, 4), formatted, 'Noncompliant four-space layout must be rejected');
console.log('Mission formatting PASS: mandatory layout, semantic preservation and idempotence across all sources and artifacts.');
