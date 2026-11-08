#!/usr/bin/env node
'use strict';
// Status bar of the tablet (user request of 2026-11-07): 20 pre-drawn bars sbar00..sbar19 (16-19 = wifi in range but not connected, dimmed waves) (bit 3 = 5G, bit 2 = USB for the CARLS radio, bits 0-1 = wifi waves),
// chosen live by the local STATUS_BAR_ID that the thread STATUS BAR keeps. A page is never rebuilt to change the bar (a variable image works only at build time:
// standalone-tests/status-bar-image-test.json, simulator 2026-11-07), so every page carries 20 rows with a show_condition.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const icons = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/icons/01-interface-icons.json'), 'utf8'));
for (let i = 0; i < 20; i++) {
  const k = 'sbar' + String(i).padStart(2, '0');
  assert.ok(icons[k] && icons[k].startsWith('data:image/png;base64,'), k + ' exists');
  const b = Buffer.from(icons[k].split(',')[1], 'base64');
  assert.ok(b.readUInt32BE(16) === 700 && b.readUInt32BE(20) === 20, k + ' is 700x20');
}
assert.ok(!icons.homebar && !icons.homebar5g, 'the two old bars are replaced');
let rows = 0;
for (const dir of ['macros', 'root']) for (const f of fs.readdirSync(path.join(root, 'mission-src', dir))) {
  const t = fs.readFileSync(path.join(root, 'mission-src', dir, f), 'utf8');
  assert.ok(!/"image": *"homebar/.test(t), f + ' has no old bar');
  const n = (t.match(/"image": *"sbar\d\d"/g) || []).length;
  assert.strictEqual(n % 20, 0, f + ': the bars come in groups of 20');
  rows += n;
}
assert.ok(rows >= 20 * 20, 'every page that had a bar has the twenty rows (' + rows / 20 + ' groups)');
const thread = JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'mission-src/threads/01-startup-and-dispatch-triggers.json'), 'utf8'))['STATUS BAR']);
for (const need of ['TABLET_5G_ENABLED', 'L:CARLS_CONNECTED', 'wifistate', 'wifiinrange', 'custom_center_location', 'mission_start_location', '"STATUS_BAR_ID"', 'HOC_MISMATCH', '"gte":5']) assert.ok(thread.includes(need), 'thread uses ' + need);
console.log('status bar ok: 20 bars, ' + rows / 20 + ' page groups');
