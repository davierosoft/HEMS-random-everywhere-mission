#!/usr/bin/env node
'use strict';

// Mission side of the speech action bridge (Mission Companion MissionSpeechContract, schema 1). One source of truth for the declared actions:
// this tool generates mission-src/macros/24-speech-bridge.json (the availability evaluation and the click of every declared action) from the
// show_condition of the real user action definitions, so the voice, the button and the keypad share one condition (Option 1 of
// docs/architecture/SPEECH_ACTIONS.md). `check` fails when a button condition or a definition tag diverges; `generate` rewrites the module;
// `tag` adds the definition tags (idempotent) to the modules that create the actions with several definitions; `contract` prints the declaration
// for the Companion (docs/architecture/speech-contract.json).
const fs = require('node:fs');
const path = require('node:path');
const { formatSourceText } = require('./mission-formatter');

const root = path.join(__dirname, '..');
const macroDir = path.join(root, 'mission-src', 'macros');
const moduleFile = path.join(macroDir, '24-speech-bridge.json');
const docFile = path.join(root, 'docs', 'architecture', 'SPEECH_COMMANDS_BY_PHASE.md');
const contractFile = path.join(root, 'docs', 'architecture', 'speech-contract.json');

const PREFIX = 'L:HMC_SPEECH_';
const VARS = {
  contract: PREFIX + 'CONTRACT', session: PREFIX + 'SESSION', ready: PREFIX + 'READY',
  reqSession: PREFIX + 'REQ_SESSION', reqCmd: PREFIX + 'REQ_CMD', reqSeq: PREFIX + 'REQ_SEQ',
  ackSeq: PREFIX + 'ACK_SEQ', ackResult: PREFIX + 'ACK_RESULT'
};

