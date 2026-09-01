'use strict';

function compact(value) {
  return JSON.stringify(value);
}

function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  visit(value);
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else Object.values(value).forEach((item) => walk(item, visit));
}

function readValue(value, state, params) {
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return 0;
  if (value.global) return state[value.global] ?? 0;
  if (value.param) return params[value.param];
  if (value.require) return readValue(value.require, state, params);
  if (value.add) return value.add.reduce((sum, item) => sum + Number(readValue(item, state, params)), 0);
  if (value.multiply) return value.multiply.reduce((product, item) => product * Number(readValue(item, state, params)), 1);
  if (value.and) return value.and.every((item) => matches(item, state, params));
  if (value.or) return value.or.some((item) => matches(item, state, params));
  return 0;
}

function matches(condition, state, params) {
  const left = readValue(condition.require || condition.if || condition, state, params);
  if (Object.hasOwn(condition, 'eq')) return typeof left === 'boolean' && typeof condition.eq === 'number' ? Number(left) === condition.eq : left === condition.eq;
  if (Object.hasOwn(condition, 'ne')) return typeof left === 'boolean' && typeof condition.ne === 'number' ? Number(left) !== condition.ne : left !== condition.ne;
  if (Object.hasOwn(condition, 'lt')) return left < condition.lt;
  if (Object.hasOwn(condition, 'lte')) return left <= condition.lte;
  if (Object.hasOwn(condition, 'gt')) return left > condition.gt;
  if (Object.hasOwn(condition, 'gte')) return left >= condition.gte;
  return Boolean(left);
}

function execute(commands, state, params = {}, calls = []) {
  for (const command of commands || []) {
    if (command.if) {
      const branch = matches(command, state, params) ? command.then : command.else;
      execute(branch, state, params, calls);
    } else if (command.set?.global) {
      state[command.set.global] = readValue(command.value, state, params);
    } else if (command.call_macro) {
      calls.push(command.call_macro);
    }
  }
  return calls;
}

