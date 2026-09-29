# HEMS Random Everywhere Missions - User Changelog

This changelog covers every final player-facing change from the July baseline: 0.997 1 through 0.997 142, plus every development checkpoint and release through 0.997 169.0. It is written for pilots: it explains what changes on the tablet and in the mission. Each feature appears once only, in its most relevant section.

The checks below are simulator checks. The changes recorded after build 142, up to and including 0.997 169.0, still need final simulator confirmation.

## FIXES

### Reliable mission start

- A mission now either starts with a valid patient and scene, or shows a clear problem. It no longer searches forever or leaves an unusable call on the tablet.
- **Build history:** 0.997 1-18.
- **Test:** Disable all calls, then start a new dispatch and verify that the tablet reports the problem without freezing.

### Safer arrival of emergency vehicles

- Ambulances, police and fire engines now report arrival only after they have stopped in a safe place beside the incident. They avoid patients, other vehicles and world-origin spawns, and two ambulances now park on opposite sides of the scene instead of crowding one side.
- **Build history:** 0.997 1-13, 46, 75, 130, 168.136, 168.142.
- **Test:** Run road, closest-service and custom landing-zone calls; each vehicle must park safely before its crew acts.

### Rescue vehicles no longer circle after arrival

- Ambulances, police cars and fire engines no longer get stuck driving in a circle instead of completing their approach or departure. Every rescue vehicle restarts and continues normally.
- **Build history:** 0.997 168.147.
- **Test:** Run a call with ambulance, police and fire response and watch each vehicle through its full arrival and departure without circling.

### Reliable ground-vehicle routing

- Ambulances, police and fire vehicles now correctly recover their route to the scene, hospital or a midway point instead of stalling or falling back to an invalid path.
- **Build history:** 0.997 144-145, 168.143.
- **Test:** Run a call with a distant scene, hospital or midway destination and confirm each vehicle reaches it without stalling.

### Stable route and map selection

- Declining a proposed landing point or destination now leaves the accepted route and map marker untouched. A missing destination no longer interrupts the mission.
- **Build history:** 0.997 15, 75, 130.
- **Test:** Accept a landing point, open the selector again, choose Reject and verify the original route remains.

### Correct use of a distant ambulance

- A distant ambulance now follows the appropriate ground-transfer path instead of attempting an unrealistic pickup. A second ambulance waits for its own patient work before leaving.
- **Build history:** 0.997 10, 65, post-142 checkpoint.
- **Test:** Start a three-patient call with two ambulances at different distances and follow both transport outcomes.

### Complete ambulance assessments

- Ground medics can assess every patient when time allows. When HEMS arrives late, it begins with the most urgent already assessed patient instead of missing records or showing an empty ambulance status. Each patient's identity, assessment and vital signs are now kept correctly separate at multi-patient incidents.
- **Build history:** 0.997 67, 77, 91, 104, 106, 127, 138, 146-147, post-142 checkpoint.
- **Test:** Land late at a multi-patient incident with one medic; check that each patient has an assessment or receives priority from HEMS.

### Realistic ambulance loading

- A patient selected for road transport is now prepared and moved as a stretcher patient. They no longer slide across the scene as if pulled by an invisible force, and the ambulance crew's walking and standing postures during loading are correct again.
- **Build history:** 0.997 65, 91, 138, 168.130, 168.136, 168.144, post-142 checkpoint.
- **Test:** Let an ambulance take a non-HEMS patient and watch the complete loading sequence before departure.

### Correct three-crew roles

- In a three-crew operation, the copilot remains the pilot throughout hospital unloading and only returns to the cockpit role when actually going back to the cockpit. Four- and five-crew operations follow the equivalent pattern, with the extra crew member(s) taking the correct standing, walking or crouching role instead of a pilot role.
- **Build history:** 0.997 20, 27, 40-42, 118-122, 142, 168.139, 168.147.
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

