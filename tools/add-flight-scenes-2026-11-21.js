// One-shot data merge (2026-11-21): 5 new scenes (ID_CARD 75-79) and the pathology tables health108-health112 of the doctor's v2 review.
// Idempotent: skips what exists. Texts are ASCII only. Run: node tools/add-flight-scenes-2026-11-21.js --write
const fs = require('fs');
const accPath = 'mission-src/data/02-waypoints-and-categories.json';
const hpPath = 'mission-src/data/05b-health-profiles-continued.json';
const write = process.argv.includes('--write');
const acc = JSON.parse(fs.readFileSync(accPath, 'utf8'));
const hp = JSON.parse(fs.readFileSync(hpPath, 'utf8'));
const byCard = id => acc.accidents.find(a => a.ID_CARD === id);

const POOL = ['thermal_support','hemorrhage_control','allergic_support','resuscitation','trauma_check','vasopressor','immobilise','iv_fluids','defibrillation','give_glucose','critical_bleeding','tourniquet','antidote_therapy'];
const A = {
  assessment: 'Primary survey (A-E) and focused assessment',
  oxygen: 'Oxygenation',
  iv: 'Establish IV access',
  pain: 'Give pain medication',
  ecg: 'Record 12-lead ECG',
  neuro: 'Neurological check (GCS and pupils)',
  airway: 'Secure the airway',
  immob: 'Immobilise spine and pelvis',
  fluids: 'Give IV fluids',
  vaso: 'Give vasopressor',
  trauma: 'Check for fractures and internal injuries',
  decomp: 'Chest decompression (mini thoracostomy)',
  bleed: 'Control external bleeding',
  magnes: 'Give anticonvulsant therapy',
  resus: 'Start or continue resuscitation (CPR)',
};
const P = { [A.assessment]:'assessment',[A.oxygen]:'oxygen_support',[A.iv]:'iv_access',[A.pain]:'pain_relief',[A.ecg]:'ecg',[A.neuro]:'neurological_support',[A.airway]:'airway_support',[A.immob]:'immobilise',[A.fluids]:'iv_fluids',[A.vaso]:'vasopressor',[A.trauma]:'trauma_check',[A.decomp]:'airway_support',[A.bleed]:'hemorrhage_control',[A.magnes]:'neurological_support',[A.resus]:'resuscitation' };

function row(type, o) {
  const r = {
    id: o.id, type, smoke: 'no', fire: 'no', medical_symptoms: o.symptoms, diagnosis: o.diagnosis,
    sex: o.sex, agemin: o.age[0], agemax: o.age[1], scoremin: o.score[0], scoremax: o.score[1], decr_rate: o.decr,
    spo2: o.spo2[2], bpm: o.bpm[2],
    gcs_eye_min: o.gcs[0], gcs_eye_max: o.gcs[1], gcs_verbal_min: o.gcs[0], gcs_verbal_max: o.gcs[1], gcs_motor_min: o.gcs[2], gcs_motor_max: o.gcs[3],
    spo2_min: o.spo2[0], spo2_max: o.spo2[1], bpm_min: o.bpm[0], bpm_max: o.bpm[1],
    bp_sys_min: o.bps[0], bp_sys_max: o.bps[1], bp_dia_min: o.bpd[0], bp_dia_max: o.bpd[1],
    rr_min: o.rr[0], rr_max: o.rr[1], temp_min: 36.2, temp_max: 37.5,
    medical_action_count: o.actions.length,
  };
  o.actions.forEach((t, i) => { r['medical_action_' + (i + 1)] = t; });
  o.actions.forEach((t, i) => { r['medical_action_' + (i + 1) + '_profile'] = P[t]; });
  Object.assign(r, { manual_treatment: 'manual', glucose_min: 80, glucose_max: 140, ecg_rhythm: o.ecg, critical_bleeding_chance: o.bleed || 0,
    plausible_wrong_pool: POOL.filter(p => !o.actions.map(t => P[t]).includes(p)),
    sequence_profiles: '|' + o.actions.map(t => P[t]).join('|') + '|',
    flight_constraint_profile: o.fc });
  return r;
}

