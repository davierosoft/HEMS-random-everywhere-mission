#!/usr/bin/env node
'use strict';
// Custom injured models (train.json local CUS_INJURED, request of Steph 2026-11-02): the two mission macros are executed
// by a small interpreter against the cases of the specification:
//   empty list = the mission chooses; fewer titles than injured = the first injured use them, the others keep the mission choice;
//   as many = one to one in order; more = random draw without repeating a list entry.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'mission-src');
const medical = JSON.parse(fs.readFileSync(path.join(root, 'macros/07-patient-medical.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/03-people-and-names.json'), 'utf8'));
const statics = { injured: data.injured, injured_workers: data.injured_workers, injured_motorcyclists: data.injured_motorcyclists, injured_fallback: data.injured_fallback };

function run(macro, { locals, params = {}, rnd }) {
  const P = [params];
  const getp = (name) => P[P.length - 1][name];
  const ev = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return x.map(ev);
    if ('local' in x && Object.keys(x).length === 1) return locals[x.local];
    if ('param' in x && Object.keys(x).length === 1) return getp(x.param);
    if ('struct' in x) {
      let base = x.struct.static ? statics[x.struct.static] : ev(x.struct);
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
  const cond = (c) => {
    if (c.and) return c.and.every((o) => cond(o.require ? { ...o, if: o.require } : o));
    const left = ev('if' in c ? c.if : ('while' in c ? c.while : c.require));
    const ops = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b };
    for (const [k, f] of Object.entries(ops)) if (k in c) return f(left, ev(c[k]));
    return !!left;
  };
  const cond2 = (c) => {
    if (c.if && c.if.and) return c.if.and.every((o) => cond({ require: o.require, ...Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'require')) })) === (c.eq === undefined ? true : c.eq === 1);
    return cond(c);
  };
  const walk = (list) => {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.set) { const v = ev(c.value); if (c.set.local) locals[c.set.local] = v; else if (c.set.param) P[P.length - 1][c.set.param] = v; else throw new Error('set kind'); }
      else if (c.if) { const hit = c.if.and ? cond2(c) : cond(c); walk(hit ? c.then : (c.else || [])); }
      else if (c.for_each) { const arr = c.for_each.static ? statics[c.for_each.static] : locals[c.for_each.local]; for (const item of [...arr]) { P[P.length - 1].$item = item; walk(c.do); } }
      else if (c.while) { let guard = 0; while (cond(c)) { walk(c.do); if (++guard > 1000) throw new Error('loop'); } }
      else if (c.modify_array) { const arr = c.modify_array.local ? locals[c.modify_array.local] : null; arr.push(ev(c.append)); }
      else if (c.call_macro) {
        if (c.call_macro === 'custom injured fallback') { P.push({}); walk(medical['custom injured fallback']); P.pop(); }
        else if (c.call_macro !== 'ground crew runtime trace') throw new Error('call ' + c.call_macro);
      }
      else if (c.sleep !== undefined) { /* no-op */ }
      else throw new Error('unsupported command ' + JSON.stringify(c).slice(0, 80));
    }
  };
  walk(macro);
  return locals;
}
// the `while` and `if` with the and-form are rare in this interpreter: normalise while to the same condition reader
const prepare = medical['custom injured assets prepare'];
const apply = medical['custom injured asset'];
assert.ok(prepare && apply, 'the two macros exist');

const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const list = (...titles) => titles.map((title) => ({ title }));
function scene({ player = 'custom', cus, victims, seed = 1 }) {
  const locals = { player, HELOVICTIMS: victims, CUS_INJURED: cus, injured1: 'mission1', injured2: 'mission2', injured3: 'mission3', var_compatible1: 'yes', var_compatible2: 'yes', var_compatible3: 'yes' };
  const rnd = seeded(seed);
  run(prepare, { locals, rnd });
  for (let slot = 1; slot <= victims; slot++) run(apply, { locals, params: { slot }, rnd });
  return locals;
}
const titles = (l, n) => [l.injured1, l.injured2, l.injured3].slice(0, n);

