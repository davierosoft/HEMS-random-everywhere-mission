#!/usr/bin/env node
'use strict';

// Execute the production command lists, not a separately implemented triage model.
// This interpreter deliberately supports only the documented, synchronous HPG subset
// used by the registry. Simulator object/animation behavior is NOT modeled here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../mission-src/macros/17-multipatient-runtime.json'), 'utf8'));
const operators = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'];
class Returned { constructor(value) { this.value = value; } }
class HpgRegistry {
  constructor(macros = source, retainLiteralArrays = false) { this.macros = macros; this.locals = {}; this.messages = []; this.locations = {}; this.seed = 1; this.tables = {}; this.savedTables = {}; this.retainLiteralArrays = retainLiteralArrays; this.literalArrays = new WeakMap(); }
  compare(a, node, params) {
    const ops = operators.filter(k => Object.hasOwn(node, k));
    assert.equal(ops.length, 1, `Exactly one comparison required: ${JSON.stringify(node)}`);
    const b = this.query(node[ops[0]], params);
    return { eq: () => a === b, ne: () => a !== b, gt: () => a > b, gte: () => a >= b, lt: () => a < b, lte: () => a <= b }[ops[0]]();
  }
  query(q, p) {
    if (q === null || typeof q !== 'object') return q;
    if (Array.isArray(q)) {
      if (!this.retainLiteralArrays) return q.map(x => this.query(x, p));
      if (!this.literalArrays.has(q)) this.literalArrays.set(q, q.map(x => this.query(x, p)));
      return this.literalArrays.get(q);
    }
    if (Object.hasOwn(q, 'create_array')) return new Array(this.query(q.create_array, p)).fill(null);
    if (Array.isArray(q.var)) return this.locals[q.var[0]] ?? null;
    if (Object.hasOwn(q, 'local') || Object.hasOwn(q, 'param')) {
      const value = Object.hasOwn(q, 'local') ? this.locals[q.local] : p[q.param];
      return (Object.hasOwn(q, 'path') ? value?.[q.path] : value) ?? null;
    }
    if (q.require) return this.compare(this.query(q.require, p), q, p);
    if (q.floor !== undefined) return Math.floor(this.query(q.floor, p));
    if (q.rand) {
      this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
      const [a, b] = q.rand.map(x => this.query(x, p));
      return a + (b - a) * this.seed / 4294967296;
    }
    if (q.has_location) return Number(Object.hasOwn(this.locations, this.query(q.has_location, p)));
    if (q.location) {
      assert.equal(q.var, 'distance:m');
      const a = this.locations[this.query(q.location, p)], b = this.locations[this.query(q.to, p)];
      assert.ok(a && b, 'Both graph locations must exist');
      return Math.hypot(a[0] - b[0], a[1] - b[1]);
    }
    if (q.and) return Number(q.and.every(x => this.query(x, p)));
    if (q.or) return Number(q.or.some(x => this.query(x, p)));
    if (q.create_struct) return Object.fromEntries(Object.entries(q.create_struct).map(([k, v]) => [k, this.query(v, p)]));
    if (q['json:copy']) return structuredClone(this.query(q['json:copy'], p));
    if (q['json:stringify']) return JSON.stringify(this.query(q['json:stringify'], p));
    if (q.static) { assert.equal(q.static, 'Debug_Table'); return 'Andrews_debug_snapshots'; }
    if (q['js:get']) { assert.equal(q['js:get'], 'Object'); return Object; }
    if (q.struct) {
      const target = this.query(q.struct, p);
      if (q.function) { assert.equal(q.function, 'assign'); return target.assign(...q.params.map(x => this.query(x, p))); }
      return target[q.path ?? this.query(q.index, p)];
    }
    for (const op of ['add', 'subtract', 'multiply', 'divide', 'clamp']) if (q[op]) {
      const values = q[op].map(x => this.query(x, p));
      const [a, b, c] = values;
      assert.ok(Number.isFinite(a) && Number.isFinite(b), `Invalid arithmetic ${JSON.stringify(q)}`);
      return { add: () => values.reduce((sum, n) => sum + n, 0), subtract: () => a - b, multiply: () => a * b, divide: () => a / b, clamp: () => Math.max(b, Math.min(c, a)) }[op]();
    }
    if (q.text !== undefined) return q.text.replace(/\{(\d+)(?::[^}]+)?\}/g, (_, n) => this.query(q.params[Number(n)], p));
    if (q['string:join']) return this.query(q['string:join'], p).join(q.delimiter);
    throw new Error(`Unsupported query ${JSON.stringify(q)}`);
  }
  commands(list, p) {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.set) {
        assert.ok(!c.set.path, 'Nested mutation must use documented Object.assign');
        if (c.set.table) {
          const table = this.tables[this.query(c.set.table, p)];
          assert.ok(table, 'Snapshot table must be opened before writing');
          table[c.set.key] = this.query(c.value, p);
        } else {
          const scope = c.set.local ? this.locals : p;
          scope[c.set.local || c.set.param] = this.query(c.value, p);
        }
      } else if (c.if) {
        this.commands(this.compare(this.query(c.if, p), c, p) ? c.then : (c.else || []), p);
      } else if (c.for_each) {
        this.query(c.for_each, p).forEach((item, index) => { p.$item = item; p.$index = index; this.commands(c.do, p); });
      } else if (c.switch) {
        this.commands(c.case[this.query(c.switch, p)] || c.case.default || [], p);
      } else if (c.call_macro) {
        const args = Object.fromEntries(Object.entries(c.params || {}).map(([k, v]) => [k, this.query(v, p)]));
        p[c.result || '$RET'] = this.call(c.call_macro, args);
      } else if (c.modify_array) {
        const target = this.query(c.modify_array, p);
        assert.ok(Array.isArray(target));
        if (Object.hasOwn(c, 'append')) target.push(this.query(c.append, p));
        else if (Object.hasOwn(c, 'prepend')) target.unshift(this.query(c.prepend, p));
        else target.splice(this.query(c.removeIndex, p), 1);
      } else if (c.try) {
        try { this.commands(c.try, p); } catch (error) {
          if (error instanceof Returned) throw error;
          p.$ERROR = error.message; this.commands(c.catch || [], p);
        }
      } else if (c.open_table) {
        const name = this.query(c.open_table, p);
        this.tables[name] ||= structuredClone(this.savedTables[name] || {});
      } else if (c.save_table) {
        const name = this.query(c.save_table, p);
        assert.ok(this.tables[name]); this.savedTables[name] = structuredClone(this.tables[name]);
      } else if (c.set_dispatch) {
        assertRendererHasNoCallParams(c.set_dispatch);
        // Render later, without the macro call's params collection.
        for (const row of c.set_dispatch) if (row.params) row.params.forEach(q => this.query(q, {}));
      } else if (Object.hasOwn(c, 'return')) throw new Returned(this.query(c.return, p));
      else if (c.set_message) this.messages.push(this.query(c.set_message, p));
      else throw new Error(`Forbidden/unsupported registry command ${JSON.stringify(c)}`);
    }
  }
  call(name, params = {}) {
    assert.ok(this.macros[name], `Unknown macro ${name}`);
    try { this.commands(this.macros[name], params); } catch (e) { if (e instanceof Returned) return e.value; throw e; }
  }
}
function assertRendererHasNoCallParams(rows) {
  function visit(x) {
    if (!x || typeof x !== 'object') return;
    assert.ok(!Object.hasOwn(x, 'param'), 'Renderer must not read call-scoped params');
    for (const [key, value] of Object.entries(x)) if (key !== 'commands') {
      if (Array.isArray(value)) value.forEach(visit); else visit(value);
    }
  }
  rows.forEach(visit);
}
const create = () => { const h = new HpgRegistry(); h.call('multipatient registry initialize'); return h; };
const add = (h, slot, score = 90, rate = 1) => h.call('multipatient registry add', {slot, object: `patient${slot}`, location: `patient_location${slot}`, lifescore: score, decrease_rate: rate, medical: {bpm: 80}, pathology: 'test', symptoms: 'test', consciousness: 'conscious'});
const reserve = (h, resource, slot = 0, timeout = 120) => h.call('multipatient registry reserve', {resource, slot, delay_minutes: 10, timeout_seconds: timeout});
const transition = (h, ticket, from, to) => h.call('multipatient registry transition', {ticket, from, to});

