# Operations, voice and UI audit (2026-11-04, revised for what can be simulated)

User request of 2026-11-04: audit the procedures implemented for the crew members and the helicopter rescue operations against real procedures, look at how the operations can be mixed (hoist and ground, for example), say what is missing, judge the usability of the UIs and propose improvements, and find where the discussions and the audio requests are still missing. Revision of the same day: the list is limited to what the simulator and the mission can do.

## Method and limits

- Evidence: reading of `mission-src/` (macros, data, threads), `voicepacks/EN.xml` (pack 36, 1518 keys), `ui-texts.json` (2998 texts), the documents in `docs/` and the snapshots of the testers. Nothing here was flown: every statement about behaviour is a reading of the code, marked **[code]**, **[doc]**, **[data]** (counts) or **[inferred]**; **[verify]** means a variable or a behaviour that must be checked in the simulator before the work starts.
- The real procedures are the general ones of European HEMS and helicopter hoist operations, not the manual of one operator. A proposal that depends on a real procedure must be confirmed by a person who flies or works it before it is built.
- Priorities: P1 = changes every mission or removes a stall risk; P2 = clear gain, moderate work; P3 = growth or a design decision.

## 0. What the simulator and the mission cannot do (decided by the author, 2026-11-04)

| Limit | Consequence for the list |
|---|---|
| Patients can be saved only on the terrain: not on roofs, ships or any sim object other than the ground (animations and MSFS limits) | no rooftop, ship, offshore, bridge or vehicle-deck rescue, no hoisting of a patient from or to a sim object; scenes stay on the terrain; a "roof" or "ship" scenario is out of scope |
| Obstacles cannot be detected | no obstacle, wire, slope or loose-object callout that pretends to see them; a reconnaissance can be spoken only without findings, and only as a procedure step |
| People and crew move only with the dynamic object states of HPG (`HPG_DYNAMIC_OBJECT_STATES.md`) | no new animation: a proposal uses the states that exist (standing, walking, crouching, carrying, pilot states) |
| The helicopter and MSFS do not simulate the swing of the cable, the downwash on objects and people, a long line, water rescue, hypothermia of the person | those effects are out; a clinical profile (data and logic of the mission) is not a physical effect and stays possible |
| Distance and height callouts exist, partly tied to the crew guidance API | treated as existing: the list extends them only where they do not reach (see H1) |

What the mission can read and speak from: radio height, ground speed, bank and heading, wind and precipitation, temperature, time of day, torque and rotor speed, fuel, the hoist state (`SDK_HOIST_*`, reel length, height of the hook), its own objects (vehicles, people, locations) and its own state machines.

The existing guidance call, for the record: `play_guidance_message` toward `landing_spot` from the hoist point (`$USER:HOIST`, vertical window 15 to 10000), in a thread of `10-transfer-special-missions.json` (about line 458) that runs until `L:HOISTED` is 1, with radio height above 30 ft, ground speed of 25 kt or less, within about 10 m of the landing spot and the `AUDIO_DECLUT` gate [code]. It is the only call site in the mission.

## 1. What exists (inventory)

| Area | Content | Source |
|---|---|---|
| Incidents | 80 incident definitions, ids 1 to 68 (road, work, sport, mountain, home, public places, SAR, aviation), 28 filtered by time, season and weather (COND_MISSIONS) | [data] `CONDITION_MISSIONS.md` |
| Other classes | patient transfer, organ, medical team and blood transport, ELT, midway loading, SAR with visual hints, custom script | [doc] |
| Crew | pilot, copilot, doctor (`hoist_crew`, always hoisted), rear crew chief and paramedic (`pax3`), 3, 4 or 5 crew; heli rescuers dropped and picked up; LifeScore, impacts, deaths, replacement | [doc] `CREW_LIFESCORE_ROLES.md` |
| Operation modes | ground, skid landing operations, hoist, hoist out, ambulance rendezvous, ambulance shuttle for a far landing spot (170.08), police carrying the crew | [code] `L:MISSION_HOIST` 0, 1, 2 |
| Hoist | cable phases, ground impact monitor, casualty model, release of a hurt person, hoist out ladders (speed, bank) | [doc] `HOIST_CABLE_CASUALTIES.md` |
| Patients | three live slots (target five), A-E survey, about 100 treatment choices, CPR and defibrillation, burns, bleeding, spinal, crush, allergy, 328 clinical profiles | [data] [doc] `MULTI_PATIENT.md` |
| Other units | ambulance 1 and 2, police, fire engines, marshaller, hospital marshal | [code] |
| Voice | 1518 keys: pilot, copilot, doctor, rear crew, heli rescuer, dispatcher, hospital, marshaller, technician; briefing, approach, ground update, hospital handover, banter, failures | [data] `VOICE_APP_MODE.md` |
| Speech commands | 34 user action ids | [doc] `SPEECH_ACTIONS.md` |
| UI | 381 buttons, 185 links, 470 set messages, 55 modals, 1838 texts; heaviest pages: settings 179 buttons, patient health 159, DF stations 117, techpage 47 | [data] |

