#!/usr/bin/env node

'use strict';

const { assertCicersBranch } = require('./assert-cicers-branch');
const { check: checkMissionWorkspace } = require('./mission-workspace');

console.log(`Branch guard PASS (${assertCicersBranch()}).`);
checkMissionWorkspace();
require('./validate-mission');
require('./validate-df-regression');
require('./test-crew-emergency');

console.log('\nWorkspace verification PASS. Run git diff --check separately; runtime HPG/MSFS tests remain required for behavior changes.');
