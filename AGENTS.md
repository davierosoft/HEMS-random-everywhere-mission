# HEMS repository contract

These instructions protect the deployable mission while keeping coding-agent context focused.

## Start every task

1. Run `node tools/assert-cicers-branch.js`. Work only on `CICERS/*`; never edit, commit, or push `main`. Ensure `git config core.hooksPath` reports `.githooks`; the tracked pre-commit and pre-push hooks are mandatory.
2. Read `docs/WORKSPACE_MAP.md`, then only the subsystem documentation relevant to the request.
3. Inspect `git status --short` and preserve user changes.
4. Name the allowed files, macro names, and data keys before editing. For mission work, run `node tools/check-mission-scope.js snapshot` first.

## Source ownership

- `mission-src/` is the editable source for the `macros` and `data` sections of `everywhere_all.json`.
- `everywhere_all.json` is the generated deployment artifact. Do not patch or reformat it directly; edit one focused module and run `node tools/mission-workspace.js build`.
- `global.json` and `train.json` remain independent deployable inputs.
- Use `node tools/mission-workspace.js locate "<name>"` to find a macro or data owner. Do not search or load the 8.7 MB artifact when a module is available.
- Follow nested `AGENTS.md` files inside `mission-src/`, `tools/`, and `docs/` when working there.

## Surgical changes

- Use `apply_patch` for direct edits. Do not serialize or reformat large unaffected blocks.
- Inspect the diff after each logical patch. Shared-state changes require inspection of every affected caller.
- No opportunistic refactors, renamed runtime state, UI changes, or release bumps outside the request.
- User-facing mission strings added or changed by a task must be ASCII-only. Do not use Unicode punctuation, typographic quotes, dashes, symbols, or non-ASCII letters unless the user explicitly requests that exact character and the target HPG surface supports it.
- Every new option added to Settings or the technical page is persistent by default: use a named global, initialize its first-run default in global.json, and prefix its user-facing description with (P). Depart from this only when the user explicitly requests a non-persistent option.
- Mission root keys, command spelling, renderer placement, and state-machine rules are defined in `DEVELOPMENT_RELEASE_CHECKLIST.md`; read the relevant section before changing runtime behavior.

## Required verification

1. Before every local build, prepare one higher revision with `node tools/release-workflow.js begin ...`; `mission-workspace.js build` consumes that revision exactly once. A correction after any build requires a new higher revision.
2. Run `node tools/mission-workspace.js check` after every mission build, then `node tools/release-workflow.js static`. Static verification always creates `outputs/<release>-local-test/everywhere_all.json`.
3. Unless the user explicitly asks not to receive it, provide that local-test artifact after every mission update, even when publication has not been requested. A local test copy is not a published or runtime-validated release.
4. Run `node tools/check-mission-scope.js check --strict` with one `--allow-macro`, `--allow-data`, or `--allow-root` flag for every intended semantic change.
5. Run the smallest targeted gate during implementation, then `npm test` once when stable. `npm test` is branch-neutral for CI; write protection is enforced separately by the branch guard and pre-commit hook.
6. Run `git diff --check` and inspect `git diff --stat`, `git status --short`, and the staged diff before commit.
7. Use `docs/testing/RUNTIME_VALIDATION.md` for affected HPG/MSFS scenarios. Static PASS never proves simulator behavior; package only after actual simulator sign-off.

## Documentation and delivery

- Durable architecture belongs in `docs/architecture/`; current manual runtime checks belong in `docs/testing/`. Do not create model-to-model handoff files.
- Every supplied mission artifact, including an unpublished local copy, must be named exactly `everywhere_all.json`. Before supplying it, increment the release/build number shown in the mission title; never reuse a prior supplied number. After every mission update, supply the mandatory local-test artifact unless the user explicitly opts out; publication remains separate.
- Update `CHANGELOG.en.md` only for a mission release or externally visible technical change. Change `CHANGELOG_USER.en.md` only when explicitly requested.
- When the user changelog is requested, compare every technical release after its stated coverage version with the user changelog. Add every final user-facing change, omit superseded/internal cumulative details, and never advance the coverage version while any intervening release is unaccounted for.
- Keep commits on `CICERS/*`. Push only the named CICERS branch; never bypass branch protection or claim runtime validation that was not performed.
