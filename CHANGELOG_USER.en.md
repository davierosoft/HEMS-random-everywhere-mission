# HEMS Random Everywhere Missions - User Changelog

This changelog covers every final player-facing change from the July baseline: 0.997 1 through 0.997 142, plus every development checkpoint and release through 0.997 169.72. It is written for pilots: it explains what changes on the tablet and in the mission. Each feature appears once only, in its most relevant section.

It also covers the Mission Companion app up to version 0.37, which speaks the voices of the mission and updates itself and the mission.

The checks below are simulator checks. The changes recorded after build 142, up to and including 0.997 169.72, still need final simulator confirmation.

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

### Tips of the crew about the functions of the mission

- During the long legs of the flight the crew now sometimes tells a short tip about a function of the mission that pilots may not know, with the Mission Companion 0.24 and a voice pack in text (not the recorded wav packs). Eleven tips come one after the other, without repeating until all were told: the three save slots and the autosave, the mission list presets, the user settings profiles, the crew health simulation, the weight of the installed kits, the Quick links of the dispatch page (with the medical page), the Debug center snapshots to post on Discord, the medical options, the helicopter failures, the Crew chatter setting and how to switch the tips off.
- The tips have their own setting, CREW TIPS (Settings, Audio options, TIPS ON or TIPS OFF), independent from CREW CHATTER and kept in the profiles. With the small talk reduced or minimal you still get the tips until you switch them off; they are not told with a crew emergency, a hurt crew member, a dying patient or after a death. Because of the new tips the small talk of the cruise is a little less frequent.
- **Build history:** 0.997 169.53, 169.54, Mission Companion app 0.24.
- **Test:** Fly a dispatch with the Mission Companion and listen to the long legs: a tip should come in about four legs out of ten. Set TIPS OFF and check that no tip is told while the small talk continues; set CREW CHATTER to REDUCED with TIPS ON and check that the tips continue.

### The mission update works with an encrypted Community folder

- The Mission Companion (0.11) replaced the mission file of an encrypted Community folder (Windows EFS) with the error "the specified file could not be encrypted" because the backup was made in a folder that cannot hold an encrypted file. The backup and the new file are now written as plain bytes and nothing is replaced when something fails.
- The update writes only the official mission file of the package (everywhere_all in its RANDOM AND EVERYWHERE folder). Your test copies beside it are listed in the Tools tab but never chosen by themselves. The backup of the old file stays beside it, named everywhere_all with the release and the time and ending in .bak, an ending that the mission index does not take for a mission.
- **Build history:** Mission Companion app 0.11.
- **Test:** Update the mission with a Community folder that is encrypted (or from OneDrive): the file is replaced, the old one stays beside it with the ending .bak and the index lists no extra mission.

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

### The ambulance no longer drives off with a patient who needs the helicopter

- The ambulance now takes a patient away only when the patient is declared ambulance-only (Life Score above the upper threshold of the settings), or after the helicopter crew has visited the patient. With the option to always use the helicopter, or with a low Life Score, the ambulance waits for the helicopter. When it does leave with a patient, the tablet, the RescueTrack list and the dispatcher tell it, and when the ambulances take every patient the dispatch is cancelled before or after your landing, so the helicopter is no longer left on an empty scene waiting for a patient who is already gone. Reported by Daikan on build 169.54.
- **Build history:** 0.997 169.55.
- **Test:** Start a dispatch with a patient above the upper Life Score threshold and let the ambulance arrive first: it loads, its departure is announced and the dispatch is cancelled. Repeat with a Life Score below the lower threshold, or with the always-by-helicopter option: the ambulance stays until you load the patient.

### Doors open for the heli rescuer and for the crew coming back

- Before a heli rescuer is lowered, and when the crew gets back on board, the cabin door is opened first if it was closed. Doors that are already open stay open.
- **Build history:** 0.997 169.55.
- **Test:** Close the right cabin door, then lower a heli rescuer by hoist and by ground operation: the door opens before the cable moves. Deliver a patient to the hospital with the door closed: the crew gets back on board through an open door.

### Heli rescuers left at the hospital walk to it

- The heli rescuers left at the hospital no longer stand in front of the helicopter: after the farewell they walk to the hospital along the same route points as the paperwork. The "cabin ready" message is no longer given when nobody is aboard.
- **Build history:** 0.997 169.55.
- **Test:** Choose to leave the heli rescuers at the hospital: after the farewell they walk to the hospital door. With nobody left in the cabin there is no "cabin ready".

### Vehicles on the way are said once

- Two miles from the accident the dispatcher says which vehicles are on scene and which are on the way, and the doctor confirms in one sentence. A third line, "on the way to the accident site", repeated it; it is no longer said when the Mission Companion speaks.
- **Build history:** 0.997 169.56.
- **Test:** Fly towards a call with an ambulance or police still on the way: after the dispatcher and the doctor there is no third line about the vehicles.

### The pilot no longer uses the radio to talk to the technician

- At the boarding the lines of the crew said to the technician next to the helicopter (greetings, thanks, fuel, the logbook) are now spoken by voice, or on the intercom if the technician is next to the helicopter and the battery is on, never as a radio call. This works with the Mission Companion 0.26 and a voice pack in text.
- **Build history:** Mission Companion app 0.26.
- **Test:** Board and answer the technician: the pilot greeting has no radio beep.

### A new dispatch with the crew away is only a sound

- When the crew has left the helicopter after the deboarding (even if you stay in the seat), a new dispatch is announced only by the tablet sound: the dispatcher and the crew do not speak. The voices come back when a crew member is on board again. This works with the Mission Companion 0.26.
- **Build history:** Mission Companion app 0.26.
- **Test:** Deboard the crew, wait for a new dispatch: only the tablet sound is heard. Board the crew again: the lines return.

### The voice of the technician follows the technician

- When the technician next to the helicopter is a woman, her lines are said with a female voice, and a male technician is heard with a male voice, also when you have not chosen a voice for the two technicians (before, the voice was taken from the list by number and could be the wrong one). This works with the Mission Companion 0.27.
- **Build history:** Mission Companion app 0.27.
- **Test:** Remove the voices chosen for the technicians in the Actors tab, start several flights and listen to the technician at the boarding and at the base: a woman is heard with a female voice and a man with a male voice.

### Search and rescue missions no longer lock after using the mission list

- If you opened the mission list, changed the preset, switched a category or applied a linked profile after a dispatch had been drawn, a search and rescue mission could lose its search-and-rescue state: no route was loaded (the destination of the previous mission stayed in the navigation), no landing spot appeared, the hoist option never came and the ground operations did not start. The state is no longer overwritten.
- **Build history:** 0.997 169.58.
- **Test:** Draw a search and rescue dispatch (for example Lost contact with helicopter), then open the mission list, change the preset or toggle a category, accept the dispatch: the route to the last known position is loaded, the landing spot appears when you find the injured and the hoist option is offered.

### The tablet tones are always there

