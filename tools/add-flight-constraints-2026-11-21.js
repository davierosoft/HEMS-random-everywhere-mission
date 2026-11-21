// One-shot source merge (2026-11-21): minimal flight constraints (altitude above 3000 ft AMSL, vertical load, bank, pitch up) of the doctor's v2 review.
// Generates mission-src/macros/25-flight-constraints.json and wires the option FLIGHT_CONSTRAINTS (yes/no, default no until runtime tested). Idempotent.
const fs = require('fs');
const root = 'mission-src/macros/';
const rd = (f) => fs.readFileSync(f, 'utf8');
const patch = (file, find, repl, all) => {
  let s = rd(file);
  if (s.includes(repl.trim().split('\n')[0].trim()) && !all && s.includes(repl)) return;
  if (!s.includes(find)) throw new Error('anchor not found in ' + file + ': ' + find.slice(0, 80));
  s = all ? s.split(find).join(repl) : s.replace(find, repl);
  fs.writeFileSync(file, s);
};
const g = (v) => ({ var: [v, 'number'] });

// ---- limits per profile (v1 profiles of the doctor's package, minimal set) ----
const prof = JSON.parse(rd('tools/pending-patches/flight_constraints_patch_v2-2026-11-21.json')).profiles;
const limits = [];
for (const [name, p] of Object.entries(prof)) {
  const set = [];
  set.push({ set: { local: 'fc_lim_g' }, value: +(((p.g_vert_max || 0) - 1) * 32.174).toFixed(2) });
  set.push({ set: { local: 'fc_lim_bank' }, value: +((p.bank_max_deg || 0) * 0.0174533).toFixed(4) });
  set.push({ set: { local: 'fc_lim_pitch' }, value: +((p.pitch_up_max_deg || 0) * 0.0174533).toFixed(4) });
  set.push({ set: { local: 'fc_lim_gx' }, value: +((p.g_lat_max || 0) * 32.174).toFixed(2) });
  set.push({ set: { local: 'fc_lim_gz' }, value: +((p.g_long_max || 0) * 32.174).toFixed(2) });
  set.push({ set: { local: 'fc_lim_pdown' }, value: name === 'FC_ICP_HEAD' ? +((p.pitch_down_max_deg || 0) * 0.0174533).toFixed(4) : 0 });
  // noise: only profiles with sensitivity 2 or 3; FC_OBSTETRIC stays off until the doctor confirms (its 3 was a guess of the v1 proposal)
  set.push({ set: { local: 'fc_lim_noise' }, value: (p.noise_sensitivity_0_3 || 0) >= 2 && name !== 'FC_OBSTETRIC' ? 1 : 0 });
  if (p.alt_rel_cap_ft != null) set.push({ set: { local: 'fc_alt_rel' }, value: p.alt_rel_cap_ft });
  if (p.alt_abs_cap_ft != null) set.push({ set: { local: 'fc_alt_abs' }, value: p.alt_abs_cap_ft });
  limits.push({ if: { param: 'profile' }, eq: name, then: set });
}
const lim = (k) => ({ local: k });

