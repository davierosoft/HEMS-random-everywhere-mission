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
- Added `HANDOFF_SOL_MULTI_PATIENT_ARCHITECTURE.md` as a separate, non-implementation design handoff for the future five-patient triage refactor.

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
