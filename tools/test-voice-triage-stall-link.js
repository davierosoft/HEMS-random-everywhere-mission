#!/usr/bin/env node
'use strict';
// User request of 2026-11-04 (audit items G1 and U7): the doctor gives the triage category (TRI.R/Y/G, patient number as argument) after the visit of a
// patient when there are more patients, in hoist and skid operations; the stalled block of the Mission dispatch page has a snapshot link.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const macros = {};
for (const f of fs.readdirSync(path.join(root, 'mission-src/macros'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8')));
for (const L of ['EN', 'DE', 'FR']) {
  const xml = fs.readFileSync(path.join(root, 'voicepacks', L + '.xml'), 'utf8');
  for (const c of ['R', 'Y', 'G']) {
    const m = xml.match(new RegExp(`<message key="TRI\\.${c}"[^>]*>([\\s\\S]*?)</message>`));
    assert.ok(m, `${L} has TRI.${c}`);
    const v = m[1].match(/<o>[\s\S]*?<\/o>/g) || [];
    assert.ok(v.length >= 3 && v.every((x) => x.includes('{0}')), `${L} TRI.${c} variants carry the patient number`);
  }
}
function findAll(node, pred, out = []) { if (Array.isArray(node)) node.forEach((c) => findAll(c, pred, out)); else if (node && typeof node === 'object') { if (pred(node)) out.push(node); Object.values(node).forEach((c) => findAll(c, pred, out)); } return out; }
const hits = findAll(macros['voice hoist visit'], (n) => n.if && n.if.and && JSON.stringify(n.if).includes('HELOVICTIMS'));
assert.strictEqual(hits.length, 1, 'one triage block');
const blk = hits[0];
function run(stage, victims, c, patient) {
  const env = { locals: { HELOVICTIMS: victims }, params: { stage, vhv_c: c, patient }, said: [] };
  const val = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if ('local' in x) return env.locals[x.local] === undefined ? null : env.locals[x.local];
    if ('param' in x) return env.params[x.param];
    if ('text' in x) return x.text.replace(/\{(\d)\}/g, (_, i) => val(x.params[Number(i)]));
    throw new Error('unsupported');
  };
  const cmp = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gte: (a, b) => a >= b };
  const op = (c) => Object.keys(cmp).find((k) => k in c);
  const test = (c, o) => { const left = (o && o.and) ? (o.and.every((r) => test(r, r.require)) ? 1 : 0) : val(o); return cmp[op(c)](left, val(c[op(c)])); };
  const exec = (cmds) => { for (const x of cmds) { if (x.set) env.locals[x.set.local] = val(x.value); else if (x.if) { if (test(x, x.if)) exec(x.then || []); } else if (x.call_macro === 'voice say') env.said.push([val(x.params.key), val(x.params.a)]); else throw new Error('unsupported'); } };
  if (test(blk, blk.if)) exec(blk.then);
  return env.said;
}
assert.deepStrictEqual(run('DONE', 2, 'C', 2), [['TRI.R', '2']], 'critical: red');
assert.deepStrictEqual(run('DONE', 3, 'M', 3), [['TRI.Y', '3']], 'serious: yellow');
assert.deepStrictEqual(run('DONE', 2, 'S', 1), [['TRI.G', '1']], 'stable: green');
assert.deepStrictEqual(run('DONE', 1, 'C', 1), [], 'one patient: no triage');
assert.deepStrictEqual(run('ARR', 3, 'C', 2), [], 'only after the visit');
// the block sits after the HST line, inside the Companion branch
const text = JSON.stringify(macros['voice hoist visit']);
assert.ok(text.indexOf('"key":{"param":"vhv_key"}') < text.indexOf('TRI.{0}'), 'after the HST line');
// stall link
const stall = findAll(macros['Mission dispatch'], (n) => n.link === '- Stuck? CAPTURE SNAPSHOT NOW');
assert.strictEqual(stall.length, 1, 'one stall link');
assert.ok(JSON.stringify(stall[0].show_condition).includes('ops_progress_warning') && JSON.stringify(stall[0].commands).includes('capture diagnostic snapshot'), 'shown while stalled, captures the snapshot');
// report 2026-11-14 (Daikan): the first dispatch of the random map (next_dispatch) and of the start-up (objective1) is read with vda_pending yes, so the crew triage comes before the ACCEPT and the briefing chat after it
for (const name of ['next_dispatch', 'objective1', 'mission dispatched by custom menu']) {
  const text = JSON.stringify(macros[name]);
  assert.ok(text.includes('"vda_pending"},"value":"yes"},{"call_macro":"Mission description"},{"set":{"local":"vda_pending"},"value":"no"}'), name + ' reads its dispatch under vda_pending yes');
}
// user rule 2026-11-14: the acceptance of a second dispatch waits for the end of the crew discussion (vda_talking) before the mission is reloaded
assert.ok(JSON.stringify(macros['voice dispatch triage run']).includes('{"set":{"local":"vda_talking"},"value":1}') && JSON.stringify(macros['voice dispatch triage run']).includes('{"set":{"local":"vda_talking"},"value":0}'), 'the triage raises and lowers vda_talking');
const acc = JSON.stringify(macros['accept dispatch second']);
assert.ok(acc.indexOf('"while":{"local":"vda_talking"}') > 0 && acc.indexOf('"while":{"local":"vda_talking"}') < acc.indexOf('Update_raw from dispatchphase'), 'accept dispatch second waits for the discussion before the reload');
// user rule 2026-11-14: an accepted second dispatch always asks for the dispatcher after the restart (L:VDA_RESP, vda_open yes or not) and shows the replacing page while the briefing closes
const vda = JSON.stringify(macros['voice dispatch accepted']);
assert.ok(vda.indexOf('"vda_was"') > 0 && vda.includes('{"set":{"var":["L:VDA_RESP","number"]},"value":1}') && !/"local":"vda_open"},"eq":"yes"/.test(vda), 'VDA_RESP does not depend on vda_open');
assert.ok(JSON.stringify(macros.accept_dispatch).includes('HOC is replacing old dispatch details with the accepted one. Please wait...'), 'the replacing page is shown at the acceptance of the second dispatch');
console.log('triage and stall link ok');
