# Checklist chain (flight manual section 4)

The tablet checklists follow section 4 of the flight manual (BK 117 D-2, Helionix Step 2): the interior check (4.3.3), the starting procedures, the take-off, pre-landing, landing and shutdown lists (4.6 to 4.11) and the IFR procedures (4.13). They live in `mission-src/macros/03-aircraft-crew-checklists.json`. The normal and the quick start branch are separate and stay separate; both share the interior check and everything after the engines are running.

## Main page

The main checklist page lists every procedure, by the title of the manual, and the pilot chooses it from there. The ground lists keep their conditions (ground, rotor stopped, mode); the take-off, pre-landing, landing, shutdown and IFR lists are always listed. The old placeholders HOVER CHECK, AFTER TAKE-OFF, CRUISE, BEFORE LANDING and SHUT-DOWN (all opened the quick start checklist) are gone: the hover check is part of the take-off check, the others are the lists below.

## Hand-over

A list longer than a page is cut into pages (see Rules); the table names the first page of each list.

| Checklist (first page) | Manual | Continues with |
| --- | --- | --- |
| `interiorckl` INTERIOR CHECK (4 pages) | 4.3.3 | after its last page it stops: links to `normstartupckl`, `quickprep1ckl` or `startupckl` |
| `normstartupckl`, `normengstartckl`, `normhydckl` | 4.4.1.1 / 4.4.1.2 | `afterengstartckl` (normal branch, condensed lists, unchanged) |
| `quickprep1ckl` ADDITIONAL PRE-FLIGHT CHECKS (5 pages, night block inside) | 4.5.1 | `quickavionicsckl` (avionic checks) -> `quickheatingmenuckl` (stops: links HEATING SYSTEM CHECK or SKIP) -> `quickheatingckl` (2 pages) -> `quickpoweroffckl` (power off, stops) |
| `startupckl`, `engstartckl` | 4.5.1.1 | `afterengstartckl` (quick branch, condensed lists, unchanged) |
| `afterengstartckl` | 4.4.1.3 | `afterengstartckl1b` |
| `afterengstartckl1b` HEATING CHOICE | 4.4.1.3 | stops: links `afterheatingckl` (2 pages, then `afterengstartckl1c`) or SKIP to `afterengstartckl1c` |
| `afterengstartckl1c` AVIONICS CHECKS | 4.4.1.3 | stops: links `aviopftckl` or SKIP to `afterengstartckl2` (a SKIP pressed on the first page is honoured) |
| `aviopftckl` AVIONIC/PREFLIGHT TEST | 4.4.1.3 | `afterengstartckl2` (PROCEED or 20 s) |
| `afterengstartckl2` AFTER ENGINE START (PART 2), 2 pages, night block inside | 4.4.1.3 | `beforetockl` (PROCEED or 20 s from its last page) |
| `beforetockl` BEFORE TAKE-OFF | 4.6 | `takeoffckl` (PROCEED or 20 s) |
| `takeoffckl` TAKE-OFF CHECKLIST | 4.7 | `takeoffprocckl` (after 10 s) |
| `takeoffprocckl` TAKE-OFF | 4.8 | stops |
| `prelandingckl`, `landingckl`, `shutdownckl` (2 pages) | 4.9, 4.10, 4.11 | stop: each is chosen from the main page |
| `ifrdepckl` and the other IFR lists (`ifrobsckl`, `ifrobscancelckl`, `ifrparallelckl`, `ifrparallelcancelckl`, `ifrholdckl`, `ifrilsckl`, `ifrlnavckl`, `ifrlpvckl`, `ifrmissedckl`, `ifrvtfckl`) | 4.13 | stop |
## Rules

