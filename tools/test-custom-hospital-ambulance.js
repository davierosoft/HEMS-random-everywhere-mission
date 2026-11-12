#!/usr/bin/env node
'use strict';
// Optional ambulance at custom hospitals (app issue 100): source contract.
// The fields travel in the hospital entries of the shared data (static list and external file): ambulance_present yes/no, WPAmbLAT, WPAmbLON.
// Entries without the fields stay "no". The behaviour is in the macros "custom hospital ambulance *".
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, 'mission-src', file), 'utf8');
const nav = JSON.parse(read('macros/05-navigation-queries.json'));
const data = JSON.parse(read('data/02-waypoints-and-categories.json'));
const problems = [];

for (const entry of data['hospitals wps']) {
  if (entry.ambulance_present !== 'no') problems.push(`static hospital "${entry.id}": ambulance_present must be "no" by default`);
  if (!('WPAmbLAT' in entry) || !('WPAmbLON' in entry)) problems.push(`static hospital "${entry.id}": WPAmbLAT / WPAmbLON missing`);
}

for (const name of ['custom hospital ambulance check', 'custom hospital ambulance place', 'custom hospital ambulance board', 'custom hospital ambulance unboard', 'custom hospital ambulance run']) {
  if (!Array.isArray(nav[name])) problems.push(`macro "${name}" is missing`);
}

const text = (name) => JSON.stringify(nav[name] ?? []);
const user = text('user hospital WP');
for (const needle of ['"hospital_amb_present"', '"ambulance_present"', '"WPAmbLAT"', '"WPAmbLON"', '"hospital_amb_park"']) {
  if (!user.includes(needle)) problems.push(`user hospital WP does not handle ${needle}`);
}
if (!/"try":\[\{"if":\{"struct":\{"param":"\$item"\},"path":"ambulance_present"\}/.test(user)) problems.push('user hospital WP: the read of ambulance_present must be inside a try (old files without the field)');

for (const name of ['User destination1', 'User destination hoist']) {
  const body = text(name);
  for (const needle of ['custom hospital ambulance check', 'custom hospital ambulance place', 'custom hospital ambulance run', '"cha_active"']) {
    if (!body.includes(needle)) problems.push(`${name}: ${needle} not wired`);
  }
  // the user must not be offered the button when the custom hospital has its own ambulance
  if (!/"global":"FORCE_AMBULANCE"\},"eq":"no"\},\{"require":\{"local":"cha_active"\},"ne":"yes"\}/.test(body)) problems.push(`${name}: the Unload to ambulance button must be hidden when cha_active is yes`);
  // the stretcher and the hospital doctor enter by the side (bearing2 90/270) and then from behind (bearing2 180, 6 m)
  for (const who of ['ambustretcher', 'ambumedic']) {
    const re = new RegExp(`"name":"${who}","to":\\[\\{"closest":\\[\\{"bearing2":90,"dist":3,"object":"ambulance5"\\},\\{"bearing2":270,"dist":3,"object":"ambulance5"\\}\\],"to":"${who}"\\},\\{"bearing2":180,"dist":6,"object":"ambulance5"\\},"ambulance5"\\]`);
    if (!re.test(body)) problems.push(`${name}: ${who} must go to the closest side, then behind (bearing2 180, 6 m), then board`);
  }
}

const run = text('custom hospital ambulance run');
for (const needle of ['hospital_wp1', 'hospital_wp2', 'hospital_wp3', 'hospital_amb_park', '"PAPERWORK"', 'custom hospital ambulance board', 'custom hospital ambulance unboard']) {
  if (!run.includes(needle)) problems.push(`custom hospital ambulance run: ${needle} missing`);
}
if (/"param":"(?:hospital|cha)/.test(run)) problems.push('custom hospital ambulance run: no param in the drives');
const board = text('custom hospital ambulance board');
if (!board.includes('"var":"VAR 1"},"value":-1')) problems.push('board: the crew must be hidden with VAR 1 -1, not destroyed');
if (/destroy_object/.test(board)) problems.push('board: the helicopter crew must never be destroyed');
const unboard = text('custom hospital ambulance unboard');
if (!unboard.includes('"bearing2":180') || !unboard.includes('"to":"$USER"')) problems.push('unboard: exit behind the ambulance (bearing2 180) and walk back along the side closest to the helicopter');

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\ncustom hospital ambulance FAILED: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('custom hospital ambulance ok (source contract; HPG/MSFS runtime PENDING)');
