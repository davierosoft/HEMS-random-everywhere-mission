# HEMS workspace map

This repository ships an HPG mission for the H145. The simulator consumes `everywhere_all.json`, while coding work should use the smaller owned sources and documents below.

## Root files

| Path | Ownership and contents |
| --- | --- |
| `everywhere_all.json` | Generated HPG deployment artifact. Contains metadata, macros, tables, threads, locations, objectives, briefing, and embedded icons. Do not edit directly. |
| `mission-src/` | Editable modular source for every root section of the artifact: `macros`, `data`, `threads`, `icons` and the remaining root keys (`root`). |
| `train.json` | Companion/custom loader with its own executable and renderer contract. |
| `DEVELOPMENT_RELEASE_CHECKLIST.md` | Blocking HPG syntax, state, subsystem, and release constraints. |
| `CHANGELOG.en.md` | Canonical technical release history. |
| `CHANGELOG_USER.en.md` | Public-facing changelog; update only on explicit request. |
| `sound/` | Packaged WAV assets; names are runtime identifiers. |
| `docs/` | Durable architecture, testing, and renderer references. |
| `docs/architecture/DEVELOPMENT_WORKFLOW.md` | Development checkpoints, CI, PR delivery, and validated-release boundaries. |
| `docs/testing/VALIDATION_STATUS.md` | Current artifact identity, confirmed evidence, and pending simulator sign-off. |
| `docs/architecture/PERFORMANCE_OPTIONS.md` | Settings PERFORMANCE section: impact monitor sampling and altitude gate, BASIC/ADVANCED log level. |
| `docs/architecture/VOICE_APP_MODE.md` | Voice app mode with the HPG Mission Companion: counters `L:<role>APP<n>` read by the program, the `voice ...` macros, the radio context variables, messages still to wire, defects found. |
| `docs/architecture/SPEECH_ACTIONS.md` | Draft of the mission side of the speech bridge of the Companion: inventory of the 34 user action ids (58 definitions, `speech-actions-inventory.json`), voice classes, draft `MissionSpeechContract` declaration (`L:HMC_SPEECH_*`), the open point on where the availability condition lives, simulator tests T1-T4. Implemented in the mission sources (169.70, see "Implemented"); runtime pending. |
| `docs/architecture/CHECKLIST_CHAIN.md` | Checklists of flight manual section 4 (interior check to engine shut-down): order, hand-over, 49-character rows, variables used, choices and timers. |
| `docs/architecture/KIT_WEIGHTS.md` | Payload stations: crew by sum and difference, kit masses per station, option `KIT_WEIGHTS` on the technical page, the thread that keeps them in line. |
| `docs/architecture/ROAD_APPROACH_ROUTES.md` | Approach points `wpc`, `wprescue`, `wph`, `wpt` taken from route arrays by `road nodes generator`. |
| `docs/architecture/SAR_VISUAL_HINTS_AND_MISSIONS.md` | SAR visual hints around the victim, `sar_objects` static, custom SAR missions 65-68. |
| `docs/architecture/FLIGHT_REPORT_2026-10-20.md` | The defects found in the flight of 2026-10-20 and what changed: the heli rescuer secures first, the pick-up route, the patient on foot with a heli rescuer, the progress bar everywhere, the radio reminder, the heli rescuer place, SAR found, hospital, pick-up and organ calls, the work light, the first-run defaults rule. |
| `docs/architecture/FLIGHT_REPORT_2026-10-21.md` | The answers of 2026-10-21: the time bar of the organ, team and blood missions, the work light after the fire fighters, the pages of the checklists on the fire buttons, the terrain test of the heli rescuer, the incidents 69-74 and the secondary missions 101-102. |
| `docs/architecture/PATIENT_DEMOGRAPHICS.md` | Clinical record of an unvisited patient and the sex and age rules by the wording of the dispatch (`accident demographics`). |
| `docs/architecture/SHARED_DATA.md` | Shared hangar and hospital waypoints and offline database changes: the git folder `shared-data/`, the table the Companion app writes, the loader macro and what the simulator proved about `fetch` and tables. |
| `shared-data/` | Shared hangar/hospital waypoints (`waypoints.json`), changes to the offline databases of the H145 (`db/<type>.json`) and `manifest.json` (revision and hashes); maintained with `tools/shared-data.js`, downloaded by the Companion app. |
| `docs/architecture/DEBUG_HANDOFF_2026-09-12.md` | User-requested handoff: preserved behavior, ownership and next debug work. Read before changing the P1-P3 integration. |
| `docs/architecture/CICERS_WORKSPACE_OPTIMIZATION.md` | Technical report covering workspace modularization, safeguards, validation, and residual limitations. |
| `tools/` | Dependency-free assemblers, scope guards, validators, and regression tests. |
| `standalone-tests/` | Self-contained HPG missions used for isolated runtime checks (e.g. dynamic-object `VAR` probing). Not part of `mission-src/`, not built by `mission-workspace.js`, not covered by release/scope tooling. |
| `.githooks/` | Local safeguards: pre-commit permits only `main` and runs workspace checks (a targeted subset for doc-only commits); pre-push rejects every non-`main` branch destination. |

## Macro modules