// The six rows of the briefing with the dispatch buttons: [phase and link conditions] -> the button commands; "enabled" is the enabled state of the button itself
function DISPATCH_BRANCHES(first, second, enabled) {
  const link = [[{ require: { local: 'wificonnect' }, ne: 'Disconnected' }], [{ require: { local: 'wificonnect' }, eq: 'Disconnected' }, { require: { var: ['L:CARLS_CONNECTED', 'number'] }, ne: 0 }]];
  const out = [];
  for (const l of link) out.push({ when: { and: [{ require: { local: 'MISSION_PHASE' }, lt: 2 }, ...l, enabled], eq: 1 }, run: [first] });
  for (const l of link) out.push({ when: { and: [{ require: { local: 'MISSION_PHASE' }, gt: 8 }, { require: { local: 'SECOND_DISPATCH' }, eq: 1 }, ...l, enabled], eq: 1 }, run: [second] });
  for (const l of link) out.push({ when: { and: [{ require: { local: 'MISSION_PHASE' }, gt: 8 }, { require: { local: 'second_dispatch_offered' }, eq: 1 }, { require: { local: 'SECOND_DISPATCH' }, ne: 1 }, ...l, enabled], eq: 1 }, run: [second] });
  return out;
}
// The request buttons of the dispatch page (04-dispatch-tablet-ui.json, "Request ambulance / fire engine / police"): their row show_condition plus the enabled state of the button.
function REQUEST_WHEN(variable) {
  return { and: [
    { require: { local: 'MISSION_NUMBER' }, ne: 4 }, { require: { local: 'CLOSEST_AMBULANCE' }, eq: 0 },
    { require: { local: 'MISSION_PHASE' }, gte: 4 }, { require: { local: 'player' }, ne: 'multiplayer' },
    { require: { local: variable }, eq: 0 }
  ] };
}
// code: command code sent by the Companion. userActions: the HPG user action ids the command clicks (the first existing one is clicked).
// tagged: the action has definitions with different show conditions, every creation is followed by a set of the local sp_def_<id> (1-based).
const ACTIONS = [
  { id: 'begin_hoisting', code: 101, userActions: ['begin_hoisting'] },
  { id: 'begin_hoist_up', code: 102, userActions: ['begin_hoist_up'] },
  { id: 'begin_hoist_dwn', code: 103, userActions: ['begin_hoist_dwn'] },
  { id: 'begin_gnd_loading', code: 104, userActions: ['begin_gnd_loading'] },
  { id: 'skid_landing', code: 105, userActions: ['skid_landing'] },
  { id: 'deciditi', code: 106, userActions: ['deciditi'] },
  { id: 'deciditi2', code: 107, userActions: ['deciditi2'] },
  { id: 'ambuloadlock', code: 108, userActions: ['ambuloadlock'] },
  { id: 'hoist_out', code: 109, userActions: ['hoist_out'] },
  { id: 'hoist_in', code: 110, userActions: ['hoist_in'] },
  { id: 'heli_rescue_here', code: 111, userActions: ['heli_rescue_here'] },
  { id: 'heli_rescue_back', code: 112, userActions: ['heli_rescue_back'] },
  { id: 'ambulance_second', code: 113, userActions: ['ambulance_second'] },
  { id: 'ambulance_unload', code: 114, userActions: ['ambulance_prime', 'crew_ambulance_prime'] },
  { id: 'skip', code: 115, userActions: ['skip'] },
  { id: 'skippa', code: 116, userActions: ['skippa'] },
  { id: 'skippb', code: 117, userActions: ['skippb'] },
  { id: 'skippc', code: 118, userActions: ['skippc'] },
  { id: 'reposition_sarah', code: 119, userActions: ['reposition_sarah'] },
  // macro actions (user list of 2026-11-08): not HPG user actions, the tablet buttons are inline commands, so the bridge runs the same commands under the same condition
  { id: 'request_ambulance', code: 120, macro: true, when: REQUEST_WHEN('AMBU_AVAIL'), run: [{ set: { local: 'AMBU_AVAIL' }, value: 2 }, { call_macro: 'Ambulance1' }] },
  { id: 'request_fire_engine', code: 121, macro: true, when: REQUEST_WHEN('FIREENGINE_AVAIL'), run: [{ set: { local: 'FIREENGINE_AVAIL' }, value: 2 }, { call_macro: 'Firetruck1' }] },
  { id: 'request_police', code: 122, macro: true, when: REQUEST_WHEN('POLICE_AVAIL'), run: [{ set: { local: 'POLICE_AVAIL' }, value: 2 }, { call_macro: 'Police1' }] },
  { id: 'show_dispatch', code: 123, macro: true, when: null, run: [{ set_dispatch_dialog: 1 }] },
  { id: 'hide_dispatch', code: 124, macro: true, when: null, run: [{ set_dispatch_dialog: 0 }] },
  { id: 'show_briefing', code: 125, macro: true, when: null, run: [{ set_briefing_dialog: 1 }] },
  { id: 'hide_briefing', code: 126, macro: true, when: null, run: [{ set_briefing_dialog: 0 }] },
  // the ACCEPT DISPATCH and NEXT DISPATCH buttons of the briefing (root/03-briefing.json): six rows, each shown under its own condition; the button commands are the macros "accept dispatch first/second"
  { id: 'accept_dispatch', code: 127, macro: true, branches: DISPATCH_BRANCHES({ call_macro: 'accept dispatch first' }, { call_macro: 'accept dispatch second' }, { require: { local: 'has_location' }, ne: 'no' }) },
  // read-only commands (user list 2026-11-08): they only speak, no readback of their own (noReadback); selfResult = the macro sets sp_result 1 only when it spoke
  { id: 'repeat_dispatch', code: 129, macro: true, noReadback: true, branches: [{ when: { and: [{ require: { local: 'accident_description' }, ne: null }, { require: { local: 'accident_description' }, ne: '' }], eq: 1 }, run: [{ call_macro: 'speech read dispatch' }] }] },
  { id: 'read_briefing', code: 130, macro: true, noReadback: true, branches: [{ when: { and: [{ require: { local: 'accident_description' }, ne: null }, { require: { local: 'accident_description' }, ne: '' }], eq: 1 }, run: [{ call_macro: 'speech read briefing' }] }] },
  { id: 'patient_status', code: 131, macro: true, noReadback: true, branches: [{ when: { and: [{ require: { struct: { local: 'patients' }, path: 'length' }, gt: 0 }], eq: 1 }, run: [{ call_macro: 'speech patient status' }] }] },
  { id: 'distance_destination', code: 132, macro: true, noReadback: true, selfResult: true, branches: [{ when: { and: [{ require: { local: 'MISSION_PHASE' }, gte: 2 }], eq: 1 }, run: [{ set: { local: 'sd_what' }, value: 'distance' }, { call_macro: 'speech destination say' }] }] },
  { id: 'time_destination', code: 133, macro: true, noReadback: true, selfResult: true, branches: [{ when: { and: [{ require: { local: 'MISSION_PHASE' }, gte: 2 }], eq: 1 }, run: [{ set: { local: 'sd_what' }, value: 'time' }, { call_macro: 'speech destination say' }] }] },
  { id: 'next_dispatch', code: 128, macro: true, branches: DISPATCH_BRANCHES({ call_macro: 'next_dispatch' }, { call_macro: 'next_dispatch' }, { require: { local: 'nddisabled' }, eq: null }) }
];
const TAGGED = ['ambuloadlock', 'ambulance_prime'];

