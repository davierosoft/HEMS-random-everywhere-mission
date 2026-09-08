# HEMS Random Everywhere - User Changelog

## Coverage and release status

This changelog consolidates final user-visible behavior from the July `0.997` baseline through technical build `0.997 142`.

It intentionally records a function or fix once, in its final form. Intermediate attempts, reverted fixes, and internal-only maintenance are not separate user changes. The build history on each item identifies where the behavior started and where it was consolidated.

The latest supplied mission identity remains `0.997 142`. The current GitHub checkpoint contains further source changes after that build, is statically checked, and remains **simulator validation pending**. It is not a new downloadable mission release.

## Consolidated changes since the July baseline

### Direction Finder, beacons, and CARLS

**Final behavior.** CARLS has a complete Direction Finder page with safe keypad editing, retained valid tuning, automatic/manual tuning, aviation-band and 25 kHz validation, emergency beacons, and saved custom/object stations. The display refreshes all rows in every state and no longer keeps stale edit keys, sources, or frequencies.

**Build history.** Introduced in 92 and 94-96; station validation and tuning synchronization consolidated in 97-99, 103, and 105.

**Runtime test.** Open the DF page, enter a valid and an invalid channel, use ENT and ESC, restart/reopen, test IAD/MAD/MAR and UHF modulation, then verify automatic ELT, PLB, ambulance, and doctor-pick bearings.

### Debug Center, snapshots, and Test Tracker

**Final behavior.** Debug Center provides ordered SUMMARY, MISSION, MEDICAL, GROUND, GUIDANCE, and INVENTORY views. Persistent snapshots retain mission/build identity, local date/time, live operational diagnostics, registry diagnostics, and immutable closing medical reports. Test Tracker stores execution, tester outcome, and failed-test notes without confusing code-path completion with simulator success.

**Build history.** Debug snapshots started in 92 and were expanded in 100-112 and 115. Crew-creation, NR, and registry diagnostics were consolidated in 121-125.

**Runtime test.** Capture a snapshot during setup, NR wait, patient work, and mission end; close/reopen Debug and reload the mission. Verify the saved fields remain frozen until a new capture, and mark Test Tracker results only after observing them in the simulator.

### Crew creation, doors, and ground-operation safety

**Final behavior.** Boarding confirms both rear cargo doors with bounded retries. Critical crew creation is synchronously watched and reports a clear creation failure instead of silently advancing. The normal NR threshold is unchanged; its wait now records WAITING and PASSED diagnostics. Ground/hoist/ambulance choreography retains the required walking, stretcher, return, and door-close order.

**Build history.** Crew safety originated in 93. Ambulance/crew sequencing was consolidated in 104, 106, 117, and 120. Cargo-door verification and watchdog diagnostics were added in 118-121.

**Runtime test.** Run boarding with delayed cargo-door closure, then start three-, four-, and five-crew ground operations at normal idle NR. Confirm the crew deploys without another action, the Debug records progress, and the cargo doors never close before the required return walk completes.

### Medical records, ambulance assessment, and ground transport

**Final behavior.** The clinical record shows ambulance work only after a medic reaches and assesses the casualty. One available medic can assess every present casualty; a second ambulance medic is created and moved physically before its own P2/P3 assessments. Ground transport uses the ambulance stretcher and packed casualty states rather than dragging a casualty object. Missing ambulance-provider data falls back to `AMBULANCE` instead of `undefined`.

**Build history.** Initial clinical handover and destination sequencing came in 104 and 106. Medical/ground corrections continued in 117 and 126-127. Multi-casualty assessment, stretcher normalization, and report rendering were consolidated in 138-139 and the GitHub checkpoint after 142.

**Runtime test.** In a three-casualty scene, test one and two ambulance-medics. Confirm each assessment begins only after the relevant medic arrives, every casualty is assessed before treatment continuation when time permits, and a ground casualty appears packed on the ambulance stretcher before departure.

### Patient record navigation and completed-visit telemetry

