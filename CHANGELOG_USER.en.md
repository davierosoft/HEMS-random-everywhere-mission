# HEMS Random Everywhere Missions - User Changelog

This changelog covers every final player-facing change from the July baseline: 0.997 1 through 0.997 142, plus every development checkpoint and release through 0.997 169.52. It is written for pilots: it explains what changes on the tablet and in the mission. Each feature appears once only, in its most relevant section.

It also covers the Mission Companion app up to version 0.23, which speaks the voices of the mission and updates itself and the mission.

The checks below are simulator checks. The changes recorded after build 142, up to and including 0.997 169.52, still need final simulator confirmation.

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
- An ambulance that stops far from the patient (an off-road patient, a road that ends far from the scene) no longer takes him: beyond 150 m between the parked ambulance and the patient the helicopter crew carries the patient and the ambulance crew simply leaves. Before, the tablet said the patient would go by ambulance and he stayed on the mountain.
- **Build history:** 0.997 10, 65, 169.46, post-142 checkpoint.
- **Test:** Start a three-patient call with two ambulances at different distances and follow both transport outcomes.

### Complete ambulance assessments

- Ground medics can assess every patient when time allows. When HEMS arrives late, it begins with the most urgent already assessed patient instead of missing records or showing an empty ambulance status. Each patient's identity, assessment and vital signs are now kept correctly separate at multi-patient incidents.
- **Build history:** 0.997 67, 77, 91, 104, 106, 127, 138, 146-147, post-142 checkpoint.
- **Test:** Land late at a multi-patient incident with one medic; check that each patient has an assessment or receives priority from HEMS.

### Realistic ambulance loading

- A patient selected for road transport is now prepared and moved as a stretcher patient. They no longer slide across the scene as if pulled by an invisible force, and the ambulance crew's walking and standing postures during loading are correct again.
- Once the patient lies on the stretcher the loading is carried through to the end even when a long ambulance leaves the stretcher a few metres from its centre or a walk raises an error: the ambulance no longer drives away with the patient left on the scene.
- **Build history:** 0.997 65, 91, 138, 168.130, 168.136, 168.144, 169.46, post-142 checkpoint.
- **Test:** Let an ambulance take a non-HEMS patient and watch the complete loading sequence before departure.

### Correct three-crew roles

- In a three-crew operation, the copilot remains the pilot throughout hospital unloading and only returns to the cockpit role when actually going back to the cockpit. Four- and five-crew operations follow the equivalent pattern, with the extra crew member(s) taking the correct standing, walking or crouching role instead of a pilot role.
- With three crew the copilot also keeps the pilot appearance during the hospital paperwork instead of turning into a crew member.
- **Build history:** 0.997 20, 27, 40-42, 118-122, 142, 168.139, 168.147, 169.45.
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

### Dispatch marker and briefing links

- The dispatch marker is drawn once and on the right place when the first location is not valid, and the Technical page and description links of the briefing now open with their full content.
- **Build history:** 0.997 169.1.
- **Test:** Open a dispatch whose first location is not valid and check for a single marker; open the Technical page and the description link from the briefing and verify the pages are complete.

### Second dispatch keeps one consistent scene

- A second dispatch now refreshes the accident location, so the scene, the landing spot, the ambulance and the flight plan destination are the same place, also for residential rescue calls and for custom or reloaded missions.
- **Build history:** 0.997 169.21.
- **Test:** Finish a call, accept a second dispatch (also a custom one after a reload) and compare the scene, the landing spot, the ambulance and the flight plan destination.

### Rescue vehicles arrive even without road routes

- When the route service does not answer, ambulances, police and fire engines no longer wait: after 90 seconds a random station is used, a route with no duration falls back to a direct drive, and in the legacy routing mode vehicles drive straight to the scene, the hospital or the midway point.
- **Build history:** 0.997 169.2.
- **Test:** Choose the legacy routing mode, or disable the route service, and verify that every vehicle reaches the scene, the hospital and a midway point.

### Tidy parking of rescue vehicles

- Fire engines, ambulances and police cars park in lanes by role without overlapping, with the police car backing up before parking on the fire side. After the last patient the medic stands down and returns to the station, and the ambulance retreat at the scene is a single movement.
- Ambulances now park on the left and fire engines on the right, never more than 4 m from the road. Fire engines never reverse, the ambulances reverse to make room for them and the police car moves last; the police car also foresees the worst case (a second fire engine, or a second ambulance with more than two casualties) when it chooses its lane. A fire engine no longer stops in the middle of the road without its firefighters when the road ends.
- **Build history:** 0.997 169.3, 169.22, 169.27.
- **Test:** Run a call with fire engine, ambulance and police car and check that nothing overlaps and that the medic returns to the station after the handover.

### Crash injuries reach everyone aboard

- Crash and hard-landing injuries now reach the pilot, the copilot, the rear crew and a patient on the stretcher, whatever the crew aboard. The severity follows the real loss of speed of the impact in several steps: touchdown speed and sudden speed loss are checked, spikes without a real change of speed and teleports are ignored, a crew member at zero is not revived, and an impact heavier than the previous one inside a chain of bounces is graded too. The damage of an impact to a patient aboard now stays on the patient's Life Score instead of being overwritten a moment later. Heavy impacts also cause aircraft failures, from the lightest to the heaviest as listed under the aircraft failures.
- The thresholds and the survival floors are unchanged.
- **Build history:** 0.997 169.4-169.17, 169.21, 169.26, 169.27.
- **Test:** Land hard, then bounce and crash on purpose; check the crew lifescores on the dispatch page after each impact and verify that a heavier hit right after a lighter one is applied.

### No early dispatch while a mission starts

- A new dispatch can no longer be handed out while the mission is still starting up, so a dispatch left over from the previous mission cannot open too early.
- **Build history:** 0.997 169.11.
- **Test:** Restart a mission right after finishing one and verify that no dispatch opens before the start is complete.

