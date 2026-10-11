#!/usr/bin/env node
'use strict';

// addon check: every `set` that reads $FETCH_STATUS must directly follow its own fetch. 169.26 had two fetches in a row
// (30West_Organcooler, 68ponyGT_EU_Firefighter1) followed by two sets, both reading the status of the second fetch.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const macros = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', '01-bootstrap-settings.json'), 'utf8'));
const list = macros['addon check'];
assert.ok(Array.isArray(list) && list.length > 0, 'addon check exists');
const usesStatus = (command) => JSON.stringify(command).includes('$FETCH_STATUS');
list.forEach((command, index) => {
  if (command.fetch) {
    assert.ok(list[index + 1]?.set && usesStatus(list[index + 1]), `fetch ${command.fetch.url} must be followed by the set that reads its status`);
  }
  if (usesStatus(command)) assert.ok(list[index - 1]?.fetch, `${JSON.stringify(command.set)} reads $FETCH_STATUS without a fetch of its own just before`);
});
const target = (url) => list.findIndex((command) => command.fetch?.url === url);
const pairs = [
  ['/VFS/Simobjects/Airplanes/30West_Organcooler/aircraft.cfg', '30West_installed'],
  ['/VFS/SimObjects/Airplanes/68ponyGT_EU_Firefighter1/aircraft.cfg', '68pony_marshal']
];
for (const [url, local] of pairs) {
  const at = target(url);
  assert.ok(at >= 0, `${url} is fetched`);
  assert.equal(list[at + 1].set.local, local, `${url} sets ${local}`);
}
assert.equal(list.filter((command) => command.fetch).length, list.filter((command) => command.set && usesStatus(command)).length, 'one fetch per status set');

console.log('Addon check PASS: every status set follows its own fetch, Organcooler sets 30West_installed, the EU firefighter sets 68pony_marshal.');