function block(K, valueCmds, limLocal) {
  const st = { local: 'fc_state_' + K }, cd = { local: 'fc_cd_' + K }, r = { local: 'fc_r_' + K };
  return [
    { if: lim(limLocal), gt: 0, then: [
      ...valueCmds,
      { set: { local: 'fc_r_' + K }, value: { multiply: [{ divide: [{ local: 'fc_v_' + K }, lim(limLocal)] }, 100] } },
      { set: { local: 'fc_cd_' + K }, value: { clamp: [{ subtract: [cd, 0.5] }, 0, 60] } },
      { if: r, gte: 100, then: [
        { set: { local: 'fc_pen' }, value: 5 }, { set: { local: 'fc_tier' }, value: 1 },
        { if: r, gte: 130, then: [{ set: { local: 'fc_pen' }, value: 10 }, { set: { local: 'fc_tier' }, value: 2 }] },
        { if: cd, lte: 0, then: [
          { call_macro: 'flight constraints penalty', params: { patient: { local: 'fc_n' }, kind: K, amount: { local: 'fc_pen' } } },
          { set: { local: 'fc_cd_' + K }, value: 10 }
        ] },
        { if: st, lt: { local: 'fc_tier' }, then: [
          { set: { local: 'fc_state_' + K }, value: { local: 'fc_tier' } },
          { call_macro: 'voice say', params: { key: 'FC.' + K } },
          { call_macro: 'flight constraints tablet', params: { kind: K } }
        ] }
      ], else: [
        { if: r, lt: 80, then: [
          { if: st, gt: 0, then: [{ set: { local: 'fc_state_' + K }, value: 0 }, { set: { local: 'fc_clear_due' }, value: 1 }] }
        ] }
      ] }
    ] }
  ];
}
const neg = (K, v) => [{ set: { local: 'fc_v_' + K }, value: v }, { if: { local: 'fc_v_' + K }, lt: 0, then: [{ set: { local: 'fc_v_' + K }, value: { multiply: [{ local: 'fc_v_' + K }, -1] } }] }];

