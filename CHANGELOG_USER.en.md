# HEMS Random Everywhere — User Changelog

## Scope

This is the consolidated user changelog for the public July stable baseline through HEMS Random Everywhere Missions 0.997 75.

It describes the final behavior that a user receives after upgrading from the public build. It does not list temporary test-build regressions or corrections that were superseded before this release. Update this file only for meaningful finished user-facing changes.

## What’s New

### HEMS crew, patients, and rescue operations

- **Three-crew skid operations.** A three-person HEMS crew can complete skid-landed work for one, two, or three patients. PAX3 acts as the ground operator, with dedicated sequences for assessment, treatment, helicopter transport, ambulance handover, doctor transfer, recovery, and reboarding.
- **Complete heli-rescuer destination handling.** A heli-rescuer can be dropped at a compatible base, hospital, or user-selected destination and later recovered using the selected point. The destination is retained by the subsequent ground/hoist flow instead of reverting to an obsolete reference.
- **Door-safe and role-safe choreography.** Crew boarding, stretchers, patients, hoist personnel, pilots, and copilots use dedicated approach, transfer, and seating sequences. Passenger doors open before the related crew member enters and close only when the side no longer has a pending movement.
- **Better far-ambulance stretcher work.** When the ambulance is distant, the hoist/ground operator now follows the complete intermediate approach, observation, return, and cargo-door sequence rather than skipping directly to the final point.
- **Ambulance work before HEMS arrival.** In eligible single-patient scenes, an early ambulance can complete the first assessment step and sometimes one basic treatment step before the helicopter arrives. HEMS receives an on-screen clinical report, credits the completed work, and continues from the next required action.
- **Second-ambulance capability.** In suitable multi-casualty calls, a secondary ambulance can assess, load, and transport its assigned patient after its own visit is complete.
- **Pathology-driven patient state.** Diagnosis, age/scene profile, and controlled random variation shape Life Score, consciousness, oxygen saturation, pulse, blood pressure, respiratory rate, temperature, GCS, and emergency code. The patient is no longer generated from a single generic vital-sign preset.
- **Automatic clinical timeline.** A visit may include up to six ordered procedures. Each can improve, leave unchanged, or occasionally worsen the patient within the diagnosis-specific model; the displayed vital signs update as the visit develops.
- **Manual treatment model for patient 1.** Patient 1 can now be handled in staged manual mode. Each phase presents four concise procedures: one appropriate choice and three randomized unsuitable choices. Correct and incorrect choices have persistent clinical consequences; the visit ends only after the clinician completes the sequence and chooses helicopter or, when present, ambulance transport. Patients 2 and 3 remain automatic.
- **CPR and mCPR simulation.** CPR includes request, active, recovery, unsuccessful, and manual-stop outcomes. With mechanical CPR enabled, it can continue in flight; without it, it waits for a landing.

### Dispatch, ground services, and scene generation

- **Smarter ground-service cooperation.** Ambulance, police, fire, privacy screening, patient loading, and crew transfer use real-distance-aware alternatives rather than one fixed choreography. Distant assets retain a safe walking/transport path.
- **Custom landing-zone support.** Police can preposition to a distant user-selected landing zone, carry crew when appropriate, wait for the helicopter, and return the crew toward the scene.
- **Configurable HEMS cancellation.** When available ground services can safely manage the incident, HEMS may be cancelled after a realistic delay. This is recorded in statistics and moves cleanly into the return flow.
- **More reliable route and destination handling.** FMS direct-to, manual route lines, custom destinations, hospital generation, and dispatch-map previews validate their destination before use.
- **Unique scene people and casualties.** Public/crowd models are selected without duplicates while unused compatible models remain. Second and third casualties also avoid duplicating an eligible patient model unless the scene constraint leaves no alternative.
- **Residential road scenes load more efficiently.** The mission first looks for usable roads near the incident and expands the search once only when necessary. The resulting road scene and normal fallback behavior are preserved while unnecessary work is removed.
- **Persistent base marshal recovery.** An enabled start-base marshal retains its exact place and target through a normal return and a second-dispatch reload. If a different return base is selected, the old snapshot is discarded and a wind-relative replacement is used at the new base.

### Guidance, audio, and operational feedback

- **Expanded marshal guidance.** Scene, base, hospital, custom landing, and heli-rescuer references can provide approach, hover, vertical correction, landing, restart, and departure guidance.
- **Stable distant lateral guidance.** Outside the landing area, left/right calls use a fixed angular buffer around the marshal centreline. Inside the landing area, lateral calls yield to hover, descent, landing, and climb guidance.
- **Restart-aware marshal behavior.** After a real landing and a 30-second low-rotor confirmation, the marshal can arm departure guidance even if an idle restart or CTRL+E skips the usual early rotor-pump phase. Hover and departure-direction signals still appear after lift-off.
- **Central RescueTrack alerts.** Every new RescueTrack message after the initial dispatch receives one audio alert from the currently selected voice package. The original new-dispatch ringtone remains a single distinct sound, with no duplicate first alert.
- **Clearer dispatch and RescueTrack messages.** The tablet distinguishes waiting-for-HEMS, ambulance transfer, cancellation, police movement to a custom LZ, additional deceased persons, no active mission, and route problems. Errors have their own visible indicator instead of replacing normal operational text.

## UI Changes and Controls

### Medical page

