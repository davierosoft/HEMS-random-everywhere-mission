'use strict';

// Layout of train.json, in the spirit of the original custom script (rules of 2026-10-30, readability pass of the same day):
// top-level keys in the original order and a blank line between the sections, as in the original;
// in the command list: dashed banner comments with two blank lines before and one after, short labels
// with one blank line before, the editable settings indented with a tab (between "EDITABLE AREA STARTS"
// and "EDITABLE AREA ENDS"), each custom object a block of a few aligned lines, long commands (for_each, if)
// opened over several lines with their then/do/else lists one command per line.
// ", " and ": " separators, the incident list one field per line, and no change of the data.
// This is NOT the mission formatter: train.json is a user-edited file, not a mission module.

const j = (value) => JSON.stringify(value);
const WIDTH = 120;
const BLOCK_KEYS = ['do', 'then', 'else', 'try', 'catch', 'on_error', 'commands'];

function compact(value) {
  if (Array.isArray(value)) return '[' + value.map(compact).join(', ') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '{}';
    return '{' + entries.map(([key, item]) => j(key) + ': ' + compact(item)).join(', ') + '}';
  }
  return j(value);
}

const isCommandList = (value) => Array.isArray(value) && value.length > 0 && value.every((item) => item && typeof item === 'object' && !Array.isArray(item));

// One command, no trailing comma: one line when it fits, otherwise its command lists open over several lines.
function expand(command, indent) {
  const flat = indent + compact(command);
  const keys = Object.keys(command);
  if (flat.length <= WIDTH || !keys.some((key) => BLOCK_KEYS.includes(key) && isCommandList(command[key]))) return [flat];
  const lines = [];
  let current = indent + '{';
  let first = true;
  for (const key of keys) {
    const value = command[key];
    if (BLOCK_KEYS.includes(key) && isCommandList(value)) {
      lines.push(current + (first ? '' : ', ') + j(key) + ': [');
      value.forEach((child, index) => {
        const childLines = expand(child, indent + '  ');
        childLines[childLines.length - 1] += index < value.length - 1 ? ',' : '';
        lines.push(...childLines);
      });
      current = indent + ']';
    } else {
      current += (first ? '' : ', ') + j(key) + ': ' + compact(value);
    }
    first = false;
  }
  lines.push(current + '}');
  return lines;
}

const OBJECT_ROWS = [['title'], ['lat', 'lon'], ['var1', 'var2'], ['aim', 'aimlat', 'aimlon'], ['fallback'], ['heading']];

function objectLines(item, indent) {
  const rows = OBJECT_ROWS.map((row) => row.filter((key) => key in item)).filter((row) => row.length);
  const known = new Set(OBJECT_ROWS.flat());
  for (const key of Object.keys(item)) if (!known.has(key)) rows.push([key]);
  const lines = [indent + '{"modify_array": {"local": "CUS_OBJECTS"}, "append": {"create_struct": {'];
  rows.forEach((row, index) => lines.push(indent + '\t' + row.map((key) => j(key) + ': ' + compact(item[key])).join(', ') + (index < rows.length - 1 ? ',' : '')));
  lines.push(indent + '}}}');
  return lines;
}

const commentText = (command) => (command && typeof command['#comment'] === 'string' ? command['#comment'] : null);
const isBanner = (text) => text.endsWith('-');
const objectItem = (command) => command.modify_array && command.modify_array.local === 'CUS_OBJECTS' && command.append && command.append.create_struct;

function commandListLines(commands) {
  const items = [];
  let editable = false;
  commands.forEach((command, index) => {
    const text = commentText(command);
    const previous = index > 0 ? commentText(commands[index - 1]) : null;
    let gap = 0;
    let lines;
    if (text !== null) {
      if (index > 0) {
        if (previous === null) gap = isBanner(text) ? 2 : 1;
        else if (/^-+$/.test(text) && !/^-+$/.test(previous)) gap = 2;
        else if (text.startsWith('EDITABLE AREA')) gap = 1;
        else if (!isBanner(text) && isBanner(previous)) gap = 1;
      }
      lines = [compact(command)];
      if (text.startsWith('EDITABLE AREA STARTS')) editable = true;
      if (text.startsWith('EDITABLE AREA ENDS')) editable = false;
    } else {
      if (previous !== null && isBanner(previous)) gap = 1;
      const indent = editable ? '\t' : '    ';
      const item = objectItem(command);
      lines = item ? objectLines(item, indent) : expand(command, indent);
    }
    items.push({gap, lines});
  });
  const out = [];
  items.forEach((item, index) => {
    for (let n = 0; n < item.gap; n++) out.push('');
    const lines = item.lines.slice();
    if (index < items.length - 1) lines[lines.length - 1] += ',';
    out.push(...lines);
  });
  return out;
}