### Single or multiplayer selection message clears

- The single player or multiplayer selection message disappears as soon as the choice is made.
- **Build history:** 0.997 169.17.
- **Test:** Start a mission, choose single or multiplayer and verify that the message disappears.

### Police no longer takes the crew to the wrong place

- When the police drive the crew from a far landing spot, the crew now walks from the police car to the patient instead of walking all the way back to the helicopter and to the patient again, which could leave the mission waiting for ever. The police car also drives to the accident instead of appearing there and then driving away from the crew, which walked back to the helicopter.
- **Build history:** 0.997 169.27, 169.45.
- **Test:** Choose a custom landing spot far from the accident with police available, with three and with four or five crew, and follow the car and the crew to the patient.

### Crew no longer walks off after leaving the helicopter

- At a scene reached by the four-crew or five-crew procedure, the rear crew members no longer walk some 300 metres away and back before the first patient visit. They go straight to the patient.
- **Build history:** 0.997 169.43.
- **Test:** Land with four and five crew at a scene with a search-and-rescue quad bike or a distant patient and watch the first walk of the rear crew.

### Patients no longer die before anybody arrives

- Until the crew reaches the patient, and during the first 30 minutes of the call, a patient's Life Score now falls at half speed and never below 8, so a patient is no longer lost during a long flight to the scene. After the arrival the normal decay applies and patients can still die.
- A new medical setting freezes the Life Score completely until the helicopter is within 2 NM of the scene. It is on in the ROOKIE PILOT, EXPERT PILOT and EXPERT HEMS profiles and off in DEFAULT.
- **Build history:** 0.997 169.45.
- **Test:** Fly a long dispatch with the freeze off and on and read the Life Score on the dispatch page; run two missions in a row and check that the second patient starts with fresh values.

### Rescue vehicles approach along real road routes

- Ambulances, police cars and fire engines now follow three traffic routes generated for the scene, starting 420 to 520 m away and stopping at the rescue point. The parking points before the scene come from those routes, and when routes are not available the vehicles use the compass points at once instead of waiting.
- **Build history:** 0.997 169.35, 169.36.
- **Test:** Run road-incident calls and watch the three routes of the traffic and the parking of the vehicles near the scene; repeat in the legacy routing mode.

### Ambulance and HEMS no longer wait for each other

- An ambulance that stands down because the patient is assigned to HEMS now releases the HEMS operations, which no longer wait for it.
- **Build history:** 0.997 169.32.
- **Test:** Give a patient to HEMS while an ambulance is on scene and confirm that the HEMS work starts without waiting.

### Landing spot stays where you put it

- The default landing spot is created once and is no longer recreated every second and a half. After the injured are moved at the scene it is updated once, with its circle and icon, unless you chose another spot.
- **Build history:** 0.997 169.32.
- **Test:** Choose a custom landing spot, let the ambulance move the injured, and check that the spot does not move; repeat with the default spot.

### Hoist loading and ground operations as in the original

- The casualty is prepared for transport also for HEMS and is removed when it is hooked, the crew walks at the normal speed, and the destination and ground operations regain their original speeds. The hospital staff point at the correct spot and the ambulance stretcher point is back.
- **Build history:** 0.997 169.33.
- **Test:** Run a hoist pick-up and a ground pick-up and compare the loading and the walking speed with the earlier builds.

### Interior check and engine shut-down no longer stuck

- The interior check stuck at its step 12 and the engine shut-down waited for a value that never came. They now wait for the engines to be off, and the emergency locator steps read the switch correctly (armed, test, on).
- **Build history:** 0.997 169.39.
- **Test:** Complete the interior check and the engine shut-down and verify that neither stops before its last step.

### Boarding without a map-data answer

- When the map data service gives no answer, the search ends after 10 seconds. The crew then boards from a hangar created beside the helicopter, or spawns 40 m from it when there is no hangar location, instead of waiting for ever.
- **Build history:** 0.997 169.41.
- **Test:** Start a mission in a place without hangar data and verify that the crew boards.

### Dispatch statistics only when known

- The time to the scene, the on-site time, the total time and the injured on scene are shown only when they were set, they are cleared at every mission start, and a mission diverted by a crew emergency no longer writes the time of the rotor shutdown at the hospital as its time to the scene. A crew alone sets the total time at the hospital landing.
- **Build history:** 0.997 169.30.
- **Test:** Finish a normal mission and a mission diverted by a crew emergency and read the statistics of the old dispatch.

### Add-on detection

- The Organcooler and EU firefighter add-ons each set their own flag, so installing one no longer hides or enables the other.
- **Build history:** 0.997 169.27.
- **Test:** Run with only one of the two add-ons installed and verify the matching options.

### Long or stuck missions stay light

- The ground crew trace and the other troubleshooting records have a fixed size now. A mission left running or stuck for a long time no longer ends in an error from a record that has grown too large, and automatic snapshots stay small.
- **Build history:** 0.997 169.28.
- **Test:** Leave a stuck ground operation for an hour and check that the tablet still responds and the snapshot can be saved.

### No Windows Firewall question at every start of the app

- The Mission Companion app (0.9) now accepts connections only from this computer, which is all the mission needs, so Windows Firewall no longer asks to open the port at every start. The port 5997 is fixed by the simulator and cannot be changed. A new checkbox, Accept connections from other computers, restores the old behaviour for the rare setups that need it.
- **Build history:** Mission Companion app 0.9.
- **Test:** Start the app with the firewall active and verify that no question appears and that the mission still connects; tick the checkbox and restart to see the firewall question again.

### Second dispatch starts where it was offered

