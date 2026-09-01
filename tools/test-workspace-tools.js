#!/usr/bin/env node

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { isDeepStrictEqual } = require('util');
const { assertCicersBranch, currentBranch } = require('./assert-cicers-branch');
const { pushedBranchTargets, unsafePushTargets } = require('./assert-safe-push');
const { analyzeScope, createBaselineRecord, scopeViolations, validateBaselineRecord } = require('./check-mission-scope');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrow(action, pattern, message) {
  try {
    action();
  } catch (error) {
    assert(pattern.test(error.message), `${message}: unexpected error ${error.message}`);
    return;
  }
  throw new Error(`${message}: expected an error`);
}

const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hems-workspace-tools-'));
try {
  const gitDirectory = path.join(temporaryRoot, '.git');
  fs.mkdirSync(gitDirectory);
  fs.writeFileSync(path.join(gitDirectory, 'HEAD'), 'ref: refs/heads/main\n');
  assert(currentBranch(temporaryRoot) === 'main', 'branch reader did not resolve main');
  expectThrow(() => assertCicersBranch(temporaryRoot), /expected CICERS/, 'main branch guard');

  fs.writeFileSync(path.join(gitDirectory, 'HEAD'), 'ref: refs/heads/CICERS/tool-test\n');
  assert(assertCicersBranch(temporaryRoot) === 'CICERS/tool-test', 'CICERS branch guard rejected a valid branch');

  fs.writeFileSync(path.join(gitDirectory, 'HEAD'), '0123456789abcdef\n');
  expectThrow(() => assertCicersBranch(temporaryRoot), /detached HEAD/, 'detached-head guard');
} finally {
  const resolvedTemporary = path.resolve(temporaryRoot);
  assert(resolvedTemporary.startsWith(path.resolve(os.tmpdir())), 'refusing to remove a temporary directory outside the OS temp root');
  fs.rmSync(resolvedTemporary, { recursive: true, force: true });
}

const before = { title: 'A', macros: { alpha: [1], beta: [2] }, data: { profile: { value: 1 } } };
const after = { title: 'A', macros: { alpha: [9], beta: [2] }, data: { profile: { value: 2 } } };
const scope = analyzeScope(before, after);
assert(isDeepStrictEqual(scope.rootChanges, []), 'scope checker reported an unchanged root');
assert(isDeepStrictEqual(scope.macroChanges, ['alpha']), 'scope checker missed a macro change');
assert(isDeepStrictEqual(scope.dataChanges, ['profile']), 'scope checker missed a data change');
assert(isDeepStrictEqual(scopeViolations(scope, { roots: [], macros: ['alpha'], data: [] }), ['data:profile']), 'scope allowlist did not reject the unlisted data change');
assert(scopeViolations(scope, { roots: [], macros: ['alpha'], data: ['profile'] }).length === 0, 'scope allowlist rejected declared changes');

const missionText = JSON.stringify(before);
const baseline = createBaselineRecord('CICERS/tool-test', missionText, '2026-01-01T00:00:00.000Z');
assert(validateBaselineRecord(baseline, 'CICERS/tool-test') === baseline, 'valid baseline was rejected');
expectThrow(() => validateBaselineRecord({ ...baseline, branch: 'CICERS/other' }, 'CICERS/tool-test'), /belongs to/, 'cross-branch baseline');
expectThrow(() => validateBaselineRecord({ ...baseline, mission: `${missionText} ` }, 'CICERS/tool-test'), /payload\/hash mismatch/, 'tampered baseline');

const safePush = 'refs/heads/CICERS/tool-test abc refs/heads/CICERS/tool-test def\n';
assert(isDeepStrictEqual(pushedBranchTargets(safePush), ['refs/heads/CICERS/tool-test']), 'push parser missed the CICERS destination');
assert(unsafePushTargets(safePush).length === 0, 'push guard rejected a CICERS destination');
assert(isDeepStrictEqual(unsafePushTargets('refs/heads/CICERS/tool-test abc refs/heads/main def\n'), ['refs/heads/main']), 'push guard did not reject main');
assert(isDeepStrictEqual(unsafePushTargets('refs/heads/CICERS/tool-test abc refs/heads/release def\n'), ['refs/heads/release']), 'push guard did not reject another non-CICERS branch');
expectThrow(() => pushedBranchTargets('malformed input\n'), /malformed/, 'malformed pre-push input');

console.log(JSON.stringify({
  result: 'PASS',
  scenarios: ['main-branch-block', 'CICERS-branch-allow', 'detached-head-block', 'scope-detection', 'scope-allowlist', 'baseline-branch-binding', 'baseline-integrity', 'safe-push-target', 'main-push-block', 'non-CICERS-push-block', 'malformed-push-input'],
}, null, 2));
