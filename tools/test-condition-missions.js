#!/usr/bin/env node
'use strict';

// On conditions missions (user request of 2026-10-17): the random missions that do not fit the local time, the month (with the hemisphere) or the weather
// are not drawn when the option is on. Static checks of the production sources, plus a model of the decision (the same rules of the macro written here in
// JavaScript) run on the data of the accidents: no HPG/MSFS behaviour is modeled, the simulator reads (E:LOCAL MONTH OF YEAR, AMBIENT WIND VELOCITY, ...)
// stay PENDING until a controlled test in the simulator.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const data = JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'data', '02-waypoints-and-categories.json'), 'utf8'));
const text = (name) => JSON.stringify(macros[name]);
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

// 1. the data: the 32 accidents with a cond field (the paraglider 17 and the glacier 42 are search and rescue calls that follow the conditions; the calls for missing people never do), only known codes
const restricted = data.accidents.filter((a) => a.cond === 1);
assert.deepEqual(restricted.map((a) => a.ID_CARD).sort((a, b) => a - b),
  [1, 4, 6, 7, 8, 11, 13, 14, 15, 17, 22, 23, 33, 34, 37, 38, 39, 41, 42, 43, 45, 47, 49, 50, 60, 61, 63, 64, 70, 71, 72, 74], 'the 32 missions that depend on the conditions');
for (const a of data.accidents) {
  if (a.SAR === 'yes' && ![17, 42].includes(a.ID_CARD)) assert.ok(!('cond' in a), `${a.ID_CARD}: a call for a missing person is never restricted`);
  if (!('cond' in a)) for (const k of Object.keys(a)) assert.ok(!k.startsWith('cond_'), `${a.ID_CARD}: cond_* fields only with cond 1`);
}
const seasons = new Set(['nowinter', 'skiseason', 'coldseason', 'huntingseason', 'schoolterm', 'liftseason']);
const weathers = new Set(['dry', 'nosnow', 'wet', 'snowcover']);
for (const a of restricted) {
  assert.ok(Object.keys(a).some((k) => k.startsWith('cond_')), `${a.ID_CARD}: cond 1 needs at least one condition`);
  assert.ok(a.cond_light === undefined || a.cond_light === 'day', `${a.ID_CARD}: cond_light`);
  assert.ok(a.cond_season === undefined || seasons.has(a.cond_season), `${a.ID_CARD}: cond_season`);
  assert.ok(a.cond_weather === undefined || weathers.has(a.cond_weather), `${a.ID_CARD}: cond_weather`);
  if (a.cond_hours !== undefined) assert.ok(a.cond_hours === 'yes' && Number.isInteger(a.cond_from) && Number.isInteger(a.cond_to) && a.cond_from < a.cond_to && a.cond_to <= 24, `${a.ID_CARD}: cond_hours with cond_from < cond_to`);
  if (a.cond_wind !== undefined) assert.ok(a.cond_wind > 0, `${a.ID_CARD}: cond_wind in km/h`);
}
const byId = (id) => data.accidents.find((a) => a.ID_CARD === id);
assert.equal(byId(17).cond_wind, 30, 'paraglider: 30 km/h');
assert.equal(byId(38).cond_wind, 60, 'chair lift: 60 km/h');
assert.equal(byId(39).cond_wind, 60, 'cableway: 60 km/h');

