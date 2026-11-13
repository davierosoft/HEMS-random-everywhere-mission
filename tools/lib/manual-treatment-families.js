'use strict';
// Manual treatment families (prepare / choice / finish) and shared helper macros.
// Built on tools/lib/manual-treatment-template.js. See docs/architecture/MANUAL_TREATMENT_PATCH.md.

const T = require('./manual-treatment-template.js');
const { PROFILE_BUTTONS, WRONG_SETS, names, wrongOf, buildApply, L, P, set, call, when, andIf, rand, clamp, add, sub } = T;

function buildPrepare(x) {
  const n = x.n;
  const m = x.m;
  const steps = [1, 2, 3, 4, 5, 6].map((k) => when(L(x.step), 'eq', k, [
    set(m('current_profile'), L(`P${n}_MEDICAL_ACTION_${k}_PROFILE`)),
    set(m('current_target'), L(`P${n}_MEDICAL_ACTION_${k}`))
  ]));
  const dropPlausible = [set(m('plausible_slot'), 0), set(m('plausible_profile'), null)];
  const slotLabel = (k) => when(L(m('correct_slot')), 'eq', k,
    [call('manual profile button label', { profile: L(m('current_profile')) }, 'slot_label'), set(m(`slot${k}_label`), P('slot_label'))],
    [when(L(m('plausible_slot')), 'eq', k,
      [call('manual profile button label', { profile: L(m('plausible_profile')) }, 'slot_label'), set(m(`slot${k}_label`), P('slot_label'))],
      [call('manual absurd button label', { set: L(m('wrong_set')), slot: k }, 'slot_label'), set(m(`slot${k}_label`), P('slot_label'))])]);
  return [
    set(m('choice_label'), null),
    set(m('current_profile'), null),
    set(m('current_target'), null),
    ...steps,
    // The phase list is done: close the manual path (also reached after a skipped tourniquet).
    when(L(x.step), 'gt', L(x.count), [
      set(x.step, L(x.count)),
      ...(n === 1 ? [set('medical_actions_completed', 1)] : []),
      set(x.completed, 1),
      set(m('state'), 'review'),
      call('sync medical patient display'),
      { return: 1 }
    ]),
    // Tourniquet step: skipped when the critical bleeding check returned NO.
    andIf([[L(m('current_profile')), 'eq', 'tourniquet'], [L(x.bleed), 'ne', 'YES']], [
      set(m('feedback'), 'Tourniquet not needed'),
      set(m('last_choice_correct'), true),
      call(`record manual patient${n} action result`),
      call(`finish patient${n} manual phase`),
      { return: 1 }
    ]),
    set(m('correct_slot'), { floor: rand(1, 5) }),
    set(m('wrong_set'), { floor: rand(0, 10) }),
    set(m('plausible_slot'), 0),
    set(m('plausible_profile'), null),
    set('manual_pool_len', { struct: L(x.pool), path: 'length' }),
    when(L('manual_pool_len'), 'gt', 0, [
      set(m('plausible_slot'), add(L(m('correct_slot')), { floor: rand(1, 4) })),
      when(L(m('plausible_slot')), 'gt', 4, [set(m('plausible_slot'), sub(L(m('plausible_slot')), 4))]),
      set('manual_pool_idx', { floor: rand(0, L('manual_pool_len')) }),
      set(m('plausible_profile'), { struct: L(x.pool), index: L('manual_pool_idx') }),
      // Defibrillation / adrenaline are never offered as wrong where they would be right.
      andIf([[L(m('plausible_profile')), 'eq', 'defibrillation'], [L(x.ecg), 'eq', 'VF']], dropPlausible),
      andIf([[L(m('plausible_profile')), 'eq', 'defibrillation'], [L(x.ecg), 'eq', 'pVT']], dropPlausible),
      andIf([[L(m('plausible_profile')), 'eq', 'allergic_support'], [L(x.ecg), 'eq', 'PEA']], dropPlausible),
      andIf([[L(m('plausible_profile')), 'eq', 'allergic_support'], [L(x.ecg), 'eq', 'ASYSTOLE']], dropPlausible),
      andIf([[L(m('plausible_profile')), 'eq', 'allergic_support'], [L(x.ecg), 'eq', 'BRADYCARDIA'], [L(x.hr), 'lt', 46]], dropPlausible),
      when(L(m('plausible_profile')), 'eq', L(m('current_profile')), dropPlausible)
    ]),
    ...[1, 2, 3, 4].map(slotLabel),
    set(m('state'), 'choose'),
    call('sync medical patient display')
  ];
}

function buildFinish(x) {
  const n = x.n;
  const m = x.m;
  return [
    set(x.completedActions, L(x.step)),
    when(L(x.step), 'eq', 1, [set(x.assess, 'yes')]),
    when(L(x.step), 'lt', L(x.count),
      [set(x.step, add(L(x.step), 1)), { sleep: 0.1 }, call(`prepare patient${n} manual treatment phase`)],
      [...(n === 1 ? [set('medical_actions_completed', 1)] : []),
        set(x.completed, 1),
        set(m('state'), 'review')]),
    call('sync medical patient display')
  ];
}

