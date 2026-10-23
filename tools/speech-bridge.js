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
const contractFile = path.join(root, 'docs', 'architecture', 'speech-contract.json');

const PREFIX = 'L:HMC_SPEECH_';
const VARS = {
  contract: PREFIX + 'CONTRACT', session: PREFIX + 'SESSION', ready: PREFIX + 'READY',
  reqSession: PREFIX + 'REQ_SESSION', reqCmd: PREFIX + 'REQ_CMD', reqSeq: PREFIX + 'REQ_SEQ',
  ackSeq: PREFIX + 'ACK_SEQ', ackResult: PREFIX + 'ACK_RESULT'
};

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
  { id: 'ambulance_unload', code: 114, userActions: ['ambulance_prime', 'crew_ambulance_prime'] }
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
        setVar(VARS.ackSeq, { local: 'sp_req' })
      ] },
      { sleep: 0.25 }
    ] },
    setVar(VARS.ready, 0),
    { call_macro: 'speech availability clear' },
    { set: { local: 'speech_bridge_running' }, value: 0 }
  ];
  macros['speech bridge loop'] = loop;

  const avail = [{ '#comment': 'Availability of every declared action = its button exists and its show_condition holds now (copied from the definition by tools/speech-bridge.js; tools/test-speech-bridge.js fails when they diverge). A failing read counts as not available.' }];
  const run = [
    { '#comment': 'Clicks the user action of the code (trigger_user_action = the click of the button, same limits) only while the button exists and its condition holds now; sp_result 1 = clicked, 2 = not available. Param code.' },
    { set: { local: 'sp_result' }, value: 2 }
  ];
  const clear = [{ '#comment': 'Every availability variable back to 0 (bridge stopped).' }];
  for (const action of ACTIONS) {
    const name = okVar(action.id);
    clear.push(setVar(name, 0));
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
  macros['speech availability'] = avail;
  macros['speech action run'] = run;
  macros['speech availability clear'] = clear;
  return macros;
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
  for (const action of ACTIONS) for (const userAction of action.userActions) if (!all.some((c) => c.def.id === userAction)) problems.push(`no definition of ${userAction}`);
  if (!fs.existsSync(moduleFile)) problems.push('mission-src/macros/24-speech-bridge.json is missing');
  else if (!problems.length && fs.readFileSync(moduleFile, 'utf8') !== generatedText(all)) problems.push('24-speech-bridge.json differs from the generated module (a button condition changed? run: node tools/speech-bridge.js generate)');
  if (fs.existsSync(contractFile) && !problems.length && fs.readFileSync(contractFile, 'utf8') !== contractText()) problems.push('docs/architecture/speech-contract.json differs from the generated contract (run: node tools/speech-bridge.js contract)');
  return { problems, count: ACTIONS.length };
}

// phrases per language: see docs/architecture/SPEECH_ACTIONS.md; main phrase first. "single" are one-word phrases resolved by availability.
const PHRASES = require('./speech-phrases.json');
function contractText() {
  const actions = ACTIONS.map((a) => ({ id: a.id, code: a.code, availableVar: okVar(a.id), userActions: a.userActions, phrases: PHRASES[a.id] }));
  const contract = {
    schema: 1, contractCode: 1,
    contractVar: VARS.contract, sessionVar: VARS.session, readyVar: VARS.ready,
    requestSessionVar: VARS.reqSession, requestCommandVar: VARS.reqCmd, requestSequenceVar: VARS.reqSeq,
    ackSequenceVar: VARS.ackSeq, ackResultVar: VARS.ackResult,
    setting: 'SPEECH_COMMANDS', actions
  };
  return JSON.stringify(contract, null, 2) + '\n';
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
