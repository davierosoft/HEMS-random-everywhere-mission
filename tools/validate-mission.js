#!/usr/bin/env node

/* Blocking static checks for HEMS Random Everywhere Mission releases. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const missionPath = path.resolve(process.env.HEMS_MISSION_FILE || path.join(root, 'everywhere_all.json'));
const mission = JSON.parse(fs.readFileSync(missionPath, 'utf8'));
const companionMission = JSON.parse(fs.readFileSync(path.join(root, 'train.json'), 'utf8'));
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
let hemsSpeedMonitorCandidates = 0;

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

function checkHemsDriveSpeed(value, trail) {
  const drive = value && value.drive_object;
  if (!drive || typeof drive !== 'object' || Array.isArray(drive)) return;
  if (!['hoist_crew', 'pax3', 'hpax1'].includes(drive.name)) return;
  if (typeof drive.speed !== 'number') return;

  const polarCandidates = (waypoint) => {
    if (Array.isArray(waypoint)) return waypoint.flatMap(polarCandidates);
    if (!waypoint || typeof waypoint !== 'object') return [];
    if (Array.isArray(waypoint.closest)) return waypoint.closest.flatMap(polarCandidates);
    const bearing = typeof waypoint.bearing2 === 'number'
      ? waypoint.bearing2
      : typeof waypoint.bearing === 'number' ? waypoint.bearing : null;
    if (bearing === null || typeof waypoint.dist !== 'number' || waypoint.dist < 0) return [];
    const radians = bearing * Math.PI / 180;
    return [{ x: waypoint.dist * Math.sin(radians), y: waypoint.dist * Math.cos(radians) }];
  };
  const waypointSets = Array.isArray(drive.to) ? drive.to.map(polarCandidates) : [];
  if (waypointSets.length < 2 || waypointSets.some((set) => set.length === 0)) return;

  let minimumRoute = Infinity;
  const visit = (index, previous, distance) => {
    if (index === waypointSets.length) {
      minimumRoute = Math.min(minimumRoute, distance);
      return;
    }
    waypointSets[index].forEach((point) => {
      const segment = previous
        ? Math.hypot(point.x - previous.x, point.y - previous.y)
        : 0;
      visit(index + 1, point, distance + segment);
    });
  };
  visit(0, null, 0);
  if (!Number.isFinite(minimumRoute) || minimumRoute <= 0) return;

  const ratio = drive.speed / minimumRoute;
  if (ratio > 1.5) hemsSpeedMonitorCandidates += 1;
  if (ratio > 2.5 + 1e-9) {
    errors.push(`HEMS drive speed ${drive.speed} exceeds 2.5x minimum geometric route ${minimumRoute.toFixed(3)} at ${trail}`);
  }
}

function checkRootShape() {
  const requiredRootKeys = ['title', 'id', 'author', 'start_info', 'macros', 'aircraft', 'applicable', 'api_version', 'data', 'threads', 'locations', 'objects', 'userActions', 'objectives', 'briefing', 'icons'];
  requiredRootKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(mission, key)) errors.push(`missing required root key: ${key}`);
  });
  if (!mission.data || typeof mission.data !== 'object' || Array.isArray(mission.data)) errors.push('root data must be an object');
  if (mission.data?.Debug_Table !== 'R&E_debug_manual_snapshots' || mission.data?.Debug_Auto_Table !== 'R&E_debug_automatic_snapshots') errors.push('debug snapshot tables must remain under root data');
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

  checkHemsDriveSpeed(value, trail);

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
      if (key === 'show_condition' && value.slider && JSON.stringify(value[key]).includes('"or"')) {
        errors.push(`slider show_condition cannot contain or at ${trail}`);
      }
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

function hasGlobalValue(macroName, globalName, expectedValue) {
  let found = false;
  const scan = (value) => {
    if (found || !value || typeof value !== 'object') return;
    if (Array.isArray(value)) return value.forEach(scan);
    if (value.set?.global === globalName && JSON.stringify(value.value) === JSON.stringify(expectedValue)) found = true;
    Object.values(value).forEach(scan);
  };
  scan(mission.macros[macroName] || []);
  return found;
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

function manualSnapshotCommands() {
  const buttons = collect(mission.macros['debug page'] || [], item => item.title === 'CAPTURE SNAPSHOT');
  const call = buttons[0]?.commands?.[0];
  expectRegression(buttons.length === 1 && call?.call_macro === 'capture diagnostic snapshot' && call.params?.snapshot_table?.static === 'Debug_Table', 'manual snapshot must call the shared capture with the manual table');
  const commands = mission.macros['capture diagnostic snapshot'] || [];
  // Resolve only the explicitly bound table parameter, preserving all other checks.
  return JSON.parse(JSON.stringify(commands), (key, value) => value?.param === 'snapshot_table' && Object.keys(value).length === 1 ? {static: 'Debug_Table'} : value);
}

function checkCompleteDebugSnapshot(debugPage) {
  const sections = ["COMMON", "SUMMARY", "MISSION", "MEDICAL", "GROUND", "GUIDANCE", "INVENTORY", "LOCATIONS", "PATIENTS", "SCENE", "FLOW"];
  const dispatch = (debugPage || []).find((command) => Array.isArray(command.set_dispatch))?.set_dispatch || [];
  const capture = manualSnapshotCommands();
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
    const structKeys = captured?.value?.create_struct || {};
    const flatSnapshotPrefix = "local:debug_snapshot_";
    const missing = Object.keys(expected).filter((key) => {
      if (key.startsWith(flatSnapshotPrefix)) return !tableSet(key.slice(flatSnapshotPrefix.length));
      return !Object.prototype.hasOwnProperty.call(structKeys, key);
    });
    expectRegression(missing.length === 0, "debug snapshot " + section + " omits " + missing.join(", "));
  });
}

function checkHemsMovementSnapshotGuard() {
  const capture = compact(mission.macros['capture diagnostic snapshot'] || []);
  const movementCapture = compact(mission.macros['capture crew movement snapshot'] || []);
  const diagnosticsStart = compact(mission.macros['start location diagnostics'] || []);
  expectRegression(
    capture.includes('"call_macro":"capture crew movement snapshot"') && movementCapture.includes('"key":"crew_movement_log"') && movementCapture.includes('"local":"crew_movement_log"'),
    'Crew movement snapshot must persist the passive movement log',
  );
  expectRegression(
    diagnosticsStart.includes('"local":"crew_movement_log"') && diagnosticsStart.includes('"create_array":0'),
    'Snapshot locals must be initialized before any JSON copy',
  );
  expectRegression(
    movementCapture.includes('"local":"crew_movement_log"') && movementCapture.includes('"create_array":0'),
    'Crew movement JSON copy must guard an uninitialized local',
  );
  expectRegression(
    !movementCapture.includes('"location":"{param:') && !movementCapture.includes('"object":"{param:'),
    'Crew movement snapshot must pass actor and target as HPG parameter expressions, never interpolated strings',
  );
}

function checkNationQueryOwnership() {
  const lifecycle = compact(mission.macros['mission startup'] || []);
  expectRegression(!lifecycle.includes('"local":"accident_nation"},"value":{"global":"NATION_OTHERS"'), 'accident nation must not inherit numeric NATION_OTHERS');
  expectRegression(!lifecycle.includes('"local":"hospital_nation"},"value":{"global":"NATION_OTHERS"'), 'hospital nation must not inherit numeric NATION_OTHERS');
  const queryContracts = [
    ['Query accident location country', 'accident_nation'],
    ['Query hospital user country', 'hospital_nation'],
    ['Query userA country', 'userA_nation'],
  ];
  queryContracts.forEach(([macroName, localName]) => {
    const query = compact(mission.macros[macroName] || []);
    expectRegression(query.includes('"query_country"'), `${macroName} must execute query_country`);
    const directParamCapture = query.includes(`"local":"${localName}"},"value":{"param":"$COUNTRY"}`);
    const derivedFromRawCapture = query.includes(`"local":"${localName}_raw"},"value":null`) &&
      query.includes(`"local":"${localName}"},"value":{"local":"${localName}_raw"}}`);
    expectRegression(
      directParamCapture || derivedFromRawCapture,
      `${macroName} must read the query_country result via a $COUNTRY parameter or an equivalent raw-capture local`,
    );
    expectRegression(
      !query.includes(`"local":"${localName}"},"value":"$COUNTRY"`),
      `${macroName} must not treat $COUNTRY as a literal set value`,
    );
    const clearsStaleState = query.includes(`"local":"${localName}"},"value":null`) || query.includes(`"local":"${localName}_raw"},"value":null`);
    expectRegression(
      clearsStaleState &&
        query.includes(`"local":"${localName}_query_done"},"value":0`) &&
        query.includes(`"local":"${localName}_query_done"},"value":1`),
      `${macroName} must clear stale country state and publish query completion`,
    );
  });
  const missionText = compact(mission);
  expectRegression(
    (missionText.split('"local":"accident_nation"},"value":"fallback"').length - 1) === 1 &&
      (missionText.split('"local":"hospital_nation"},"value":"fallback"').length - 1) === 1,
    'country fallback values must be initialized only once at mission startup',
  );
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
  expectRegression(rows.some((row) => /^CREW HEALTH \| /.test(String(row.text || '')) && section(row).includes('"MEDICAL"')), 'crew health diagnostics must be in Medical');
  const dateCapture = (key, variable) => collect(manualSnapshotCommands(), (command) => command.set?.table?.static === 'Debug_Table' && command.set.key === key && JSON.stringify(command.value) === JSON.stringify({ var: [variable, 'number'] }));
  expectRegression(dateCapture('date_year', 'E:LOCAL YEAR').length === 1 && dateCapture('date_month', 'E:LOCAL MONTH OF YEAR').length === 1 && dateCapture('date_day', 'E:LOCAL DAY OF MONTH').length === 1, 'snapshot date must use simulator local year, month, and day');
}

function checkRuntimeStateInitialization() {
  const objective1 = mission.macros.objective1 || [];
  const selector = mission.macros["select unique public title"] || [];
  const handover = mission.macros["ambulance clinical handover"] || [];
  const dfUpdate = mission.macros["DF emergency beacon update"] || [];
  const plbPersonal = mission.macros["ELT plb_person"] || [];
  const profileStore = mission.macros["store aircraft profile on file"] || [];
  const findSet = (commands, name) => commands.findIndex((command) => command.set?.local === name);
  const findSetValue = (commands, name, value) => commands.findIndex((command) => command.set?.local === name && JSON.stringify(command.value) === JSON.stringify(value));
  const findVarSetValue = (commands, name, value) => commands.findIndex((command) => command.set?.var?.[0] === name && JSON.stringify(command.value) === JSON.stringify(value));

  const releaseBuild = Number(/\d+\.\d+\s+(\d+)(?:\.\d+)?\s*$/.exec(mission.title || '')?.[1]);
  expectRegression(Number.isInteger(releaseBuild), 'mission title must end in a numeric build');
  expectRegression(findVarSetValue(objective1, 'L:RELEASE_BUILD', releaseBuild) >= 0, 'objective1 must initialize L:RELEASE_BUILD from the mission title build');

  [["PUBLIC_USED_TITLES", []], ["PUBLIC_SELECTOR_LOCK", 0], ["CARLS_DF_SAR_PLB_PERSON_ACTIVE", "no"], ["DF_EMERGENCY_RX_RANGE_M", 0]].forEach(([name, value]) => {
    expectRegression(findSetValue(objective1, name, value) >= 0, "objective1 must initialize " + name);
  });

  const usedTitlesGuard = selector.findIndex((command) => command.if?.local === "PUBLIC_USED_TITLES" && command.eq === null);
  const lockGuard = selector.findIndex((command) => command.if?.local === "PUBLIC_SELECTOR_LOCK" && command.eq === null);
  const lockWait = selector.findIndex((command) => command.wait_for?.local === "PUBLIC_SELECTOR_LOCK");
  const lockRelease = selector.findIndex((command) => command.set?.local === "PUBLIC_SELECTOR_LOCK" && command.value === 0);
  const resultReturn = selector.findIndex((command) => command.return?.param === "unique_public_candidate");
  expectRegression(usedTitlesGuard >= 0 && lockGuard >= 0 && lockWait > lockGuard, "public-title selector must initialize its array and lock before waiting");
  expectRegression(lockRelease > lockWait && resultReturn > lockRelease, "public-title selector must release lock before return");

  const liveReserve = mission.macros['multipatient registry live reserve'] || [];
  const barrierIndex = liveReserve.findIndex(command => command.call_macro === 'multipatient registry crew barrier');
  const reserveIndex = liveReserve.findIndex(command => command.call_macro === 'multipatient registry reserve');
  expectRegression(barrierIndex >= 0 && reserveIndex > barrierIndex, 'live assignment must check the physical tour barrier before reserving');
  expectRegression(!compact(mission.macros['multipatient registry crew barrier']).includes('L:RESCUED'), 'rescue flags cannot substitute for completed physical visits');
  const rangeSet = findSet(dfUpdate, "DF_EMERGENCY_RX_RANGE_M");
  const rangeUse = dfUpdate.findIndex((command, index) => index > rangeSet && compact(command).includes("DF_EMERGENCY_RX_RANGE_M"));
  expectRegression(rangeSet >= 0 && rangeUse > rangeSet, "DF emergency update must calculate its receive range before use");
  expectRegression(findSetValue(plbPersonal, "CARLS_DF_SAR_PLB_PERSON_ACTIVE", "yes") >= 0, "ELT plb_person must set its active state before starting its thread");
  ["AIRCRAFT_PROFILE_STORE_ACTIVE", "AIRCRAFT_PROFILE_STORE_SLOT", "AIRCRAFT_PROFILE_STORE_DISPLAY_NAME"].forEach((name, index) => {
    expectRegression(findSet(profileStore, name) === index, "profile-store temporary " + name + " must be assigned before it is used");
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
    const patientSelectors = collect(medicalPage, (item) => Array.isArray(item.buttonbar) && item.buttonbar.map((button) => button.title).join(',').replace(/,Deceased$/, '') === 'Patient 1,Patient 2,Patient 3');
    expectRegression(patientSelectors.length >= 2, 'Medical page must expose Patient 1/2/3 selectors in both live and closed views');
    patientSelectors.forEach((selector) => {
      expectRegression(!selector.show_condition, 'patient selector must remain available outside manual-treatment mode');
      selector.buttonbar.filter((button) => button.title !== 'Deceased').forEach((button, index) => {
        expectRegression(compact(button.commands || []).includes('select medical patient page'), `patient selector Patient ${index + 1} must select the requested clinical record`);
      });
      selector.buttonbar.filter((button) => button.title === 'Deceased').forEach((button) => {
        expectRegression(compact(button.commands || []).includes('deceased scene page') && compact(button.show_condition || {}).includes('randomdeadmsg'), 'the Deceased tab must open the deceased page and appear only when a deceased is reported');
      });
    });
  }

  const selectedPatient = mission.macros['select medical patient page'];
  const selectedPatientText = compact(selectedPatient || []);
  expectRegression(selectedPatientText.includes('"medical_display_patient"') && selectedPatientText.includes('"param":"patient"') && selectedPatientText.includes('sync medical patient display'), 'patient selector must retain the requested patient and refresh that clinical record');
  expectRegression(!selectedPatientText.includes('crewvisiting'), 'manual patient selection must not be overwritten by an active HEMS visit');
  const visitGate = compact(mission.macros['crew physical HEMS assessment'] || []);
  expectRegression(visitGate.includes('"local":"medical_display_patient"') && visitGate.includes('sync medical patient display') && !Object.hasOwn(mission.macros, 'patient clinical visit gate'), 'an HEMS clinical visit must automatically focus its patient record (crew physical HEMS assessment; the unused clinical visit gate is removed)');

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
  expectRegression(continuationPositions.length === 0, 'legacy handover must not start competing treatment or assignment workers');
  expectRegression(compact(mission.macros['multipatient registry live ground dispatch']).includes('multipatient registry live ground load'), 'ambulance dispatch must use the ticket-bound shared loader');
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

  // Ambulance shelter (replaces the pre-visit load): the patient travels on the stretcher, never dragged or destroyed; only the hidden identity anchor is repositioned.
  const shelter = compact(mission.macros['ambulance shelter patient'] || []);
  expectRegression(shelter.includes('"object":"ambustretcher7","var":"VAR 2"},"value":3'), 'shelter must show the casualty on the ambulance stretcher');
  const shelterMacros = ['ambulance shelter patient', 'ambulance shelter release', 'ambulance shelter abort'].map((name) => compact(mission.macros[name] || [])).join('');
  expectRegression(!shelterMacros.includes('"destroy_object":"injured_human"'), 'shelter must not destroy the casualty');
  const anchorDrives = [];
  const findAnchorDrives = (node) => { if (Array.isArray(node)) node.forEach(findAnchorDrives); else if (node && typeof node === 'object') { if (node.drive_object?.name === 'injured_human') anchorDrives.push(node.drive_object); Object.values(node).forEach(findAnchorDrives); } };
  ['ambulance shelter patient', 'ambulance shelter release'].forEach((name) => findAnchorDrives(mission.macros[name] || []));
  expectRegression(anchorDrives.length === 2 && anchorDrives.every((drive) => drive.VAR1 === -1), 'the casualty object is driven only hidden (VAR1 -1), never visibly dragged');
  expectRegression(!shelter.includes('"move_object"') && shelter.includes('"drive_object":{"name":"injured_human"') && shelter.includes('"VAR1":-1'), 'shelter drives the hidden identity anchor (VAR1 -1) along the stretcher way, so the drive decides its final heading; it is never moved with move_object');
  expectRegression(mission.macros['ambulance previsit load'] === undefined && mission.macros['ambulance previsit monitor'] === undefined && mission.macros['multipatient registry live shelter commit'] === undefined, 'the legacy pre-visit load and shelter commit (they destroyed the identity anchor) must stay removed');
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
      expectRegression(compact(macro).includes('"call_macro":"multipatient registry crew tour"') || compact(macro).includes('"call_macro":"multipatient registry crew tour safe"'), `${name} must use the shared physical visit tour`);
      const eligibility = mission.macros['multipatient registry crew eligibility'] || [];
      for (const slot of [1, 2, 3]) {
        expectRegression(hasState(eligibility, `P${slot}_GROUND_TRANSPORTED`) && hasState(eligibility, `P${slot}_GROUND_PROVIDER`), `${name} shared tour must exclude assigned/transported patient ${slot}`);
      }
    }
  });

  const ambulanceHandover = compact(mission.macros['ambulance clinical handover'] || []);
  const sceneAssessmentMacros = ['ambustretcher full', 'ambustretcher close', 'ambustretcher far'].map((name) => compact(mission.macros[name] || []));
  const countMatches = (value, needle) => value.split(needle).length - 1;
  expectRegression(!ambulanceHandover.includes('"distance:m"') && !ambulanceHandover.includes('ambumedic7'), 'ambulance handover must wait for direct assessment completion, not a medic distance');
  expectRegression((countMatches(sceneAssessmentMacros[0], '"call_macro":"multipatient registry crew tour"') + countMatches(sceneAssessmentMacros[0], '"call_macro":"multipatient registry crew tour safe"')) === 1, 'ambulance1 must perform one shared physical visit tour');
  expectRegression(compact(mission.macros['ambulance2 secondary rescue'] || []).includes('"call_macro":"multipatient registry crew tour"') || compact(mission.macros['ambulance2 secondary rescue'] || []).includes('"call_macro":"multipatient registry crew tour safe"'), 'ambulance2 must perform the same physical visit tour');
  expectRegression(sceneAssessmentMacros.every(macro => !macro.includes('"call_macro":"ambulance assess patient"')), 'legacy transfer choreography must not restart clinical assessment outside the visit coordinator');
  const tour = mission.macros['multipatient registry crew tour'] || [];
  const tourVisits = collect(tour, (command) => command.call_macro === 'multipatient registry crew visit').map((command) => command.params?.patient);
  for (const slot of [1, 2, 3]) expectRegression(tourVisits.includes(slot), `shared tour must visit patient ${slot}`);
  const visit = mission.macros['multipatient registry crew visit'] || [];
  const visitText = compact(visit);
  const movementIndex = visitText.indexOf('"call_macro":"multipatient registry crew move"');
  const acquireIndex = visitText.indexOf('"call_macro":"multipatient registry crew acquire"');
  const assessmentIndex = visitText.indexOf('"call_macro":"ambulance assess patient"');
  expectRegression(movementIndex >= 0 && acquireIndex >= 0 && assessmentIndex > movementIndex && assessmentIndex > acquireIndex, 'physical movement and ownership check must precede assessment');
  const postStretcherWalkPrefix = '"drive_object":{"name":"hoist_crew","to":[{"bearing":185,"dist":1.5}],"VAR1":3,"speed":';
  const postStretcherWalk = `${postStretcherWalkPrefix}4}`;
  const postStretcherStanding = postStretcherWalk.replace('"VAR1":3', '"VAR1":1');
  // The original medic never walked slower than 3 km/h on the ground; the walk must also not crawl.
  const postStretcherWalkOk = (name) => {
    const text = compact(mission.macros[name] || []);
    const speeds = [...text.matchAll(new RegExp(`${postStretcherWalkPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([0-9.]+)\\}`, 'g'))].map((match) => Number(match[1]));
    return speeds.length === 1 && speeds[0] >= 3;
  };
  // Crew walking speed limits belong to a whole drive and only to a very short one (under 2 m, never above 3 km/h);
  // a longer route runs at walking speed, so a crew walk below 3 is accepted only as a single short offset approach.
  const crewWalkNames = new Set(['hoist_crew', 'hpax1', 'hpax2', 'pax3']);
  // Accepted: one offset point under 2 m from an object, or the original first step off the helicopter (one helicopter-relative point within 3 m).
  const shortOffsetOnly = (to) => Array.isArray(to) && to.length === 1 && to[0] && typeof to[0] === 'object'
    && ((typeof to[0].object === 'string' && to[0].dist < 2) || (to[0].object === undefined && to[0].bearing !== undefined && to[0].dist <= 3));
  const slowCrewDrives = [];
  for (const [macroName, commands] of Object.entries(mission.macros)) {
    for (const drive of collect(commands, (item) => item.drive_object && crewWalkNames.has(item.drive_object.name) && [3, 16].includes(item.drive_object.VAR1)).map((item) => item.drive_object)) {
      if (typeof drive.speed === 'number' && drive.speed < 3 && !shortOffsetOnly(drive.to)) slowCrewDrives.push(`${macroName}:${drive.name}@${drive.speed}`);
    }
  }
  expectRegression(slowCrewDrives.length === 0, `crew walk slower than 3 km/h on a route that is not a whole very short drive (under 2 m): ${slowCrewDrives.slice(0, 6).join(', ')}`);
  const backUpText = compact(mission.macros['Hoisting back up'] || []);
  const hookIndex = backUpText.indexOf('"H:{local:HXX}_SDK_HOIST_OBJ_STRETCHER_ON"');
  expectRegression(hookIndex >= 0 && ['injured_human', 'injured_human2', 'injured_human3'].every((name) => backUpText.indexOf(`"destroy_object":"${name}"`, hookIndex) > hookIndex), 'the ground casualty must be destroyed when it is hooked, not left beside the hook');
  const preparePatient = compact(mission.macros['multipatient registry live prepare patient'] || []);
  expectRegression(!preparePatient.includes('"ne":"hems"'), 'the HEMS resource must pack the casualty (ready-for-transport) like every other resource');
  expectRegression(postStretcherWalkOk('3 crew ground ops'), '3 crew post-stretcher return must walk before cargo doors close');
  expectRegression(postStretcherWalkOk('4 or 5 crew ground ops'), '4/5 crew post-stretcher return must walk before cargo doors close');
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
  expectRegression(mission.data?.Debug_Table === 'R&E_debug_manual_snapshots' && mission.data?.Debug_Auto_Table === 'R&E_debug_automatic_snapshots', 'debug snapshots must use persistent HPG tables');
  expectRegression(debugText.includes('"open_table":{"static":"Debug_Table"}') && debugText.includes('"save_table":{"static":"Debug_Table"}'), 'debug snapshot table must be opened and saved');
  ['valid', 'time', 'mission_id', 'phase', 'route_error', 'query_error', 'transport', 'transfer_state', 'active_patient', 'display_patient', 'preset'].forEach((key) => {
    expectRegression(debugText.includes('"key":"' + key + '"'), 'debug snapshot table must persist ' + key);
  });
  expectRegression(debugText.includes('LIVE MISSION SUMMARY'), 'debug page must provide a consolidated live summary');
  expectRegression(debugText.includes('COMPLETE LOCAL INVENTORY') && debugText.includes('COMPLETE LVAR INVENTORY'), 'debug Inventory view must retain both complete inventories');
checkCompleteDebugSnapshot(debugPage);
checkHemsMovementSnapshotGuard();
checkNationQueryOwnership();
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
  expectRegression(!hasState(mission, 'DIFFICULTY'), 'mission must not retain legacy Difficulty state');

  const expectedTables = {
    Aircraft_Profile_Links: 'R&E_aircraft_profile_links',
    Aircraft_Profile_Table0: 'R&E_custom_settings_default',
    Aircraft_Profile_Table1: 'R&E_custom_settings_prst_1',
    Aircraft_Profile_Table2: 'R&E_custom_settings_prst_2',
    Aircraft_Profile_Table3: 'R&E_custom_settings_prst_3',
    Aircraft_Profile_Table4: 'R&E_custom_settings_prst_4',
    Aircraft_Profile_Table5: 'R&E_custom_settings_prst_5',
    Aircraft_Profile_Saved_Preset: 'R&E_saved_custom_settings'
  };
  Object.entries(expectedTables).forEach(([name, table]) => {
    expectRegression(mission.data[name] === table, `aircraft profile table must be registered: ${name}`);
  });

  const firstRun = {
    AIRCRAFT_PROFILE_ACTIVE: 'DEFAULT', AIRCRAFT_PROFILE_SLOT: 'Aircraft_Profile_Table0',
    ENGINE_FAILURES_ENABLED: 'yes', ORANGE_TARGET_SMOKE: 'auto', TARGET_GUIDANCE_RANGE: 'wide',
    HOIST_SAFETY_MONITOR: 'yes', HOIST_CONTROL_PROFILE: 'auto', AUTO_FPL_NAV_SOURCE: 'yes',
    TELEPORT_ASSIST_ENABLED: 'yes', ambu_force: 100, poli_force: 100, fire_force: 100,
    PERF_SAMPLING: 'fast', PERF_ALTITUDE_GATE: 'yes', PERF_LOG_LEVEL: 'advanced', KIT_WEIGHTS: 'no', LIFE_FREEZE_NEAR: 'no'
  };
  Object.entries(firstRun).forEach(([key, value]) => {
    const owner = key === 'AIRCRAFT_PROFILE_ACTIVE' || key === 'AIRCRAFT_PROFILE_SLOT' ? 'ensure aircraft profile defaults' : 'aircraft factory DEFAULT';
    expectRegression(hasGlobalValue(owner, key, value), `first-run DEFAULT profile must set ${key}=${value} through set: global`);
  });

  const profilePage = mission.macros['aircraft profiles page'] || [];
  const profileText = compact(profilePage);
  ['CUS.PROFILE 0', 'CUS.PROFILE 1', 'CUS.PROFILE 5', 'SAVE ACTUAL CONFIG TO FILE', 'COPY SAVED CONFIG IN SELECTED PROFILE', 'MSN LIST DFLT', 'MSN LIST 5'].forEach((token) => {
    expectRegression(profileText.includes(token), `aircraft profile page must expose ${token}`);
  });
  ['SAVE CUSTOM', 'RELOAD CUSTOM', 'UNLINK', 'LINK DEFAULT', 'LINK PRST'].forEach((token) => {
    expectRegression(!profileText.includes(token), `aircraft profile page must not retain obsolete control ${token}`);
  });
  expectRegression(!profileText.includes('"static":{"global"'), 'aircraft profile page must not use unsupported static global table references');
  const profileDispatches = profilePage.filter((command) => Array.isArray(command.set_dispatch));
  expectRegression(profileDispatches.length === 1, 'aircraft profile page must render through exactly one set_dispatch command');
  expectRegression(profilePage.every((command) => !['image', 'title', 'link', 'text', 'buttonbar'].some((key) => Object.prototype.hasOwnProperty.call(command, key))), 'aircraft profile page must not execute renderer items as commands (HPG NotFound regression)');
  expectRegression(compact(profileDispatches[0] || {}).includes('CUS.PROFILE 0') && compact(profileDispatches[0] || {}).includes('MSN LIST 5'), 'aircraft profile set_dispatch must contain the complete profile UI');
  expectRegression(callsInOrder(profilePage).includes('ensure aircraft profile defaults') && callsInOrder(profilePage).includes('refresh aircraft profile page state'), 'aircraft profile page must initialize defaults and its current custom table before rendering');
  const profileLinkButtons = collect(profileDispatches, (item) => typeof item.title === 'string' && /^MSN LIST (?:DFLT|[1-5])$/.test(item.title));
  expectRegression(profileLinkButtons.length === 6 && profileLinkButtons.every((item) => compact(item.disabled_condition || {}).includes('AIRCRAFT_PROFILE_ACTIVE') && compact(item.disabled_condition || {}).includes('CUSTOM')), 'MSN LIST link buttons must be disabled outside a CUSTOM settings profile');
  const copyButtonRow = collect(profileDispatches, (item) => Array.isArray(item.buttonbar) && item.buttonbar.some((button) => button.title === 'COPY SAVED CONFIG IN SELECTED PROFILE'))[0];
  expectRegression(Boolean(copyButtonRow) && compact(copyButtonRow.show_condition || {}).includes('AIRCRAFT_PROFILE_ACTIVE') && compact(copyButtonRow.show_condition || {}).includes('CUSTOM') && compact(copyButtonRow).includes('AIRCRAFT_PROFILE_SAVED_PRESET_VALID'), 'saved preset copy must be available only for CUSTOM profiles and only after a stored file exists');

  const profileSettingsLink = collect(mission.macros.settings || [], (item) => item.buttonbar?.some((button) => button.title === 'USER SETTINGS PROFILES'));
  expectRegression(profileSettingsLink.length === 1 && callsInOrder(profileSettingsLink[0].buttonbar?.[0]?.commands || []).includes('aircraft profiles page'), 'Settings profile button must call the profile page');
  const settingsDispatchForLayout = (mission.macros.settings || []).find((command) => Array.isArray(command.set_dispatch))?.set_dispatch || [];
  const flightAssistIndex = settingsDispatchForLayout.findIndex((item) => item.link === '+ FLIGHT ASSISTS');
  expectRegression(flightAssistIndex > 0 && settingsDispatchForLayout[flightAssistIndex - 1]?.image === 'bar', 'Settings must separate Most Used Settings from Flight Assist with a bar');

  const settingsText = compact(mission.macros.settings || []);
  ['FLIGHT ASSISTS', 'Helicopter failures', 'Orange smoke marker', 'Target Position window on tablet', 'Crew health simulation', 'Winch control mode', 'GTN(TDS) NAV SOURCE', 'Teleport assist'].forEach((token) => {
    expectRegression(settingsText.includes(token), `Settings must expose individual flight-assist option: ${token}`);
  });
  for (const monitorName of ['record crew acceleration maxima', 'monitor crew fire exposure', 'recover crew lifescore over time', 'crash monitor loop']) {
    expectRegression(compact(mission.macros[monitorName] || []).includes('"wait_for":{"global":"HOIST_SAFETY_MONITOR"},"eq":"yes"'), `${monitorName} must wait while the crew health simulation is off`);
  }
  // Factory values of the PERFORMANCE options: ROOKIE PILOT samples light, the other profiles fast, altitude gate ON everywhere, log ADVANCED everywhere.
  const perfFactory = { DEFAULT: ['fast', 'yes'], 'ROOKIE PILOT': ['light', 'yes'], 'EXPERT PILOT': ['fast', 'yes'], 'EXPERT HEMS': ['fast', 'yes'] };
  for (const [profileName, [sampling, gate]] of Object.entries(perfFactory)) {
    const factoryText = compact(mission.macros[`aircraft factory ${profileName}`] || []);
    expectRegression(factoryText.includes(`"set":{"global":"PERF_SAMPLING"},"value":"${sampling}"`) && factoryText.includes(`"set":{"global":"PERF_ALTITUDE_GATE"},"value":"${gate}"`) && factoryText.includes('"set":{"global":"PERF_LOG_LEVEL"},"value":"advanced"'), `factory profile ${profileName} must set PERF_SAMPLING=${sampling}, PERF_ALTITUDE_GATE=${gate}, PERF_LOG_LEVEL=advanced`);
  }
  // Factory values of LIFE_FREEZE_NEAR: on for the profiles with a long dispatch range (ROOKIE PILOT, EXPERT PILOT 60 km, EXPERT HEMS 50 km), off for DEFAULT (35 km)
  for (const [profileName, value] of Object.entries({ DEFAULT: 'no', 'ROOKIE PILOT': 'yes', 'EXPERT PILOT': 'yes', 'EXPERT HEMS': 'yes' })) {
    expectRegression(compact(mission.macros[`aircraft factory ${profileName}`] || []).includes(`"set":{"global":"LIFE_FREEZE_NEAR"},"value":"${value}"`), `factory profile ${profileName} must set LIFE_FREEZE_NEAR=${value}`);
  }
  // PERFORMANCE section: three persistent options, each description names the lightest choice, defaults reach every profile layer
  const settingsDispatchItems = (mission.macros.settings || []).find((command) => Array.isArray(command.set_dispatch))?.set_dispatch || [];
  const performanceLink = settingsDispatchItems.findIndex((item) => item.link === '+ PERFORMANCE');
  expectRegression(performanceLink > 0 && settingsDispatchItems[performanceLink - 1]?.image === 'bar' && settingsDispatchItems.some((item) => item.link === '- PERFORMANCE'), 'Settings must expose a collapsible PERFORMANCE section separated by a bar');
  const performanceItems = settingsDispatchItems.slice(performanceLink, performanceLink + 10);
  const performanceText = compact(performanceItems);
  ['Impact monitor sampling', 'Impact monitor altitude gate', 'Log level', 'PERF_SAMPLING', 'PERF_ALTITUDE_GATE', 'PERF_LOG_LEVEL'].forEach((token) => {
    expectRegression(performanceText.includes(token), `PERFORMANCE section must expose ${token}`);
  });
  expectRegression((performanceText.match(/is the lightest for performance/g) || []).length === 3, 'each PERFORMANCE option must say which choice is the lightest for performance');
  expectRegression(/^[\x20-\x7e]*$/.test(performanceText), 'PERFORMANCE texts must be ASCII only');
  for (const [key, values] of [['PERF_SAMPLING', ['fast', 'balanced', 'light']], ['PERF_ALTITUDE_GATE', ['yes', 'no']], ['PERF_LOG_LEVEL', ['advanced', 'basic']]]) {
    for (const value of values) expectRegression(performanceText.includes(`"set":{"global":"${key}"},"value":"${value}"`), `PERFORMANCE section must offer ${key}=${value}`);
    for (const macroName of ['aircraft factory DEFAULT', 'aircraft factory ROOKIE PILOT', 'aircraft factory EXPERT PILOT', 'aircraft factory EXPERT HEMS']) {
      expectRegression(compact(mission.macros[macroName] || []).includes(`"set":{"global":"${key}"}`), `${macroName} must set ${key}`);
    }
    expectRegression(compact(mission.macros.resetdefault || []).includes(`"set":{"global":"${key}"},"value":null`), `resetdefault must clear ${key}`);
    expectRegression(compact(mission.macros.objective1 || []).includes(`"if":{"global":"${key}"},"eq":null`), `objective1 must default ${key}`);
  }
  const linked = compact(mission.macros['apply linked aircraft profile'] || []);
  ['Config_Table0', 'Config_Table1', 'Config_Table2', 'Config_Table3', 'Config_Table4', 'Config_Table5'].forEach((table) => {
    expectRegression(linked.includes(table), `linked aircraft profile must resolve ${table}`);
  });
  expectRegression(!linked.includes('"key":{"local":"MSN_CONFIG_PRESET"}'), 'linked aircraft profile must use explicit supported mission-table keys');
  expectRegression(callsInOrder(mission.macros['switch mission preset'] || []).includes('apply linked aircraft profile'), 'mission preset switch must load its linked aircraft profile');
  expectRegression(callsInOrder(mission.macros['load current mission preset'] || []).includes('apply linked aircraft profile'), 'current mission preset reload must load its linked aircraft profile');
  expectRegression(callsInOrder(mission.macros.objective1 || []).includes('apply linked aircraft profile'), 'livery-driven mission preset selection must load its linked aircraft profile');
  const linkToggle = compact(mission.macros['link aircraft profile to mission'] || []);
  expectRegression(linkToggle.includes('Aircraft_Profile_Links') && linkToggle.includes('"value":null') && linkToggle.includes('save_table'), 'selected MSN LIST link must toggle off and persist the link table');
  const immediateSave = compact(mission.macros['mark aircraft profile custom'] || []);
  expectRegression(immediateSave.includes('Aircraft_Profile_Table0') && immediateSave.includes('save custom aircraft profile'), 'profile changes must immediately persist to a custom slot');

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
    'AUTO_FPL_NAV_SOURCE', 'TELEPORT_ASSIST_ENABLED', 'PERF_SAMPLING', 'PERF_ALTITUDE_GATE', 'PERF_LOG_LEVEL', 'KIT_WEIGHTS', 'LIFE_FREEZE_NEAR', 'CREW_CHATTER'
  ]);
  const savedProfileKeys = new Set(collect(mission.macros['save custom aircraft profile'] || [], (item) => item.set?.table && typeof item.set.key === 'string').map((item) => item.set.key));
  const loadedProfileKeys = new Set(collect(mission.macros['load custom aircraft profile'] || [], (item) => item.table && typeof item.key === 'string').map((item) => item.key));
  expectRegression([...savedProfileKeys].filter((key) => key !== 'saved_at').every((key) => loadedProfileKeys.has(key)), 'every saved aircraft-profile setting must be reloadable');
  expectRegression([...loadedProfileKeys].every((key) => savedProfileKeys.has(key)), 'aircraft-profile loading must not request unsaved setting keys');
  expectRegression(compact(mission.macros['link aircraft profile to mission'] || []).includes('save_table') && compact(mission.macros['link aircraft profile to mission'] || []).includes('Aircraft_Profile_Links'), 'link aircraft profile to mission must persist the reciprocal link table (it also removes the link when the selected MSN LIST is pressed again)');
  expectRegression(!Object.hasOwn(mission.macros, 'unlink aircraft profile'), 'the unused unlink aircraft profile macro is removed: the link macro already toggles and clears the other links of the profile');

  const marksCustom = (commands) => Array.isArray(commands) && commands.some((command) => command.call_macro === 'mark aircraft profile custom');
  const directSettings = collect(mission.macros.settings || [], (item) => Array.isArray(item.commands) && item.commands.some((command) => command.set && profileKeys.has(command.set.global)));
  expectRegression(directSettings.length > 0 && directSettings.every((item) => marksCustom(item.commands)), 'every direct Settings profile change must mark CUSTOM');
  const profileSliders = collect(mission.macros.settings || [], (item) => item.slider && profileKeys.has(item.slider.global));
  expectRegression(profileSliders.length > 0 && profileSliders.every((item) => marksCustom(item.slider.commands)), 'every Settings slider in a profile must mark CUSTOM');
  const vehiclePages = [mission.macros.variant_selection || [], mission.macros['HEMS mission_type'] || []];
  const vehicleControls = vehiclePages.flatMap((page) => collect(page, (item) => Array.isArray(item.commands) && item.commands.some((command) => command.set && ['ambu_force', 'poli_force', 'fire_force'].includes(command.set.global))));
  expectRegression(vehicleControls.length >= 24 && vehicleControls.every((item) => marksCustom(item.commands)), 'all Custom Mission vehicle preferences must mark CUSTOM');
  const customIndicators = collect(profilePage, (item) => typeof item.title === 'string' && /^(CUS\.PROFILE |MSN LIST )/.test(item.title));
  expectRegression(customIndicators.length === 12 && customIndicators.every((item) => compact(item.select_condition).includes('AIRCRAFT_PROFILE_ACTIVE')), 'only CUSTOM state may select a saved slot or its MSN LIST link');
}
function checkRelease94Regressions() {
  const allText = compact(mission);
  const endpointLvar = 'L:{local:HXX}_PERSIST_MISSION_ENDPOINT_OPTION';
  ['normalize orange target smoke setting', 'create orange smoke marker', 'evaluate realistic orange smoke scene', 'arm realistic orange smoke', 'initialize crew lifescores for shift', 'apply crew lifescore impact', 'refresh crew lifescore report', 'start crew lifescore monitor', 'hoist cable casualty', 'start hoist out risk monitor'].forEach((name) => {
    expectRegression(Array.isArray(mission.macros[name]), `release 94 macro must exist: ${name}`);
  });
  const smokeControls = collect(mission.macros.settings || [], (item) => Array.isArray(item.buttonbar) && item.buttonbar.some((button) => button.title === 'NEVER'));
  expectRegression(smokeControls.length === 1 && compact(smokeControls[0]).includes('AUTO') && compact(smokeControls[0]).includes('REALISTIC') && compact(smokeControls[0]).includes('ALWAYS'), 'orange smoke settings must expose NEVER/AUTO/REALISTIC/ALWAYS');
  expectRegression(hasGlobalValue('normalize orange target smoke setting', 'ORANGE_TARGET_SMOKE', 'auto'), 'first-run orange smoke setting must be AUTO');
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
  const cicersFailureAutoFallback = (cicersFailureGuard?.else || []).some((command) => command.set?.global === 'DATAQUERYSERVICE' && command.value === 10) && (cicersFailureGuard?.else || []).some((command) => command.call_macro === 'DATAQUERYSERVICERANDOM');
  expectRegression(cicersFailureManualModes === '0,1,2,4' && cicersFailureManualRestore && cicersFailureAutoFallback && !compact(cicersFailure).includes('CICERS_PREVIOUS_ENDPOINT'), 'CICERS failure must restore active manual provider 0/1/2/4 even when the persisted endpoint is stale, otherwise fall back to AUTO-TOGGLE');
  expectRegression(!ping.includes('DATAQUERYSERVICERANDOM'), 'CICERS ping must route expired keys through the same previous-provider fallback');
  const cicersSuccessGuard = (mission.macros['restore data query selection after CICERS success'] || [])[0];
  const cicersSuccessKeepsCicers = (cicersSuccessGuard?.else || []).some((command) => command.set?.var?.[0] === endpointLvar && command.value === 3) && (cicersSuccessGuard?.else || []).some((command) => command.set?.global === 'DATAQUERYSERVICE' && command.value?.local === 'CICERS_PREVIOUS_DATAQUERY_MODE');
  const cicersSuccessBypassesCicers = cicersSuccessGuard?.if?.global === 'CICERS_AUTO_ACTIVATION_BYPASS' && cicersSuccessGuard.eq === 'YES' && (cicersSuccessGuard.then || []).some((command) => command.call_macro === 'restore data query selection after CICERS failure');
  expectRegression(cicersSuccessKeepsCicers && cicersSuccessBypassesCicers && !cicersSuccess.includes('CICERS_PREVIOUS_ENDPOINT'), 'a valid CICERS key must preserve the saved provider, activate CICERS only when bypass is NO, and restore the saved choice when bypass is YES');
  const cicersBypassSetting = settingsDispatch.find((row) => row.buttonbar?.[0]?.text === '(P)BYPASS CICERS OSM AUTO ACTIVATION');
  const cicersBypassButtons = cicersBypassSetting?.buttonbar || [];
  const cicersBypassYes = cicersBypassButtons.find((button) => button.title === 'YES');
  const cicersBypassNo = cicersBypassButtons.find((button) => button.title === 'NO');
  expectRegression(hasGlobalValue('ensure data query service selection', 'CICERS_AUTO_ACTIVATION_BYPASS', 'NO') && ensure.includes('CICERS_AUTO_ACTIVATION_BYPASS') && cicersBypassYes?.select_condition?.require?.global === 'CICERS_AUTO_ACTIVATION_BYPASS' && cicersBypassYes.select_condition.eq === 'YES' && cicersBypassNo?.select_condition?.require?.global === 'CICERS_AUTO_ACTIVATION_BYPASS' && cicersBypassNo.select_condition.eq === 'NO', 'CICERS auto activation bypass must default to NO and provide persistent YES/NO Settings controls');
  expectRegression(ensure.includes('"call_macro":"CICERS PING"'), 'CICERS key validation must run at every startup');
  const profileMacros = ['ensure aircraft profile defaults', 'sync aircraft profile runtime', 'apply aircraft factory profile', 'save custom aircraft profile', 'load custom aircraft profile'];
  expectRegression(profileMacros.every((name) => !compact(mission.macros[name] || []).includes('DATAQUERYSERVICE')), 'aircraft profiles must not overwrite the independent endpoint selection');

  // Cross-task CARLS DF behavior is enforced by tools/validate-df-release.js.

  const crewEmergencyMacros = [
    'post crew safety message', 'apply crew lifescore impact', 'apply object crew lifescore impact',
    'apply hoist crew lifescore impact', 'replace deceased crew object', 'board crew after emergency',
    'crew emergency route to care', 'crew emergency response', 'crew casualty destination scene', 'crew casualty load member', 'crew casualty pilot walk', 'crew casualty plan', 'crew casualty scene vehicles',
    'crew emergency choice', 'crew emergency continue', 'crew emergency divert', 'crew emergency destination menu', 'crew emergency ambulance prime', 'crew emergency return to base', 'crew hospital arrival', 'crew hospital finish', 'crew hospital unload', 'crew hospital police watch', 'crew hospital ambulance call', 'crew base scene need',
    'crew hospital unload 1', 'crew hospital unload 2', 'crew hospital unload 3', 'crew hospital unload 4', 'crew hospital deliver walk 1', 'crew hospital deliver ambulance 1'
  ];
  crewEmergencyMacros.forEach((name) => expectRegression(Array.isArray(mission.macros[name]), `crew emergency macro must exist: ${name}`));
  const crewImpact = compact(mission.macros['apply crew lifescore impact'] || []);
  expectRegression(crewImpact.includes('"param":"member"') && crewImpact.includes('"local":"CREW_LIFESCORE_CURRENT"'), 'crew impact must target one explicit member and evaluate the resulting score');
  const crewMonitor = compact(mission.macros['start crew lifescore monitor'] || []);
  const crewRecorder = compact(mission.macros['record crew acceleration maxima'] || []);
  const crewFireExposure = compact(mission.macros['monitor crew fire exposure'] || []);
  const crewMonitorAndRecorder = `${crewMonitor}${crewRecorder}${crewFireExposure}`;
  expectRegression(crewMonitorAndRecorder.includes('"object":"pax3","var":"distance:m","to":"VFXA"') && crewMonitorAndRecorder.includes('"object":"hoist_crew","var":"distance:m","to":"VFXA"'), 'scene exposure must use each ground operator distance to the active hazard');
  expectRegression(crewMonitorAndRecorder.includes('"object":"pax3","member":2') && compact(mission.macros['apply hoist crew lifescore impact'] || []).includes('"local":"hoist_member"') && !compact(mission.macros['apply hoist crew lifescore impact'] || []).includes('CREW_LIFESCORE_3'), 'crew role mapping must keep the medic (member 2) as the hoisted crew member, helirescuers as members 4/5, and never the copilot (member 3)');
  expectRegression(!crewMonitorAndRecorder.includes('"object":"VFXA","var":"distance:m"'), 'scene exposure must never use helicopter-to-smoke distance as crew exposure');
  const crewPost = compact(mission.macros['post crew safety message'] || []);
  expectRegression(crewPost.includes('"set_message"') && crewPost.includes('Dispatcher_Messages') && crewPost.includes('UpdateRescueTrack'), 'crew safety alerts must reach tablet, dispatch messages, and RescueTrack');
  const crewEvaluate = compact(mission.macros['apply crew lifescore impact'] || []);
  const crewStateEvent = compact(mission.macros['crew member state event'] || []);
  const crewBatchEvents = compact(mission.macros['crew impact events'] || []);
  expectRegression(crewEvaluate.includes('crew impact events') && crewStateEvent.includes('"lte":10') && crewStateEvent.includes('"lte":0') && crewBatchEvents.includes('crew emergency response') && crewBatchEvents.includes('crew mission terminated'), 'crew emergency response must enforce the LifeScore <=10 threshold through the member state event and the batch events');
  const crewResponse = compact(mission.macros['crew emergency response'] || []);
  expectRegression(crewResponse.includes('"value":"CREW_FATAL"') && crewResponse.includes('"value":"CREW_CRITICAL"') && crewResponse.includes('replace deceased crew object'), 'crew death and critical injury must both fail the mission through the emergency response');
  const fatalReplacement = compact(mission.macros['replace deceased crew object'] || []);
  ['pax3', 'pax1', 'pax2', 'hoist_crew'].forEach((name) => {
    expectRegression(fatalReplacement.includes(`"destroy_object":"${name}"`) && fatalReplacement.includes(`"name":"${name}"`) && fatalReplacement.includes('"static":"deadmen"') && !fatalReplacement.includes('Airbus H145 Medic Stretcher'), `deceased ground object ${name} must be replaced in place with a dead asset under the same name`);
  });
  const operatorLost = compact(mission.macros['hoist cable operator lost'] || []);
  expectRegression(operatorLost.includes('HOIST_OBJ_HUMAN_1_OFF') && operatorLost.includes('HOIST_OBJ_HUMAN_1_BAG_OFF') && operatorLost.includes('"call_macro":"hoist cable fall position"') && operatorLost.includes('"local":"CREW_FATAL_ON_HOOK"') && operatorLost.includes('"call_macro":"apply hoist crew lifescore impact"'), 'a hoist operator lost from the cable must release the cable objects at the fall position or stay on the hook, and then take the fatal LifeScore impact');
  const hoistOutMonitor = compact(mission.macros['start hoist out risk monitor'] || []);
  const hoistAttachedMonitor = compact(mission.macros['start hoist attached risk monitor'] || []);
  expectRegression(hoistOutMonitor.includes('HOIST_GROUND_RATE_FPS') && hoistOutMonitor.includes('hoist_get_distance_from_ground:ft') && !hoistOutMonitor.includes('ACCELERATION BODY'), 'hoist-out monitor must use measured descent rate instead of aircraft acceleration');
  expectRegression(hoistAttachedMonitor.includes('HOIST_IMPACT_RATE_FPS') && hoistAttachedMonitor.includes('hoist_get_distance_from_ground:ft') && !hoistAttachedMonitor.includes('ACCELERATION BODY'), 'attached hoist monitor must use measured descent rate instead of aircraft acceleration');
  const emergencyBoarding = compact(mission.macros['board crew after emergency'] || []);
  ['SDK_PAX_1_ON', 'SDK_PAX_2_ON', 'SDK_PAX_3_ON'].forEach((trigger) => expectRegression(emergencyBoarding.includes(trigger), `emergency boarding must restore ${trigger}`));
  expectRegression(emergencyBoarding.includes('CREW_EMERGENCY_FATAL') && emergencyBoarding.includes('CREW_IMPACT_OBJECT'), 'fatal boarding must leave only the deceased packaged object on scene while boarding survivors');
  const emergencyRoute = compact(mission.macros['crew emergency route to care'] || []);
  expectRegression(emergencyRoute.includes('Query closest hospital') && emergencyRoute.includes('user hospital WP') && emergencyRoute.includes('"local":"FPL_NMBR"') && emergencyRoute.includes('"value":8'), 'critical/fatal crew emergency must route to the nearest hospital');
  expectRegression(emergencyRoute.includes('crew emergency destination menu') && emergencyRoute.includes('CREW_DEST_CONFIRMED') && !emergencyRoute.includes('"call_macro":"return to base"'), 'crew emergency must let the user confirm or change the hospital from the menu, never fall back to base');
  expectRegression(mission.macros['crew emergency hospital admission'] === undefined, 'the unused hospital admission macro (surviving operators walking into the hospital) must stay removed');
  const hospitalUnload = compact(mission.macros['crew hospital unload'] || []) + compact(mission.macros['crew hospital unload 1'] || []) + compact(mission.macros['crew hospital deliver walk 1'] || []);
  expectRegression(hospitalUnload.includes('chs_str_1') && hospitalUnload.includes('hospital_wp3') && hospitalUnload.includes('hospital_door') && !hospitalUnload.includes('crew casualty scene vehicles'), 'the hospital arrival of a crew emergency must unload the critical crew with one stretcher each along the hospital waypoints, without an ambulance and police scene');
  expectRegression(emergencyRoute.includes('manual_hospital_destination_setup') && emergencyRoute.includes('crew hospital arrival') && compact(mission.macros['crew emergency divert'] || []).includes('crew emergency route to care') && compact(mission.macros['crew emergency choice'] || []).includes('Continue mission'), 'a critical crew member lets the user divert or continue, the diversion goes to the hospital with the patient flow when a patient is aboard');
  const baseScene = compact(mission.macros['crew casualty destination scene'] || []) + compact(mission.macros['crew casualty load member'] || []) + compact(mission.macros['crew base scene need'] || []);
  expectRegression(baseScene.includes('crew casualty scene vehicles') && baseScene.includes('ccs_stretcher') && baseScene.includes('CREW_POLICE_LIMIT'), 'the base scene must park the police (and the ambulance for a casualty aboard) and load the stretcher');
  const hoistRisk = compact(mission.macros['start hoist out risk monitor'] || []);
  expectRegression(hoistRisk.includes('apply hoist crew lifescore impact') && !hoistRisk.includes('apply crew lifescore impact'), 'hoist risk must damage only the exposed hoist operator');
  const fatalArrays = [];
  const collectFatalArrays = (value) => {
    if (Array.isArray(value)) {
      if (value.some((command) => command?.call_macro === 'hoist cable casualty' && command.params?.subject === 'both')) fatalArrays.push(value);
      value.forEach(collectFatalArrays);
      return;
    }
    if (value && typeof value === 'object') Object.values(value).forEach(collectFatalArrays);
  };
  collectFatalArrays(mission.macros['Hoisting back up'] || []);
  expectRegression(fatalArrays.length === 3 && fatalArrays.every((commands) => {
    const fatalIndex = commands.findIndex((command) => command?.call_macro === 'hoist cable casualty' && command.params?.subject === 'both');
    const resetIndex = commands.findIndex((command) => command?.set?.local === 'HOIST_OUT' && command?.value === 0);
    return resetIndex < 0 || fatalIndex < resetIndex;
  }), 'all three hoist out fatal branches (speed, bank, load) must call the cable casualty for both people before clearing HOIST_OUT');
  // Hoist cable casualties (docs/architecture/HOIST_CABLE_CASUALTIES.md): the cable flags belong to the callers, the casualty macro decides injury, death and the hook, the stress monitor reads the aircraft.
  // The default landing spot is created once and moved only by the user: no watchdog (it is not in the 0.997 baseline); after an injured_human relocation one call updates it once.
  expectRegression(!Object.hasOwn(mission.macros, 'landing spot watchdog') && !JSON.stringify(mission.macros).includes('landing_spot_watchdog'), 'the landing spot watchdog is removed: nothing may rewrite the landing spot in the background');
  const followMacro = compact(mission.macros['landing spot follow injured'] || []);
  expectRegression(followMacro.includes('"local":"landing_spot_follow"') && followMacro.includes('"local":"customLZ"},"ne":"yes"') && followMacro.includes('"create_location":"landing_spot"') && !/"(while|create_thread|sleep|wait_for)"/.test(followMacro), 'landing spot follow injured must be a one-shot update guarded by landing_spot_follow and customLZ, with no loop, thread or wait');
  expectRegression(compact(mission.macros['shared repeated block 027'] || []).includes('"set":{"local":"landing_spot_follow"},"value":"yes"') && compact(mission.macros.objective1 || []).includes('"set":{"local":"landing_spot_follow"},"value":"no"'), 'only the default landing spot created at the injured follows it: block 027 arms landing_spot_follow, objective1 clears it');
  expectRegression(['ambulance shelter patient', 'ambulance shelter release', 'ambulance shelter abort', 'multipatient registry live recover worker', 'truck vs car', 'BUS stop', 'train'].every((name) => compact(mission.macros[name] || []).includes('"call_macro":"landing spot follow injured"')) && !compact(mission.macros['landing spot selection'] || []).includes('landing spot follow injured'), 'every injured_human relocation after the default spot calls the one-shot update; the user choosing the spot never does');
  const hoistingWait = compact(mission.macros['HOISTING'] || []);
  const ambulanceWorker = compact(mission.macros['ambustretcher full'] || []);
  expectRegression(hoistingWait.includes('"wait_for":{"var":["L:AMBUSTRETCHERFULL","number"]},"eq":0') && hoistingWait.includes('"wait_for":{"var":["L:STEP","number"]},"gt":6'), 'the HEMS wait for the ambulance operations (L:STEP above 6) must also end when the ambulance clears L:AMBUSTRETCHERFULL: an ambulance without a patient never sets that step and HEMS and ambulance wait for each other');
  expectRegression(/"call_macro":"ambulance1 stand down"/.test(ambulanceWorker) && ambulanceWorker.indexOf('"set":{"var":["L:AMBUSTRETCHERFULL","number"]},"value":0') > -1 && ambulanceWorker.indexOf('"set":{"var":["L:AMBUSTRETCHERFULL","number"]},"value":0') < ambulanceWorker.indexOf('"call_macro":"ambulance1 stand down"'), 'the ambulance that stands down (no patient to transport) must clear L:AMBUSTRETCHERFULL before the stand down');
  const cableCasualty = compact(mission.macros['hoist cable casualty'] || []);
  expectRegression(cableCasualty.includes('"global":"HOIST_SAFETY_MONITOR"') && cableCasualty.includes('"local":"HOIST_CABLE_BUSY"') && cableCasualty.includes('"floor":20') && cableCasualty.includes('"call_macro":"hoist cable operator lost"') && cableCasualty.includes('"call_macro":"hoist cable patient lost"') && cableCasualty.includes('"rand":[0,100]'), 'the hoist cable casualty must be gated and locked, leave an injured operator at 20 or more, and draw the hook release and the deaths');
  expectRegression(mission.macros['hoist cable stress monitor'] === undefined && !compact(mission.macros['start hoist attached risk monitor'] || []).includes('ACCELERATION BODY'), 'the temporary hoist has no acceleration model (the operator died in normal hoist operations of the earlier versions): only the ground impact monitor on the measured descent rate and the original hoist out ladders');
  const cableWatch = compact(mission.macros['hoist cable injured watch'] || []);
  expectRegression(cableWatch.includes('"call_macro":"hoist cable release injured"') && cableWatch.includes('"fn":"hoist_get_distance_from_ground:ft"') && cableWatch.includes('"macro":"hoist_cable"'), 'an operator hurt on the way down must be watched until the hook rests on the ground, released, and every step traced');
  expectRegression(compact(mission.macros['hoist cable fall position'] || []).includes('"object":"$USER"') && compact(mission.macros['hoist cable patient lost'] || []).includes('"title":"Airbus H145 Injured Human"') && compact(mission.macros['hoist cable patient lost'] || []).includes('"value":1'), 'a person that the hook lets go appears at the user aircraft, the lost patient is the injured packed in the stretcher');
  const hoistDownFirst = (mission.macros['hoist down'] || []).find((command) => command?.set?.local === 'HOIST_CREW_ON_CABLE');
  expectRegression(hoistDownFirst === undefined || hoistDownFirst.value !== 1, 'hoist down must not put a person on the cable by itself: its callers say it with person 1');
  expectRegression(compact(mission.macros['hoist down'] || []).includes('"param":"person"'), 'hoist down must read the person param');
  expectRegression(compact(mission.macros['apply hoist crew lifescore impact'] || []).includes('"param":"floor"'), 'the hoist impact must accept a LifeScore floor');
  expectRegression(compact(mission.macros['multipatient registry acceleration impact'] || []).includes('"param":"slot"'), 'the registry impact must reach the HEMS patient on the cable by its slot');
  expectRegression(compact(mission.macros['replace deceased crew object'] || []).includes('"local":"CREW_FATAL_ON_HOOK"'), 'a hoist operator that dies on the hook must leave no dead asset on the ground');
  expectRegression(compact(mission.macros.objective1 || []).includes('"call_macro":"hoist cable reset"'), 'every mission must start with a clean cable state');
  const crewReport = compact(mission.macros['refresh crew lifescore report'] || []);
  expectRegression(crewReport.includes('"value":"CRITICAL"') && crewReport.includes('"value":"DECEASED"'), 'crew report must distinguish critical injury from death');
  const endMenuText = compact(mission.macros['end menu'] || []);
  expectRegression(endMenuText.includes('MISSION FAILED - {0} DECEASED.') && endMenuText.includes('ALL CREW MEMBERS') && endMenuText.includes('MISSION FAILED - CREW MEMBER CRITICALLY INJURED'), 'end menu must report both crew emergency failure outcomes');
  expectRegression(endMenuText.includes('"local":"MISSION_FAILED"},"eq":null'), 'successful completion text must be hidden for every failed mission');
  const crewDebugText = compact(mission.macros['debug page'] || []);
  expectRegression(crewDebugText.includes('CREW SAFETY / EMERGENCY') && crewDebugText.includes('CREW_FATAL_OBJECT_REPLACED'), 'debug page must expose crew emergency and packaged-object state');

}
function checkRelease100DebugAndMarshal() {
  // The Release Test Tracker (page, persistent states, begin/complete call sites) and the Multi-patient registry diagnostics page were removed from the Debug Center.
  ['test tracker begin', 'test tracker complete', 'test tracker reset', 'test tracker record successful', 'test tracker request failed comment', 'test tracker record failed', 'test tracker page', 'multipatient registry page', 'multipatient registry compatibility check', 'multipatient registry capture', 'multipatient registry SDK probe'].forEach((name) => expectRegression(mission.macros[name] === undefined, 'obsolete debug macro must stay removed: ' + name));
  expectRegression(!compact(mission).includes('"call_macro":"test tracker'), 'no macro may call the removed Test Tracker');
  const debugPage = compact([mission.macros['debug page'] || [], manualSnapshotCommands()]);
  expectRegression(!debugPage.includes('OPEN TEST TRACKER') && !debugPage.includes('MULTI-PATIENT REGISTRY DIAGNOSTICS'), 'Debug Center must no longer link to the Test Tracker or the registry diagnostics');
  expectRegression(!compact(mission.macros['msn preset loading'] || []).includes('custom_sar_handoff'), 'mission preset loading must never create a false Custom SAR test result');
  expectRegression(debugPage.includes('MISSION ID {0}-{1}-{2}') && debugPage.includes('CREW {0} | PATIENT TRANSPORT') && debugPage.includes('E:LOCAL YEAR') && debugPage.includes('SNAPSHOT DATE') && debugPage.includes('MISSION TIMER AT SNAPSHOT: {0}h {1}m'), 'Summary and snapshot must expose mission identity, crew, transport, date, time, and an hours-and-minutes mission timer');
  // the manual snapshot buttons and its date are at the top of the Debug Center, whatever the section; the details stay in the summary below
  const rows = (mission.macros['debug page'] || []).find((command) => Array.isArray(command.set_dispatch))?.set_dispatch || [];
  const bar = rows.findIndex((row) => row.buttonbar?.[0]?.title === 'CAPTURE SNAPSHOT');
  const summary = rows.findIndex((row) => row.text === 'PERSISTENT DEBUG SNAPSHOT');
  const sections = rows.findIndex((row) => row.text === 'ACTIVE VIEW: {0}');
  expectRegression(bar >= 0 && bar < sections && rows[bar].show_condition === undefined && rows[bar].buttonbar.some((button) => button.title === 'CLEAR SNAPSHOT'), 'Debug Center must offer CAPTURE SNAPSHOT and CLEAR SNAPSHOT above the section buttons, in every section');
  expectRegression(rows[bar + 1]?.text?.startsWith('SNAPSHOT DATE ') && !compact(rows[bar + 1].show_condition).includes('debug_page_section') && rows[bar + 2]?.text === '(scroll down for more info)', 'the snapshot date and time sit under the buttons, followed by the scroll hint');
  expectRegression(summary > sections && rows.filter((row) => row.buttonbar?.[0]?.title === 'CAPTURE SNAPSHOT').length === 1 && rows.filter((row) => typeof row.text === 'string' && row.text.startsWith('SNAPSHOT DATE ')).length === 1, 'the snapshot details stay below, without a second button or date row');
  const customMarshal = compact(mission.macros['create technical marshall custom'] || []);
  expectRegression(customMarshal.includes('"create_location":"technical_marshall"') && customMarshal.indexOf('"create_location":"technical_marshall"') < customMarshal.indexOf('"set_user_poi":"technical_marshall"'), 'custom marshal map must be centered on the helicopter before it opens');
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
checkRelease100DebugAndMarshal();
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
  hemsSpeedMonitorCandidates,
  macroArrays: macroNames.size,
}, null, 2));