function loadModules() {
  const modules = {};
  for (const file of fs.readdirSync(macroDir).filter((name) => name.endsWith('.json') && name !== path.basename(moduleFile)).sort()) {
    const full = path.join(macroDir, file);
    const text = fs.readFileSync(full, 'utf8');
    modules[file] = { full, text, data: JSON.parse(text) };
  }
  return modules;
}

// every creation of a user action: { module, macro, list (the array holding the command), index, def (the create_user_action object) }
function creations(modules) {
  const out = [];
  for (const [file, mod] of Object.entries(modules)) {
    for (const [macro, body] of Object.entries(mod.data)) {
      (function walk(node) {
        if (Array.isArray(node)) {
          node.forEach((child, index) => {
            if (child && typeof child === 'object' && child.create_user_action && typeof child.create_user_action.id === 'string') out.push({ file, macro, list: node, index, def: child.create_user_action });
            walk(child);
          });
          return;
        }
        if (node && typeof node === 'object') Object.values(node).forEach(walk);
      }(body));
    }
  }
  return out;
}

function conditionKey(def) { return def.show_condition === undefined ? 'none' : JSON.stringify(def.show_condition); }

// the distinct conditions of a user action id, in a stable order (none first, then by text): the 1-based position is the definition tag
function distinctConditions(all, id) {
  const keys = [...new Set(all.filter((c) => c.def.id === id).map((c) => conditionKey(c.def)))];
  keys.sort((a, b) => (a === 'none' ? -1 : b === 'none' ? 1 : a < b ? -1 : a > b ? 1 : 0));
  return keys;
}

function ifOf(show, thenList, elseList) {
  const condition = JSON.parse(show);
  const { require, ...rest } = condition;
  const comparators = Object.keys(rest);
  if (!require || comparators.length !== 1) throw new Error('unsupported show_condition shape: ' + show);
  const command = { if: require, [comparators[0]]: rest[comparators[0]], then: thenList };
  if (elseList) command.else = elseList;
  return command;
}
const setVar = (name, value) => ({ set: { var: [name, 'number'] }, value });
const okVar = (id) => PREFIX + 'OK_' + id.toUpperCase();

// "this user action exists and its condition holds now", as the list of commands run when it does (thenList) or does not (elseList)
function gate(all, userAction, thenList, elseList) {
  const conditions = distinctConditions(all, userAction);
  if (!conditions.length) throw new Error('no definition of the user action ' + userAction);
  const exists = (inner, otherwise) => ({ if: { has_user_action: userAction }, eq: 1, then: inner, ...(otherwise ? { else: otherwise } : {}) });
  if (conditions.length === 1 && conditions[0] === 'none') return exists(thenList, elseList);
  if (conditions.length === 1) return exists([ifOf(conditions[0], thenList, elseList)], elseList);
  // several definitions: the tag written at the creation tells which condition belongs to the one that exists now
  const tagged = conditions.map((key, i) => {
    const branch = key === 'none' ? thenList : [ifOf(key, thenList, elseList)];
    return { if: { local: 'sp_def_' + userAction }, eq: i + 1, then: branch };
  });
  const fallthrough = elseList ? [{ if: { local: 'sp_def_' + userAction }, eq: 0, then: elseList }] : [];
  return exists([...tagged, ...fallthrough], elseList);
}

