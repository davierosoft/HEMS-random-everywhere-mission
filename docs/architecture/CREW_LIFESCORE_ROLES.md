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
4. When pilot and copilot are both dead, or nobody is alive, the mission terminates immediately with the failed-mission screen and no RescueTrack message.

## Crash failures

Crash tiers also trigger aircraft failures through `crash random failures` when `ENGINE_FAILURES_ENABLED` is yes: 1 to 2 at 300 ft/s2 (no engine fires), one at 500 and one at 800 (engine fires allowed), applied by one sequential thread. The codes 1 to 28 are the original 0.997 failure table, restored in `apply aircraft failure` and shared with the random in-flight `failure engine`.

## Crash tiers

Acceleration is in ft/s2 (32 is about 1 g). Two independent paths, so a light impact (for example a quick pull-up to push-over) never blinds the crash path. There is no fixed cooldown: each path rearms when the aircraft calms down, and they share a lock only while applying damage.

| Path | Trigger | Threshold | Injury per person | Survival floor |
| --- | --- | --- | --- | --- |
| Minor | an axis at 32 | resultant 32 | 0 to 3 | 70 |
| Minor | the same event | resultant 64 | 3 to 8 | 40 |
| Crash | an axis at 150, or a resultant of 150 seen by the minor path | 150 | 7 to 20 | 20 |
| Crash | latch on every axis | 250 | 10 to 30 | none |
| Crash | latch on every axis | 330 | 10 to 30 | none |
| Crash | latch on every axis | 400 | 45 to 60, ignores the member lock | none |

After a trigger the resultant (X2 + Y2 + Z2) is sampled every 0.02 s for 0.3 s (there is no square root, thresholds are squared) and its peak sets every tier it reaches, in addition to the axis latches, because an impact split over several axes does not reach a threshold on any single one. The crash path rearms below 64, the minor path below 32.
A floor stops that tier from taking a member below it, so only crashes above 250 ft/s2 can kill. `CREW_LIFESCORE_TOTAL_IMPACT` counts the points really removed.

## Dispatch phase and RescueTrack

`DISPATCHER_AUTO` is 0 for automatic status reports and 1 for manual ones. The mission reads the local copy (set from the global in `objective1`; multiplayer forces it to 1). A crew abort or termination sets `L:DISPATCH_PHASE` to 7 (unavailable for dispatch) with `Update_raw from dispatchphase` only when automatic and not over an existing 7. Phases 5 and 6 are avoided because the NEW DISPATCH thread answers them with `ready dispatch`, which opens the briefing page. END SHIFT always sets 7.
