100 - Optional ambulance at custom hospitals: yes/no choice and parking location

Repository: KeKKERUUU/RandomEverywhereInstaller (posted; updated 2026-11-12 with the exact fields, the mission side is in the sources)

## What the app must write for every custom hospital it creates

The custom hospitals live in the shared data (static list and external file, key `hospitals_wps` of `Shared_Waypoints_Table`). Every hospital entry gets three new fields, next to the existing `marshal_present` / `WPMarshalLAT` / `WPMarshalLON`:

| field | type | value |
|---|---|---|
| `ambulance_present` | string | `"yes"` or `"no"` (default `"no"`) |
| `WPAmbLAT` | number or null | latitude of the ambulance parking, required when `ambulance_present` is `"yes"`, otherwise `null` |
| `WPAmbLON` | number or null | longitude of the ambulance parking, same rule |

Rules:

1. Write the three fields in every entry, also when the ambulance is no (`"no"`, `null`, `null`). The mission also accepts entries without the fields and reads them as no, so old files keep working.
2. There is no heading field: the mission points the ambulance at the stretcher by itself. Do not add one.
3. The mission reads the fields only for the hospital that contains the destination (door within 560 m, the same match used for the waypoints). Nothing else is needed to link the ambulance to the hospital.
4. The ambulance drives along the waypoints of the same entry (`WPtot`, `WP1lat/lon` .. `WP3lat/lon`), forward to the last one and back in reverse. When `WPtot` is 0 it drives to the door (`WPdoorlat/lon`). The app must therefore let the user define the waypoints along a road that a car can drive, and put the parking on a paved surface (the parking is where the ambulance stands from the arrival of the helicopter).
5. `ambulance_present` is a string `"yes"`/`"no"`, not a boolean, like `marshal_present`.
6. A yes with `WPAmbLAT`/`WPAmbLON` empty or not numeric is read as no by the mission: the app should refuse to save it.

Example of an entry with the ambulance:

```json
{
  "id": "My hospital (wp order from helo to hospital door. wp1 is ground staff holding point)",
  "WPdoorlat": 42.0, "WPdoorlon": 14.0,
  "WPtot": 2,
  "WP1lat": 42.0, "WP1lon": 14.0, "WP2lat": 42.0, "WP2lon": 14.0, "WP3lat": null, "WP3lon": null,
  "marshal_present": "no", "WPMarshalLAT": null, "WPMarshalLON": null,
  "ambulance_present": "yes", "WPAmbLAT": 42.0, "WPAmbLON": 14.0
}
```

## UI of the app

- Per custom hospital: a yes/no choice (default no) and, when yes, the ambulance parking location picked on the map like the other custom locations (door, waypoints, marshal).
- Both fields are read, edited and written wherever custom hospitals are managed (static data and external file); a save and a reload keep them.
- Files without the fields load as ambulance = no.

## Mission side (done by the mission, listed for the contract)

Applies when the destination lies inside the perimeter of a custom hospital with the ambulance set to yes.

- The hospital crew waits for the helicopter at the usual place. The ambulance stands on its parking, pointing at the ambustretcher. The button Unload to ambulance is not offered: the ambulance is already there.
- At the patient handoff the stretcher and the hospital doctor walk to the ambulance on its side (bearing2 90 or 270, the side closest to them), then behind it (bearing2 180, 6 m away), then board. They are destroyed.
- If paperwork is yes, the helicopter crew doing the paperwork boards too. The helicopter crew is not destroyed: its variable is set to -1 so it is invisible.
- After a short wait the ambulance drives along the waypoints assigned in the custom hospital.
- After the paperwork time (the Skip paperwork button works) the ambulance comes back to the parking along the same waypoints in reverse. The crew gets out (always bearing2 180) and walks back to the helicopter passing along the side of the ambulance closest to the helicopter.
- The mission side is in the sources of 2026-11-12; runtime test in the simulator is pending.

## Acceptance for the app

- Both fields can be set per custom hospital and survive a save and reload.
- The parking location can be picked like the other custom locations.
- Files without the fields load as ambulance = no.