## 2. The list of what can be done (simulable only)

### 2.1 Hoist

| Id | Item | Feasible because | Priority |
|---|---|---|---|
| H1 | Check and extend the coverage of the guidance call (answer of the author: every object or location is a valid target, and a custom guidance may be built for each case): it follows `landing_spot`, so it is silent when the hoist has no landing spot, when a heli rescuer is picked up or dropped by the hoist, and in the hoist out; the target would be the person or the point the hook waits for | the engine call takes any object or location as target (author, 2026-11-04) | P1 |
| H2 | Hoist operator phase calls that are not distances: "hooked", "ready to lift", "lifting", "patient at the door", "inside" (the end call `PAX1.INS` exists) | `HOIST_CABLE_PHASE` and the hoist states are known to the mission | P1 |
| H3 | Pause and abort of the hoist when speed or bank pass a soft limit below the casualty limits; `PAX2.5` (paused) and `PAX2.6` (abort) are in the pack with their wav files and nothing triggers them | speed and bank are read already by the hoist out ladders | P1 |
| H4 | Hook height calls where the guidance does not reach (see H1), from `hoist_get_distance_from_ground` and the reel length | the values are read in `09-hoist-ground-ops.json` (23 sites) | P2 |
| H5 | Pre-hoist challenge and response (hoist armed, hook, boom, power) between pilot and hoist operator | arming and mode are `SDK_HOIST_ARM_*`, `SDK_HOIST_CONTROL_MODE_*`; torque and rotor speed are readable [verify the torque variable] | P2 |
| H6 | Hover power call before the hoist (torque margin in the hover) | torque read from the simulator [verify] | P3 |

### 2.2 Landing and site

| Id | Item | Feasible because | Priority |
|---|---|---|---|
| L1 | Wind call at the site, like the hospital one (direction and knots) | wind is read at the hospital already (`HOS.*`) | P2 |
| L2 | A reconnaissance step without findings: when the pilot flies an orbit over the accident (heading change of about 270 degrees within a short radius and low height) the copilot says "orbit complete", nothing about obstacles | heading, position and height are readable; no detection is claimed | P3 |
| L3 | Police and fire "people clear" calls toward the landing: from the mission's own people and vehicles, not from a detection | the mission creates those objects | P3 |

### 2.3 Ground, skid and clinical

| Id | Item | Feasible because | Priority |
|---|---|---|---|
| G1 | Triage categories spoken (red, yellow, green) when the second and third patient are seen; with five slots the same keys | the registry already orders the patients | P2 |
| G2 | Destination discussion: the doctor and the copilot choose the receiving centre from the profile (trauma, burns, nearest) before the hospital selection | the profile and the pathology are data of the mission | P2 |
| G3 | Structured handover read from the patient record (identification, mechanism, injuries, signs, treatment: ISBAR or ATMIST order) | the record exists (`patient_tablet_reports`) | P2 |
| G4 | Hypothermia and cold exposure as clinical profiles for the cold, mountain and avalanche missions (no physical effect) | data and logic, the temperature is readable | P3 |
| G5 | Mass casualty up to five patients with the existing registry target | already the registry target (`MULTI_PATIENT.md`) | P3 |
| G6 | Avalanche search with the SAR hints (no transceiver simulation): a spoken search procedure around the existing visual hints | SAR hints exist (`SAR_VISUAL_HINTS_AND_MISSIONS.md`) | P3 |