**Final behavior.** Medical pages provide `Patient 1`, `Patient 2`, and `Patient 3` selectors. HEMS automatically focuses the record it starts visiting, while the user can still open another record manually. A ground patient's live detail feed closes only after every visit is complete and actual ground handover is confirmed; the retained summary remains available. The helicopter patient's full clinical record remains available.

**Build history.** The P1-P3 telemetry adapter and closing reports were introduced in 123-127. Selector, report, and focus behavior were consolidated in 138-139 and the GitHub checkpoint after 142.

**Runtime test.** During an active HEMS visit, verify the page changes to that patient. Then select another patient and confirm the selection remains until a new HEMS visit begins. After all visits, move one patient by ambulance and confirm only that patient's page changes to a frozen summary.

### Residential fire scene and responder placement

**Final behavior.** In the residential three-casualty fire variant, casualties and HEMS access waypoints are at the external rescue point and the point is fenced. The incident fire uses the standard extinguishable VFX object at the authored fire location, with fire intensity reduced through `VAR 1`. The existing intensity-8 response activates two fire trucks.

**Build history.** Rescue-point positioning was consolidated in 138. The standard fire/VFX integration and two-truck confirmation are in the GitHub checkpoint after 142.

**Runtime test.** Start the three-casualty residential fire variant. Confirm casualties are at the rescue point, the fence surrounds it, the fire remains at the incident, both fire trucks arrive, and the fire VFX `VAR 1` decreases until clearance is reported.

### Take-off checklists

**Final behavior.** Avionic/preflight advances to BEFORE TAKE-OFF, and BEFORE TAKE-OFF advances to TAKE-OFF after valid checks and a 20-second delay or the working proceed button. TAKE-OFF is available from checklist home, returns to Dispatch after completion, aligns completion markers, checks FLI and engine torque AEO status, and shows slope procedure guidance first only above 12 degrees pitch or roll.

**Build history.** The monitored transition and TAKE-OFF flow were introduced in 135, simulator-variable validation in 136, and working current-page proceed controls in 137.

**Runtime test.** Complete each checklist with valid conditions, use both automatic and button progression, test an invalid FLI/AEO condition, and test pitch/roll below and above 12 degrees. Confirm the final page returns to Dispatch after ten seconds.

### Marshal configuration and destination crew roles

**Final behavior.** Hospital and hangar waypoints can override marshal presence and coordinates. A local YES setting spawns the marshal at the authored coordinates facing the helicopter; a local NO suppresses it even when the global setting is enabled. Generic marshals retain wind alignment at distance and stop being wind-repositioned inside the short-range area. With three crew, the pilot remains represented by the documented Crew object VAR 1 states through destination patient deboarding.

**Build history.** Custom waypoint overrides and wind-range behavior were consolidated in 142.

**Runtime test.** Test generic and coordinate-based hospital/hangar marshals with global settings both enabled and disabled. At a three-crew destination, follow the entire patient deboarding/reboarding sequence and confirm the pilot does not appear as ordinary cabin crew.

### Settings, profiles, persistence, and local time

**Final behavior.** Aircraft profiles, mission-list links, saved presets, CICERS endpoint choice, and persistent settings survive their intended reload paths. Save timestamps use local PC date/time in `DD-MM-YYYY` form. Failed CICERS checks restore the previous usable provider rather than leaving an invalid endpoint.

**Build history.** Profile and endpoint behavior was consolidated in 93, 102, 111, 113-117. HPG-compatible local time and railway-query safeguards were finalized in 128 and 130.

**Runtime test.** Save and reload an aircraft profile and mission preset, change the CICERS availability state, then save/delete a mission slot. Confirm the visible date/time is local, the date format is correct, and the former valid provider is restored after a failed CICERS check.

## Important limits and pending validation

- The active physical scene/transport implementation remains P1-P3. The five-slot registry, P4/P5 adapters, and five-patient transport are not presented as complete features.
- A static PASS proves source structure and regression checks, not HPG/MSFS behavior. Run the listed runtime tests before treating a GitHub checkpoint as a validated mission release.
- Build numbers advance only when a new downloadable mission artifact is delivered. GitHub checkpoints after build 142 do not consume a new build number.
