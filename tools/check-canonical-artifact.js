#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

// Explicit deliveries and internal metadata are not source workspaces.
const excluded = new Set(['.git', '.workspace-state', '.codex-log', 'node_modules', 'outputs']);

function fileViolation(relative) {
  const name = path.posix.basename(relative);
  if (name.toLowerCase() === 'global.json') return `repository global state is forbidden: ${relative}`;
  if (/everywhere.*\.json$/i.test(name) && relative !== 'everywhere_all.json') return `parallel mission artifact is forbidden: ${relative}`;
  return null;
}

function violations(root) {
  const errors = [];
  if (!fs.existsSync(path.join(root, 'everywhere_all.json'))) errors.push('canonical mission is missing');
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (excluded.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, '/');
      if (entry.isDirectory()) scan(absolute);
      else if (fileViolation(relative)) errors.push(fileViolation(relative));
    }
  }
  scan(root);
  return errors;
}

function check(root = path.resolve(__dirname, '..')) {
  const errors = violations(root);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Canonical artifact PASS: one source-workspace mission and no repository global state.');
}

module.exports = { violations, fileViolation, check };
if (require.main === module) check();
