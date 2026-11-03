#!/usr/bin/env node
'use strict';
// Custom injured models (train.json local CUS_INJURED, request of Steph 2026-11-02, additions of the user 2026-11-03).
// Each entry: {title, sex, age, var1, var2}. The mission macros are executed by a small interpreter in the order of objective2:
//   accident demographics sex -> custom injured assets prepare -> custom injured demographics sex -> (pathology engine)
//   -> accident demographics ages -> custom injured demographics ages -> ... random injured: custom injured asset, create, custom injured vars.
// Specification: empty list = the mission chooses; fewer entries than injured = the first injured use them, the others keep the mission
// choice; as many = one to one in order; more = random draw without repeating a list entry. Sex and age are the user's. var1/var2:
// NO (or missing) leaves the mission, a number is set. A fallback name is always given.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'mission-src');
const medical = JSON.parse(fs.readFileSync(path.join(root, 'macros/07-patient-medical.json'), 'utf8'));
const lifecycle = JSON.parse(fs.readFileSync(path.join(root, 'macros/11-mission-lifecycle.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/03-people-and-names.json'), 'utf8'));
const statics = { injured: data.injured, injured_workers: data.injured_workers, injured_motorcyclists: data.injured_motorcyclists, injured_fallback: data.injured_fallback };

function makeRunner(state, rnd) {
  const P = [{}];
  const getp = (name) => P[P.length - 1][name];
  const ev = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return x.map(ev);
    const keys = Object.keys(x);
    if ('local' in x && keys.length === 1) return state.locals[x.local];
    if ('param' in x && keys.length === 1) return getp(x.param);
    if ('var' in x && keys.length === 1) return state.vars[x.var[0]];
    if ('isNaN' in x) return Number.isNaN(Number(ev(x.isNaN))) ? 1 : 0;
    if ('struct' in x) {
      const base = x.struct.static ? statics[x.struct.static] : ev(x.struct);
      if ('index' in x) return base ? base[ev(x.index)] : undefined;
      if ('path' in x) return x.path === 'length' ? (base ? base.length : null) : (base ? (base[x.path] ?? null) : null);
    }
    if ('floor' in x) return Math.floor(ev(x.floor));
    if ('rand' in x) { const [a, b] = ev(x.rand); return a + rnd() * (b - a); }
    if ('add' in x) return ev(x.add).reduce((s, v) => s + v, 0);
    if ('create_array' in x) return [];
    if ('create_struct' in x) return Object.fromEntries(Object.entries(x.create_struct).map(([k, v]) => [k, ev(v)]));
    throw new Error('unsupported expression ' + JSON.stringify(x));
  };
  const OPS = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b };
  const leftOf = (c) => ev('if' in c ? c.if : ('while' in c ? c.while : c.require));
  const test = (c) => { const left = leftOf(c); for (const k of Object.keys(OPS)) if (k in c) return OPS[k](left, ev(c[k])); return !!left; };
  const cond = (c) => {
    const operand = 'if' in c ? c.if : ('while' in c ? c.while : c.require);
    if (operand && operand.and) return operand.and.every((o) => test(o)) === (c.eq === undefined ? true : c.eq === 1);
    return test(c);
  };
  const walk = (list) => {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.set) {
        const v = ev(c.value);
        if (c.set.local) state.locals[c.set.local] = v;
        else if (c.set.param) P[P.length - 1][c.set.param] = v;
        else if (c.set.object) { (state.objects[c.set.object] ||= {})[c.set.var] = v; }
        else throw new Error('set kind ' + JSON.stringify(c.set));
      } else if (c.if) walk(cond(c) ? c.then : (c.else || []));
      else if (c.for_each) { const arr = c.for_each.static ? statics[c.for_each.static] : state.locals[c.for_each.local]; for (const item of [...arr]) { P[P.length - 1].$item = item; walk(c.do); } }
      else if (c.while) { let guard = 0; while (cond(c)) { walk(c.do); if (++guard > 1000) throw new Error('loop'); } }
      else if (c.modify_array) state.locals[c.modify_array.local].push(ev(c.append));
      else if (c.call_macro) {
        if (c.call_macro === 'ground crew runtime trace') continue;
        const body = medical[c.call_macro];
        if (!body) throw new Error('call ' + c.call_macro);
        const frame = {};
        for (const [k, v] of Object.entries(c.params || {})) frame[k] = ev(v);
        P.push(frame); walk(body); P.pop();
      } else if (c.sleep !== undefined) { /* no-op */ }
      else throw new Error('unsupported command ' + JSON.stringify(c).slice(0, 80));
    }
  };
  return { call: (name, params = {}) => { P.push({ ...params }); walk(medical[name]); P.pop(); } };
}

