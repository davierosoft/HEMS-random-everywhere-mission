## Development checkpoint - P1-P3 crew and transport integration (runtime PENDING)

- Connect independent crew visits and completed-treatment barriers to exclusive ambulance/HEMS tickets, stable selection, shared loading and verified recovery.
- Preserve shelter, independent physiology, CPR ownership, stable repeated rescue and versioned saves; test all nine patient/resource combinations.
- Add the requested debug handoff in `docs/architecture/DEBUG_HANDOFF_2026-09-12.md`. No numbered delivery or simulator sign-off accompanies this checkpoint.

## Release 0.997 159

- Use wait_for acceleration bands for crew lifescore monitoring
- Use wait_for acceleration bands for crew lifescore monitoring
- Complete fixed-scene runtime diagnostics for both ambulances HEMS loading Astra and crew monitoring

## Release 0.997 158

- Add symmetric ambulance and HEMS trace states; preserve fixed scene
- Instrument ambulance1 ambulance2 and HEMS patient loading for fixed-scene runtime validation

## Release 0.997 157

- Local update: per-vehicle ambulance assessment and patient transport ownership

## Release 0.997 156

- Internal verification scope: ambulance two reassessment entry points
- Internal verification scope: patient transport decision integration
- Show country names instead of numeric country codes in user-facing mission messages

## Release 0.997 155

- Repair default landing spot circle and icon after injured relocation; deliver local test copy

## Release 0.997 154

- Verify and repair default landing spot after savetemp
- Include landing spot creation and manual edit ownership
- Keep objective save integration and debug snapshot in final draft
- Include debug and objective save integration in query safety draft
- Include savetemp guard ownership in query safety draft
- Include async savetemp caller and runtime wrapper in draft scope
- Run savetemp asynchronously and record runtime save markers in debug
- Normalize HOIST_SAFETY_MONITOR to yes/no and correct crew acceleration member mapping
- Include rescue-location wording correction in the same unreleased draft
- Declare dispatch target local selection in existing startup flow
- Declare existing nation local fix and dispatch message update
- Local test release: HVAR contract and 45 percent caller-reported health symptom coverage

## Release 0.997 153

- Include previously implemented crew hoist and acceleration runtime scope with health symptom data
- Include prior clinical handover scope in current verification
- Finalize clinical handover flags and synchronize the current HVAR call-site contract
- Exclude patient 1 when ground ambulance transport is already ready
- Add selector module metadata and validate all HEMS variants
- Include dependent existing mission macro changes in verification scope
- Include dependent mission macros for third-point verification
- Complete route location separation, civilian safety, clinical overrides, crew acceleration monitoring, and requested UI corrections

## Release 0.997 152

- Align profile names and tracker text with CUS.PROFILE labels
- Add crew spawn diagnostics and onboard acceleration impact handling

## Release 0.997 151

- Include settings page button placement
- Declare integrated UI and civilian safety changes already present in generated build
- Finalize acceleration monitor condition schema

## Release 0.997 150

- Correct acceleration monitor condition schema

## Release 0.997 149

- Add aircraft acceleration and deceleration LifeScore impacts

## Release 0.997 148

- Include all renamed profile-entry pages and settings validator contract
- ASCII UI labels, civilian spawn guards, and settings layout corrections

## Release 0.997 147

- Keep completed patient reports available during other active visits
- Declare related crew and stretcher recovery changes
- Restore mandatory stretcher transfer and freeze patient one ground handover
- Fix residential rescue placement, ambulance recovery, and OSM provider selection

## Release 0.997 146

- Keep the multipatient registry harness aware of the patient consciousness dependency.
- Register the new clinical and handover macros in the workspace manifest and source inventory.
- Declare the full clinical save display and HPG command scope before static verification.
- Initialize and preserve the clinical identity, assessment, vital signs, and final ground handover for every patient.
- Route residential ambulances and their equipment to a clear rescue staging point, with independent secondary transport and rear loading.
- Restore HPG stretcher and affected crew commands as triggers, with PAX 4 boarding before the patient command.
- Render save dates as text and hide empty-slot timestamp separators.

## Release 0.997 145

- Recover every road-response watchdog at a verified approach location for scene, hospital, and midway destinations.

## Release 0.997 144

- Use route ETA plus safety margin for mobile-object watchdogs and prevent invalid route fallbacks.

## Release 0.997 143

- Add configurable ground operations NR threshold and 30-second safety bypasses.

## GitHub development checkpoint after 0.997 142 - runtime validation pending

- Consolidate P1-P3 ambulance assessment so one medic reaches every available casualty, and ensure a secondary ambulance medic is physically created and moved before P2/P3 assessment.
- Restore packed ambulance-stretcher transfer for P2/P3 and retain the final clinical record after ground transport.
- Let HEMS focus the patient it starts visiting while `Patient 1/2/3` selectors remain manual choices instead of being overwritten by the first active visit.
- Convert the residential three-casualty fire to the standard `random VFX` fire at the authored FIRE point. Intensity 8 retains the existing two-firetruck response and VAR 1 extinguishing sequence.
- Add structural and runtime-validation coverage for the consolidated medical, fire, and record-selection behavior. This checkpoint does not create a new downloadable mission build.

## Release 0.997 142

- Use the documented Crew VAR 1 pilot states while preserving generic marshal wind alignment until 150m.

## Release 0.997 139

- Harden ambulance report rendering against missing provider names.

## Release 0.997 138

- Fix patient selector, ambulance stretcher loading, and residential fire rescue-point routes.

## Release 0.997 137

- Place working proceed buttons on the current checklist pages and expose take-off checklist from checklist home.

## Release 0.997 136

- Use simulator-provided radians slope variables, FLI LVAR, and torque-based AEO validation in take-off checklist.

## Release 0.997 135

- Align checklist completion markers and add automatic avionic to before take-off and before take-off to take-off transitions with timed/button advance.
- Add the take-off checklist with automatic checks, conditional slope guidance above the normal rows, and return to dispatch after ten seconds.
- Add regression coverage for checklist transitions, slope ordering, marker alignment, and dispatch return.

## Release 0.997 130

- Guard OSM railway scene bearings when node arrays are empty; fix local save time query compatibility.

## Release 0.997 128

- Fix local save time formatting for HPG by using the supported locale-only toLocaleTimeString query; add regression coverage against unsupported option objects.

## Release 0.997 127

- Keep medical detail feeds open while any manual visit still owns the active-patient mutex, including final review and transport confirmation. Completes the local tablet-telemetry guard from build 126; full five-patient transport remains pending.
- Development checkpoint documentation and CI: distinguish code synchronization from runtime-validated releases, trim completed registry work from the integration backlog, add pinned read-only Windows/Linux checks, and exclude generated local outputs. No mission bytes or build identity changed by this workflow update; simulator sign-off remains pending.

## Release 0.997 126

- Close ground-patient tablet detail updates only after every visit and confirmed ground handover; preserve closing reports in Debug snapshots. Active adapter remains P1-P3; full five-patient scene and transport conversion is pending.

## Release 0.997 125

- Allocate fresh mutable arrays in the inactive patient registry and replace the ambiguous SDK check with five repeatable probes recording before/after values in Debug snapshots. Reproduce the old first-pass/later-fail pattern under retained-literal semantics; simulator confirmation remains required.

## Release 0.997 124

- Fix registry Debug rendering outside macro call context, autosave SDK check results, and save the main snapshot before the failure-isolated registry extension. Continue inactive waypoint and physiology adapters with regression tests; five-patient scenes remain unactivated.

## Release 0.997 123

- Add an inactive five-slot registry foundation with single-writer reservations, CPR leases, production-command regression tests, and non-destructive Debug diagnostics. Scene and transport conversion is not yet activated.

## Release 0.997 122

- Correct workspace macro count after watchdog registration.

## Release 0.997 121

- Add crew creation and NR gate watchdog diagnostics.

## Release 0.997 120

- Make three-crew ground deployment deterministic and verify cargo doors.

## Release 0.997 119

- Verify cargo door closure before releasing boarding hold for scene crew deployment.

## Release 0.997 118

- Verify both cargo doors close during base boarding with bounded retries.

## Release 0.997 117

- Fix local save timestamps, verified aircraft-profile reloads, clinician action start, and second police officer return.

## Release 0.997 116

- Fix saved aircraft profile copy with static slot dispatch

## Release 0.997 115

- Declare the retired PLB personal macro name as part of the ELT dynamic-target rename.
- Fix the dynamic ELT PLB target and validate every ELT mode against its macro.
- Prioritize operational Debug Summary data, normalize its colors, fix snapshot date and timer display, and clarify Test Tracker states and controls.

## Release 0.997 114

- Mark the persistent CICERS auto-activation bypass setting with the standard P label.

## Release 0.997 113

- Add an opt-out for automatic CICERS OSM activation while preserving the saved OSM service.

## Release 0.997 112

- Add visible ChatGPT build identity to Debug and its persistent snapshot.

## Release 0.997 111

- CICERS failure now restores the live DATAQUERYSERVICE manual provider (0/1/2), even when the persisted endpoint still says CICERS. CICERS, AUTO-TOGGLE, missing, and invalid prior modes fall back to AUTO-TOGGLE.
- CICERS PING now initializes and serializes pingstart, so a second request cannot overwrite the provider snapshot used by the first request.
- Added a regression gate for the stale-endpoint/manual-provider mismatch and overlapping CICERS pings.

## Release 0.997 110

- Test Tracker labels now use plain-language descriptions. Orange smoke remains in progress until AUTO, ALWAYS, REALISTIC, and DISABLED have each been tried; hospital selection remains in progress until the 3-, 4-, and 5-crew flows have each been tried.
- Debug Summary now always shows the mission ID, key mission variables, crew/transport state, emergency vehicles, phase, and load. Snapshots store local date and clock time separately from the mission timer.
- Creating a technical marshal on a custom location now opens the map centred on the helicopter's current location.

## Release 0.997 109

- Fixed Default RTC scene setup: the public-title selector now initializes its runtime array and lock on every invocation, releases the lock, and completes tracking before returning. Variant 3 no longer stalls after 80% loading.
- Added a runtime-state initialization gate for the new PLB/DF, Test Tracker, ambulance handover, public-title selector, and profile-store states.

## Release 0.997 108

- Expanded the persistent Debug snapshot into ordered COMMON, SUMMARY, MISSION, MEDICAL, GROUND, GUIDANCE, and INVENTORY sections.
- Each captured section now preserves every Debug-page local, global, L: variable, table field, object value, and display condition needed to diagnose a blocked mission.

## Release 0.997 107

- Reordered the Debug Test Tracker into mission sequence: setup, mission start, dispatch, scene, recovery, destination, and mission end.
- Rewrote every tracker label as a short, plain-language test instruction, retaining crew and patient conditions where required.

## Release 0.997 106

- Ambulance assessment now starts immediately after the synchronous arrival drive of its medic at the patient. The handover waits for that assessment to complete instead of relying on a distance gate.
- After an ambulance stretcher leaves, hoist_crew now walks from the rear cabin return point before the cargo doors close in 3-, 4-, and 5-crew operations.
- Every Debug Test Tracker entry now has a **RESET** control. It restores the entry to not-tested status and clears any saved failed-test comment.

## Release 0.997 105

- The persisted Direction Finder frequency is now reapplied after late profile/startup initialization, before the DF page is opened.
- Debug Center reports the active DF source and frequency instead of an undefined saved-station value.

## Release 0.997 104

- Destination confirmation now opens immediately after the transport owner is selected for 3-, 4-, and 5-crew ground operations, before physical patient loading. It no longer relies on MISSION_PHASE 8.
- Confirming a preselected hospital now immediately sets FPL 8 and routes to hospital_user before boarding; the scene FPL cannot remain active after acceptance.
- Ambulance assessment now waits for the physical ambulance medic to reach each patient. The clinical page shows INITIAL ASSESSMENT IN PROGRESS and keeps vital signs hidden until the assessment timer completes.

## Release 0.997 103

- Fixed CARLS DF bootstrap: objective1 now sends the saved channel through a frequency-only set_df command. The receiver no longer starts at the 255.000 default before the DF page is opened.

## Release 0.997 102

- Reworked Aircraft Settings Profiles so edits save immediately to the selected custom set. **STORE PRESET ON FILE** now keeps one independent full-profile backup, and **COPY SAVED PRESET TO ACTUAL SET** restores that backup only into an active custom set.
- Simplified aircraft-to-mission links to **MSN LIST DFLT/1-5**. Pressing an already selected link removes it; linked profiles now apply after interactive list changes, current-list reloads, and startup livery preset selection.
- Added a blank separator between each Debug Test Tracker item, preserving the single current-state rendering introduced in build 101.

## Release 0.997 101

- Fixed the Debug Test Tracker renderer to show **only the current state** for each test. State values are read from the persistent Debug table into stable locals before rendering, preventing overlapping pending, in-progress, completed, successful, and failed rows.
- The category filter controls were removed from this diagnostic page so the full test list remains predictable and each completed row exposes one result action pair.
- Added a static gate that rejects direct Debug-table conditions inside the Test Tracker renderer; renderer rows must use the preloaded per-test local state.

## Release 0.997 100

- Added a Debug Center **TEST TRACKER** covering 36 user-testable functions changed since the July 0.997 baseline: ground response, medical, hoist/crew, guidance/DF, systems, and settings.
- Each instrumented sequence writes its first execution and completion state to the persistent Debug table. Pending/completed entries are white; first execution is yellow **IN PROGRESS**; completed tests can be marked **SUCCESSFUL** or **FAILED**.
- Failed results require a tester comment, which is saved with the result and remains available after reopening Debug or reloading the mission. The tracker records code-path execution; the tester still evaluates the simulator outcome and scenario conditions.

## Release 0.997 99

