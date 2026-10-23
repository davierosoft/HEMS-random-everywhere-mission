# Answers of 2026-10-21 to the report of 2026-10-20 (sources, not built)

Everything below is checked by `tools/test-flight-report-2026-10-21.js` (static); the behaviour in the simulator is PENDING.

## Time bar of the timed secondary missions

`timed mission bar` (10) shows the time left as a bar on the dispatch page, 100 percent at the start and 0 at the deadline (`organexpiration`): grey from 100 to 30, yellow below 30 down to 10, red below 10 (`L:TIMED_LEFT_PCT`, three `progressbar` rows and three text rows in `Mission dispatch`; the yellow and red colours of the widget are not documented, the doc shows red only). It replaces the ground operations bar while it runs (`timed_bar_active`); the organ pick-up and delivery no longer start `ops progress timed`. Started by `organ life decrease` with `organ_bar_label` (ORGAN DELIVERY, TEAM ARRIVAL, BLOOD DELIVERY).

## Work light

`fire scene worklight` is called at the end of `deploy_firetruck1_crew` and of the second fire crew branch of `Firetruck1`, i.e. after the fire fighters exist; 7 m ahead of the fire engine (bearing2 0), pointed at `injured_human`, VAR 1 = 1, only on road scenes at dawn, dusk and night.

## Checklists: the fire buttons change the page

`checklist page nav` (22): PRIMARY at the end of a page (`L:CHECKLIST_STEP` at `ckl_end`) goes to the next page at once, SECONDARY on the first row (`ckl_first`) goes back to the previous page. Every checklist macro sets `ckl_cur`, `ckl_first`, `ckl_end`, `ckl_has_prev`, `ckl_has_next` at its start; `checklist home` and `Mission dispatch` clear the two flags. The page links set the same `checklist_*_advanced` flags. Choosing a decision link with the buttons is not done.

## Terrain test of the heli rescuer

`gnd ops heli rescuer down` reads the altitude (`AALT`, feet) of `jolly` at LUP, RUP, RDWN and LDWN, then `hr terrain evaluate` sets `HR_TERRAIN_STEEP`: 1 when for a pair of the four points the difference is more than 2 m or more than the difference that makes 25 degrees over their distance (tan 25 = 0.4663; below 4.3 m the 25 degrees rule is the stricter), or when the altitude of the helicopter (`PLANE ALTITUDE`) and the one of `injured_human` differ by more than 25 degrees over their distance. `3 crew ground ops` and `4 or 5 crew ground ops` use `ground ops hems patient on foot` only with a heli rescuer aboard and `HR_TERRAIN_STEEP` 1; on level ground the stretcher flow of the original is used.

## New incidents (data `accidents`, codes unique)

| ID | Incident | mnumber / type / camping | Scene | Query |
| --- | --- | --- | --- | --- |
| 69 | Multi-vehicle collision on the motorway | 1 / 28 / 46 | `default rtc` + wrecks of `CRASH_SITE` (type 28) | `Query random motorway` |
| 70 | Mountain biker injured on a trail | 2 / 29 / 47 | `MTB TRAIL` | `Query random hiking` |
| 71 | Collapse on a sports field | 2 / 30 / 48 | `SPORTS FIELD` (six people and three bags on the west side, the east side is free for the landing) | `Query random pitch` |
| 72 | Fall from a ladder | 2 / 31 / 49 | `residential` (ladder) | `Query random garden` |
| 73 | Worker burned in a workshop | 2 / 32 / 50 | `residential` (colleague, extinguisher, smoke) | `Query random factory` |
| 74 | Rider fallen from a horse | 2 / 33 / 51 | `HORSE RIDING` (`30West Horse`) | `Query random riding` |
| 101 | Secondary: medical team transport | 4 / 3 / 2 | `organ transfer` (payload T) | `Query random organ` |
| 102 | Secondary: urgent blood supply | 4 / 4 / 3 | `organ transfer` (payload B) | `Query random organ` |

The multiplayer update finds a mission 1 by its scene type, a mission 2 by camping and, from now on, a mission 4 by its type too (`missionupdatemultiplayer`). Not made: the motorcycle against a guard rail (no guard rail object in the 30West or 68ponyGT packs), the fall from a tree (no tree object), the boat and the swimmer (user), the newborn transfer (no infant or incubator object), the skiers (already in the CLIMBER scene).

The team and the blood supply are the organ flow with another payload: `organ kind setup` sets `voice_sfx` (empty, `.T`, `.B`), the words of the tablet message, the label of the bar and the random margin of the deadline (organ 300 to 1200 s, team 240 to 720 s, blood 150 to 480 s). The pack has variants `.T` and `.B` of OBJ.ORG, BRF.ORG.PLT, APR.ORG.PLT, DSP.ANS.ORG, ORG.PCK, ORG.INF, ORG.PCK.G, ORG.PCK.R, HOS.ORG, HOS.ORG.LT, ORG.DEL.LT, PCK.CALL.ORG, PCK.REPLY.ORG (six options, EN and DE); the other organ keys are the generic ones. The team is shown by the medics and the equipment case of the pick-up (no new boarding animation). Transfer pathologies of `healthsecondary` types 5 (team) and 6 (blood).

## Mission Companion

`[pause:N]` (0 to 5 s) in a pack text: silence between two parts of one text (`CRW.VEH.BOTH`: one second between "on scene" and "on the way"). The pilot acknowledgements mix copy, roger and okay with and without thanks (`GRD.PLT.OK`, `PLT.4`).

## Report of the same day: duplicate wreck and the ambulances


The error `creating duplicate object: wreckedcar1` (tablet, motorway pile-up 69): `random crashed launcher` called `random crashed1` at every retry of the road loop and, after a failed query, `random crashed launcher park` created the same object again. The crashed vehicle is now created once after the loop, and not when the park fallback runs.

Ambulances (Daikan, residential fire): the police go to the scene (an officer on each side), the fire engines to the fire, the ambulances to the injured. `injured scene reference` (08) creates `injured_scene` at `injured_human` (`accident_location` when there is none); `park_ambulance1`, `park_ambulance1_scene`, `park_ambulance2`, `park_ambulance2_scene` and the approach watchdog of `Ambulance2` measure the stop from it instead of `accident_location`, which in a residential fire is the burning building while the injured are moved to `rescue_location`. Runtime PENDING.