function commandLines(commands, indent) {
  return commands.map((command, index) => indent + compact(command) + (index < commands.length - 1 ? ',' : ''));
}

function buttonLines(button, indent) {
  const keys = Object.keys(button);
  const at = keys.indexOf('commands');
  if (at < 0) return [indent + compact(button)];
  const before = keys.slice(0, at).map((key) => j(key) + ': ' + compact(button[key]));
  const after = keys.slice(at + 1).map((key) => j(key) + ': ' + compact(button[key]));
  const head = '{' + before.concat(['"commands": [']).join(', ');
  const tail = ']' + (after.length ? ', ' + after.join(', ') : '') + '}';
  return [indent + head, ...commandLines(button.commands, indent + '  '), indent + tail];
}

function briefingLines(items, indent) {
  const lines = [];
  items.forEach((item, index) => {
    const comma = index < items.length - 1 ? ',' : '';
    if (item && Array.isArray(item.buttonbar) && Object.keys(item).length === 1) {
      lines.push(indent + '{"buttonbar": [');
      item.buttonbar.forEach((button, buttonIndex) => {
        const rendered = buttonLines(button, indent + '    ');
        rendered[rendered.length - 1] += buttonIndex < item.buttonbar.length - 1 ? ',' : '';
        lines.push(...rendered);
      });
      lines.push(indent + ']}' + comma);
    } else {
      lines.push(indent + compact(item) + comma);
    }
  });
  return lines;
}

function accidentLines(accidents) {
  const lines = [];
  accidents.forEach((accident, index) => {
    const entries = Object.entries(accident);
    entries.forEach(([key, value], at) => {
      const text = j(key) + ': ' + compact(value);
      if (at === 0) lines.push('      {' + text + (entries.length > 1 ? ',' : ''));
      else lines.push('        ' + text + (at < entries.length - 1 ? ',' : ''));
    });
    lines.push('      }' + (index < accidents.length - 1 ? ',' : ''));
  });
  return lines;
}

function formatTrainScript(script) {
  const lines = ['{ '];
  lines.push('"title": ' + j(script.title) + ',');
  lines.push('"id": ' + j(script.id) + ',');
  lines.push('"start_info": ' + compact(script.start_info) + ',');
  lines.push('');
  lines.push('"locations": ' + compact(script.locations) + ',');
  lines.push('');
  lines.push('  "objectives": [');
  script.objectives.forEach((objective, index) => {
    lines.push('');
    lines.push('  {"title": ' + j(objective.title) + ',');
    lines.push('    "commands": [');
    lines.push(...commandListLines(objective.commands));
    lines.push('    ]}' + (index < script.objectives.length - 1 ? ',' : ''));
  });
  lines.push('  ],');
  lines.push('');
  lines.push('"macros": ' + (Object.keys(script.macros || {}).length ? compact(script.macros) : '{\n}') + ',');
  lines.push('');
  lines.push('  "briefing": [');
  lines.push(...briefingLines(script.briefing, '    '));
  lines.push('  ],');
  lines.push('');
  lines.push('"data": {');
  lines.push('  "accidents": [');
  lines.push(...accidentLines(script.data.accidents));
  lines.push('    ]');
  lines.push(' },');
  lines.push('  "api_version": ' + compact(script.api_version) + ',');
  lines.push('  "aircraft": ' + compact(script.aircraft) + ',');
  lines.push('  "applicable": ' + compact(script.applicable));
  lines.push('}');
  return lines.join('\n') + '\n';
}

module.exports = { formatTrainScript };
