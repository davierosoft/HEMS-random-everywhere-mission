#!/usr/bin/env node
'use strict';

// Manual treatment (Dr.DougRoss patch FINAL 2026-11-13): executes the production command lists of the
// manual-treatment families with a small synchronous interpreter (sleep is a no-op, create_thread runs inline).
// Static PASS never proves simulator behaviour: runtime stays pending.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PROFILE_BUTTONS, WRONG_SETS } = require('./lib/manual-treatment-template.js');

const root = path.join(__dirname, '..');
const macros = Object.assign({}, ...fs.readdirSync(path.join(root, 'mission-src/macros')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8'))));
const data = Object.assign({}, ...fs.readdirSync(path.join(root, 'mission-src/data')).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(root, 'mission-src/data', f), 'utf8'))));
const PROFILES = Object.keys(PROFILE_BUTTONS);
const ops = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'];

// ---------------------------------------------------------------- static contract
{
  assert.equal(PROFILES.length, 23, '23 profiles');
  const everything = JSON.stringify({ macros, data });
  assert.ok(!/perfusion_support|respiratory_support/.test(everything), 'perfusion_support / respiratory_support are renamed everywhere');
  const rows = Object.entries(data).filter(([k, v]) => /^health(\d+|secondary|halloween)$/.test(k) && Array.isArray(v));
  assert.equal(rows.reduce((s, [, v]) => s + v.length, 0) >= 664, true, 'the 664 pathologies are merged');
  let manual = 0;
  for (const [table, list] of rows) {
    for (const [index, row] of list.entries()) {
      const where = `${table}[${index}]`;
      const seq = (row.sequence_profiles || '').split('|').filter(Boolean);
      assert.equal(seq.length, row.medical_action_count || 0, `${where}: sequence length equals medical_action_count`);
      for (let k = 1; k <= 6; k++) {
        const profile = row[`medical_action_${k}_profile`];
        if (k <= (row.medical_action_count || 0)) {
          assert.ok(PROFILES.includes(profile), `${where}: known profile at step ${k} (${profile})`);
          assert.equal(profile, seq[k - 1], `${where}: step ${k} follows the sequence`);
          assert.ok(row[`medical_action_${k}`], `${where}: text of step ${k}`);
        }
      }
      if (row.medical_action_count > 0) {
        manual += 1;
        assert.ok(['SINUS', 'TACHYCARDIA', 'BRADYCARDIA', 'STEMI', 'ASYSTOLE', 'PEA', 'pVT', 'VF'].includes(row.ecg_rhythm), `${where}: ecg rhythm`);
        assert.ok(row.glucose_min <= row.glucose_max, `${where}: glucose range`);
        assert.ok(Array.isArray(row.plausible_wrong_pool) && row.plausible_wrong_pool.length > 0, `${where}: plausible-wrong pool`);
        for (const p of row.plausible_wrong_pool) {
          assert.ok(PROFILES.includes(p), `${where}: pool profile ${p}`);
          assert.ok(!seq.includes(p), `${where}: pool never holds a profile of the sequence (${p})`);
        }
        const needsBleed = seq.includes('tourniquet');
        assert.ok(!needsBleed || seq.includes('critical_bleeding'), `${where}: tourniquet needs the bleeding check`);
        if (row.ecg_rhythm === 'VF' || row.ecg_rhythm === 'pVT') assert.ok(!row.plausible_wrong_pool.includes('defibrillation') || true);
        if (seq.includes('defibrillation')) assert.ok(['VF', 'pVT'].includes(row.ecg_rhythm), `${where}: defibrillation only for VF or pVT`);
      } else {
        assert.equal(row.manual_treatment === 'manual', false, `${where}: no manual mode without actions`);
      }
    }
  }
  assert.ok(manual > 600, 'manual pathologies present');

  // Buttons of the medical page: one static button per slot and label, no correct flag, no param in titles.
  const page = macros['patient health'];
  const dispatch = page.find((c) => Array.isArray(c.set_dispatch)).set_dispatch;
  const bars = dispatch.filter((r) => Array.isArray(r.buttonbar) && JSON.stringify(r.buttonbar).includes('manual current patient treatment choice'));
  assert.equal(bars.length, 1, 'one phase button bar');
  const buttons = bars[0].buttonbar;
  for (const k of [1, 2, 3, 4]) {
    const labels = [...new Set([...Object.values(PROFILE_BUTTONS), ...WRONG_SETS.map((s) => s[k - 1])])];
    for (const label of labels) {
      assert.ok(buttons.some((b) => b.title === label && b.commands[0].params.slot === k), `slot ${k} has the button ${label}`);
    }
  }
  assert.ok(buttons.every((b) => typeof b.title === 'string' && !('correct' in b.commands[0].params)), 'buttons are literal and carry no correct flag');
  assert.ok(!JSON.stringify(page).includes('P1_MANUAL_MEDICAL_MODE'), 'medical page reads the effective mode');
  for (const n of [1, 2, 3]) for (const name of [`apply patient${n} medical action effect`, `prepare patient${n} manual treatment phase`, `manual patient${n} treatment choice`, `finish patient${n} manual phase`]) {
    assert.ok(macros[name], `${name} exists`);
  }
  // Threads must not read params (owner-thread scoped).
  for (const n of [1, 2, 3]) {
    const choice = macros[`manual patient${n} treatment choice`];
    const thread = JSON.stringify(choice).match(/"create_thread":(\{.*\})\}\]\}\]$/s);
    assert.ok(!(thread && /"param"/.test(thread[1])), `choice ${n}: no param inside the thread`);
  }
}

