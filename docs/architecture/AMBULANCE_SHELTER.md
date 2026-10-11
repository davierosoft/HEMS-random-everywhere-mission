# Ambulance shelter of a single patient

A single patient who needs the HEMS doctor is moved into the ambulance by its crew when the weather or a hazard asks for it, before the helicopter lands. The HEMS visit then happens at the open rear of the ambulance instead of on the ground of the scene. It replaces the legacy ambulance pre-visit (`ambulance previsit monitor` and `ambulance previsit load`, disconnected since the registry integration of the 2026-09-12 checkpoint). Runtime behavior is PENDING in the simulator.

## Why the legacy code was not reused

The legacy load destroyed `injured_human` and then relied on a hand-made flag. The patient registry (`17-multipatient-runtime`) treats `injured_human` as the identity anchor of the patient: the crew visit walks to it (`multipatient registry crew move`), the transport tickets prepare it, the recovery moves it back (`live recover worker`), the stand down of the ambulance waits for it to disappear, and the dispatch rows need it. A destroyed anchor makes the HEMS visit fail with `movement_failed` and the ticket preparation with `slot1_injured_human_missing`. The new code keeps the anchor and only hides and drives it. Removed with it, because nothing reuses them: `ambulance previsit doctor enter` and its four call sites (HOISTING, 3 crew ground ops, 3 and 5 crew SKID LDG), every branch on `ambulance_previsit_active` (never set to yes any more), the decision handshake (`ambulance_previsit_decision` pending or skip, the wait of `preambustretcher`), `multipatient registry live shelter commit`, and the locals `ambulance_previsit_monitor`, `_active`, `_patient_loaded`, `_roll`, `_decision` (resets, Debug Center, snapshot). The locals of the rules keep their names (`ambulance_preload`, `_weather_force`, `_forced`, `_eligible`, `_allowed`, `_police_present`, `_police_arrived`, `_distance_ok`, `_distance_m`) so the Debug Center and the snapshots still show them. Reused: the original decision rules (accident data, weather limits, police), the stretcher choreography of `live ground load objects`, the registry claim and the registry `shelter` field of the record.

## Conditions (`ambulance shelter conditions`, in this order; the first that fails is the reason)

| Reason | Condition that failed |
| --- | --- |
| `not_live_mode` | `patient_live_mode` is not 1 |
| `multi_patient` | more or less than one patient |
| `data_disabled` | the accident data (`accidents.preload`) disables it |
| `hems_landed` | `hoist_crew` exists, phase above 6, something rescued or a HEMS visit started |
| `patient_gone` / `patient_died` | the patient is not there or is dead |
| `no_ambulance` / `no_medic` / `ambulance_busy` / `ambulance_far` | ambulance or medic missing, a transport ticket already held, more than 600 m from the accident |
| `pre_visit_pending` | the ambulance crew has not finished its visit (`ambulance1_assessment_complete`) |
| `ground_transport_ok` | the ambulance declared the patient suitable (`clinically_suitable`): normal loading |
| `decision_pending` | the ambulance has not decided yet (the HEMS doctor is required only for `declined_ground_transport`) |
| `not_movable` / `cpr_active` | LifeScore 40 or less, CPR in progress |
| `police_pending` | police not on scene (original constraint) |
| `no_shelter_need` | no reason to shelter |

The reasons to shelter are the original ones (`ambulance shelter rules`): precipitation state 4 or more, ambient temperature above 30 or below 3 degrees C, a fire effect (`VFXA`). The original unconditional random roll (99 percent when nothing asked for it) was dropped: only a weather or hazard reason shelters. The fixed 120 s wait of the original was replaced by the completed ambulance visit and decision.

## Crews and landing modes

The shelter happens before the helicopter lands, so it does not depend on the number of crew or on how HEMS will land (ground, skid, hoist). The earlier limit to a 3 crew helicopter was a legacy condition of the pre-visit eligibility without a design reason and is removed. The visits of the sheltered patient are the registry visits of every crew (`multipatient registry crew move`, sheltered branch): the HEMS doctor (`hoist_crew`) and the ambulance medic as before, and `pax3` with the states of its role (pilot states 16 and 14 with 3 crew, rear crew member states 3 and 1 with 4 and 5 crew). Only the transport after the visit differs: the ambulance loads the patient with its own stretcher, while HEMS with a skid landing or a hoist cannot unload its own stretcher; either way the ticket releases the shelter first and the patient is at the rear doors, like a patient on the ground.

## Flow

