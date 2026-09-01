# HPG/MSFS runtime validation

These are maintained manual scenarios whose object choreography, UI timing, simulator assets, or HPG execution cannot be proven by static validators. Run only the sections affected by a change and record the result with the release.

## CARLS direction finder

1. Open DF on a remembered preset, press `1` once, and verify ESC plus `EDT: 1_#.###` appear immediately.
2. Leave a partial digit sequence for at least five seconds. Editing must cancel and the prior frequency/source/modulation must return.
3. Enter `121500` without pauses. Verify intermediate templates, timeout confirmation, and immediate ENT confirmation as MAN 121.500 AM.
4. Enter illegal prefix/grid values. They must show ILLEGAL, never tune, and retain the accepted channel after timeout.
5. Test IAD/MAD/MAR, UHF AM/FM, RTN/reopen persistence, normal/crash ELT, ambulance beacon, and doctor-pick flows.
6. Confirm the tablet title matches the first `CHANGELOG.en.md` release heading.

## Crew LifeScore and emergency recovery

1. Expose one ground operator to VFX/flare while another remains outside the radius. Only the exposed member loses LifeScore; the first loss reaches tablet, Dispatch, and RescueTrack.
2. Reduce one member from 11 to 10. The mission fails as `CREW_CRITICAL`, living operators board, and routing changes to the nearest hospital.
3. At the hospital, living operators use the correct door, enter the building, and the end page shows failure/shift termination without success text.
4. Force zero on each ground role and on cable-only hoist. The deceased object name remains as the packaged stretcher casualty while survivors return aboard.
5. Exercise all historical hoist-fatal branches. Each fails once without a success page or stalled thread.
6. Suppress the hospital query for at least 45 seconds. The flow announces fallback, routes to base, and completes deboarding.

## Debug and persistence

1. Open all Debug views before dispatch and during representative mission phases with and without ambulance, police, heli-rescuer, marshal, multiple patients, route failure, and query failure.
2. Capture a snapshot, close/reopen Debug, reload the mission, and accept a second dispatch. The record stays frozen until Capture; Clear remains cleared after reload.
3. Compare INVENTORY with changed state machines and confirm new or renamed state is visible in the appropriate operational view.

## Multi-patient, ambulance, and mission presets

1. Run near/far ambulance transfer with 3-, 4-, and 5-person crews for `ambulance`, `ambudoc`, and `us`; ambulance-owned movement must not wait on unrelated HEMS state.
2. In MANUAL mode with 1–3 casualties, verify the active-patient mutex and action ownership. In AUTO, the page follows the patient under assessment.
3. Let ambulance1 assess a three-patient scene; every initial assessment precedes continuation. Let ambulance2 transport an eligible P2/P3 and verify frozen report plus HEMS exclusion.
4. Edit two independent presets across both list pages, close/reopen, and reload. Test single toggles, partial-category confirmation, full-category disable, and ALL MISSIONS without cross-preset rewrites.

## Release record

Record mission build, simulator/HPG version, scenario sections run, result, screenshots/log location, and any intentionally deferred scenario. Do not convert a static validator result into runtime PASS.
