#!/usr/bin/env node
'use strict';

// Speech action bridge, mission side (static; HPG/MSFS and the Mission Companion runtime PENDING): the generated module equals the live button conditions,
// the setting is plumbed through every layer, the mailbox protocol order is kept and the declaration for the Companion is consistent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const bridge = require('./speech-bridge');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'mission-src', 'macros');
const macros = {};
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
const text = (value) => JSON.stringify(value);

// 1. the generated module equals the definitions (conditions, tags) and the contract file equals the generator
const result = bridge.check();
assert.deepEqual(result.problems, [], 'speech bridge module and contract match the live definitions: ' + result.problems.join('; '));
assert.equal(result.count, bridge.ACTIONS.length);

// 2. the mailbox protocol: the Companion writes session, command and last the sequence; the mission answers result first, then the sequence
{
  const loop = text(macros['speech bridge loop']);
  const result1 = loop.indexOf('"L:HMC_SPEECH_ACK_RESULT"');
  const ack = loop.indexOf('"L:HMC_SPEECH_ACK_SEQ","number"]},"value":{"local":"sp_req"}');
  assert.ok(result1 > 0 && ack > result1, 'the result is written before the acknowledgement sequence');
  const ready0 = loop.indexOf('"L:HMC_SPEECH_READY","number"]},"value":0');
  const ready1 = loop.indexOf('"L:HMC_SPEECH_READY","number"]},"value":1');
  assert.ok(ready0 === loop.indexOf('"L:HMC_SPEECH_READY"') && ready1 > ready0, 'ready is 0 while the contract is published, 1 only afterwards');
  assert.ok(loop.indexOf('"L:HMC_SPEECH_SESSION"') < ready1 && loop.indexOf('"L:HMC_SPEECH_CONTRACT"') < ready1, 'contract and a fresh session come before ready 1');
  assert.ok(loop.includes('"floor":{"rand":[1,999999999]}'), 'a random session between 1 and 999999998');
  assert.ok(loop.includes('"L:HMC_SPEECH_REQ_SEQ","number"]},"value":0') && loop.includes('"L:HMC_SPEECH_ACK_SEQ","number"]},"value":0'), 'request and acknowledgement start equal (the Companion handshake needs request == ack)');
  assert.ok(loop.includes('{"if":{"local":"sp_ses"},"eq":{"local":"sp_session"},"then":[{"call_macro":"speech action run"'), 'a wrong session is answered with the default result 2 and never clicks');
  assert.ok(loop.includes('"while":{"global":"SPEECH_COMMANDS"},"eq":"yes"'), 'the loop ends when the setting goes off');
  const end = loop.slice(loop.lastIndexOf('"while"'));
  assert.ok(end.includes('"L:HMC_SPEECH_READY","number"]},"value":0') && end.includes('speech availability clear'), 'ready 0 and every availability cleared at the end');
}

// 3. a click goes through trigger_user_action only behind the existence and condition gate, inside a try
{
  const run = macros['speech action run'];
  assert.equal(text(run[1]), '{"set":{"local":"sp_result"},"value":2}', 'the default result is 2 (not available)');
  const t = text(run);
  const triggers = t.split('"trigger_user_action"').length - 1;
  assert.ok(triggers >= bridge.ACTIONS.length, 'every declared action has a click');
  for (const action of bridge.ACTIONS) assert.ok(t.includes(`"param":"code"},"eq":${action.code},"then":[{"try":`), 'code ' + action.code + ' is a guarded branch');
  for (const userAction of bridge.ACTIONS.flatMap((a) => a.userActions)) assert.ok(t.includes(`{"trigger_user_action":"${userAction}"},{"set":{"local":"sp_result"},"value":1}`), userAction + ' sets result 1 right after the click');
  assert.ok(!/trigger_user_action":"(accept|reject)_/.test(t), 'the map dialogs (accept/reject) have no voice control');
  assert.ok(!/trigger_user_action":"(skip|history|reposition)/.test(t), 'convenience skips are not in the first batch');
}

