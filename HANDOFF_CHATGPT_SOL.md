## Release 0.997 69

Release 0.997 69 repairs the centralized RescueTrack audio regression published in Release 68.

- Release contract: mission title, CHANGELOG.en.md, and this handoff are updated to 0.997 69. CHANGELOG_USER.en.md remains untouched. Direct push to main is authorized; do not create a pull request.
- Root cause: the Release 68 cleanup correctly removed old per-macro VCP writes but also removed the new central write because it used the same command shape. UpdateRescueTrack therefore contained an empty then array beneath rescuetrack_audio_ready = yes.
- Required central action: after Dispatcher_Messages length increases and the audio-ready gate is yes, the macro must contain exactly one command: set var [L:{local:VCP}NEWMSG, number] to its current value plus 1. Do not hardcode AND/KEK/DUS: local VCP resolves the currently active voice package.
- Initial-dispatch contract remains: objective1 starts with rescuetrack_audio_ready = no and changes it to yes immediately after dispatch ringtone. The initial dispatch has its existing ringtone only; every later RescueTrack message receives exactly one dynamic VCP alert.
- Scope constraint: no other macro may write L:{local:VCP}NEWMSG. Do not use an indiscriminate text cleanup for that command again; validate the central branch after any refactor.
- Static validation: strict JSON parsing succeeds with 514 macros. The central signal has one command, and repository-wide macro audit finds zero direct NEWMSG writers outside UpdateRescueTrack.

### Runtime checks for release 69

1. Accept a dispatch: dispatch ringtone plays once; no second VCP message alert follows.
2. Trigger each available ambulance, police, fire, delayed injury, cancellation, and generic RescueTrack update. Each appended RescueTrack message plays one alert using the currently selected VCP package.
3. Repeat using different available VCP values (for example AND, KEK, DUS) and confirm the same dynamic LVAR route is used without per-package source changes.

## Release 0.997 68

Release 0.997 68 fixes the Release 67 HPG regression, makes every RescueTrack update audible, and completes the marshal's low-NR restart path.

- Release contract: mission title, `CHANGELOG.en.md`, and this handoff are updated to `0.997 68`. `CHANGELOG_USER.en.md` remains untouched. This release is authorized for a direct push to `main`; do not create a pull request.
- RescueTrack audio contract: use `UpdateRescueTrack` as the only VCP `L:{local:VCP}NEWMSG` writer. It compares the current `Dispatcher_Messages` length to its alerted count and sounds once only for a newly appended message. `objective1` sets the audio gate to `no` before the initial dispatch and to `yes` immediately after the existing `dispatch ringtone`, so the initial dispatch retains one sound, not two. No direct `NEWMSG` increment belongs in ambulance, police, fire, cancellation, emergency-landing, or generic RescueTrack message macros.
- Handover display contract: never place `and`/`or` query operands directly in an HPG show_condition. The Medical page uses a simple `ambulance_handover_visible = yes` flag for its handover header/report/bar. Reset it to `no` at Objective 2 and pathology initialization; set it to `yes` only when the eligibility recheck succeeds and provider/report values are populated. Calls with no eligible ambulance must render no handover heading, bar, or null report.
- Medical-page timing/layout: the first permanent bar remains after the report/dispatch information. The handover gets one closing bar only when it is visible. The data/action bar appears only after `medical_assessment_complete = yes`; Medical Actions itself is hidden until `medical_actions_visible = yes`. Vital signs, GCS/CODE, and the three gray GCS references must use the assessment-complete gate without `L:RESCUED`, `L:SAVED`, or `MISSION_PHASE` gates. Preserve the numeric and NT GCS strings, including exactly five spaces before `CODE` on the numeric row.
- Marshal lateral contract: the actual discontinuity is 0°/360°, not 180°. Keep the first distant lateral indication based on the initial half-plane, then: direction 5 changes to 6 only from 12° through 180°; direction 6 changes to 5 only from 180° through 348°. Thus the ±12° neutral cone is centred on 0°/360°. It remains outside the 7 m landing zone and in the existing 15–45 ft lateral phase only.
- Marshal low-NR restart contract: both `marshall` and `pisteur3` watch their own guidance location. While on ground inside the landing circle and below `gndopsNR`, start one 30-second candidate timer. Only if all conditions still hold does `*_landing_confirmed` arm the existing departure state. A conventional stopped/pump restart keeps its existing steps. If a direct idle/CTRL+E restart reaches `gndopsNR` without those early steps, set restart state 3 and guidance state 7; on lift-off the established hover and route-direction logic must still run. Reset the new marshal locals on creation/reset.
- Static validation: strict JSON parsing succeeds with 514 macros; patient health has no direct show_condition.or; L:{local:VCP}NEWMSG occurs only in UpdateRescueTrack; no public changelog file has been edited.

### Runtime checks for release 68

1. Accept a dispatch and confirm its existing ringtone plays once. Then trigger one ambulance/police/fire/status update and confirm exactly one VCP message alert per new RescueTrack row, including delayed injury and cancellation updates.
2. Run a call without an eligible ambulance. Open Medical before and during the visit: there must be no `AMBULANCE HANDOVER`, no empty report, and no tablet TypeError. Run an eligible early-ambulance call: the provider/report and one closing bar must appear only after the real report is ready.
3. On Short timing, open Medical at action 1 and confirm the gray pending line is present. At action 2, confirm vitals, GCS/CODE and their gray references appear while later actions continue; they must not wait for rescue/loading. Confirm there is one bar per visible section rather than consecutive bars.
4. In the distant 15–45 ft approach phase, fly through the marshal's 0°/360° centreline in small increments. It must hold one lateral instruction inside ±12° and change only outside the cone. Inside 7 m, confirm there is no left/right instruction.
5. For each marshal variant, land inside its circle, reduce NR below `gndopsNR` for 30 seconds, then restart from idle or with CTRL+E. The pump animation may be skipped, but state 7, hover after lift-off, and the final departure-direction signal must occur. Repeat a conventional stopped restart to confirm the ordinary rotor-start animation remains.

## Release 0.997 67

Release 0.997 67 adds the approved ambulance-to-HEMS clinical handover and adapts the Medical page to HPG's actual single-column widget constraints.

- Release contract: mission title, `CHANGELOG.en.md`, and this handoff are updated to `0.997 67`. `CHANGELOG_USER.en.md` is intentionally untouched until a public-release changelog is requested. No pull request or push was created.
- Handover eligibility: only one-patient scenes are considered. The controller waits for `ambu1arrived = yes`, then gives the ambulance 8–18 simulated seconds before rechecking that HEMS has not started the visit, the patient is alive and not rescued, the ambulance and patient still exist, and the existing ambulance-preload workflow is not active. If any recheck fails, the handover remains absent; the normal HEMS visit is unchanged.
- Handover result: the ambulance always credits the profile's action 1 (primary survey / primary-survey-and-arrest-recognition). A 55% branch may also credit action 2, which is already a profile-specific basic on-scene action. For action 2, `apply patient1 medical action effect` runs once before HEMS arrival and its outcome is retained as the ambulance handover effect. The HEMS worker skips each credited step, so a clinical effect cannot be applied twice.
- HEMS acceptance: when `crewvisiting1` begins and the handover is ready, the state becomes `acknowledged`, waits two seconds for the report, marks the initial assessment complete if action 1 was credited, and starts the yellow current row at the first remaining action. The existing action interval therefore loses exactly the credited first phase(s), rather than shortening unrelated later treatment.
- Medical-page layout contract: native `bar` image separators are used instead of text dashes; there are no text boxes, columns, mixed-colour lines, or alignment tricks. The conditional handover section is yellow/orange/green as separate HPG lines. The care timeline remains newest action first; ambulance rows are explicit green `AMBULANCE:` entries for actions 2 and 1, and the generic green rows for those credited actions are suppressed.
- GCS/code layout: numeric and NT GCS both display patient code on the same compact coloured text row. The separator before `CODE` is exactly five spaces: enough to detach it visually while preserving one safe single-line string. NT remains yellow and has no numeric total. Gray GCS/code reference text and LifeScore remain after the action/CPR portion; LifeScore remains the final page section.
- Static validation: strict JSON parsing succeeds with 514 macros. The new handover macro has a flat HPG `if: { and: [...] }, eq: 1` eligibility test, all of its display `show_condition` objects have explicit comparators, the dashed headings are gone, and all six generic green action pairs contain a handover suppression clause.

### Runtime checks for release 67

1. Run a one-patient call in which the ambulance arrives at least 18 seconds before HEMS, without triggering the existing ambulance-preload case. Before HEMS arrival, open Medical: the ambulance handover report must appear only after the ambulance work is complete. On HEMS arrival, confirm the acknowledgement appears, action 1 (and sometimes action 2) is green and labelled `AMBULANCE:`, and the first yellow row is the first uncredited action.
2. Repeat with HEMS reaching the patient before the ambulance's 8–18 second window finishes. No handover report or ambulance action row may appear; the ordinary yellow action 1 and deferred vital/GCS reveal must remain unchanged.
3. Exercise a preloaded ambulance case. The existing ambulance-previsit transport flow must continue without the new clinical-handover rows or duplicate effects.
4. Test a numeric-GCS case and an NT-GCS case. Both rows must keep `CODE` on the same line; NT must remain yellow and show `T:NT` with no numeric total. In both cases, verify native `bar` separators, a single `MEDICAL ACTIONS` heading, and LifeScore at the bottom.

## Release 0.997 66

Release 0.997 66 adds a fixed angular hysteresis buffer to the common marshal left/right approach instructions.