- Living patients no longer display impossible observations. Blood pressure, breathing, temperature, consciousness and Life Score appear consistently after assessment, with no invalid ("NaN") readings and temperature shown in plain Celsius.
- **Build history:** 0.997 52-57, 64-65, 81, 168.146, 168.147.
- **Test:** Inspect normal, critical and intubated patients after assessment; all displayed observations must be plausible and populated.

### Stable CPR outcomes

- CPR uses one coherent rescue sequence, with correct crew involvement, recovery/failure outcomes and a reliable Stop CPR choice when available. CPR can now continue reliably beyond five minutes instead of stalling; mechanical CPR remains available in flight while manual CPR still waits for landing.
- **Build history:** 0.997 58, 64, 168.
- **Test:** Start CPR on scene and in flight where enabled; verify one procedure runs, continues past five minutes when eligible, and Stop CPR ends it for that call.

### Correct fence and patient placement

- Indoor calls no longer receive an outdoor privacy fence. In residential fire calls, patients and the rescue fence are placed at the external rescue point rather than at the fire itself.
- **Build history:** 0.997 58, 65, 138, 147, post-142 checkpoint.
- **Test:** Compare an indoor call with a residential fire call; only the external rescue point should receive the fence.

### Residential fire is now handled by fire crews

- Residential fire scenes use the same extinguishable fire as other fire calls and can call two fire engines. The fire now reduces after the response instead of remaining permanently active or using a separate three-casualty fire effect.
- **Build history:** 0.997 18, 138, GitHub development checkpoint after 0.997 142.
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

- Marshal guidance now remains stable during approach, touchdown, restart and departure. It no longer keeps giving side calls on the centreline or moving incorrectly after landing, and both marshal controllers correctly recognize a restart from 20% rotor RPM when the engines were previously shut down.
- **Build history:** 0.997 14, 19, 22, 32, 34-36, 43-45, 49-50, 55, 66, 68, 78, 142, 168.
- **Test:** Follow a full marshal approach, land, restart and depart; confirm neutral centreline guidance and no movement after landing.

### Correct marshal location behavior

- A marshal configured for a fixed base or hospital position now appears at that position, faces the helicopter and remains stable nearby. Standard wind behavior remains for normal locations.
- **Build history:** 0.997 47-51, 70, 142.
- **Test:** Enable a fixed marshal location at a custom base or hospital and compare it with a normal location.

### Reliable local saves and generated scenes

- Saving now records local time correctly, the default landing-spot marker on the map is repaired after the rescue point moves or after a save, and affected road/railway scenes no longer fail with a command error while being created.
- **Build history:** 0.997 45, 128, 130, 154-155.
- **Test:** Save a mission and start a railway or roadside incident; no error banner should appear, and the default landing-spot marker should still be correct on the map.

### Clear country names in mission messages

- Dispatch, GPS and location messages now show the country name instead of an internal numeric code.
- **Build history:** 0.997 156, 168.132.
- **Test:** Start calls in different countries and check that dispatch and GPS messages name the country correctly.

### Working take-off checklist flow

- The Avionics, Before Take-off and Take-off checklists now lead into each other correctly. Their buttons and waiting periods work, and the final checklist returns to Dispatch.
- **Build history:** 0.997 87-88, 135-137.
- **Test:** Complete the three checklists in order, using both the waiting period and the proceed button.

### Accurate take-off checks

- Take-off preparation now reads aircraft attitude, collective and engine balance correctly. Slope instructions appear first only when the helicopter is genuinely on a steep slope.
- **Build history:** 0.997 87, 135-136.
- **Test:** Compare a level take-off with a steep-slope take-off while changing collective and engine power.

### Briefing screen no longer reopens over an open menu

- Opening a menu such as Settings, Save/Reload or Custom Mission while waiting for a dispatch no longer flips back to the briefing screen a moment later. The menu now stays open until the pilot closes it.
- **Build history:** 0.997 169.
- **Test:** While waiting for a dispatch, open Settings (or another menu) and confirm it stays open instead of returning to the briefing screen on its own.

