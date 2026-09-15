# Mission release safety checklist

This is a blocking checklist. Read it before changing `everywhere_all.json`, run the automated gate after every change, then complete the relevant in-simulator checks before a validated mission release. An explicitly requested development-code checkpoint may be synchronized while simulator testing is pending; it must carry that status and must not create a package, release tag, or runtime sign-off.

## 0. Release identity — blocking before every local build and package

- The release number in the first `CHANGELOG.en.md` heading and the static `everywhere_all.json.title` displayed in the tablet must be identical.
- Treat the number as a delivery candidate until the complete checklist and simulator checks are finished. Do not present intermediate local checkpoints as separate user-facing releases; advance the public delivery revision once, at the end of the completed checks.
- Before every local build, prepare a one-use `node tools/release-workflow.js draft` intent with declared scope. Corrections preserve the last supplied version. Use `begin --release "0.997 N"` only immediately before an explicitly requested higher delivery; never reuse a supplied number.
- Run `node tools/release-workflow.js static` only after the build. Drafts verify the canonical artifact without creating mission copies. Only a requested delivery creates `outputs/<release>-local-test/everywhere_all.json`. `package` requires the static gate and actual named simulator runtime sign-off; a static pass is never runtime evidence.
- The validator must fail on a stale displayed build or a missing/mismatched runtime `L:RELEASE_BUILD`, even when every JSON and HPG syntax check passes.
- Inspect the actual staged title before commit; never infer the displayed release from the changelog or commit message.

## 1. HPG condition syntax — highest-risk rule

- Every executable `if`, `wait_for`, and `while` has exactly one sibling comparison operator: `eq`, `ne`, `gt`, `gte`, `lt`, or `lte`.
- A direct executable operand is a `var`, `local`, `global`, `param`, or a root logical expression. It is never a direct `require` object.
- Every `and` or `or` **nested inside another logical condition** has its own comparison operator, normally `eq: 1`. Example: `{ "or": [ ... ], "eq": 1 }`.
- Exception: a logical expression used as the *value* of a `require` is already compared by that outer `require`; do not add a second operator inside it. The ambulance/police/fire arrival checks use this valid form.
- Do not build boolean groups manually without running `node tools/validate-mission.js` afterwards.
- Treat command names as an exact API contract. Reject unknown or near-match spellings, including non-ASCII variants such as the release-92 `create_lùocation` defect; a parsed JSON key is not proof that HPG recognizes it.
- A page macro may execute state initialization before rendering, but every `image`, `title`, `link`, `text`, `buttonbar`, `describe_icon`, `slider`, and `input` row belongs inside `set_dispatch`. A renderer row at macro command level is executed as an HPG command and causes `NotFound`. The release validator checks every macro, not only known pages.

## 2. State and persistence

- Any value displayed after a mission reload must have an explicit fallback. Local variables are not persistence.
- A persistent user choice must use a named `global` and have a first-run default in the mission through `set: global` guarded by a null check.
- Every new option added to Settings or the technical page is persistent by default: it must use a named `global`, have a guarded first-run default in the mission, and prefix its user-facing description with `(P)`. Never add or modify a repository-side global-state file.
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
- The DF renderer policy is to materialize exactly three visible items in each refresh branch: title, frequency plus modulation, and edit or status; row-level `show_condition` is documented HPG syntax but is not used for this page. Run `node tools/validate-df-regression.js` after changes.
- Keep every CARLS DF value that must survive a keypad event, renderer pass, or timeout thread in reset-on-open shared `global` state. Use `local` only for scratch values consumed in the same task, pass the pressed key as a same-task `param`, and never route editor state through LVARs.
- Preserve direct `if` + comparator checks on the linear DF input path. Do not replace them with one-item `and/require` wrappers; the release test must prove that the first key is captured and renders `EDT: 1_#.###`.
- Treat open, numeric handlers, renderer, ESC/ENT and timeout monitor as different tasks. The blocking test sequence is: open -> press 1 once -> show `EDT: 1_#.###` and ESC -> wait five seconds -> cancel incomplete edit, restore idle frequency/modulation and hide ESC.
- A blank SK is also a state: its event handler must be harmless.
- Text that has a known display limit is measured before release. Never rely on wrapping for units, status labels, or checklist answer fields.
- New or changed user-facing mission strings must be ASCII-only. Unicode typography and symbols require an explicit user request and HPG/runtime confirmation.
- Every set_df must use the current CARLS frequency. Automatic flows synchronize CARLS before setting a reference; manual flows create a reference only when the selected radio channel is linked, otherwise they clear it.

## 5. Validation and user input

- Validate incrementally where the UI asks for digit-by-digit entry. Reject an illegal digit without advancing the cursor.
- Re-check all boundaries, gaps, and grids after changing validation: lower bound, upper bound, first valid value after each gap, last valid value before each gap, and prohibited spacing values.
- Keep the previous accepted state intact on cancel, timeout, or invalid input.

