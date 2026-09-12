# HEMS workspace map

This repository ships an HPG mission for the H145. The simulator consumes `everywhere_all.json`, while coding work should use the smaller owned sources and documents below.

## Root files

| Path | Ownership and contents |
| --- | --- |
| `everywhere_all.json` | Generated HPG deployment artifact. Contains metadata, macros, tables, threads, locations, objectives, briefing, and embedded icons. Do not edit directly. |
| `mission-src/` | Editable modular source for the artifact's `macros` and `data` sections. |
| `global.json` | Persistent global defaults used across mission reloads. |
| `train.json` | Companion/custom loader with its own executable and renderer contract. |
| `starting point/everywhere_all.json` | Historical starting baseline; never treat it as the active build. |
| `DEVELOPMENT_RELEASE_CHECKLIST.md` | Blocking HPG syntax, state, subsystem, and release constraints. |
| `CHANGELOG.en.md` | Canonical technical release history. |
| `CHANGELOG_USER.en.md` | Public-facing changelog; update only on explicit request. |
| `sound/` | Packaged WAV assets; names are runtime identifiers. |
| `docs/` | Durable architecture, testing, and renderer references. |
| `docs/architecture/DEVELOPMENT_WORKFLOW.md` | Development checkpoints, CI, PR delivery, and validated-release boundaries. |
| `docs/testing/VALIDATION_STATUS.md` | Current artifact identity, confirmed evidence, and pending simulator sign-off. |
| `docs/architecture/DEBUG_HANDOFF_2026-09-12.md` | User-requested handoff: preserved behavior, ownership and next debug work. Read before changing the P1-P3 integration. |
| `docs/architecture/CICERS_WORKSPACE_OPTIMIZATION.md` | Technical report covering workspace modularization, safeguards, validation, and residual limitations. |
| `tools/` | Dependency-free assemblers, scope guards, validators, and regression tests. |
| `.githooks/` | Local safeguards: pre-commit permits only `CICERS/*` and runs workspace checks; pre-push rejects every non-`CICERS/*` branch destination. |

## Macro modules

| Module | Contents |
| --- | --- |
| `01-bootstrap-settings.json` | Version/custom settings, CICERS integration, service selection, startup fallbacks. |
| `02-save-load-presets.json` | Save/reload, persistent mission presets, aircraft-profile persistence. |
| `03-aircraft-crew-checklists.json` | Aircraft setup, boarding, engines, fuel, weights, audio, checklists. |
| `15-debug-and-df-ui.json` | Debug Center plus CARLS Direction Finder controls, renderer, and DF-station database UI. |
| `16-release-test-tracker.json` | Debug Test Tracker: persistent first-execution, completion, tester result, and failure-comment flow. |
| `04-dispatch-tablet-ui.json` | Tablet pages, settings, mission lists, and keypad events. |
| `05-navigation-queries.json` | Queries, locations, waypoints, maps, routes, destinations. |
| `06-scene-generation.json` | Incident profiles, random assets, people, vehicles, VFX, SAR scenes. |
| `07-patient-medical.json` | Patient creation, physiology, treatment, CPR, identity, multi-patient state. |
| `08-ground-response.json` | Ambulance, police, fire, travel, parking, handover, secondary rescue. |
| `09-hoist-ground-ops.json` | Hoist, skid/ground operations, heli-rescuer and crew choreography. |
| `10-transfer-special-missions.json` | Patient/organ transfers, ELT, special missions, midway loading. |
| `11-mission-lifecycle.json` | Dispatch objectives, cancellation, reporting, RTB, RescueTrack updates. |
| `12-marshalling.json` | Base/hospital/technical marshaller state and animation. |
| `13-crew-emergency.json` | Crew LifeScore, fatal replacement, emergency recovery and routing. |
| `14-shared-runtime.json` | Shared repeated blocks and uncoupled runtime helpers. |
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

## Change flow

1. Assert `CICERS/*`, inspect Git status, and declare semantic scope.
2. Locate the owner with `mission-workspace.js locate`; read only that module and its callers.
3. Snapshot mission scope and patch the owning module. Prepare a one-use draft intent before intermediate builds; only an explicitly requested artifact delivery uses a higher release intent. Drafts do not advance delivery history.
4. Inspect the artifact diff, require byte equality and explicit semantic allowlists, then pass the static release gate.
5. Run focused checks, then `npm test`, `git diff --check`, and the affected simulator matrix. Package only after actual runtime sign-off. The consistency gate keeps manifest ownership, module counts, docs, scripts, and AGENTS limits synchronized.
6. If the user asks to sync development code while testing, push CICERS and merge its normal PR only after CI passes. Report runtime as pending; do not rebuild an unchanged mission, publish a release, or commit generated `outputs/`.

This layout keeps opaque icons and inactive subsystems out of normal model context, gives each macro one owner, and makes accidental cross-subsystem edits machine-detectable.