- The second and later dispatches are built on the location shown in their own preview. A search-and-rescue dispatch no longer starts on the spot of the previous mission, and a dispatch that has no rescue place or pickup point no longer gets the one of an earlier dispatch (a tester saw the second call 19 km from where it was announced).
- **Build history:** 0.997 169.46.
- **Test:** Fly a residential call, accept a mountain call and then a search-and-rescue call: each scene, map marker and search ring is where its own preview showed it.

### Ambulance crew and patients in every dispatch

- In the second and later dispatches the ambulance crew deploys and visits the patients as in the first one, and a patient is no longer skipped by both the ambulance and the helicopter crew because of a leftover of the previous dispatch (a tester had an ambulance parked beside a patient nobody visited).
- **Build history:** 0.997 169.46.
- **Test:** Accept a second dispatch with an ambulance and two patients: the ambulance medic appears after the ambulance parks, each patient is visited and both are transported.

### Fewer false errors during a dispatch

- A traffic car that has already reached its stop no longer raises an "object does not exist" banner, the search for a dispatch location no longer ends at the first slow answer of the map service (and the error shows the search radius instead of a placeholder), and the dispatch status no longer raises an error banner while the mission starts.
- **Build history:** 0.997 169.46.
- **Test:** Start several dispatches in a row, also with a slow map service: no error banner appears and the location is found.

### Hospital team speaks when the crew arrives

- At the hospital the call and the greeting of the hospital team now start when your crew meets the ground crew at the helipad, as the patient is handed over. Before, the team spoke after the handover message, when the patient was already unloaded.
- **Build history:** 0.997 169.47.
- **Test:** Deliver a patient to a hospital helipad and listen: the hospital team speaks while the crew and the ground crew meet, before the message that the patient was handed over.

### Search radius shown in the place-search warning

- When the mission cannot find a suitable place and widens the search, the warning now shows the radius it tried instead of an empty gap in the text.
- **Build history:** 0.997 169.47.
- **Test:** Start a dispatch in an area with few roads and read the warning on the tablet: the radius is written in meters.

### Skip paperwork no longer shows an error

- Pressing Skip paperwork at the hospital no longer ends with the message that the crew member does not exist: the crew member that walks to the hospital door is checked before every move.
- **Build history:** 0.997 169.49.
- **Test:** Deliver a patient to a hospital, press Skip paperwork while the crew member is walking and verify that no error appears on the tablet and the crew returns to the helicopter.

### One fire engine in the airplane emergency landing

- In the airplane emergency landing scenes the fire engine, the ambulance and the police that the scene places are the ones on scene: the mission no longer adds a random second fire engine, which ended with a duplicate object error, and you cannot call another one.
- **Build history:** 0.997 169.49.
- **Test:** Start an executive airplane emergency landing dispatch several times and verify that no Command Failed message about a duplicate object appears and that the three services are on scene.

### Injured icon at the injured in residential scenes

- In residential scenes the icon of the injured is now where the injured are (the accident location). Only with three victims and a fire, who are carried to the rescue location, the icon is at the rescue location.
- A tester reported that residential missions stopped at 43.5% with a Command Failed message on the tablet (build 169.51): the change of the icon asked the tablet to move an icon that was not on the map, so the icon is now removed and drawn again at the injured.
- **Build history:** 0.997 169.49, 169.52.
- **Test:** Start residential dispatches with one, two and three victims and compare the icon with the position of the injured.

### A reduced crew is spoken by the crew that is there

- With the Mission Companion 0.23 and a voice pack in text (not the recorded wav packs), the lines of a seat that the flight does not have are said by a crew member who is there, with that voice. Before, with three crew the lines of the HEMS1 (the chief) were spoken by a voice of someone who is not in the helicopter. A crew member who cannot speak is skipped. The recorded wav packs are unchanged.
- **Build history:** 0.997 169.52, Mission Companion app 0.23.
- **Test:** Fly with three crew and let the cabin preparation run: the lines of the chief ("Cabin preparation completed") are said by the doctor, not by a fourth voice. With four and five crew every seat speaks its own lines.

### The Mission Companion announces and installs its updates more reliably

- The Mission Companion checks for a new mission, program or voice pack at every start (before, it waited six hours after the last check) and reads GitHub only. Restarting the program and the uninstaller no longer run command-line tricks that an antivirus may flag.
- **Build history:** Mission Companion app 0.20, 0.21, 0.22.
- **Test:** Start the Mission Companion after a new release is published and verify that the Updates button turns amber and says what is new.

### The crew outside the helicopter is heard on the radio

- With the Mission Companion 0.16 and this mission the pilot, you, always counts as aboard from the end of the boarding to the deboarding, also when the pilot model is hidden by an option. With the crew outside the helicopter their lines are radio calls with the hiss, and with everybody aboard they are on the intercom; before, the crew outside spoke with a clean voice.
- **Build history:** 0.997 169.49, Mission Companion app 0.16.
- **Test:** Start the engines, let the copilot and the doctor leave and listen: the crew outside is heard on the radio with beep and hiss; with everybody aboard the lines have the click and the hiss of the intercom.

### Hospital handover: the medic no longer makes a useless walk

- At the hospital the medic who hands the patient over no longer makes the second walk towards the hospital stretcher when already standing next to it. A tester reported the medic walking away with the patient without handing it over (build 169.45); the cause is not proven, so the debug snapshots now also record where the hospital waypoints, the stretcher and the crew are, and the walk of the medic every 10 seconds.
- **Build history:** 0.997 169.51.
- **Test:** Deliver a patient to a hospital pad with the hospital crew on it: the medic hands the patient over next to the stretcher and goes back to the helicopter. If the medic walks away, send the debug snapshots.

## UI

### Persistent troubleshooting snapshots

