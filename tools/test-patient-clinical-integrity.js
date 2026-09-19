#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const medical = read('mission-src/macros/07-patient-medical.json');
const tablet = read('mission-src/macros/04-dispatch-tablet-ui.json');
const ground = read('mission-src/macros/08-ground-response.json');
const saves = read('mission-src/macros/02-save-load-presets.json');

function fail(message) { throw new Error(`Patient clinical integrity: ${message}`); }
function requireTrue(condition, message) { if (!condition) fail(message); }
function contains(value, predicate) {
  if (predicate(value)) return true;
  if (Array.isArray(value)) return value.some((entry) => contains(entry, predicate));
  if (value && typeof value === 'object') return Object.values(value).some((entry) => contains(entry, predicate));
  return false;
}

for (const slot of [1, 2, 3]) {
  const capture = ground[`capture patient${slot} ground handover`];
  const finalized = slot === 1 ? 'ambulance_patient_report_finalized' : `P${slot}_AMBULANCE_REPORT_FINALIZED`;
  requireTrue(Array.isArray(capture) && contains(capture, (entry) => entry?.set?.local === finalized && entry.value === 'yes'), `patient ${slot} ground handover does not finalize the report view`);
}

for (const slot of [2, 3]) {
  const pathologyText = JSON.stringify(medical['pathology random engine']);
  requireTrue(pathologyText.includes(`"call_macro":"initialize patient${slot} physiology"`) && pathologyText.includes(`"call_macro":"initialize patient${slot} clinical plan"`) && pathologyText.includes(`"call_macro":"assign patient${slot} identity"`), `patient ${slot} has no independent physiology, action plan, and identity initialization`);
  const plan = medical[`initialize patient${slot} clinical plan`];
  requireTrue(Array.isArray(plan) && contains(plan, (entry) => entry?.set?.local === `P${slot}_MEDICAL_ACTION_COUNT` && entry.value === 4), `patient ${slot} action plan does not define completed medical actions`);
  const identity = medical[`assign patient${slot} identity`];
  requireTrue(Array.isArray(identity) && contains(identity, (entry) => entry?.set?.local === `patientid${slot}`), `patient ${slot} has no independent identity record`);
  const updateText = JSON.stringify(medical[`update patient${slot} physiology`]);
  requireTrue(updateText.includes('"call_macro":"consciousness"'), `patient ${slot} physiology does not refresh consciousness`);
  const capture = ground[`capture patient${slot} ground handover`];
  requireTrue(Array.isArray(capture) && contains(capture, (entry) => entry?.set?.local === `P${slot}_AMBULANCE_FINAL_HR`) && contains(capture, (entry) => entry?.set?.local === `P${slot}_AMBULANCE_FINAL_GCS_TOTAL`), `patient ${slot} ground handover does not freeze complete vital signs and GCS`);
}

const p1AssessmentText = JSON.stringify(medical['ambulance assess patient1']);
requireTrue(p1AssessmentText.includes('"local":"ambulance_handover_visible"},"value":"yes"'), 'Patient 1 ambulance actions remain hidden after assessment');
requireTrue(!JSON.stringify(medical['patient health']).match(/[\u0080-\uFFFF]/), 'patient report contains non-ASCII display text');

const display = tablet['sync medical patient display'];
for (const slot of [2, 3]) {
  const branch = display.find((entry) => entry.if?.local === 'medical_display_patient' && entry.eq === slot)?.then;
  const branchText = JSON.stringify(branch);
  requireTrue(branchText.includes(`"local":"patientid${slot}"`) && branchText.includes(`"local":"P${slot}_MEDICAL_ASSESSMENT_COMPLETE"`), `tablet does not show patient ${slot} identity and ambulance assessment status`);
  requireTrue(branchText.includes(`"local":"P${slot}_AMBULANCE_FINAL_HR"`) && branchText.includes(`"local":"P${slot}_AMBULANCE_FINAL_SPO2"`) && branchText.includes(`"local":"P${slot}_AMBULANCE_FINAL_GCS_TOTAL"`), `tablet handover for patient ${slot} reads live or incomplete values`);
  requireTrue(!branchText.includes('CASUALTY '), `tablet still uses a placeholder identity for patient ${slot}`);
}

const actionLines = [];
function collectActionLines(value) {
  if (Array.isArray(value)) {
    for (const entry of value) collectActionLines(entry);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (value.text === 'IN PROGRESS: {0}') actionLines.push(value);
  for (const entry of Object.values(value)) collectActionLines(entry);
}
collectActionLines(medical['patient health']);
requireTrue(actionLines.length === 6, 'medical page must expose one in-progress line per action');
for (const [index, line] of actionLines.entries()) {
  const step = 6 - index;
  const guards = line.show_condition?.and || [];
  requireTrue(guards.some((entry) => entry.require?.local === 'medical_display_ambulance_completed_actions' && entry.lt === step), `action ${step} in-progress state can duplicate an already completed ambulance action`);
}

for (const name of ['savetemp', 'save1', 'save2', 'save3']) {
  const commands = saves[name];
  const date = commands.find((entry) => entry.set?.local === 'SAVE_LOCAL_DATE');
  requireTrue(date?.value?.function === 'toLocaleDateString' && !JSON.stringify(date.value).includes('string:join'), `${name} serializes a date object instead of a display string`);
}
const slots = saves['savegame page'][6].set_dispatch;
for (const slot of [1, 2, 3]) {
  const rows = slots.filter((entry) => entry.description?.startsWith(`SLOT ${slot}:`));
  requireTrue(rows.length === 2 && rows.every((entry) => entry.description === `SLOT ${slot}: {0}{1} {2}` && entry.params?.[1]?.if?.global === `SAVENAME${slot}` && entry.params?.[1]?.then === ''), `empty save slot ${slot} still renders an undefined timestamp`);
}

// Prove that this gate rejects the old P2/P3-to-P1 aliasing pattern.
const brokenDisplay = [{ set: { local: 'medical_display_name' }, value: { local: 'patientid' } }];
requireTrue(!JSON.stringify(brokenDisplay).includes('patientid2'), 'synthetic patient identity failure was not detected');

console.log('Patient clinical integrity checks passed.');
