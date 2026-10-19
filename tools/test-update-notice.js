#!/usr/bin/env node
'use strict';

// User request of 2026-10-19: the build number follows the release (DEV_VERSION = 169.xx, DEV_TYPE (ALPHA)) and the "new version available" notice of the
// briefing is shown only when something NEWER exists, whether the CICERS server says it (any order of the words of its version string) or the Mission
// Companion says it (L:HMC_MISSION_LATEST_MAJOR / MINOR). Static checks of the production sources, plus a model of the parser of the server string with the
// formats that can arrive. No HPG/MSFS behaviour is modeled, runtime PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const briefing = JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'root', '03-briefing.json'), 'utf8')).briefing;
const text = (value) => JSON.stringify(value);

// 1. numbering: DEV_VERSION is the second word of RELEASE_IDENTITY (one place to change), DEV_TYPE ALPHA, the build in numbers
const version = text(macros['version check']);
assert.ok(/"set":\{"local":"RELEASE_IDENTITY"\},"value":"0\.997 \d+\.\d+"/.test(version), 'RELEASE_IDENTITY stays the literal that release-workflow writes');
assert.ok(version.indexOf('"local":"RELEASE_IDENTITY"},"value"') < version.indexOf('"local":"DEV_VERSION"'), 'RELEASE_IDENTITY is set before DEV_VERSION');
assert.ok(version.includes('"set":{"local":"DEV_VERSION"},"value":{"string:split":{"local":"RELEASE_IDENTITY"},"delimiter":" ","index":1}'), 'DEV_VERSION is the build of the release identity');
assert.ok(version.includes('"set":{"local":"DEV_TYPE"},"value":"(ALPHA)"'), 'DEV_TYPE is (ALPHA)');
for (const name of ['BUILD_MAJOR', 'BUILD_MINOR', 'BUILD_N']) assert.ok(version.includes(`"set":{"local":"${name}"}`), `${name} is set by version check`);
assert.ok(version.includes('"multiply":[{"local":"BUILD_MAJOR"},1000]'), 'BUILD_N = major * 1000 + minor (169.9 before 169.64)');

// 2. the notice of the briefing: four rows (AND only), server rows from UPD_SERVER, Companion rows from the two LVARs and never together with the server rows
const rows = briefing.filter((item) => item.describe_icon === 'newico');
assert.equal(rows.length, 4, 'two rows for the server (links by MGsounds_installed) and two for the Mission Companion');
for (const row of rows) {
  const cond = text(row.show_condition);
  assert.ok(!cond.includes('"or"'), 'no OR in a renderer condition (two rows instead)');
  assert.ok(!cond.includes('"LATEST_DEV_VERSION"') && !cond.includes('"DEV_VERSION"'), 'the notice no longer compares the build words: it is not shown for a different build, only for a newer one');
}
const server = rows.filter((row) => text(row.show_condition).includes('"UPD_SERVER"},"eq":1'));
assert.equal(server.length, 2, 'the server rows need UPD_SERVER 1');
assert.ok(text(server[0].show_condition).includes('"eq":"NO"') && text(server[0].commands).includes('LINK0') && text(server[1].show_condition).includes('"eq":"OK"') && text(server[1].commands).includes('LINK1'), 'the links stay those of the original rows');
const app = rows.filter((row) => text(row.show_condition).includes('L:HMC_MISSION_LATEST_MAJOR'));
assert.equal(app.length, 2, 'two rows for the Mission Companion (major newer, or same major and minor newer)');
assert.ok(text(app[0].show_condition).includes('"gt":{"local":"BUILD_MAJOR"}'), 'row 1: a higher major');
assert.ok(text(app[1].show_condition).includes('"eq":{"local":"BUILD_MAJOR"}') && text(app[1].show_condition).includes('"gt":{"local":"BUILD_MINOR"}'), 'row 2: the same major and a higher minor');
for (const row of app) assert.ok(text(row.show_condition).includes('"UPD_SERVER"},"ne":1'), 'the Mission Companion row does not repeat the server row');

// 3. the parser of the server string is called where the string is read; the old three set commands are gone
const boot = text(macros['CICERS PING']);
assert.ok(boot.includes('"call_macro":"latest version parse"') && !boot.includes('"LATEST_DEV_TYPE"'), 'CICERS PING calls latest version parse and no longer splits the words itself');

