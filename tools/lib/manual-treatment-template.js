'use strict';
// Template of the manual treatment macros (Dr.DougRoss patch FINAL 2026-11-13).
// One template, three patients: build(n) returns the macros of patient n.
// See docs/architecture/MANUAL_TREATMENT_PATCH.md.

const PROFILE_BUTTONS = {
  assessment: 'A-E SURVEY',
  thermal_support: 'THERMAL CARE',
  neurological_support: 'GCS & PUPILS',
  airway_support: 'AIRWAY POSITION',
  oxygen_support: 'GIVE OXYGEN',
  iv_access: 'INSERT IV',
  hemorrhage_control: 'CONTROL BLEEDING',
  allergic_support: 'ADRENALINE',
  resuscitation: 'START CPR',
  trauma_check: 'TRAUMA CHECK',
  vasopressor: 'VASOPRESSOR',
  ecg: '12 LEADS ECG',
  pain_relief: 'PAIN RELIEF',
  immobilise: 'IMMOBILISE',
  iv_fluids: 'IV FLUIDS',
  intubation: 'INTUBATION (RSI)',
  defibrillation: 'DEFIBRILLATE',
  glucose_level: 'CHECK GLUCOSE',
  give_glucose: 'GIVE GLUCOSE',
  critical_bleeding: 'CRIT BLEEDING CHK',
  tourniquet: 'APPLY TOURNIQUET/CHEST SEAL',
  acs_therapy: 'ACS THERAPY',
  antidote_therapy: 'ANTIDOTE'
};

const WRONG_SETS = [
  ['WAIT FOR CHANGE', 'GIVE COLA', 'PACK EQUIPMENT', 'STAND PATIENT UP'],
  ['SKIP VITALS', 'WALK TEST', 'DELAY TREATMENT', 'NO MONITORING'],
  ['GIVE FOOD', 'IGNORE VITALS', 'WAIT FOR CREW', 'DRAG PATIENT'],
  ['COFFEE BREAK', 'FILL IN FORMS', 'TAKE PHOTOS', 'CHARGE TABLET'],
  ['SMOKE BREAK', 'REFUEL FIRST', 'CHECK WEATHER', 'CLEAN HELICOPTER'],
  ['LET PATIENT SLEEP', 'WALK IT OFF', 'OFFER CIGARETTE', 'GIVE CHEWING GUM'],
  ['TELL A JOKE', 'SING TO PATIENT', 'FAN THE PATIENT', 'PLAY MUSIC'],
  ['SHAKE PATIENT', 'SLAP FACE', 'WATER ON FACE', 'SMELLING SALTS'],
  ['GIVE ALCOHOL', 'GIVE ENERGY DRINK', 'WARM MILK', 'HERBAL TEA'],
  ['CHECK INSURANCE', 'CALL FAMILY FIRST', 'SIGN PAPERWORK', 'PLAN NEXT FLIGHT']
];

const L = (name) => ({ local: name });
const P = (name) => ({ param: name });
const set = (name, value) => ({ set: { local: name }, value });
const call = (name, params, result) => {
  const c = { call_macro: name };
  if (params) c.params = params;
  if (result) c.result = result;
  return c;
};
const when = (left, op, right, then, els) => {
  const c = { if: left, [op]: right, then };
  if (els) c.else = els;
  return c;
};
const andIf = (reqs, then, els) => {
  const c = { if: { and: reqs.map(([l, op, r]) => ({ require: l, [op]: r })) }, eq: 1, then };
  if (els) c.else = els;
  return c;
};
const rand = (a, b) => ({ rand: [a, b] });
const clamp = (v, lo, hi) => ({ clamp: [v, lo, hi] });
const add = (a, b) => ({ add: [a, b] });
const sub = (a, b) => ({ subtract: [a, b] });
const bump = (name, lo, hi, min, max) => set(name, clamp(add(L(name), rand(lo, hi)), min, max));
const drop = (name, lo, hi, min, max) => set(name, clamp(sub(L(name), rand(lo, hi)), min, max));

