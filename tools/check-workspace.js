#!/usr/bin/env node

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { currentBranch } = require('./assert-cicers-branch');
const { check: checkMissionWorkspace } = require('./mission-workspace');

// Each of these already runs its check unconditionally at module load (or, for
// check-canonical-artifact.js, guards it with `if (require.main === module)`), so running it as
// `node <file>` reproduces exactly the `require(...)` behavior this replaced. Running each as its
// own process lets us show one PASS line by default instead of every check's full detail, while
// still printing the complete original output the moment something actually fails.
const scripts = [
  'check-canonical-artifact.js',
  'test-mission-formatting.js',
  'check-workspace-consistency.js',
  'test-ci-workflow.js',
  'validate-mission.js',
  'validate-df-regression.js',
  'validate-df-stations.js',
  'test-crew-emergency.js',
  'test-ground-operations-recovery.js',
  'test-multipatient-registry.js',
  'test-crew-patient-visits.js',
  'test-live-patient-transport.js',
  'test-recovery-regressions.js',
  'test-health-symptoms.js',
  'test-user-facing-ascii.js',
  'test-civilian-object-safety.js',
  'test-route-location-integrity.js',
  'test-dispatch-handoff-diagnostics.js',
  'test-ground-ops-diagnostics.js',
  'test-route-legacy-fallback.js',
  'test-ambulance-stretcher-returns.js',
  'test-hoist-patient-loading.js',
  'test-hvar-command-compatibility.js',
  'test-aircraft-profile-presets.js',
  'validate-user-changelog.js',
  'test-workspace-tools.js',
];

const verbose = process.argv.includes('--verbose') || process.env.WORKSPACE_VERBOSE === '1';
const repositoryRoot = path.resolve(__dirname, '..');

console.log(`Workspace branch: ${currentBranch() || '(detached HEAD)'}. Write protection is checked separately.`);
checkMissionWorkspace();

for (const script of scripts) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.status !== 0) {
    process.stdout.write(output);
    const cause = result.status === null ? `signal ${result.signal}` : `exit ${result.status}`;
    console.error(`\n${script}: FAILED (${cause})`);
    process.exit(result.status === null ? 1 : result.status);
  }
  if (verbose) process.stdout.write(output);
  console.log(`${script}: PASS`);
}

console.log('\nWorkspace verification PASS. Run git diff --check separately; runtime HPG/MSFS tests remain required for behavior changes.');