- The sounds of the tablet (new dispatch, new message, alarm) and the tone of a patient who dies were played from the audio folder of the Mission Companion, which was empty on a new installation: the log said "sound file AND.NEW.MSG.wav is not in the audio folder" and the new dispatch arrived without a tone. The 8 sounds are now part of the program: it copies the missing ones into the audio folder, at the start and before playing, and never replaces a file you put there. This works with the Mission Companion 0.28.
- When the port 5997 is busy (for example by the original audio service of the helicopter add-on) the log and the Service label of the program say which program holds it, and no question window opens at the start of the program. The voices of the missions in app mode do not need that port.
- **Build history:** Mission Companion app 0.28.
- **Test:** Start the program on a new installation (or with an empty audio folder): the audio folder gets 8 files. Wait for a new dispatch in the simulator: the tone is heard and the log has no sound file warning.

### The crews walk at a normal pace

- In many scenes the crew and the hospital staff walked very slowly (down to half a kilometre per hour in the organ transport, two kilometres per hour with the stretcher to and from the patient, three with the stretcher in the crew emergency and at the hospital): a walk of five metres took about ten seconds. All the walks that are longer than about two metres now go at a normal walking pace, at least as fast as in the original mission (the very short steps next to the helicopter stay slow). Ambulance, police and fire engines park at five kilometres per hour instead of two or three.
- **Build history:** 0.997 169.59.
- **Test:** Fly an organ transport and the other missions with a ground crew: the crew walks to the patient, to the stretcher and back at a normal pace, and the ambulance parks without crawling.

### The heli rescuer is left before the mission can end

- With a heli rescuer aboard, after the patient has been handed over at the hospital the mission no longer offers END MISSION or RECEIVE NEW DISPATCH. It asks where to leave the heli rescuer(s): here (they walk to the hospital), at the loading point (then the route goes on to the base) or at the home base (the question comes back after the landing, before the end menu). Only when nobody is aboard any more the usual question about the end of the mission comes, with the choices of the place where you are.
- **Build history:** 0.997 169.59.
- **Test:** Pick up a heli rescuer, bring the patient to a hospital and land: the question about the heli rescuer comes first; after leaving him the usual "Mission accomplished" follows.

### The NEXT DISPATCH button is released after the waiting time

- With some settings (a tester used the data service option 1) the NEXT DISPATCH button stayed grey for good after pressing it once. The button is locked when the new dispatch is requested and released by a timer after the waiting time (10 seconds with the option 3, 25 seconds more for each request with the others); the lock and the waiting time were set after some other work (saving the previous dispatch and the diagnostics), so the timer could release the button before it was locked and the lock then stayed. The lock and the waiting time are now set at once, before anything else, as in the original mission. The two waiting times (25 and 10 seconds) are now the global variables NEXT_DISPATCH_COOLDOWN and NEXT_DISPATCH_COOLDOWN_FAST, created with those values when missing: testers can change them there.
- **Build history:** 0.997 169.60.
- **Test:** Press NEXT DISPATCH on the dispatch page, with the data service option set to 1 and to 3: the button is grey during the waiting time and active again afterwards, every time.

### The heli rescuer meets the crew at the skid point

- When you land on skids, the heli rescuer no longer walks toward the helicopter and boards late. He goes back to the skid point, waits for the crew there, the crew wait for him and follow him to the scene; while the patient is brought back he tidies the scene and returns to the skid point to board last. On an avalanche call the four scene points are now placed again around the position where the injured person is found. The heli rescuer is still optional: without him nothing waits.
- **Build history:** 0.997 169.61.
- **Test:** Land on skids with a heli rescuer aboard (also on the avalanche call): he returns to the skid point, the crew wait for him and walk together, and he is the last one to board.

### A skid landing no longer stops when the patient is deceased or goes by ambulance

- A tester's call stopped for good after a skid landing: the patient was deceased, the crew were never collected and the mission waited without an end. The mission now asks for the transport of the patient only when there is one, waits until the patient is taken by the helicopter, an ambulance or the ambulance doctor, and says what to do: "Patient is deceased, no transport is needed. Return to the skid landing area to pick up the cabin crew". If you land outside the landing spot the crew do not go beyond it: the tablet asks you to come back inside the lime area and land on skids to pick them up.
- **Build history:** 0.997 169.61.
- **Test:** Land on skids at a call where the patient is deceased, and at one where an ambulance takes the patient: the crew return to the skid point and the mission goes on; land outside the lime area and read the message.

### Heli rescuer and crew meet beside the helicopter in a hover or hoist operation

- In a hover or hoist operation a meeting point is placed beside the helicopter when it is steady: the heli rescuer waits there for the crew and the crew wait for him, then he tidies the scene, waits for a steady hover inside the landing spot (or for you to land) and returns to the meeting point before the pick-up; before he walks to the helicopter the hover must be steady again.
- **Build history:** 0.997 169.61.
- **Test:** Do a hoist operation with a heli rescuer aboard: the crew go down on the cable, he waits for them at the meeting point and they work together; after the patient is hoisted he returns and is picked up.

### Search and rescue calls do not tell what nobody knows

- In every search and rescue call the dispatch keeps its description, the number of persons, the age and the sex (what the person who reports can know), and says "person" instead of "injured": nobody knows that the missing person is hurt. The consciousness, symptoms and pathology are no longer shown on the tablet or in the dispatcher update: the medical information comes from the crew when they reach the person. The driver or rider of the missing vehicle calls (65-67) is always an adult.
- **Build history:** 0.997 169.61.
- **Test:** Accept a search and rescue call (for example the missing driver, 65): the tablet and the dispatcher speak of person(s) with age and sex only, without medical details.

### The route search call no longer announces an area

- On the missing driver call, which has no search area but only a road, the message "We are entering the designated search area" is no longer sent: it also gave away the distance to the vehicle. The calls with a search circle keep it.
- **Build history:** 0.997 169.61.
- **Test:** Fly the missing driver call (65): no area message; fly a call with a search circle and hear it on entering the circle.

### The voices after accepting a dispatch no longer queue for more than a minute

- After accepting a dispatch about a dozen voice lines (the dispatcher, the briefing, the cabin) arrived together and were spoken one after the other for more than a minute. The Mission Companion 0.32 plays four kinds of voice in parallel (radio, crew, checklist, sounds), never one actor twice at once; the lines have a priority and an age: late call-outs and hover numbers are dropped, a "cabin preparation" line still waiting is dropped when the cabin is ready, two identical call-outs in the queue keep only the last, and a checklist is never delayed by the others. On a log of a real call the longest wait fell from 54 to 22 seconds. The option OverlapLanes in the settings file (false) goes back to one line at a time.
- **Build history:** Mission Companion app 0.32.
- **Test:** Accept a dispatch with the crew aboard: the dispatcher and the crew briefing overlap and the whole burst ends in about half the time; start the engines while the crew talks: the checklist is read without waiting for them.
### The clinical record of a patient nobody has visited agrees with itself

- Before the crew visits a patient, the record no longer says UNKNOWN for everything while the rescue team message gives age, sex and consciousness. It now shows "Patient: UNKNOWN, age, sex" (the name stays unknown) and "Status reported by the rescue team" with the consciousness reported (in search and rescue calls the state stays unknown). The symptoms are told only when they are known: "Symptoms: NO INFO" is gone from the messages, and the medical update of the ambulance uses the symptoms for the second and third patient too (it used the name of the illness). The diagnosis is a row of its own and appears only after an assessment.
- **Build history:** 0.997 169.62.
- **Test:** Let the ambulance arrive before you do and open the patient record: age and sex are shown, the symptoms are missing when nothing is known, the diagnosis appears after the ambulance assessment is finished.

