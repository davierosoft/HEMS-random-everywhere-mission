#!/usr/bin/env node
'use strict';
// One-shot, idempotent source migration for the manual treatment patch (Dr.DougRoss FINAL 2026-11-13).
// Rewrites the manual-treatment families of mission-src/macros/07 from the template, replaces the static
// phase buttons of `patient health`, wires the new clinical locals (init, snapshot, restore, display) and
// the effective manual mode helper. Run `node tools/mission-formatter.js sources` afterwards.
// Documentation: docs/architecture/MANUAL_TREATMENT_PATCH.md

const fs = require('fs');
const path = require('path');
const { buildFamily, buildSharedMacros } = require('./lib/manual-treatment-families.js');
const { buildRegistryAction } = require('./lib/manual-treatment-registry.js');
const { PROFILE_BUTTONS, WRONG_SETS } = require('./lib/manual-treatment-template.js');

const root = path.resolve(__dirname, '..');
const file = (name) => path.join(root, 'mission-src', 'macros', name);
const load = (name) => JSON.parse(fs.readFileSync(file(name), 'utf8'));
const save = (name, obj) => fs.writeFileSync(file(name), JSON.stringify(obj, null, 2) + '\n');

const L = (n) => ({ local: n });
const setL = (n, v) => ({ set: { local: n }, value: v });

function walk(node, visit) {
  if (Array.isArray(node)) { node.forEach((x) => walk(x, visit)); return; }
  if (node && typeof node === 'object') { visit(node); Object.values(node).forEach((x) => walk(x, visit)); }
}

// ---------------------------------------------------------------- 07 patient medical
const m07 = load('07-patient-medical.json');

for (const n of [1, 2, 3]) Object.assign(m07, buildFamily(n));
Object.assign(m07, buildSharedMacros());

// Dispatcher of the phase buttons: slot instead of the correct flag.
m07['manual current patient treatment choice'] = [1, 2, 3].map((n) => ({
  if: L('manual_active_patient'), eq: n,
  then: [{ call_macro: `manual patient${n} treatment choice`, params: { slot: { param: 'slot' }, label: { param: 'label' } } }]
}));

// Effective manual mode wherever the single global was read for a patient.
const effLocal = (n) => `P${n}_MANUAL_MODE_EFF`;
function replaceModeInPatientMacro(name, resolver) {
  const macro = m07[name];
  if (!macro) throw new Error(`missing ${name}`);
  walk(macro, (o) => {
    for (const key of ['require', 'if']) {
      if (o[key] && o[key].global && /^P[123]_MANUAL_MEDICAL_MODE$/.test(o[key].global)) {
        const n = resolver(o[key].global);
        o[key] = { local: n };
      }
    }
  });
}
replaceModeInPatientMacro('select patient1 transport', () => effLocal(1));
replaceModeInPatientMacro('crew physical HEMS assessment', (g) => effLocal(Number(g[1])));
// Always recompute the effective mode right before it is read (the option or the action count may have changed).
const refreshCall = (n) => ({ call_macro: 'refresh effective manual mode', params: { patient: n } });
function insertRefreshAfterCrewFlag(commands) {
  for (let i = 0; i < commands.length; i++) {
    const c = commands[i];
    if (c && c.set && /^crewvisiting[123]$/.test(c.set.local || '') && c.value === 'yes') {
      const n = Number(c.set.local.slice(-1));
      const next = commands[i + 1];
      if (!(next && next.call_macro === 'refresh effective manual mode')) commands.splice(i + 1, 0, refreshCall(n));
    }
    if (c && typeof c === 'object') for (const v of Object.values(c)) { if (Array.isArray(v)) insertRefreshAfterCrewFlag(v); }
  }
}
insertRefreshAfterCrewFlag(m07['crew physical HEMS assessment']);
if (!m07['select patient1 transport'].some((c) => c.call_macro === 'refresh effective manual mode')) m07['select patient1 transport'].unshift(refreshCall(1));
// stabilize: slot-dependent
{
  const macro = m07['stabilize medical patient for transport'];
  walk(macro, (o) => {
    if (o.require && o.require.global === 'P1_MANUAL_MEDICAL_MODE') o.require = { local: 'stabilize_mode_eff' };
  });
  if (!JSON.stringify(macro).includes('stabilize_mode_eff"},"value"') && !macro.some((c) => c.set && c.set.local === 'stabilize_mode_eff')) {
    macro.unshift(
      refreshCall(1), refreshCall(2), refreshCall(3),
      setL('stabilize_mode_eff', L(effLocal(1))),
      { if: { param: 'slot' }, eq: 2, then: [setL('stabilize_mode_eff', L(effLocal(2)))] },
      { if: { param: 'slot' }, eq: 3, then: [setL('stabilize_mode_eff', L(effLocal(3)))] }
    );
  }
}

