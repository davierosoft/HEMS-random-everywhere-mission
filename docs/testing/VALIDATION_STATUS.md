# Current development validation

## Source-only P1-P3 crew and transport integration

Points 1-9 are connected in source for P1-P3: independent crew visits, completed-treatment barriers, exclusive tickets, HEMS priority, shared loading, temporary shelter, stable repeat rescue, independent deterioration and versioned save/restore. Targeted tests execute all nine patient/resource combinations, real MANUAL and CPR worker commands, interrupted-loading recovery, physiology and three save slots. The complete static suite passes. HPG/MSFS confirmation is PENDING; command tests do not prove simulator scheduling, object choreography or aircraft receipts.

No newly numbered delivery, publication or simulator sign-off was produced. The repository artifact is an internal draft with its pre-existing version unchanged. Follow the P1-P3 transport matrix in `RUNTIME_VALIDATION.md`. P4/P5 and authored scene graph routes remain separate implementation work.

## Previously recorded candidate

- Candidate: **0.997 155**, local static candidate. This is the latest supplied local-test copy and includes the default landing-spot circle/icon regeneration fix plus the consolidated P1-P3 ambulance assessment/stretcher flow, patient-record focus controls, residential rescue-point placement, and extinguishable two-firetruck residential fire response.
- Historical artifact name: `everywhere_all.json`; the current repository-root file is the internal draft described above.
- SHA-256: `f605e3b54cb78400fd2e460b37c8dbb4531c3c181df95ebd90b7669a34d6c20f`.
- Local source/artifact byte equality, semantic scope and complete static suite: PASS.
- HPG/MSFS validation of the complete 155 candidate: **PENDING - user testing in progress**.
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
