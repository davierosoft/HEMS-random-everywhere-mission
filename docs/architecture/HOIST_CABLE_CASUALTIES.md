# Hoist cable casualties

What happens to the hoist operator, the heli rescuer and the patient while they hang on the cable. The mission has no data of the cable but its length (`hoist_get_reel_distance`) and the height of the hook above the ground (`hoist_get_distance_from_ground`), so the risk comes from the height of the hook over time (ground impacts) and, with the hoist out, from the original speed, bank and load ladders. All of it works only with the crew health simulation on (`HOIST_SAFETY_MONITOR` yes). Runtime behavior is PENDING in the simulator.

## The two procedures

| Procedure | `HOIST_OUT` | What hangs on the cable | Who judges the risk |
| --- | --- | --- | --- |
| Temporary hoist: the operator (or a heli rescuer) goes down, comes back up, with the patient on the stretcher when the patient is hoisted | 0 (default) | the person on the way down or up | the ground impact monitor (measured descent rate of the hook) |
| Hoist out (button `Keep patient out after hoisting`): the operator and the patient stay on the hook and the helicopter flies | 1 | the operator and the patient | the three ladders of the original mission in `Hoisting back up` (speed 75/95/105/115 kt, bank 0.55/0.7/0.8/0.9 rad, load 45/46/48.9/50/51 ft/s2), unchanged, now ending in the cable casualty |

The temporary hoist has **no acceleration model**: in the earlier Codex versions the operator died during normal hoist operations. The accelerations judge only the hoist out, with the thresholds of the original mission.

## Flags (locals, all reset by `hoist cable reset` at the start of every mission)

| Local | Meaning |
| --- | --- |
| `HOIST_CABLE_PHASE` | `down` (a person rides the hook down), `ground` (the hook reached the ground), `up` (a person comes up), `empty` (empty hook going up), `out` (hoist out), empty string otherwise |
| `HOIST_CREW_ON_CABLE` | 1 while the operator or the heli rescuer is hooked (`HOIST_CABLE_PERSON_TYPE` crew or helirescuer) |
| `HOIST_CABLE_PATIENT` | 1 while the stretcher is hooked (`hoist up operator+injured`); with the hoist out the stretcher stays hooked |
| `HOIST_CABLE_INJURED` | 1 when a person hurt on the way down waits for the release at the ground; `HOIST_INJURED_WATCH` 1 while the watch thread runs |
| `CREW_FATAL_ON_HOOK` | yes when the operator died on the hook and did not fall |
| `CREW_FATAL_POSITION_FIXED` | yes between the release of a dead operator and `replace deceased crew object`, which then keeps the position of the release |

`hoist down` puts a person on the cable only when its caller passes `person 1` (and `person_type`): `HOISTING` (2 sites), `hoist heli rescuer down`, `drop heli rescuer hoist` (2 sites). The descents of an empty hook (`Hoisting back up`, `pick heli rescuer hoist`, `hoist heli rescuer up`) do not: before, they hurt a crew member that was on the ground. Each person descent calls `hoist cable person released` after the hook let the person go.

## Ground impact (`start hoist attached risk monitor`)
One thread per cable trip, started by the macros that put a person on the cable. Armed when the hook is under 15 ft. The descent rate of the hook is sampled every 0.15 s; when the hook passes under 1.5 ft: over 8 ft/s `touched down abruptly` (severity 1, score 8), over 12 ft/s `hit the ground hard` (severity 2, score 30), over 18 ft/s fatal (severity 3). The normal descent of the hook measured 5.7 ft/s in the 169.31 test and hurt the medic with the old 4 ft/s tier: the tiers sit above it. Every touch down is traced, with or without damage. The hook always releases at the ground. The monitor waits for the hook or for the end of the trip.

## The casualty (`hoist cable casualty`)

Parameters: `severity` 1 injury, 2 serious, 3 fatal; `score` (damage), `cause`, `source` (`impact` or `hoist_out`), `subject` (`operator`, `patient`, `both` or empty: everybody on the cable), `detach` (`yes`, `no`, empty: automatic), `text` (message). A lock keeps two events from running together.

| Severity | Operator | Patient |
| --- | --- | --- |
| 1 | the damage, never below LifeScore 20 | 1.5 times the damage, never below 10 |
| 2 | 25 percent dies, otherwise the damage with the floor 20 | 45 percent dies, otherwise 1.5 times the damage with the floor 10 |
| 3 | dies | dies |

The floor of 20 keeps an injury that is not fatal above the critical threshold of the crew emergency (10): the shift goes on with a hurt operator. The operator damage goes through `apply hoist crew lifescore impact` (the medic (pax3, `hoist_crew`) is always member 2, never the copilot member 3; the second operator of a second hoist (4 and 5 crew, actor `hpax1`, the person of PAX_1) is member 4; a heli rescuer is the member after the regular crew, `CREW` + boarded, 4 to 5). `hoist down` and the up macros set `HOIST_CABLE_MEMBER` and `HOIST_CABLE_OBJECT` (HOISTING: second operator 4/`hpax1` first, medic 2/`hoist_crew` second; the same order going up), and a dead second operator is replaced by `replace deceased crew object` like the medic, the patient damage through `multipatient registry acceleration impact` with the slot of the HEMS patient (the registry LifeScore and the local `LIFESCORE`, `LIFESCORE2`, `LIFESCORE3`).

