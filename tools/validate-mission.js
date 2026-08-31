#!/usr/bin/env node

/* Blocking static checks for HEMS Random Everywhere Mission releases. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mission = JSON.parse(fs.readFileSync(path.join(root, 'everywhere_all.json'), 'utf8'));
const companionMission = JSON.parse(fs.readFileSync(path.join(root, 'train.json'), 'utf8'));
const globals = JSON.parse(fs.readFileSync(path.join(root, 'global.json'), 'utf8'));

const comparators = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte']);
const macroNames = new Set(Object.keys(mission.macros));
const errors = [];
let executableConditions = 0;
let rendererConditions = 0;
let staticMacroCalls = 0;
let carlsLayouts = 0;
let beforeTakeoffRows = 0;
let regressionChecks = 0;
let requireConditions = 0;
let dynamicMacroCalls = 0;
let iconReferences = 0;
let companionChecks = 0;
let companionExecutableConditions = 0;
let companionRendererConditions = 0;

function comparatorCount(value) {
  return Object.keys(value || {}).filter((key) => comparators.has(key)).length;
}

function checkExecutable(command, key, trail) {
  executableConditions += 1;
  if (comparatorCount(command) !== 1) {
    errors.push(`${key} must have exactly one sibling comparator at ${trail}`);
  }
  if (key === 'if' && command.if && typeof command.if === 'object' && !Array.isArray(command.if) && command.if.require) {
    errors.push(`if cannot use direct require operand at ${trail}`);
  }
}

function checkRenderer(condition, key, trail) {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition) || comparatorCount(condition) !== 1) {
    errors.push(`${key} must have exactly one comparator at ${trail}`);
  }
}

function scanLogical(value, trail, logicalDepth = 0, underRequire = false) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanLogical(child, `${trail}/${index}`, logicalDepth, underRequire));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const logical = Object.prototype.hasOwnProperty.call(value, 'and') || Object.prototype.hasOwnProperty.call(value, 'or');
  if (logical && logicalDepth > 0 && !underRequire && comparatorCount(value) !== 1) {
    errors.push(`nested logical group needs its own comparator at ${trail}`);
  }
  ['and', 'or'].forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return;
    if (!Array.isArray(value[key]) || value[key].length === 0 || value[key].some((entry) => entry == null)) {
      errors.push(`${key} must be a non-empty array without null entries at ${trail}`);
    }
  });

  Object.entries(value).forEach(([key, child]) => {
    const nextDepth = key === 'and' || key === 'or' ? logicalDepth + 1 : logicalDepth;
    scanLogical(child, `${trail}/${key}`, nextDepth, underRequire || key === 'require');
  });
}

function walk(value, trail = '$') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${trail}/${index}`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  Object.keys(value).forEach((key) => {
    if (/^create_l.*ocation$/i.test(key) && key !== 'create_location') {
      errors.push(`invalid create_location command spelling: ${key} at ${trail}`);
    }
  });

  if (Object.prototype.hasOwnProperty.call(value, 'require')) {
    requireConditions += 1;
    if (comparatorCount(value) !== 1) errors.push(`require must have exactly one sibling comparator at ${trail}`);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'if')) checkExecutable(value, 'if', trail);
  if (Object.prototype.hasOwnProperty.call(value, 'wait_for')) checkExecutable(value, 'wait_for', trail);
  if (Object.prototype.hasOwnProperty.call(value, 'while')) checkExecutable(value, 'while', trail);
  ['show_condition', 'disabled_condition', 'select_condition'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      rendererConditions += 1;
      if (!trail.includes('/create_struct')) checkRenderer(value[key], key, trail);
    }
  });
  if (typeof value.call_macro === 'string' && !value.call_macro.includes('{')) {
    staticMacroCalls += 1;
    if (!macroNames.has(value.call_macro)) errors.push(`missing macro: ${value.call_macro} at ${trail}`);
  } else if (typeof value.call_macro === 'string') {
    dynamicMacroCalls += 1;
    const prefix = value.call_macro.slice(0, value.call_macro.indexOf('{'));
    if (!prefix || ![...macroNames].some((name) => name.startsWith(prefix))) {
      errors.push(`dynamic macro prefix has no target: ${value.call_macro} at ${trail}`);
    }
  }
  ['image', 'describe_icon'].forEach((key) => {
    if (typeof value[key] !== 'string' || value[key].startsWith('data:')) return;
    iconReferences += 1;
    if (!Object.prototype.hasOwnProperty.call(mission.icons || {}, value[key])) {
      errors.push(`missing icon/image reference: ${value[key]} at ${trail}/${key}`);
    }
  });
  if (value.set_carls_radio) {
    carlsLayouts += 1;
    ['LSK', 'RSK'].forEach((side) => {
      const labels = value.set_carls_radio[side];
      if (!Array.isArray(labels) || labels.length !== 3 || labels.some((label) => typeof label !== 'string')) {
        errors.push(`CARLS ${side} must contain three static string labels at ${trail}`);
      }
    });
  }
  Object.entries(value).forEach(([key, child]) => walk(child, `${trail}/${key}`));
}

function checkCompanionMission() {
  function expectCompanion(condition, message) {
    companionChecks += 1;
    if (!condition) errors.push(`companion mission: ${message}`);
  }

  function scan(value, trail) {
    if (Array.isArray(value)) {
      value.forEach((child, index) => scan(child, `${trail}/${index}`));
      return;
    }
    if (!value || typeof value !== 'object') return;

    Object.keys(value).forEach((key) => {
      if (/^create_l.*ocation$/i.test(key) && key !== 'create_location') {
        errors.push(`companion mission: invalid create_location command spelling: ${key} at ${trail}`);
      }
    });
    ['if', 'wait_for', 'while'].forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(value, key)) return;
      companionExecutableConditions += 1;
      if (comparatorCount(value) !== 1) errors.push(`companion mission: ${key} must have exactly one sibling comparator at ${trail}`);
      if (key === 'if' && value.if && typeof value.if === 'object' && !Array.isArray(value.if) && value.if.require) {
        errors.push(`companion mission: if cannot use direct require operand at ${trail}`);
      }
    });
    ['show_condition', 'disabled_condition', 'select_condition'].forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(value, key)) return;
      companionRendererConditions += 1;
      checkRenderer(value[key], `train.${key}`, trail);
    });
    if (Object.prototype.hasOwnProperty.call(value, 'require') && comparatorCount(value) !== 1) {
      errors.push(`companion mission: require must have exactly one sibling comparator at ${trail}`);
    }
    Object.entries(value).forEach(([key, child]) => scan(child, `${trail}/${key}`));
  }

  scan(companionMission, '$/train');
  scanLogical(companionMission, '$/train');
  expectCompanion(companionMission.id !== mission.id, 'id must not collide with the primary mission');
  expectCompanion(Array.isArray(companionMission.objectives) && companionMission.objectives.length === 1, 'must contain one loader objective');
  expectCompanion(companionMission.macros && typeof companionMission.macros === 'object' && !Array.isArray(companionMission.macros), 'macros must be an object');
  const text = compact(companionMission);
  ['L:CUS_SEND_DISPATCH', 'L:CUS_ID_CARD', 'L:CUS_CRASH_VARIABLE', 'L:CUS_MISSION_SCENE_VARIANT', 'L:CUS_ACCIDENT LAT', 'L:CUS_ACCIDENT LON'].forEach((token) => {
    expectCompanion(text.includes(token), `missing custom handoff state ${token}`);
  });
  expectCompanion(text.includes('\"load_mission\":\"HEMSRandE\"') || text.includes('\"load_mission\": \"HEMSRandE\"'), 'must load HEMSRandE');
  const accidents = companionMission.data && companionMission.data.accidents;
  expectCompanion(Array.isArray(accidents) && accidents.some((entry) => entry.ID_CARD === 999), 'must contain the editable custom accident record');
}

function checkBeforeTakeoffLayout() {
  const checklist = mission.macros.beforetockl;
  if (!Array.isArray(checklist)) {
    errors.push('missing beforetockl macro');
    return;
  }
  function scan(value, trail) {
    if (Array.isArray(value)) {
      value.forEach((child, index) => scan(child, `${trail}/${index}`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (typeof value.text === 'string' && /\[(?: |V)\]$/.test(value.text)) {
      beforeTakeoffRows += 1;
      if (value.monospace !== 1) errors.push(`beforetockl row must be monospace at ${trail}`);
      if (value.text.length !== 49) errors.push(`beforetockl row must be exactly 49 characters at ${trail}`);
    }
    Object.entries(value).forEach(([key, child]) => scan(child, `${trail}/${key}`));
  }
  scan(checklist, '$/macros/beforetockl');
  if (beforeTakeoffRows !== 33) errors.push(`beforetockl must render 33 state rows; found ${beforeTakeoffRows}`);
}
function expectRegression(condition, message) {
  regressionChecks += 1;
  if (!condition) errors.push(`release regression: ${message}`);
}

function compact(value) {
  return JSON.stringify(value);
}

function hasState(value, name) {
  const text = compact(value);
  return text.includes(`"local":"${name}"`) || text.includes(`"global":"${name}"`) || text.includes(`"var":["L:${name}"`);
}

function collect(value, predicate, output = []) {
  if (Array.isArray(value)) {
    value.forEach((child) => collect(child, predicate, output));
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  if (predicate(value)) output.push(value);
  Object.values(value).forEach((child) => collect(child, predicate, output));
  return output;
}

function callsInOrder(value) {
  return collect(value, (item) => typeof item.call_macro === 'string').map((item) => item.call_macro);
}

function scanGuardedWaits(value, guards, macroName, counts) {
  if (Array.isArray(value)) {
    value.forEach((child) => scanGuardedWaits(child, guards, macroName, counts));
    return;
  }
  if (!value || typeof value !== 'object') return;

  if (value.wait_for && hasState(value.wait_for, 'crewdoconboard')) {
    counts.doctor += 1;
    expectRegression(
      guards.some((guard) => compact(guard).includes('"local":"whobringpatient"') && compact(guard).includes('"eq":"ambudoc"')),
      `${macroName} may wait for crewdoconboard only in the ambudoc branch`,
    );
  }
  if (value.wait_for && hasState(value.wait_for, 'stretcheronambulance')) {
    counts.hemsStretcher += 1;
    expectRegression(
      guards.some((guard) => compact(guard).includes('"local":"whobringpatient"') && compact(guard).includes('"eq":"us"')),
      `${macroName} may wait for stretcheronambulance only in the HEMS transport branch`,
    );
  }

  const branch = Object.prototype.hasOwnProperty.call(value, 'if') && Array.isArray(value.then);
  Object.entries(value).forEach(([key, child]) => {
    if (branch && key === 'then') scanGuardedWaits(child, guards.concat(value), macroName, counts);
    else if (branch && key === 'else') scanGuardedWaits(child, guards, macroName, counts);
    else if (key !== 'then' && key !== 'else') scanGuardedWaits(child, guards, macroName, counts);
  });
}

function checkRelease91Regressions() {
  expectRegression(mission.title.includes('0.997 92'), 'mission title must be 0.997 92');

  const allText = compact(mission);
  const invalidNames = [...allText.matchAll(/manual_p[23][A-Za-z0-9]+/g)].map((match) => match[0]);
  expectRegression(invalidNames.length === 0, `non-canonical P2/P3 manual state names found: ${[...new Set(invalidNames)].join(', ')}`);

  const medicalPage = mission.macros['patient health'];
  expectRegression(Array.isArray(medicalPage), 'patient health (Medical page) macro must exist');
  if (medicalPage) {
    const pageText = compact(medicalPage);
    ['select medical patient page', 'medical_display_patient', 'medical_display_final_hr', 'medical_display_final_spo2', 'medical_display_action_count'].forEach((token) => {
      expectRegression(pageText.includes(token), `Medical page must use ${token}`);
    });
    ['P1_MEDICAL_ACTION_COUNT', 'ambulance_handover_visible', 'generic_pathology1'].forEach((token) => {
      expectRegression(!pageText.includes(token), `Medical page must not retain P1-only ${token}`);
    });
    const actionButtons = collect(medicalPage, (item) => Array.isArray(item.commands) && compact(item.commands).includes('manual current patient treatment choice'));
    expectRegression(actionButtons.length >= 4, 'Medical page must expose guarded manual treatment actions');
    actionButtons.forEach((button) => {
      const condition = compact(button.show_condition || {});
      expectRegression(condition.includes('medical_display_manual_active'), 'manual treatment button must require the displayed active patient');
    });
  }

  const debugPage = mission.macros['debug page'];
  expectRegression(Array.isArray(debugPage), 'debug page macro must exist');
  if (debugPage) {
    ['manual_active_patient', 'medical_display_patient', 'P2_GROUND_TRANSPORTED', 'ambulance_patient_transfer_state', 'preset_dirty', 'preset_group_pending'].forEach((state) => {
      expectRegression(hasState(debugPage, state), `debug page must expose ${state}`);
    });
    expectRegression(!compact(debugPage).includes('mission_preset_dirty'), 'debug page must not use obsolete preset dirty state');
  }

  const transportCounts = { doctor: 0, hemsStretcher: 0 };
  ['ambustretcher close', 'ambustretcher far'].forEach((name) => {
    const macro = mission.macros[name];
    expectRegression(Array.isArray(macro), `${name} macro must exist`);
    if (!macro) return;
    scanGuardedWaits(macro, [], name, transportCounts);
    const calls = callsInOrder(macro);
    const hospital = calls.indexOf('Query closest hospital unrelated for stretcher');
    const drive = calls.indexOf('drive ambulance1 safe multiplier');
    expectRegression(hospital >= 0 && drive > hospital, `${name} must select its automatic hospital before ambulance driving`);
    expectRegression(compact(macro).includes('hospital_arrived'), `${name} must record terminal hospital arrival`);
  });
  expectRegression(transportCounts.doctor > 0, 'ambudoc path must retain its guarded doctor wait');
  expectRegression(transportCounts.hemsStretcher > 0, 'HEMS path must retain its guarded stretcher wait');

  const handoverCalls = callsInOrder(mission.macros['ambulance clinical handover'] || []);
  const assessmentPositions = handoverCalls.map((name, index) => name === 'ambulance assess patient' ? index : -1).filter((index) => index >= 0);
  const continuationPositions = handoverCalls.map((name, index) => name === 'ambulance continue patient' ? index : -1).filter((index) => index >= 0);
  expectRegression(assessmentPositions.length === 3, 'ambulance handover must assess all three supported patients');
  expectRegression(continuationPositions.length === 3, 'ambulance handover must run all three continuation adapters');
  expectRegression(Math.max(...assessmentPositions) < Math.min(...continuationPositions), 'all ambulance assessments must precede treatment continuation');

  [2, 3].forEach((patient) => {
    const macro = mission.macros[`ambulance2 secondary patient${patient}`];
    expectRegression(Array.isArray(macro), `secondary ambulance patient ${patient} macro must exist`);
    if (!macro) return;
    const text = compact(macro);
    expectRegression(text.includes(`P${patient}_AMBULANCE_STAGE`) && text.includes('ground_transport_ready'), `secondary ambulance patient ${patient} requires ground-transport clearance`);
    expectRegression(text.includes(`P${patient}_GROUND_TRANSPORTED`) && text.includes('"value":"yes"'), `secondary ambulance patient ${patient} records transport`);
    expectRegression(text.includes(`"destroy_object":"injured_human${patient}"`), `secondary ambulance patient ${patient} removes the transported scene casualty`);
  });

  ['3 crew ground ops', '4 or 5 crew ground ops', 'HOISTING', '3 crew SKID LDG', '4 crew SKID LDG', '5 crew SKID LDG'].forEach((name) => {
    const macro = mission.macros[name];
    expectRegression(Array.isArray(macro), `${name} macro must exist`);
    if (macro) {
      expectRegression(hasState(macro, 'P2_GROUND_TRANSPORTED'), `${name} must skip ground-transported patient 2`);
      expectRegression(hasState(macro, 'P3_GROUND_TRANSPORTED'), `${name} must skip ground-transported patient 3`);
    }
  });

  const flush = compact(mission.macros['flush mission preset'] || []);
  const switching = callsInOrder(mission.macros['switch mission preset'] || []);
  const recompute = compact(mission.macros['recompute mission preset categories'] || []);
  const compatibility = compact(mission.macros['mission enable engine'] || []);
  expectRegression(flush.includes('save_table') && flush.includes('preset_dirty') && flush.includes('preset_loaded'), 'preset flush must save only a loaded dirty table');
  expectRegression(switching[0] === 'flush mission preset' && switching.includes('msn preset loading'), 'preset switch must flush before loading the target');
  expectRegression(!recompute.includes('save_table'), 'preset category recompute must never save or rewrite a table');
  expectRegression(!compatibility.includes('save_table') && !compatibility.includes('"table"'), 'legacy mission enable engine wrapper must not write presets');
  const presetPages = [mission.macros.mission_list_page1, mission.macros.mission_list_page2];
  const pageCalls = presetPages.flatMap((page) => callsInOrder(page || []));
  expectRegression(pageCalls.filter((name) => name === 'switch mission preset').length === 12, 'all twelve preset selectors must use the safe switch macro');
  expectRegression(pageCalls.filter((name) => name === 'toggle mission preset category').length === 8, 'all eight group controls must use the confirmation-aware toggle');
  expectRegression(!presetPages.some((page) => compact(page).includes('save_table')), 'preset pages must defer table writes to switch/exit flush');
  expectRegression(!presetPages.some((page) => compact(page).includes('"title":"SAVE"')), 'preset editor must not add a Save button');

  const debugText = compact(debugPage || []);
  ['SUMMARY', 'MISSION', 'MEDICAL', 'GROUND', 'GUIDANCE', 'INVENTORY'].forEach((section) => {
    expectRegression(debugText.includes(`"value":"${section}"`), `debug navigation must expose ${section}`);
    expectRegression(debugText.includes(`"eq":"${section}"`), `debug content must be gated by ${section}`);
  });
  ['debug_relevant_ambulance', 'debug_relevant_police', 'debug_relevant_heli', 'debug_relevant_marshal', 'debug_relevant_multipatient', 'debug_has_issue'].forEach((state) => {
    expectRegression(hasState(debugPage || [], state), `debug page must calculate ${state}`);
  });
  ['CAPTURE SNAPSHOT', 'CLEAR SNAPSHOT'].forEach((title) => {
    expectRegression(debugText.includes(`"title":"${title}"`), `debug page must expose ${title}`);
  });
  expectRegression(mission.data.Debug_Table === 'Andrews_debug_snapshots', 'debug snapshot must use a persistent HPG table');
  expectRegression(debugText.includes('"open_table":{"static":"Debug_Table"}') && debugText.includes('"save_table":{"static":"Debug_Table"}'), 'debug snapshot table must be opened and saved');
  ['valid', 'time', 'mission_id', 'phase', 'route_error', 'query_error', 'transport', 'transfer_state', 'active_patient', 'display_patient', 'preset'].forEach((key) => {
    expectRegression(debugText.includes('"key":"' + key + '"'), 'debug snapshot table must persist ' + key);
  });
  expectRegression(debugText.includes('LIVE MISSION SUMMARY'), 'debug page must provide a consolidated live summary');
  expectRegression(debugText.includes('COMPLETE LOCAL INVENTORY') && debugText.includes('COMPLETE LVAR INVENTORY'), 'debug Inventory view must retain both complete inventories');
}

function checkAircraftProfileRegression() {
  const allText = compact(mission);
  const requiredMacros = [
    'ensure aircraft profile defaults', 'sync aircraft profile runtime',
    'apply aircraft factory profile', 'save custom aircraft profile',
    'load custom aircraft profile', 'apply linked aircraft profile',
    'aircraft profiles page'
  ];
  requiredMacros.forEach((name) => expectRegression(Array.isArray(mission.macros[name]), `aircraft profile macro must exist: ${name}`));
  expectRegression(!allText.includes('"DIFFICULTY"'), 'legacy difficulty state must be fully migrated');
  expectRegression(!Object.prototype.hasOwnProperty.call(globals, 'DIFFICULTY'), 'global defaults must not retain legacy Difficulty');

  const expectedTables = {
    Aircraft_Profile_Links: 'Andrews_aircraft_profile_links',
    Aircraft_Profile_Table1: 'Andrews_custom_default',
    Aircraft_Profile_Table2: 'Andrews_custom_prst_1',
    Aircraft_Profile_Table3: 'Andrews_custom_prst_2',
    Aircraft_Profile_Table4: 'Andrews_custom_prst_3',
    Aircraft_Profile_Table5: 'Andrews_custom_prst_4',
    Aircraft_Profile_Table6: 'Andrews_custom_prst_5'
  };
  Object.entries(expectedTables).forEach(([name, table]) => {
    expectRegression(mission.data[name] === table, `aircraft profile table must be registered: ${name}`);
  });

  const firstRun = {
    AIRCRAFT_PROFILE_ACTIVE: 'DEFAULT', AIRCRAFT_PROFILE_SLOT: 'Aircraft_Profile_Table1',
    ENGINE_FAILURES_ENABLED: 'yes', ORANGE_TARGET_SMOKE: 'auto', TARGET_GUIDANCE_RANGE: 'wide',
    HOIST_SAFETY_MONITOR: 'yes', HOIST_CONTROL_PROFILE: 'auto', AUTO_FPL_NAV_SOURCE: 'yes',
    TELEPORT_ASSIST_ENABLED: 'yes', ambu_force: 100, poli_force: 100, fire_force: 100
  };
  Object.entries(firstRun).forEach(([key, value]) => {
    expectRegression(globals[key] === value, `first-run DEFAULT profile must set ${key}=${value}`);
  });

  const profilePage = mission.macros['aircraft profiles page'] || [];
  const profileText = compact(profilePage);
  ['CUSTOM DEFAULT', 'CUSTOM PRST 1', 'CUSTOM PRST 5', 'SAVE CUSTOM', 'RELOAD CUSTOM', 'UNLINK', 'LINK DEFAULT', 'LINK PRST 5'].forEach((token) => {
    expectRegression(profileText.includes(token), `aircraft profile page must expose ${token}`);
  });
  expectRegression(!profileText.includes('"static":{"global"'), 'aircraft profile page must not use unsupported static global table references');

  const settingsText = compact(mission.macros.settings || []);
  ['FLIGHT ASSISTS', 'Engine failure simulation', 'Orange target smoke', 'Target guidance range', 'Hoist risk monitor', 'Hoist control profile', 'Flight-plan NAV source', 'Teleport assist'].forEach((token) => {
    expectRegression(settingsText.includes(token), `Settings must expose individual flight-assist option: ${token}`);
  });
  const linked = compact(mission.macros['apply linked aircraft profile'] || []);
  ['Config_Table1', 'Config_Table3', 'Config_Table4', 'Config_Table5', 'Config_Table6', 'Config_Table7'].forEach((table) => {
    expectRegression(linked.includes(table), `linked aircraft profile must resolve ${table}`);
  });
  expectRegression(!linked.includes('"key":{"local":"MSN_CONFIG_PRESET"}'), 'linked aircraft profile must use explicit supported mission-table keys');
  expectRegression(callsInOrder(mission.macros['switch mission preset'] || []).includes('apply linked aircraft profile'), 'mission preset switch must load its linked aircraft profile');
  expectRegression(callsInOrder(mission.macros.objective1 || []).includes('apply linked aircraft profile'), 'livery-driven mission preset selection must load its linked aircraft profile');

  const profileKeys = new Set([
    'MISSION_ACCIDENT_MAX_RADIUS', 'MISSION_ACCIDENT_MIN_RADIUS', 'rangeautorandom', 'CREW', 'BOARDING_HOLD_GLOBAL',
    'PILOT_ANIMATION', 'CREW_SLOTH', 'P1_MANUAL_MEDICAL_MODE', 'SECOND_HOIST', 'SECOND_HR', 'HOIST_ARMING', 'HOIST_SPEED',
    'SAR_MAX_RADIUS', 'SAR_RING', 'SPOTTED_DISTANCE', 'SAR_HISTORY', 'MOUNT_AUTO_RNG', 'location_ref',
    'REALISTIC_DISPATCH', 'DISPATCH_TIME', 'TIME_SECOND_DISPATCH', 'HELOVICTIMS_CUSTOM', 'MCPR_ONBOARD', 'LIFESCORE_THR_LO',
    'LIFESCORE_THR_HI', 'AMBULOCK', 'CANCELTHRESHOLD', 'POLI_RNG_VISIBLE', 'AMBU_RNG_VISIBLE', 'police_bring_crew_min_dist',
    'ambulance_return_crew_min_dist', 'ambu_route_mode', 'NATION_BYPASS', 'NATION_OTHERS', 'TRAFFIC_DISABLED', 'closestambu',
    'HRTruck', 'randomdead', 'LANDING_SPOT_GND', 'MARSHAL_START_ENABLED', 'MARSHAL_HOSPITAL_ENABLED', 'LANDING_SPOT_HOIST',
    'DESTINATION_UNLOCKED', 'FORCE_AMBULANCE', 'DESTINATION_SELECTION_MODE', 'ONLINE_QUERY', 'XFERPAPERWORK', 'PAPERWORK',
    'maptype', 'CREWTRK', 'RESCUETRK', 'AUTOZOOM', 'VOICEPACK', 'VOLUME_CREW', 'SUONERIA', 'AUDIO_DECLUT', 'HOIST_AUDIO',
    'MISSION_GUIDANCE_OVERRIDE', 'RINGONCE', 'LOWFUELTHRSLD', 'NOCONNEXT', 'CARLSPBIT', 'CARLS_DF_TUNING_MODE',
    'TABLET_5G_ENABLED', 'startpage', 'ambu_force', 'poli_force', 'fire_force', 'ENGINE_FAILURES_ENABLED',
    'ORANGE_TARGET_SMOKE', 'TARGET_GUIDANCE_RANGE', 'HOIST_SAFETY_MONITOR', 'HOIST_CONTROL_PROFILE',
    'AUTO_FPL_NAV_SOURCE', 'TELEPORT_ASSIST_ENABLED'
  ]);
  const marksCustom = (commands) => Array.isArray(commands) && commands.some((command) => command.call_macro === 'mark aircraft profile custom');
  const directSettings = collect(mission.macros.settings || [], (item) => Array.isArray(item.commands) && item.commands.some((command) => command.set && profileKeys.has(command.set.global)));
  expectRegression(directSettings.length > 0 && directSettings.every((item) => marksCustom(item.commands)), 'every direct Settings profile change must mark CUSTOM');
  const profileSliders = collect(mission.macros.settings || [], (item) => item.slider && profileKeys.has(item.slider.global));
  expectRegression(profileSliders.length > 0 && profileSliders.every((item) => marksCustom(item.slider.commands)), 'every Settings slider in a profile must mark CUSTOM');
  const vehiclePages = [mission.macros.variant_selection || [], mission.macros['HEMS mission_type'] || []];
  const vehicleControls = vehiclePages.flatMap((page) => collect(page, (item) => Array.isArray(item.commands) && item.commands.some((command) => command.set && ['ambu_force', 'poli_force', 'fire_force'].includes(command.set.global))));
  expectRegression(vehicleControls.length >= 24 && vehicleControls.every((item) => marksCustom(item.commands)), 'all Custom Mission vehicle preferences must mark CUSTOM');
  const customIndicators = collect(profilePage, (item) => typeof item.title === 'string' && /^(CUSTOM |LINK )/.test(item.title));
  expectRegression(customIndicators.length === 12 && customIndicators.every((item) => compact(item.select_condition).includes('AIRCRAFT_PROFILE_ACTIVE')), 'only CUSTOM state may select a saved slot or its mission link');
}
function checkRelease93Regressions() {
  const allText = compact(mission);
  const endpointLvar = 'L:{local:HXX}_PERSIST_MISSION_ENDPOINT_OPTION';
  ['normalize orange target smoke setting', 'create orange smoke marker', 'evaluate realistic orange smoke scene', 'arm realistic orange smoke', 'initialize crew lifescores for shift', 'apply crew lifescore impact', 'refresh crew lifescore report', 'start crew lifescore monitor', 'hoist out fatal failure', 'start hoist out risk monitor'].forEach((name) => {
    expectRegression(Array.isArray(mission.macros[name]), `release 93 macro must exist: ${name}`);
  });
  const smokeControls = collect(mission.macros.settings || [], (item) => Array.isArray(item.buttonbar) && item.buttonbar.some((button) => button.title === 'NEVER'));
  expectRegression(smokeControls.length === 1 && compact(smokeControls[0]).includes('AUTO') && compact(smokeControls[0]).includes('REALISTIC') && compact(smokeControls[0]).includes('ALWAYS'), 'orange smoke settings must expose NEVER/AUTO/REALISTIC/ALWAYS');
  expectRegression(globals.ORANGE_TARGET_SMOKE === 'auto', 'first-run orange smoke setting must be AUTO');
  const smokeFactoryValues = {
    DEFAULT: 'auto',
    'ROOKIE PILOT': 'always',
    'EXPERT PILOT': 'realistic',
    'EXPERT HEMS': 'realistic'
  };
  Object.entries(smokeFactoryValues).forEach(([profile, value]) => {
    const factory = compact(mission.macros[`aircraft factory ${profile}`] || []);
    expectRegression(factory.includes(`"global":"ORANGE_TARGET_SMOKE"`) && factory.includes(`"value":"${value}"`), `factory profile ${profile} must set orange smoke to ${value}`);
  });
  const realisticSmoke = compact(mission.macros['arm realistic orange smoke'] || []);
  expectRegression(realisticSmoke.includes('"lte":2') && realisticSmoke.includes('"sleep":300') && realisticSmoke.includes('"has_object":"VFXA"'), 'realistic smoke must arm at 2 NM, avoid VFX duplication, and expire after five minutes');

  const ping = compact(mission.macros['CICERS PING'] || []);
  const ensure = compact(mission.macros['ensure data query service selection'] || []);
  const cicersSuccess = compact(mission.macros['restore data query selection after CICERS success'] || []);
  expectRegression(ping.includes('CICERS_PREVIOUS_ENDPOINT') && ping.includes('CICERS_PREVIOUS_DATAQUERY_MODE'), 'CICERS ping must snapshot both persisted endpoint and mode');
  expectRegression(ping.includes(endpointLvar) && ping.includes('restore data query selection after CICERS success') && ping.includes('restore data query selection after CICERS failure'), 'CICERS ping must restore the selection after either result');
  expectRegression(!ping.includes('DATAQUERYSERVICERANDOM'), 'CICERS ping must route expired keys through the same previous-provider fallback');
  expectRegression(cicersSuccess.includes(endpointLvar) && cicersSuccess.includes('\"global\":\"DATAQUERYSERVICE\"') && cicersSuccess.includes('\"value\":3') && !cicersSuccess.includes('CICERS_PREVIOUS_ENDPOINT'), 'a valid CICERS key must make CICERS the active provider');
  expectRegression(ensure.includes('"call_macro":"CICERS PING"'), 'CICERS key validation must run at every startup');
  const profileMacros = ['ensure aircraft profile defaults', 'sync aircraft profile runtime', 'apply aircraft factory profile', 'save custom aircraft profile', 'load custom aircraft profile'];
  expectRegression(profileMacros.every((name) => !compact(mission.macros[name] || []).includes('DATAQUERYSERVICE')), 'aircraft profiles must not overwrite the independent endpoint selection');

  const digit = compact(mission.macros['CARLS DF digit'] || []);
  const open = compact(mission.macros['CARLS DF open'] || []);
  const transientDfState = [
    'CARLS_DF_EDITING', 'CARLS_DF_INPUT_INDEX', 'CARLS_DF_ENTRY_FREQUENCY',
    'CARLS_DF_VALID', 'CARLS_DF_D1', 'CARLS_DF_D2', 'CARLS_DF_D3',
    'CARLS_DF_D4', 'CARLS_DF_D5', 'CARLS_DF_D6', 'CARLS_DF_LAST_INPUT_TIME'
  ];
  const dfMacros = Object.fromEntries(Object.entries(mission.macros).filter(([name]) => name === 'CARLS buttons' || name.startsWith('CARLS DF')));
  const dfJson = compact(dfMacros);
  transientDfState.forEach((name) => {
    expectRegression(!dfJson.includes(`"var":["L:${name}","number"]`), `DF transient state ${name} must remain local, never an LVAR`);
  });

  const digitGuard = mission.macros['CARLS DF digit']?.[0];
  const digitCommands = digitGuard?.then || [];
  expectRegression(digitGuard?.if?.local === 'CARLS_DF_INPUT_INDEX' && digitGuard?.lte === 6 && !digitGuard?.if?.and, 'DF digit capture must use the proven direct linear condition, not an and/require wrapper');
  expectRegression(digitCommands[0]?.set?.local === 'CARLS_DF_EDITING' && digitCommands[0]?.value === 1, 'the first DF key must enter edit mode in the same task');
  for (let position = 1; position <= 6; position += 1) {
    const capture = digitCommands.find((command) => command?.if?.local === 'CARLS_DF_INPUT_INDEX' && command?.eq === position);
    expectRegression(capture?.then?.[0]?.set?.local === `CARLS_DF_D${position}` && capture?.then?.[0]?.value?.param === 'digit', `DF position ${position} must capture the current digit param directly into local state`);
  }

  const evaluateDfValue = (value, state, params) => {
    if (typeof value === 'number' || typeof value === 'string') return value;
    if (value?.local) return state[value.local] ?? 0;
    if (value?.param) return params[value.param];
    if (value?.var) return 0;
    if (value?.add) return value.add.reduce((sum, item) => sum + Number(evaluateDfValue(item, state, params)), 0);
    if (value?.multiply) return value.multiply.reduce((product, item) => product * Number(evaluateDfValue(item, state, params)), 1);
    return 0;
  };
  const compareDfValue = (left, command) => {
    if (Object.hasOwn(command, 'eq')) return left === command.eq;
    if (Object.hasOwn(command, 'lte')) return left <= command.lte;
    if (Object.hasOwn(command, 'gte')) return left >= command.gte;
    if (Object.hasOwn(command, 'ne')) return left !== command.ne;
    return Boolean(left);
  };
  const executeDfCommands = (commands, state, params) => {
    for (const command of commands) {
      if (command.if) {
        const left = evaluateDfValue(command.if, state, params);
        if (compareDfValue(left, command)) executeDfCommands(command.then || [], state, params);
        else executeDfCommands(command.else || [], state, params);
      } else if (command.set?.local) {
        state[command.set.local] = evaluateDfValue(command.value, state, params);
      }
    }
  };
  const dfState = { CARLS_DF_EDITING: 0, CARLS_DF_INPUT_INDEX: 1, CARLS_DF_ENTRY_FREQUENCY: 0 };
  for (let position = 1; position <= 6; position += 1) dfState[`CARLS_DF_D${position}`] = 0;
  executeDfCommands(mission.macros['CARLS DF digit'], dfState, { digit: 1 });
  expectRegression(dfState.CARLS_DF_EDITING === 1 && dfState.CARLS_DF_INPUT_INDEX === 2 && dfState.CARLS_DF_D1 === 1 && dfState.CARLS_DF_ENTRY_FREQUENCY === 100000, 'DF first key must be captured and visible during the same event');
  expectRegression(dfJson.includes('"text":"EDT: {0}_#.###","params":[{"local":"CARLS_DF_D1"}]'), 'DF first key must render with the agreed EDT: 1_#.### template');
  [2, 1, 5, 0, 0].forEach((digitValue) => executeDfCommands(mission.macros['CARLS DF digit'], dfState, { digit: digitValue }));
  expectRegression(dfState.CARLS_DF_INPUT_INDEX === 7 && dfState.CARLS_DF_ENTRY_FREQUENCY === 121500, 'DF 121500 keypad sequence must complete without dropping a digit');
  expectRegression(digit.includes('"param":"digit"') && digit.includes('"local":"CARLS_DF_D1"') && !Array.isArray(mission.macros['CARLS DF begin entry']), 'DF must retain direct parameter capture without a delayed begin-entry task');
  expectRegression(!open.includes('"sleep":0.1') && open.includes('"call_macro":"CARLS buttons"'), 'DF opening must register handlers immediately after switching page');
  const dfHandlers = collect(mission.macros['CARLS buttons'] || [], (item) => /^MISSION_RADIO_CARLS_[0-9]$/.test(item.create_event_handler));
  for (let digitNumber = 0; digitNumber <= 9; digitNumber += 1) {
    const eventName = `MISSION_RADIO_CARLS_${digitNumber}`;
    const handler = dfHandlers.find((item) => item.create_event_handler === eventName);
    const route = handler?.commands?.[0]?.then?.find((command) => command.call_macro === 'CARLS DF digit');
    expectRegression(route?.params?.digit === digitNumber, `DF digit event ${digitNumber} must pass its digit directly to the capture macro`);
  }

  const crewEmergencyMacros = [
    'post crew safety message', 'evaluate crew lifescore state', 'apply object crew lifescore impact',
    'apply hoist crew lifescore impact', 'replace deceased crew object', 'board crew after emergency',
    'crew emergency hospital admission', 'crew emergency route to care', 'crew emergency response'
  ];
  crewEmergencyMacros.forEach((name) => expectRegression(Array.isArray(mission.macros[name]), `crew emergency macro must exist: ${name}`));
  const crewImpact = compact(mission.macros['apply crew lifescore impact'] || []);
  expectRegression(crewImpact.includes('"param":"member"') && crewImpact.includes('"local":"CREW_LIFESCORE_CURRENT"'), 'crew impact must target one explicit member and evaluate the resulting score');
  const crewMonitor = compact(mission.macros['start crew lifescore monitor'] || []);
  expectRegression(crewMonitor.includes('"object":"pax3","var":"distance:m","to":"VFXA"') && crewMonitor.includes('"object":"hoist_crew","var":"distance:m","to":"VFXA"'), 'scene exposure must use each ground operator distance to the active hazard');
  expectRegression(crewMonitor.includes('"object":"pax3","member":2') && compact(mission.macros['apply hoist crew lifescore impact'] || []).includes('"member":3') && !compact(mission.macros['apply hoist crew lifescore impact'] || []).includes('"member":4'), 'crew role mapping must keep pax3 as medical crew 2 and hoist_crew as hoist operator 3');
  expectRegression(!crewMonitor.includes('"object":"VFXA","var":"distance:m"'), 'scene exposure must never use helicopter-to-smoke distance as crew exposure');
  const crewPost = compact(mission.macros['post crew safety message'] || []);
  expectRegression(crewPost.includes('"set_message"') && crewPost.includes('Dispatcher_Messages') && crewPost.includes('UpdateRescueTrack'), 'crew safety alerts must reach tablet, dispatch messages, and RescueTrack');
  const crewEvaluate = compact(mission.macros['evaluate crew lifescore state'] || []);
  expectRegression(crewEvaluate.includes('"lte":10') && crewEvaluate.includes('crew emergency response'), 'crew emergency response must enforce the LifeScore <=10 threshold');
  const crewResponse = compact(mission.macros['crew emergency response'] || []);
  expectRegression(crewResponse.includes('"value":"CREW_FATAL"') && crewResponse.includes('"value":"CREW_CRITICAL"') && crewResponse.includes('replace deceased crew object'), 'crew death and critical injury must both fail the mission through the emergency response');
  const fatalReplacement = compact(mission.macros['replace deceased crew object'] || []);
  ['pax3', 'pax1', 'pax2', 'hoist_crew'].forEach((name) => {
    expectRegression(fatalReplacement.includes(`"destroy_object":"${name}"`) && fatalReplacement.includes(`"name":"${name}","title":"Airbus H145 Medic Stretcher"`), `deceased ground object ${name} must be replaced in place with the packaged casualty asset under the same name`);
  });
  const emergencyBoarding = compact(mission.macros['board crew after emergency'] || []);
  ['SDK_PAX_1_ON', 'SDK_PAX_2_ON', 'SDK_PAX_3_ON'].forEach((trigger) => expectRegression(emergencyBoarding.includes(trigger), `emergency boarding must restore ${trigger}`));
  expectRegression(emergencyBoarding.includes('CREW_EMERGENCY_FATAL') && emergencyBoarding.includes('CREW_IMPACT_OBJECT'), 'fatal boarding must leave only the deceased packaged object on scene while boarding survivors');
  const emergencyRoute = compact(mission.macros['crew emergency route to care'] || []);
  expectRegression(emergencyRoute.includes('Query closest hospital') && emergencyRoute.includes('user hospital WP') && emergencyRoute.includes('"local":"FPL_NMBR"') && emergencyRoute.includes('"value":8'), 'critical/fatal crew emergency must route to the nearest hospital');
  expectRegression(emergencyRoute.includes('CREW_EMERGENCY_ROUTE_FALLBACK') && emergencyRoute.includes('return to base'), 'crew emergency must fall back to base if no hospital query result is available');
  const hospitalAdmission = compact(mission.macros['crew emergency hospital admission'] || []);
  expectRegression(hospitalAdmission.includes('hospital_door') && hospitalAdmission.includes('"hospital"') && hospitalAdmission.includes('"destroy_object":"pax3"'), 'surviving operators must deboard and enter the hospital building');
  const hoistRisk = compact(mission.macros['start hoist out risk monitor'] || []);
  expectRegression(hoistRisk.includes('apply hoist crew lifescore impact') && !hoistRisk.includes('apply crew lifescore impact'), 'hoist risk must damage only the exposed hoist operator');
  const fatalArrays = [];
  const collectFatalArrays = (value) => {
    if (Array.isArray(value)) {
      if (value.some((command) => command?.call_macro === 'hoist out fatal failure')) fatalArrays.push(value);
      value.forEach(collectFatalArrays);
      return;
    }
    if (value && typeof value === 'object') Object.values(value).forEach(collectFatalArrays);
  };
  collectFatalArrays(mission.macros['Hoisting back up'] || []);
  expectRegression(fatalArrays.length === 3 && fatalArrays.every((commands) => {
    const fatalIndex = commands.findIndex((command) => command?.call_macro === 'hoist out fatal failure');
    const resetIndex = commands.findIndex((command) => command?.set?.local === 'HOIST_OUT' && command?.value === 0);
    return resetIndex < 0 || fatalIndex < resetIndex;
  }), 'all legacy hoist fatal branches must call failure before clearing HOIST_OUT');
  const crewReport = compact(mission.macros['refresh crew lifescore report'] || []);
  expectRegression(crewReport.includes('"value":"CRITICAL"') && crewReport.includes('"value":"DECEASED"'), 'crew report must distinguish critical injury from death');
  const endMenuText = compact(mission.macros['end menu'] || []);
  expectRegression(endMenuText.includes('MISSION FAILED — CREW MEMBER DECEASED') && endMenuText.includes('MISSION FAILED — CREW MEMBER CRITICALLY INJURED'), 'end menu must report both crew emergency failure outcomes');
  expectRegression(endMenuText.includes('"local":"MISSION_FAILED"},"eq":null'), 'successful completion text must be hidden for every failed mission');
  const crewDebugText = compact(mission.macros['debug page'] || []);
  expectRegression(crewDebugText.includes('CREW SAFETY / EMERGENCY') && crewDebugText.includes('CREW_FATAL_OBJECT_REPLACED'), 'debug page must expose crew emergency and packaged-object state');

}
Object.entries(mission.macros).forEach(([name, commands]) => {
  if (!Array.isArray(commands)) errors.push(`macro must be a command array: ${name}`);
});
checkBeforeTakeoffLayout();
walk(mission);
scanLogical(mission, '$');
checkCompanionMission();
checkRelease91Regressions();
checkAircraftProfileRegression();
checkRelease93Regressions();

if (errors.length) {
  console.error(JSON.stringify({ result: 'FAIL', errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  result: 'PASS',
  executableConditions,
  rendererConditions,
  staticMacroCalls,
  carlsLayouts,
  beforeTakeoffRows,
  regressionChecks,
  requireConditions,
  dynamicMacroCalls,
  iconReferences,
  companionChecks,
  companionExecutableConditions,
  companionRendererConditions,
  macroArrays: macroNames.size,
}, null, 2));
