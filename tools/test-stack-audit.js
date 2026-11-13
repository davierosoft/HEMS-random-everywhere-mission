#!/usr/bin/env node
'use strict';
// Gate of the call stack audit (kingle 2026-11-11 and 2026-11-13): every for_each / while of the mission yields (sleep, wait_for or loop yield) and no macro calls itself without giving the stack back.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const result = spawnSync(process.execPath, [path.join(__dirname, 'audit-stack-depth.js'), '--strict'], { encoding: 'utf8' });
const lines = (result.stdout || '').split('\n').filter((line) => line.startsWith('OPEN'));
if (result.status !== 0) {
  console.error(lines.join('\n'));
  console.error('\nstack audit FAILED: a loop without a sleep or a call to loop yield, or a macro that calls itself without a sleep');
  process.exit(1);
}
console.log('stack audit ok (every loop yields; runtime pending)');
