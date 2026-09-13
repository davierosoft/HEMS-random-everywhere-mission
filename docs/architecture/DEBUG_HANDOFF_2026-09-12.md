# HEMS checkpoint and debug handoff - 2026-09-12

This handoff is explicitly requested by the user to preserve work across subsequent tasks and models. Canonical living contracts remain [MULTI_PATIENT.md](MULTI_PATIENT.md), [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) and [runtime validation](../testing/RUNTIME_VALIDATION.md).

## Identity and authorization

- Development branch: `CICERS/uniform-crew-visits`. GitHub main synchronization is authorized through a normal PR after checks. Keep local work on CICERS with `.githooks` active.
- Generated mission identity remains `0.997 159`. This synchronization creates no new numbered delivery, tag, package or validated release.
- `everywhere_all.json` SHA-256: `e411d8a8454a860cb04ef462e9790026ed49f82811033b2d00377550cda47870`.
- Source: 747 macros, 185 data entries, 18 macro modules. Generated artifact and source are byte-exact. Full local static suite PASS; HPG/MSFS integration validation PENDING.
- Inherited history disagrees: the release ledger says 152, validation documentation records a supplied 155 candidate, and the working identity is 159. Verify actual user deliveries before any future requested delivery. Do not infer delivery history from draft folders or changelog headings, or renumber during debugging.

## Intent and implemented points 1-9

1. Separate per-crew observation, temporary clinical ownership and transport ownership. Previous treatment by another crew does not exclude a new visit.
2. Use one physical P1/P2/P3 tour for ambulance1, ambulance2 and HEMS, including P1 for ambulance2. Preserve ground/skid assistant and pilot roles.
3. Gate reservations on actual tour and treatment completion. AUTO effects finish inside visits; MANUAL waits for action workers and resumes after completed ground actions. Timers, assessment alone or the primary rescued flag cannot complete the barrier.
4. Allocate through the lifecycle-owned queue with exclusive slot/resource/generation tickets. Ground clinical suitability cannot be overridden by spare ambulance capacity.
5. Preserve valid HEMS tickets across selection calls. Prioritize patients unsuitable for ground transport, then lower LifeScore with stable slot ordering. Distinguish pending visits, awaiting resources, ground transport in progress and no transport required.
6. Load the ticketed P1, P2 or P3 on either ambulance or HEMS while retaining ground/skid/hoist/destination procedures. Freeze the correct report at loading; remove the selected casualty only after confirmed loading. Release failed loading tickets only after verified physical scene recovery.
7. Keep temporary ambulance shelter separate from transport allocation. Preserve the hidden original identity anchor and observation access; commit shelter only when the stretcher reaches the vehicle.
8. Apply independent physiology at a common cadence using each patient's own rate. Preserve stable slots through repeat rescue without P2/P3 promotion into P1. Save/restore retains identity, completed treatments and terminal transport while invalidating interrupted tickets/workers.
9. Add production-command tests, debug state and the simulator matrix. Source implementation is complete for these P1-P3 points; simulator sign-off is not.

## Ownership

| Area | Source under `mission-src/macros/` |
| --- | --- |
| Queue, tickets, barrier, live loaders, physiology, CPR adapters, shelter, recovery and save records | `17-multipatient-runtime.json` |
| Stable HEMS selection and selected-patient preparation | `18-hems-patient-selection.json` |
| Preset save/reload/delete hooks | `02-save-load-presets.json` |
| MANUAL workers and legacy/live CPR boundary | `07-patient-medical.json` |
| Ambulance dispatch, handover, preload and compatibility entry points | `08-ground-response.json` |
| Selected-patient ground/skid/hoist movement and aircraft loading callbacks | `09-hoist-ground-ops.json` |
| Destination receipts | `05-navigation-queries.json` |
| Pending transport, mission completion and stable repeat rescue | `11-mission-lifecycle.json` |
| Debug Center and Capture Snapshot | `15-debug-and-df-ui.json` |