function names(n) {
  const pre = n === 1 ? '' : `P${n}_`;
  return {
    n,
    life: n === 1 ? 'LIFESCORE' : `LIFESCORE${n}`,
    alive: n === 1 ? 'patientlife' : `patientlife${n}`,
    crew: `crewvisiting${n}`,
    spo2: `${pre}SPO2`, rr: `${pre}RR`, sys: `${pre}BP_SYS`, dia: `${pre}BP_DIA`, hr: `${pre}BPM`, temp: `${pre}TEMP`,
    eye: `${pre}GCS_EYE`, verbal: `${pre}GCS_VERBAL`, motor: `${pre}GCS_MOTOR`,
    glucose: `P${n}_GLUCOSE`, ecg: `P${n}_ECG_RHYTHM`, bleed: `P${n}_CRIT_BLEED`, pool: `P${n}_PLAUSIBLE_POOL`,
    count: `P${n}_MEDICAL_ACTION_COUNT`,
    step: n === 1 ? 'medical_actions_current_step' : `P${n}_MEDICAL_ACTIONS_CURRENT_STEP`,
    completed: `P${n}_MEDICAL_ACTIONS_COMPLETED`,
    completedActions: `P${n}_AMBULANCE_COMPLETED_ACTIONS`,
    assess: n === 1 ? 'medical_assessment_complete' : `P${n}_MEDICAL_ASSESSMENT_COMPLETE`,
    m: (x) => `manual_p${n}_${x}`,
    update: `update patient${n} physiology`,
    modeEff: `P${n}_MANUAL_MODE_EFF`
  };
}

const toward = (name, lo, hi, a, b, min, max) => [
  when(L(name), 'gt', hi, [drop(name, a, b, min, max)]),
  when(L(name), 'lt', lo, [bump(name, a, b, min, max)])
];

// Effect of one profile when it takes effect.
function effectOf(profile, x) {
  const air = [bump(x.spo2, 1, 4, 0, 100), ...toward(x.rr, 10, 20, 1, 3, 0, 40)];
  const perf = [bump(x.sys, 2, 6, 0, 220), bump(x.dia, 1, 4, 0, 140), ...toward(x.hr, 50, 110, 1, 4, 0, 180)];
  const pressor = [bump(x.sys, 4, 8, 0, 220), bump(x.dia, 2, 4, 0, 140), ...toward(x.hr, 70, 100, 1, 4, 0, 180)];
  switch (profile) {
    case 'assessment': case 'trauma_check': case 'ecg': case 'glucose_level': case 'critical_bleeding': case 'neurological_support':
      return [];
    case 'thermal_support':
      return [when(L(x.temp), 'lt', 36.5, [set(x.temp, clamp(add(L(x.temp), rand(0.1, 0.3)), 34, 42))]),
        when(L(x.temp), 'gt', 38.5, [set(x.temp, clamp(sub(L(x.temp), rand(0.1, 0.3)), 34, 42))])];
    case 'airway_support': case 'oxygen_support': return air;
    case 'iv_access': case 'hemorrhage_control': return perf;
    case 'allergic_support': {
      const rosc = [set(x.life, clamp(add(L(x.life), rand(1, 2)), 0, 100)),
        when({ floor: rand(0, 100) }, 'lt', 20, [set(x.ecg, 'SINUS'), set(x.hr, clamp(rand(60, 90), 0, 180))])];
      return [
        when(L(x.ecg), 'eq', 'BRADYCARDIA', [when(L(x.hr), 'lt', 46, [set(x.hr, clamp(rand(60, 80), 0, 180))], [...air, ...perf])],
          [when(L(x.ecg), 'eq', 'PEA', rosc,
            [when(L(x.ecg), 'eq', 'ASYSTOLE', rosc, [...air, ...perf])])])
      ];
    }
    case 'resuscitation':
      return [...air, ...perf, set(x.life, clamp(add(L(x.life), rand(1, 2)), 0, 100))];
    case 'vasopressor':
      return [bump(x.sys, 4, 8, 0, 220), bump(x.dia, 1, 4, 0, 140), ...toward(x.hr, 70, 100, 1, 4, 0, 180)];
    case 'pain_relief': return toward(x.hr, 70, 100, 1, 4, 0, 180);
    case 'immobilise': case 'iv_fluids': return pressor;
    case 'intubation': return [set(x.spo2, clamp(rand(90, 100), 0, 100)), set(x.rr, 15)];
    case 'defibrillation': {
      const rosc = [set(x.ecg, 'SINUS'), ...pressor];
      return [when(L(x.ecg), 'eq', 'VF', rosc, [when(L(x.ecg), 'eq', 'pVT', rosc)])];
    }
    case 'give_glucose':
      return [when(L(x.glucose), 'lt', 60, [set(x.eye, 4), set(x.verbal, 4), set(x.motor, 6), set(x.glucose, rand(90, 120))])];
    case 'tourniquet':
      return [bump(x.sys, 2, 6, 0, 220), bump(x.dia, 1, 4, 0, 140), ...toward(x.hr, 80, 130, 1, 4, 0, 180), set(x.bleed, 'NO')];
    case 'acs_therapy':
      return [...toward(x.hr, 60, 100, 1, 4, 0, 180), when(L(x.sys), 'gt', 160, [drop(x.sys, 4, 8, 0, 220), drop(x.dia, 2, 4, 0, 140)])];
    case 'antidote_therapy':
      return [bump(x.spo2, 4, 6, 0, 100), ...toward(x.hr, 60, 100, 1, 4, 0, 180), set(x.eye, 4), set(x.verbal, 4), set(x.motor, 5)];
    default: return [];
  }
}

