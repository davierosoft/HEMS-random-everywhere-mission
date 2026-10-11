# SAR visual hints and custom SAR missions 65-68

HPG command reference used for the OSM and route commands: [HPG Mission System documentation](https://davux.com/docs/missionsys/).

## Static `sar_objects`

`data/04-vehicles-and-scene-assets.json` holds one list, `sar_objects`. Each entry has `kind`, `title`, `fallback_title`, `needs30west` (`yes` entries are skipped when `30West_installed` is not `OK`) and, for vehicles, `model` and, when the object title states it, `color`. Kinds: `car`, `atv`, `tent`, `campfire`, `bag`, `bike`, `dog`, `ski`, `snowmobile`, `glider`. There is no flare, smoke or debris kind: flares already exist in the scenes and there is no debris object.

Model comes from the object title. Colour comes from the title (SUV Black, Terzo Millennio Red, ATV1 Blue/Red/Yellow) or from the figures of `standard.docx` (Fiat grey, Raptor red, Service Van blue). It stays empty where no figure exists (30West A45): the dispatch text then names the model only.

`SAR pick object` returns the Nth entry of a kind, `N = floor(seed * count / 101)`. Hints use a random seed; the vehicle of the dispatch text uses `CASUALTY_PERCENTAGE`, so a reloaded mission keeps the same vehicle.

## Visual hints on the existing SAR missions

`SAR visual hints` runs once after the scene macro in `CRASH_SITE` and `CAMPING_SITE` when `SAR` is `yes`. It places up to six objects `sar_hint1..6` between 60 m and `min(SAR_MAX_RADIUS * 0.6, SAR_MAX_RADIUS - distance(victim, SAR_start_location))` from the victim, so every hint stays inside the red ring. Each hint has its own chance; presence is random. The hints are cosmetic and never change the sighting logic.

| Mission | Hints (chance %) |
| --- | --- |
| 40 hiker | tent 35, campfire 25, bag 30, bike 15, dog 15, road car 40 |
| 46 missing in the wood | tent 40, campfire 30, bag 30, quad 15, bike 10, dog 15, road car 40 |
| 44 fallen from a cliff | bag 40, bike 15, dog 15, road car 35 |
| 42 glacier | skis 45 and 35, bag 30, snowmobile 15, tent 20 |
| 17 paraglider | second paraglider flying 12; never a car or a tent |
| 18, 19 aircraft | none (wreck, ELT and flare already exist) |

The road car (`SAR hint road car`) uses one short car route (600-1200 m) from the victim to a random point and no OSM data query. The route starts at the road point closest to the victim; its entry 1 is the car position and entry 3 gives the road direction (`point_object`), then the car is moved 2.5 m to the side. It runs in its own thread, creates nothing when the route fails (`$CREATE_ROUTE:DURATION` not above 0), when the route table entry is stale or when the road is farther than the hint radius.

## Manual location (`query_skipped = yes`)

The location macros are skipped, the classic location names are kept and the objects are still placed, but nothing that needs a road is: no road car, no routes, no parked car; the overdue car (65) is not created and the injured person stays at the location. Quads (67) stay because they do not need a road.

## Missions

| ID | mnumber | type / camping | Location macro | Scene | Idea |
| --- | --- | --- | --- | --- | --- |
| 65 Overdue car, driver missing | 1 | 24 / 42 | `Query random road secondary` | `SAR OVERDUE VEHICLE` | See "Mission 65 route" below. |
| 66 Car found parked, owner missing | 2 | 26 / 44 | `Query random parked car walk` | `SAR PARKED CAR` | Track point from `Query random offroad` is `sar_anchor_location` (car and last known position); the victim is 120 m to 1500 m away on foot, nearer for older people (`AGE1`). |
| 67 Overdue quad rider | 1 | 25 / 43 | `Query random offroad` | `SAR OVERDUE VEHICLE` | Same placement as 65 with a quad from `sar_objects` (colour in the dispatch text). |
| 68 Person wandered away from home | 2 | 27 / 45 | `Query random wandering person` | `CLIMBER` | A detached house is `sar_anchor_location` (last known position); the victim is 120 m to 1200 m away, nearer for older people. |

`type` identifies mnumber 1 missions and `camping` mnumber 2 missions (`missionupdatemultiplayer`); the new values are unique across all missions. The vehicle model and colour are appended once to the dispatch description by `SAR car dispatch text`, called after each of the four `HELOVICTIMS refinement` calls of `11-mission-lifecycle.json`; `sar_desc_final` keeps it idempotent. Presets add the new ids automatically (`msn preset loading` writes missing keys as enabled), so no table was added.

ELT mode: only people who walk carry a beacon, so 66 (the owner went walking) is `plb_person`; 65, 67 and 68 follow the classic accident rule (`normal`).

## Mission 65 route

Mission 65 has no search ring. The search is along a road, so a circle centred away from it misled the pilot (first runtime test, 2026-10-08).

**Dispatch preview** (`accident location pregenerator`, no OSM query besides the location macro): the queried road point is the start A (the SAR icon with the label `ORIGN`, location `sar_route_a`), point B (`TO-PT`, location `sar_route_b`) is a random point 25-40 km away, and a straight yellow line (`sar_route_line`) joins them. The page shows the last known position A. `clear_unaccepted_dispatch_map` and `location reset` remove the two points and the line. No country query runs for SAR missions at the dispatch.

**Loading** (`SAR map and route`, inside `objective2`, therefore before `savetemp async` of `objective4`):

1. A and B come from the preview (`sar_route_preview`) or are created here, with the two points, when the preview did not run (multiplayer pregenerators). One `create_route` A to B; the route is used only when `$CREATE_ROUTE:DURATION` is above 0, it has at least 12 entries and its first entry is within 2000 m of A (a route table entry left by an earlier mission is rejected).
2. The route is read with `{"route":"sar_route_1"}` as an array of `[lat, lon, alt, spd]` entries. `accident_location` is recreated on a random entry between one third and nine tenths of the route, so the victim and the car move there. The entry at one third becomes `sar_last_contact`, the next entry `sar_route_next`, the first and last entries `sar_route_start` and `sar_route_end`.
3. With a real route (`sar_route_real`) the straight line is removed and the route is drawn after the loading (`MISSION_PHASE` above 3, only for the mission that created it, `sar_route_generation`); the drawn route is not removed by hand, a new mission reload clears it. ORIGN and TO-PT stay.
4. If the router fails (or the route table entry is stale) the straight line stays and the victim moves to a random point of it, between one third and nine tenths; `sar_last_contact` is at one third and there is no car, because no road is known.
5. In both cases no ring and no ring icon are drawn. `sar_last_contact` carries the point `LAST CONTACT`, is the flight plan target (`location_name`) and the message names the last contact and the start and end of the probable route with `:LOCATION`. `SAR_start_location` stays the ring centre around the final victim position, invisible: it feeds the hint radius, the track history and a reloaded mission.
6. The country (`NATION`, read by the scene macros and the ground response) is asked for mission 65 only here, after the relocation and before `CRASH_SITE`, because the route can cross a border. The generator skips it for 65 and the pre-location skips it for every SAR mission.
7. `SAR OVERDUE VEHICLE` creates the car on the new `accident_location` only with a real route, turns it toward `sar_route_next` with `point_object`, drives it forward 8-40 m in half of the cases, and puts the injured person 3 m from it on the driver side: the left (`bearing2` 270) where the cars have the steering wheel on the left, the right (90) in the United Kingdom (`NATION` 2).

A location entered by hand (`query_skipped`) keeps the normal SAR with its ring around the custom position, no route and no car; a reloaded mission (`SKIP_QUERY` is forced) has no route and no car either, and shows the ring around the saved `SAR_start_location`. Router calls per mission 65: one at loading and one country query.

**Dispatch page.** The row `Last known position` and the buttons `Open on map` and `Open on PC` of `Mission dispatch` no longer read `accident_location` (the victim) in SAR missions: they show the position of the map, `SAR_start_location` for the ring missions, the start A while the dispatch preview of mission 65 is shown and `sar_last_contact` after the loading (`sar_page_mode` `start` and `contact`). The distance is measured to the same point. The original rows used `accident_location` for both the coordinates and the distance.

Verified in the simulator (`standalone-tests/osm-nodes-route-test.json`, 2026-10-07): `{"route":name}` returns `[lat, lon, alt, spd]` entries, `alt` is 0 and `spd` follows the road limits (km/h); entry 0 is repeated; the endpoints snap to the nearest drivable road. `osm_get_nodes` returns node objects and `path: length` is their count.

## Tests

`tools/test-sar-hints-and-missions.js` checks ids, `mnumber`, unique `type`/`camping`, macro existence, the hook sites, the hint radius and chances, road cars only after a real query, literal object names, cardinal `bearing2`, anchors, routes and cleanup. Runtime behaviour is listed in `docs/testing/RUNTIME_VALIDATION.md`.