Preserve `patient_crew_visits`, `patient_crew_tours`, `patient_crew_visit_generation`, `patient_live_generation`, `HEMS_VISIT_OBJECT`, `HEMS_TRANSPORT_TICKET`, `ambulance1_transport_ticket`, `ambulance2_transport_ticket`, `patient_pending_transport`, `patient_unassigned_transport` and `cpr_patient_slot`. Inspect all affected callers before changing shared state. The live service outlives individual crew tours; old workers must not mutate a new generation.

CPR uses explicit selected-patient read/write adapters and one lease with a captured deadline. Expired workers cannot overwrite a newer process. Stopping CPR on one patient must not automatically rearm that patient or block another. Loaded HEMS mCPR and non-registry legacy CPR remain supported distinct paths.

Persistence uses schema 1 and existing Debug table keys `crew_transport_save0` through `crew_transport_save3` and `crew_transport_reload`. Restore checks mission and scene coordinates. Do not reapply completed actions. Interrupted transfers require fresh allocation and visits. Do not conflate ground and HEMS report providers; P1 has historical lowercase report fields.

Preserve [HPG object states](HPG_DYNAMIC_OBJECT_STATES.md). Non-helicopter offsets use cardinal `bearing2`; rear ambulance/stretcher offsets use 180. Route watchdogs derive from duration/distance and effective speed plus a safety delta, with verified location fallbacks. The live ground route uses ETA / 1.5 + 120, not a fixed travel timeout.

Aircraft HVAR forms/counts remain 582 trigger calls and 239 assignment calls. `tools/hvar-command-contract.json` records call sites; path reindexing is not permission to alter command semantics.

## Accumulated work retained

The checkpoint includes prior local development alongside points 1-9: route/location safety, civilian object guards, health-profile symptoms and clinical overrides, fixed-scene diagnostics, crew acceleration/LifeScore monitoring, independent aircraft settings, data-query provider recovery, ASCII UI/profile labels and retained ground-patient reports. Preserve their regression gates and technical history; do not revert them because they predate this handoff.

`global.json` already contained NR threshold 80 and data-query mode 10 before this task. Include that existing dependency unchanged; this task does not edit or regenerate it. It remains immutable under AGENTS. `train.json` has only pre-existing line-ending/whitespace changes and is excluded from the checkpoint. Internal `.workspace-state/` backups and `outputs/drafts/` are not source, deliveries or scripts to replay.

## Verification and remaining work

`node tools/check-workspace.js` is the full suite used by hooks and Windows/Linux CI. `tools/test-live-patient-transport.js` executes production commands for all nine patient/resource combinations, actual MANUAL/CPR workers, stale tickets, independent deterioration, one-shot death, physical recovery and three save presets. Crew-visit, foundation registry, ground/hoist/stretcher, HVAR, symptom, civilian, route and workspace/release negative tests protect the surrounding implementation.

These tests emulate physical and aircraft boundaries. They do not prove HPG scheduling, object positions, animation timing, aircraft receipts or complete persistence. Use `RUNTIME_VALIDATION.md`, record setup and observations, and capture debug state before runtime edits.

Prioritize all resource arrival orders; 3/4/5 crew with ground/skid/hoist; no/one/two ambulances; all nine assignments; AUTO/MANUAL completion; shelter; failed movement/load recovery; CPR stop/expiry and mCPR; death; repeat rescue; save/reload during treatment/transfer; destination receipts, frozen reports and RescueTrack.

P4/P5 physical adapters, eligible mass-casualty profiles, five-slot transport/report UI and authored obstacle-aware route graphs remain unimplemented integration. Do not restart completed SDK/registry foundation work, copy P1 macros to manufacture five-patient support, or treat synthetic five-slot tests as physical mission support.

## Continuation

The next user-requested task uses `gpt-5.6-luna` with `medium` reasoning. Start from the merged checkpoint, read AGENTS and the linked contracts, and create/use `CICERS/*` before edits. Establish a baseline and collect an actual failing scenario or simulator evidence. Fix one evidenced issue at a time with declared macro/data scope, a focused regression, one-use draft build, byte-exact check and full static verification when stable. Only mark observed simulator scenarios as passed.

The standing instruction is no new mission releases, packages or download deliveries until explicitly requested. A later debug task does not inherit blanket authorization for future GitHub publication from this checkpoint synchronization.
