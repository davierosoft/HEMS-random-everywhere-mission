# Settings defaults, presets and user changes

Rule stated by the owner (2026-11-22). The mechanism is exactly this, with only small documented exceptions:

1. **Defaults at start.** Every settings global gets its default when the mission starts and finds the global `null` (the `if global eq null then set` blocks of `objective1`, plus `settings first run defaults`). Defaults stay in `objective1`: they are not moved, duplicated or re-run elsewhere. The value set at the first start is the value of the factory profile `DEFAULT` (owner rule 2026-11-22; `tools/test-aircraft-profile-presets.js` compares them). Seven globals keep a first-start value different from the factory `DEFAULT` profile on the owner's decision (2026-11-22): `BOARDING_HOLD_GLOBAL` 0 (profile 1), `HOIST_SPEED` 40 (50), `SAR_MAX_RADIUS` 3500 (3705), `CANCELTHRESHOLD` 80 (75), `MARSHAL_START_ENABLED` "no" ("yes"), `RINGONCE` 0 (1), `CARLSPBIT` 15 (3). Exceptions that are not plain defaults: `MISSION_ACCIDENT_MAX_RADIUS` / `MIN_RADIUS` (random range at mission start), `ORANGE_TARGET_SMOKE` and `HOIST_SAFETY_MONITOR` (normalised by their own macros).
2. **A preset rewrites once.** Loading a preset (factory profile, custom profile slot, saved preset) writes its values into the globals one time.
3. **The user wins.** A change made by the user afterwards stays, and the active profile becomes `CUSTOM`.
4. **Every new setting joins the presets** in the same change (rules "Options and presets" in `AGENTS.md`).

## What the load of a stored profile must never do

A stored custom profile saved before a setting existed has no key for it. Reading an absent table key gives `null`, and writing that `null` into the global erased the default of point 1 (seen on 2026-11-22: `LIFE_FREEZE_NEAR`, `KIT_WEIGHTS`, `PERF_SAMPLING`, `PERF_ALTITUDE_GATE`, `PERF_LOG_LEVEL`, `WIFI_AUTO` absent from the work-folder `global.json`, because the profile `R&E_custom_settings_prst_1` had no such keys and re-saved the null).

`load custom aircraft profile` therefore reads each key into the local `preset_read` (reset to `null` first) and writes the global only when `preset_read` is not `null`. A key the preset does not carry leaves the global, and its default, untouched. The next save of the profile stores the value, so the profile completes itself.

`tools/test-aircraft-profile-presets.js` fails when `load custom aircraft profile` writes a global straight from a table key.