function buildMacros(all) {
  const macros = {};
  // a failing read (a location that does not exist, a null) counts as not available and never ends the thread
  const guard = (inner) => ({ try: inner, catch: [{ set: { local: 'sp_error' }, value: 1 }] });

  macros['speech bridge start'] = [
    { '#comment': 'Speech action bridge (Mission Companion, speech commands). Started by objective1 at every load and by the SPEECH COMMANDS switch of the tablet Settings; does nothing while the setting is off. One thread, one running copy (speech_bridge_running). Contract: docs/architecture/SPEECH_ACTIONS.md and speech-contract.json, generated by tools/speech-bridge.js.' },
    { if: { global: 'SPEECH_COMMANDS' }, eq: 'yes', then: [
      { if: { local: 'speech_bridge_running' }, ne: 1, then: [
        { set: { local: 'speech_bridge_running' }, value: 1 },
        { create_thread: { commands: [{ call_macro: 'speech bridge loop' }] } }
      ] }
    ] }
  ];

  const loop = [
    { '#comment': 'Contract first (ready 0, code, a fresh session, a clean mailbox and every availability at 0), then ready 1. The Companion writes the request session, the command and, last, the sequence; the mission answers with the result and, last, the acknowledgement sequence (1 clicked, 2 not available now). On shut-down or when the setting goes off ready and every availability return to 0.' },
    setVar(VARS.ready, 0),
    setVar(VARS.contract, 1),
    setVar(VARS.reqSession, 0), setVar(VARS.reqCmd, 0), setVar(VARS.reqSeq, 0),
    setVar(VARS.ackResult, 0), setVar(VARS.ackSeq, 0),
    { set: { local: 'sp_session' }, value: { floor: { rand: [1, 999999999] } } },
    setVar(VARS.session, { local: 'sp_session' }),
    { call_macro: 'speech availability' },
    { set: { local: 'sp_last' }, value: 0 },
    setVar(VARS.ready, 1),
    { while: { global: 'SPEECH_COMMANDS' }, eq: 'yes', do: [
      { call_macro: 'speech availability' },
      { set: { local: 'sp_req' }, value: { var: [VARS.reqSeq, 'number'] } },
      { if: { local: 'sp_req' }, ne: { local: 'sp_last' }, then: [
        { set: { local: 'sp_last' }, value: { local: 'sp_req' } },
        { set: { local: 'sp_ses' }, value: { var: [VARS.reqSession, 'number'] } },
        { set: { local: 'sp_cmd' }, value: { var: [VARS.reqCmd, 'number'] } },
        { set: { local: 'sp_result' }, value: 2 },
        { if: { local: 'sp_ses' }, eq: { local: 'sp_session' }, then: [
          { call_macro: 'speech action run', params: { code: { local: 'sp_cmd' } } }
        ] },
        setVar(VARS.ackResult, { local: 'sp_result' }),
        setVar(VARS.ackSeq, { local: 'sp_req' }),
        { if: { local: 'sp_result' }, eq: 1, then: [
          { create_thread: { commands: [{ call_macro: 'speech readback', params: { code: { local: 'sp_cmd' } } }] } }
        ] }
      ] },
      { sleep: 0.25 }
    ] },
    setVar(VARS.ready, 0),
    { call_macro: 'speech availability clear' },
    { set: { local: 'speech_bridge_running' }, value: 0 }
  ];
  macros['speech bridge loop'] = loop;
  macros['speech readback'] = [
    { '#comment': 'Feedback of an accepted spoken command (user request 2026-10-24): after the click (result 1) the copilot reads the command back by voice, pack message CMD.<code> (six options, intercom or voice by the Mission Companion rules). A refused command (result 2) is not read back. Param code.' },
    ...ACTIONS.filter((a) => a.noReadback).map((a) => ({ if: { param: 'code' }, eq: a.code, then: [{ return: 0 }] })),
    { sleep: 0.8 },
    { call_macro: 'voice say', params: { key: { text: 'CMD.{0}', params: [{ param: 'code' }] } } }
  ];

  const avail = [{ '#comment': 'Availability of every declared action = its button exists and its show_condition holds now (copied from the definition by tools/speech-bridge.js; tools/test-speech-bridge.js fails when they diverge). A failing read counts as not available.' }];
  const run = [
    { '#comment': 'Clicks the user action of the code (trigger_user_action = the click of the button, same limits) only while the button exists and its condition holds now; sp_result 1 = clicked, 2 = not available. Param code.' },
    { set: { local: 'sp_result' }, value: 2 }
  ];
  const clear = [{ '#comment': 'Every availability variable back to 0 (bridge stopped).' }];
  for (const action of ACTIONS) {
    const name = okVar(action.id);
    clear.push(setVar(name, 0));
    if (action.macro) {
      const branches = action.branches || [{ when: action.when ? { ...action.when, eq: 1 } : null, run: action.run }];
      const test0 = action.when ? (list, other) => ({ if: action.when, eq: 1, then: list, ...(other ? { else: other } : {}) }) : (list) => list[0] && { if: { global: 'SPEECH_COMMANDS' }, eq: 'yes', then: list };
      const cond = (b, list) => (b.when ? { if: b.when.and ? { and: b.when.and } : b.when, eq: 1, then: list } : { if: { global: 'SPEECH_COMMANDS' }, eq: 'yes', then: list });
      avail.push(guard([setVar(name, 0), ...branches.map((b) => cond(b, [setVar(name, 1)]))]));
      // the first branch whose condition holds runs, once: a flag keeps the later branches from running too
      run.push({ if: { param: 'code' }, eq: action.code, then: [guard([...branches.map((b) => ({ if: { local: 'sp_result' }, ne: 1, then: [cond(b, action.selfResult ? b.run : [...b.run, { set: { local: 'sp_result' }, value: 1 }])] }))])] });
      continue;
    }
    // availability: the first user action of the list that exists decides
    let availability = [setVar(name, 0)];
    for (const userAction of [...action.userActions].reverse()) {
      availability = [gate(all, userAction, [setVar(name, 1)], availability)];
    }
    avail.push(guard(availability));
    // click: the same gate, then trigger
    let click = [];
    for (const userAction of [...action.userActions].reverse()) {
      click = [gate(all, userAction, [{ trigger_user_action: userAction }, { set: { local: 'sp_result' }, value: 1 }], click.length ? click : null)];
    }
    run.push({ if: { param: 'code' }, eq: action.code, then: [guard(click)] });
  }
  macros['speech commands page'] = commandsPage();
  macros['speech tips line'] = tipsLine();
  Object.assign(macros, readOnlyMacros());
  macros['speech availability'] = avail;
  macros['speech action run'] = run;
  macros['speech availability clear'] = clear;
  return macros;
}

