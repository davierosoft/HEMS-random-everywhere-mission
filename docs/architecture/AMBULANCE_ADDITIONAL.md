# Additional ambulance (3, 4, later 5): census and design

Status 2026-11-21: CENSUS ONLY. Nothing of the feature is implemented. Only one fix is in the sources (section 1).

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