- Added personal locator beacon (PLB) simulation for outdoor SAR, paragliding, skiing, hunting, and fishing incidents. PLB transmissions use 121.500 AM and follow the main casualty.
- Emergency ELT, PLB, and doctor-pick ambulance beacons now transmit continuously. Their effective reception range is recalculated every 5 to 10 seconds within plus or minus 25 percent; out-of-range receivers are cleared with a frequency-only set_df update.
- Added the live emergency DF reference and reception range to the Debug Center summary.

## Release 0.997 98

- Restored the persisted CARLS DF channel during mission bootstrap. Startup now sets the DF receiver to that channel before the DF page is opened, with MAN 118.000 AM only as the first-run or invalid-state fallback.
- Object-station rows now show the name followed by a colon and their frequency. The DF gate explicitly verifies that every ON/OFF selection is saved to and restored from the DF station table.

## Release 0.997 97

- Simplified the DF station form to NAME, FREQUENCY MHz, and LAT/LON text boxes. The redundant SET action is removed: SAVE validates all fields and persists only a complete valid station.
- Randomized the reserved UHF channels for the built-in object stations while preserving unique 25 kHz DF channels.
- Every DF station SET DF action now synchronizes the CARLS channel and the set_df frequency. Automatic links set the matching channel first; a manual unlinked channel clears the old reference instead of retaining a mismatched bearing.
- Added an ASCII-only rule for changed mission UI strings and extended the DF station validation gate and runtime procedure for progressive slots and CARLS/bearing synchronization.

## Release 0.997 96

- Added **ADD DF STATIONS TO DB** below the custom-hospital database link. It stores up to 15 named stations with a frequency, AM/FM selection where the band permits it, and a `latitude,longitude` target. SET validates the draft; SAVE persists it; SET DF tunes it and applies its bearing; DELETE clears it.
- Custom stations accept only the DF bands and 25 kHz channels: NAV 108.000–117.975 AM, ATC 118.000–136.975 AM, maritime 156.000–162.000 FM, and UHF 225.000–399.975 AM/FM. Gaps, off-grid values, mission channels, object channels, duplicate custom channels, invalid names, and invalid coordinates are rejected.
- Added independently enabled DF object stations for two ambulances, police, fire engines/crew, casualties, crashed car, PAX3 crew member, hoist crew, and doctors. Their unique UHF frequencies are shown next to their names and are reserved from custom entries.
- DF station data is stored in the mission table `Andrews_df_stations`; no `global.json` defaults or sidecar file are required. Added Debug Center state and a dedicated static gate plus runtime matrix for station persistence and bearing behavior.
## Release 0.997 95

- DF: ESC-only automatic confirmation, 1.5-second invalid-entry recovery, and UHF-only modulation toggle.

## 0.997 94 — CARLS DF complete refresh and regression protection

- Reworked the CARLS Direction Finder renderer so every idle, editing, invalid, valid, UHF, modulation and ENT/ESC state emits a complete four-row `set_carls_radio` payload. The first digit now renders immediately as `EDT: 1_#.###`, without row-level visibility conditions or stale soft keys.
- Corrected the renderer’s global-frequency query to use valid HPG `global` syntax, keeping editor state in shared globals and preserving the existing five-second timeout/cancel flow.
- Added an HPG renderer reference and a dedicated DF regression gate; static checks remain complementary to the required MSFS runtime matrix.
## 0.997 93 — smoke modes, crew safety, and endpoint persistence

- Replaced the binary orange-marker preference with **NEVER**, **AUTO**, **REALISTIC**, and **ALWAYS**. AUTO preserves the former non-SAR fallback behaviour; REALISTIC waits for the 2 NM approach, requires an eligible road/outdoor/alpine/paraglider scene and at least one responding ground service, suppresses duplicate scene VFX, and expires after five minutes.
- Reworked shift-persistent crew LifeScore so smoke/fire exposure is calculated from each actual ground operator to the hazard and hoist speed/acceleration/impact penalties affect only the exposed hoist operator. Pilots and unrelated crew are no longer penalized by a scene object they are not near.
- Added staged crew-safety warnings to the tablet, Dispatch message area, and RescueTrack. The first injury/exposure and subsequent deterioration are reported once per threshold instead of silently reducing the score.
- A crew LifeScore of **10 or less** now cancels and fails the mission immediately. Surviving scene personnel use the normal passenger-door boarding choreography, the route changes to the nearest hospital, and after landing they deboard and enter the hospital building; an unavailable hospital query falls back to an immediate base return.
- A LifeScore of zero records a crew fatality, replaces the affected ground object in the same position and under the same object name with the packaged stretcher casualty asset, terminates the shift, and suppresses the successful-completion banner. The three legacy hoist-fatal branches now invoke failure before clearing `HOIST_OUT`, fixing the path that previously skipped the fatal handler.
- Restored independent DATAQUERYSERVICE persistence: endpoint selection is no longer stored or overwritten by aircraft profiles. The mandatory CICERS health check now promotes CICERS when its key is valid; when unavailable or expired it restores the prior selection, and only an invalid prior CICERS selection falls back to AUTO-TOGGLE.
- Fixed the CARLS DF cross-task regression that showed ESC without an EDT row and never timed out. Page open, keypad handlers, renderer, validation, ENT/ESC, presets, ELT/ambulance automatic tuning and the page monitor now share reset-on-open globals; the pressed number remains a same-event `param`, and no editor state uses LVARs. One press now produces `EDT: 1_#.###`; incomplete input cancels after five seconds and a complete valid input confirms.
- Corrected mission-preset category toggles to distinguish all three states. A fully disabled category now enables all missions immediately, a fully enabled category disables them immediately, and the same-button confirmation is shown only for a partially enabled category.
- Flight Assist now starts collapsed whenever Settings is opened. Medical options are consolidated in their own collapsible section, also closed on page open, instead of being mixed into Scene/Vehicles and Ground/Hoist. The treatment-mode label uses normal option styling rather than green section-heading styling. The formerly orphaned pilot-boarding selector now belongs to Ground/Hoist Options. A fixed separator now closes Most Used Settings before Flight Assist.
- Fixed the inert Aircraft Settings Profiles link: its destination now renders through `set_dispatch` instead of executing UI rows as commands and raising HPG `NotFound`. Page state and custom-table name are initialized before rendering, CUSTOM-only mission-link controls are guarded, and save/reload/link table parity is enforced by the release validator. The gate now rejects renderer rows outside `set_dispatch` in every primary and companion macro and verifies the complete mission root hierarchy, including persistent tables under root `data`.
- Corrected the tablet mission title from the stale hardcoded build 92 to release 93. The blocking validator now derives the current release from the first changelog heading and fails if the displayed title differs.
- Added compact debug telemetry for crew LifeScore/hoist fatality plus smoke mode and active/persisted endpoint state.

## Release 0.997 92

- Rebuilt the Debug page as a six-view **Debug Center**: SUMMARY, MISSION, MEDICAL, GROUND, GUIDANCE, and INVENTORY. Operational state and active faults use stronger colors; secondary data remains gray, and subsystem blocks are hidden when they are not relevant to the current mission.
- Added the persistent HPG table `Andrews_debug_snapshots`. **CAPTURE SNAPSHOT** stores mission identity, phase/load/FPL, route/query faults, transport/transfer state, active/display patient and preset, then calls `save_table`; **CLEAR SNAPSHOT** invalidates and saves the same record. Opening Debug reloads the saved snapshot with `open_table`.
- Fixed a dormant malformed HPG command in the random-fishing scene: `create_lùocation` is now `create_location`. The validator now rejects any near-match `create_l*ocation` spelling other than the exact documented command, preventing the same non-ASCII/typing regression from returning.
- Extended `tools/validate-mission.js` to parse and validate the companion `train.json` loader as well as the primary mission and globals. It now includes 11 custom-loader contract checks, 5 companion executable-condition checks and 4 companion renderer-condition checks.
- Added `docs/HEMS_RE_Technical_Documentation_and_Code_Review_0.997_92.docx`: an 18-page technical baseline covering architecture, recovered history, release evidence, prioritized findings, runtime matrix, simulation improvements and a dedicated `train.json` review. `train.json` was analyzed but intentionally not changed because a version-2 loader contract requires a separate compatibility review.
- Release 92 static gate: PASS — 586 macro arrays, 6,849 primary executable conditions, 6,779 `require` leaves, 2,201 primary renderer conditions, 2,063 resolved static and 3 guarded dynamic macro calls, 266 icon/image references, 45 CARLS layouts, 33 fixed-width BEFORE TAKE-OFF rows, 251 release assertions and 11 companion assertions. This is not an MSFS/HPG runtime test.
- Prepared a separate review workbook covering all 69 user-facing Settings options and proposed DEFAULT, ROOKIE PILOT, EXPERT PILOT and EXPERT HEMS profiles plus a validated blank CUSTOM column. No runtime profile-selection logic was added.

## Release 0.997 91

- Made ambulance patient transport independent from helicopter/HEMS recovery as soon as `whobringpatient=ambulance`. The release-88 far-stretcher path still waited for `crewdoconboard` and `stretcheronambulance`; those waits are now restricted to `ambudoc` and `us` respectively. Near and far ambulance routes resolve their hospital automatically before departure.
- Added an explicit ambulance transfer state machine (loading, secured, returning, at ambulance, departing, hospital arrived) and exposed it on the debug page.
- Extended manual clinical handling to every present patient (currently P1-P3) through one modular active-patient queue and one dynamic Medical page. AUTO follows the patient being visited; MANUAL lets the operator select a record, while treatment/complete/transport actions remain enabled only for the active patient. Death/completion releases the queue.
- Added P2/P3 pathology-driven vital-sign updates, treatment effects, frozen ambulance reports, and canonical `manual_pN_*` state names.
- Reworked early ambulance care into two phases: all available patients receive initial assessment first, then realistic treatment continues only for patients suitable for ground care. The second ambulance loads only a `ground_transport_ready` patient, records/removes that casualty, and all HEMS ground/hoist variants skip patients already transported.
- Rebuilt mission-preset editing around deferred dirty-table persistence. Individual/group changes stay in memory; dirty presets flush on preset switch or page exit. Category selection is derived from the current table, partial groups require a same-button confirmation to enable all, and no Save button is added.
- Expanded `tools/validate-mission.js` with release-specific anti-regression checks for ambulance/HEMS independence, multipatient state naming and action ownership, debug coverage, secondary ambulance clearance, HEMS skip guards, and preset persistence architecture. The whole-script gate also checks every `require`, every logical group, all macro arrays, dynamic macro prefixes, and every icon/image reference.
- Release 91 static audit result: PASS — 586 macro arrays, 6,842 executable conditions, 6,298 `require` leaves, 1,825 renderer conditions, 2,055 static and 3 dynamic macro calls, 263 icon/image references, 45 CARLS layouts, 33 fixed-width BEFORE TAKE-OFF rows, and 216 feature-specific regression assertions.
- Updated the release checklist so every changed state machine must update the debug page in the same commit and so ambulance, multipatient, and preset test matrices are blocking release work.

## Release 0.997 90

- Repaired the HPG runtime error that still affected CARLS DF digit validation after release 89. The generated DF `and/or` subgroups had a comparison only on the outer command; HPG also requires a comparator on each nested logical subgroup used directly as a condition. All 48 affected nested DF groups now carry their required `eq: 1`.
- Added `DEVELOPMENT_RELEASE_CHECKLIST.md`, a blocking release checklist derived from the actual regressions encountered during this development cycle: HPG condition syntax, reload/persistence fallbacks, CARLS rendering, progressive input, layout, scope discipline, documentation, and runtime verification.
- Added `tools/validate-mission.js`. It parses the mission and global defaults, checks executable and renderer condition operators, resolves static macro calls, rejects dynamic CARLS soft-key labels, specifically fails a nested `and/or` condition without its own operator while allowing the established valid `require: { or: [...] }` form, and verifies all 33 BEFORE TAKE-OFF row states remain monospace and exactly 49 characters wide.
- Release gate is now explicit: read the checklist, run the validator, run `git diff --check`, inspect the staged file set, and keep HPG/MSFS runtime testing separate from static validation.

## Release 0.997 89

- Fixed the CARLS DF startup-state regression behind the displayed **undefined 0.000** value. A surviving DF LVAR could previously outlive its local source label after a mission reload. The DF page now normalizes every display value and always has a safe MAN/AM fallback.
- Added persistent global DF state: `CARLS_DF_FREQUENCY`, `CARLS_DF_SOURCE`, and `CARLS_DF_MODULATION`. The latest selected/automatic channel is restored when the page is reopened. A first run with no stored value initializes **MAN 108.000 MHz / AM**.
- Rebuilt the display rows so the active channel remains on one line as `SOURCE DDD.DDD MHz`; the current AM/FM modulation is on the line below it. The renderer never formats the untrusted raw source variable.
- Entry is now progressively constrained instead of accepting an invalid six-digit value and failing only at the end. Invalid prefix digits are rejected in place, show **ILLEGAL**, and leave the cursor at the same editable position. This blocks values such as 101.xxx as soon as the third digit is entered and rejects an invalid final channel-grid digit such as 112.127.
- Corrected 25 kHz channel spacing: valid endings are `00`, `25`, `50`, or `75`; obsolete `.005` and `.055` acceptance was removed. Valid bands remain NAV 108.000-117.975 AM, ATC 118.000-136.975 AM, maritime 156.000-162.000 FM, and UHF 225.000-400.000 AM/FM. The upper boundary 400.000 remains selectable.
- IAD 121.500 is forced AM, MAR 156.800 is forced FM, and MAD 243.000 opens in AM. The AM/FM soft key is shown only on a selectable UHF channel; fixed-band channels have no modulation soft key. R3 is blank outside edit mode, ESC only during an unfinished edit, and ENT only for a completed valid entry.
- Automatic ambulance/SAR/ELT tuning now also updates the persistent DF state, so reopening the page cannot restore an obsolete channel or label.
- Release audit: strict JSON parsing, 6,630 executable condition/operator checks, 1,869 renderer-condition inspections, 1,978 static macro-call resolutions, 45 CARLS layouts, all nine DF renderer modes, and simulated valid/invalid progressive-entry vectors completed without static errors.
## Release 0.997 88

