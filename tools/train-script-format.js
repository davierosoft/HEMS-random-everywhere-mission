'use strict';

// Layout of train.json, kept strictly as in the original custom script (rule of 2026-10-30):
// top-level keys in the original order, a blank line between the sections, one command per line,
// ", " and ": " separators, the incident list one field per line, and no change of the data.
// This is NOT the mission formatter: train.json is a user-edited file, not a mission module.

const j = (value) => JSON.stringify(value);

function compact(value) {
  if (Array.isArray(value)) return '[' + value.map(compact).join(', ') + ']';
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return '{}';
    return '{' + entries.map(([key, item]) => j(key) + ': ' + compact(item)).join(', ') + '}';
  }
  return j(value);
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
    lines.push(...commandLines(objective.commands, '    '));
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
