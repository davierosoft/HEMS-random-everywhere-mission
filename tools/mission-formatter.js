#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const INDENT = '  ';
const SHORT_COMMAND_LIMIT = 240;
const COMMAND_KEYS = new Set([
  'call_macro', 'create_location', 'create_object', 'create_thread', 'destroy_object', 'fetch', 'for_each', 'if',
  'remote_notify', 'set', 'set_message', 'sleep', 'wait_for', 'while',
]);
const STRUCTURED_KEYS = new Set(['catch', 'click_commands', 'commands', 'do', 'else', 'no_results_commands', 'then', 'try', 'zones']);

function spaces(level) {
  return INDENT.repeat(level);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCommand(value) {
  return isPlainObject(value) && Object.keys(value).some((key) => COMMAND_KEYS.has(key));
}

function hasStructuredCommands(value) {
  if (Array.isArray(value)) return value.some(hasStructuredCommands);
  if (!isPlainObject(value)) return false;
  return Object.keys(value).some((key) => STRUCTURED_KEYS.has(key) || hasStructuredCommands(value[key]));
}

function compactDataEntries(key) {
  return /name|vehicle|ambulance|police|fireman|civils|workers|wreck|barrier|light|transport/i.test(key);
}

function isLogicObject(value) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length === 1 && (keys[0] === 'and' || keys[0] === 'or') && Array.isArray(value[keys[0]]);
}

function formatLogicCommand(value, level) {
  const key = Object.keys(value)[0];
  const entries = value[key].map((entry) => formatCommand(entry, level + 1));
  return `${spaces(level)}{"${key}": [\n${entries.join(',\n')}\n${spaces(level)}]}`;
}

function formatLogicField(value, level) {
  const key = Object.keys(value)[0];
  const entries = value[key].map((entry) => formatCommand(entry, level + 1));
  return `${spaces(level)}"${key}": [\n${entries.join(',\n')}\n${spaces(level)}]}`;
}

function formatDataEntry(value, level) {
  const keys = Object.keys(value);
  const lines = keys.map((key) => `${spaces(level + 1)}${JSON.stringify(key)}: ${JSON.stringify(value[key])}`);
  return `${spaces(level)}{\n${lines.join(',\n')}\n${spaces(level)}}`;
}

function formatCommand(value, level) {
  if (!isPlainObject(value)) return JSON.stringify(value);
  if (Object.prototype.hasOwnProperty.call(value, 'set') && JSON.stringify(value).length <= SHORT_COMMAND_LIMIT) {
    return `${spaces(level)}${JSON.stringify(value)}`;
  }
  if (isLogicObject(value)) return formatLogicCommand(value, level);
  if (Object.prototype.hasOwnProperty.call(value, 'create_thread')) {
    const thread = value.create_thread;
    const commands = thread && thread.commands;
    if (thread && Array.isArray(commands)) {
      const prefix = `${spaces(level)}{"create_thread": {\n${spaces(level + 1)}"commands": [`;
      const body = commands.map((command) => `\n${formatValue(command, level + 2, 'commands')}`).join(',');
      return `${prefix}${body}\n${spaces(level)}]}}`;
    }
  }
  const conditionKey = Object.prototype.hasOwnProperty.call(value, 'if') ? 'if' : 'while';
  const branchKeys = conditionKey === 'while' ? new Set(['do']) : new Set(['then', 'else']);
  if (Object.prototype.hasOwnProperty.call(value, conditionKey) && Array.isArray(value[conditionKey === 'while' ? 'do' : 'then'])) {
    let result = `${spaces(level)}{`;
    const keys = Object.keys(value);
    let branchStarted = false;
    keys.forEach((key, index) => {
      if (branchKeys.has(key)) {
        branchStarted = true;
        const commands = value[key];
        if (!Array.isArray(commands)) {
          result += `\n${spaces(level + 1)}${JSON.stringify(key)}: ${JSON.stringify(commands)}`;
          return;
        }
        const body = commands.map((command) => `\n${formatValue(command, level + 2, 'commands')}`).join(',');
        if (key === 'else' && result.endsWith(']')) {
          result += `,${JSON.stringify(key)}: [${body}\n${spaces(level + 1)}]`;
        } else {
          result += `${result.endsWith('{') ? '' : ','}\n${spaces(level + 1)}${JSON.stringify(key)}: [${body}\n${spaces(level + 1)}]`;
        }
        return;
      }
      const separator = index === 0 ? '' : ', ';
      if (branchStarted) {
        if (result.endsWith(']')) result += ',';
        result += `\n${spaces(level + 1)}`;
      }
      else result += separator;
      if (key === conditionKey && isLogicObject(value[key])) {
        result += `${JSON.stringify(key)}: {\n${formatLogicField(value[key], level + 1)}`;
      } else {
        result += `${JSON.stringify(key)}: ${JSON.stringify(value[key])}`;
      }
    });
    return result.endsWith(']')
      ? `${result.slice(0, result.lastIndexOf('\n') + 1)}${spaces(level)}]}`
      : `${result}\n${spaces(level)}}`;
  }
  if (hasStructuredCommands(value)) return formatStructuredObject(value, level);
  return `${spaces(level)}${JSON.stringify(value)}`;
}

