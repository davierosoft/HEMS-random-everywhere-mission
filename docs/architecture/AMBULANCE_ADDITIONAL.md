# Additional ambulance (3, 4, later 5): census and design

Status 2026-11-22: IMPLEMENTED IN THE SOURCES (unbuilt, no simulator test). Section 5 describes what exists and its known limits; sections 3 and 4 are the census and the design it followed.

## 1. Fix applied (unbuilt): Ambulance2clearance on every route
Report of Stefan (Dr.DougRoss): in a multi-patient emergency the second ambulance never started. `Ambulance2` (`08-ground-response.json`) waits on `Ambulance2clearance != null`, but only two branches of `Ambulance1` ever set it to `clear` (lines ~3371 and ~3463). Residential and the other routes set `ambu1arrived = yes` without it, so ambulance 2 waited forever.
Fix: after each `{"set":{"local":"ambu1arrived"},"value":"yes"}` in `08-ground-response.json` (3 places) the macro sets `Ambulance2clearance` to `clear` when it is still null. Runtime test pending: 3 or 4 injured on a residential scene, `HELOVICTIMS > 2`, ambulance 2 must start.

## 2. Requested feature
- A button on the HEMS medical page, for when the HEMS doctor has manual control and decides ground transport for everybody (3 injured = 3 ambulances).
- It calls the NEXT UNUSED ambulance: 2 if only 1 is out, then 3, then 4. Not "from the third".
- The extra ambulance does everything the others do (drive, park, ground operations, loading, hospital).
- The dispatch-page "Request ambulance" button (`04-dispatch-tablet-ui.json` ~260, `AMBU_AVAIL`, calls `Ambulance1`) stays as it is.
- Modular: 4 and 5 injured will come. New macros Ambulance3 and Ambulance4. Ambulance5/Ambulance6 are NOT reusable: ~2 KB hospital-side macros (route and travel to hospital), no scene logic.

## 3. Census of ambulance 2 (748 occurrences, 11 files)
Scene family, all in `08-ground-response.json`, hand-copied from ambulance 1 (size = JSON bytes):
| Macro | Role | Size |
|---|---|---|
| `Ambulance2` | start, wait on `Ambulance2clearance`, route, arrival | 9.5 KB |
| `park_ambulance2`, `park_ambulance2_scene` | parking and scene placement | 19.6 + 5.2 KB |
| `drive ambulance2 safe`, `... safe multiplier` | safe drive | 3.7 + 4.2 KB |
| `scene spacing ambulance2` | spacing from other vehicles | 3.3 KB |
| `ambulance2_restart_at_slow_speed` | restart helper | 0.3 KB |
| `ambulance2 secondary rescue`, `secondary patient2`, `secondary patient3` | second/third patient handling | 6.0 + 11.4 + 11.4 KB |
| `ambulance operations monitor` (param `vehicle`) | watchdog, already generic | 6.1 KB |
Callers: `Ambulance2` from the creation thread when `HELOVICTIMS > 2` (08 ~3531); monitor at 08 ~3572; secondary rescue at 08 ~3748; patient2/3 at 08 ~6853-6884.

Other files:
- `03`: voice context line (comment ~4214).
- `05`: `ambu2test` location in `Query closest ambugo` (6 hits) and `Query closest nodes with sampling` (2).
- `06`: `residential`, `train` scene macros (35 hits in file).
- `07`: decision record resource names `hems/ambulance1/ambulance2` (~1509), `ambu2arrived` (~1796), ambulance count `mtc_amb` (~7210).
- `09`: six `ambu2arrived = yes` requires in ground ops (3 crew, 4 or 5 crew, SKID LDG, HOISTING).
- `11`: `objective1`/reset locals (`ambu2_*`, `ambulance2_secondary_*`, `ambulance2_arrival_message_sent`), cancellation, `has_object` ambulance1 and ambulance2 (~1592).
- `15`: debug page, DF stations (`ambulance2` beacon), CARLS DF assign.
- `17`: registry tickets `ambulanceN_transport_ticket` (3237-3238 reset, 3962-4005 get/set/clear), `ambulance2_assigned_hospital` (4194), live ground load/dispatch/restore, ambulance reach and scene point, crew barrier.
- `19`: snapshot inventory (all `ambu2*`, `ambulance2_secondary_*`, `drive_watchdog_ambulance2_*`).
- `manifest.json`: 20 entries (macro list and index).

