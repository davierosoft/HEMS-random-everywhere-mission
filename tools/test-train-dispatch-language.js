#!/usr/bin/env node
'use strict';

// Issue 55: train.json carries the dispatch reading language line (item 9, empty = voice
// pack) and a raised SCRIPT_BUILD, in the original script layout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const text = fs.readFileSync(path.join(__dirname, '../train.json'), 'utf8');
const lines = text.split(/\r?\n/);
const iComment = lines.findIndex(l => l.includes('9) CUS_DISPATCH_LANGUAGE'));
assert.ok(iComment > 0, 'item 9 comment line');
assert.ok(/EMPTY = VOICE PACK/.test(lines[iComment]));
const iSet = lines.findIndex(l => l.includes('"CUS_DISPATCH_LANGUAGE"'));
assert.ok(iSet > iComment, 'set line after the item list');
assert.ok(/"value": ""/.test(lines[iSet]), 'empty default');
assert.ok(/^\t\{"set"/.test(lines[iSet]), 'tab indent like the other custom settings');
const build = Number(/"SCRIPT_BUILD"\}, "value": (\d+)/.exec(text)[1]);
assert.ok(build >= 170013, 'SCRIPT_BUILD raised for the new line');
assert.ok(/^[\x09\x0a\x0d\x20-\x7e]*$/.test(text), 'ASCII only');
const { formatTrainScript } = require('./train-script-format.js');
assert.equal(formatTrainScript(JSON.parse(text)), text.replace(/\r\n/g, '\n'), 'original layout');
console.log('PASS: train.json dispatch language line and layout');