- The Medical page is now a vertical **Patient Clinical Record** designed for the tablet single-column renderer.
- The initial dispatch/scene information is followed by an ambulance-handover section only when an eligible ambulance has actually produced a report. No empty or null ambulance report is shown.
- Before the first completed assessment, the page explicitly shows that observations are pending. GCS, emergency code, Life Score, and vital signs appear when the assessment is clinically available, including ambulance-credited work.
- GCS and Code share a compact single line with a protected visual gap; numeric and Not Testable combinations are supported without allowing Code to wrap onto a new line.
- Medical procedures are separate lines: the current procedure is yellow, prior completed procedures are green, newest first, and all rows remain green after completion. The old concatenated // display and dashed text separators are gone.
- The gray GCS/Code reference legends and the Life Score label/slider are placed after the clinical action area to keep the active record readable.
- Manual patient-1 mode adds concise procedure buttons, a visible result for each choice, COMPLETE VISIT, and an explicit transport decision. AMBULANCE appears only when an ambulance is present.
- CPR controls include START CPR and, after the appropriate prolonged phase, STOP CPR.

### Settings → Most Used / clinical controls

- **P1 Manual Medical Mode** is persistent. AUTOMATIC is the default and preserves the timed clinical flow; MANUAL enables the staged treatment interaction for patient 1 only.
- **Visit-time presets** ULTRAFAST, FAST, MEDIUM, and SLOW remain the single timing control. In manual mode they define the duration of each selected procedure instead of creating a second timing setting.
- **mCPR Onboard** controls whether mechanical CPR is available for in-flight continuation or must wait for landing.
- **HEMS cancellation threshold** controls the configured point at which a ground-service-managed call may cancel HEMS, where that setting is available for the mission profile.

### Settings → Marshal and ground-operation controls

- **START BASE MARSHAL** enables the optional marshal at the original base. Its position now survives a return and reload.
- **DEST. HOSPITAL MARSHAL** controls the optional destination-hospital marshal.
- Existing marshal operations now also support accepted custom landing references, with their own map feedback and stable approach/departure behavior.

### Settings → Avionics Options

- **Tablet 5G data connection** is persistent and defaults to NO. When enabled, tablet data remains available even outside Wi-Fi range or with CARLS radio disconnected; it does not falsely report CARLS as connected.
- The option is placed with the CARLS radio self-test/autoconnect controls so data and radio behavior can be set together.

### Map, dispatch, and return screens

- Map selection flows expose explicit Accept and Reject/Cancel actions for custom locations, landing spots, hospitals, return bases, midpoints, heli-rescuer positions, and technical marshals where applicable.
- Rejecting a landing-spot proposal now preserves the current accepted landing marker, ring, and route. Only Accept recalculates the route for the new point.
- Mission Dispatch shows a temporary 0–100 rescue-operation progress bar and stage text during active ground work. It hides after the operation ends, while a stalled-operation warning does not overwrite the active instruction.
- Cleaner map feedback refreshes Next Dispatch markers, clears obsolete dispatch icons, gives custom marshal points their own icon, and removes the opaque background from custom hospital markers.
- The post-return statistics/dispatch screen now makes the on-duty state clear and offers **END SHIFT** as the explicit terminal control. Otherwise the crew can remain available for the next dispatch.

### Persistent preferences and status feedback

- Crew and checklist audio volumes survive a normal dispatch reload and are synchronized at startup.
- Cancellation statistics, casualty reporting, vehicle availability, and final mission status use one coherent operational state.

## Fixes

### Flight, map, and marshal guidance

- Resolved rapid left/right marshal alternation when the helicopter crossed the approach centreline by a very small amount.
- Resolved marshal states that could remain idle, follow wind near a landing point, use the helicopter heading, or stop working after a temporary touchdown.
- Resolved stale/repeated cues during engine start, prime-pump use, shutdown, idle restart, take-off, and route departure.
- Resolved incorrect custom landing-reference placement after a rejected or replaced landing spot. A rejected proposal no longer rebuilds the route or removes the active landing reference.

### Crew, patient, and ground-service flow

- Resolved crew boarding through a closed side door and premature closure while another crew member still needed that side.
- Resolved skipped stretcher approach points, unnecessary crossings in front of the helicopter, and incorrect ambulance-stretcher final positions.
- Resolved several walking, standing, pilot, copilot, stretcher, hoist, loading, unloading, skid, and reboarding animation/state mismatches.
- Resolved premature emergency-vehicle arrival, duplicate reversals, unsafe parking, missing clearance, failed final stops, and stalled service drives.
- Resolved secondary-ambulance races and departures before the assigned patient visit/load had completed.

### Scene, clinical data, and mission stability

- Resolved privacy fences appearing at indoor calls, including indoor cardiovascular incidents. Eligibility now follows the actual scene query.
- Resolved incompatible pathology, scene, sex/age, motorcycle, fire/VFX, and seasonal combinations that could produce a mismatched casualty or repeated scene-generation attempts.
- Resolved repeated public/casualty models when unused compatible alternatives existed.
- Resolved zero/impossible vital signs for living patients, reversed blood pressure, misleading GCS totals, inappropriate unconscious-patient presentation, and observations appearing before assessment.
- Resolved competing CPR loops, incorrect provider selection, misleading recovery conditions, and compression information disappearing when the page reopened.
- Resolved malformed/unsupported tablet condition structures and invalid route/location references that could cause command errors, stuck objectives, or failed dispatch actions.
- Resolved stale custom/SAR metadata, delayed pathology persistence, duplicate victim messages, stale map icons, repeated refuelling starts, and settings unexpectedly resetting on a later dispatch.
