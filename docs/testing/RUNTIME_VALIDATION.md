# HPG/MSFS runtime validation

These are maintained manual scenarios whose object choreography, UI timing, simulator assets, or HPG execution cannot be proven by static validators. Run only the sections affected by a change and record the result with the release.

## Inactive multi-patient registry compatibility check

- Setup: open Debug Center, then MULTI-PATIENT REGISTRY DIAGNOSTICS. This preparatory build leaves the live P1-P3 scene and transport logic unchanged; it does not enable five patients.
- Run RUN NON-DESTRUCTIVE SDK CHECK. A single press now runs five separate probe calls and expects `PASS: 5/5 fresh-record and history checks`. Press again without reloading: it must again pass five checks, not accumulate history from the previous invocation. No casualty, crew object, door, rotor wait, clinical record, or mission phase may change.
- The saved `patient_registry.sdk_samples` array (inside the JSON string) must contain exactly five samples numbered 1-5. Each must report `value_before=0`, `value_after=1`, `history_before=0`, `history_after=1`, `other_history=0`, and `passed=1`. A failed comparison retains its actual values; an exception retains the error text. Do not infer a simulator-side cause from the old combined FAIL message alone.
- The SDK check saves its result automatically: the page must show both SDK CHECK and REGISTRY SNAPSHOT without `no call_site but used param`. Reopen the page to confirm the result remains readable.
- Return to Debug and capture a snapshot. Close/reopen Debug and inspect `Andrews_debug_snapshots`: the main snapshot must remain valid and the `patient_registry` key must contain the SDK result and registry diagnostics. The main snapshot is committed before this optional extension; a registry failure must not stop or invalidate it. Clear Snapshot and verify that key is cleared as well. The diagnostic check is not a five-patient simulator sign-off.

## CARLS direction finder

1. Open DF on a remembered preset, press `1` once, and verify ESC plus `EDT: 1_#.###` appear immediately.
2. Leave a partial digit sequence for at least five seconds. Editing must cancel and the prior frequency/source/modulation must return.
3. Enter `121500` without pauses. Verify intermediate templates, ESC remains available, and automatic confirmation as MAN 121.500 AM after five seconds.
4. Enter illegal prefix/grid values. They must show ILLEGAL, never tune, discard the invalid digit, and after 1.5 seconds return to EDT at that same digit; the accepted channel remains unchanged.
5. Test IAD/MAD/MAR, UHF AM/FM, RTN/reopen persistence, normal/crash ELT, ambulance beacon, and doctor-pick flows.
6. Start or reload a mission whose saved CARLS channel is 123.450. At objective1 startup, before opening the DF page, confirm the active DF receiver is immediately 123.450 with no intermediate 255.000 default. Open DF and confirm it remains 123.450.
7. Confirm the tablet title matches the first CHANGELOG.en.md release heading.

## Emergency DF beacons

1. Start each PLB-labelled outdoor incident (paraglider, hiker/climber, skier, hunter, and fisherman). In AUTO, verify CARLS tunes 121.500 AM with source PLB and a bearing to injured_human; in MANUAL, the bearing appears only after tuning 121.500.
2. Verify the normal SAR beacon, crash ELT, PLB, and doctor-pick ambulance beacon remain continuously available while inside their operational range. The Debug Center SUMMARY row must show the current emergency DF status and reception range.
3. Hold at the reported range boundary for at least three update cycles. The current range must vary by up to 25 percent every 5 to 10 seconds; when outside it the bearing clears through frequency-only set_df, and when inside it returns to the correct emitting object.
4. Rescue or remove the emitting object, then confirm the bearing clears and the emergency DF range row disappears. Reload and repeat one AUTO and one MANUAL case.

## DF Stations database

