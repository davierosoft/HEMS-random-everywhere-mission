#!/usr/bin/env node
'use strict';
// Source-level gate of the user rules of 2026-11-19 (tips line heartbeat, mountain pickup prompt, hoist on, airborne intercom,
// CARLS reminders, teleport armed variable, DF on CARLS power, dispatch diagnostics). HPG/MSFS PENDING.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const macros = (f) => json('mission-src/macros/' + f);

// 1 tips line accepts heartbeat 1 or 2
const threads = read('mission-src/threads/01-startup-and-dispatch-triggers.json');
assert.ok(/"require":\{"var":\["L:HMC_SPEECH_READY","number"\]\},"gte":1/.test(threads), 'the tips line thread accepts READY 1 or 2');

// 2 mountain pickup prompt decided by MOUNTAIN, not by MISSION_NUMBER
const dispatch = macros('04-dispatch-tablet-ui.json');
const pickupRows = JSON.stringify(dispatch).split('Accident site is on mountain').length - 1;
assert.ok(pickupRows >= 1, 'the mountain prompt exists');
const pickupMacro = Object.entries(dispatch).filter(([, v]) => JSON.stringify(v).includes('Pick heli rescuer'));
assert.ok(pickupMacro.length >= 1, 'the heli rescuer button exists');
for (const [name, v] of pickupMacro) {
  const t = JSON.stringify(v);
  const i = t.indexOf('Pick heli rescuer');
  const around = t.slice(Math.max(0, i - 900), i + 900);
  assert.ok(!/"MISSION_NUMBER"\},"eq":2/.test(around), name + ': the heli rescuer row no longer depends on MISSION_NUMBER 2');
  assert.ok(around.includes('MOUNTAIN'), name + ': the heli rescuer row follows MOUNTAIN');
}

// 3 hoist on voice command
const contract = json('docs/architecture/speech-contract.json');
const text = JSON.stringify(contract);
assert.ok(text.includes('hoist_power') && text.includes('201'), 'hoist_power code 201 is in the contract');
const bridge = JSON.stringify(macros('24-speech-bridge.json'));
assert.ok(bridge.includes('H:{local:HXX}_SDK_HOIST_ARM_DEPLOY'), 'the bridge triggers the hoist arm deploy');
assert.ok(bridge.includes('hoist_switch_wait'), 'the bridge is available only while the crew waits for the switch');
const hoist = JSON.stringify(macros('09-hoist-ground-ops.json')['set hoist switch to on']);
assert.ok(/"hoist_switch_wait"\},"value":1/.test(hoist) && /"hoist_switch_wait"\},"value":0/.test(hoist), 'hoist_switch_wait is raised around the wait');

// 4 teleport armed state is a simulator variable
assert.ok(bridge.includes('L:HMC_TELEPORT_ARMED'), 'teleport armed state is L:HMC_TELEPORT_ARMED');
assert.ok(!bridge.includes('"local":"sp_teleport_armed"'), 'no local armed state remains');

// 5 airborne context and CARLS reminders
const checklists = macros('03-aircraft-crew-checklists.json');
assert.ok(JSON.stringify(checklists['voice context publish']).includes('L:HMC_AIRBORNE'), 'the airborne flag is published');
assert.ok(checklists['voice radio remind now'], 'voice radio remind now exists');
assert.ok(JSON.stringify(checklists['voice radio remind now']).includes('loop yield'), 'the reminder loop yields');
assert.ok(JSON.stringify(checklists['voice cruise chat']).includes('voice radio remind now'), 'the cruise chat calls the reminder');
assert.ok(read('voicepacks/EN.xml').includes('RAD.NEED'), 'the EN pack has RAD.NEED');

// 6 DF depends on the CARLS power only
const df = JSON.stringify(macros('10-transfer-special-missions.json')['DF emergency beacon update'].filter((c) => !c['#comment']));
assert.ok(df.includes('"var":["L:CARLS_State","number"]},"ne":0'), 'the DF update requires the CARLS on');
assert.ok(!df.includes('CARLS_CONNECTED'), 'the DF update never depends on the CARLS connection');

// 7 diagnostics
assert.ok(JSON.stringify(checklists['voice read dispatch']).includes('VRD_DBG_SAME'), 'dispatch read diagnostics');
assert.ok(JSON.stringify(checklists['voice dispatch triage run']).includes('VRD_DBG_TRI'), 'triage diagnostics');

// 8 manifest
const manifest = json('mission-src/manifest.json');
for (const n of ['manual transport check', 'voice radio remind now']) assert.ok(manifest.macroOrder.includes(n), n + ' is in the manifest');
assert.strictEqual(manifest.format.macros.headers.length, manifest.macroOrder.length, 'macro formatting metadata matches');
console.log('Session 2026-11-19 rules PASS: tips line, mountain prompt, hoist on, teleport armed variable, airborne and CARLS reminders, DF on CARLS power, diagnostics, manifest. HPG/MSFS PENDING.');
