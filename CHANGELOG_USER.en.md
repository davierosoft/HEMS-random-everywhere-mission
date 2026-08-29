# HEMS Random Everywhere — User Changelog

## Scope

This is the consolidated changelog for users moving from the public July stable baseline to HEMS Random Everywhere Missions 0.997 66.

The baseline stored in starting point/everywhere_all.json identifies itself as HEMS Random Everywhere Missions 0.997 Stable. This document records final user-facing behavior only: it deliberately omits intermediate test-build corrections and fixes that were superseded during development. Update it only when there is a meaningful final change for users.

## What's New

### HEMS crew and rescue operations

- **Three-crew skid landing capability.** A three-person HEMS crew can complete skid-landed operations for one, two, or three patients. The PAX3 cabin member is the ground operator; the flow supports assessment, treatment, helicopter transport, ambulance transport, doctor transfer, and crew recovery. Test a three-crew skid mission with each transport outcome and with more than one casualty.
- **Complete heli-rescuer destination drop.** Heli-rescuers can be left at an eligible base, hospital, or user-selected hospital destination. Their later ground or hoist return follows the selected destination instead of returning them to an obsolete point. Test the DROP HELIRESCUER HERE action at each destination type, then reboard the crew.
- **Safer patient and stretcher choreography.** Ground crews, stretchers, hoist personnel, patients, and the copilot now use dedicated approach, hand-off, loading, and return sequences. This includes separate behavior for three-crew and four/five-crew operations.

### Ground services, destinations, and dispatch

- **Ambulance pre-visit.** In eligible single-patient calls, an ambulance and police can begin patient handling before HEMS lands while the medical crew remains available for the HEMS hand-off. Test an early-arriving ambulance and police at a stable patient scene.
- **Secondary ambulance rescue.** A second ambulance can assess, load, and transport an additional eligible patient after its own crew has completed the required visit. Test a multi-casualty scene and confirm each ambulance handles its assigned patient.
- **Distance-aware ground transport.** Ambulance loading and police crew transfer now account for the real distance from the scene or landing spot. Distant assets retain a safe walking or transport alternative instead of causing unrealistic transfers.
- **Custom landing-zone police support.** At a distant custom landing spot, police can preposition, carry crew to the landing zone when appropriate, wait for the helicopter, and return the crew to the scene. Test both a nearby and a distant custom landing spot.
- **Dispatch cancellation.** When available ground resources can safely manage the incident, HEMS can be cancelled after a realistic delay. The cancellation threshold is configurable in Settings, cancellation is counted in statistics, and the mission proceeds cleanly to its return flow.
- **More resilient routing and destination handling.** FMS direct-to, manual route lines, user-selected destinations, hospital generation, and the dispatch-map preview all validate their destination before use. Test a manual destination, a custom hospital, and a rapid Next Dispatch change.
- **Improved manual save and reload behavior.** The three manual save slots preserve the mission identity, patient/pathology data, scene coordinates, SAR state, VFX state, and rescue-service availability. Restored standard missions regenerate their authored scene metadata instead of using stale values.

### Marshal, scene, and patient simulation

- **Marshal guidance system.** Scene, base, hospital, and custom landing operations can use a marshal for approach, hover, vertical correction, landing, engine-start, and departure guidance. The same controller also covers the heli-rescuer landing reference. Test an approach from beyond 150 m, a final landing, shutdown/restart, and departure toward a route destination.
- **Pathology-driven patient physiology.** The selected diagnosis controls the initial range for oxygen saturation, heart rate, blood pressure, respiratory rate, temperature, GCS, consciousness, LifeScore, and patient code. The current mission contains diagnosis-specific profiles rather than one generic vital-sign preset.
- **Timed medical procedures.** A patient visit can contain up to six ordered automatic procedures. Their durations are scaled to the visit and their effect on the patient can improve, fail to improve, or worsen the clinical state within safe scenario limits. Test a full visit and watch each procedure affect the medical page.
- **CPR and mCPR simulation.** CPR has dedicated request, active, recovery, unsuccessful, and manual-stop outcomes. With the persistent mechanical-CPR option enabled, it can continue in flight; without it, it waits for a landing. Test both settings and the STOP CPR control after a prolonged attempt.
- **Privacy screens for suitable outdoor calls.** Ambulance and police privacy screens are available for eligible outdoor scenes while indoor locations remain protected from inappropriate fence placement.

## UI Changes