const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const entry = (title, sex, age, var1 = 'NO', var2 = 'NO') => ({ title, sex, age, var1, var2 });

// one dispatch, in the order of objective2 and of the creation
function dispatch({ player = 'custom', cus, victims, seed = 1, reload = 0, prior }) {
  const state = {
    locals: {
      player, HELOVICTIMS: victims, CUS_INJURED: cus,
      SEX1: 'male', SEX2: 'male', SEX3: 'male', AGE1: 70, AGE2: 71, AGE3: 72,
      injured1: 'mission1', injured2: 'mission2', injured3: 'mission3',
      var_compatible1: 'yes', var_compatible2: 'yes', var_compatible3: 'yes',
      injured1_fallback: 'Airbus H145 Injured Human', injured2_fallback: 'Airbus H145 Injured Human', injured3_fallback: 'Airbus H145 Injured Human',
      ...(prior || {})
    },
    vars: { 'L:RELOADSAVED': reload },
    objects: {}
  };
  const run = makeRunner(state, seeded(seed));
  run.call('custom injured assets prepare');
  run.call('custom injured demographics sex');
  run.call('custom injured demographics ages');
  for (let slot = 1; slot <= victims; slot++) {
    if (!reload) run.call('custom injured asset', { slot });
    (state.objects[slot === 1 ? 'injured_human' : 'injured_human' + slot] ||= {})['VAR 1'] = 0; // the mission default after the creation
    run.call('custom injured vars', { slot });
  }
  return state;
}
const titles = (st, n) => [st.locals.injured1, st.locals.injured2, st.locals.injured3].slice(0, n);
const ent = (...t) => t.map((x) => entry(x, 'female', 40));

