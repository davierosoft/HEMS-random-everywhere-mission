#!/usr/bin/env node

/* Blocking static checks for HEMS Random Everywhere Mission releases. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mission = JSON.parse(fs.readFileSync(path.join(root, 'everywhere_all.json'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(root, 'global.json'), 'utf8'));

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
  expectRegression(mission.title.includes('0.997 91'), 'mission title must be 0.997 91');

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
}

Object.entries(mission.macros).forEach(([name, commands]) => {
  if (!Array.isArray(commands)) errors.push(`macro must be a command array: ${name}`);
});
checkBeforeTakeoffLayout();
walk(mission);
scanLogical(mission, '$');
checkRelease91Regressions();

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
  macroArrays: macroNames.size,
}, null, 2));