- Corrected all eleven CARLS Direction Finder conditions that used `require` as the direct operand of an `if` command. HPG requires the direct `var` or `local` operand with its comparison operator as the command sibling; the malformed form caused the reported **Missing operator** runtime failure when DF opened or processed input.
- Rebuilt the BEFORE TAKE-OFF CHECKLIST display against the working After Engine Start layout. Every operational row is monospace and exactly 49 characters, so answer fields and `[ ]/[V]` markers remain on one line without wrapping.
- Expanded the release audit to the whole mission: all macro arrays, every `if`/`wait_for`/`while` operator, static and generated renderer conditions, static macro calls, interpolated macro prefixes, image/icon references, and all checklist rows are checked. The audit completed with no static errors.

## Release 0.997 87

- Restored the previously undefined **BEFORE TAKE-OFF CHECKLIST** as its own procedure; it is no longer a broken menu link or an alias to another checklist.
- Added a compact tablet-oriented checklist page with yellow active items, gray completed items, explicit completion marks, and 54-character fixed-width monospace rows so the tablet cannot reflow the checklist items.
- Actual simulator checks now gate ENG 1/2 MAIN guard latches, flight rotor RPM, hydraulic and MGB pressures, active caution/failure flags, and AP1/AP2/BKUP SAS. Fuel quantity, MFD page selection, IESI validation, and optional cabin controls retain a timed review window where the H145 package exposes no reliable state variable.
- The cold-weather fuel-low-temperature check appears only below 0 C OAT. The landing-light item appears only outside MSFS daytime (`E:TIME OF DAY != 1`), waits for the fixed landing light to be on, and retains a short adjustment window for the secondary light.
- Existing start, engine-start, hydraulic, after-engine-start, and avionics/preflight procedures remain unchanged.

## Release 0.997 86

- Fixed the Medical Diagnostic Page visibility contract: in AUTOMATIC mode it follows Quick links exactly; in MANUAL mode it remains available even with Quick links closed. ORGAN missions remain excluded.
- Root cause fixed: Quick links updated only `dtab0`, whereas the medical link read a separately cached visibility value that was never refreshed. Open/close actions now update both states, including the manual-mode exception.
- Regression gate: JSON parsing, static renderer-condition validation, DF entry points and settings, 5G/Wi-Fi exclusivity, asset references, and all 12 independent preset selectors were checked before release.

## DF access and renderer integrity - release 0.997 85

- Advanced the mission title to 0.997 85.
- Fixed eleven Direction Finder command conditions whose comparison operators were nested inside the operand instead of attached to the command. The DF soft key can now complete its initialization and open page 13.
- Rebuilt the DF renderer as an explicit, flat state table: UHF AM/FM, valid completed entry, incomplete entry, and non-UHF bands all render a defined soft-key layout. ENT is available only for a complete valid edit; all other states show ESC.
- Aligned the active hover ALT CALLOUTS with the 163 ft hoist ceiling: high at 163 ft, stable band 40-163 ft, and the wake-up threshold at 163 ft.
- Repaired three literal Dispatch/Settings show conditions missing their required comparison operator.
- Static validation contract: strict JSON parse, no malformed direct IF operators, no literal renderer condition without an operator, and page-13 soft-key routing all must pass before publication.

## Hoist altitude envelope, 5G Wi-Fi visibility, and preset refresh - release 0.997 84

- Advanced the mission title to 0.997 84.
- Raised every hoist-specific Radio Height gate from 130 ft to 163 ft: main hoisting, recovery hoisting, heli-rescuer pickup/drop, up/down operation, and the dispatch readiness/warning display. Hydraulic-pressure limits, scene bearings, and unrelated data values of 130 remain unchanged.
- Operational messages now instruct the pilot to remain between 40 and 160 ft, deliberately rounding the internal 163 ft safety boundary for clear cockpit guidance.
- Fixed the remaining Wi-Fi controls on the Mission Briefing page: both Wi-Fi connection rows are now hidden while Tablet 5G is enabled, matching the existing Mission Dispatch behavior.
- Fixed preset switching in both manual mission-list pages: selecting DEFAULT or PRST 1–5 now opens the selected table before rerendering, so enabled/disabled mission rows immediately reflect that preset while retaining its saved values.

## CARLS Direction Finder frequency discipline and ambulance record syntax - release 0.997 83

- Advanced the mission title to 0.997 83.
- Added the persistent **Avionics Options -> Direction Finder tuning mode** selector. **DF AUTO** is the default and automatically tunes CARLS to an active ambulance, SAR beacon, or crash ELT source; **MANUAL TUNING** leaves the displayed channel under pilot control and enables its bearing only after the matching CARLS frequency is selected.
- Flattened the newly added display conditions into renderer-safe single-level boolean groups. This corrects the supplied Medical Diagnostic Page Symbol.iterator failure while preserving its original manual-mode or Quick-links visibility rule.
- Reworked the CARLS Direction Finder page around a stable active-frequency row (MAN, IAD, MAD, or MAR plus DDD.DDD MHz) and a second, normally blank edit row. During entry that row alone renders EDT:, entered digits, the next-digit underscore, and the remaining # placeholders.
- ENT has moved to bottom R3. It is rendered only for a complete, valid six-digit entry; R3 is ESC while input is empty, partial, or invalid. The physical selector and # retain confirmation behavior; the five-second inactivity timer confirms a valid entry or silently cancels a partial one.
- Added band and channel validation: VOR/NAV 108.000-117.975 AM, ATC 118.000-136.975 AM, maritime 156.000-162.000 FM, and UHF 225.000-400.000 MHz. Every accepted channel uses 25 kHz spacing (.000, .025, .050, or .075); unsupported gaps, 400-426 MHz, and values such as 122.022 are rejected.
- Added DF soft-key presets: IAD 121.500 AM, MAD 243.000 AM, and MAR 156.800 FM. Presets tune immediately without entering edit mode. AM/FM selection is available only in the UHF band and always shows the opposite selectable mode on L2.
- Stopped the generic DF page from assigning the incident as a bearing source. It now assigns a bearing only when the active mission beacon is also active: the moving ambulance at 281.500, normal SAR beacon at 282.575, or crash ELT at 121.500 MHz. Other valid channels tune successfully but explicitly report that no mission beacon exists.
- Repaired the ambulance final-record worker condition that caused the Missing operator runtime failure shown by the user. The final eq: 1 is now attached to the enclosing if, rather than incorrectly nested inside its and expression.
- Static validation: strict JSON parsing succeeds; page-13 handlers route RTN, modulation, all three presets, bottom R3, selector, keypad digits, *, and #; the old generic set_df accident_location calls are absent.

## Preserve individual mission choices while switching presets - release 0.997 82

- Advanced the mission title to 0.997 82.
- Fixed preset switching in the mission-selection pages. Selecting DEFAULT or PRST 1 through PRST 5 now changes only the active table and its persisted selection; it no longer invokes the category-apply engine.
- Individual Enabled/Disabled choices remain direct table writes followed by save_table. Category controls and ALL MISSIONS continue to invoke the apply engine intentionally, so their documented bulk behavior is unchanged.
- Fixed the ambudoc hospital-transfer watchdog. The ambulance ETA now uses the exact `1.5` speed multiplier applied to its drive command; the watchdog adds one minute for each started fifteen-minute ETA block (with a 420-second minimum). A watchdog expiry leaves the ambulance in place and asks the user to use the explicit Skip ambulance travel action, rather than teleporting it to the hospital.
- Static validation: both selector bars contain six persistent selectors with zero calls to mission enable engine; all remaining category controls retain their apply calls.

## Tablet 5G homebar and final ground-transport clinical record - release 0.997 81

- Advanced the mission title to 0.997 81.
- Added `icons.homebar5g`: a 700 by 34 px version of the existing Davierosoft Operation Center homebar with a compact 5G indicator and three active RSSI bars. Every ordinary page and the two dynamic mission-list builders now select exactly one bar: the original `homebar` while Tablet 5G is NO, the new asset only while it is YES. Wi-Fi and CARLS retain the original homebar.
- The temporary green 5G CONNECTED dispatch status now opens when 5G is enabled, then is hidden after five seconds. It remains a status-only display; manual Wi-Fi controls stay suppressed while 5G is active.
- Patient-one manual treatment can now be selected through mission phase 5. The Medical Diagnostic Page remains available in MANUAL mode even when the Quick links section is collapsed; AUTOMATIC mode keeps the original Quick-links gate.
- Reworked clinical-display separation: all ordinary and Not-Testable GCS rows use seven hyphens before CODE. Reduced-consciousness patients may now provide a fictional identity based on verbal GCS capability (75% for V4+, 35% for V3, 10% for V2; otherwise Doe).
- Added an ambulance final-record state. After a completed visit chooses `whobringpatient = ambulance` or `ambudoc`, the page snapshots the last HR, SpO2, blood pressure, respiratory rate, temperature, GCS and Code. Live telemetry, active treatment controls, alerts and life-score UI are hidden; the retained record states who took care and shows completed HEMS actions. In manual mode, existing completed-action history remains as the treatment record.
- Static validation: strict JSON parsing succeeds; `homebar` and `homebar5g` each have 16 reachable references in mutually exclusive 5G branches; the final-record worker is gated by completed visit plus ambulance/ambudoc transport; all 14 live vital/GCS widgets are guarded against final ground handover.

## Refresh briefing connectivity state - release 0.997 80

- Advanced the mission title to 0.997 80.
- Corrected the Tablet 5G display regression: changing the persistent 5G option now rebuilds Mission Dispatch immediately. The briefing cannot retain a Wi-Fi connect/disconnect action that was rendered before the new option was selected.
- With Tablet 5G set to YES, the rebuilt briefing displays only the green 5G CONNECTED status icon; the two manual Wi-Fi actions are absent. Switching it back to NO rebuilds the same page and restores only the appropriate in-range Wi-Fi action.
- The correction changes presentation refresh only. The established CARLS and forced Tablet 5G connection behavior are unchanged.

## CARLS Direction Finder - release 0.997 79

- Advanced the mission title to 0.997 79.
- The previously unused CARLS L1 soft key is now labelled DF on the primary page. It opens a dedicated DIRECTION FINDER page without displacing the working status, group, mode, or setup controls.
- The page displays the active DF frequency in MHz and a non-compressing dash cursor below the digit being edited. A new six-digit entry is assembled left to right as `DDD.DDD`.
- R2 (ENT), the right selector, or the `#` key confirms an entry. When all six digits are entered, the same validation is applied automatically after five seconds of inactivity. `*` cancels the in-progress entry and L1/RTN returns to the CARLS main page.
- Only 108.000 through 426.025 MHz, inclusive, is accepted. An incomplete or out-of-range entry is cancelled and the previous active frequency remains unchanged.
- A valid frequency immediately configures the HPG Direction Finder source at the current accident location, so the cockpit MFD bearing pointer and the CARLS display use the same active frequency.
- Static validation: strict JSON parsing succeeds; all seven CARLS DF macros and the CARLS DF background thread exist; main-page L1, all keypad digits, `*`, `#`, R2/ENT, and L1/RTN are routed to defined commands.
## Correct marshal central approach cone - release 0.997 78

- Advanced the mission title to 0.997 78.
- Corrected the actual marshal anomaly: the previous ±12-degree “buffer” retained the last left/right instruction, so the centreline never became a neutral guidance condition. This was why the marshal continued to indicate a lateral move after the helicopter passed the centre.
- For both marshall and pisteur3, relative bearings from 348 through 360 and from 0 through 12 now issue idle (VAR 1 = 1) during the existing 15-45 ft distant lateral phase. Outside that cone, the existing side mapping is preserved: 13-180 degrees uses VAR 1 = 6 and 181-347 degrees uses VAR 1 = 5.
- The outer half of the 150 m-to-7 m approach adds a 70 ft radio-height floor. From 150 m to the 78.5 m midpoint, the marshal signals up below 70 ft and defers the usual descent profile until the helicopter enters the inner half. At or above 70 ft, lateral and neutral-cone guidance remain available. The near-area hover, landing, restart, departure, wind-facing, and visual left/right mapping are otherwise unchanged.

## Clinical report before handover presentation - release 0.997 77

- Advanced the mission title to 0.997 77.
- An ambulance that reaches an eligible single-patient scene now publishes the Medical-page rescue-team report immediately: ambulance on scene and initial assessment in progress. This report is independent of HEMS arrival.
- When its first assessment is completed, the report is upgraded with the completed action. If the controlled second basic-treatment action is completed, its action is included too. A late generic ambulance update cannot overwrite a ready or acknowledged handover report.
- The AMBULANCE HANDOVER section, acknowledgement, ambulance action rows, and medical-action visibility are now delayed until crewvisiting1 = yes, the established point at which HEMS reaches the patient. Ambulance work may still be completed before arrival; only its clinical presentation is deferred.
- Static validation: strict JSON parsing succeeds; early, completed-assessment, and completed-basic-treatment report states all exist; the three handover rows and the presentation thread are gated by HEMS clinical arrival.

## Hide manual Wi-Fi controls while Tablet 5G is active - release 0.997 76

- Advanced the mission title to 0.997 76.
- The two interactive Wi-Fi controls in Mission Dispatch (connect and disconnect) now require TABLET_5G_ENABLED to be different from yes. With persistent Tablet 5G enabled, neither manual Wi-Fi action is displayed.
- In their place, a single green 5G CONNECTED describe_icon is shown. It embeds a 32 by 32 px black-background URI icon, matching the Wi-Fi icon slot dimensions.
- This is a presentation-only gate. Tablet 5G keeps the established forced connection behavior; disabling it restores the appropriate in-range Wi-Fi control without changing CARLS state.
- Static validation: strict JSON parsing succeeds; exactly two wifigo controls use the Tablet 5G visibility guard and exactly one 5G CONNECTED status icon uses the inverse gate.

