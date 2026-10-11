# Road approach points from routes

`road nodes generator` (`mission-src/macros/14-shared-runtime.json`) gives the scene its approach points `wpc{n}`, `wprescue{n}`, `wph{n}` and `wpt{n}` for up to three arms (`roads` = number of arms). It no longer queries OSM data or reads parent ways: the points are taken from car routes, and those routes are the traffic routes `route1..3`, created once.

## Contract

- For each slot 1 to 3, in order and without holes, a location `wpf` is created 420-520 m from `accident_location` (bearing spaced 120 degrees between slots, +60 degrees on the retry) and `create_route` runs from `wpf` to `rescue_location` under the name `route{n}`. When `rescue_location` does not exist or is farther than 300 m from the accident, the route ends at `accident_location`. The route end snaps to the nearest drivable road: a scene far from the road ends the route short of it, which is intended (vehicles and traffic stay on the road, and the traffic stops at `rescue_location`).
- The route is read as an array of `[lat, lon, alt, spd]` (`{"route":"route{n}"}`, entry 0 repeated) and walked backward from the last entry. A checkpoint is the point at a given arc length from the end, interpolated on the segment:

| Location | Position | Use |
|---|---|---|
| `wpc{n}` | 25 m from the end | road point close to the scene: wreck spawn (`wpcrashed`), 30West marker post |
| `wprescue{n}` | 60 m from the end | where a vehicle with `AVAIL=1` appears before it drives to its stop distance |
| `wph{n}` | 110 m from the end | heading helper: `bearing(wph, wprescue)` is the direction of travel at the stop zone (`ambulance_scene_heading` in `residential`) |
| `wpt{n}` | first entry of the route | where the traffic of the arm is created and starts its drive |

A checkpoint beyond the length of a short route is the start of the route.
- A route longer than 1200 m (`$CREATE_ROUTE:DISTANCE`: the far point snapped to a distant road), with fewer than 3 entries, or whose `wprescue` lies within 25 m of an earlier arm (same road side) is not accepted; the slot is retried once on another bearing, then the generator stops, so `roads` has no hole.
- `route_ready{n}` is `yes` when the generator created `route{n}`. The traffic (`random traffic launcher` loop in `06-scene-generation.json`) creates its own route from `wpt{n}` to `rescue_location` only when `route_ready{n}` is not `yes` (cardinal fallback, legacy mode). Both launchers reset the three flags first.
- With the 30West marker posts installed, the post of each arm is created at `wpc{n}` and driven toward the scene to 13 m (as before); without them nothing is created.
- Status: `roadnode_query_status` is `nodes_ready`, `no_route` or `legacy_routing`; `has_accident_location` is `yes` or `failed`. A restarted generation (`road_generation` differing from `roadnode_query_generation`) stops the worker before the next step.

## Fallbacks

- Legacy routing mode (`SKIP QUERY` or `ambu_route_mode` legacy, `legacy scene routing check`): no route is created, the generator reports `failed` at once.
- No route (router failure, route too long, fewer than 3 entries): `failed`.
- `random residential road nodes launcher`: on `failed` the worker that waits for the generator ends its wait at once (it used to wait 120 s) and creates the cardinal points `wpt`, `wph` and `wprescue` around `rescue_location`; the traffic then creates its own routes as before.
- `random crashed launcher`: on `failed` it keeps its own `random crashed launcher park` route fallback.

## Cost

Up to three routing requests per scene, the same as the traffic routes they replace (up to two more only when a slot is retried). The previous generator used one data query on top of the traffic routes. Rescue vehicles with `AVAIL=2` keep creating their own station route; their approach could later be read from that route's tail without any extra request.

## Evidence

- `standalone-tests/osm-road-walk-test.json` button 7 (route tail, 2026-10-08, simulator): the 15/30/45 m points from the end of a route are on the road, evenly spaced and aligned with it. Walking the OSM ways instead (buttons 5 and 12) was abandoned: the ways at the test junction (a mini roundabout) were 43 m pieces and every hop rule led into the ring.
- `tools/test-road-routes.js` runs the macro on synthetic routes (straight, bend, short, too long, missing, legacy, stale generation, duplicate arm) and checks the distances and the traffic hand-over.
- Runtime status: PENDING (see `docs/testing/RUNTIME_VALIDATION.md`).
