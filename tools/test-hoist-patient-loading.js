const fs = require('fs');

const hoistData = JSON.parse(fs.readFileSync('mission-src/macros/09-hoist-ground-ops.json', 'utf8'));
const medicalData = JSON.parse(fs.readFileSync('mission-src/macros/07-patient-medical.json', 'utf8'));
const selectorData = JSON.parse(fs.readFileSync('mission-src/macros/18-hems-patient-selection.json', 'utf8'));
const groundData = JSON.parse(fs.readFileSync('mission-src/macros/08-ground-response.json', 'utf8'));
const debugData = JSON.parse(fs.readFileSync('mission-src/macros/15-debug-and-df-ui.json', 'utf8'));
let checked = 0;

const selector = selectorData['select HEMS patient'];
if (!selector) throw new Error('HEMS patient selector is missing');
const selectorText = JSON.stringify(selector);
for (const required of ['HEMS_PATIENT_NUMBER', 'HEMS_PATIENT_OBJECT', 'HEMS_PATIENT_LIFESCORE', 'LIFESCORE2', 'LIFESCORE3', 'P2_GROUND_TRANSPORTED', 'P3_GROUND_TRANSPORTED']) {
  if (!selectorText.includes(required)) throw new Error(`HEMS selector misses ${required}`);
}
for (const required of ['hems patient decision after visits', 'select worst unassigned HEMS patient', 'HEMS_DECISION_STATE', 'HEMS_GROUND_READY_COUNT', 'manual_p1_transport_choice', 'P1_HEMS_URGENT']) {
  if (!selectorText.includes(required) && !JSON.stringify(selectorData).includes(required)) throw new Error(`Astra selector misses ${required}`);
}
if (selectorText.includes('from_any_injured_to_ready_for_transport') || selectorText.includes('from_any_injured2_to_ready_for_transport') || selectorText.includes('from_any_injured3_to_ready_for_transport') || selectorText.includes('"var":"VAR 1"')) {
  throw new Error('HEMS selector mutates patient transport state before clinical decision');
}
const selectorVariants = ['HOISTING', 'Hoisting back up', 'Hoisting back ground', 'hoist heli rescuer down', 'gnd ops heli rescuer down', '4 or 5 crew ground ops', '3 crew ground ops', '5 crew SKID LDG', '4 crew SKID LDG', '3 crew SKID LDG'];
for (const variant of selectorVariants) {
  if (hoistData[variant]?.[0]?.call_macro !== 'select HEMS patient') throw new Error(`${variant} does not initialize the HEMS selector`);
}

function visit(value) {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length - 1; index += 1) {
      const current = value[index];
      const next = value[index + 1];
      if (current?.drive_object?.name === 'injured_human' && next?.set?.local === 'crewpatientonstretcher') {
        throw new Error('Patient load state is set before object and distance confirmation');
      }
    }
    value.forEach(visit);
    return;
  }
  if (!value || typeof value !== 'object') return;
  Object.values(value).forEach(visit);
}

visit(hoistData);
const ambulanceDecision = groundData['ambulance decide patient transport'];
if (!ambulanceDecision) throw new Error('Ambulance-owned transport decision is missing');
const ambulanceText = JSON.stringify(ambulanceDecision);
for (const required of ['accept_ground_transport', 'declined_ground_transport', 'hems_required', 'AMBU_AVAIL', 'HELOVICTIMS', 'MEDICAL_ASSESSMENT_COMPLETE']) {
  if (!ambulanceText.includes(required)) throw new Error(`Ambulance decision misses ${required}`);
}
if (!JSON.stringify(groundData['ambulance2 secondary rescue']).includes('hems_required')) throw new Error('Ambulance 2 cannot reassess a patient declined by Ambulance 1');
for (const required of ['HEMS_DECISION_STATE', 'HEMS_GROUND_READY_COUNT', 'P1_AMBULANCE_DECISION', 'P2_AMBULANCE_DECISION', 'P3_AMBULANCE_DECISION', 'P1_HEMS_URGENT', 'P2_HEMS_URGENT', 'P3_HEMS_URGENT']) {
  if (!JSON.stringify(debugData['debug page']).includes(required)) throw new Error(`Debug page misses ${required}`);
}
for (const [number, object] of [[1, 'injured_human'], [2, 'injured_human2'], [3, 'injured_human3']]) {
  const macro = medicalData[`from_any_injured${number === 1 ? '' : number}_to_ready_for_transport`];
  const macroText = JSON.stringify(macro);
  if (!macro || !macroText.includes(`"object":"${object}","var":"VAR 1"`) || !macroText.includes(`"if":{"object":"${object}","var":"VAR 1"},"ne":1`)) throw new Error(`${object} has no guarded VAR1=1 preparation path`);
  checked += 1;
}
console.log(JSON.stringify({ result: 'PASS', patientPreparationPaths: checked, selectorVariants: selectorVariants.length, ambulanceDecision: 'vehicle-owned with capacity override', debugFields: 8, stateRule: 'crewpatientonstretcher follows patient VAR1=1' }, null, 2));
