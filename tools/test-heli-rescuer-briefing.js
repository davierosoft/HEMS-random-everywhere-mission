#!/usr/bin/env node
'use strict';

// Briefing of the crew to the heli rescuer (user request of 2026-10-17): when the rescuer boards, it is the crew who explains the mission, the roles
// and the two sequences (ground, hoist), with questions, doubts and readbacks when CREW CHATTER is FULL. Static checks of the production sources and,
// when the Companion repository is next to this one, of its base pack: no HPG/MSFS or Companion runtime behaviour is modeled.
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
const strip = (macro) => JSON.stringify(macro.filter((entry) => !(entry && typeof entry === 'object' && '#comment' in entry)));

// 1. the macro: only with the Companion, only when the chatter level allows it, returns whether it spoke
const brief = macros['voice heli rescuer briefing'];
assert.ok(Array.isArray(brief), 'voice heli rescuer briefing exists');
const body = strip(brief);
assert.ok(body.includes('"local":"VCP"},"eq":"APP"') && body.includes('"local":"TTS"},"eq":1'), 'only with the Mission Companion voice server (VCP APP, TTS 1)');
assert.ok(body.includes('"global":"AUDIO_DECLUT"},"eq":0') && body.includes('"global":"AUDIO_DECLUT"},"gt":3'), 'the AUDIO_DECLUT levels 1 to 3 keep the old one-sentence briefing');
assert.ok(!body.includes('"speak"'), 'no literal speak: every line is a pack message through voice say');
assert.equal(collect(brief, (n) => 'return' in n).length, 1, 'one return only, at the end: the busy flag is never left set by an early exit');
assert.deepEqual(brief[brief.length - 1], { return: { param: 'hrb_ret' } }, 'the macro returns hrb_ret (1 spoken, 0 the caller keeps the old counter)');
const busy = collect(brief, (n) => n.set && n.set.local === 'hrb_busy').map((n) => n.value);
assert.deepEqual(busy, ['yes', 'no'], 'hrb_busy is set to yes when the briefing starts and to no at the end');
assert.ok(body.indexOf('"hrb_busy"},"value":"yes"') < body.indexOf('"key":{"text":"HRB.OPEN.{0}"'), 'the busy flag is set before the first line');
assert.ok(body.lastIndexOf('"key":"HRB.END"') < body.lastIndexOf('"hrb_busy"},"value":"no"'), 'the busy flag is released after the closing line');
assert.ok(body.includes('"local":"CREW_MEMBER_CAP"') && body.includes('"gte":4'), 'the chief speaks the sequences with four crew or more, the copilot otherwise');
assert.ok(body.includes('"global":"CREW_CHATTER"},"lt":1'), 'the questions, doubts and readbacks need CREW CHATTER on FULL');
assert.ok(body.includes('"location":"accident_location","var":"distance:m"},3704'), 'the time to the scene is the distance at 120 kt (3704 m a minute)');
assert.ok(body.includes('"lt":5') && body.includes('"lt":2') && body.includes('"value":"short"') && body.includes('"value":"none"'), 'complete from 5 minutes, short from 2, the old sentence under 2');

// 2. the keys the macro can say (templates expanded by hand) against the pack
const kinds = ['ACC', 'SAR', 'SARV', 'SARC', 'SARH', 'TRF', 'ORG'];
const expected = [
  ...kinds.map((k) => `HRB.OPEN.${k}`), 'HRB.ETA',
  ...['BOTH', 'SCENE', 'WAY', 'NONE'].map((k) => `HRB.VEH.${k}`),
  ...['ACC', 'SAR', 'TRF', 'ORG'].map((k) => `HRB.MED.${k}`),
  ...['G', 'H'].flatMap((p) => ['CHF', 'CPL'].map((w) => `HRB.PLAN.${p}.${w}`)), 'HRB.PLAN.TRF', 'HRB.PLAN.ORG',
  'HRB.ASK', 'HRB.Q.1', 'HRB.Q.2', 'HRB.Q.3', 'HRB.A.1', 'HRB.A.2', 'HRB.A.3', 'HRB.NOQ',
  'HRB.DB.1', 'HRB.DBA.1', 'HRB.DB.2', 'HRB.DBA.2',
  'HRB.RB.HR', 'HRB.RB.X', 'HRB.RB.DOC', 'HRB.RB.CRW', 'HRB.END'
];
for (const template of ['HRB.OPEN.{0}', 'HRB.VEH.{0}', 'HRB.MED.{0}', 'HRB.PLAN.G.{0}', 'HRB.PLAN.H.{0}', 'HRB.PLAN.{0}', 'HRB.Q.{0}', 'HRB.A.{0}']) assert.ok(body.includes(`"text":"${template}"`), `the macro builds ${template}`);
for (const literal of ['HRB.ETA', 'HRB.ASK', 'HRB.NOQ', 'HRB.DB.1', 'HRB.DBA.1', 'HRB.DB.2', 'HRB.DBA.2', 'HRB.RB.HR', 'HRB.RB.X', 'HRB.RB.DOC', 'HRB.RB.CRW', 'HRB.END']) assert.ok(body.includes(`"key":"${literal}"`), `the macro says ${literal}`);
assert.equal(expected.length, new Set(expected).size, 'no key twice');

