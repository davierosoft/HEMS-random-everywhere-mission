# Flight constraints per pathology (design, v2 of the doctor)

Status 2026-11-21: DATA ONLY. The v2 review of Dr.DougRoss (Stefan) is merged into `tools/pending-patches/flight_constraints_patch_v2-2026-11-21.json`. No mission logic, option, preset or Companion text exists yet. Original proposal: `C:\re41\outputs\flight-constraints\Flight_Constraints_Proposal_v1.md`.

## What the doctor changed (150 of 664 rows reviewed)
- 107 rows set to NONE (57 cardiac, 16 spine, 12 shock, 3 ICP, 3 psych, others), 13 rows moved to another profile (9 shock to FC_CARDIAC), 11 rows added (hypoxia, cardiac, CPR), 2 renames (`health16` 6 and 7: "Resuscitation by partner ongoing"), `health82` 0: no HEMS indication.
- 211 rows are still PENDING (not reviewed): their v1 profile is a placeholder and must NOT drive penalties.
- Penalties he gave: altitude (relative and absolute) SpO2 -5/-10, only relevant above about 3000 ft AMSL; rate negligible; G vertical/lateral/longitudinal, bank, noise: Lifescore -5/-10 or decline x2; pitch up: BP -10/-15 and Lifescore -5; pitch down only for ICP and "not a parameter at the moment".
- New pathologies/scenes: NP-04 and NT-01 chest drain makes the ceiling minor; NP-11 neonate probably no simobject (ethical dilemma); NP-12 and NS-06 no HEMS indication; NP-13/14 fixable with O2; NP-15 hard to simulate; NP-16/NT-05 abdominal air is not a problem; NS-02 needs mountains of at least 11 000 ft; NS-03 needle decompression outdated (mini thoracotomy); NT-04 do not penalise noise on a helipad.

## Open decisions before any implementation
1. Which of the 211 pending rows use the rule (the doctor did not review them).
2. Tiers: advisory/limit/critical thresholds and the penalty size inside his ranges (5-10).
3. Whether noise, rate and pitch down are dropped or kept as warnings only.
4. Whether to start with a minimal set: altitude (above 3000 ft AMSL), vertical G, bank, pitch up.
5. Mission side: options FLIGHT_CONSTRAINTS on/off (profiles, `resetdefault`, `settings first run defaults`, docs, numbered Companion issue), warning voice keys `FC.*`, tablet page for manual HEMS.

Measured signs (H145): nose-up pitch is negative, bank left positive, `ACCELERATION BODY` about 0 at rest (limits are deviations from 1 g). Stretcher head toward the nose.

## New scenes (sources, unbuilt, runtime pending)
Decision of Andrew 2026-11-21: no neonates, no psychosis, no mountains; NS-06 is done with the correct procedure (the patient goes to the specialised centre, not the nearest hospital); at least 5 new scenes. Added by `tools/add-flight-scenes-2026-11-21.js` (idempotent), tables `health108`-`health112` in `05b`, accidents in `02`:
| ID_CARD | Scene | Template | Table / pathologies |
|---|---|---|---|
| 75 | Diving accident at the lake | ID 64 (fishing) | 108: decompression sickness, arterial gas embolism |
| 76 | Chest trauma after a motorway crash | ID 69 (motorway) | 109: tension pneumothorax, action "Chest decompression (mini thoracostomy)" (existing profile `airway_support`, no needle) |
| 77 | Dive into a shallow pool | ID 33 (garden) | 110: cervical spine injury with neurogenic shock |
| 78 | Seizure in late pregnancy at home | ID 28 (apartment) | 111: eclampsia |
| 79 | Collapse in the square at the railway station | ID 58 (station) | 112: aortic dissection, unstable pelvis |
Each row carries `flight_constraint_profile` (data only, nothing reads it yet). Voices: keys `DSC.75.1`-`DSC.79.4` in `tools/voice-texts.json`, pack EN 56; DE/FR packs and the screen translations (`ui-texts.js sync`, `tools/pending-translations`) wait for the publish request. Demographics rows 75-79 in `accident demographics`. Left out on purpose: the transfers NT-01..NT-06 and new pathologies NP-11, NP-12, NP-13, NP-14 (neonate, psychosis, mountain). Square scene: the dispatch text says "railway station square" because no generic square location query exists.