- Whole manual lists, nothing cut: when two lists repeat a step (for example AP1+AP2+BKUP, the landing lights or ENG MAIN FLIGHT in part 2 and in the before take-off list) both keep it. The manual's notes are spoken in the prompts or shown as note rows. Effectivity variants that do not apply to this helicopter (before Helionix Maintenance Release 1, EPU, TCCA) are not rendered.
- A single next list continues by itself (PROCEED link and 20 s, guarded by a local flag). An optional block, or a choice that cannot be weighed by the system (night flight preparation, heating system check, avionic test, the start-up after the interior check), stops the checklist and leaves the links: the pilot chooses, and with no choice the checklist waits. Phase procedures (take-off, pre-landing, landing, shutdown, IFR) hand over to nothing: the pilot picks them from the main page.
- Every simulated action with a readable variable verifies and advances the step; a step without one advances on a timer. Variables: `ROTOR_BRAKE` (0 off, 1 applied), `ECP_FADEC_EMER_1/2` (0 switch off, guard down), `AIRCP_DEFOG` (0 off, 1 on), `OH_EMER_SHED_BUS` (0 normal, 1 on), `CCP_MFD_MODE` (2 = NORM), `ECP_MAIN_1/2` (0 FLT, 1 IDLE, 2 OFF), `ELT_SWITCH` (0 test, 1 armed, 2 on), `ECP_MAIN_LATCH_1/2`, `APCP_*`, `OH_*`, the fire and lamp tests, trim release, `DOOR_COCKPIT_R`, cyclic/collective, battery voltage, `LIGHT LANDING`, `LIGHT BEACON`, `RADIO HEIGHT`, `AIRSPEED INDICATED`. The external lights switches, intercom, REARCAM, HISL switch, safety belts, the GTN and all MFD/VMS pages are timers.
- Pages: a page shows at most 26 rows (the interior check showed 27 rows up to its step 12; the longest page of the original checklists, the normal start-up, has 35). The generator cuts a longer list into pages, preferably at the section headings of the manual (OVERHEAD PANEL, INSTRUMENT PANEL, ...), and gives each page of a list a link < PREV PAGE (n/k) under the back link and an always visible NEXT PAGE (n+1/k) >; the next page also opens by itself 5 s after the page is complete, once (the 20 s wait is only for the hand-over between different checklists). A long optional block (heating system check) is a page of its own, reached by its choice link. The pages of a list continue the numbering of the steps.
- Voice length: a prompt must end before its step moves on (the next prompt interrupts it). The estimate is 2.3 words per second plus 0.4 s, spelled letters counting as words; the prompt says the action and keeps the detail on the screen rows, and when it is still longer than the wait the generator lengthens the wait by at most 2 s. The opening announcement of a page gets 4 s. `tools/test-checklist-coverage.js` checks every prompt against its wait.
- Voice: every step has its spoken prompt (`speak` with `interrupt` 1, as in the original checklists, also in before take-off and take-off check) and every page an opening announcement; the notes and cautions of the manual are read out with the step that follows them, or when the page is complete.
- Format: every numbered row is a monospace row of exactly 49 characters (`n.LABEL _ _ _ VALUE [ ]`), the continuation lines are right aligned with the marker on the last line; each state is a white / yellow / gray triplet driven by `L:CHECKLIST_STEP`; one thread per step. The step ranges are disjoint (part 2 from 140 in steps of 20, every other page from 200 in blocks of 40 allocated by the generator), so a stale thread of another page never fires.
- Optional blocks: two links shown at the decision step, skipped steps disappear from the page (`L:CHECKLIST_BRANCH`).
- Slope take-off and slope landing guidance follows `L:CHECKLIST_SLOPE`, folded by a thread from pitch and bank beyond 12 degrees, because renderer conditions are AND only.
- `tools/test-checklist-coverage.js` checks the format, the main page and runs every checklist on a cooperative scheduler (each link, day and night); `tools/test-ground-operations-recovery.js` checks the chain and the main page order.
- Runtime status: PENDING (see `docs/testing/RUNTIME_VALIDATION.md`).