### 2.4 Mixed operations

The mission mixes some operations already: a heli rescuer hoisted down and picked up by the hoist or on the ground, hoist out, the ambulance meeting at the landing spot, the police carrying the crew, the ambulance shuttle. They are special paths decided from the helicopter state (`SIM ON GROUND`), the mode `L:MISSION_HOIST` and the flags of the mission. There is no operation plan. All combinations below keep the patient and the crew on the terrain (limit 0).

| Combination | Status | Note |
|---|---|---|
| Doctor by hoist, patient loaded by hoist, helicopter in the hover | Yes | |
| Doctor by hoist, then the helicopter lands at a close site for the transport | Part | the mode is a mission variable; a change of mode in the middle is not an explicit state [inferred] |
| Rescuers left by hoist, patient brought to a landing site by foot or by the ambulance | Part | pick-up recheck and approach exist; the escort on foot to the helicopter is only for the hospital |
| Patient 1 by hoist and patient 2 by the ambulance | Part | per-patient tickets exist; the second hoist needs a second sortie |
| Hoist out to a safe site on the terrain, then ground operations | Part | ends at the ladders; no state "off the hook at the site" |
| Skid operation with a rescuer going down by the hoist | ? | to test |
| Heli rescuer dropped on the ground and an ambulance later | Yes | `drop heli rescuer ground` |

**M1 (P3)**: an operation plan per mission (how the doctor goes down: ground, hoist, skid; how the patient comes up; what the rescuers do; who transports). The existing paths read it instead of deciding from `SIM ON GROUND` alone; it is mission logic only, each row above becomes a test, and the crew briefing can read it.

### 2.5 Removed from the first list (not feasible or out of scope)

Rooftop, ship, offshore, bridge and vehicle-deck rescues; hoisting a patient from or to a sim object; obstacle, wire and slope detection and the hazard calls that depend on it; downwash on people; swing of the cable; long line; water rescue; hazardous materials and decontamination; hot loading as a simulated procedure (the rotor gate of the ground operations stays as it is).

## 3. Voice and discussions (all voice only, no detection needed)

Pack 36 has 1518 keys: checklists 377, dispatch readings 321, rear crew 104, copilot 68, tips 48, pilot 45, doctor 44, dispatcher 39, rescuer briefing 39. Missing:

| Id | Gap | Proposal | Priority |
|---|---|---|---|
| V1 | Hoist operator phase calls (H2) | new keys on `PAX2` and `HST` tied to `HOIST_CABLE_PHASE` | P1 |
| V2 | Hoist pause and abort (H3) | trigger the two keys that exist | P1 |
| V3 | Hoist pre-check (H5) | challenge and response | P2 |
| V4 | Weather and go / no-go: the weather is spoken only in the weather briefing, the crew does not discuss going | at the accept: pilot and copilot read the conditions from the simulator (cloud, visibility, wind, precipitation) with the `WX*` keys, a "go" or "go with care" line; no minima claim | P2 |
| V5 | In-flight fuel: discussed only at a second dispatch | calls at the fuel states the mission uses (below the option limit, fuel to the hospital) | P2 |
| V6 | Triage (G1), destination (G2), structured handover (G3) | new keys, same order of the record | P2 |
| V7 | Dispatcher status messages: RescueTrack texts exist; spoken ones are the briefing, the vehicles and the hospital | spoken status for on scene, patient aboard, en route, available | P2 |
| V8 | Wind call at the site (L1), orbit complete (L2) | two keys | P2 and P3 |
| V9 | Radio with ATC: not wanted, the default one of the simulator stays | none | removed |
| V10 | Rescuer left on the ground: status, patient and ETA of the ambulance during a long wait | calls on a timer with the existing wait states | P3 |
| V11 | Debrief that names the events of the mission (a death, a hard landing, a failure, a long wait) | pick lines from the event flags | P3 |

Rules for new keys: one group id per event, `trigger` text in the base pack, the key list in `tools/voice-texts.json`, EN, DE and FR in `voicepacks/` with the same version (`voicepacks/README.md`).

## 4. UI usability

Findings [data] [code]:

