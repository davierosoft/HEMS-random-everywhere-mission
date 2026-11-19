# Runtime test matrix (issue 19)

Every scenario of the handoff matrix, the static test that guards it in the repository
and the simulator status. Static PASS never proves simulator behaviour: the column
"Simulator" stays `pending` until a run in MSFS/HOC is recorded below the table
(mission version, schema, crew/vehicles, pass/fail, failing step, debug variables, log).

| # | Scenario | Static guard | Simulator |
|---|----------|--------------|-----------|
| 1 | three-crew skid, one and two heli-rescuers | test-hr-skid-choreography, test-heli-rescuer-and-ambulance, test-heli-rescuer-gate | pending |
| 2 | crew 3, 4, 5 | test-crew-patient-visits, test-assistant-crouch, test-ground-operations-recovery | pending |
| 3 | branches us, ambulance, ambudoc | test-heli-rescuer-and-ambulance, test-live-patient-transport | pending |
| 4 | no ambulance, three victims | test-ambulance-availability-contract, test-multipatient-registry | pending |
| 5 | heli-rescuer drop at base, fixed hospital, user hospital | test-destination-modal-text, test-custom-hospital-ambulance, test-hr-scene-block | pending |
| 6 | custom landing spot, police present or arriving | test-police-crew-transport, test-scene-spacing | pending |
| 7 | boarding, hiding, restore of hoist_crew, pax3, policeman2 | test-ground-ops-diagnostics, test-hoist-patient-loading, test-snapshot-ground-guards | pending |
| 8 | every combination of rescue vehicles | test-ambulance-shuttle, test-ambulance-wait-policy, test-service-truck | pending |
| 9 | dispatch cancel above and below threshold | test-dispatch-archive, test-second-dispatch-flag | pending |
| 10 | zero active accidents, poordead, missing optional objects | test-condition-missions, test-civilian-object-safety, test-patient-clinical-integrity | pending |
| 11 | repeated dispatch map refresh | test-query-nonblocking, test-stuck-help-page | pending |
| 12 | refuel slider and debounce | test-fuel-hose-watch, test-voice-site-wind-fuel | pending |
| 13 | autosave and slots 1-3 save and reload | test-preset-save-fallback, test-recovery-regressions, test-locref-profile-migration | pending |
| 14 | saved and reloaded SAR mission | test-sar-flag, test-sar-hints-and-missions | pending |

Acceptance criteria and their guard: arrival flags only after final parking
(test-hoist-return, test-end-of-mission-flow); `HOLDHOISTED` blocks premature reboarding
(test-hoist-cable, test-hoist-position-guidance); one refuel operation after repeated slider changes
(test-fuel-hose-watch); persistent slots without cross contamination (test-preset-save-fallback,
test-snapshot-ground-guards).

## Recording a simulator run

Copy this block per scenario below and fill it in:

    scenario: <number>   mission version: <170.xx>   schema: <persistent version>
    crew / vehicles: <...>   result: pass | fail   failing step: <...>
    debug variables: <...>   evidence: <screenshot or log>   issue: <number>

## Runs

None recorded yet. The `Simulator` column changes only from an entry here.
