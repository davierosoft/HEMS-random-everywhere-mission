#!/usr/bin/env node

'use strict';

const { assertSingleCanonicalWorktree } = require('./assert-cicers-branch');

try {
  const root = assertSingleCanonicalWorktree();
  console.log(`Single-worktree guard PASS (${root}).`);
} catch (error) {
  console.error(`Single-worktree guard FAIL: ${error.message}.`);
  process.exit(1);
}