### The dispatch text agrees with the patient: sex and age

- A dispatch that names a sex now gives that sex (mother, father, husband and now wife, saleswoman) and the wording that was only a pronoun is neutral ("the person", "angler", "the worker"). The quad rider and the tractor farmer can now be a woman ("her quad"), and the husband call has its wife version. The patient's age follows the activity: workers, farmers, quad riders, climbers and hunters are adults up to 65 or 75, motorcyclists up to 67, paraglider pilots up to 70, skiers 15 to 70, students 12 to 19, the young patient of the doctor 18 to 35; a second or third patient follows the same limits.
- **Build history:** 0.997 169.62.
- **Test:** Fly several quad, tractor, student, worker and apartment calls: the name and model of the person match the words of the dispatch and the age is plausible.
### A failed search of the hospital entrance is shown as a temporary error

- During the ground operations the tablet could show "ERR101 FAILED to find a suitable location ... Please report the error to the dev" while everything went on normally. It was the first of several searches for the hospital entrance (emergency entrance, then the hospital, then any building, then a fixed point): when one finds nothing, the mission simply uses the next one. The message now says "Temporary error: ERR101 ... If this message stays more than 40 seconds, please check the location", and it is replaced by "Location found" as soon as a search succeeds (or by "Location set on a backup point" when the hospital search ends on the fixed point). The same holds for the searches of the home base hangar and of the police, fire and ambulance stations. A search that really has no alternative (the pitch of a search mission) keeps its error. Nothing changes in how the mission goes on.
- **Build history:** 0.997 169.59.
- **Test:** Fly a mission with a hospital that has no marked emergency entrance and handle a patient: if the message appears it is a temporary one and disappears by itself.

### The update closes the old version reliably

- Updating the Mission Companion while it is running could fail with "failed to kill the old version", again and again. The update now closes every copy of the program, wherever it was started from, waits until its files are free and, when Windows does not allow it, asks for administrator permission and tries again. If it still fails, the message says why and where the log is. Starting the program a second time now shows the window that is already open instead of doing nothing, and the program closes within a few seconds when asked to exit. The voice service and the link with the simulator start earlier, so after a restart the crew voices come back sooner.
- **Build history:** Mission Companion app 0.29.
- **Test:** Update the Mission Companion from its own window while the simulator and a mission are running: the update completes and the new version starts by itself; start the program a second time: the open window comes to the front.

### The program no longer keeps the port busy after an update

- After updating the Mission Companion from its own window, the new version could say "Port 5997 is busy" and name a program that no longer existed; closing and opening the Companion again cleared it. The old program stopped the service and closed, but the setup and the new program inherited a copy of the open port and kept it. The port is no longer passed on to the programs the Companion starts, and the setup starts the new version in a way that passes nothing on. Updating from 0.30 or older to 0.31 can still show the message once: close and open the program.
- **Build history:** Mission Companion app 0.31.
- **Test:** With the service on, update the Mission Companion from its own window: the new version starts with the service running and no "Port busy" line in the log.

### The crew briefs the heli rescuer

- When the heli rescuer boards, the briefing is no longer one sentence said by the wrong person. It is the crew who explains the mission to the rescuer: the pilot says what kind of mission it is and how many injured are reported, the copilot gives the time to the scene and the ground units that are there or on the way, the doctor says what is known medically and what is needed from the rescuer, and the rear crew chief (the copilot with a small crew) explains the two sequences. On the ground: the rescuer leaves first, secures the area and calls it, the crew follows on that call, the rescuer boards last. With the hoist: the rescuer goes down first on the cable, the crew follows on his call, the rescuer is the last one up. The pilot decides on scene which of the two it is, and says so again two miles out.
- With CREW CHATTER on FULL the briefing is a real conversation: the pilot asks for questions, the rescuer asks one now and then (who gives the go after the area is secure, what to do with a hazard or more patients, what is needed on the ground), the doctor or the copilot may voice a doubt, and the rescuer and the crew read back their tasks. The lines change at every mission. With a shorter chatter level only the main parts are said, and with less than five minutes to the scene the briefing is shortened. For a patient transfer or an organ transport the rescuer is told that there is no scene and what to do in the cabin.
- The rescuer's lines are said with his own voice through the intercom. This works with the Mission Companion 0.29 (voice pack EN 17).
- **Build history:** 0.997 169.59, Mission Companion app 0.29.
- **Test:** Pick up a heli rescuer and fly toward the scene with the Mission Companion running: the crew briefs the rescuer with the situation, the roles and the order of the ground and of the hoist operations; repeat a few missions to hear different questions and answers.


### The police car no longer keeps the crew waiting

- When the police drive the crew from the landing spot to the patient, the car no longer waits at the scene for as long as the crew took to walk, and the second officer is driven to the scene only when he is far from it. The crew no longer stay at the boarding point while the car waits.
- **Build history:** 0.997 169.63.
- **Test:** Land far from the patient with the police response on: the crew boards the car, the car leaves at once and the crew starts working as soon as it arrives.

### The death of a patient is always announced

- Whenever a patient dies while the crew or the helicopter has them (during the visits, the loading or the transport), the dispatch and briefing pages close so that the message shows, a red message "Patient N has died." appears and a sound is played, and the crew says it. On the scene the crew also asks for the police, the dispatcher confirms and the body is left for the investigation; on board the crew reports that it continues to the destination.
- **Build history:** 0.997 169.63.
- **Test:** Let a patient die during the visit and again during the transport: the message and the sound come every time, and the dispatch page is closed.

### Without the Mission Companion the mission falls back to the original voices

- With the Companion voices selected but the program not running or not connected, the mission is no longer silent: after 25 seconds, or at the first voice that is requested, it returns to the last voice choice you made, the sounds and the voice recordings play again, and one pop-up per session says that the Companion is not connected. With a recorded voice pack selected no pop-up appears.
- **Build history:** 0.997 169.63.
- **Test:** Select the Companion voices, close the Companion and start a dispatch: the pop-up appears once and the voices of the recordings are heard; with a recorded pack selected nothing is shown.

### The time to the second dispatch counts down

- The debug row "Time to second dispatch" showed a negative number that kept growing. It now shows the seconds left, only while a second dispatch is waiting, and a clear line when none is planned or when the time has been reached.
- **Build history:** 0.997 169.63.
- **Test:** Open the debug page while a second dispatch is planned: the time goes down to zero and the row changes to "reached, waiting for the next step".

### A skid landing with three crew says the same as with four and five

- When the patient goes by ambulance after a skid landing with three crew, the crew now says that the patient (and the doctor) will travel by ambulance and that the patient is on board after the hoist, as with four and five crew; nobody says that a patient who died will travel by ambulance.
- **Build history:** 0.997 169.63.
- **Test:** Land on skids with three crew at a call where the ambulance takes the patient, then at one where the helicopter does: the lines are said; with a patient who died they are not.

### More of the original voice recordings play

- The recordings that existed but were never played now play: the arrival of the ambulance, the police and the fire engine at the scene, the second ambulance with another patient, the call to land for the resuscitation, the message after STOP CPR, the marshal telling that the landing area is clear, and the copilot asking to hold the engine start while ground operations go on. With the Companion voices the same moments are spoken in the language of the pack.
- **Build history:** 0.997 169.63.
- **Test:** Fly a call with an ambulance, police and fire engine and listen to each arrival; start a resuscitation in the air without the option for resuscitation on board and listen to the request to land.

