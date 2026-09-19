# HEMS repository contract

These instructions protect the deployable mission and user state.

## Start every task

1. Run `node tools/assert-cicers-branch.js`. Work only on `CICERS/*`; never edit, commit, or push `main`. Ensure hooksPath is `.githooks`.
2. Read `docs/WORKSPACE_MAP.md` and relevant subsystem documentation.
3. Inspect `git status --short` and preserve user changes.
4. Name the allowed files, macro names, and data keys before editing. For mission work, run `node tools/check-mission-scope.js snapshot` first.

## Source ownership

- `mission-src/` is the editable source for the `macros` and `data` sections of `everywhere_all.json`.
- `everywhere_all.json` is generated; edit one focused module and run `node tools/mission-workspace.js build`.
- The historical original mission artifact is `starting point/baseline-0.997-original-fully-functional.json`. Use this exact file as the original-behavior reference when comparing regressions or reconstructing prior behavior. Do not substitute `git HEAD`, a generated `everywhere_all.json`, a release output, or a later modular source snapshot; do not edit the baseline file.
- `train.json` remains an independent deployable input. HPG owns the local global-state container; it is not a repository or delivery artifact.
- Use `node tools/mission-workspace.js locate "<name>"` to find an owner; prefer modules over the monolith.
- Follow nested `AGENTS.md` files inside `mission-src/`, `tools/`, and `docs/` when working there.

## Surgical changes

- Use `apply_patch` for direct edits. Do not serialize or reformat large unaffected blocks.
- Inspect the diff after each logical patch and every affected caller for shared-state changes.
- Primary-cause rule: fallback and watchdogs are secondary safeguards, never the solution to a mission failure. For every stall or incorrect state, identify and correct the command, state transition, prerequisite, destination, movement, or ownership defect first; add a fallback/watchdog only afterward to contain a separately verified residual failure. A fallback or watchdog alone never qualifies the underlying issue as fixed.
- Location angles: `bearing` is the helicopter-relative azimuth and is valid only for offsets relative to the helicopter. Every non-helicopter ground-object offset uses `bearing2` and only the cardinal values `0`, `90`, `180`, or `270`. Ambulance and stretcher rear ingress or egress is always `bearing2: 180`; do not substitute `bearing` or a non-cardinal angle.
- Drive-route geometry rule: every `bearing`/`bearing2` plus `dist` entry defines a Cartesian route point relative to its reference object. The distance travelled by `drive_object` is the Cartesian distance between consecutive route points, not the final point's `dist` from the reference object. Analyze every segment using both points and their bearings before attributing a movement failure to speed or timeout.
- User-facing mission strings must be ASCII-only unless explicitly requested.
- `global.json` is not a repository or delivery artifact. Never edit, regenerate, format, restore, or otherwise write it. Initialize required globals in the mission with null-guarded `set: global`; never overwrite local HPG state.
- `param:*` is scoped to its owning macro/thread. Workers, `create_thread`, and callees may not implicitly read/write caller params. Snapshot inputs into explicit `params` or locals before spawning; reject any out-of-scope reference.
- `:LOCATION` is permitted only in HPG text-box formatter parameters. Never use it in values, initialization, conditions, structs, tables, snapshots, or debug state. Runtime logging uses dedicated mission LVARs populated by the documented coordinate mechanism; snapshots may read those LVARs only.
- Root keys, command spelling, renderer placement, and state-machine rules are defined in `DEVELOPMENT_RELEASE_CHECKLIST.md`.

## Required verification

1. Before every local build, prepare one one-use intent with `node tools/release-workflow.js draft ...`; it must not change version, changelog, or create a numbered artifact. Use `begin --release ...` only after explicit publication of the next higher release. Corrections use drafts.
2. After every build run `check` then `static`. Test versions require a distinct suffix; drafts verify, while requested delivery creates `outputs/<release>-local-test/everywhere_all.json`.
3. Supply a numbered local-test artifact only for a user-requested delivery. A draft artifact is internal verification only and must never be described as a release, supplied as a download, or added to the changelog.
4. Run strict mission-scope with one allow flag per semantic change. Never publish/supply the same number or suffix; change at least the suffix.
5. Run the smallest targeted gate during implementation, then `npm test` once when stable (`node tools/check-workspace.js` is the identical fallback when npm is unavailable). Tests are branch-neutral for CI; write protection is enforced by the branch guard and pre-commit hook.
6. Run `git diff --check` and inspect `git diff --stat`, `git status --short`, and the staged diff before commit.
7. Use `docs/testing/RUNTIME_VALIDATION.md` for affected HPG/MSFS scenarios. Static PASS never proves simulator behavior; package only after actual simulator sign-off.

## Documentation and delivery

- Durable architecture belongs in `docs/architecture/`; runtime checks in `docs/testing/`.
- Release completeness blocks delivery: audit every explicit requirement against source, artifact, tests, and notes. Do not publish omitted, partial, unverified, or contradicted work; defer only with explicit user consent and record it.
- Requirement continuity is mandatory: every explicit point from current/relevant prior chats stays in the release ledger until canceled. Before delivery, account for each with source, artifact, automated-test, and runtime status; omitted, deferred, or watchdog-only items block publication.
- Drafts are internal; publish/link a local-test artifact only when explicitly ordered.
- Publication is local by default. GitHub push, tag, or PR requires that the user explicitly names GitHub/PR; never open a PR opportunistically.
- A requested publication must use the next unused release number exactly once; never reuse a supplied local-test number or suffix. The local artifact is always named `everywhere_all.json`.
- Update `CHANGELOG.en.md` only for a mission release or externally visible technical change. Change `CHANGELOG_USER.en.md` only when explicitly requested.
- When the user changelog is requested, compare every technical release after its stated coverage version with the user changelog. Add every final user-facing change, omit superseded/internal cumulative details, and never advance the coverage version while any intervening release is unaccounted for.
- User-changelog contract: when requested, `CHANGELOG_USER.en.md` uses exactly `FIXES`, `UI`, `NEW FUNCTIONS`; describe only user-visible behavior, with one build reference and one runtime test per item. Audit every build in scope and run `node tools/validate-user-changelog.js`.
- Keep commits on `CICERS/*`. For an explicitly requested GitHub publication, push the named CICERS branch after its commit and required checks succeed, then open/attach a PR only if explicitly requested. Never bypass branch protection or claim runtime validation that was not performed.
- When explicitly asked to sync code while simulator testing continues, publish a development checkpoint with runtime status marked PENDING. This is not permission to package, tag, or announce a validated mission release. Update `main` only through a normal PR merge after its required checks; never direct-push, force, or use an admin bypass.
- Keep completed architecture separate from remaining work; retain incomplete integration and unverified simulator scenarios. Consult the workflow and validation-status docs.