const sample = [
  { '#comment': 'One sample of the flight constraints (doctor review v2, minimal set: altitude above 3000 ft AMSL, vertical load, bank, pitch up). Runs every 0.5 s while the stretcher holds a patient (SDK_CABIN_PAX_5 = 2). Penalty at 100 percent of the limit: 5 points, at 130 percent: 10, every 10 s while exceeded; a warning on every tier change; CLEAR when all are below 80 percent. Altitude: SpO2 (patient 1 SPO2, others Pn_SPO2), the others: lifescore. Pitch: nose-up is NEGATIVE in the simulator. Needs the patient profile Pn_FC_PROFILE (data field flight_constraint_profile).' },
  { set: { local: 'fc_n' }, value: { local: 'HEMS_PATIENT_NUMBER' } },
  { if: { local: 'fc_n' }, eq: null, then: [{ set: { local: 'fc_n' }, value: 1 }] },
  { if: { local: 'fc_n' }, lt: 1, then: [{ set: { local: 'fc_n' }, value: 1 }] },
  { set: { local: 'fc_profile' }, value: null },
  { if: { local: 'fc_n' }, eq: 1, then: [{ set: { local: 'fc_profile' }, value: { local: 'P1_FC_PROFILE' } }] },
  { if: { local: 'fc_n' }, eq: 2, then: [{ set: { local: 'fc_profile' }, value: { local: 'P2_FC_PROFILE' } }] },
  { if: { local: 'fc_n' }, eq: 3, then: [{ set: { local: 'fc_profile' }, value: { local: 'P3_FC_PROFILE' } }] },
  { if: { local: 'fc_profile' }, eq: null, then: [{ return: 0 }] },
  { set: { local: 'fc_lim_g' }, value: 0 }, { set: { local: 'fc_lim_bank' }, value: 0 }, { set: { local: 'fc_lim_pitch' }, value: 0 },
  { set: { local: 'fc_lim_gx' }, value: 0 }, { set: { local: 'fc_lim_gz' }, value: 0 }, { set: { local: 'fc_lim_pdown' }, value: 0 }, { set: { local: 'fc_lim_noise' }, value: 0 },
  { set: { local: 'fc_alt_rel' }, value: null }, { set: { local: 'fc_alt_abs' }, value: null },
  { call_macro: 'flight constraints limits', params: { profile: { local: 'fc_profile' } } },
  { '#comment': 'Automatic medical mode: the headset is fitted by default (Andrew 2026-11-21), so the noise never hurts.' },
  { if: { global: 'P1_MANUAL_MEDICAL_MODE' }, ne: 'manual', then: [{ set: { local: 'fc_lim_noise' }, value: 0 }] },
  { if: { local: 'fc_n' }, eq: 1, then: [{ if: { local: 'P1_HEADSET' }, eq: 1, then: [{ set: { local: 'fc_lim_noise' }, value: 0 }] }] },
  { if: { local: 'fc_n' }, eq: 2, then: [{ if: { local: 'P2_HEADSET' }, eq: 1, then: [{ set: { local: 'fc_lim_noise' }, value: 0 }] }] },
  { if: { local: 'fc_n' }, eq: 3, then: [{ if: { local: 'P3_HEADSET' }, eq: 1, then: [{ set: { local: 'fc_lim_noise' }, value: 0 }] }] },
  { set: { local: 'fc_alt' }, value: { var: ['A:PLANE ALTITUDE', 'feet'] } },
  { if: { local: 'fc_pickup_alt' }, eq: null, then: [{ set: { local: 'fc_pickup_alt' }, value: { local: 'fc_alt' } }] },
  { set: { local: 'fc_lim_alt' }, value: 0 },
  { if: { local: 'fc_alt_rel' }, ne: null, then: [{ set: { local: 'fc_lim_alt' }, value: { add: [{ local: 'fc_pickup_alt' }, { local: 'fc_alt_rel' }] } }] },
  { if: { local: 'fc_alt_abs' }, ne: null, then: [
    { if: { local: 'fc_lim_alt' }, lte: 0, then: [{ set: { local: 'fc_lim_alt' }, value: { local: 'fc_alt_abs' } }], else: [
      { if: { local: 'fc_alt_abs' }, lt: { local: 'fc_lim_alt' }, then: [{ set: { local: 'fc_lim_alt' }, value: { local: 'fc_alt_abs' } }] }] }] },
  { if: { local: 'fc_lim_alt' }, gt: 0, then: [{ if: { local: 'fc_lim_alt' }, lt: 3000, then: [{ set: { local: 'fc_lim_alt' }, value: 3000 }] }] },
  ...block('G', neg('G', { var: ['ACCELERATION BODY Y', 'Feet per second squared'] }), 'fc_lim_g'),
  ...block('GX', neg('GX', { var: ['ACCELERATION BODY X', 'Feet per second squared'] }), 'fc_lim_gx'),
  ...block('GZ', neg('GZ', { var: ['ACCELERATION BODY Z', 'Feet per second squared'] }), 'fc_lim_gz'),
  ...block('PDOWN', [{ set: { local: 'fc_v_PDOWN' }, value: { var: ['PLANE PITCH DEGREES', 'Radians'] } }, { if: { local: 'fc_v_PDOWN' }, lt: 0, then: [{ set: { local: 'fc_v_PDOWN' }, value: 0 }] }], 'fc_lim_pdown'),
  ...block('NOISE', [{ set: { local: 'fc_v_NOISE' }, value: 0 },
    { if: g('L:{local:HXX}_SDK_ROTOR_RPM'), gt: 40, then: [{ if: g('L:{local:HXX}_SDK_ENG_1_N1'), gt: 20, then: [{ set: { local: 'fc_v_NOISE' }, value: 1 }], else: [{ if: g('L:{local:HXX}_SDK_ENG_2_N1'), gt: 20, then: [{ set: { local: 'fc_v_NOISE' }, value: 1 }] }] }] }], 'fc_lim_noise'),
  ...block('BANK', neg('BANK', { var: ['PLANE BANK DEGREES', 'Radians'] }), 'fc_lim_bank'),
  ...block('PITCH', [{ set: { local: 'fc_v_PITCH' }, value: { multiply: [{ var: ['PLANE PITCH DEGREES', 'Radians'] }, -1] } }, { if: { local: 'fc_v_PITCH' }, lt: 0, then: [{ set: { local: 'fc_v_PITCH' }, value: 0 }] }], 'fc_lim_pitch'),
  ...block('ALT', [{ set: { local: 'fc_v_ALT' }, value: { local: 'fc_alt' } }], 'fc_lim_alt'),
  { if: { local: 'fc_clear_due' }, eq: 1, then: [
    { set: { local: 'fc_clear_due' }, value: 0 },
    { if: { local: 'fc_state_G' }, eq: 0, then: [{ if: { local: 'fc_state_BANK' }, eq: 0, then: [{ if: { local: 'fc_state_PITCH' }, eq: 0, then: [{ if: { local: 'fc_state_ALT' }, eq: 0, then: [{ if: { local: 'fc_state_NOISE' }, eq: 0, then: [{ if: { local: 'fc_state_GX' }, eq: 0, then: [{ if: { local: 'fc_state_GZ' }, eq: 0, then: [{ if: { local: 'fc_state_PDOWN' }, eq: 0, then: [
      { call_macro: 'voice say', params: { key: 'FC.CLEAR' } }] }] }] }] }] }] }] }] }
  ] }
];