- Troubleshooting now saves a clear snapshot of the current mission, route, crew progress, rotor progress and patient information. It can be reopened later or cleared deliberately.
- Troubleshooting also keeps a record that survives a second dispatch (cleared only when a new first dispatch starts), a record of ground operations that stop advancing, and, at every mission start, a copy of the snapshot of the previous mission in its own file, so the last snapshot is not lost when a mission ends badly or is restarted.
- Every police drive now leaves its own records (start, arrival with the seconds it took, error, timeout), and the patients leave records of what they start with, when they die and when their Life Score is held, so a patient who seems to inherit values from the previous mission can be recognised. The Debug Center no longer shows the obsolete test tracker and registry diagnostics, and the snapshot buttons and date are at the top.
- **Build history:** 0.997 92, 108, 110-112, 123-125, 169.21-169.23, 169.26, 169.31, 169.45.
- **Test:** Save a snapshot before and during ground operations, then reopen it from the troubleshooting page. Start a second mission and open the previous mission snapshot file: it must hold the snapshot of the mission before.

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
- During ground operations the second separator of the dispatch page becomes a grey progress bar, which goes back to a plain separator when the operations end; the percentage and the step are written in grey and only appear when Additional info is shown.
- **Build history:** 0.997 21, 59, 71-73, 100, 110, 169.26.
- **Test:** Run a ground operation and watch the grey bar replace the separator; switch Additional info off and on and verify that only the text appears and disappears.

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

### Shorter and clearer dispatch messages

- Dispatch and RescueTrack messages are shorter and more professional, with typos and unit ambiguity removed. Vital signs in patient messages are whole numbers, and the HEMS reports use the correct sender.
- **Build history:** 0.997 169.20, 169.24.
- **Test:** Follow a call and read the dispatch and RescueTrack messages: numbers must be whole and the sender must be the HEMS unit.

### Message clock in UTC or local time

- Messages show the time in UTC (suffix Z) or in local time (suffix L), as selected, with the estimated arrival as a clock time and the time of death kept in simulator time and shown on the medical page, which also has a short page for a person found deceased on scene.
- **Build history:** 0.997 169.21.
- **Test:** Switch the clock between UTC and local time and check the time of the messages, the estimated arrival and the time of death.

### Crew names and lifescores on the dispatch page

- The crew members are named Pilot, Medic, Copilot, HEMS 1 and HEMS 2 everywhere, and the dispatch page shows the lifescore of each of them just above the patient lifescores, hidden together with them.
- **Build history:** 0.997 169.24.
- **Test:** Open the dispatch page with 3, 4 and 5 crew, show the lifescores and check the names and the order.

### Clear mission failed report

- The MISSION FAILED button is red. The report names the deceased crew members (all of them or their number), shows the cause of death of a patient (piloting, clinical deterioration, hoist loss) and, after a crew death or a serious injury, the notice to the aviation accident investigation authority; a serious injury no longer raises an error on the tablet. A failed mission also shows its result, its cause, the seriously injured and deceased crew members and the deceased patients, and a mission that ended before the scene was reached says so.
- **Build history:** 0.997 169.11, 169.18, 169.26, 169.30.
- **Test:** Cause a crew death, a serious crew injury and a patient death in separate missions and read the end report each time.

### Crew critical and deceased rows

- Every crew member has a red CRITICAL row (1 to 10) and a red DECEASED row (0) on the dispatch page, which ignore the choice to hide the Life Scores. The crew is listed as Pilot, Copilot, Medic, HEMS 1 and HEMS 2 in the dispatch page, the end menu and the Debug Center, with the rows of the crew UNLOADED AT HOSPITAL. The CREW EMERGENCY question hides the dispatch page first.
- **Build history:** 0.997 169.30, 169.31, 169.32.
- **Test:** Make a crew member critical and another one dead with the Life Scores hidden and verify the rows, the order and the question.

### Crew emergency messages from the right sender

- Each RescueTrack message in a crew emergency comes from whoever knows the fact: the crew reports as -OUT- (critical or deceased member, mission aborted and diversion, confirmed hospital, patient handed over, patient deceased on board, deceased on scene with the request for the police, handover of the crew casualties with the accident cause), the fire service with its own call sign, and the dispatcher only answers after a crew report. The Divert or Continue question is no longer a message, and the handover report is posted once per mission.
- **Build history:** 0.997 169.30.
- **Test:** Cause a crew emergency with a patient aboard and read the senders of the messages.

### Visit estimate and progress text

- The estimate of the doctor's visit includes the deployment, the loading and the return, and is cleared when the crew diverts. The progress text of the ground operations is written under the grey bar.
- **Build history:** 0.997 169.27.
- **Test:** Start a doctor visit, read the estimate, then divert and check that it disappears.

### Simpler Mission Companion window

- The Mission Companion (0.12 and 0.13) shows only the main controls: Start and Stop service, the log and the language on the first tab, and a box Show advanced options in the footer shows the rest. The tabs are drawn in blue and stand out, and the master volume is now on the Volume tab. The Tools tab has two boxes, Work folder and Mission index.
- A new Updates tab opens when you press Check for updates, which moved to the footer. You choose to update both, only the mission or only the program. The button, the tab and the status line turn amber when something newer is published.
- The Test buttons of the app (voices, Piper voices, Radio effect) always play at full volume, also when the mission is not running or its volume is low, so a new installation can be set up.
- **Build history:** Mission Companion app 0.12, 0.13.
- **Test:** Start the app: the first tab is short; tick Show advanced options to see the rest; press Check for updates and verify that the Updates tab opens; press a Test button with no simulator running and hear it.

### Notification sounds

- The tablet alarm now plays only with the pop-up windows (mission failed, choose the destination, closest ambulance) and at a level of 70 at most. A new message from the dispatcher or the rescue services plays the new message tone again, which the Mission Companion did not play.
- **Build history:** 0.997 169.49, Mission Companion app 0.16.
- **Test:** With the Mission Companion, wait for a message of the dispatcher: the new message tone plays and not the alarm; open a pop-up window: the alarm plays, quieter than before.

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

