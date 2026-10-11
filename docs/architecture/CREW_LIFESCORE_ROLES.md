# Crew LifeScore roles, seats and events

LifeScore members are persons, not seats. A person keeps its index while it moves inside the cabin.

| Member | Person | Seat at rest | Ground object |
| --- | --- | --- | --- |
| 1 | Pilot | captain (`L:IMPL_PILOT0`, 0 = present) | none |
| 2 | Medic (`pax6`), always hoisted | `SDK_CABIN_PAX_3` | `hoist_crew` on the cable |
| 3 | Copilot, never hoisted: moves to `PAX_2` while the medic is lowered | front right (`L:IMPL_PILOT1`, 0 = present) | none |
| 4 | Rear crew or first helirescuer | `SDK_CABIN_PAX_1` | `pax1` |
| 5 | Rear crew or second helirescuer | `SDK_CABIN_PAX_2` | `pax2` |

`L:{HXX}_SDK_CABIN_PAX_n` is 1 when the seat is occupied. `SDK_CABIN_PAX_5` is the stretcher: 0 none, 1 empty, 2 with a patient.
The role table is confirmed by the user: the copilot (member 3) is never lowered on the hoist cable and the medic (`pax6`, `hoist_crew`, member 2) is always hoisted; the winch operator is `PAX_2` and stays aboard (in 4 crew the copilot moves to `PAX_2` while the second operator is lowered); the second operator lowered by a second hoist (4 and 5 crew, actor `hpax1`) is the person of `PAX_1`, member 4; a helirescuer on the cable is the member after the regular crew (`CREW` + boarded, 4 to 5). That index is used in one place, `crew survivors count`, and in the seat affinity lists of `crew seat tracker tick`.

## Seat tracker

`crew seat tracker tick` runs every 0.2 s and before every impact. It compares the four seat LVARs with the previous tick:

- A seat vacated and a seat filled in the same tick is a move. With several candidates the cabin-right seat takes the rear crew member first, as in a 4 crew hoist where the first rear member takes the right seat while the medic is lowered (the copilot moves to `PAX_2`).
- A person leaving without a filled seat is outside and takes no aircraft damage.
- A filled seat without a mover takes an outside person by seat affinity (front right 3, `PAX_3` 2, `PAX_1` 4, `PAX_2` 5). Persons above `CREW` exist only when helirescuers are boarded (`HELIRESCUER_BOARDED`).
- Every change is written to the `crew_seats` runtime trace.

## Events

Impacts mark members and run `crew impact events` once per batch:

1. 100 and 50 point alerts post only the on-screen message (no dispatcher list, no RescueTrack).
2. A member at 10 or less becomes critical and is locked: it takes no further damage. Other members keep taking damage. The 800 ft/s2 crash tier ignores the lock.
3. Critical and death events are posted with the survivors after the whole batch, so the survivor count is final. A death aborts the mission toward the hospital; a critical member lets the user choose Divert or Continue (see [MISSION_END_FLOW.md](MISSION_END_FLOW.md)).
4. When pilot and copilot are both unfit (dead or critical, 10 or less), or nobody is alive, the mission terminates immediately with the failed-mission screen and no RescueTrack message. With a single pilot and one trained technical crew member the second one can land the aircraft only while fit (EASA SPA.HEMS crew concept), so a lone critical pilot only aborts the mission. The texts say deceased or incapacitated.
5. A critical or dead medic (member 2) stops the effect of the manual treatment actions of the three patients: the physiology continues without treatment.
6. A random deceased on scene requests the police once, as the Request police button does.

## Crash failures

