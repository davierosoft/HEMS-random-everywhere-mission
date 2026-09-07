# Multi-patient triage architecture

## Status

The working tree contains an **inactive allocation/physiology registry foundation** in `17-multipatient-runtime.json`, exercised by `tools/test-multipatient-registry.js`. It is not a completed five-patient implementation. The same module now supplies an active P1-P3 tablet-telemetry adapter; scene capacity and physical transport workflows remain unchanged. Debug exposes a non-destructive HPG compatibility check for record-reference mutation and captures registry and tablet diagnostics in the existing snapshot table.

### Medical telemetry after completed visits

All patient visits must finish before any ground patient's medical detail feed closes. A confirmed death resolves that patient's otherwise impossible visit. An initial assessment, a crew-return flag, a provisional reservation, or choosing GROUND is not enough. The live compatibility adapter records completion after `patient clinical visit gate` returns, and also recognizes completed medical actions or completed ambulance treatment. It closes a ground patient's detail page only after P1 is secured in its ambulance transfer sequence or P2/P3 is marked ground transported. It never delays ambulance movement while waiting for other visits.

The pure decision macro accepts one through five records; the current legacy reader supplies only P1-P3 and fails open for unsupported counts. Closed patients receive a summary page with patient navigation, not stale vital signs or treatment controls. The display-copy macro bypasses detailed copying for that selected patient. This stops tablet detail work, not the underlying clinical simulation. H145 and unassigned patients keep their medical pages.

At the first qualifying refresh, a deep-copied closing report and mission time are retained in `patient_tablet_reports`. Later clinical changes cannot rewrite it. Debug and Capture Snapshot expose `tablet_policy`, `tablet_reports`, `tablet_report_archive`, `tablet_enabled`, and `tablet_visits`. A fresh dispatch clears these transient records; saved Debug snapshots remain available through the existing table. The legacy More casualties flow renames/promotes physical identities: archive the previous closing reports (up to 15) and fail open for tablet closure on that repeat rescue until stable-slot transport replaces promotion. Do not hide a new patient using an old slot's flags.

The registry uses a single-writer request queue. Crew workers must submit requests; only the lifecycle-owned service may run reservation, transition, death, and CPR mutations. A transport ticket contains slot, resource, and reservation generation so a timed-out worker cannot advance a newer assignment. Only unstarted reservations may be automatically released; a failure after physical loading begins requires recovery before reassignment. Tests cover capacities one through five, projected decline, competing requests, stale tickets, frozen reports, CPR exclusion/timeout, and one-shot deaths. These tests execute the production HPG command lists in a limited interpreter; they do not validate HPG scheduling, object creation, or simulator choreography.

Activation requires completing the scene/clinical/physical adapters, graph-based patient access and return routes, UI and save/reload integration, and the runtime matrix. P4/P5 are explicitly required for the final conversion; do not mark that work complete based on registry tests or the diagnostic page alone.

The inactive foundation also includes a waypoint-graph path planner and slot-independent physiology/profile intake adapters. The planner never invents proximity edges and rejects disconnected graphs; scene-specific geometry and movement callers still need integration. Physiology tests compare all five slots against the existing P2 formulas with identical random sequences, and exercise the primary pathology catalog. These adapters do not yet replace live medical workers.

Mutable arrays use `create_array: 0`, including per-patient history, registry resets, request queues, path buffers and SDK probes. Do not rely on the interpreter cloning a literal `[]` for every invocation. The old smoke test combined scalar assignment and history length into one misleading error: retaining its literal history reproduces first-call PASS and subsequent FAIL despite a successful scalar assignment. This is a reproduced compatibility risk, not proof of HPG's internal implementation. Regression tests cover both copied and retained literals; the simulator probe now runs five calls and saves individual before/after values in `sdk_samples` so runtime evidence can distinguish the cases.

Status baseline: **0.997 127**. Registry primitives, projected-priority selection, reservation generations, CPR leases, the path planner, generic physiology helpers, capacities 1-5 command tests, SDK diagnostics and the P1-P3 tablet adapter are implemented. Do not keep their creation on the remaining-work list. Except for the live tablet adapter, these helpers are still not connected to the physical mission.

The successful five-sample simulator SDK check is recorded in [VALIDATION_STATUS.md](../testing/VALIDATION_STATUS.md). It does not validate the full clinical or transport workflow. In particular, the existing P2/P3 deterioration loops still share legacy state and depend on primary rescue; that issue was identified but has not been changed.

The requested objective is to support up to five interchangeable casualties, while retaining an extension path for a later sixth or higher slot. H145 carries one patient at a time. Each available ambulance carries one patient at a time. The H145 should receive the highest-priority eligible patient; ambulances receive the next eligible patients by medical priority.

## Current mission findings

The current mission is hardcoded for one primary patient plus patients 2 and 3:

- `multiple injured` only creates `injured_human2` and `injured_human3`.
- Patient 2 and patient 3 run separate deterioration loops; patient 1 uses different health/decrease macros.
- `Patient2 status` and `Patient3 status` contain count-specific message text.
- `ambulance2 secondary rescue` only chooses patient 2, then patient 3 as fallback.
- `More casualties` promotes patient 2 or 3 to the primary object, proving that patients are not interchangeable.
- Existing 3-crew and 4/5-crew ground-operation macros are large, stateful, and use singular locals such as `whobringpatient`, `crewpatientonstretcher`, and `crewpatientloaded`.

Do not add patient 4 and patient 5 by copying those macros.

## Required target model

Use five fixed physical slots with a data-driven registry:

