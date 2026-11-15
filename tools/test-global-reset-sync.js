#!/usr/bin/env node
'use strict';

// Rule of 2026-11-14 (user): the reset macros stay synchronised with the globals. `resetdefault` resets every global that is a setting (written by a button
// of the tablet or saved in the aircraft profiles) and `resetstats` every statistic. Adding or removing such a global changes the matching macro in the same
// change. A global that is neither (a one-shot flag, a scratch value) is listed with its reason in tools/reset-exempt-globals.json.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) {
  Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
}
const exempt = JSON.parse(fs.readFileSync(path.join(__dirname, 'reset-exempt-globals.json'), 'utf8'));

const globalsSetIn = (node, into = new Set()) => {
  if (Array.isArray(node)) node.forEach((child) => globalsSetIn(child, into));
  else if (node && typeof node === 'object') {
    if (node.set && typeof node.set.global === 'string') into.add(node.set.global);
    Object.values(node).forEach((child) => globalsSetIn(child, into));
  }
  return into;
};
// the globals set by the commands of a button, a link or an icon of the tablet pages
const buttonGlobals = new Set();
(function walk(node, inButton) {
  if (Array.isArray(node)) { node.forEach((child) => walk(child, inButton)); return; }
  if (!node || typeof node !== 'object') return;
  const isRow = 'commands' in node && ('title' in node || 'link' in node || 'description' in node);
  if (inButton && node.set && typeof node.set.global === 'string') buttonGlobals.add(node.set.global);
  for (const [key, value] of Object.entries(node)) walk(value, inButton || (key === 'commands' && isRow));
}(macros, false));
const written = globalsSetIn(macros);
const profileGlobals = new Set();
(function walk(node) {
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (!node || typeof node !== 'object') return;
  if (node.set && node.set.table && node.value && typeof node.value === 'object' && typeof node.value.global === 'string') profileGlobals.add(node.value.global);
  Object.values(node).forEach(walk);
}(macros['save custom aircraft profile']));

const resetDefault = globalsSetIn(macros.resetdefault);
const resetStats = globalsSetIn(macros.resetstats);
const covered = new Set([...resetDefault, ...resetStats]);
const references = (name) => JSON.stringify(macros).split(`"global":"${name}"`).length - 1;
const referencesOutside = (name, macro) => references(name) - (JSON.stringify(macros[macro]).split(`"global":"${name}"`).length - 1);

// 1. every global a button of the tablet sets, and every global of the profiles, is reset (or exempt with a reason)
const unreset = [...new Set([...buttonGlobals, ...profileGlobals])].filter((name) => !covered.has(name) && !(name in exempt));
assert.deepStrictEqual(unreset, [], `globals set by the tablet or saved in the profiles that no reset macro clears (add them to resetdefault or resetstats, or to tools/reset-exempt-globals.json with the reason): ${unreset.join(', ')}`);

// 2. the statistics: every counter global is cleared by resetstats
const STAT = /_TOTAL$|^COMPLETED_|_KILLED_|^MISSION_COUNT_START$|^CANCELLED_/;
const missingStats = [...written].filter((name) => STAT.test(name) && !resetStats.has(name));
assert.deepStrictEqual(missingStats, [], `statistics globals missing from resetstats: ${missingStats.join(', ')}`);

// 3. a global removed from the mission leaves no entry behind in the reset macros
for (const [macro, list] of [['resetdefault', resetDefault], ['resetstats', resetStats]]) {
  const stale = [...list].filter((name) => referencesOutside(name, macro) <= 0);
  assert.deepStrictEqual(stale, [], `${macro} resets globals the mission no longer uses: ${stale.join(', ')}`);
}

// 4. an exemption is removed with its global, and a reset global is not exempt
for (const name of Object.keys(exempt)) {
  assert.ok(written.has(name), `exempt global ${name} is not set anywhere any more: remove it from tools/reset-exempt-globals.json`);
  assert.ok(!covered.has(name), `exempt global ${name} is reset by a reset macro: remove the exemption`);
}
console.log(`Global reset sync PASS: ${buttonGlobals.size} tablet globals, ${profileGlobals.size} profile globals, resetdefault ${resetDefault.size}, resetstats ${resetStats.size}, ${Object.keys(exempt).length} exempt.`);
