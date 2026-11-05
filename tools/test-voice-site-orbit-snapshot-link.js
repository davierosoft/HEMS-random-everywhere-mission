#!/usr/bin/env node
'use strict';
// User request of 2026-11-04 (audit items L2 and U9): the copilot says that an orbit over the accident is completed (APR.ORB, no finding claimed) and the
// briefing and the Mission dispatch page have a link that captures the diagnostic snapshot. The orbit loop is executed by a small interpreter.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const macros = {};
for (const f of fs.readdirSync(path.join(root, 'mission-src/macros'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8')));
for (const L of ['EN', 'DE', 'FR']) {
  const xml = fs.readFileSync(path.join(root, 'voicepacks', L + '.xml'), 'utf8');
  const m = xml.match(/<message key="APR\.ORB"[^>]*>([\s\S]*?)<\/message>/);
  assert.ok(m && (m[1].match(/<o>/g) || []).length >= 3, L + ' has APR.ORB with variants');
}
assert.ok(JSON.stringify(macros['delayed threads']).includes('"call_macro":"voice site orbit"'), 'started by delayed threads');
// snapshot links
const brief = fs.readFileSync(path.join(root, 'mission-src/root/03-briefing.json'), 'utf8');
assert.ok(brief.includes('"link": "- CAPTURE DIAGNOSTIC SNAPSHOT"') && brief.includes('"capture diagnostic snapshot"') && brief.includes('"static":"Debug_Table"'), 'briefing link');
assert.ok(JSON.stringify(macros['Mission dispatch']).includes('"- CAPTURE DIAGNOSTIC SNAPSHOT"'), 'Mission dispatch link');

const loop = macros['voice site orbit'].find((c) => c.while);
function make() {
  const env = { locals: { MISSION_PHASE: 5 }, hdg: 0, distNm: 0.3, height: 400, ground: 0, hasLoc: true, said: [] };
  const val = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if ('local' in x) return env.locals[x.local] === undefined ? null : env.locals[x.local];
    if ('location' in x) return env.distNm;
    if ('var' in x) { const n = x.var[0]; if (n === 'A:PLANE HEADING DEGREES MAGNETIC') return env.hdg; if (n === 'RADIO HEIGHT') return env.height; if (n === 'SIM ON GROUND') return env.ground; throw new Error(n); }
    if ('add' in x) return x.add.map(val).reduce((a, b) => a + b, 0);
    if ('subtract' in x) return val(x.subtract[0]) - val(x.subtract[1]);
    throw new Error('unsupported ' + JSON.stringify(x));
  };
  const cmp = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b };
  const op = (c) => Object.keys(cmp).find((k) => k in c);
  const test = (c, o) => {
    let left;
    if (o && typeof o === 'object' && 'and' in o) left = o.and.every((r) => test(r, r.require)) ? 1 : 0;
    else if (o && typeof o === 'object' && 'or' in o) left = o.or.some((r) => test(r, r.require)) ? 1 : 0;
    else if (o && typeof o === 'object' && 'has_location' in o) left = env.hasLoc ? 1 : 0;
    else left = val(o);
    return cmp[op(c)](left, val(c[op(c)]));
  };
  const exec = (cmds) => {
    for (const c of cmds) {
      if (c['#comment'] !== undefined || c.sleep !== undefined) continue;
      if (c.set) env.locals[c.set.local] = val(c.value);
      else if (c.if) { if (test(c, c.if)) exec(c.then || []); else if (c.else) exec(c.else); }
      else if (c.call_macro === 'voice say') env.said.push(c.params.key);
      else throw new Error('unsupported ' + JSON.stringify(c).slice(0, 80));
    }
  };
  env.step = (h) => { env.hdg = h; exec(loop.do); };
  return env;
}
let e = make();
for (let h = 0, i = 0; i < 17; i++, h = (h + 20) % 360) e.step(h);
assert.deepStrictEqual(e.said, [], '320 degrees: not yet');
e.step(340); assert.deepStrictEqual(e.said, ['APR.ORB'], 'about 340 degrees: orbit completed');
for (let i = 0; i < 40; i++) e.step((i * 20) % 360); assert.deepStrictEqual(e.said, ['APR.ORB'], 'once for each dispatch');
e = make(); for (let h = 360, i = 0; i < 19; i++, h -= 20) e.step(((h % 360) + 360) % 360); assert.deepStrictEqual(e.said, ['APR.ORB'], 'the other direction, across north');
e = make(); e.distNm = 1.5; for (let i = 0; i < 40; i++) e.step((i * 20) % 360); assert.deepStrictEqual(e.said, [], 'not outside 0.6 NM');
e = make(); e.height = 2000; for (let i = 0; i < 40; i++) e.step((i * 20) % 360); assert.deepStrictEqual(e.said, [], 'not above 1500 ft');
e = make(); e.ground = 1; for (let i = 0; i < 40; i++) e.step((i * 20) % 360); assert.deepStrictEqual(e.said, [], 'not on the ground');
e = make(); for (let i = 0; i < 10; i++) e.step((i * 20) % 360); e.distNm = 2; e.step(200); e.distNm = 0.3; for (let i = 11; i < 21; i++) e.step((i * 20) % 360); assert.deepStrictEqual(e.said, [], 'leaving the circle restarts the sum');
e = make(); for (let i = 0; i < 40; i++) { e.step(0); } assert.deepStrictEqual(e.said, [], 'a straight flight is not an orbit');
e = make(); for (let i = 0; i < 40; i++) e.step(i % 2 ? 20 : 0); assert.deepStrictEqual(e.said, [], 'a wobble is not an orbit');
e = make(); e.locals.MISSION_PHASE = 8; for (let i = 0; i < 40; i++) e.step((i * 20) % 360); assert.deepStrictEqual(e.said, [], 'not after the pickup');
e = make(); e.hasLoc = false; for (let i = 0; i < 40; i++) e.step((i * 20) % 360); assert.deepStrictEqual(e.said, [], 'not without accident location');
console.log('site orbit and snapshot link ok');
