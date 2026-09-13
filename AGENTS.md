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
- `train.json` remains an independent deployable input. HPG owns the local global-state container; it is not a repository or delivery artifact.
- Use `node tools/mission-workspace.js locate "<name>"` to find an owner; do not load the monolith when a module is available.
- Follow nested `AGENTS.md` files inside `mission-src/`, `tools/`, and `docs/` when working there.

## Surgical changes

- Use `apply_patch` for direct edits. Do not serialize or reformat large unaffected blocks.
- Inspect the diff after each logical patch and every affected caller for shared-state changes.
- No opportunistic refactors, renamed state, UI changes, or release bumps.
- A watchdog for a moving object must derive its timeout from the planned route or movement distance and the effective speed or speed multiplier, plus an explicit safety delta. A fixed timeout is forbidden for route travel. Its recovery fallback must be a verified location, never a route identifier; add or update a regression gate that rejects fixed route-watchdog timeouts.
- Location angles: `bearing` is the helicopter-relative azimuth and is valid only for offsets relative to the helicopter. Every non-helicopter ground-object offset uses `bearing2` and only the cardinal values `0`, `90`, `180`, or `270`. Ambulance and stretcher rear ingress or egress is always `bearing2: 180`; do not substitute `bearing` or a non-cardinal angle.
- User-facing mission strings must be ASCII-only unless explicitly requested.
- `global.json` is not a repository or delivery artifact. Never edit, regenerate, format, restore, or otherwise write it. Initialize required globals in the mission with null-guarded `set: global`; never overwrite local HPG state.
- `:LOCATION` is permitted only in HPG text-box formatter parameters. Never use it in values, initialization, conditions, structs, tables, snapshots, or debug state. Runtime logging uses dedicated mission LVARs populated by the documented coordinate mechanism; snapshots may read those LVARs only.
- Root keys, command spelling, renderer placement, and state-machine rules are defined in `DEVELOPMENT_RELEASE_CHECKLIST.md`.

## Required verification

1. Before every local build, prepare one one-use intent with `node tools/release-workflow.js draft ...`; it must not change version, changelog, or create a numbered artifact. Use `begin --release ...` only after explicit publication of the next higher release. Corrections use drafts.
2. Run `node tools/mission-workspace.js check` after every build, then `node tools/release-workflow.js static`. Drafts write only under `outputs/drafts/`; delivery creates `outputs/<release>-local-test/everywhere_all.json`.
3. Supply a numbered local-test artifact only for a user-requested delivery. A draft artifact is internal verification only and must never be described as a release, supplied as a download, or added to the changelog.
4. Run `node tools/check-mission-scope.js check --strict` with one `--allow-macro`, `--allow-data`, or `--allow-root` flag for every intended semantic change.
5. Run the smallest targeted gate during implementation, then `npm test` once when stable (`node tools/check-workspace.js` is the identical fallback when npm is unavailable). Tests are branch-neutral for CI; write protection is enforced by the branch guard and pre-commit hook.
6. Run `git diff --check` and inspect `git diff --stat`, `git status --short`, and the staged diff before commit.
7. Use `docs/testing/RUNTIME_VALIDATION.md` for affected HPG/MSFS scenarios. Static PASS never proves simulator behavior; package only after actual simulator sign-off.

## Documentation and delivery

- Durable architecture belongs in `docs/architecture/`; current manual runtime checks belong in `docs/testing/`. Do not create model-to-model handoff files.
- Every supplied mission artifact, including an unpublished local copy, must be named exactly `everywhere_all.json`. The only durable release counter is the last artifact explicitly supplied to the user; drafts, prepared intents, builds, and unsupplied local-test artifacts do not advance it. Increment the mission title/build exactly once immediately before an explicitly ordered publication, never skip ahead based on internal work, and never reuse a supplied number.
- Release completeness is a blocking gate: whenever the user requests a release, audit every explicit requirement from the applicable task history against the source, generated artifact, tests, and release notes. A release must not be published, supplied, or described as complete while any requested point is omitted, partial, unverified, or contradicted. A point may be deferred only after the user gives explicit consent for that specific omission, and the release report must record the consent and the deferred point.
- Drafts are internal; publish/link a local-test artifact only when explicitly ordered.
- Update `CHANGELOG.en.md` only for a mission release or externally visible technical change. Change `CHANGELOG_USER.en.md` only when explicitly requested.
- When the user changelog is requested, compare every technical release after its stated coverage version with the user changelog. Add every final user-facing change, omit superseded/internal cumulative details, and never advance the coverage version while any intervening release is unaccounted for.
- User-changelog hard contract: when it is requested, `CHANGELOG_USER.en.md` must use the sections `FIXES`, `UI`, then `NEW FUNCTIONS`, in exactly that order. Write only for a final user: describe visible screens, controls, mission behavior, and what the pilot can verify. Do not mention source files, macros, variables, object identifiers, queries, SDKs, internal states, implementation strategies, or code terminology. Put each final user-visible behavior in one category only (the most pertinent one), with one build-history reference and one short runtime test. Audit every build from the stated baseline through the target build, including post-target development checkpoints, and retain a coverage ledger that accounts for each build. A short thematic summary, duplicated behavior, omission of an earlier completed function because a related later function exists, or technical language is noncompliant. Run `node tools/validate-user-changelog.js` before committing the requested update.
- Keep commits on `CICERS/*`. For every future user request to publish a completed change, automatically push the named CICERS branch after its commit and required checks succeed. Never bypass branch protection or claim runtime validation that was not performed.
- When explicitly asked to sync code while simulator testing continues, publish a development checkpoint with runtime status marked PENDING. This is not permission to package, tag, or announce a validated mission release. Update `main` only through a normal PR merge after its required checks; never direct-push, force, or use an admin bypass.
- Keep completed architecture separate from the remaining-work list. Remove implemented tasks from that list, but retain incomplete integration and unverified simulator scenarios. Consult `docs/architecture/DEVELOPMENT_WORKFLOW.md` and `docs/testing/VALIDATION_STATUS.md`; do not restart completed SDK-only work.