## Adaptive residential road selection and map-selection reject stability - release 0.997 75

- Advanced the mission title to 0.997 75.
- Residential road preparation now keeps an explicitly configured radius of 120 m or more, but raises the standard 100 m setup only to 120 m instead of forcing 250 m before every query. A scene that has no usable road result from that short standard query gets exactly one retry at 250 m; an explicitly larger custom radius is never reduced and is not queried again.
- Removed the per-way node enumeration that built node_location_list and then discarded it. Road candidate, nearest-node, connected-road, waypoint, marker, and fallback logic continue to consume the original OSM result directly, so the generated scene is unchanged while unnecessary OSM-node iteration and micro-sleeps are avoided.
- Corrected landing-spot rejection. The landing spot selector now calls routeupdate, or changes the heli-rescuer FPL state, only after ACCEPT = 1. Rejecting a proposed spot leaves the previously accepted landing marker, route, and current route calculation untouched.
- Audited the other map-selection Reject/Cancel flows. Their route and location mutations are already inside their respective Accept branches, so no duplicate changes were introduced merely for symmetry.
- Updated CHANGELOG_USER.en.md intentionally for this release. It now covers the public July baseline through 0.997 75 and lists user-facing options by screen/menu.
- Static validation: strict JSON parsing succeeds. The shared road generator no longer contains node_location_list; its final guard provides one 120-to-250 m retry only on the first unsuccessful standard attempt; the landing selector contains routeupdate only beneath ACCEPT = 1.

## Manual patient-one treatment interaction - release 0.997 74

- Added the persistent P1 manual medical mode option to Ground / Hoist Operations. Automatic remains the default, so existing missions keep their timed clinical flow until the option is explicitly set to MANUAL.
- In manual mode, patient 1 follows the existing pathology-specific treatment plan as a staged interaction of one to six phases. Each phase presents four short procedures: one clinically appropriate choice and three profile-specific incorrect alternatives. The correct slot and the incorrect-option set are randomized for every phase.
- Correct procedures invoke the established patient-one treatment-effect engine, retaining its pathology-aware, randomized response. A correct procedure may improve, leave unchanged, or occasionally worsen the Life Score as already defined by that model. Incorrect procedures impose a persistent randomized Life Score and vital-sign penalty; later phases therefore operate on the altered condition.
- Reused the existing ULTRAFAST, FAST, MEDIUM, and SLOW visit-time presets as per-procedure durations. Automatic visit waits are bypassed only for patient 1 in MANUAL mode, and ground operations wait for explicit clinical sign-off instead.
- After the final phase, the medical page requires COMPLETE VISIT and a transport selection. HELICOPTER is always available; AMBULANCE appears only while ambulance1 exists. The selected route controls the original ground-operation transport flow. Patient 2 and patient 3 remain automatic.
- The first completed phase reveals the GCS, vital signs, emergency code, and legends; an existing ambulance handover can credit its completed initial actions before manual treatment begins.
- Static validation: strict JSON parsing succeeds with 530 macros; all eight manual-treatment macros resolve, each of the five patient-one ground-operation variants uses the manual clinical gate once, and no new dangling macro call was introduced. CHANGELOG_USER.en.md remains unchanged.

## RescueTrack audio arming for realistic dispatch - release 0.997 73

- Fixed the missing RescueTrack sound after a realistic initial dispatch. The initial path used `first_dispatch`, which played the dispatch ringtone but never armed the central NEWMSG notification gate; every later message was therefore correctly detected but intentionally muted.
- Moved arming into `dispatch ringtone`. Every dispatch route now enables RescueTrack message alerts immediately after emitting its dedicated first-dispatch ringtone, while the initial message itself remains protected from a duplicate NEWMSG alert.
- Static validation: strict JSON parsing succeeds; `rescuetrack_audio_ready` has one initialization, one central dispatch-ringtone arm, and the sole dynamic `L:{local:VCP}NEWMSG` writer remains in `UpdateRescueTrack`. `CHANGELOG_USER.en.md` remains unchanged.

## Unique public and casualty selection - release 0.997 72

- Added a locked, mission-local public-title selector for the civilian, dog, dancer, and worker pools. Every requested public model is selected from titles not already spawned by the current scene; only after the requested pool has no unused title remaining can the selector reuse one.
- Covered all random public creation paths that use these pools: general scenes, large random crowds, staged dancer crowds, and the road-accident civilian generators. The original object locations, headings, and behaviour remain unchanged.
- Added model-ID de-duplication for casualty slots 2 and 3. A compatible injured model already used by an earlier casualty is rejected when another sex/age-compatible model exists; an unavoidable duplicate is accepted immediately when the eligible pool is exhausted (including the single-model motorcyclist case).
- Static validation: strict JSON parsing succeeds; all civilian/dancer/worker static title draws are routed through the selector, and the second/third casualty branches explicitly test for an alternative model before falling back. `CHANGELOG_USER.en.md` remains unchanged.

## Return-to-base dispatch availability and tablet 5G - release 0.997 71

- Added a persistent Tablet 5G setting in Avionics Options, adjacent to the CARLS radio self-test setting. It defaults to NO and, when enabled, keeps only the tablet data connection available regardless of Wi-Fi range or CARLS radio state.
- Clarified the post-return workflow on the statistics screen: it now states that the crew remains on duty awaiting the next dispatch, and the explicit terminal control is named END SHIFT.
- END SHIFT now marks the dispatch phase unavailable before closing the shift, cancelling a pending post-return availability flow instead of allowing a late dispatch to arrive after the shift is closed.
- The automatic second-dispatch worker remains the sole scheduler: it starts at the existing return/deboarding dispatch phases and retains the configured random delay. No duplicate dispatcher worker or extra reload action was added.
- Deboarding remains non-blocking. A dispatch accepted during the animation uses the existing reload path, which clears transient crew and vehicle objects and rebuilds the stopped-aircraft ground-arrival flow.
- Static validation: strict JSON parsing succeeds; Tablet 5G never changes L:CARLS_CONNECTED, and all existing dispatch and RescueTrack gates continue to consume the tablet connection state.

## Persistent base-marshal return and reload recovery - release 0.997 70

- Advanced the mission title to `0.997 70`.
- Corrected Objective 1 ordering: the optional start-base marshal is now created only after the initialization cleanup that previously destroyed it in the same startup pass.
- The base marshal stores its exact live position and guidance target in persistent LVAR locations. A normal return to the original base recreates that marshal at the saved coordinates and points it to the original base target.
- Selecting a different return base explicitly invalidates the old-base snapshot. A replacement marshal is generated at an 18 m wind-relative fallback position around the selected RTB location, then its new location and target are stored for later recovery.
- Accepting a second dispatch while returning to base snapshots only a marshal whose role is `base`, before the mission reload. Objective 1 then rehydrates that same marshal position and target from LVAR latitude/longitude data. Scene, hospital, and technical marshals cannot overwrite this snapshot.
- The new state uses LVAR/local persistence only; no global marshal state was added. `CHANGELOG_USER.en.md` remains untouched.
- Static validation: strict JSON parsing succeeds with 521 macros; all seven new marshal macros resolve and their calls are non-dangling.

## Restore centralized RescueTrack alert - release 0.997 69

- Advanced the mission title to 0.997 69.
- Restored the single dynamic VCP notification write in UpdateRescueTrack. Release 68 accidentally removed this command while removing the previous per-message writes, leaving the audio-ready branch empty.
- When a new Dispatcher_Messages entry is detected after the initial dispatch, the central branch now increments L:{local:VCP}NEWMSG exactly once. The selected package therefore resolves dynamically (for example AND, KEK, DUS) without hardcoding a voice package.
- The initial dispatch remains protected by rescuetrack_audio_ready = no until its existing dispatch ringtone has run, preventing a duplicate first-call alert. No direct VCP NEWMSG writes remain in individual ambulance, police, fire, cancellation, or status macros.
- Static validation: strict JSON parsing succeeds with 514 macros; the sole L:{local:VCP}NEWMSG write is in UpdateRescueTrack. CHANGELOG_USER.en.md remains unchanged.

## RescueTrack alerts and marshal/clinical regression fixes - release 0.997 68

- Advanced the mission title to `0.997 68`.
- Centralized the RescueTrack notification signal: every newly appended RescueTrack dispatcher message now increments the VCP `NEWMSG` LVAR exactly once. The first dispatch message remains silent in this path because it retains its dedicated dispatch ringtone; all former per-macro increments were removed to prevent double alerts.
- Replaced the unsupported HPG widget `or` condition used by the ambulance handover with the flat `ambulance_handover_visible` flag. The flag is reset at dispatch/pathology initialization and only enabled after a real on-scene ambulance report has been produced, so calls without an ambulance no longer show an empty handover or `null REPORT: null`.
- Removed redundant conditional page separators: native `bar` images now occur once at each active clinical-section boundary. The Medical Actions header itself is hidden until either the ambulance handover or HEMS action controller has made a clinical timeline available.
- Restored the assessment display contract. Vital signs, coloured GCS/CODE row, and the gray GCS/CODE references now depend solely on `medical_assessment_complete`; they appear with the transition from the first assessment action and are no longer blocked by later rescue/load mission states.
- Corrected the distant marshal cone to straddle the actual 0°/360° centreline. Outside the landing area, its fixed ±12° latch holds the current left/right indication across the centreline and changes only once the aircraft exits the sector.
- Added a low-NR landing confirmation for both marshal controller variants. After the helicopter is on the landing spot below `gndopsNR` for 30 seconds, departure guidance is armed. A normal restart still shows the existing rotor sequence; an idle/quick-start that skips the pump phase enters the takeoff-ready state directly, then still emits hover and departure-direction signals after lift-off.
- Static validation: strict JSON parsing succeeds with 514 macros. `patient health` contains no HPG `show_condition.or`; VCP `NEWMSG` is written only in the centralized RescueTrack macro. `CHANGELOG_USER.en.md` is intentionally unchanged.

## Ambulance-to-HEMS clinical handover and record layout - release 0.997 67

- Advanced the mission title to `0.997 67`.
- Added a single-patient ambulance-to-HEMS handover controller. When an ambulance reaches the scene before HEMS and has time to act, it completes the diagnosis profile's first primary-assessment step and, on a controlled random branch, the second basic-treatment step. The existing ambulance-preload path remains excluded, preventing a second clinical workflow for the same patient.
- The HEMS clinical controller acknowledges a ready handover, credits one or two ambulance actions, and resumes at the first action not already completed. An effect for the ambulance's second action is applied once before HEMS arrival and is not repeated by the HEMS sequence.
- Reworked the Medical page as a vertical clinical record compatible with HPG's single-column, single-colour widget limits. A conditional ambulance-handover section uses the native `bar` image separator, an orange report line, and a green acknowledgement; the timeline identifies completed ambulance actions as `AMBULANCE:` rows while HEMS actions retain the existing yellow-in-progress/green-completed contract.
- Replaced the variable-width dashed page headings with a centered `PATIENT CLINICAL RECORD` title and a single `MEDICAL ACTIONS` heading between native bar separators.
- Numeric and Not Testable GCS variants both keep patient code on the same compact text row. A fixed five-space separator before `CODE` preserves a clear visual gap while retaining enough width to avoid an unpredictable wrap.
- Static audit: strict JSON parsing succeeds with 514 macros; the new conditions are HPG-flat and all six generic green action rows suppress an ambulance-credited duplicate. No pull request or push was created.

## Fixed angular marshal lateral buffer - release 0.997 66

- Advanced the release title to `0.997 66`.
- Replaced the former hard `180°` left/right split in the common marshal approach controller with a persistent lateral-direction latch.
- Outside the existing landing area and only in the existing lateral-guidance phase (15–45 ft radio altitude), the first indication still uses the actual side of the approach. A left/right change is now accepted only after the relative bearing crosses `168°` or `192°`, creating the requested fixed `±12°` angular sector with the marshal as its origin.
- The sector is intentionally constant: its lateral clearance naturally increases with distance. Inside the landing area the lateral branch remains disabled, so the existing hover, descent and landing signals retain complete control.
- The latch is reset whenever a marshal is created. Strict JSON parsing succeeds with 513 macros. No pull request was created.

## Indoor privacy-fence, ground-stretcher, and clinical-assessment corrections - release 0.997 65

- Advanced the release title to `0.997 65`.
- Kept `fence road` conditional on `indoor_scene`, but now derive that flag immediately after every one of the eight mission-query assignments. The exact selected query, rather than the pathology, marks apartments/hotels, nursing homes, schools, factories, doctors offices, train stations, and supermarkets as indoor. This repairs the randomize path that previously omitted the flag and could create a fence in an indoor cardiovascular case.
- Restored the far-ambulance stretcher approach for 3-crew and 4/5-crew ground operations: the hoist operator now travels through `200 degrees / 5 m` before the final `185 degrees / 1.5 m` position. After the stretcher starts returning, the operator returns to that final position before pointing to the helicopter and closing the cargo doors. The existing 245 degrees / 5 m waiting position and slow movement remain in place.
- Replaced the concatenated medical-action status with separate, descending action rows. The current action is yellow; previous actions are green; once the final action completes, every action is green. No action string uses the former `//` separator.
- Removed the trailing yellow dashed medical-page footer. The LifeScore text and slider now form the final page section, after the medical-action and gray reference material.
- Added the initial-assessment visibility gate: while action 1 is in progress, the page states that vital signs and GCS are pending. Heart rate, SpO2, blood pressure, respiratory rate, temperature, GCS, and the assigned patient code first appear when action 2 begins, then remain live for the rest of the visit.
- Strict JSON parsing succeeds with 513 macros, 68 mission records, and 660 action-profiled health records. No pull request was created.

