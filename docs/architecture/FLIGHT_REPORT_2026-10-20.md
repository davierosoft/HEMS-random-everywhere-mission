# Flight report of 2026-10-20: what was found and what changed (sources, not built)

Source of the findings: the Mission Companion log `hmc-20261020-184101` and the mission snapshot of the same flight (mission 37 CLIMBER, three crew with a heli rescuer, 169.66). Every item below is a static change checked by `tools/test-flight-report-2026-10-20.js`; the behaviour in the simulator is PENDING.

## Defects found in the log and the snapshot

| Finding | Cause | Change |
| --- | --- | --- |
| The crew left and worked while the heli rescuer was still walking his points (`hr_s_secured` 100 s after the crew's first command) | `gnd ops heli rescuer down` set `HOLDHOISTED` to 0 right after it woke up, which released the crew wait of `3 crew ground ops` / `4 or 5 crew ground ops` at once. The original (baseline) releases it only after the last point (`LDWN`). | The early release was removed. The crew waits (`HOLDHOISTED` 1) until the heli rescuer has secured the area and releases it himself. |
| The heli rescuer walked behind the tail on the left and then cut across to the right door at the pick-up | The original leg from the first point (bearing 320/8 m or 210/13 m, the nearest) went straight to bearing 40/6 m. From the rear left point that line crosses the helicopter. | The second leg is the nearest of bearing 40/6 m (round the nose) and bearing 150/9 m (round the tail), then the right pax door. |
| An operator seemed to teleport behind the helicopter for the stretcher, the rear door opened, closed and reopened | The legacy stretcher flow swaps the stretcher of the cabin for a free stretcher object behind the helicopter with `move_object` (a jump) and closes the rear doors while the stretcher is away. | With a heli rescuer on the scene the patient reaches the rear doors on foot and the stretcher of the helicopter is ejected empty: see below. The legacy flow is unchanged without a heli rescuer. |
| The copilot read the dispatch in a plain voice with the helicopter on | The cold readback (`DSA.RB.*`, `<radio:off>` in the text) always asked for the plain voice. The program decided by the pack attribute and the mission tag, not by the power. | The text has no radio tag, the pack messages say `radio="ics"` and the program applies the radio rules to a crew member's plain text: the intercom with the battery master or the GPCP switch on, the voice without. |
| The pilot answered every update with the same words | `PickPosition` kept the coherent tone (the same option number inside a group for 180 s), so one message repeated the same sentence; `voice ground update` made the pilot answer every update. | A message does not use again its last options (3 with six options); the pilot answers an update with a 55 percent chance and not twice within 60 s; `GRD.PLT.OK` has no thanks. |
| The tablet showed no selected button for CREW CHATTER and CREW TIPS | Several persistent settings had no first-run default (the consumers read null as the default but the buttons showed nothing and the Companion read no value). | See the rule below. |

## Rule: every persistent setting has a first-run default (user, 2026-10-20)

`objective1` calls `settings first run defaults`, which sets each settings global that is null: `CREW_CHATTER` 0, `CREW_TIPS` 0, `COND_MISSIONS` "no", `CLOCK_MODE` "utc" (the other settings already had a guarded default). The same macro runs after `load custom aircraft profile` (a profile saved before an option existed loads it as null) and at the end of `resetdefault`. Exempt on purpose: `CALLSIGN` (null and empty both mean HEMS), `HOIST_SAFETY_MONITOR` and the accident radii (own normalisation), `PERSIST_MISSION_WAIT_TIME` (an L variable). `tools/test-flight-report-2026-10-20.js` fails when a key of `save custom aircraft profile` has no guarded default.

## The patient on foot with a heli rescuer (`ground ops hems patient on foot`)

Called by `3 crew ground ops` and `4 or 5 crew ground ops` (landing, patient by us, ambulance far = 0) when `HELIRESCUER_BOARDED` is above 0. The sequence, with the geometry of the user:

1. the patient object (packed, `VAR 1` 1) walks round the helicopter through the nearest side point, then bearing 180 at 5 m, then bearing 175 at 1.5 m; the operator (`hoist_crew`) walks with it and stops at bearing 170, 1 m (in front of the stretcher);
2. the rear doors open once, `H:..._HEMS_STRETCHER_NOPATIENT` and `..._EJECT` extend the empty stretcher (8.2 s), the patient object is removed (`multipatient registry live remove hems patient object`) and `..._HEMS_STRETCHER_PATIENT` shows the patient on the stretcher, `..._RETRACT` retracts it;
3. the operator steps back (bearing 180, 3.5 m), closes the doors and goes aboard along the right side; `pax3` goes to its seat (the cockpit left door with three crew, the right door with four or five, with the crew states of the contract in `HPG_DYNAMIC_OBJECT_STATES.md`).

No `move_object`. The bookkeeping (`crewpatientonstretcher`, `HEMS_LOADING_*`, `crewpatientloaded`, the pilot line PLT 36, the phase 8 thread, the voice counter PAX3 10) is the legacy one. Runtime PENDING: the extraction with the operator in front, the patient object walking (`VAR 1` 1 is the packed state, as in `Hoisting back ground`).

## Progress bar

`on-site operations progress monitor` was started by the landing operations and, from 169.66, by the hoist. Now `ops progress start` starts it in the three skid macros, and `ops progress timed` (a bar that fills to 92 percent in a given time and ends when the crew has been seen outside and is gone) is in the handover at the destination (`User destination1`, `User destination hoist`, `User destination2`, `Organ destination1`, the three `Ambulance destination` macros), the patient transfer boarding, the organ pick-up and the midway loading.

## Radio and voices (Mission Companion only)

| Item | Macro | Pack keys |
| --- | --- | --- |
| Reminder to switch the radio on (3 to 5 minutes after the briefing, helicopter on and CARLS not connected, at most three) | `voice radio reminder` | `RAD.REM` |
| Rendezvous at the pick-up place of the heli rescuers, the station called by its name and kind (alpine rescue station, fire station, sports field, meeting point), the approach call with the wind | `heli rescuer place`, `heli rescuer pickup request`, `heli rescuer pickup approach`, `heli rescuer pickup arrival` | `HRQ.DSP`, `HRQ.APR.PLT`, `HRQ.APR.A` and the `{hrs:1}` / `{hrp:1}` placeholders in the others |
| The find of the SAR target told to the dispatcher with the position | `voice sar found` | `SAR.FND.PLT`, `SAR.FND.A`, `{comp:N}` |
| Hospital: marshal request, final approach, on the pad, handover question and answer, departure, organ after the deadline | `voice hospital approach`, `voice hospital final`, `voice hospital handover`, `voice hospital marshal expected` | `HOS.MAR.*`, `HOS.FIN.*`, `HOS.PAD.*`, `HOS.Q`, `HOS.A`, `HOS.DEP.*`, `HOS.ORG.LT` |
| Transfer and organ transport call the pick-up place some minutes before | `voice pickup approach` | `PCK.CALL.TRF/ORG`, `PCK.REPLY.TRF/ORG` |
| Organ briefing (organ, recipient with name and age from the lists, time left against time needed, the reaction of the chief), time watch, handoff at the pick-up, comment on delivery; transfer destination in the briefing | `voice organ briefing`, `voice organ watch`, `voice organ handoff`, `organ transfer` | `ORG.INF`, `ORG.TIM.*`, `ORG.RCT.*`, `ORG.WARN`, `ORG.LATE`, `ORG.PCK.G/R`, `ORG.DEL.*`, `TRF.INF`, `{organ:N}`, `{name:N}` |

The heli rescuer place is found with two small OSM queries (150 m around the point: `emergency=mountain_rescue`, `amenity=fire_station`); a point chosen by the pilot on the map is a meeting point. Runtime PENDING: whether the name token (`hrp_alp_Name`, `hrp_fire_Name`) is filled for every station (an unnamed one must not be read as a name).

## Work light

`fire scene worklight`, called when the fire engine has arrived at a road accident (scene macros `default rtc`, `Bycicle vs car`, `pedestrian vs car`, `BUS CRASH`, `truck vs car`, `train`) and `E:TIME OF DAY` is not 1: an `Airbus H145 Worklight` 5 m ahead of the fire engine (bearing2 0), turned to `injured_human`, `VAR 1` 1 (on; the original sets 1 on the work lights of its quarry, construction and power scenes). The free place is not checked against the other objects (no command tells it).

## Not possible

A road traffic exclusion area around the victim through SimConnect: no SimConnect call or SDK method creates it (searched, 2026-10-20); exclusion rectangles exist only in scenery packages (static, scenery objects, not AI traffic).
