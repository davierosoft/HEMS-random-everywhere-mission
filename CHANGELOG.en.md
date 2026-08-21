# HEMS Random and Everywhere Missions - Consolidated Changelog

This changelog records the consolidated results of the work performed during the discussion. Intermediate corrections to newly created features are intentionally collapsed into their final behavior instead of being listed as separate revisions.

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
- Applied the same location validation and guarded retry behavior to the manual direct-to button, heli-rescuer flight-plan selection, delayed tablet flight-plan updates, and RescueTrack waypoint activation.
- Updated manual route-preview lines to use the validated route snapshot and prevented them from being drawn when the snapshot is invalid.
- Added `routeupdate_target`, `routeupdate_valid`, and `routeupdate_error` to the Objective 1 session reset and grouped debug page.
- Kept the intended `NOCONNEXT` behavior: `0` sends an FMS direct-to, `1` clears the FMS route and draws the manual map line, and `2` clears the FMS route without drawing a line.

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
- The release 0.997 15 output contains 499 macros and passes JSON parsing.
- Static analysis still reports the inherited references `beforetockl` and dynamic `ELT {local:ELT}`; they were not changed without runtime confirmation because they may be system or dynamically expanded macros.
