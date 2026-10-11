# Modular mission source

`everywhere_all.json` must remain a single HPG deployment artifact, but it is too large for safe routine editing. This directory holds every root section of the mission as focused, valid JSON modules; nothing is artifact-owned:

- `macros/`: 22 subsystem files containing all 929 command macros, including the checklists, Astra P1-P3 integration and location diagnostics.
- `data/`: 6 files containing all 194 persistent tables, content pools, assets, and message catalogs.
- `threads/`: 3 files with the 38 mission threads (startup and dispatch triggers, CARLS, flight monitors).
- `icons/`: 6 files with the 36 embedded icons; the large vital-sign images each have their own file. Opaque base64: do not read them, locate and replace by key.
- `root/`: 3 files with the remaining root keys (title, id, author, start_info, aircraft, applicable, api_version, locations, objects, userActions in the header; objectives; briefing).
- `manifest.json`: root key order, key order of every section, module descriptions and separator metadata. Assembly uses the mandatory shared formatter.

## Normal workflow

```text
node tools/mission-workspace.js locate "debug page"
node tools/check-mission-scope.js snapshot
# edit the returned module with a surgical patch
node tools/release-workflow.js draft --note "Focused correction" --allow-macro "debug page"
node tools/mission-formatter.js sources
node tools/mission-workspace.js build
node tools/mission-workspace.js check
node tools/check-mission-scope.js check --strict --allow-macro "debug page"
npm test
git diff --check
```

`check` requires the modules to reproduce the deployed artifact byte-for-byte, not merely parse to the same object. CI also requires the shared formatting for every source module and both deployable inputs, and checks semantic preservation and formatter idempotence.

Scope snapshots are bound to the active branch (`main`), timestamped, and protected by SHA-256. A stale snapshot from another branch or a tampered payload is rejected rather than silently reused.

When a task intentionally adds, renames, removes or moves between modules a top-level entry (macro, data table, thread, icon or root key), edit the owning module and run `node tools/mission-workspace.js reindex` before `build`. Reindexing preserves existing separators and appends genuinely new keys; review the manifest and semantic scope like any other source change.

Module size: every module stays under 1 MiB (checked by the consistency gate). Split a module when one subsystem inside it is edited on its own (the checklists were split out of `03-aircraft-crew-checklists.json`); to split, move the entries into a new file, register it in `manifest.json` under `modules`, run `mission-formatter.js sources` and `reindex`, and prove with `compose` that the artifact bytes are unchanged. A single very large macro is not made smaller by splitting files.