## HPG query compatibility and full structural audit - release 0.997 64

- Advanced the release title to `0.997 64`.
- Replaced the release-63 nested boolean operands that caused the medical-page `TypeError` with flat, explicit local flags. Blood pressure, respiratory rate and body-temperature critical display now use `BP_CRITICAL`, `RR_CRITICAL` and `TEMP_CRITICAL` respectively.
- Reworked CPR provider eligibility as the flat `cpr_provider_present` flag, preserving the existing HEMS/ambulance priority while removing the incompatible nested `or` from its gate.
- Reworked the marshal and pisteur3 ground-transition gate as per-controller `*_landing_authorized` flags. The final transition is now a flat HPG condition: ground, within the appropriate landing area, and an authorized LAND/RPM state. The controller macros contain no nested logical query.
- Audited the full 512-macro mission: valid JSON; 4,006 `require` nodes all have a comparator; 1,353 `and`/`or` nodes are arrays; 773 threads have command arrays; all 150 `while` loops have `do` arrays; and all dispatch widget conditions are objects.
- Static macro-reference audit found no newly introduced dangling reference. One unrelated literal `beforetockl` call has been absent since release 46; it remains untouched because recreating its intended checklist would be a separate feature change. Dynamic `ELT {local:ELT}` calls resolve to the existing normal/crash macros.
- Strict JSON parsing succeeds. Only `patient health`, `CPR`, `reset marshall guidance`, and `marshaller animation monitor` changed. No pull request was created.

## Restore historical patient-decrease activation behaviour - release 0.997 62

- Advanced the release title to `0.997 62`.
- Audited the original release-46 source and the pre-change release 54. Neither had a distance gate at the start of the `life decrease` worker. The first deterioration pass began immediately after the patient existed.
- Restored that behaviour while retaining the release-61 non-blocking worker structure. The accidental initial `distance < 0.8` gate was removed.
- Preserved the two historical in-loop gates unchanged: `distance < 0.8` after the timed first deterioration segment, and `distance < 0.2` before the next deterioration cycle. A critical patient can therefore still deteriorate if the crew does not arrive in time, without blocking Objective 2.
- The change is limited to `life decrease`; all marshal, progress-monitor, CPR, patient-selection and display logic is unchanged.
- Strict JSON parsing succeeds with 512 macros. No pull request was created.

## Objective 2 initialization deadlock correction - release 0.997 61

- Advanced the release title to `0.997 61`.
- Corrected the synchronous Objective 2 deadlock: `random injured` invokes `life decrease` during scene creation, so its patient-existence/distance waits could not run outside the worker.
- Moved the waits to the existing worker thread, allowing scene generation and cabin preparation to continue. Release 62 subsequently restores the historical activation-distance behaviour inside that worker.
- Strict JSON parsing succeeds with 512 macros. No pull request was created.

## Mission source formatting restoration - release 0.997 60

- Advanced the release title to `0.997 60`.
- Restored the established compact/manual mission formatting after the accidental whole-file serialization in release 59. The file now again follows the accepted source layout: one top-level macro command per line, compact same-command closures, one data record per line, and no newly expanded whitespace.
- Rebased the source text on the already formatted release-58 artifact, then reapplied only the release-59 progress-monitor semantics. The only changed macro regions are `Mission dispatch`, `ground ops`, `objective1`, and the new `on-site operations progress monitor`.
- Data records, background threads, locations, icons, objects, user actions, objectives, briefing, and all unrelated macros are structurally identical to the formatted release-58 source. No progress logic was changed by this formatting-only correction.
- Strict JSON parsing succeeds with 512 macros. No pull request was created.

## On-site dispatch progress bar and stall indication - release 0.997 59

- Advanced the release title to `0.997 59`.
- Added a green `0-100` progress bar to Mission Dispatch, driven by the dedicated `L:SATISFACTION` LVAR. It becomes visible only once ground crew operations begin, starts at 0 during crew deployment, and preserves the completed 100% state until the next dispatch reset.
- The bar is milestone-driven rather than a fictional total timer: crew deployment reaches at most 18%; the clinical visit uses the existing calculated `TIMERGND` only to interpolate its own portion up to 55%; active CPR advances only within its own limited band; loading/crew-return and final-return stages advance separately; only actual `HOISTED = 1` or dispatch end completes the bar at 100%.
- The monitor samples every two seconds and is deduplicated per dispatch. Objective 1 resets the new LVAR and all monitor locals, preventing stale state across mission reloads.
- After two minutes without an increase, the Dispatch page displays one orange diagnostic line asking the user to check crew, patient, vehicle, or aircraft state. It does not overwrite the mission's operational messages.
- Strict JSON parsing succeeds with 512 macros. No pull request was created.

## CPR state machine, mCPR option, privacy screens, and manual stop - release 0.997 58

- Advanced the release title to `0.997 58`.
- Replaced the former CPR sequence with one guarded state machine: state 1 is a request/landing wait, state 2 is active CPR, state 3 is ROSC, state 4 is unsuccessful CPR, and state 5 is a crew-directed stop. The new `cpr_armed` latch prevents the scene and onboard health monitors from starting concurrent procedures.
- Added the persistent `MCPR_ONBOARD` option under **Settings → Scene/Vehicles → Medical Options**. It defaults to “not installed”; when installed, a rescued patient can receive simulated CPR in flight. Without it, CPR waits for `SIM ON GROUND`, uniformly covering ground, hoist, and skid workflows.
- Scene CPR now chooses the HEMS crew whenever it has visited the patient; otherwise an already-arrived ambulance crew may provide it. The cabin CPR animation is limited to HEMS CPR for a rescued patient, avoiding a cabin animation on the scene.
- Active CPR updates lifescore, HR, SpO2, systolic/diastolic pressure and respiratory rate every five seconds with variable outcomes. ROSC now requires a sustained multi-parameter recovery; a single BPM threshold cannot complete CPR.
- Added a Medical page **STOP CPR** button after five minutes of active CPR. It stops compressions, does not improve the patient, blocks automatic re-entry for the current dispatch, and lets the ordinary critical deterioration/death logic resume.
- Added `indoor_scene` to all 68 mission-ID records and passes it through `missionupdate`. Ambulance and police privacy fences are skipped for indoor locations (apartments/hotels, nursing homes, schools, factories, doctors’ offices, stations and supermarkets).
- Restored compact mission formatting: each macro command and each `data` entry occupies one line, same-command closing delimiters remain together, and unnecessary indentation was removed. The mission file is now 7,511,942 bytes (down from 9,327,684) while remaining valid JSON.
- Strict JSON parsing succeeds with 511 macros, 68 mission IDs, and 609 diagnosis records. No pull request was created.

## GCS display separator refinement - release 0.997 57

- Advanced the release title to `0.997 57`.
- Reformatted every GCS display row as `E: value // V: value // M: value`.
- The Not Testable variant now displays `// Total: NT`; it still has no numeric total and remains yellow.
- Strict JSON parsing succeeds with 511 macros. No pull request was created.

## GCS Not Testable component handling - release 0.997 56

- Advanced the release title to `0.997 56`.
- Implemented `0` as the internal randomizable Not Testable (NT) value for patient-1 GCS components. Compatible diagnosis profiles now include zero in the relevant component range: facial burn/edema or compatible facial trauma for E; intubation, tracheostomy, aphasia, or dysphasia for V; spinal/paralytic or severe movement-preventing fracture trauma for M.
- The existing random component draw can therefore select NT case-by-case instead of making a diagnosis permanently NT.
- If E, V, or M resolves to zero, the page renders `NT` for that component and a single yellow `GCS: E… V… M… - NT (no total)` row. The score total is not displayed and none of the green/yellow/red numeric-total rows can render.
- When all components are testable, the integral E/V/M and the normal total/colour thresholds remain unchanged. CPR and low-lifescore processing preserve a pre-existing NT component instead of overwriting it with `1`.
- Strict JSON parsing succeeds with 511 macros and 609 diagnosis records. No pull request was created.

## Marshal touchdown interlock, coherent patient telemetry, and cropped medical icons - release 0.997 55

- Advanced the release title to `0.997 55`.
- Reworked the shared scene-marshal and pisteur3 arming transition. A brief, unintended touchdown no longer disarms approach or enables departure. A ground transition is committed only after the marshal has already issued LAND inside its landing area, or after rotor RPM falls below 80% (the deliberate shutdown/land-elsewhere signal).
- Wind repositioning locks at 150 m, on any ground contact, and after the landing commit. Once committed, the marshal points at the helicopter exactly once; the wind worker cannot turn or move it again. The same latch is initialized and reset with the existing marshal guidance state.
- Patient-1 physiological profiles now enforce non-zero living vital ranges whenever lifescore is positive, with stronger floors from lifescore 30 upward. Blood pressure is kept physiologically ordered (systolic above diastolic), and all three GCS components are integral values.
- Lifescore deterioration still uses the existing `decr_rate` and random mechanics, but its first iteration now waits for the existing 0.8 scene-distance gate rather than reducing the patient while the helicopter is still en route.
- The medical page places GCS immediately below the gray emergency-code legend. It renders as one named GCS row plus three separate gray E/V/M legend rows, with green/yellow/red GCS thresholds. BP, respiratory rate, and temperature are each independent `describe_icon` rows and appear only after the same patient-visit condition as HR and SpO2. Critical readings are red; the erroneous critical-SpO2 `-1%` display was removed.
- Added four opaque-black, tightly cropped custom icon URIs: `gcs`, `blood_pressure`, `respiratory_rate`, and `body_temperature`. They contain no transparent backdrop, avoiding the white-square rendering issue.
- Strict JSON parsing succeeds with 511 macros and 609 diagnosis records. No pull request was created; runtime validation in MSFS is still required.

# HEMS Random and Everywhere Missions - Consolidated Changelog

## Patient-physiology initialization and medical-page layout correction - release 0.997 54

- Advanced the release title to `0.997 54`.
- Fixed the failed cross-macro profile handoff that produced zero BP/RR/temperature/GCS values. The selected diagnosis now copies all eighteen profile bounds to persistent patient-1 locals before initialization; a live-patient fallback prevents null vital signs.
- The physiology monitor and vital-sign deterioration wait until the helicopter is within the existing 0.8 distance gate of the scene. Lifescore decay continues to use the pre-existing `decr_rate` mechanics and its randomness.
- Medical page now uses separate `describe_icon` rows for BP, respiratory rate, temperature, and GCS. The GCS explanation is retained as separate E, V, and M legend rows.
- Strict JSON parsing succeeds with 511 macros. No pull request was created.

## Per-diagnosis physiology profiles and vital-sign trend - release 0.997 53

- Advanced the release title to `0.997 53`.
- Replaced the category-level physiology table with explicit GCS and vital-sign bounds in every one of the 609 `health*` diagnosis records.
- Patient 1 now initializes solely from the selected record, enabling later diagnosis-by-diagnosis tuning without changing controller logic.
- Added a 20-40 second patient-1 monitor for restrained random variation; hypoxia, low lifescore, and CPR rules remain the dominant trend.
- Strict JSON parsing succeeds with 511 macros. No pull request was created.

## Patient 1 physiology and Glasgow Coma Scale - release 0.997 52

- Advanced the release title to `0.997 52`.
- Added 107 pathology-type profiles for patient 1. Each provides bounded initial ranges for GCS eye/verbal/motor responses, SpO2, heart rate, blood pressure, respiratory rate, and temperature.
- Added BP, RR, temperature, and component GCS plus total GCS to the medical page. GCS uses the complete E1-V1-M1 minimum, therefore GCS 3 represents coma.
- Patient 1 now links falling SpO2 with tachycardia/tachypnea in moderate hypoxia, then falling HR, RR, and systolic BP in severe hypoxia. CPR explicitly shows GCS 3, RR 0, and compression-state BP.
- Strict JSON parsing succeeds with 511 macros. No pull request was created.

## Custom marshal icon and transparent hospital marker - release 0.997 51

- Advanced the release title to `0.997 51`; the artifact remains `everywhere_all.json`.
- Added the supplied 32 x 32 PNG URI as the `custom_marshall` icon. It is used only by the Technical page `CREATE ON CUSTOM LOCATION` landing-point marker; the existing `CREATE IN FRONT` marker is unchanged.
- Rebuilt `cus_hospital` as an 18 x 18 RGBA PNG with the 132 white background pixels changed to alpha zero. The green medical symbol and all non-white pixels are preserved.
- The five custom-hospital database markers continue to use `cus_hospital`, now without the opaque white square.
- Strict JSON parsing succeeds with 509 macros. No pull request was created.

## Marshal lateral-direction correction and 20% restart latch - release 0.997 50

- Advanced the release title to `0.997 50`; the artifact remains `everywhere_all.json`.
- Verified the Technical-page marshal is not a separate lateral controller: it uses the shared `marshall` path, so its reversed left/right instruction also affected scene, base, and hospital marshals using that object. The shared mapping is now aligned with the already-correct `pisteur3` mapping: relative bearing >180 selects VAR 1 = 5 (move left); the other side selects VAR 1 = 6 (move right).
- Kept `pisteur3` unchanged; inspection confirmed it already used the correct left/right mapping.
- Changed the restart handover from rotor RPM >50% to >=20% in every first-pump and latched-start branch for both marshal controllers. Once a pump-initiated start reaches 20% NR, the restart is committed and the marshal enters idle/flashlights (VAR 1 = 1) independently of subsequent first-pump switch changes, until the existing >90% NR takeoff transition.
- Below 20% NR, the existing engage-rotor indication remains available; the >90% move-up, lift-off hover, and direction sequence is unchanged.
- Strict JSON parsing succeeds with 509 macros and all six restart-handover checks now use >=20% NR. No pull request was created.

