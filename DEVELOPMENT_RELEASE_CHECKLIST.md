# Mission release safety checklist

This is a blocking checklist. Read it before changing `everywhere_all.json`, run the automated gate after every change, then complete the relevant in-simulator checks before publishing. Do not describe an audit as complete if a required runtime test has not been run.

## 0. Release identity — blocking before every package

- The release number in the first `CHANGELOG.en.md` heading and the static `everywhere_all.json.title` displayed in the tablet must be identical.
- The validator must fail on a stale displayed build even when every JSON and HPG syntax check passes.
- Inspect the actual staged title before commit; never infer the displayed release from the changelog or commit message.

## 1. HPG condition syntax — highest-risk rule

- Every executable `if`, `wait_for`, and `while` has exactly one sibling comparison operator: `eq`, `ne`, `gt`, `gte`, `lt`, or `lte`.
- A direct executable operand is a `var`, `local`, `global`, `param`, or a root logical expression. It is never a direct `require` object.
- Every `and` or `or` **nested inside another logical condition** has its own comparison operator, normally `eq: 1`. Example: `{ "or": [ ... ], "eq": 1 }`.
- Exception: a logical expression used as the *value* of a `require` is already compared by that outer `require`; do not add a second operator inside it. The ambulance/police/fire arrival checks use this valid form.
- Do not build boolean groups manually without running `node tools/validate-mission.js` afterwards.
- Treat command names as an exact API contract. Reject unknown or near-match spellings, including non-ASCII variants such as the release-92 `create_lùocation` defect; a parsed JSON key is not proof that HPG recognizes it.

## 2. State and persistence

- Any value displayed after a mission reload must have an explicit fallback. Local variables are not persistence.
- A persistent user choice must use a named `global` and have a first-run default in `global.json`.
- Normalise values before formatting them. A renderer must not print an optional local directly when `undefined` is possible.
- When an automatic action changes the user-visible state, update the same persistent state used by its manual counterpart.

## 3. Debug-page contract

- Every new or renamed runtime state, queue owner, transport phase, persistent editor flag, and recovery watchdog added to the mission must be exposed on the debug page in the same commit. If a state is intentionally omitted, record the reason in the technical changelog.
- The release validator must assert the presence of critical debug fields. A debug row that references an obsolete or misspelled state is a blocking failure.
- Before publishing, compare the debug page against each changed state machine: medical patient owner/display, ambulance transfer, ground-transport completion, preset dirty/loaded/pending, vehicle route and timeout.
- If Debug provides a persistent snapshot, open the HPG table before reading it and call `save_table` after Capture/Clear. Test close/reopen, mission reload and second dispatch; `debug_write` is console output, not an end-user retrieval mechanism.

## 4. CARLS / renderer rules

- `set_carls_radio` always receives exactly three **string** labels for `LSK` and three for `RSK`; never pass a dynamic expression as a soft-key label.
- Each renderer state must be mutually exclusive and complete. Test idle, edit, invalid edit, valid edit, fixed-modulation bands, UHF AM, and UHF FM.
- Keep every CARLS DF value that must survive a keypad event, renderer pass, or timeout thread in reset-on-open shared `global` state. Use `local` only for scratch values consumed in the same task, pass the pressed key as a same-task `param`, and never route editor state through LVARs.
- Preserve direct `if` + comparator checks on the linear DF input path. Do not replace them with one-item `and/require` wrappers; the release test must prove that the first key is captured and renders `EDT: 1_#.###`.
- Treat open, numeric handlers, renderer, ESC/ENT and timeout monitor as different tasks. The blocking test sequence is: open -> press 1 once -> show `EDT: 1_#.###` and ESC -> wait five seconds -> cancel incomplete edit, restore idle frequency/modulation and hide ESC.
- A blank SK is also a state: its event handler must be harmless.
- Text that has a known display limit is measured before release. Never rely on wrapping for units, status labels, or checklist answer fields.

## 5. Validation and user input

- Validate incrementally where the UI asks for digit-by-digit entry. Reject an illegal digit without advancing the cursor.
- Re-check all boundaries, gaps, and grids after changing validation: lower bound, upper bound, first valid value after each gap, last valid value before each gap, and prohibited spacing values.
- Keep the previous accepted state intact on cancel, timeout, or invalid input.

## 6. Scope and regressions

- Inspect the existing working macro/page before replacing it. Preserve unrelated controls, handlers, and feature gates.
- Check every call site when changing shared state, object names, doors, crew counts, route ETA, or patient transport variables.
- Do not change files outside the requested scope. Preserve existing user changes.
- `CHANGELOG_USER.en.md` changes only on an explicit request. Always update `CHANGELOG.en.md` and `HANDOFF_CHATGPT_SOL.md` for a release.