// 4. the setting SPEECH_COMMANDS: default off in every layer, in the profiles, on the tablet, started at the load
{
  assert.ok(text(macros['settings first run defaults']).includes('{"if":{"global":"SPEECH_COMMANDS"},"eq":null,"then":[{"set":{"global":"SPEECH_COMMANDS"},"value":"no"}]}'), 'first-run default no');
  assert.ok(text(macros['save custom aircraft profile']).includes('"key":"SPEECH_COMMANDS"},"value":{"global":"SPEECH_COMMANDS"}'), 'saved in the aircraft profile');
  assert.ok(text(macros['load custom aircraft profile']).includes('"global":"SPEECH_COMMANDS"},"value":{"table":{"static":{"param":"PROFILE_TABLE"}},"key":"SPEECH_COMMANDS"}'), 'loaded from the aircraft profile');
  for (const profile of ['DEFAULT', 'ROOKIE PILOT', 'EXPERT PILOT', 'EXPERT HEMS']) assert.ok(text(macros[`aircraft factory ${profile}`]).includes('"set":{"global":"SPEECH_COMMANDS"},"value":"no"'), 'factory profile ' + profile + ' keeps the speech commands off');
  const settings = text(macros.settings);
  assert.ok(settings.includes('"title":"OFF (DEFAULT)","select_condition":{"require":{"global":"SPEECH_COMMANDS"},"ne":"yes"}') && settings.includes('"set":{"global":"SPEECH_COMMANDS"},"value":"yes"},{"call_macro":"mark aircraft profile custom"},{"call_macro":"speech bridge start"}'), 'tablet switch starts the bridge and marks the profile custom');
  assert.ok(/^[\x20-\x7e]*$/.test(settings.slice(settings.indexOf('SPEECH COMMANDS'), settings.indexOf('SPEECH COMMANDS') + 400)), 'tablet text is ASCII');
  const o1 = text(macros.objective1);
  assert.ok(o1.indexOf('"events creator"') < o1.indexOf('"speech bridge start"'), 'objective1 starts the bridge after the event handlers');
  assert.ok(text(macros['speech bridge start']).includes('"global":"SPEECH_COMMANDS"},"eq":"yes"'), 'nothing starts while the setting is off');
}

// 5. the declaration for the Companion: distinct codes, names and available variables, phrases in four languages, no click on the map dialogs
{
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'architecture', 'speech-contract.json'), 'utf8'));
  assert.equal(contract.schema, 1);
  assert.equal(contract.setting, 'SPEECH_COMMANDS');
  const names = [contract.contractVar, contract.sessionVar, contract.readyVar, contract.requestSessionVar, contract.requestCommandVar, contract.requestSequenceVar, contract.ackSequenceVar, contract.ackResultVar, ...contract.actions.map((a) => a.availableVar)];
  assert.equal(new Set(names).size, names.length, 'every bridge variable name is distinct');
  for (const name of names) assert.ok(/^L:[A-Za-z][A-Za-z0-9_]{0,95}$/.test(name), name + ' is an explicit LVAR name');
  assert.equal(new Set(contract.actions.map((a) => a.code)).size, contract.actions.length, 'codes are distinct');
  assert.equal(new Set(contract.actions.map((a) => a.id)).size, contract.actions.length, 'ids are distinct');
  for (const action of contract.actions) {
    assert.ok(/^[a-z][a-z0-9_.-]{0,63}$/.test(action.id), action.id);
    for (const lang of ['EN', 'DE', 'IT', 'FR']) assert.ok(Array.isArray(action.phrases[lang]) && action.phrases[lang].length >= 2, action.id + ' has phrases in ' + lang);
    assert.ok(!action.phrases.EN.some((p) => p === 'begin' || p === 'start'), action.id + ': "begin" and "start" alone trigger nothing');
    // a phrase belongs to one action in a language, except the single words, which are resolved by availability at submit time
    for (const lang of ['EN', 'DE', 'IT', 'FR']) for (const phrase of action.phrases[lang].filter((p) => p.includes(' '))) {
      const owners = contract.actions.filter((a) => a.phrases[lang].includes(phrase));
      assert.equal(owners.length, 1, `the phrase "${phrase}" (${lang}) belongs to ${owners.map((o) => o.id).join(', ')}`);
    }
  }
  // owner rule 2026-10-23: only "skid" and "ground" are single words for the skid and ground loading
  assert.ok(contract.actions.find((a) => a.id === 'skid_landing').phrases.EN.includes('skid') && contract.actions.find((a) => a.id === 'begin_gnd_loading').phrases.EN.includes('ground'));
}

console.log(`Speech bridge PASS: ${bridge.ACTIONS.length} actions generated from the live button conditions, mailbox order, setting in every layer, declaration for the Companion. HPG/MSFS and Companion runtime PENDING.`);