// 1) empty list, no list, regular mission, reload
assert.deepEqual(titles(dispatch({ cus: [], victims: 3 }), 3), ['mission1', 'mission2', 'mission3']);
assert.deepEqual(titles(dispatch({ cus: undefined, victims: 2 }), 2), ['mission1', 'mission2']);
assert.deepEqual(titles(dispatch({ player: 'singleplayer', cus: ent('X'), victims: 1 }), 1), ['mission1'], 'a regular mission never uses a list left over');
const rl = dispatch({ cus: ent('A', 'B'), victims: 2, reload: 1 });
assert.deepEqual(titles(rl, 2), ['mission1', 'mission2'], 'a reload keeps the saved models');
assert.strictEqual(rl.locals.SEX1, 'male'); assert.strictEqual(rl.locals.AGE1, 70);
// a list of a previous dispatch never survives into the next one
const stale = dispatch({ cus: ent('A', 'B'), victims: 2 });
const next = dispatch({ cus: [], victims: 2, prior: { cus_injured_pick: stale.locals.cus_injured_pick } });
assert.deepEqual(titles(next, 2), ['mission1', 'mission2'], 'the pick is cleared at every dispatch');
// 2) fewer entries than injured
const few = dispatch({ cus: [entry('30West Grandpa', 'male', 80)], victims: 3 });
assert.deepEqual(titles(few, 3), ['30West Grandpa', 'mission2', 'mission3']);
assert.deepEqual([few.locals.SEX1, few.locals.SEX2, few.locals.SEX3, few.locals.AGE1, few.locals.AGE2, few.locals.AGE3], ['male', 'male', 'male', 80, 71, 72], 'uncovered injured keep sex and age of the mission');
// 3) as many: one to one, in order, sex and age of each
const eq = dispatch({ cus: [entry('A', 'female', 30), entry('B', 'male', 45), entry('C', 'female', 8)], victims: 3 });
assert.deepEqual(titles(eq, 3), ['A', 'B', 'C']);
assert.deepEqual([eq.locals.SEX1, eq.locals.SEX2, eq.locals.SEX3], ['female', 'male', 'female'], 'sex of the user');
assert.deepEqual([eq.locals.AGE1, eq.locals.AGE2, eq.locals.AGE3], [30, 45, 8], 'age of the user, outside the range of the dispatch too');
// 4) more entries: random, a list entry at most once, sex and age travel with the entry
const seen = new Set();
const list5 = ['A', 'B', 'C', 'D', 'E'].map((t, i) => entry(t, i % 2 ? 'male' : 'female', 20 + i));
for (let seed = 1; seed <= 300; seed++) {
  const st = dispatch({ cus: list5, victims: 3, seed });
  const t = titles(st, 3);
  assert.strictEqual(new Set(t).size, 3, 'no repeated title: ' + t);
  t.forEach((x, i) => {
    const src = list5.find((e) => e.title === x); assert.ok(src, x + ' is in the list'); seen.add(x);
    assert.strictEqual(st.locals['SEX' + (i + 1)], src.sex, 'sex travels with ' + x);
    assert.strictEqual(st.locals['AGE' + (i + 1)], src.age, 'age travels with ' + x);
  });
}
assert.strictEqual(seen.size, 5, 'every entry can be drawn');
const one = new Set();
for (let seed = 1; seed <= 100; seed++) one.add(dispatch({ cus: ent('A', 'B', 'C'), victims: 1, seed }).locals.injured1);
assert.strictEqual(one.size, 3, 'one injured, three entries: any of them');
assert.deepEqual(titles(dispatch({ cus: ent('A', 'A'), victims: 2 }), 2), ['A', 'A'], 'the same title written twice is two entries');
// 5) sex and age: only valid values; the user wins; anything else leaves the mission
const odd = dispatch({ cus: [entry('A', 'unknown', 'abc'), entry('B', null, null), entry('C', '', '')], victims: 3 });
assert.deepEqual([odd.locals.SEX1, odd.locals.SEX2, odd.locals.SEX3, odd.locals.AGE1, odd.locals.AGE2, odd.locals.AGE3], ['male', 'male', 'male', 70, 71, 72], 'invalid or missing sex and age leave the mission values');
assert.strictEqual(dispatch({ cus: [entry('A', 'female', 0)], victims: 1 }).locals.AGE1, 0, 'age 0 is a valid age');
// 6) VAR 1 and VAR 2: NO or missing leaves, a number is set
const v1 = dispatch({ cus: [entry('A', 'male', 40, 2, 1), entry('B', 'male', 40, 'NO', 'NO'), { title: 'C', sex: 'male', age: 40 }], victims: 3 });
assert.deepEqual(v1.objects.injured_human, { 'VAR 1': 2, 'VAR 2': 1 }, 'numbers are set');
assert.deepEqual(v1.objects.injured_human2, { 'VAR 1': 0 }, 'NO leaves the mission (VAR 1 stays the 0 of the mission, VAR 2 untouched)');
assert.deepEqual(v1.objects.injured_human3, { 'VAR 1': 0 }, 'missing fields leave the mission');
const v0 = dispatch({ cus: [entry('A', 'male', 40, 0, 0)], victims: 1 });
assert.deepEqual(v0.objects.injured_human, { 'VAR 1': 0, 'VAR 2': 0 }, '0 is a number: the user chose it');
assert.deepEqual(dispatch({ cus: [entry('A', 'male', 40, 'x', 'y')], victims: 1 }).objects.injured_human, { 'VAR 1': 0 }, 'a text that is not NO and not a number leaves the mission');
// 7) var_compatible: catalog when the title is known, no for an unknown model
const known = data.injured.find((x) => x.variable_compatible === 'yes');
const l1 = dispatch({ cus: [entry(known.id, 'male', 40), entry('Some Add-on Model', 'male', 40)], victims: 2 });
assert.strictEqual(l1.locals.var_compatible1, 'yes'); assert.strictEqual(l1.locals.var_compatible2, 'no');
assert.deepEqual(titles(dispatch({ cus: [{}, { title: '' }], victims: 2 }), 2), ['mission1', 'mission2'], 'an entry without title is ignored');
// 8) fallback: always a name, from the H145 list, different per injured while the list lasts, reused after
const pool = data.injured_fallback.map((x) => x.id);
assert.ok(pool.length >= 3);
for (const id of pool) {
  assert.ok(/^Airbus H145 /.test(id), id + ' is an H145 model');
  assert.ok(data.injured.some((x) => x.id === id && x.variable_compatible === 'yes'), id + ' is in the injured list and takes the poses');
}
assert.strictEqual(new Set(pool).size, pool.length);
const fbSeen = new Set();
for (let seed = 1; seed <= 300; seed++) {
  const st = dispatch({ cus: ent('Misspelled', 'Not Installed', 'Third'), victims: 3, seed });
  const f = [1, 2, 3].map((n) => st.locals['injured' + n + '_fallback']);
  f.forEach((x) => { assert.ok(pool.includes(x), 'fallback from the list: ' + x); fbSeen.add(x); });
  assert.strictEqual(new Set(f).size, 3, 'three injured, three fallback names, all different (' + f + ')');
}
assert.strictEqual(fbSeen.size, pool.length);
const originalPool = statics.injured_fallback;
statics.injured_fallback = pool.slice(0, 2).map((id) => ({ id }));
const reuse = dispatch({ cus: ent('A', 'B', 'C'), victims: 3, seed: 5 });
[1, 2, 3].forEach((n) => assert.ok(pool.slice(0, 2).includes(reuse.locals['injured' + n + '_fallback']), 'a name is reused when the list is used up, never empty'));
statics.injured_fallback = [];
const none = dispatch({ cus: ent('A'), victims: 1 });
assert.strictEqual(none.locals.injured1_fallback, 'Airbus H145 Injured Human', 'an empty list still gives a name');
statics.injured_fallback = originalPool;
assert.strictEqual(dispatch({ cus: [entry('A', 'male', 40)], victims: 3 }).locals.injured2_fallback, 'Airbus H145 Injured Human', 'an uncovered injured keeps the standard fallback');

