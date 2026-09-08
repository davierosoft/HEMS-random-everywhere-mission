#!/usr/bin/env node

'use strict';

const { currentBranch } = require('./assert-cicers-branch');
const { check: checkMissionWorkspace } = require('./mission-workspace');

console.log(`Workspace branch: ${currentBranch() || '(detached HEAD)'}. Write protection is checked separately.`);
checkMissionWorkspace();
require('./check-workspace-consistency');
require('./test-ci-workflow');
require('./validate-mission');
require('./validate-df-regression');
require('./validate-df-stations');
require('./test-crew-emergency');
require('./test-ground-operations-recovery');
require('./test-multipatient-registry');
require('./test-aircraft-profile-presets');
require('./validate-user-changelog');
require('./test-workspace-tools');

console.log('\nWorkspace verification PASS. Run git diff --check separately; runtime HPG/MSFS tests remain required for behavior changes.');
