# Patient demographics and the clinical record of an unvisited patient

User request of 2026-10-18 after a tester's video (minute 33): the clinical record of a patient that nobody on the crew had visited showed "Patient: UNKNOWN, UNK, UNK" and "Status: UNKNOWN" next to a rescue team message that gave age, sex and "unconscious", symptoms "NO INFO" and a diagnosis, and a dispatch text could say "his" with a woman or "student" with a 60 year old.

## The clinical record (`select medical patient page` display, `07-patient-medical.json`)

- The rows show what the rescue team (ambulance, police, fire) reported, as long as the crew has not visited the patient: `Patient: UNKNOWN, {age}yrs, {sex}` (the name stays unknown; `UNKNOWN , UNK, UNK` only while nothing was received), `Status reported by the rescue team: {state}` (not in search and rescue calls, where nothing is known about the state), `Info from rescue team on scene: {text}`.
- `Preliminary diagnosys: {pathology}` is a row of its own and appears only after an assessment (`medical_display_assessment_complete` or the crew visit), never glued to the report.
- The ambulance medical update (`symptoms parts`): the symptoms are told only when they are known. The profiles with `NO INFO` (263 of about 600) say nothing, and the same text is used for patients 1, 2 and 3 (patients 2 and 3 used the name of the pathology as "symptoms").

## Sex and age by the wording of the dispatch (`accident demographics`, `data/02-waypoints-and-categories.json`)

A static list by `ID_CARD` with `age_min`/`age_max` (all patients) and `age_minN`/`age_maxN`, `sexN` for the variant `N` (`CRASH_VARIABLE`, the same index as `descriptionN` and `pathologytypeN`).

- `accident demographics sex` runs before the pathology engine (next to `injured_workers`) and puts `sexN` in `SEX1`; the engine then picks only profiles of that sex. A saved game keeps what it saved (`L:RELOADSAVED`).
- `accident demographics ages` runs after `pathology_random_ready`: `AGE1` (the profile of patient 1 can set an age of its own), `AGE2` and `AGE3` (only the patients that exist) are brought into the range when they are outside it.
- Where a text names a sex the list says it (mother, father, wife, husband, the rider "her quad" variants, saleswoman); the pools that hold one sex only are derived (a profile of one sex needs the sex to be the same or the engine loops for a long time). Nothing gendered is left in the name or general description of an accident: neutral wording (a person, an angler, "the worker"). A copy of a mission with the other sex is a variant of the same accident (quad 2 and 4 "her", tractor 2 "her", wife in 56.4 with a female profile): no new `ID_CARD`, no new menu entry, and the code keyed on `ID_CARD`/`type`/`camping` keeps working.
- Ages: trades 18-65 (farmer, quad, hunter 18-75), motorcycle 18-67, paraglider 18-70, climbers 18-65, skiers 15-70, students 12-19 (the unconscious but conscious student 18-25), the quarrels 16-65, "young patient" of the doctor 18-35.
- Changed texts keep their key `DSC.<ID_CARD>.<variant>` (the pack EN 18 carries them; the translated packs show the old translation of those 12 texts until they are translated again: 8.2, 8.4, 11.2, 13.1, 33.2, 38.1, 47.3, 47.4, 48.3, 56.4, 64.3, 64.4).

Test: `tools/test-accident-demographics.js` (the table, every sex word agrees with the patient, no sex in a name, ages, the call order, the record rows). Runtime PENDING (docs/testing/RUNTIME_VALIDATION.md).