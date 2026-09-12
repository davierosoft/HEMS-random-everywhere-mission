# HEMS Random Everywhere Missions - User Changelog

This changelog covers every final player-facing change from the July baseline: 0.997 1 through 0.997 142, plus the development checkpoint made after build 142. It is written for pilots: it explains what changes on the tablet and in the mission. Each feature appears once only, in its most relevant section.

The checks below are simulator checks. The changes recorded after build 142 still need final simulator confirmation.

## FIXES

### Reliable mission start

- A mission now either starts with a valid patient and scene, or shows a clear problem. It no longer searches forever or leaves an unusable call on the tablet.
- **Build history:** 0.997 1-18.
- **Test:** Disable all calls, then start a new dispatch and verify that the tablet reports the problem without freezing.

### Safer arrival of emergency vehicles

- Ambulances, police and fire engines now report arrival only after they have stopped in a safe place beside the incident. They avoid patients, other vehicles and world-origin spawns.
- **Build history:** 0.997 1-13, 46, 75, 130.
- **Test:** Run road, closest-service and custom landing-zone calls; each vehicle must park safely before its crew acts.

### Stable route and map selection

- Declining a proposed landing point or destination now leaves the accepted route and map marker untouched. A missing destination no longer interrupts the mission.
- **Build history:** 0.997 15, 75, 130.
- **Test:** Accept a landing point, open the selector again, choose Reject and verify the original route remains.

### Correct use of a distant ambulance

- A distant ambulance now follows the appropriate ground-transfer path instead of attempting an unrealistic pickup. A second ambulance waits for its own patient work before leaving.
- **Build history:** 0.997 10, 65, post-142 checkpoint.
- **Test:** Start a three-patient call with two ambulances at different distances and follow both transport outcomes.

### Complete ambulance assessments

- Ground medics can assess every patient when time allows. When HEMS arrives late, it begins with the most urgent already assessed patient instead of missing records or showing an empty ambulance status.
- **Build history:** 0.997 67, 77, 91, 104, 106, 127, 138, post-142 checkpoint.
- **Test:** Land late at a multi-patient incident with one medic; check that each patient has an assessment or receives priority from HEMS.

### Realistic ambulance loading

- A patient selected for road transport is now prepared and moved as a stretcher patient. They no longer slide across the scene as if pulled by an invisible force.
- **Build history:** 0.997 65, 91, 138, post-142 checkpoint.
- **Test:** Let an ambulance take a non-HEMS patient and watch the complete loading sequence before departure.

### Correct three-crew roles

- In a three-crew operation, the copilot remains the pilot throughout hospital unloading and only returns to the cockpit role when actually going back to the cockpit.
- **Build history:** 0.997 20, 27, 40-42, 118-122, 142.
- **Test:** Complete a hospital arrival with three crew and verify the copilot's role during unloading and reboarding.

### Reliable rear-door closure

- Boarding no longer continues until both rear cargo doors have actually closed. A door problem is recorded for troubleshooting instead of being ignored.
- **Build history:** 0.997 118-121.
- **Test:** Repeat boarding with delayed rear doors and confirm the next step waits for both doors.

### Clear crew and rotor-wait errors

- If essential crew cannot appear, the mission now stops with a clear error record. Normal ground-operation rotor waiting remains unchanged but is visible in troubleshooting information.
- **Build history:** 0.997 119-121.
- **Test:** Capture troubleshooting information while preparing ground operations and verify crew and rotor progress are reported.

### No blocked patient objective

- A critical patient's condition can develop while the mission objective activates normally. Scene preparation no longer blocks the rest of the call.
- **Build history:** 0.997 61-62.
- **Test:** Start a critical call and remain en route; mission objectives and patient changes must both continue.

### Consistent clinical observations

- Living patients no longer display impossible observations. Blood pressure, breathing, temperature, consciousness and Life Score appear consistently after assessment.
- **Build history:** 0.997 52-57, 64-65, 81.
- **Test:** Inspect normal, critical and intubated patients after assessment; all displayed observations must be plausible and populated.

### Stable CPR outcomes

- CPR uses one coherent rescue sequence, with correct crew involvement, recovery/failure outcomes and a reliable Stop CPR choice when available.
- **Build history:** 0.997 58, 64.
- **Test:** Start CPR on scene and in flight where enabled; verify one procedure runs and Stop CPR ends it for that call.

### Correct fence and patient placement

- Indoor calls no longer receive an outdoor privacy fence. In residential fire calls, patients and the rescue fence are placed at the external rescue point rather than at the fire itself.
- **Build history:** 0.997 58, 65, 138, post-142 checkpoint.
- **Test:** Compare an indoor call with a residential fire call; only the external rescue point should receive the fence.

### Residential fire is now handled by fire crews