## Minimal set in the sources (2026-11-21, unbuilt, runtime pending)
Module `mission-src/macros/25-flight-constraints.json` (generated once by `tools/add-flight-constraints-2026-11-21.js`; the macros are then edited in place). Started by `objective1` (`flight constraints start`), a thread loop that waits for the option `FLIGHT_CONSTRAINTS` = yes and for `L:{HXX}_SDK_CABIN_PAX_5` = 2 (patient on the stretcher, measured variable, the same as `23-payload-weights`).
- Patient: `HEMS_PATIENT_NUMBER` (1 when empty); profile from `Pn_FC_PROFILE`, set in `initialize patient extra clinical state` from the row field `flight_constraint_profile`. A patient without profile is never penalised.
- Sampling every 0.5 s: altitude `A:PLANE ALTITUDE` (limit = the lower of pickup + relative cap and the absolute cap, never below 3000 ft), vertical load `ACCELERATION BODY Y` (ft/s2, deviation from 1 g), bank, pitch up (nose-up is negative: value = -pitch). Limits from the v1 profile table.
- Tiers: at 100 percent of the limit 5 points, at 130 percent 10 points, repeated every 10 s while exceeded. Altitude lowers SpO2 (`SPO2`, `P2_SPO2`, `P3_SPO2`), the others the lifescore through `multipatient registry manual lifescore override` (fallback: the local). A warning (`FC.G`, `FC.BANK`, `FC.PITCH`, `FC.ALT`, copilot on the ICS, pack EN 57) and a crew message on the tablet at every tier change; `FC.CLEAR` when all four are below 80 percent.
- Option: global `FLIGHT_CONSTRAINTS` yes/no, default **no** until tested in the simulator; tablet page 7 buttons, `settings first run defaults`, the four factory aircraft profiles (no), custom save/load and `resetdefault` carry it (gates `test-global-reset-sync`, `test-aircraft-profile-presets`, `validate-mission` pass on a composed copy). Values for the profiles are a proposal: Andrew to confirm.
- Added later the same day (sources, unbuilt): lateral G (`ACCELERATION BODY X`, limit `g_lat_max`, kind `GX`), longitudinal G (`ACCELERATION BODY Z`, `g_long_max`, kind `GZ`) and pitch down (kind `PDOWN`, only the profile `FC_ICP_HEAD`, `pitch_down_max_deg`; every other profile has limit 0 = never checked, as the doctor asked). Same tiers (5/10 points, 10 s), keys `FC.GX`, `FC.GZ`, `FC.PDOWN` (packs EN 58, DE 41, FR 41), `FC.CLEAR` waits for all seven states. Generator: `tools/add-flight-constraints-2026-11-21.js` (wiring only with `--wire`), voices `tools/add-fc-voices-2026-11-21.js`.
- Pitch up also lowers the systolic pressure (`BP_SYS`, `P2_BP_SYS`, `P3_BP_SYS`) by 10 at tier 1 and 15 at tier 2, and the lifescore by 5 (doctor penalties). The 211 unreviewed rows keep the v1 profile (decision of Andrew 2026-11-21: Stefan reviews them later).
- Noise (Andrew 2026-11-21, kind `NOISE`): active while the engines run (`SDK_ENG_1_N1` or `SDK_ENG_2_N1` above 20) and `SDK_ROTOR_RPM` above 40 percent, only for profiles with sensitivity 2 or 3 (ICP, CPR, seizure); one tier, 5 points every 10 s, key `FC.NOISE` (packs EN 59, DE 42, FR 42). `FC_OBSTETRIC` is OFF for noise: its sensitivity 3 was a guess of the v1 proposal, not of the doctor (the neonate profile is separate and unused); to be confirmed by Stefan. Headset (Andrew 2026-11-21, choice 2): free button FIT HEADSET on the HEMS medical patient page (macro `fit patient headset`, `Pn_HEADSET`, never a mandatory step, no change to the sequences); a patient with the headset is ignored by NOISE, and in automatic medical mode (`P1_MANUAL_MEDICAL_MODE` not manual) the headset counts as fitted by default. Open: helipad exception NT-04 (no detection yet), noise is constant while aboard with engines on.
- Still not in this set, no usable specification or simulator variable yet: advisory tier at 80 percent, rate, descent relief (HAPE/HACE profile has no altitude cap), mountain buffer and grace time, per-patient aboard identity beyond `HEMS_PATIENT_NUMBER`, `health82` 0 (no HEMS indication, action undefined). Needs a numbered Companion issue (draft in `C:e41outputslight-constraintsIssue_FLIGHT_CONSTRAINTS_draft.md`, not opened) and a runtime test.

## Profiles applied to the existing rows (2026-11-21, sources)
`tools/apply-flight-profiles-2026-11-21.js` (idempotent) wrote `flight_constraint_profile` on 224 existing rows (211 not reviewed, kept as proposed, plus 13 changed by the doctor); the 107 rows he set to NONE and every row without an entry have no field. Renames applied: `health16` 6 and 7 ("Resuscitation by partner ongoing"). Not applied: `health82` 0 "no HEMS Indication" (a comment, no action named). With the option FLIGHT_CONSTRAINTS = yes the existing patients now react; default stays no.
