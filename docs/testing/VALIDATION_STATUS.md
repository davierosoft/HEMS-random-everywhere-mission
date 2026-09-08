# Current development validation

- Candidate: **0.997 142**, local static candidate. The GitHub development checkpoint after this supplied build also contains the consolidated P1-P3 ambulance assessment/stretcher flow, patient-record focus controls, residential rescue-point placement, and extinguishable two-firetruck residential fire response.
- Artifact: repository-root `everywhere_all.json`.
- SHA-256: `f34c12abc6972b663f88247fd67f6c5ad4885a59f56297a41db9315178deeae3`.
- Local source/artifact byte equality, semantic scope and complete static suite: PASS.
- HPG/MSFS validation of the complete 142 candidate: **PENDING - user testing in progress**.
- Packaging / validated release: NOT AUTHORIZED by a static pass or a code-sync request.

## Confirmed narrow simulator evidence

The user supplied a successful five-iteration SDK record/history probe from build 125. That confirms this primitive probe only, not the allocation service, scene choreography, crew deployment, save/reload integration, or P4/P5. Later tablet-telemetry behavior has static coverage but awaits simulator confirmation.

## Pending simulator evidence

Use the scenarios in [RUNTIME_VALIDATION.md](RUNTIME_VALIDATION.md):

- Scene deployment and crew-creation failure watchdog; unchanged NR wait behavior and logs.
- Cargo left/right closure verification in boarding, including delayed closure.
- AUTO/MANUAL visits and tablet closure only after every visit and actual ground handover; immutable report in subsequent snapshots.
- Second dispatch and legacy repeat-rescue handling; snapshot capture/reopen.
- Existing near/far ambulance, 3/4/5 crew, hoist/skid and destination scenarios affected by the accumulated changes.
- Three-casualty medical pages: cumulative one-medic assessment, physical second-medic P2/P3 assessment, manual Patient 1/2/3 switching during an HEMS visit, and the retained ground-patient closing report.
- Residential three-casualty fire: rescue-point casualty/waypoint placement and fence, two firetruck response, and VFXA VAR 1 reduction through fire clearance.
- Fixed generic and coordinate-based base/hospital marshal behavior, including Christophorus 14; three-crew pilot appearance through every destination deboarding branch using the documented Crew VAR 1 states.

Full five-patient mission behavior is not available for sign-off yet. Its remaining implementation is listed in [MULTI_PATIENT.md](../architecture/MULTI_PATIENT.md).