- Residential fire scenes use an extinguishable fire and can call two fire engines. The fire now reduces after the response instead of remaining permanently active.
- **Build history:** 0.997 18, 138, post-142 checkpoint.
- **Test:** Run a residential fire call and verify both fire engines respond and the fire visibly reduces.

### Reliable Direction Finder

- The Direction Finder no longer opens with missing values, accepts invalid channels or points at an unrelated target. It keeps the chosen valid frequency after reopening.
- **Build history:** 0.997 79, 83, 85, 88-89, 95, 99.
- **Test:** Reopen Direction Finder after a reload, enter an invalid channel, then use a valid emergency preset.

### Immediate tablet connectivity refresh

- Changing Tablet 5G now refreshes the current tablet page immediately. Outdated Wi-Fi buttons cannot remain on screen after the setting changes.
- **Build history:** 0.997 71, 76, 80-81, 84.
- **Test:** Switch Tablet 5G on and off from Settings while Dispatch is open.

### Reliable medical-page availability

- The Medical page now follows the selected operating mode correctly and keeps a completed ambulance handover as a readable final record instead of a live, broken page.
- **Build history:** 0.997 81, 86, 126-127.
- **Test:** Complete an ambulance handover in both medical modes and reopen the record.

### Presets retain personal choices

- Changing a mission preset no longer overwrites an individual mission that the pilot manually enabled or disabled.
- **Build history:** 0.997 82, 84, 102-103.
- **Test:** Change one mission manually, switch presets and return; the personal choice must remain.

### Stable marshal guidance

- Marshal guidance now remains stable during approach, touchdown, restart and departure. It no longer keeps giving side calls on the centreline or moving incorrectly after landing.
- **Build history:** 0.997 14, 19, 22, 32, 34-36, 43-45, 49-50, 55, 66, 68, 78, 142.
- **Test:** Follow a full marshal approach, land, restart and depart; confirm neutral centreline guidance and no movement after landing.

### Correct marshal location behavior

- A marshal configured for a fixed base or hospital position now appears at that position, faces the helicopter and remains stable nearby. Standard wind behavior remains for normal locations.
- **Build history:** 0.997 47-51, 70, 142.
- **Test:** Enable a fixed marshal location at a custom base or hospital and compare it with a normal location.

### Reliable local saves and generated scenes

- Saving now records local time correctly, and affected road/railway scenes no longer fail with a command error while being created.
- **Build history:** 0.997 45, 130.
- **Test:** Save a mission and start a railway or roadside incident; no error banner should appear.

### Working take-off checklist flow

- The Avionics, Before Take-off and Take-off checklists now lead into each other correctly. Their buttons and waiting periods work, and the final checklist returns to Dispatch.
- **Build history:** 0.997 87-88, 135-137.
- **Test:** Complete the three checklists in order, using both the waiting period and the proceed button.

### Accurate take-off checks

- Take-off preparation now reads aircraft attitude, collective and engine balance correctly. Slope instructions appear first only when the helicopter is genuinely on a steep slope.
- **Build history:** 0.997 87, 135-136.
- **Test:** Compare a level take-off with a steep-slope take-off while changing collective and engine power.

## UI

### Persistent troubleshooting snapshots

- Troubleshooting now saves a clear snapshot of the current mission, route, crew progress, rotor progress and patient information. It can be reopened later or cleared deliberately.
- **Build history:** 0.997 92, 108, 110-112, 123-125.
- **Test:** Save a snapshot before and during ground operations, then reopen it from the troubleshooting page.

### Multi-patient diagnostic page

- The troubleshooting page includes a safe multi-patient readiness check. It reports the result without changing the active incident.
- **Build history:** 0.997 123-125.
- **Test:** Run the readiness check and save a snapshot; the active mission must remain unchanged.

### Patient record buttons and automatic focus

- Medical records now use clear `Patient 1`, `Patient 2` and `Patient 3` buttons. The page follows the patient currently visited by HEMS while still allowing the pilot to inspect another patient.
- **Build history:** 0.997 91, 127, 138, post-142 checkpoint.
- **Test:** Visit two patients and use all record buttons during the visit.

### Clear clinical record layout

- The Medical page now shows assessment, ambulance handover, HEMS actions, observations and Life Score as one readable vertical clinical record. Active work is yellow and completed work is green.
- **Build history:** 0.997 54-57, 65, 67-68, 77, 81.
- **Test:** Open the page before assessment, during handover and after treatment.

### Easier reading of observations

- Consciousness, vital signs and emergency information are arranged in readable lines. A value that cannot be tested is shown clearly instead of as a misleading number.
- **Build history:** 0.997 52-57, 81.
- **Test:** Compare the records of a stable, critical and intubated patient.

### Dedicated Direction Finder page

