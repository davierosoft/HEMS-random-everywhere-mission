115 - Debug snapshot: the tablet says it was created but no file appears on the PC

Repository: KeKKERUUU/RandomEverywhereInstaller (posted)

Report of kingle (Discord, 2026-11-11, build 0.997 170.24, Companion 1.2.64): after several snapshots the tablet said that a new debug snapshot was created, but nothing was saved on the computer. Earlier the same session the four files table_R&E_debug_manual / automatic / dispatch / previous_mission snapshots were saved without problems.

## What the mission does

The tablet button (CAPTURE SNAPSHOT) writes the snapshot into the persistent tables Debug_Manual_Table, Debug_Auto_Table, Debug_Dispatch_Table and Debug_Previous_Mission_Table of the HPG tablet storage; the file on the PC belongs to the HPG / Companion side. The mission cannot tell whether the file was written.

## Request

1. Say in the Companion (log and Tools tab) when a snapshot table was written or why it was not (file locked, folder missing, size limit, antivirus).
2. Check what happens when the table is large (the snapshots of kingle were 2 MB and 3 MB) and when the previous file is still open in an editor or being read by the Companion.
3. If the Companion copies or watches these files, make it retry and show an error instead of silently keeping the old file.

Needed from kingle if it happens again: Companion log of the session and the date of the last table_R&E_debug_* files in the work folder.
