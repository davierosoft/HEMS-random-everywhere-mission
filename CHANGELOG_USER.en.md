# HEMS Random Everywhere Missions - User Changelog

This is the final-user record for all work from the July 0.997 baseline: **0.997 1 through 0.997 142**, plus the GitHub development checkpoint made after 142. It lists final visible behavior only. A behavior appears once in its most relevant category; later corrections are retained in its build history instead of being repeated as separate entries.

Every item has a short simulator check. Static validation is not simulator sign-off. The post-142 work remains runtime PENDING until it has been tested in MSFS.

## FIXES

### Mission creation and safe fallback

- Scene creation no longer loops forever when no mission is enabled, and incomplete pathology data resolves to a usable neutral clinical record instead of breaking the dispatch.
- **Build history:** 0.997 1-13, 16-18.
- **Test:** Disable all missions, then create a dispatch with incomplete pathology data; the tablet must show a clear error or a usable fallback, never stall.

### Rescue-vehicle movement, parking and watchdog recovery

- Ambulances, police and fire engines now announce arrival only after their final stop, keep the requested patient/vehicle clearance, use scene parking waypoints, and use guarded recovery when a critical road movement fails.
- **Build history:** 0.997 1-13, 46, 75, 130.
- **Test:** Run road, closest-service and custom-landing-zone calls; verify vehicles stop beside the scene rather than at the world origin or overlapping casualties.

### Valid route delivery and rejected map selections

- A missing or rejected destination cannot overwrite an accepted route, leave a stale map line, or abort the mission. Validated route targets are retried safely when needed.
- **Build history:** 0.997 15, 75, 130.
- **Test:** Accept a landing spot, open the selector again and reject it; the previous route and landing marker must remain unchanged.

### Ambulance distance and second-ambulance handling

- A far ambulance is measured after parking, avoids inappropriate preload, offers the correct unloading alternative, and a second ambulance can complete its own patient rescue without departing early.
- **Build history:** 0.997 10, 65, post-142 checkpoint.
- **Test:** Create a three-patient call with two ambulances at different distances; verify each vehicle follows the correct transport sequence.

### Ambulance clinical handover and assessment completeness

- Ground medics assess every eligible patient before HEMS arrival when time permits. HEMS prioritizes already assessed severe patients; each record has a defined ambulance state rather than `undefined`.
- **Build history:** 0.997 67, 77, 91, 104, 106, 127, 138, post-142 checkpoint.
- **Test:** Land late at a multi-patient scene with one medic; verify each patient has an assessment or HEMS starts with the highest-priority assessed patient.

### Physical ambulance stretcher transfer

- Ambulance transport uses the ambustretcher workflow: incompatible casualties are converted at the same position and bearing, compatible injured_human states are packed, then the patient appears on the stretcher instead of being dragged by a drive command.
- **Build history:** 0.997 65, 91, 138, post-142 checkpoint.
- **Test:** Let an ambulance take a non-HEMS patient; verify the patient is packed and moved on the stretcher, not moved directly across the ground.

### Crew choreography and three-crew pilot identity

- The three-crew copilot remains the pilot for every destination deboarding/loading sequence and only uses the documented pilot/crew animation states at the correct moments. Crew return routes are split safely between closest waypoints.
- **Build history:** 0.997 20, 27, 40-42, 118-122, 142.
- **Test:** Complete hospital unloading with three crew, then return to the helicopter; the copilot must be pilot throughout the patient procedure and return as pilot at the cockpit.

### Cargo-door close verification

- Boarding waits for both rear cargo doors to report closed through the aircraft-specific HXX LVAR names. A failed close is recorded by the watchdog instead of silently continuing.
- **Build history:** 0.997 118-121.
- **Test:** Run boarding repeatedly with a rear-door delay; mission progression must wait for both cargo-door confirmations.

### Crew and NR wait diagnostics

