# Current development validation

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