// Outcome of a plausible-wrong button (applies to the plausible profile).
function wrongOf(profile, x) {
  const generic = [drop(x.spo2, 1, 4, 0, 100), drop(x.sys, 2, 8, 0, 220), bump(x.hr, 2, 8, 0, 180)];
  const lifeLoss = (a, b) => set(x.life, clamp(sub(L(x.life), { floor: rand(a, b) }), 0, 100));
  switch (profile) {
    case 'assessment': case 'thermal_support': case 'neurological_support': case 'iv_access': case 'hemorrhage_control':
    case 'allergic_support': case 'resuscitation':
      return [lifeLoss(4, 11), ...generic];
    case 'airway_support': case 'oxygen_support':
      return [lifeLoss(4, 11), drop(x.sys, 2, 8, 0, 220), bump(x.hr, 2, 8, 0, 180)];
    case 'vasopressor':
      return [lifeLoss(10, 11), set(x.sys, clamp(rand(170, 230), 0, 220)), set(x.hr, clamp(rand(40, 60), 0, 180))];
    case 'pain_relief':
      return [lifeLoss(4, 11), set(x.rr, clamp(rand(4, 8), 0, 40)), set(x.hr, clamp(rand(50, 70), 0, 180))];
    case 'intubation': return [lifeLoss(10, 21)];
    case 'defibrillation':
      return [lifeLoss(4, 11), when({ floor: rand(0, 100) }, 'lt', 20, [set(x.ecg, 'pVT')])];
    case 'antidote_therapy': return [lifeLoss(4, 12)];
    default: return [lifeLoss(4, 11)];
  }
}

