'use strict';
// Issue 16 (mission repository): controlled preset save and fallback for a missing or unreadable preset table.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'mission-src', 'macros');
const macros = {};
for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
const text = (name) => JSON.stringify(macros[name]);

// 1. save_table of a preset exists only in the flush macro: toggles edit the table in memory
const writers = Object.entries(macros).filter(([name, body]) => /"save_table":\{"static":\{"local":"(preset_loaded|MSN_CONFIG_PRESET)"/.test(JSON.stringify(body))).map(([name]) => name);
assert.deepEqual(writers, ['flush mission preset'], 'the preset table is written only by flush mission preset');
const flush = text('flush mission preset');
assert.ok(flush.includes('"preset_save_in_progress"},"ne":1'), 'a second flush does not start while one runs');
assert.ok(flush.indexOf('"preset_dirty"},"value":"no"') < flush.indexOf('save_table'), 'dirty is cleared before the write, a change during the write marks it again');
assert.ok(flush.indexOf('save_table') < flush.lastIndexOf('"preset_save_in_progress"},"value":0'), 'the lock is released after the write');
assert.ok(text('apply mission preset category').includes('"preset_dirty"},"value":"yes"') && !text('apply mission preset category').includes('save_table'), 'category buttons only mark the preset');

// 2. loading: counts, reset of invalid entries, notice
const load = text('msn preset loading');
for (const flag of ['preset_fix_total', 'preset_fix_missing', 'preset_fix_bad', 'preset_load_notice']) assert.ok(load.includes(`"${flag}"`), `loading keeps ${flag}`);
assert.ok(load.includes('"ne":true},{"require"') && load.includes('"ne":false'), 'entries that are neither true nor false are reset');
assert.ok(load.includes('"preset_load_notice"},"value":2') && load.includes('"preset_load_notice"},"value":1'), 'both notices exist');
assert.ok(load.includes('"preset_save_in_progress"},"eq":null'), 'the lock starts at 0');

// 3. both preset pages show the notices
for (const page of ['mission_list_page1', 'mission_list_page2']) {
  const body = text(page);
  assert.ok(body.includes('PRESET HAD NO READABLE DATA') && body.includes('PRESET HAD INVALID ENTRIES'), `${page} shows the fallback notices`);
}
console.log('preset save and fallback: 1 writer, lock, fallback notices on both pages');
