#!/usr/bin/env node
'use strict';
// Wait for the ambulance before the helicopter takes a patient (user rules 2026-11-12): source contract.
// Only an ambulance on the way (AMBU_AVAIL 2) that has not arrived changes the old wait of 60 s. ETA from the route (stamped at the start of the drive) or the live
// distance / 24.6 m/s without a route: 240 s or less the crew waits up to 300 s, above it the ambulance declares it cannot arrive and the helicopter takes the patient.
// AMBU_AVAIL 1 (on scene since the start) never blocks the scene. The button Load patient on helicopter aborts the wait.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sel = JSON.parse(read('mission-src/macros/18-hems-patient-selection.json'));
const problems = [];
const text = (name) => JSON.stringify(sel[name] ?? null);

for (const name of ['ambulance wait assess', 'ambulance wait announce', 'ambulance late call', 'ambulance forced load call']) if (!sel[name]) problems.push(`macro "${name}" is missing`);

const assess = text('ambulance wait assess');
if (!/"require":\{"local":"AMBU_AVAIL"\},"eq":2/.test(assess)) problems.push('assess: only AMBU_AVAIL 2 may change the wait (AMBU_AVAIL 1 never blocks)');
if (!/"require":\{"local":"ambu1arrived"\},"ne":"yes"/.test(assess)) problems.push('assess: an ambulance already arrived keeps the old wait');
if (!assess.includes('ambu_eta_mission_time') || !assess.includes('24.6')) problems.push('assess: ETA from the route stamp, distance / 24.6 without a route');
if (!/"local":"amb_wait_eta"\},"lte":240/.test(assess)) problems.push('assess: the threshold to wait is 240 s (4 minutes)');

const main = text('select HEMS patient');
if (!main.includes('"waited_max"') || !main.includes('"value":60') || !main.includes('"value":12') || !main.includes('"sleep":5')) problems.push('select HEMS patient: 12 x 5 s by default, 60 x 5 s (5 minutes) with the ambulance close');
for (const needle of ['AMB_WAIT_ABORT', 'force_heli_load', 'ambulance wait assess', 'ambulance late call', 'ambulance forced load call', '"HEMS_DECISION_FORCE"']) if (!main.includes(needle)) problems.push(`select HEMS patient: ${needle} not wired`);

const announce = text('ambulance wait announce');
for (const needle of ['"set_message"', 'post dispatcher message', 'AMB.WAIT', 'force_heli_load', 'Load patient on helicopter']) if (!announce.includes(needle)) problems.push(`announce: ${needle} missing`);
const late = text('ambulance late call');
for (const needle of ['"set_message"', 'post dispatcher message', '"from":"ambulance"', 'AMB.LATE.DSP']) if (!late.includes(needle)) problems.push(`late call: ${needle} missing`);
if (!text('ambulance forced load call').includes('AMB.FRC')) problems.push('forced load call: AMB.FRC missing');

const pack = read('voicepacks/EN.xml');
for (const key of ['AMB.WAIT', 'AMB.LATE.DSP', 'AMB.FRC']) if (!new RegExp(`<message key="${key.replace(/\./g, '\\.')}"`).test(pack)) problems.push(`pack EN: ${key} missing`);

const stamp = 'ambu_eta_mission_time';
for (const file of ['mission-src/macros/08-ground-response.json', 'mission-src/macros/05-navigation-queries.json']) if (!read(file).includes(stamp)) problems.push(`${file}: the ETA stamp is not set at the start of the drive`);

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\nambulance wait policy FAILED: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('ambulance wait policy ok (source contract; HPG/MSFS runtime PENDING)');
