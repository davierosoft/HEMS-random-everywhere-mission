# Performance options

The Settings page has a collapsible **PERFORMANCE** section (local `tab13`) with three persistent options. They follow the aircraft-profile pipeline of the other `(P)` settings: Settings button (marks the profile CUSTOM), `save custom aircraft profile`, `load custom aircraft profile`, `resetdefault`, the four `aircraft factory` profiles and the null defaults in `objective1`. A profile saved before these options existed loads them as null, which every consumer reads as the default.

| Global | Values (default first) | Consumer |
| --- | --- | --- |
| `PERF_SAMPLING` | `fast`, `balanced`, `light` | tick of `crash monitor loop` (0.02 s, 0.05 s, 0.1 s) |
| `PERF_ALTITUDE_GATE` | `yes`, `no` | sleep of `crash monitor loop` above 450 ft above ground |
| `PERF_LOG_LEVEL` | `advanced`, `basic` | trace filter, diagnostic monitor cadence |

The description under each option names the lightest choice for performance: `light`, `yes` (gate ON) and `basic`. The three globals are part of `snapshot_common`, so every report states the options in force.

Factory profile values (`aircraft factory ...`): DEFAULT, EXPERT PILOT and EXPERT HEMS use `fast`, gate `yes`, log `advanced`; ROOKIE PILOT uses `light`, gate `yes`, log `advanced`.

## Crew health simulation off

`HOIST_SAFETY_MONITOR` (Settings, "Crew health simulation") not `yes` means no crew damage is applied anywhere, so the monitors that exist only for it wait: `wait_for global HOIST_SAFETY_MONITOR eq yes` at the head of each iteration of `record crew acceleration maxima`, `monitor crew fire exposure` and `recover crew lifescore over time`, and in the periodic option read of `crash monitor loop` (at most 50 ticks after the option is turned off; on wake the velocity history is re-seeded). The hoist risk monitors are already started only when the option is `yes`. While `crash monitor loop` waits, the crash path does not run at all: no crash damage to a patient aboard (`multipatient registry acceleration impact`), no crash-induced aircraft failures (`crash random failures`), no `crash_event_log` rows. The crew seat tracker keeps running (the crew casualty mapping uses it).

## Impact monitor

`crash monitor loop` reads the options at start and every 50 ticks (`cm_cfg`, `cm_sleep`, `cm_gate_on`). The burst of 6 samples taken after a trigger always runs at 0.02 s. Counters that count ticks (rearm after 3 calm ticks, 15 ticks of slew hold) scale with the chosen tick.

Altitude gate, evaluated at the end of each tick: with the gate on, `PLANE ALT ABOVE GROUND` above 450 ft (and below 9990, the read-error value), no slew hold and both paths armed, for 20 ticks in a row, the loop waits for `or [PLANE ALT ABOVE GROUND < 400, SIM ON GROUND = 1]`. On wake it re-seeds the velocity history (`cm_vx..z`, `cm_h1..h3`) and `cm_td_prev`, so a velocity change that happened while it slept (teleport, pause) is not graded as an impact. The tier floors and thresholds are untouched.

Known limit of the gate: a crash against a cliff or an obstacle higher than 450 ft above the ground below the aircraft is not seen while the loop sleeps. The option OFF keeps the loop always active. A change of the option takes effect at the next wake (the wait does not read it).

## Log level

`ground crew runtime trace` drops, in BASIC, the rows called with `level: "adv"` (the `loop_alive` heartbeat, `gate_sleep`, `gate_wake`) and the chatty channels `hems_visit`, `fire_ops`, `police_ops`, `scene_ops`, `crew_seats`, `crew_move`, `crew_tour`, `stretcher_move`. Everything that explains a crash, a hoist cable event, a crew casualty, a transport, a ground-operations step or a registry transition is recorded in both levels.

Cadence in BASIC: `location diagnostics monitor` 5 s (1 s in ADVANCED; it also triggers the automatic snapshots), `ground ops watch` 6 s (2 s; the 60 s stall rule is unchanged), `ambulance operations monitor` 30 s (10 s). The snapshots (manual and automatic), `crash_event_log`, the ground-ops checkpoint log and the dispatch handoff log are identical in both levels.

Tests: `tools/test-crash-detection.js` (sampling values, gate engaged and released, gate OFF, no false impact after a wake), `tools/test-diagnostic-ring-caps.js` (trace filter by level), `tools/validate-mission.js` (section, descriptions, persistence in every layer). Runtime behaviour is validated in `docs/testing/RUNTIME_VALIDATION.md`.