function validateDfRelease(mission, changelog) {
  const errors = [];
  let checks = 0;
  const expect = (condition, message) => {
    checks += 1;
    if (!condition) errors.push(message);
  };

  const release = changelog.match(/^##\s+(?:Release\s+)?(0\.\d+\s+\d+)\b/m)?.[1];
  expect(Boolean(release), 'DF/release gate: current release heading is missing from CHANGELOG.en.md');
  expect(mission.title === `HEMS RANDOM AND EVERYWHERE MISSIONS ${release}`, `DF/release gate: mission title ${JSON.stringify(mission.title)} does not match changelog release ${JSON.stringify(release)}`);

  const macros = mission.macros;
  const dfMacroBundle = Object.fromEntries(Object.entries(macros).filter(([name]) => name === 'CARLS buttons' || name.startsWith('CARLS DF')));
  const dfBundle = {macros: dfMacroBundle, thread: mission.threads?.['CARLS DF']};
  const sharedState = [
    'CARLS_DF_EDITING', 'CARLS_DF_INPUT_INDEX', 'CARLS_DF_ENTRY_FREQUENCY',
    'CARLS_DF_VALID', 'CARLS_DF_INPUT_ERROR', 'CARLS_DF_D1', 'CARLS_DF_D2',
    'CARLS_DF_D3', 'CARLS_DF_D4', 'CARLS_DF_D5', 'CARLS_DF_D6',
    'CARLS_DF_LAST_INPUT_TIME', 'CARLS_DF_ENTRY_BAND', 'CARLS_DF_SOURCE',
    'CARLS_DF_MODULATION'
  ];

  let duplicateSharedWrites = 0;
  let selfAssignments = 0;
  walk(mission, (item) => {
    if (Array.isArray(item)) {
      for (let index = 1; index < item.length; index += 1) {
        const previous = item[index - 1];
        const currentItem = item[index];
        if (['CARLS_DF_SOURCE', 'CARLS_DF_MODULATION'].includes(currentItem?.set?.global) && compact(previous) === compact(currentItem)) duplicateSharedWrites += 1;
      }
    } else if (item.set?.global && item.value?.global === item.set.global) selfAssignments += 1;
  });
  expect(duplicateSharedWrites === 0, 'DF/release gate: duplicate consecutive source/modulation writes remain in the mission');
  expect(selfAssignments === 0, 'DF/release gate: a global state is assigned to itself');

  for (const name of sharedState) {
    let hasGlobal = false;
    let hasTaskLocal = false;
    let hasStateLvar = false;
    walk(mission, (item) => {
      if (item.global === name) hasGlobal = true;
      if (item.local === name) hasTaskLocal = true;
      if (Array.isArray(item.var) && item.var[0] === `L:${name}`) hasStateLvar = true;
    });
    expect(hasGlobal, `DF/release gate: shared state ${name} is not available across CARLS event tasks`);
    expect(!hasTaskLocal, `DF/release gate: shared state ${name} incorrectly uses task-local scope`);
    expect(!hasStateLvar, `DF/release gate: shared state ${name} incorrectly uses a delayed LVAR`);
  }

  const open = macros['CARLS DF open'] || [];
  const digit = macros['CARLS DF digit'] || [];
  const renderJson = compact(macros['CARLS DF render'] || []);
  const cancelJson = compact(macros['CARLS DF cancel'] || []);
  const timeout = macros['CARLS DF timeout'] || [];
  const timeoutThreadJson = compact(mission.threads?.['CARLS DF'] || {});
  const digitGuard = digit[0];
  const digitCommands = digitGuard?.then || [];

  expect(open.some((command) => command.set?.global === 'CARLS_DF_EDITING' && command.value === 0), 'DF/release gate: opening the DF page must reset shared editing state');
  expect(open.some((command) => command.set?.global === 'CARLS_DF_INPUT_INDEX' && command.value === 1), 'DF/release gate: opening the DF page must initialize the shared cursor to digit 1');
  expect(digitGuard?.if?.global === 'CARLS_DF_INPUT_INDEX' && digitGuard?.lte === 6, 'DF/release gate: numeric input must use the shared linear cursor guard');
  expect(digitCommands[0]?.set?.global === 'CARLS_DF_EDITING' && digitCommands[0]?.value === 1, 'DF/release gate: the first numeric event must enter shared edit mode immediately');

  for (let position = 1; position <= 6; position += 1) {
    const capture = digitCommands.find((command) => command.if?.global === 'CARLS_DF_INPUT_INDEX' && command.eq === position);
    expect(capture?.then?.[0]?.set?.global === `CARLS_DF_D${position}` && capture?.then?.[0]?.value?.param === 'digit', `DF/release gate: digit ${position} is not captured from the current event parameter into shared state`);
  }

  const state = {CARLS_DF_EDITING: 0, CARLS_DF_INPUT_INDEX: 1, CARLS_DF_ENTRY_FREQUENCY: 0};
  for (let position = 1; position <= 6; position += 1) state[`CARLS_DF_D${position}`] = 0;
  execute(digit, state, {digit: 1});
  expect(state.CARLS_DF_EDITING === 1 && state.CARLS_DF_INPUT_INDEX === 2 && state.CARLS_DF_D1 === 1 && state.CARLS_DF_ENTRY_FREQUENCY === 100000, 'DF/release gate: open -> first key does not produce shared state for EDT: 1_#.###');
  expect(renderJson.includes('"text":"EDT: {0}_#.###","params":[{"global":"CARLS_DF_D1"}]'), 'DF/release gate: first digit is not rendered as EDT: 1_#.### from shared state');
  expect(renderJson.includes('"global":"CARLS_DF_INPUT_INDEX"') && renderJson.includes('"global":"CARLS_DF_EDITING"'), 'DF/release gate: EDT visibility still depends on task-local state');

  const renderStates = (macros['CARLS DF render'] || []).map((command) => ({
    guard: command.if,
    layout: command.then?.find((item) => item.set_carls_radio)?.set_carls_radio
  })).filter((stateItem) => stateItem.layout);
  const escStates = renderStates.filter((stateItem) => stateItem.layout.RSK?.[2] === 'ESC');
  const idleStates = renderStates.filter((stateItem) => stateItem.layout.RSK?.[2] === '');
  expect(escStates.length > 0 && escStates.every((stateItem) => compact(stateItem.guard).includes('"global":"CARLS_DF_EDITING"') && compact(stateItem.guard).includes('"eq":1')), 'DF/release gate: every ESC layout must be selected only by shared editing state');
  expect(idleStates.length > 0 && idleStates.every((stateItem) => compact(stateItem.guard).includes('"global":"CARLS_DF_EDITING"') && compact(stateItem.guard).includes('"eq":0')), 'DF/release gate: every idle layout must hide ESC through shared editing state');
  expect(escStates.every((stateItem) => compact(stateItem.layout.Items).includes('"text":"EDT: {0}_#.###"') && compact(stateItem.layout.Items).includes('"global":"CARLS_DF_D1"')), 'DF/release gate: every ESC layout must contain the visible first-digit EDT row');

  [2, 1, 5, 0, 0].forEach((value) => execute(digit, state, {digit: value}));
  expect(state.CARLS_DF_INPUT_INDEX === 7 && state.CARLS_DF_ENTRY_FREQUENCY === 121500, 'DF/release gate: the complete 121.500 sequence drops or reorders a key');

  expect(timeoutThreadJson.includes('"global":"CARLS_DF_EDITING"') && timeoutThreadJson.includes('"global":"CARLS_DF_LAST_INPUT_TIME"') && timeoutThreadJson.includes('"gte":5') && timeoutThreadJson.includes('"call_macro":"CARLS DF timeout"'), 'DF/release gate: the page monitor does not invoke DF timeout after five seconds of shared-state inactivity');
  const incompleteCalls = execute(timeout, {CARLS_DF_INPUT_INDEX: 2, CARLS_DF_VALID: 0});
  expect(incompleteCalls.includes('CARLS DF cancel') && !incompleteCalls.includes('CARLS DF confirm'), 'DF/release gate: an incomplete entry must cancel after the timeout');
  const completeCalls = execute(timeout, {CARLS_DF_INPUT_INDEX: 7, CARLS_DF_VALID: 1});
  expect(completeCalls.includes('CARLS DF confirm'), 'DF/release gate: a complete valid entry must confirm after the timeout');
  expect(cancelJson.includes('"global":"CARLS_DF_EDITING"') && cancelJson.includes('"value":0') && cancelJson.includes('"global":"CARLS_DF_INPUT_INDEX"') && cancelJson.includes('"value":1') && cancelJson.includes('"call_macro":"CARLS DF render"'), 'DF/release gate: timeout cancellation must return the display to idle and hide ESC');

  const handlers = [];
  walk(macros['CARLS buttons'] || [], (item) => {
    if (/^MISSION_RADIO_CARLS_[0-9]$/.test(item.create_event_handler || '')) handlers.push(item);
  });
  for (let value = 0; value <= 9; value += 1) {
    const handler = handlers.find((item) => item.create_event_handler === `MISSION_RADIO_CARLS_${value}`);
    const route = handler?.commands?.[0]?.then?.find((command) => command.call_macro === 'CARLS DF digit');
    expect(route?.params?.digit === value, `DF/release gate: keypad event ${value} does not pass its value directly`);
  }

  return {errors, checks};
}

module.exports = validateDfRelease;