- Crew creation and the ground-operations NR gate are watched and logged. A failed crew creation stops the dependent mission with an explicit failure record; NR logging reports waiting and passed state without changing the established NR logic.
- **Build history:** 0.997 119-121.
- **Test:** Capture a Debug snapshot during crew creation and during NR ground-operations wait; verify launch/result and waiting/passed records are present.

### Objective and patient-deterioration deadlocks

- Objective 2 can initialize while the patient deterioration worker starts asynchronously. A critical patient still deteriorates with the historical timing instead of blocking the mission.
- **Build history:** 0.997 61-62.
- **Test:** Start a critical call and remain en route; the objective must activate and the patient condition must continue to change normally.

### Medical physiology and display reliability

- Vital signs, GCS, emergency code and Life Score initialize from the diagnosis profile, retain physiologically valid values for living patients, and show Not Testable components correctly rather than zeros, nulls or malformed rows.
- **Build history:** 0.997 52-57, 64-65, 81.
- **Test:** Open medical records for normal, intubated and critical patients; check BP, RR, temperature, GCS and code are populated and coherent after the assessment.

### CPR safety and completion handling

- CPR has one guarded controller, correct scene/cabin provider selection, reliable ROSC/failure outcomes and a manual STOP CPR action without concurrent duplicate procedures.
- **Build history:** 0.997 58, 64.
- **Test:** Trigger CPR on scene and, with mCPR installed, in flight; verify only one procedure runs and STOP CPR ends it permanently for that dispatch.

### Indoor and residential scene placement

- Indoor locations no longer receive outdoor privacy fences. Residential fire incidents place rescue patients at the rescue point with the public and create the required fence there, rather than leaving patients at the fire origin.
- **Build history:** 0.997 58, 65, 138, post-142 checkpoint.
- **Test:** Start an indoor case and a residential-fire case; no fence should appear indoors, while residential patients and the fence should be at the external rescue point.

### Residential fire response

- Residential fire scenes use the active forced-fire VFX lifecycle and two fire engines can reach and extinguish the actual fire location. Fire intensity is decremented by the normal VFX state rather than remaining permanently burning.
- **Build history:** 0.997 18, 138, post-142 checkpoint.
- **Test:** Run each residential mission with fire; both fire vehicles must approach the fire and the VFX must reduce after suppression.

### Direction Finder correctness and persistence

- CARLS DF no longer opens with undefined values or malformed conditions. It retains the selected automatic/manual source, validates legal bands and 25 kHz channels, and assigns a bearing only to an active mission beacon.
- **Build history:** 0.997 79, 83, 85, 88-89, 95, 99.
- **Test:** Reload after tuning DF, enter invalid and valid channels, then select IAD/MAD/MAR; the page must remain defined and the bearing must match an active source only.

### Tablet connectivity refresh

- Changing Tablet 5G immediately refreshes dispatch and briefing pages, so obsolete Wi-Fi controls cannot remain visible while 5G is active.
- **Build history:** 0.997 71, 76, 80-81, 84.
- **Test:** Toggle Tablet 5G on and off from Settings; the current page must immediately swap between 5G status and the applicable Wi-Fi action.

### Medical-page visibility and final ground record

- The Medical Diagnostic page follows Quick links in automatic mode but stays available in manual mode. Once a patient is transferred by ground ambulance, live controls close and a stable final clinical record remains.
- **Build history:** 0.997 81, 86, 126-127.
- **Test:** Collapse Quick links in both medical modes, then complete an ambulance transfer; check the page availability and final record behavior.

### Preset selection preserves individual choices

- Selecting DEFAULT or PRST 1-5 changes the displayed persistent table without bulk-reapplying categories, so manually enabled/disabled missions are not overwritten.
- **Build history:** 0.997 82, 84, 102-103.
- **Test:** Change one mission manually, switch presets and return; the individual saved choice must remain intact.

### Marshal landing and departure stability

- Marshal guidance has one non-blocking approach/departure controller with correct lateral directions, neutral centreline behavior, touchdown interlock, restart sequencing and safe movement recovery. It no longer keeps issuing wind-driven movement after landing.
- **Build history:** 0.997 14, 19, 22, 32, 34-36, 43-45, 49-50, 55, 66, 68, 78, 142.
- **Test:** Follow a complete marshal approach, land, restart and depart; ensure centreline is neutral, no signal persists after touchdown and restart directions appear once.