// 2. the macros: snapshot of the simulator, the decision, randomize uses both in the two loops
const snap = text('conditions snapshot');
for (const need of ['"global":"COND_MISSIONS"', 'E:LOCAL TIME', 'E:LOCAL MONTH OF YEAR', 'PLANE LATITUDE', 'E:TIME OF DAY', 'AMBIENT PRECIP STATE', 'AMBIENT TEMPERATURE', 'AMBIENT WIND VELOCITY', 'PLANE ALTITUDE', '0.0065', '1300']) assert.ok(snap.includes(need), `conditions snapshot reads ${need}`);
const fitText = text('conditions fit');
for (const need of ['cf_light', 'cf_hours', 'cf_season', 'cf_weather', 'cf_wind', 'cm_day', 'cm_hour', 'cm_mn', 'cm_precip', 'cm_t1300', 'cm_wind', '"return"']) assert.ok(fitText.includes(need), `conditions fit uses ${need}`);
const rnd = text('randomize');
assert.equal((rnd.match(/"call_macro":"conditions fit"/g) || []).length, 2, 'randomize calls conditions fit in the counting loop and in the drawing loop');
assert.ok(rnd.includes('"call_macro":"conditions snapshot"'), 'randomize takes the snapshot once');
assert.equal((rnd.match(/"call_macro":"conditions fit","result":"cond_pass"\},\s*\{"sleep":0\.01\}/g) || []).length, 2, 'a sleep follows each conditions fit call: the stack of the thread only unwinds at a sleep (Maximum call stack size exceeded, report 2026-10-24)');
assert.ok(rnd.includes('"cond_eligible"') && rnd.includes('"local":"cm_active"},"value":0'), 'when no enabled mission fits, the filter is dropped for that draw (complete random missions)');
assert.ok(rnd.includes('"param":"cond_pass"'), 'the drawing loop accepts a mission only if it fits');
assert.ok(rnd.includes('MSN_CONFIG_PRESET'), 'the missions enabled in the list are still the base of the draw');
assert.ok(!text('conditions fit').includes('"speak"') && !snap.includes('"speak"'), 'no spoken text in the macros');

// 3. the option: a button on the settings page, saved, loaded, reset, factory values, debug snapshot
const buttons = collect(macros.settings, (node) => node.title === 'OFF (DEFAULT)' && JSON.stringify(node).includes('COND_MISSIONS'));
assert.equal(buttons.length, 1, 'the settings page has the OFF (DEFAULT) button of On conditions missions');
const onButtons = collect(macros.settings, (node) => node.title === 'ON' && JSON.stringify(node).includes('COND_MISSIONS'));
assert.equal(onButtons.length, 1, 'and the ON button');
assert.ok([...buttons, ...onButtons].every((b) => JSON.stringify(b.commands).includes('mark aircraft profile custom')), 'a change marks the profile CUSTOM');
assert.ok(text('save custom aircraft profile').includes('"key":"COND_MISSIONS"') && text('load custom aircraft profile').includes('"key":"COND_MISSIONS"'), 'COND_MISSIONS is saved in and loaded from the aircraft profiles');
assert.ok(text('resetdefault').includes('"global":"COND_MISSIONS"},"value":null'), 'Reset to default clears COND_MISSIONS');
for (const [name, value] of Object.entries({ DEFAULT: 'no', 'ROOKIE PILOT': 'no', 'EXPERT PILOT': 'yes', 'EXPERT HEMS': 'yes' })) {
  assert.ok(text(`aircraft factory ${name}`).includes(`"set":{"global":"COND_MISSIONS"},"value":"${value}"`), `factory ${name}: COND_MISSIONS ${value}`);
}
assert.ok(JSON.stringify(macros).includes('"global:COND_MISSIONS"') && JSON.stringify(macros).includes('"local:cm_t1300"'), 'the debug snapshot shows the option and the decision');

// 4. the crew tip about it (pack EN 16)
const tip = text('voice tip');
assert.ok(tip.includes('"CND"'), 'voice tip has the topic CND');
assert.ok(JSON.stringify(macros).includes('<pack:EN:27>'), 'the mission declares the pack EN 27');