function buildChoice(x) {
  const n = x.n;
  const m = x.m;
  const feedback = (suffix) => set(m('feedback'), `PHASE {local:${x.step}}: {local:${m('choice_label')}} - ${suffix} ({local:${m('action_score')}})`);
  const penalty = (extra) => [
    set(m('error_count'), add(L(m('error_count')), 1)),
    ...extra,
    set('medical_action_effect_outcome', 'incorrect procedure'),
    call(x.update),
    feedback('INCORRECT')
  ];
  const plausibleCases = Object.keys(PROFILE_BUTTONS).map((p) => when(L(m('plausible_profile')), 'eq', p, wrongOf(p, x)));
  return [
    when(L(m('state')), 'eq', 'choose', [
      set(m('state'), 'in_progress'),
      set(m('choice_label'), P('label')),
      set(m('choice_slot'), P('slot')),
      set(m('role'), 'absurd'),
      when(P('slot'), 'eq', L(m('correct_slot')), [set(m('role'), 'correct')]),
      andIf([[P('slot'), 'eq', L(m('plausible_slot'))], [L(m('plausible_slot')), 'gt', 0]], [set(m('role'), 'plausible')]),
      set(m('last_choice_correct'), false),
      when(L(m('role')), 'eq', 'correct', [set(m('last_choice_correct'), true)]),
      set(m('lifescore_before'), L(x.life)),
      call(`set manual patient${n} procedure duration`),
      {
        create_thread: {
          commands: [
            { sleep: L(m('action_duration')) },
            andIf([[L(m('state')), 'eq', 'in_progress'], [L(x.crew), 'eq', 'yes'], [L(x.alive), 'ne', 'died']], [
              when(L(m('role')), 'eq', 'correct', [
                set('medical_action_effect_profile', L(m('current_profile'))),
                set('medical_action_effect_step', L(x.step)),
                set('medical_action_force_success', 1),
                call(`apply patient${n} medical action effect`),
                set('medical_action_force_success', 0),
                set(m('action_score'), { floor: sub(L(x.life), L(m('lifescore_before'))) }),
                feedback('CORRECT'),
                when(L('medical_action_result_text'), 'ne', null, [set(m('feedback'), L('medical_action_result_text'))])
              ]),
              when(L(m('role')), 'eq', 'plausible', penalty([
                set('lifescore_pre_wrong', L(x.life)),
                ...plausibleCases,
                set(m('action_score'), { floor: sub(L(x.life), L('lifescore_pre_wrong')) })
              ])),
              when(L(m('role')), 'eq', 'absurd', penalty([
                set(m('wrong_penalty'), { floor: rand(2, 6) }),
                set(m('action_score'), { multiply: [L(m('wrong_penalty')), -1] }),
                set(x.life, clamp(sub(L(x.life), L(m('wrong_penalty'))), 0, 100))
              ])),
              call(`record manual patient${n} action result`),
              call(`finish patient${n} manual phase`)
            ])
          ]
        }
      }
    ])
  ];
}

function buildSharedMacros() {
  const macros = {};
  macros['manual profile button label'] = [
    set('manual_label_out', 'WAIT'),
    ...Object.entries(PROFILE_BUTTONS).map(([p, b]) => when(P('profile'), 'eq', p, [set('manual_label_out', b)])),
    { return: L('manual_label_out') }
  ];
  macros['manual absurd button label'] = [
    set('manual_label_out', 'WAIT'),
    ...WRONG_SETS.flatMap((labelsOfSet, si) => labelsOfSet.map((txt, k) =>
      andIf([[P('set'), 'eq', si], [P('slot'), 'eq', k + 1]], [set('manual_label_out', txt)]))),
    { return: L('manual_label_out') }
  ];
  macros['initialize patient extra clinical state'] = [1, 2, 3].map((n) => {
    const x = names(n);
    const prof = (path) => ({ param: 'profile', path });
    return when(P('patient'), 'eq', n, [
      set(x.ecg, { if: prof('ecg_rhythm'), ne: null, then: prof('ecg_rhythm'), else: 'SINUS' }),
      set(x.glucose, { if: prof('glucose_min'), ne: null, then: rand(prof('glucose_min'), prof('glucose_max')), else: rand(80, 140) }),
      set(x.bleed, 'NO'),
      when(prof('critical_bleeding_chance'), 'ne', null, [
        when({ floor: rand(0, 100) }, 'lt', prof('critical_bleeding_chance'), [set(x.bleed, 'YES')])]),
      set(x.pool, { create_array: 0 }),
      when(prof('plausible_wrong_pool'), 'ne', null, [set(x.pool, prof('plausible_wrong_pool'))]),
      call('refresh effective manual mode', { patient: n })
    ]);
  });
  macros['refresh effective manual mode'] = [1, 2, 3].map((n) => {
    const x = names(n);
    return when(P('patient'), 'eq', n, [
      set(x.modeEff, 'automatic'),
      andIf([[{ global: 'P1_MANUAL_MEDICAL_MODE' }, 'eq', 'manual'], [L(x.count), 'gt', 0]], [set(x.modeEff, 'manual')])
    ]);
  });
  return macros;
}

function buildFamily(n) {
  const x = names(n);
  return {
    [`apply patient${n} medical action effect`]: buildApply(x),
    [`prepare patient${n} manual treatment phase`]: buildPrepare(x),
    [`manual patient${n} treatment choice`]: buildChoice(x),
    [`finish patient${n} manual phase`]: buildFinish(x)
  };
}

module.exports = { buildFamily, buildSharedMacros };