const penalty = [
  { '#comment': 'Applies one penalty to patient n (kind PITCH also lowers the systolic pressure by amount + 5, i.e. 10 or 15, and the lifescore by 5, as the doctor asked): kind ALT lowers the SpO2 (patient 1 SPO2, others Pn_SPO2), every other kind the lifescore through the registry override (slot n) with the local as a fallback outside the live registry.' },
  { if: { param: 'kind' }, eq: 'ALT', then: [
    { if: { param: 'patient' }, eq: 1, then: [{ set: { local: 'SPO2' }, value: { clamp: [{ subtract: [{ local: 'SPO2' }, { param: 'amount' }] }, 0, 100] } }] },
    { if: { param: 'patient' }, eq: 2, then: [{ set: { local: 'P2_SPO2' }, value: { clamp: [{ subtract: [{ local: 'P2_SPO2' }, { param: 'amount' }] }, 0, 100] } }] },
    { if: { param: 'patient' }, eq: 3, then: [{ set: { local: 'P3_SPO2' }, value: { clamp: [{ subtract: [{ local: 'P3_SPO2' }, { param: 'amount' }] }, 0, 100] } }] },
    { return: 1 }
  ] },
  { if: { param: 'kind' }, eq: 'PITCH', then: [
    { set: { local: 'fc_bp' }, value: { add: [{ param: 'amount' }, 5] } },
    { if: { param: 'patient' }, eq: 1, then: [{ set: { local: 'BP_SYS' }, value: { clamp: [{ subtract: [{ local: 'BP_SYS' }, { local: 'fc_bp' }] }, 0, 300] } }] },
    { if: { param: 'patient' }, eq: 2, then: [{ set: { local: 'P2_BP_SYS' }, value: { clamp: [{ subtract: [{ local: 'P2_BP_SYS' }, { local: 'fc_bp' }] }, 0, 300] } }] },
    { if: { param: 'patient' }, eq: 3, then: [{ set: { local: 'P3_BP_SYS' }, value: { clamp: [{ subtract: [{ local: 'P3_BP_SYS' }, { local: 'fc_bp' }] }, 0, 300] } }] },
    { set: { local: 'fc_amount' }, value: 5 }
  ], else: [{ set: { local: 'fc_amount' }, value: { param: 'amount' } }] },
  { set: { local: 'fc_score' }, value: { local: 'LIFESCORE' } },
  { if: { param: 'patient' }, eq: 2, then: [{ set: { local: 'fc_score' }, value: { local: 'LIFESCORE2' } }] },
  { if: { param: 'patient' }, eq: 3, then: [{ set: { local: 'fc_score' }, value: { local: 'LIFESCORE3' } }] },
  { set: { local: 'fc_score' }, value: { clamp: [{ subtract: [{ local: 'fc_score' }, { local: 'fc_amount' }] }, 0, 100] } },
  { call_macro: 'multipatient registry manual lifescore override', params: { slot: { param: 'patient' }, score: { local: 'fc_score' } }, result: 'fc_done' },
  { if: { local: 'fc_done' }, ne: 1, then: [
    { if: { param: 'patient' }, eq: 1, then: [{ set: { local: 'LIFESCORE' }, value: { local: 'fc_score' } }] },
    { if: { param: 'patient' }, eq: 2, then: [{ set: { local: 'LIFESCORE2' }, value: { local: 'fc_score' } }] },
    { if: { param: 'patient' }, eq: 3, then: [{ set: { local: 'LIFESCORE3' }, value: { local: 'fc_score' } }] }
  ] },
  { return: 1 }
];

