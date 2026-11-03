# Start modes (`location_ref`)

The option "Dispatcher coverage area is centered on" decides how the starting point (`mission_start_location`, the return base) behaves.

| Mode | `location_ref` | Behaviour |
|---|---|---|
| START (default) | `mission_start_location` | The position of the helicopter at the first start is written once into `L:MISSION_START_LOCATION` and reused, never overwritten. Calculated again only when the LVARs are 0 (flight reloaded in MSFS). |
| CUSTOM | `custom_center_location` | Created at the start from the starting point, behaves like START and lives as long (`L:CUSTOM_CENTER_LOCATION`, never saved in the profile); the user changes it with the macro `Query dispatcher position custom`. |
| `$USER` (present position) | `$USER` | Every accept of a dispatch resets the starting point to the helicopter; `objective1` fixes it after the restart. More variety in the dispatches, but the return base moves. |

Rows `start_location_new`, `start_location_reused`, `start_location_recalculated`, `start_location_restored`, `accept_second_start`, `objective1_location_ref` of `dispatch_handoff_log` carry the option, the LVARs and the distance. Test: `tools/test-start-modes.js`.