function formatArray(value, level, mode) {
  if (value.length === 0) return '[]';
  const entries = value.map((entry) => {
    if (mode === 'commands' || isCommand(entry)) return formatCommand(entry, level + 1);
    if (mode === 'data' && isPlainObject(entry)) return formatDataEntry(entry, level + 1);
    return `${spaces(level + 1)}${JSON.stringify(entry)}`;
  });
  return `[\n${entries.join(mode === 'data' ? ',\n\n' : ',\n')}\n${spaces(level)}]`;
}

function formatValue(value, level, mode) {
  if (Array.isArray(value)) return formatArray(value, level, mode);
  if (isPlainObject(value)) {
    if (isCommand(value) || mode === 'commands') return formatCommand(value, level);
    if (hasStructuredCommands(value)) return formatStructuredObject(value, level, mode);
    return formatObject(value, level, mode);
  }
  return JSON.stringify(value);
}

function formatObject(value, level, mode) {
  const keys = Object.keys(value);
  if (keys.length === 0) return '{}';
  const lines = keys.map((key) => {
    const child = value[key];
    let rendered;
    if (isCommand(value)) return formatCommand(value, level);
    if (Array.isArray(child)) {
      rendered = formatArray(child, level + 1, key === 'commands' ? 'commands' : mode);
    } else if (isPlainObject(child)) {
      rendered = formatObject(child, level + 1, mode);
    } else {
      rendered = JSON.stringify(child);
    }
    return `${spaces(level)}${JSON.stringify(key)}: ${rendered}`;
  });
  return `{\n${lines.join(',\n')}\n${spaces(Math.max(0, level - 1))}}`;
}

function formatStructuredObject(value, level, mode) {
  const keys = Object.keys(value);
  if (keys.length === 0) return '{}';
  const lines = keys.map((key) => {
    const child = value[key];
    let rendered;
    if (Array.isArray(child)) {
      rendered = formatArray(child, level + 1, STRUCTURED_KEYS.has(key) ? 'commands' : mode);
    } else if (isPlainObject(child) && hasStructuredCommands(child)) {
      rendered = formatStructuredObject(child, level + 1, mode).trimStart();
    } else {
      rendered = JSON.stringify(child);
    }
    return `${spaces(level + 1)}${JSON.stringify(key)}: ${rendered}`;
  });
  const body = lines.join(',\n');
  const lastKey = keys[keys.length - 1];
  const closesArray = Array.isArray(value[lastKey]) && body.endsWith(']') && !body.endsWith('[]');
  if (closesArray) {
    const lastBreak = body.lastIndexOf('\n');
    const alignedBody = `${body.slice(0, lastBreak + 1)}${spaces(level)}]`;
    return `${spaces(level)}{\n${alignedBody}}`;
  }
  return `${spaces(level)}{\n${body}\n${spaces(level)}}`;
}

