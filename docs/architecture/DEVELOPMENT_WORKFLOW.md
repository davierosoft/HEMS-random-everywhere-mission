# Development and delivery workflow

## Two distinct delivery states

- **Development checkpoint:** source, generated mission and tests synchronized on GitHub at the user's explicit request. Static checks pass; simulator validation may remain PENDING. No package, release tag, or claim of simulator success is produced.
- **Validated mission release:** the same artifact has passed both static checks and the named simulator scenarios. Only this state permits the existing release-workflow package command. A PR merge is not a runtime sign-off.

See [validation status](../testing/VALIDATION_STATUS.md) for the current candidate. Existing release-contract enforcement and CICERS-only hooks remain mandatory.

## Focused implementation

1. Check branch, hooks, ownership and dirty files. Read the workspace map and affected subsystem only.
2. Use the remaining-work list in the relevant architecture document. Reuse implemented helpers; do not repeat SDK smoke tests as a substitute for integration.
3. Snapshot semantic scope before mission edits. Edit the owning source, run focused tests, then prepare one higher revision and build once when coherent.
4. Reindex only when entry names change. Run byte-exact check, strict scope and the complete static gate. Use Node directly if npm is absent.
5. Supply the generated local test file. Record its exact title/hash and pending simulator scenarios. Documentation-only or CI updates do not rebuild or renumber an unchanged mission.

## Requested GitHub synchronization

1. Fetch remote state and inspect the staged diff. Preserve unrelated dirty files. Do not commit local outputs, debug snapshots, credentials, or formatting-only user changes.
2. Commit on CICERS with the mandatory pre-commit checks; push that exact branch with its destination guard.
3. Reuse an existing CICERS-to-main PR when available. Describe active behavior, inactive scaffolding, pending work and actual validation evidence separately.
4. Wait for the Windows/Linux static jobs and any required checks/reviews. If the PR is blocked, report the condition; do not force, bypass protection, or direct-push main.
5. Merge only when authorized and checks permit it. Verify the remote main commit and PR result; keep the local checkout on CICERS. A code checkpoint remains runtime-pending after merge.

## CI contract

`.github/workflows/workspace-checks.yml` runs the same dependency-free Node gate on Windows and Linux for PRs and branch pushes. Actions are pinned, permissions are read-only, credentials are not persisted, stale runs are cancelled, and no build or package is generated. The CI-contract test catches missing platforms/gates and privilege escalation.

## Documentation maintenance

Keep delivered contracts in architecture, unfinished integration in its remaining-work list, and simulator observations in testing. Remove completed tasks from the queue, not the evidence needed to understand them. Audit each intervening technical release before extending user-changelog coverage; explicitly distinguish development coverage from the public stable baseline.
