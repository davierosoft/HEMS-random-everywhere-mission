#!/usr/bin/env node
'use strict';
// User request of 2026-11-04 (audit items L1 and V5, pack EN 37): wind at the site one nautical mile from the accident (APR.WND, APR.WND.C) and
// the fuel in flight (FUEL.LOW at the limit LOWFUELTHRSLD, FUEL.MIN at half of it). The loops of the two macros are executed by a small interpreter.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const macros = {};
for (const f of fs.readdirSync(path.join(root, 'mission-src/macros'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8')));

// packs
for (const L of ['EN', 'DE', 'FR']) {
  const xml = fs.readFileSync(path.join(root, 'voicepacks', L + '.xml'), 'utf8');
  for (const [key, args] of [['APR.WND', ['{0}', '{1}']], ['APR.WND.C', []], ['FUEL.LOW', ['{0}']], ['FUEL.MIN', ['{0}']]]) {
    const m = xml.match(new RegExp(`<message key="${key.replace('.', '\\.')}"[^>]*>([\\s\\S]*?)</message>`));
    assert.ok(m, `${L} has ${key}`);
    const variants = m[1].match(/<o>[\s\S]*?<\/o>/g) || [];
    assert.ok(variants.length >= 3, `${L} ${key} has variants`);
    for (const v of variants) for (const a of args) assert.ok(v.includes(a), `${L} ${key} variant uses ${a}: ${v}`);
  }
}
// call sites
const dt = JSON.stringify(macros['delayed threads']);
assert.ok(dt.includes('"call_macro":"voice site wind"') && dt.includes('"call_macro":"voice fuel watch"'), 'started by delayed threads');

// interpreter for one pass of the loop body
function pass(macroName, env) {
  const said = [];
  const loop = macros[macroName].find((c) => c.while);
  const val = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if ('local' in x) return env.locals[x.local] === undefined ? null : env.locals[x.local];
    if ('global' in x) return env.globals[x.global];
    if ('location' in x) return env.distanceNm;
    if ('var' in x) return env.vars[x.var[0]];
    if ('floor' in x) return Math.floor(val(x.floor));
    if ('divide' in x) return val(x.divide[0]) / val(x.divide[1]);
    if ('text' in x) return x.text.replace(/\{(\d)\}/g, (_, i) => val(x.params[Number(i)]));
    throw new Error('unsupported ' + JSON.stringify(x));
  };
  const cmp = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b };
  const op = (c) => Object.keys(cmp).find((k) => k in c);
  const test = (c, operand) => {
    const o = operand;
    let left;
    if (o && typeof o === 'object' && 'and' in o) left = o.and.every((r) => test(r, r.require)) ? 1 : 0;
    else if (o && typeof o === 'object' && 'has_location' in o) left = env.hasLocation ? 1 : 0;
    else left = val(o);
    return cmp[op(c)](left, val(c[op(c)]));
  };
  const exec = (cmds) => {
    for (const c of cmds) {
      if (c.sleep !== undefined) continue;
      if (c.set) env.locals[c.set.local] = val(c.value);
      else if (c.if) { if (test(c, c.if)) exec(c.then || []); else if (c.else) exec(c.else); }
      else if (c.call_macro === 'voice say') said.push([c.params.key, c.params.a ? val(c.params.a) : null]);
      else if (c.call_macro === 'voice weather class') { env.locals.vw_dir = env.windDir; env.locals.vw_spd = env.windKt; }
      else throw new Error('unsupported command ' + JSON.stringify(c).slice(0, 80));
    }
  };
  exec(loop.do);
  return said;
}
const base = () => ({ locals: { MISSION_PHASE: 5 }, globals: { LOWFUELTHRSLD: 40 }, vars: { 'SIM ON GROUND': 0, 'FUEL TANK CENTER LEVEL': 80 }, hasLocation: true, distanceNm: 0.8, windDir: 270, windKt: 14 });

// ---- wind
let e = base();
assert.deepStrictEqual(pass('voice site wind', e), [['APR.WND', '270//14']], 'wind said at 0.8 NM');
assert.deepStrictEqual(pass('voice site wind', e), [], 'once for each dispatch');
e.locals.MISSION_PHASE = 1; pass('voice site wind', e); e.locals.MISSION_PHASE = 5;
assert.deepStrictEqual(pass('voice site wind', e), [['APR.WND', '270//14']], 'again for the next dispatch');
e = base(); e.windKt = 3;
assert.deepStrictEqual(pass('voice site wind', e), [['APR.WND.C', null]], 'calm under 5 knots');
e = base(); e.distanceNm = 1.4;
assert.deepStrictEqual(pass('voice site wind', e), [], 'not before one nautical mile');
e = base(); e.hasLocation = false;
assert.deepStrictEqual(pass('voice site wind', e), [], 'not without accident location');
e = base(); e.locals.MISSION_PHASE = 8;
assert.deepStrictEqual(pass('voice site wind', e), [], 'not after the patient is aboard (phase 8)');

// ---- fuel
e = base(); e.vars['FUEL TANK CENTER LEVEL'] = 38.7;
assert.deepStrictEqual(pass('voice fuel watch', e), [['FUEL.LOW', '38']], 'low at the limit');
assert.deepStrictEqual(pass('voice fuel watch', e), [], 'once');
e.vars['FUEL TANK CENTER LEVEL'] = 19.2;
assert.deepStrictEqual(pass('voice fuel watch', e), [['FUEL.MIN', '19']], 'minimum at half of the limit');
assert.deepStrictEqual(pass('voice fuel watch', e), [], 'once');
e = base(); e.vars['FUEL TANK CENTER LEVEL'] = 12;
assert.deepStrictEqual(pass('voice fuel watch', e), [['FUEL.MIN', '12']], 'already under half: only the minimum');
e = base(); e.vars['FUEL TANK CENTER LEVEL'] = 30; e.vars['SIM ON GROUND'] = 1;
assert.deepStrictEqual(pass('voice fuel watch', e), [], 'not on the ground');
e = base(); e.vars['FUEL TANK CENTER LEVEL'] = 30; e.locals.MISSION_PHASE = 1;
assert.deepStrictEqual(pass('voice fuel watch', e), [], 'not before the dispatch is accepted');
e = base(); e.vars['FUEL TANK CENTER LEVEL'] = 30; e.globals.LOWFUELTHRSLD = 0;
assert.deepStrictEqual(pass('voice fuel watch', e), [], 'limit 0 = off');
e = base(); e.vars['FUEL TANK CENTER LEVEL'] = 30;
pass('voice fuel watch', e); e.locals.MISSION_PHASE = 1; pass('voice fuel watch', e); e.locals.MISSION_PHASE = 5;
assert.deepStrictEqual(pass('voice fuel watch', e), [['FUEL.LOW', '30']], 'flags cleared for the next dispatch');
console.log('voice site wind and fuel ok');
