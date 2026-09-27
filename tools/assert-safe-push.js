#!/usr/bin/env node

'use strict';

const fs = require('fs');
const { assertCicersBranch } = require('./assert-cicers-branch');

function parsePushLines(input) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const fields = line.split(/\s+/);
      if (fields.length !== 4) throw new Error(`malformed pre-push input: ${line}`);
      return { localSha: fields[1], remoteRef: fields[2] };
    })
    .filter((entry) => entry.remoteRef.startsWith('refs/heads/'));
}

function pushedBranchTargets(input) {
  return parsePushLines(input).map((entry) => entry.remoteRef);
}

function unsafePushTargets(input) {
  return parsePushLines(input)
    // An all-zero local SHA means the ref is being deleted, not written to; deleting an obsolete
    // branch introduces no content and is always safe, regardless of its name.
    .filter((entry) => entry.remoteRef !== 'refs/heads/main' && !/^0+$/.test(entry.localSha))
    .map((entry) => entry.remoteRef);
}

function main(input = fs.readFileSync(0, 'utf8')) {
  const branch = assertCicersBranch();
  const blocked = unsafePushTargets(input);
  if (blocked.length) throw new Error(`refusing non-main branch destination(s): ${blocked.join(', ')}`);
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