// the tips line of the status bar (user request 2026-11-08): at most 49 monospace characters, "SAY: " and the main English phrase of every command available now,
// in the order of ACTIONS; a phrase that does not fit is left out. Locals: TIP_LINE (text), tip_n (phrases), tip_len (characters used).
const TIP_MAX = 49;
function tipsLine() {
  const list = [
    { '#comment': 'Generated by tools/speech-bridge.js (tipsLine). Composes the tips line from the availability variables of the speech bridge; the thread SPEECH TIPS shows it every other 5 s in place of the status bar.' },
    { set: { local: 'TIP_LINE' }, value: ' ' }, { set: { local: 'tip_n' }, value: 0 }, { set: { local: 'tip_len' }, value: 0 }
  ];
  for (const a of ACTIONS) {
    const phrase = PHRASES[a.id].EN[0];
    const first = 'SAY: ' + phrase;
    if (first.length > TIP_MAX) throw new Error('tip phrase too long: ' + a.id);
    const next = ' | ' + phrase;
    list.push({ if: { var: [okVar(a.id), 'number'] }, eq: 1, then: [
      { if: { local: 'tip_n' }, eq: 0, then: [
        { set: { local: 'TIP_LINE' }, value: { text: first } },
        { set: { local: 'tip_len' }, value: first.length }, { set: { local: 'tip_n' }, value: 1 }
      ], else: [
        { if: { local: 'tip_len' }, lte: TIP_MAX - next.length, then: [
          { set: { local: 'TIP_LINE' }, value: { text: '{0}' + next, params: [{ local: 'TIP_LINE' }] } },
          { set: { local: 'tip_len' }, value: { add: [{ local: 'tip_len' }, next.length] } }, { set: { local: 'tip_n' }, value: { add: [{ local: 'tip_n' }, 1] } }
        ] }
      ] }
    ] });
  }
  return list;
}
const say = (key, a) => ({ call_macro: 'voice say', params: { key, ...(a ? { a } : {}) } });
function readOnlyMacros() {
  const m = {};
  m['speech read dispatch'] = [
    { '#comment': 'Voice command "repeat dispatch": the dispatcher reads the dispatch and the objective again (the macro "voice read dispatch" skips a description it already read, so its memory is cleared first). Generated by tools/speech-bridge.js.' },
    { set: { local: 'vrd_last' }, value: null },
    { call_macro: 'voice read dispatch' }
  ];
  m['speech read briefing'] = [
    { '#comment': 'Voice command "read briefing": the copilot or the doctor (chosen at random) reads the description of the dispatch from the briefing, the same text with a key as the dispatcher (DSC.<ID_CARD>.<variant>), on the intercom.' },
    { set: { local: 'br_actor' }, value: 2 },
    { set: { local: 'br_rnd' }, value: { floor: { rand: [0, 100] } } },
    { if: { local: 'br_rnd' }, gt: 49, then: [{ set: { local: 'br_actor' }, value: 3 }] },
    { call_macro: 'voice dispatch language tag', result: 'br_lt' },
    { set: { local: 'br_text' }, value: { local: 'accident_description' } },
    { if: { local: 'accident_description' }, eq: { local: 'sar_desc_final' }, then: [{ set: { local: 'br_text' }, value: { local: 'sar_desc_base' } }] },
    { speak: { text: '<actor{3}>{2}<text:DSC.{0}.{1}>{4}', params: [{ local: 'VAR_MISSION_NUMBER' }, { local: 'CRASH_VARIABLE' }, { param: 'br_lt' }, { local: 'br_actor' }, { local: 'br_text' }] } }
  ];
  const patientLine = (who) => [
    { set: { local: 'ps_key' }, value: 'PST.' + who + '.S' },
    { if: { param: '$item', path: 'lifescore' }, lt: 60, then: [{ set: { local: 'ps_key' }, value: 'PST.' + who + '.W' }] },
    { if: { param: '$item', path: 'lifescore' }, lt: 30, then: [{ set: { local: 'ps_key' }, value: 'PST.' + who + '.C' }] },
    { if: { param: '$item', path: 'lifescore' }, lte: 0, then: [{ set: { local: 'ps_key' }, value: 'PST.' + who + '.D' }] },
    { if: { param: '$item', path: 'assessed' }, ne: 1, then: [{ set: { local: 'ps_key' }, value: 'PST.' + who + '.U' }] },
    say({ local: 'ps_key' }, { param: '$item', path: 'slot' }),
    { sleep: 1.2 }
  ];
  m['speech patient status'] = [
    { '#comment': 'Voice command "patient status": in flight the doctor answers on the intercom (PST.F.*, actor 3); during the ground operations (ops_progress_active 1) the ground team answers on the polycon (PST.G.*, actor 3, radio on). One line per patient of the registry: stable, under lifescore 60 serious, under 30 critical, 0 deceased; a patient not assessed yet is reported as unknown (the registry only tells what a visit established).' },
    { if: { local: 'ops_progress_active' }, eq: 1, then: [
      { for_each: { local: 'patients' }, do: [{ if: { param: '$item', path: 'active' }, eq: 1, then: patientLine('G') }] }
    ], else: [
      { for_each: { local: 'patients' }, do: [{ if: { param: '$item', path: 'active' }, eq: 1, then: patientLine('F') }] }
    ] }
  ];
  m['speech destination say'] = [
    { '#comment': 'Voice commands "distance to destination" / "time to destination" (sd_what distance or time): the copilot gives the distance (km, one decimal) or the time at the ground speed to the destination of the phase: the landing spot (or the accident) before the patient is loaded (MISSION_PHASE up to 6), the hospital of the dispatch from 7, the base from 10. Under 30 kt the time is not estimable. sp_result is set to 1 only when the copilot spoke.' },
    { set: { local: 'sd_kind' }, value: '' }, { set: { local: 'sd_m' }, value: -1 },
    { if: { local: 'MISSION_PHASE' }, lte: 6, then: [
      { if: { has_location: 'accident_location' }, eq: 1, then: [{ set: { local: 'sd_kind' }, value: 'S' }, { set: { local: 'sd_m' }, value: { location: 'accident_location', var: 'distance:m' } }] },
      { if: { has_location: 'landing_spot' }, eq: 1, then: [{ set: { local: 'sd_kind' }, value: 'S' }, { set: { local: 'sd_m' }, value: { location: 'landing_spot', var: 'distance:m' } }] }
    ] },
    { if: { local: 'MISSION_PHASE' }, gte: 7, then: [
      { if: { has_location: 'hospital_user' }, eq: 1, then: [{ set: { local: 'sd_kind' }, value: 'H' }, { set: { local: 'sd_m' }, value: { location: 'hospital_user', var: 'distance:m' } }] }
    ] },
    { if: { local: 'MISSION_PHASE' }, gte: 10, then: [
      { if: { has_location: 'mission_start_location' }, eq: 1, then: [{ set: { local: 'sd_kind' }, value: 'B' }, { set: { local: 'sd_m' }, value: { location: 'mission_start_location', var: 'distance:m' } }] }
    ] },
    { if: { local: 'sd_m' }, gte: 0, then: [
      { set: { local: 'sp_result' }, value: 1 },
      { set: { local: 'sd_gs' }, value: { var: ['GROUND VELOCITY', 'knots'] } },
      { set: { local: 'sd_km' }, value: { divide: [{ round: { multiply: [{ divide: [{ local: 'sd_m' }, 1000] }, 10] } }, 10] } },
      { if: { local: 'sd_what' }, eq: 'distance', then: [
        say({ text: 'DST.{0}', params: [{ local: 'sd_kind' }] }, { local: 'sd_km' })
      ], else: [
        { if: { local: 'sd_gs' }, lt: 30, then: [
          say('TIM.NA')
        ], else: [
          { set: { local: 'sd_min' }, value: { round: { divide: [{ divide: [{ local: 'sd_m' }, { multiply: [{ local: 'sd_gs' }, 0.5144] }] }, 60] } } },
          { if: { local: 'sd_min' }, lt: 1, then: [{ set: { local: 'sd_min' }, value: 1 }] },
          say({ text: 'TIM.{0}', params: [{ local: 'sd_kind' }] }, { local: 'sd_min' })
        ] }
      ] }
    ] }
  ];
  return m;
}
const PHASE_TITLES = [['before_mission', 'BEFORE THE MISSION'], ['flight_to_scene', 'FLIGHT TO THE SCENE'], ['approach_landing', 'APPROACH AND LANDING'], ['ground_operations', 'GROUND OPERATIONS'], ['hoist', 'HOIST'], ['transport', 'TRANSPORT'], ['hospital', 'HOSPITAL'], ['return', 'RETURN']];
// the tablet page "VOICE COMMANDS BY PHASE" (link under the options of the Settings): drawn from the same data as the contract, English phrases
function commandsPage() {
  const rows = [{ text: 'TOP', color: 'black', show_condition: { require: { var: ['L:TOPVIEW', 'number'] }, eq: 1 } }];
  for (let i = 0; i < 20; i++) rows.push({ image: 'sbar' + String(i).padStart(2, '0'), show_condition: { require: { local: 'STATUS_BAR_ID' }, eq: i } });
  rows.push({ text: 'VOICE COMMANDS BY PHASE (say the full phrase, the first one is the main one)', color: 'cyan' });
  for (const [phase, title] of PHASE_TITLES) {
    const list = ACTIONS.filter((a) => INFO[a.id].phases.includes(phase));
    if (!list.length) continue;
    rows.push({ text: ' ' }, { text: title, color: 'yellow' });
    for (const a of list) rows.push({ text: PHRASES[a.id].EN[0] + ' = ' + INFO[a.id].description, monospace: 0 });
  }
  rows.push({ text: ' ' }, { buttonbar: [{ title: 'BACK', commands: [{ call_macro: 'description2' }, { set_dispatch_dialog: 1 }] }] });
  return [{ '#comment': 'Generated by tools/speech-bridge.js from tools/speech-info.json and tools/speech-phrases.json; never edit by hand. The Mission Companion tab Voice commands shows the same list from docs/architecture/speech-contract.json.' }, { set_dispatch: rows }, { set_dispatch_dialog: 1 }];
}
function generatedText(all) { return formatSourceText(JSON.stringify(buildMacros(all)), 'commands'); }