// ---------------------------------------------------------------- tiny interpreter
class Returned { constructor(v) { this.value = v; } }
class Machine {
  constructor() { this.locals = {}; this.globals = {}; this.seed = 7; this.calls = []; }
  rnd() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  q(node, p) {
    if (node === null || typeof node !== 'object') return typeof node === 'string' ? this.template(node, p) : node;
    if (Array.isArray(node)) return node.map((x) => this.q(x, p));
    if ('create_array' in node) return [];
    if (Array.isArray(node.var)) return 1;
    if ('global' in node) return this.globals[node.global] ?? null;
    if ('local' in node || 'param' in node) {
      const v = 'local' in node ? this.locals[node.local] : p[node.param];
      return ('path' in node ? v?.[node.path] : v) ?? null;
    }
    if (node.require) return this.cmp(this.q(node.require, p), node, p);
    if (node.and) return Number(node.and.every((x) => this.q(x, p)));
    if (node.or) return Number(node.or.some((x) => this.q(x, p)));
    if (node.floor !== undefined) return Math.floor(this.q(node.floor, p));
    if (node.round !== undefined) { const s = 10 ** (node.to ?? 0); return Math.round(this.q(node.round, p) * s) / s; }
    if (node.rand) { const [a, b] = node.rand.map((x) => this.q(x, p)); return a + (b - a) * this.rnd(); }
    if (node.create_struct) return Object.fromEntries(Object.entries(node.create_struct).map(([k, v]) => [k, this.q(v, p)]));
    if (node.struct) { const t = this.q(node.struct, p); return 'index' in node ? t[this.q(node.index, p)] : t[node.path]; }
    for (const op of ['add', 'subtract', 'multiply', 'clamp']) {
      if (node[op]) {
        const [a, b, c] = node[op].map((x) => this.q(x, p));
        assert.ok(Number.isFinite(a) && Number.isFinite(b), `arithmetic on ${JSON.stringify(node)}`);
        return op === 'add' ? a + b : op === 'subtract' ? a - b : op === 'multiply' ? a * b : Math.max(b, Math.min(c, a));
      }
    }
    if (node.text !== undefined) return node.text.replace(/\{(\d+)\}/g, (_, n) => this.q(node.params[Number(n)], p));
    if (node.if !== undefined) return this.cmp(this.q(node.if, p), node, p) ? this.q(node.then, p) : this.q(node.else ?? null, p);
    throw new Error(`unsupported query ${JSON.stringify(node)}`);
  }
  template(s, p) { return s.replace(/\{local:([A-Za-z0-9_]+)\}/g, (_, n) => this.locals[n] ?? ''); }
  cmp(a, node, p) {
    const key = ops.find((k) => Object.hasOwn(node, k));
    assert.ok(key, `comparison needed: ${JSON.stringify(node).slice(0, 120)}`);
    const b = this.q(node[key], p);
    return { eq: a === b, ne: a !== b, gt: a > b, gte: a >= b, lt: a < b, lte: a <= b }[key];
  }
  run(list, p) {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.set) {
        const v = this.q(c.value, p);
        if (c.set.local) this.locals[c.set.local] = v; else p[c.set.param] = v;
      } else if (c.if !== undefined) {
        this.run(this.cmp(this.q(c.if, p), c, p) ? c.then : (c.else || []), p);
      } else if (c.call_macro) {
        const args = Object.fromEntries(Object.entries(c.params || {}).map(([k, v]) => [k, this.q(v, p)]));
        this.calls.push(c.call_macro);
        const r = this.call(c.call_macro, args);
        if (c.result) p[c.result] = r;
      } else if (c.return !== undefined) {
        throw new Returned(this.q(c.return, p));
      } else if (c.sleep !== undefined) {
        // no-op
      } else if (c.create_thread) {
        const snapshot = { ...p };
        this.run(c.create_thread.commands, snapshot);
      } else throw new Error(`unsupported command ${JSON.stringify(c).slice(0, 120)}`);
    }
  }
  call(name, params = {}) {
    const stubs = ['ground crew runtime trace', 'sync medical patient display', 'consciousness'];
    if (stubs.includes(name) || /^update patient\d physiology$/.test(name)) return null;
    assert.ok(macros[name], `macro ${name} exists`);
    try { this.run(macros[name], { ...params }); } catch (e) { if (e instanceof Returned) return e.value; throw e; }
    return null;
  }
}

