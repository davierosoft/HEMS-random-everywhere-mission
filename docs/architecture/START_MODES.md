# Start modes (`location_ref`)

The option "Dispatcher coverage area is centered on" decides how the starting point (`mission_start_location`, the return base) behaves.

| Mode | `location_ref` | Behaviour |
|---|---|---|
| START (default) | `mission_start_location` | The position of the helicopter at the first start is written once into `L:MISSION_START_LOCATION` and reused, never overwritten. Calculated again only when the LVARs are 0 (flight reloaded in MSFS). |
| CUSTOM | `custom_center_location` | Created at the start from the starting point, behaves like START and lives as long (`L:CUSTOM_CENTER_LOCATION`, never saved in the profile); the user changes it with the macro `Query dispatcher position custom`. |
| `$USER` (present position) | `$USER` | Every accept of a dispatch resets the starting point to the helicopter; `objective1` fixes it after the restart. More variety in the dispatches, but the return base moves. |

Rows `start_location_new`, `start_location_reused`, `start_location_recalculated`, `start_location_restored`, `accept_second_start`, `objective1_location_ref` of `dispatch_handoff_log` carry the option, the LVARs and the distance. Test: `tools/test-start-modes.js`.

## Saved profiles (2026-11-05)

Before 170.08 `$USER` was the default of the option, so many saved profiles hold it without the pilot having chosen it. A profile without the mark `location_ref_v` 2 that holds `$USER` loads as START LOCATION; every save writes the mark, so `$USER` chosen afterwards stays. A `$USER` chosen in a session and never saved is lost at the next load, as any unsaved setting. The LINK line of the briefing shows `ref`, the option in force. Test: `tools/test-locref-profile-migration.js`. Report of Daikan 2026-11-05: the crew does not leave the helicopter on the return to the starting point after the second dispatch; no location condition exists in `deboarding` (it waits for the rotor under 90, 40 and 30, the battery master off and the doors), so the stop of the crew is not explained by the starting point and still needs a snapshot (`base_return_log`, `rtb_step_watch`).
