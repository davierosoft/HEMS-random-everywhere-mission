#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checklistDefinitions = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/03-aircraft-crew-checklists.json'), 'utf8'));
const runtime = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/14-shared-runtime.json'), 'utf8'));
const ground = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/08-ground-response.json'), 'utf8'));
const hoist = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/09-hoist-ground-ops.json'), 'utf8'));
const debug = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/15-debug-and-df-ui.json'), 'utf8'));
const scene = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/06-scene-generation.json'), 'utf8'));
const checklists = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/03-aircraft-crew-checklists.json'), 'utf8'));
const navigation = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/05-navigation-queries.json'), 'utf8'));
const transfer = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/10-transfer-special-missions.json'), 'utf8'));

function fail(message) { throw new Error(`Ground operations recovery: ${message}`); }
function requireTrue(condition, message) { if (!condition) fail(message); }
function contains(value, predicate) {
  if (predicate(value)) return true;
  if (Array.isArray(value)) return value.some((entry) => contains(entry, predicate));
  if (value && typeof value === 'object') return Object.values(value).some((entry) => contains(entry, predicate));
  return false;
}

const clinical = runtime['patient1 clinical visit gate'];
requireTrue(Array.isArray(clinical) && clinical.length === 1, 'patient 1 clinical visit gate is missing');
requireTrue(contains(clinical, (entry) => entry && entry.if && entry.if.global === 'P1_MANUAL_MEDICAL_MODE' && entry.eq === 'manual'), 'manual medical mode no longer uses its clinical gate');
requireTrue(contains(clinical, (entry) => entry && entry.set && entry.set.local === 'medical_actions_started' && entry.value === 1), 'automatic clinical treatment does not start when the clinician arrives');
requireTrue(contains(clinical, (entry) => entry && entry.set && entry.set.local === 'medical_actions_visible' && entry.value === 'yes'), 'automatic clinical treatment is not shown to the user');
requireTrue(contains(clinical, (entry) => entry && entry.call_macro === 'apply patient1 medical action effect'), 'automatic clinical treatment does not apply the configured actions');
requireTrue(!JSON.stringify(clinical).includes('SIM ON GROUND'), 'patient 1 clinical treatment is incorrectly gated by ground state');
requireTrue(contains(hoist, (entry) => entry && entry.call_macro === 'patient1 clinical visit gate'), 'the HEMS clinician arrival path does not invoke the patient 1 clinical gate');

const returnAfterPickup = ground.police_return_after_crew_pickup;
const restoreSecondOfficer = ground.police_ensure_second_officer_at_scene;
requireTrue(contains(returnAfterPickup, (entry) => entry && entry.call_macro === 'police_ensure_second_officer_at_scene'), 'police return after crew pickup does not restore the second officer');
requireTrue(contains(restoreSecondOfficer, (entry) => entry && entry.drive_object && entry.drive_object.name === 'policeman2' && Array.isArray(entry.drive_object.to) && entry.drive_object.to.includes('POLMAN2')), 'second officer is not returned to POLMAN2');
requireTrue(contains(restoreSecondOfficer, (entry) => entry && entry.point_object === 'policeman2' && entry.to === 'accident_location'), 'second officer is not pointed toward the incident after return');

const crewSpawnLaunch = runtime['crew spawn launch'];
const crewSpawnWait = runtime['crew spawn wait'];
const crewSpawnFailure = runtime['crew spawn failure'];
const nrGate = runtime['ground ops NR gate'];
requireTrue(Array.isArray(crewSpawnLaunch) && JSON.stringify(crewSpawnLaunch).includes('LAUNCH:') && JSON.stringify(crewSpawnLaunch).includes('crew_spawn_log'), 'crew spawn launch does not log the requested title and fallback');
requireTrue(Array.isArray(crewSpawnWait) && JSON.stringify(crewSpawnWait).includes('"CREATED"') && JSON.stringify(crewSpawnWait).includes('"eq":-1') && JSON.stringify(crewSpawnWait).includes('"value":20'), 'crew spawn wait does not confirm CREATED or detect failed creation');
requireTrue(Array.isArray(crewSpawnFailure) && JSON.stringify(crewSpawnFailure).includes('"param":"error"') && JSON.stringify(crewSpawnFailure).includes('ERROR: crew creation failed'), 'crew spawn failure does not preserve the command error and show an error message');
requireTrue(Array.isArray(nrGate) && JSON.stringify(nrGate).includes('WAITING:') && JSON.stringify(nrGate).includes('PASSED:') && JSON.stringify(nrGate).includes('gndops_nr_gate_log'), 'NR gate watchdog must log waiting and passed states');