function assertFreshMutableArrays(x) {
  if (!x || typeof x !== 'object') return;
  if (x.set) assert.ok(!Array.isArray(x.value) || x.value.length !== 0, 'Mutable collections must use create_array, not literal []');
  if (x.create_struct) for (const value of Object.values(x.create_struct)) {
    assert.ok(!Array.isArray(value) || value.length !== 0, 'Nested mutable collections must be freshly allocated');
  }
  Object.values(x).forEach(assertFreshMutableArrays);
}
assertFreshMutableArrays(source);
assert.throws(() => assertFreshMutableArrays({set: {param: 'record'}, value: {create_struct: {history: []}}}), /freshly allocated/);

{
  const h = new HpgRegistry(); h.locals.MISSION_PHASE = 7;
  h.call('multipatient registry page');
  assert.equal(h.locals.patient_registry_sdk_check, 'NOT RUN');
  h.call('multipatient registry compatibility check');
  assert.match(h.locals.patient_registry_sdk_check, /^PASS:/);
  const saved = JSON.parse(h.savedTables.Andrews_debug_snapshots.patient_registry);
  assert.match(saved.sdk_check, /^PASS:/);
  assert.equal(h.locals.MISSION_PHASE, 7); assert.equal(h.locals.patients, undefined, 'Probe cannot initialize live patients');
  const broken = structuredClone(source['multipatient registry page'].find(c => c.set_dispatch).set_dispatch);
  broken.push({text: '{0}', params: [{param: 'diagnostics'}]});
  assert.throws(() => assertRendererHasNoCallParams(broken), /Renderer must not read call-scoped params/, 'Reject the exact release-123 failure');
  const failedProbe = structuredClone(source);
  failedProbe['multipatient registry SDK probe'].find(c => c.value?.function === 'assign').value.params[0] = { 'json:copy': {param: 'record'} };
  const failed = new HpgRegistry(failedProbe); failed.call('multipatient registry compatibility check');
  assert.match(JSON.parse(failed.savedTables.Andrews_debug_snapshots.patient_registry).sdk_check, /^FAIL:/, 'Failure result is also saved without manual capture');
  const debug = JSON.parse(fs.readFileSync(path.join(__dirname, '../mission-src/macros/15-debug-and-df-ui.json'), 'utf8'))['debug page'];
  let captureCommands;
  function findCapture(x) {
    if (Array.isArray(x)) {
      if (x.some(c => c?.call_macro === 'multipatient registry capture')) captureCommands = x;
      x.forEach(findCapture);
    } else if (x && typeof x === 'object') Object.values(x).forEach(findCapture);
  }
  findCapture(debug);
  const extensionIndex = captureCommands.findIndex(c => c.call_macro === 'multipatient registry capture');
  assert.ok(captureCommands[extensionIndex - 1].save_table, 'Commit the main snapshot before calling the optional registry extension');
  const snapshotFailure = structuredClone(source);
  snapshotFailure['multipatient registry diagnostics'] = [{set: {param: 'broken'}, value: {unsupported_test_query: 1}}];
  const isolated = new HpgRegistry(snapshotFailure);
  isolated.tables.Andrews_debug_snapshots = {valid: 'yes', snapshot_medical: {preserved: true}};
  isolated.commands(captureCommands.slice(extensionIndex - 1, extensionIndex + 1), {});
  assert.deepEqual(isolated.savedTables.Andrews_debug_snapshots.snapshot_medical, {preserved: true});
  assert.equal(isolated.savedTables.Andrews_debug_snapshots.valid, 'yes');
  assert.match(isolated.locals.patient_registry_capture_status, /^FAILED:/);
}

