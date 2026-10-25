#!/usr/bin/env node
'use strict';

// Context of the Mission Companion radio rules (intercom, radio, external radio, voice by distance) and the timing of the hospital handover dialog.
// Static checks of the production sources: no HPG/MSFS behaviour is modeled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};
const text = (macro) => JSON.stringify(macros[macro]);

// 1. voice context publish writes every variable the Companion reads, inside the signature check, and the signature carries them
const publish = macros['voice context publish'];
assert.ok(publish, 'voice context publish exists');
const published = collect(publish, (node) => node.set && Array.isArray(node.set.var)).map((node) => node.set.var[0]);
for (const name of ['L:HMC_HELI_OFF', 'L:HMC_CREW_PRESENT', 'L:HMC_CREW_MUTE', 'L:HMC_CHAT_MAX', 'L:HMC_CREW_EXIST', 'L:HMC_AT_BASE', 'L:HMC_ZONE_TECH', 'L:HMC_ZONE_GROUND', 'L:HMC_ZONE_CREW', 'L:HMC_CTX_VALID']) {
  assert.ok(published.includes(name), `${name} is published`);
}
assert.ok(!published.includes('L:HMC_RADIO_ON'), 'the battery is read by the Companion from the aircraft variable, not published');
const signature = collect(publish, (node) => node.set && node.set.local === 'vc_sig')[0];
assert.ok(signature, 'the change signature exists');
const signatureLocals = collect(signature, (node) => typeof node.local === 'string').map((node) => node.local);
for (const local of ['vc_chat', 'vc_off', 'vc_mute', 'vc_mask', 'vc_exist', 'vc_base', 'vc_zt', 'vc_zg', 'vc_zc']) assert.ok(signatureLocals.includes(local), `${local} is in the change signature`);
// the CTX_VALID write stays last of the publish block
const writes = collect(publish, (node) => node.set && Array.isArray(node.set.var) && node.set.var[0].startsWith('L:HMC_')).map((node) => node.set.var[0]);
assert.equal(writes[writes.length - 1], 'L:HMC_CTX_VALID', 'L:HMC_CTX_VALID is written after the other variables');

// 2. the crew existence bits follow CREW_MEMBER_CAP like the aboard bits
const existSteps = collect(publish, (node) => node.set && node.set.local === 'vc_exist').map((node) => JSON.stringify(node.value));
assert.equal(existSteps.length, 5, 'vc_exist: start value and four members');
assert.ok(text('voice context publish').includes('"CREW_MEMBER_CAP"'), 'existence depends on CREW_MEMBER_CAP');

// 3. the zone macros: thresholds 5, 30, 100 m, the object must exist, an error never stops the seat tracker loop
assert.ok(macros['voice zone nearest'] && macros['voice zone class'], 'zone macros exist');
const nearest = text('voice zone nearest');
assert.ok(nearest.includes('"has_object":{"param":"object"}'), 'the zone helper checks that the object exists');
assert.ok(nearest.includes('"try"') && nearest.includes('"catch"'), 'the distance query is protected');
const zoneClass = text('voice zone class');
for (const limit of ['"lte":100', '"lte":30', '"lte":5']) assert.ok(zoneClass.includes(limit), `zone limit ${limit}`);
const calls = collect(publish, (node) => node.call_macro === 'voice zone nearest').map((node) => node.params.object);
assert.deepEqual(calls, ['engineera', 'engineer', 'marshall', 'ambumedic', 'ambumedic3', 'hoist_crew', 'pax1', 'pax2', 'pax3'], 'objects measured for the technician, the ground unit and the crew outside');

// 4. the hospital handover dialog starts when the crew meets the ground crew, before the tablet message of the handover, once in each unloading variant
const nav = JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', '05-navigation-queries.json'), 'utf8'));
let sites = 0;
const visit = (list) => {
  if (!Array.isArray(list)) return;
  const first = list.findIndex((cmd) => cmd && cmd.call_macro === 'voice hospital handover');
  const message = list.findIndex((cmd) => cmd && cmd.call_macro === 'post dispatcher message' && cmd.params && cmd.params.text === 'Patient handed over to ED.');
  if (first >= 0) {
    sites += 1;
    assert.ok(message > first, 'the dialog starts before the message Patient handed over to ED');
    assert.equal(list.filter((cmd) => cmd && cmd.call_macro === 'voice hospital handover').length, 1, 'one dialog call in the block');
  }
  list.forEach((cmd) => { if (cmd && typeof cmd === 'object') Object.values(cmd).forEach((child) => { if (Array.isArray(child)) visit(child); else if (child && typeof child === 'object') Object.values(child).forEach((inner) => visit(inner)); }); });
};
Object.values(nav).forEach(visit);
assert.equal(sites, 5, 'five unloading variants start the hospital dialog');
const lateCalls = JSON.stringify(nav).split('"text":"Patient handed over to ED."}},{"call_macro":"voice hospital handover"}').length - 1;
assert.equal(lateCalls, 0, 'no dialog call right after the handover message');

console.log('Radio context PASS: context variables and signature, zone helpers, hospital dialog before the handover message.');
