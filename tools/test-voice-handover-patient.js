#!/usr/bin/env node
'use strict';
// User request of 2026-11-04 (audit item G3, pack EN 37): the handover of the doctor at the hospital says what the crew knows of the transported
// patient: HOS.HND.<M|F|U>.<S|M|C> (sex with age, state by the Life Score). The macro is executed by a small interpreter.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const macros = {};
for (const f of fs.readdirSync(path.join(root, 'mission-src/macros'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8')));

assert.ok(!JSON.stringify(macros['voice hospital handover']).includes('"key":"HOS.HND"'), 'the generic HOS.HND is not called any more');
assert.ok(JSON.stringify(macros['voice hospital handover']).includes('"voice hospital handover patient"'), 'the handover calls the patient macro');
for (const L of ['EN', 'DE', 'FR']) {
  const xml = fs.readFileSync(path.join(root, 'voicepacks', L + '.xml'), 'utf8');
  assert.ok(/<message key="HOS\.HND"/.test(xml), L + ' keeps the generic HOS.HND');
  for (const s of ['M', 'F', 'U']) for (const c of ['S', 'M', 'C']) {
    const key = `HOS.HND.${s}.${c}`;
    const m = xml.match(new RegExp(`<message key="${key.replace(/\./g, '\\.')}"[^>]*>([\\s\\S]*?)</message>`));
    assert.ok(m, `${L} has ${key}`);
    const variants = m[1].match(/<o>[\s\S]*?<\/o>/g) || [];
    assert.ok(variants.length >= 3, `${L} ${key} variants`);
    for (const v of variants) assert.strictEqual(v.includes('{0}'), s !== 'U', `${L} ${key} uses the age only with a known sex: ${v}`);
  }
}

function run(init) {
  const env = { locals: { ...init }, said: [] };
  const val = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if ('local' in x) return env.locals[x.local] === undefined ? null : env.locals[x.local];
    if ('text' in x) return x.text.replace(/\{(\d)\}/g, (_, i) => val(x.params[Number(i)]));
    throw new Error('unsupported ' + JSON.stringify(x));
  };
  const cmp = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b };
  const op = (c) => Object.keys(cmp).find((k) => k in c);
  const test = (c, o) => {
    const left = (o && typeof o === 'object' && 'and' in o) ? (o.and.every((r) => test(r, r.require)) ? 1 : 0) : val(o);
    return cmp[op(c)](left, val(c[op(c)]));
  };
  const exec = (cmds) => {
    for (const c of cmds) {
      if (c['#comment'] !== undefined) continue;
      if (c.set) env.locals[c.set.local] = val(c.value);
      else if (c.if) { if (test(c, c.if)) exec(c.then || []); else if (c.else) exec(c.else); }
      else if (c.call_macro === 'voice say') env.said.push([val(c.params.key), c.params.a ? val(c.params.a) : null]);
      else throw new Error('unsupported ' + JSON.stringify(c).slice(0, 80));
    }
  };
  exec(macros['voice hospital handover patient']);
  return env.said;
}
const P = (o) => ({ HEMS_PATIENT_NUMBER: 1, LIFESCORE: 80, LIFESCORE2: 80, LIFESCORE3: 80, SEX1: 'male', SEX2: 'female', SEX3: ' ', AGE1: 45, AGE2: 30, AGE3: ' ', ...o });
assert.deepStrictEqual(run(P({})), [['HOS.HND.M.S', '45']], 'male, 45, stable');
assert.deepStrictEqual(run(P({ HEMS_PATIENT_NUMBER: 2, LIFESCORE2: 25 })), [['HOS.HND.F.C', '30']], 'patient 2: female, 30, critical');
assert.deepStrictEqual(run(P({ HEMS_PATIENT_NUMBER: 3, LIFESCORE3: 50 })), [['HOS.HND.U.M', null]], 'patient 3: sex unknown, neutral key without age');
assert.deepStrictEqual(run(P({ HEMS_PATIENT_NUMBER: null, LIFESCORE: 60 })), [['HOS.HND.M.S', '45']], 'no patient number: patient 1; 60 is stable');
assert.deepStrictEqual(run(P({ LIFESCORE: 59 })), [['HOS.HND.M.M', '45']], '59 is serious');
assert.deepStrictEqual(run(P({ LIFESCORE: 30 })), [['HOS.HND.M.M', '45']], '30 is serious');
assert.deepStrictEqual(run(P({ LIFESCORE: 29 })), [['HOS.HND.M.C', '45']], '29 is critical');
assert.deepStrictEqual(run(P({ AGE1: 0 })), [['HOS.HND.U.S', null]], 'age 0: neutral key');
console.log('handover of the patient ok');