1. `ambustretcher full` (live mode) starts `ambulance shelter monitor` in a thread right before the ambulance asks for a transport ticket. It evaluates the conditions every 3 s for at most 30 minutes; a reason that cannot change any more (`not_live_mode`, `multi_patient`, `data_disabled`, `hems_landed`, `patient_gone`, `patient_died`, `ground_transport_ok`) ends the watch (`skipped`).
2. All conditions hold: `ambulance shelter patient` (one attempt). Claim on the patient with the registry visit claim of the ambulance, conditions again, stretcher to the patient, patient on the stretcher (`VAR 2 3`) and the identity anchor hidden (`VAR 1 -1`, the documented Hidden state of the Injured Human), then both go to `ambulance1` itself through the waypoint behind the rear doors (`bearing2 180`, 6 m), like every ambulance loading. The stretcher drives in the main thread. The anchor is **driven** (hidden, `VAR1 -1`) in its own thread along the same way, with two more waypoints at the end (`bearing2 180` at 1 m, `bearing2 270` at 0.6 m of the ambulance) so that its last leg goes toward the right side of the ambulance: the drive decides the final heading, so the anchor ends perpendicular to the ambulance axis. Then: registry record `shelter ambulance1`, state `sheltered`, the medic goes to the patient, pilot message and the unit message to the dispatcher (sender: the unit), claim released, sampler started.
3. Visits to the sheltered patient (`multipatient registry crew move`, sheltered branch, only for `injured_human` while the state is `sheltered`): the visitor (HEMS doctor, pax3, ambulance medic) goes first to the closest of three points around the ambulance (`closest` among its right side `bearing2 90` at 5 m, its left side `bearing2 270` at 5 m and behind it `bearing2 180` at 10 m), so that the way does not cross the ambulance, then to the waypoint behind the rear doors, instead of the closest of the four scene corner points of the normal visit (LUP, RUP, RDWN, LDWN: 6 to 8 m around the accident location), then the normal side movement follows. Because the anchor lies across the ambulance, its `bearing2 90` side is the rear doors: 3 m from the patient is the doorway, then 0.3 m (1 m for the ambulance medic) inside, next to the patient. The assistant (side 270 would be the cab side) stops outside the rear doors (`bearing2 180`, 3.5 m) and faces the ambulance. Everything else of the HEMS visit and of the transport choice is the normal flow.
4. A transport ticket (ambulance or HEMS) calls `multipatient registry live prepare patient`, whose shelter branch calls `ambulance shelter release`: the anchor is driven out, hidden, through the rear doors to the waypoint behind them (it ends heading away from the ambulance, so the loading flows find their stretcher positions at its sides), then shown again with the `VAR 1` it had; the stretcher is emptied and stays at the ambulance; the usual loading starts from there. The registry recovery (`live recover worker`) releases the shelter first.
5. Any failure of step 2 (including an exception) runs `ambulance shelter abort`: it waits for the anchor drive to end, then the anchor goes back to `ambulance_shelter_origin` (move_object, like the registry recovery) with its previous `VAR 1`, the stretcher is emptied, the record has no shelter, the claim is released, `L:HOLDAMBU` is 0, state `aborted`. The flow goes on as without shelter. There is no retry.

`multipatient registry live ground dispatch` waits for the state not to be `loading` before it prepares the stretcher, so the ambulance never loads while the shelter moves the patient; `ambulance_busy` keeps the shelter from starting while a ticket is held.

## Diagnostics

- State `ambulance_shelter_state`: `watching`, `loading`, `sheltered`, `released`, `aborted`, `skipped`; `ambulance_shelter_reason` (the last condition that failed, the abort reason or `ok`), `ambulance_shelter_conds` (LifeScore, visit, decision, weather, need, police, distance, crew, phase, CPR), `ambulance_shelter_need`, `ambulance_shelter_attempts`, `ambulance_shelter_at`, `ambulance_shelter_released_at`, `ambulance_shelter_last`.
- Every step (`monitor_start`, `wait`, `skipped`, `start`, `stretcher_to_patient`, `patient_on_stretcher`, `medic_at_patient`, `sheltered`, `anchor_visible`, `heartbeat`, `release`, `abort`) is a row of the ground crew runtime trace (macro `ambulance_shelter`), which every snapshot keeps. The reason is logged only when it changes.
- Debug Center, MISSION section, `AMBULANCE SHELTER` (state, reason, need, attempts, anchor leaks, conditions, last step, times); the same scalars are in the snapshot.
- `ambulance_shelter_sampler` (thread while sheltered): every 5 s checks that the anchor stays hidden (`VAR 1 -1`); a visible anchor is counted in `ambulance_shelter_leaks`, hidden again and logged (`anchor_visible`); every 60 s a heartbeat row (LifeScore, anchor `VAR 1`, distance to the ambulance).

## Risks and what contains them

| Risk | Containment |
| --- | --- |
| `VAR1 -1` accepted by `drive_object` for the anchor | `-1` is the documented Hidden state; the drive passes it literally, the anchor is set to `-1` again after the drive and by the sampler; a leak is counted (`ambulance_shelter_leaks`), traced (`anchor_visible`) and hidden again; first runtime check |
| The final heading of the anchor does not come out perpendicular | the visit positions (3 m, then 0.3 m at its `bearing2 90` side) would be wrong: the visit rows of the trace give the positions; the last leg (`bearing2 270` at 0.6 m, then the origin) is the one to tune |
| The visitor stops beside the ambulance or between its walls | only the bearing2 90 side of an anchor across the ambulance reaches the rear doors; the assistant stops outside them; the approach waypoint and the end point are traced (`visitor_at_rear_waypoint`, `visitor_at_rear_doors`) |
| The way to the rear doors crosses the ambulance | the first waypoint is the closest of three points around it (right 5 m, left 5 m, behind 10 m); the leg from there to the waypoint behind the rear doors stays clear of the ambulance |
| The stretcher drive or the registry movement fails | every failure runs the abort (nothing is left hidden, no record shelter, claim released) |
| The anchor drive is still running when the abort starts | the abort waits for `ambulance_shelter_anchor_done` to leave `running` before it moves the anchor back |
| The ambulance and the shelter load the same patient | claim on the patient, `ambulance_busy`, the dispatch wait on `loading`, no retry |
| A ticket arrives while the shelter is `sheltered` but the release does not run | release in the prepare shelter branch and in the recovery worker; idempotent; the trace shows `release` |
| The release drive fails | the anchor stays where it is, visible, with its `VAR 1`; traced (`release_drive_failed`) |
| Shelter in the wrong scenarios | per accident `preload` data, one patient, police, weather limits; any helicopter crew (3, 4 or 5) and any landing mode (ground, skid, hoist) shelters; no setting was added |

Not covered (by design, original constraints kept): more than one patient, crews of 4 or 5, the second ambulance, a patient that the ambulance can transport (normal loading).
