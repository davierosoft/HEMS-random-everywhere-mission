#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

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

function assertCicersBranch(repositoryRoot = path.resolve(__dirname, '..')) {
  const branch = currentBranch(repositoryRoot);
  if (!branch.startsWith('CICERS/')) throw new Error(`expected CICERS/*, found ${branch || '(detached HEAD)'}`);
  return branch;
}

module.exports = { assertCicersBranch, currentBranch };

if (require.main === module) {
  try {
    console.log(`Branch guard PASS (${assertCicersBranch()}).`);
  } catch (error) {
    console.error(`Branch guard FAIL: ${error.message}.`);
    process.exit(1);
  }
}
