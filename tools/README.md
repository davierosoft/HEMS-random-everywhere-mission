# Workspace tools

All commands run with the Node runtime already required by the repository. No package installation is needed.

| Command | Purpose | Writes files |
| --- | --- | --- |
| `node tools/assert-cicers-branch.js` | Fails unless the checked-out branch starts with `CICERS/`. | No |
| `node tools/mission-workspace.js locate "text"` | Finds the owning macro/data module without loading the monolith into agent context. | No |
| `node tools/mission-workspace.js check` | Proves modular sources rebuild the deployment artifact byte-for-byte. | No |
| `node tools/mission-workspace.js build` | Reassembles `macros` and `data` into `everywhere_all.json`. | `everywhere_all.json` |
| `node tools/mission-workspace.js extract` | Initial migration only; splits the artifact and refuses an existing source tree unless `--force` is explicit. | `mission-src/` |
| `node tools/mission-workspace.js reindex` | Updates manifest order/format metadata after an intentional macro/data add, rename, or removal. | `mission-src/manifest.json` |
| `node tools/check-mission-scope.js snapshot` | Saves an ignored compressed baseline before a mission edit. | `.workspace-state/` |
| `node tools/check-mission-scope.js check --strict ...` | Lists changed root/macro/data keys and rejects anything outside explicit allow flags. | No |
| `npm test` | Runs branch, modular-source, mission, DF, and crew-emergency static gates. | No |

Existing focused validators remain available: `validate-mission.js`, `validate-df-regression.js`, and `test-crew-emergency.js`.
