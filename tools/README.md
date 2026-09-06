# Workspace tools

All commands run with the Node runtime already required by the repository. No package installation is needed.

| Command | Purpose | Writes files |
| --- | --- | --- |
| `node tools/assert-cicers-branch.js` | Fails unless the checked-out branch starts with `CICERS/`. | No |
| `node tools/assert-safe-push.js` | Pre-push stdin validator; rejects branch destinations outside `refs/heads/CICERS/*`. | No |
| `node tools/check-workspace-consistency.js` | Verifies manifest/module/docs/scripts/AGENTS consistency and retired-handoff cleanup. | No |
| `node tools/mission-workspace.js locate "text"` | Finds the owning macro/data module without loading the monolith into agent context. | No |
| `node tools/mission-workspace.js check` | Proves modular sources rebuild the deployment artifact byte-for-byte. | No |
| `node tools/release-workflow.js begin --release "0.997 N" ...` | Requires the strictly next local revision, aligns title/changelog, and records the declared scope for one build. | `everywhere_all.json`, `CHANGELOG.en.md`, `.workspace-state/` |
| `node tools/mission-workspace.js build` | Reassembles `macros` and `data` into `everywhere_all.json`; consumes the prepared local revision exactly once. | `everywhere_all.json`, `.workspace-state/` |
| `node tools/release-workflow.js static` | Verifies scope, modular equality, and all static gates after a consumed build; always creates the local offline-test artifact. | `outputs/<release>-local-test/`, `.workspace-state/` |
| `node tools/release-workflow.js package --runtime-signoff "..."` | Creates a delivery copy only after static checks and named simulator runtime sign-off. | `outputs/`, `.workspace-state/` |
| `node tools/mission-workspace.js extract` | Initial migration only; splits the artifact and refuses an existing source tree unless `--force` is explicit. | `mission-src/` |
| `node tools/mission-workspace.js reindex` | Updates manifest order/format metadata after an intentional macro/data add, rename, or removal. | `mission-src/manifest.json` |
| `node tools/check-mission-scope.js snapshot` | Saves an ignored compressed baseline before a mission edit. | `.workspace-state/` |
| `node tools/check-mission-scope.js check --strict ...` | Lists changed root/macro/data keys and rejects anything outside explicit allow flags. | No |
| `node tools/test-workspace-tools.js` | Exercises negative branch, detached-HEAD, scope, allowlist, and baseline-integrity cases. | Temporary OS directory only |
| `npm test` | Runs modular-source, consistency, mission, DF, crew-emergency, and workspace-tool gates on any branch/CI checkout. | No |

Existing focused validators remain available: `validate-mission.js`, `validate-df-regression.js`, and `test-crew-emergency.js`.

Install the tracked hook protection once per clone with `git config core.hooksPath .githooks` (or `npm run hooks:install`). Pre-commit blocks commits outside `CICERS/*`, runs the complete workspace gate, and checks staged whitespace. Pre-push also rejects explicit refspecs that target `main` or any other non-CICERS branch.