const text = { G: 'FLIGHT LIMIT: vertical load too high for the patient.', BANK: 'FLIGHT LIMIT: too much bank for the patient.', PITCH: 'FLIGHT LIMIT: nose too high for the patient.', ALT: 'FLIGHT LIMIT: too high for the patient.', GX: 'FLIGHT LIMIT: sideways load too high for the patient.', GZ: 'FLIGHT LIMIT: braking or acceleration too hard for the patient.', PDOWN: 'FLIGHT LIMIT: nose too low for the patient.', NOISE: 'FLIGHT LIMIT: engine and rotor noise is hurting the patient.' };
const tablet = Object.keys(text).map((k) => ({ if: { param: 'kind' }, eq: k, then: [{ call_macro: 'post dispatcher message', params: { from: 'crew', text: text[k] } }] }));

const mod = {
  'flight constraints start': [
    { '#comment': 'Flight constraints (doctor review v2). Started by objective1 at every load; the loop waits for the option FLIGHT_CONSTRAINTS = yes (default no until the runtime test) and for a patient on the stretcher.' },
    { if: { local: 'fc_running' }, ne: 1, then: [
      { set: { local: 'fc_running' }, value: 1 },
      { create_thread: { commands: [{ call_macro: 'flight constraints loop' }] } }
    ] }
  ],
  'flight constraints loop': [
    { while: 1, gt: 0, do: [
      { wait_for: { global: 'FLIGHT_CONSTRAINTS' }, eq: 'yes' },
      { if: g('L:{local:HXX}_SDK_CABIN_PAX_5'), eq: 2, then: [
        { call_macro: 'flight constraints sample' }, { sleep: 0.5 }
      ], else: [
        { call_macro: 'flight constraints reset' }, { sleep: 2 }
      ] }
    ] }
  ],
  'flight constraints reset': [
    { set: { local: 'fc_pickup_alt' }, value: null },
    ...['G', 'GX', 'GZ', 'NOISE', 'BANK', 'PITCH', 'PDOWN', 'ALT'].flatMap((k) => [{ set: { local: 'fc_state_' + k }, value: 0 }, { set: { local: 'fc_cd_' + k }, value: 0 }]),
    { set: { local: 'fc_clear_due' }, value: 0 }
  ],
  'flight constraints sample': sample,
  'flight constraints limits': [
    { '#comment': 'Limits of the profile in param profile (v1 values of the doctor package: vertical load deviation from 1 g in ft/s2, bank and pitch up in radians, altitude relative to the pickup and absolute in ft).' },
    ...limits
  ],
  'flight constraints penalty': penalty,
  'flight constraints tablet': tablet,
  'fit patient headset': [
    { '#comment': 'Free action of the HEMS medical page (Andrew 2026-11-21): hearing protection for the patient in param patient. Never a mandatory step. The flight constraint NOISE ignores a patient with the headset.' },
    { if: { param: 'patient' }, eq: 1, then: [{ set: { local: 'P1_HEADSET' }, value: 1 }] },
    { if: { param: 'patient' }, eq: 2, then: [{ set: { local: 'P2_HEADSET' }, value: 1 }] },
    { if: { param: 'patient' }, eq: 3, then: [{ set: { local: 'P3_HEADSET' }, value: 1 }] },
    { call_macro: 'post dispatcher message', params: { from: 'crew', text: 'Headset fitted on the patient.' } },
    { call_macro: 'sync medical patient display' }
  ],
};
fs.writeFileSync(root + '25-flight-constraints.json', JSON.stringify(mod, null, 2) + '\n');

// ---- wiring of the option FLIGHT_CONSTRAINTS (first run only: pass --wire; the wiring is already in the sources) ----
if (!process.argv.includes('--wire')) { console.log('module written, wiring skipped'); process.exit(0); }
patch(root + '01-bootstrap-settings.json',
  '    {"if": {"global":"SPEECH_TIPS"}, "eq": null,',
  '    {"if": {"global":"FLIGHT_CONSTRAINTS"}, "eq": null,\n      "then": [\n        {"set":{"global":"FLIGHT_CONSTRAINTS"},"value":"no"}\n    ]},\n    {"if": {"global":"SPEECH_TIPS"}, "eq": null,');