- CARLS now has a dedicated Direction Finder page with a clear frequency display, direct entry, emergency presets and the appropriate radio-mode choice.
- **Build history:** 0.997 79, 83, 85, 88-89, 95, 99.
- **Test:** Open the page, enter a valid frequency, select each emergency preset and return to CARLS.

### Tablet 5G presentation

- When Tablet 5G is enabled, the tablet shows a dedicated 5G status and home bar. When disabled, the normal Wi-Fi controls return.
- **Build history:** 0.997 71, 76, 80-81, 84.
- **Test:** Toggle 5G and inspect Dispatch, Briefing and an ordinary tablet page.

### Organized persistent settings

- Settings now group flight, medical, radio, marshal and mission-profile choices more clearly. Selected options survive a normal mission reload.
- **Build history:** 0.997 39, 47, 58, 71, 74, 83, 102-104, 113-117.
- **Test:** Change several settings, start another dispatch and confirm that the choices remain.

### Dispatch progress and end-of-shift view

- Dispatch now shows visible rescue progress, a clear warning if operations stop advancing, and an unambiguous End Shift choice after return to base.
- **Build history:** 0.997 21, 59, 71-73, 100, 110.
- **Test:** Run a ground operation, pause it briefly and complete the return-to-base flow.

### Clean checklist pages

- Checklist marks align at the right edge of the tablet. Every checklist page has a full-width Back link and title, and the checklist menu includes Take-off.
- **Build history:** 0.997 87-88, 135-137.
- **Test:** Open every checklist page and verify alignment, Back navigation and the Take-off entry.

### Clear marshal controls and map feedback

- The Technical page now presents clear marshal creation choices and matching map feedback. Troubleshooting shows the related operational progress.
- **Build history:** 0.997 47-51, 110.
- **Test:** Create a marshal in front of the helicopter and at a selected location, then inspect the map.

### Better RescueTrack alerts

- RescueTrack gives one sound for each new operational update after the first dispatch call, without duplicate alerts.
- **Build history:** 0.997 68-69, 73, 77.
- **Test:** Start a realistic dispatch and wait for ambulance, police or cancellation updates.

## NEW FUNCTIONS

### Three-crew skid operations

- A three-person HEMS crew can complete skid-landed work for one, two or three patients, including assessment, treatment, helicopter transport, road handover and reboarding.
- **Build history:** 0.997 1-13, 19-20, 40-42.
- **Test:** Run three-crew skid calls with one, two and three patients and complete both helicopter and road outcomes.

### Heli-rescuer destination drop

- A grounded helicopter can leave heli-rescuers at a compatible base, hospital or selected destination. The crew later returns from that chosen place.
- **Build history:** 0.997 1-13.
- **Test:** Use the drop action at each supported destination, then recover the crew.

### Configurable HEMS cancellation

- When ground services can safely manage a suitable incident, HEMS may be cancelled after a realistic delay. The outcome appears in statistics and continues to return-to-base.
- **Build history:** 0.997 1-13.
- **Test:** Use a stable patient with sufficient ground services and wait for the cancellation decision.

### Ambulance care before HEMS arrival

- In suitable calls, ambulance and police can begin patient care before HEMS lands. HEMS receives the completed ground handover and continues from the right point.
- **Build history:** 0.997 1-13, 10, 67, 91, 138, post-142 checkpoint.
- **Test:** Delay HEMS arrival in a suitable call and inspect the ambulance handover after landing.

### Diagnosis-based patient condition

- Each patient's diagnosis shapes their starting condition and how it changes during care, rather than using one generic patient profile.
- **Build history:** 0.997 52-58, 74, 81.
- **Test:** Compare patients with different diagnoses through a complete visit.

### Optional manual medical treatment

- Manual treatment mode offers staged choices for the patient under HEMS care, with visible consequences and an explicit decision to complete the visit and choose transport.
- **Build history:** 0.997 74, 81.
- **Test:** Enable Manual mode, complete a full patient visit and compare it with Automatic mode.

### Mechanical CPR option

- The mechanical CPR setting allows eligible CPR to continue in flight. With it disabled, CPR waits for a landing.
- **Build history:** 0.997 58.
- **Test:** Repeat the same critical-patient scenario with the setting on and off.

### Distant custom landing-zone police support

- Police can prepare a distant custom landing zone, bring crew when appropriate, wait for the helicopter and return the crew toward the scene.
- **Build history:** 0.997 1-13, 10.
- **Test:** Compare a nearby and a distant custom landing zone with police available.

### Base and hospital marshal choices

- Separate settings can enable marshals at the home base and destination hospital. Custom locations can use their own local marshal choice.
- **Build history:** 0.997 47, 70, 142.
- **Test:** Enable each choice, return to base and land at both standard and custom hospitals.

### Custom hangar marshal support

