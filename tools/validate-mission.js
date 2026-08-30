#!/usr/bin/env node

/* Blocking static checks for HEMS Random Everywhere Mission releases. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mission = JSON.parse(fs.readFileSync(path.join(root, 'everywhere_all.json'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(root, 'global.json'), 'utf8'));

const comparators = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte']);
const macroNames = new Set(Object.keys(mission.macros));
const errors = [];
let executableConditions = 0;
let rendererConditions = 0;
let staticMacroCalls = 0;
let carlsLayouts = 0;
let beforeTakeoffRows = 0;

function comparatorCount(value) {
  return Object.keys(value || {}).filter((key) => comparators.has(key)).length;
}

function checkExecutable(command, key, trail) {
  executableConditions += 1;
  if (comparatorCount(command) !== 1) {
    errors.push(`${key} must have exactly one sibling comparator at ${trail}`);
  }
  if (key === 'if' && command.if && typeof command.if === 'object' && !Array.isArray(command.if) && command.if.require) {
    errors.push(`if cannot use direct require operand at ${trail}`);
  }
}

function checkRenderer(condition, key, trail) {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition) || comparatorCount(condition) !== 1) {
    errors.push(`${key} must have exactly one comparator at ${trail}`);
  }
}

function scanLogical(value, trail, logicalDepth = 0, underRequire = false) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => scanLogical(child, `${trail}/${index}`, logicalDepth, underRequire));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const logical = Object.prototype.hasOwnProperty.call(value, 'and') || Object.prototype.hasOwnProperty.call(value, 'or');
  if (logical && logicalDepth > 0 && !underRequire && comparatorCount(value) !== 1) {
    errors.push(`nested logical group needs its own comparator at ${trail}`);
  }

  Object.entries(value).forEach(([key, child]) => {
    const nextDepth = key === 'and' || key === 'or' ? logicalDepth + 1 : logicalDepth;
    scanLogical(child, `${trail}/${key}`, nextDepth, underRequire || key === 'require');
  });
}

function walk(value, trail = '$') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => walk(child, `${trail}/${index}`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  if (Object.prototype.hasOwnProperty.call(value, 'if')) checkExecutable(value, 'if', trail);
  if (Object.prototype.hasOwnProperty.call(value, 'wait_for')) checkExecutable(value, 'wait_for', trail);
  if (Object.prototype.hasOwnProperty.call(value, 'while')) checkExecutable(value, 'while', trail);
  ['show_condition', 'disabled_condition', 'select_condition'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      rendererConditions += 1;
      if (!trail.includes('/create_struct')) checkRenderer(value[key], key, trail);
    }
  });
  if (typeof value.call_macro === 'string' && !value.call_macro.includes('{')) {
    staticMacroCalls += 1;
    if (!macroNames.has(value.call_macro)) errors.push(`missing macro: ${value.call_macro} at ${trail}`);
  }
  if (value.set_carls_radio) {
    carlsLayouts += 1;
    ['LSK', 'RSK'].forEach((side) => {
      const labels = value.set_carls_radio[side];
      if (!Array.isArray(labels) || labels.length !== 3 || labels.some((label) => typeof label !== 'string')) {
        errors.push(`CARLS ${side} must contain three static string labels at ${trail}`);
      }
    });
  }
  Object.entries(value).forEach(([key, child]) => walk(child, `${trail}/${key}`));
}

function checkBeforeTakeoffLayout() {
  const checklist = mission.macros.beforetockl;
  if (!Array.isArray(checklist)) {
    errors.push('missing beforetockl macro');
    return;
  }
  function scan(value, trail) {
    if (Array.isArray(value)) {
      value.forEach((child, index) => scan(child, `${trail}/${index}`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (typeof value.text === 'string' && /\[(?: |V)\]$/.test(value.text)) {
      beforeTakeoffRows += 1;
      if (value.monospace !== 1) errors.push(`beforetockl row must be monospace at ${trail}`);
      if (value.text.length !== 49) errors.push(`beforetockl row must be exactly 49 characters at ${trail}`);
    }
    Object.entries(value).forEach(([key, child]) => scan(child, `${trail}/${key}`));
  }
  scan(checklist, '$/macros/beforetockl');
  if (beforeTakeoffRows !== 33) errors.push(`beforetockl must render 33 state rows; found ${beforeTakeoffRows}`);
}

checkBeforeTakeoffLayout();
walk(mission);
scanLogical(mission, '$');

if (errors.length) {
  console.error(JSON.stringify({ result: 'FAIL', errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  result: 'PASS',
  executableConditions,
  rendererConditions,
  staticMacroCalls,
  carlsLayouts,
  beforeTakeoffRows,
}, null, 2));
