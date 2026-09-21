#!/usr/bin/env node

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const missionFile = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'everywhere_all.json');
const contractFile = path.join(root, 'tools', 'hvar-command-contract.json');
const mission = JSON.parse(fs.readFileSync(missionFile, 'utf8'));
const contract = JSON.parse(fs.readFileSync(contractFile, 'utf8'));

function fail(message) {
  throw new Error(`HVAR command contract: ${message}`);
}

function requireTrue(condition, message) {
  if (!condition) fail(message);
}

function inventoryCalls(value, location, triggerCalls, setCalls) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inventoryCalls(entry, `${location}[${index}]`, triggerCalls, setCalls));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const triggers = Array.isArray(value.trigger) ? value.trigger : [value.trigger];
  triggers.forEach((trigger, index) => {
    if (typeof trigger === 'string' && trigger.startsWith('H:')) triggerCalls.push(`${location}.trigger[${index}]|${trigger}`);
  });
  if (typeof value.set?.var?.[0] === 'string' && value.set.var[0].startsWith('H:')) {
    setCalls.push(`${location}.set.var[0]|${value.set.var[0]}`);
  }
  Object.entries(value).forEach(([key, entry]) => inventoryCalls(entry, `${location}.${key}`, triggerCalls, setCalls));
}

function summarize(calls) {
  const orderedCalls = [...calls].sort();
  return {
    callCount: orderedCalls.length,
    sha256: crypto.createHash('sha256').update(orderedCalls.join('\n')).digest('hex'),
    commands: [...new Set(orderedCalls.map((call) => call.slice(call.lastIndexOf('|') + 1)))].sort(),
    calls: orderedCalls
  };
}

function sameList(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function checkInventory(name, actual, expected) {
  requireTrue(Number.isInteger(expected?.callCount) && typeof expected?.sha256 === 'string' && Array.isArray(expected?.commands), `${name} inventory is incomplete`);
  requireTrue(actual.callCount === expected.callCount, `${name} call count changed from ${expected.callCount} to ${actual.callCount}`);
  // Array indices are intentionally excluded from the compatibility decision:
  // moving a command in a macro changes its JSON path but not its HPG form.
  // Count and the normalized command set still reject additions, removals, and
  // command-form changes.
  requireTrue(sameList(actual.commands, expected.commands), `${name} HVAR command list changed; document the HPG command form before updating this contract`);
}

const triggerCalls = [];
const setCalls = [];
Object.entries(mission.macros).forEach(([name, macro]) => inventoryCalls(macro, `macros.${name}`, triggerCalls, setCalls));
const trigger = summarize(triggerCalls);
const set = summarize(setCalls);

requireTrue(contract.schema === 1, 'unsupported contract schema');
checkInventory('trigger', trigger, contract.trigger);
checkInventory('set', set, contract.set);

for (const [command, expected] of Object.entries(contract.documentedForms || {})) {
  requireTrue(expected?.form === 'trigger' || expected?.form === 'set', `${command} has no supported documented form`);
  const expectedInventory = expected.form === 'trigger' ? trigger : set;
  const otherInventory = expected.form === 'trigger' ? set : trigger;
  const expectedCount = expectedInventory.calls.filter((call) => call.endsWith(`|${command}`)).length;
  const otherCount = otherInventory.calls.filter((call) => call.endsWith(`|${command}`)).length;
  requireTrue(expectedCount > 0, `${command} must be used as a documented ${expected.form}`);
  requireTrue(otherCount === 0, `${command} must not be used as ${expected.form === 'trigger' ? 'a numeric assignment' : 'a trigger'}`);
}

console.log(`HVAR command contract PASS: ${trigger.callCount} trigger calls and ${set.callCount} existing assignment calls match the documented current command forms.`);