// patient health: dynamic phase buttons (one static button per slot and label), effective mode, arrest rhythm row.
{
  const page = m07['patient health'];
  const dispatch = page.find((c) => Array.isArray(c.set_dispatch)).set_dispatch;
  const isPhaseBar = (row) => Array.isArray(row.buttonbar) && JSON.stringify(row.buttonbar).includes('manual current patient treatment choice');
  const first = dispatch.findIndex(isPhaseBar);
  if (first >= 0) {
    const labelsForSlot = (k) => [...new Set([...Object.values(PROFILE_BUTTONS), ...WRONG_SETS.map((s) => s[k - 1])])];
    const buttons = [];
    for (const k of [1, 2, 3, 4]) {
      for (const label of labelsForSlot(k)) {
        buttons.push({
          title: label,
          commands: [{ call_macro: 'manual current patient treatment choice', params: { slot: k, label } }],
          show_condition: { and: [
            { require: L('medical_display_manual_active'), eq: 'yes' },
            { require: L('medical_display_manual_choose_visible'), eq: 1 },
            { require: L(`medical_display_manual_slot${k}_label`), eq: label }
          ], eq: 1 }
        });
      }
    }
    const bar = { buttonbar: buttons, show_condition: { require: L('medical_display_manual_choose_visible'), eq: 1 } };
    const rows = dispatch.filter((r, i) => !isPhaseBar(r) || i === first);
    rows[rows.indexOf(dispatch[first])] = bar;
    dispatch.splice(0, dispatch.length, ...rows);
  }
  walk(page, (o) => {
    if (o.require && o.require.global === 'P1_MANUAL_MEDICAL_MODE') o.require = L('medical_display_manual_mode');
  });
  // Arrest rhythm shown from the start (VF, pVT, PEA, asystole).
  const hasArrestRow = dispatch.some((r) => r.text === 'CARDIAC ARREST RHYTHM: {0}');
  if (!hasArrestRow) {
    const idx = dispatch.findIndex((r) => r.text === 'MEDICAL ACTIONS');
    dispatch.splice(idx < 0 ? dispatch.length : idx, 0, {
      text: 'CARDIAC ARREST RHYTHM: {0}', color: 'red', params: [L('medical_display_arrest_rhythm')],
      show_condition: { and: [{ require: L('medical_display_arrest_rhythm'), ne: null }, { require: L('medical_display_report_finalized'), ne: 'yes' }], eq: 1 }
    });
  }
}

// Pathology engine (patient 1): the new clinical locals follow the health row.
{
  const engine = m07['pathology random engine'];
  let done = false;
  walk(engine, (o) => {
    if (Array.isArray(o)) return;
  });
  const patch = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      if (c && c.call_macro === 'initialize patient extra clinical state') done = true;
      if (c && c.call_macro === 'initialize patient1 physiology' && !done) {
        arr.splice(i, 0, { call_macro: 'initialize patient extra clinical state', params: { patient: 1, profile: { param: 'myhealth1' } } });
        done = true; return true;
      }
      for (const v of Object.values(c || {})) {
        if (Array.isArray(v) && patch(v)) return true;
        if (v && typeof v === 'object' && !Array.isArray(v)) for (const w of Object.values(v)) if (Array.isArray(w) && patch(w)) return true;
      }
    }
    return false;
  };
  patch(engine);
  if (!done) throw new Error('engine: initialize patient1 physiology call not found');
}

// Mode toggle buttons refresh the effective mode (04 handled below).
save('07-patient-medical.json', m07);