// 5. the model of the decision, the same rules as the macro, on typical situations
function fit(a, s) {
  if (s.mn > 0) {
    if (a.cond_season === 'nowinter' && (s.mn === 12 || s.mn <= 2)) return 0;
    if (a.cond_season === 'skiseason' && s.mn >= 5 && s.mn <= 11) return 0;
    if (a.cond_season === 'coldseason' && s.mn >= 6 && s.mn <= 10) return 0;
    if (a.cond_season === 'huntingseason' && s.mn >= 2 && s.mn <= 8) return 0;
    if (a.cond_season === 'schoolterm' && s.mn >= 7 && s.mn <= 8) return 0;
    if (a.cond_season === 'liftseason' && (s.mn === 5 || s.mn === 11)) return 0;
  }
  if (a.cond_light === 'day' && s.day !== 1) return 0;
  if (a.cond_hours === 'yes' && (s.hour < a.cond_from || s.hour >= a.cond_to)) return 0;
  if (a.cond_weather === 'dry' && s.precip >= 4) return 0;
  if (a.cond_weather === 'nosnow' && (s.precip >= 8 || s.temp <= 0)) return 0;
  if (a.cond_weather === 'wet' && s.precip < 4) return 0;
  if (a.cond_weather === 'snowcover' && s.t1300 > 0) return 0;
  if (a.cond_wind > 0 && s.wind > a.cond_wind) return 0;
  return 1;
}
const month = (m, south) => (south ? (m > 6 ? m - 6 : m + 6) : m);
const t1300 = (temp, altFeet) => temp - 0.0065 * (1300 - altFeet * 0.3048);
const base = { mn: 7, day: 1, hour: 11, precip: 2, temp: 24, wind: 10, t1300: 12 };
assert.equal(fit(byId(47), { ...base }), 0, 'skier in July: no');
assert.equal(fit(byId(47), { ...base, mn: 1, temp: 1, t1300: t1300(1, 300) }), 1, 'skier in January, cold at 1300 m: yes');
assert.equal(fit(byId(47), { ...base, mn: 1, temp: 12, t1300: t1300(12, 300) }), 0, 'skier in January but 12 degrees in the plain (+5 at 1300 m): no, no snow in the mountains either');
assert.ok(t1300(5, 0) < 0 && t1300(5, 0) > -4, 'a plain at 5 degrees is about -3.5 at 1300 m');
assert.equal(fit(byId(47), { ...base, mn: month(7, true), temp: 1, t1300: t1300(1, 300) }), 1, 'southern hemisphere: July is winter, a skier fits');
assert.equal(fit(byId(17), { ...base, wind: 35 }), 0, 'paraglider at 35 km/h: no');
assert.equal(fit(byId(17), { ...base, wind: 25 }), 1, 'paraglider at 25 km/h on a July day: yes');
assert.equal(fit(byId(17), { ...base, day: 0 }), 0, 'paraglider at night: no');
assert.equal(fit(byId(17), { ...base, precip: 4 }), 0, 'paraglider in the rain: no');
assert.equal(fit(byId(17), { ...base, mn: 1 }), 0, 'paraglider in January: no');
assert.equal(fit(byId(38), { ...base, mn: 11 }), 0, 'chair lift in November (off season): no');
assert.equal(fit(byId(38), { ...base, wind: 65 }), 0, 'chair lift at 65 km/h: no');
assert.equal(fit(byId(34), { ...base, hour: 23, mn: 10 }), 0, 'school at 23: no');
assert.equal(fit(byId(34), { ...base, hour: 10, mn: 10 }), 1, 'school at 10 in October: yes');
assert.equal(fit(byId(34), { ...base, hour: 10, mn: 7 }), 0, 'school in July: no');
assert.equal(fit(byId(60), { ...base, hour: 3 }), 0, 'supermarket at 3: no');
assert.equal(fit(byId(1), { ...base }), 0, 'the wet road collision on a dry day: no');
assert.equal(fit(byId(1), { ...base, precip: 4 }), 1, 'and in the rain: yes');
assert.equal(fit(byId(4), { ...base, temp: -2 }), 0, 'motorbike below 0 degrees: no');
assert.equal(fit(byId(63), { ...base, mn: 10 }), 1, 'hunting in October: yes');
assert.equal(fit(byId(63), { ...base, mn: 6 }), 0, 'hunting in June: no');
assert.equal(fit(byId(42), { ...base, mn: 3, temp: 0, t1300: t1300(0, 1000) }), 1, 'avalanche in March, freezing: yes');
assert.equal(fit(byId(17), { ...base, mn: 0, precip: 2 }), 1, 'an unknown month does not restrict the season');
// the missions without cond are always eligible, whatever the situation
assert.ok(data.accidents.filter((a) => a.cond !== 1).length === data.accidents.length - 32, 'the other missions have no condition at all');

// 6. the profiles that turn it on by default
assert.ok(text('aircraft factory EXPERT PILOT').includes('"COND_MISSIONS"') && text('aircraft factory EXPERT HEMS').includes('"COND_MISSIONS"'), 'both expert profiles set the option');

console.log('Condition missions PASS: 32 missions with conditions (no call for a missing person), the option in the profiles (expert on, rookie and default off), the tip CND, the decision model on typical situations. Simulator reads (month, wind, temperature at 1300 m) PENDING.');
