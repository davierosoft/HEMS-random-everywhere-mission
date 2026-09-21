# Current development validation

## Current candidate 0.997 168.22 - 2026-09-20

The supplied drive-object experiment does not prove that every dynamic name fails: the test lifecycle was altered in a replacement harness and lost the original objective `wait_for`, so a mission reset could invalidate the observation. The reliable finding is narrower: `param`-based drive-object fields are not trusted, especially in the crew path; the original traffic paths use same-thread `local` names and are being retained. The production audit now has no `param` in any `drive_object` name or `VAR1`; multipatient patient targets are snapshotted into same-thread locals before movement. The local-vs-param comparison must use the user-supplied test unchanged except for the single field under test. The AMBU_AVAIL logic and synchronous movement contract were not changed.

- Local artifact: `outputs/0.997-168.22-local-test/everywhere_all.json`.
- SHA-256: `69096fe875d87fdac7bf11937aec732100b1e7b6614bed3f58ebaf0ea310fd89`.
- Static workspace, mission, formatting, scope, targeted recovery, transport, patient-visit and full verification gates: **PASS**.
- Runtime HPG/MSFS validation: **PENDING**. The exact simulator checks still required are both ambulances, HEMS crew movement/visits, stretcher handover, traffic/fire response, destination flow, dispatch visibility, snapshots, and the carried P1-P3 scenarios.
- Traffic `drive_object` names are restored to the previously working same-thread `local` form. Remaining crew/HEMS movement paths must be audited for `param` in object names or VAR1 and converted to static/local forms only after the controlled test confirms the syntax. Simulator confirmation remains required.

## Next-release ledger after release 22

This is the carried checklist for the next explicitly authorized release. It is not a build or a publication instruction.

### Completed or source-covered

- Restored the three traffic `drive_object` commands to their previously working `{local:carname1/2/3}` form.
- Kept `AMBU_AVAIL` logic unchanged.
- Kept the static crew/medic/stretcher branches already introduced for the multipatient movement path.
- Restored the operational stretcher lifecycle for multipatient ground loading: the stretcher is created when the arriving ambulance needs it, exits the ambulance, reaches the assigned casualty, loads the casualty, returns to the ambulance and only then completes the transport state; it is not treated as a permanently static scene prop.
- Kept the fire/grill smoke restriction tied to mission `ID_CARD 33`, not merely to `CRASH_VARIABLE`.
- Retained the explicit ambulance identifiers in dispatch messages.
- Retained the LifeScore show/hide behavior and the additional-info visibility conditions.
- Removed the duplicate legacy Patient 1 clinical-visit block that ran after the multipatient HEMS tour; the registry tour is now the single visit owner.
- Raised the HEMS/crew final approach speeds to at least `1`, using `2` for the 0.2-0.4 m final legs, including the shared legacy crew helpers.
- Corrected the three-crew `pax3` role to the pilot/backpack state: movement uses `VAR 1` 16 and post-movement standing uses `VAR 1` 14; it must never enter the medical crouch state.
- Removed direct `param` references from the target coordinates of the multipatient crew/stretcher `drive_object` commands by snapshotting the target into a same-thread local; actor names and `VAR1` remain static.
- Made death terminal before object-presence checks in all three live-patient eligibility branches, so a dead casualty cannot remain classified as unavailable merely because its scene object still exists.
- Preserved the explicit HEMS/ground assignment rules after death: a dead patient is no longer eligible for a new HEMS ticket, and the existing caller must resolve the terminal no-transport or next-patient decision.
- Corrected every affected ground-operations death message so the patient identifier is formatted instead of exposing the literal `{0}` placeholder.
- Recorded the new test rule: use the user-supplied drive-object test in place, preserving its `wait_for` lifecycle guard and changing one field at a time.
- Corrected the release rules: no build or publication without explicit authorization; main releases use the next integer and trial releases the next decimal suffix.

### Still to complete in source before the next build

- Apply the local-vs-param comparison to the original `drive-object-param-test.json`, preserving its objective, `wait_for`, reset and result controls. Do not use the discarded replacement test; the production source is already protected from `param` in `name` and `VAR1`.
- Validate the HEMS movement fix in the simulator: correct speed profile, no stop-on-distance watchdog, correct arrival at each patient, and no return to the first patient before the intended visit.
- Validate medical-state synchronization: HEMS actions must appear on the tablet, progress must belong to the correct patient, and the visit must finalize before the next movement.
- Validate assistant state handling for `pax3`, including standing, backpack and walking states.
- Verify in the simulator the end-of-visits transition after a death, ambustretcher creation/use/return, medic return, and release of the mission from the scene.
- Verify traffic separation from `rescue_location`, fire placement on `accident_location`, ambulance parking, and the missing fire-hose behavior.
- Keep the dispatch destination control gated by confirmed hospital selection or return-to-base state and by completed ground operations.

### Simulator checks still required