1. Weight of the pages: settings 179 buttons (47 percent of the buttons of the mission), medical 159, DF stations 117. The pages that serve the flight must be short.
2. No hoist panel: the cable length and the height of the hook are read in the code and never shown on the tablet.
3. No crew overview: seat, task and LifeScore of each member are in the snapshots, not on a page.
4. No next action strip: the buttons that matter at a stage (BEGIN HOISTING, LOAD THE PATIENT, PICK HELI RESCUER, MEET AMBULANCE) are on different pages; a stall is told by a message after 120 s (`ops_progress_warning`).
5. Singleton modal: the base selection modal was lost in 170.04 to 170.06 because another modal replaces it; every modal handles its own return.
6. Settings versus profiles: factory, custom and per-mission values mix; the pilot cannot tell which is in force.
7. Text length: limits (`max`) are checked, the margin is not shown (`UI_TRANSLATION.md`).
8. Speech inventory: the hoist actions and the ambulance shuttle choices are not in it.
9. Errors: no "skip this step" or "send the report" on the same screen.
10. Connection: the state of the briefing depends on three variables (radio, wifi, the HOC thread) that the pilot cannot see together.

| Id | Proposal | Priority |
|---|---|---|
| U1 | Hoist panel while the hoist is armed or out: cable length, hook height, state, patient hooked, speed and bank against the pause limit (H3) | P1 |
| U2 | Next action strip at the top of the briefing: the action the mission waits for (the data of `ops_progress_stage`) with its button | P1 |
| U3 | Connection line in the briefing: radio, wifi, HOC, Companion with their states (it would have shown the missing ACCEPT bar of 170.08 at once) | P1 |
| U4 | Crew page: one line per member (role, place, task, LifeScore band) | P2 |
| U5 | Modal manager: a queue and a priority (crew emergency over dispatch over choices), one return path | P2 |
| U6 | Hoist and ambulance shuttle actions in the speech inventory | P2 |
| U7 | "Stuck?" button: shows the step waited for and the time, offers REPORT or SKIP where the step has a safe skip | P2 |
| U8 | Settings search and a "changed from the profile" list; split flight and ground settings | P3 |
| U9 | Snapshot button on every page | P3 |

## 5. Order of work

1. P1: H1 (check what the guidance call can target), H2 and V1, H3 and V2, U1, U2, U3.
2. P2: H4, H5, L1, G1 to G3 with V3 to V8, U4 to U7.
3. P3: M1 (the operation plan, because the mixed operations depend on it), L2, L3, G4 to G6, H6, V9 to V11, U8, U9.

Before recording any voice line, the wording and the order of the hoist calls (V1, V3) must be confirmed by a person who works the hoist.

## 6. Status of the work (2026-11-04)

Decided by the author: the hoist calls are added (H2, V1); a hoist panel for the manual hoist (U1); the P2 voice and P2 interface items; P3 without ATC and with the debrief. Implemented in the sources (not built, runtime PENDING):

- H2, V1: keys `HCL.DOWN`, `HCL.GND`, `HCL.UP`, `HCL.DOOR` in the three packs (EN 37, DE 25, FR 26), macro `voice hoist cable` called by `hoist down`, `hoist up 1 operator` and `hoist up operator+injured`; the heli rescuer going down keeps `HRS.*` (`tools/test-hoist-cable-calls.js`).
- U1: macro `hoist panel` (cable out, hook height estimate, hook state, person and patient on the hook, radio height, ground speed, bank, the hoist window of 40 to 160 ft) with a link `- HOIST PANEL` in the briefing and on the Mission dispatch page while the hoist switch is on.
- U3: line `LINK: radio | wifi | HOC | voice app` at the top of the briefing before the mission starts.
- L1, V8, V5 (2026-11-05): wind at the site and fuel in flight, see `VOICE_APP_MODE.md` (sources, runtime PENDING).
- Next action strip (U2): the tablet already shows `ON-SITE OPERATIONS` with the stage and, when stalled, `Still open`; what remains is a short line in the briefing with the button that the step waits for (needs a map from stage to button).
- Pause and abort of the hoist (H3): to design with the author (see the answer of 2026-11-04).

Nothing else of this audit changes the mission.
