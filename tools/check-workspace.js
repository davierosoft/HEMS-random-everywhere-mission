#!/usr/bin/env node

'use strict';

const { currentBranch } = require('./assert-cicers-branch');
const { check: checkMissionWorkspace } = require('./mission-workspace');

console.log(`Workspace branch: ${currentBranch() || '(detached HEAD)'}. Write protection is checked separately.`);
checkMissionWorkspace();
require('./check-workspace-consistency');
require('./validate-mission');
require('./validate-df-regression');
require('./test-crew-emergency');
require('./test-workspace-tools');

console.log('\nWorkspace verification PASS. Run git diff --check separately; runtime HPG/MSFS tests remain required for behavior changes.');