function tagWork(all) {
  const todo = [];
  for (const id of TAGGED) {
    const keys = distinctConditions(all, id);
    for (const c of all.filter((x) => x.def.id === id)) {
      const tag = keys.indexOf(conditionKey(c.def)) + 1;
      const next = c.list[c.index + 1];
      const wanted = { set: { local: 'sp_def_' + id }, value: tag };
      const present = next && JSON.stringify(next) === JSON.stringify(wanted);
      todo.push({ c, wanted, present, id, tag });
    }
  }
  return todo;
}

function check() {
  const modules = loadModules();
  const all = creations(modules);
  const problems = [];
  for (const t of tagWork(all)) if (!t.present) problems.push(`${t.c.file} ${t.c.macro}: ${t.id} is not followed by its definition tag ${t.tag}`);
  for (const action of ACTIONS) for (const userAction of action.userActions || []) if (!all.some((c) => c.def.id === userAction)) problems.push(`no definition of ${userAction}`);
  if (!fs.existsSync(moduleFile)) problems.push('mission-src/macros/24-speech-bridge.json is missing');
  else if (!problems.length && fs.readFileSync(moduleFile, 'utf8') !== generatedText(all)) problems.push('24-speech-bridge.json differs from the generated module (a button condition changed? run: node tools/speech-bridge.js generate)');
  if (fs.existsSync(contractFile) && !problems.length && fs.readFileSync(contractFile, 'utf8') !== contractText()) problems.push('docs/architecture/speech-contract.json differs from the generated contract (run: node tools/speech-bridge.js contract)');
  if (fs.existsSync(docFile) && !problems.length && fs.readFileSync(docFile, 'utf8') !== docText()) problems.push('docs/architecture/SPEECH_COMMANDS_BY_PHASE.md differs from the generated page (run: node tools/speech-bridge.js doc)');
  return { problems, count: ACTIONS.length };
}