## 6. Scope and regressions

- Inspect the existing working macro/page before replacing it. Preserve unrelated controls, handlers, and feature gates.
- Check every call site when changing shared state, object names, doors, crew counts, route ETA, or patient transport variables.
- Do not change files outside the requested scope. Preserve existing user changes.
- `CHANGELOG_USER.en.md` changes only on an explicit request. Update `CHANGELOG.en.md` for a release and keep affected manual scenarios current in `docs/testing/RUNTIME_VALIDATION.md`.
- Settings section ownership is explicit: medical controls belong only to MEDICAL OPTIONS, never SCENE/VEHICLES or GROUND/HOIST. FLIGHT ASSISTS and MEDICAL OPTIONS both initialize collapsed on every Settings open. Green is reserved for section headings, not individual medical labels. Pilot boarding belongs inside GROUND/HOIST and must not render as an orphaned MOST USED control. Adjacent collapsed sections retain a bar separator.

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
- A partial category requires a second press on the same category to enable all. A fully disabled category enables all immediately; a fully enabled category disables all immediately. Neither complete state may show the partial-category message. Any individual change clears pending confirmation.
- No Save button: persistence is automatic on switch/exit. Test two edited presets, both pages, mission reload, single toggles, partial groups, full groups, and ALL MISSIONS.

### 8.1 Aircraft Settings Profiles

- Each change to a custom aircraft-settings profile is saved immediately to its selected slot. A setting changed from a factory profile creates or updates CUSTOM DEFAULT; it must never remain an unsaved transient state.
- STORE PRESET ON FILE writes one independent full-profile backup. COPY SAVED PRESET TO ACTUAL SET is available only on a custom slot and overwrites that slot from the backup.
- A selected MSN LIST button is a toggle: pressing it again removes that one link. Profile links must apply after an interactive mission-list change, a current-list reload, and the startup livery preset selection.

## 9. Crew LifeScore and emergency termination

- Every LifeScore impact names exactly one member. Environmental loss uses the ground object-to-hazard distance; never substitute aircraft-to-hazard distance and never reduce all configured crew members together.
- Test the exact boundary: 11 -> 10 must produce `CREW_CRITICAL`; any value reduced to zero must produce `CREW_FATAL`. Both fail the mission, terminate the shift, and suppress successful-completion UI.
- The first injury/exposure and each deterioration threshold must reach all three channels: tablet message, Dispatch message array, and RescueTrack. Threshold flags prevent repeated messages every monitor cycle.
- A deceased visible operator is replaced in place with the packaged casualty asset using the same object name. Survivor boarding must skip only that replacement, not every other ground operator.
- Living scene operators must board through the seat/door/payload mapping for 3-, 4-, and 5-person crews. At hospital they must deboard and follow the hospital-door/building path; test cable-only and ground-object hoist cases separately.
- Keep a bounded hospital-query fallback to the existing return-to-base flow. An absent query result must never leave the failed mission waiting forever.
- In every historical fatal branch, invoke the fatal handler before clearing `HOIST_OUT`. The handler itself must be one-shot and must not depend on the old hoist flag still being set.
- Update the Debug page with emergency member, score, cause, source object, fatal/critical state, boarding, route fallback, and packaged-object result.
- Run both `node tools/validate-mission.js` and `node tools/test-crew-emergency.js`; then execute the crew-emergency matrix in `docs/testing/RUNTIME_VALIDATION.md` because object choreography, route queries, and simulator assets cannot be proven statically.

## 10. Required release gate

1. Parse `everywhere_all.json` and every shipped companion/custom-loader JSON such as `train.json`. The HPG global-state container is local runtime state and is intentionally absent from the repository.
   - Parsing is insufficient: verify the required root shape (`macros`, `aircraft`, `applicable`, `api_version`, `data`, `threads`, `locations`, `objects`, `userActions`, `objectives`, `briefing`, `icons`) and confirm `Debug_Table` remains under root `data`, never inside `macros`.
2. Run `node tools/validate-mission.js`; companion loaders must have explicit contract assertions and cannot be silently skipped.
3. Run `git diff --check` and inspect the staged file list.
4. Record static checks separately from runtime checks; static checks cannot prove HPG/MSFS behavior.
5. Execute the feature-specific in-simulator test matrix, including a reload when persistent state is involved.
6. Update mission build number, technical changelog, and affected runtime scenarios. The validator must compare the displayed mission title with the current changelog heading. Publish a validated release only after the above is complete. For an explicitly requested development checkpoint, pass every static gate, record the still-pending runtime scenarios, commit/push only CICERS, and use a normal checked PR to update main. Never bypass hooks or branch rules; packaging still requires actual runtime sign-off.

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
