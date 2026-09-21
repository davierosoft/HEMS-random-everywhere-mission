# HEMS repository contract

## Mandatory start gate

1. Run `node tools/assert-cicers-branch.js` and `node tools/assert-single-worktree.js`; work only on `CICERS/*`, never `main`, with hooksPath `.githooks`.
2. Exactly one registered Git worktree may exist: `C:\Users\Andrew\Documents\Codex\progetto hems`. Any second worktree, automatic task worktree, clone, parallel checkout, or alternate mission copy is a blocking violation; do not create, select, or continue in it.
3. Read `docs/WORKSPACE_MAP.md` and relevant nested `AGENTS.md` files. Inspect `git status --short`, preserve user changes, name semantic scope, and run `node tools/check-mission-scope.js snapshot` before mission edits.

## Source and safety

- A user bullet list is an atomic work ledger: count every bullet, keep its original order and identity, resolve and report every bullet independently, and never omit one or treat one as implicitly included in another. Any unresolved bullet blocks delivery.
- Edit `mission-src/` modules, not generated `everywhere_all.json`; rebuild only after explicit authorization.
- Original-behavior baseline is exactly `starting point/baseline-0.997-original-fully-functional.json`; never edit it or substitute another baseline.
- `train.json` is independent. `global.json` is not a repository or delivery artifact and must never be written.
- Use `mission-workspace.js locate`; inspect each affected caller. Use `apply_patch` for surgical edits; formatting-only normalization may use the official formatter.
- Fix the primary command/state/prerequisite/destination/movement/ownership defect first. Fallbacks and watchdogs are secondary safeguards, never the solution.
- `bearing` is helicopter-relative; ground offsets use only cardinal `bearing2` (`0/90/180/270`); ambulance/stretcher rear ingress/egress is `bearing2:180`.
- Route points are Cartesian points: movement distance is between consecutive points, not from the reference object.
- User-facing strings are ASCII-only unless explicitly requested. `:LOCATION` is allowed only in HPG text-box formatter parameters.
- `param:*` is owner-thread scoped. Snapshot values into explicit params/locals before workers; reject out-of-scope references. For `location`/`object`, use `{"param":"..."}`, never interpolated `{param:*}` values.
- `drive_object` production name and `VAR1` fields must not use `param`; verified same-thread `local` traffic names may remain. Production `VAR1` is literal until a controlled test proves otherwise. Audit every mission drive before delivery.
- User-supplied drive tests must be edited in place, preserving object creation, objective, `wait_for`, reset, buttons, and result observation. A shortened replacement is invalid.
- Validate dynamic drive syntax against the original baseline and a minimal matrix; do not infer success from fallback/static behavior. Dynamic-command ambiguity requires a test before changing mission logic.
- Before `$CREW` create/set/drive, read `docs/architecture/HPG_DYNAMIC_OBJECT_STATES.md`; backpack standing is `VAR1:1`, walking is `VAR1:3`. Unknown state blocks edits.
- Crew movement is synchronous; no distance watchdog/fallback may decide completion. Initialize locals before `json:copy`; never serialize `undefined`.
- `pax3` is the pilot/backpack asset in ground operations, not a medical crew asset: never use its crouch/assessment `VAR1` states; use the documented pilot walking/standing states and reset standing before and after each drive.

## Build, release, and publication gates

1. Build or generate an artifact only after explicit authorization in the current request. Every authorized release advances exactly once: main release to the next integer, trial/local-test to the next decimal suffix; never reuse a supplied number. `tools/release-ledger.json` is authoritative for the last delivered artifact; if it disagrees with changelog, intent, or task history, stop and ask instead of inferring.
2. Before every publication, `tools/release-workflow.js` must inspect all registered worktrees, detectable offline copies, local outputs, and remote Git refs. If any contains a release newer than the candidate, publication stops as incoherent and may not be bypassed.
3. After an authorized build run `mission-workspace.js check`, then `release-workflow.js static`; run strict mission scope, targeted gates, `npm test` (or `node tools/check-workspace.js`), `git diff --check`, status and diff review.
4. A numbered local artifact is supplied only when explicitly requested and is always named `everywhere_all.json`. Drafts are internal. Static PASS never proves simulator behavior; runtime status must remain pending until tested.
5. Publication is local by default. GitHub push/tag/PR requires explicit GitHub/PR authorization; never open a PR opportunistically. `main` changes only through normal PR merge.
6. Release completeness is blocking: audit every carried requirement against source, artifact, automated tests, release notes, and runtime evidence. Omitted, partial, unverified, or watchdog-only fixes block delivery; defer only with explicit user consent.

## Documentation

- Durable architecture belongs in `docs/architecture/`; runtime checks in `docs/testing/`.
- Update `CHANGELOG.en.md` only for an externally visible technical release. Update `CHANGELOG_USER.en.md` only when explicitly requested; then use exactly `FIXES`, `UI`, `NEW FUNCTIONS`, audit every covered build, and run its validator.
