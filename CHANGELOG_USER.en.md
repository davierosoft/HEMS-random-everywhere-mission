# HEMS Random Everywhere — User Changelog

## Scope

This is the consolidated changelog for users moving directly from **HEMS Random Everywhere Missions 0.997** (3 August 2026) to **0.997 66**.

It describes the final user-facing result only. It deliberately does not list intermediate test-build corrections or fixes to features introduced during the same development cycle. Update it only when there is a meaningful final change for users.

## What's New

- **Three-crew skid landing capability.** Three-person HEMS crews can now complete skid-landed rescue operations for one to three patients, including the appropriate cabin-member, patient, hoist and return-to-aircraft flows.
- **Expanded ground-service coordination.** The mission can coordinate ambulance pre-visits, a secondary ambulance for eligible additional patients, realistic vehicle arrival/parking, and optional cancellation of HEMS when ground resources can safely handle the incident. The cancellation threshold is configurable in the settings.
- **Heli-rescuer destination drop.** Heli-rescuers can be left at an eligible base, hospital or user-selected hospital destination, then follow the appropriate ground or hoist return sequence.
- **Marshal guidance.** Scene, base, hospital and custom landing operations can use a marshal to guide the final approach, hover, landing and departure.
- **Expanded patient-care simulation.** Patient condition now reflects the selected pathology through vital signs, GCS, consciousness, LifeScore and patient code. A visit can include up to six timed, ordered medical procedures with variable effects on the patient’s condition.
- **CPR and mCPR simulation.** The mission includes a guarded CPR workflow, a persistent mechanical-CPR option, realistic outcome paths and a manual stop after prolonged resuscitation.
- **Privacy-screen support.** Ambulance and police privacy screens can be used at eligible outdoor incidents while remaining suppressed at indoor scenes.

## UI Changes

- **Medical page redesigned.** It now presents the assessment, patient code, live vital signs, GCS, consciousness and LifeScore in a clearer clinical order. Values appear when the assessment has actually reached the appropriate stage.
- **Treatment progress is readable at a glance.** The active procedure is yellow; completed procedures are green and shown on separate lines, newest first. At completion, all procedures remain visible in green.
- **On-site operation progress.** Mission Dispatch shows a temporary progress bar and status text only while on-site work is in progress; both disappear after completion.
- **Clearer operational feedback.** Mission errors, cancelled dispatches, crew/vehicle status and medical criticality are presented without replacing active rescue instructions.

## Fixes

- **Marshal reliability.** Resolved cases where the marshal stayed idle, continued to follow the wind near the landing spot, or alternated left/right commands while the helicopter was close to the centreline. Lateral guidance now has a stable angular buffer; inside the landing area, the existing vertical and landing guidance remains in control instead of lateral commands.
- **Crew, door and stretcher sequencing.** Resolved cases where a crew member boarded through a closed door, skipped an approach waypoint, or did not correctly wait for the ambulance stretcher. Boarding, reboarding and cargo-door timing now follow the required sequence.
- **Indoor incident privacy.** Resolved privacy fences appearing at indoor calls, including indoor cardiovascular incidents. Eligibility now follows the actual scene type.
- **Clinical consistency.** Resolved impossible or misleading observations, including invalid living-patient vital signs, inappropriate GCS presentation and readings shown before the initial assessment.
- **Mission-flow stability.** Resolved several conditions that could block a rescue flow, show an incorrect mission message, or trigger a mission-system command error, including the engine-failure switch error.
- **Ground-vehicle reliability.** Resolved unsafe/incorrect ambulance, police and fire-engine parking, routing, arrival-state and patient-transfer cases, including custom landing spots and secondary-ambulance handling.
- **Saved/custom mission data.** Resolved stale mission metadata in custom or restored missions so the generated scene and SAR-related information use the current selected mission.