### Crew emergency: divert or continue

- When a crew member becomes critical the tablet asks whether to divert to a hospital or continue the mission; a death diverts at once. The hospital of the call is proposed and can be confirmed or changed from the usual destination menu, and with no hospital found you choose one. A patient not yet loaded stays at the scene and the dispatcher sends another unit; a patient aboard is delivered at the same hospital with the normal procedure, and with a patient aboard the question is not asked at all, because the helicopter goes to the hospital anyway (it is still asked before the pick-up and after the delivery). A critical crew member no longer announces that the mission is aborted before you have answered.
- **Build history:** 0.997 169.25, 169.27, 169.29.
- **Test:** Make a crew member critical on the way to the hospital and with the patient not loaded yet: answer Divert once and Continue once, and confirm or change the hospital.

### Hospital handover of the critical crew

- At the hospital, once the rotor has stopped, one empty stretcher per critical or dead crew member is placed beside the patient's ground team and the crew members are loaded from their seats while the patient is handed over. Each stretcher then leaves for the hospital door, or for the ambulance, one at a time after the patient, following the hospital waypoints (the custom ones too). A medic who is a casualty stays in the seat and the paperwork is skipped for a casualty. No extra medic is created when the medic of the patient is there; otherwise one medic goes to the helicopter with the first stretcher, stands slightly aside toward the nose so that he does not overlap the casualty door, comes back with the stretcher when there is one casualty and follows the last stretcher when there are several. There is no ambulance unless you ask for it with the usual button, or the ambulance setting is forced; the police waits only when a crew member has died. The handover waits for the crew to be back in the seats before the casualties are counted, and the remaining pilot then flies back to the base.
- **Build history:** 0.997 169.25, 169.29, 169.30.
- **Test:** Divert with two critical crew members (one of them dead) to a hospital with and without custom waypoints, with and without the ambulance, and follow the stretchers to the door.

### Police and ambulance at the base after a crew emergency

- After a crew emergency, or when a crew member aboard is hurt (20 or less), the police car and the policeman wait at the base; an ambulance with medic and stretcher waits too if a crew member aboard is critical (10 or less). They walk to the helicopter, the critical crew is loaded, and the remaining pilot walks around the nose to the policeman. Then the end menu opens, and no new dispatch is possible.
- **Build history:** 0.997 169.24, 169.25.
- **Test:** Land at the base with a critical crew member aboard and with a crew member at 15: check the vehicles, the stretcher loading and the pilot walk, then the end menu.

### End of the mission under your control

- At the base the end menu is offered as soon as you land and the mission ends only when you press End Shift: nothing closes it automatically. End Shift and Reload save the automatic snapshot first, a second dispatch can be accepted while the crew is still walking and the crew goes back aboard from where it is, and the failure of the previous mission is not shown in the next one.
- **Build history:** 0.997 169.24, 169.25.
- **Test:** Land at the base, wait without touching anything, then press End Shift or Reload and accept a second dispatch while the crew is outside.

### Police and dispatcher reports after a death

- The police are requested when a person is found dead or dies at the scene, unless police are already there or on the way. New reports tell that a patient died on board, was handed over to the emergency department, that the fire service finds the scene safe or on fire and then out, that the police secured the scene, and the crew status with the role. A patient who dies on board is met by the police at the hospital.
- **Build history:** 0.997 169.19, 169.20, 169.24.
- **Test:** Let a patient die on scene and one on board and read the dispatch reports; check that the police wait at the hospital.

### Crew losses change the care and the mission

- A critical or dead medic stops the effect of the manual treatments. The mission ends when both pilots are dead or critical, with the right text, and after a crew death the next mission starts with the helicopter repaired and a new crew shift. The career statistics count crew deaths and patients killed by an impact.
- **Build history:** 0.997 169.11, 169.12, 169.18.
- **Test:** Lose the medic during a manual treatment, then lose both pilots in another mission, then start the next one and check the helicopter and the statistics.

### Aircraft failures from light to heavy

- The failures follow a severity order: APCP, autopilot, MGB chip, FADEC level 1, backup, FADEC level 2, fuel, hydraulic, T/MGB mechanical, engine failure and engine fire. A severe crash causes one or two failures from APCP up to an engine failure; the two heaviest crashes cause one failure from the fuel failures up to the engine fire. The new fuel leakage loses a constant 0.2 to 0.8 kg every 5 seconds (never more than 10 kg a minute) until the fuel ends or the helicopter is repaired. Eleven further failures join the list and the checklists: eight SEMA failures, as likely as the autopilot ones, and three fuel failures.
- **Build history:** 0.997 169.26, 169.35.
- **Test:** With failures enabled, crash at three severities and check which failures appear; trigger a fuel leakage and watch the fuel fall, then refuel.

### Hoist cable accidents

- An operator or a patient on the hoist cable can be hurt or killed: a hurt operator never drops under Life Score 20, an injured operator on the way down is released when the hook rests at the same height, and a fatal event either releases the hook or keeps the person (a dead operator on the hook comes aboard with the cable). Whatever lets go appears at the aircraft at that moment, as a dead person for the operator and as an injured person in the stretcher for the patient. A patient on the hook takes the impact. The medic is always crew member 2, the copilot is never hurt by the hook, and the second operator of four and five crew is member 4. The ground impact is graded at 8, 12 and 18 ft/s, so the normal descent of 5.7 ft/s costs nothing.
- **Build history:** 0.997 169.31, 169.32.
- **Test:** Hoist with a fast ground contact, an overspeed and a heavy load, with a patient and with an operator on the cable, and compare the outcomes; the thresholds still need tuning.

### Single patient sheltered in the ambulance