### Dispatch location marker no longer flickers on the map

- When a new dispatch appears, or after pressing Next Dispatch, the location marker on the map used to appear, disappear immediately, then reappear about a second later. It now appears once, without flickering.
- **Build history:** 0.997 169.
- **Test:** Press Next Dispatch (or wait for a dispatch to appear) and watch the map marker; it should appear once without disappearing and reappearing.

### Save slots no longer share information with each other

- Deleting or reusing a save slot could occasionally leave a leftover value behind that affected a different slot. Each save slot now keeps its own information completely separate, so deleting or overwriting one slot cannot affect another.
- **Build history:** 0.997 168.148, 169.
- **Test:** Save a mission in one slot, delete it, then save a different mission in another slot and confirm nothing from the deleted slot carries over.

### Settings correctly show options set by the livery

- A display problem in Settings could hide or wrongly show hints set by an active livery, such as crew count or ground-operation requirements. These now appear correctly whenever a livery has set them.
- **Build history:** 0.997 168.149.
- **Test:** Load a livery that sets crew count or ground-operation requirements and confirm Settings shows the matching hint.

### Reset to Default and Reset Stats now reset every setting

- Reset to Default and Reset Stats previously left a few settings unchanged after resetting. Both resets now correctly restore every affected setting to its starting value.
- **Build history:** 0.997 168.149.
- **Test:** Change a few settings, including Direction Finder tuning mode and Tablet 5G, use Reset to Default (or Reset Stats), and confirm every changed setting returns to its starting value.

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

- RescueTrack gives one sound for each new operational update after the first dispatch call, without duplicate alerts. Each update is now attributed to the correct ambulance or HEMS action, and includes a medical summary.
- **Build history:** 0.997 68-69, 73, 77, 168.142, 168.146-147.
- **Test:** Start a realistic dispatch and wait for ambulance, police or cancellation updates; confirm each message names the correct service and action.

### Save disabled once ground or hoist work has begun

- The Save button on the Save/Reload page is now disabled once ground or hoist operations have started at the scene. A mission can still be saved at any point before ground work begins.
- **Build history:** 0.997 168.148.
- **Test:** Start ground or hoist operations at a scene, then open Save/Reload and confirm the Save button is disabled.

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

### Independent care for up to three patients

- Up to three casualties at one incident (Patient 1, 2 and 3) can now be assessed, transported by ambulance, or treated and flown by HEMS independently of each other. The mission no longer lets two crews claim the same patient, and a patient's completed report stays available while the others are still being treated.
- **Build history:** GitHub development checkpoint after 0.997 142, 0.997 146-147, 153, 168.130-168.138, 168.144, 168.147, Development checkpoint - P1-P3 crew and transport integration.
- **Test:** Start a three-patient call, send the ambulance to one casualty while HEMS treats another, and confirm both records stay correct and available at the same time.

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

### Crew safety scoring near hazards

- Ground crew working near smoke or fire, or during a hoist, now accumulate a safety score. Staged warnings appear as the risk builds; a low score cancels and fails the mission, and a fatal exposure is correctly detected and reported, placing the injured-crew asset at the crew member's last position. The score now also drops gradually during sustained nearby fire, detects an unsafe hoist ground-contact speed in stages, drains gradually during sustained hoist overspeed, excessive bank or excessive load, detects an aircraft crash in stages, and slowly recovers over time once the crew is no longer at risk.
- **Build history:** 0.997 93, 160, 168.149.
- **Test:** Expose a ground crew member to prolonged nearby fire, a fast hoist ground contact, sustained hoist overspeed/bank/excess load, and an aircraft crash; verify each staged warning, the low-score mission failure, the fatal-hoist outcome, and gradual score recovery once the crew is safe.

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

