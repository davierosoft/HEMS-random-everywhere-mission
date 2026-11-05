#!/usr/bin/env node
'use strict';
// User answer of 2026-11-04 (audit item H1): every object or location is a valid target of the guidance. Without a landing spot the hoist hover is guided
// to the patient (injured_human) with the same gates as the guidance to the landing spot.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src/macros/10-transfer-special-missions.json'), 'utf8'))['crash site approach'];
const threads = m.filter((c) => c.create_thread && JSON.stringify(c).includes('play_guidance_message'));
assert.strictEqual(threads.length, 2, 'two guidance threads: landing spot and patient');
const old = JSON.stringify(threads[0]);
assert.ok(old.includes('"target":"landing_spot"'), 'the original thread is untouched');
const t = threads[1].create_thread.commands[0];
const body = t.do;
function run(o) {
  const env = { said: [], ...o };
  const cmp = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b };
  const val = (x) => {
    if ('local' in x) return env.locals[x.local];
    if ('global' in x) return env.globals[x.global];
    if ('has_location' in x) return env.hasSpot ? 1 : 0;
    if ('has_object' in x) return env.hasPatient ? 1 : 0;
    if ('object' in x) return env.distM;
    if ('var' in x) return env.vars[x.var[0]];
    throw new Error('unsupported');
  };
  const op = (c) => Object.keys(cmp).find((k) => k in c);
  const test = (c, o2) => {
    const left = o2.and ? (o2.and.every((r) => test(r, r.require)) ? 1 : 0) : o2.or ? (o2.or.some((r) => test(r, r.require)) ? 1 : 0) : val(o2);
    return cmp[op(c)](left, c[op(c)]);
  };
  const exec = (cmds) => { for (const c of cmds) { if (c.sleep !== undefined) continue; if (c.if) { if (test(c, c.if)) exec(c.then || []); } else if (c.play_guidance_message) env.said.push(c.play_guidance_message.target); else throw new Error('unsupported'); } };
  exec(body);
  return env.said;
}
const ok = () => ({ hasSpot: false, hasPatient: true, distM: 6, locals: { MISSION_GUIDANCE_ACTIVE: 1 }, globals: { AUDIO_DECLUT: 0 }, vars: { 'RADIO HEIGHT': 80, 'GPS GROUND SPEED': 3 } });
assert.deepStrictEqual(run(ok()), ['injured_human'], 'no landing spot, hover near the patient: guided');
assert.deepStrictEqual(run({ ...ok(), hasSpot: true }), [], 'with a landing spot the first thread guides');
assert.deepStrictEqual(run({ ...ok(), hasPatient: false }), [], 'no patient object');
assert.deepStrictEqual(run({ ...ok(), distM: 40 }), [], 'not far from the patient');
assert.deepStrictEqual(run({ ...ok(), vars: { 'RADIO HEIGHT': 20, 'GPS GROUND SPEED': 3 } }), [], 'not on the ground');
assert.deepStrictEqual(run({ ...ok(), vars: { 'RADIO HEIGHT': 80, 'GPS GROUND SPEED': 40 } }), [], 'not at speed');
assert.deepStrictEqual(run({ ...ok(), globals: { AUDIO_DECLUT: 3 } }), [], 'the audio level gate');
assert.deepStrictEqual(run({ ...ok(), locals: { MISSION_GUIDANCE_ACTIVE: 0 } }), [], 'only when the guidance is active');
console.log('hoist guidance to the patient ok');