- When the weather or a hazard keeps HEMS away from a single patient, the HEMS doctor can visit the patient inside the ambulance. The sheltering, its monitoring, its release and its abort were rewritten.
- The sheltered visit works with three, four and five crew and with a ground, skid or hoist landing (it was limited to three crew by mistake).
- **Build history:** 0.997 169.31, 169.46.
- **Test:** Run a single-patient call in bad weather with an ambulance on scene and follow the doctor's visit and the release.

### Reset failures button

- A RESET FAILURES button next to the failure buttons clears the active aircraft failures, and the choice is read again at mission start.
- **Build history:** 0.997 169.31.
- **Test:** Cause a failure, press the button and verify that the aircraft is repaired.

### Search-and-rescue visual clues

- Random clues are placed around the victim inside the red search ring: a tent, a campfire, a bag, a bike, a dog, a quad bike, skis, a snowmobile, a rare second paraglider and a car parked on the closest road. When the location is entered by hand there is never a car or a road.
- **Build history:** 0.997 169.33.
- **Test:** Fly several search-and-rescue calls and look for the clues; enter a location by hand and check that no car appears.

### Custom search-and-rescue missions 65 to 68

- Four missions are available in the custom missions list: 65 overdue car, 66 parked car with a walking owner, 67 overdue quad rider and 68 person who wandered away from home. Only the walking owner carries a beacon. For mission 65 the dispatch shows the vehicle model and colour, the origin and the destination are marked by two icons joined by a straight line, the last contact point is the flight plan target, the dispatch page and its Open on map and Open on PC buttons use the last known position and its distance, and the patient lies on the driver side by nation. The car is moved to a random point of a 25 to 40 km route when the mission loads; a failed route, a manual location or a reloaded mission keep the normal search with its ring.
- **Build history:** 0.997 169.33, 169.34, 169.35.
- **Test:** Start each of the four missions, check the dispatch text, the icons and the last contact point, and then reload mission 65 from a save.

### Performance settings

- A PERFORMANCE section in the settings, kept in every aircraft profile, lets you choose the sampling of the impact monitor (fast, balanced, light), whether the monitor sleeps above 450 ft above ground and wakes below 400 ft or on the ground, and the log level (advanced or basic: basic drops the chatty trace rows, while snapshots and the crash event log stay complete). The factory values are fast, gate on, advanced for DEFAULT, EXPERT PILOT and EXPERT HEMS, and light, gate on, advanced for ROOKIE PILOT. With the crew health simulation off, the crash monitor waits for it to be switched on again.
- **Build history:** 0.997 169.33.
- **Test:** Change each performance setting, reload and check that it stays; crash with the gate on and off and compare the crew Life Scores.

### Flight manual checklists

- The tablet checklists follow section 4 of the flight manual (BK 117 D-2, Helionix Step 2) from the interior check to the engine shut-down, in full and with no step cut: interior check, quick start preflight, the additional pre-flight checks, after engine start with the heating system and avionics checks, before take-off, take-off check and procedure, pre-landing, landing and engine shut-down. Eight IFR procedures are included: preflight check and departure, OBS navigation, parallel track, holding pattern, ILS approach, LNAV or LP approach, LPV or LNAV/VNAV approach, and missed approach with vectors to final.
- No page is longer than 26 rows. Longer lists are cut at the headings of the manual, with PREV PAGE and NEXT PAGE links, and the next page of the same list opens 5 seconds after a page is complete.
- Steps with a readable aircraft state advance when the state is met, the others on a timer. Night flight preparation, the heating system check, the avionic test and the start-up after the interior check are choices between links and wait for you. The main checklist page lists every procedure with the title of the manual.
- Notes and cautions are read out with the next step, the spoken prompts are shortened so that a prompt ends before its step moves on, and the slope guidance appears beyond 12 degrees of pitch or bank.
- **Build history:** 0.997 169.37, 169.38, 169.39, 169.40.
- **Test:** Run the checklists from the main page in order, including one IFR procedure, a long list with PREV and NEXT, and the optional blocks.

### Dispatch status keys

- The status report to the dispatcher can be sent from the tablet keypad and from the CARLS digits 0 to 9. On the CARLS it works only on the home page with the radio connected and only for a status different from the current one; the CARLS shows its usual popup (Sending request, Request sent), the report is logged on the message page as a line of the crew (Status sent), and the tablet needs no confirmation any more.
- **Build history:** 0.997 169.40.
- **Test:** Send each status from the tablet and from the CARLS and read the message page; a held key may not repeat.

### Payload weights follow the people aboard

- The six payload stations now hold the people on the seats (copilot, pilot, PAX 1, 2, 3 and the stretcher with the patient), recomputed continuously and after a reloaded mission. During hoist work the weight stays while the person hangs on the cable and goes when the person touches the ground. A new option on the technical page, WEIGHT OF THE INSTALLED KITS (on or off, off by default, kept in the profiles), adds an estimate of the installed kits.
- **Build history:** 0.997 169.40.
- **Test:** Board and deboard with several crew and a patient and watch the stations; repeat with the kits option on.

### Mission Companion voice mode

- With the Mission Companion app (0.9 and the voice pack EN 7) the crew and the dispatcher speak with the voices of the app. The mission uses the voice code APP and follows the app every second, so it does not miss the reset that the simulator does at a flight load.
- Conversations: boarding, briefing and debriefing of the crew, and the dispatcher reading the dispatch. The briefing and the objective differ for each kind of mission, and a short exchange with the dispatcher at the briefing includes the presentation of the crew and, when the police drive the crew, where the crew will be left. The dispatcher names the rescue vehicles in one sentence, and a five-line approach briefing before the arrival tells whether the hoist is expected and which vehicles are on scene. The message tone of the app is gone because the tablet plays its own.
- Updates follow the news instead of a question every minute: the pilot hears the ground team when the team has an update, and chats with the people aboard only when nobody is alone and there is silence. There are also reports of the ground operations for a dead patient, reactions to a death and to a hard landing, the hospital call, handover and marshal notice, and cruise and small talk. The dead and the badly hurt crew do not speak.
- Every message has six options, one default, two professional and three colloquial, so repeated calls do not sound alike.
- **Build history:** 0.997 169.41, 169.42, 169.43, 169.45.
- **Test:** Fly a mission with the app and listen to the boarding, the briefing, the approach and the debriefing; check that a long flight has no question every minute and that a dead crew member stays silent.

