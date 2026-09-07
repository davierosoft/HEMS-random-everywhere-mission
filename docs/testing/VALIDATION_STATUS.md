# Current development validation

- Candidate: **0.997 127**, unchanged by the GitHub/workflow synchronization.
- Artifact: repository-root `everywhere_all.json`.
- SHA-256: `5fbddaa453244d688c9fa4d5df947137f577fcb591e998200e9ab19789229e66`.
- Local source/artifact byte equality, semantic scope and complete static suite: PASS.
- HPG/MSFS validation of the complete 127 candidate: **PENDING - user testing in progress**.
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

Full five-patient mission behavior is not available for sign-off yet. Its remaining implementation is listed in [MULTI_PATIENT.md](../architecture/MULTI_PATIENT.md).
