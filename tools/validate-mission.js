#!/usr/bin/env node

/* Blocking static checks for HEMS Random Everywhere Mission releases. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const missionPath = path.resolve(process.env.HEMS_MISSION_FILE || path.join(root, 'everywhere_all.json'));
const mission = JSON.parse(fs.readFileSync(missionPath, 'utf8'));
const companionMission = JSON.parse(fs.readFileSync(path.join(root, 'train.json'), 'utf8'));
const globals = JSON.parse(fs.readFileSync(path.join(root, 'global.json'), 'utf8'));
const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.en.md'), 'utf8');
const validateDfRelease = require('./validate-df-release');

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
let topLevelRendererChecks = 0;

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

function checkRootShape() {
  const requiredRootKeys = ['title', 'id', 'author', 'start_info', 'macros', 'aircraft', 'applicable', 'api_version', 'data', 'threads', 'locations', 'objects', 'userActions', 'objectives', 'briefing', 'icons'];
  requiredRootKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(mission, key)) errors.push(`missing required root key: ${key}`);
  });
  if (!mission.data || typeof mission.data !== 'object' || Array.isArray(mission.data)) errors.push('root data must be an object');
  if (mission.data?.Debug_Table !== 'Andrews_debug_snapshots') errors.push('Debug_Table must remain under root data');
  if (Object.prototype.hasOwnProperty.call(mission.macros || {}, 'Debug_Table')) errors.push('root data entries must not be absorbed into macros');
}

function checkTopLevelRendererCommands(document, label) {
  const rendererKeys = ['image', 'title', 'link', 'text', 'buttonbar', 'describe_icon', 'slider', 'input'];
  Object.entries(document.macros || {}).forEach(([name, commands]) => {
    if (!Array.isArray(commands)) return;
    commands.forEach((command, index) => {
      topLevelRendererChecks += 1;
      const invalidKeys = rendererKeys.filter((key) => Object.prototype.hasOwnProperty.call(command || {}, key));
      if (invalidKeys.length) errors.push(`${label} macro ${name} executes renderer key(s) ${invalidKeys.join(", ")} outside set_dispatch at command ${index}`);
    });
  });
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

function checkCompleteDebugSnapshot(debugPage) {
  const sections = ["COMMON", "SUMMARY", "MISSION", "MEDICAL", "GROUND", "GUIDANCE", "INVENTORY"];
  const dispatch = (debugPage || []).find((command) => Array.isArray(command.set_dispatch))?.set_dispatch || [];
  const capture = dispatch
    .flatMap((row) => row.buttonbar || [])
    .find((button) => button.title === "CAPTURE SNAPSHOT")?.commands || [];
  const skip = new Set(["commands", "click_commands", "then", "else", "do", "try", "catch"]);

  const sectionForRow = (row) => {
    const output = [];
    const add = (value) => {
      if (typeof value === "string" && sections.includes(value) && !output.includes(value)) output.push(value);
    };
    const scan = (value) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach(scan);
        return;
      }
      if (value.require?.local === "debug_page_section") add(value.eq);
      if (value.local === "debug_page_section") add(value.eq);
      Object.values(value).forEach(scan);
    };
    scan(row.show_condition);
    return output;
  };

  const collectVariables = (value, output, seen) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => collectVariables(entry, output, seen));
      return;
    }
    if (typeof value !== "object") return;
    const add = (key, expression) => {
      if (!seen.has(key)) {
        seen.add(key);
        output[key] = expression;
      }
    };
    if (typeof value.local === "string") add("local:" + value.local, { local: value.local });
    if (typeof value.global === "string") add("global:" + value.global, { global: value.global });
    if (Array.isArray(value.var)) add("var:" + value.var[0], { var: value.var });
    if (typeof value.param === "string") add("param:" + value.param, { param: value.param });
    if (typeof value.object === "string" && typeof value.var === "string") add("object:" + value.object + ":" + value.var, { object: value.object, var: value.var });
    if (typeof value.location === "string" && typeof value.var === "string") add("location:" + value.location + ":" + value.var, { location: value.location, var: value.var });
    if (value.table && typeof value.key === "string") add("table:" + JSON.stringify(value.table) + ":" + value.key, { table: value.table, key: value.key });
    Object.entries(value).forEach(([key, child]) => {
      if (key === "text" && typeof child === "string") {
        for (const match of child.matchAll(/\{(local|global):([^}]+)\}/g)) add(match[1] + ":" + match[2], { [match[1]]: match[2] });
      }
      if (!skip.has(key)) collectVariables(child, output, seen);
    });
  };

  const tableSet = (key) => capture.find((command) => command.set?.table?.static === "Debug_Table" && command.set.key === key);
  expectRegression(tableSet("snapshot_schema")?.value === 8, "debug snapshot schema must be version 8");
  expectRegression(tableSet("snapshot_page_order")?.value === sections.join(","), "debug snapshot must preserve the Debug-page order");
  sections.forEach((section) => {
    const expected = {};
    const seen = new Set();
    dispatch.forEach((row) => {
      const visibleIn = sectionForRow(row);
      if ((section === "COMMON" && visibleIn.length === 0) || visibleIn.includes(section)) collectVariables(row, expected, seen);
    });
    const captured = tableSet("snapshot_" + section.toLowerCase());
    expectRegression(!!captured && !!captured.value?.create_struct, "debug snapshot must contain ordered " + section + " values");
    const missing = Object.keys(expected).filter((key) => !Object.prototype.hasOwnProperty.call(captured?.value?.create_struct || {}, key));
    expectRegression(missing.length === 0, "debug snapshot " + section + " omits " + missing.join(", "));
  });
}

function checkDynamicEltCoverage() {
  const modes = new Set();
  collect(mission.data?.accidents || [], (item) => typeof item?.ELT_mode === 'string').forEach((item) => modes.add(item.ELT_mode));
  expectRegression(modes.size > 0, 'mission data must define at least one ELT mode');
  modes.forEach((mode) => {
    expectRegression(Array.isArray(mission.macros[`ELT ${mode}`]), `ELT mode ${mode} must resolve to its dynamic macro`);
  });
  const dynamicCalls = collect(mission, (item) => item.call_macro === 'ELT {local:ELT}');
  expectRegression(dynamicCalls.length === 3, 'all three ELT launch paths must retain the dynamic ELT macro call');
}

function checkDebugSummaryLayout() {
  const page = mission.macros['debug page'] || [];
  const rows = page.find((command) => Array.isArray(command.set_dispatch))?.set_dispatch || [];
  const summaryRows = rows.filter((row) => compact(row.show_condition || {}).includes('"debug_page_section"') && compact(row.show_condition || {}).includes('"eq":"SUMMARY"'));
  const orderedPrimary = ['MISSION ID', 'LOAD STATUS', 'OSM | SAVED', 'VEHICLES ON SCENE', 'LOCATION', 'CREW', 'PATIENTS', 'MISSION PHASE', 'CURRENT OBJECTIVE'];
  const positions = orderedPrimary.map((prefix) => summaryRows.findIndex((row) => typeof row.text === 'string' && row.text.startsWith(prefix)));
  expectRegression(positions.every((position) => position >= 0) && positions.every((position, index) => index === 0 || position > positions[index - 1]), 'Summary must lead with mission ID, load, OSM, vehicles, location, crew, patients, phase, and objective in that order');
  expectRegression(!summaryRows.some((row) => /^(SMOKE|DF STATIONS|EMERGENCY DF)/.test(String(row.text || ''))), 'Summary must not lead with smoke or DF diagnostics');
  expectRegression(summaryRows.every((row) => !['green', 'orange', 'hotpink'].includes(row.color)), 'Summary colors must use the restrained operational palette');
  const section = (row) => compact(row.show_condition || {});
  expectRegression(rows.some((row) => row.text === 'SMOKE | MODE {0} | REALISTIC {1}' && section(row).includes('"INVENTORY"')), 'smoke diagnostics must be in Inventory');
  expectRegression(rows.filter((row) => /^DF STATIONS|^EMERGENCY DF/.test(String(row.text || ''))).every((row) => section(row).includes('"GUIDANCE"')), 'DF diagnostics must be in Guidance');
  expectRegression(rows.some((row) => row.text === 'CREW HEALTH | P:{0} M:{1} H:{2} | IMPACT:{3} | FATAL:{4}' && section(row).includes('"MEDICAL"')), 'crew health diagnostics must be in Medical');
  const dateCapture = (key, variable) => collect(page, (command) => command.set?.table?.static === 'Debug_Table' && command.set.key === key && JSON.stringify(command.value) === JSON.stringify({ var: [variable, 'number'] }));
  expectRegression(dateCapture('date_year', 'E:LOCAL YEAR').length === 1 && dateCapture('date_month', 'E:LOCAL MONTH OF YEAR').length === 1 && dateCapture('date_day', 'E:LOCAL DAY OF MONTH').length === 1, 'snapshot date must use simulator local year, month, and day');
}

function checkRuntimeStateInitialization() {
  const objective1 = mission.macros.objective1 || [];
  const selector = mission.macros["select unique public title"] || [];
  const handover = mission.macros["ambulance clinical handover"] || [];
  const dfUpdate = mission.macros["DF emergency beacon update"] || [];
  const plbPersonal = mission.macros["ELT plb_person"] || [];
  const trackerPage = mission.macros["test tracker page"] || [];
  const trackerFailure = mission.macros["test tracker request failed comment"] || [];
  const profileStore = mission.macros["store aircraft profile on file"] || [];
  const findSet = (commands, name) => commands.findIndex((command) => command.set?.local === name);
  const findSetValue = (commands, name, value) => commands.findIndex((command) => command.set?.local === name && JSON.stringify(command.value) === JSON.stringify(value));
  const findVarSetValue = (commands, name, value) => commands.findIndex((command) => command.set?.var?.[0] === name && JSON.stringify(command.value) === JSON.stringify(value));

  const releaseBuild = Number(/(\d+)\s*$/.exec(mission.title || '')?.[1]);
  expectRegression(Number.isInteger(releaseBuild), 'mission title must end in a numeric build');
  expectRegression(findVarSetValue(objective1, 'L:RELEASE_BUILD', releaseBuild) >= 0, 'objective1 must initialize L:RELEASE_BUILD from the mission title build');

  [["PUBLIC_USED_TITLES", []], ["PUBLIC_SELECTOR_LOCK", 0], ["CARLS_DF_SAR_PLB_PERSON_ACTIVE", "no"], ["DF_EMERGENCY_RX_RANGE_M", 0], ["test_tracker_selected_id", null], ["test_tracker_selected_label", null], ["test_tracker_failure_comment", null]].forEach(([name, value]) => {
    expectRegression(findSetValue(objective1, name, value) >= 0, "objective1 must initialize " + name);
  });

  const usedTitlesGuard = selector.findIndex((command) => command.if?.local === "PUBLIC_USED_TITLES" && command.eq === null);
  const lockGuard = selector.findIndex((command) => command.if?.local === "PUBLIC_SELECTOR_LOCK" && command.eq === null);
  const lockWait = selector.findIndex((command) => command.wait_for?.local === "PUBLIC_SELECTOR_LOCK");
  const lockRelease = selector.findIndex((command) => command.set?.local === "PUBLIC_SELECTOR_LOCK" && command.value === 0);
  const trackerComplete = selector.findIndex((command) => command.call_macro === "test tracker complete");
  const resultReturn = selector.findIndex((command) => command.return?.param === "unique_public_candidate");
  expectRegression(usedTitlesGuard >= 0 && lockGuard >= 0 && lockWait > lockGuard, "public-title selector must initialize its array and lock before waiting");
  expectRegression(lockRelease > lockWait && trackerComplete > lockRelease && resultReturn > trackerComplete, "public-title selector must release lock and complete tracking before return");

  ["ambulance_handover_p1_ready", "ambulance_handover_p2_ready", "ambulance_handover_p3_ready"].forEach((name) => {
    const initial = findSetValue(handover, name, "pending");
    const wait = handover.findIndex((command) => command.wait_for?.local === name);
    expectRegression(initial >= 0 && wait > initial, "ambulance handover must initialize " + name + " before its wait");
  });
  const rangeSet = findSet(dfUpdate, "DF_EMERGENCY_RX_RANGE_M");
  const rangeUse = dfUpdate.findIndex((command, index) => index > rangeSet && compact(command).includes("DF_EMERGENCY_RX_RANGE_M"));
  expectRegression(rangeSet >= 0 && rangeUse > rangeSet, "DF emergency update must calculate its receive range before use");
  expectRegression(findSetValue(plbPersonal, "CARLS_DF_SAR_PLB_PERSON_ACTIVE", "yes") >= 0, "ELT plb_person must set its active state before starting its thread");
  ["AIRCRAFT_PROFILE_STORE_ACTIVE", "AIRCRAFT_PROFILE_STORE_SLOT", "AIRCRAFT_PROFILE_STORE_DISPLAY_NAME"].forEach((name, index) => {
    expectRegression(findSet(profileStore, name) === index, "profile-store temporary " + name + " must be assigned before it is used");
  });
  const trackerValues = trackerPage.map((command, index) => ({ command, index })).filter(({ command }) => command.set?.local?.startsWith("test_tracker_") && (command.set.local.includes("_state_") || command.set.local.includes("_comment_")));
  expectRegression(trackerValues.length === 72 && trackerValues.every(({ command, index }) => trackerPage[index + 1]?.if?.local === command.set.local && trackerPage[index + 1]?.eq === null), "Test Tracker must initialize every displayed state and comment before rendering it");
  ["test_tracker_selected_id", "test_tracker_selected_label", "test_tracker_failure_comment"].forEach((name) => {
    expectRegression(findSet(trackerFailure, name) >= 0, "failure-comment flow must initialize " + name);
  });
}

function checkRelease91Regressions() {

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
    const patientSelectors = collect(medicalPage, (item) => Array.isArray(item.buttonbar) && item.buttonbar.map((button) => button.title).join(',') === 'Patient 1,Patient 2,Patient 3');
    expectRegression(patientSelectors.length >= 2, 'Medical page must expose Patient 1/2/3 selectors in both live and closed views');
    patientSelectors.forEach((selector) => {
      expectRegression(!selector.show_condition, 'patient selector must remain available outside manual-treatment mode');
      selector.buttonbar.forEach((button, index) => {
        expectRegression(compact(button.commands || []).includes('select medical patient page'), `patient selector Patient ${index + 1} must select the requested clinical record`);
      });
    });
  }

  const selectedPatient = mission.macros['select medical patient page'];
  const selectedPatientText = compact(selectedPatient || []);
  expectRegression(selectedPatientText.includes('"medical_display_patient"') && selectedPatientText.includes('"param":"patient"') && selectedPatientText.includes('sync medical patient display'), 'patient selector must retain the requested patient and refresh that clinical record');
  expectRegression(!selectedPatientText.includes('crewvisiting'), 'manual patient selection must not be overwritten by an active HEMS visit');
  const visitGate = compact(mission.macros['patient clinical visit gate'] || []);
  expectRegression(visitGate.includes('"medical_display_patient"') && visitGate.includes('"param":"patient"') && visitGate.includes('sync medical patient display'), 'an HEMS clinical visit must automatically focus its patient record');

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
  expectRegression(assessmentPositions.length === 0, 'ambulance handover must not duplicate the synchronous medic-arrival assessments');
  expectRegression(continuationPositions.length === 3, 'ambulance handover must run all three continuation adapters');
  [2, 3].forEach((patient) => {
    const macro = mission.macros[`ambulance2 secondary patient${patient}`];
    expectRegression(Array.isArray(macro), `secondary ambulance patient ${patient} macro must exist`);
    if (!macro) return;
    const text = compact(macro);
    expectRegression(text.includes(`P${patient}_AMBULANCE_STAGE`) && text.includes('ground_transport_ready'), `secondary ambulance patient ${patient} requires ground-transport clearance`);
    expectRegression(text.includes(`P${patient}_GROUND_TRANSPORTED`) && text.includes('"value":"yes"'), `secondary ambulance patient ${patient} records transport`);
    expectRegression(text.includes(`"destroy_object":"injured_human${patient}"`), `secondary ambulance patient ${patient} removes the transported scene casualty`);
    expectRegression(text.includes(`from_any_injured${patient}_to_ready_for_transport`), `secondary ambulance patient ${patient} must normalize the casualty before stretcher loading`);
    expectRegression(!text.includes(`"drive_object":{"name":"injured_human${patient}"`), `secondary ambulance patient ${patient} must not drag the casualty to the ambulance`);
    expectRegression(text.includes('"object":"ambustretcher2","var":"VAR 2"},"value":3'), `secondary ambulance patient ${patient} must show the casualty on the ambulance stretcher`);
  });

  const previsitLoad = compact(mission.macros['ambulance previsit load'] || []);
  expectRegression(previsitLoad.includes('from_any_injured_to_ready_for_transport'), 'previsit loading must normalize a non-standard casualty');
  expectRegression(!previsitLoad.includes('"move_object":"injured_human"'), 'previsit loading must not move a casualty directly into the ambulance');
  expectRegression(previsitLoad.includes('"object":"ambustretcher7","var":"VAR 2"},"value":3'), 'previsit loading must show the casualty on the ambulance stretcher');

  ['from_any_injured_to_ready_for_transport', 'from_any_injured2_to_ready_for_transport', 'from_any_injured3_to_ready_for_transport'].forEach((name) => {
    const helper = compact(mission.macros[name] || []);
    expectRegression(helper.includes('"var":"VAR 1"},"value":1'), `${name} must set packed VAR 1 before stretcher transfer`);
  });

  const residential = mission.macros.residential;
  const residentialThreePatients = residential?.find((command) => command.if?.local === 'HELOVICTIMS' && command.eq === 3);
  expectRegression(Array.isArray(residentialThreePatients?.then), 'residential three-patient rescue-point branch must exist');
  if (Array.isArray(residentialThreePatients?.then)) {
    ['RUP', 'RDWN', 'LDWN', 'LUP', 'INJU12', 'INJU13', 'INJU23'].forEach((name) => {
      const waypoint = residentialThreePatients.then.find((command) => command.create_location === name);
      expectRegression(waypoint?.zones?.[0]?.zone?.location?.object === 'rescue_location', `residential fire scene ${name} waypoint must use the external rescue point`);
    });
    expectRegression(residentialThreePatients.then.some((command) => command.call_macro === 'fence road'), 'residential fire scene must fence the external rescue point');
  }
  const residentialFire = residential?.find((command) => command.if?.local === 'HELOVICTIMS' && command.eq === 3 && compact(command).includes('random_fire'));
  const residentialFireText = compact(residentialFire || []);
  expectRegression(residentialFireText.includes('"local":"random_fire"},"value":"forced"') && residentialFireText.includes('"local":"VFX"},"value":8'), 'the residential fire branch must force the random-VFX fire state');
  expectRegression(!residentialFireText.includes('VFXB') && residentialFireText.includes('"has_object":"VFXA"') && residentialFireText.includes('"move_object":"VFXA","to":"FIRE"'), 'the residential fire must relocate the extinguishable random-VFX object instead of creating an isolated fire');
  const firstFiretruck = compact(mission.macros.Firetruck1 || []);
  expectRegression(firstFiretruck.includes('"local":"VFX"},"gte":5') && firstFiretruck.includes('"local":"VFX"},"lte":15') && firstFiretruck.includes('"call_macro":"Firetruck2"'), 'fire intensity 8 must retain the two-firetruck response');

  ['3 crew ground ops', '4 or 5 crew ground ops', 'HOISTING', '3 crew SKID LDG', '4 crew SKID LDG', '5 crew SKID LDG'].forEach((name) => {
    const macro = mission.macros[name];
    expectRegression(Array.isArray(macro), `${name} macro must exist`);
    if (macro) {
      expectRegression(hasState(macro, 'P2_GROUND_TRANSPORTED'), `${name} must skip ground-transported patient 2`);
      expectRegression(hasState(macro, 'P3_GROUND_TRANSPORTED'), `${name} must skip ground-transported patient 3`);
    }
  });

  const ambulanceHandover = compact(mission.macros['ambulance clinical handover'] || []);
  const sceneAssessmentMacros = ['ambustretcher full', 'ambustretcher close', 'ambustretcher far'].map((name) => compact(mission.macros[name] || []));
  const countMatches = (value, needle) => value.split(needle).length - 1;
  expectRegression(!ambulanceHandover.includes('"distance:m"') && !ambulanceHandover.includes('ambumedic7'), 'ambulance handover must wait for direct assessment completion, not a medic distance');
  const assessmentCalls = sceneAssessmentMacros.map((macro) => countMatches(macro, '"call_macro":"ambulance assess patient"'));
  expectRegression(assessmentCalls[0] === 8, 'full ambulance response must assess every available patient before HEMS handover');
  expectRegression(assessmentCalls[1] === 5 && assessmentCalls[2] === 4, 'partial ambulance responses must retain every final medic-arrival assessment');
  expectRegression(assessmentCalls.reduce((total, count) => total + count, 0) === 17, 'every final ambulance-medic arrival must start its synchronous assessment');
  const postStretcherWalk = '"drive_object":{"name":"hoist_crew","to":[{"bearing":185,"dist":1.5}],"VAR1":3,"speed":2}';
  const postStretcherStanding = postStretcherWalk.replace('"VAR1":3', '"VAR1":1');
  expectRegression(countMatches(compact(mission.macros['3 crew ground ops'] || []), postStretcherWalk) === 1, '3 crew post-stretcher return must walk before cargo doors close');
  expectRegression(countMatches(compact(mission.macros['4 or 5 crew ground ops'] || []), postStretcherWalk) === 1, '4/5 crew post-stretcher return must walk before cargo doors close');
  expectRegression(!compact(mission.macros['3 crew ground ops'] || []).includes(postStretcherStanding) && !compact(mission.macros['4 or 5 crew ground ops'] || []).includes(postStretcherStanding), 'post-stretcher return must not use the standing animation');

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
  expectRegression(mission.data?.Debug_Table === 'Andrews_debug_snapshots', 'debug snapshot must use a persistent HPG table');
  expectRegression(debugText.includes('"open_table":{"static":"Debug_Table"}') && debugText.includes('"save_table":{"static":"Debug_Table"}'), 'debug snapshot table must be opened and saved');
  ['valid', 'time', 'mission_id', 'phase', 'route_error', 'query_error', 'transport', 'transfer_state', 'active_patient', 'display_patient', 'preset'].forEach((key) => {
    expectRegression(debugText.includes('"key":"' + key + '"'), 'debug snapshot table must persist ' + key);
  });
  expectRegression(debugText.includes('LIVE MISSION SUMMARY'), 'debug page must provide a consolidated live summary');
  expectRegression(debugText.includes('COMPLETE LOCAL INVENTORY') && debugText.includes('COMPLETE LVAR INVENTORY'), 'debug Inventory view must retain both complete inventories');
  checkCompleteDebugSnapshot(debugPage);
}

function checkAircraftProfileRegression() {
  const allText = compact(mission);
  const requiredMacros = [
    'ensure aircraft profile defaults', 'sync aircraft profile runtime',
    'apply aircraft factory profile', 'save custom aircraft profile',
    'load custom aircraft profile', 'apply linked aircraft profile',
    'store aircraft profile on file', 'copy saved aircraft profile to actual set',
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
    Aircraft_Profile_Table6: 'Andrews_custom_prst_5',
    Aircraft_Profile_Saved_Preset: 'Andrews_saved_aircraft_profile'
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
  ['CUSTOM DEFAULT', 'CUSTOM PRST 1', 'CUSTOM PRST 5', 'STORE PRESET ON FILE', 'COPY SAVED PRESET TO ACTUAL SET', 'MSN LIST DFLT', 'MSN LIST 5'].forEach((token) => {
    expectRegression(profileText.includes(token), `aircraft profile page must expose ${token}`);
  });
  ['SAVE CUSTOM', 'RELOAD CUSTOM', 'UNLINK', 'LINK DEFAULT', 'LINK PRST'].forEach((token) => {
    expectRegression(!profileText.includes(token), `aircraft profile page must not retain obsolete control ${token}`);
  });
  expectRegression(!profileText.includes('"static":{"global"'), 'aircraft profile page must not use unsupported static global table references');
  const profileDispatches = profilePage.filter((command) => Array.isArray(command.set_dispatch));
  expectRegression(profileDispatches.length === 1, 'aircraft profile page must render through exactly one set_dispatch command');
  expectRegression(profilePage.every((command) => !['image', 'title', 'link', 'text', 'buttonbar'].some((key) => Object.prototype.hasOwnProperty.call(command, key))), 'aircraft profile page must not execute renderer items as commands (HPG NotFound regression)');
  expectRegression(compact(profileDispatches[0] || {}).includes('CUSTOM DEFAULT') && compact(profileDispatches[0] || {}).includes('MSN LIST 5'), 'aircraft profile set_dispatch must contain the complete profile UI');
  expectRegression(callsInOrder(profilePage).includes('ensure aircraft profile defaults') && callsInOrder(profilePage).includes('refresh aircraft profile page state'), 'aircraft profile page must initialize defaults and its current custom table before rendering');
  const profileLinkButtons = collect(profileDispatches, (item) => typeof item.title === 'string' && /^MSN LIST (?:DFLT|[1-5])$/.test(item.title));
  expectRegression(profileLinkButtons.length === 6 && profileLinkButtons.every((item) => compact(item.disabled_condition || {}).includes('AIRCRAFT_PROFILE_ACTIVE') && compact(item.disabled_condition || {}).includes('CUSTOM')), 'MSN LIST link buttons must be disabled outside a CUSTOM settings profile');
  const copyButtonRow = collect(profileDispatches, (item) => Array.isArray(item.buttonbar) && item.buttonbar.some((button) => button.title === 'COPY SAVED PRESET TO ACTUAL SET'))[0];
  expectRegression(Boolean(copyButtonRow) && compact(copyButtonRow.show_condition || {}).includes('AIRCRAFT_PROFILE_ACTIVE') && compact(copyButtonRow.show_condition || {}).includes('CUSTOM') && compact(copyButtonRow).includes('AIRCRAFT_PROFILE_SAVED_PRESET_VALID'), 'saved preset copy must be available only for CUSTOM profiles and only after a stored file exists');

  const profileSettingsLink = collect(mission.macros.settings || [], (item) => item.link === 'AIRCRAFT SETTINGS PROFILES');
  expectRegression(profileSettingsLink.length === 1 && callsInOrder(profileSettingsLink[0].commands || []).includes('aircraft profiles page'), 'Settings profile link must call the profile page');
  const settingsDispatchForLayout = (mission.macros.settings || []).find((command) => Array.isArray(command.set_dispatch))?.set_dispatch || [];
  const flightAssistIndex = settingsDispatchForLayout.findIndex((item) => item.link === '+ FLIGHT ASSISTS');
  expectRegression(flightAssistIndex > 0 && settingsDispatchForLayout[flightAssistIndex - 1]?.image === 'bar', 'Settings must separate Most Used Settings from Flight Assist with a bar');

  const settingsText = compact(mission.macros.settings || []);
  ['FLIGHT ASSISTS', 'Engine failure simulation', 'Orange target smoke', 'Target guidance range', 'Crew health simulation', 'Winch control mode', 'GTN(TDS) NAV SOURCE', 'Teleport assist'].forEach((token) => {
    expectRegression(settingsText.includes(token), `Settings must expose individual flight-assist option: ${token}`);
  });
  const linked = compact(mission.macros['apply linked aircraft profile'] || []);
  ['Config_Table1', 'Config_Table3', 'Config_Table4', 'Config_Table5', 'Config_Table6', 'Config_Table7'].forEach((table) => {
    expectRegression(linked.includes(table), `linked aircraft profile must resolve ${table}`);
  });
  expectRegression(!linked.includes('"key":{"local":"MSN_CONFIG_PRESET"}'), 'linked aircraft profile must use explicit supported mission-table keys');
  expectRegression(callsInOrder(mission.macros['switch mission preset'] || []).includes('apply linked aircraft profile'), 'mission preset switch must load its linked aircraft profile');
  expectRegression(callsInOrder(mission.macros['load current mission preset'] || []).includes('apply linked aircraft profile'), 'current mission preset reload must load its linked aircraft profile');
  expectRegression(callsInOrder(mission.macros.objective1 || []).includes('apply linked aircraft profile'), 'livery-driven mission preset selection must load its linked aircraft profile');
  const linkToggle = compact(mission.macros['link aircraft profile to mission'] || []);
  expectRegression(linkToggle.includes('Aircraft_Profile_Links') && linkToggle.includes('"value":null') && linkToggle.includes('save_table'), 'selected MSN LIST link must toggle off and persist the link table');
  const immediateSave = compact(mission.macros['mark aircraft profile custom'] || []);
  expectRegression(immediateSave.includes('Aircraft_Profile_Table1') && immediateSave.includes('save custom aircraft profile'), 'profile changes must immediately persist to a custom slot');

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
  const savedProfileKeys = new Set(collect(mission.macros['save custom aircraft profile'] || [], (item) => item.set?.table && typeof item.set.key === 'string').map((item) => item.set.key));
  const loadedProfileKeys = new Set(collect(mission.macros['load custom aircraft profile'] || [], (item) => item.table && typeof item.key === 'string').map((item) => item.key));
  expectRegression([...savedProfileKeys].filter((key) => key !== 'saved_at').every((key) => loadedProfileKeys.has(key)), 'every saved aircraft-profile setting must be reloadable');
  expectRegression([...loadedProfileKeys].every((key) => savedProfileKeys.has(key)), 'aircraft-profile loading must not request unsaved setting keys');
  ['link aircraft profile to mission', 'unlink aircraft profile'].forEach((name) => {
    expectRegression(compact(mission.macros[name] || []).includes('save_table') && compact(mission.macros[name] || []).includes('Aircraft_Profile_Links'), `${name} must persist the reciprocal link table`);
  });

  const marksCustom = (commands) => Array.isArray(commands) && commands.some((command) => command.call_macro === 'mark aircraft profile custom');
  const directSettings = collect(mission.macros.settings || [], (item) => Array.isArray(item.commands) && item.commands.some((command) => command.set && profileKeys.has(command.set.global)));
  expectRegression(directSettings.length > 0 && directSettings.every((item) => marksCustom(item.commands)), 'every direct Settings profile change must mark CUSTOM');
  const profileSliders = collect(mission.macros.settings || [], (item) => item.slider && profileKeys.has(item.slider.global));
  expectRegression(profileSliders.length > 0 && profileSliders.every((item) => marksCustom(item.slider.commands)), 'every Settings slider in a profile must mark CUSTOM');
  const vehiclePages = [mission.macros.variant_selection || [], mission.macros['HEMS mission_type'] || []];
  const vehicleControls = vehiclePages.flatMap((page) => collect(page, (item) => Array.isArray(item.commands) && item.commands.some((command) => command.set && ['ambu_force', 'poli_force', 'fire_force'].includes(command.set.global))));
  expectRegression(vehicleControls.length >= 24 && vehicleControls.every((item) => marksCustom(item.commands)), 'all Custom Mission vehicle preferences must mark CUSTOM');
  const customIndicators = collect(profilePage, (item) => typeof item.title === 'string' && /^(CUSTOM |MSN LIST )/.test(item.title));
  expectRegression(customIndicators.length === 12 && customIndicators.every((item) => compact(item.select_condition).includes('AIRCRAFT_PROFILE_ACTIVE')), 'only CUSTOM state may select a saved slot or its MSN LIST link');
}
function checkRelease94Regressions() {
  const allText = compact(mission);
  const endpointLvar = 'L:{local:HXX}_PERSIST_MISSION_ENDPOINT_OPTION';
  ['normalize orange target smoke setting', 'create orange smoke marker', 'evaluate realistic orange smoke scene', 'arm realistic orange smoke', 'initialize crew lifescores for shift', 'apply crew lifescore impact', 'refresh crew lifescore report', 'start crew lifescore monitor', 'hoist out fatal failure', 'start hoist out risk monitor'].forEach((name) => {
    expectRegression(Array.isArray(mission.macros[name]), `release 94 macro must exist: ${name}`);
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

  const presetToggle = mission.macros['toggle mission preset category'];
  expectRegression(Array.isArray(presetToggle), 'mission preset category toggle macro must exist');
  if (presetToggle) {
    const anyEnabledScan = presetToggle.find((command) => command?.for_each?.static === 'accidents' && hasState(command, 'preset_target_any_enabled'));
    const stateBranch = presetToggle.find((command) => command?.if?.local === 'preset_target_all_enabled');
    const emptyBranch = stateBranch?.else?.[0];
    expectRegression(Boolean(anyEnabledScan) && compact(anyEnabledScan).includes('MSN_CONFIG_PRESET'), 'preset category toggle must derive whether the selected category has any enabled mission from the active table');
    expectRegression(compact(stateBranch?.then || []).includes('"enabled":false'), 'a fully enabled preset category must disable immediately');
    expectRegression(emptyBranch?.if?.local === 'preset_target_any_enabled' && emptyBranch?.eq === 0 && compact(emptyBranch.then || []).includes('"enabled":true'), 'a fully disabled preset category must enable immediately without confirmation');
    expectRegression(!compact(emptyBranch?.then || []).includes('preset_group_confirmation'), 'the fully disabled preset path must never show the partial-category confirmation');
    expectRegression(compact(emptyBranch?.else || []).includes('preset_group_pending') && compact(emptyBranch?.else || []).includes('preset_group_confirmation'), 'only a partially enabled preset category may enter same-button confirmation');
  }

  const settings = mission.macros.settings || [];
  const settingsDispatch = settings.find((command) => Array.isArray(command.set_dispatch))?.set_dispatch || [];
  ['tab11', 'tab12'].forEach((tab) => {
    expectRegression(settings.some((command) => command?.set?.local === tab && command.value === 0), `Settings must initialize ${tab} closed whenever the page opens`);
  });
  expectRegression(settingsDispatch.some((item) => item.link === '+ MEDICAL OPTIONS') && settingsDispatch.some((item) => item.link === '- MEDICAL OPTIONS'), 'Settings must expose a separate collapsible Medical Options section');
  const medicalSettingTokens = ['average injured visit/rescue times', 'Patient clinical treatment mode', 'Mechanical CPR system', 'LIFESCORE threshold for patient transportation', 'Cancel HEMS dispatch when enough ground units'];
  medicalSettingTokens.forEach((token) => {
    const item = settingsDispatch.find((candidate) => compact(candidate).includes(token));
    expectRegression(Boolean(item) && compact(item.show_condition || {}).includes('"local":"tab12"'), `Medical Options must own ${token}`);
    expectRegression(!compact(item?.show_condition || {}).includes('"local":"tab4"') && !compact(item?.show_condition || {}).includes('"local":"tab10"'), `${token} must not remain under Scene/Vehicles or Ground/Hoist`);
  });

  const pilotBoarding = settingsDispatch.find((item) => compact(item).includes('(P)Does the pilot boards with relative animations?'));
  expectRegression(Boolean(pilotBoarding) && compact(pilotBoarding.show_condition || {}).includes('"local":"tab10"'), 'pilot boarding must belong to Ground/Hoist Options');
  expectRegression(!compact(pilotBoarding?.show_condition || {}).includes('"local":"tab1"'), 'pilot boarding must not remain orphaned under Most Used Settings');
  expectRegression(settingsDispatch.indexOf(pilotBoarding) === settingsDispatch.findIndex((item) => item.text === 'GROUND/HOIST OPTIONS') + 1, 'pilot boarding must render directly inside the Ground/Hoist section');
  const treatmentModeLabel = settingsDispatch.find((item) => item.text === '(P)Patient clinical treatment mode:');
  expectRegression(Boolean(treatmentModeLabel) && compact(treatmentModeLabel.show_condition || {}).includes('"local":"tab12"'), 'patient clinical treatment mode must render in Medical Options');
  expectRegression(treatmentModeLabel?.color !== 'green', 'patient clinical treatment mode must use normal option text styling, not section-heading green');

  const ping = compact(mission.macros['CICERS PING'] || []);
  const ensure = compact(mission.macros['ensure data query service selection'] || []);
  const cicersSuccess = compact(mission.macros['restore data query selection after CICERS success'] || []);
  const cicersFailure = mission.macros['restore data query selection after CICERS failure'] || [];
  const pingCommands = mission.macros['CICERS PING'] || [];
  const pingInitializer = pingCommands.find((command) => command.if?.local === 'pingstart' && command.eq === null);
  const pingGuard = pingCommands.find((command) => command.if?.local === 'pingstart' && command.ne === 1);
  expectRegression(!ping.includes('CICERS_PREVIOUS_ENDPOINT') && ping.includes('CICERS_PREVIOUS_DATAQUERY_MODE'), 'CICERS ping must snapshot only the active data-query provider');
  expectRegression(ping.includes(endpointLvar) && ping.includes('restore data query selection after CICERS success') && ping.includes('restore data query selection after CICERS failure'), 'CICERS ping must restore the selection after either result');
  expectRegression(pingInitializer?.then?.some((command) => command.set?.local === 'pingstart' && command.value === 0) && Array.isArray(pingGuard?.then) && pingGuard.then.some((command) => command.set?.local === 'pingstart' && command.value === 1) && pingGuard.then.some((command) => command.create_thread), 'CICERS ping must initialize pingstart and reject overlapping ping threads');
  const cicersFailureGuard = cicersFailure[0];
  const cicersFailureManualModes = (cicersFailureGuard?.if?.or || []).map((item) => item.eq).sort().join(',');
  const cicersFailureManualRestore = (cicersFailureGuard?.then || []).some((command) => command.set?.var?.[0] === endpointLvar && command.value?.local === 'CICERS_PREVIOUS_DATAQUERY_MODE') && (cicersFailureGuard?.then || []).some((command) => command.set?.global === 'DATAQUERYSERVICE' && command.value?.local === 'CICERS_PREVIOUS_DATAQUERY_MODE');
  const cicersFailureAutoFallback = (cicersFailureGuard?.else || []).some((command) => command.set?.global === 'DATAQUERYSERVICE' && command.value === 4) && (cicersFailureGuard?.else || []).some((command) => command.call_macro === 'DATAQUERYSERVICERANDOM');
  expectRegression(cicersFailureManualModes === '0,1,2' && cicersFailureManualRestore && cicersFailureAutoFallback && !compact(cicersFailure).includes('CICERS_PREVIOUS_ENDPOINT'), 'CICERS failure must restore active manual provider 0/1/2 even when the persisted endpoint is stale, otherwise fall back to AUTO-TOGGLE');
  expectRegression(!ping.includes('DATAQUERYSERVICERANDOM'), 'CICERS ping must route expired keys through the same previous-provider fallback');
  const cicersSuccessGuard = (mission.macros['restore data query selection after CICERS success'] || [])[0];
  const cicersSuccessKeepsCicers = (cicersSuccessGuard?.else || []).some((command) => command.set?.var?.[0] === endpointLvar && command.value === 3) && (cicersSuccessGuard?.else || []).some((command) => command.set?.global === 'DATAQUERYSERVICE' && command.value?.local === 'CICERS_PREVIOUS_DATAQUERY_MODE');
  const cicersSuccessBypassesCicers = cicersSuccessGuard?.if?.global === 'CICERS_AUTO_ACTIVATION_BYPASS' && cicersSuccessGuard.eq === 'YES' && (cicersSuccessGuard.then || []).some((command) => command.call_macro === 'restore data query selection after CICERS failure');
  expectRegression(cicersSuccessKeepsCicers && cicersSuccessBypassesCicers && !cicersSuccess.includes('CICERS_PREVIOUS_ENDPOINT'), 'a valid CICERS key must preserve the saved provider, activate CICERS only when bypass is NO, and restore the saved choice when bypass is YES');
  const cicersBypassSetting = settingsDispatch.find((row) => row.buttonbar?.[0]?.text === '(P)BYPASS CICERS OSM AUTO ACTIVATION');
  const cicersBypassButtons = cicersBypassSetting?.buttonbar || [];
  const cicersBypassYes = cicersBypassButtons.find((button) => button.title === 'YES');
  const cicersBypassNo = cicersBypassButtons.find((button) => button.title === 'NO');
  expectRegression(globals.CICERS_AUTO_ACTIVATION_BYPASS === 'NO' && ensure.includes('CICERS_AUTO_ACTIVATION_BYPASS') && cicersBypassYes?.select_condition?.require?.global === 'CICERS_AUTO_ACTIVATION_BYPASS' && cicersBypassYes.select_condition.eq === 'YES' && cicersBypassNo?.select_condition?.require?.global === 'CICERS_AUTO_ACTIVATION_BYPASS' && cicersBypassNo.select_condition.eq === 'NO', 'CICERS auto activation bypass must default to NO and provide persistent YES/NO Settings controls');
  expectRegression(ensure.includes('"call_macro":"CICERS PING"'), 'CICERS key validation must run at every startup');
  const profileMacros = ['ensure aircraft profile defaults', 'sync aircraft profile runtime', 'apply aircraft factory profile', 'save custom aircraft profile', 'load custom aircraft profile'];
  expectRegression(profileMacros.every((name) => !compact(mission.macros[name] || []).includes('DATAQUERYSERVICE')), 'aircraft profiles must not overwrite the independent endpoint selection');

  // Cross-task CARLS DF behavior is enforced by tools/validate-df-release.js.

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
function checkRelease100TestTracker() {
  const expectedTests = [
    {
      "id": "ambulance_spawn",
      "label": "TEST AMBULANCE: CHECK IT SPAWNS AT THE SCENE AND ARRIVES",
      "macro": "Ambulance1"
    },
    {
      "id": "ambulance_secondary",
      "label": "TEST SECOND AMBULANCE: WITH 2 OR 3 PATIENTS, CHECK IT HELPS ANOTHER PATIENT",
      "macro": "ambulance2 secondary rescue"
    },
    {
      "id": "vehicle_drive_recovery",
      "label": "TEST EMERGENCY VEHICLES: CHECK THEY DRIVE AND STOP CORRECTLY",
      "macro": "drive ambulance1 safe"
    },
    {
      "id": "ambulance_handover",
      "label": "TEST AMBULANCE CARE: CHECK ASSESSMENT STARTS BEFORE HELICOPTER CREW ARRIVES",
      "macro": "ambulance clinical handover"
    },
    {
      "id": "dispatch_lifecycle",
      "label": "TEST END OF MISSION: COMPLETE HANDOVER AND CHECK RETURN TO BASE",
      "macro": "dispatch cancellation evaluation"
    },
    {
      "id": "dispatch_progress",
      "label": "TEST DISPATCH: FLY TO THE SCENE AND CHECK MISSION PROGRESSES",
      "macro": "on-site operations progress monitor"
    },
    {
      "id": "residential_routes",
      "label": "TEST ROAD SCENE: CHECK THE MAP POINT AND ROUTE REACH THE SCENE",
      "macro": "random residential road nodes launcher"
    },
    {
      "id": "scene_assets",
      "label": "TEST SCENE: CHECK PEOPLE AND OBJECTS APPEAR AT THE SCENE",
      "macro": "select unique public title"
    },
    {
      "id": "manual_patient",
      "label": "TEST MANUAL CARE: SELECT TREATMENT AND TRANSPORT FOR THE PATIENT",
      "macro": "manual current patient treatment choice"
    },
    {
      "id": "multipatient",
      "label": "TEST MULTIPLE PATIENTS: CHECK CARE AND TRANSPORT ORDER",
      "macro": "initialize multipatient clinical state"
    },
    {
      "id": "patient_physiology",
      "label": "TEST PATIENT CARE: CHECK VITAL SIGNS AND TREATMENT UPDATE",
      "macro": "update patient1 physiology"
    },
    {
      "id": "cpr_mcpr",
      "label": "TEST RESUSCITATION: CHECK PATIENT RESPONSE TO CPR",
      "macro": "CPR"
    },
    {
      "id": "clinical_report",
      "label": "TEST PATIENT REPORT: CHECK REPORT IS READY BEFORE TRANSFER",
      "macro": "rescuetrack patient status summary"
    },
    {
      "id": "pathology_fallback",
      "label": "TEST PATIENT DETAILS: CHECK SAFE TEXT WHEN INFORMATION IS MISSING",
      "macro": "ensure pathology1 fallback"
    },
    {
      "id": "preflight",
      "label": "TEST PRE-FLIGHT: COMPLETE CHECKS AND START THE MISSION",
      "macro": "beforetockl"
    },
    {
      "id": "three_crew_helirescuer",
      "label": "TEST RESCUER PICKUP: 3 CREW, CHECK RESCUER BOARDS",
      "macro": "3 crew SKID LDG"
    },
    {
      "id": "hoist_control",
      "label": "TEST WINCH: CHECK CONTROLS AND SAFE HEIGHT DURING HOIST",
      "macro": "HOISTING"
    },
    {
      "id": "crew_health",
      "label": "TEST CREW HEALTH: WITH CREW HEALTH ACTIVE, CHECK THE CREW ON SCENE",
      "macro": "apply crew lifescore impact"
    },
    {
      "id": "crew_emergency",
      "label": "TEST INJURED CREW: CHECK HOSPITAL ROUTE AND MISSION ENDS",
      "macro": "crew emergency response"
    },
    {
      "id": "helirescuer_drop",
      "label": "TEST RESCUER DROP: 3 CREW, CHECK RESCUER LEAVES AND RETURNS",
      "macro": "drop heli rescuer"
    },
    {
      "id": "ground_ops",
      "label": "TEST GROUND CREW: CHECK STRETCHER, WALKING AND CARGO DOORS",
      "macro": "ground ops"
    },
    {
      "id": "manual_marshal",
      "label": "TEST MANUAL MARSHAL: START IT FROM TECHNICAL PAGE AND CHECK GUIDANCE",
      "macro": "create technical marshall front"
    },
    {
      "id": "marshal_guidance",
      "label": "TEST LANDING GUIDANCE: CHECK MARSHAL GUIDES ARRIVAL AND DEPARTURE",
      "macro": "activate marshall guidance"
    },
    {
      "id": "base_marshal_reload",
      "label": "TEST BASE GUIDANCE: RESTART THE FLIGHT AND CHECK LANDING GUIDANCE",
      "macro": "restore reloaded base marshall"
    },
    {
      "id": "route_guidance",
      "label": "TEST HOSPITAL ROUTE: AFTER BOARDING, CHECK THE ROUTE CHANGES TO HOSPITAL",
      "macro": "routeupdate"
    },
    {
      "id": "carls_df",
      "label": "TEST RADIO BEACON: TUNE IT AND CHECK THE DIRECTION INDICATION",
      "macro": "CARLS DF open"
    },
    {
      "id": "df_stations",
      "label": "TEST RADIO BEACON SETTINGS: SAVE A STATION, REOPEN IT, CHECK IT REMAINS",
      "macro": "DF stations save"
    },
    {
      "id": "emergency_df",
      "label": "TEST EMERGENCY BEACON: MOVE NEAR AND FAR, CHECK SIGNAL APPEARS AND CLEARS",
      "macro": "DF emergency beacon update"
    },
    {
      "id": "orange_smoke",
      "label": "TEST ORANGE SMOKE: TRY AUTO, ALWAYS, REALISTIC AND DISABLED",
      "macro": "create orange smoke marker"
    },
    {
      "id": "tablet_5g",
      "label": "TEST TABLET CONNECTION: CHECK MESSAGES AND CONNECTION STATUS",
      "macro": "Mission dispatch"
    },
    {
      "id": "cicers_endpoint",
      "label": "TEST ONLINE MAP DATA: CHECK THE SELECTED OSM SERVICE CONNECTS",
      "macro": "CICERS PING"
    },
    {
      "id": "failure_engine",
      "label": "TEST STARTUP FAILURE: SELECT A FAILURE AND CHECK IT APPEARS",
      "macro": "failure engine"
    },
    {
      "id": "aircraft_profiles",
      "label": "TEST AIRCRAFT PROFILES: SELECT CUSTOM PRST 1; SETTINGS/MEDICAL OPTIONS: SWITCH AUTOMATIC OR MANUAL; REOPEN CUSTOM PRST 1",
      "begin_macro": "settings",
      "complete_macro": "select custom aircraft profile"
    },
    {
      "id": "mission_presets",
      "label": "TEST MISSION LIST: CHANGE A MISSION, REOPEN THE LIST, CHECK IT IS SAVED",
      "macro": "toggle mission preset category"
    },
    {
      "id": "settings_layout",
      "label": "TEST SETTINGS PAGE: OPEN EACH SECTION AND CHECK ITS OPTIONS",
      "macro": "settings"
    },
    {
      "id": "destination_preload_fpl8",
      "label": "TEST HOSPITAL CHOICE: WITH 3, 4 AND 5 CREW, CHOOSE DESTINATION BEFORE LOADING",
      "begin_macro": "objective7 HEMS",
      "complete_macro": "User predestination"
    }
  ];
  const requiredMacros = ['test tracker begin', 'test tracker complete', 'test tracker reset', 'test tracker record successful', 'test tracker request failed comment', 'test tracker record failed', 'test tracker page'];
  requiredMacros.forEach((name) => expectRegression(Array.isArray(mission.macros[name]), 'test tracker macro must exist: ' + name));
  const trackerPageCommands = mission.macros['test tracker page'] || [];
  const page = compact(trackerPageCommands);
  const trackerRows = trackerPageCommands.find((command) => Array.isArray(command.set_dispatch))?.set_dispatch || [];
  const trackerRenderer = compact(trackerRows);
  ['RELEASE 0.997 TEST TRACKER', 'IN PROGRESS', 'SUCCESSFUL', 'FAILED', 'test_tracker_failure_comment', 'Debug_Table'].forEach((token) => {
    expectRegression(page.includes(token), 'test tracker page must expose ' + token);
  });
  expectRegression(!page.includes('test_tracker_section') && !trackerRenderer.includes('\"table\":{\"static\":\"Debug_Table\"}'), 'Test Tracker renderer must use one preloaded local state per test, not direct table conditions');
  const trackerTerminalRows = trackerRows.filter((row) => typeof row.text === 'string' && row.text.endsWith(' FAILED: {0}'));
  const trackerResetRows = trackerRows.filter((row) => Array.isArray(row.buttonbar) && row.buttonbar.some((button) => button.title === 'RESET'));
  expectRegression(trackerTerminalRows.length === expectedTests.length && trackerTerminalRows.every((row) => trackerRows[trackerRows.indexOf(row) + 1]?.buttonbar?.[0]?.title === 'RESET' && trackerRows[trackerRows.indexOf(row) + 2]?.text === ' '), 'Test Tracker must include one RESET and one blank separator after each test item');
  const completedActionBars = trackerRows.filter((row) => row.show_condition?.require?.local?.startsWith('test_tracker_state_') && row.show_condition.eq === 'COMPLETED' && Array.isArray(row.buttonbar));
  expectRegression(completedActionBars.length === expectedTests.length && completedActionBars.every((row) => ['SUCCESSFUL', 'FAILED', 'RESET'].every((title) => row.buttonbar.some((button) => button.title === title))), 'each completed test must place SUCCESSFUL, FAILED, and RESET on one action row');
  expectRegression(trackerResetRows.length === expectedTests.length * 2 && trackerResetRows.every((row) => compact(row).includes('test tracker reset')), 'each test item must expose RESET at result selection and after a recorded result');
  expectRegression(trackerResetRows.filter((row) => !row.show_condition?.require?.local).every((row) => compact(row.show_condition).includes('"ne":"PENDING"') && compact(row.show_condition).includes('"ne":"COMPLETED"')), 'post-result RESET must remain hidden while SUCCESSFUL and FAILED are offered');
  const debugPage = compact(mission.macros['debug page'] || []);
  expectRegression(debugPage.includes('OPEN TEST TRACKER') && debugPage.includes('test tracker page'), 'Debug Center must link to the Test Tracker');
  const begin = compact(mission.macros['test tracker begin'] || []);
  const complete = compact(mission.macros['test tracker complete'] || []);
  const successful = compact(mission.macros['test tracker record successful'] || []);
  const failed = compact(mission.macros['test tracker record failed'] || []);
  const reset = compact(mission.macros['test tracker reset'] || []);
  expectRegression(reset.includes('PENDING') && reset.includes('test_{0}_comment') && reset.includes('save_table'), 'RESET must restore not-tested state and clear its saved failed comment');
  expectRegression(begin.includes('test_{0}_state') && begin.includes('IN PROGRESS') && begin.includes('save_table'), 'first execution must persist IN PROGRESS');
  expectRegression(complete.includes('IN PROGRESS') && complete.includes('COMPLETED') && complete.includes('save_table'), 'sequence completion must persist COMPLETED');
  expectRegression(successful.includes('SUCCESSFUL') && successful.includes('save_table'), 'successful test result must persist');
  expectRegression(failed.includes('FAILED') && failed.includes('test_{0}_comment') && failed.includes('save_table'), 'failed test result and comment must persist');
  expectRegression(complete.includes('test_{0}_option_{1}') && complete.includes('test_tracker_missing_options') && complete.includes('"param":"option"'), 'multi-option tests must remain IN PROGRESS until every required option has been recorded');
  const orangeMissing = trackerRows.filter((row) => typeof row.text === 'string' && row.text.startsWith('STILL TO TEST:') && compact(row).includes('test_tracker_state_orange_smoke'));
  const destinationMissing = trackerRows.filter((row) => typeof row.text === 'string' && row.text.startsWith('STILL TO TEST:') && compact(row).includes('test_tracker_state_destination_preload_fpl8'));
  expectRegression(orangeMissing.length === 4 && destinationMissing.length === 3 && reset.includes('test_{0}_option_{1}'), 'Orange Smoke and hospital choice must list every remaining required condition and clear it on RESET');
  expectRegression(!page.includes('custom_sar_handoff') && !compact(mission.macros['msn preset loading'] || []).includes('custom_sar_handoff'), 'mission preset loading must never create a false Custom SAR test result');
  expectRegression(debugPage.includes('MISSION ID {0}-{1}-{2}') && debugPage.includes('CREW {0} | PATIENT TRANSPORT') && debugPage.includes('E:LOCAL YEAR') && debugPage.includes('SNAPSHOT DATE') && debugPage.includes('MISSION TIMER AT SNAPSHOT: {0}h {1}m'), 'Summary and snapshot must expose mission identity, crew, transport, date, time, and an hours-and-minutes mission timer');
  const customMarshal = compact(mission.macros['create technical marshall custom'] || []);
  expectRegression(customMarshal.includes('"create_location":"technical_marshall"') && customMarshal.indexOf('"create_location":"technical_marshall"') < customMarshal.indexOf('"set_user_poi":"technical_marshall"'), 'custom marshal map must be centered on the helicopter before it opens');
  expectedTests.forEach((test) => {
    const stateRows = trackerRows.filter((row) => typeof row.text === 'string' && row.show_condition?.require?.local === 'test_tracker_state_' + test.id);
    const states = ['PENDING', 'IN PROGRESS', 'COMPLETED', 'SUCCESSFUL', 'FAILED'];
    const expectedText = test.id === 'aircraft_profiles' ? {
      'PENDING': test.label,
      'IN PROGRESS': 'TEST AIRCRAFT PROFILES: SWITCH MODE, THEN REOPEN THE SAME CUSTOM PRESET - IN PROGRESS',
      'COMPLETED': 'TEST AIRCRAFT PROFILES: SAME MODE RESTORED - READY: SELECT RESULT',
      'SUCCESSFUL': 'TEST AIRCRAFT PROFILES: SAME MODE RESTORED - SUCCESSFUL',
      'FAILED': 'TEST AIRCRAFT PROFILES: MODE NOT RESTORED - FAILED: {0}'
    } : {
      'PENDING': test.label,
      'IN PROGRESS': test.label + ' - IN PROGRESS',
      'COMPLETED': test.label + ' - READY: SELECT RESULT',
      'SUCCESSFUL': test.label + ' - SUCCESSFUL',
      'FAILED': test.label + ' - FAILED: {0}'
    };
    expectRegression(stateRows.length === states.length && states.every((state) => stateRows.filter((row) => row.show_condition?.eq === state && row.text === expectedText[state]).length === 1), 'test tracker page must render one clear human-readable current-state row for ' + test.id);
    const beginMacro = test.begin_macro || test.macro;
    const completeMacro = test.complete_macro || test.macro;
    const begun = compact(mission.macros[beginMacro] || []);
    const completed = compact(mission.macros[completeMacro] || []);
    expectRegression(begun.includes('test tracker begin') && begun.includes('"test_id":"' + test.id + '"') && completed.includes('test tracker complete') && completed.includes('"test_id":"' + test.id + '"'), 'test tracker must monitor ' + beginMacro + ' and ' + completeMacro + ' for ' + test.id);
  });
}

checkRootShape();
Object.entries(mission.macros).forEach(([name, commands]) => {
  if (!Array.isArray(commands)) errors.push(`macro must be a command array: ${name}`);
});
checkBeforeTakeoffLayout();
checkTopLevelRendererCommands(mission, 'primary');
checkTopLevelRendererCommands(companionMission, 'companion');
walk(mission);
scanLogical(mission, '$');
checkCompanionMission();
checkDynamicEltCoverage();
checkDebugSummaryLayout();
checkRuntimeStateInitialization();
checkRelease91Regressions();
checkAircraftProfileRegression();
checkRelease94Regressions();
checkRelease100TestTracker();
const dfReleaseGate = validateDfRelease(mission, changelog);
errors.push(...dfReleaseGate.errors);
regressionChecks += dfReleaseGate.checks;

const tabletDiagnostics = JSON.stringify(mission.macros['multipatient registry diagnostics'] || []);
for (const key of ['tablet_policy', 'tablet_reports', 'tablet_report_archive', 'tablet_enabled', 'tablet_visits']) {
  expectRegression(tabletDiagnostics.includes('"' + key + '"'), 'Patient tablet closure must expose ' + key + ' in Debug snapshots');
}
expectRegression(mission.macros['patient health']?.[0]?.call_macro === 'multipatient registry tablet refresh',
  'Patient medical page must check completed-visit/ground-handover policy before rendering vitals');

const marshalWaypointRows = [...(mission.data['hospitals wps'] || []), ...(mission.data['hangar wps'] || [])];
expectRegression(marshalWaypointRows.length > 0 && marshalWaypointRows.every((row) => (row.marshal_present === 'no' && row.WPMarshalLAT === null && row.WPMarshalLON === null) || (row.marshal_present === 'yes' && Number.isFinite(row.WPMarshalLAT) && Number.isFinite(row.WPMarshalLON))),
  'Every hospital and hangar waypoint must declare a complete disabled or coordinate-backed local marshal override');
const hospitalWaypointResolver = compact(mission.macros['user hospital WP'] || []);
const hangarWaypointResolver = compact(mission.macros['user hangar WP'] || []);
expectRegression(hospitalWaypointResolver.includes('hospital_marshal_present') && hospitalWaypointResolver.includes('hospital_marshal_location') && hospitalWaypointResolver.includes('hospital_wp_ready'),
  'Hospital waypoint resolution must expose its local marshal override, coordinates, and completion state');
expectRegression(hangarWaypointResolver.includes('hangar_marshal_present') && hangarWaypointResolver.includes('hangar_marshal_location') && hangarWaypointResolver.includes('hangar_wp_match'),
  'Hangar waypoint resolution must expose its local marshal override and coordinates');
const baseMarshal = compact(mission.macros['create base marshall'] || []);
const hospitalMarshal = compact(mission.macros['create hospital marshall'] || []);
expectRegression(baseMarshal.includes('hangar_marshal_location') && baseMarshal.includes('hangar_marshal_present') && baseMarshal.includes('"to":"$USER"'),
  'A custom base marshal must spawn at its waypoint coordinates and face the helicopter');
expectRegression(hospitalMarshal.includes('hospital_marshal_location') && hospitalMarshal.includes('hospital_marshal_present') && hospitalMarshal.includes('"to":"$USER"') && hospitalMarshal.includes('hospital_marshall_wind_bearing') && hospitalMarshal.includes('"gt":150'),
  'A destination marshal must keep generic wind alignment only outside the 150m no-movement radius while custom coordinates stay fixed');
for (const macroName of ['User destination1', 'Ambulance destination1', 'midway patient load1', 'transfer patient load1']) {
  const branch = compact(mission.macros[macroName] || []);
  expectRegression(branch.includes('PILOT_FO_OFF') && branch.includes('$TITLE Crew') && branch.includes('Airbus H145 ADAC Crew') && branch.includes('"VAR1":16') && branch.includes('"var":"VAR 1"},"value":14') && !branch.includes('$TITLE Pilot') && !branch.includes('Airbus H145 ADAC Pilot'),
    'Three-crew destination deboarding must use documented Crew VAR 1 pilot states in ' + macroName);
}

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
  topLevelRendererChecks,
  macroArrays: macroNames.size,
}, null, 2));
