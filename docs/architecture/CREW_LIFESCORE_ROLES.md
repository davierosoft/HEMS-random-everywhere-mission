# Crew LifeScore roles, seats and events

LifeScore members are persons, not seats. A person keeps its index while it moves inside the cabin.

| Member | Person | Seat at rest | Ground object |
| --- | --- | --- | --- |
| 1 | Pilot | captain (`L:IMPL_PILOT0`, 0 = present) | none |
| 2 | Medic | `SDK_CABIN_PAX_3` | `pax3` |
| 3 | Copilot / hoist operator | front right (`L:IMPL_PILOT1`, 0 = present) | `hoist_crew` |
| 4 | Rear crew or first helirescuer | `SDK_CABIN_PAX_1` | `pax1` |
| 5 | Rear crew or second helirescuer | `SDK_CABIN_PAX_2` | `pax2` |

`L:{HXX}_SDK_CABIN_PAX_n` is 1 when the seat is occupied. `SDK_CABIN_PAX_5` is the stretcher: 0 none, 1 empty, 2 with a patient.
The role table is inferred from the ground objects used by the fire exposure, hospital admission and hoist impact macros; the copilot is member 3. That index is used in one place, `crew survivors count`, and in the seat affinity lists of `crew seat tracker tick`.

## Seat tracker

`crew seat tracker tick` runs every 0.2 s and before every impact. It compares the four seat LVARs with the previous tick:

- A seat vacated and a seat filled in the same tick is a move. With several candidates the cabin-right seat takes the rear crew member first, as in a 4 crew hoist where the first rear member takes the right seat while the copilot is lowered.
- A person leaving without a filled seat is outside and takes no aircraft damage.
- A filled seat without a mover takes an outside person by seat affinity (front right 3, `PAX_3` 2, `PAX_1` 4, `PAX_2` 5). Persons above `CREW` exist only when helirescuers are boarded (`HELIRESCUER_BOARDED`).
- Every change is written to the `crew_seats` runtime trace.

## Events

Impacts mark members and run `crew impact events` once per batch:

1. 100 and 50 point alerts post only the on-screen message (no dispatcher list, no RescueTrack).
2. A member at 10 or less becomes critical and is locked: it takes no further damage. Other members keep taking damage. The 800 ft/s2 crash tier ignores the lock.
3. Critical and death events are posted with the survivors after the whole batch, so the survivor count is final. The first event aborts the mission toward the hospital.
4. When pilot and copilot are both unfit (dead or critical, 10 or less), or nobody is alive, the mission terminates immediately with the failed-mission screen and no RescueTrack message. With a single pilot and one trained technical crew member the second one can land the aircraft only while fit (EASA SPA.HEMS crew concept), so a lone critical pilot only aborts the mission. The texts say deceased or incapacitated.
5. A critical or dead medic (member 2) stops the effect of the manual treatment actions of the three patients: the physiology continues without treatment.
6. A random deceased on scene requests the police once, as the Request police button does.

## Crash failures

Crash tiers also trigger aircraft failures through `crash random failures` when `ENGINE_FAILURES_ENABLED` is yes: 1 to 2 at 300 ft/s2 (no engine fires), one at 500 and one at 800 (engine fires allowed), applied by one sequential thread. The codes 1 to 28 are the original 0.997 failure table, restored in `apply aircraft failure` and shared with the random in-flight `failure engine`.

## Crash tiers

One thread (`crash monitor loop`, started by `monitor aircraft crash impact`) runs the whole impact model every 0.02 s. The earlier design used one thread per path with a shared lock; in the 169.12 test the lock was left set after a minor impact, every later impact waited for it and the crew health froze (one minute, ten impacts, no damage). There is no lock now: an error in a tick is caught and traced (`monitor_error`) and the loop goes on. There is no watchdog on purpose: a thread that stops must be explained, not restarted. The stall is still being investigated; the leading suspect is the table I/O (`open_table` in `test tracker begin`) that every damage application performs.

A trigger opens a window of 6 samples (0.12 s) that records the acceleration peak and the loss of world velocity (`VELOCITY WORLD X/Y/Z`, ft/s) from the velocity 0.06 s earlier (squared sums, there is no square root). The acceleration only flags an impact. The velocity loss grades it, because a 20000 ft/min nose-down impact read 287 ft/s2 while a scrape along the ground read 502 ft/s2: no acceleration threshold separates them. Light inputs on the collective read 34 to 54 ft/s2, so the minor injuries start from 64 ft/s2.

