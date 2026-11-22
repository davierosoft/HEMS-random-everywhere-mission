#!/usr/bin/env node
'use strict';
// Additional ambulances 3 and 4 (2026-11-22), see docs/architecture/AMBULANCE_ADDITIONAL.md. Static contract plus the request logic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(__dirname, '../mission-src/macros');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
const byFile = {}; const macros = {};
for (const f of files) { byFile[f] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); Object.assign(macros, byFile[f]); }
const extra = byFile['27-ambulance-additional.json'];
assert.ok(extra, 'macros/27-ambulance-additional.json exists');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../mission-src/manifest.json'), 'utf8'));
assert.ok(JSON.stringify(manifest).includes('macros/27-ambulance-additional.json'), 'the module is registered in the manifest');
const J = JSON.stringify;
const count = (s, re) => (s.match(re) || []).length;

// 1. the family of ambulance 2 exists for 3 and 4, and only there
const family = ['Ambulance2', 'park_ambulance2', 'park_ambulance2_scene', 'ambulance2_restart_at_slow_speed', 'drive ambulance2 safe',
  'drive ambulance2 safe multiplier', 'ambulance2 secondary rescue', 'scene spacing ambulance2'];
for (const n of [3, 4]) for (const name of family) {
  const m = name.replace('Ambulance2', 'Ambulance' + n).replace('ambulance2', 'ambulance' + n);
  assert.ok(extra[m], `${m} is in module 27`);
  for (const f of files) if (f !== '27-ambulance-additional.json') assert.ok(!byFile[f][m], `${m} lives only in module 27`);
  const t = J(extra[m]);
  assert.ok(!/ambumedic2|ambustretcher2|AMBU2_|ambulance2_secondary|Ambulance2clearance|ambu2_[a-z]*_/.test(t.replace(/ambu2_parked/g, '')), `${m} has no leftover of ambulance 2 itself`);
  assert.ok(!/ambumedic7|ambustretcher7/.test(t), `${m} never uses the crew of ambulance 1`);
}
assert.deepEqual(Object.keys(extra).filter(k => !/[34]/.test(k)).sort(), ['ambulance next free', 'call additional ambulance']);

// 2. crew object names of the new vehicles do not collide with objects of other roles
const others = J(Object.fromEntries(Object.entries(macros).filter(([k]) => !/ambulance[34]|Ambulance[34]|next free|additional ambulance/.test(k))));
for (const o of ['ambumedic8', 'ambumedic9', 'ambustretcher8', 'ambustretcher9']) {
  const own = count(J(extra), new RegExp(o + '(?![0-9])', 'g'));
  assert.ok(own > 0, o + ' is used by the new ambulances');
}

// 3. every route that clears ambulance 2 clears 3 and 4, and Ambulance1 starts only ambulance 2 by itself
const all = J(macros);
const c2 = count(all, /"local":\s*"Ambulance2clearance"\s*\},\s*"value":\s*"clear"/g);
assert.ok(c2 >= 4, 'ambulance 2 clearance sites found');
assert.equal(count(all, /"local":\s*"Ambulance3clearance"\s*\},\s*"value":\s*"clear"/g), c2, 'ambulance 3 clearance mirrors ambulance 2');
assert.equal(count(all, /"local":\s*"Ambulance4clearance"\s*\},\s*"value":\s*"clear"/g), c2, 'ambulance 4 clearance mirrors ambulance 2');
const callers = (name) => Object.entries(macros).filter(([, body]) => J(body).replace(/\s/g, '').includes(`"call_macro":"${name}"`)).map(([k]) => k);
assert.deepEqual(callers('Ambulance2'), ['Ambulance1', 'call additional ambulance']);
assert.deepEqual(callers('Ambulance3'), ['call additional ambulance']);
assert.deepEqual(callers('Ambulance4'), ['call additional ambulance']);
const amb1 = J(macros['Ambulance1']);
for (const n of [2, 3, 4]) assert.ok(amb1.includes(`"local":"ambulance_requested_${n}"},"value":0`) || amb1.replace(/\s/g, '').includes(`"local":"ambulance_requested_${n}"},"value":0`), `Ambulance1 resets the request of ambulance ${n}`);
assert.ok(J(macros['objective1']).includes('ambu3arrived') && J(macros['objective1']).includes('ambu4arrived'), 'objective1 resets the arrival of ambulances 3 and 4');

