# HEMS Random and Everywhere Missions - Consolidated Changelog

This changelog records the consolidated results of the work performed during the discussion. Intermediate corrections to newly created features are intentionally collapsed into their final behavior instead of being listed as separate revisions.

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