function normalizeCommandLayout(text) {
  const lines = text.split('\n');
  for (let index = 0; index < lines.length - 1; index += 1) {
    const current = lines[index].trim();
    const next = lines[index + 1].trim();
    if (current === '{' && /^"[^\"]+": /.test(next)) {
      lines[index] = `${lines[index]}${next}`;
      lines.splice(index + 1, 1);
      index -= 1;
    }
  }
  return lines.join('\n');
}

function formatSection(value, level, mode = 'commands') {
  const keys = Object.keys(value);
  const lines = keys.map((key) => {
    const child = value[key];
    const childMode = mode === 'data' && !compactDataEntries(key) ? 'data' : mode;
    const rendered = Array.isArray(child)
      ? formatArray(child, level, childMode)
      : formatValue(child, level + 1);
    return `${spaces(level)}${JSON.stringify(key)}: ${rendered}`;
  });
  const separator = mode === 'commands' ? ',\n' : ',\n\n';
  return `{\n${lines.join(separator)}\n${spaces(Math.max(0, level - 1))}}`;
}

function formatMission(mission) {
  const keys = Object.keys(mission);
  const lines = keys.map((key) => {
    const value = mission[key];
    let rendered;
    if (key === 'macros' || key === 'data') {
      rendered = formatSection(value, 1, key === 'macros' ? 'commands' : 'data');
      if (key === 'macros') rendered = normalizeCommandLayout(rendered);
    }
    else if (Array.isArray(value)) rendered = formatArray(value, 1);
    else if (isPlainObject(value)) rendered = formatObject(value, 1);
    else rendered = JSON.stringify(value);
    return `${spaces(1 - 1)}${JSON.stringify(key)}: ${rendered}`;
  });
  return `{\n${lines.join(',\n\n')}\n}\n`;
}

function formatJsonText(text) {
  return formatMission(JSON.parse(text));
}

function formatSourceText(source, mode) {
  const parsed = JSON.parse(source);
  let formatted = formatSection(parsed, 1, mode);
  if (mode === 'commands') formatted = normalizeCommandLayout(formatted);
  formatted += '\n';
  JSON.parse(formatted);
  return formatted;
}

function formatSourceFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const mode = file.includes(`${path.sep}data${path.sep}`) ? 'data' : 'commands';
  fs.writeFileSync(file, formatSourceText(source, mode), 'utf8');
}

function formatSources(repositoryRoot) {
  require('./assert-cicers-branch').assertCicersBranch(repositoryRoot);
  const sourceRoot = path.join(repositoryRoot, 'mission-src');
  const pending = [];
  for (const section of ['macros', 'data']) {
    const directory = path.join(sourceRoot, section);
    for (const file of fs.readdirSync(directory).filter((name) => name.endsWith('.json')).sort()) {
      const fullPath = path.join(directory, file);
      pending.push({ fullPath, formatted: formatSourceText(fs.readFileSync(fullPath, 'utf8'), section === 'data' ? 'data' : 'commands') });
    }
  }
  for (const item of pending) fs.writeFileSync(item.fullPath, item.formatted, 'utf8');
}

module.exports = { formatJsonText, formatMission, formatSourceText, formatSources };

if (require.main === module) {
  const repositoryRoot = path.resolve(__dirname, '..');
  if (process.argv[2] === 'sources') {
    formatSources(repositoryRoot);
  } else if (process.argv[2]) {
    const file = path.resolve(repositoryRoot, process.argv[2]);
    if (file !== path.join(repositoryRoot, 'train.json')) throw new Error('Only train.json or sources may be formatted in place; build the generated mission through its release intent');
    require('./assert-cicers-branch').assertCicersBranch(repositoryRoot);
    fs.writeFileSync(file, formatJsonText(fs.readFileSync(file, 'utf8')), 'utf8');
  } else {
    process.stdout.write(formatJsonText(fs.readFileSync(0, 'utf8')));
  }
}