// Literal-array retention is an adversarial SDK model, not a claim that we
// have inspected HPG's interpreter. It reproduces the observed first-PASS /
// later-FAIL pattern that the previous always-copying test model concealed.
{
  const oldProbe = {probe: [
    {set: {param: 'record'}, value: {create_struct: {value: 0, history: []}}},
    {set: {param: 'mutation'}, value: {struct: {'js:get': 'Object'}, function: 'assign', params: [{param: 'record'}, {create_struct: {value: 1}}]}},
    {modify_array: {param: 'record', path: 'history'}, append: 'probe'},
    {return: {create_struct: {value: {param: 'record', path: 'value'}, length: {struct: {param: 'record', path: 'history'}, path: 'length'}}}},
  ]};
  const old = new HpgRegistry(oldProbe, true);
  assert.deepEqual(old.call('probe'), {value: 1, length: 1});
  assert.deepEqual(old.call('probe'), {value: 1, length: 2}, 'Old test could report lost mutation even though scalar mutation succeeded');
  for (const retain of [false, true]) {
    const h = new HpgRegistry(source, retain);
    for (let batch = 0; batch < 20; batch++) {
      h.call('multipatient registry compatibility check');
      assert.equal(h.locals.patient_registry_sdk_check, 'PASS: 5/5 fresh-record and history checks');
      const saved = JSON.parse(h.savedTables.Andrews_debug_snapshots.patient_registry);
      assert.equal(saved.sdk_samples.length, 5);
      assert.deepEqual(saved.sdk_samples.map(s => s.iteration), [1, 2, 3, 4, 5]);
      for (const sample of saved.sdk_samples) {
        assert.equal(sample.value_before, 0); assert.equal(sample.value_after, 1);
        assert.equal(sample.history_before, 0); assert.equal(sample.history_after, 1);
        assert.equal(sample.other_history, 0); assert.equal(sample.passed, 1);
      }
    }
    assert.equal(h.locals.patients, undefined, 'Repeated diagnostic probes remain non-destructive');
    h.call('multipatient registry initialize');
    for (let slot = 1; slot <= 5; slot++) add(h, slot);
    assert.equal(new Set(h.locals.patients.map(p => p.history)).size, 5, 'Each patient owns a fresh history');
    assert.ok(h.locals.patients.every(p => p.history.length === 1));
    const previousPatients = h.locals.patients;
    h.call('multipatient registry initialize');
    assert.equal(h.locals.patients.length, 0); assert.notEqual(h.locals.patients, previousPatients);
    assert.equal(previousPatients.length, 5, 'Reset cannot reuse/erase the previous collection');
  }
}

