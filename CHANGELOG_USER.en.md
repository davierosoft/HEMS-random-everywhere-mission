# HEMS Random Everywhere — User Changelog

## Scope

This is the consolidated user changelog for the public July stable baseline through HEMS Random Everywhere Missions 0.997 95.

It describes the final behavior that a user receives after upgrading from the public build. It does not list temporary test-build regressions or corrections that were superseded before this release. Update this file only for meaningful finished user-facing changes.

Release coverage after 0.997 91: **0.997 92** adds Debug Center and saved snapshots; **0.997 93** adds crew-safety, marker, persistence, and Settings changes; **0.997 94–95** complete the CARLS DF editor refresh and entry behavior.

## Development changes through 0.997 127 - simulator validation pending

This section accounts for technical builds 96-127 without advancing the public stable coverage above. GitHub code synchronization is not a validated simulator release.

- **DF stations and tuning (96-98, 103, 105).** Store up to 15 named frequency/location stations, enable individual object stations, and synchronize CARLS tuning with the selected bearing. The final form uses NAME, FREQUENCY and LAT/LON with SAVE validation. Saved tuning is restored after startup/profile initialization.
- **Emergency beacons (99, 115).** PLB support follows eligible outdoor casualties at 121.500 AM; ELT, PLB and doctor-pick ambulance beacons transmit continuously with varying effective range. Dynamic beacon targets and Debug source/range reporting are checked.
- **Test Tracker (100-101, 107, 110).** Persistent, mission-ordered test instructions show one current status, support RESET, and retain failed-test comments. Multi-option tests list the options still to try; code-path completion remains distinct from a successful simulator test.
- **Aircraft profiles and saved time (102, 116-117).** Custom profile edits save immediately; STORE PRESET ON FILE keeps an independent backup and restores it through the selected static slot. Mission-list links toggle consistently. Local save date/time and profile-reload checks were corrected.
- **Medical/ground flow (104, 106-117 where applicable).** Destination confirmation precedes patient loading and updates FPL 8; ambulance observations become available after assessment at the patient. The doctor completes the return approach before cargo closure. AUTO clinician actions can start at the patient while the helicopter is airborne; the second police officer returns to the scene.
- **Debug snapshots (108, 110, 112, 115).** Snapshots preserve ordered mission, medical, ground, guidance and inventory sections, mission/build identity and local date/time separately from the mission timer. Technical marshal creation opens the map at the aircraft.
- **Default RTC and CICERS (109, 111, 113-114).** RTC title selection releases its runtime lock. Failed CICERS checks restore the previous manual provider, overlapping pings are serialized, and a persistent opt-out controls automatic CICERS OSM activation.
- **Boarding and blocked-crew diagnostics (118-122).** Rear cargo door closure is verified with bounded retries using the aircraft-specific LVAR prefix. Crew creation records launch/success/failure and shows a creation error instead of silently proceeding. NR waits log waiting/passed without changing the rotor threshold. Build 122 is internal count maintenance, not another feature.
- **Registry diagnostics (123-125).** SDK checks and registry snapshots avoid the macro-context renderer failure; five repeatable probes save individual results. The user confirmed that probe passes. The registry, generic physiology and waypoint helpers are scaffolding, not completed five-patient scene/transport support.
- **Medical tablet handover (126-127).** Only after all visits finish and ground handover is confirmed does a ground patient's medical page become a transport summary. Open manual review/confirmation keeps medical details visible. The helicopter patient retains its full page; Debug snapshots retain the closing report. The active scene limit remains three, and legacy repeat rescue conservatively keeps details visible.

Superseded intermediate fixes are consolidated above. Full interchangeable P4/P5 scenes, clinical simulation and transport remain unfinished; see the remaining-work list in the multi-patient architecture document.

## What’s New in the public baseline

### HEMS crew, patients, and rescue operations

