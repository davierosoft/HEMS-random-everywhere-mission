'use strict';
// Setting EASTER_EGGS (Settings > Miscellaneous, user request of 2026-10-31): enabled / disabled / auto, default auto.
// 1 April (fool) and 31 October (halloween). ENABLED: every mission start of the day. AUTO: once per flight session.
// DISABLED: never Halloween; the 1 April egg only at the first attempt of the session. The marks are L: variables, so a
// mission reload does not clear them. This test runs the real decision block of the sources against every combination.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const macros = {};
const dir = path.join(root, 'mission-src', 'macros');
for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
const text = (value) => JSON.stringify(value);

// --- the decision block: the commands between the Easter eggs comment and the first "PAPERWORK" command of the same macro
const owner = Object.entries(macros).find(([, commands]) => text(commands).includes('Easter eggs (setting EASTER_EGGS'));
assert.ok(owner, 'the decision block with the Easter eggs comment is missing');
const commands = owner[1];
const from = commands.findIndex((command) => command['#comment'] && command['#comment'].startsWith('Easter eggs (setting EASTER_EGGS'));
const to = commands.findIndex((command, index) => index > from && text(command).includes('"global":"PAPERWORK"'));
assert.ok(from >= 0 && to > from, 'the decision block must end before the PAPERWORK defaults');
const block = commands.slice(from, to);

// --- a small evaluator for exactly the constructs of the block
function value(node, state) {
  if (node === null || typeof node !== 'object') return node;
  if (node.local !== undefined) return state.locals[node.local];
  if (node.global !== undefined) return state.globals[node.global];
  if (node.var !== undefined) { const key = node.var[0]; if (key.startsWith('E:LOCAL MONTH')) return state.month; if (key.startsWith('E:LOCAL DAY')) return state.day; return state.lvars[key] ?? 0; }
  throw new Error(`unsupported value ${text(node)}`);
}
function holds(condition, state) {
  if (condition.and) return condition.and.every((item) => holds(item, state));
  if (condition.or) return condition.or.some((item) => holds(item, state));
  const source = condition.require || condition;
  const left = value(source, state);
  for (const operator of ['eq', 'ne', 'lt']) {
    if (!Object.hasOwn(condition, operator)) continue;
    const right = condition[operator];
    return operator === 'eq' ? left === right : operator === 'ne' ? left !== right : left < right;
  }
  throw new Error(`condition without operator ${text(condition)}`);
}
function run(list, state) {
  for (const command of list) {
    if (command['#comment'] !== undefined) continue;
    if (command.set) {
      const target = command.set;
      const result = command.value;
      if (target.local) state.locals[target.local] = result;
      else if (target.var) state.lvars[target.var[0]] = result;
      else throw new Error(`unsupported set ${text(command)}`);
    } else if (command.if) {
      const condition = command.if.and || command.if.or ? command.if : { require: command.if, eq: command.eq };
      const outcome = command.if.and || command.if.or ? holds(command.if, state) === (command.eq === 1) : holds(condition, state);
      run(outcome ? command.then || [] : command.else || [], state);
    } else throw new Error(`unsupported command ${text(command)}`);
  }
}
function start(state, month, day, setting) {
  state.month = month; state.day = day; state.globals.EASTER_EGGS = setting;
  state.locals = {};
  run(block, state);
  return { fool: state.locals.fool, halloween: state.locals.halloween };
}
const session = () => ({ lvars: {}, globals: {}, locals: {} });

// 1 April, fool
for (const [setting, expected] of [['enabled', [1, 1, 1]], ['auto', [1, 0, 0]], ['disabled', [1, 0, 0]]]) {
  const s = session();
  const seen = [1, 2, 3].map(() => start(s, 4, 1, setting).fool);
  assert.deepEqual(seen, expected, `1 April, ${setting}: three mission starts of one session`);
}
// 31 October, halloween
for (const [setting, expected] of [['enabled', [1, 1, 1]], ['auto', [1, 0, 0]], ['disabled', [0, 0, 0]]]) {
  const s = session();
  const seen = [1, 2, 3].map(() => start(s, 10, 31, setting).halloween);
  assert.deepEqual(seen, expected, `31 October, ${setting}: three mission starts of one session`);
}
// the other days, and the two eggs never together
for (const setting of ['enabled', 'auto', 'disabled']) {
  const s = session();
  for (const [month, day] of [[1, 1], [4, 2], [10, 30], [11, 1], [12, 25]]) assert.deepEqual(start(s, month, day, setting), { fool: 0, halloween: 0 }, `${month}/${day} ${setting}: no egg`);
  assert.deepEqual(s.lvars, {}, 'a day without an egg leaves the session marks alone');
}
const mixed = session();
assert.deepEqual(start(mixed, 4, 1, 'auto'), { fool: 1, halloween: 0 });
assert.deepEqual(start(mixed, 10, 31, 'auto'), { fool: 0, halloween: 1 }, 'the marks of the two eggs are independent');
// a new flight session (empty marks) plays again
assert.deepEqual(start(session(), 10, 31, 'auto'), { fool: 0, halloween: 1 }, 'a new flight session plays the egg again');

// --- the setting itself: menu, default, profiles, reset
const settings = text(macros.settings || macros['settings'] || []);
const tablet = Object.values(macros).map(text).join('');
assert.ok(/"title":"ENABLED","select_condition":\{"require":\{"global":"EASTER_EGGS"\},"eq":"enabled"\}/.test(tablet), 'menu button ENABLED');
assert.ok(/"title":"DISABLED","select_condition":\{"require":\{"global":"EASTER_EGGS"\},"eq":"disabled"\}/.test(tablet), 'menu button DISABLED');
assert.ok(/"title":"AUTO","select_condition":\{"require":\{"global":"EASTER_EGGS"\},"eq":"auto"\}/.test(tablet), 'menu button AUTO');
assert.ok(tablet.includes('Easter eggs (1 April and 31 October)'), 'menu text');
const defaults = text(macros['settings first run defaults']);
assert.ok(defaults.includes('"if":{"global":"EASTER_EGGS"},"eq":null,"then":[{"set":{"global":"EASTER_EGGS"},"value":"auto"}]'), 'default auto only when null');
assert.ok(text(macros['save custom aircraft profile']).includes('"key":"EASTER_EGGS"') && text(macros['load custom aircraft profile']).includes('"key":"EASTER_EGGS"'), 'saved in and loaded from the profiles');
assert.ok(text(macros.resetdefault).includes('"global":"EASTER_EGGS"},"value":null'), 'Reset to default clears the option');
const menuButtons = tablet.match(/\{"title":"(ENABLED|DISABLED|AUTO)","select_condition":\{"require":\{"global":"EASTER_EGGS"\}[^]*?\]\}/g) || [];
assert.equal(menuButtons.length, 3);
assert.ok(menuButtons.every((button) => button.includes('"call_macro":"mark aircraft profile custom"')), 'each button marks the profile CUSTOM');

console.log('Easter eggs PASS: enabled / auto (once per session) / disabled on 1 April and 31 October, marks survive reloads, setting in menu, defaults, profiles and reset.');