### Custom/base/hospital marshal location rules

- Custom, base and hospital marshal positions now use their saved guidance locations and proper custom waypoint data. A configured fixed-location marshal faces the helicopter and does not drift at close range; ordinary existing wind behavior remains active where no fixed placement is configured.
- **Build history:** 0.997 47-51, 70, 142.
- **Test:** Set a custom hangar or hospital marshal to YES with coordinates; verify its spawn position/facing and compare an ordinary non-fixed marshal wind alignment while approaching.

### Local save time and location-query compatibility

- Save timestamps use the supported local-time form and location/bearing queries use valid HPG references, preventing `query not found` and `unknown locRef` errors in affected scene generation paths.
- **Build history:** 0.997 45, 130.
- **Test:** Save a mission and trigger a railway/road scene; no command-failed banner should appear and the saved time should be local.

### Take-off checklist navigation and automation

- The Avionics/Preflight checklist advances to Before Take-off, then Before Take-off advances after the valid checks plus its review delay or the working in-page proceed control. The Take-off checklist returns to Dispatch after its final delay. Broken links, timers and continuation controls are repaired.
- **Build history:** 0.997 87-88, 135-137.
- **Test:** Complete each checklist in order; use the previous page's proceed button and also wait for the delay, then verify Take-off returns to Dispatch.

### Checklist condition accuracy

- Before Take-off and Take-off use the supplied aircraft conditions: pitch/bank are read in radians, FLI follows collective, and AEO checks the two engine torque values. Slope instructions appear first only when pitch or roll exceeds 12 degrees.
- **Build history:** 0.997 87, 135-136.
- **Test:** Test level and 13-degree slope starts with changing collective/torque; verify the correct checklist row order and completion state.

## UI

### Persistent Debug Center and ordered snapshots

- Debug Center exposes persistent snapshots with mission identity, route, crew, NR and patient diagnostics in a stable capture order. Capture works again and does not require an unavailable command parameter.
- **Build history:** 0.997 92, 108, 110-112, 123-125.
- **Test:** Capture a snapshot before and during ground operations; reopen it and verify mission, crew/NR and patient fields are saved.

### Multi-patient registry diagnostic display

- The Debug Center shows the non-destructive multi-patient registry SDK check and saves its result in the registry snapshot field. It is clearly marked preparation only while five-patient runtime activation remains incomplete.
- **Build history:** 0.997 123-125.
- **Test:** Run the SDK check and capture a snapshot; it must show a PASS/FAIL result without changing the active scene.

### Patient record selection and automatic focus

- Medical records use explicit `Patient 1`, `Patient 2` and `Patient 3` selectors. HEMS automatically focuses the patient currently being visited, while the pilot can still choose another record at any time.
- **Build history:** 0.997 91, 127, 138, post-142 checkpoint.
- **Test:** Visit multiple patients with HEMS; focus must follow the active visit, then use each selector to inspect another patient.

### Medical clinical-record layout

- The tablet presents assessment progress, ambulance handover, HEMS actions, vital signs, GCS/CODE legends and Life Score as a clear vertical record. Completed actions are green, active work is yellow, and sections do not leave empty handover text.
- **Build history:** 0.997 54-57, 65, 67-68, 77, 81.
- **Test:** Open a record before assessment, during an ambulance handover and after HEMS completion; verify the status colors and sections progress without empty data.

### GCS, vital-sign and final-record presentation

- GCS has readable E/V/M values and Not Testable representation, critical vital signs use independent rows, and the final ambulance record retains the last clinical values without live widgets.
- **Build history:** 0.997 52-57, 81.
- **Test:** Compare a critical live patient with a completed ground-transfer record; confirm no active actions remain in the final record.

### CARLS Direction Finder page

