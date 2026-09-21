#!/usr/bin/env node

'use strict';

const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const { compareRelease, parseRelease } = require('./release-contract');

function git(repositoryRoot, args) {
  return cp.execFileSync('git', ['-C', repositoryRoot, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function releaseFromText(text) {
  const match = String(text || '').match(/(?:0\.\d+\s+\d+(?:\.\d+)?)/);
  return match ? parseRelease(match[0]).text : null;
}

function readRelease(file) {
  if (!fs.existsSync(file)) return null;
  return releaseFromText(fs.readFileSync(file, 'utf8'));
}

function registeredWorktrees(repositoryRoot) {
  let output;
  try {
    output = git(repositoryRoot, ['worktree', 'list', '--porcelain']);
  } catch (error) {
    if (error.status === 128) return [path.resolve(repositoryRoot)];
    throw error;
  }
  return output
    .split(/\r?\n(?=worktree )/)
    .filter(Boolean)
    .map((entry) => entry.match(/^worktree (.+)$/m)?.[1])
    .filter(Boolean)
    .map((value) => path.resolve(value));
}

function physicalMissionCopies(repositoryRoot) {
  const roots = [path.dirname(repositoryRoot), path.join(process.env.USERPROFILE || '', '.codex', 'worktrees'), path.join(repositoryRoot, 'outputs')]
    .filter((value, index, all) => value && all.indexOf(value) === index && fs.existsSync(value));
  const found = new Set();
  const visit = (directory, depth) => {
    if (depth < 0) return;
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const target = path.join(directory, entry.name);
      if (entry.isFile() && entry.name === 'everywhere_all.json') found.add(path.resolve(target));
      else if (entry.isDirectory()) visit(target, depth - 1);
    }
  };
  roots.forEach((root) => visit(root, 4));
  return [...found];
}

function inspect(repositoryRoot, candidate) {
  const observations = [];
  const add = (kind, location, release) => { if (release) observations.push({ kind, location, release }); };
  for (const worktree of registeredWorktrees(repositoryRoot)) add('registered-worktree', worktree, readRelease(path.join(worktree, 'everywhere_all.json')));
  for (const file of physicalMissionCopies(repositoryRoot)) add('physical-copy', file, readRelease(file));
  let refs = [];
  try { refs = git(repositoryRoot, ['for-each-ref', '--format=%(refname)', 'refs/remotes', 'refs/heads']).split(/\r?\n/).filter(Boolean); } catch (error) { if (error.status !== 128) throw error; }
  for (const ref of refs) {
    try { add('git-ref', ref, releaseFromText(git(repositoryRoot, ['show', `${ref}:everywhere_all.json`]))); } catch { /* no artifact in this ref */ }
  }
  const newer = observations.filter((item) => compareRelease(item.release, candidate) > 0);
  if (newer.length) throw new Error(`newer mission versions exist than ${candidate}: ${JSON.stringify(newer)}`);
  return observations;
}

if (require.main === module) {
  try {
    const repositoryRoot = path.resolve(__dirname, '..');
    const candidate = process.argv.slice(2).join(' ').trim();
    if (!candidate) throw new Error('usage: node tools/check-release-coherence.js 0.997 168.22');
    parseRelease(candidate);
    console.log(JSON.stringify({ candidate, observations: inspect(repositoryRoot, candidate), result: 'PASS' }, null, 2));
  } catch (error) {
    console.error(`Release coherence FAIL: ${error.message}.`);
    process.exit(1);
  }
}

module.exports = { inspect, physicalMissionCopies, registeredWorktrees };