## Manual marshal monitor and engine interlock - release 0.997 49

- Advanced the release title to `0.997 49`; the artifact remains `everywhere_all.json`.
- Corrected the Technical page marshal failure: the marshal animation monitor was previously started only by `delayed threads` after DOC connection. A manually created marshal could therefore remain at `VAR 1 = 0`, with neither approach nor restart logic running.
- Added one deduplicated shared monitor launcher. Every marshal creation path - scene, base, hospital, front, and accepted custom location - activates it after the marshal object exists. Replacing a marshal does not create a second controller thread.
- New marshals immediately enter idle/flashlight state (`VAR 1 = 1`, except the existing Halloween state) while their normal controller takes ownership of later transitions.
- Added `marshall_engine_guard_active`. It is calculated from the helicopter's distance to the marshal guidance point against the configured landing-circle radius. Only a marshal whose landing area currently contains the helicopter inhibits the first-pump automatic engine handlers `ENG 1_2` and `ENG 2_1`; a marshal elsewhere does not block engine starts.
- The existing marshal controller then selects landing or restart/departure behavior from on-ground state, rotor RPM, pumps, distance, and altitude. Its no-`MISSION_PHASE` behavior, 7 m buffer, 3 kt gate, 2-second hover, <=10 ft land condition, and 18 m marshal offsets are retained.
- Debug now shows shared-monitor and engine-guard state. Strict JSON parsing succeeds with 509 macros and the existing 27 `set_dispatch` commands remain intact.
- Added the multi-patient architecture design, now maintained at `docs/architecture/MULTI_PATIENT.md`, for the future five-patient triage refactor.

## Technical marshal landing-reference correction - release 0.997 48

- Advanced the release title to `0.997 48`; the artifact remains `everywhere_all.json`.
- Corrected `CREATE IN FRONT`: `marshall_guidance_location` now snapshots the helicopter's position at the button press. The marshal and its map icon remain 25 m ahead of that point, and the marshal faces the helicopter/landing reference.
- Confirmed `CREATE ON CUSTOM LOCATION` already uses the accepted POI as `marshall_guidance_location`, with the marshal and temporary map icon 18 m offset from the selected landing point.
- Reusing either Technical page action first removes the existing marshal and transient guidance state, then creates one replacement marshal at the new offset. Rejected custom selections leave the current marshal unchanged.
- Strict JSON parsing succeeds with 507 macros. No route or additional scene object is created by either Technical marshal action.

## Marshal controls and complete implementation audit - release 0.997 47

- Advanced the release title to `0.997 47`; the artifact remains `everywhere_all.json`.
- Reconciled the current main branch against the earlier marshal requirements and found that the requested optional marshal controls had never landed in release 45. This release adds the missing implementation instead of merely documenting it.
- Added persistent destination settings in one two-button buttonbar: start-base marshal defaults to `no`; destination-hospital marshal defaults to `yes`. Normal Objective 1 reloads preserve both choices. `resetdefault` clears them so their documented defaults are restored on the next initialization.
- A start-base marshal is created 25 m in front of the mission start position and does not follow the wind. A destination-hospital marshal uses wind orientation only when `hospital_wptot = 0`; with custom hospital waypoints it is created 1 m to the right of `ambumedic`. Both face the actual landing point and use the existing marshal controller and engine-start guard behavior.
- Added always-visible Technical page actions: `CREATE IN FRONT` creates a marshal 25 m ahead of the helicopter; `CREATE ON CUSTOM LOCATION` asks for a map POI and creates only the marshal plus the temporary `injured_location` map icon. Neither technical action creates a route or other scene objects.
- The existing marshal controller now reads the configured guidance location, not only `landing_spot`. Role-scoped reset and wind workers prevent an old scene/hospital worker from moving the current marshal. The obsolete scene `MISSION_PHASE <= 9` loop was removed.
- Corrected the still-inverted lateral approach mapping: relative bearing >180 now commands right (`VAR 1 = 6`); the opposite side commands left (`VAR 1 = 5`). The 7 m deadband, native `distance:m`, 45 ft descent threshold, 3 kt descent gate, 2-second hover and <=10 ft land announcement remain in force. Departure retains the requested inverted forward/rear mapping.
- Replaced every marshal-specific 13 m placement with 18 m. Strict JSON parsing succeeds with 507 macros; the existing 27 `set_dispatch` commands remain intact, and the new debug row is inside the existing debug `set_dispatch`.
- Reformatted the five new marshal macros to the mission's compact/manual convention: simple commands remain on one line and complex conditions remain multiline.

## Asynchronous road-vehicle spawn guard - release 0.997 46

- Advanced the release title to `0.997 46`; the artifact remains `everywhere_all.json`.
- Corrected the asynchronous OSM spawn race affecting road vehicles. `Query closest nodes with sampling` now clears `my_data` before requesting OSM data and waits for the response before reading its elements. A fixed sleep is no longer used as a readiness substitute.
- The police and fire-station resolvers now guarantee a valid fallback location and wait until that location exists before their callers can move a vehicle. The closest ambulance/police flow applies the same readiness checks to both station locations.
- `Query closest ambugo` no longer uses `[0,0]` as a temporary hospital/station sentinel. It starts each candidate with a valid scene-relative fallback, then replaces it with the OSM result when available, and waits for the selected `ambu_station`.
- This prevents a route from being created after its logical start location resolves while the corresponding vehicle has already been left at the simulator origin. The 27 `set_dispatch` commands and all unrelated mission logic are unchanged.
- Strict JSON parsing succeeds with 502 macros. Runtime verification remains required with road police, fire, normal ambulance, and closest ambulance/police dispatches.

This changelog records the consolidated results of the work performed during the discussion. Intermediate corrections to newly created features are intentionally collapsed into their final behavior instead of being listed as separate revisions.

## Native meter distance query restoration - release 0.997 45

- Advanced the release title to `0.997 45`; the artifact remains `everywhere_all.json`.
- Removed the unnecessary feet-to-meter calculation from the marshal and `pisteur3` controllers. Both now use the mission's native `distance:m` query directly, matching the established HEMS mission syntax and the other landing-spot distance checks.
- Kept the corrected approach lateral mapping: relative-bearing >180 is left (`VAR 1 = 5`), the opposite sector is right (`VAR 1 = 6`). Restart sequencing and forward/aft inversion remain unchanged.
- Strict JSON and marshal-structure validation remains required before publication.

## Marshal lateral guidance and documented distance query - release 0.997 44

- Advanced the release title to `0.997 44`; the artifact remains `everywhere_all.json`.
- Corrected the lateral mapping in both approach controllers: a helicopter on the relative-bearing side previously mapped to `VAR 1 = 6`; it now correctly maps to left (`5`), while the opposite side maps to right (`6`).
- Replaced the undocumented location `distance:m` query in the marshal monitor with the HPG-documented `distance:ft` query and converted the result to meters. The 7 m deadband, 150 m arming gate, lime-circle test, and debug distance therefore use the intended units consistently.
- Kept the successful restart state machine and its forward/aft inversion unchanged: the route-forward sector still produces the opposite rear indication (`12`), and the opposite longitudinal sector produces straight/forward (`11`).
- The HPG query reference documents `distance:ft` for `location/var`; the conversion is applied only inside the two marshal controllers. Other mission queries and wind-orientation threads are unchanged.
- Strict JSON and marshal-structure validation remains required before publication.

## Marshal controller state-machine rewrite - release 0.997 43

- Advanced the release title to `0.997 43`; the artifact remains `everywhere_all.json`.
- Replaced the competing marshal monitor paths with one isolated controller for `marshall` and one for `pisteur3`. Each controller has mutually exclusive approach and departure modes and changes `VAR 1` only when the requested animation state changes.
- Approach arms only while airborne beyond 150 m, disarms on ground inside the configured landing-circle radius, and never runs while the helicopter is behind the marshal or at/above 100 ft. The close approach uses a 7 m horizontal buffer, commands descent above 45 ft, reserves up for a low (<15 ft) lateral correction, holds hover for 2 seconds, accepts descent only at <=3 kt, and announces land only at <=10 ft after hover/descent conditions are met.
- Departure is the sole active mode after the landing procedure disarms. With a primed first pump and low Nr it sends engage rotor once; >50% Nr holds idle, >90% Nr sends up, take-off holds hover for 2 seconds, then a single route-relative departure direction. A stopped helicopter with both first pumps off remains idle and clears transient departure state.
- The implementation contains no `MISSION_PHASE` gate or blocking `wait_for`. The existing wind-orientation threads were not changed. Objective 1 and debug now include the controller state and initialization locals; debug hover is explicitly a three-phase value (`0` none, `1` holding, `2` complete).
- Strict JSON parsing and structural checks confirm one macro invocation, two controller threads, no marshal `VAR 1` writer outside the controllers, and a state guard on every marshal/pisteur3 `VAR 1` command.

## 3-crew copilot animation VAR restoration - release 0.997 42

- Advanced the release title to `0.997 42`; the artifact remains `everywhere_all.json`.
- Used the Desktop historical file supplied by the user (`C:\Users\Andrew\OneDrive\Desktop\everywhere_all.json`) only as the reference for the requested VAR restoration.
- Restored only `VAR1`/`VAR 1` animation values in the CREW=3 copilot branches of `Ambulance destination1`, `User destination1`, `midway patient load1`, and `transfer patient load1`: walking uses the historical `VAR1:16`, with the historical standing transitions retained (`0` for unloading and `14` for loading/return). Removed only the extra animation-variable assignments introduced before movement. No route, wait, trigger, or other logic was reverted.
- SKID landing macros and all other progressive logic remain unchanged. Both authoritative copies pass strict JSON parsing; this release is ready for local publication.

## Loading choreography and 3-crew copilot VAR1 correction - release 0.997 41

- Advanced the release title to `0.997 41`; the artifact remains `everywhere_all.json`.
- Used the historical `0.9961-20260126-daikan` source dated 8 March 2026 as the route and formatting reference without replacing the current user changes.
- Restored the empty- and patient-stretcher choreography in `3 crew ground ops`, `4 or 5 crew ground ops`, `hoist land`, `midway patient load1`, `transfer patient load1`, `Ambulance destination1`, and `User destination1`. Closest waypoints are split into separate drive objects where required, while the final closest-plus-fixed alignment is preserved; empty stretcher movement uses speed 5 and patient movement speed 4.
- Corrected the CREW=3 copilot branch used during unloading/loading: after `PILOT_FO_OFF`, `pax1` uses the crew walking/standing states (`VAR1` 2/0) and returns to pilot standing (`VAR1` 14) only when going back to the cockpit, preventing irregular `VAR1` changes near the ambustretcher.
- SKID landing macros were not modified. Both authoritative copies pass strict JSON parsing; this release remains local and has not been published or merged on GitHub.

## Ground-ops arbitration and 3-crew stretcher return correction - release 0.997 40

- Advanced the release title to `0.997 40`; the artifact remains `everywhere_all.json`.
- Kept `marshall_departure_armed`/`pisteur3_departure_armed` as mutually exclusive departure-mode gates; they do not themselves start a restart sequence. The restart state advances only on the low-RPM plus first-pump condition.
- Removed repeated `VAR 1` writes while waiting for rotor thresholds, while still issuing the intended transition commands once. Direction signals in restart state 5 are emitted once per departure, then left stable.
- When a completed departure is left on the ground with both first pumps off, the restart state and transient signals are cleared and the object returns to idle, preventing a stale departure state from competing with shutdown.
- In `3 crew ground ops`, the earlier direct-return correction was subsequently superseded by the consolidated historical-route restoration in release 0.997 41.
- Both authoritative copies pass strict JSON parsing; this release remains local and has not been published or merged on GitHub.

## Persistent settings and Objective 1 session-state policy - release 0.997 39

- Advanced the release title to `0.997 39`; the artifact remains `everywhere_all.json`.
- Preserved the user-controlled `VOLUME_CREW` and `VOLUME_CHK` globals across dispatch reloads. Their `L:VOLUME_CREW` and `L:VOLUME_CHK` mirrors are rehydrated from the persisted globals, with a default of 100 only when the corresponding global is `NULL`.
- Kept configuration values, external `L:CUS_*` handoff variables, save-slot `TEMP...` values, and the `L:SECOND_DISPATCH_ACCEPTED` handoff gate out of the per-dispatch reset policy.
- Kept Objective 1 resets limited to transient mission state: phase/progress flags, route diagnostics, pathology readiness, rescue-vehicle/arrival state, scene-object handles, and all marshal/pisteur3 guidance, restart, hover, bearing, and arming locals.
- Preserved the intentional `resetdefault` macro behavior, which is the explicit user-settings reset path and is not part of a normal second dispatch.
- Updated the handoff to document the persistence boundary and strict JSON validation.

## Debug color spelling audit and startup LVAR synchronization - release 0.997 38

- Advanced the release title to `0.997 38`; the artifact remains `everywhere_all.json`.
- Audited all gray color values across the mission pages and standardized the eleven isolated `dispatch control` entries to the majority spelling `gray`; all color tokens now use `gray`.
- The original volume setup was conditional on `L:SECOND_DISPATCH_ACCEPTED != 1`, so reloads/second dispatches could skip the `L:VOLUME_CREW` and `L:VOLUME_CHK` assignments. Objective 1 now preserves each global value (default 100) and synchronizes both LVARs unconditionally before the debug page; the original `L:WAVING_CIVILIAN_STOP` initialization later in Objective 1 remains unchanged.
- Strict JSON parsing succeeds for both the authoritative source and the output copy; no GitHub publication or merge was performed.

## Marshal procedure arming arbitration - release 0.997 36