- **Three-crew skid operations.** A three-person HEMS crew can complete skid-landed work for one, two, or three patients. PAX3 acts as the ground operator, with dedicated sequences for assessment, treatment, helicopter transport, ambulance handover, doctor transfer, recovery, and reboarding.
- **Crew safety with operational consequences.** Smoke/fire exposure is calculated only for the crew member actually at risk, while hoist penalties apply only to the active hoist operator. Tablet, Dispatch, and RescueTrack provide staged warnings. A crew LifeScore of 10 or less fails the mission and diverts survivors to the nearest hospital; a zero score records a fatality and ends the shift.
- **Complete heli-rescuer destination handling.** A heli-rescuer can be dropped at a compatible base, hospital, or user-selected destination and later recovered using the selected point. The destination is retained by the subsequent ground/hoist flow instead of reverting to an obsolete reference.
- **Door-safe and role-safe choreography.** Crew boarding, stretchers, patients, hoist personnel, pilots, and copilots use dedicated approach, transfer, and seating sequences. Passenger doors open before the related crew member enters and close only when the side no longer has a pending movement.
- **Better far-ambulance stretcher work.** When the ambulance is distant, the hoist/ground operator now follows the complete intermediate approach, observation, return, and cargo-door sequence rather than skipping directly to the final point.
- **Ambulance work before HEMS arrival.** In multi-patient scenes, an early ambulance now performs the initial assessment of every available casualty before continuing treatment. Patients whose condition does not require mandatory HEMS intervention may then be treated and prepared for ground transport with realistic staged timings. HEMS receives the completed clinical work and continues from the correct point.
- **Second-ambulance capability.** In suitable multi-casualty calls, a secondary ambulance can load and transport only a patient already assessed and cleared for ground care. The transported casualty is removed from the active scene while their final clinical report remains available.
- **Pathology-driven patient state.** Diagnosis, age/scene profile, and controlled random variation shape Life Score, consciousness, oxygen saturation, pulse, blood pressure, respiratory rate, temperature, GCS, and emergency code. The patient is no longer generated from a single generic vital-sign preset.
- **Automatic clinical timeline.** A visit may include up to six ordered procedures. Each can improve, leave unchanged, or occasionally worsen the patient within the diagnosis-specific model; the displayed vital signs update as the visit develops.
- **Manual treatment for every patient.** In staged manual mode, every casualty present (currently up to three) can be assessed and treated from the same modular workflow. Each phase presents four concise procedures: one appropriate choice and three randomized unsuitable choices. Choices have persistent clinical consequences; only the patient currently under care exposes treatment, completion, and transport actions.
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
- **Stable distant lateral guidance.** Outside the landing area, both marshal controllers use the same fixed ±12° neutral cone across the front-approach centreline. Inside it, the marshal gives idle guidance rather than retaining a left/right call. In the outer half of the approach it first protects a 70 ft minimum radio height; the normal descent profile resumes only in the inner half. Inside the landing area, lateral calls yield to hover, descent, landing, and climb guidance.
- **Restart-aware marshal behavior.** After a real landing and a 30-second low-rotor confirmation, the marshal can arm departure guidance even if an idle restart or CTRL+E skips the usual early rotor-pump phase. Hover and departure-direction signals still appear after lift-off.
- **Central RescueTrack alerts.** Every new RescueTrack message after the initial dispatch receives one audio alert from the currently selected voice package. The original new-dispatch ringtone remains a single distinct sound, with no duplicate first alert.
- **Clearer dispatch and RescueTrack messages.** The tablet distinguishes waiting-for-HEMS, ambulance transfer, cancellation, police movement to a custom LZ, additional deceased persons, no active mission, and route problems. Errors have their own visible indicator instead of replacing normal operational text.

### CARLS navigation and flight preparation

- **CARLS Direction Finder.** The CARLS primary page now includes a dedicated DF page. It can display and tune a valid aviation frequency, show the active source, frequency, and modulation, and provide a bearing only for an active mission beacon.
- **Manual or automatic DF tuning.** Avionics Options adds persistent **DF AUTO / MANUAL TUNING**. AUTO follows the active ambulance, SAR beacon, or crash ELT; MANUAL leaves tuning to the pilot and enables the bearing only after the matching mission frequency is selected.
- **Aviation-band tuning discipline.** The DF accepts only supported aviation, maritime, and UHF bands with 25 kHz spacing. Mandatory AM/FM bands are set automatically and do not expose a modulation soft key; UHF alone exposes the selectable modulation control. IAD, MAD, and MAR presets tune immediately.
- **Direct DF entry with safe recovery.** Each keypress refreshes the complete DF page and displays the first key immediately as `EDT: 1_#.###`. In MANUAL TUNING, a valid six-digit channel becomes active after five seconds. **ESC** remains available during that delay to discard the entry. An impossible digit is rejected as soon as it makes the partial frequency invalid; after 1.5 seconds the DF returns to the same edit position so the digit can be corrected.
- **Retained DF channel.** The most recently selected valid DF channel is retained. A first use starts at **MAN 118.000 MHz / AM**.
- **Dedicated Before Take-off checklist.** The checklist menu now includes a complete monitored BEFORE TAKE-OFF CHECKLIST, including engine, rotor, pressure, caution, fuel, display, IESI, autopilot/SAS, optional-equipment, and conditional night-light items. Checks that cannot be read automatically continue after their prescribed delay.
- **Higher hoist operating ceiling.** Hoist-related guidance, readiness, and warnings use a 163 ft internal ceiling. Cockpit guidance is expressed as **40 to 160 ft** for clear operational use.

