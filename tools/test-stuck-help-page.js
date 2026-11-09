#!/usr/bin/env node
'use strict';
// User rule of 2026-11-09: the user interface carries no debug rows (grey lines with blockers or causes). A stalled mission gets a message with a link
// to the "stuck help page": cause in plain words, remedies, buttons, the Discord ticket instructions and, at the bottom, the basic debug information.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const macros = {};
for (const f of fs.readdirSync(path.join(root, 'mission-src/macros'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8')));
const txt = (n) => JSON.stringify(macros[n]);
const page = txt('Mission dispatch');
assert.ok(!page.includes('Still open: {0}') && !page.includes('Probable cause: {0}'), 'no grey debug rows on the dispatch page');
assert.ok(!JSON.stringify(macros['dispatch control']).includes('Status report disagree'), 'no L/G debug values on the dispatch control page');
assert.ok(page.includes('"call_macro":"stuck help page"'), 'the dispatch page links the help page');
assert.ok(page.split('"call_macro":"stuck help page"').length - 1 >= 3, 'link on the warning, on the orange check row and in the quick links');
const help = txt('stuck help page');
assert.ok(macros['stuck help page'], 'help page exists');
for (const code of ['HELI_ARRIVAL', 'HELI_GROUND', 'HELI_HOVER', 'CREW_MOVING', 'UNKNOWN']) assert.ok(help.includes(`"eq":"${code}"`), 'help page explains ' + code);
for (const need of ['STOP ESCAPING CREW', 'RESET SECOND DISPATCH', 'CAPTURE SNAPSHOT', 'Discord', 'drag and drop all the logs', 'Basic debug information', 'ground_ops_blockers']) assert.ok(help.includes(need), 'help page has ' + need);
assert.ok(help.indexOf('Basic debug information') > help.indexOf('drag and drop all the logs'), 'basic debug information is at the bottom');
for (const code of ['RTB_STEP', 'SD_CONNECT', 'SD_PHASE', 'SD_EMERGENCY']) {
  assert.ok(help.includes('"eq":"' + code + '"'), 'help page explains ' + code);
  assert.ok(txt('rtb step watch') .includes(code) || txt('ready dispatch').includes(code), 'a detector sets ' + code);
}
assert.ok(page.includes('phase_stall_active'), 'the dispatch page shows the phase stall message');
assert.ok(!txt('rtb step watch').includes('"call_macro":"capture'), 'the phase detectors are read-only (no mission state, no snapshots)');
console.log('stuck help page ok');