- **Medical page reorganized around the assessment.** The page now separates the initial assessment, patient code, live vital signs, GCS, consciousness, treatment sequence, gray reference legends, and LifeScore. Before the first assessment completes, it clearly says that observations are pending rather than showing false placeholder values.
- **Expanded clinical observations.** The tablet shows SpO2, heart rate, blood pressure, respiratory rate, temperature, GCS eye/verbal/motor components, total GCS when assessable, consciousness, and patient code. Critical readings use clear colour cues. A component that cannot be tested is displayed as NT rather than as a misleading numeric value.
- **Readable treatment progress.** The active procedure is yellow and marked IN PROGRESS; completed procedures are green and remain visible on their own lines, newest first. When the visit finishes, every completed procedure stays visible in green.
- **On-site operation progress.** Mission Dispatch shows a temporary green 0–100 progress bar and stage text only while the ground operation is running. It advances through deployment, assessment/treatment, CPR, loading, crew return, and completion; it hides after the operation is complete. A stalled-operation warning appears without replacing the active rescue instruction.
- **Improved operational messaging.** Mission Dispatch and RescueTrack now distinguish a patient waiting for HEMS, a patient transferred to an ambulance, a cancelled HEMS dispatch, police moving to a custom landing zone, an additional deceased person, no active mission, and a route problem. Error reporting uses a dedicated visible indicator instead of overwriting normal rescue messages.
- **Cleaner map and marker feedback.** Next Dispatch refreshes both the accident location and the marker. Old dispatch icons are cleared, custom marshal locations have their own icon, and custom hospital markers no longer display an opaque white background.
- **Persistent audio preferences.** Crew and checklist volume choices survive normal dispatch reloads. The corresponding in-mission controls are synchronised at mission startup instead of returning unexpectedly to a default value.
- **Clearer statistics and status feedback.** Cancellation statistics, single-count casualty reporting, vehicle availability, and final mission information have been cleaned up so the user sees one consistent operational state.

## Fixes

### Flight and marshal guidance

- **Stable marshal direction calls.** Resolved the rapid left/right alternation when the helicopter crossed the centreline by a very small amount. Outside the landing area, the active lateral direction is held through a fixed angular buffer; inside the landing area, vertical and landing guidance remains in control rather than lateral commands.
- **Marshal activation and wind behavior.** Resolved cases where a marshal appeared but stayed idle, followed the wind near the landing point, used the helicopter heading instead of its own facing direction, or stopped working after a temporary touchdown. Guidance now has dedicated approach and departure states, a landing authorization gate, and a safe wind lock.
- **Restart and departure cues.** Resolved stale or repeated marshal signals during engine start, prime-pump use, shutdown, take-off, and route departure. The marshal now returns to idle when appropriate and issues one stable departure instruction.
- **Custom landing-reference placement.** Resolved incorrect marshal and VFX placement after a rejected or replaced custom landing spot. New placement waits for the accepted, current location.

### Crew, patient, and vehicle flow

- **Door-safe boarding.** Resolved crew members boarding through a closed side door. The relevant passenger door now opens before the operator enters, waits for the hand-off, then closes only when no further crew movement needs it.
- **Correct stretcher paths.** Resolved skipped approach points, unnecessary crossings in front of the helicopter, and incorrect final positions during ambulance-stretcher work. Far-ambulance operations now retain their intermediate approach, observation, return, and cargo-door sequence.
- **Correct crew animation and seating states.** Resolved incorrect walking, standing, pilot, copilot, stretcher, and hoist animation states in three-crew loading, unloading, skid, and reboarding branches.
- **Reliable emergency-vehicle movement.** Resolved premature arrival flags, duplicate reversals, unsafe parking, missing patient clearance, failed final stops, and stalled rescue-vehicle drives. Ambulance, police, and fire-engine availability is now published after the actual parking/arrival stage.
- **Correct additional-patient handling.** Resolved secondary-ambulance races and departures before its own patient visit/load had finished. The second ambulance now waits for its required conditions and destination.

### Scene, data, and mission stability

- **Indoor privacy eligibility.** Resolved privacy fences appearing at indoor calls, including indoor cardiovascular incidents. The decision now follows the actual selected scene query, including random mission selection.
- **Consistent pathology and scene selection.** Resolved incompatible pathology, fire/VFX, sex, Halloween, and missing-data combinations that could cause repeated selection attempts or a mismatched injured person. Fallbacks now produce a valid, coherent call instead of a blocked generation flow.
- **Clinical consistency.** Resolved zero or impossible vital signs for living patients, reversed blood pressure, misleading GCS totals, inappropriate unconscious-patient presentation, and clinical values appearing before assessment. Patient deterioration and treatment effects now use the intended timing gates.
- **CPR ownership and display.** Resolved competing CPR loops, incorrect provider selection, misleading recovery conditions, and compression information disappearing after the page was reopened.
- **Mission-system command failures.** Resolved several malformed or unsupported condition structures, including the engine-failure command error and invalid route/location references. These fixes prevent tablet errors, stuck objectives, and failed dispatch actions.
- **Dispatch and reload consistency.** Resolved stale custom/SAR metadata, delayed pathology persistence, duplicate victim messages, stale map icons, repeated refuelling starts, and settings being reset during a normal subsequent dispatch.