1. From the mission setup page open **ADD CUSTOM HOSPITALS TO DB**, then **ADD DF STATIONS TO DB**. On a new profile only station 1 is editable; SAVE it and verify station 2 becomes available, continuing progressively through station 15.
2. Create a first custom station such as name TEST NAV, frequency 108.000, location 41.9000,12.5000, select FM deliberately, then press SAVE. Verify the result is accepted but forced to AM. Leave the page, reopen it, and reload the mission: name, frequency, modulation, location, and availability of the next slot must persist.
3. Exercise the exact boundaries and gaps: accept 108.000/117.975, 118.000/136.975, 156.000/162.000, and 225.000/399.975; reject 107.975, 117.990, 137.000, 155.975, 162.025, 224.975, 400.000 and a valid-band off-grid channel such as 225.010. Confirm NAV/ATC force AM and maritime forces FM; only UHF retains the selected AM/FM choice.
4. Confirm 121.500, 281.500, 282.575, and every displayed object frequency are rejected for a custom station. Save one valid custom channel, then try it again in another slot and confirm duplicate rejection. Invalid name or malformed/out-of-range coordinates must not enable SAVE.
5. Use SET DF for a saved custom station and verify the CARLS radio shows DB, the saved frequency/modulation, and a bearing to the entered coordinates. DELETE it, reload, and confirm its data and bearing no longer exist.
6. On a representative mission, turn ON a present object station, use SET DF, and verify a bearing to that object. Confirm OFF and unavailable objects cannot set a DF bearing. The row must read NAME: FREQUENCY MHz FM. Toggle ON/OFF, leave and reopen the page, then reload the mission: both selections must persist.
7. Use SET DF on a saved station, then on an automatic object station, and confirm in both cases that the CARLS frequency exactly matches the set_df reference. Tune a manual channel with no matching object/location and confirm the old bearing is cleared.
## CICERS provider fallback

1. With CICERS unreachable, select each manual provider: Overpass DE (0), Mail.RU (1), Kumi (2), and RATUOM OFFLINE (4). Start the CICERS health check and confirm a failed check restores the same provider in both the selector and DATAQUERYSERVICE, even if the persisted endpoint was still CICERS.
2. With CICERS selected or AUTO-TOGGLE active, make the health check fail. Confirm the result is AUTO-TOGGLE with endpoint 0 or 2, never an inactive manual provider.
3. While a CICERS health check is in progress, request a second refresh. It must not start a second ping or replace the first request's saved provider. After the first result, confirm the selected provider is correct.
4. With a valid CICERS key and a manual provider saved, restart twice: with **BYPASS CICERS OSM AUTO ACTIVATION = NO**, confirm CICERS is active but the saved provider remains unchanged; with **YES**, confirm the same manual provider is restored after the key check.

## Default RTC scene startup

1. Start a **default rtc** mission with MISSION_SCENE_VARIANT 3. During cabin preparation it must advance from 75% to 80%, then 85%, complete the scene setup, and continue to the normal 100% mission start without opening the DF page.
2. In **Debug Center → Test Tracker**, verify **TEST DEFAULT RTC (VARIANT 3): SCENE SPAWN CONTINUES AFTER 80%** changes from IN PROGRESS to COMPLETED. Confirm civilians can spawn without leaving PUBLIC_SELECTOR_LOCK held.

## Crew LifeScore and emergency recovery

1. Expose one ground operator to VFX/flare while another remains outside the radius. Only the exposed member loses LifeScore; the first loss reaches tablet, Dispatch, and RescueTrack.
2. Reduce one member from 11 to 10. The mission fails as `CREW_CRITICAL`, living operators board, and routing changes to the nearest hospital.
3. At the hospital, living operators use the correct door, enter the building, and the end page shows failure/shift termination without success text.
4. Force zero on each ground role and on cable-only hoist. The deceased object name remains as the packaged stretcher casualty while survivors return aboard.
5. Exercise all historical hoist-fatal branches. Each fails once without a success page or stalled thread.
6. Suppress the hospital query for at least 45 seconds. The flow announces fallback, routes to base, and completes deboarding.

## Debug and persistence

1. Open all Debug views before dispatch and during representative mission phases with and without ambulance, police, heli-rescuer, marshal, multiple patients, route failure, and query failure.
2. Capture a snapshot, close/reopen Debug, reload the mission, and accept a second dispatch. The record stays frozen until Capture; Clear remains cleared after reload. Confirm the snapshot records local date and clock time, while its mission timer is shown separately.
3. Compare INVENTORY with changed state machines and confirm new or renamed state is visible in the appropriate operational view.
4. Capture during preflight, scene preparation, patient transfer, and mission end. Reopen the saved Debug_Table file and verify COMMON, SUMMARY, MISSION, MEDICAL, GROUND, GUIDANCE, and INVENTORY are present in that order, including values currently hidden by page conditions.

## Release test tracker