## UI Changes and Controls

### Medical page

- The Medical page is now a vertical **Patient Clinical Record** designed for the tablet single-column renderer.
- The rescue-team report can arrive before HEMS reaches the patient: it first advises that ambulance assessment is in progress, then adds completed assessment/basic-treatment information when available. The detailed ambulance-handover panel and action rows appear only when HEMS reaches the patient; no empty or null report is shown.
- Before the first completed assessment, the page explicitly shows that observations are pending. GCS, emergency code, Life Score, and vital signs appear when the assessment is clinically available, including ambulance-credited work.
- GCS and Code share a compact single line with a protected visual gap; numeric and Not Testable combinations are supported without allowing Code to wrap onto a new line.
- Medical procedures are separate lines: the current procedure is yellow, prior completed procedures are green, newest first, and all rows remain green after completion. The old concatenated // display and dashed text separators are gone.
- The gray GCS/Code reference legends and the Life Score label/slider are placed after the clinical action area to keep the active record readable.
- Manual mode adds P1/P2/P3 record selectors, concise procedure buttons, a visible result for each choice, COMPLETE VISIT, and an explicit transport decision. Non-active records remain view-only; AMBULANCE appears only when a suitable ambulance is present.
- CPR controls include START CPR and, after the appropriate prolonged phase, STOP CPR.

### Settings → Most Used / clinical controls

- **Patient clinical treatment mode** is persistent. AUTOMATIC is the default and makes the Medical page follow the patient currently being visited; MANUAL enables the staged interaction and patient selector for every casualty present. The option remains available through mission phase 5.
- **Visit-time presets** ULTRAFAST, FAST, MEDIUM, and SLOW remain the single timing control. In manual mode they define the duration of each selected procedure instead of creating a second timing setting.
- **mCPR Onboard** controls whether mechanical CPR is available for in-flight continuation or must wait for landing.
- **HEMS cancellation threshold** controls the configured point at which a ground-service-managed call may cancel HEMS, where that setting is available for the mission profile.

### Settings → Safety, service, and layout

- **Orange scene marker** offers **NEVER**, **AUTO**, **REALISTIC**, and **ALWAYS**. REALISTIC waits for the 2 NM approach, requires an eligible scene and responding ground service, avoids duplicate VFX, and expires after five minutes.
- **DATAQUERYSERVICE endpoint selection** is retained independently from aircraft profiles. A valid CICERS key selects CICERS; an unavailable or expired key restores the prior endpoint instead of overwriting it.
- **Settings layout and profiles.** Flight Assist and Medical options open collapsed, the pilot-boarding selector is grouped with Ground/Hoist options, and the Aircraft Settings Profiles link opens reliably.

### Settings → Marshal and ground-operation controls

- **START BASE MARSHAL** enables the optional marshal at the original base. Its position now survives a return and reload.
- **DEST. HOSPITAL MARSHAL** controls the optional destination-hospital marshal.
- Existing marshal operations now also support accepted custom landing references, with their own map feedback and stable approach/departure behavior.

### Settings → Avionics Options

- **Tablet 5G data connection** is persistent and defaults to NO. When enabled, tablet data remains available even outside Wi-Fi range or with CARLS radio disconnected; it does not falsely report CARLS as connected.
- The option is placed with the CARLS radio self-test/autoconnect controls so data and radio behavior can be set together.
- When Tablet 5G is enabled, the manual Wi-Fi connect/disconnect controls are replaced in Mission Dispatch by a green 5G CONNECTED status icon. Switching 5G back to NO restores the normal in-range Wi-Fi control.
- The tablet home bar changes to a dedicated 5G indicator with three RSSI bars while 5G is enabled. The original Wi-Fi/CARLS home bar is retained for the normal connection mode.
- **Direction Finder tuning mode** selects DF AUTO or MANUAL TUNING and remains available with the other CARLS avionics settings.

### Checklists

- BEFORE TAKE-OFF CHECKLIST is available from Quick Links with the existing checklist controls and voice-assistant behavior preserved.
- Its checklist rows use a fixed monospace width: answer fields and `[ ]` / `[V]` markers stay in their right-hand column without wrapping.

### Map, dispatch, and return screens

