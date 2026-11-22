# Dispatch status reports (keys 0-9 and internal phases), after the status patch of Dr.DougRoss

Status 2026-11-22: SOURCES ONLY (unbuilt, runtime pending). Merged by `tools/apply-status-patch-2026-11-22.js` from his notes "Status Patch 170.32 - Developer Notes" (his script `apply_status_patch.py` was not supplied; the steps S1-S8 were implemented from the PDF). His second script (N1-N8) was already in the sources.

## Key and phase
`L:DISPATCH_PHASE_RAW` is the key pressed (0-9, 100 = no dispatch yet), `L:DISPATCH_PHASE` the internal phase the mission logic uses (LVAR 0-8, 100). The key is translated only through the tables `statusMessages{RESCUETRACK_ID}translation` (data 06). Internal phases: 0 accepted, 1 on the way to the scene, 2 at the scene, 3 on the way to the hospital, 4 at the hospital, 5 available on the way back, 6 available at base, 7 unavailable, 8 logged off (new), 9 not assigned.
German table (RESCUETRACK_ID 1) key to phase: 0 Abgemeldet (8), 1 Frei Wache (6), 2 Zum Berufungsort (1), 3 Am Berufungsort (2), 4 Zum Abgabeort (3), 5 Am Abgabeort (4), 6 Frei ueber Funk (5), 7 Nicht Einsatzbereit (7), 8 Funktion nicht belegt (9), 9 Alarmiert und Quittiert (0). Removed from the German table: Notruf, Sprechwunsch, Werkstattflug.

## What changed (sources)
- S1 data: the two tables above (`statusMessages0` gets "8. Resource logged off").
- S2 `objective4`: status 1 at lift-off (rotor above 50 percent and `L:Collective` above 32, thread), only with `DISPATCHER_AUTO` 0, phase not 7 or 8 and below 2 (or 100).
- Status 3 (rule of Dr.DougRoss 2026-11-21): `User predestination` no longer sets it at the acceptance of the hospital destination; a thread waits for ground speed above 20 kt and collective above 32 (one thread at a time, only if the phase is still below 3, never over 7 or 8). `pick doctor` still sets 3 at once (not asked: to confirm with him).
- S3 new macro `end shift` (END SHIFT button and the log-off status 8): sets phase 8 instead of 7.
- S4 `send dispatch phase`: key to phase lookup (`sdp_lvar`); phase 8 refused unless `MISSION_END_WAITING` is 1; phase 0 refused while the phase is 1-4; the CARLS popup follows the phase, not the key; phase 8 calls `end shift`; messages follow `RESCUETRACK_ID`.
- S5: 22 guards "phase ne 7" also exclude 8; the next-dispatch waits, the first dispatch and the stall watcher count 8 like 7.
- S6 CARLS STS shows the key really pressed and the German short text when `RESCUETRACK_ID` is 1; phase 8 "Logged off".
- S7 dispatch control (tablet): the current status is green, all others white; the keypad buttons are enabled except the current key.
- S8 the keys `*` and `#` (CARLS and tablet) only show NO ASSIGNED FUNCTION.

## Open
- Needs a build 170.51 (an explicit request), then `ui-texts.js sync` and the DE/FR/IT translations of the new English texts (log-off and "already accepted" messages, "8. Resource logged off", CARLS texts); runtime test in the simulator (checklist in his notes).
- Test updated: `tools/test-end-of-mission-flow.js` (the writer of `MISSION_END_WAITING` 2 is now `end shift`). `tools/test-snapshot-ground-guards.js` fails on `DF_DBG_STATE` also on the 170.50 artifact (pre-existing, not part of this change).

- Translations (2026-11-22, 170.53): the two refusal messages are plain `set_message` fields (UI.3908-3911, DE/FR/IT). The status names (`statusMessages0/1`), `Status sent: {0}` and the CARLS short texts are not reachable by the screen-text pipeline: draft Companion issue 170 in `C:\re41\outputs\flight-constraints\Issue_STATUS_TEXTS_TRANSLATION_draft.md` (not opened).