const debugRows = debug['debug page'].find((command) => Array.isArray(command.set_dispatch)).set_dispatch;
const debugCapture = debugRows.flatMap((row) => row.buttonbar || []).find((button) => button.title === 'CAPTURE SNAPSHOT').commands;
const snapshotSummary = debugCapture.find((command) => command.set?.key === 'snapshot_summary').value.create_struct;
requireTrue(debugRows.some((row) => row.text === 'CREW SPAWN {0} | NR GATE {1}' && row.params?.[0]?.local === 'crew_spawn_log' && row.params?.[1]?.local === 'gndops_nr_gate_log'), 'Debug Summary does not show the crew and NR watchdog logs');
requireTrue(debugCapture.some((command) => command.set?.key === 'crew_spawn_log') && debugCapture.some((command) => command.set?.key === 'gndops_nr_gate_log'), 'CAPTURE SNAPSHOT does not persist the crew and NR watchdog logs');
requireTrue(snapshotSummary['local:crew_spawn_log']?.local === 'crew_spawn_log' && snapshotSummary['local:gndops_nr_gate_log']?.local === 'gndops_nr_gate_log', 'snapshot summary does not include the live crew and NR watchdog logs');
requireTrue(debugRows.some((row) => row.text === 'SNAPSHOT | CREW SPAWN {0} | NR GATE {1}'), 'Debug Summary does not render crew and NR logs from a saved snapshot');

const macroDirectory = path.join(root, 'mission-src', 'macros');
const crewObjectFiles = fs.readdirSync(macroDirectory).filter((file) => file.endsWith('.json'));
let crewObjectCount = 0;
let crewWrapperCount = 0;
let nrGateCalls = 0;

function isCrewObject(command) {
  return command && command.create_object && (command.create_object.title === '$TITLE Crew' || command.create_object.fallback_title === '$TITLE Crew');
}

function inspectMacro(value, file, macro, inOr = false) {
  if (Array.isArray(value)) {
    value.forEach((command, index) => {
      if (isCrewObject(command)) crewObjectCount += 1;
      if (command && command.try && Array.isArray(command.try) && command.try.length === 1 && isCrewObject(command.try[0])) {
        const crewName = command.try[0].create_object.name;
        const before = value[index - 1];
        const after = value[index + 1];
        crewWrapperCount += 1;
        requireTrue(before && before.call_macro === 'crew spawn launch' && before.params?.crew_name === crewName && before.params?.crew_title === command.try[0].create_object.title && before.params?.crew_fallback === command.try[0].create_object.fallback_title, `${file}:${macro} does not log the exact crew creation request for ${crewName}`);
        requireTrue(after && after.call_macro === 'crew spawn wait' && after.params?.crew_name === crewName, `${file}:${macro} does not synchronously confirm ${crewName}`);
        requireTrue(command.catch?.[0]?.call_macro === 'crew spawn failure' && command.catch[0].params?.crew_name === crewName && command.catch[0].params?.error?.param === '$ERROR', `${file}:${macro} does not report an immediate creation error for ${crewName}`);
      }
      inspectMacro(command, file, macro, inOr);
    });
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.call_macro === 'ground ops NR gate') nrGateCalls += 1;
  if (value.wait_for?.var?.[0] === 'L:{local:HXX}_SDK_ROTOR_RPM' && value.lt?.local === 'gndopsNR' && macro !== 'ground ops NR gate') {
    requireTrue(inOr, `${file}:${macro} retains an unlogged standalone NR gate`);
  }
  Object.entries(value).forEach(([key, child]) => inspectMacro(child, file, macro, inOr || key === 'or'));
}

crewObjectFiles.forEach((file) => {
  const module = JSON.parse(fs.readFileSync(path.join(macroDirectory, file), 'utf8'));
  Object.entries(module).forEach(([macro, commands]) => inspectMacro(commands, file, macro));
});
requireTrue(crewObjectCount === 77 && crewWrapperCount === crewObjectCount, 'every packaged $TITLE Crew creation must have one synchronous watchdog wrapper');
requireTrue(nrGateCalls === 24, 'every standalone NR < gndopsNR gate must use the watchdog');

