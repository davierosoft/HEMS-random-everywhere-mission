# On conditions missions

User request of 2026-10-17. With the option on, the random missions that do not fit the local time, the month (with the hemisphere) or the weather are not drawn: no skier in August, no paraglider in a gale, no school accident at midnight. With the option off every enabled mission can be drawn, as before.

## The option

- Global `COND_MISSIONS`: `yes` or anything else (empty = off). Settings page, DISPATCH OPTIONS: `OFF (DEFAULT)` and `ON`.
- It is a profile setting (marks the profile CUSTOM, saved in and loaded from the custom aircraft profiles, cleared by Reset to default) and a factory value: **on** in EXPERT PILOT and EXPERT HEMS, **off** in DEFAULT and ROOKIE PILOT (complete random missions). The older custom profiles do not have the key and load as off.
- The crew tells about it in a tip (topic CND, pack EN 16, TIP.CND.1 to 4).
- The choice of a mission from the tablet list is never filtered; only the random draw is.

## The decision

`randomize` (macro file 11) calls `conditions snapshot` once and, for each enabled mission with `cond` 1, copies its `cond_*` fields into the locals `cf_*` and calls `conditions fit`, both in the loop that counts the selectable missions and in the loop that draws one. A mission is drawn only if it is enabled in the mission list **and** fits. If no enabled mission fits, the filter is dropped for that draw (complete random missions): the draw never stops.

`conditions snapshot` reads, only when the option is on:

| Local | Source | Note |
|---|---|---|
| `cm_hour` | `E:LOCAL TIME` / 3600 | the local clock, whatever the CLOCK MODE of the tablet |
| `cm_month`, `cm_mn` | `E:LOCAL MONTH OF YEAR` | `cm_mn` is the month in northern terms (a southern latitude, `PLANE LATITUDE` < 0, is shifted by six months); 0 = unknown, the seasons do not restrict |
| `cm_day` | `E:TIME OF DAY` = 1 | the value that the checklists and the work lights already treat as day; dawn, dusk and night count as not day |
| `cm_precip` | `AMBIENT PRECIP STATE` | 4 or more: rain or snow (the same threshold of the pre-visit shelter rule) |
| `cm_temp` | `AMBIENT TEMPERATURE` | at the helicopter |
| `cm_wind` | `AMBIENT WIND VELOCITY` in knots x 1.852 | km/h |
| `cm_t1300` | temperature estimated at 1300 m | `cm_temp - 0.0065 x (1300 - altitude in m)`: the average lapse of 6.5 degrees per 1000 m from the altitude of the helicopter, because the ski area is in the mountains while the helicopter may be in the plain (the user asked for 1200 to 1500 m; 1300 m is the middle) |

The locals are in the debug snapshots (page COMMON) with `COND_MISSIONS`.

## The fields of the accidents (data `accidents`)

A mission has `cond` 1 and some of: `cond_light` `day`; `cond_hours` `yes` with `cond_from` (included) and `cond_to` (excluded), local hour; `cond_season`; `cond_weather`; `cond_wind` (highest wind, km/h). A missing field does not restrict.

| `cond_season` (months in northern terms) | Not drawn in |
|---|---|
| `nowinter` | December, January, February |
| `skiseason` | May to November |
| `coldseason` | June to October |
| `huntingseason` | February to August |
| `schoolterm` | July and August |
| `liftseason` | May and November (lifts closed between the seasons) |

| `cond_weather` | Not drawn when |
|---|---|
| `dry` | rain or snow |
| `nosnow` | snow, or the temperature at the helicopter is 0 degrees C or lower (ice) |
| `wet` | no rain or snow (the road collision on a wet road) |
| `snowcover` | the estimated temperature at 1300 m is above 0 degrees C (skiers, avalanche) |

## The 28 missions

| ID | Mission | light / hours | season | weather / wind |
|---|---|---|---|---|
| 1 | RTC on a wet road | | | wet |
| 4 | RTC motorbike | | nowinter | nosnow |
| 6 | bicycle vs car | | | nosnow |
| 7 | cycleway | day | nowinter | nosnow |
| 8 | quad | day | | nosnow |
| 11 | tractor | day | | nosnow |
| 13, 14, 15 | quarry, two construction sites | 7 to 18 | | nosnow |
| 17 | paraglider (SAR) | day | nowinter | dry, wind 30 km/h |
| 22 | camping area | | nowinter | nosnow |
| 23 | camping at the peak | | nowinter | dry |
| 33 | person in the garden | day | nowinter | nosnow |
| 34, 61 | school (fall, brawl) | 8 to 16 | schoolterm | |
| 37 | climber | day | nowinter | dry |
| 38, 39 | chair lift, cableway | day | liftseason | wind 60 km/h |
| 41 | sick hiker | day | nowinter | dry |
| 42 | climber on the glacier after an avalanche (SAR) | | coldseason | snowcover |
| 43 | cemetery | 8 to 18 | | |
| 45 | fall from a cliff (sport) | day | | dry |
| 47, 50 | skier | day | skiseason | snowcover |
| 49 | general practitioner | 8 to 19 | | |
| 60 | supermarket | 7 to 22 | | |
| 63 | hunting | day | huntingseason | |
| 64 | fisherman | day | | wind 60 km/h |

Never filtered, by the user's decision: the calls for missing people (40, 44, 46, 65 to 68, 18, 19: nobody knows since when they are missing), the home, nursing home and apartment calls, the road and railway collisions, the aircraft, the secondary missions and the "injured only" missions. Wind limits: 60 km/h for the lifts and the fisherman (the lifts stop at about 50 to 70 km/h), 30 km/h for the paraglider; the hours and the months are the first proposal of the author and can be changed in the data without touching the macros.

## Not modeled

Static gate: `node tools/test-condition-missions.js` (data, macros, profiles, a model of the decision on typical situations). The reading of `E:LOCAL MONTH OF YEAR`, `AMBIENT WIND VELOCITY` and `PLANE LATITUDE` is new in this mission and is PENDING a controlled test in the simulator (see docs/testing/RUNTIME_VALIDATION.md).