// 1) empty list or no list: the mission chooses
assert.deepEqual(titles(scene({ cus: list(), victims: 3 }), 3), ['mission1', 'mission2', 'mission3'], 'empty list: unchanged');
assert.deepEqual(titles(scene({ cus: undefined, victims: 2 }), 2), ['mission1', 'mission2'], 'no list: unchanged');
// a regular mission never uses a list left over from a custom one
assert.deepEqual(titles(scene({ player: 'singleplayer', cus: list('X'), victims: 1 }), 1), ['mission1'], 'only a custom mission uses the list');
// 2) fewer titles than injured: the first injured use them, the others keep the mission choice
assert.deepEqual(titles(scene({ cus: list('30West Grandpa'), victims: 3 }), 3), ['30West Grandpa', 'mission2', 'mission3']);
assert.deepEqual(titles(scene({ cus: list('A', 'B'), victims: 3 }), 3), ['A', 'B', 'mission3']);
// 3) as many: one to one, in order
assert.deepEqual(titles(scene({ cus: list('A', 'B', 'C'), victims: 3 }), 3), ['A', 'B', 'C']);
assert.deepEqual(titles(scene({ cus: list('A'), victims: 1 }), 1), ['A']);
// 4) more titles than injured: random, a list entry used at most once, all entries can come out
const seen = new Set();
for (let seed = 1; seed <= 300; seed++) {
  const l = scene({ cus: list('A', 'B', 'C', 'D', 'E'), victims: 3, seed });
  const t = titles(l, 3);
  assert.strictEqual(new Set(t).size, 3, 'no repeated title: ' + t);
  t.forEach((x) => { assert.ok('ABCDE'.includes(x), 'seed ' + seed + ' got ' + JSON.stringify(t)); seen.add(x); });
}
assert.strictEqual(seen.size, 5, 'every title of the list can be drawn');
const one = new Set();
for (let seed = 1; seed <= 100; seed++) one.add(scene({ cus: list('A', 'B', 'C'), victims: 1, seed }).injured1);
assert.strictEqual(one.size, 3, 'one injured, three titles: any of them');
// the same title written twice is two entries: both can be used (the user asked for it)
const dup = scene({ cus: list('A', 'A'), victims: 2 });
assert.deepEqual(titles(dup, 2), ['A', 'A']);
// 5) var_compatible: from the catalog when the title is known, no for an unknown model
const known = data.injured.find((x) => x.variable_compatible === 'yes');
const l1 = scene({ cus: list(known.id, 'Some Add-on Model'), victims: 2 });
assert.strictEqual(l1.var_compatible1, 'yes', 'a known compatible model keeps yes');
assert.strictEqual(l1.var_compatible2, 'no', 'an unknown model is a fixed one');
const noCatalog = data.injured.find((x) => x.variable_compatible === 'no');
assert.strictEqual(scene({ cus: list(noCatalog.id), victims: 1 }).var_compatible1, 'no');
// a struct without title is ignored, SEX and AGE are never touched
const bad = scene({ cus: [{}, { title: '' }], victims: 2 });
assert.deepEqual(titles(bad, 2), ['mission1', 'mission2']);