### Crew chatter setting

- The setting CREW CHATTER (FULL, REDUCED, MINIMAL) controls how much the crew talks, and is kept in the profiles.
- **Build history:** 0.997 169.45.
- **Test:** Fly the same dispatch with each level and compare how many cruise chats and updates are spoken.

### Male or female technician

- The technician of each scene (start of a flight, fuel truck, arrival at the base) is male or female, picked at random. The app speaks the technician lines with the voice of that technician, and the crew greetings use the technician's name. With the wav voice packs the technicians stay as before. The user action to tell the technician that you arrived and the fuel text in the settings no longer name Sarah and Frank.
- **Build history:** 0.997 169.44.
- **Test:** Start several flights and check that the technician changes sex, voice and name in the greetings.

### Clean-up of the app work folder by category

- The Clean-up button of the app lists what it will delete in three groups, and you choose which ones: Safe to delete (debug), R&E configuration files (resets saved flights or profiles) and User settings (use it to go back to the defaults, or if the mission does not start). The global settings file is in the last group: it holds the variables of all the missions and sometimes becomes corrupt and blocks the mission, so this is the usual reason to use the button. Each group asks for a confirmation with its own warning.
- **Build history:** Mission Companion app 0.9.
- **Test:** Open Clean-up, check that the three groups and their sizes are listed, delete only the debug group, and verify that the saved flights and the settings are still there.

### Setup program for the app

- The app comes with its own installer, which installs it, creates the desktop and start menu shortcuts and can remove it again. It supports a silent installation, a chosen folder, no shortcuts, no launch at the end and an uninstall that can also remove the data.
- **Build history:** Mission Companion app 0.9.
- **Test:** Install in a new folder, start the app, then uninstall and check that nothing is left.

### Quieter app voices

- The app understands the CREW CHATTER setting of the mission and speaks fewer cruise chats at the reduced and minimal levels. A message option that is empty is a real silence: nothing is sent to the voice. A muted crew member (dead or badly hurt) does not speak.
- **Build history:** Mission Companion app 0.9.
- **Test:** Set each chatter level in the mission and compare what the app speaks; verify that a dead crew member stays silent.

### Updates from the Mission Companion

- The Tools tab of the Mission Companion (0.10) checks for a newer mission file and a newer program when it starts (at most every six hours, it can be switched off) and on the button Check for updates. The check only reads: it tells you with a notification, and nothing is downloaded before you answer the question.
- The question is a window with the release notes of what is newer, with Download and install and Not now. The mission file is replaced first (the old one is kept in the backups folder) and the mission index is updated; then the program updates itself and starts again. The button What's new shows the notes of the latest releases at any time.
- **Build history:** Mission Companion app 0.10.
- **Test:** Publish nothing: press Check for updates and What's new; with a newer release the question shows its notes and Not now closes it without downloading.

### Radio, intercom and voices by distance

- With the Mission Companion 0.12 the sound follows where people are. The intercom of the helicopter has a click and the hiss you set; a radio call has the beep and a little more hiss; a call from an external radio, such as the dispatcher or the hospital, has a double beep and more hiss. The dispatcher is heard with the battery on, or when the helicopter is at its start base, and not otherwise. The crew carries radios and is heard with the battery off too.
- Technicians, ground units and patients speak by voice: heard normally up to 30 m from the helicopter, very low up to 100 m, and not beyond, while someone is aboard. When nobody is aboard everybody is outside together and the voices keep their normal level. A technician next to the helicopter with the pilot aboard and the battery on speaks over the intercom.
- The Radio effect tab of the app explains the three sounds and has four test buttons.
- **Build history:** 0.997 169.47, Mission Companion app 0.12.
- **Test:** With the app and the mission, listen to the dispatcher with the battery on and off at the base and away from it; walk away from the helicopter with the crew outside and listen to the technician at 10, 50 and 150 m.

### Translated voice packs

- The checklists (377 spoken rows) and the readings of the dispatch description by the dispatcher now exist as keyed texts, so a voice pack in another language speaks them too, and the voices no longer mix English and the new language. A pack without a text speaks it in English and the log of the app says so.
- The Voice packs tab of the Mission Companion 0.13 compares every pack with the base pack EN: a pack with missing texts, made for another version of the base pack or too old for the mission is shown in red, with the count and the first keys. The button New translation writes the base pack as a file to translate, and Add missing texts adds the new English texts to your pack after an update. The active pack of the tab is used for every spoken line of the mission.
- The texts on the tablet, the buttons and the names of places stay in English, and the voices must be chosen in the language of the pack.
- **Build history:** 0.997 169.48, Mission Companion app 0.13.
- **Test:** Install a pack with a few translated checklist rows, choose it in the Voice packs tab and start a checklist: the translated rows are spoken in your language and the others in English; check that a pack with missing texts is shown in red.

### The crew decides before you accept a dispatch

- With the Mission Companion, when a dispatch arrives the dispatcher reads it and the crew talks first: the copilot asks the crew what to do; with a second dispatch the copilot also checks the fuel against the low-fuel limit you set, the doctor and the rear crew check the health and the equipment, and the copilot asks you whether to take it (or to go back to base if the fuel is low or you already flew two missions). Only when you accept the dispatch on the tablet you talk to the dispatcher and the crew briefing starts. If you do not answer for a minute the dispatcher asks for an answer, and if a new dispatch arrives meanwhile the dispatcher tells you the old one was reassigned and reads the new one. Needs the Mission Companion 0.18 and its voice pack EN 12.
- **Build history:** 0.997 169.50, Mission Companion app 0.18.
- **Test:** Wait for a dispatch with the Mission Companion running: after the dispatcher the copilot asks the crew and then you; nothing more is said until you accept on the tablet, then the briefing follows. Do not accept for a minute to hear the dispatcher ask for an answer; wait for the next dispatch to hear that the old one was reassigned. Repeat after a mission to hear the fuel, equipment and health checks, and with the fuel under your limit to hear the question about returning to base.