## 7. Ambulance, crew, and multipatient independence

- Test near and far stretcher routes with 3-, 4-, and 5-person crews for `whobringpatient=us`, `ambulance`, and `ambudoc`.
- Once `whobringpatient=ambulance`, `ambustretcher` must not wait for HEMS crew, aircraft doors, rotor/hoist state, or `stretcheronambulance`. The helicopter/HEMS crew return path and the ambulance patient-transfer path advance independently.
- `ambudoc` may wait only for the HEMS doctor who is actually travelling with the patient. `us` retains the HEMS stretcher synchronization.
- The ambulance must resolve an automatic hospital destination before creating/driving its route; no extra hospital prompt is introduced unless the normal mission logic explicitly requires one.
- For multiple patients, use canonical `manual_pN_*` state names. Completion and death must release the active-patient mutex. Manual actions are enabled only for the displayed active patient.
- Ambulances assess every available patient before continuing treatment. They may load only a patient explicitly marked `ground_transport_ready`; after loading, record the transport, finalize the report, remove the scene casualty, and make every HEMS flow skip it.

## 8. Mission preset editor

- Individual and category clicks modify only the open in-memory preset and mark it dirty. Do not call `save_table` for every click.
- Flush a dirty table before switching preset and when leaving either mission-list page. Loading/recomputing a preset never rewrites it.
- Derive category selected state from every mission row in the currently open table. One disabled mission makes the category false.
- A partial category requires a second press on the same category to enable all. A fully enabled category disables all on the next press. Any individual change clears pending confirmation.
- No Save button: persistence is automatic on switch/exit. Test two edited presets, both pages, mission reload, single toggles, partial groups, full groups, and ALL MISSIONS.

## 9. Crew LifeScore and emergency termination

- Every LifeScore impact names exactly one member. Environmental loss uses the ground object-to-hazard distance; never substitute aircraft-to-hazard distance and never reduce all configured crew members together.
- Test the exact boundary: 11 -> 10 must produce `CREW_CRITICAL`; any value reduced to zero must produce `CREW_FATAL`. Both fail the mission, terminate the shift, and suppress successful-completion UI.
- The first injury/exposure and each deterioration threshold must reach all three channels: tablet message, Dispatch message array, and RescueTrack. Threshold flags prevent repeated messages every monitor cycle.
- A deceased visible operator is replaced in place with the packaged casualty asset using the same object name. Survivor boarding must skip only that replacement, not every other ground operator.
- Living scene operators must board through the seat/door/payload mapping for 3-, 4-, and 5-person crews. At hospital they must deboard and follow the hospital-door/building path; test cable-only and ground-object hoist cases separately.
- Keep a bounded hospital-query fallback to the existing return-to-base flow. An absent query result must never leave the failed mission waiting forever.
- In every historical fatal branch, invoke the fatal handler before clearing `HOIST_OUT`. The handler itself must be one-shot and must not depend on the old hoist flag still being set.
- Update the Debug page with emergency member, score, cause, source object, fatal/critical state, boarding, route fallback, and packaged-object result.
- Run both `node tools/validate-mission.js` and `node tools/test-crew-emergency.js`; then execute the runtime matrix in the handoff because object choreography, route queries, and simulator assets cannot be proven statically.

## 10. Required release gate

1. Parse `everywhere_all.json`, `global.json`, and every shipped companion/custom-loader JSON such as `train.json`.
2. Run `node tools/validate-mission.js`; companion loaders must have explicit contract assertions and cannot be silently skipped.
3. Run `git diff --check` and inspect the staged file list.
4. Record static checks separately from runtime checks; static checks cannot prove HPG/MSFS behavior.
5. Execute the feature-specific in-simulator test matrix, including a reload when persistent state is involved.
6. Update mission build number, technical changelog, and handoff. The validator must compare the displayed mission title with the current changelog heading. Commit and push only after the above is complete.

## Known regressions this checklist prevents

- Missing HPG operators in `if`/logical groups, including the CARLS DF failures of releases 85, 88, 89, and 90.
- Undefined renderer labels caused by LVAR/local lifetime mismatch.
- DF entering ESC without an EDT row because the cursor/digits were task-local, and timeout never firing because its monitor read obsolete LVAR state.
- Soft-key labels rendered from unsupported dynamic objects.
- DF frequency-grid errors, invalid band acceptance, and incorrect forced AM/FM behavior.
- Checklist wrapping caused by non-monospace or overlong rows.
- Medical-page visibility, active-patient ownership, 5G/Wi-Fi exclusivity, preset persistence, ambulance-watchdog, and door/crew sequencing regressions.
- Ambulance transport blocked by HEMS-only crew/stretcher waits after `whobringpatient=ambulance`.
- Debug pages that silently reference obsolete state names and therefore hide the real failure during field testing.