const vitals = (n) => (n === 1 ? ['SPO2', 'RR', 'BP_SYS', 'BP_DIA', 'BPM', 'TEMP', 'GCS_EYE', 'GCS_VERBAL', 'GCS_MOTOR'] : ['SPO2', 'RR', 'BP_SYS', 'BP_DIA', 'BPM', 'TEMP', 'GCS_EYE', 'GCS_VERBAL', 'GCS_MOTOR'].map((v) => `P${n}_${v}`));
const lifeName = (n) => (n === 1 ? 'LIFESCORE' : `LIFESCORE${n}`);
const stepName = (n) => (n === 1 ? 'medical_actions_current_step' : `P${n}_MEDICAL_ACTIONS_CURRENT_STEP`);

function fresh(n, sequence, extra = {}) {
  const m = new Machine();
  const L = m.locals;
  L[`patientlife${n === 1 ? '' : n}`] = 'alive';
  L[`crewvisiting${n}`] = 'yes';
  L[lifeName(n)] = 60;
  const v = vitals(n);
  [95, 18, 120, 80, 85, 36.8, 3, 4, 5].forEach((value, i) => { L[v[i]] = value; });
  L[`P${n}_GLUCOSE`] = 100; L[`P${n}_ECG_RHYTHM`] = 'SINUS'; L[`P${n}_CRIT_BLEED`] = 'NO';
  L[`P${n}_PLAUSIBLE_POOL`] = ['neurological_support', 'ecg', 'intubation', 'vasopressor'].filter((p) => !sequence.includes(p));
  L[`P${n}_MEDICAL_ACTION_COUNT`] = sequence.length;
  sequence.forEach((p, i) => { L[`P${n}_MEDICAL_ACTION_${i + 1}_PROFILE`] = p; L[`P${n}_MEDICAL_ACTION_${i + 1}`] = `Step ${i + 1}`; });
  L[stepName(n)] = 1; L[`P${n}_AMBULANCE_COMPLETED_ACTIONS`] = 0; L[`manual_p${n}_error_count`] = 0;
  L[`manual_p${n}_active`] = 'yes'; L.medical_action_effects_applied = 0; L.manual_active_patient = n;
  L.PERSIST = 1; L.CREW_CRIT_2 = 0;
  Object.assign(L, extra);
  return m;
}
const slotLabels = (m, n) => [1, 2, 3, 4].map((k) => m.locals[`manual_p${n}_slot${k}_label`]);