patch(root + '02-save-load-presets.json',
  '    {"set":{"table":{"static":{"param":"PROFILE_TABLE"}},"key":"SPEECH_COMMANDS"},"value":{"global":"SPEECH_COMMANDS"}},',
  '    {"set":{"table":{"static":{"param":"PROFILE_TABLE"}},"key":"SPEECH_COMMANDS"},"value":{"global":"SPEECH_COMMANDS"}},\n    {"set":{"table":{"static":{"param":"PROFILE_TABLE"}},"key":"FLIGHT_CONSTRAINTS"},"value":{"global":"FLIGHT_CONSTRAINTS"}},');
patch(root + '02-save-load-presets.json',
  '        {"set":{"global":"SPEECH_COMMANDS"},"value":{"table":{"static":{"param":"PROFILE_TABLE"}},"key":"SPEECH_COMMANDS"}},',
  '        {"set":{"global":"SPEECH_COMMANDS"},"value":{"table":{"static":{"param":"PROFILE_TABLE"}},"key":"SPEECH_COMMANDS"}},\n        {"set":{"global":"FLIGHT_CONSTRAINTS"},"value":{"table":{"static":{"param":"PROFILE_TABLE"}},"key":"FLIGHT_CONSTRAINTS"}},');
patch(root + '02-save-load-presets.json',
  '    {"set":{"global":"SPEECH_COMMANDS"},"value":null},',
  '    {"set":{"global":"SPEECH_COMMANDS"},"value":null},\n    {"set":{"global":"FLIGHT_CONSTRAINTS"},"value":null},');
patch(root + '03-aircraft-crew-checklists.json',
  '    {"set":{"global":"SPEECH_COMMANDS"},"value":"yes"},',
  '    {"set":{"global":"SPEECH_COMMANDS"},"value":"yes"},\n    {"set":{"global":"FLIGHT_CONSTRAINTS"},"value":"no"},', true);
const tab = '        {"text":"(P)FLIGHT CONSTRAINTS: while a patient lies on the stretcher the mission watches the flight against the limits of the pathology: altitude above 3000 ft, vertical load, bank and nose-up pitch. The crew warns you; beyond the limit the patient loses SpO2 or lifescore. OFF by default until tested in the simulator.","show_condition":{"require":{"local":"tab7"},"ne":0}},\n        {"buttonbar":[{"title":"OFF (DEFAULT)","select_condition":{"require":{"global":"FLIGHT_CONSTRAINTS"},"ne":"yes"},"commands":[{"set":{"global":"FLIGHT_CONSTRAINTS"},"value":"no"},{"call_macro":"mark aircraft profile custom"}]},{"title":"ON","select_condition":{"require":{"global":"FLIGHT_CONSTRAINTS"},"eq":"yes"},"commands":[{"set":{"global":"FLIGHT_CONSTRAINTS"},"value":"yes"},{"call_macro":"mark aircraft profile custom"},{"call_macro":"flight constraints start"}]}],"show_condition":{"require":{"local":"tab7"},"ne":0}},\n';
patch(root + '04-dispatch-tablet-ui.json', '        {"text":"(P)CALL SIGN of the helicopter in the texts of the tablet', tab + '        {"text":"(P)CALL SIGN of the helicopter in the texts of the tablet');
patch(root + '07-patient-medical.json', '  "initialize patient extra clinical state": [\n',
  '  "initialize patient extra clinical state": [\n    {"if": {"param":"patient"}, "eq": 1, "then": [{"set":{"local":"P1_FC_PROFILE"},"value":{"param":"profile","path":"flight_constraint_profile"}}]},\n    {"if": {"param":"patient"}, "eq": 2, "then": [{"set":{"local":"P2_FC_PROFILE"},"value":{"param":"profile","path":"flight_constraint_profile"}}]},\n    {"if": {"param":"patient"}, "eq": 3, "then": [{"set":{"local":"P3_FC_PROFILE"},"value":{"param":"profile","path":"flight_constraint_profile"}}]},\n');
console.log('macro module and wiring written');