const threeCrewDestinationMacros = [
  navigation['User destination1'],
  navigation['Ambulance destination1'],
  transfer['midway patient load1'],
  transfer['transfer patient load1']
];
threeCrewDestinationMacros.forEach((macro, index) => {
  const serialized = JSON.stringify(macro);
  requireTrue(serialized.includes('"crew_title":"$TITLE Crew"') && serialized.includes('"crew_fallback":"Airbus H145 ADAC Crew"'), `three-crew destination branch ${index + 1} no longer creates the livery Crew object`);
  requireTrue(!serialized.includes('$TITLE Pilot') && !serialized.includes('Airbus H145 ADAC Pilot'), `three-crew destination branch ${index + 1} incorrectly uses a Pilot title instead of Crew VAR 1 states`);
  requireTrue(serialized.includes('"VAR1":16') && serialized.includes('"var":"VAR 1"},"value":14'), `three-crew destination branch ${index + 1} does not preserve pilot walking and standing VAR 1 states`);
});

const railwayScene = scene.train;
const railwaySceneText = JSON.stringify(railwayScene);
requireTrue(railwaySceneText.includes('"param":"railway_nodes","path":"length"') && railwaySceneText.includes('"param":"highway_nodes","path":"length"'), 'railway crossing must guard empty OSM node arrays');
requireTrue(railwaySceneText.includes('"param":"train_brg"},"value":{"rand":[0,359]') && railwaySceneText.includes('"param":"crash_brg"},"value":{"rand":[0,359]'), 'railway crossing must provide bearing fallbacks when OSM nodes are unavailable');

const primaryAmbulanceAssessment = scene['ambustretcher full']?.[4]?.create_thread?.commands?.[10];
requireTrue(primaryAmbulanceAssessment?.if?.var?.[0] === 'L:RESCUED' && primaryAmbulanceAssessment.eq === 0, 'primary ambulance assessment branch is missing');
for (const [count, expectedPatients] of [[1, [1]], [2, [1, 2]], [3, [1, 2, 3]]]) {
  const branch = primaryAmbulanceAssessment.then.find((entry) => entry.if?.local === 'HELOVICTIMS' && entry.eq === count);
  const assessed = [];
  const collectAssessments = (value) => {
    if (Array.isArray(value)) value.forEach(collectAssessments);
    else if (value && typeof value === 'object') {
      if (value.call_macro === 'ambulance assess patient') assessed.push(value.params?.patient);
      Object.values(value).forEach(collectAssessments);
    }
  };
  collectAssessments(branch?.then);
  requireTrue(JSON.stringify(assessed) === JSON.stringify(expectedPatients), `primary ambulance must assess patients ${expectedPatients.join(', ')} when ${count} casualties exist`);
}

const secondaryAmbulance = ground['ambulance2 secondary rescue']?.[1]?.then;
requireTrue(Array.isArray(secondaryAmbulance), 'secondary ambulance assessment sequence is missing');
const patient2Assessment = secondaryAmbulance.findIndex((entry) => entry.call_macro === 'ambulance assess patient' && entry.params?.patient === 2);
requireTrue(patient2Assessment > 0 && contains(secondaryAmbulance.slice(0, patient2Assessment), (entry) => entry?.create_object?.name === 'ambumedic2') && contains(secondaryAmbulance.slice(0, patient2Assessment), (entry) => entry?.drive_object?.name === 'ambumedic2'), 'secondary ambulance must create and move its medic before assessing patient 2');
const patient3AssessmentBranch = secondaryAmbulance.find((entry) => entry.if?.local === 'HELOVICTIMS' && entry.gte === 3);
requireTrue(patient3AssessmentBranch?.then?.some((entry) => entry.drive_object?.name === 'ambumedic2') && patient3AssessmentBranch.then?.some((entry) => entry.call_macro === 'ambulance assess patient' && entry.params?.patient === 3), 'secondary ambulance must move its medic before assessing patient 3');

const residential = scene.residential;
const finalResidentialPlacement = residential.at(-1)?.if?.local === 'HELOVICTIMS' && residential.at(-1)?.eq === 3 ? residential.at(-1) : residential.at(-2);
const finalResidentialText = JSON.stringify(finalResidentialPlacement);
requireTrue(finalResidentialText.includes('"has_location":"rescue_location"') && finalResidentialText.includes('"move_object":"injured_human"') && finalResidentialText.includes('"move_object":"injured_human2"') && finalResidentialText.includes('"move_object":"injured_human3"'), 'residential three-casualty scene must reassert every casualty at the rescue point after scene creation');
const residentialFire = residential.find((entry) => entry.if?.local === 'HELOVICTIMS' && entry.eq === 3 && JSON.stringify(entry).includes('random_fire'));
const residentialFireText = JSON.stringify(residentialFire);
requireTrue(residentialFireText.includes('"local":"random_fire"},"value":"forced"') && residentialFireText.includes('"local":"VFX"},"value":8'), 'only the residential fire branch must force a random-VFX fire intensity');
requireTrue(!residentialFireText.includes('VFXB') && residentialFireText.includes('"wait_for":{"has_object":"VFXA"}') && residentialFireText.includes('"move_object":"VFXA","to":"FIRE"'), 'residential fire must use the random-VFX object at the authored fire location');
const firetruck1Text = JSON.stringify(ground.Firetruck1);
requireTrue(firetruck1Text.includes('"local":"VFX"},"gte":5') && firetruck1Text.includes('"local":"VFX"},"lte":15') && firetruck1Text.includes('"call_macro":"Firetruck2"'), 'a forced residential fire must retain the existing two-firetruck response');