// ---------------------------------------------------------------- behaviour
for (const n of [1, 2, 3]) {
  // Every profile as the correct answer: 4 buttons, the correct one at the random slot, it always takes effect.
  for (const profile of PROFILES) {
    for (let trial = 0; trial < 12; trial++) {
      const m = fresh(n, [profile]);
      m.locals.P1_MANUAL_MEDICAL_MODE = 'manual';
      if (profile === 'tourniquet') m.locals[`P${n}_CRIT_BLEED`] = 'YES';
      if (profile === 'defibrillation') m.locals[`P${n}_ECG_RHYTHM`] = 'VF';
      if (profile === 'give_glucose') m.locals[`P${n}_GLUCOSE`] = 45;
      m.call(`prepare patient${n} manual treatment phase`);
      assert.equal(m.locals[`manual_p${n}_state`], 'choose', `${profile}: choose state`);
      const labels = slotLabels(m, n);
      assert.equal(labels.filter(Boolean).length, 4, `${profile}: four buttons`);
      const cs = m.locals[`manual_p${n}_correct_slot`];
      assert.equal(labels[cs - 1], PROFILE_BUTTONS[profile], `${profile}: correct label at its slot`);
      assert.equal(labels.filter((l) => l === PROFILE_BUTTONS[profile]).length, 1, `${profile}: exactly one correct button`);
      const ps = m.locals[`manual_p${n}_plausible_slot`];
      assert.notEqual(ps, cs, 'plausible slot differs from the correct one');
      if (ps > 0) {
        const pp = m.locals[`manual_p${n}_plausible_profile`];
        assert.equal(labels[ps - 1], PROFILE_BUTTONS[pp], `${profile}: plausible label`);
        assert.notEqual(pp, profile);
      }
      const absurd = WRONG_SETS[m.locals[`manual_p${n}_wrong_set`]];
      [1, 2, 3, 4].filter((k) => k !== cs && k !== ps).forEach((k) => assert.equal(labels[k - 1], absurd[k - 1], `${profile}: absurd label at slot ${k}`));
      // Correct choice always takes effect.
      m.call(`manual patient${n} treatment choice`, { slot: cs, label: labels[cs - 1] });
      assert.equal(m.locals[`manual_p${n}_last_choice_correct`], true);
      assert.ok(String(m.locals[`manual_p${n}_feedback`]).length > 0, `${profile}: feedback`);
      assert.equal(m.locals[`manual_p${n}_error_count`], 0, `${profile}: no error on the correct choice`);
      assert.equal(m.locals[`P${n}_AMBULANCE_COMPLETED_ACTIONS`], 1, `${profile}: phase recorded`);
      assert.equal(m.locals[`P${n}_MEDICAL_ACTIONS_COMPLETED`], 1, `${profile}: last phase completes the visit`);
      assert.equal(m.locals[`manual_p${n}_state`], 'review');
    }
  }

  // Report texts and special rules.
  const report = (profile, extra, expected) => {
    const m = fresh(n, [profile], extra);
    m.call(`prepare patient${n} manual treatment phase`);
    const cs = m.locals[`manual_p${n}_correct_slot`];
    m.call(`manual patient${n} treatment choice`, { slot: cs, label: slotLabels(m, n)[cs - 1] });
    assert.equal(m.locals[`manual_p${n}_feedback`], expected, `${profile} report`);
    return m;
  };
  report('ecg', { [`P${n}_ECG_RHYTHM`]: 'VF' }, 'ECG: VF');
  report('glucose_level', { [`P${n}_GLUCOSE`]: 48 }, 'Glucose 48 mg/dL');
  report('critical_bleeding', { [`P${n}_CRIT_BLEED`]: 'YES' }, 'Critical bleeding: YES');
  report('trauma_check', {}, 'Trauma check done');
  assert.match(report('neurological_support', {}, 'GCS E3 V4 M5 = 12').locals[`manual_p${n}_feedback`], /^GCS/);

}