### The ground operations stop when a crew member is lost

- When a member of the crew dies or is disabled while the crew is outside the helicopter and no patient is aboard, the operation is aborted without a question: the visit of the doctor, the assessment and the loading stop, the patient is left to another unit, the dispatcher is told and the crew comes back to the helicopter. In a skid or hoist operation the crew comes back with the pickup as in the ambulance case; in a landing operation they board at once when the visit has ended.
- **Build history:** 0.997 169.64.
- **Test:** Cause a hard crash during a skid operation that kills the copilot: the visit stops within a second, the crew says it, the dispatcher is informed and the crew returns; no loading goes on.

### A critical failure ends the mission with a mayday

- An engine fire or a tail or main gearbox damage now aborts the operation at once, the crew calls the mayday on the radio and the dispatcher answers. After the landing a window says that the operation is terminated and the mission ends. A single engine failure is not critical.
- **Build history:** 0.997 169.64.
- **Test:** Cause an engine fire with the failure menu while the crew works on the ground: the work stops, the mayday is heard, the tablet says MAYDAY and the mission ends after the landing.

### A light helicopter is detected on the skids

- The collective limits of the skid landing are 5 lower (the ground effect of the last simulator update lifted the light helicopter, so the collective stayed below the old limit and the skids were not recognised).
- **Build history:** 0.997 169.64.
- **Test:** Land on skids with low fuel and a light cabin: the skid landing is recognised.


### The notice of a new version appears only for a newer build

- The green notice "New R&E ... is available" no longer appears for every difference between your mission and the server: it appears only when the server, or the Mission Companion, knows a higher mission version or a higher build (169.9 is older than 169.64, 169.100 is newer). It is on the briefing and on the two pages of the dispatch tablet; the Companion version tells you to press Update now in its Updates tab. The build number shown in the title follows the release (for example 0.997 (ALPHA) 169.65).
- **Build history:** 0.997 169.65, Mission Companion app 0.36.
- **Test:** Open the briefing with your latest mission: no notice; publish a higher build (or let the server say it) and start the Companion: the notice appears and goes away after the update.

### The Companion keeps the right voice pack and the right port

- With the English and the German pack installed and no pack chosen, the Companion no longer speaks the lines of the mission in German between English texts: it follows the pack that the mission declares. The service port is fixed to 5997, the port that the mission uses (the option is gone): a setting with another port, which left the checklist voice silent, is corrected at the start.
- **Build history:** Mission Companion app 0.36.
- **Test:** Install both packs with no pack chosen: the crew speaks English; open the Checklists page and hear the checklist assistant online.

### The doctor comes back before the ambulance notice

- When the ambulance takes the patient in a hoist operation, the doctor is hoisted back before anything else happens: the wait for the ambulance ends when the patient is loaded (it used to wait for a flag that only the old ambulance set) and has a limit of eight minutes. The dispatch is no longer declared cancelled while the crew is out on the cable or on the skids; once the crew is aboard again the dispatcher says that the ambulance has the patient, once.
- **Build history:** 0.997 169.66.
- **Test:** Run a hoist call where the ambulance takes the patient: the doctor is hoisted back, then the dispatcher tells that the ambulance took the patient; the dispatch is not cancelled before that.

### The crew reads the dispatch back when you board with one waiting

- When you and the crew board with a dispatch already waiting on the tablet, the crew now reads it back as soon as the crew is aboard (the triage question comes after the readback) instead of staying silent with the engines off.
- **Build history:** 0.997 169.66.
- **Test:** Receive a dispatch in the hangar, walk to the helicopter and board: the crew reads the dispatch back and asks what to do.


### The heli rescuer closes each door once

- When the heli rescuer boards in a skid operation, the doors are closed once. Before, the right door could be closed and opened again by a second close command, and the rescuer walked to the door at the wrong speed.
- **Build history:** 0.997 169.69-169.70.
- **Test:** Run a skid operation with the heli rescuer: the right door closes once and stays closed.

### No resuscitation of a patient already handed over

- The crew no longer starts CPR on a patient that has already been handed over, says the patient condition only once for each stage, and says no handover line when the crew itself loads the patient. The heli rescuer boards by the door that opens, and the skid point wait names the missing condition.
- **Build history:** 0.997 169.69.
- **Test:** Hand a patient over to the ambulance and watch the crew: no CPR starts and the condition is spoken once.

### The crashed vehicle appears once and ambulances stop beside the injured

- A crashed vehicle is created once (no second wreck on top of the first), and the ambulances stop where the injured are.
- **Build history:** 0.997 169.68.
- **Test:** Start a road accident call: a single wreck, and the ambulance parks beside the injured.

### Hoisting buttons stay hidden while a hoist command is pending

- BEGIN HOISTING and BEGIN SKID LNDG OPS stay hidden while a heli rescuer hoist command is pending inside the landing spot, so the two operations cannot be started on top of each other.
- **Build history:** 0.997 169.69.
- **Test:** Send the heli rescuer by hoist and look at the buttons: the two starts stay hidden until the command is done.

### The missing car mission no longer stops at 15%

- Mission 65 (missing car): when the route to the car cannot be built, the mission falls back to the straight line and goes on instead of ending the loading at 15%. The failure is written in the troubleshooting log.
- **Build history:** 0.997 169.70.
- **Test:** Accept mission 65 several times: the loading always completes.

### Hoist that stops after the first patients

- Report of a pilot: after three people were hoisted aboard nothing happened any more. The cause is not known yet, so the mission now writes down what is still open (speed, height, hoist operators, patient preparation), tells it on the Dispatch page and in the snapshot when the work stalls for two minutes, and tries the patient preparation of the hoist three times before giving up.
- **Build history:** 0.997 169.72.
- **Test:** Hoist several people: if it stalls, the Dispatch page names what is still open; send the snapshot with the report.

## UI

### The random voices list shows sex, quality and use, can be sorted, and copies its choices

- In the window of the random voices (Actors and voices, button Voices...), every voice now shows its sex (female, male or unknown), its quality, and where it is already used: "used for Pilot, Copilot" when one of the other actors has chosen it. Click the title of a column to sort by name, sex, quality or use (used first or free first).
- New buttons: Copy random to clipboard copies the checked voices, Paste random from clipboard, in the window of another random actor, checks the same voices there (it says how many are not available in that list). This copies the choices of one random actor into another without picking them again by hand.
- **Build history:** Mission Companion app 0.30.
- **Test:** Set the dispatcher and the heli rescuer to a random voice, open Voices... of the dispatcher, sort the list and check some voices, press Copy random to clipboard; open Voices... of the heli rescuer and press Paste random from clipboard: the same voices are checked.

### Radio hiss has three levels, the audio cache can be cleaned, the About page names the contributors

- The Radio effect tab has three hiss sliders instead of one: one for the intercom, one for radio calls and one for calls on an external radio (dispatcher, hospital). The recommended settings use 25 and 30 for the two radio ones. The Headset and External test buttons of the Volume tab now speak the sample text of the language chosen on the Voices tab.
- The Advanced box has a Purge audio cache button (it shows how many files and how much space, and asks before deleting). The same is available as `--purge-cache` on the command line, and the cache of messages that no longer exist is cleaned at every start.
- The About tab has a Contributors section (Daikan and kekkeruuu), a note on the online voices and the licences; the click at the end of an intercom call is a short recording of a real radio transmission.
- **Build history:** Mission Companion app 0.30.
- **Test:** Move each hiss slider and press the matching test button (Radio call, Intercom, External radio): only that sound changes; press Purge audio cache; open the About tab and read the Contributors section.