function buildApply(x) {
  const n = x.n;
  const profileBlock = (fn) => Object.keys(PROFILE_BUTTONS).map((p) => {
    const body = fn(p);
    return body.length ? when(L('medical_action_effect_profile'), 'eq', p, body) : null;
  }).filter(Boolean);
  const improved = profileBlock((p) => effectOf(p, x));
  const needsGain = ['assessment', 'trauma_check', 'ecg', 'glucose_level', 'critical_bleeding', 'neurological_support'];
  return [
    call('ground crew runtime trace', { macro: 'hems_visit', actor: 'n/a', target: `apply patient${n} medical action effect`, state: 'apply_entered' }),
    set('medical_action_effect_outcome', 'no effect - medic incapacitated'),
    set('medical_action_result_text', null),
    andIf([[L(x.alive), 'ne', 'died'], [L('CREW_CRIT_2'), 'ne', 1]], [
      set('medical_action_effect_outcome', 'no immediate change'),
      // Tourniquet step with no critical bleeding: nothing to do.
      when(L('medical_action_effect_profile'), 'eq', 'tourniquet', [
        when(L(x.bleed), 'ne', 'YES', [set('medical_action_effect_outcome', 'not needed')])]),
      when(L('medical_action_effect_outcome'), 'eq', 'no immediate change', [
        when(L('medical_action_effect_profile'), 'ne', 'assessment', [
          set('medical_action_response_roll', { floor: rand(0, 100) }),
          when(L(x.life), 'lt', 20,
            [when(L('medical_action_response_roll'), 'lt', 48, [set('medical_action_effect_outcome', 'improved')]),
              when(L('medical_action_response_roll'), 'gte', 85, [set('medical_action_effect_outcome', 'deteriorated')])],
            [when(L('medical_action_response_roll'), 'lt', 68, [set('medical_action_effect_outcome', 'improved')]),
              when(L('medical_action_response_roll'), 'gte', 91, [set('medical_action_effect_outcome', 'deteriorated')])])
        ]),
        // A correct manual choice always takes effect.
        when(L('medical_action_force_success'), 'eq', 1, [set('medical_action_effect_outcome', 'improved')])
      ]),
      when(L('medical_action_effect_outcome'), 'eq', 'improved', [
        andIf(needsGain.map((p) => [L('medical_action_effect_profile'), 'ne', p]), [set(x.life, clamp(add(L(x.life), rand(1, 3)), 0, 100))]),
        ...improved
      ]),
      when(L('medical_action_effect_outcome'), 'eq', 'deteriorated', [
        set(x.life, clamp(sub(L(x.life), rand(1, 3)), 0, 100)),
        andIf([[L('medical_action_effect_profile'), 'eq', 'airway_support']], [drop(x.spo2, 1, 4, 0, 100), bump(x.rr, 1, 3, 0, 40)]),
        andIf([[L('medical_action_effect_profile'), 'eq', 'oxygen_support']], [drop(x.spo2, 1, 4, 0, 100), bump(x.rr, 1, 3, 0, 40)]),
        andIf([[L('medical_action_effect_profile'), 'eq', 'iv_access']], [drop(x.sys, 2, 5, 0, 220), drop(x.dia, 1, 3, 0, 140)]),
        andIf([[L('medical_action_effect_profile'), 'eq', 'hemorrhage_control']], [drop(x.sys, 2, 5, 0, 220), drop(x.dia, 1, 3, 0, 140)])
      ]),
      // Result texts of the report steps.
      when(L('medical_action_effect_profile'), 'eq', 'ecg', [set('medical_action_result_text', { text: 'ECG: {0}', params: [L(x.ecg)] })]),
      when(L('medical_action_effect_profile'), 'eq', 'glucose_level', [set('medical_action_result_text', { text: 'Glucose {0} mg/dL', params: [{ round: L(x.glucose), to: 0 }] })]),
      when(L('medical_action_effect_profile'), 'eq', 'critical_bleeding', [set('medical_action_result_text', { text: 'Critical bleeding: {0}', params: [L(x.bleed)] })]),
      when(L('medical_action_effect_profile'), 'eq', 'trauma_check', [set('medical_action_result_text', 'Trauma check done')]),
      when(L('medical_action_effect_profile'), 'eq', 'neurological_support', [
        set('medical_action_result_text', { text: 'GCS E{0} V{1} M{2} = {3}', params: [{ round: L(x.eye), to: 0 }, { round: L(x.verbal), to: 0 }, { round: L(x.motor), to: 0 }, { round: add(add(L(x.eye), L(x.verbal)), L(x.motor)), to: 0 }] })]),
      when(L('medical_action_effect_profile'), 'eq', 'tourniquet', [when(L('medical_action_effect_outcome'), 'eq', 'not needed', [set('medical_action_result_text', 'Tourniquet not needed')])])
    ]),
    set('medical_action_effects_applied', add(L('medical_action_effects_applied'), 1)),
    set('medical_action_last_effect', '{local:medical_action_effect_profile}: {local:medical_action_effect_outcome}'),
    set('HEMS_PHYSIO_TRACE', 1),
    call('ground crew runtime trace', { macro: 'hems_visit', actor: 'n/a', target: `apply patient${n} medical action effect`, state: 'before_update_physiology' }),
    call(x.update),
    call('ground crew runtime trace', { macro: 'hems_visit', actor: 'n/a', target: `apply patient${n} medical action effect`, state: 'after_update_physiology' }),
    set('HEMS_PHYSIO_TRACE', 0)
  ];
}

module.exports = { PROFILE_BUTTONS, WRONG_SETS, names, effectOf, wrongOf, buildApply, L, P, set, call, when, andIf, rand, clamp, add, sub, bump, drop, toward };
