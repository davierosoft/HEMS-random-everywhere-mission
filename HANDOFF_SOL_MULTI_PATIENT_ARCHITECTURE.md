# Handoff for SOL - Multi-patient triage refactor

## Status

Partially implemented as of release 0.997 91; the original target architecture below remains authoritative only for the still-open stages.

Implemented: P1-P3 manual/AUTO display adapters, one active-patient mutex, canonical `manual_pN_*` state, pathology-driven P2/P3 vitals, ambulance pre-assessment of all present patients, ground-care eligibility, independent ambulance ownership and frozen transport reports.

Still open: the generic five-slot `PATIENT_CAPACITY` registry, one data-driven medical monitor, atomic resource allocator/reservations, projected-priority policy, a single CPR lease, generic physical-slot adapters for P4/P5 and capacity tests through five patients. Do not create P4/P5 by copying the P2/P3 implementation.

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

## Recommended staged delivery

1. Registry foundation and compatibility audit:
   - Introduce the patient registry, states, score/decrease model, and aggregated messages.
   - Keep physical capacity at three while mirroring existing behavior.
   - Validate save/reload boundaries and no duplicate worker threads.

2. Allocation and treatment:
   - Implement atomic H145/ambulance assignment.
   - Convert health, death, CPR, RescueTrack, and debug to registry data.
   - Preserve existing physical routes through static slot adapters.

3. Capacity expansion:
   - Add slots 4 and 5.
   - Add mass-casualty scene profiles.
   - Add corresponding ambulance/crew choreography only after the allocator is stable.

4. Regression and runtime test:
   - Test each crew configuration, no ambulance, one ambulance, two ambulances, H145-only, CPR, death during transport, timeout/release, reload, hoist, transfer, custom locations, and every mass-casualty profile.

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