### More troubleshooting information on the heli rescuer and the skid landing

- The troubleshooting snapshot of the ground operations now shows where the heli rescuer and the crew are in the skid and hoist sequences, the distance of the helicopter, the heli rescuer and the hoist crew from the meeting point, and the steps already done; a sequence that stands still for a minute saves a snapshot by itself. It helps to find out what stopped a call.
- **Build history:** 0.997 169.61.
- **Test:** After a skid or hoist operation open the troubleshooting file and read the heli rescuer and skid lines.
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

### Call sign always visible and a test for the random voices

- In the Actors and voices tab of the Mission Companion 0.27 the call sign of the helicopter is on the top row, next to the language (with twelve actors it was below the part of the window that you can see). The rows of the actors are slightly closer.
- The Voices... window of the actors with Random voice has a Test button: select a voice, or leave the first checked one, and it says a sample sentence so that you can hear the voices of the pool.
- **Build history:** Mission Companion app 0.27.
- **Test:** Open the Actors and voices tab: the call sign options are visible without scrolling. Open Voices... of the dispatcher, select a voice and press Test.

### Progress bar in the hoist operations

- The grey progress bar of the on-site operations now also shows during a hoist operation, from the moment the crew is on the ground until the crew is hoisted back.
- **Build history:** 0.997 169.66.
- **Test:** Run a hoist call: the bar appears when the crew is down and ends at ON-SITE OPERATIONS COMPLETE when the crew is back.

### Time bar for organ and blood missions, and checklist buttons

- The organ team and blood missions show a time bar, and the checklist pages have buttons for moving between pages.
- **Build history:** 0.997 169.67.
- **Test:** Start an organ transport call: the time bar shows; open the checklist and use the page buttons.

### The Dispatch page lists what is still open

- When the ground operations are delayed, the Dispatch page shows a line "Still open:" with the conditions that are missing.
- **Build history:** 0.997 169.72.
- **Test:** Let a ground operation stall for two minutes: the Dispatch page lists what is still open.

## NEW FUNCTIONS

### German voice pack and Swiss German voices

- The German voice pack (DE) is now part of the program, complete with the crew briefing to the heli rescuer and in step with the English one: choose German in the Voices tab and the mission speaks German. Eight Swiss German dialect voices (Aargau, Basel, Bern, Graubuenden, Luzern, St. Gallen, Valais, Zuerich) can be chosen for an actor: they are an online service of a research institute (FHNW, non-commercial use) and the text is sent over the internet only when one of those voices is chosen; the program never takes one of them by itself, not even for a random voice with an empty list.
- **Build history:** Mission Companion app 0.30.
- **Test:** Set the language to German and the mission messages are heard in German with a voice of this PC; choose a Swiss German voice for one actor (internet needed) and hear it; check that an actor with no voice chosen never uses a Swiss German voice.

### Hangar and hospital points shared by everybody, and shared airport lists

- The points that the technician, the marshal and the hospital staff walk at a hangar or a hospital are kept on the mission page on GitHub for all users: what anybody adds reaches everybody without a new mission. The Mission Companion 0.32 downloads them when it starts and every 30 minutes (Tools tab, Shared data), checks them, adds your own points (button My points...) and writes the table that the mission reads at the next dispatch; the points built into the mission are the fallback when the program or the table is missing. Your own point wins over a published one with the same name. A wrong record is skipped and named in the log.
- The same box can change the offline lists of airports, aprons, hospital helipads and helipads of the helicopter tablet with the shared changes and your own (My database changes...): only with the simulator closed, only when you tick the option, the original files are kept and Restore the originals puts them back. Share my points... copies your points and opens the GitHub page where you paste them to share them. The five hospitals set in the mission settings are not touched.
- **Build history:** 0.997 169.61, Mission Companion app 0.32.
- **Test:** Press Update now in the Tools tab of the app: the log says the points were written; dispatch to Chieti, Pescara or a hangar of the list and the points work as before; add a hangar of your own, press Update now and fly from it; tick the option for the offline lists, close the simulator, add a hospital helipad of your own and find it on the tablet after restarting the simulator; press Restore the originals.
### World Database Update: enter hangars, hospitals and map changes in a window

- The Tools tab of the Mission Companion 0.33 has the button World Database Update. The window has a tab for each thing to add: Hangar, Hospital, Airport (primary, secondary, military), Apron, Hospital helipad, Helipad, and a tab to remove a point. Each tab shows only the fields it needs (a pair of coordinates can be pasted in one box), checks the record and adds it to your own list; the list below shows your entries and lets you remove one. New hangars and hospitals are used at once, the changes to the offline lists wait for the simulator to be closed.
- Before saving, the texts are checked: only plain letters are accepted, because other characters are shown badly by the mission and the tablet. A message names each character that does not fit, its code and its place, and offers the plain letter (u for the u with a diaeresis, ss for the sharp s); a character with no plain letter, such as a Cyrillic letter or a symbol, must be rewritten. The option to update the voice packs now speaks of the default voice packs.
- **Build history:** Mission Companion app 0.33.
- **Test:** Open World Database Update, add a hangar with a name that has an accented letter: the message names the letter and offers the plain one; accept, add the hangar, press Update now and fly from it; add an airport and a hospital helipad of your own and check the list below the form.
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

### The update button tells what is new

- The button Check for updates in the footer of the Mission Companion (0.14) says what the last check found: Update: mission, Update: program, Update: both, or Up to date; the status line of the Updates tab is a bold amber UPDATE AVAILABLE or a bold green UP TO DATE. An update found when the program starts is announced by a small message in the corner of the screen, over the other windows, which closes after 30 seconds and has a button Open Updates (the Windows balloon was not always shown).
- With the simulator running the question tells you that the mission file can be replaced now and that, with the flight started, REFRESH at the top of the tablet loads the new mission. After starting the setup the program leaves at once. The About tab links the GitHub pages of the program and of the mission, and the Piper voices tab lists community voices for Italian (leonardo, giorgio and miro) beside the official ones.
- **Build history:** Mission Companion app 0.14.
- **Test:** Press Check for updates with a newer release published and read the button and the status line; start the program with a newer release and look for the message in the corner; with the simulator running read the sentence about REFRESH.

### Log files, the ready message and voice pack updates

- Every start of the Mission Companion (0.15) writes its own log file (the ten newest are kept, a file stops at 20 MB; Advanced box of the Service tab: Open log folder), with the changes of the context that the mission publishes, so a report can say why a line was heard on the radio or by voice.
- When the program starts minimized and the simulator is already running, the pilot says that the program is ready (option Pilot says Ready at start, on by default, in the Advanced box).
- The voice pack EN is published apart from the program: the update check offers a newer pack alone (Update: pack, or together with the mission and the program) and installs only that file, keeping the old one in voicepacks\obsolete. A new program brings its own pack with the setup.
- **Build history:** Mission Companion app 0.15.
- **Test:** Start the program, open the log folder and read the newest file; start it minimized with the simulator running and listen for the pilot; with a newer voice pack published press Check for updates and install only the pack.

