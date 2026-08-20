# HEMS Random and Everywhere Missions - Handoff for ChatGPT SOL

## 1. Current authoritative file

Use this file as the current working release:

`everywhere_all.json`

Current title:

`HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 12`

The latest user-supplied Desktop source was:

`C:\Users\Andrew\OneDrive\Desktop\everywhere_all.json`

It was used as the base because it contained user changes to heli-rescuer drop distances and ambulance-previsit behavior. The Desktop source is read-only from this workspace. Do not overwrite it.

The latest release has 498 macros, valid JSON, restored compact command formatting, intentional blank lines between macro groups, no incompatible Unicode dash characters, and only the inherited static macro references `beforetockl` and `ELT {local:ELT}` unresolved by the local scanner.

## 2. Important generation warning

The current release script is:

`C:\Users\Andrew\Documents\Codex\2026-08-11\d\work\fix-helirescuer-3crew-skid.mjs`

It reads the Desktop file and writes `outputs/everywhere_all.json`. Running it again after modifying only the current output can overwrite those changes because the Desktop file is its source. If you continue from the current release, either update the script source path to the current release or apply changes directly to a new copy and preserve the user's Desktop modifications deliberately.

Every new release must continue to be named `everywhere_all.json`; distinguish releases by incrementing the title suffix, for example `0.997 12`.

## 3. Mission architecture and state model

### Persistent state

- Globals persist in the save file after their first assignment.
- Globals that are expected to be initialized must be set in Objective 1 when `NULL`.
- Globals that are not part of savegame or statistics must be included in the reset-default path.
- Statistics globals must also be reset by the statistics reset macro.

### Session state

- LVARs survive for the flight session and normally start at zero if never initialized.
- Locals survive for the flight session and normally start as `NULL` if never initialized.
- Objective 1 contains both always-reset session values and first-dispatch-only values. Keep these categories separate.
- New locals and LVARs should be added to the debug page, grouped by function and separated with `image: bar` where useful.

### Condition syntax

- `show_condition` must use `and`; do not put `or` inside it.
- If a button needs alternative visibility conditions, create two equivalent buttons with separate `show_condition` blocks.
- Avoid unsupported nested `and`/`or` combinations in command conditions unless the exact structure has been tested.
- Do not use `copy_location` with an unresolved parameter such as `vehicle`.
- Do not use parameterized `create_location` forms that the HPG API does not accept.

## 4. Three-crew skid flow

Main macro:

`3 crew SKID LDG`

Entry actions are in the two `skid_landing` user-action definitions and are guarded by `CREW = 3`.

Final behavior:

1. The helicopter must satisfy the existing skid landing envelope.
2. `hoist_crew` is the only cabin member deboarded for the three-crew configuration.
3. The crew member is represented by PAX3/station 6 while on the ground.
4. For helicopter transport, the patient is approached, stabilized, and loaded with the hoist.
5. During hoist loading, the copilot is temporarily moved to PAX2 and `COPILOT = 0`; station weights are adjusted.
6. The patient hand-off is explicitly ordered:
   - wait for hoist at ground;
   - random delay of 2-5 seconds;
   - set `H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_ON` to show the stretcher;
   - destroy `injured_human` only if it exists;
   - random delay of 2-5 seconds;
   - destroy `hoist_crew` only if it exists;
   - set hoist human and bag ON;
   - wait 1 second;
   - start hoist-up.
7. After the cabin is restored, PAX2 is removed, the copilot returns to PAX1, station weights are restored, both doors are closed, and `MISSION_PHASE` advances as in the existing mission flow.
8. The final three-crew branch sets `HOLDHOISTED = 1` so the heli-rescuer reboarding thread can finish.

Ground transport values:

- `whobringpatient = us`: patient and crew return by helicopter.
- `whobringpatient = ambulance`: the patient is managed by ground medical services and the cabin crew returns for skid pickup.
- `whobringpatient = ambudoc`: the patient and the PAX3 doctor remain with ground medical services; the doctor must not be returned to the helicopter.
- `whobringpatient = lethimdie`: the three-crew skid flow converts this to `us` when no ground transport is selected.

## 5. Heli-rescuer synchronization

Main macros:

- `gnd ops heli rescuer down`
- `gnd ops heli rescuer up`
- `hoist heli rescuer down`
- `hoist heli rescuer up`
- `drop heli rescuer`
- `drop heli rescuer ground`
- `drop heli rescuer hoist`