| Tier | Trigger | Injury per person | Survival floor |
| --- | --- | --- | --- |
| Minor | acceleration resultant of 80 ft/s2 (about 2.5 g), rearm below 60 | 0 to 3 | 70 |
| Minor | acceleration resultant of 120 ft/s2 | 3 to 8 | 40 |
| Crash | acceleration of 150 ft/s2, a velocity loss of 25 ft/s (about 1500 ft/min) or a new simulator touchdown speed of 25 ft/s, rearm below 64 | 7 to 20 | 20 |
| Crash | velocity loss of 50 ft/s | 10 to 30 | none |
| Crash | velocity loss of 90 ft/s, with failures and fires | 10 to 30 | none |
| Crash | velocity loss of 150 ft/s | fatal for everyone aboard (100, ignores the member lock) | none |

An acceleration spike alone does not count: unless the touchdown or the velocity trigger fired, the velocity must have changed by at least 10 ft/s in the sampling window, otherwise the event is traced as `impact_ignored` and the paths wait for the rearm. The 169.20 test showed 144 and 174 ft/s2 spikes with 2 and 6 ft/s lost during soft touchdowns. Two triggers do not depend on catching an acceleration spike, because a single-frame spike can fall between two ticks: a new value of `PLANE TOUCHDOWN NORMAL VELOCITY` whose square reaches 625, and a loss of 25 ft/s of world velocity within one tick below 100 ft above ground. Both feed the same squared-velocity table. While slew mode is active (`IS SLEW ACTIVE`, including the repositioning done by the mission) and for 15 ticks after it every trigger is suppressed. `impact_detected` reports `td_hit`, `td`, `v_hit`, `d1`, height and tick, and `loop_alive` is traced every 500 ticks.

The damage chain is long. The stack of a thread only unwinds at a sleep, so every damage application, and every member inside it, is followed by a short sleep (0.02 s), and the catch of the loop starts with one. Without them the 169.16 test overflowed the stack (`RangeError: Maximum call stack size exceeded`) at the catastrophic tier: the chain stopped before `crew impact events`, so no death event and no MISSION FAILED modal followed.

The minor and the crash tiers have their own arming state, so a light impact never blinds the crash tiers. `impact_peak` traces the acceleration peak and `dv2` (the squared loss), `monitor_started` and `monitor_loop_started` the starts. `CREW_LIFESCORE_TOTAL_IMPACT` counts the points really removed.

## Dispatch phase and RescueTrack

`DISPATCHER_AUTO` is 0 for automatic status reports and 1 for manual ones. The mission reads the local copy (set from the global in `objective1`; multiplayer forces it to 1). A crew abort or termination sets `L:DISPATCH_PHASE` to 7 (unavailable for dispatch) with `Update_raw from dispatchphase` only when automatic and not over an existing 7. Phases 5 and 6 are avoided because the NEW DISPATCH thread answers them with `ready dispatch`, which opens the briefing page. END SHIFT always sets 7.

## Repair after a crew death

The failure table and the crash tiers write failures and persistent damage into variables that survive a restart of the mission, and nothing cleared them. Every recorded crew death sets the global `CREW_DEATH_REPAIR_PENDING`. At the start of the next mission (`objective1`) the flag repairs the helicopter (`reset aircraft failures`: engine failures, fires, FADEC, hydraulics, fuel, autopilot, backup, APCP, MGB chip and the persistent damage) and restarts the crew shift, then clears itself. A mission without deaths keeps its failures.

At landing the crew reports the problems to the technician in `deboarding`. The report used to run only when CRASH, VNE, FLI or a persistent damage above 84 was set, so a failure from the table alone was answered with "all fine". `DEBOARD_FAILURES_PRESENT` now counts the active failures in both branches.

## Crew monitors started once

`start crew lifescore monitor` refuses a second start in the same mission pass (`CREW_MONITOR_RUNNING`, reset by `objective1`) and traces `monitor_started n=` or `monitor_start_refused n=`, where n counts the starts for the whole flight in `L:CREW_MONITOR_STARTS`.

## No file access in the damage path

`apply crew lifescore impact` used to call `test tracker begin` at its start and `test tracker complete` at its end for every member, and both open the `Debug_Table` file (and the second saves it the first time). Both stalls of the 169.12 test (the traces stop right before the damage chain) happened where the chain opened that file, so the damage path no longer touches any table: it raises `CREW_TEST_TRACK_DUE` and the macro `record crew health test` (own thread, started with the monitor) does the bookkeeping.

Every call of the chain is traced (`apply_enter`, `member_apply`, `member_applied`, `apply_exit`, `events_exit`, and the stages of the loop), and a caught error leaves `monitor_error_caught` before `$ERROR` is read, so the last row of a stalled thread tells where it stopped. Every impact is also appended to the in-memory array `crash_event_log` (up to 300 records: time, acceleration, peak, `dv2`, tiers, scores and the signal probes); the snapshot copies it with `json:copy` and no file access of its own.