### Adjustable ground-operations rotor safety threshold

- A setting controls the minimum rotor RPM required before ground crew can begin work, with an automatic 30-second safety bypass if the aircraft cannot reach it.
- **Build history:** 0.997 143.
- **Test:** Set a custom rotor threshold, begin ground operations, and confirm crew wait for it (or proceed after the 30-second bypass).

### Orange target smoke marker modes

- The orange smoke landing marker can be set to Never, Auto, Realistic or Always. Realistic waits until the helicopter is close, requires an eligible scene and a responding ground service, and reliably disappears once the crew is close to the scene or once ground operations begin, whichever happens first.
- **Build history:** 0.997 93, 139-140, 145-147.
- **Test:** Try each smoke mode on a suitable call and confirm the marker appears and disappears at the right moment.

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

### Portable save files

- Each save slot is now a separate, self-contained save file that includes everything needed to identify and reload it. A save file can be copied to the matching numbered slot on another installation and will load correctly there, without depending on any separate setting that could differ between two installations. Runtime confirmation of a copied save loading correctly on another installation is still pending.
- **Build history:** 0.997 168.148, 169.
- **Test:** Save a mission, copy the resulting save file to the matching slot on another installation, and confirm it reloads with the correct name and mission details.

### Hoist too-low altitude callout

- During hoist operations with the boom extended, a voice warning now alerts the crew if the helicopter descends below a safe hoist altitude, repeating up to three times if the condition continues, and rearming once a safe altitude is regained.
- **Build history:** 0.997 168.148.
- **Test:** Start a hoist with the boom extended and descend below the safe altitude threshold; confirm the warning plays and rearms after returning to a safe altitude.

### Choice between livery and saved settings when loading

- When loading a save while a livery with its own settings is active, a dialog now lets the pilot choose whether to load with the livery's settings, with the settings stored in the save, or to cancel the load.
- **Build history:** 0.997 168.148.
- **Test:** Load a livery with its own settings, then load a save, and confirm the dialog offers the livery, saved, and cancel choices.

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
- **GitHub development checkpoint after 0.997 142:** P1-P3 ambulance-assessment consolidation and residential fire conversion to the standard fire (see Independent care for up to three patients, Residential fire is now handled by fire crews).
- **0.997 143-147:** Adjustable rotor safety threshold, vehicle route-recovery reliability, and clinical/handover groundwork for multiple patients.
- **0.997 148-155:** Settings and UI label corrections, crew acceleration LifeScore impacts, and default landing-spot repair.
- **0.997 156-159:** Country-name display, consolidated clinical handover, and crew LifeScore monitoring refinements.
- **Development checkpoint - P1-P3 crew and transport integration:** see Independent care for up to three patients.
- **0.997 160-167:** Hoist fatal-detection fix (see Crew safety scoring near hazards) and expanded troubleshooting diagnostics.
- **0.997 168:** Candidate delivery restoring five-minute-plus CPR stability, crew-fatality placement, and marshal restart recognition; runtime PENDING.
- **0.997 168.1-168.129:** Internal reliability hardening and trial builds; no separate final pilot-facing change beyond what is listed above.
- **0.997 168.130-168.147:** Independent multi-patient ambulance/HEMS choreography, rebuilt orange smoke marker, per-action RescueTrack attribution, the vehicle-circling fix, and corrected vitals/temperature display.
- **0.997 168.148-169.0 (this release):** Portable, self-contained save files, save disabled during active ground/hoist work, the hoist too-low altitude callout, the livery-vs-saved-settings load choice, expanded crew safety scoring (sustained fire, hoist ground-contact speed, sustained hoist overspeed/bank/excess load, aircraft crash, gradual recovery), corrected livery hints and full Reset to Default/Reset Stats coverage in Settings, the briefing screen reopening over an open menu, and the flickering dispatch location marker. Still to be confirmed in the simulator.
