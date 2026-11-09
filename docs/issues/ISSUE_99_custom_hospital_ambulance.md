99 - Optional ambulance at custom hospitals: yes/no choice and parking location

Repository: KeKKERUUU/RandomEverywhereInstaller (draft, not posted yet)

## Request for the app

Custom hospitals (static data list and external file) get two new fields:

1. Ambulance present: yes / no (default no).
2. Ambulance parking location (lat, lon, heading), required when the choice is yes.

The app must read, edit and write both fields wherever custom hospitals are managed (static data and the external file), and keep old files without the fields working as "no".

## Mission side (done by the mission, listed for the contract)

Applies when the selected hospital lies inside the perimeter of a custom hospital with the ambulance set to yes.

- The hospital crew waits for the helicopter at the usual place. The ambulance stands on its parking waypoint, pointing at the ambustretcher.
- At the patient handoff the stretcher and the hospital doctor walk to the ambulance on its side (bearing2 90 or 270, the side closest to them), then behind it (bearing2 180, 5-6 m away), then board. They are destroyed.
- If paperwork is yes, the helicopter crew doing the paperwork boards too. The helicopter crew is not destroyed: its variable is set to -1 so it is invisible.
- After a wait the ambulance drives along the waypoints assigned in the custom hospital.
- After the paperwork time the ambulance comes back to the parking position along the same waypoints in reverse. The crew gets out (always bearing2) and walks back to the helicopter passing along the side of the ambulance closest to the helicopter.

## Acceptance for the app

- Both fields can be set per custom hospital and survive a save and reload.
- The parking location can be picked like the other custom locations.
- Files without the fields load as ambulance = no.