1. Open **Debug Center**, then **OPEN TEST TRACKER**. The page defaults to ALL and can be filtered by GROUND, MEDICAL, HOIST, GUIDANCE, SYSTEMS, or SETTINGS. Its rows follow mission order: setup, start, dispatch, scene, recovery, destination, and end.
2. A not-yet-run test is white. Its first instrumented code execution persists **IN PROGRESS** in the Debug table and turns that row yellow. When its monitored sequence ends, the persisted state becomes **COMPLETED**. Tests with required choices stay yellow and list the choices still to test.
3. For every completed row, select **SUCCESSFUL** after observing the expected result. Select **FAILED** when it does not meet the test; enter a comment and save it. The result and failed comment survive closing/reopening Debug and mission reload.
4. Run only rows whose parenthesized conditions match the scenario, for example P2/P3, 3 CREW, ACTIVE crew health, or EU Firefighter addon installed. The tracker records code execution, while the tester remains responsible for judging the simulator result.

## Multi-patient, ambulance, and mission presets

### Shared crew visits and P1-P3 transport (PENDING)

- With three present unassigned patients, try each arrival order of ambulance1, ambulance2 and HEMS. Every arriving team must approach P1, P2 and P3; prior assessment by another team must not suppress its observation.
- Assign one patient before arrival, then another while the crew is walking. Confirm no assessment starts for the assigned patient; inspect the per-crew state in Debug.
- Repeat in AUTO and MANUAL, with 3/4/5 crew, ordinary ground operations, skid and hoist. Check that assistants walk with the correct HEMS/pilot role and stop on the opposite cardinal side of the patient.
- Preserve already completed treatment steps during a later crew's timed reassessment. Confirm no duplicate treatment effects or reset procedure counts.
- Remove or block an actor during a visit in a developer scenario. No completed assessment may be reported without physical arrival. Reset the dispatch during a busy observation and verify the previous worker does not visit a new scene.
- Cross the three patient slots with ambulance1, ambulance2 and HEMS. For each of the nine combinations, arrange the target as the only unassigned suitable patient. Confirm the chosen object is packed, its own record closes, and neither other patient's score nor identity changes. Repeat HEMS loading with 3/4/5 crew in ground, skid and hoist operations; retain rotor, door and crew-role checks.
- In MANUAL, let the ambulance finish its initial actions, then visit with HEMS. Resume at the next untreated phase. Attempt confirmation while an action is in progress: allocation must remain blocked. Finish the last action for each slot, including P1, and confirm that the transport choice becomes usable.
- With fewer ambulances than casualties and one patient outside the existing ground criteria, verify that shortage does not make that patient ground-suitable. Let both ambulances request the same last eligible patient; only one may load it. Re-enter the HEMS selector during loading and verify its ticket stays on the same patient.
- Temporarily shelter P1 in ambulance1 before HEMS arrival. Follow the real stretcher return, then verify HEMS can physically assess the sheltered patient and subsequently assign either suitable vehicle. Shelter alone must not close the clinical record or claim transport.
- Fail movement before loading, then interrupt an active load in a developer scenario. Confirm recovery at the scene before reassignment, and rejection of the previous worker's ticket. If physical recovery cannot be completed, retain the pending state and capture the failure; never count it as delivery.
- Transport P1 first while P2/P3 remain on scene. Continue monitoring both remaining scores, perform the next rescue with their original names and objects, and finish only after all required transfers. Also repeat with P2 or P3 as the first HEMS patient and with ground transfers still travelling when HEMS reaches hospital.
- For each slot, run scene CPR and onboard mCPR with the configured equipment. Verify effects, controls and messages refer to that patient, other patients continue their own deterioration, and a reset cannot resume an old procedure. Compare Code/LifeScore progression across equivalent profiles.
- Save and reload in each preset slot during visits, reservation, loading and after delivery. Check names, pathology, completed actions and reports. Interrupted transfers must return to scene allocation with fresh tickets and visits; delivered patients must not respawn as pending casualties. Reload a different scene to verify stale patient state is rejected.
- Capture and reopen Debug during each transition. Check visit records, tour barriers, selected HEMS target, all resource tickets, pending counts and CPR slot against the visible scene. These cases require actual HPG/MSFS sign-off; static PASS is insufficient.