- CARLS has a dedicated DF page with stable source/frequency rows, progressive digit entry, valid ENT/ESC controls, UHF modulation control and IAD/MAD/MAR presets.
- **Build history:** 0.997 79, 83, 85, 88-89, 95, 99.
- **Test:** Open DF from CARLS, enter a valid UHF value, toggle modulation, select each preset and return to the main page.

### Tablet 5G status and homebar

- Tablet 5G uses a 5G homebar and connected status while enabled; normal Wi-Fi buttons are hidden only for that tablet connection and return when 5G is disabled.
- **Build history:** 0.997 71, 76, 80-81, 84.
- **Test:** Toggle 5G and inspect Dispatch, Briefing and a normal tablet page; exactly one appropriate connectivity presentation must be visible.

### Settings organization and persistent options

- Settings are grouped into durable options including Tablet 5G, DF tuning mode, cancellation threshold, mCPR, manual medical mode, profile options and marshal choices. Persistent selections survive normal mission reloads.
- **Build history:** 0.997 39, 47, 58, 71, 74, 83, 102-104, 113-117.
- **Test:** Change several options, start another dispatch and confirm the values persist; use Reset Defaults to restore documented defaults.

### Dispatch status, progress and statistics views

- Dispatch shows clear on-site progress, a stall warning, unique victim information, final cancellation statistics and a post-return on-duty state with an explicit END SHIFT action.
- **Build history:** 0.997 21, 59, 71-73, 100, 110.
- **Test:** Run a ground operation long enough to change milestones, intentionally pause it and complete/return; inspect progress, stall text and statistics.

### Checklist layout and navigation header

- Checklist rows use fixed-width tablet formatting with aligned `[ ]` and `[V]` marks. Each page has the full-width `<BACK> --- CHECKLIST TITLE ---` link/header, and the checklist index includes Take-off.
- **Build history:** 0.997 87-88, 135-137.
- **Test:** Open each checklist on the tablet; markers must align at the right edge and BACK must return to the checklist index.

### Technical marshal controls and map markers

- The Technical page provides clear create-in-front and create-on-custom-location marshal actions with accurate temporary map markers, while Debug shows marshal controller state safely.
- **Build history:** 0.997 47-51, 110.
- **Test:** Create each technical marshal type and inspect its marker, guidance position and Debug controller state.

### RescueTrack notifications and audio

- RescueTrack uses one central new-message signal, preserves the dedicated initial dispatch ringtone, and reports ground-service, cancellation and transport status without duplicate alerts.
- **Build history:** 0.997 68-69, 73, 77.
- **Test:** Start a realistic dispatch, receive later service updates and trigger cancellation; each later message should alert once while the first call uses its own ringtone.

## NEW FUNCTIONS

### Three-crew skid operations

- Three-crew skid landing supports one to three patients, hoist patient loading, temporary copilot placement, correct cabin weights and complete return/transport branches for helicopter, ambulance and doctor-ambulance outcomes.
- **Build history:** 0.997 1-13, 19-20, 40-42.
- **Test:** Run three-crew skid calls with one, two and three casualties and complete both helicopter and ground-transport paths.

### Heli-rescuer destination drop

- A grounded helicopter at base, hospital or user destination can use `DROP HELIRESCUER HERE`; the selected heli-rescuer follows the chosen destination and the ordinary return/drop path updates correctly.
- **Build history:** 0.997 1-13.
- **Test:** Land with heli-rescuers onboard at each supported destination and use the drop action; verify the crew stays at that destination.

### Dispatch cancellation and return-to-base

- A persistent cancellation threshold allows suitable calls to be cancelled after sufficient ground-service response, sends a RescueTrack notice, tracks the event in statistics and opens the normal return-to-base flow.
- **Build history:** 0.997 1-13.
- **Test:** Use a high-life-score scene with adequate services and wait for evaluation; confirm cancellation, statistics and RTB behavior.

### Ambulance pre-visit and non-HEMS transport

