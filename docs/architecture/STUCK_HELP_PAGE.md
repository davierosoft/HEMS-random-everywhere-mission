# Stuck help page (user rule of 2026-11-09)

The user interface (dispatch page, briefing, technical page) carries no debug rows: no grey lines with blockers, causes, step names or raw values. When the mission looks stalled the page shows one message, a link and, if useful, the snapshot button. The details live on the macro `stuck help page` (in `mission-src/macros/04-dispatch-tablet-ui.json`).

Entry points: the yellow link under the on-site operations warning (`ops_progress_warning`), the link under the orange CHECK ON-SITE OPERATIONS row, and the quick link `- MISSION STUCK? HELP PAGE`.

Page layout: what is happening (one block per `ground_ops_reason_code`: HELI_ARRIVAL, HELI_GROUND, HELI_HOVER, CREW_MOVING, UNKNOWN, with the numbers of that problem), common blocks (skip commands, second dispatch, hoist, crew walking away), buttons (STOP ESCAPING CREW, RESET SECOND DISPATCH when `SECOND_DISPATCH` is not 0, CAPTURE SNAPSHOT, HOIST PANEL), the Discord ticket steps (capture the snapshot, open a ticket, drag and drop all the logs onto it with the Mission Companion app) and, at the bottom in grey, the basic debug information (build, phase, crew, step, cause code, blockers).

Rule for new stall detections: add a cause code and its block to this page instead of a grey row on a user page. Test: `tools/test-stuck-help-page.js`. The Debug page stays the place for full diagnostics.

## Phase detectors (2026-11-09)

Besides the on-site operations monitor, two read-only detectors fill `phase_stall_active`, `phase_stall_code`, `phase_stall_title`, `phase_stall_reason`, `phase_stall_seconds` (they change no mission state and write no snapshot):

- `RTB_STEP`: in `rtb step watch` (11-mission-lifecycle), the `rtb_step` name unchanged for 60 s while return to base is running.
- `SD_CONNECT`, `SD_PHASE`, `SD_EMERGENCY`: in `ready dispatch`, after the clock wait of the second dispatch, the three waits that can still hold the offer (CARLS or wifi link, last dispatch phase 4 or lower or 7, crew emergency open), named after 30 s by a short thread that ends with the waits (`sd_watch`).

The Dispatch page shows a yellow message and the help link while `phase_stall_active` is 1; the help page has one block per code and a grey debug row at the bottom. Not covered (no measurable signal yet): crew boarding, ambulance travel, mission start freeze (a frozen thread cannot report itself). Runtime PENDING.