for (let count = 1; count <= 5; count++) {
  const h = create();
  for (let n = 1; n <= count; n++) assert.equal(add(h, n, 90, n), 1);
  assert.equal(add(h, 1), 0, 'Duplicate slot rejected');
  assert.equal(add(h, 6), 0, 'Capacity boundary enforced');
  const tickets = ['H145', 'ambulance1', 'ambulance2'].map(r => reserve(h, r)).filter(Boolean);
  assert.equal(new Set(tickets.map(t => t.slot)).size, Math.min(count, 3));
  assert.equal(tickets[0].slot, count, 'Projected score includes independent decrease rate');
  assert.equal(reserve(h, 'H145'), null, 'One patient per resource');
  for (const t of tickets) assert.equal(reserve(h, 'other', t.slot), null, 'Pilot override cannot steal');
}
{
  const h = create(); add(h, 1);
  const request = resource => ({operation: 'reserve', arguments: {slot: 1, resource, delay_minutes: 10, timeout_seconds: 120}, status: 'queued', result: null});
  const first = request('H145'), second = request('ambulance1');
  h.locals.patient_registry_requests.push(first, second);
  h.call('multipatient registry pump'); h.call('multipatient registry pump');
  assert.equal(first.result.resource, 'H145'); assert.equal(second.result, null);
  assert.equal(first.status, 'done'); assert.equal(second.status, 'done');
  assert.equal(h.locals.patient_registry_requests.length, 0, 'Single writer drains ordered concurrent requests');
}
{
  const h = create(); add(h, 1, 50, 0); add(h, 2, 80, 5);
  assert.equal(reserve(h, 'H145').slot, 2, 'Rapid decline outranks lower current score');
}
{
  const h = create(); add(h, 1); const old = reserve(h, 'H145', 1, 10);
  h.call('multipatient registry tick', {seconds: 10});
  const fresh = reserve(h, 'ambulance1', 1);
  assert.ok(fresh); assert.equal(transition(h, old, 'reserved', 'loading'), 0, 'Stale worker fenced');
  assert.equal(transition(h, fresh, 'reserved', 'loading'), 0, 'No loading before actual assessment/treatment');
  const p = h.locals.patients[0]; p.assessed = 1; p.treated = 1;
  assert.equal(transition(h, fresh, 'reserved', 'loading'), 1);
  assert.equal(h.call('multipatient registry release', {ticket: fresh, reason: 'timeout'}), 0, 'Cannot release a moving/loaded patient');
  assert.equal(transition(h, fresh, 'loading', 'loaded'), 1);
  p.medical.bpm = 90; assert.equal(p.report.bpm, 80, 'Transport report frozen independently');
  const score = p.lifescore; h.call('multipatient registry tick', {seconds: 300}); assert.equal(p.lifescore, score);
  assert.equal(transition(h, fresh, 'loaded', 'transported'), 1);
  assert.equal(p.active, 0); assert.equal(p.resource, 'none');
}
{
  const h = create(); add(h, 1, 1, 6); add(h, 2, 50, 2);
  h.locals.patients.forEach(p => {p.cpr_eligible = 1; p.clinical_owner = 'HEMS';});
  const acquire = slot => h.call('multipatient registry CPR acquire', {slot, provider: 'HEMS', timeout_seconds: 30});
  assert.equal(acquire(1), 1); assert.equal(acquire(2), 0, 'Single CPR lease');
  h.call('multipatient registry tick', {seconds: 10});
  assert.equal(h.locals.active_cpr_slot, 0, 'Death releases CPR');
  assert.equal(h.locals.patients[0].transport_state, 'died');
  assert.equal(acquire(2), 1);
  h.call('multipatient registry tick', {seconds: 30});
  assert.equal(h.locals.active_cpr_slot, 0, 'CPR timeout releases lease');
  assert.equal(h.messages.length, 1, 'Death emitted exactly once');
}
// Prove that the stale-generation assertion catches a realistic regression.
{
  const broken = structuredClone(source);
  const guard = broken['multipatient registry transition'].find(c => c.if?.or);
  guard.if.or = guard.if.or.filter(x => x.require.path !== 'reservation_generation');
  const h = new HpgRegistry(broken); h.call('multipatient registry initialize'); add(h, 1);
  const old = reserve(h, 'H145', 1, 10); h.call('multipatient registry tick', {seconds: 10}); reserve(h, 'H145', 1);
  h.locals.patients[0].assessed = 1; h.locals.patients[0].treated = 1;
  assert.throws(() => assert.equal(transition(h, old, 'reserved', 'loading'), 0), assert.AssertionError);
}
{
  const legacySource = JSON.parse(fs.readFileSync(path.join(__dirname, '../mission-src/macros/07-patient-medical.json'), 'utf8'));
  const legacyMacros = {
    'initialize patient2 physiology': legacySource['initialize patient2 physiology'].filter(c => !c.create_thread),
    'update patient2 physiology': legacySource['update patient2 physiology'].slice(0, -1),
    'apply patient2 medical action effect': legacySource['apply patient2 medical action effect'],
  };
  for (let slot = 1; slot <= 5; slot++) {
    for (const score of [5, 17, 29, 30, 80]) {
      const h = create(); add(h, slot, score, 1); const patient = h.locals.patients[0];
      const legacy = new HpgRegistry(legacyMacros);
      legacy.locals = {LIFESCORE2: score, patientlife2: 'alive', medical_action_effects_applied: 0};
      h.call('multipatient registry physiology initialize', {patient});
      legacy.call('initialize patient2 physiology');
      const compare = () => {
        assert.equal(patient.lifescore, legacy.locals.LIFESCORE2);
        for (const [key, value] of Object.entries(legacy.locals)) {
          if (key.startsWith('P2_')) assert.deepEqual(patient.medical[key.slice(3)], value, `Slot ${slot} preserves physiology ${key}`);
        }
      };
      compare();
      for (const profile of ['assessment', 'airway_support', 'hemorrhage_control', 'thermal_support', 'neurological_support', 'resuscitation']) {
        patient.medical.medical_action_effect_profile = profile;
        legacy.locals.medical_action_effect_profile = profile;
        h.call('multipatient registry physiology action', {patient});
        legacy.call('apply patient2 medical action effect');
        compare();
        assert.equal(patient.medical.medical_action_effect_outcome, legacy.locals.medical_action_effect_outcome);
        assert.equal(patient.medical.medical_action_effects_applied, legacy.locals.medical_action_effects_applied);
      }
    }
  }
  const h = create(); for (let slot = 1; slot <= 5; slot++) add(h, slot);
  h.locals.patients.forEach(patient => h.call('multipatient registry physiology initialize', {patient}));
  const before = structuredClone(h.locals.patients.slice(0, 4));
  const fifth = h.locals.patients[4]; fifth.medical.medical_action_effect_profile = 'airway_support';
  h.call('multipatient registry physiology action', {patient: fifth});
  assert.deepEqual(h.locals.patients.slice(0, 4), before, 'Treating P5 must not mutate P1-P4');
}
{
  const profiles = JSON.parse(fs.readFileSync(path.join(__dirname, '../mission-src/data/05-health-profiles.json'), 'utf8'));
  for (const [name, rows] of Object.entries(profiles)) for (const profile of rows) {
    const h = create();
    assert.equal(h.call('multipatient registry from profile', {slot: 5, object: 'injured_human5', location: 'patient5', profile, age: 35, sex: 'male', identity: 'Patient Five', consciousness: 'conscious'}), 1, `${name}: ${profile.id}`);
    const patient = h.locals.patients[0];
    assert.equal(patient.identity, 'Patient Five'); assert.deepEqual(patient.profile, profile);
    assert.equal(patient.actions.length, profile.medical_action_count);
    assert.equal(patient.actions[0].label, profile.medical_action_1);
    assert.ok(Number.isFinite(patient.medical.SPO2) && Number.isFinite(patient.medical.BPM));
    patient.profile.id = 'changed'; assert.notEqual(profile.id, 'changed', 'Profiles are copied, never mutated');
  }
}
{
  const h = create();
  // A wreck fills x=(-2,2), y=(-3,3). West/east patients are close, but the
  // direct crossing is deliberately NOT an edge. Both outward and return
  // routes must retain the north clearance nodes, including a loaded stretcher.
  h.locations = {west: [-4, 0], northwest: [-4, 5], northeast: [4, 5], east: [4, 0], isolated: [0, -5]};
  const graph = [
    {id: 'west', location: 'west', links: ['northwest']},
    {id: 'northwest', location: 'northwest', links: ['west', 'northeast']},
    {id: 'northeast', location: 'northeast', links: ['northwest', 'east']},
    {id: 'east', location: 'east', links: ['northeast']},
    {id: 'isolated', location: 'isolated', links: []},
  ];
  const plan = (from, to, nodes = graph) => h.call('multipatient registry plan path', {graph: nodes, from, to});
  const result = plan('west', 'east');
  assert.equal(result.success, 1); assert.deepEqual(result.path, ['west', 'northwest', 'northeast', 'east']);
  assert.equal(result.distance_m, 18);
  assert.deepEqual(plan('east', 'west').path, [...result.path].reverse(), 'Return path cannot skip clearance points');
  assert.equal(plan('west', 'isolated').success, 0, 'Disconnected graph has no direct-line fallback');
  assert.equal(plan('absent', 'east').success, 0);
  assert.equal(plan('west', 'east', [...graph, graph[0]]).success, 0, 'Ambiguous graph IDs rejected');
  const broken = structuredClone(graph); broken[0].links = ['absent'];
  assert.equal(plan('west', 'east', broken).success, 0);
  delete h.locations.northeast; assert.equal(plan('west', 'east').success, 0, 'Missing scene locations rejected');
}
{
  for (let count = 1; count <= 5; count++) for (let selected = 1; selected <= count; selected++) {
    const h = new HpgRegistry();
    const records = Array.from({length: count}, (_, index) => ({slot: index + 1, dead: 0, visit_complete: 1, ground_confirmed: 0}));
    const decision = () => h.call('multipatient registry tablet decision', {records, expected_count: count, slot: selected});
    assert.equal(decision(), 0, 'Helicopter and unassigned patients retain medical details');
    records[selected - 1].ground_confirmed = 1;
    assert.equal(decision(), 1);
    for (const other of records) {
      other.visit_complete = 0;
      assert.equal(decision(), 0, 'ANY unfinished visit prevents telemetry closure');
      other.visit_complete = 1;
    }
    records[0].visit_complete = 0; records[0].dead = 1;
    assert.equal(decision(), 1, 'Confirmed death does not leave an impossible visit gate');
    records.pop();
    assert.equal(decision(), 0, 'Incomplete scene registration fails open');
  }
  const h = new HpgRegistry();
  Object.assign(h.locals, {HELOVICTIMS: 3, medical_display_patient: 2, crewvisitended: 'yes',
    P2_GROUND_TRANSPORTED: 'yes', P2_SPO2: 96, 'L:MISSION_TIME': 120});
  const refresh = slot => h.call('multipatient registry tablet refresh', {slot});
  assert.equal(refresh(2), 0, 'Crew return alone is NOT completion of every patient visit');
  for (const patient of [1, 2]) h.call('multipatient registry tablet mark visit', {patient});
  assert.equal(refresh(2), 0, 'The third visit remains open');
  h.call('multipatient registry tablet mark visit', {patient: 3});
  h.call('multipatient registry tablet mark visit', {patient: 3});
  assert.deepEqual(h.locals.patient_tablet_visits, [1, 2, 3], 'Visit completion is idempotent');
  assert.equal(refresh(2), 1);
  h.locals.manual_active_patient = 3;
  assert.equal(refresh(2), 0, 'Review/transport confirmation is still an open manual visit');
  h.locals.manual_active_patient = 0;
  assert.equal(refresh(1), 0, 'Helicopter patient remains live');
  assert.equal(refresh(3), 0, 'Not yet assigned to ground transport');
  h.locals.P2_SPO2 = 60; h.locals['L:MISSION_TIME'] = 240;
  refresh(2);
  assert.equal(h.locals.patient_tablet_reports.length, 1);
  assert.equal(h.locals.patient_tablet_reports[0].report.SPO2, 96, 'Closing report is immutable');
  assert.equal(h.locals.patient_tablet_reports[0].closed_at, 120);
  h.call('multipatient registry capture');
  const saved = JSON.parse(h.savedTables.Andrews_debug_snapshots.patient_registry);
  assert.equal(saved.tablet_reports[0].report.SPO2, 96);
  assert.equal(saved.tablet_policy.find(p => p.slot === 2).closed, 1);
  h.call('multipatient registry tablet reset', {preserve_history: 1, disable: 1});
  assert.equal(refresh(1), 0, 'Legacy object promotion cannot reuse stale closure flags');
  assert.equal(h.locals.patient_tablet_report_archive.length, 1);
  h.call('multipatient registry tablet reset');
  assert.deepEqual(h.locals.patient_tablet_visits, []);
  assert.deepEqual(h.locals.patient_tablet_reports, []);
  assert.deepEqual(h.locals.patient_tablet_report_archive, []);
  assert.equal(h.locals.patient_tablet_enabled, 1);
  Object.assign(h.locals, {HELOVICTIMS: 1, medical_actions_completed: 1, whobringpatient: 'ambulance', ambulance_patient_transfer_state: 'loading'});
  assert.equal(refresh(1), 0, 'Choosing ground or starting loading alone is insufficient');
  h.locals.ambulance_patient_transfer_state = 'patient_secured';
  assert.equal(refresh(1), 1);
  h.locals.whobringpatient = 'us';
  assert.equal(refresh(1), 0);

  const medical = JSON.parse(fs.readFileSync(path.join(__dirname, '../mission-src/macros/07-patient-medical.json'), 'utf8'));
  const ui = JSON.parse(fs.readFileSync(path.join(__dirname, '../mission-src/macros/04-dispatch-tablet-ui.json'), 'utf8'));
  for (const list of [medical['patient health'], ui['sync medical patient display']]) {
    assert.equal(list[0].call_macro, 'multipatient registry tablet refresh');
    assert.equal(list[1].if.param, 'tablet_closed');
    assert.deepEqual(list[1].then.at(-1), {return: 0}, 'Closed telemetry must bypass detailed display work');
  }
  assertRendererHasNoCallParams(medical['patient health'][1].then[0].set_dispatch);
  assert.equal(medical['patient clinical visit gate'].at(-1).call_macro, 'multipatient registry tablet mark visit');
  const broken = structuredClone(source);
  broken['multipatient registry tablet decision'][3].do.splice(1, 1);
  const unsafe = new HpgRegistry(broken);
  assert.equal(unsafe.call('multipatient registry tablet decision', {
    records: [{slot: 1, dead: 0, visit_complete: 0, ground_confirmed: 1}], expected_count: 1, slot: 1
  }), 1, 'Negative control: removing the all-visits guard reproduces premature closure');
}
console.log('Multi-patient registry PASS: capacities 1-5, reservations, stale-worker fencing, transport, CPR, one-shot death, waypoint paths, physiology parity, tablet closure after ALL visits, immutable closing reports, renderer lifetime, snapshots and 200 SDK probes. HPG/MSFS integration remains a separate gate.');