Crash tiers also trigger aircraft failures through `crash random failures` when `ENGINE_FAILURES_ENABLED` is yes, drawn from the severity ladder (`apply ladder failure`, one sequential thread), from the lightest to the heaviest: 1 APCP, 2 autopilot 1/2 and the eight SEMA failures (pitch, roll, yaw and collective of SEMA 1 and 2, equated to the autopilot), 3 MGB chip, 4 FADEC 1/2 level 1, 5 backup, 6 FADEC 1/2 level 2, 7 fuel failures (forward, aft, main, supply 1 and 2) and the fuel leakage, 8 hydraulic, 9 T/MGB mechanical damage, 10 engine failed, 11 engine fire. The severe tier (50 ft/s) applies 1 to 2 failures from level 1 to 10 (no engine fire); the two highest tiers (90 ft/s and the catastrophic one) apply one failure each from level 7 to 11. Every level has the same chance, then every code of the level. The failure codes 1 to 28 are the original 0.997 table, unchanged in `apply aircraft failure` and shared with the random in-flight `failure engine`; the codes 30 to 40 (30 to 37 the SEMA failures `FAIL_PITCH_SEMA1`, `FAIL_ROLL_SEMA1`, `FAIL_YAW_SEMA1`, `FAIL_COLLECTIVE_SEMA1` and the same four of SEMA 2, 38 `FAIL_FUEL_MAIN`, 39 and 40 `FAIL_FUEL_SUPPLY1` and `FAIL_FUEL_SUPPLY2`) belong to the ladder only: the in-flight `failure engine` still ends at 29, so it never draws them, and they are read by the repair, the flag of the RESET FAILURES button, the take-off caution check and the two deboarding failure lists, like the others. The ten failures of level 2 (autopilot 1, autopilot 2 and the eight SEMA) have the same chance each, autopilot 1 and 2 then pick one of their two codes; the fuel failures stay in level 7, below hydraulics, the T/MGB damage and the engine failures, because the engines pump their own fuel with the low pressure geared pumps; the crash tier thresholds will have to take the new level contents into account (L:FAILURE, the checklists and the repair keep their meaning); the ladder is only an ordering layer (`aircraft failure ladder`), with the duplicates 20 to 28 staying with their level and the new code 29, the fuel leakage, handled by its own macro.

`fuel leakage` loses a constant amount, drawn once between 0.2 and 0.8 kg, every 5 seconds (at most 9.6 kg per minute) from the center tank level in proportion to the total fuel weight, until the fuel ends or `reset aircraft failures` runs. `tools/test-failure-ladder.js` proves the order, the tier ranges and the leak rate.

## Crash tiers

One thread (`crash monitor loop`, started by `monitor aircraft crash impact`) runs the whole impact model every 0.02 s. The earlier design used one thread per path with a shared lock; in the 169.12 test the lock was left set after a minor impact, every later impact waited for it and the crew health froze (one minute, ten impacts, no damage). There is no lock now: an error in a tick is caught and traced (`monitor_error`) and the loop goes on. There is no watchdog on purpose: a thread that stops must be explained, not restarted. The leading suspect was the table I/O (`open_table` in the Test Tracker calls) that every damage application performed; those calls no longer exist.

A trigger opens a window of 6 samples (0.12 s) that records the acceleration peak and the loss of world velocity (`VELOCITY WORLD X/Y/Z`, ft/s) from the velocity 0.06 s earlier (squared sums, there is no square root). The acceleration only flags an impact. The velocity loss grades it, because a 20000 ft/min nose-down impact read 287 ft/s2 while a scrape along the ground read 502 ft/s2: no acceleration threshold separates them. Light inputs on the collective read 34 to 54 ft/s2, so the minor injuries start from 64 ft/s2.

| Tier | Trigger | Injury per person | Survival floor |
| --- | --- | --- | --- |
| Minor | acceleration resultant of 80 ft/s2 (about 2.5 g), rearm below 60 | 0 to 3 | 70 |
| Minor | acceleration resultant of 120 ft/s2 | 3 to 8 | 40 |
| Crash | acceleration of 150 ft/s2, a velocity loss of 25 ft/s (about 1500 ft/min) or a new simulator touchdown speed of 25 ft/s, rearm below 64 | 7 to 20 | 20 |
| Crash | velocity loss of 50 ft/s | 10 to 30 | none |
| Crash | velocity loss of 90 ft/s, with failures and fires | 10 to 30 | none |
| Crash | velocity loss of 150 ft/s | fatal for everyone aboard (100, ignores the member lock) | none |

Chain of bounces: the crash path rearms after three calm ticks (acceleration below 64 ft/s2), so a heavy impact that comes less than that after a light one used to be swallowed (the 169.25 test: about 120 ft/s lost graded 0000 right after one of about 26 ft/s, so no member could go below the floor of 20). While the crash path is disarmed, the same two triggers (150 ft/s2, or the velocity and touchdown signals) still open the window as long as the heaviest tier applied since the last rearm (`cm_chain_tier`) is below the catastrophic one, and the window applies only the tiers above that chain tier: the same or a lighter tier is never applied twice, the floors and the injuries of each tier are unchanged. `tools/test-crash-detection.js` runs the production loop on scripted sensors.

An acceleration spike alone does not count: unless the touchdown or the velocity trigger fired, the velocity must have changed by at least 10 ft/s in the sampling window, otherwise the event is traced as `impact_ignored` and the paths wait for the rearm. The 169.20 test showed 144 and 174 ft/s2 spikes with 2 and 6 ft/s lost during soft touchdowns. Two triggers do not depend on catching an acceleration spike, because a single-frame spike can fall between two ticks: a new value of `PLANE TOUCHDOWN NORMAL VELOCITY` whose square reaches 625, and a loss of 25 ft/s of world velocity within one tick below 100 ft above ground. Both feed the same squared-velocity table. While slew mode is active (`IS SLEW ACTIVE`, including the repositioning done by the mission) and for 15 ticks after it every trigger is suppressed. `impact_detected` reports `td_hit`, `td`, `v_hit`, `d1`, height and tick, and `loop_alive` is traced every 500 ticks.

