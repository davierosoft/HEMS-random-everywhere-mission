#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function gitDirectory(repositoryRoot) {
  const marker = path.join(repositoryRoot, '.git');
  const stat = fs.statSync(marker);
  if (stat.isDirectory()) return marker;
  const pointer = fs.readFileSync(marker, 'utf8').trim();
  if (!pointer.startsWith('gitdir: ')) throw new Error(`unsupported .git pointer: ${pointer}`);
  return path.resolve(repositoryRoot, pointer.slice('gitdir: '.length));
}

function currentBranch(repositoryRoot = path.resolve(__dirname, '..')) {
  const head = fs.readFileSync(path.join(gitDirectory(repositoryRoot), 'HEAD'), 'utf8').trim();
  return head.startsWith('ref: refs/heads/') ? head.slice('ref: refs/heads/'.length) : '';
}

function registeredWorktrees(repositoryRoot) {
  let output;
  try {
    output = cp.execFileSync('git', ['-C', repositoryRoot, 'worktree', 'list', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (error.status === 128) return [path.resolve(repositoryRoot)];
    throw error;
  }
  return output.split(/\r?\n(?=worktree )/)
    .filter(Boolean)
    .map((entry) => entry.match(/^worktree (.+)$/m)?.[1])
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
}

function assertSingleCanonicalWorktree(repositoryRoot = path.resolve(__dirname, '..')) {
  const root = path.resolve(repositoryRoot);
  const worktrees = registeredWorktrees(root);
  if (worktrees.length !== 1 || worktrees[0] !== root) {
    throw new Error(`exactly one canonical worktree is required; registered=${JSON.stringify(worktrees)}, current=${root}`);
  }
  return root;
}

function assertCicersBranch(repositoryRoot = path.resolve(__dirname, '..')) {
  const branch = currentBranch(repositoryRoot);
  if (!branch.startsWith('CICERS/')) throw new Error(`expected CICERS/*, found ${branch || '(detached HEAD)'}`);
  assertSingleCanonicalWorktree(repositoryRoot);
  return branch;
}

module.exports = { assertCicersBranch, assertSingleCanonicalWorktree, currentBranch, registeredWorktrees };

if (require.main === module) {
  try {
    console.log(`Branch guard PASS (${assertCicersBranch()}).`);
  } catch (error) {
    console.error(`Branch guard FAIL: ${error.message}.`);
    process.exit(1);
  }
}