- Stable object identifiers: patient slot 1 through patient slot 5.
- A `patients` registry array/struct where each record contains at least:
  - slot number
  - object/location reference
  - active state
  - medical state
  - lifescore
  - decrease rate
  - pathology, symptoms, health code, and consciousness
  - assigned resource: none, H145, ambulance1, ambulance2, etc.
  - transport state: on_scene, reserved, loading, loaded, transported, released, died
  - CPR eligibility and treatment state
- `PATIENT_CAPACITY = 5` in one location. Extending later should mean adding one adapter slot and one scene-table limit, not copying the full triage and transport system.

Use static slot adapters where HPG requires known object names. Use generic macro parameters, arrays, structs, and `for_each` for medical updates, priority selection, messages, and resource assignment. Avoid building dynamic LVAR/object names in UI or debug text. HPG supports macro parameters and `for_each`, but object creation uses unique object names and static adapters are the safer compatibility boundary.

## Medical and triage rules

Replace separate patient health loops with one central patient monitor:

1. Iterate only active, on-scene, non-transported patients.
2. Apply that patient's own decrease rate on a deterministic time tick.
3. Update health code and medical state uniformly.
4. Declare death exactly once and remove the patient from allocation.
5. Preserve a per-patient medical history/status for RescueTrack and debug.

Priority must not use only the instantaneous lifescore. Use a projected urgency value based on current lifescore, decrease rate, and a configurable estimated transport/treatment delay. Lower projected survivability means higher priority.

The H145 is automatically proposed the highest-priority eligible patient. Provide an explicit pilot override list only if it cannot reserve a patient already allocated or in treatment by another resource.

## Resource allocation

Replace the singular `whobringpatient` model with a reservation table:

- H145 reserves one eligible patient.
- Each available ambulance reserves at most one different eligible patient.
- Reservation is atomic: a patient changes from `on_scene` to `reserved` before any crew or vehicle starts moving.
- A timeout/failure releases the reservation safely.
- Arrival, stretcher load, departure, and destination completion advance only the assigned patient record.
- No crew, stretcher, ambulance, or H145 may start a sequence using an unreserved patient.

Existing transport choreography should be converted behind slot adapters. Preserve known-good route and animation behavior, especially the historical 3-crew, 4/5-crew, hoist, transfer, ambulance destination, and user destination paths. Do not change skid landing logic unless explicitly requested.

## CPR and deaths

Only one patient may receive CPR at a time:

- Introduce `active_cpr_slot` plus a lease/lock.
- The first valid highest-priority CPR target acquires the lock.
- A second patient may deteriorate or die while CPR is occupied, but cannot trigger a second CPR animation, crew sequence, or duplicate message.
- Release the lock on success, death, abort, transport, object loss, or timeout.
- Count each death once per patient record. Never reuse the existing single-patient death counters blindly.

## Messages, RescueTrack, and debug

Replace exact-count text with an aggregated patient summary generated from the registry:

- active patient count
- each active slot's health code, lifescore, decrease rate, allocation, and state
- number transported, treated, dead, and awaiting resources
- current CPR slot, if any

The debug page must use static supported references only. Do not reintroduce dynamic LVAR names based on VCP/local substitution.

## Scene eligibility

Create a scene-profile table instead of random high victim counts:

- ordinary single-car, motorcycle, domestic, and minor scenes: 1-2 patients
- larger multi-vehicle crashes: up to 3
- bus, train, aircraft, major multi-vehicle incidents, and equivalent mass-casualty profiles: 4-5
- scene profile also declares compatible resources, likely patient positioning patterns, and maximum patient count

The current generic crash branch must not independently force a count that contradicts the profile table.

## Remaining implementation only

1. Connect real scene identities and profiles to the registry. Replace the independent legacy deterioration loops with the lifecycle-owned monitor, without duplicate workers or primary-rescue gating. Define dispatch generation, reload and object-loss recovery.
2. Route clinical actions, visit ownership, deaths, CPR and RescueTrack through the existing generic records. Preserve full AUTO/MANUAL medical behavior and the completed-visit tablet policy.
3. Connect every H145/ambulance worker to existing reservation tickets and transitions. Replace primary-object promotion in More casualties with stable slot identities and preserve reports during repeated rescue.
4. Author scene-specific waypoint graphs around actual wreck geometry; integrate both unladen crew approach and loaded-stretcher return. The existing path algorithm is not evidence that authored edges avoid real obstacles.
5. Add P4/P5 physical adapters, eligible mass-casualty scene profiles, generic five-slot selectors and transport/report UI. Do not copy P2/P3 clinical engines or treat five synthetic registry records as five operational scene patients.
6. Complete registry save/reload and persistent report integration, then execute the physical/runtime matrix for each crew configuration, no/one/two ambulances, H145-only, CPR, death, timeout/release, hoist/skid, transfer, custom locations and mass-casualty profiles.

Keep simulator sign-off separate from implemented code; update only the remaining items as integration actually lands. Preserve the original NR/skid gates and crew-creation synchronization.

## Decisions required before implementation

- Is H145 selection always automatic, or may the pilot override the triage recommendation?
- What projected-delay assumptions should define priority?
- Which exact scene types are allowed to generate four or five patients?
- Can a patient be transferred from an ambulance reservation to H145 after deterioration, and at what cut-off?
- Does successful CPR restore a fixed lifescore, a range, or a scene/pathology-specific value?

## HPG constraints and useful capabilities

HPG supports macro parameters, array/struct data, `for_each`, `modify_array`, and reusable command lists. These are suitable for registry and message logic. Keep physical object names and animation adapters explicit and stable because object creation requires unique names and the existing H145 choreography is name/state specific.

References:

- https://davux.com/docs/missionsys/REFERENCE-COMMAND.html
- https://davux.com/docs/missionsys/REFERENCE-QUERY.html
- https://davux.com/docs/missionsys/TOPIC-ANATOMY.html