- Ambulance and police can begin a single-patient pre-visit before HEMS, loading the patient when appropriate while medical staff remain ready to hand over. Later multi-patient logic extends assessment/ground transport to all eligible patients.
- **Build history:** 0.997 1-13, 10, 67, 91, 138, post-142 checkpoint.
- **Test:** Start a delayed-HEMS call with ambulance/police; confirm ground assessment begins and HEMS receives a coherent handover.

### Patient pathology, physiology and manual treatment

- Patient conditions are diagnosis-specific, vary over time and support an optional staged manual treatment mode for Patient 1 with randomized clinically appropriate choices and transport sign-off.
- **Build history:** 0.997 52-58, 74, 81.
- **Test:** Enable manual mode, complete each treatment phase and select transport; repeat in automatic mode to confirm its existing timed flow remains.

### mCPR option

- The persistent mCPR option enables simulated onboard CPR for a rescued patient; without it, CPR is limited to ground as intended.
- **Build history:** 0.997 58.
- **Test:** Enable mCPR and trigger a qualifying in-flight critical patient; repeat with it disabled and confirm CPR waits for ground.

### Custom landing-zone police prepositioning

- For distant custom landing zones, police can preposition near the selected spot, safely move the crew by vehicle and return them to the scene without conflicting with the landing-selection action.
- **Build history:** 0.997 1-13, 10.
- **Test:** Select a distant custom landing zone with police available; watch the car preposition, load the crew and return them safely.

### Persistent base and destination marshal choices

- Settings can independently enable a start-base marshal and destination-hospital marshal. Their selected positions survive return/reload handling and custom hangar/hospital waypoint settings can override global behavior.
- **Build history:** 0.997 47, 70, 142.
- **Test:** Configure base, standard hospital and custom waypoint marshalling; complete a return/reload and verify the chosen local rule wins.

### Custom hangar waypoint configuration

- Custom hangar records support technician boarding/deboarding plus `marshal_present`, `WPMarshalLAT` and `WPMarshalLON`. The OATMC Flugrettung Cristophorus 14 base is included with its requested fixed marshal location.
- **Build history:** 0.997 142.
- **Test:** Select that custom hangar and confirm its fixed marshal appears at the configured coordinates when enabled.

### Direction Finder automatic and manual tuning modes

- DF AUTO tunes CARLS to active ambulance, SAR or ELT beacons. MANUAL TUNING lets the pilot select a legal channel and receives a bearing only after matching a current mission beacon.
- **Build history:** 0.997 83, 89, 95, 99.
- **Test:** Switch between tuning modes during ambulance, SAR and ELT calls; compare the displayed source and MFD bearing.

### Raised hoist envelope

- Hoist workflows support the validated 40-160 ft operational band with the internal 163 ft safety boundary across recovery, heli-rescuer and patient operations.
- **Build history:** 0.997 84-85.
- **Test:** Attempt hoist operations below, within and above the range; only the permitted envelope should be accepted.

### Manual patient records and treatment continuity

- Patient treatment records can remain visible through the manual visit, credit completed ambulance actions correctly and close ground-patient tablet information only after all relevant visits and handovers finish.
- **Build history:** 0.997 74, 81, 126-127, 138.
- **Test:** Complete manual and ambulance-assisted visits for multiple patients; confirm completed history remains until the final appropriate handover.

### Road and residential scene selection improvements

- Residential calls use adaptive road search with a safe retry, unique civilian/casualty selection where possible, and stable acceptance flow for map-selected landing spots.
- **Build history:** 0.997 72, 75.
- **Test:** Generate several residential road calls and accept/reject landing spots; verify valid roads, non-duplicated scene models where pools allow and stable routes.

### Autosave and custom-SAR recovery

- Autosave preserves selected pathology state safely, while externally launched custom SAR calls regenerate their SAR state from mission data rather than inheriting stale saved values.
- **Build history:** 0.997 17, 31.
- **Test:** Save/reload a pathology mission and launch a custom SAR mission afterward; compare the restored diagnosis and SAR behavior.

### Optional EU firefighter marshaller