### Does the hook let go?
- At the ground (a `hoist_crew` coupled to the hook, or the hook under 6 ft): yes.
- In the air: yes in 60 percent of the cases (a draw), no otherwise.
- The caller can force it (the hoist out ladders: yes).

### Where do they appear?
At the user aircraft (`$USER`), at the moment of each release (`hoist cable fall position`, called by each release). Two people that let go at different times appear at two places that follow the helicopter. `replace deceased crew object` keeps that position for the operator (`CREW_FATAL_POSITION_FIXED`); for any other crew death it still takes the position of the object.

### Hook released
- The operator: cable objects off (`HUMAN_1_OFF`, `HUMAN_1_BAG_OFF`), `HOIST_CREW_ON_CABLE` 0, fatal LifeScore impact. The dead asset (random of the `deadmen` list, under the name `hoist_crew`) is created by `replace deceased crew object`.
- The patient: stretcher off (`STRETCHER_OFF`), the patient dies in the registry (the death cause is the cause of the event) and `hoist_lost_patient` lies at the fall position: the injured packed in the hoistable stretcher (`Airbus H145 Injured Human`, `VAR 1` 1 of the HPG state table), not a dead asset.

### Hook keeps the person
The operator is dead and stays on the cable: `CREW_FATAL_ON_HOOK` yes, no dead asset is created on the ground (`replace deceased crew object` skips the operator), the cable objects stay and the hoist brings him aboard with the normal sequence. The patient dies in the registry and stays on the stretcher, which comes aboard. Whatever stays attached comes aboard.

### Injured operator released at the ground
A person hurt (not fatally) on the way down is flagged (`HOIST_CABLE_INJURED`) and `hoist cable injured watch` starts. When the hook stays at the same height (less than 1 ft of change) for 4 s while it is under 6 ft, `hoist cable release injured` takes the cable objects off, makes `hoist_crew` stand (`COUPLED` 0, `VAR 1` 1) and clears the cable flag. The operations go on with the LifeScore that the injury left. A heli rescuer is released without touching `hoist_crew`. The watch ends when the person is gone from the cable or after 2 minutes. A person hurt on the way up keeps rising with the cable: nothing to release (the flows count the operator as aboard).

### Death of the operator
The mission is cancelled by the crew emergency (the existing flow): the hoist down functions are not needed any more.

## Hoist out
The three ladders of the original mission keep their thresholds and messages. Their fatal branches (speed over 115 kt, bank over 0.9 rad, load over 51 ft/s2) call the casualty for both (severity 3, hook released, subject `both`). Their stretcher branches (speed over 105 kt, bank over 0.8 rad, load over 50 ft/s2) call the casualty for the patient (fatal, stretcher off) and, for speed and bank, a severity 1 injury of the operator (15 and 45). The six notices below the fatal tiers are traced. The `PATIENT_DEATH_CAUSE` is now set by the patient death (`HOIST LOSS (HIGH SPEED)`, `(EXCESSIVE BANK)`, `(EXCESSIVE LOAD)`).

## Trace and diagnostics
- Rows of the ground crew runtime trace, macro `hoist_cable` (kept in every snapshot): `cable_reset`, `person_on`, `hook_at_ground`, `person_released`, `up_start`, `up_end`, `impact_monitor_start`, `impact_touch` (rate, height, phase, patient), `impact_monitor_end` (impacts, highest rate), `casualty` (source, severity, who, who dies, detach, hook height, the draws), `fall_position`, `operator_lost`, `patient_lost`, `patient_damage`, `injured_watch_start`, `injured_watch_rest`, `injured_released`, `injured_watch_end` (person gone or timeout), `ladder_notice` (the six notices of the hoist out ladders), `casualty_exception`.
- Debug Center, MEDICAL section: `HOIST CABLE` (phase, operator, patient, out, type, injured), `HOIST IMPACT` (monitor started and active, impacts, highest descent rate, releases, watch), `HOIST CASUALTIES` (events, last, cause, fall, on hook, position fixed). The same locals are in the snapshot. The old rows (`HOIST RISK`, `HOIST ATTACHED`) showed locals that nothing wrote and are gone.

## Risks and what contains them

| Risk | Containment |
| --- | --- |
| An empty hook hurt a crew member | the person flag is set only by the callers that put a person on the hook, and cleared when the person is unhooked |
| A normal hoist operation kills the operator | no acceleration model in the temporary hoist; the impact monitor needs a hook under 1.5 ft and a measured descent rate over 8 ft/s, the first tier costs 8 points; the normal descent (5.7 ft/s measured) costs nothing |
| Two events at once | the lock `HOIST_CABLE_BUSY`; an exception in the casualty is traced and releases the lock |
| A dead operator that stays on the hook leaves a ghost | `replace deceased crew object` skips the hoist operator, the cable objects stay |
| A person hurt on the way down hangs forever | the watch releases at the ground after 4 s at the same height (2 minutes at most); the original hover conditions of the flow go on |
| The fall position is wrong | the position is the user aircraft at the moment of each release and is traced |
| A monitor thread blocks forever on a wait | the impact monitor waits for the hook or for the end of the trip; one thread per kind, with a guard |

Not covered: the swing of the cable is not simulated; an operator hurt on the way up is not released (the flows count him as aboard: it would need an "operator left on the ground" state); the cable of the fire rescue and the winch of the second hoist have no extra model.