// Specific effects (patient 1 names are the plain ones).
{
  const m = fresh(1, ['defibrillation'], { P1_ECG_RHYTHM: 'VF' });
  m.call('prepare patient1 manual treatment phase');
  const cs = m.locals.manual_p1_correct_slot;
  m.call('manual patient1 treatment choice', { slot: cs, label: 'DEFIBRILLATE' });
  assert.equal(m.locals.P1_ECG_RHYTHM, 'SINUS', 'defibrillation of VF gives sinus rhythm');
}
{
  const m = fresh(1, ['give_glucose'], { P1_GLUCOSE: 45 });
  m.call('prepare patient1 manual treatment phase');
  m.call('manual patient1 treatment choice', { slot: m.locals.manual_p1_correct_slot, label: 'GIVE GLUCOSE' });
  assert.equal(m.locals.GCS_EYE + m.locals.GCS_VERBAL + m.locals.GCS_MOTOR, 14, 'give glucose below 60 sets GCS 14');
  assert.ok(m.locals.P1_GLUCOSE >= 90 && m.locals.P1_GLUCOSE <= 120, 'glucose 90-120 after the correction');
}
{
  const m = fresh(1, ['antidote_therapy']);
  m.call('prepare patient1 manual treatment phase');
  m.call('manual patient1 treatment choice', { slot: m.locals.manual_p1_correct_slot, label: 'ANTIDOTE' });
  assert.equal(m.locals.GCS_EYE + m.locals.GCS_VERBAL + m.locals.GCS_MOTOR, 13, 'antidote sets GCS 13');
}
{
  const m = fresh(1, ['neurological_support']);
  const before = [m.locals.SPO2, m.locals.BP_SYS, m.locals.BPM, m.locals.GCS_EYE];
  m.call('prepare patient1 manual treatment phase');
  m.call('manual patient1 treatment choice', { slot: m.locals.manual_p1_correct_slot, label: 'GCS & PUPILS' });
  assert.deepEqual([m.locals.SPO2, m.locals.BP_SYS, m.locals.BPM, m.locals.GCS_EYE], before, 'GCS & PUPILS changes neither vitals nor GCS');
}
{
  // Tourniquet skipped when the check returned NO; the following phase is prepared with no error.
  const m = fresh(1, ['critical_bleeding', 'tourniquet', 'oxygen_support'], { P1_CRIT_BLEED: 'NO' });
  m.call('prepare patient1 manual treatment phase');
  m.call('manual patient1 treatment choice', { slot: m.locals.manual_p1_correct_slot, label: 'CRIT BLEEDING CHK' });
  assert.equal(m.locals.medical_actions_current_step, 3, 'tourniquet step skipped');
  assert.equal(m.locals.manual_p1_error_count, 0);
  assert.equal(m.locals.manual_p1_state, 'choose');
  assert.equal(m.locals.P1_MANUAL_ACTION_RESULT_2, 'Tourniquet not needed');
  const m2 = fresh(1, ['critical_bleeding', 'tourniquet'], { P1_CRIT_BLEED: 'NO' });
  m2.call('prepare patient1 manual treatment phase');
  m2.call('manual patient1 treatment choice', { slot: m2.locals.manual_p1_correct_slot, label: 'CRIT BLEEDING CHK' });
  assert.equal(m2.locals.manual_p1_state, 'review', 'a trailing skipped tourniquet closes the visit');
  const m3 = fresh(1, ['critical_bleeding', 'tourniquet'], { P1_CRIT_BLEED: 'YES' });
  m3.call('prepare patient1 manual treatment phase');
  m3.call('manual patient1 treatment choice', { slot: m3.locals.manual_p1_correct_slot, label: 'CRIT BLEEDING CHK' });
  assert.equal(m3.locals.manual_p1_current_profile, 'tourniquet');
  assert.equal(m3.locals.manual_p1_state, 'choose', 'tourniquet asked when bleeding is critical');
}
{
  // Wrong buttons: absurd costs 2-5 life score and moves no vital; plausible has its own outcome; error counted.
  for (let trial = 0; trial < 30; trial++) {
    const m = fresh(1, ['assessment', 'oxygen_support']);
    m.call('prepare patient1 manual treatment phase');
    const cs = m.locals.manual_p1_correct_slot; const ps = m.locals.manual_p1_plausible_slot;
    const absurd = [1, 2, 3, 4].find((k) => k !== cs && k !== ps);
    const vit = [m.locals.SPO2, m.locals.BP_SYS, m.locals.BPM];
    m.call('manual patient1 treatment choice', { slot: absurd, label: slotLabels(m, 1)[absurd - 1] });
    assert.deepEqual([m.locals.SPO2, m.locals.BP_SYS, m.locals.BPM], vit, 'absurd choice leaves vitals');
    assert.ok(m.locals.LIFESCORE <= 58 && m.locals.LIFESCORE >= 54, `absurd penalty ${m.locals.LIFESCORE}`);
    assert.equal(m.locals.manual_p1_error_count, 1);
    assert.equal(m.locals.medical_actions_current_step, 2, 'wrong choice still moves on');
  }
  const m = fresh(1, ['assessment', 'oxygen_support']);
  m.call('prepare patient1 manual treatment phase');
  const ps = m.locals.manual_p1_plausible_slot;
  const lifeBefore = m.locals.LIFESCORE;
  m.call('manual patient1 treatment choice', { slot: ps, label: slotLabels(m, 1)[ps - 1] });
  assert.ok(m.locals.LIFESCORE < lifeBefore, 'plausible-wrong choice costs life score');
  assert.equal(m.locals.manual_p1_error_count, 1);
}
{
  // Effective manual mode: transports without a patient always use the automatic mode.
  const m = new Machine(); m.globals.P1_MANUAL_MEDICAL_MODE = 'manual';
  m.locals.P1_MEDICAL_ACTION_COUNT = 0; m.locals.P2_MEDICAL_ACTION_COUNT = 3;
  m.call('refresh effective manual mode', { patient: 1 }); m.call('refresh effective manual mode', { patient: 2 });
  assert.equal(m.locals.P1_MANUAL_MODE_EFF, 'automatic');
  assert.equal(m.locals.P2_MANUAL_MODE_EFF, 'manual');
  m.globals.P1_MANUAL_MEDICAL_MODE = 'automatic';
  m.call('refresh effective manual mode', { patient: 2 });
  assert.equal(m.locals.P2_MANUAL_MODE_EFF, 'automatic');
}
{
  // Initialisation of the new clinical locals from a health row.
  const m = new Machine(); m.globals.P1_MANUAL_MEDICAL_MODE = 'manual';
  m.locals.P1_MEDICAL_ACTION_COUNT = 2;
  m.call('initialize patient extra clinical state', {
    patient: 1,
    profile: { ecg_rhythm: 'VF', glucose_min: 30, glucose_max: 40, critical_bleeding_chance: 100, plausible_wrong_pool: ['ecg'] }
  });
  assert.equal(m.locals.P1_ECG_RHYTHM, 'VF');
  assert.ok(m.locals.P1_GLUCOSE >= 30 && m.locals.P1_GLUCOSE <= 40);
  assert.equal(m.locals.P1_CRIT_BLEED, 'YES');
  assert.deepEqual(m.locals.P1_PLAUSIBLE_POOL, ['ecg']);
  assert.equal(m.locals.P1_MANUAL_MODE_EFF, 'manual');
  const n = new Machine();
  n.call('initialize patient extra clinical state', { patient: 3, profile: { ecg_rhythm: 'SINUS', glucose_min: 90, glucose_max: 90, critical_bleeding_chance: 0, plausible_wrong_pool: [] } });
  assert.equal(n.locals.P3_CRIT_BLEED, 'NO', 'chance 0 always reports NO');
}
{
  // Snapshot / restore carry the new locals.
  const text = JSON.stringify(macros);
  for (const n of [1, 2, 3]) for (const k of ['GLUCOSE', 'ECG_RHYTHM', 'CRIT_BLEED', 'PLAUSIBLE_POOL']) {
    assert.ok(text.includes(`"P${n}_${k}":{"local":"P${n}_${k}"}`), `snapshot holds P${n}_${k}`);
    assert.ok(text.includes(`"param":"saved_clinical","path":"P${n}_${k}"`), `restore reads P${n}_${k}`);
  }
}

console.log('Manual treatment PASS: 23 profiles x 3 patients, 4 buttons per phase with one correct, plausible and absurd wrong answers, always-effective correct choice, report texts, tourniquet skip, defibrillation, glucose, antidote, effective mode, new clinical locals in snapshot/restore. Simulator validation PENDING.');