1. Run near/far ambulance transfer with 3-, 4-, and 5-person crews for `ambulance`, `ambudoc`, and `us`; ambulance-owned movement must not wait on unrelated HEMS state.
2. In MANUAL mode with 1-3 casualties, verify the active-patient mutex and action ownership. In AUTO, the page automatically follows the patient when HEMS starts that visit.
3. With the helicopter still airborne or hovering, put the HEMS clinician beside patient 1. In AUTO, MEDICAL ACTIONS must show the first automatic action immediately and advance through the configured actions; in MANUAL, the first procedure choices must appear immediately. Neither path requires SIM ON GROUND.
4. Let ambulance1 approach each patient. Before its medic reaches the patient, no ambulance assessment or vital signs may appear. At arrival the clinic page must show INITIAL ASSESSMENT IN PROGRESS; only after the timer completes may vital signs and the completed assessment appear. With one medic and three casualties, confirm P1, P2, and P3 are assessed in sequence. With two ambulance crews, confirm the second medic is physically created and reaches P2/P3 before its assessment. Confirm all assessments complete before any treatment continuation.
5. With 3, 4, and 5 crew, choose `us`, `ambulance`, and `ambudoc` transport. Before physical patient loading, the destination confirmation must open. Confirm a preselected hospital and verify FPL 8 plus the hospital route replace the scene FPL immediately; no second destination modal should be needed after boarding.
6. With 3, 4, and 5 crew and an ambulance stretcher, wait for `ambustretcher_returning`. Before cargo_left/cargo_right close, `hoist_crew` must walk from the rear-left return point to its 185-degree cabin position.
7. In a 3-, 4-, or 5-crew mission with a preselected hospital, select the patient transport owner. The hospital confirmation must open before patient loading. After confirmation, FPL 8 and the hospital route must be active before boarding; mark **TEST OF PRESELECTED HOSPITAL CONFIRMATION BEFORE LOADING AND FPL 8 ROUTING (3/4/5 CREW)** in the tracker.
8. After police returns from the landing-spot crew pickup, confirm both officers are at their POLMAN scene posts and facing the incident. The second officer must not remain beside the police vehicle.
9. Edit two independent presets across both list pages, close/reopen, and reload. Test single toggles, partial-category confirmation, full-category disable, and ALL MISSIONS without cross-preset rewrites.
10. With a three-person crew at base, observe the cargo loading portion of `boarding`. After the normal cargo close commands, verify both cargo doors are fully closed before pax33 continues to the passenger door. If either cargo LVAR stays nonzero, confirm the mission retries that door up to three times without blocking indefinitely.
11. During ground transport for P1, P2, and P3, confirm `ambustretcher` reaches the casualty, the casualty changes to packed state, disappears, and then appears on the stretcher before it returns to the ambulance. The casualty must never be driven or moved directly to the ambulance.
12. In the three-casualty residential fire variant, verify every casualty and HEMS medical waypoint is at `rescue_location`, the fire remains at the incident, and a fence encloses the external rescue point. Confirm both fire trucks respond and the fire object's `VAR 1` decreases until the scene is cleared.
13. With three crew, land inside the displayed green landing circle and bring NR to its normal idle value. After RESCUE OPERATION IN PROGRESS appears, confirm hoist_crew and pax3 are created and begin deboarding without a second user action.
14. In Debug Center SUMMARY, confirm the NR gate changes from `WAITING` to `PASSED` for the active ground-operation macro. Confirm `CREW SPAWN` records `LAUNCH` followed by `CREATED` for every object needed by that sequence.
15. Capture a Debug snapshot during the NR wait and again after crew creation. Reopen Debug Center SUMMARY and verify `SNAPSHOT | CREW SPAWN` and `NR GATE` retain the captured values.
16. In a developer-only test with an unavailable crew title or fallback, confirm the mission remains blocked, Debug records `FAILED` with the requested title/fallback, and the user sees `ERROR: crew creation failed`. Restore valid object titles before a normal mission test.
17. On long road-response routes to the scene, a hospital, and a midway location, record the displayed ambulance, police, and fire-engine ETA. Each vehicle must remain on its route through that ETA and may enter watchdog recovery only after ETA plus two minutes. Suppress road nodes for each destination in a developer test: recovery must use its authored approach location, stop 30 m before a hospital or 55 m before a scene, and never overlap a scene object, disappear, or jump to map coordinates 0,0. With random civilians enabled, no command error may be raised while they orient toward the primary patient.

## Patient tablet telemetry

