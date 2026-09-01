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
expect(layouts.length === 9, `CARLS DF render must expose 9 mutually-exclusive refresh states (found ${layouts.length})`);
for (const layout of layouts) {
  expect(Array.isArray(layout.LSK) && layout.LSK.length === 3 && layout.LSK.every((label) => typeof label === 'string'), 'CARLS DF LSK must contain three literal labels');
  expect(Array.isArray(layout.RSK) && layout.RSK.length === 3 && layout.RSK.every((label) => typeof label === 'string'), 'CARLS DF RSK must contain three literal labels');
  expect(Array.isArray(layout.Items) && layout.Items.length === 4, 'CARLS DF refresh must replace the complete four-row layout');
  expect((layout.Items || []).every((row) => Array.isArray(row) && row.length === 2), 'CARLS DF rows must be materialized two-column arrays');
  expect(!JSON.stringify(layout).includes('show_condition'), 'CARLS DF refresh must not depend on row-level show_condition evaluation');
  expect(JSON.stringify(layout.Items).includes('CARLS_DF_RENDER_EDIT_TEXT'), 'CARLS DF refresh is missing the resolved edit row');
}

const editorGlobals = ['CARLS_DF_EDITING', 'CARLS_DF_INPUT_INDEX', 'CARLS_DF_ENTRY_FREQUENCY', 'CARLS_DF_VALID', 'CARLS_DF_INPUT_ERROR', 'CARLS_DF_D1', 'CARLS_DF_D2', 'CARLS_DF_D3', 'CARLS_DF_D4', 'CARLS_DF_D5', 'CARLS_DF_D6', 'CARLS_DF_LAST_INPUT_TIME'];
walk({macros, threads: mission.threads || {}}, (item) => {
  if (!Array.isArray(item.var) || typeof item.var[0] !== 'string') return;
  for (const name of editorGlobals) expect(item.var[0] !== `L:${name}`, `DF editor state ${name} must not use an L:Var`);
});

const digit = macros['CARLS DF digit'] || [];
expect(digit[0]?.if?.global === 'CARLS_DF_INPUT_INDEX' && digit[0]?.lte === 6, 'first-digit path must use the shared linear cursor guard');
expect(digit[0]?.then?.[0]?.set?.global === 'CARLS_DF_EDITING' && digit[0]?.then?.[0]?.value === 1, 'first-digit path must enter edit mode in the same event');
for (let position = 1; position <= 6; position += 1) {
  const capture = digit[0]?.then?.find((command) => command.if?.global === 'CARLS_DF_INPUT_INDEX' && command.eq === position);
  expect(capture?.then?.[0]?.set?.global === `CARLS_DF_D${position}` && capture.then[0].value?.param === 'digit', `digit ${position} must be captured from the same-event param`);
}

if (errors.length) {
  console.error(`DF regression gate FAILED (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`DF regression gate PASS (${layouts.length} complete CARLS refresh states)`);