- Advanced the release title to `0.997 36`; the artifact remains `everywhere_all.json`.
- Added mutually exclusive arming locals for the approach and departure procedures of both `marshall` and `pisteur3`.
- The approach procedure arms only when the helicopter is airborne and more than 150 m from the active landing/meeting spot. It disarms when the helicopter is on the ground inside the configured lime-circle radius and can re-arm only after the airborne/outside-radius condition is met again.
- The departure/restart procedure arms when approach is disarmed and is suppressed as soon as approach re-arms, preventing competing `VAR1` writes during a return or restart.
- Wind repositioning workers may now arm at 500 m from the relevant landing/meeting spot; their existing wind-facing logic is otherwise unchanged.
- Added the four arming flags to the debug/reset paths and reset them when the controlled object disappears.

## Marshal restart/departure sequencing - release 0.997 35

- Advanced the release title to `0.997 35`; the artifact remains `everywhere_all.json`.
- Added a non-blocking restart state machine for both `marshall` and `pisteur3`: with the helicopter on ground, rotor RPM at or below 5% and either first fuel pump primed, `VAR1=2` engages the rotor; above 50% the marshal holds `VAR1=1` until RPM exceeds 90%.
- After RPM exceeds 90%, `VAR1=7` commands movement up until the helicopter leaves the ground. The marshal then holds `VAR1=3` (hover) for 2 seconds before selecting a departure signal.
- Departure direction now uses the active route destination (`RTB_location`, `hospital`, or `hospital_user`) relative to the marshal's facing bearing. Because the marshal faces the helicopter, the longitudinal indications are inverted as requested: a target in the marshal-forward sector uses `VAR1=12` rear, while the opposite sector uses `VAR1=11` straight/forward; lateral sectors use `VAR1=9` left and `10` right. Missing route locations fall back safely to the inverted forward/rear default (`VAR1=12`).
- Restart state is polled without `wait_for` calls, reset when the controlled object disappears, and re-armed for a later low-RPM/pump-primed return.
- The pre-existing wind-orientation threads and normal landing guidance remain unchanged.

## Marshal guidance sequencing and late-return support - release 0.997 34

- Advanced the release title to `0.997 34`; the artifact remains `everywhere_all.json`.
- Removed the upper `MISSION_PHASE` limits from both the `marshall` and `pisteur3` guidance monitors. The monitors remain available while their objects exist and re-arm when an object is recreated, so a return to the scene is not blocked by mission phase.
- Reduced the normal signal-animation hold from 2 seconds to 1 second. The first hover signal in the slow/close approach envelope is deliberately held for 2 seconds before the descent signal.
- Increased the no-lateral-correction buffer from 5 m to 7 m and changed the ground-speed transition from 2 kt to 3 kt.
- Added explicit hover-state tracking to the debug/reset paths. When the helicopter enters the close/slow envelope without a prior hover signal, `VAR 1 = 3` is held for 2 seconds, then `VAR 1 = 8` signals descent; at or below 10 ft under the descent conditions, `VAR 1 = 4` signals land.
- Left the two pre-existing wind-orientation threads unchanged.

## Debug-page dynamic variable cleanup - release 0.997 33

- Advanced the release title to `0.997 33`; the artifact remains `everywhere_all.json`.
- Removed debug-page entries that attempted to resolve dynamic LVAR names built from `local:VCP` or `local:HXX`, plus the dynamic `rescuetrack_{local:rescuetrack_id}` local.
- Kept the mission logic and all static local/LVAR debug entries unchanged; only the incompatible dynamic-variable display entries were removed.

## Marshal activation and non-blocking guidance - release 0.997 32

- Advanced the release title to `0.997 32`; the artifact remains `everywhere_all.json`.
- Corrected the marshal and `pisteur3` approach bearing: the behind-marshal test now compares the helicopter bearing with the marshaller's actual facing direction, rather than the helicopter's own heading. The wind-orientation threads remain unchanged.
- Enforced the existing approach gate of 150 m and below 100 ft before a guidance signal is emitted.
- Removed blocking rotor-RPM waits from the marshal animation monitor. Engage-rotor signalling is now polled, so a prime-pump transition cannot leave the guidance monitor permanently stalled; the signal is cleared as soon as rotor RPM exceeds 5%.
- Added facing bearings to the debug output and reset them at Objective 1.

## External custom SAR handoff and save/load audit - release 0.997 31

- Advanced the release title to `0.997 31`; the artifact remains `everywhere_all.json`.
- Audited the autosave and three manual-slot contract. Manual slots already persist mission identifiers, patient/pathology values, scene coordinates, heading, SAR start coordinates, VFX/casualty state, and rescue-vehicle availability.
- Kept the defensive `TEMPaccident_description` and `TEMPSAR` slot copies, while confirming that standard mission `SAR` is regenerated from `VAR_MISSION_NUMBER`/`CUS_ID_CARD` by `missionupdate CUSTOM`.
- Changed `accident location pregenerator CUSTOM` to use that regenerated local `SAR` value instead of the persistent `TEMPSAR` global. An externally launched custom mission therefore cannot inherit a stale/missing autosave SAR flag when its standard accident ID already defines the correct value.
- Confirmed that slot labels/validity flags are UI metadata and that scene elevation is preview-only; static accident metadata is regenerated from the mission ID and variant.
- Documented the supported semantic reload boundary: active object positions, running threads, operational phases, timers, landing-spot changes, and vehicle positions are not serialized by the current Mission System save model.

## Prime-pump engine-start guard - release 0.997 29

- Advanced the release title to 0.997 29; the artifact remains everywhere_all.json.
- Removed the deferred marshal wait from the engine1 and engine2 macros.
- Prime-pump monitor threads now apply the engine-start conditions immediately after the switch transition. If marshal ground operations or pisteur3 guidance is active at that instant, the request is discarded and cannot restart later.
- The existing pump waits are used only to detect the switch transition; they no longer queue an engine start.
- Added complete debug-page coverage for all static and dynamic local/LVAR references used by the mission.

## Closest waypoint route split - release 0.997 27

- Advanced the release title to `0.997 27`; the artifact remains `everywhere_all.json`.
- Split every multi-`closest` `drive_object` route into sequential single-waypoint drives, covering routes with two, three, and four dynamic closest waypoints.
- Inserted the documented standing state between segments: HEMS walking without/with backpack (2/3) returns to standing without/with backpack (0/1), stretcher walking without/with patient (10/11) returns to standing stretcher without/with patient (12/13), and pilot walking (16) returns to pilot standing (14).
- Kept the existing object-specific animation states and did not use a blanket VAR1 reset to zero. Routes with only one closest waypoint followed by fixed waypoints were intentionally left unchanged.

## Marshal altitude and landing guidance - release 0.997 22

- Advanced the release title to `0.997 22`; the artifact remains `everywhere_all.json`.
- Corrected the marshal and `pisteur3` vertical guidance thresholds: above 60 ft they signal descent, between 30 and 60 ft they retain only horizontal guidance, and below 30 ft they signal climb unless already within 5 m of the landing spot.
- Added the 5 m hover band and the under-2-knot descent condition, using GPS ground speed as the all-direction movement check.
- Cleared the marshal signal after touchdown while preserving the existing rotor-deceleration and restart logic; guidance becomes active again after takeoff.

## Final statistics cleanup - release 0.997 21

- Advanced the release title to `0.997 21`; the artifact remains `everywhere_all.json`.
- Removed the redundant `1 deceased on scene - total casualties` line from the pink end-of-mission statistics view. Operational deceased reports and casualty accounting remain unchanged.

## 3-crew pilot animation correction - release 0.997 20

- Advanced the release title to `0.997 20`; the artifact remains `everywhere_all.json`.
- Corrected the 3-crew `pax3` pilot state after the poordead approach: it now returns to the pilot idle state (`VAR 1 = 14`) instead of entering the crew-only animation state used by the other cabin members.

## Marshal guidance and VFXA placement - release 0.997 19

- Advanced the release title to `0.997 19`; the artifact remains `everywhere_all.json`.
- Kept the marshal's departure-direction mapping unchanged; inverted only the lateral approach indications.
- Suppressed lateral/vertical approach guidance when the landing spot is behind the marshal, lowered the lateral correction threshold from 7 m to 2 m, widened the approach-height band to keep a 10 ft buffer, and added a land signal for a grounded helicopter within 15 m.
- Paused the existing wind-facing orientation loops within 60 m until one minute after takeoff without changing their bearing formulas.
- Corrected custom VFXA placement to use the exact custom VFX coordinates instead of a 1 m/10 degree offset.
- Removed stale OBJECT1-OBJECT15 and VFXA instances at Objective 1, and reset the corresponding custom-object locals before each dispatch to prevent overlap with a previous scene.
- Reworked the 3-crew and 4/5-crew stretcher return paths to use side-of-helicopter bearing2 waypoints and a single four-waypoint drive ending at `rpaxdoor`, with VAR1 reset after the drive.

## Pathology/VFX compatibility and Halloween fallback - release 0.997 18

- Advanced the release title to `0.997 18`; the artifact remains `everywhere_all.json`.
- Kept the VFX contract identical in random, custom, and multiplayer dispatches: `yes` uses 0-36, `forced` uses 5-13, and `no` uses 100 (no effect).
- Decoupled pathology selection from the scene VFX randomizer: ordinary `random_fire` values now prefer non-fire pathology records, while only `forced` prefers fire records.
- Added a bounded relaxation pass that accepts an available fire state when the preferred state is absent, preventing the old 800/100-attempt fallback caused solely by a fire-field mismatch.
- Added a final sex-relaxation pass that aligns `SEX1` with the selected pathology record before the later `random injured` object-selection macro runs. Worker scenes are explicitly synchronized to male before pathology selection, so the created injured object and pathology no longer race on sex.
- Added a readiness handoff before the mission scene macros start, so `random injured` cannot create `injured_human` while the pathology thread is still selecting `SEX1`.
- Normalized missing or out-of-range standard pathology types to the available `health1`-`health107` range before selection, leaving fallback only for genuinely unavailable health data.
- Normalized Halloween pathology types outside the existing `healthhalloween` type range to a valid 0-29 type before selection, while retaining the same fallback values for genuinely missing data.

## Autosave pathology persistence - release 0.997 17

- Advanced the release title to `0.997 17`; the artifact remains `everywhere_all.json`.
- Diagnosed the missing `TEMPPATHOLOGY1` condition: `savetemp` could run while the asynchronous pathology-selection thread was still populating `generic_pathology1`, causing a `null` global assignment and no persisted key.
- Added a bounded pathology-readiness handoff before autosave, so `savetemp` waits briefly for the selector without introducing an unbounded wait.
- Added a shared patient-1 fallback guard used by both pathology engines and by autosave. If the pathology local is still null, the agreed fallback values are written directly before `TEMPPATHOLOGY1` and the related health globals are saved.
- Reset the readiness and pathology session locals in Objective 1 so a previous dispatch cannot be mistaken for the current one.

## Initial audit and macro refactoring

- Audited the mission JSON for syntax errors, duplicate JSON keys, unresolved static macro calls, repeated command blocks, unsafe object operations, and formatting inconsistencies.
- Preserved the HPG H145 Mission System API model and distinguished ordinary commands from complex `if`, `and`, `or`, query, route, and thread structures.
- Extracted exact repeated command blocks into shared macros when the repetition was large enough to improve maintainability.
- Consolidated repeated arrival and patient-transfer sequences, including shared user-destination handling and shared patient-transfer-at-arrival handling.
- Extended common macro areas where surrounding commands were also identical, while retaining parameters only where the referenced API accepts them.
- Added parameterized patient wait handling and an extended ambulance departure/travel macro with speed parameters.
- Repaired the macro container in the extended file so generated macros are stored under `macros` and are actually callable by the mission system.
- Added context-specific wrappers for repeated police pickup and manual hospital-destination setup sequences.
- Produced structural audit reports for repeated blocks, macro references, macro extension candidates, and orphan macros.

## Parameter and API validation

- Created a dedicated slider test mission with a briefing slider from 0 to 10.
- The slider creates a speed parameter and invokes a parameterized macro that moves an `Airbus H145 Police Car` 20 m at bearing 0.
- Added a `VELOCITY Z = 0` guard to prevent overlapping macro launches.
- Runtime testing confirmed that the speed parameter is correctly passed and used by the tested movement API.
- The implementation remains conservative with APIs that do not support `param`, `local`, or `global` values.

## Three-crew skid landing

- Added the `3 crew SKID LDG` flow and exposed it from both skid-landing action variants when `CREW = 3`.
- Kept the complete skid-landing safety envelope: collective, ground speed, ground state, radio height, and landing-zone distance checks.
- Deboarded only `hoist_crew` for the three-crew configuration, representing the PAX3 cabin member at station 6.
- Added support for one, two, and three victims while preserving the existing patient-visit and stabilization flow.
- Added patient loading by hoist when the patient is transported by helicopter, including temporary copilot relocation to PAX2, station-weight changes, hoist operation, and restoration of the copilot state after loading.
- Added the final transport branches for `us`, `ambulance`, `ambudoc`, and the no-ambulance fallback from `lethimdie` to `us`.
- In the `ambudoc` branch, the PAX3 crew member remains the doctor transported by ambulance and is not incorrectly returned to the helicopter.
- Preserved ambulance and ground-medical return paths, including a second skid landing when the cabin crew must be collected.

## Runtime safety and error handling

- Added object-existence guards around destruction and nearby object operations for the main patient, crew, stretcher, medical, and heli-rescuer paths.
- Prevented `randomize` from entering an infinite search when no accident is enabled.
- Added a short red error indicator in briefing or mission dispatch for the zero-active-mission condition.
- Kept mission errors out of `RESCUE_TRACK`; mission errors are displayed through the dedicated briefing or dispatch error indicator instead of normal rescue messaging.
- Added final-message handling for `poordead`: the display can report an additional deceased person without incrementing `HELOVICTIMS` and without corrupting victim-count logic.
- Synchronized the second ambulance startup with the `ambulance2clearance` state after `ambugo` creation, avoiding a race in `drive_object` and `speedMultiplier` handling without adding an extra OSM route.
- Fixed the nested condition structures that caused the Mission System "missing operator" error. `show_condition` expressions use `and` only; alternative visibility cases are represented by separate equivalent actions where required.
- Added deterministic pathology fallback records after the random selector retry limit. The fallback is used instead of the last incompatible random record and carries the agreed neutral values for identity, symptoms, diagnosis, score, SpO2, BPM, and deterioration rate.