- Release contract completed: mission title, `CHANGELOG.en.md`, and this handoff are updated to `0.997 66`. No pull request was created.
- Marshal lateral contract: outside the existing 7 m landing area, only during the pre-existing 15–45 ft lateral-guidance phase, the first side instruction still follows the actual relative bearing. Thereafter it is latched: state 5 changes to state 6 only at or below 168°, and state 6 changes to state 5 only at or above 192°. Thus the neutral sector is exactly ±12° around the former 180° boundary.
- Do not widen this angular buffer as distance increases: a constant 12° sector already produces increasing lateral clearance in metres as distance grows. Do not apply it inside the landing area, where the established hover/descent/landing states (3, 4, 8) remain authoritative and no lateral state is emitted.
- `marshall_lateral_direction` is reset when a marshal is created, so a new marshal begins with its first lateral indication taken from the actual approach side.

### Runtime check for release 66

1. Approach outside 7 m at 15–45 ft and move slowly back and forth around the former 180° line. The marshal must retain its current lateral indication between 168° and 192°, rather than alternating at every position update.
2. Cross below 168° or above 192° and confirm one deliberate side change. Then enter the landing area and confirm the marshal uses only hover, descent or landing guidance, never a lateral indication.

## Release 0.997 65

Release 0.997 65 repairs the indoor privacy-fence regression, restores the approved far-stretcher approach, and completes the automatic medical-action display contract.

- Release contract completed: mission title, `CHANGELOG.en.md`, and this handoff are all updated to `0.997 65`. No pull request was created.
- Fence contract: do not change `fence road` to inspect a query directly. It remains gated by `indoor_scene`. The flag is now reset to `no` and then derived immediately after all eight assignments to local `Query`, including the randomize selection path that had no flag assignment. Indoor query set: apartments/hotels, nursing homes, schools, factories, doctors offices, train stations, supermarkets. This prevents fences for indoor cardiovascular calls regardless of pathology.
- Far-stretcher contract: in `3 crew ground ops` and `4 or 5 crew ground ops`, in the non-ambulance-return branch, the operator approach is exactly `200 degrees / 5 m`, then `185 degrees / 1.5 m`. The post-stretcher return is `185 degrees / 1.5 m`; it then points to the helicopter and closes cargo doors. Keep the existing 245 degrees / 5 m observation point, speed 2, and the wait for `ambustretcher_returning`.
- Medical display contract: action rows are in descending order from the active or latest action to action 1. Current action is yellow and prefixed `IN PROGRESS:`; completed actions are green. Completion is delayed to 75% of the final action interval, giving a visible yellow current state and then a short all-green state. Do not reintroduce concatenated `//` action text or the trailing yellow dashed footer.
- Assessment visibility contract: `medical_assessment_complete` starts `no`, becomes `yes` at the transition to action 2, and gates HR, SpO2, BP, RR, temperature, GCS, and patient code. Before that transition the medical page shows a gray pending-assessment line, not placeholder vital values. LifeScore remains the final page section.
- Static validation: strict JSON parse succeeds; 513 macros; 68 mission records; 660 health records with action profiles. Check all eight Query assignments retain the flag derivation, the two far-stretcher routes retain both approach waypoints, and all 18 measured/code widgets include `medical_assessment_complete` in their show condition.

### Runtime checks for release 65

1. Run a random indoor cardiovascular call (apartment, surgery, school, factory, station, or supermarket) and confirm no ambulance or police fence appears. Run an outdoor call and confirm the appropriate fence can still appear.
2. In 3-crew and 4/5-crew far-ambulance cases, watch the hoist operator travel through 200/5 before 185/1.5, wait at 245/5 while facing the ambulance stretcher, then return to 185/1.5 before cargo-door closure.
3. Open the medical page at visit start: only the assessment-pending message and first yellow action are visible. At action 2, verify patient code and all clinical readings appear. Verify active action yellow, earlier actions green, descending ordering, and a brief all-green final state.

## Release 0.997 64

Release 0.997 64 supersedes the release-63 condition repair with HPG-compatible flat conditions and a full structural audit.

- Why release 63 still failed: HPG treats `and`/`or` as query operands. Adding `eq: 1` to a nested operand made the medical widget invalid and caused the `Symbol.iterator` TypeError.
- Medical display: three critical-vitals flags are recomputed before `set_dispatch`; the three red widgets use flat `and` conditions only. The original normal/critical ranges are unchanged.
- CPR: `cpr_provider_present` is reset then set by HEMS or either ambulance before the existing CPR eligibility condition is evaluated.
- Marshal/pisteur3: `*_landing_authorized` is recomputed in the singleton controller and the ground transition is flat. It needs ground state + distance inside its own landing circle + VAR1 LAND or NR below 80. A touch outside the circle cannot arm departure.
- Audit results: 512 macros; valid JSON; zero `require` missing a comparator; zero non-array `and`/`or`; zero malformed thread/while command lists; zero malformed dispatch-widget conditions. The only literal macro call without a definition is the pre-existing release-46 `beforetockl` link. Do not replace it without a defined checklist scope.
- Regression test: open the medical page only after patient assessment and exercise normal/critical BP, RR and temperature. Then test scene/manual marshal approach, an accidental ground tap outside the landing circle, a commanded landing, prime-pump restart, hover and route departure. Verify the HEMS/ambulance CPR provider gate for each availability combination.

## Release 0.997 62

Release 0.997 62 restores the historical patient-deterioration activation behaviour while keeping the Objective 2 deadlock fix.

- Source audit: release 46 and release 54 have no distance wait at the start of the `life decrease` worker. The first deterioration pass begins after `injured_human` exists.
- The previous `distance < 0.8` wait remains later in the loop, after the timed first segment. The historical `distance < 0.2` wait also remains before the next cycle.
- Current structure: `life decrease` returns immediately after creating its worker; the worker waits for the patient object, then runs the historic loop. It no longer waits for 0.8 before the first pass, so Objective 2 cannot stall at 20%.
- Test from a distant base with a low-lifescore patient: loading must pass 20%; record whether the patient remains viable at normal transit time and whether a very critical patient can still deteriorate before arrival.

## Release 0.997 61

Release 0.997 61 moved the synchronous patient-existence and distance waits from `life decrease` into its worker, fixing the Objective 2 block. Release 62 refines that worker by restoring the historical absence of an initial distance gate.

## Release 0.997 60

Release 0.997 60 is a formatting-only correction to release 59.

- The mission source was restored from the approved compact release-58 text instead of being serialized as a new whole-file layout.
- Release-59 behaviour is retained exactly. The only semantic regions present in the diff are the three integration macros and `on-site operations progress monitor`.
- Keep this formatting contract for every later edit: retain the existing file layout, alter only the necessary macro/data lines, keep simple commands on one line, keep each data entry on one line, preserve compact consecutive command closures, and never reserialize the whole mission through a generic JSON formatter.
- Structural audit: data, threads, locations, icons, objects, user actions, objectives, briefing, and every unrelated macro match the formatted release-58 source. The file remains valid JSON with 512 macros.

## Release 0.997 59

Release 0.997 59 adds an on-site progress display for users who need to distinguish ordinary long scene procedures from a stalled mission.

### Dispatch progress contract

- `L:SATISFACTION` is a per-dispatch LVAR and is reset to 0 in Objective 1.
- The green Mission Dispatch progress bar is visible only when `ops_progress_active = 1`, which is set immediately as the ground crew operation begins.
- A single deduplicated `on-site operations progress monitor` runs every two seconds. It must never start a second worker when the Dispatch page is reopened.
- Progress stages and upper bounds:
  - Crew deployment: 0-18.
  - Patient assessment/treatment: interpolated toward 55 using `TIMERGND`.
  - CPR: a separate slow band to 65 while `L:CPR` is 1 or 2.
  - Patient loading / crew return: toward 88 after clinical care or stretcher-loading states.
  - Final crew return: toward 95 after the patient has loaded.
  - Completion: exactly 100 only when `L:HOISTED = 1` or `L:DISPATCH_ENDED != 0`.
- `TIMERGND` is explicitly not an operation-wide duration. It contains visit timing only; movement between patients, CPR, stretcher activity and return are represented by separate live milestones.
- If the value does not increase for 120 seconds, `ops_progress_warning = 1` and the Dispatch page shows an orange diagnostic row. The monitor does not call `set_message`, so it cannot erase an active operational instruction.
- Reset locals: `ops_progress_active`, `ops_progress_monitor`, `ops_progress_stage`, `ops_progress_warning`, `ops_progress_stalled_seconds`, `ops_progress_last`, and the visit-plan locals.

### Runtime test

1. Begin a 3-crew ground operation: bar appears at 0 and changes during crew deployment.
2. Confirm that it continues through a normal `TIME1*` visit, but cannot exceed 55 before a real later milestone.
3. Trigger CPR and confirm the stage changes without a false completion.
4. Test stretcher/ambulance and direct HEMS loading paths; each must progress only after its actual local changes.
5. Confirm `HOISTED = 1` produces 100 and that the next Objective 1 dispatch begins from a hidden/reset bar.
6. Force a genuine blocked state for at least 120 seconds and confirm the orange Dispatch warning appears once without replacing the mission message.

## Release 0.997 58

Release 0.997 58 replaces the previous CPR implementation with a guarded simulation controller and adds the requested manual stop.

### CPR state contract

- `L:CPR = 0`: idle.
- `L:CPR = 1`: CPR requested. For an onboard patient without mCPR this is the explicit “awaiting landing” state; vitals continue to deteriorate normally.
- `L:CPR = 2`: active CPR. `cpr_active = 1`, `cpr_elapsed` increases in five-second steps, and the two legacy lifescore monitors wait rather than writing competing values.
- `L:CPR = 3`: ROSC. It requires at least 90 seconds of CPR plus recovery across lifescore, HR, SpO2, systolic BP and RR; it is not triggered by a BPM value alone.
- `L:CPR = 4`: unsuccessful CPR/death-path outcome.
- `L:CPR = 5`: manual stop. `cpr_manual_stop = 1` blocks an automatic restart until the next dispatch reset, while normal deterioration remains enabled.