- Map selection flows expose explicit Accept and Reject/Cancel actions for custom locations, landing spots, hospitals, return bases, midpoints, heli-rescuer positions, and technical marshals where applicable.
- Rejecting a landing-spot proposal now preserves the current accepted landing marker, ring, and route. Only Accept recalculates the route for the new point.
- Mission Dispatch shows a temporary 0–100 rescue-operation progress bar and stage text during active ground work. It hides after the operation ends, while a stalled-operation warning does not overwrite the active instruction.
- Cleaner map feedback refreshes Next Dispatch markers, clears obsolete dispatch icons, gives custom marshal points their own icon, and removes the opaque background from custom hospital markers.
- The post-return statistics/dispatch screen now makes the on-duty state clear and offers **END SHIFT** as the explicit terminal control. Otherwise the crew can remain available for the next dispatch.

### Mission Presets

- Preset edits are saved automatically when changing preset or leaving the mission-list page; there is no separate Save button.
- Individual mission choices remain independent between DEFAULT and PRST 1-5 and survive reopening/reloading.
- A category appears selected only when all missions in it are enabled. With a partially enabled category, press it once to request “enable all” and press the same category again to confirm. Once fully enabled, the next press disables the category.

### Debug Center

- The Debug page is a six-view **Debug Center**: SUMMARY, MISSION, MEDICAL, GROUND, GUIDANCE, and INVENTORY. Irrelevant subsystem blocks stay hidden and operational faults are easier to distinguish.
- **CAPTURE SNAPSHOT** saves the current mission and operational state for later inspection; **CLEAR SNAPSHOT** removes it. The saved record is reloaded when Debug is opened.

### Persistent preferences and status feedback

- Crew and checklist audio volumes survive a normal dispatch reload and are synchronized at startup.
- Cancellation statistics, casualty reporting, vehicle availability, and final mission status use one coherent operational state.

## Fixes

### Flight, map, and marshal guidance

- Resolved rapid left/right marshal alternation when the helicopter crossed the approach centreline by a very small amount.
- Resolved marshal states that could remain idle, follow wind near a landing point, use the helicopter heading, or stop working after a temporary touchdown.
- Resolved stale/repeated cues during engine start, prime-pump use, shutdown, idle restart, take-off, and route departure.
- Resolved incorrect custom landing-reference placement after a rejected or replaced landing spot. A rejected proposal no longer rebuilds the route or removes the active landing reference.
- Resolved CARLS Direction Finder command failures when opening the page, entering digits, changing modulation, or confirming a valid channel.
- Resolved DF startup displays that could show an undefined source or an invalid 0.000 MHz frequency after a mission reload.
- Resolved DF soft-key and editor refresh states that could leave the display static, omit the edit cursor, retain an invalid digit, or expose a modulation command in a fixed-modulation band.

### Crew, patient, and ground-service flow

- Resolved crew boarding through a closed side door and premature closure while another crew member still needed that side.
- Resolved skipped stretcher approach points, unnecessary crossings in front of the helicopter, and incorrect ambulance-stretcher final positions.
- Resolved several walking, standing, pilot, copilot, stretcher, hoist, loading, unloading, skid, and reboarding animation/state mismatches.
- Resolved premature emergency-vehicle arrival, duplicate reversals, unsafe parking, missing clearance, failed final stops, and stalled service drives.
- Resolved secondary-ambulance races and departures before the assigned patient visit/load had completed.
- Resolved a release-88 ambulance transfer stall: after ambulance transport is selected, the ambulance stretcher no longer waits for unrelated HEMS reboarding or helicopter-stretcher states. HEMS and ambulance procedures continue independently; ambudoc still waits for the accompanying doctor.

### Scene, clinical data, and mission stability

- Resolved privacy fences appearing at indoor calls, including indoor cardiovascular incidents. Eligibility now follows the actual scene query.
- Resolved incompatible pathology, scene, sex/age, motorcycle, fire/VFX, and seasonal combinations that could produce a mismatched casualty or repeated scene-generation attempts.
- Resolved repeated public/casualty models when unused compatible alternatives existed.
- Resolved zero/impossible vital signs for living patients, reversed blood pressure, misleading GCS totals, inappropriate unconscious-patient presentation, and observations appearing before assessment.
- Resolved competing CPR loops, incorrect provider selection, misleading recovery conditions, and compression information disappearing when the page reopened.
- Resolved malformed/unsupported tablet condition structures and invalid route/location references that could cause command errors, stuck objectives, or failed dispatch actions.
- Resolved stale custom/SAR metadata, delayed pathology persistence, duplicate victim messages, stale map icons, repeated refuelling starts, settings unexpectedly resetting on a later dispatch, and mission presets losing individual disabled missions after switching.
- Resolved malformed tablet conditions that could interrupt a valid operation with a Command Failed message.
