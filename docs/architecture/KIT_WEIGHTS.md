# Payload station weights: people, hoist and installed kits

The simulator does not change the helicopter weight when a person boards or a kit (hoist, searchlight, floats, skids, radome...) is installed. The mission writes it on the six payload stations (`PAYLOAD STATION WEIGHT:1..6`), the same six the crew uses.

## Model

Station weight = the person (global `STATION_n`, 90 kg by default) if the seat shows someone or the hoist flag is set, plus the kit mass of the station. It is recomputed as an absolute value by `station weights recompute`, never accumulated, so a reloaded mission, a manual change or a missed event cannot leave a drift. What the simulator held before on the six stations is overwritten.

| Station | Seat | Presence |
| ---: | --- | --- |
| 1 | copilot, cockpit left | `IMPL_PILOT1` = 0 |
| 2 | pilot, cockpit right | `IMPL_PILOT0` = 0 |
| 3 | PAX 1, front cabin left | `SDK_CABIN_PAX_1` = 1 |
| 4 | PAX 2, front cabin right | `SDK_CABIN_PAX_2` = 1 |
| 5 | stretcher with patient | `SDK_CABIN_PAX_5` = 2 (1 is an empty stretcher: no weight) |
| 6 | PAX 3, rear cabin right | `SDK_CABIN_PAX_3` = 1 |

(All LVARs are `L:{HXX}_...`; they are the ones the crew seat tracker already reads.)

## Who recomputes

- **Thread `STATION WEIGHTS`**: waits with one `or` of `wait_for`, each LVAR against the value stored by `station weights read` (the six seat LVARs, the six crew weights `STATION_n`, the option `KIT_WEIGHTS`, the 22 kit LVARs). On any change it stores the new values, recomputes and waits again (0.5 s pause). It starts when `HXX` is known, 20 s later.
- **`objective1`**: clears the hoist flags and recomputes after the crew weight defaults, so a reloaded mission starts from the aircraft as it is.
- **Technical page switch** and **hoist flags** (`set station weight`) recompute at once.

No boarding, deboarding, ground operation or transfer writes a station weight any more: the seat triggers (`H:..._PAX_n_ON/OFF`, `PILOT_FO`) move the seat LVARs and the thread follows.

## Hoist

The seat LVAR reads empty as soon as the person starts down the cable, but the weight stays until the person touches the ground, and it is added when the hook starts rising with someone. These moments are the existing calls of the hoist macros (`09-hoist-ground-ops.json` and the `... hoist` macros of `05-navigation-queries.json`): `set station weight` (params `station`, `occupied`) now sets the flag `HOISTOCC_n` and recomputes. A station counts the person when the seat LVAR OR the flag says so, so a person seated again after the hoist is counted once and a cleared flag never removes a seated person. Not modelled: the load hanging on the cable itself is on the stations only through these flags.

## Kits

`kit weights target` reads the SDK LVARs of the installed kits into `KITT_1..6` (zero while `KIT_WEIGHTS` is not `yes`).

| Kit (LVAR) | kg | Stations (kg each) |
| --- | ---: | --- |
| HISL searchlight | 25 | 1: 25 |
| HOIST | 50 | 4: 50 |
| EMERGENCY_FLOATS | 40 | 3, 4, 5, 6: 10 |
| SKID_SKI (snow skids) | 30 | 3, 4: 10; 5, 6: 5 |
| AIRCONDITIONING | 30 | 3-6: 7.5 |
| IBF (`PERSIST_IBF_INSTALLED`) | 20 | 5, 6: 10 |
| SKID_LONG | 20 | 5, 6: 10 |
| RADOME 1 / RADOME 2 | 4 / 12 | 1, 2: 2 / 6 |
| WSPS_TOP / BOTTOM / SKID | 5 / 4 / 3 | 1, 2 |
| SKID_SETTLING_PREVENTERS | 10 | 5, 6: 5 |
| ADELT | 7 | 5, 6: 3.5 |
| ACAS, HMD | 4 each | 1, 2: 2 |
| SKID_CAPS | 3 | 1, 2: 1.5 |
| HTAWS, SECOND_LANDING_LIGHT, CHIN_WINDOW_PLATES | 2 each | 1, 2: 1 |
| FUELFLOWSENSOR | 1 | 5, 6: 0.5 |
| SUN_VISORS, FABRIC_FLARESHIELDS (`PERSIST_COCKPIT_*`) | 1 each | 1, 2: 0.5 |

The masses are estimates: the flight manual gives no installed mass per kit (its section 6 holds only blank forms; the only per-kit figures are the performance corrections "Delta Mass" of FMS 9.1-1: HISL -35, floats -35, hoist -25, snow skids -25, dual cargo hook -10, which are not weights). Expect about 30 percent of error. They live in `kit weights target`; correct them there. `HOOK`, `WEAPONS_SIGHT` and `SAFETY_PATCHES` have no readable LVAR (only `_ON`/`_OFF` events) and carry no mass until one is confirmed.

## Option

Technical page, "WEIGHT OF THE INSTALLED KITS": ON/OFF, global `KIT_WEIGHTS` (`yes`, `no`; default `no`). It is a profile option like the other `(P)` settings: it marks the profile CUSTOM, is saved and loaded with the custom profile, cleared by `resetdefault`, defaulted in `objective1`, set to `no` by the four factory profiles and reported in the diagnostic snapshot. With the option off the people are still recomputed from the seats, only the kits weigh nothing.

## Limits

- The seat LVARs are the truth: if one does not follow its seat event, the weight does not follow either. To be verified in the simulator for each of the six seats (and the stretcher).
- A hoist flag left set by an interrupted hoist stays until the next flag call or the next `objective1`.
- Test: `tools/test-kit-weights.js`. Runtime behavior: `docs/testing/RUNTIME_VALIDATION.md`.