### The first versions of the Mission Companion

- The Mission Companion is the program that speaks the voices of the missions. Versions 0.1 to 0.8 brought the voice service on port 5997 with the Windows voices and the Piper voices installed from the program, ten actors with a voice and a speed for each, the radio effect (hiss, start beep, squelch tail), the volume that follows the sliders of the mission, the Tools tab with the mission work folder and the mission index, the start with Microsoft Flight Simulator 2020 and 2024, the voice packs with the texts of the mission messages in several options each, the voice app mode that reads the counters of the mission, the keeping of L:AUDIOINHIBIT at 1, the installer with Start menu and uninstaller, the sortable list of the Piper voices, the male or female technician and the names of the crew for each shift.
- **Build history:** Mission Companion app 0.1-0.8.
- **Test:** Install the program with the setup, start the service, press the Test buttons of the actors and of the radio effect, and start a mission with the voice code APP.

### Radio calls with the heli rescue base

- With the Mission Companion 0.25 the pilot calls the heli rescue base before the pick-up (one or two rescuers, depending on the crew and the option), tells the kind of mission and the number of injured, and the base answers. If you change the option for the second rescuer, the pilot corrects the request. At the meeting point the arrival is announced. When the rescuers are left at the hospital, the base or the meeting point, the pilot says goodbye and tells the base where they were left. The heli rescuer is a new voice in the Actors tab of the app.
- **Build history:** 0.997 169.55, Mission Companion app 0.25.
- **Test:** Start a dispatch with a heli rescuer pick-up and listen to the calls on the radio. With three crew, change the second rescuer option after the request and listen for the correction.

### Voices during the hoist operations

- During the hoist and skid operations the doctor now tells when the patient is reached and when the treatment is complete, according to the patient condition, and the heli rescuer tells when he starts, when he is half way down and when the area is secure. This works with the Mission Companion 0.25 and a voice pack in text.
- **Build history:** 0.997 169.55, Mission Companion app 0.25.
- **Test:** Fly a hoist mission and listen to the doctor at the patient and the heli rescuer while he is lowered.

### Name of the dispatcher and call sign of the helicopter

- The dispatcher now speaks with the name of the group chosen on the radio panel, with the city of your base where the name needs it (for example Leitstelle Munich, nine one one Rome control, centrale Turin, SAMU seventy five, Rega delta). The manual frequency is the Dispatcher. The helicopter is called by its call sign: the one typed in the Actors tab of the Mission Companion 0.25, else the airline and number of the livery (for example Pelikan 3), else the registration spelled out, else HEMS. The command --atc-test of the app shows what the simulator says about the aircraft.
- **Build history:** 0.997 169.55, Mission Companion app 0.25.
- **Test:** Change the group on the radio panel and listen to the dispatcher names; type a call sign in the Actors tab and check that the calls use it. If the city is not found, the name is said without it.

### Squelch tail from real recordings

- The click at the end of a radio transmission is now one of ten real recordings, chosen at random, instead of a noise burst (contribution of d41k4n). The recordings are copied to the audio folder, in the squelch-tail folder, where you can replace or add your own.
- **Build history:** Mission Companion app 0.25.
- **Test:** Listen to several radio calls: the end of the transmission changes from call to call. Replace the files in the squelch-tail folder and check that the new sounds are used.

### Random voices for the dispatcher, the ground unit and the heli rescuer

- In the Actors and voices tab of the Mission Companion 0.26 the voice list of the dispatcher, the ground unit and the heli rescuer has the item Random voice. The button Voices... lets you check which voices may be used. The dispatcher gets a new voice at every shift, the ground unit and the heli rescuer at every new dispatch. The random voices are never the same as each other, nor as the voices you chose for the other actors, and a new draw avoids the previous voice. The choice is kept in the settings and in the setting files.
- **Build history:** 0.997 169.56, Mission Companion app 0.26.
- **Test:** Set the three actors to Random voice with a pool of at least four voices, start two dispatches and listen: the voices change and are all different.

### Call sign: airline of the aircraft or a custom name

- In the Actors tab of the Mission Companion 0.26 the call sign of the helicopter is either the airline written in the aircraft.cfg of the livery (for example Pelikan 3) or a custom name you type. The flight number and the spelled registration are no longer used; with no airline the call sign is HEMS. On the tablet, the audio options page has a CALL SIGN box (SET, CLEAR) used in the cancellation messages; it is saved with the aircraft profiles and cleared by Reset to default. The tablet cannot read the airline of the livery, so the two names are set separately.
- **Build history:** 0.997 169.56, Mission Companion app 0.26.
- **Test:** Choose Airline of the aircraft and check that the dispatcher calls you with the airline; choose Custom name, type another and listen again. On the tablet type a name and press SET, then cancel a dispatch and read the message.

### The city of the dispatcher is a city, not a hamlet

- The dispatcher name that needs the city (for example Leitstelle Munich) now looks for the nearest city or town within 30 km and uses a village only when there is none. The search does not run when the option to skip the place search is on, and the mission goes on whatever happens.
- **Build history:** 0.997 169.56.
- **Test:** Start from a base near a village: the dispatcher uses the nearby town. With the skip option on, the dispatcher name is said without the city.

### Missions that fit the conditions

- New setting On conditions missions (Settings, Dispatch options). With it on, the random missions that do not fit the local time, the month (with the hemisphere of your position) or the weather are not drawn: no skier in August or without snow in the mountains, no paraglider in a gale, at night or in the rain, no school accident at midnight or in the summer holidays, no supermarket call at three in the morning, no chair lift in a storm. The calls for missing people are never filtered, and if no enabled mission fits the draw simply uses all of them.
- The snow in the mountains is estimated from the temperature and the altitude of the helicopter at 1300 m, so a helicopter in the plain can still draw the ski area. The wind limit is 60 km/h for the lifts and the fisherman and 30 km/h for the paraglider.
- The setting is saved in the profiles: it is on in EXPERT PILOT and EXPERT HEMS, off in DEFAULT and ROOKIE PILOT (complete random missions). Your older custom profiles keep it off. The crew mentions the setting in one of the tips of the long legs (Mission Companion 0.27).
- **Build history:** 0.997 169.57, Mission Companion app 0.27.
- **Test:** Choose EXPERT PILOT, set the simulator to midwinter at night with rain and draw missions with Random Everywhere: no skier, paraglider, school or supermarket. Set July at noon with clear sky: no skier. Switch the setting off and everything can be drawn again.


### The crew tells the time left in the hoist and skid visits

- In a hoist or skid operation, when the doctor reaches the first patient the chief tells how many minutes the visit should take, as the crew already did in the landing operations. It is not repeated for the second patient.
- **Build history:** 0.997 169.63.
- **Test:** Do a hoist operation with the Companion: a few seconds after the doctor reaches the patient the chief gives the time left.

### Resuscitation on the ground is spoken

- On the ground in a hoist or skid operation the doctor says that the resuscitation is in progress, and in every operation says when it worked and, when it did not, that the patient is not responding; the death is then announced.
- **Build history:** 0.997 169.63.
- **Test:** Treat a patient in cardiac arrest on the ground with the crew: listen to the start and the result of the resuscitation.