const avionic = checklistDefinitions.aviopftckl;
const beforeTakeoff = checklistDefinitions.beforetockl;
const takeoff = checklistDefinitions.takeoffckl;
const transitionBefore = checklistDefinitions['checklist transition before takeoff'];
const transitionTakeoff = checklistDefinitions['checklist transition takeoff'];
requireTrue(avionic.find((entry) => entry.set_dispatch)?.set_dispatch.some((row) => row.link === 'PROCEED WITH TAKE OFF CHECKLIST' && row.commands?.some((command) => command.if?.local === 'checklist_avionic_advanced')), 'avionic/preflight page lacks a working proceed button');
requireTrue(beforeTakeoff.find((entry) => entry.set_dispatch)?.set_dispatch.some((row) => row.link === 'PROCEED WITH TAKE OFF CHECKLIST' && row.commands?.some((command) => command.if?.local === 'checklist_beforetakeoff_advanced')), 'before take-off page lacks a working proceed button');
for (const [name, checklist, next] of [['avionic', avionic, 'beforetockl'], ['before take-off', beforeTakeoff, 'takeoffckl']]) {
  const serialized = JSON.stringify(checklist);
  requireTrue(serialized.includes('"sleep":20') && serialized.includes(`"call_macro":"${next}"`), `${name} checklist lacks the 20-second automatic continuation`);
}
requireTrue(transitionBefore && transitionTakeoff, 'legacy transition helpers are missing');
requireTrue(takeoff.some((entry) => entry.set_dispatch?.some((row) => row.text === 'SLOPE TAKE-OFF PROCEDURE' && row.show_condition?.or)), 'take-off checklist does not place conditional slope guidance first');
const takeoffText = JSON.stringify(takeoff);
requireTrue(takeoffText.includes('PLANE PITCH DEGREES","Radians') && takeoffText.includes('PLANE BANK DEGREES","Radians') && takeoffText.includes('0.20944'), 'slope guidance does not use the 12-degree radians threshold');
requireTrue(takeoffText.includes('"param":"L:FLI"') || takeoffText.includes('L:FLI'), 'take-off FLI gate is missing');
requireTrue(takeoffText.includes('SDK_ENG_1_TRQ') && takeoffText.includes('SDK_ENG_2_TRQ') && takeoffText.includes('takeoff_torque_delta'), 'take-off AEO torque comparison is missing');
requireTrue(takeoff.at(-1)?.call_macro === 'Mission dispatch' && takeoff.at(-2)?.sleep === 10, 'take-off checklist does not return to dispatch after ten seconds');

const boardingCargoClose = checklists['verify boarding cargo doors closed'];
requireTrue(Array.isArray(boardingCargoClose) && boardingCargoClose.length === 2, 'boarding cargo-door close verification is missing');
const boardingCargoCloseText = JSON.stringify(boardingCargoClose);
requireTrue(boardingCargoCloseText.includes('L:{local:HXX}_SDK_DOOR_CARGO_L') && boardingCargoCloseText.includes('L:{local:HXX}_SDK_DOOR_CARGO_R'), 'boarding cargo-door close verification must check both cargo LVARs through HXX');
requireTrue(!boardingCargoCloseText.includes('H145_SDK_DOOR_CARGO'), 'boarding cargo-door close verification must not hardcode H145');
requireTrue(contains(boardingCargoClose, (entry) => entry && entry.while && entry.while.local === 'boarding_cargo_door_close_attempt' && entry.lt === 3), 'boarding cargo-door close retries must remain bounded');
requireTrue(contains(boardingCargoClose, (entry) => entry && entry.close_door === 'cargo_left') && contains(boardingCargoClose, (entry) => entry && entry.close_door === 'cargo_right'), 'boarding cargo-door close verification must retry each open cargo door');
const boardingText = JSON.stringify(checklists.boarding);
requireTrue(boardingText.includes('"close_door":"cargo_right"},{"sleep":0.25},{"close_door":"cargo_left"},{"call_macro":"verify boarding cargo doors closed"}'), 'boarding must verify cargo doors immediately after its normal close commands');

console.log('Ground operations recovery PASS.');