`cpr_armed` is set synchronously before the worker thread starts. This is the concurrency interlock for the existing `life decrease` and `Life rescued` callers; both may still request CPR, but only the first can own it.

### mCPR and provider selection

- Persistent global: `MCPR_ONBOARD`, initialized once to `"no"`. The setting is at **Settings → Scene/Vehicles → Medical Options**.
- A rescued patient with mCPR enabled begins CPR even in flight. With mCPR disabled, the controller waits for `SIM ON GROUND = 1`; no separate hoist exception remains, so ground/hoist/skid paths use one landing gate.
- On scene, HEMS is selected if `crewvisiting1 = yes`; otherwise an ambulance is selected only after `ambu1arrived` or `ambu2arrived` is `yes`. This gives HEMS priority when both are available.
- The H145 cabin CPR animation is only triggered for HEMS CPR after the patient is rescued. Scene/ambulance CPR stays in logic/UI rather than falsely animating the cabin.

### Medical page and STOP CPR

- Active CPR is shown for scene or onboard cases, with provider and elapsed time.
- After `cpr_elapsed >= 300`, the Medical page displays the warning and **STOP CPR** button.
- STOP writes state 5. The worker clears compression rate, releases the two health monitors, sets the manual-stop latch, and does not raise any vital sign or lifescore.
- The compression-rate display is no longer cleared merely by opening the Medical page.

### Indoor privacy screens

- Every item in `data.accidents` has `indoor_scene: "yes" | "no"`.
- `missionupdate` assigns it to the live local; `fence road` requires `indoor_scene != "yes"` before creating an ambulance or police privacy screen.
- Indoor IDs are determined from the actual indoor location macros: apartments/hotels, nursing homes, schools, factories, doctors’ offices, train stations and supermarkets. Garden, road, outdoor and SAR scenes remain eligible for fences.

### Formatting

- The full mission is compacted deliberately: one line per macro command and one line per `data` entry. This preserves the requested same-line closing delimiters and removes the prior multi-megabyte indentation growth.
- Do not run a whole-file pretty-printer with deep indentation; use the compact formatter contract above for future edits.

### Required MSFS validation

1. With mCPR disabled, induce a low-score arrest after boarding while airborne: CPR must show state 1 and wait for landing, then begin only on the ground.
2. Repeat with mCPR installed: state 2 must begin in flight; no second loop may alternate `L:CPR` or CPR animation.
3. Trigger arrest on scene with HEMS and an ambulance present: HEMS must be reported as provider. Repeat before HEMS visit with an arrived ambulance: ambulance must be reported.
4. Let active CPR reach five minutes, press **STOP CPR**, and verify no vital sign improves, no restart occurs, and the normal death path remains possible.
5. Run an apartment/hotel and a road RTC: no `fence` object in the former; normal police/ambulance fence in the latter.
6. Reopen the Medical page during CPR and verify the compression-rate row persists.

## Release 0.997 57

Release 0.997 57 changes only the tablet GCS text format.

- Numeric: `GCS: E: {E} // V: {V} // M: {M} // Total: {total}/15`.
- Not Testable: `GCS: E: {E/NT} // V: {V/NT} // M: {M/NT} // Total: NT`.
- The NT row remains yellow and no numeric sum is calculated or displayed.

## Release 0.997 56

Release 0.997 56 implements randomizable GCS Not Testable (NT) components without reporting a misleading total.

### GCS NT contract

- `0` is the internal NT sentinel only. It is never shown on the tablet.
- Profile records retain `gcs_eye_min`, `gcs_verbal_min`, and `gcs_motor_min`; for compatible scenarios the relevant minimum is set to `0`, so the existing random extraction can choose NT naturally.
- Profile matching is deliberately limited: E covers facial burn/edema/compatible facial trauma; V covers intubation, tracheostomy, aphasia and dysphasia; M covers spinal/paralytic and severe movement-preventing fracture trauma. A generic fracture or unconfirmed minor symptom is not automatically NT.
- `update patient1 physiology` derives `GCS_ANY_NT`. If any component is zero, it sets its display local to `NT`, suppresses the numeric GCS total, and the medical page shows a yellow `GCS: E… V… M… - NT (no total)` row. If none is zero, existing numerical total rendering and severity colours apply.
- Coma/CPR writes assessable components to `1` but do not overwrite an existing zero NT component.

### Validation

1. Force or select a compatible profile until one component draws zero.
2. After visiting patient 1, verify the tablet renders `NT`, not `0`, in that component.
3. Verify there is no `/15` or numeric total on the NT row and that the row is yellow.
4. Select a normal profile and verify the green/yellow/red numeric total path remains unchanged.

## Release 0.997 55

Release 0.997 55 combines the requested marshal-touchdown interlock, patient-1 vital-sign correction, and opaque cropped medical icons.

### Marshal state-machine changes

- The common scene marshal and heli-rescuer marshal (`pisteur3`) now keep approach armed after an accidental, brief ground contact.
- Departure may arm only after either:
  1. the controller had already selected `VAR 1 = 4` (LAND) while inside the configured landing area; or
  2. rotor RPM falls below 80%, which is the explicit sustained shutdown/land-elsewhere signal.
- `*_wind_rotation_lock` activates inside 150 m, on the ground, or after a landing commit. This stops the old wind worker before the final approach. A one-shot `*_final_facing_done` command points the marshal at the helicopter after a committed landing. The latch is cleared once a new distant airborne approach is armed.
- The implementation alters locals and guarded object orientation only; it does not introduce a second `VAR 1` writer.

### Patient-1 physiology and page

- All 609 health records retain their diagnosis-specific profile fields but no longer contain an initial range that can create zero/negative telemetry for a living patient. Values are constrained by lifescore: >=30 has at least SpO2 88%, HR 40, BP 80/45, RR 8 and temperature 35 C; lower positive lifescores allow moribund values but remain non-zero.
- Initialization falls back if a profile field is null or zero, randomizes integer GCS E/V/M values, and enforces systolic > diastolic.
- The pre-existing `life decrease` thread now waits for the established 0.8 scene-distance gate before the first decrease. Its `decr_rate` and randomized decrease mechanics otherwise remain in place.
- GCS is placed directly below the gray emergency-code explanation and is shown only after the same `RESCUED/SAVED/MISSION_PHASE` conditions already used by HR/SpO2. Its three explanatory rows remain separate and gray. BP, RR and temperature use their own custom icons, show only post-visit, and turn red outside their stated critical ranges.
- The four custom PNG data URIs use opaque black backgrounds and compact crops, because transparent pixels are displayed white by the tablet renderer.

### Required MSFS test sequence

1. Start an approach, briefly touch ground before a LAND signal, then lift off: approach must continue and departure must remain disarmed.
2. Complete a commanded landing: marshal must stop wind movement, face the helicopter once, and then run the established restart/departure sequence.
3. Land away from the designated spot, shut down below 80% Nr: approach may hand over to departure/idle as the intentional shutdown case.
4. Open Medical page before and after visiting patient 1. Before the visit, no GCS/BP/RR/temp rows should appear. Afterwards, values must be non-zero for lifescore >0, GCS components must be integers, and icon backgrounds must be black without white margins.
5. Verify lifescore remains unchanged while travelling to the scene, then begins its existing randomized `decr_rate` progression only inside the 0.8 gate.

# HEMS Random and Everywhere Missions - Handoff for ChatGPT SOL

## Release 0.997 54

Release 0.997 54 fixes patient-1 physiology initialization: profile values are copied inside the pathology-selection context, then read from locals by the initializer. This eliminates the 0/0 mmHg, 0/min, 0.0 C, and GCS 0 display seen in testing. A normal fallback remains only for missing data.

Vitals and their small monitor variations begin after the existing 0.8 scene-distance gate; the original lifescore decay and `decr_rate` behavior are retained. Medical page shows separate icon rows for BP, RR, temperature, and GCS; E/V/M explanations are three individual lines. No pull request was created.

## Release 0.997 53

Release 0.997 53 moves patient-1 physiology from 107 aggregate category profiles to 609 individual diagnosis records. Every `health*` record now contains bounds for E/V/M GCS, SpO2, HR, systolic/diastolic BP, RR, and temperature. Patient 1 reads the selected diagnosis directly.

A new 20-40 second monitor gives the displayed observations small bounded variation. It calls the same physiology logic used by life decrease: moderate hypoxia increases HR/RR; severe hypoxia reduces HR/RR/BP; CPR still forces E1V1M1, GCS 3 and RR 0. No pull request was created.

## Release 0.997 52

Patient 1 now has a pathology-profiled physiology model and full GCS display. Release title: `HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 52`; JSON parses with 511 macros. No pull request was created.

There are 107 profiles, one for each existing pathology list. They bound initial GCS E/V/M, SpO2, HR, BP, RR, and temperature. The page records component GCS plus the total; it includes all official response levels, including None = 1. At LIFESCORE below 18 the simulation records E1 V1 M1, total GCS 3. CPR is represented explicitly as GCS 3, RR 0 and compression-state pressure.

Test selection, declining SpO2, severe hypoxia, and CPR on patient 1 before extending this model to patients 2-5. The Technical-page marshal button edits already present on main were preserved.

## Release 0.997 51

Release 0.997 51 adds the requested custom-location marshal icon and corrects custom-hospital icon transparency. The mission title is `HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 51`; strict JSON parsing confirms 509 macros. No pull request was created.