// phrases per language: see docs/architecture/SPEECH_ACTIONS.md; main phrase first. "single" are one-word phrases resolved by availability.
const PHRASES = require('./speech-phrases.json');
const INFO = require('./speech-info.json');
function contractText() {
  const actions = ACTIONS.map((a) => ({ id: a.id, code: a.code, availableVar: okVar(a.id), userActions: a.userActions || [], phases: INFO[a.id].phases, description: INFO[a.id].description, phrases: PHRASES[a.id] }));
  const contract = {
    schema: 1, contractCode: 1,
    contractVar: VARS.contract, sessionVar: VARS.session, readyVar: VARS.ready,
    requestSessionVar: VARS.reqSession, requestCommandVar: VARS.reqCmd, requestSequenceVar: VARS.reqSeq,
    ackSequenceVar: VARS.ackSeq, ackResultVar: VARS.ackResult,
    setting: 'SPEECH_COMMANDS', actions
  };
  return JSON.stringify(contract, null, 2) + '\n';
}

function docText() {
  const lines = ['# Voice commands by phase', '', 'Generated by `node tools/speech-bridge.js doc` from `tools/speech-info.json` and `tools/speech-phrases.json`; do not edit by hand. Say the full phrase (the first one is the main one). A command works only while it is available (the same condition as its button).', ''];
  for (const [phase, title] of PHASE_TITLES) {
    const list = ACTIONS.filter((a) => INFO[a.id].phases.includes(phase));
    if (!list.length) continue;
    lines.push('## ' + title.charAt(0) + title.slice(1).toLowerCase(), '', '| Code | Action | What it does | EN phrases |', '| --- | --- | --- | --- |');
    for (const a of list) lines.push('| ' + a.code + ' | `' + a.id + '` | ' + INFO[a.id].description + ' | ' + PHRASES[a.id].EN.join('; ') + ' |');
    lines.push('');
  }
  while (lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n') + '\n';
}

function main() {
  const command = process.argv[2];
  if (command === 'check') {
    const { problems, count } = check();
    if (problems.length) { problems.forEach((p) => console.error('FAIL ' + p)); process.exit(1); }
    console.log(`speech bridge: ${count} actions, module and contract match the live definitions`);
  } else if (command === 'tag') {
    const modules = loadModules();
    const all = creations(modules);
    const changed = new Set();
    // insert from the last index so earlier indexes stay valid
    for (const t of tagWork(all).filter((x) => !x.present).sort((a, b) => b.c.index - a.c.index)) {
      t.c.list.splice(t.c.index + 1, 0, t.wanted);
      changed.add(t.c.file);
    }
    for (const file of changed) {
      const mod = modules[file];
      if (formatSourceText(mod.text, 'commands') !== mod.text) throw new Error(file + ' is not in formatter form; refusing to rewrite it');
      fs.writeFileSync(mod.full, formatSourceText(JSON.stringify(mod.data), 'commands'), 'utf8');
      console.log('tagged ' + file);
    }
    if (!changed.size) console.log('nothing to tag');
  } else if (command === 'generate') {
    const all = creations(loadModules());
    fs.writeFileSync(moduleFile, generatedText(all), 'utf8');
    console.log('wrote ' + path.relative(root, moduleFile));
  } else if (command === 'doc') {
    fs.writeFileSync(docFile, docText(), 'utf8');
    console.log('wrote ' + path.relative(root, docFile));
  } else if (command === 'contract') {
    fs.writeFileSync(contractFile, contractText(), 'utf8');
    console.log('wrote ' + path.relative(root, contractFile));
  } else {
    console.log('Usage: node tools/speech-bridge.js check | tag | generate | contract');
    process.exit(command ? 1 : 0);
  }
}

if (require.main === module) main();
module.exports = { ACTIONS, VARS, check };