The damage chain is long. The stack of a thread only unwinds at a sleep, so every damage application, and every member inside it, is followed by a short sleep (0.02 s), and the catch of the loop starts with one. Without them the 169.16 test overflowed the stack (`RangeError: Maximum call stack size exceeded`) at the catastrophic tier: the chain stopped before `crew impact events`, so no death event and no MISSION FAILED modal followed.

The minor and the crash tiers have their own arming state, so a light impact never blinds the crash tiers. `impact_peak` traces the acceleration peak and `dv2` (the squared loss), `monitor_started` and `monitor_loop_started` the starts. `CREW_LIFESCORE_TOTAL_IMPACT` counts the points really removed.

## Dispatch phase and RescueTrack

`DISPATCHER_AUTO` is 0 for automatic status reports and 1 for manual ones. The mission reads the local copy (set from the global in `objective1`; multiplayer forces it to 1). A crew abort or termination sets `L:DISPATCH_PHASE` to 7 (unavailable for dispatch) with `Update_raw from dispatchphase` only when automatic and not over an existing 7. Phases 5 and 6 are avoided because the NEW DISPATCH thread answers them with `ready dispatch`, which opens the briefing page. END SHIFT always sets 7.

## Repair after a crew death or a critical member

Every crew member who becomes critical (LifeScore 10 or less, `crew member state event`) also sets `CREW_DEATH_REPAIR_PENDING`, so the repair below applies after a critical crew too. The flag is a global read at the start of the next mission, so it works for a reload and for a restart by hand alike. The settings page (Flight assists, `(P)Helicopter failures:`) has a `RESET FAILURES` button next to ENABLED and DISABLED that runs `reset aircraft failures` at any time; it is replaced by an inactive `NO FAILURES` button while the local `FAILURES_ACTIVE` is 0. `refresh aircraft failures flag` computes it from the same variables that the reset clears (not from `L:FAILURE`, the draw of a failure not yet occurred; the reset leaves `L:FAILURE` and the random failure settings untouched, so the failure engine keeps working as before) and runs when the flight assists are opened, after every failure (`apply aircraft failure`, `fuel leakage`) and after every reset.

The text below was written for the death flag; the repair is the same.

The failure table and the crash tiers write failures and persistent damage into variables that survive a restart of the mission, and nothing cleared them. Every recorded crew death sets the global `CREW_DEATH_REPAIR_PENDING`. At the start of the next mission (`objective1`) the flag repairs the helicopter (`reset aircraft failures`: engine failures, fires, FADEC, hydraulics, fuel, autopilot, the eight SEMA failures, backup, APCP, MGB chip and the persistent damage; it clears the failure variables only, so a system that the failure disengaged, such as the backup SAS (BKUP on the APCP), has to be engaged again by hand) and restarts the crew shift, then clears itself. A mission without deaths keeps its failures.

At landing the crew reports the problems to the technician in `deboarding`. The report used to run only when CRASH, VNE, FLI or a persistent damage above 84 was set, so a failure from the table alone was answered with "all fine". `DEBOARD_FAILURES_PRESENT` now counts the active failures in both branches.

## Crew monitors started once

`start crew lifescore monitor` refuses a second start in the same mission pass (`CREW_MONITOR_RUNNING`, reset by `objective1`) and traces `monitor_started n=` or `monitor_start_refused n=`, where n counts the starts for the whole flight in `L:CREW_MONITOR_STARTS`.

## No file access in the damage path

The damage path (`apply crew lifescore impact` and the macros it calls) never opens or saves a table: in the 169.12 test both stalls (the traces stop right before the damage chain) happened where the chain opened the Debug_Table file for the test bookkeeping. That bookkeeping (Test Tracker) was removed.

Every call of the chain is traced (`apply_enter`, `member_apply`, `member_applied`, `apply_exit`, `events_exit`, and the stages of the loop), and a caught error leaves `monitor_error_caught` before `$ERROR` is read, so the last row of a stalled thread tells where it stopped. Every impact is also appended to the in-memory array `crash_event_log` (up to 300 records: time, acceleration, peak, `dv2`, tiers, scores and the signal probes); the snapshot copies it with `json:copy` and no file access of its own.
