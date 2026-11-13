'use strict';
// Registry form of the medical action effect: the same template as `apply patientN medical action effect`
// (tools/lib/manual-treatment-template.js), but reading and writing the registry patient struct
// (`patient.lifescore`, `patient.medical.*`) instead of the per-patient locals.

const { names, buildApply } = require('./manual-treatment-template.js');

function toRegistry(slotN = 2) {
  const x = names(slotN);
  const vitalMap = new Map([
    [x.spo2, 'SPO2'], [x.rr, 'RR'], [x.sys, 'BP_SYS'], [x.dia, 'BP_DIA'], [x.hr, 'BPM'], [x.temp, 'TEMP'],
    [x.eye, 'GCS_EYE'], [x.verbal, 'GCS_VERBAL'], [x.motor, 'GCS_MOTOR'],
    [x.glucose, 'GLUCOSE'], [x.ecg, 'ECG_RHYTHM'], [x.bleed, 'CRIT_BLEED']
  ]);
  const read = (key) => {
    if (key === x.life) return { param: 'patient', path: 'lifescore' };
    if (key === x.alive) return { param: 'patient', path: 'transport_state' };
    if (vitalMap.has(key)) return { param: 'medical', path: vitalMap.get(key) };
    return { param: 'medical', path: key };
  };
  const mutate = (target, key, value) => ({
    set: { param: 'mutation' },
    value: { struct: { 'js:get': 'Object' }, function: 'assign', params: [{ param: target }, { create_struct: { [key]: value } }] }
  });
  const convert = (node) => {
    if (Array.isArray(node)) return node.map(convert).filter((c) => c !== null);
    if (node && Array.isArray(node.and)) node = { ...node, and: node.and.filter((r) => !(r.require && r.require.local === 'CREW_CRIT_2')) };
    if (!node || typeof node !== 'object') return node;
    if (Object.keys(node).length === 1 && typeof node.local === 'string') return read(node.local);
    if (node.set && typeof node.set.local === 'string' && 'value' in node) {
      const key = node.set.local;
      if (key === 'HEMS_PHYSIO_TRACE') return null;
      const value = convert(node.value);
      if (key === 'medical_action_last_effect') {
        return mutate('medical', key, { text: '{0}: {1}', params: [read('medical_action_effect_profile'), read('medical_action_effect_outcome')] });
      }
      return key === x.life ? mutate('patient', 'lifescore', value) : mutate('medical', vitalMap.get(key) || key, value);
    }
    if (node.call_macro === 'ground crew runtime trace') return null;
    if (node.call_macro === x.update) return { call_macro: 'multipatient registry physiology update', params: { patient: { param: 'patient' } } };
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = convert(v);
    return out;
  };
  return convert(buildApply(x));
}

function buildRegistryAction() {
  const body = toRegistry(2);
  // The template opens with the trace, the outcome default and the guard; reuse it as is.
  return [
    { set: { param: 'medical' }, value: { param: 'patient', path: 'medical' } },
    ...body
  ];
}

module.exports = { buildRegistryAction };