## Dispatch cancellation and mission lifecycle

- Added the persistent `CANCELTHRESHOLD` global with a default of 80 when it is `NULL`.
- Added a settings slider that can set the threshold from 50 to 100.
- Added delayed dispatch cancellation evaluation after rescue vehicles arrive, using a random delay of approximately 1 to 3 minutes.
- Cancellation requires sufficient rescue capacity for the victims and lifescores above the configured threshold.
- Added the RescueTrack notification that HEMS intervention is no longer required.
- Guarded ground-service messages that claim HEMS is required so they are not emitted after the cancellation criteria are already satisfied.
- Removed duplicate victim-count messages from briefing and dispatch views while retaining the single red victim indicator.
- Added cancellation handling that advances the mission to the correct dispatch phase and enables the return-to-base flow.
- Added cancellation statistics, including reset, increment, and display in the statistics page.
- Added reset handling for startup locals, LVARs, and persistent globals used by dispatch cancellation, arrival states, messages, and statistics.
- Added the cancelled-dispatch global to the statistics reset path and included the relevant variables on the debug page.
- Arrival evaluation accepts the existing operational flags rather than relying only on distance:
  - Ambulance: `ambu1arrived`, `AMBU_AVAIL`, and `L:VARAMBUAVAIL`.
  - Police: `poli1arrived`/`poli7arrived`, `POLICE_AVAIL`, and `L:VARPOLICEAVAIL`.
  - Fire engine: `fire1arrived`, `FIREENGINE_AVAIL`, and `L:VARFIREAVAIL`.
- Arrival flags are intended to be published only after the vehicle has completed its final stop and parking maneuver.

## Ambulance pre-visit flow

- Added the optional pre-visit path for a single patient when ambulance and police are present, the helicopter has not yet landed, and the lifescore is above 40.
- The path waits until both ground services have been present for the required interval before starting.
- `ambustretcher` loads the patient into the ambulance while `ambumedic` remains on scene awaiting HEMS.
- When HEMS arrives, the remaining crew follows the normal approach and transport branches.
- Added the RescueTrack status message reporting that the patient is loaded and awaiting HEMS when the dispatch is not cancelled.
- The ambulance loading decision is independent of later dispatch cancellation; a high lifescore may still cancel the HEMS dispatch after the patient has been loaded.
- Prevented police-only arrival from selecting the ambulance transport branch; the pre-visit police requirement remains separate from transport availability.

## EU Firefighter marshaller support - release 0.997 14

- Advanced the release title to `0.997 14`; the artifact remains `everywhere_all.json`.
- Added addon detection for `/VFS/SimObjects/Airplanes/68ponyGT_EU_Firefighter1/aircraft.cfg` and stored the result in `68pony_marshal`.
- When the addon is available, `marshall` and `pisteur3` are created as `EU Firefighter 1`, with `Airbus H145 FR Pisteur 1` as the title fallback. The original marshaller titles remain the fallback when the addon is not installed.
- Added the EU Firefighter `VAR2` mask state for fire scenes and `VAR1` signals for idle, hover, land, directional correction, rotor engagement, and departure. Halloween fool mode continues to use `VAR1 = 100`.
- Added monitored approach guidance using the landing spot or heli-rescuer location, altitude bands, axis-priority corrections, tolerance timing, landing indication, prime-pump rotor engagement, and wind-relative departure signals.
- Limited approach signalling to the final 150 m while below 100 ft. Departure signalling is held only until 50 ft or 70 m from the relevant spot, then the marshaller returns to idle.
- Added session resets, debug-page values, and engine-start guards while marshaller guidance is active.
- Preserved the two existing delayed monitor threads that move/orient the marshallers according to wind. They were not replaced or modified; the new VAR1/VAR2 guidance runs alongside them.
- Corrected officer-clearance routes by resolving each vehicle-to-patient bearing into a parameter before using it as a `bearing2` drive waypoint, matching the working train/midway pattern and avoiding unsupported inline bearing queries.
- Re-armed airborne marshaller guidance when a previously settled position is left before departure, so VAR1 is recalculated continuously instead of remaining on the last descent signal.

## Route delivery hardening - release 0.997 15

- Advanced the release title to `0.997 15`; the artifact remains `everywhere_all.json`.
- Hardened `routeupdate` by snapshotting the destination, checking that the target is not null and that `has_location` resolves it before attempting navigation.
- Added `try`/`catch` handling with one delayed retry for the automatic FMS `set_route` path, plus a local diagnostic status for missing or failed targets. Invalid targets now clear the route and map line without aborting the mission thread.
- Serialized concurrent `routeupdate` calls with a session lock so an older delayed update cannot overwrite a newer dispatch target during the two-second handoff.
- Applied the same location validation and guarded retry behavior to the manual direct-to button, heli-rescuer flight-plan selection, delayed tablet flight-plan updates, and RescueTrack waypoint activation.
- Updated manual route-preview lines to use the validated route snapshot and prevented them from being drawn when the snapshot is invalid.
- Added `routeupdate_target`, `routeupdate_valid`, `routeupdate_error`, and the captured Mission System `$ERROR` detail to the Objective 1 session reset and grouped debug page.
- Kept the intended `NOCONNEXT` behavior: `0` sends an FMS direct-to, `1` clears the FMS route and draws the manual map line, and `2` clears the FMS route without drawing a line.

## Pathology fallback correction - release 0.997 16

- Advanced the release title to `0.997 16`; the artifact remains `everywhere_all.json`.
- Fixed the fallback error caused by assigning a plain object literal to the `myhealth1`, `myhealth2`, and `myhealth3` parameters. The Mission System interpreted the object as a query expression and failed on the unknown `id` key.
- Fallback branches now assign the agreed values directly to the patient locals: `No info received`, `Undetermined`, lifescore randomized from 30-90, SpO2 97, BPM 70, and deterioration rate 1. Age range locals are cleared so the normal age fallback remains deterministic.
- Applied the same direct-local fallback to standard, secondary, and Halloween pathology selection for patients 1-3.
- Restored the requested pathology formatting: simple commands remain single-line and complex fallback IF blocks are multiline and consistently indented.

## Ambulance distance handling and secondary ambulance rescue - release 0.997 10

- Release title advanced to `0.997 10`; the artifact remains `everywhere_all.json`.
- Added a post-parking distance measurement for the ambulance pre-visit monitor. The same check covers the closest-ambulance alias because that flow also parks as `ambulance1`.
- Disabled patient pre-load when the parked ambulance is more than 600 m from the accident, including when VFXA or weather would otherwise force loading.
- Added a direct `Unload to ambulance` destination action for an arrived normal ambulance measured beyond 600 m. The existing closest-ambulance unload path remains available.
- Added closest-ambulance police crew transfer logic. When the stopped `police7` is within 600 m, the crew can board, travel to the landing spot, return to the closest ambulance meeting point, and continue to the scene. Beyond 600 m, the normal walking path is retained.
- Added a second-ambulance rescue controller with dedicated patient2/patient3 branches. The second crew visits and obligatorily loads a remaining patient, then departs to `hospital_user` only after the visit/load completes and ambulance1 has received its destination. With `poordead` present, departure waits for at least one available police or fire unit.
- Reset all new distance, transfer, destination, and secondary-ambulance locals in Objective 1.
- Added the new locals to the grouped debug page sections.
- Restored the hand-formatted layout: simple API commands are kept on one line, complex APIs and IF structures remain multiline, and blank lines separate macro categories.

## Drive watchdogs and failure dispatch

- Added per-rescue-vehicle watchdog wrappers around critical `drive_object` calls. They run movement asynchronously, catch command errors, apply timeouts, publish terminal state, and use a guarded terminal-waypoint `move_object` fallback.
- Replaced the sequential failure-engine `if` chain with a single `switch` dispatch while preserving all failure side effects and common timing.

## Health-data fallback (issue 11)

- Health records that omit optional dispatch data are normalized to a safe fallback before they are consumed by the mission flow: `id` `No info received`, `smoke` `no`, `fire` `no`, `medical_symptoms` `No info received`, `diagnosis` `Undetermined`, `scoremin` 30, `scoremax` 90, `decr_rate` 1, `spo2` 97, and `bpm` 70.
- Existing values remain unchanged; the fallback is applied only to missing fields so authored pathology data is preserved.

## Rescue-vehicle movement and parking

- Audited all ambulance, police, and fire-engine movement macros for unnecessary reversals and duplicate movement commands.
- Preserved scene-specific stop distances, including `police1stopdistance`, `ambu1stopdistance`, `ambu2stopdistance`, `fire1stopdistance`, and `fire2stopdistance`.
- Added final-stop arrival state handling so a vehicle is marked available only after it has actually stopped.
- Added mandatory side-parking maneuvers using scene waypoints and alternating sides where possible.
- Added fallback behavior when the road ends before the nominal stop distance.
- Preserved separation from other vehicles and from `injured_human`, with a minimum patient clearance target of 5 m and the existing inter-vehicle spacing rules.
- Kept the normal scene order from the scene outward: fire engine, ambulance, then police, while adapting to subsets of vehicles that are actually present.
- Removed the invalid `copy_location`/parameterized-location patterns that caused `unknown locRef: vehicle` errors.
- Avoided adding new OSM routes solely to solve parking or spacing.

## Custom landing-zone police prepositioning

- Added early police prepositioning when a custom landing spot is beyond `police_bring_crew_min_dist`.
- The police car travels toward `POLWP` near the landing-spot center, using a minimum 20 m separation from the center.
- The landing-spot selection action is locked while the police vehicle is moving and released when the vehicle reaches its destination.
- Added a delayed police departure notice: RescueTrack and tablet notification after approximately 3 seconds, followed by movement after approximately 5 seconds.
- Ensured the officer is inside the car before the car moves.
- Kept one officer in the vehicle while `policeman2` remains at the scene; if necessary, `policeman2` is recreated or repositioned at a safe distance from rescue vehicles.
- Added the forced pickup path for distant custom landing spots and for actual helicopter positions that exceed the transfer threshold, even when the helicopter is inside the landing-zone area.
- Restored the complete police transfer sequence: crew approaches the car, boards, becomes visually hidden, the car returns to the scene, and the crew is recreated and continues on foot.
- Added waiting messages for the police vehicle at the landing zone.
- Removed use of `copy_location` and parameterized `create_location` in this path.

## Dispatch map and refueling behavior

- Repaired accident pre-location refresh so `Next Dispatch` updates the map icon position, not only its icon shape.
- Added cleanup of stale dispatch icons before a new dispatch is displayed.
- Prevented refueling from being started multiple times by slider movement.
- Added a 2-second debounce before the refueling macro can start.
- Preserved the user's latest landing-spot/drop-distance changes when generating releases.

## Heli-rescuer drop and three-crew synchronization

- Added `DROP HELIRESCUER HERE` for base, hospital, and user-selected hospital destinations.
- The action is offered when the helicopter is on the ground at the active destination and heli-rescuers are still onboard.
- The drop flow follows the heli-rescuer to the selected destination and disables the normal return-to-drop-point action after selection.
- The current release preserves the user's widened drop readiness tolerance of 500 m in `helirescuers_drop_here_monitor`.
- In the final three-crew skid flow, `HOLDHOISTED` is consumed at deboarding and published only after the complete ground-operations branch finishes.
- The heli-rescuer is therefore repositioned under the helicopter only during final reboarding, not between the initial four securing movements and the medical work.
- Added explicit closure of both cabin doors at the end of heli-rescuer ground, hoist, boarding, and three-crew skid branches.
- Moved hoist arming ahead of close-contact positioning in both the three-crew patient-hoist path and the heli-rescuer drop-hoist path.
- Ordered the three-crew patient hoist hand-off as: hoist at ground, short random delay, stretcher visible, ground patient destroyed, short random delay, ground operator destroyed and operator visible on the hoist, one-second delay, then hoist-up.
- Added `has_object` guards to the patient and operator destruction steps.
- Added the final three-crew signal that allows the heli-rescuer reboarding thread to complete.
- Fixed final deboarding synchronization for the three-crew doctor (`pax3`). The crew member no longer waits indefinitely on the global `L:HOLD` state when a service vehicle is present; the vehicle handoff now uses a bounded 2-5 second pause so a stale or failed service-vehicle route cannot leave the doctor frozen at the aircraft.
- Applied the same bounded handoff to the pilot and copilot deboarding branches so the fix is consistent for 3-, 4-, and 5-crew returns.
- Removed a fragile alternate wait from the user-hospital arrival thread. Hospital medical staff are released when the helicopter reaches `hospital_user`, avoiding a branch that could leave `ambumedic` stationary when the optional ambulance state changed first.
- Heli-rescuer destination following now runs in a worker thread after destination locations are available; at base it prefers `servicecar2` when present and otherwise follows the remaining cabin crew.

## Formatting, release and validation rules

- Simple API commands remain on one line where practical; complex APIs and nested conditions remain multiline.
- Blank lines between macro categories were restored for readability.
- Text uses the ASCII hyphen `-`; incompatible long dash characters are excluded.
- Release titles use the progressive suffix format `0.997 N`.
- The release 0.997 17 output contains 500 macros and passes JSON parsing.
- Static analysis still reports the inherited references `beforetockl` and dynamic `ELT {local:ELT}`; they were not changed without runtime confirmation because they may be system or dynamically expanded macros.
