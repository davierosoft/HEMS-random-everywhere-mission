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
- A watchdog for a moving object must derive its timeout from the planned route or movement distance and the effective speed or speed multiplier, plus an explicit safety delta. A fixed timeout is forbidden for route travel. Its recovery fallback must be a verified location, never a route identifier; add or update a regression gate that rejects fixed route-watchdog timeouts.
- Location angles: `bearing` is the helicopter-relative azimuth and is valid only for offsets relative to the helicopter. Every non-helicopter ground-object offset uses `bearing2` and only the cardinal values `0`, `90`, `180`, or `270`. Ambulance and stretcher rear ingress or egress is always `bearing2: 180`; do not substitute `bearing` or a non-cardinal angle.
- User-facing mission strings added or changed by a task must be ASCII-only. Do not use Unicode punctuation, typographic quotes, dashes, symbols, or non-ASCII letters unless the user explicitly requests that exact character and the target HPG surface supports it.
- `global.json` is immutable mission input under this contract: never edit, regenerate, format, restore, or otherwise write it. New persistent options must use an existing compatible global/default path or pause for explicit user direction; do not create a new default in `global.json`.
- Mission root keys, command spelling, renderer placement, and state-machine rules are defined in `DEVELOPMENT_RELEASE_CHECKLIST.md`; read the relevant section before changing runtime behavior.

## Required verification

1. Before every local build, prepare one one-use intent. Use `node tools/release-workflow.js draft ...` for intermediate verification; it must not change the mission version, runtime build, changelog, or create a numbered delivery artifact. Use `begin --release ...` only when preparing the next artifact the user will actually receive; that release must be higher than the last supplied release. Corrections before delivery use drafts, never consume release numbers.
2. Run `node tools/mission-workspace.js check` after every mission build, then `node tools/release-workflow.js static`. Draft verification writes only under `outputs/drafts/`; a delivery intent creates `outputs/<release>-local-test/everywhere_all.json`.
3. Supply a numbered local-test artifact only for a user-requested delivery. A draft artifact is internal verification only and must never be described as a release, supplied as a download, or added to the changelog.
4. Run `node tools/check-mission-scope.js check --strict` with one `--allow-macro`, `--allow-data`, or `--allow-root` flag for every intended semantic change.
5. Run the smallest targeted gate during implementation, then `npm test` once when stable (`node tools/check-workspace.js` is the identical fallback when npm is unavailable). Tests are branch-neutral for CI; write protection is enforced by the branch guard and pre-commit hook.
6. Run `git diff --check` and inspect `git diff --stat`, `git status --short`, and the staged diff before commit.
7. Use `docs/testing/RUNTIME_VALIDATION.md` for affected HPG/MSFS scenarios. Static PASS never proves simulator behavior; package only after actual simulator sign-off.

## Documentation and delivery

- Durable architecture belongs in `docs/architecture/`; current manual runtime checks belong in `docs/testing/`. Do not create model-to-model handoff files.
- Every supplied mission artifact, including an unpublished local copy, must be named exactly `everywhere_all.json`. The only durable release counter is the last artifact actually supplied to the user; drafts and prepared intents do not advance it. Increment the mission title/build exactly once immediately before supplying the next user-requested artifact, never skip ahead based on internal drafts, and never reuse a supplied number. Publication remains separate.
- Every completed mission-runtime change that needs simulator validation must be prepared as the next numbered local-test artifact and linked directly in the final response. Do not finish such a change without making `everywhere_all.json` available for the user to install and test, unless the user explicitly says not to provide a local-test artifact.
- Update `CHANGELOG.en.md` only for a mission release or externally visible technical change. Change `CHANGELOG_USER.en.md` only when explicitly requested.
- When the user changelog is requested, compare every technical release after its stated coverage version with the user changelog. Add every final user-facing change, omit superseded/internal cumulative details, and never advance the coverage version while any intervening release is unaccounted for.
- User-changelog hard contract: when it is requested, `CHANGELOG_USER.en.md` must use the sections `FIXES`, `UI`, then `NEW FUNCTIONS`, in exactly that order. Write only for a final user: describe visible screens, controls, mission behavior, and what the pilot can verify. Do not mention source files, macros, variables, object identifiers, queries, SDKs, internal states, implementation strategies, or code terminology. Put each final user-visible behavior in one category only (the most pertinent one), with one build-history reference and one short runtime test. Audit every build from the stated baseline through the target build, including post-target development checkpoints, and retain a coverage ledger that accounts for each build. A short thematic summary, duplicated behavior, omission of an earlier completed function because a related later function exists, or technical language is noncompliant. Run `node tools/validate-user-changelog.js` before committing the requested update.
- Keep commits on `CICERS/*`. For every future user request to publish a completed change, automatically push the named CICERS branch after its commit and required checks succeed. Never bypass branch protection or claim runtime validation that was not performed.
- When explicitly asked to sync code while simulator testing continues, publish a development checkpoint with runtime status marked PENDING. This is not permission to package, tag, or announce a validated mission release. Update `main` only through a normal PR merge after its required checks; never direct-push, force, or use an admin bypass.
- Keep completed architecture separate from the remaining-work list. Remove implemented tasks from that list, but retain incomplete integration and unverified simulator scenarios. Consult `docs/architecture/DEVELOPMENT_WORKFLOW.md` and `docs/testing/VALIDATION_STATUS.md`; do not restart completed SDK-only work.
