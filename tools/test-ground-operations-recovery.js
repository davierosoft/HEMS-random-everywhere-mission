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
requireTrue(crewObjectCount === 75 && crewWrapperCount === crewObjectCount, 'every packaged $TITLE Crew creation must have one synchronous watchdog wrapper');
requireTrue(nrGateCalls === 24, 'every standalone NR < gndopsNR gate must use the watchdog');

const railwayScene = scene.train;
const railwaySceneText = JSON.stringify(railwayScene);
requireTrue(railwaySceneText.includes('"param":"railway_nodes","path":"length"') && railwaySceneText.includes('"param":"highway_nodes","path":"length"'), 'railway crossing must guard empty OSM node arrays');
requireTrue(railwaySceneText.includes('"param":"train_brg"},"value":{"rand":[0,359]') && railwaySceneText.includes('"param":"crash_brg"},"value":{"rand":[0,359]'), 'railway crossing must provide bearing fallbacks when OSM nodes are unavailable');

const avionic = checklistDefinitions.aviopftckl;
const beforeTakeoff = checklistDefinitions.beforetockl;
const takeoff = checklistDefinitions.takeoffckl;
const transitionBefore = checklistDefinitions['checklist transition before takeoff'];
const transitionTakeoff = checklistDefinitions['checklist transition takeoff'];
requireTrue(avionic.at(-1)?.call_macro === 'checklist transition before takeoff', 'avionic/preflight checklist does not advance to before take-off');
requireTrue(beforeTakeoff.some((entry) => entry.call_macro === 'checklist transition takeoff'), 'before take-off checklist does not advance to take-off');
for (const [name, transition] of [['avionic', transitionBefore], ['before take-off', transitionTakeoff]]) {
  const serialized = JSON.stringify(transition);
  requireTrue(serialized.includes('"sleep":20') && serialized.includes('CONTINUE NOW') && serialized.includes('"wait_for"'), `${name} transition lacks the 20-second/button gate`);
}
requireTrue(takeoff.some((entry) => entry.set_dispatch?.some((row) => row.text === 'SLOPE TAKE-OFF PROCEDURE' && row.show_condition?.or)), 'take-off checklist does not place conditional slope guidance first');
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