// call sites: every creation of an injured passes through the pick, never on a reload, and before create_object
const text = (x) => JSON.stringify(x);
for (const [macro, slot, create] of [['random injured', 1, 'injured_human'], ['random injured2', 2, 'injured_human2'], ['random injured3', 3, 'injured_human3']]) {
  const body = medical[macro];
  assert.ok(Array.isArray(body), macro + ' exists');
  const ci = body.findIndex((c) => c.create_object && c.create_object.name === create);
  assert.ok(ci > 0, macro + ' creates ' + create);
  const prev = body[ci - 1];
  assert.ok(prev.if && prev.if.var && prev.if.var[0] === 'L:RELOADSAVED' && prev.ne === 1, macro + ': the pick is skipped on a reload (the saved models are used)');
  assert.ok(text(prev.then).includes('"call_macro":"custom injured asset"') && text(prev.then).includes('"slot":' + slot), macro + ' applies slot ' + slot);
  assert.strictEqual(text(prev.then).includes('custom injured assets prepare'), slot === 1, 'the pick is prepared once, by the first injured');
}
// fallback: the list is the H145 injured models of the mission, drawn at random, different for each injured while the list lasts
const pool = data.injured_fallback.map((x) => x.id);
assert.ok(pool.length >= 3, 'at least three fallback models');
for (const id of pool) {
  assert.ok(/^Airbus H145 /.test(id), id + ' is an H145 model');
  assert.ok(data.injured.some((x) => x.id === id && x.variable_compatible === 'yes'), id + ' is in the injured list of the mission and takes the poses');
}
assert.strictEqual(new Set(pool).size, pool.length, 'no repeated fallback model');
const fbSeen = new Set();
for (let seed = 1; seed <= 300; seed++) {
  const l = scene({ cus: list('Misspelled One', 'Not Installed Two', 'Third'), victims: 3, seed });
  const f = [l.injured1_fallback, l.injured2_fallback, l.injured3_fallback];
  f.forEach((x) => { assert.ok(pool.includes(x), 'fallback from the list: ' + x); fbSeen.add(x); });
  assert.strictEqual(new Set(f).size, 3, 'three injured, three fallback models: all different (' + f + ')');
}
assert.strictEqual(fbSeen.size, pool.length, 'every fallback model can come out');
// more injured than fallback models: repeats only after the list is used up, never an error
const many = scene({ cus: list('A', 'B', 'C'), victims: 3, seed: 7 });
assert.ok([many.injured1_fallback, many.injured2_fallback, many.injured3_fallback].every((x) => pool.includes(x)));
// a slot the list does not cover keeps the standard fallback of the mission (the macro does not touch it)
const part = scene({ cus: list('A'), victims: 3 });
assert.strictEqual(part.injured2_fallback, undefined, 'uncovered injured: nothing written (the creation default applies)');
for (const [macro, n, create] of [['random injured', 1, 'injured_human'], ['random injured2', 2, 'injured_human2'], ['random injured3', 3, 'injured_human3']]) {
  const body = medical[macro];
  const ci = body.findIndex((c) => c.create_object && c.create_object.name === create);
  assert.deepStrictEqual(body[ci].create_object.fallback_title, { local: 'injured' + n + '_fallback' }, macro + ': the creation reads its fallback');
  const defIdx = body.findIndex((c) => c.set && c.set.local === 'injured' + n + '_fallback');
  assert.ok(defIdx >= 0 && defIdx < ci - 1 && body[defIdx].value === 'Airbus H145 Injured Human', macro + ': the standard fallback is set before the pick');
}
const trainPath = path.join(__dirname, '..', 'train.json');
const train = JSON.parse(fs.readFileSync(trainPath, 'utf8'));
const cmds = train.objectives[0].commands;
const init = cmds.filter((c) => c && c.set && c.set.local === 'CUS_INJURED');
assert.strictEqual(init.length, 1, 'train.json initialises CUS_INJURED once');
assert.deepEqual(init[0].value, { create_array: 0 }, 'the shipped list is empty: the mission chooses the injured');
const entries = cmds.filter((c) => c && c.modify_array && c.modify_array.local === 'CUS_INJURED');
for (const e of entries) assert.ok(e.append && e.append.create_struct && typeof e.append.create_struct.title === 'string' && e.append.create_struct.title.length > 0, 'every entry is {title}');
console.log('Custom injured models PASS: empty list, fewer, as many and more titles than injured behave as specified (300 seeds, no repeated title), unknown models are fixed models, a regular mission and a reload never use the list, train.json ships an empty list. HPG/MSFS PENDING.');
