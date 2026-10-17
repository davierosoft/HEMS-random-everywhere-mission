#!/usr/bin/env node
'use strict';

// Tester report of 2026-10-17: the tablet showed "ERR101 FAILED to find a suitable location after 9 attempts. Please report the error to the dev." while the
// ground operations went on. It was the first of three queries for the hospital door (the emergency ward entrance, then the hospital, then any building, then
// a default point): a failure with a fallback is not an error for the user. Query closest nodes with sampling takes NONBLOCKING 1 and then only writes the
// runtime trace of the snapshot. The same report asked to log the battery master at the start (the walk-out boarding only runs with it off). Static checks
// of the production sources: no HPG/MSFS behaviour is modeled.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'mission-src', 'macros');
const macros = {};
const files = {};
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  files[file] = text;
  Object.assign(macros, JSON.parse(text));
}
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

// 1. the macro: with NONBLOCKING 1 no message and no queryfailed, a trace row; without it the error is as before
const query = macros['Query closest nodes with sampling'];
const tail = JSON.stringify(query.slice(-1));
assert.ok(tail.includes('"param":"NONBLOCKING"},"eq":1'), 'the failure branch reads NONBLOCKING');
const soft = tail.slice(tail.indexOf('"NONBLOCKING"'), tail.indexOf('"else"'));
assert.ok(soft.includes('"macro":"osm_query"') && soft.includes('Temporary error: ERR101') && soft.includes('40 seconds') && soft.includes('"query_soft_msg"') && !soft.includes('queryfailed'), 'non-blocking: a temporary message (check after 40 seconds) and a trace row, no queryfailed');
assert.ok(tail.includes('"set_message":{"text":"Location found"}') && tail.includes('"query_soft_msg"},"value":null'), 'a search that finds a location clears the temporary message');
for (const name of ['Query closest hospital for stretcher', 'Query closest hospital for stretcher transfer']) {
  const hosp = JSON.stringify(macros[name]);
  assert.ok(hosp.includes('"local":"query_soft_msg"},"eq":"yes"') && hosp.includes('Location set on a backup point'), name + ' replaces the temporary message when it ends on the backup point');
}
const hard = tail.slice(tail.indexOf('"else"'));
assert.ok(hard.includes('ERR101') && hard.includes('"set_message"') && hard.includes('"queryfailed"'), 'blocking (no flag): ERR101 as before');

// 2. who sets the flag: every caller that has a fallback, not the search of the pitch (userA has none)
const calls = [];
for (const [name, body] of Object.entries(macros)) {
  collect(body, (n) => n.call_macro === 'Query closest nodes with sampling').forEach((n) => calls.push({ macro: name, params: n.params }));
}
assert.equal(calls.length, 13, 'thirteen callers of the sampling query');
const soft13 = calls.filter((c) => c.params.NONBLOCKING === 1).map((c) => c.params.LOCATION_NAME).sort();
assert.deepEqual(soft13, ['ambu1test', 'ambu2test', 'fire_station', 'hangar', 'hospitaltemp', 'hospitaltemp', 'hospitaltemp', 'hospitaltemp', 'hospitaltemp', 'hospitaltemp', 'police_station', 'police_station'].sort(), 'the hangar, the hospital door, the stations and the ambulance tests do not bother the user');
const hardCalls = calls.filter((c) => c.params.NONBLOCKING !== 1);
assert.deepEqual(hardCalls.map((c) => c.params.LOCATION_NAME), ['userA'], 'the search of the pitch keeps the error: nothing follows it');

// 3. the boarding log at the start of the mission
const life = JSON.stringify(macros.objective1 || Object.values(macros).find((m) => JSON.stringify(m).includes('"call_macro":"crew boarding"') && JSON.stringify(m).includes('Query closest building for boarding')));
assert.ok(life.includes('start battery_master={0} rotor_rpm={1} back_to_hospital={2}'), 'the start of the boarding logs the battery master, the rotor, BACK_TO_HOSPITAL and the crew');
assert.ok(life.includes('walk-out boarding: battery off and BACK_TO_HOSPITAL 1') && life.includes('crew seated at once: battery master is on') && life.includes('crew seated at once: battery off but BACK_TO_HOSPITAL is not 1'), 'each of the three branches says what it does');
assert.ok(life.includes('hangar query done, hangar location present'), 'the hangar query result is logged');
assert.ok(life.indexOf('start battery_master') < life.indexOf('"var":["L:{local:HXX}_SDK_OH_BATTERY_MASTER","number"]},"eq":0'), 'the battery is logged before the branch');
console.log('Query non-blocking PASS: the failure of a query with a fallback is a temporary message (cleared when a location is found) and a trace row, the pitch search keeps its error, the boarding branch and the battery are logged at the start. Simulator runtime PENDING.');
