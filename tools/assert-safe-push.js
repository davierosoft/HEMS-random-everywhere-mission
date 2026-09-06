#!/usr/bin/env node

'use strict';

const fs = require('fs');
const { assertCicersBranch } = require('./assert-cicers-branch');

function pushedBranchTargets(input) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const fields = line.split(/\s+/);
      if (fields.length !== 4) throw new Error(`malformed pre-push input: ${line}`);
      return fields[2];
    })
    .filter((remoteRef) => remoteRef.startsWith('refs/heads/'));
}

function unsafePushTargets(input) {
  return pushedBranchTargets(input).filter((remoteRef) => !remoteRef.startsWith('refs/heads/CICERS/'));
}

function main(input = fs.readFileSync(0, 'utf8')) {
  const branch = assertCicersBranch();
  const blocked = unsafePushTargets(input);
  if (blocked.length) throw new Error(`refusing non-CICERS branch destination(s): ${blocked.join(', ')}`);
  console.log(`Push guard PASS (${branch}; ${pushedBranchTargets(input).length} branch destination(s)).`);
}

module.exports = { pushedBranchTargets, unsafePushTargets };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Push guard FAIL: ${error.message}.`);
    process.exit(1);
  }
}
