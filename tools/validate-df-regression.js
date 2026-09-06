'use strict';

const fs = require('fs');
const path = require('path');

const missionPath = process.argv[2] || path.join(__dirname, '..', 'everywhere_all.json');
const mission = JSON.parse(fs.readFileSync(missionPath, 'utf8'));
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const walk = (value, visit) => {
  if (!value || typeof value !== 'object') return;
  visit(value);
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else Object.values(value).forEach((item) => walk(item, visit));
};

const macros = mission.macros || {};
const render = macros['CARLS DF render'] || [];
const layouts = [];
walk(render, (item) => {
  if (Object.prototype.hasOwnProperty.call(item, 'var') && !Array.isArray(item.var)) {
    errors.push('CARLS DF render contains an invalid non-array var query; use a direct global/local/param query');
  }
  if (item.set_carls_radio) layouts.push(item.set_carls_radio);
});

expect(Array.isArray(render), 'CARLS DF render is missing or is not a command list');
expect(layouts.length === 36, `CARLS DF render must expose 36 literal-label refresh states (found ${layouts.length})`);
for (const layout of layouts) {
  expect(Array.isArray(layout.LSK) && layout.LSK.length === 3 && layout.LSK.every((label) => typeof label === 'string'), 'CARLS DF LSK must contain three literal labels');
  expect(Array.isArray(layout.RSK) && layout.RSK.length === 3 && layout.RSK.every((label) => typeof label === 'string'), 'CARLS DF RSK must contain three literal labels');
  expect(Array.isArray(layout.Items) && layout.Items.length === 3, 'CARLS DF refresh must emit exactly three visible CARLS items');
  expect((layout.Items || []).every((row) => Array.isArray(row) && row.length === 2), 'CARLS DF rows must be materialized two-column arrays');
  expect(!JSON.stringify(layout).includes('show_condition'), 'CARLS DF refresh must not depend on row-level show_condition evaluation');
  expect(JSON.stringify(layout.Items?.[1] || []).includes('MHz {2}'), 'CARLS DF frequency and modulation must share the second visible item');
}
expect(layouts.some((layout) => JSON.stringify(layout.Items?.[2] || []).includes('EDT: {0}_#.###')), 'CARLS DF refresh is missing EDT: 1_#.###');
expect(layouts.some((layout) => JSON.stringify(layout.Items?.[2] || []).includes('ILLEGAL')), 'CARLS DF refresh is missing the incremental ILLEGAL row');
expect(layouts.every((layout) => layout.RSK?.[2] !== 'ENT'), 'CARLS DF must keep ESC, never ENT, during editor states');
expect(layouts.filter((layout) => layout.LSK?.[1] === '').length === 18, 'CARLS DF must hide the modulation LSK on every fixed-modulation layout');
expect(layouts.filter((layout) => layout.LSK?.[1] === 'AM' || layout.LSK?.[1] === 'FM').length === 18, 'CARLS DF must expose a literal modulation LSK only for UHF layouts');

const editorGlobals = ['CARLS_DF_EDITING', 'CARLS_DF_INPUT_INDEX', 'CARLS_DF_ENTRY_FREQUENCY', 'CARLS_DF_VALID', 'CARLS_DF_INPUT_ERROR', 'CARLS_DF_D1', 'CARLS_DF_D2', 'CARLS_DF_D3', 'CARLS_DF_D4', 'CARLS_DF_D5', 'CARLS_DF_D6', 'CARLS_DF_LAST_INPUT_TIME'];
walk({macros, threads: mission.threads || {}}, (item) => {
  if (!Array.isArray(item.var) || typeof item.var[0] !== 'string') return;
  for (const name of editorGlobals) expect(item.var[0] !== `L:${name}`, `DF editor state ${name} must not use an L:Var`);
});

const clearBearing = macros['CARLS DF clear bearing'] || [];
const clearBearingSetDf = clearBearing.find((command) => command.set_df)?.set_df;
expect(Boolean(clearBearingSetDf), 'CARLS DF clear bearing must issue set_df');
expect(!Object.prototype.hasOwnProperty.call(clearBearingSetDf || {}, 'location'), 'CARLS DF clear bearing must send frequency-only set_df without a placeholder position');
expect(clearBearingSetDf?.freq?.divide?.[0]?.global === 'CARLS_DF_FREQUENCY' && clearBearingSetDf.freq.divide?.[1] === 1000, 'CARLS DF clear bearing must use the current CARLS frequency');

const startupSync = macros['CARLS DF startup sync'] || [];
const startupSyncText = JSON.stringify(startupSync);
expect(startupSyncText.includes('L:CARLS_DF_FREQUENCY') && startupSyncText.includes('CARLS DF clear bearing'), 'CARLS DF startup sync must restore the persisted frequency and program the DF');
const objective1 = macros.objective1 || [];
const linkedProfileIndex = objective1.findIndex((command) => command.call_macro === 'apply linked aircraft profile');
const lateStartupSyncIndex = objective1.findIndex((command, index) => index > linkedProfileIndex && command.call_macro === 'CARLS DF startup sync');
expect(linkedProfileIndex >= 0 && lateStartupSyncIndex > linkedProfileIndex, 'Objective1 must reapply the DF startup sync after late profile initialization');
expect(objective1[lateStartupSyncIndex - 1]?.sleep === 0.5, 'Objective1 DF retry must occur after the post-profile startup delay');
const dfDebugState = JSON.stringify(macros['DF stations debug state'] || []);
const debugPage = JSON.stringify(macros['debug page'] || []);
expect(dfDebugState.includes('CARLS_DF_FREQUENCY') && dfDebugState.includes('CARLS_DF_SOURCE'), 'DF Debug state must report the active persisted DF channel');
expect(!dfDebugState.includes('\"key\":\"last_frequency\"'), 'DF Debug state must not report an undefined table last_frequency as the active channel');
expect(debugPage.includes('DF STATIONS: {0}/15 | ACTIVE: {1} {2} MHz'), 'DF Debug page must label the active channel, not a stale last station');

const digit = macros['CARLS DF digit'] || [];
const initial = digit[0];
const continued = initial?.else?.find((command) => command.if?.global === 'CARLS_DF_INPUT_INDEX' && command.lte === 6);
expect(initial?.if?.global === 'CARLS_DF_EDITING' && initial?.ne === 1, 'first numeric event must branch on shared editing state');
expect(initial?.then?.some((command) => command.set?.global === 'CARLS_DF_EDITING' && command.value === 1), 'first numeric event must enter edit mode immediately');
expect(initial?.then?.some((command) => command.set?.global === 'CARLS_DF_D1' && command.value?.param === 'digit'), 'digit 1 must be captured from the same-event param');
expect(initial?.then?.some((command) => command.set?.global === 'CARLS_DF_INPUT_INDEX' && command.value === 2), 'first numeric event must advance directly to EDT: 1_#.###');
expect(Boolean(continued), 'subsequent digits must use the shared linear cursor guard');
for (let position = 2; position <= 6; position += 1) {
  const capture = continued?.then?.find((command) => command.if?.global === 'CARLS_DF_INPUT_INDEX' && command.eq === position);
  expect(capture?.then?.[0]?.set?.global === 'CARLS_DF_D' + position && capture.then[0].value?.param === 'digit', 'digit ' + position + ' must be captured from the same-event param');
}

if (errors.length) {
  console.error(`DF regression gate FAILED (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`DF regression gate PASS (${layouts.length} complete CARLS refresh states)`);