// 3. the callers: both pick-ups use the briefing and keep the old counter as the fallback
for (const name of ['pick heli rescuer hoist', 'pick heli rescuer ground']) {
  const text = JSON.stringify(macros[name]);
  assert.equal((text.match(/"call_macro":"voice heli rescuer briefing","result":"hrb_done"/g) || []).length, 1, `${name} calls the briefing once`);
  assert.ok(/"voice heli rescuer briefing","result":"hrb_done"\},\{"if":\{"param":"hrb_done"\},"eq":0,"then":\[\{"set":\{"var":\["L:PAX3\{local:VCP\}25","number"\]\}/.test(text), `${name} keeps the old PAX3 25 counter when the briefing did not speak`);
}

// 4. no chatter on top of the briefing: voice calm refuses and the leg to the scene waits
const calm = strip(macros['voice calm']);
assert.ok(calm.includes('"local":"hrb_busy"},"eq":"yes"'), 'voice calm returns 0 while the briefing is spoken');
const cruise = strip(macros['voice cruise chat']);
assert.ok(cruise.includes('"wait_for":{"local":"hrb_busy"},"ne":"yes"') && cruise.indexOf('"wait_for":{"local":"hrb_busy"},"ne":"yes"') < cruise.indexOf('"key":"CRZ.OUT.PLT"'), 'the chat of the leg to the scene waits for the end of the briefing');

// 5. the pack EN of the Companion repository (when it is next to this one)
const packFile = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'EN.xml');
if (fs.existsSync(packFile)) {
  const xml = fs.readFileSync(packFile, 'utf8');
  const messages = {};
  for (const m of xml.matchAll(/<message\b([^>]*)>([\s\S]*?)<\/message>/g)) messages[(m[1].match(/\bkey="([^"]+)"/) || [])[1]] = { attrs: m[1], inner: m[2] };
  const actual = Object.keys(messages).filter((k) => k && k.startsWith('HRB.')).sort();
  assert.deepEqual(actual, [...expected].sort(), 'the pack has exactly the HRB messages the macro can say');
  const actorOf = {
    1: ['HRB.OPEN.', 'HRB.ASK', 'HRB.A.2', 'HRB.DBA.1', 'HRB.END'],
    2: ['HRB.ETA', 'HRB.VEH.', 'HRB.PLAN.G.CPL', 'HRB.PLAN.H.CPL', 'HRB.DB.2'],
    3: ['HRB.MED.', 'HRB.A.1', 'HRB.A.3', 'HRB.DB.1', 'HRB.RB.DOC'],
    4: ['HRB.PLAN.G.CHF', 'HRB.PLAN.H.CHF', 'HRB.PLAN.TRF', 'HRB.PLAN.ORG', 'HRB.RB.CRW'],
    12: ['HRB.Q.', 'HRB.NOQ', 'HRB.DBA.2', 'HRB.RB.HR', 'HRB.RB.X']
  };
  for (const key of actual) {
    const msg = messages[key];
    const actor = Object.keys(actorOf).find((a) => actorOf[a].some((prefix) => key === prefix || (prefix.endsWith('.') && key.startsWith(prefix))));
    assert.equal((msg.attrs.match(/\bactor="(\d+)"/) || [])[1], actor, `${key} is said by the actor ${actor}`);
    const options = [...msg.inner.matchAll(/<o\b[^>]*>([^<]*)<\/o>/g)].map((o) => o[1]);
    assert.equal(options.length, 6, `${key} has six options with a text (a briefing is never silent)`);
    options.forEach((o) => assert.ok(o.length > 8 && /^[\x20-\x7e]+$/.test(o), `${key}: an ASCII text`));
    assert.ok(!/\bfutile="1"/.test(msg.attrs), `${key} is not futile`);
    assert.equal((msg.attrs.match(/\bgroup="([^"]+)"/) || [])[1], 'hrbrief', `${key}: one group for the conversation`);
    assert.ok(/\bseq="\d+"/.test(msg.attrs), `${key}: a sequence number`);
    if (actor === '12') assert.equal((msg.attrs.match(/\bradio="([^"]+)"/) || [])[1], 'ics', `${key}: the rescuer is heard on the intercom (he is aboard)`);
    // arguments: OPEN ACC/SAR/TRF and ETA take {0}; the vehicles take list/be; nothing else takes a value
    const wantsNumber = ['HRB.OPEN.ACC', 'HRB.OPEN.SAR', 'HRB.OPEN.TRF', 'HRB.ETA'].includes(key);
    const wantsList = key.startsWith('HRB.VEH.') && key !== 'HRB.VEH.NONE';
    options.forEach((o) => {
      const holes = [...o.matchAll(/\{([^}]*)\}/g)].map((h) => h[1]);
      if (wantsNumber) assert.ok(holes.every((h) => h === '0' || h === 'mins:0'), `${key}: only {0} or {mins:0}: ${o}`);
      else if (wantsList) assert.ok(holes.length > 0 && holes.every((h) => /^(list|be):[01]$/.test(h)), `${key}: only list and be values: ${o}`);
      else assert.equal(holes.length, 0, `${key}: no placeholder: ${o}`);
    });
    if (wantsNumber) assert.ok(options.every((o) => o.includes('{0}') || o.includes('{mins:0}')), `${key}: every option says the number`);
  }
  // the ground and the hoist sequences keep the order of the mission: the rescuer first, the crew on his call, the rescuer last
  for (const key of ['HRB.PLAN.G.CHF', 'HRB.PLAN.G.CPL']) {
    const options = [...messages[key].inner.matchAll(/<o\b[^>]*>([^<]*)<\/o>/g)].map((o) => o[1]);
    options.forEach((o) => assert.ok(/\bfirst\b/i.test(o), `${key}: the rescuer goes out first: ${o}`));
    options.forEach((o) => assert.ok(/\blast\b/i.test(o), `${key}: the rescuer boards last: ${o}`));
  }
  for (const key of ['HRB.PLAN.H.CHF', 'HRB.PLAN.H.CPL']) {
    const options = [...messages[key].inner.matchAll(/<o\b[^>]*>([^<]*)<\/o>/g)].map((o) => o[1]);
    options.forEach((o) => assert.ok(/\bfirst\b/i.test(o) && /\blast\b/i.test(o) && /\bcable\b|\bhoist\b|\bwinch\b/i.test(o), `${key}: the rescuer first down on the cable and last up: ${o}`));
  }
  const declared = Number((JSON.stringify(macros['voice app connect']).match(/<pack:EN:(\d+)>/) || [])[1]);
  const packVersion = Number((xml.match(/<voicepack\b[^>]*\bversion="(\d+)"/) || [])[1]);
  assert.ok(declared >= 17, 'the mission declares at least pack EN 17, the first with the HRB messages: an older pack is reported by the Companion');
  assert.ok(packVersion >= declared, 'the base pack is not older than the version the mission declares');
} else {
  console.log('heli rescuer briefing: the Companion repository is not next to this one, the pack checks are skipped');
}
console.log('Heli rescuer briefing PASS: the crew briefs the rescuer (situation, doctor, ground and hoist sequences, go call, last on board), questions, doubts and readbacks with CREW CHATTER FULL, no chatter on top, the old counter as fallback. Simulator and Companion runtime PENDING.');