| Module | Contents |
| --- | --- |
| `01-bootstrap-settings.json` | Version/custom settings, CICERS integration, service selection, startup fallbacks. |
| `02-save-load-presets.json` | Save/reload, persistent mission presets, aircraft-profile persistence. |
| `03-aircraft-crew-checklists.json` | Aircraft setup, boarding, engines, fuel, weights, audio, crew configuration. |
| `24-speech-bridge.json` | Speech action bridge for the Mission Companion (generated by `tools/speech-bridge.js`): `speech bridge start` / `speech bridge loop` (mailbox, session, ready), `speech availability` (button exists + its show_condition), `speech action run` (`trigger_user_action` of the requested code), `speech availability clear`. Setting `SPEECH_COMMANDS`, default off. |
| `23-payload-weights.json` | Payload station weights: `station weights recompute` (seat LVAR presence, hoist flags, kit masses), `kit weights target`, `set station weight` (hoist flags), `station weights read`. |
| `22-checklists.json` | Tablet checklists of flight manual section 4 (interior check to engine shut-down, IFR procedures), the checklist main page and hand-over macros. |
| `15-debug-and-df-ui.json` | Debug Center plus CARLS Direction Finder controls, renderer, and DF-station database UI. |
| `04-dispatch-tablet-ui.json` | Tablet pages, settings, mission lists, and keypad events. |
| `05-navigation-queries.json` | Nation/accident queries, positional queries, hospital/helipad transfer lists, ambulance/user destination selection. |
| `21-poi-location-generators.json` | Procedural point-of-interest and terrain location generators for scene generation. |
| `06-scene-generation.json` | Incident profiles, random assets, people, vehicles, VFX, SAR scenes. |
| `07-patient-medical.json` | Patient creation, physiology, treatment, CPR, identity, multi-patient state. |
| `08-ground-response.json` | Ambulance, police, fire, travel, parking, handover, secondary rescue. |
| `09-hoist-ground-ops.json` | Hoist, skid/ground operations, heli-rescuer and crew choreography. |
| `10-transfer-special-missions.json` | Patient/organ transfers, ELT, special missions, midway loading. |
| `11-mission-lifecycle.json` | Dispatch objectives, cancellation, reporting, RTB, RescueTrack updates. |
| `12-marshalling.json` | Base/hospital/technical marshaller state and animation. |
| `13-crew-emergency.json` | Crew LifeScore, fatal replacement, emergency recovery and routing. |
| `14-shared-runtime.json` | Shared repeated blocks and uncoupled runtime helpers. |
| `19-location-diagnostics.json` | Automatic location history and rescue fallback diagnostics. |
| `20-runtime-regression-overrides.json` | Hoist ground impact monitors (measured descent rate of the hook). Rules of the cable casualties in `docs/architecture/HOIST_CABLE_CASUALTIES.md`. |
| `17-multipatient-runtime.json` | Generic five-patient registry, single-writer allocation queue, transport tickets, CPR leases, and clinical event history. |
| `18-hems-patient-selection.json` | HEMS patient selection by lowest current LifeScore among patients not already transported by ground. |

## Data modules

| Module | Contents |
| --- | --- |
| `01-persistence-tables.json` | Debug, mission preset, aircraft-profile, and independent saved-profile tables. |
| `02-waypoints-and-categories.json` | Hospital/hangar/accident waypoints and browse categories. |
| `03-people-and-names.json` | Casualties, civilians, responders, and generated names. |
| `04-vehicles-and-scene-assets.json` | Response vehicles, barriers, lights, transport, wrecks, scene pools. |
| `05-health-profiles.json` | Numbered primary medical/pathology profiles. |
| `06-special-health-and-messages.json` | Secondary/Halloween profiles and status/CARLS messages. |

## Thread modules

| Module | Contents |
| --- | --- |
| `01-startup-and-dispatch-triggers.json` | Startup, fuel, connection and RescueTrack monitors; dispatch triggers (Acceptdispatch 0, Ready dispatch 5 and 6, Stop dispatch 7, NEW DISPATCH, MFD display and delete). |
| `02-carls.json` | CARLS radio threads: startup, home, connected, popup (Sending request / Request sent), STS, GRP, STP, DF. |
| `03-flight-monitors.json` | PFT, landing classification, VNE, FLI, Vtoss, Vy, attitude, engine pairs. |

## Icon modules

| Module | Contents |
| --- | --- |
| `01-interface-icons.json` | Small interface icons (save, LEDs, wifi, vehicles, bars, options, sliders). |
| `02-tablet-and-carls-backgrounds.json` | Tablet home and CARLS background images. |
| `03-vital-gcs.json`, `04-vital-respiratory-rate.json`, `05-vital-body-temperature.json`, `06-vital-blood-pressure.json` | One vital-sign image each (opaque base64). |

## Root modules

| Module | Contents |
| --- | --- |
| `01-header.json` | title, id, author, start_info, aircraft, applicable, api_version, locations, objects, userActions. |
| `02-objectives.json` | Mission objectives. |
| `03-briefing.json` | Briefing widgets. |

## Change flow

1. Assert `main`, inspect Git status, and declare semantic scope.
2. Locate the owner with `mission-workspace.js locate`; read only that module and its callers.
3. Snapshot mission scope and patch the owning module. Prepare a one-use draft intent before intermediate builds; only an explicitly requested artifact delivery uses a higher release intent. Drafts do not advance delivery history.
4. Inspect the artifact diff, require byte equality and explicit semantic allowlists, then pass the static release gate.
5. Run focused checks, then `npm test`, `git diff --check`, and the affected simulator matrix. Package only after actual runtime sign-off. The consistency gate keeps manifest ownership, module counts, docs, scripts, and AGENTS limits synchronized.
6. If the user asks to sync development code while testing, push `main` only after CI passes. Report runtime as pending; do not rebuild an unchanged mission, publish a release, or commit generated `outputs/`.

This layout keeps opaque icons and inactive subsystems out of normal model context, gives each macro one owner, and makes accidental cross-subsystem edits machine-detectable.