The supplied 32 x 32 PNG URI is registered as `custom_marshall`. Only the Technical-page `CREATE ON CUSTOM LOCATION` map point uses it. Its point remains the selected landing reference, not the marshal object; the marshal itself remains offset by 18 m. The `CREATE IN FRONT` marker remains unchanged.

The existing 18 x 18 `cus_hospital` PNG is now RGBA-transparent: precisely 132 pure-white background pixels were converted to alpha 0. The green hospital mark was not redrawn or recolored. All five persistent custom-hospital database points retain their `cus_hospital` reference, so they receive the transparency correction automatically.

Test in MSFS/HOC:

1. Use `CREATE ON CUSTOM LOCATION` and confirm the selected landing point shows the new marshal icon, while the physical marshal remains offset from that point.
2. Use `CREATE IN FRONT` and confirm its pre-existing icon remains unchanged.
3. Add or load each custom hospital and confirm its green symbol has no white square on the map.

## Release 0.997 50

Release 0.997 50 corrects marshal lateral guidance and makes a pump-initiated rotor start latch at 20% NR. The mission title is `HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 50`; strict JSON parsing confirms 509 macros. No pull request was created.

The Technical page does not own a special left/right controller: its marshal is the shared `marshall` object. That controller had its VAR 1 = 5/6 mapping reversed. It now matches the already-correct `pisteur3` controller: relative bearing >180 gives move left (VAR 1 = 5), otherwise move right (VAR 1 = 6). Therefore the correction covers manual, scene, base, and hospital `marshall` roles; `pisteur3` was verified and left unchanged.

For both controllers, each first-pump start and its latched continuation now promotes restart state 1 to state 2 at rotor RPM >=20% rather than >50%. State 2 holds idle/flashlights regardless of first-pump switch release until the existing >90% NR move-up threshold. This prevents an already-spooled start from falling back to engage-rotor when the first pump is released between 20% and 50%.

Targeted MSFS/HOC test:

1. Test manual, scene/base/hospital marshal approach at the same relative positions on both sides of the landing point: it must command the visually correct left/right motion and remain centered inside the 7 m buffer.
2. Start with either first prime pump, then release it after NR has passed 20% but before 50%: the marshal must stay idle/flashlights, not restart or reset.
3. Continue above 90% NR: verify move-up, lift-off hover for two seconds, then the existing departure direction.
4. Repeat the rotor test with `pisteur3`; its lateral mapping must remain unchanged and its 20% restart latch must behave identically.
5. Reuse manual marshal creation and confirm monitor debug remains one shared controller and the engine guard blocks automatic ENG 1/ENG 2 only while the helicopter is inside that marshal landing area.

## Mandatory release closeout - do not skip

For every behavior change, treat this as a blocking release gate before reporting completion:

1. Read the current title from `everywhere_all.json` and advance its progressive `0.997 N` suffix exactly once for the release.
2. Update all three release artifacts in the same publication: `everywhere_all.json`, `CHANGELOG.en.md`, and this handoff.
3. Preserve the mission's compact/manual JSON formatting; parse the complete JSON after editing.
4. Re-fetch the published files and verify the mission title, changelog entry, and handoff entry all name the same release.
5. Do not create a pull request unless the user explicitly asks for one. Do not announce the release as complete if any of the above checks is missing.

## Release 0.997 49

Release 0.997 49 fixes manually created marshal operation. The mission title is `HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 49`; strict JSON parsing confirms 509 macros and the 27 existing `set_dispatch` commands. No pull request was created.

Root cause: `marshaller animation monitor` was launched only from `delayed threads` after DOC connection. A Technical page marshal could exist before that call, keep `VAR 1 = 0`, and never set the state which blocks the automatic prime-pump engine handlers.

The new `ensure marshaller animation monitor` macro starts exactly one shared controller. `activate marshall guidance` is called after every physical marshal creation, immediately applies idle/flashlight state, and computes `marshall_engine_guard_active`. The guard is active only if the helicopter is inside that marshal's configured landing-circle area. The `ENG 1_2` and `ENG 2_1` event handlers now test this precise guard, so a nearby manual marshal blocks their automatic copilot start sequence while a distant marshal does not.

Manual marshal behavior to test in MSFS/HOC:

1. Create in front with engine/rotor stopped: marshal must immediately show idle/flashlights.
2. Switch either first prime pump on while inside its landing circle: no automatic ENG 1/ENG 2 copilot sequence may start; marshal must control restart.
3. Complete rotor start, lift, hover, route direction, return airborne beyond 150 m, and approach/land.
4. Create at an accepted custom POI, then repeat the restart and approach test.
5. Replace an existing manual marshal repeatedly and confirm monitor debug remains 1, not multiple controller writers.
6. Move outside the landing circle and confirm a distant marshal no longer blocks a normal engine start.

The future patient architecture work is documented separately in `HANDOFF_SOL_MULTI_PATIENT_ARCHITECTURE.md`; it is not part of this release.

## Release 0.997 48

Release 0.997 48 corrects the Technical page front-marshal reference. The mission title is `HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 48`; strict JSON parsing confirms 507 macros. No pull request was created.

`CREATE IN FRONT` snapshots `$USER` as the landing/departure reference and creates the marshal 25 m ahead, facing that reference. Thus the controller guides the helicopter to its current point, not to the marshal. `CREATE ON CUSTOM LOCATION` continues to use the accepted map POI as the landing reference and creates the marshal 18 m offset. Both actions replace an existing marshal through `reset marshall guidance`; rejecting the map selection makes no change.

## Release 0.997 47

Release 0.997 47 completes the optional marshal work that was requested before release 45 but was absent from main. The mission title is `HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 47`; JSON parsing confirms 507 macros and the 27 existing `set_dispatch` commands. No pull request was created.

The destination-settings category now has one persistent two-button marshal control: start base (default `no`) and destination hospital (default `yes`). Normal second dispatches retain the user choices; `resetdefault` clears them for the documented first-start defaults. The start-base marshal is 25 m ahead of the mission start and does not rotate to wind. The hospital marshal faces the landing point; it uses wind orientation only without custom hospital waypoints, otherwise it is created 1 m right of `ambumedic`.

Technical page marshal actions have no visibility condition: `CREATE IN FRONT` is 25 m ahead of the helicopter; `CREATE ON CUSTOM LOCATION` uses an accepted map POI and creates no route or other scene object. Both use the existing temporary `injured_location` map icon.

All marshal roles use one configured guidance target and reset their transient controller state before replacing an existing marshal. Scene wind updates run only for role `scene`; hospital wind updates run only for role `hospital`. This prevents stale workers from competing for `marshall`. The phase-limited scene wind loop is removed.

The final static checks also corrected the live left/right branch: relative bearing >180 produces right (`VAR 1 = 6`), and the opposite sector produces left (`VAR 1 = 5`). Keep the established 7 m deadband, `distance:m`, 45 ft descent threshold, 3 kt gate, 2-second hover, <=10 ft landing condition, and inverted forward/rear departure mapping. Marshal-specific 13 m positions are now 18 m.

The five new marshal macros follow the compact/manual JSON convention: simple commands are one line and complex conditions remain multiline.

Runtime test focus: verify the new settings buttonbar before dispatch, base marshal creation, both hospital placement branches, both Technical page actions, and a full approach/restart/departure sequence. Static validation cannot replace an MSFS/HOC runtime test.

## Release 0.997 46

Release 0.997 46 fixes the road-vehicle spawn race: the generic sampled OSM query now clears and waits for its response, while police, fire, ambulance, and closest ambulance/police station resolvers guarantee a valid scene-relative fallback and readiness before a vehicle can be moved. The ambulance candidate resolver no longer writes `[0,0]` temporary locations. This prevents a valid route from being created after its vehicle has already remained at the simulator origin. The mission title is `HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 46`; strict JSON parsing confirms 502 macros and the 27 `set_dispatch` commands are unchanged. Runtime verification is still required for all road-rescue variants.

## Historical release 0.997 45

Release 0.997 45 keeps the successful marshal state-machine rewrite and the corrected lateral `VAR 1` mapping. It restores the native `distance:m` query in both controllers, as used by the rest of this HEMS mission, instead of performing an unnecessary feet-to-meter calculation. The restart forward/aft inversion is unchanged and remains validated by the previous test. Both authoritative copies pass strict JSON parsing and the marshal structure checks described below.

## 1. Current authoritative file

Use this file as the current working release:

`everywhere_all.json`

Current title:

`HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 49`

The latest user-supplied Desktop source was:

`C:\Users\Andrew\OneDrive\Desktop\everywhere_all.json`

It was used as the base because it contained user changes to heli-rescuer drop distances and ambulance-previsit behavior. The Desktop source is read-only from this workspace. Do not overwrite it.

The latest release has valid JSON, restored compact command formatting, intentional blank lines between macro groups, no incompatible Unicode dash characters, and static debug coverage for the supported local/LVAR references. Dynamic debug entries whose names depend on `local:VCP`, `local:HXX`, or `local:rescuetrack_id` are intentionally omitted because the HPG debug `var` form cannot resolve those interpolated names. The inherited static macro references `beforetockl` and `ELT {local:ELT}` remain unresolved by the local scanner.