1. In AUTO and MANUAL with three patients, complete P1/P2 visits and let an ambulance take P2 while P3 is still being visited. P2 medical details must remain available until P3's visit finishes. This UI condition must not block the ambulance itself.
2. After every visit finishes, select a ground-transported patient: show a transport summary and patient-navigation buttons, without live vitals or treatment controls. Select the helicopter patient and confirm its complete medical page still works.
3. Choose GROUND before physical handover, including a failed/cancelled loading attempt. The medical page must remain detailed. Missing data must also leave details enabled.
4. Capture a snapshot after closure, allow the underlying clinical values to change, and capture again. The closing report and its closing time must remain unchanged. Verify tablet_policy, tablet_reports, tablet_report_archive, tablet_enabled and tablet_visits in the patient_registry field.
5. Run a second dispatch and confirm previous visit/closure state is cleared. On legacy More casualties, confirm prior reports are archived and the newly promoted patient retains full details; stable-slot repeat-rescue conversion remains pending.
6. With three casualties and no active HEMS visit, use `Patient 1`, `Patient 2`, and `Patient 3` to switch records. When HEMS starts a new visit, the page must focus that patient automatically. Afterwards, selecting another patient must keep that record open until the next HEMS visit. An incomplete ambulance provider must display AMBULANCE rather than undefined.

## Aircraft Settings Profiles

1. Select CUSTOM PRST 1. In SETTINGS, open MEDICAL OPTIONS and switch PATIENT CLINICAL TREATMENT MODE between AUTOMATIC and MANUAL. Reopen CUSTOM PRST 1. The Test Tracker becomes COMPLETED only if that same mode is restored. Reload the mission and confirm the selected custom set retains the change without a save action.
2. From a factory profile, change one setting and verify CUSTOM DEFAULT receives the changed configuration. STORE PRESET ON FILE, switch to a custom slot, then use COPY SAVED PRESET TO ACTUAL SET. Confirm that the active custom slot now matches the stored configuration. The copy control must be hidden while a factory profile is active and disabled until a file copy exists.
3. Save each mission slot and confirm its visible timestamp and the STORE PRESET ON FILE timestamp use local PC time with a DD-MM-YYYY date. Delete a slot and confirm its timestamp clears.
4. Link CUSTOM PRST 1 to each MSN LIST button in turn. Confirm reassignment moves the link, and pressing the currently selected MSN LIST button removes it.
5. Confirm the linked aircraft profile loads after an interactive MSN LIST change, after a current-list reload, and after each livery-forced preset at startup.

## Ground operations NR threshold and safety bypass

1. In SETTINGS, next to the engine-switch requirement control, move **Ground operations NR threshold** to 79.0, 80.0, and 83.0. Confirm the displayed value always has one decimal place, survives closing/reopening SETTINGS, a mission reload, and saving/loading an aircraft profile.
2. At a ground-operations wait, verify NR below the configured threshold passes immediately. Then set a value above the current NR and hold NR below 84 percent for more than 30 continuous seconds: the operation must pass without changing the configured threshold.
3. Separately hold both `ECP MAIN` switches in IDLE for more than 30 continuous seconds. The operation must pass even if NR has not met the configured threshold. Interrupt either the NR-below-84 or both-IDLE condition before 30 seconds and confirm its timer restarts rather than passing early.
4. In Debug Center SUMMARY and a captured snapshot, verify the NR gate shows one `WAITING` entry followed by `PASSED`. For a safety bypass, the PASSED entry must state whether it was the below-84-percent or both-IDLE path.

## Marshal waypoint overrides and three-crew destination deboarding

1. With a generic destination hospital and the global destination marshal setting enabled, approach from more than 150 m and then land inside the guidance area. The marshal must keep its wind alignment while farther than 150 m, then must not be repositioned by wind inside 150 m.
2. Set a hospital waypoint `marshal_present` to `yes` and provide `WPMarshalLAT` and `WPMarshalLON`. With the global setting disabled, verify that one marshal spawns at those coordinates, faces the helicopter, and the global setting remains disabled after the mission.
3. Repeat for a custom hangar waypoint. With local `no`, no base marshal may spawn even if the global base setting is enabled. With local `yes`, it must spawn at the configured coordinates and face the helicopter.
4. At every hospital destination branch with three crew, follow the complete patient deboarding sequence. The object leaving `cockpit_left` must retain the pilot appearance until it returns to that door. Repeat with four and five crew and confirm the cabin crew appearance remains unchanged.

## Release record

Record mission build, simulator/HPG version, scenario sections run, result, screenshots/log location, and any intentionally deferred scenario. Do not convert a static validator result into runtime PASS.