// 4. model of the parser (the same words, the same order of the commands of latest version token / latest version parse)
function parse(serverText, local) {
  const words = serverText.split(' ');
  const st = { re: words[0], devVersion: '', devType: '', buildN: 0 };
  for (const tok of [words[1], words[2], words[3]]) {
    if (tok === undefined || tok === null) continue;
    const parts = tok.split('.');
    if (parts.length === 2) { st.devVersion = tok; st.buildN = parseInt(parts[0], 10) * 1000 + parseInt(parts[1], 10); }
    else st.devType = tok;
  }
  const mine = local.split(' ');
  const [maj, min] = mine[1].split('.').map((n) => parseInt(n, 10));
  const buildN = maj * 1000 + min;
  let upd = 0;
  if (parseFloat(st.re) > parseFloat(mine[0]) && st.devType !== '(DEV)') upd = 1;
  if (st.re === mine[0] && st.buildN > buildN && st.devType !== '(DEV)') upd = 1;
  return Object.assign(st, { upd });
}
const here = '0.997 169.64';
const cases = [
  ['0.997 (BETA)', 0, 'the answer of the server today: no build number, nothing newer'],
  ['0.997 169.70 (ALPHA)', 1, 'a higher build, build before type'],
  ['0.997 (ALPHA) 169.70', 1, 'a higher build, type before build'],
  ['0.997 169.64 (ALPHA)', 0, 'the same build'],
  ['0.997 169.63 (ALPHA)', 0, 'an older build (the server may be behind)'],
  ['0.997 169.9 (ALPHA)', 0, '169.9 is older than 169.64'],
  ['0.997 169.100 (ALPHA)', 1, '169.100 is newer than 169.64'],
  ['0.997 170.1 (ALPHA)', 1, 'a higher major build'],
  ['0.997 1.2 (BETA)', 0, 'the old format of the server'],
  ['0.998 (BETA)', 1, 'a higher mission version'],
  ['0.998 170.1 (DEV)', 0, 'a (DEV) type never counts'],
  ['0.996 200.1 (ALPHA)', 0, 'a lower mission version'],
  ['0.997', 0, 'only the version'],
];
for (const [server, expected, why] of cases) assert.equal(parse(server, here).upd, expected, `${server}: ${why}`);
assert.equal(parse('0.997 169.70 (ALPHA)', here).devType, '(ALPHA)');
assert.equal(parse('0.997 (BETA)', here).devVersion, '', 'no build in the answer: the text of the notice has no "undefined"');

// 5. the Mission Companion publishes the two variables with the same names (when the repository is next to this one)
const appPath = path.join(root, '..', 'HPG-Mission-Companion', 'src', 'Updates.cs');
if (fs.existsSync(appPath)) {
  const source = fs.readFileSync(appPath, 'utf8');
  assert.ok(source.includes('"L:HMC_MISSION_LATEST_MAJOR"') && source.includes('"L:HMC_MISSION_LATEST_MINOR"'), 'the app publishes the variables the mission reads');
  const link = fs.readFileSync(path.join(root, '..', 'HPG-Mission-Companion', 'src', 'SimLink.cs'), 'utf8');
  assert.ok(link.includes('Updates.VarLatestMajor') && link.includes('Updates.VarLatestMinor'), 'the variables are known before the SimConnect connection');
}

// 6. the dispatch pages (home page and technical page) carry the same notice, and every page the user named shows the message of the actors without a voice
for (const name of ['homepage', 'techpage']) {
  const page = text(macros[name]);
  assert.equal(page.split('"describe_icon":"newico"').length - 1, 4, `${name}: four notice rows`);
  assert.ok(!page.includes('"ne":{"local":"DEV_VERSION"}'), `${name}: the notice does not compare the build words any more`);
  assert.equal(page.split('"UPD_SERVER"},"eq":1').length - 1, 2, `${name}: two server rows`);
  assert.equal(page.split('L:HMC_MISSION_LATEST_MAJOR","number"]},"').length - 1, 2, `${name}: two Companion rows`);
  assert.ok(page.includes('"require":{"var":["L:HMC_ACTORS_MISSING","number"]},"eq":0}],"eq":1}},'), `${name}: "No errors detected" is not shown while an actor has no voice`);
}
const pages = { homepage: macros.homepage, techpage: macros.techpage, settings: macros.settings, 'checklist home': macros['checklist home'], briefing };
for (const [name, page] of Object.entries(pages)) {
  const body = text(page);
  assert.ok(body.includes('Mission Companion: no voice for {0} main actor(s)') && body.includes('"gt":0}') && body.includes('L:HMC_ACTORS_MISSING'), `${name}: the red message of the actors without a voice`);
  assert.ok(body.includes('Mission Companion: {0} main actor(s) had no voice and got a default one') && body.includes('L:HMC_ACTORS_DEFAULTED'), `${name}: the message of the default voices`);
}
assert.ok(text(macros.settings).includes('{"require":{"local":"tab7"},"ne":0},{"require":{"var":["L:HMC_ACTORS_MISSING","number"]},"gt":0}'), 'settings: the message is in the AUDIO OPTIONS section (open tab 7)');
for (const name of ['homepage', 'techpage', 'settings', 'checklist home']) assert.ok(!/"or":\[\{"require":\{"var":\["L:HMC_ACTORS/.test(text(macros[name])), `${name}: no OR in the renderer conditions of the actor messages`);
if (fs.existsSync(appPath)) {
  const core = fs.readFileSync(path.join(root, '..', 'HPG-Mission-Companion', 'src', 'Core.cs'), 'utf8');
  assert.ok(core.includes('"L:HMC_ACTORS_MISSING"') && core.includes('"L:HMC_ACTORS_DEFAULTED"'), 'the program publishes the two numbers the mission shows');
}

console.log('Update notice PASS: numbering from the release identity, the notice only for a newer build (server or Mission Companion), the parser of the server string. HPG/MSFS PENDING.');
