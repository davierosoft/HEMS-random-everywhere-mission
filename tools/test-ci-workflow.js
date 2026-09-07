#!/usr/bin/env node
'use strict';

// Textual safeguards for the repository's small, fixed CI template, not a YAML parser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
function check(text) {
  const failures = [];
  for (const token of ['pull_request:', 'push:', 'workflow_dispatch:', 'contents: read',
    'ubuntu-latest', 'windows-latest', 'node tools/check-workspace.js',
    'persist-credentials: false', 'cancel-in-progress: true', 'timeout-minutes: 10']) {
    if (!text.includes(token)) failures.push('Missing CI safeguard: ' + token);
  }
  const uses = [...text.matchAll(/uses:\s+(\S+)/g)].map(match => match[1]);
  if (uses.length !== 2 || uses.some(ref => !/^actions\/(checkout|setup-node)@[a-f0-9]{40}$/.test(ref))) {
    failures.push('CI actions must use the two reviewed full commit pins');
  }
  if (/contents:\s*write|write-all|pull_request_target:|continue-on-error:\s*true/.test(text)) {
    failures.push('CI must remain read-only and failures must remain blocking');
  }
  if (/mission-workspace\.js build|release-workflow\.js (begin|package)|git push/.test(text)) {
    failures.push('Static CI must not build, package or publish mission changes');
  }
  return failures;
}
const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/workspace-checks.yml'), 'utf8');
assert.deepEqual(check(workflow), []);
assert.ok(check(workflow.replace('node tools/check-workspace.js', 'node --version')).length);
assert.ok(check(workflow.replace('contents: read', 'contents: write')).length);
assert.ok(check(workflow.replace('windows-latest', 'ubuntu-24.04')).length);
assert.ok(check(workflow.replace(/actions\/checkout@[a-f0-9]{40}/, 'actions/checkout@main')).length);
assert.ok(check(workflow + '\n# release-workflow.js package\n').length);
console.log('CI contract PASS: pinned read-only Windows/Linux verification; focused negative controls rejected.');