Release 0.997 33 removes 226 `local:VCP` LVAR displays, 96 `local:HXX` LVAR displays, and the dynamic `rescuetrack_{local:rescuetrack_id}` local display from the debug page. Mission logic and static local/LVAR debug entries are unchanged. The consolidated changelog was updated, and the GitHub change was merged into `main` through pull request [#32](https://github.com/davierosoft/HEMS-random-everywhere-mission/pull/32).

Release 0.997 34 removes the upper `MISSION_PHASE` limits from the `marshall` and `pisteur3` guidance monitors. Each monitor remains available while its object exists, resets its active/hover/rotor/departure state when the object disappears, and can therefore re-arm if the helicopter returns to the scene later. Normal guidance animation holds are 1 second; the first hover signal before a slow/close descent is held for 2 seconds. The lateral buffer is 7 m and the ground-speed transition is 3 kt. A first hover signal is followed by descent, and at or below 10 ft under the descent conditions the object receives `VAR 1 = 4` (land). The two pre-existing delayed wind-orientation threads remain unchanged. The new hover-state locals are shown on the debug page and reset at Objective 1.

Release 0.997 35 adds a non-blocking restart state machine to both ground-guidance objects. When the helicopter is on ground, rotor RPM is at or below 5% and either first fuel pump is primed, the marshal sends `VAR 1 = 2` (engage rotor). Once RPM exceeds 50% it sends `VAR 1 = 1` (idle) until RPM exceeds 90%, then sends `VAR 1 = 7` (move up). After the helicopter leaves the ground it sends `VAR 1 = 3` (hover) for 2 seconds, then selects the route-destination direction relative to the marshal's facing bearing. Because the marshal faces the helicopter, the longitudinal indications are inverted as requested: a target in the marshal-forward sector uses `VAR 1 = 12` (rear), while the opposite sector uses `VAR 1 = 11` (straight/forward); lateral sectors use `VAR 1 = 9` (left) and `VAR 1 = 10` (right). The destination is resolved from the active flight-plan target (`RTB_location`, `hospital`, or `hospital_user`); an unavailable target safely falls back to `VAR 1 = 12`. The restart polling uses no `wait_for`, resets state when its object disappears, and can re-arm after a later low-RPM/pump-primed return. The wind-orientation threads were not modified. This release is currently local and has not been published to GitHub.

Release 0.997 36 adds explicit mutual arming for the approach and departure procedures. Each monitor arms approach only while the helicopter is airborne and beyond 150 m from its landing/meeting spot. Once the helicopter is on the ground inside the configured lime-circle radius, approach is disarmed and departure is armed; departure is suppressed immediately whenever approach re-arms. This removes competing `VAR1` writes during restart and return-to-scene transitions. The wind repositioning workers may arm at 500 m from the relevant spot, while their wind-facing formulas and movement logic remain unchanged. The four arming locals are visible in debug and reset when the controlled object disappears. This release is currently local and has not been published to GitHub.

Release 0.997 38 records the gray spelling audit and the debug-page `NotFound` fix. All eleven isolated `dispatch control` color tokens were changed to the majority spelling `gray`; all mission color tokens now use `gray`. The original `L:VOLUME_CREW` and `L:VOLUME_CHK` assignments were inside the `L:SECOND_DISPATCH_ACCEPTED != 1` branch and could be skipped on reload/second dispatch. Objective 1 now preserves their global values (default 100) and synchronizes both LVARs unconditionally; the original later `L:WAVING_CIVILIAN_STOP = 0` assignment is unchanged. Mission-flow updates, debug exclusions, and other parameters remain unchanged. The source and output files both pass strict JSON parsing, and this release remains local with no GitHub publication or merge.

Release 0.997 39 defines the reload persistence boundary. `VOLUME_CREW` and `VOLUME_CHK` are user settings: Objective 1 never resets them, defaults them to 100 only when `NULL`, and always restores their `L:VOLUME_CREW`/`L:VOLUME_CHK` mirrors. Configuration values, external `L:CUS_*` inputs, save-slot `TEMP...` values, and the `L:SECOND_DISPATCH_ACCEPTED` handoff gate are not part of the normal per-dispatch reset. Objective 1 resets only transient phase/progress state, route diagnostics, pathology readiness, rescue-vehicle and arrival state, scene-object handles, and marshal/pisteur3 guidance, restart, hover, bearing, and mutual-arming locals. The explicit `resetdefault` macro remains the separate user-settings reset path. This release is prepared for publication after strict JSON validation.

Release 0.997 43 is the authoritative marshal-controller design. `marshaller animation monitor` now has exactly two `create_thread` entries: one owns `marshall`, and one owns `pisteur3`. There are no other `VAR 1` writers for either object. Both use the same state contract:

- Approach and departure arming are mutually exclusive. Approach can arm only when airborne and more than 150 m from the relevant spot; the landing procedure arms departure only once on ground inside `ldg_spot_area_size`. No `MISSION_PHASE` condition is used.
- Approach is suppressed behind the marshal and at or above 100 ft. Valid close guidance uses 7 m lateral tolerance. Above 45 ft it commands down (`VAR 1 = 8`); with lateral error, it commands up (`7`) only below 15 ft, otherwise left/right (`5`/`6`). Inside the buffer it holds hover (`3`) for 2 seconds, then permits down only at <=3 kt and land (`4`) only at <=10 ft.
- Departure begins only after the landing procedure has disarmed. On ground with either first pump primed and Nr <=5%, it sends engage rotor (`2`) once. It holds idle (`1`) above 50%, sends up (`7`) above 90%, holds hover (`3`) for 2 seconds after take-off, and then sends exactly one route-relative departure direction (`9`-`12`). If both first pumps are off and Nr is below 80% on the ground, all departure transient state is cleared and idle is held.
- `marshall_guidance_state` / `pisteur3_guidance_state` record the last command; `*_guidance_initialized` prevents duplicate initialization. `*_hover_signal_sent` is now a phase (`0` not issued, `1` during the required two-second hover, `2` complete). All are reset in Objective 1 and shown in the debug page.
- Do not add a parallel writer to either object. Wind-orientation threads are intentionally separate and were left byte-for-byte outside the monitor replacement.

Release 0.997 44 applies the follow-up alignment corrections. In the approach branch, relative bearing >180 now emits left (`VAR 1 = 5`) and the opposite sector emits right (`VAR 1 = 6`) for both objects. The controller now reads the HPG-documented `distance:ft` location query and multiplies by `0.3048`; consequently `marshall_lz_distance` and `pisteur3_lz_distance` remain meter values while the 7 m buffer and 150 m arming gate are unit-consistent. The departure route mapping is untouched: forward/aft remains intentionally opposite (`12` for the marshal-forward sector and `11` for the opposite longitudinal sector).

Release 0.997 45 supersedes only the distance-query implementation of 0.997 44. The controller directly queries `distance:m` for `landing_spot` and `heli_rescuer_location`, avoiding a redundant conversion. The 7 m and 150 m thresholds, corrected left/right mapping, departure state machine, and forward/aft inversion are otherwise unchanged.

Release 0.997 18 also separates scene fire/VFX selection from pathology selection. Normal scenes prefer a non-fire pathology for both `random_fire=no` and the non-forced `yes` VFX mode; `random_fire=forced` prefers fire. If the preferred fire state is absent from the selected health list, a bounded relaxation accepts an available record instead of producing the old fallback. A second bounded pass can align `SEX1` to the selected pathology record before `random injured` creates `injured_human`; `injured_workers` is synchronized to male before the pathology thread starts. Missing or out-of-range standard types are remapped to `health1`-`health107`, and Halloween pathology types outside `healthhalloween` are remapped to the available 0-29 range. In normal mission data, the old fallback should now be reachable only if the relevant health static is missing or empty.

The VFX contract is unchanged and is now consistent across random, custom, and multiplayer selection: `random_fire=yes` sets `VFX` to a random integer from 0 to 36, `random_fire=forced` sets it from 5 to 13, and `random_fire=no` sets `VFX=100`. Objective 2 now waits for `pathology_random_ready=1` before starting the scene macro, closing the remaining race between pathology/sex selection and `random injured` object creation.

Release 0.997 19 keeps the marshal departure-direction mapping unchanged. It only inverts the lateral approach signals, suppresses approach guidance when the landing spot is behind the marshal's forward cone, lowers the lateral correction threshold from 7 m to 2 m, and widens the vertical landing band to preserve a 10 ft separation around the 15 ft approach height. A landed helicopter within 15 m now receives the land signal. Wind-facing rotation formulas are unchanged; a separate lock pauses those two orientation loops inside 60 m until one minute after takeoff. Custom VFXA repositioning now uses the exact CUSVFXA coordinates (zero bearing/offset/heading), avoiding the previous 1 m/10 degree placement error. Objective 1 also removes stale custom scene objects and clears OBJECT1-OBJECT15 locals before the next dispatch, preventing old object instances from overlapping new VFX or scene objects.

Release 0.997 20 corrects the 3-crew pilot (`pax3`) state after the optional poordead approach. The pilot now returns to `VAR 1 = 14` (pilot idle) instead of the crew-only state used in the 4/5-crew patient-visit branch.

Release 0.997 21 removes the redundant deceased-on-scene line from the pink end-of-mission statistics view only. Operational deceased messages and casualty-count logic are unchanged.

Release 0.997 22 corrects the marshal and `pisteur3` altitude guidance. Above 60 ft they signal descent; between 30 and 60 ft they retain horizontal guidance without a vertical command; below 30 ft they signal climb unless within 5 m of the landing spot. Within 5 m, the signal is hover while moving at 2 knots or more and descent below 2 knots. After touchdown the non-Halloween marshal signal is cleared to `VAR 1 = 0`; the existing rotor-deceleration and restart state machine is otherwise unchanged.

Release 0.997 32 fixes the marshal monitor activation path. The behind-marshal test now compares the helicopter's bearing from the actual `marshall`/`pisteur3` object with that object's facing bearing to the landing/heli-rescuer spot; it no longer uses the helicopter's own heading, which could suppress every signal while the wind thread continued moving the object. The monitor explicitly suppresses approach signalling at or above 100 ft, retaining the 150 m gate. Rotor-engage waits are now polled instead of blocking the whole monitor on `wait_for rotor >5`; the signal is held while rotor RPM is at or below 5% and cleared once RPM rises. The two pre-existing wind-orientation threads were not modified. Debug output now includes target, facing, relative, and behind flags, and Objective 1 resets the new locals.

The 3-crew and 4/5-crew stretcher return paths now use three side-of-helicopter bearing2 waypoints followed by `rpaxdoor`, with VAR1 reset after the single four-waypoint drive, so the operator does not route through the helicopter body.

The GitHub handoff for the previous pathology release is on branch `agent/pathology-fallback-0999`, pull request [#28](https://github.com/davierosoft/HEMS-random-everywhere-mission/pull/28). The save/load audit release is on branch `codex/save-load-audit-0999`, pull request [#30](https://github.com/davierosoft/HEMS-random-everywhere-mission/pull/30). The marshal activation follow-up is on branch `codex/marshal-fix-0999`, pull request [#31](https://github.com/davierosoft/HEMS-random-everywhere-mission/pull/31). The debug-page dynamic-variable cleanup is merged into `main` through pull request [#32](https://github.com/davierosoft/HEMS-random-everywhere-mission/pull/32).

## 2. Important generation warning

The current release script is:

`C:\Users\Andrew\Documents\Codex\2026-08-11\d\work\fix-helirescuer-3crew-skid.mjs`

It reads the Desktop file and writes `outputs/everywhere_all.json`. Running it again after modifying only the current output can overwrite those changes because the Desktop file is its source. If you continue from the current release, either update the script source path to the current release or apply changes directly to a new copy and preserve the user's Desktop modifications deliberately.

Every new release must continue to be named `everywhere_all.json`; distinguish releases by incrementing the title suffix, for example `0.997 19`.

## 3. Mission architecture and state model

### Persistent state

- Globals persist in the save file after their first assignment.
- Globals that are expected to be initialized must be set in Objective 1 when `NULL`.
- Globals that are not part of savegame or statistics must be included in the reset-default path.
- Statistics globals must also be reset by the statistics reset macro.

### Session state

- LVARs survive for the flight session and normally start at zero if never initialized.
- Locals survive for the flight session and normally start as `NULL` if never initialized.
- Objective 1 contains both always-reset session values and first-dispatch-only values. Keep these categories separate.
- Supported static locals and LVARs should be added to the debug page, grouped by function and separated with `image: bar` where useful. Do not add dynamic variable names that contain an interpolated local.

### Condition syntax

- `show_condition` must use `and`; do not put `or` inside it.
- If a button needs alternative visibility conditions, create two equivalent buttons with separate `show_condition` blocks.
- Avoid unsupported nested `and`/`or` combinations in command conditions unless the exact structure has been tested.
- Do not use `copy_location` with an unresolved parameter such as `vehicle`.
- Do not use parameterized `create_location` forms that the HPG API does not accept.

## 4. Three-crew skid flow

Main macro:

`3 crew SKID LDG`

Entry actions are in the two `skid_landing` user-action definitions and are guarded by `CREW = 3`.

Final behavior:

1. The helicopter must satisfy the existing skid landing envelope.
2. `hoist_crew` is the only cabin member deboarded for the three-crew configuration.
3. The crew member is represented by PAX3/station 6 while on the ground.
4. For helicopter transport, the patient is approached, stabilized, and loaded with the hoist.
5. During hoist loading, the copilot is temporarily moved to PAX2 and `COPILOT = 0`; station weights are adjusted.
6. The patient hand-off is explicitly ordered:
   - wait for hoist at ground;
   - random delay of 2-5 seconds;
   - set `H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_ON` to show the stretcher;
   - destroy `injured_human` only if it exists;
   - random delay of 2-5 seconds;
   - destroy `hoist_crew` only if it exists;
   - set hoist human and bag ON;
   - wait 1 second;
   - start hoist-up.
7. After the cabin is restored, PAX2 is removed, the copilot returns to PAX1, station weights are restored, both doors are closed, and `MISSION_PHASE` advances as in the existing mission flow.
8. The final three-crew branch sets `HOLDHOISTED = 1` so the heli-rescuer reboarding thread can finish.

Ground transport values:

- `whobringpatient = us`: patient and crew return by helicopter.
- `whobringpatient = ambulance`: the patient is managed by ground medical services and the cabin crew returns for skid pickup.
- `whobringpatient = ambudoc`: the patient and the PAX3 doctor remain with ground medical services; the doctor must not be returned to the helicopter.
- `whobringpatient = lethimdie`: the three-crew skid flow converts this to `us` when no ground transport is selected.

## 5. Heli-rescuer synchronization

Main macros:

- `gnd ops heli rescuer down`
- `gnd ops heli rescuer up`
- `hoist heli rescuer down`
- `hoist heli rescuer up`
- `drop heli rescuer`
- `drop heli rescuer ground`
- `drop heli rescuer hoist`

The current synchronization rule is:

- The down thread waits for the initial `HOLDHOISTED = 1` deboarding signal and immediately consumes it by setting `HOLDHOISTED = 0`.
- The four securing movements and the medical ground work then run without triggering the up-thread.
- The three-crew skid macro sets `HOLDHOISTED = 1` only after all patient branches have completed.
- Only then may `gnd ops heli rescuer up` or `hoist heli rescuer up` reposition the heli-rescuer under the aircraft and board them.

Doors are explicitly closed at the end of ground deboarding, hoist deboarding, ground boarding, hoist boarding, and the three-crew skid branch. If a future branch opens a door asynchronously, add its close operation after the final object movement, not before.

### EU Firefighter marshaller support - release 0.997 14

- `addon check` fetches `/VFS/SimObjects/Airplanes/68ponyGT_EU_Firefighter1/aircraft.cfg` and sets `68pony_marshal` to `OK` or `NO`.
- When `68pony_marshal = OK`, `marshall` and `pisteur3` use the `EU Firefighter 1` title with `Airbus H145 FR Pisteur 1` as fallback. Without the addon, the original titles remain in use.
- `marshaller animation monitor` drives VAR2 mask state and VAR1 idle, hover, land, left/right/up/down, rotor-engage, and wind-relative departure signals. It uses the landing spot for `marshall` and `heli_rescuer_location` for `pisteur3`, with the requested altitude bands, tolerances, and minimum animation timing. Approach guidance is gated to 150 m and below 100 ft. Departure guidance is cleared at 50 ft or after 70 m from the spot. Halloween fool mode uses VAR1 `100` for idle/ready states.
- Objective 1 resets the guidance state; the debug page exposes addon status, activity, distances, bearings, and signal flags. Engine start macros wait for active marshaller guidance to finish.
- The two pre-existing delayed monitor threads that move/orient the marshallers according to wind are deliberately preserved unchanged. Do not remove, replace, or rewrite those threads; future changes must coexist with them.
- Officer-clearance bearings are calculated first with a `set` query and then passed to `drive_object` through `bearing2`/`param`, matching the working train/midway pattern. A raw `bearing` query is never embedded directly as a drive waypoint.

Hoist arming is intentionally requested before close-contact positioning in:

- the `us` branch of `3 crew SKID LDG`;
- `drop heli rescuer hoist`.

Do not move this request after the aircraft is already holding the difficult contact position.

## 6. Drop heli-rescuer action

The `drop heli rescuer` macro creates:

- `DROP HELIRESCUER HERE` for base, hospital, or user hospital destinations;
- the normal `GO BACK TO MEETING POINT` action when dropping has not been selected.

State locals:

- `helirescuers_drop_here_monitor`
- `helirescuers_drop_here_ready`
- `helirescuers_drop_here_selected`
- `helirescuers_drop_here_mode`

Current destination modes are `base`, `hospital`, and `hospital_user`.

The monitor uses a widened 500 m destination readiness tolerance in the current release, as requested by the user. The normal operational landing/hover checks remain separate. The selected drop path calls `helirescuers_follow_destination`, clears the normal route-restoration state, and prevents the normal return-to-drop-point action from being used afterward.

The selected drop path now starts `helirescuers_follow_destination_delayed` in a worker thread. The helper waits until the selected hospital locations exist, then adds a short 2-5 second handoff delay before the heli-rescuer follows the hospital medical staff. At base, `servicecar2` is preferred when it exists; otherwise the heli-rescuer follows the remaining cabin crew or the RTB location. This keeps the deboarding macro responsive and avoids a race with hospital staff creation.

### Doctor deboarding fix

In the final `deboarding` macro, the three-crew medical cabin member is the `pax3` object. A previous synchronization gate made `pax3` wait forever on `L:HOLD` whenever a service vehicle object was present, even if that vehicle route had failed or was no longer the active handoff. The current release replaces that unbounded wait with a bounded 2-5 second pause. The pilot and copilot branches use the same bounded handoff, so 4- and 5-crew returns do not inherit the same stall. The user-hospital predefined arrival thread also waits for the reliable `hospital_user` arrival rather than an unsupported/fragile alternate OR branch before moving `ambumedic` and `ambustretcher`.

## 7. Police landing-zone transfer

Relevant macros include:

- `police_preposition_to_landing_spot`
- `police_landing_spot_departure_notice`
- `police_board_waiting_crew`
- `police_ensure_second_officer_at_scene`
- `policeman2_keep_clear_of_vehicles`
- `3 crew ground ops`
- `4 or 5 crew ground ops`

Rules:

- A distant custom landing spot forces police prepositioning when police is present or arriving.
- The police car stops at least 20 m from the landing-spot center.
- The landing-spot action is locked while the car moves.
- A RescueTrack/tablet departure notice is delayed about 3 seconds; movement starts after about 5 seconds.
- The moving car carries one officer. `policeman2` remains at the accident scene.
- When the crew reaches the car, `hoist_crew` and `pax3` board using the existing transfer sequence, become visually hidden, and are recreated at the scene after the police car returns.
- The police route must not be replaced by a direct walk from the landing spot to the accident when the forced-pickup flag is active.
- Do not reintroduce `copy_location` or parameterized `create_location` in this path.

State locals used by this flow include:

- `police_lz_transfer_state`
- `police_lz_force_pickup`
- `police_lz_pickup_ready`
- `police_lz_move_lock`
- `police_lz_departure_delay_done`
- `policeloadingenabled`

## 8. Rescue vehicles and arrival flags

Vehicle arrival must be published only after the final stop and parking maneuver. Use the existing operational flags, not only distance:

| Vehicle | Local flags | Availability flags |
|---|---|---|
| Ambulance | `ambu1arrived`, `ambu2arrived` | `AMBU_AVAIL`, `L:VARAMBUAVAIL` |
| Police | `poli1arrived`, `poli7arrived` | `POLICE_AVAIL`, `L:VARPOLICEAVAIL` |
| Fire engine | `fire1arrived`, `fire2arrived` | `FIREENGINE_AVAIL`, `L:VARFIREAVAIL` |

Parking constraints:

- Use each scene's stop-distance locals.
- Prefer scene waypoints and road endpoints over arbitrary direct moves.
- Park vehicles laterally and alternate sides when possible.
- Preserve the normal order from the scene outward: fire engine, ambulance, police.
- Maintain at least 5 m from `injured_human` and the existing vehicle separation targets.
- Avoid adding OSM routes solely for separation.

## 9. Dispatch cancellation and statistics

Cancellation state:

- `CANCELTHRESHOLD` defaults to 80 if `NULL`.
- Settings can set it from 50 to 100.
- Cancellation is evaluated after sufficient rescue resources are present and after all lifescores exceed the threshold.
- A random 1-3 minute delay is used after vehicle arrival.
- RescueTrack receives the operational notification that HEMS is no longer required.
- The mission phase is advanced so a new dispatch can be accepted, and return-to-base is enabled.
- Cancellation count is incremented in the persistent statistics global and shown on the statistics page.

Do not put cancellation errors in `RESCUE_TRACK`. Use the dedicated briefing or mission-dispatch error indicator.

## 10. Randomize, poordead, and ambulance pre-visit

Randomize:

- The active accident count is checked before random selection.
- Zero active accidents stops randomization and displays the red briefing/dispatch error indicator.

Poor-dead:

- `poordead` changes the message text and displayed deceased count only.
- It must not increment `HELOVICTIMS`.

Ambulance pre-visit:

- The intended design is a random pre-visit for one victim, ambulance plus police present, helicopter not yet landed, and lifescore above 40.
- Ambulance and police must have been present for the required two-minute interval.
- `ambustretcher` loads the patient; `ambumedic` remains on scene until HEMS arrives.
- A RescueTrack message reports patient loaded and awaiting HEMS when the dispatch remains active.
- The loading decision is independent of cancellation. If the lifescore later qualifies for cancellation, the dispatch may be cancelled after the patient is already aboard the ambulance.

When cancellation criteria are valid, do not emit any ground-service message that says HEMS intervention is still required. Do not duplicate the existing red victim indicator in briefing or dispatch.

Important discrepancy to verify: the latest Desktop source and the current generated release contain `ambulance_previsit_roll < 99`, while an earlier implementation used `< 30` for the requested 30% probability. This was preserved from the user's latest source and should be explicitly confirmed before changing it.

Health-data fallback:

- The current release normalizes missing fields in every `health*` data list before the mission consumes them.
- Missing values use: `id = No info received`, `smoke = no`, `fire = no`, `medical_symptoms = No info received`, `diagnosis = Undetermined`, `scoremin = 30`, `scoremax = 90`, `decr_rate = 1`, `spo2 = 97`, and `bpm = 70`.
- Existing authored values are preserved; only absent keys are filled.

## 11. Dispatch map and refueling

- `accident prelocation` must recreate/update the current dispatch location and refresh the map point on every new dispatch.
- Remove the old dispatch icon before adding the next one, including when the previous dispatch was not accepted.
- Do not rely on `location_name` alone to move an existing icon; update the point location explicitly.
- Refueling must be debounced so moving the slider cannot launch multiple refueling macros. Keep the 2-second delay and the active-macro guard.

## 12. Route delivery hardening - release 0.997 15

`routeupdate` now serializes concurrent calls with `routeupdate_lock`, then copies `location_name` into `routeupdate_target` before its existing delay. It validates the snapshot in two steps: the value must be non-null, then `has_location` must resolve it. A valid automatic route uses `try`/`catch` around `set_route` and retries once after one second. A missing target or two failed attempts records `routeupdate_error`, captures `$ERROR` in `routeupdate_error_detail`, clears the route/map line safely, and lets the mission continue.

The same guard is used by the manual `SEND DIRECT-TO NAVIGATION TO FMS` action, the heli-rescuer flight-plan selection, the tablet home-key flight-plan thread, and RescueTrack waypoint activation. Manual map-preview lines use the validated snapshot and are not drawn when it is invalid.

`NOCONNEXT` remains intentional: `0` sends a direct-to through `set_route`; `1` clears the FMS route and draws the map line; `2` clears the FMS route and does not draw a line. Therefore a user in mode `1` or `2` should not expect an FMS `set_route` until switching to automatic mode or using the direct-to action.

Debug page values:

- `routeupdate_target` - destination snapshot used by the most recent route update.
- `routeupdate_valid` - `1` only when the snapshot resolved with `has_location`.
- `routeupdate_lock` - `1` while a route update owns the serialized handoff.
- `routeupdate_error` - last route status (`missing_location`, `set_route_failed`, retry failure, or context-specific failure code).
- `routeupdate_error_detail` - the `$ERROR` value captured by the last `try`/`catch`, when the Mission System supplied one.

When debugging a report that says no route was supplied, first record `NOCONNEXT`, `location_name`, `routeupdate_target`, `routeupdate_valid`, and `routeupdate_error`. If the target is valid and the status is clear but the FMS still has no route, capture the Mission System `$ERROR` from the command log and the simulator build/add-on state.

### Pathology fallback correction - release 0.997 16

The pathology fallback must not assign a plain object literal to a Mission System `param`. The object is resolved as a query expression, so keys such as `id` produce `query not found`. In the standard and Halloween pathology engines, when the retry limit is reached, `randomhealth1/2/3` is set to the string `fallback`; a following multiline IF assigns the fallback values directly to the patient locals.

Fallback locals:

- Patient 1: `generic_pathology1 = No info received`, `medical_symptoms1 = No info received`, `diagnosis1 = Undetermined`, `LIFESCORE` randomized from 30-90, `SPO2 = 97`, `BPM = 70`, `decr_rate = 1`.
- Patients 2 and 3: the corresponding pathology, symptoms, diagnosis, and `LIFESCORE2/3` values use the same fallback range and text.
- `AGEMIN` and `AGEMAX` are cleared for patient 1 so the existing age fallback is used afterward.

The direct assignments are present for standard, secondary, and Halloween selection. Do not restore the old `set param myhealth*` object-literal fallback.

### Autosave pathology persistence - release 0.997 17

`pathology random engine` and its Halloween counterpart run their selector in `create_thread`. Before this release, `objective4` could call `savetemp` before that worker had assigned `generic_pathology1`; setting `TEMPPATHOLOGY1` from a null local does not create a useful persisted global entry. The release adds:

- `pathology_random_ready`, initialized to `1` in Objective 1, set to `0` when a pathology worker starts, and set to `1` only after the worker has completed its fallback/selection normalization.
- A bounded 5-second polling window at the start of `savetemp`, avoiding an indefinite `wait_for` while allowing the normal asynchronous selector to finish.
- The shared `ensure pathology1 fallback` macro, which guarantees `generic_pathology1`, symptoms, diagnosis, score, SpO2, BPM, and degradation rate have valid values before autosave. If the source pathology is unavailable, it uses the agreed fallback (`No info received`, `Undetermined`, score 30-90, 97, 70, 1).
- Objective 1 resets the patient-1 pathology locals and readiness state so stale values cannot be copied into a new dispatch.

Therefore `TEMPPATHOLOGY1` is now always assigned a non-null value by autosave. If it is absent from a locally inspected `global.json`, verify that the file belongs to the active mission save/profile and was read after the autosave completed; the mission source itself does not embed runtime global values.

## 13. Current issue resolutions

- Issue 06: `whobringpatient = ambulance` is now selected only after an ambulance arrival state (`ambu1arrived`, `ambu2arrived`) is true. Police arrival alone no longer selects the ambulance branch; the separate police requirement for ambulance pre-visit remains intact.
- Issue 10: rescue-vehicle `drive_object` calls are routed through per-vehicle watchdog macros. Each wrapper runs the drive in a worker thread, catches command errors, applies a vehicle-specific timeout, records `arrived`/`failed`, and uses the terminal waypoint as a guarded `move_object` fallback so a blocked vehicle cannot hold the mission indefinitely. Watchdog state locals are prefixed `drive_watchdog_`.
- Issue 11: pathology selection no longer leaves `myhealth*` pointing at the last incompatible random record after the retry limit. The selector installs the deterministic fallback record agreed in the issue and marks the result `fallback`; this applies to patients 1-3 and the Halloween selector.
- Issue 14: the failure engine now dispatches the failure index through one supported `switch` command. The original failure side effects are preserved, with one common delay and reset per cycle.

## 14. Testing sequence for SOL

Run tests in this order and record the result for each:

1. Load `everywhere_all.json` and verify the title suffix.
2. Test 3 crew, one heli-rescuer, skid landing:
   - four securing movements complete without premature repositioning;
   - patient hoist order is visible and synchronized;
   - hoist arming is requested before close-contact positioning;
   - heli-rescuer eventually boards again;
   - left and right doors are closed.
3. Repeat with 3 crew and two heli-rescuers, then with 4 and 5 crew.
4. Test `us`, `ambulance`, and `ambudoc`, including no ambulance and three victims.
5. Test `DROP HELIRESCUER HERE` at base, fixed hospital, and user hospital.
6. Test a distant custom landing spot with police already on scene and police still arriving.
7. Verify police crew boarding, visual hiding, return to scene, and `policeman2` placement.
8. Test every subset of rescue vehicles and confirm arrival flags change only after parking.
9. Test dispatch cancellation at threshold and below threshold, including a new dispatch afterward.
10. Test zero active accidents, `poordead`, missing optional objects, and the second-ambulance clearance path.
11. Press `Next Dispatch` repeatedly and verify the icon location and stale-icon cleanup.
12. Move the refueling slider repeatedly and verify only one macro instance starts.

The latest release has only been structurally validated in this workspace. Runtime behavior in MSFS/HOC still needs to be tested after these final heli-rescuer and deboarding changes, especially 3-crew doctor movement and 4-/5-crew returns.

## 15. Editing and release rules

- Keep simple commands on one line.
- Keep complex conditions and IF structures multiline.
- Keep blank lines between macro categories.
- Use only the ASCII hyphen `-` in user-visible text.
- Do not introduce `or` into `show_condition`.
- Preserve existing user changes when starting from a newer Desktop file.
- Write the next artifact as `everywhere_all.json` and increment the title suffix.
- Re-run JSON parsing, macro-reference scanning, duplicate-key scanning, and Unicode-dash scanning before handoff.

## 16. Ambulance distance and second-ambulance work in release 0.997 10

- The pre-visit monitor now measures the parked `ambulance1` distance from `accident_location`. The closest-ambulance flow uses the same `ambulance1` alias after its final parking step, so the check covers both normal and closest ambulance.
- Pre-load is rejected when the parked ambulance is more than 600 m from the scene. The distance rejection is applied after the VFXA/weather force calculation, so forced weather loading cannot bypass the 600 m safety limit.
- When the normal ambulance is known to be over 600 m away, the user destination menu exposes a direct `Unload to ambulance` action. It is available only after the ambulance arrival flag is set and a measured distance is present; the existing closest-ambulance unload action remains available for the closest branch.
- Added `closest ambulance police crew transfer`. For a closest-ambulance mission, it evaluates the stopped `police7` distance to the patient. At more than 600 m it leaves the crew on the normal walking path; otherwise it moves the crew into the police car, sends the car through dedicated landing-zone and return routes, and deboards the crew at the scene. It is launched from both ground-ops variants and guarded by a per-dispatch state local.
- Added `ambulance2 secondary rescue`, `ambulance2 secondary patient2`, and `ambulance2 secondary patient3`. When a second ambulance is parked and a second/third patient remains, a literal-named crew is created, visits the patient, and loads that patient aboard the second ambulance. The patient2 branch is preferred, with patient3 as fallback.
- The second ambulance waits until the visit/load sequence is complete, waits for the ambulance1 destination/departure state, and creates a route to the same `hospital_user` destination. If `poordead` exists, it waits until at least one police or fire unit remains available before departing.
- New session locals are reset in Objective 1: pre-visit distance state, second-ambulance rescue state, ambulance1 destination/departure state, closest-police transfer state, and closest-police crew-onboard flags.
- The debug page now displays the new distance, secondary-ambulance, destination/departure, closest-police transfer, and police-crew-onboard locals in grouped sections.
- Two landing-zone police routes and one second-ambulance destination route family were added only for these new transport cases. They use literal object/location names and do not use `copy_location` or parameterized `create_location`.

## 17. Closest waypoint route split - release 0.997 27

- Every remaining `drive_object` whose route contained two or more top-level `closest` waypoints was split into one drive command per waypoint.
- A standing animation state is inserted between the segments so the next closest calculation starts only after the preceding movement has completed.
- The reset uses the HPG H145 Crew VAR 1 state appropriate to the object: HEMS walking without a backpack (2) -> standing without a backpack (0), HEMS walking with a backpack (3) -> standing with a backpack (1), stretcher walking without/with patient (10/11) -> standing stretcher without/with patient (12/13), and pilot walking (16) -> pilot standing (14).
- No generic reset to zero was added. Patient VAR1 states and existing crouch/hoist states remain unchanged. The final audit reports zero drive commands with multiple top-level closest waypoints; routes containing one closest waypoint followed by fixed waypoints were left unchanged because they cannot switch closest side between two dynamic waypoints.
- JSON parsing passed after the transformation. Runtime behavior still needs an MSFS test, with priority on the 3-crew, 4-crew, 5-crew, hoisting-return, ambulance-transfer, and heli-rescuer paths.

## 18. Prime-pump engine-start guard - release 0.997 29

- Removed the wait_for blocks from the engine1 and engine2 macros that queued an engine start until marshal guidance ended.
- The ENG 1_2 and ENG 2_1 monitor threads now evaluate the start conditions immediately after the prime-pump transition.
- If marshall_ground_ops_active or pisteur3_guidance_active is 1 at that instant, the engine-start action is discarded and cannot restart later when the marshal becomes inactive.
- The pump wait_for commands remain only as edge detection for the simulator switch transition; they no longer defer an already-requested engine start.
- JSON parsing and structural checks passed. Runtime verification is still required with prime pumps enabled during marshal ground operations and then switched off.

## 19. Save/load audit and slot restoration - release 0.997 31

- The save contract contains one autosave (`savetemp`) and three manual slots (`save1`, `save2`, `save3`). Each manual slot already stores the mission code, scene variant, crash variable, victim state/pathology values, VFX/casualty state, coordinates, heading, SAR start coordinates, and rescue-vehicle availability.
- `preload1`, `preload2`, and `preload3` copy those slot values into the base `TEMP...` namespace before `reloadtemp` starts the reload. The copies for `TEMPaccident_description` and `TEMPSAR` are now present as defensive slot-state restoration. For a standard accident ID, however, the final local `SAR` is regenerated from `VAR_MISSION_NUMBER`/`CUS_ID_CARD` by `missionupdate CUSTOM`; those copies are not what decides the standard mission's SAR flag.
- `SAVENAME*` and `SAVEVALID*` are slot metadata, not mission state. `TEMPELEVATION*` is used by the save-preview location macros; the mission itself recreates the scene location and does not need that value to run.
- On reload, `reloadtemp` restores the start/accident/rescue/user-A coordinates, heading, SAR start coordinates when the saved SAR state is active, mission identifiers, victim data, VFX/casualty data, and rescue-vehicle availability. Static accident metadata (including SAR, name, objective, scene macro, query, icon, and allowed vehicle flags) is regenerated from the saved mission ID and variant, so duplicating those fields in the save is unnecessary for ordinary missions.
- The custom location pre-generator now tests the regenerated local `SAR` value instead of the persistent `TEMPSAR` global. This avoids a stale/missing autosave global changing an externally launched standard custom mission selected by ID.
- The current format is a semantic mission restart, not a byte-for-byte snapshot of an in-flight scene. Object coordinates, active thread positions, current mission/dispatch phase, timers, landing-spot edits, and vehicle positions are not serialized. Restoring those would require a separate operational-state protocol and should not be approximated by adding random globals.
- A latest simulator `global.json` may omit null or never-assigned save keys; that is normal. `savetemp` creates the autosave globals at runtime. The project copy is included with the release, but the live MSFS profile file could not be read from this environment because the Windows app container denied access; compare it after copying it out of the protected folder if a byte-level profile audit is required.

## 20. External custom-script contract

- `CUSTOM_MISSION` is also entered by an external mission script; it is not limited to the in-mission custom menu. The external loader must set the `L:CUS_*` inputs before loading `everywhere_all.json` and must leave them available until Objective 1 reaches the custom branch.
- Required custom-dispatch inputs are `L:CUS_SEND_DISPATCH=1`, `L:CUS_ID_CARD`, `L:CUS_CRASH_VARIABLE`, `L:CUS_MISSION_SCENE_VARIANT`, `L:CUS_START LAT/LON`, `L:CUS_ACCIDENT LAT/LON`, `L:CUS_RESCUE LAT/LON`, and `L:CUS_USERA LAT/LON`. SAR scripts additionally provide `L:CUS_SAR_reload=1` plus `L:CUS_SAR_START LAT/LON`.
- The custom path consumes those values in this order: `CUSTOM_MISSION` -> `missionupdate CUSTOM` -> custom location generators -> `Mission dispatch`. Do not reset or rename these LVARs in Objective 1, save/load changes, or scene-generation macros before that sequence completes.
- For a standard accident ID, `missionupdate CUSTOM` is authoritative for `SAR` and the other accident metadata; it resolves them from the accident table using `L:CUS_ID_CARD`. External scripts do not need to duplicate those derived values.
- Save reload intentionally reuses the same `L:CUS_*` handoff after copying the saved coordinates into the base namespace. Any external script should therefore treat the CUS variables as the stable interface, rather than depending on internal locals such as `accident_name` or `MISSION_PHASE`.
- `train.json` was supplied from the protected MSFS package path, but that path is ACL-protected in this workspace and the file could not yet be read or copied. Before changing the custom interface, place an accessible copy in the repository/workspace; then add it to GitHub as a reference fixture and validate its exact `L:CUS_*` writes against this contract.

