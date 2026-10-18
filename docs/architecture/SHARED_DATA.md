# Shared waypoints and offline database changes

User request of 2026-10-18: the custom hangar waypoints (path from the hangar door to the helicopter) and hospital waypoints (path from the pad to the hospital door, the waiting point of the medical staff) were collected on Discord and added to the mission file by hand. They are now a shared database on GitHub that the Mission Companion app downloads, so anybody's addition reaches everybody without a new mission build. The same repository folder holds changes to the offline databases of HPG (`html_ui\HPGH145-System\db`: airports, aprons, hospital helipads, helipads) that the app can apply with the simulator closed. Companion side: `docs/architecture/SHARED_DATA.md` of `HPG-Mission-Companion`.

## Facts proven in the simulator (`standalone-tests/shared-waypoints-test.json`, 2026-10-18)

- A table file written outside the mission (`work\table_R&E_<data name>.json`, flat JSON object) is read by `open_table` + `{"table":...,"key":...}`, and a change made while the simulator runs is read when the table is opened again (`version` 1 to 2).
- Arrays of records (`hangar_wps`, `hospitals_wps`) with numbers, text and `null` are read and written back unchanged; a `null` field reads as `null` (`typeof` object), a missing key reads as `undefined` (`ne null` is false).
- `fetch` of an `https` GitHub file answers `$FETCH_STATUS` 200 (404 for a missing file), but the body is **in no variable** (`$FETCH_RESPONSE`, `RESULT`, `BODY`, `DATA`, `TEXT` all empty); the HPG documentation names only `$FETCH_STATUS`. The same for `/VFS/html_ui/HPGH145-System/db/H_hospital.json` (status 200, no content). The mission cannot read data from the internet or the offline databases: the app does it.
- `try`/`catch` works in a mission.

## Data flow

`shared-data/` (git) -> app (sha256 checked, merged with the user's own file) -> `table_R&E_shared_waypoints.json` in the work folder + `L:HMC_DATA_REV` -> macro `shared wps load` -> locals `shared_hangars_all`, `shared_hospitals_all`.

- Data name `Shared_Waypoints_Table` = `R&E_shared_waypoints` (`data/01-persistence-tables.json`).
- `shared wps load` (`05-navigation-queries.json`): reads `L:HMC_DATA_REV`; when the table was never loaded or the counter changed, it opens the table again, builds two arrays in params (the table records first, then the built-in records of `data hangar wps` / `hospitals wps` as a fallback) and assigns them to the locals at the end. No lock (a thread killed while holding it would block every later call); a damaged table is caught (`try`) and leaves only the built-in records. Without the app, or without the file, behaviour is the old one.
- `user hospital WP`, `user hospital WP for transfer`, `user hangar WP` call the loader and walk the local list instead of the static list. They take the first record that matches (a hospital door within 560 m of the target, a hangar within `max_rng_m`), so a record of the table wins over a built-in record of the same place.
- The 5 custom hospitals of the mission (`CUSHOS1..5` in the settings) are untouched; the offline databases are used by the tablet of HPG, not by the mission.

## Contribution and checks

`tools/shared-data.js` (`check`, `build`, `extract`) validates and maintains `shared-data/manifest.json`; `tools/test-shared-data.js` (in `check-workspace`) checks the files, that every built-in record of the mission is in `shared-data/waypoints.json` with the same fields (so the file is the one place to edit; the built-in list stays as the fallback and must not drift), and the loader and its three callers. Adding a record: edit `shared-data/waypoints.json` (or `db/<type>.json`), then `node tools/shared-data.js build`; contributors without git paste the JSON in a GitHub issue (the app's **Share my points** button prepares it).