// 9) call sites
const text = (x) => JSON.stringify(x);
const order = (macro, names) => { let at = -1; for (const n of names) { const i = macro.findIndex((c, k) => k > at && (c.call_macro === n || (c.if && text(c).includes('"call_macro":"' + n + '"')))); assert.ok(i > at, n + ' in order'); at = i; } };
order(lifecycle.objective2, ['accident demographics sex', 'custom injured assets prepare', 'custom injured demographics sex', 'pathology random engine', 'accident demographics ages', 'custom injured demographics ages', 'Mission dispatch']);
for (const [macro, n, create] of [['random injured', 1, 'injured_human'], ['random injured2', 2, 'injured_human2'], ['random injured3', 3, 'injured_human3']]) {
  const body = medical[macro];
  const ci = body.findIndex((c) => c.create_object && c.create_object.name === create);
  assert.ok(ci > 0, macro + ' creates ' + create);
  assert.deepStrictEqual(body[ci].create_object.fallback_title, { local: 'injured' + n + '_fallback' });
  const defIdx = body.findIndex((c) => c.set && c.set.local === 'injured' + n + '_fallback');
  assert.ok(defIdx >= 0 && defIdx < ci - 1 && body[defIdx].value === 'Airbus H145 Injured Human', macro + ': the standard fallback is set first');
  const prev = body[ci - 1];
  assert.ok(prev.if && prev.if.var && prev.if.var[0] === 'L:RELOADSAVED' && prev.ne === 1 && text(prev.then).includes('"slot":' + n), macro + ': the entry is applied, not on a reload');
  assert.ok(!text(body).includes('custom injured assets prepare'), macro + ': the pick is made once by objective2');
  const varIdx = body.findIndex((c, k) => k > ci && c.call_macro === 'custom injured vars' && c.params.slot === n);
  assert.ok(varIdx === ci + 2, macro + ': VAR 1 and VAR 2 of the user come right after the VAR 1 0 of the mission');
}
const plain = Object.values(medical).flat().filter((c) => c && c.create_object && c.create_object.title && c.create_object.title.local === 'injured1' && !c.create_object.fallback_title);
assert.strictEqual(plain.length, 0, 'no creation of an injured model without a fallback name');
const trainPath = path.join(__dirname, '..', 'train.json');
const train = JSON.parse(fs.readFileSync(trainPath, 'utf8'));
const cmds = train.objectives[0].commands;
const init = cmds.filter((c) => c && c.set && c.set.local === 'CUS_INJURED');
assert.strictEqual(init.length, 1, 'train.json initialises CUS_INJURED once');
assert.deepEqual(init[0].value, { create_array: 0 }, 'the shipped list is empty: the mission chooses the injured');
for (const e of cmds.filter((c) => c && c.modify_array && c.modify_array.local === 'CUS_INJURED')) {
  const s = e.append && e.append.create_struct;
  assert.ok(s && typeof s.title === 'string' && s.title.length > 0, 'every entry has a title');
  assert.ok(['male', 'female'].includes(s.sex) && typeof s.age === 'number', 'every entry gives sex (male or female) and age (a number)');
  assert.ok('var1' in s && 'var2' in s, 'every entry gives var1 and var2 (NO or a number)');
}
console.log('Custom injured models PASS: empty, fewer, as many and more entries (300 seeds, no repeat), sex and age of the user travel with the entry and win over the dispatch, var1/var2 NO leaves and a number is set, a fallback name is always given, a reload and a regular mission never use the list, the order in objective2. HPG/MSFS PENDING.');