- Both ambulances: travel, arrival messages, parallel parking, patient clearance, stretcher route, loading, return and hospital departure.
- HEMS: crew movement for all patients, first failed command, actual speeds, destinations, medical actions, assistant behavior and mission completion.
- Death path: one HEMS-assigned patient reaching zero LifeScore must produce the death message, release the assignment, skip the dead patient, resolve the remaining HEMS/ground decision and never leave `HEMS_DECISION_STATE` waiting.
- Residential scenes: grill smoke only for `ID_CARD 33`; no accidental smoke for the other one-patient residential scenes.
- Traffic and fire response, including stop-distance behavior and use of the correct scene location.
- Dispatch visibility: LifeScore show/hide, additional-info controls and destination button gating.
- Snapshots: automatic/manual capture of object position, speed, destination and movement state for both ambulances and both HEMS actors.

### Delivery state

- Source changes: **in progress**.
- Generated artifact for the latest source: **not generated**.
- Release number: **not advanced**.
- Publication: **not authorized and not performed**.
- Runtime validation: **pending**.

## Recovery R1-R7 - 2026-09-15

All seven recovery items are implemented in candidate **0.997 168**. The complete static suite passes, including the existing P1-P3 integration, 582 HVAR triggers and 242 HVAR assignments, plus the new recovery and mandatory-formatting gates. The only root change is the requested release title; data semantics are unchanged. Of 79 changed macros, 55 contain only location-writer diagnostics; the other 24 include six new helpers.

HPG/MSFS validation remains **PENDING**. On 2026-09-15 the user explicitly authorized candidate 168 locally and on GitHub and deferred the named recovery and P1-P3 simulator checks. This consent authorizes an unvalidated candidate, not a simulator-success claim or validated package. The recovery matrix in RUNTIME_VALIDATION.md must be completed against the exact supplied candidate hash before claiming a validated release.

- Canonical local and repository artifact: `everywhere_all.json`.
- SHA-256: `a05c874a9a8c96125003af9d954b205df1a540e2e40be1d21a10227d0a131423`.
- The workflow verified a local-test output with identical bytes. That temporary output is removed after comparison so the repository-root file is the single official local mission.

See [recovery audit](../architecture/RECOVERY_AUDIT_2026-09-15.md) for requirement coverage and pending runtime evidence.

## Source-only P1-P3 crew and transport integration

Points 1-9 are connected in source for P1-P3: independent crew visits, completed-treatment barriers, exclusive tickets, HEMS priority, shared loading, temporary shelter, stable repeat rescue, independent deterioration and versioned save/restore. Targeted tests execute all nine patient/resource combinations, real MANUAL and CPR worker commands, interrupted-loading recovery, physiology and three save slots. The complete static suite passes. HPG/MSFS confirmation is PENDING; command tests do not prove simulator scheduling, object choreography or aircraft receipts.

This integration is retained in candidate 168 above. Follow the P1-P3 transport matrix in `RUNTIME_VALIDATION.md`. P4/P5 and authored scene graph routes remain separate implementation work.

## Previously recorded candidate

- Previous candidate: **0.997 167**, superseded by 168. Its recorded scope included location diagnostics, bounded residential road-node recovery, separate manual and automatic snapshots, and the preceding P1-P3 ambulance assessment/stretcher flow, patient-record focus controls, residential rescue-point placement, and extinguishable two-firetruck residential fire response.
- Historical artifact name: `everywhere_all.json`; the current repository-root file is candidate 168 described above.
- SHA-256: `283b21e46f4988187abe6776a7f130a029a2abaefc166f84fa2efdccf614e391`.
- Local source/artifact byte equality, semantic scope and complete static suite: PASS.
- HPG/MSFS validation of the complete 167 candidate: **PENDING - user testing in progress**.
- Packaging / validated release: NOT AUTHORIZED by a static pass or a code-sync request.

## Confirmed narrow simulator evidence

The user supplied a successful five-iteration SDK record/history probe from build 125. That confirms this primitive probe only, not the allocation service, scene choreography, crew deployment, save/reload integration, or P4/P5. Later tablet-telemetry behavior has static coverage but awaits simulator confirmation.

## Pending simulator evidence

Use the scenarios in [RUNTIME_VALIDATION.md](RUNTIME_VALIDATION.md):

- Scene deployment and crew-creation failure watchdog; unchanged NR wait behavior and logs.
- Cargo left/right closure verification in boarding, including delayed closure.
- AUTO/MANUAL visits and tablet closure only after every visit and actual ground handover; immutable report in subsequent snapshots.
- Second dispatch, stable-slot repeat rescue, saved in-progress transfers and snapshot capture/reopen.
- Existing near/far ambulance, 3/4/5 crew, hoist/skid and destination scenarios affected by the accumulated changes.
- Three-casualty medical pages: cumulative one-medic assessment, physical second-medic P2/P3 assessment, manual Patient 1/2/3 switching during an HEMS visit, and the retained ground-patient closing report.
- Residential three-casualty fire: rescue-point casualty/waypoint placement and fence, two firetruck response, and VFXA VAR 1 reduction through fire clearance.
- Fixed generic and coordinate-based base/hospital marshal behavior, including Christophorus 14; three-crew pilot appearance through every destination deboarding branch using the documented Crew VAR 1 states.

Full five-patient mission behavior is not available for sign-off yet. Its remaining implementation is listed in [MULTI_PATIENT.md](../architecture/MULTI_PATIENT.md).
