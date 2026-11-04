# Operations, voice and UI audit (2026-11-04)

User request of 2026-11-04: audit the procedures implemented for the crew members and the helicopter rescue operations against real procedures, look at how the operations can be mixed (hoist and ground, for example), say what is missing, judge the usability of the UIs and propose improvements, and find where the discussions and the audio requests are still missing. The audit is meant to steer the growth of the system.

## Method and limits

- Evidence: reading of `mission-src/` (macros, data, threads), `voicepacks/EN.xml` (pack 36, 1518 keys), `ui-texts.json` (2998 texts), the documents in `docs/` and the snapshots received from the testers. Nothing here was flown: every statement about behaviour is a reading of the code and is marked **[code]**, **[doc]**, **[data]** (counts) or **[inferred]**.
- The real procedures are the general ones of European HEMS and helicopter hoist operations (crew resource management, HEMS operating site, helicopter hoist operations with a hoist operator, rescuer and patient on the hook, handover to the hospital). They are not the manual of one operator. Every proposal that depends on a real procedure must be confirmed by a person who flies or works it (pilot, technical crew member, HEMS physician) before it is built.
- Priorities: P1 = changes the quality of every mission or removes a risk of a stall; P2 = clear gain, moderate work; P3 = growth, large work or needs a design decision.

## 1. What exists (inventory)

| Area | Content | Source |
|---|---|---|
| Incidents | 80 incident definitions, ids 1 to 68 (road, work, sport, mountain, home, public places, SAR, aviation), 28 filtered by time, season and weather (option COND_MISSIONS) | [data] `CONDITION_MISSIONS.md` |
| Other mission classes | patient transfer, organ, medical team and blood transport, ELT, midway loading, SAR with visual hints, custom script (train.json) | [doc] |
| Crew | pilot, copilot, doctor (`hoist_crew`, always hoisted, lowered), rear crew chief and paramedic (`pax3`), 3, 4 or 5 crew; heli rescuers (HR) dropped and picked up; LifeScore per person, impacts, deaths, replacement | [doc] `CREW_LIFESCORE_ROLES.md` |
| Operation modes | ground (landing at the landing spot), skid landing operations (the crew leaves at the skid point), hoist (hover), hoist out (patient and operator on the hook while flying), ambulance rendezvous, ambulance shuttle for a far landing spot (170.08), police carrying the crew | [code] `L:MISSION_HOIST` 0, 1, 2 |
| Hoist | cable phases, ground impact monitor, casualty model (operator, HR, patient), release of a hurt person, hoist out ladders (speed, bank), boom and hook states | [doc] `HOIST_CABLE_CASUALTIES.md` |
| Patients | up to three live slots (target five), A-E survey, treatments (about 100 correct and wrong choices on the medical page), CPR with defibrillation, burns, bleeding, spinal, crush, allergy, 328 clinical profiles | [data] [doc] `MULTI_PATIENT.md` |
| Other units | ambulance 1 and 2 (shelter rules, shuttle), police, fire engines, marshaller, hospital marshal | [code] |
| Voice | Companion voice packs: 1518 keys, actors pilot, copilot, doctor, rear crew, heli rescuer, dispatcher, hospital, marshaller, technician; briefing, approach, ground update, hospital handover, banter, failures | [data] `VOICE_APP_MODE.md` |
| Speech commands | 34 user action ids that the pilot can say instead of pushing a button | [doc] `SPEECH_ACTIONS.md` |
| UI | 381 buttons, 185 links, 470 set messages, 55 modals, 1838 texts; heaviest pages: settings 179 buttons, patient health 159, DF stations 117, techpage 47, mission type 34 | [data] |

## 2. Procedures against the real ones

Status: **Yes** implemented, **Part** implemented in part, **No** not implemented, **?** to confirm in the simulator or with a crew.

### 2.1 Tasking and decision to go

| Real procedure | Status | Note |
|---|---|---|
| Tasking by the dispatch centre, status messages (on the way, on scene, patient aboard, at hospital, available) | Part | RescueTrack texts exist on the tablet; which of them the dispatcher speaks is to confirm [inferred] |
| Go / no-go: weather minima, fuel, crew fit, night (NVIS) | Part | the crew discusses the fuel and the number of missions at a second dispatch (`DSA.*`); the weather only filters the draw (COND_MISSIONS); no spoken weather go / no-go, no minima, no night procedure |
| Risk assessment of the operating site (HEMS operating site, alternative sites) | No | the landing spot is chosen by the user; the crew does not discuss it |
| Crew briefing before the sortie (roles, who goes down, signals) | Yes | `HRB.*`, `BRF.*`, `APR.*`; heli rescuer briefing with the hoist sequence |