Patients are also hard-wired to 3 (`patient1..3`, `P1_..P3_`, `HELOVICTIMS` rand [2,4] in scene type 11): 4 or 5 injured needs more than ambulances.

## 4. Design (proposed, not started)
1. One macro per ambulance N generated from a shared parametrised body; duplicated logic of 1 and 2 is NOT copied again. Objects `ambulanceN`, locals suffixed by N.
2. A small data table (patient served, ticket, call sign, park side, arrived flag) so adding the 5th ambulance is one row.
3. Macro `ambulance next free`: lowest N not created and not requested; returns 0 when none left.
4. HEMS medical page button, visible only when the doctor has manual control, ground transport is decided for all, and patients > ambulances out or requested; click calls `ambulance next free`.
5. Registry: ticket, assigned hospital, live ground load/restore generalised from "1 and 2" to N.
6. Every new local joins reset (`objective1`), snapshot inventory (19), debug page (15) and the manifest.
7. Gates: `validate-mission.js`, reset/option sync tests, voice texts for any new `speak`, user changelog, numbered Companion issue only if a persistent option is added.

Runtime tests required in the simulator for every step; the feature cannot be proven by static checks.

## 5. Implementation (2026-11-22, sources only)
- Generated, not hand-copied: `tools/add-ambulance-n-2026-11-22.py --write` (engine `tools/ambulance-n-engine.py`) then `tools/add-ambulance-n-step2-2026-11-22.py`. The generator extends every macro that mentions ambulance 2 with the same logic for 3 and 4 (sibling clones, vehicle chains `if vehicle eq 1 ... else 2` become `1, 2, 3, 4`, or-lists "any arrived", struct keys, registry tickets, snapshot, reset) and clones the family of ambulance 2 into `macros/27-ambulance-additional.json`. Live ground path only (the legacy `ambulance2 secondary patient2/3` are dead and not cloned).
- Crew objects: vehicle 3 uses `ambumedic8`/`ambustretcher8`, vehicle 4 `ambumedic9`/`ambustretcher9` (vehicle 1 is 7, vehicle 2 is 2; the names 1, 3 and 12 mean other things).
- Spawn: ambulance N starts at its own bearing/distance and waits behind the previous ones (`20*(N-1)` m behind ambulance 1).
- Request: `ambulance next free` (lowest of 2, 3, 4 not requested; `ambulance_pending` while one is on its way) and `call additional ambulance` (starts `AmbulanceN` in its own thread, message "Ambulance N requested to the scene."). `Ambulance1` resets `ambulance_requested_2..4` and still starts only ambulance 2 by itself when `HELOVICTIMS > 2`.
- Button: CALL AMBULANCE on the medical page in the transport step of a manual visit, enabled by `manual transport check` (`medical_display_amb_call_ok`) only when GROUND is blocked because every ambulance on scene already has a patient, a free one exists and none is still driving in. The ALWAYS BY HELICOPTER setting is not read here (owner rule 2026-11-20: the manual choice stays above it).
- Test: `tools/test-ambulance-additional.js` (static contract + request logic). The two-state list tests (`test-query-nonblocking`, `test-scene-spacing`, `test-tester-report-guards`) were widened to 4 vehicles.
- Known limits: parking cross-avoidance of ambulances 3/4 against ambulance 1/2/police/fire is only partly symmetric (flagged sites in the generator report: `park_*` pair/else branches), the arrival message of the park macros mentions ambulance 1 only, the debug page has no row for 3/4, 4 and 5 injured still need more than three patients (`patient1..3`). New UI texts (button, two messages) need `ui-texts.js sync` after a build and DE/FR/IT at publication.
- Runtime test pending in the simulator: 3 injured, manual HEMS, GROUND chosen for all; ambulances 2, 3 (and 4) must drive in, park, load and go to the hospital.