The current synchronization rule is:

- The down thread waits for the initial `HOLDHOISTED = 1` deboarding signal and immediately consumes it by setting `HOLDHOISTED = 0`.
- The four securing movements and the medical ground work then run without triggering the up-thread.
- The three-crew skid macro sets `HOLDHOISTED = 1` only after all patient branches have completed.
- Only then may `gnd ops heli rescuer up` or `hoist heli rescuer up` reposition the heli-rescuer under the aircraft and board them.

Doors are explicitly closed at the end of ground deboarding, hoist deboarding, ground boarding, hoist boarding, and the three-crew skid branch. If a future branch opens a door asynchronously, add its close operation after the final object movement, not before.

### EU Firefighter marshaller support - release 0.997 12

- `addon check` fetches `/VFS/SimObjects/Airplanes/68ponyGT_EU_Firefighter1/aircraft.cfg` and sets `68pony_marshal` to `OK` or `NO`.
- When `68pony_marshal = OK`, `marshall` and `pisteur3` use the `EU Firefighter 1` title with `Airbus H145 FR Pisteur 1` as fallback. Without the addon, the original titles remain in use.
- `marshaller animation monitor` drives VAR2 mask state and VAR1 idle, hover, land, left/right/up/down, rotor-engage, and wind-relative departure signals. It uses the landing spot for `marshall` and `heli_rescuer_location` for `pisteur3`, with the requested altitude bands, tolerances, and minimum animation timing. Approach guidance is gated to 150 m and below 100 ft. Departure guidance is cleared at 50 ft or after 70 m from the spot. Halloween fool mode uses VAR1 `100` for idle/ready states.
- Objective 1 resets the guidance state; the debug page exposes addon status, activity, distances, bearings, and signal flags. Engine start macros wait for active marshaller guidance to finish.
- The two pre-existing delayed monitor threads that move/orient the marshallers according to wind are deliberately preserved unchanged. Do not remove, replace, or rewrite those threads; future changes must coexist with them.

Hoist arming is intentionally requested before close-contact positioning in:

- the `us` branch of `3 crew SKID LDG`;
- `drop heli rescuer hoist`.

Do not move this request after the aircraft is already holding the difficult contact position.

## 6. Drop heli-rescuer action

The `drop heli rescuer` macro creates:

- `DROP HELIRESCUER HERE` for base, hospital, or user hospital destinations;
- the normal `GO BACK TO MEETING POINT` action when dropping has not been selected.

State locals:

- `helirescuers_drop_here_monitor`
- `helirescuers_drop_here_ready`
- `helirescuers_drop_here_selected`
- `helirescuers_drop_here_mode`

Current destination modes are `base`, `hospital`, and `hospital_user`.

The monitor uses a widened 500 m destination readiness tolerance in the current release, as requested by the user. The normal operational landing/hover checks remain separate. The selected drop path calls `helirescuers_follow_destination`, clears the normal route-restoration state, and prevents the normal return-to-drop-point action from being used afterward.

## 7. Police landing-zone transfer

Relevant macros include:

- `police_preposition_to_landing_spot`
- `police_landing_spot_departure_notice`
- `police_board_waiting_crew`
- `police_ensure_second_officer_at_scene`
- `policeman2_keep_clear_of_vehicles`
- `3 crew ground ops`
- `4 or 5 crew ground ops`

Rules:

- A distant custom landing spot forces police prepositioning when police is present or arriving.
- The police car stops at least 20 m from the landing-spot center.
- The landing-spot action is locked while the car moves.
- A RescueTrack/tablet departure notice is delayed about 3 seconds; movement starts after about 5 seconds.
- The moving car carries one officer. `policeman2` remains at the accident scene.
- When the crew reaches the car, `hoist_crew` and `pax3` board using the existing transfer sequence, become visually hidden, and are recreated at the scene after the police car returns.
- The police route must not be replaced by a direct walk from the landing spot to the accident when the forced-pickup flag is active.
- Do not reintroduce `copy_location` or parameterized `create_location` in this path.

State locals used by this flow include:

- `police_lz_transfer_state`
- `police_lz_force_pickup`
- `police_lz_pickup_ready`
- `police_lz_move_lock`
- `police_lz_departure_delay_done`
- `policeloadingenabled`

## 8. Rescue vehicles and arrival flags

Vehicle arrival must be published only after the final stop and parking maneuver. Use the existing operational flags, not only distance:

