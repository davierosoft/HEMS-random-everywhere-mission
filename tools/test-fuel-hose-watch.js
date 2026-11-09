'use strict';
// Fuel hose torn off when the helicopter leaves with the hose connected (user request 2026-11-09). Structural check of the sources; runtime PENDING.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'mission-src', 'macros');
const read = (name) => fs.readFileSync(path.join(dir, name), 'utf8');
const checklists = read('03-aircraft-crew-checklists.json');
const body = (name) => { const i = checklists.indexOf(`  "${name}": [`); assert.ok(i >= 0, name); return checklists.slice(i, checklists.indexOf('\n  ],', i)); };
const watch = body('fuel hose watch');
for (const needle of ['fuel_hose_watch_active', 'FUEL_HOSE_TORN', '"gt":500', 'fuel_truck_forced_end', '"destroy_object":"ftruck"', '"fuel truck arrived"},"value":null'])
  assert.ok(watch.includes(needle), `watcher misses ${needle}`);
assert.ok(body('refueling').includes('"call_macro":"fuel hose watch"'), 'refueling starts the watcher after the truck arrived');
const truck = body('fuel truck');
assert.equal(truck.split('fuel_truck_forced_end').length - 1, 3, 'the three truck positions (front, left, back) skip their walk after a forced end');
assert.ok(read('11-mission-lifecycle.json').includes('"FUEL_HOSE_TORN"},"value":0'), 'statistics reset');
assert.ok(read('04-dispatch-tablet-ui.json').includes('Fuel hose torn off'), 'debriefing line');
console.log('Fuel hose watch PASS: watcher, three guarded positions, statistics reset and debriefing line. HPG/MSFS PENDING.');
