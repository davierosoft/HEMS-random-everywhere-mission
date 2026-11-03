# Ambulance shuttle (3, 4 and 5 crew)

Report of Daikan (2026-11-03): helicopter landed 288 m from the patient, the ambulance was already on the scene, and the crew still walked back to the helicopter to fetch the stretcher. In the live patient registry `ambustretcher full` returns before the AMBUFAR block, so the original mission branch that sent the ambulance for the crew never ran.

## Decision (`ambulance shuttle decide`)
Called once by `3 crew ground ops` and `4 or 5 crew ground ops` at the start of the stretcher branch. `ambu_shuttle` is 1 only when all hold: `patient_live_mode` 1, `AMBU_AVAIL` 1, `ambulance1` exists and reaches the patient, the helicopter is on the ground, and it is farther from the patient than `ambulance_return_crew_min_dist`. Otherwise nothing changes (crew walks, original code is the `else` branch of every leg).

## Legs (`ambulance crew shuttle`)
- 3 crew: crew to helicopter, back to patient with the empty stretcher, then crew and patient to the helicopter.
- 4 or 5 crew: the ambulance goes to the helicopter at once (decision), then back to the patient, then to the helicopter with crew and patient.
- Riders walk to the ambulance (hidden, VAR 1 -1), step out behind it. The pax3 walk to the accident points waits for the last leg.

## Never stalls
`ambulance1_shuttle_hold` keeps `ambulance1 stand down` waiting; `ambulance shuttle release` clears it at the helicopter and a 1500 s watchdog clears it anyway. Each leg moves the ambulance to the destination if the drive reports no end. Every step writes a `ground ops checkpoint` row (`shuttle_*`).

Test: `tools/test-ambulance-shuttle.js`.