### The ride of the crew with the police or the ambulance is announced

- When the police drive the crew to the patient, when they take the crew back, when the closest police car is too far and the crew walks, when the ambulance brings the crew and the patient back, and when the doctor goes with the ambulance while the rear crew comes back with the police, the crew says it on the radio.
- **Build history:** 0.997 169.63, Mission Companion app 0.34.
- **Test:** Fly a call with the landing spot far from the patient and the police response on: listen to the crew when they board the car and when they come back.

### Meeting the ambulance half way has its own briefing

- When you accept a meeting point with the ambulance, the copilot confirms it; two nautical miles before the point the crew briefs the meeting (landing next to the ambulance, the handover, the stretcher); at the loading the doctor takes the handover from the ambulance crew.
- **Build history:** 0.997 169.63, Mission Companion app 0.34.
- **Test:** Accept a meeting point with the ambulance and fly to it with the Companion: the confirmation, the briefing at two miles and the handover at the loading.

### Patient transfers and organ transports speak at the pickup

- In a patient transfer the doctor says that he goes in for the handover at the hospital; in an organ transport the rear crew says that it collects the container and checks the seal and the papers.
- **Build history:** 0.997 169.63, Mission Companion app 0.34.
- **Test:** Fly a patient transfer and an organ transport with the Companion and listen to the pickup.

### The approach briefing tells more about the mission

- Two miles from an accident the briefing now says when more than one patient is expected (the doctor will triage) and when there is a fire on the scene (the copilot keeps the helicopter clear until it is safe).
- **Build history:** 0.997 169.63, Mission Companion app 0.34.
- **Test:** Accept an accident with several patients and, separately, one with a fire: listen to the approach briefing.

### Radio, intercom and polycon follow the power and the CARLS

- The Mission Companion now decides who is heard like this: with the battery switch or the GPCP power switch on, the intercom works; with also the CARLS connected, the radio (dispatcher, hospital, heli rescue base) and the polycon of the crew outside work too; with the battery and the GPCP switch both off there is no intercom, no radio and no polycon, not even at the base. Voices in the air are unchanged.
- **Build history:** Mission Companion app 0.34.
- **Test:** Switch the battery and the GPCP switch off: the dispatcher and the crew radios are silent; switch the GPCP on: the crew speaks on the intercom; connect the CARLS: the dispatcher and the crew outside are heard.

### Whole coordinates in any format

- In the World Database Update window the whole position of a place can be pasted in the first coordinate box and fills both: decimal with or without spaces, with the letters N, S, E, W or the words, degrees and minutes, degrees, minutes and seconds, aviation and GPS strings, and links of the maps.
- **Build history:** Mission Companion app 0.34.
- **Test:** Paste 46.9096,7.5049 and then 465434N0073017E in the first box: both boxes are filled with the right numbers.

### The crew reacts to an impact and to a lost colleague

- After an impact the injured members groan with their own voice and a colleague says that someone is critical or dead; the dispatcher is told by the copilot or, when the copilot cannot speak, by the doctor, the chief or the second rescuer. When you choose to continue, a crew member confirms it.
- **Build history:** 0.997 169.64, Mission Companion app 0.35.
- **Test:** Crash with the Companion running: listen to the groans, the report of the survivor and the line of the crew.

### A dispatch with the radio off is read back by the crew

- When the battery and the GPCP switch are off, or the CARLS is not connected, the dispatcher does not speak: a message shows on the tablet and a crew member aboard reads it back and asks what to do. When you turn the radio on, the copilot calls the dispatcher for more information and confirmation, and the dispatcher keeps asking sometimes for confirmation and confirms the reassignment.
- **Build history:** 0.997 169.64, Mission Companion app 0.35.
- **Test:** Start a dispatch with the battery off: no dispatcher voice, the crew reads it back; switch on the battery and the CARLS and accept: the copilot calls the dispatcher.

### Search and rescue briefing

- In search and rescue calls the crew briefs the search: the kind of search, the information of the call (area, vehicle and its colour), the division of the area in sectors by hour angle, and the best altitude and speed (1000 feet above ground and 80 knots). It comes one nautical mile before the search ring or, in calls without a ring, right after takeoff. The Mission Companion now says SAR letter by letter.
- **Build history:** 0.997 169.64, Mission Companion app 0.35.
- **Test:** Accept a search and rescue call with a ring and one without: the briefing comes a mile before the ring in the first and after takeoff in the second.

### A colleague speaks when the copilot cannot

- The engine fire call, the hoist warnings and the other safety lines of the copilot are taken over by another member of the crew when the copilot is muted or disabled.
- **Build history:** Mission Companion app 0.35.
- **Test:** Disable the copilot (mute or crash) and cause an engine fire: another member of the crew calls it.


### Every main actor always has a voice

- The five crew members, the dispatcher, the ground unit and the heli rescuer can no longer be left without a voice: an actor with no voice (or whose voice was removed) gets a default at once, a Microsoft voice of the language first, else a Piper voice; the dispatcher, the ground unit and the heli rescuer then draw their voice at random. If a language that the service needs has no voice at all, the service does not start and a popup advises the default voices. The tablet tells it in the message area of the briefing, the dispatch pages, the audio options and the checklist page (red: voices stopped; amber: default voice given). The recommended settings were saved again with the random voices.
- **Build history:** 0.997 169.65, Mission Companion app 0.36.
- **Test:** Remove the voice of an actor in the Actors and voices tab settings file, start the Companion: the actor gets a default and the amber message shows on the tablet; with no voice at all the red message and the popup appear.


### Greetings, small talk and weather in the hangar, at the briefing and after the landing

- When you board in the hangar the technician and the crew greet you by the time of the day and chat a little; the technician and the pilot of the crew also say a word about the weather (rain, snow, heat, cold, frost, fog, wind, a fine day) and the crew answers. After the landing the technician welcomes the crew back, the crew comments the weather and says goodbye. The briefing of the mission ends with a short weather report: wind direction and speed, temperature and visibility. They are spoken only with the Mission Companion running.
- **Build history:** 0.997 169.66, Mission Companion app 0.37.
- **Test:** Board in the hangar in the rain, then in a fine day: the greetings and the comments differ; listen to the weather at the end of the briefing and after the landing.

### Voices at the same time

- The Volume tab of the Mission Companion has a new choice, "Voices at the same time". Take turns (the new standard): the radio, the crew and the checklist speak one after the other, only the callouts and the notification sounds come over them. Everything together is the behaviour of before. One line at a time never lets two voices speak together. The choice is part of the settings profiles.
- **Build history:** Mission Companion app 0.37.
- **Test:** Accept a second dispatch while the crew is talking: with take turns the dispatcher and the crew do not speak together; switch to everything together and they do.

### Voice commands for the mission buttons

- New setting SPEECH COMMANDS in the tablet Settings (CREW voice options), off by default and saved in the aircraft profiles. With the Mission Companion app that has voice commands, you hold the push-to-talk key and say a command such as "hoist up", "load the patient" or "skid landing" and the mission presses the same button you would press, only while that button is visible. 14 commands: begin hoisting, hoist up and down of the heli rescuer, ground loading, skid landing, takeoff for hoist, ground operations here, load the patient, keep the patient out, patient in, drop the heli rescuer here, back to the meeting point, load from and unload to the ambulance.
- **Build history:** 0.997 169.70.
- **Test:** Turn SPEECH COMMANDS on in the tablet Settings, start the Companion with voice commands, hold push-to-talk and say "hoist up" while the hoist button is visible.