### Vehicles and hospital spoken by the crew

- Approaching the scene the crew says in one sentence which rescue vehicles are on scene and which are on the way, instead of one short line for each vehicle. When the hospital is proposed on the tablet the doctor says its name, and when no hospital is found the doctor says that the destination must be chosen by hand. Needs the Mission Companion 0.16 or later and its voice pack EN 11.
- **Build history:** 0.997 169.49, Mission Companion app 0.16.
- **Test:** Approach a scene with an ambulance on scene and a fire engine on the way: the crew says both in one sentence; with a hospital in range its name is spoken, in a remote place the doctor says that no hospital was found.

### Audio output devices and levels

- The Volume tab of the Mission Companion 0.17, with Show advanced options ticked, has the group Audio output: a device and a level for the headset (intercom, radio calls, the dispatcher and the notifications, also with the helicopter off) and for the voices in the air (technicians, ground unit, patient, crew outside), and a separate level for the notifications. The default is the Windows default device and every level at 100, so nothing changes if you do not use it. A Test button for each.
- **Build history:** Mission Companion app 0.17.
- **Test:** Choose another output device for the headset, press Test and hear the sound there; lower the level of the notifications and verify that the ringtone and the new message tone are quieter and the voices are not.

### Settings profiles and setup in one click

- The Service tab of the Mission Companion 0.19 has a Settings profile group: Set up in one click applies the recommended voices, radio and volumes and downloads the Piper engine and voices they need (about 530 MB), keeping a copy of your settings; Save settings to a file and Load settings from a file keep and share your voices, speeds, radio, volumes and options (folders, audio devices and the port are not saved). The installer offers a complete setup that does the same on a new install.
- **Build history:** Mission Companion app 0.19.
- **Test:** Press Set up in one click on a PC without the Piper voices and wait for the downloads: the program restarts with the recommended voices. Save the settings to a file, change a voice, load the file and check that the voice is back.

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
- **0.997 168.148-169.0:** Portable, self-contained save files, save disabled during active ground/hoist work, the hoist too-low altitude callout, the livery-vs-saved-settings load choice, expanded crew safety scoring (sustained fire, hoist ground-contact speed, sustained hoist overspeed/bank/excess load, aircraft crash, gradual recovery), corrected livery hints and full Reset to Default/Reset Stats coverage in Settings, the briefing screen reopening over an open menu, and the flickering dispatch location marker. Still to be confirmed in the simulator.
- **0.997 169.1-169.26:** Dispatch marker and briefing fixes, consistent second-dispatch scene, vehicle arrival without road routes and tidy parking, reliable crash detection with injuries for everyone aboard and aircraft failures from light to heavy with a fuel leakage, crew losses (medic, both pilots, repair after a death), clearer dispatch and RescueTrack messages with the selectable clock, crew names and lifescores on the dispatch page, the mission failed report, police and dispatcher reports after a death, the crew emergency (divert or continue, hospital handover, base scene), end of the mission under your control, the grey progress bar, and the previous mission troubleshooting file. Still to be confirmed in the simulator.
- **Mission Companion app 0.9-0.19 (this release):** No firewall question at every start, the Clean-up by category, the setup program, and the chatter level, the silent options and the mute of the dead crew, then the update check with its release notes window for the mission and for the program. Then the simpler window with the Updates tab and the choice of what to update (0.11, 0.12), the sound rules of the radio, the intercom and the distance (0.12), and the translated voice packs with the comparison against the base pack (0.13). Then the radio rules that count the pilot as aboard, the new message tone and the quieter tablet alarm, the vehicles and hospital spoken in one sentence (0.16), and the audio output devices and levels (0.17). Then the decision of the crew on a new dispatch and the pilot always counted from the mission (0.18). Then the settings profiles, the setup in one click and the complete setup of the installer (0.19).
- **0.997 169.27-169.51 (this release):** Scene parking by lane and the police drop-off fixes, the crew that no longer walks off, patients protected before the arrival with the optional Life Score freeze, crash damage kept on the patient, the crew emergency refinements (no question with a patient aboard, hospital handover of the casualties, senders of the messages, critical and deceased rows), dispatch statistics only when known, light long missions, hoist cable accidents and sheltered single patient, the reset failures button, new search-and-rescue clues and missions 65 to 68, performance settings, road routes for the rescue vehicles, the flight manual checklists with the IFR procedures, the dispatch status keys, payload weights, the Mission Companion voice mode with crew chatter and the male or female technician, then the second dispatch built on its own location, the ambulance crew and patients in every dispatch, the distant ambulance that no longer takes a patient it cannot reach, the loading that is carried through, the sheltered patient for every crew, and fewer false errors. Still to be confirmed in the simulator. Then the hospital team that speaks when the crew meets the ground crew and the radius shown in the place-search warning (169.47), and the keyed checklist and dispatch texts for translated voice packs (169.48). Then the tablet alarm only with pop-ups, the pilot presence for the radio rules, the vehicles and hospital messages, and the fixes of Skip paperwork, the airplane fire engine and the residential injured icon (169.49). Then the decision of the crew before you accept a dispatch, the dispatcher asking for an answer and the reassigned dispatch (169.50). Then the hospital handover walk that is skipped when the medic is already at the stretcher and the diagnosis of the hospital waypoints (169.51).