| Vehicle | Local flags | Availability flags |
|---|---|---|
| Ambulance | `ambu1arrived`, `ambu2arrived` | `AMBU_AVAIL`, `L:VARAMBUAVAIL` |
| Police | `poli1arrived`, `poli7arrived` | `POLICE_AVAIL`, `L:VARPOLICEAVAIL` |
| Fire engine | `fire1arrived`, `fire2arrived` | `FIREENGINE_AVAIL`, `L:VARFIREAVAIL` |

Parking constraints:

- Use each scene's stop-distance locals.
- Prefer scene waypoints and road endpoints over arbitrary direct moves.
- Park vehicles laterally and alternate sides when possible.
- Preserve the normal order from the scene outward: fire engine, ambulance, police.
- Maintain at least 5 m from `injured_human` and the existing vehicle separation targets.
- Avoid adding OSM routes solely for separation.

## 9. Dispatch cancellation and statistics

Cancellation state:

- `CANCELTHRESHOLD` defaults to 80 if `NULL`.
- Settings can set it from 50 to 100.
- Cancellation is evaluated after sufficient rescue resources are present and after all lifescores exceed the threshold.
- A random 1-3 minute delay is used after vehicle arrival.
- RescueTrack receives the operational notification that HEMS is no longer required.
- The mission phase is advanced so a new dispatch can be accepted, and return-to-base is enabled.
- Cancellation count is incremented in the persistent statistics global and shown on the statistics page.

Do not put cancellation errors in `RESCUE_TRACK`. Use the dedicated briefing or mission-dispatch error indicator.

## 10. Randomize, poordead, and ambulance pre-visit

Randomize:

- The active accident count is checked before random selection.
- Zero active accidents stops randomization and displays the red briefing/dispatch error indicator.

Poor-dead:

- `poordead` changes the message text and displayed deceased count only.
- It must not increment `HELOVICTIMS`.

Ambulance pre-visit:

- The intended design is a random pre-visit for one victim, ambulance plus police present, helicopter not yet landed, and lifescore above 40.
- Ambulance and police must have been present for the required two-minute interval.
- `ambustretcher` loads the patient; `ambumedic` remains on scene until HEMS arrives.
- A RescueTrack message reports patient loaded and awaiting HEMS when the dispatch remains active.
- The loading decision is independent of cancellation. If the lifescore later qualifies for cancellation, the dispatch may be cancelled after the patient is already aboard the ambulance.

When cancellation criteria are valid, do not emit any ground-service message that says HEMS intervention is still required. Do not duplicate the existing red victim indicator in briefing or dispatch.

Important discrepancy to verify: the latest Desktop source and the current generated release contain `ambulance_previsit_roll < 99`, while an earlier implementation used `< 30` for the requested 30% probability. This was preserved from the user's latest source and should be explicitly confirmed before changing it.

Health-data fallback:

- The current release normalizes missing fields in every `health*` data list before the mission consumes them.
- Missing values use: `id = No info received`, `smoke = no`, `fire = no`, `medical_symptoms = No info received`, `diagnosis = Undetermined`, `scoremin = 30`, `scoremax = 90`, `decr_rate = 1`, `spo2 = 97`, and `bpm = 70`.
- Existing authored values are preserved; only absent keys are filled.

## 11. Dispatch map and refueling

- `accident prelocation` must recreate/update the current dispatch location and refresh the map point on every new dispatch.
- Remove the old dispatch icon before adding the next one, including when the previous dispatch was not accepted.
- Do not rely on `location_name` alone to move an existing icon; update the point location explicitly.
- Refueling must be debounced so moving the slider cannot launch multiple refueling macros. Keep the 2-second delay and the active-macro guard.

## 12. Current issue resolutions

- Issue 06: `whobringpatient = ambulance` is now selected only after an ambulance arrival state (`ambu1arrived`, `ambu2arrived`) is true. Police arrival alone no longer selects the ambulance branch; the separate police requirement for ambulance pre-visit remains intact.
- Issue 10: rescue-vehicle `drive_object` calls are routed through per-vehicle watchdog macros. Each wrapper runs the drive in a worker thread, catches command errors, applies a vehicle-specific timeout, records `arrived`/`failed`, and uses the terminal waypoint as a guarded `move_object` fallback so a blocked vehicle cannot hold the mission indefinitely. Watchdog state locals are prefixed `drive_watchdog_`.
- Issue 11: pathology selection no longer leaves `myhealth*` pointing at the last incompatible random record after the retry limit. The selector installs the deterministic fallback record agreed in the issue and marks the result `fallback`; this applies to patients 1-3 and the Halloween selector.
- Issue 14: the failure engine now dispatches the failure index through one supported `switch` command. The original failure side effects are preserved, with one common delay and reset per cycle.