const tables = {
  health108: [
    row(108, { id: 'Diver with joint pain and rash after ascent', symptoms: 'Reported feeling unwell', diagnosis: 'Decompression sickness', sex: 'male', age: [22, 55], score: [40, 60], decr: 1, spo2: [90, 96, 94], bpm: [90, 120, 100], gcs: [3, 4, 5, 6], bps: [105, 130], bpd: [65, 85], rr: [16, 26], ecg: 'TACHYCARDIA', fc: 'FC_DIVE_DCS',
      actions: [A.assessment, A.oxygen, A.neuro, A.iv, A.fluids] }),
    row(108, { id: 'Diver collapsed seconds after surfacing', symptoms: 'Reported loss of consciousness', diagnosis: 'Arterial gas embolism', sex: 'female', age: [22, 55], score: [30, 50], decr: 2, spo2: [85, 93, 90], bpm: [95, 130, 110], gcs: [2, 3, 3, 5], bps: [95, 125], bpd: [60, 80], rr: [12, 28], ecg: 'TACHYCARDIA', fc: 'FC_DIVE_DCS',
      actions: [A.assessment, A.oxygen, A.neuro, A.iv, A.resus] }),
  ],
  health109: [
    row(109, { id: 'Driver with chest trauma after motorway crash', symptoms: 'Reported breathing difficulty', diagnosis: 'Tension pneumothorax after blunt chest trauma', sex: 'male', age: [25, 70], score: [30, 50], decr: 3, spo2: [80, 90, 85], bpm: [110, 140, 125], gcs: [3, 4, 5, 6], bps: [85, 110], bpd: [55, 75], rr: [28, 36], ecg: 'TACHYCARDIA', fc: 'FC_GAS_UNTREATED',
      actions: [A.assessment, A.trauma, A.decomp, A.oxygen, A.iv, A.pain] }),
  ],
  health110: [
    row(110, { id: 'Person who dived into a shallow pool', symptoms: 'Reported neck pain and numbness', diagnosis: 'Cervical spine injury with neurogenic shock', sex: 'male', age: [16, 45], score: [30, 55], decr: 2, spo2: [90, 96, 94], bpm: [40, 55, 48], gcs: [3, 4, 5, 6], bps: [70, 90], bpd: [40, 60], rr: [12, 22], ecg: 'BRADYCARDIA', fc: 'FC_SPINE_FRACTURE',
      actions: [A.assessment, A.immob, A.airway, A.iv, A.vaso, A.fluids] }),
  ],
  health111: [
    row(111, { id: 'Pregnant woman with seizure at home', symptoms: 'Reported seizure', diagnosis: 'Eclampsia in late pregnancy', sex: 'female', age: [20, 40], score: [30, 55], decr: 2, spo2: [92, 97, 95], bpm: [90, 120, 105], gcs: [2, 3, 3, 5], bps: [170, 200], bpd: [100, 120], rr: [16, 28], ecg: 'TACHYCARDIA', fc: 'FC_OBSTETRIC',
      actions: [A.assessment, A.airway, A.magnes, A.iv, A.ecg] }),
  ],
  health112: [
    row(112, { id: 'Person collapsed with tearing chest pain', symptoms: 'Reported chest pain', diagnosis: 'Acute aortic dissection', sex: 'male', age: [45, 80], score: [30, 55], decr: 2, spo2: [92, 97, 95], bpm: [90, 120, 105], gcs: [3, 4, 5, 6], bps: [180, 220], bpd: [100, 125], rr: [16, 26], ecg: 'TACHYCARDIA', fc: 'FC_AORTA',
      actions: [A.assessment, A.ecg, A.pain, A.iv, A.vaso] }),
    row(112, { id: 'Person with unstable pelvis after a fall', symptoms: 'Reported injury', diagnosis: 'Unstable pelvic fracture with haemorrhagic shock', sex: 'female', age: [20, 80], score: [30, 55], decr: 3, spo2: [90, 95, 93], bpm: [120, 150, 135], gcs: [3, 4, 5, 6], bps: [70, 90], bpd: [40, 60], rr: [22, 32], ecg: 'TACHYCARDIA', fc: 'FC_SPINE_FRACTURE', bleed: 40,
      actions: [A.assessment, A.immob, A.bleed, A.fluids, A.pain, A.iv] }),
  ],
};

