# Shared data

Hangar and hospital waypoints of the R&E mission, and changes to the offline databases of the H145 (airports, aprons, hospital helipads, helipads), kept here for everybody. The Mission Companion app downloads them (`raw.githubusercontent.com/.../main/shared-data/`), checks them against `manifest.json`, writes the table `table_R&E_shared_waypoints.json` in the work folder of the mission and, if the user allows it, applies the database changes to the HPG files. The mission itself cannot read this folder (its `fetch` returns only a status code); it reads the table the app writes and keeps its own built-in points as a fallback.

| File | What |
| --- | --- |
| `waypoints.json` | `hangar_wps` and `hospitals_wps`: the records exactly as the mission reads them |
| `db/<type>.json` | `{"add":[...],"remove":[...]}` for `airport`, `apron`, `H_hospital`, `H_civil` |
| `manifest.json` | revision and sha256 of every file: **do not edit by hand** |

## Add a point (pull request or an issue with the JSON)

1. A **hangar** record: `id` (the name, unique), `WPspawnlat/lon` (where the technician appears: the hangar door), `max_rng_m` (the radius around it where the helicopter counts as at this hangar, 520 is usual), `WPtot` 0-3 and `WP1..3lat/lon` (the path from the door to the helicopter, in order; `null` for the unused ones), `technician_boarding` / `technician_deboarding` (`yes`/`no`), `marshal_present` (`yes` with `WPMarshalLAT/LON`, else `no` and `null`). A hospital record: `id`, `WPdoorlat/lon` (the door), `WPtot` and `WP1..3` (from the helicopter to the door; WP1 is where the ground staff wait), `marshal_present` like above. Optional `by` with your name.
2. A **database** change: `add` takes arrays, `[lat, lon, name, icao, iata]` for `airport`, `[lat, lon, pad_name, name]` for `H_hospital`, `[lat, lon, name]` for `apron` and `H_civil` (every text a string, empty when unknown; ICAO up to 4 capitals or digits, IATA up to 3); `remove` takes `{"lat":..,"lon":..,"radius_m":30,"name":"optional"}` (every record within the radius, and with the name when given).
3. Run `node tools/shared-data.js build` and `node tools/shared-data.js check` (or `npm test`): the build raises the revision and the hashes, the check validates ranges, `WPtot` against the points, unique ids and that the built-in points of the mission are all here.

An error in a record makes the app skip that record only; an error in a file makes the app keep the last good copy. The database changes are applied with the simulator closed and the originals are kept by the app.