- Custom hangars can choose whether a marshal is present and, when used, can give that marshal a fixed location. OATMC Flugrettung Cristophorus 14 is included with its requested marshal position.
- **Build history:** 0.997 142.
- **Test:** Select that base and verify the marshal appears only when the local choice is enabled.

### Automatic or manual Direction Finder tuning

- Direction Finder can automatically follow the active emergency source or allow the pilot to tune manually and obtain a bearing only for the matching emergency signal.
- **Build history:** 0.997 83, 89, 95, 99.
- **Test:** Switch modes during ambulance, search-and-rescue and distress-beacon missions.

### Higher hoist operating range

- Hoist guidance and readiness support the 40 to 160 ft operating range across patient and heli-rescuer work.
- **Build history:** 0.997 84-85.
- **Test:** Try hoist work below, inside and above the permitted range.

### Ground-patient report continuity

- Patient records remain available during the required care and handover sequence, then close live details only after a completed road transfer while retaining a final summary.
- **Build history:** 0.997 74, 81, 126-127, 138.
- **Test:** Complete road transfers for multiple patients and inspect the final record for each.

### Smarter residential incident generation

- Residential calls select suitable nearby roads, avoid unnecessary repeated people where possible and keep an accepted landing choice stable.
- **Build history:** 0.997 72, 75.
- **Test:** Generate several residential calls and accept/reject proposed landing points.

### Improved saved missions and custom search-and-rescue

- Saved missions retain their patient and scene identity more reliably, while custom search-and-rescue calls use their own correct mission details after loading.
- **Build history:** 0.997 17, 31.
- **Test:** Save/reload a mission, then start a custom search-and-rescue mission and compare the incident details.

### Optional firefighter marshal

- When the compatible firefighter add-on is installed, fire calls can use its firefighter marshal. The normal marshal remains available when it is not installed.
- **Build history:** 0.997 14, 19, 32-36, 43.
- **Test:** Run a fire call with and without the add-on installed.

### Mission profiles and reload choices

- Mission profiles and supported personal choices can carry through the normal reload path, including audio preferences and selected operating options.
- **Build history:** 0.997 39, 102-104, 115-117.
- **Test:** Choose a profile and settings, start another dispatch and verify they remain selected.

### Continued availability after return

- After a completed return, the crew can remain available for another dispatch. End Shift closes that availability cleanly.
- **Build history:** 0.997 71.
- **Test:** Return to base, wait for another call, then repeat and choose End Shift.

## Build coverage ledger

Every build in the requested coverage has been reviewed. The ledger avoids repeating player-facing descriptions already listed above.

- **0.997 1-9:** Initial rescue, crew, vehicle, dispatch, map and heli-rescuer improvements.
- **0.997 10-16:** Ambulance distance, vehicle reliability, custom landing-zone support, firefighter marshal, routing and patient-data improvements.
- **0.997 17-22:** Saved-patient details, scene effects, crew roles, marshal behavior and statistics.
- **0.997 23-26:** Reviewed consolidation builds; no separate final pilot-facing change remains.
- **0.997 27-31:** Crew routes, engine-start safety and saved/custom search-and-rescue recovery.
- **0.997 32-39:** Marshal improvements, troubleshooting cleanup and persistent settings.
- **0.997 40-46:** Crew-role corrections, marshal stability and rescue-vehicle arrival reliability.
- **0.997 47-51:** Marshal settings, custom marshal controls, base return and map feedback.
- **0.997 52-60:** Patient observations, CPR, privacy, dispatch progress and layout correction.
- **0.997 61-70:** Objective reliability, ambulance handover, RescueTrack and base marshal persistence.
- **0.997 71-80:** Tablet 5G, audio, manual treatment, residential calls and Direction Finder.
- **0.997 81-90:** Final road-transport records, presets, Direction Finder refinements and Before Take-off.
- **0.997 91-100:** Independent Patient 1-3 flow, saved troubleshooting and dispatch feedback.
- **0.997 101-110:** Profiles, ambulance/medical improvements, crew operations and troubleshooting summary.
- **0.997 111-117:** Settings, profile reload and stable mission preferences.
- **0.997 118-122:** Rear-door protection plus crew and rotor-progress reporting.
- **0.997 123-127:** Multi-patient readiness display and completed-patient records.
- **0.997 128-130:** Save-time and scene-creation reliability.
- **0.997 131-134:** Reviewed consolidation builds; no separate final pilot-facing change remains.
- **0.997 135-137:** Full take-off checklist flow and presentation.
- **0.997 138-139:** Multi-patient ground care, patient records and residential fire response.
- **0.997 140-141:** Reviewed delivery builds; their final pilot-facing outcome is included in build 142.
- **0.997 142:** Three-crew role correction and custom fixed-location marshal support.
- **Post-142 checkpoint:** Cumulative ground assessment, patient-record focus, ambulance loading and residential fire response remain to be confirmed in the simulator.