const scenes = [
  { card: 75, from: 64, name: 'Diving accident at the lake', cat: 'SPORT', camping: 52, path: 108,
    general: 'Info: A diver became ill after a dive. Medical assistance is required.',
    d: ['A diver felt unwell after surfacing at the dive site. Urgent medical assistance has been requested.',
        'Dive centre reports a diver with joint pain and a skin rash after a deep dive.',
        'A diver collapsed a few seconds after surfacing. The dive buddy requests an urgent medical team.',
        'Call from a dive boat: a diver has difficulty breathing and cannot move one arm after a rapid ascent.'],
    obj: 'Objective: Fly to the dive site and provide assistance. Fly low and gently, then deliver the diver to a hospital with a pressure chamber if needed.' },
  { card: 76, from: 69, name: 'Chest trauma after a motorway crash', cat: 'RTC', camping: 53, type: 34, path: 109, injured: 1,
    general: 'Info: Motorway crash with a driver with severe chest trauma.',
    d: ['A driver was injured in a crash on the motorway and has severe difficulty breathing.',
        'Motorway crash. One injured with chest pain and breathing difficulty. Situation unclear.',
        'A car left the motorway. The driver complains of chest pain and shortness of breath.',
        'Emergency call from the motorway: injured driver with chest trauma, increasingly breathless.'],
    obj: 'Objective: Fly to the site and provide assistance. Treat the chest injury, then deliver the patient to a trauma centre.' },
  { card: 77, from: 33, name: 'Dive into a shallow pool', cat: 'MEB', camping: 54, path: 110,
    general: 'Info: A person dived into a shallow pool and cannot move.',
    d: ['A person dived into a shallow pool in a garden and cannot move arms and legs.',
        'Garden accident. A person hit the bottom of a pool after diving in. Urgent medical assistance has been requested.',
        'Injured person at a private pool. They complain of neck pain and numbness.',
        'Call from a garden: a swimmer was pulled out of a shallow pool, the neck seems injured.'],
    obj: 'Objective: Fly to the site and provide assistance. Keep the spine immobilised and fly gently while the patient is aboard.' },
  { card: 78, from: 28, name: 'Seizure in late pregnancy at home', cat: 'MEB', camping: 55, path: 111,
    general: 'Info: A seizure in late pregnancy at home.',
    d: ['A pregnant woman had a seizure at home. Urgent medical assistance has been requested.',
        'Family reports a woman in late pregnancy with headache, vision problems and a seizure.',
        'A family member calls: a pregnant relative collapsed and had convulsions at the house.',
        'Rural house. A woman in the last weeks of pregnancy is confused after a seizure.'],
    obj: 'Objective: Fly to the site and provide assistance. Keep the patient calm and deliver her to a hospital with an obstetric unit.' },
  { card: 79, from: 58, name: 'Collapse in the square at the railway station', cat: 'MEO', camping: 56, path: 112,
    general: 'Info: A person collapsed in the square in front of a railway station.',
    d: ['A person collapsed in the square in front of the railway station with severe chest and back pain.',
        'Passers-by report a person with tearing chest pain on the station square. The nearest hospital has no cardiac surgery.',
        'Call from the station square: a person fell and cannot stand, the pelvis seems unstable.',
        'Bystanders call for help in the station square. An emergency doctor requests a helicopter to a specialised centre.'],
    obj: 'Objective: Fly to the site and provide assistance. Then deliver the patient to the specialised centre, not to the nearest hospital.' },
];

const demo = [{ id: 75, age_min: 22, age_max: 55 }, { id: 76, age_min: 25, age_max: 70 }, { id: 77, age_min: 16, age_max: 45 }, { id: 78, age_min: 20, age_max: 40 }, { id: 79, age_min: 20, age_max: 80 }];
for (const dm of demo) if (!acc['accident demographics'].some(x => x.id === dm.id)) acc['accident demographics'].push(dm);
let added = 0;
for (const [k, rows] of Object.entries(tables)) if (!hp[k]) { hp[k] = rows; added++; }
for (const s of scenes) {
  if (byCard(s.card)) continue;
  const t = JSON.parse(JSON.stringify(byCard(s.from)));
  const e = Object.assign(t, {
    id: 'ID:' + s.card + '/ ' + s.name, name: s.name, general_description: s.general,
    description1: s.d[0], description2: s.d[1], description3: s.d[2], description4: s.d[3], objective: s.obj,
    pathologytype1: s.path, pathologytype2: s.path, pathologytype3: s.path, pathologytype4: s.path,
    browse_category1: s.cat, camping: s.camping, type: s.type !== undefined ? s.type : t.type, ID_CARD: s.card, max_injured: 1,
  });
  delete e.age_min; delete e.age_max;
  acc.accidents.push(e); added++;
}
console.log('added', added, 'accidents', acc.accidents.length);
if (write) { fs.writeFileSync(accPath, JSON.stringify(acc, null, 2) + '\n'); fs.writeFileSync(hpPath, JSON.stringify(hp, null, 2) + '\n'); }