### 2.2 Approach and landing site

| Real procedure | Status | Note |
|---|---|---|
| High and low reconnaissance, orbit over the site | No | no key, no macro; the copilot only says it scans for wires and people when no unit is on the ground |
| Hazard calls: wires, obstacles, slope, wind, loose objects, bystanders in the downwash | No | wind and wire calls exist only at the hospital (`HOS.*` wind) and as the "no units" lines |
| Site secured by police and fire, marshaller | Yes | police, fire, marshaller and the approach briefing say which vehicles are there |
| Choice between landing, one skid and hoist by the site | Part | decided by the helicopter state (`SIM ON GROUND`) when the crew moves, not by an explicit plan [code] |

### 2.3 Hoist operations (hoist operator, doctor, rescuer, patient)

| Real procedure | Status | Note |
|---|---|---|
| Hoist pre-checks (hoist armed, hook, boom, hover power) | Part | the hoist switch and the arming exist on the tablet; no spoken checklist, no hover power check |
| Hoist operator calls during lowering and lifting (hook height, "on the ground", "hooked", "lift slowly", "patient at the door") | No | the winch operator (`PAX2`) has six keys, none of them a cable call; `HRS.START/MID/DONE` say only the rescuer going down |
| Directions from the hoist operator to the pilot (forward, aft, left, right, steady, hold) | No | the marshaller has `MAR.1-5` for the ground; the hoist has no equivalent |
| Hoist pause and abort when a limit is exceeded (speed, bank, acceleration) | No | `PAX2.5` and `PAX2.6` exist in the pack with their wav files but "the hoist safety monitor only has casualty events" [doc] |
| Emergency: cable cut, hoist failure, patient or rescuer lost | Part | casualty model with falls and releases exists; the swing of the cable and an operator hurt on the way up are not simulated [doc] |
| Hoist out (patient and operator hanging, helicopter flies to a safe site) | Yes | speed and bank ladders; no landing-site procedure for the end of it beyond the ladders |
| Hoist of the patient on a stretcher or a rescue litter | Yes | one patient per trip |
| Hoist with a second patient, or a second rescuer in the same sortie | Part | the registry has three slots; the hoist paths prepare one object at a time [doc] |
| Rotor downwash on the people at the site and at the hook | No | not modelled, not spoken |

### 2.4 Ground and skid operations

| Real procedure | Status | Note |
|---|---|---|
| Rotors running (hot) loading or rotors stopped | ? | the ground operations wait for the rotor (NR gate); a hot-load procedure is not named in the code |
| Crew leaves with the equipment (pack, monitor, stretcher), approach from the safe side | Yes | approach points LUP, RUP, RDWN, LDWN, side of the approach, crouch under the disc |
| Rear crew member crouches at the patient, rises at the end | Yes (170.08) | `multipatient registry assistant stand up` |
| Far landing: ambulance or police carries the crew | Yes (170.07, 170.08) | return gate and ambulance shuttle; the choice by the user at the gate |
| Patient on foot, patient carried by ambulance, handover to the ambulance crew | Yes | |
| Cardiac arrest on scene: CPR and defibrillation, stop and transport criteria | Yes | CPR lease, defibrillator placed at the scene |
| Hypothermia, drowning, avalanche burial, crevasse and rope rescue, long line | No | no profile for hypothermia (no key, no profile id); "Submerged" is a profile, no water rescue mission; no avalanche search (transceiver, probe) beyond the SAR hints; no long line |
| Mass casualty (more than three), triage categories spoken | Part | three live slots, target five; the triage is a priority queue, the categories are not spoken |
| Hazardous materials, decontamination | No | |

### 2.5 Mixing operations

The mission already mixes some operations: a heli rescuer hoisted down and picked up again by the hoist or on the ground, hoist out, the ambulance meeting at a landing spot, the police carrying the crew, the ambulance shuttle. All of them are special paths decided at the moment from the helicopter state (`SIM ON GROUND`), the mode `L:MISSION_HOIST` and the flags of the mission. There is **no operation plan** object that says "doctor by hoist, patient on the ground, rescuer left, transport by the ambulance". The combinations that a real crew would plan and that are not covered by an explicit path or a test:

| Combination | Status | Note |
|---|---|---|
| Doctor by hoist, patient loaded by hoist, helicopter stays in the hover | Yes | |
| Doctor by hoist, then the helicopter lands at a close site for the transport | Part | the mode is a mission variable; the change of mode in the middle of a mission is not an explicit state [inferred] |
| Rescuers left by hoist, patient brought by them to a landing site by foot or by the ambulance | Part | pick-up recheck and approach exist; the rescuer escorting the patient on foot to the helicopter has the walk-to-hospital macros for the hospital only |
| Patient 1 by hoist and patient 2 by the ambulance | Part | per-patient resource tickets exist; the hoist of the second patient needs a second sortie |
| Hoist out to a safe site, then ground operations | Part | ends at the ladders; no state "off the hook at the site" |
| Skid operation with a rescuer going down by the hoist | ? | to test |
| Heli rescuer dropped on the ground with a ground ambulance later | Yes | `drop heli rescuer ground` |

Proposal **P3-A**: an operation plan (see 4).

## 3. Voice and discussions: where they are missing

Pack 36 has 1518 keys: checklists 377, dispatch readings 321, rear crew 104, copilot 68, tips 48, pilot 45, doctor 44, dispatcher 39, rescuer briefing 39. The thin or empty areas:

| Gap | What is missing | Proposal | Priority |
|---|---|---|---|
| Hoist cable calls | hook height callouts, "on the ground", "hooked", "lift slowly", "patient at the door", "hold the hover", direction calls | new group `HST` / `PAX2.*` of the hoist operator tied to the existing cable phases (`HOIST_CABLE_PHASE`) and the reel distance | P1 |
| Hoist pause and abort | `PAX2.5` and `PAX2.6` are in the pack but nothing triggers them | model a pause when the speed or the bank passes a soft limit (below the casualty limits), an abort and recovery above | P1 |
| Hoist pre-checks | no spoken check before the hoist (switch, hook, boom, power) | a short challenge and response (pilot, hoist operator) when the hoist is armed | P2 |
| Landing site | no reconnaissance, wind, slope, wires, bystanders and loose objects calls | an approach block between `APR.*` and the landing: copilot hazard call, rear crew "clear on the left", wind callout like at the hospital | P1 |
| Weather and go / no-go | the weather speaks only in the weather briefing; the crew does not discuss going or not | at the accept: copilot and pilot read the conditions (cloud base, visibility, wind) with the existing weather keys `WX*`; with COND_MISSIONS off, only the speech | P2 |
| In-flight fuel | the fuel is discussed only at a second dispatch | calls at the fuel states used by the mission (below the option limit, bingo to the hospital) | P2 |
| Triage | the live registry orders the patients; no one says red, yellow, green | doctor and copilot name the order when the second and third patient are seen; with five slots the same keys | P2 |
| Destination choice | the doctor does not discuss the receiving centre (trauma centre, burns unit, nearest) | the choice of hospital depends on the pathology profile; a spoken exchange before the hospital selection, then `HOS.CALL.P` with the content (injury, vital signs, minutes) instead of the minutes only | P2 |
| Handover | one exchange (`HOS.HND`) for all patients | structured handover read from the patient record (identification, mechanism, injuries, signs, treatment: the ISBAR or ATMIST order); the doctor says what was done | P2 |
| Radio with ATC or flight information service | none | optional calls at departure and arrival with the frequency of the base; the radio classes already exist (`RADIO_CLASSES.md`) | P3 |
| Dispatcher status messages | RescueTrack texts exist; the spoken ones are the briefing, the vehicles and the hospital | spoken status confirmations for on scene, patient aboard, en route, available | P2 |
| Rescuer left on the ground | `HRD.*` and the pick-up calls exist | calls of the rescuer during the long wait (status, patient, ETA of the ambulance) | P3 |
| Debrief | generic by the LifeScore of the crew | debrief lines that name the events of the mission (a death, a hard landing, a failure, a long wait) | P3 |

Rules for new keys: one group id per event, `trigger` text in the base pack, the key list in `tools/voice-texts.json`, and the three packs EN, DE and FR in `voicepacks/` with the same version (`voicepacks/README.md`).

## 4. UI usability

Findings [data] [code]:

1. **Weight of the pages**: the settings page carries 179 buttons (47 percent of the buttons of the mission), the medical page 159 and the DF stations page 117. The pilot reads and pushes while flying: the pages that serve the flight must be short, the others can be long.
2. **No hoist panel**: the cable length and the height of the hook are read in `09-hoist-ground-ops.json` (23 sites) and never shown on the tablet.
3. **No crew overview**: the LifeScore, the seat and the task of each crew member are in the snapshots and in messages; no page lists who is where (aboard, hoisted, on the ground, in the ambulance) and what each one is doing.
4. **No next action strip**: the buttons that matter at a stage (BEGIN HOISTING, LOAD THE PATIENT, PICK HELI RESCUER, MEET AMBULANCE) live on different pages; a stall is told by a message after 120 s (`ops_progress_warning`), not by showing the action that is waited for.
5. **Singleton modal**: the base selection modal was lost in 170.04-170.06 because another modal replaces it (see the RTB reports); a general modal queue is missing, every modal handles its own return.
6. **Settings versus profiles**: factory profiles, custom profiles and per-mission options mix; a tester cannot tell which value is in force (the profile marks itself CUSTOM).
7. **Text length**: 69 titles and 381 buttons have limits (`max`), long texts can overflow the tablet in the other languages (`UI_TRANSLATION.md`); the checks exist, the margin is not shown.
8. **Voice as a second input**: 34 speech actions cover the main buttons; the hoist cable actions and the ambulance shuttle choices are not in the inventory.
9. **Errors and recovery**: a stalled step ends in a message or a watchdog; the pilot has no "skip this step" or "send the report" on the same screen (SUBMIT MISSION REPORT is a link on the home page).
10. **First run**: the first-start description is a long text page with the download links; the connection state of the briefing depends on three variables (radio, wifi, HOC thread) that the pilot cannot see together.

Proposals:

| Id | Proposal | Priority |
|---|---|---|
| U1 | Hoist panel on the tablet while the hoist is armed or out: cable length, hook height, state (down, ground, up, out), patient hooked, the limit of speed and bank with the margin | P1 |
| U2 | Crew page: one line per member (name, role, place, task, LifeScore band) from the data the mission already keeps | P2 |
| U3 | Next action strip at the top of the briefing page: the one action the mission waits for (the same data as `ops_progress_stage`) with its button | P1 |
| U4 | Modal manager: a queue and a priority (crew emergency over dispatch over choices), one return path; ends the class of bug of the RTB modal | P2 |
| U5 | Connection line in the briefing: radio, wifi, HOC, Companion, each with its state, so the missing ACCEPT bar of 170.08 is visible at once | P1 |
| U6 | Settings: search and "what changed from the profile" list; split the page in flight settings and ground settings | P3 |
| U7 | Add the hoist actions and the ambulance shuttle to the speech inventory | P2 |
| U8 | "Stuck?" button on the briefing: shows the step waited for, the elapsed time and offers REPORT or SKIP (when the step has a safe skip) | P2 |
| U9 | Debug snapshot button on every page (today the link is on the home page and the technical page) | P3 |

## 5. Roadmap proposal

1. **P1 quality of every hoist or landing**: hoist operator cable calls and directions (3), pause and abort model (3), hazard calls at the landing site (3), hoist panel (U1), next action strip (U3), connection line (U5).
2. **P2 consistency of the crew work**: pre-hoist challenge and response, triage and destination discussion, structured handover, fuel and weather calls, crew page (U2), modal manager (U4), speech inventory (U7), "stuck" button (U8).
3. **P3 growth**: operation plan (A), more incident classes (water, avalanche search, hypothermia, mass casualty with five patients, hazardous materials), long line, ATC radio, settings search.

### A. Operation plan (P3-A)

A small record per mission, written by the briefing or by the pilot at the site: how the doctor goes down (ground, hoist, skid), how the patient comes up (ground, hoist, ambulance), what the rescuers do (stay, escort, hoist back), who transports (HEMS, ambulance, hoist out). The existing paths read it instead of deciding from `SIM ON GROUND` alone. It makes the mixed operations explicit, testable (one test per row of the table of 2.5) and speakable (the crew briefing reads the plan). The registry tickets (slot, resource, generation) already give the data model for the patient part.

## 6. What to do first, in the order of the request

1. Confirm with a pilot or a technical crew member the hoist calls of 3 (wording, order, distances) before recording anything.
2. Implement the pause and abort model for the hoist (it is already announced by two keys and two wav files and does nothing).
3. Add the landing site hazard block to the approach and the hoist panel to the tablet.
4. Decide the operation plan (A), because the mixed operations of 2.5 depend on it.

Nothing in this audit changes the mission: no source was edited for it.
