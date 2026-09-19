# Modular mission source

`everywhere_all.json` must remain a single HPG deployment artifact, but it is too large for safe routine editing. This directory exposes its two actively maintained object sections as focused, valid JSON modules:

- `macros/`: 20 subsystem files containing all 763 command macros, including Astra P1-P3 integration and location diagnostics.
- `data/`: 6 files containing all 186 persistent tables, content pools, assets, and message catalogs.
- `manifest.json`: stable key order, module descriptions, and retained source-extraction metadata. Assembly uses the mandatory shared formatter.

The remaining root sections stay artifact-owned because they are small or are large opaque payloads such as embedded icons.

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

`check` requires the modules to reproduce the deployed artifact byte-for-byte, not merely parse to the same object. CI also requires the shared formatting for every source module and both deployable inputs, and checks semantic preservation and formatter idempotence. `extract --force` is a migration/recovery command that overwrites all modules from the artifact; never use it during an ordinary feature edit.

Scope snapshots are bound to the active CICERS branch, timestamped, and protected by SHA-256. A stale snapshot from another branch or a tampered payload is rejected rather than silently reused.

When a task intentionally adds, renames, or removes a top-level macro/data entry, edit the owning module and run `node tools/mission-workspace.js reindex` before `build`. Reindexing preserves existing separators and appends genuinely new keys; review the manifest and semantic scope like any other source change.
