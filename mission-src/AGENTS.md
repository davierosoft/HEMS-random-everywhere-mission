# Modular mission source rules

- Edit only the module returned by `node tools/mission-workspace.js locate "<macro-or-data-name>"`.
- Keep existing entry order, indentation, compact/manual JSON style, and command spelling. Do not pretty-print a module.
- Run `node tools/check-mission-scope.js snapshot` before the first semantic edit.
- Before each local build, run `node tools/release-workflow.js begin` with the strictly next revision and the exact semantic scope. `mission-workspace.js build` consumes it once; a correction requires a higher revision.
- After editing, run `node tools/mission-workspace.js build`, inspect the artifact diff immediately, then run `node tools/mission-workspace.js check` and `node tools/release-workflow.js static`.
- Prove scope with `node tools/check-mission-scope.js check --strict` and explicit allow flags. Any unlisted root key, macro, or data key is blocking.
- `manifest.json` owns entry order and byte-preserving separators. Do not edit its formatting metadata by hand.
- After intentionally adding, renaming, or removing a top-level macro/data entry, run `node tools/mission-workspace.js reindex` before `build` and inspect both manifest and artifact diffs.
- Never place renderer rows at macro command level. Follow `DEVELOPMENT_RELEASE_CHECKLIST.md` for conditions, persistence, CARLS, medical, vehicle, crew, and release rules.
