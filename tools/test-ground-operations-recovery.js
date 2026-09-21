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
const tablet = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/04-dispatch-tablet-ui.json'), 'utf8'));
const lifecycle = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/11-mission-lifecycle.json'), 'utf8'));

function fail(message) { throw new Error(`Ground operations recovery: ${message}`); }
function requireTrue(condition, message) { if (!condition) fail(message); }
function contains(value, predicate) {
  if (predicate(value)) return true;
  if (Array.isArray(value)) return value.some((entry) => contains(entry, predicate));
  if (value && typeof value === 'object') return Object.values(value).some((entry) => contains(entry, predicate));
  return false;
}

function paramsInsideWorker(value, inWorker = false, found = []) {
  if (Array.isArray(value)) {
    value.forEach((entry) => paramsInsideWorker(entry, inWorker, found));
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  if (inWorker && Object.prototype.hasOwnProperty.call(value, 'param')) found.push(value.param);
  for (const [key, entry] of Object.entries(value)) paramsInsideWorker(entry, inWorker || key === 'create_thread', found);
  return found;
}

const clinical = runtime['patient1 clinical visit gate'];
const completedTreatment = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/17-multipatient-runtime.json'), 'utf8'))['multipatient registry crew clinical completion'];
const multipatient = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/17-multipatient-runtime.json'), 'utf8'));
const ambulanceDispatch = JSON.stringify(ground.Ambulance1) + JSON.stringify(ground.Ambulance2);
const ambulance1Parking = JSON.stringify(ground.park_ambulance1_scene);
const ambulance2Parking = JSON.stringify(ground.park_ambulance2_scene);
requireTrue(ambulanceDispatch.includes("Ambulance '{0}' is following ambulance '{1}'. TTG:{2:TIME} min") && ambulanceDispatch.includes('ambuname2'), 'two-ambulance dispatch must announce both units by identifier, following role, and formatted TTG');
requireTrue(!ambulanceDispatch.includes('has reached the scene. Crew requires further assistance'), 'ambulance 1 arrival must not overwrite the two-ambulance status with the single-unit message');
requireTrue(ambulance1Parking.includes('is still en route') && ambulance1Parking.includes('ambuname2'), 'ambulance 1 arrival must identify ambulance 2 as still en route');
requireTrue(ambulance2Parking.includes('is still en route') && ambulance2Parking.includes('ambuname'), 'ambulance 2 arrival must identify ambulance 1 as still en route');
requireTrue(ambulance2Parking.includes("Ambulance '{0}' crew arrived at the accident location.") && ambulance2Parking.includes('"local":"ambuname2"'), 'the second arrival must identify the actual ambulance crew rather than DISPATCH');
requireTrue(ambulance1Parking.includes('"param":"stop_only"') && ambulance2Parking.includes('"param":"stop_only"'), 'route-stop workers must stop only; parking maneuvers must remain in the owning route thread');
requireTrue(!ambulanceDispatch.includes('"from":"DISPATCH"'), 'ambulance status messages must be attributed to the responding ambulance');
const ambulance1CrewFlow = scene['ambustretcher full'];
requireTrue(ambulance1CrewFlow.some((command) => command.if?.local === 'ambulance1_thread_started' && command.eq === 'yes' && command.then?.[0]?.return === 0), 'ambulance 1 must reject duplicate crew-tour threads before they can drive the same medic');
for (const name of ['drive ambulance1 safe', 'drive ambulance1 safe multiplier', 'drive ambulance2 safe', 'drive ambulance2 safe multiplier']) {
  requireTrue(paramsInsideWorker(ground[name]).length === 0, `${name} must snapshot every caller parameter before creating workers`);
  requireTrue(JSON.stringify(ground[name]).includes('"local":"drive_watchdog_ambulance'), `${name} must use explicit worker-safe locals`);
}
requireTrue(Array.isArray(clinical) && clinical.some(entry => entry.call_macro === 'multipatient registry crew record'), 'patient 1 legacy gate must read the physical visit record');
requireTrue(!contains(clinical, entry => entry?.create_thread), 'legacy gate must not restart an asynchronous treatment worker');
requireTrue(contains(completedTreatment, entry => entry?.call_macro === 'request manual patient visit'), 'manual medical mode no longer uses its clinical gate');
requireTrue(contains(completedTreatment, entry => entry?.set?.local === 'medical_actions_started' && entry.value === 1), 'automatic clinical treatment does not start when the clinician arrives');
requireTrue(contains(completedTreatment, entry => entry?.set?.local === 'P1_MEDICAL_ACTIONS_VISIBLE' && entry.value === 'yes'), 'automatic clinical treatment is not shown to the user');
requireTrue(contains(completedTreatment, entry => entry?.call_macro === 'apply patient1 medical action effect'), 'automatic clinical treatment does not apply the configured actions');
requireTrue(!JSON.stringify(clinical).includes('SIM ON GROUND'), 'patient 1 clinical treatment is incorrectly gated by ground state');
requireTrue(contains(hoist, (entry) => entry && entry.call_macro === 'multipatient registry crew tour safe'), 'the HEMS clinician arrival path does not invoke the multipatient crew tour');
requireTrue(!JSON.stringify(hoist).includes('patient1 clinical visit gate'), 'the HEMS clinician arrival path retains the duplicate legacy Patient 1 clinical gate');
const runtimeTrace = multipatient['ground crew runtime trace'];
requireTrue(Array.isArray(runtimeTrace) && JSON.stringify(runtimeTrace).includes('ground_crew_runtime_trace_sequence') && JSON.stringify(runtimeTrace).includes('"macro"') && JSON.stringify(runtimeTrace).includes('"actor"'), 'ground crew runtime trace must sequence and identify every observed macro entry');
for (const macroName of ['multipatient registry crew tour', 'multipatient registry crew move', 'multipatient registry stretcher move', 'multipatient registry live ensure stretcher', 'multipatient registry live ground load', 'multipatient registry live ground load objects']) {
  requireTrue(JSON.stringify(multipatient[macroName]).includes('ground crew runtime trace'), `${macroName} must be represented in the crew runtime trace`);
}
requireTrue(JSON.stringify(hoist['3 crew ground ops']).includes('nr_gate_passed') && JSON.stringify(hoist['3 crew ground ops']).includes('ground crew runtime trace'), 'HEMS three-crew flow must trace entry, NR gate, and crew creation');

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
const nrGateText = JSON.stringify(nrGate);
requireTrue(Array.isArray(nrGate) && nrGateText.includes('WAITING:') && nrGateText.includes('PASSED:') && nrGateText.includes('gndops_nr_gate_log'), 'NR gate watchdog must log waiting and passed states');
requireTrue(nrGateText.includes('gndops_nr_bypass_seconds') && nrGateText.includes('gndops_idle_bypass_seconds') && nrGateText.includes('"lt":84') && nrGateText.includes('"gt":30'), 'NR gate safety bypass must require more than 30 continuous seconds below 84 percent');
requireTrue(nrGateText.includes('SDK_ECP_MAIN_1') && nrGateText.includes('SDK_ECP_MAIN_2') && nrGateText.includes('"eq":1'), 'NR gate safety bypass must detect both engine MAIN switches in IDLE');
requireTrue(nrGateText.includes('NR below 84 percent for over 30 seconds') && nrGateText.includes('both engine MAIN switches IDLE for over 30 seconds'), 'NR gate passed log must identify its safety-bypass reason');
requireTrue(contains(lifecycle, (entry) => entry?.set?.global === 'GNDOPS_NR_THRESHOLD' && entry.value === 80), 'the mission must initialize the ground-operations NR threshold to 80 without reading global.json');
requireTrue(contains(tablet, (entry) => entry?.slider?.global === 'GNDOPS_NR_THRESHOLD' && entry.slider.min === 79 && entry.slider.max === 83 && entry.slider.commands?.some((command) => command.set?.local === 'gndopsNR')), 'Settings must expose a 79-83 persistent NR threshold slider that updates the active local');
requireTrue(contains(tablet, (entry) => entry?.text === '(P)Ground operations NR threshold: {0}%' && entry.params?.[0]?.tofixed?.global === 'GNDOPS_NR_THRESHOLD' && entry.params?.[0]?.digits === 1), 'Settings must show the NR threshold rounded to one decimal place');

const debugRows = debug['debug page'].find((command) => Array.isArray(command.set_dispatch)).set_dispatch;
const debugCaptureButton = debugRows.flatMap((row) => row.buttonbar || []).find((button) => button.title === 'CAPTURE SNAPSHOT');
requireTrue(debugCaptureButton.commands[0].call_macro === 'capture diagnostic snapshot' && debugCaptureButton.commands[0].params.snapshot_table.static === 'Debug_Table', 'Manual capture must use the shared snapshot and manual table');
const diagnostics = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/19-location-diagnostics.json'), 'utf8'));
const debugCapture = diagnostics['capture diagnostic snapshot'];
const debugCrewMovementCapture = diagnostics['capture crew movement snapshot'];
const snapshotSummary = debugCapture.find((command) => command.set?.key === 'snapshot_summary').value.create_struct;
requireTrue(debugRows.some((row) => row.text === 'CREW SPAWN {0} | NR GATE {1}' && row.params?.[0]?.local === 'crew_spawn_log' && row.params?.[1]?.local === 'gndops_nr_gate_log'), 'Debug Summary does not show the crew and NR watchdog logs');
requireTrue(debugCapture.some((command) => command.set?.key === 'crew_spawn_log') && debugCapture.some((command) => command.set?.key === 'gndops_nr_gate_log'), 'CAPTURE SNAPSHOT does not persist the crew and NR watchdog logs');
requireTrue(contains(debugCrewMovementCapture, (command) => command?.set?.key === 'ground_crew_runtime_trace'), 'CAPTURE SNAPSHOT does not persist the ground crew macro trace');
requireTrue(snapshotSummary['local:crew_spawn_log']?.local === 'crew_spawn_log' && snapshotSummary['local:gndops_nr_gate_log']?.local === 'gndops_nr_gate_log', 'snapshot summary does not include the live crew and NR watchdog logs');
for (const [macroName, traceName] of [['3 crew ground ops', 'GNDOPS_3_CREW_TRACE'], ['4 or 5 crew ground ops', 'GNDOPS_45_CREW_TRACE']]) {
  const traceText = JSON.stringify(hoist[macroName]);
  for (const stage of ['entered', 'command flags cleared', 'NR gate passed', 'hoist crew created', 'pax3 created', 'deboarding branch entered', 'pax right door command sent', 'hoist crew exit move sent']) {
    requireTrue(traceText.includes(`\"local\":\"${traceName}\"`) && traceText.includes(stage), `${macroName} is missing deboarding trace stage: ${stage}`);
  }
}
requireTrue(debugCapture.some((command) => command.set?.key === 'gndops_3_crew_trace') && debugCapture.some((command) => command.set?.key === 'gndops_45_crew_trace'), 'CAPTURE SNAPSHOT does not persist independent HEMS deboarding traces');
requireTrue(snapshotSummary['local:GNDOPS_3_CREW_TRACE']?.local === 'GNDOPS_3_CREW_TRACE' && snapshotSummary['local:GNDOPS_45_CREW_TRACE']?.local === 'GNDOPS_45_CREW_TRACE', 'snapshot summary does not include independent HEMS deboarding traces');
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
requireTrue(crewObjectCount === 78 && crewWrapperCount === crewObjectCount, 'every packaged $TITLE Crew creation must have one synchronous watchdog wrapper');
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

const randomPeopleCommands = scene['random people']?.[0]?.then?.[0]?.create_thread?.commands;
requireTrue(randomPeopleCommands?.[1]?.wait_for?.has_object === 'injured_human' && randomPeopleCommands[1].eq === 1, 'random civilians must wait for the primary patient before pointing objects at it');

for (const [macro, driveMacro, eta] of [
  [ground.Police1, 'drive police safe multiplier', 'poli_adjusted_time'],
  [ground.Firetruck1, 'drive firetruck1 safe multiplier', 'fire_adjusted_time'],
  [ground.Firetruck2, 'drive firetruck2 safe multiplier', 'fire_adjusted_time'],
  [navigation['closest ambulance'], 'drive ambulance1 safe multiplier', 'ambu_adjusted_time'],
  [navigation['closest ambulance'], 'drive police7 safe multiplier', 'poli_adjusted_time']
]) {
  requireTrue(contains(macro, (entry) => entry?.call_macro === driveMacro && entry.params?.timeout?.add?.some((value) => value?.local === eta) && entry.params.timeout.add.includes(120)), `${driveMacro} must use route ETA plus a two-minute watchdog margin`);
}

for (const [name, macro] of Object.entries(ground)) {
  if (!name.startsWith('drive ') || !name.includes(' safe')) continue;
  const serialized = JSON.stringify(macro);
  if (serialized.includes('"to":{"param":"fallback"}')) {
    requireTrue(serialized.includes('"has_location":{"param":"fallback"}'), `${name} may only teleport to a verified fallback location, never a route name`);
  }
}

const routeNames = new Set();
const routeWatchdogs = [];
for (const file of crewObjectFiles) {
  const module = JSON.parse(fs.readFileSync(path.join(macroDirectory, file), 'utf8'));
  for (const [macroName, macro] of Object.entries(module)) {
    const inspectRoutes = (value) => {
      if (Array.isArray(value)) return value.forEach(inspectRoutes);
      if (!value || typeof value !== 'object') return;
      if (typeof value.create_route?.name === 'string') routeNames.add(value.create_route.name);
      Object.values(value).forEach(inspectRoutes);
    };
    inspectRoutes(macro);
  }
}
for (const file of crewObjectFiles) {
  const module = JSON.parse(fs.readFileSync(path.join(macroDirectory, file), 'utf8'));
  for (const [macroName, macro] of Object.entries(module)) {
    const inspectRouteWatchdogs = (value) => {
      if (Array.isArray(value)) return value.forEach(inspectRouteWatchdogs);
      if (!value || typeof value !== 'object') return;
      if (typeof value.call_macro === 'string' && value.call_macro.includes(' safe') && typeof value.params?.to === 'string' && routeNames.has(value.params.to)) {
        routeWatchdogs.push({ file, macroName, call: value });
      }
      Object.values(value).forEach(inspectRouteWatchdogs);
    };
    inspectRouteWatchdogs(macro);
  }
}
requireTrue(routeWatchdogs.length > 0, 'no route watchdog calls were found');
function routeWatchdogViolations(watchdogs, names) {
  const violations = [];
  for (const { file, macroName, call } of watchdogs) {
    const serializedTimeout = JSON.stringify(call.params.timeout);
    if (typeof call.params.timeout === 'number' || !serializedTimeout.includes('120')) violations.push(`${file}:${macroName} does not derive its route watchdog from duration plus a two-minute margin`);
    if (typeof call.params.fallback === 'string' && names.has(call.params.fallback)) violations.push(`${file}:${macroName} passes route ${call.params.fallback} as a recovery location`);
  }
  return violations;
}
const routeWatchdogErrors = routeWatchdogViolations(routeWatchdogs, routeNames);
requireTrue(routeWatchdogErrors.length === 0, routeWatchdogErrors.join('; '));
const syntheticRouteWatchdog = { call_macro: 'drive ambulance1 safe multiplier', params: { to: 'synthetic_route', fallback: 'synthetic_route', timeout: 420 } };
const syntheticRouteNames = new Set(['synthetic_route']);
requireTrue(routeWatchdogViolations([{ file: 'synthetic', macroName: 'synthetic', call: syntheticRouteWatchdog }], syntheticRouteNames).length === 2, 'route-watchdog regression gate synthetic failure is not detected');

const approachLocations = new Map();
for (const file of crewObjectFiles) {
  const module = JSON.parse(fs.readFileSync(path.join(macroDirectory, file), 'utf8'));
  const inspectLocations = (value) => {
    if (Array.isArray(value)) return value.forEach(inspectLocations);
    if (!value || typeof value !== 'object') return;
    if (typeof value.create_location === 'string') approachLocations.set(value.create_location, value.zones?.[0]?.zone?.location);
    Object.values(value).forEach(inspectLocations);
  };
  inspectLocations(module);
}
for (const [name, target, distance] of [
  ['watchdog_ambulance1_scene_approach', 'accident_location', 55],
  ['watchdog_ambulance2_scene_approach', 'accident_location', 55],
  ['watchdog_police_scene_approach', 'accident_location', 55],
  ['watchdog_firetruck1_scene_approach', 'fire_truck_scene_access', 55],
  ['watchdog_firetruck2_scene_approach', 'fire_truck_scene_access', 55],
  ['watchdog_ambulance1_unhospital_approach', 'unhospital', 30],
  ['watchdog_ambulance1_hospital_approach', 'hospital', 30],
  ['watchdog_ambulance1_close_hospital_approach', 'unhospital', 30],
  ['watchdog_ambulance1_far_hospital_approach', 'unhospital', 30],
  ['watchdog_ambulance5_hospital_approach', 'hospital', 30],
  ['watchdog_ambulance2_patient2_hospital_approach', 'unhospital', 30],
  ['watchdog_ambulance2_patient3_hospital_approach', 'unhospital', 30],
  ['watchdog_ambulance6_patient1_hospital_approach', 'unhospital', 30],
  ['watchdog_ambulance6_patient2_hospital_approach', 'unhospital', 30],
  ['watchdog_ambulance1_shared_hospital_approach', 'unhospital', 30]
]) {
  const location = approachLocations.get(name);
  requireTrue(location?.object === target && location.dist === distance, `${name} must remain an authored approach location before ${target}`);
}

const crewVisits = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/17-multipatient-runtime.json'), 'utf8'));
const groundText = JSON.stringify(ground);
requireTrue(groundText.includes('"path":"nation"},"eq":{"local":"NATION"') || groundText.includes('"path":"id"},"eq":{"local":"NATION"'), 'ground responders must use the shared accident nation selector');
for (const [name, actor] of [['park_ambulance1', 'ambulance1'], ['park_ambulance2', 'ambulance2']]) {
  const parkingText = JSON.stringify(ground[name]);
  const ninetyMoves = (parkingText.match(/"bearing2":90,"dist":4,"object":"ambulance_scene_destination"/g) || []).length;
  const twoSeventyMoves = (parkingText.match(/"bearing2":270,"dist":4,"object":"ambulance_scene_destination"/g) || []).length;
  requireTrue(parkingText.includes(`"call_macro":"drive ${actor} safe"`) && ninetyMoves >= 1 && twoSeventyMoves >= 1 && parkingText.includes('"ambulance_scene_heading"'), `${name} must park at both 4m lateral offsets from the route endpoint`);
}
const primaryCrewCommands = scene['ambustretcher full']?.find(entry => entry.create_thread)?.create_thread?.commands || [];
const primaryTourIndex = primaryCrewCommands.findIndex(entry => entry.call_macro === 'multipatient registry crew tour safe');
requireTrue(primaryTourIndex > 0 && contains(primaryCrewCommands.slice(0, primaryTourIndex), entry => entry?.create_object?.name === 'ambumedic7'), 'primary ambulance must create its medic before the physical tour');
const visitTourText = JSON.stringify(crewVisits['multipatient registry crew tour']);
requireTrue(visitTourText.includes('"patient":1') && visitTourText.includes('"patient":2') && visitTourText.includes('"patient":3'), 'the common ambulance/HEMS tour must include all three patient slots');
const dispatchText = JSON.stringify(tablet['Mission dispatch'] || []);
const lifescoreStart = dispatchText.indexOf('Show lifescores');
const lifescoreEnd = dispatchText.indexOf('Organ cooler box status', lifescoreStart);
const lifescoreText = dispatchText.slice(lifescoreStart, lifescoreEnd > lifescoreStart ? lifescoreEnd : undefined);
requireTrue(lifescoreText.includes('"has_object":"injured_human"') && lifescoreText.includes('"has_object":"injured_human2"') && lifescoreText.includes('"has_object":"injured_human3"'), 'lifescores must appear only after each patient object exists');
requireTrue(!lifescoreText.includes('L:RESCUED'), 'lifescore visibility must not use the generic RESCUED latch');
const physicalMove = crewVisits['multipatient registry crew move'];
requireTrue(!JSON.stringify(physicalMove).includes('"drive_object":{"name":{"param":"actor"}') && contains(physicalMove, entry => entry?.call_macro === 'multipatient registry crew movement sample'), 'the common visit must use static actor branches and record passive movement diagnostics');
for (const macroName of ['multipatient registry crew drive closest', 'multipatient registry crew drive side', 'multipatient registry stretcher move']) {
  const macroText = JSON.stringify(crewVisits[macroName]);
  requireTrue(macroText && !macroText.includes('"name":{"param":"actor"}') && !macroText.includes('"VAR1":{"param":"walk"}'), `${macroName} must not pass dynamic drive_object name or VAR1`);
}

const secondaryAmbulance = ground['ambulance2 secondary rescue']?.find((entry) => entry.if?.and?.some((part) => part.require?.local === 'ambulance2_secondary_started'))?.then;
requireTrue(Array.isArray(secondaryAmbulance), 'secondary ambulance assessment sequence is missing');
const secondaryTourIndex = secondaryAmbulance.findIndex(entry => JSON.stringify(entry).includes('multipatient registry crew tour') && JSON.stringify(entry).includes('ambumedic2'));
requireTrue(secondaryTourIndex > 0 && contains(secondaryAmbulance.slice(0, secondaryTourIndex), entry => entry?.create_object?.name === 'ambumedic2'), 'secondary ambulance must create its medic before the same P1/P2/P3 physical tour');
for (const slot of [2, 3]) {
  const secondaryTransport = ground[`ambulance2 secondary patient${slot}`];
  const transportText = JSON.stringify(secondaryTransport);
  requireTrue(transportText.includes(`"call_macro":"Query closest hospital unrelated for stretcher"`) && transportText.includes(`"to":"unhospital"`), `secondary ambulance patient ${slot} does not independently query a ground destination`);
  requireTrue(!transportText.includes('ambulance1_departure_started') && !transportText.includes('ambulance1_destination_ready') && !transportText.includes('hospital_user'), `secondary ambulance patient ${slot} still waits for Ambulance 1 or its hospital`);
  requireTrue(transportText.includes(`ambulance2_patient${slot}_rear_entry`) && transportText.includes('"bearing2":180'), `secondary ambulance patient ${slot} has no rear loading approach`);
  requireTrue(transportText.includes(`"call_macro":"capture patient${slot} ground handover"`), `secondary ambulance patient ${slot} does not freeze the handover record before departure`);
}

const residential = scene.residential;
const finalResidentialPlacement = residential.at(-1)?.if?.local === 'HELOVICTIMS' && residential.at(-1)?.eq === 3 ? residential.at(-1) : residential.at(-2);
const finalResidentialText = JSON.stringify(finalResidentialPlacement);
requireTrue(finalResidentialText.includes('"has_location":"rescue_location"') && finalResidentialText.includes('"move_object":"injured_human"') && finalResidentialText.includes('"move_object":"injured_human2"') && finalResidentialText.includes('"move_object":"injured_human3"'), 'residential three-casualty scene must reassert every casualty at the rescue point after scene creation');
const residentialFire = residential.find((entry) => entry.if?.local === 'HELOVICTIMS' && entry.eq === 3 && JSON.stringify(entry).includes('random_fire'));
const residentialFireText = JSON.stringify(residentialFire);
requireTrue(residentialFireText.includes('"local":"random_fire"},"value":"forced"') && residentialFireText.includes('"local":"VFX"},"value":8'), 'only the residential fire branch must force a random-VFX fire intensity');
requireTrue(!residentialFireText.includes('VFXB') && residentialFireText.includes('"wait_for":{"has_object":"VFXA"}') && residentialFireText.includes('"move_object":"VFXA","to":"FIRE"'), 'residential fire must use the random-VFX object at the authored fire location');
const residentialText = JSON.stringify(residential);
requireTrue(residentialText.includes('"create_location":"ambulance_scene_destination"') && residentialText.includes('"dist":18') && residentialText.includes('"object":"rescue_location"'), 'residential scenes need an ambulance destination clear of casualties and the fire');
requireTrue(!residentialText.includes('"create_location":"AMBWP","zones":[{"zone":{"location":{"bearing":280,"dist":4.5,"object":"accident_location"}}}]') && residentialText.includes('"create_location":"AMBWP","zones":[{"zone":{"location":{"bearing":0,"dist":0,"object":"ambulance_scene_destination"}}}]'), 'residential ambulance equipment must stage at the clear rescue destination instead of the fire');
const residentialAmbulanceText = JSON.stringify(ground.Ambulance1);
requireTrue(residentialAmbulanceText.includes('ambulance1_residential_scene_route') && residentialAmbulanceText.includes('"to":"ambulance_scene_destination"'), 'residential ambulances do not route to the external rescue destination');
requireTrue(residentialAmbulanceText.includes('"param":"$CREATE_ROUTE:DURATION"') && residentialAmbulanceText.includes('"fallback":"watchdog_ambulance1_scene_approach"'), 'residential ambulance route watchdog must use route ETA and a verified recovery point');
const firetruck1Text = JSON.stringify(ground.Firetruck1);
requireTrue(firetruck1Text.includes('"local":"VFX"},"gte":5') && firetruck1Text.includes('"local":"VFX"},"lte":15') && firetruck1Text.includes('"call_macro":"Firetruck2"'), 'a forced residential fire must retain the existing two-firetruck response');

const threeCrewText = JSON.stringify(hoist['3 crew ground ops']);
const stretcherPatientCommand = 'H:{local:HXX}_SDK_HEMS_STRETCHER_PATIENT';
const stretcherNoPatientCommand = 'H:{local:HXX}_SDK_HEMS_STRETCHER_NOPATIENT';
requireTrue(threeCrewText.includes(stretcherPatientCommand) && threeCrewText.includes('"call_macro":"multipatient registry live hems loaded"'), 'three-crew ground loading must commit the selected ticket after the HPG patient-on-stretcher sequence');
requireTrue(threeCrewText.includes('"call_macro":"prepare selected HEMS patient","result":"prepared"') && threeCrewText.includes('"wait_for":{"has_object":"{local:HEMS_PATIENT_OBJECT}"},"eq":1}') && threeCrewText.includes('"wait_for":{"local":"crewpatientloaded"},"eq":"yes"}'), 'three-crew loading may return the crew before the selected patient is ready and loaded');

const stretcherCommandSources = [
  ['navigation', navigation],
  ['hoist', hoist],
  ['transfer', transfer]
];
for (const [name, source] of stretcherCommandSources) {
  requireTrue(!contains(source, (entry) => entry?.set?.var?.[0] === stretcherPatientCommand || entry?.set?.var?.[0] === stretcherNoPatientCommand), `${name} assigns a value to an HPG stretcher command instead of triggering it`);
  requireTrue(contains(source, (entry) => entry?.trigger === stretcherPatientCommand), `${name} has no HPG patient-on-stretcher trigger`);
}
let pax4LoadSequences = 0;
let pax4LoadOrderingFailures = 0;
function inspectPax4LoadOrder(value) {
  if (Array.isArray(value)) {
    const pax4Index = value.findIndex((entry) => entry?.set?.var?.[0] === 'H:{local:HXX}_SDK_PAX_4_ON');
    const patientIndex = value.findIndex((entry) => entry?.trigger === stretcherPatientCommand);
    if (pax4Index !== -1 && patientIndex !== -1) {
      pax4LoadSequences += 1;
      if (patientIndex < pax4Index) pax4LoadOrderingFailures += 1;
    }
    value.forEach(inspectPax4LoadOrder);
    return;
  }
  if (value && typeof value === 'object') Object.values(value).forEach(inspectPax4LoadOrder);
}
inspectPax4LoadOrder(hoist);
inspectPax4LoadOrder(transfer);
requireTrue(pax4LoadSequences === 5 && pax4LoadOrderingFailures === 0, 'the patient-on-stretcher trigger must follow PAX 4 boarding in every direct loading sequence');

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