### Handover words and paperwork after the hospital

- After the hospital handover the crew says it goes inside for the report and the paperwork, with its own lines for organ missions (voice packs EN 24 and DE 12).
- **Build history:** 0.997 169.70.
- **Test:** Hand a patient over at the hospital: the crew says it goes inside for the paperwork.

### New calls, work light and terrain check

- New incidents 69 to 74 and secondary missions 101 and 102, the work light after the fire fighters, and a terrain check before the heli rescuer is sent down.
- **Build history:** 0.997 169.67.
- **Test:** Request calls until one of the new incidents appears; after a fire, check that the work light is on.

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
- **Mission Companion app 0.1-0.37 (this release):** The first versions (0.1-0.8: voice service, Piper voices, radio effect, volume, voice packs, voice app mode, installer, technicians and names), then no firewall question at every start, the Clean-up by category, the setup program, and the chatter level, the silent options and the mute of the dead crew, then the update check with its release notes window for the mission and for the program. Then the simpler window with the Updates tab and the choice of what to update (0.11, 0.12), the sound rules of the radio, the intercom and the distance (0.12), and the translated voice packs with the comparison against the base pack (0.13). Then the radio rules that count the pilot as aboard, the new message tone and the quieter tablet alarm, the vehicles and hospital spoken in one sentence (0.16), and the audio output devices and levels (0.17). Then the decision of the crew on a new dispatch and the pilot always counted from the mission (0.18). Then the settings profiles, the setup in one click and the complete setup of the installer (0.19). Then the restarts and the uninstaller without shell commands, the check at every start and the removal of the Google Drive link (0.20-0.22), the crew seats that a flight does not have spoken by the crew that is there and the mission identity tag (0.23), and the pack EN 13 with the tips of the crew (0.24). The update of the mission file with an encrypted folder (0.11), the update button, the corner message and the Italian community voices (0.14), and the log files, the ready message and the pack updates (0.15) are listed in their own entries. Then the squelch tail from ten recordings, the voice of the heli rescuer, the name of the dispatcher and the call sign of the helicopter (0.25). Then the random voices with a choice of the voices, the call sign by airline or custom name, the silent dispatch with the crew away and the crew lines to the technician off the radio (0.26). Then the voice of the technician that follows the technician, the call sign row always visible and the Test button of the random voices (0.27). Then the tablet tones that are part of the program and the port holder named in the log (0.28). Then the update that closes the old copies of the program reliably, the second start that shows the open window and the voices that start earlier (0.29). Then the list of the random voices with sex, quality, use, sorting and copy and paste (0.30). Version 0.30 also brings the German voice pack, the Swiss German online voices, the three hiss levels and the audio cache clean-up. Then the update that no longer keeps the port busy (0.31). Then the voices that play four kinds in parallel with priorities so that a burst of lines no longer queues for a minute, and the shared hangar and hospital points with the shared changes to the offline airport lists (0.32). Then the window World Database Update with the check of the characters (0.33), and the radio rules by power and CARLS and the coordinates in any format (0.34). Then the letters of SAR spelled by the voices and the lines of the crew taken over by a colleague when the copilot cannot speak (0.35). Then the voices that the crew, the dispatcher, the ground unit and the heli rescuer always have, the fixed service port, the voice pack that follows the mission and the new mission build told to the mission (0.36). Then the choice of the voices at the same time, with turns as the standard, the greetings, the weather and the farewell lines of the packs EN 21 and DE 9 (0.37).
- **0.997 169.27-169.66 (this release):** Scene parking by lane and the police drop-off fixes, the crew that no longer walks off, patients protected before the arrival with the optional Life Score freeze, crash damage kept on the patient, the crew emergency refinements (no question with a patient aboard, hospital handover of the casualties, senders of the messages, critical and deceased rows), dispatch statistics only when known, light long missions, hoist cable accidents and sheltered single patient, the reset failures button, new search-and-rescue clues and missions 65 to 68, performance settings, road routes for the rescue vehicles, the flight manual checklists with the IFR procedures, the dispatch status keys, payload weights, the Mission Companion voice mode with crew chatter and the male or female technician, then the second dispatch built on its own location, the ambulance crew and patients in every dispatch, the distant ambulance that no longer takes a patient it cannot reach, the loading that is carried through, the sheltered patient for every crew, and fewer false errors. Still to be confirmed in the simulator. Then the hospital team that speaks when the crew meets the ground crew and the radius shown in the place-search warning (169.47), and the keyed checklist and dispatch texts for translated voice packs (169.48). Then the tablet alarm only with pop-ups, the pilot presence for the radio rules, the vehicles and hospital messages, and the fixes of Skip paperwork, the airplane fire engine and the residential injured icon (169.49). Then the decision of the crew before you accept a dispatch, the dispatcher asking for an answer and the reassigned dispatch (169.50). Then the hospital handover walk that is skipped when the medic is already at the stretcher and the diagnosis of the hospital waypoints (169.51). Then the residential missions that no longer stop at 43.5% because the injured icon is drawn again instead of updated, and the mission identity for the Mission Companion (169.52). Then the tips of the crew about the functions of the mission, with their own setting CREW TIPS, and the voice pack version the mission asks for, so that an old pack is reported (169.53, 169.54). Then the ambulance that waits for the helicopter or ends the dispatch, the doors opened for the heli rescuer, the heli rescuers who walk to the hospital, the radio calls with the heli rescue base and the voices during the hoist operations (169.55). Then the vehicles said once, the city of the dispatcher, the call sign on the tablet and the random voices (169.56). Then the missions that fit the conditions (169.57). Then the search and rescue state that is no longer overwritten (169.58). Then the crews that walk at a normal pace (169.59). Then the NEXT DISPATCH button released after the waiting time (169.60). Then the heli rescuer who meets the crew at the skid point or beside the helicopter, the skid landing that no longer stops with a deceased patient, the search and rescue calls without medical information and without an announced area on the route call, the extra troubleshooting information, and the hangar and hospital points shared by everybody (169.61). Then the patient record that agrees with itself before the visit, and the sex and age of the patients that follow the dispatch (169.62). Then the police car that no longer keeps the crew waiting, the death of a patient always announced, the fall back to the original voices without the Mission Companion, the time to the second dispatch, the same lines in every kind of operation and the recordings that were never played (169.63). Then the ground operations that stop after a casualty, the mayday for a critical failure, the voices of the injured crew, the dispatch read back by the crew when the radio is off, the search and rescue briefing and the skid landing of a light helicopter (169.64). Then the build number that follows the release, the notice of a new version only for a newer build and the messages about the actors without a voice (169.65). Then the doctor who comes back before the ambulance notice, the progress bar of the hoist, the dispatch read back when boarding, and the greetings and the weather in the hangar, at the briefing and after the landing (169.66).
- **0.997 169.67-169.72 (this release):** Time bar for organ and blood missions, new incidents and secondary missions, no CPR after a handover, the crashed vehicle created once, doors closed once by the heli rescuer, the mission 65 route fallback, voice commands for the mission buttons (setting SPEECH COMMANDS), handover words after the hospital, and the hoist stall report on the Dispatch page.