// ---------------------------------------------------------------- 17 multipatient runtime
const m17 = load('17-multipatient-runtime.json');
m17['multipatient registry physiology action'] = buildRegistryAction();
{
  // Registry crew clinical completion: effective mode of the patient.
  const macro = m17['multipatient registry crew clinical completion'];
  const patientBranches = macro.filter((c) => c.if && c.if.param === 'patient');
  for (const branch of patientBranches) {
    const n = branch.eq;
    walk(branch, (o) => {
      if (o.require && o.require.global === 'P1_MANUAL_MEDICAL_MODE') o.require = L(effLocal(n));
    });
    if (!branch.then.some((c) => c.call_macro === 'refresh effective manual mode')) branch.then.unshift({ call_macro: 'refresh effective manual mode', params: { patient: n } });
  }
  // Live clinical profile: init the new locals from the health row.
  const live = m17['multipatient registry live clinical profile'];
  for (const branch of live.filter((c) => c.if && c.if.param === 'patient')) {
    const n = branch.eq;
    if (!JSON.stringify(branch).includes('initialize patient extra clinical state')) {
      branch.then.push({ call_macro: 'initialize patient extra clinical state', params: { patient: n, profile: { param: 'profile' } } });
    }
  }
  // Snapshot.
  const extra = (n) => [`P${n}_GLUCOSE`, `P${n}_ECG_RHYTHM`, `P${n}_CRIT_BLEED`, `P${n}_PLAUSIBLE_POOL`];
  walk(m17, (o) => {
    if (o.create_struct && Object.hasOwn(o.create_struct, 'P1_MEDICAL_ACTION_COUNT')) {
      for (const n of [1, 2, 3]) for (const k of extra(n)) o.create_struct[k] = L(k);
    }
  });
  // Restore.
  const restoreCond = (n) => ({ if: { param: 'saved_clinical', path: `P${n}_MEDICAL_ACTION_1_PROFILE` }, ne: null });
  const hasRestore = (arr, n) => arr.some((c) => c && c.if && c.if.param === 'saved_clinical' && c.if.path === `P${n}_GLUCOSE`);
  walk(m17, (o) => {
    for (const key of Object.keys(o)) {
      const arr = o[key];
      if (!Array.isArray(arr)) continue;
      for (const n of [1, 2, 3]) {
        const idx = arr.findIndex((c) => c && c.if && c.if.param === 'saved_clinical' && c.if.path === `P${n}_MEDICAL_ACTION_1_PROFILE`);
        if (idx >= 0 && !hasRestore(arr, n)) {
          const items = extra(n).map((k) => ({ if: { param: 'saved_clinical', path: k }, ne: null, then: [setL(k, { param: 'saved_clinical', path: k })] }));
          items.push({ call_macro: 'refresh effective manual mode', params: { patient: n } });
          arr.splice(idx + 1, 0, ...items);
        }
      }
    }
  });
  void restoreCond;
}
save('17-multipatient-runtime.json', m17);

// ---------------------------------------------------------------- 04 dispatch tablet UI
const m04 = load('04-dispatch-tablet-ui.json');
{
  const sync = m04['sync medical patient display'];
  const patientNo = { 1: 1, 2: 2, 3: 3 };
  const branches = sync.filter((c) => c.if && c.if.local === 'medical_display_patient' && [1, 2, 3].includes(c.eq));
  for (const branch of branches) {
    const n = patientNo[branch.eq];
    const at = branch.then.findIndex((c) => c.set && c.set.local === 'medical_display_manual_wrong_set');
    if (at < 0) throw new Error('sync: wrong_set row not found');
    if (JSON.stringify(branch.then).includes('medical_display_manual_slot1_label')) continue;
    const add = [];
    for (const k of [1, 2, 3, 4]) add.push(setL(`medical_display_manual_slot${k}_label`, L(`manual_p${n}_slot${k}_label`)));
    add.push(setL('medical_display_manual_mode', L(effLocal(n))));
    add.push(setL('medical_display_arrest_rhythm', null));
    for (const r of ['VF', 'pVT', 'PEA', 'ASYSTOLE']) {
      add.push({ if: L(`P${n}_ECG_RHYTHM`), eq: r, then: [setL('medical_display_arrest_rhythm', L(`P${n}_ECG_RHYTHM`))] });
    }
    branch.then.splice(at + 1, 0, ...add);
  }
  if (!JSON.stringify(sync).includes('medical_display_manual_choose_visible')) {
    const at = sync.findIndex((c) => c['#comment'] && c['#comment'].startsWith('Every render of a patient page'));
    sync.splice(at, 0,
      setL('medical_display_manual_choose_visible', 0),
      {
        if: { and: [
          { require: L('medical_display_manual_mode'), eq: 'manual' },
          { require: L('medical_display_manual_active'), eq: 'yes' },
          { require: L('medical_display_manual_state'), eq: 'choose' },
          { require: L('medical_display_visited'), eq: 'yes' },
          { require: L('medical_display_patientlife'), ne: 'died' },
          { require: L('medical_display_report_finalized'), ne: 'yes' },
          { require: L('manual_active_patient'), eq: L('medical_display_patient') }
        ] }, eq: 1,
        then: [setL('medical_display_manual_choose_visible', 1)]
      },
      {
        if: { and: [{ require: L('medical_display_manual_profile'), eq: 'resuscitation' }, { require: L('medical_display_cpr_active'), ne: 1 }] }, eq: 1,
        then: [setL('medical_display_manual_choose_visible', 0)]
      });
  }
  // AUTOMATIC / MANUAL buttons refresh the effective mode of the three patients.
  walk(m04, (o) => {
    if (Array.isArray(o.buttonbar)) {
      for (const b of o.buttonbar) {
        if ((b.title === 'AUTOMATIC' || b.title === 'MANUAL') && JSON.stringify(b.commands).includes('P1_MANUAL_MEDICAL_MODE')
          && !JSON.stringify(b.commands).includes('refresh effective manual mode')) {
          for (const n of [1, 2, 3]) b.commands.push({ call_macro: 'refresh effective manual mode', params: { patient: n } });
        }
      }
    }
  });
}
save('04-dispatch-tablet-ui.json', m04);
console.log('manual treatment macros migrated');
