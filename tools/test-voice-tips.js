#!/usr/bin/env node
'use strict';

// Crew tips (user request of 2026-10-14): in the long legs the crew tells how to use functions of the mission, a conversation of four lines of the
// pack EN (TIP.<topic>.1 to 4). The tips have their own setting CREW TIPS (global CREW_TIPS, 0 or empty = on, 1 = off), independent from CREW CHATTER,
// kept in the profiles like the other settings. Static checks of the production sources and, when the Companion repository is next to this one, of
// its base pack: no HPG/MSFS behaviour is modeled.
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

// 1. the macro: its own setting, the chatter setting does not stop it, the topics in a fixed order from a random start
const tip = macros['voice tip'];
assert.ok(Array.isArray(tip), 'voice tip exists');
const tipText = JSON.stringify(tip);
assert.ok(tipText.includes('"global":"CREW_TIPS"') && tipText.includes('"ne":') && tipText.includes('"tip":1'), 'voice tip reads CREW_TIPS and asks voice calm with the param tip 1');
assert.ok(tipText.includes('"text":"TIP.{0}.{1}"'), 'the key is built from the topic code and the line number');
const codes = collect(tip, (node) => node.set && node.set.local === 'vtp_code' && typeof node.value === 'string').map((node) => node.value);
assert.deepEqual(codes, ['SAV', 'MSL', 'PRF', 'CRW', 'KIT', 'QLK', 'DBG', 'MED', 'FLR', 'CHT', 'TOF'], 'eleven topics in the documented order');
assert.ok(tipText.includes('"rand":[0,11]') && tipText.includes('"gte":11'), 'the random start and the wrap follow the number of topics');
assert.ok(tipText.includes('"lte":4') && tipText.includes('"vtp_n"'), 'four lines for each topic');
assert.ok(!tipText.includes('"speak"'), 'no literal speak: the lines are pack messages through voice say');

// 2. voice calm: the chatter setting stops the small talk but not a tip
const calm = JSON.stringify(macros['voice calm']);
assert.ok(calm.includes('"global":"CREW_CHATTER"') && calm.includes('"require":{"param":"tip"},"ne":1'), 'voice calm lets a call with the param tip 1 through the chatter setting');
for (const need of ['CREW_EMERGENCY_ACTIVE', 'CREW_LIFESCORE_1', 'PATIENTS_KILLED_TOTAL']) assert.ok(calm.includes(need), `voice calm still refuses the mood: ${need}`);

// 3. the cruise chat offers a tip in every leg, also when the chatter setting refuses the small talk
const cruise = text('voice cruise chat');
assert.equal((cruise.match(/"call_macro":"voice tip"/g) || []).length, 6, 'each of the three legs calls voice tip twice (with the small talk and without it)');
assert.equal((cruise.match(/"call_macro":"voice banter"/g) || []).length, 3, 'the banter stays in the three legs');
assert.ok(cruise.includes('"param":"vcc_calm"},"ne":1') && cruise.includes('"param":"vcc_calm2"},"ne":1'), 'a leg without the small talk still offers a tip');

// 4. the setting: saved in and loaded from the profiles, reset to default, a button on the settings page
const save = text('save custom aircraft profile');
const load = text('load custom aircraft profile');
assert.ok(save.includes('"key":"CREW_TIPS"') && load.includes('"key":"CREW_TIPS"'), 'CREW_TIPS is saved in and loaded from the aircraft profiles');
assert.ok(text('resetdefault').includes('"global":"CREW_TIPS"},"value":null'), 'Reset to default clears CREW_TIPS');
const buttons = collect(macros.settings, (node) => typeof node.title === 'string' && /^TIPS (ON|OFF)$/.test(node.title));
assert.equal(buttons.length, 2, 'the settings page has TIPS ON and TIPS OFF');
assert.ok(buttons.every((b) => JSON.stringify(b.commands).includes('mark aircraft profile custom')), 'a change of the setting marks the profile CUSTOM');

// 5. the pack EN of the Companion repository (when it is next to this one)
const packFile = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'EN.xml');
if (fs.existsSync(packFile)) {
  const xml = fs.readFileSync(packFile, 'utf8');
  const messages = {};
  for (const m of xml.matchAll(/<message\b([^>]*)>([\s\S]*?)<\/message>/g)) messages[(m[1].match(/\bkey="([^"]+)"/) || [])[1]] = { attrs: m[1], inner: m[2] };
  for (const code of codes) {
    let group = null;
    for (let n = 1; n <= 4; n += 1) {
      const msg = messages[`TIP.${code}.${n}`];
      assert.ok(msg, `pack EN has TIP.${code}.${n}`);
      const options = [...msg.inner.matchAll(/<o\b[^>]*>([^<]*)<\/o>/g)].map((o) => o[1]);
      assert.equal(options.length, 6, `TIP.${code}.${n} has six options with a text (a tip is never silent)`);
      options.forEach((o) => assert.ok(o.length > 10 && /^[\x20-\x7e]+$/.test(o), `TIP.${code}.${n}: an ASCII text`));
      assert.ok(!/\bfutile="1"/.test(msg.attrs), `TIP.${code}.${n} is not futile: the mission decides with CREW TIPS, not with the chatter`);
      const g = (msg.attrs.match(/\bgroup="([^"]+)"/) || [])[1];
      assert.ok(g && (group === null || g === group), `TIP.${code}.${n}: one group for the conversation`);
      group = g;
      assert.equal((msg.attrs.match(/\bseq="(\d+)"/) || [])[1], String(n), `TIP.${code}.${n}: sequence`);
      assert.ok(/\bactor="[1-3]"/.test(msg.attrs), `TIP.${code}.${n} is said by the pilot, the copilot or the doctor (they exist with three crew)`);
    }
  }
  assert.equal(Object.keys(messages).filter((k) => k && k.startsWith('TIP.')).length, codes.length * 4, 'no tip in the pack without a topic in the macro');
  const declared = Number((text('voice app connect').match(/<pack:EN:(\d+)>/) || [])[1]);
  const packVersion = Number((xml.match(/<voicepack\b[^>]*\bversion="(\d+)"/) || [])[1]);
  assert.ok(declared >= 13, 'the mission declares at least pack EN 13, the first with the TIP messages: an older pack is reported by the Companion');
  assert.ok(packVersion >= declared, 'the base pack is not older than the version the mission declares');
} else {
  console.log('voice tips: the Companion repository is not next to this one, the pack checks are skipped');
}
console.log('Voice tips PASS: eleven topics of four lines, the setting CREW TIPS (profiles, reset, buttons) independent from CREW CHATTER, a tip offered in every long leg. Simulator and Companion runtime PENDING.');
