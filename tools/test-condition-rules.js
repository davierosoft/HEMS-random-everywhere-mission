#!/usr/bin/env node
'use strict';

// Rule: the show_condition of the widgets of a dispatch page (set_dispatch rows) uses AND only; OR is forbidden,
// directly or wrapped in require. Other conditions (buttons, user actions, if/while) are not covered by the rule.
// A direct OR in the crew failure row of the end menu raised "Command Failed ... Symbol.iterator" on the tablet.
// The two older pages below still contain OR rows (none in the original baseline): known legacy, not new code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const LEGACY = new Set(['takeoffckl', 'DF stations page']);

const containsOr = (value) => {
  if (Array.isArray(value)) return value.some(containsOr);
  if (value && typeof value === 'object') return Object.hasOwn(value, 'or') || Object.values(value).some(containsOr);
  return false;
};

function offenders(macros) {
  const found = new Map();
  const walk = (value, macro, inDispatch) => {
    if (Array.isArray(value)) { value.forEach((item) => walk(item, macro, inDispatch)); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      const dispatch = inDispatch || key === 'set_dispatch';
      if (dispatch && key === 'show_condition' && containsOr(child)) found.set(macro, (found.get(macro) || 0) + 1);
      walk(child, macro, dispatch);
    }
  };
  for (const [name, commands] of Object.entries(macros)) walk(commands, name, false);
  return found;
}

// The checker itself: AND passes; a direct OR and an OR wrapped in require fail; other conditions are out of scope.
const row = (condition) => ({ page: [{ set_dispatch: [{ text: 'a', show_condition: condition }] }] });
assert.equal(offenders(row({ and: [{ require: { local: 'X' }, eq: 'Y' }], eq: 1 })).size, 0);
assert.equal(offenders(row({ require: { local: 'X' }, eq: 'Y' })).size, 0);
assert.equal(offenders(row({ or: [{ require: { local: 'X' }, eq: 'Y' }], eq: 1 })).size, 1);
assert.equal(offenders(row({ require: { or: [] }, eq: 1 })).size, 1);
assert.equal(offenders({ page: [{ create_user_action: { id: 'a', show_condition: { or: [] } } }] }).size, 0, 'a user action is not a dispatch widget');
assert.equal(offenders({ page: [{ set_dispatch: [{ buttonbar: [{ title: 'b', disabled_condition: { or: [] } }] }] }] }).size, 0, 'only show_condition is covered');

const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) {
  Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
}
const bad = [...offenders(macros)].filter(([name]) => !LEGACY.has(name)).map(([name, count]) => `${name} (${count})`);
assert.deepEqual(bad, [], `the show_condition of dispatch widgets must use AND only, OR is forbidden: ${bad.join(', ')}`);
console.log(`Dispatch widget condition rule PASS: no OR in the show_condition of set_dispatch rows outside ${LEGACY.size} known legacy macros.`);