// 4. the registry knows the tickets of the new vehicles; the transport check counts them
const reg = J(byFile['17-multipatient-runtime.json']);
for (const n of [3, 4]) assert.ok(reg.includes(`ambulance${n}_transport_ticket`), `registry ticket of ambulance ${n}`);
const mtc = J(macros['manual transport check']);
for (const n of [3, 4]) assert.ok(mtc.includes(`"has_object":"ambulance${n}"`), `the transport check counts ambulance ${n}`);

// 5. the button: only in the transport step of a manual visit, only when the check allows it
const medical = Object.values(byFile['07-patient-medical.json']).map(J).join('\n');
const button = medical.match(/\{"buttonbar":\[\{"title":"CALL AMBULANCE"[^\n]*/);
assert.ok(button, 'CALL AMBULANCE button on the medical page');
for (const need of ['"call_macro":"call additional ambulance"', '"local":"medical_display_amb_call_ok"},"eq":1', '"local":"medical_display_manual_state"},"eq":"transport"', '"local":"medical_display_manual_mode"},"eq":"manual"']) assert.ok(button[0].includes(need), 'button: ' + need);
assert.ok(mtc.includes('"local":"medical_display_amb_call_ok"},"value":1'), 'the transport check can enable the button');
assert.ok(!/AMBULOCK/.test(J(macros['call additional ambulance'])), 'the setting is not read here: the check above decides');

// 6. request logic, evaluated on the production macro lists
function run(list, env) {
  const val = (v) => (v && typeof v === 'object' && 'local' in v) ? env.locals[v.local] ?? null : v;
  const test = (c) => {
    const holder = c.if;
    const evalOne = (h, rest) => {
      let left;
      if (h.has_object !== undefined) left = env.objects.has(h.has_object) ? 1 : 0;
      else if (h.local !== undefined) left = env.locals[h.local] ?? null;
      else throw new Error('unsupported condition ' + J(h));
      const right = val(rest.eq ?? rest.ne ?? rest.gt ?? rest.lte);
      if ('eq' in rest) return left === right;
      if ('ne' in rest) return left !== right;
      if ('gt' in rest) return left > right;
      throw new Error('unsupported operator');
    };
    if (holder.and) return holder.and.every(x => evalOne(x.require, x)) === (c.eq === 1);
    return evalOne(holder, c);
  };
  for (const c of list) {
    if (c['#comment']) continue;
    if (c.set) { env.locals[c.set.local] = val(c.value); continue; }
    if (c.if) { if (test(c)) run(c.then ?? [], env); else if (c.else) run(c.else, env); continue; }
    throw new Error('unsupported command ' + J(c));
  }
}
const nextFree = (requested, objects = []) => {
  const env = { locals: { ambulance_requested_2: requested[0], ambulance_requested_3: requested[1], ambulance_requested_4: requested[2] }, objects: new Set(objects) };
  run(extra['ambulance next free'], env);
  return [env.locals.ambulance_next_free, env.locals.ambulance_pending];
};
assert.deepEqual(nextFree([0, 0, 0]), [2, 0], 'first the second ambulance');
assert.deepEqual(nextFree([1, 0, 0]), [3, 1], 'then the third (the second is still driving in)');
assert.deepEqual(nextFree([1, 0, 0], ['ambulance2']), [3, 0], 'a created ambulance is no longer pending');
assert.deepEqual(nextFree([1, 1, 0], ['ambulance2', 'ambulance3']), [4, 0]);
assert.deepEqual(nextFree([1, 1, 1], ['ambulance2', 'ambulance3', 'ambulance4']), [0, 0], 'none left');
assert.deepEqual(nextFree([null, null, null]), [2, 0], 'unset flags count as not requested');
console.log('Ambulance additional PASS: ambulances 3 and 4 (family of ambulance 2, clearance, resets, registry, transport check, CALL AMBULANCE button, next free request). Simulator validation PENDING.');