## 13. Testing sequence for SOL

Run tests in this order and record the result for each:

1. Load `everywhere_all.json` and verify the title suffix.
2. Test 3 crew, one heli-rescuer, skid landing:
   - four securing movements complete without premature repositioning;
   - patient hoist order is visible and synchronized;
   - hoist arming is requested before close-contact positioning;
   - heli-rescuer eventually boards again;
   - left and right doors are closed.
3. Repeat with 3 crew and two heli-rescuers, then with 4 and 5 crew.
4. Test `us`, `ambulance`, and `ambudoc`, including no ambulance and three victims.
5. Test `DROP HELIRESCUER HERE` at base, fixed hospital, and user hospital.
6. Test a distant custom landing spot with police already on scene and police still arriving.
7. Verify police crew boarding, visual hiding, return to scene, and `policeman2` placement.
8. Test every subset of rescue vehicles and confirm arrival flags change only after parking.
9. Test dispatch cancellation at threshold and below threshold, including a new dispatch afterward.
10. Test zero active accidents, `poordead`, missing optional objects, and the second-ambulance clearance path.
11. Press `Next Dispatch` repeatedly and verify the icon location and stale-icon cleanup.
12. Move the refueling slider repeatedly and verify only one macro instance starts.

The latest release has only been structurally validated in this workspace. Runtime behavior in MSFS/HOC still needs to be tested after these final heli-rescuer changes.

## 14. Editing and release rules

- Keep simple commands on one line.
- Keep complex conditions and IF structures multiline.
- Keep blank lines between macro categories.
- Use only the ASCII hyphen `-` in user-visible text.
- Do not introduce `or` into `show_condition`.
- Preserve existing user changes when starting from a newer Desktop file.
- Write the next artifact as `everywhere_all.json` and increment the title suffix.
- Re-run JSON parsing, macro-reference scanning, duplicate-key scanning, and Unicode-dash scanning before handoff.

## 15. Ambulance distance and second-ambulance work in release 0.997 10

- The pre-visit monitor now measures the parked `ambulance1` distance from `accident_location`. The closest-ambulance flow uses the same `ambulance1` alias after its final parking step, so the check covers both normal and closest ambulance.
- Pre-load is rejected when the parked ambulance is more than 600 m from the scene. The distance rejection is applied after the VFXA/weather force calculation, so forced weather loading cannot bypass the 600 m safety limit.
- When the normal ambulance is known to be over 600 m away, the user destination menu exposes a direct `Unload to ambulance` action. It is available only after the ambulance arrival flag is set and a measured distance is present; the existing closest-ambulance unload action remains available for the closest branch.
- Added `closest ambulance police crew transfer`. For a closest-ambulance mission, it evaluates the stopped `police7` distance to the patient. At more than 600 m it leaves the crew on the normal walking path; otherwise it moves the crew into the police car, sends the car through dedicated landing-zone and return routes, and deboards the crew at the scene. It is launched from both ground-ops variants and guarded by a per-dispatch state local.
- Added `ambulance2 secondary rescue`, `ambulance2 secondary patient2`, and `ambulance2 secondary patient3`. When a second ambulance is parked and a second/third patient remains, a literal-named crew is created, visits the patient, and loads that patient aboard the second ambulance. The patient2 branch is preferred, with patient3 as fallback.
- The second ambulance waits until the visit/load sequence is complete, waits for the ambulance1 destination/departure state, and creates a route to the same `hospital_user` destination. If `poordead` exists, it waits until at least one police or fire unit remains available before departing.
- New session locals are reset in Objective 1: pre-visit distance state, second-ambulance rescue state, ambulance1 destination/departure state, closest-police transfer state, and closest-police crew-onboard flags.
- The debug page now displays the new distance, secondary-ambulance, destination/departure, closest-police transfer, and police-crew-onboard locals in grouped sections.
- Two landing-zone police routes and one second-ambulance destination route family were added only for these new transport cases. They use literal object/location names and do not use `copy_location` or parameterized `create_location`.

