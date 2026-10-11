# Workspace tools

All commands run with the Node runtime already required by the repository. No package installation is needed.

| Command | Purpose | Writes files |
| --- | --- | --- |
| `node tools/assert-cicers-branch.js` | Fails unless the checked-out branch is `main`. | No |
| `node tools/assert-safe-push.js` | Pre-push stdin validator; rejects any branch destination other than `refs/heads/main`. | No |
| `node tools/check-workspace-consistency.js` | Verifies manifest/module/docs/scripts/AGENTS consistency and retired-handoff cleanup. | No |
| `node tools/test-hvar-command-compatibility.js` | Verifies every current HVAR trigger and assignment form against the documented HPG command contract. | No |
| `node tools/mission-workspace.js locate "text"` | Finds the owning module of a macro, data table, thread, icon or root key without loading the monolith into agent context. | No |
| `node tools/mission-workspace.js check` | Proves modular sources rebuild the deployment artifact byte-for-byte. | No |
| `node tools/release-workflow.js draft --note "..." ...` | Creates a one-use internal build intent; it preserves the supplied release identity and changelog. | `.workspace-state/` |
| `node tools/release-workflow.js begin --release "0.997 N" ...` | Prepares the strictly next user-delivery revision, aligns title/changelog, and records the declared scope for one build. | `everywhere_all.json`, `CHANGELOG.en.md`, `.workspace-state/` |
| `tools/release-ledger.json` | Tracked record of the last artifact actually supplied to the user; the next delivery must be strictly higher. | Manual update only when an artifact is actually supplied |
| `node tools/mission-workspace.js build` | Reassembles every root section (`macros`, `data`, `threads`, `icons`, root keys) into `everywhere_all.json`; consumes one prepared draft or delivery intent exactly once. | `everywhere_all.json`, `.workspace-state/` |
| `node tools/release-workflow.js static` | Verifies scope, modular equality, and all static gates. Drafts create internal artifacts only; deliveries create `outputs/<release>-local-test/`. | `outputs/`, `.workspace-state/` |
| `node tools/release-workflow.js package --runtime-signoff "..."` | Creates a delivery copy only after static checks and named simulator runtime sign-off. | `outputs/`, `.workspace-state/` |
| `node tools/mission-workspace.js reindex` | Updates manifest order/format metadata after an intentional add, rename, removal or move between modules of a macro, data table, thread, icon or root key. | `mission-src/manifest.json` |
| `node tools/check-mission-scope.js snapshot` | Saves an ignored compressed baseline before a mission edit. | `.workspace-state/` |
| `node tools/check-mission-scope.js check --strict ...` | Lists changed root/macro/data keys and rejects anything outside explicit allow flags. | No |
| `node tools/test-workspace-tools.js` | Exercises negative branch, detached-HEAD, scope, allowlist, and baseline-integrity cases. | Temporary OS directory only |
| `node tools/test-crew-patient-visits.js` | Executes physical visit sequencing for all three crews and patients, assignment exclusion, reassessment, lock contention and failure handling. | No |
| `node tools/test-ambulance-shelter.js` | Executes the ambulance shelter on scripted world answers: the conditions in order with the weather limits, the physical sequence that keeps the identity anchor, the abort of every failure, the release by a ticket, the monitor, the registry hooks and the diagnostics. | No |
| `node tools/test-hoist-cable.js` | Executes the hoist cable casualties on scripted world answers (hook height, reel length, aircraft signals, random draws): gate and lock, injury floor of 20 for the hoist operator, the watch and release of an injured operator at the ground, fatal events with the hook releasing or keeping the person, the position of the user aircraft, the packed injured patient, the three hoist out ladders and their trace, the ground impact tiers, and the cable flags of every caller. | No |
| `node tools/test-live-patient-transport.js` | Executes live tour barriers, queued assignment, all nine P1-P3/resource combinations, physical-recovery guards, independent deterioration, real MANUAL/CPR worker commands and save/restore. Simulator behavior remains a separate gate. | No |
| `npm test` | Runs modular-source, consistency, mission, DF, crew-emergency, and workspace-tool gates on any branch/CI checkout. | No |

Existing focused validators remain available: `validate-mission.js`, `validate-df-regression.js`, and `test-crew-emergency.js`.

Install the tracked hook protection once per clone with `git config core.hooksPath .githooks` (or `npm run hooks:install`). Pre-commit blocks commits outside `main`, runs the workspace gate (a targeted subset for doc-only commits, the full suite otherwise), and checks staged whitespace. Pre-push also rejects explicit refspecs that target any branch other than `main`.