- When the EU Firefighter addon is installed, its firefighter marshaller is used for fire scenes with the appropriate signal states; the standard H145 marshaller remains the fallback.
- **Build history:** 0.997 14, 19, 32-36, 43.
- **Test:** Run a fire scene with and without the addon installed; verify the correct object fallback and normal guidance.

### Mission profiles and reload choices

- Mission profile selection, profile reload and persistent session choices allow the selected operational configuration to carry through the supported reload boundary without resetting user volume/options.
- **Build history:** 0.997 39, 102-104, 115-117.
- **Test:** Select a profile, adjust supported persistent values, reload into a new dispatch and confirm the selected configuration remains.

### Continuous mission availability after return

- After a completed return, the crew can remain available for the next dispatch through the established scheduler, while END SHIFT cleanly closes availability and prevents a late dispatch from appearing.
- **Build history:** 0.997 71.
- **Test:** Return to base and wait for the next-call window, then repeat and press END SHIFT; only the first path may produce another dispatch.

## Build coverage ledger

The following ledger accounts for the requested complete interval without repeating functional descriptions. A listed range means the builds were reviewed together and their final visible result is represented by the single relevant entry above.

- **0.997 1-9:** core mission safety, three-crew skid work, cancellation, pre-visit, vehicle movement, map/refuel and heli-rescuer destination work.
- **0.997 10-16:** ambulance distance/second ambulance, movement watchdogs, health fallback, custom-LZ police, EU marshaller, route hardening and pathology fallback.
- **0.997 17-22:** pathology persistence/VFX compatibility, crew animation, marshal guidance and final statistics.
- **0.997 23-26:** reviewed intermediate consolidation; no separate final user-visible behavior remains outside the related crew/marshal entries above.
- **0.997 27-31:** waypoint split, engine guard, custom SAR/save recovery.
- **0.997 32-39:** marshal controller/restart/arming, Debug cleanup and persistent reload settings.
- **0.997 40-46:** three-crew route/animation restoration, marshal controller consolidation and road-vehicle spawn guard.
- **0.997 47-51:** marshal settings, custom actions, monitor, location correction and map icon improvements.
- **0.997 52-60:** physiology/GCS, marshal touchdown, CPR/privacy, dispatch progress and source-format correction.
- **0.997 61-70:** Objective 2/clinical readiness, ambulance handover, RescueTrack, persistent base marshal and related marshal corrections.
- **0.997 71-80:** Tablet 5G, audio, manual medical mode, residential roads, Wi-Fi presentation and CARLS DF introduction.
- **0.997 81-90:** final ground clinical record, presets, DF tuning/renderer corrections, medical-page visibility, Before Take-off and DF persistence.
- **0.997 91-100:** independent P1-P3 assessment/transport baseline, Debug snapshot and tracker work.
- **0.997 101-110:** profile/preset enhancements, medical/ambulance readiness, crew/hoist refinements and Debug summary.
- **0.997 111-117:** build diagnostics, persistent configuration and profile-reload refinements.
- **0.997 118-122:** rear-door verification, crew/NR watchdogs and their diagnostics.
- **0.997 123-127:** non-destructive multi-patient registry diagnostics and final patient-record visibility rules.
- **0.997 128-130:** local-time and road/rail query compatibility corrections.
- **0.997 131-134:** reviewed integration revisions; no separate final user-visible behavior remains outside the checklist and compatibility entries.
- **0.997 135-137:** Avionics/Before Take-off/Take-off checklist layout, conditions, navigation and automation.
- **0.997 138-139:** independent patient selection, physical ambulance transfer, residential rescue/fire corrections and provider fallback.
- **0.997 140-141:** reviewed delivery revisions; their final visible behavior is consolidated in the crew/marshal entries for 142.
- **0.997 142:** documented three-crew pilot state correction and custom fixed-location marshal support.
- **Post-142 GitHub development checkpoint:** cumulative ambulance assessments, patient focus/labels, physical transfer integration and residential fire suppression. Runtime validation remains PENDING.
