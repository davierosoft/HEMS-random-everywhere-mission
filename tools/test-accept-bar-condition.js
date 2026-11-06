#!/usr/bin/env node
'use strict';
// Reports of testers (2026-11-05, at least four, mixed versions including the original 0.997, always at the first dispatch, no logs): the dispatch is
// shown, the radio or the wifi is connected, the ACCEPT DISPATCH bars are missing. The three bars needed HOCconnection = Connected, a state kept by the
// thread "HOC connection", which waits for a location and is reset by objective1. The bars now follow the live connection, the one the offer of the
// dispatch uses (first_dispatch: CARLS_CONNECTED not 0, or wificonnect not Disconnected; 2 and In progress are transient states of the connection). The renderer takes no OR (DEVELOPMENT_RELEASE_CHECKLIST, section 4): each bar is two
// rows, one for the wifi and one for the radio alone, mutually exclusive. HOCconnection stays on the LINK line, with the phase and the dispatch flag,
// so a screenshot says why a bar is hidden.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const raw = fs.readFileSync(path.join(__dirname, '..', 'mission-src/root/03-briefing.json'), 'utf8');
const briefing = JSON.parse(raw).briefing;
const bars = briefing.filter((o) => o.buttonbar && JSON.stringify(o).includes('"ACCEPT DISPATCH"'));
assert.strictEqual(bars.length, 6, 'three ACCEPT DISPATCH bars, two rows each');
const wifi = '{"require":{"local":"wificonnect"},"ne":"Disconnected"}';
const radio = '{"require":{"local":"wificonnect"},"eq":"Disconnected"},{"require":{"var":["L:CARLS_CONNECTED","number"]},"ne":0}';
for (let i = 0; i < bars.length; i += 2) {
  const a = JSON.stringify(bars[i].show_condition), b = JSON.stringify(bars[i + 1].show_condition);
  assert.ok(a.includes(wifi) && !a.includes('CARLS'), 'row A: the wifi (any state but Disconnected, as the offer of the dispatch)');
  assert.ok(b.includes(radio), 'row B: the radio when the wifi is Disconnected (exclusive of row A)');
  assert.strictEqual(a.replace(wifi, 'X'), b.replace(radio, 'X'), 'the phase rules of the two rows are the same');
  assert.strictEqual(JSON.stringify(bars[i].buttonbar), JSON.stringify(bars[i + 1].buttonbar), 'the two rows carry the same buttons');
  assert.ok(a.includes('MISSION_PHASE'), 'the phase rules are kept');
}
for (const b of bars) assert.ok(!JSON.stringify(b.show_condition).includes('HOCconnection'), 'no bar depends on HOCconnection');
assert.ok(!/"or"/.test(raw), 'the briefing renderer has no OR');
const lines = briefing.filter((o) => o.text && o.text.includes('| DISPATCHER: '));
assert.strictEqual(lines.length, 2, 'two rows: the dispatcher with and without the app (a * after the name)');
for (const l of lines) {
  const lp = JSON.stringify(l.params);
  assert.ok(['CARLS CONNECTED', '5G', 'WIFI', 'NO CONNECTION AVAILABLE', 'GRPNAME', 'L:CARLS_CONNECTED', 'TABLET_5G_ENABLED', 'wificonnect'].every((k) => lp.includes(k)), 'connection mode and dispatcher name');
  assert.ok(!/HOCconnection|MISSION_PHASE|DISPLAY_DISPATCH|location_ref/.test(lp), 'no debug value on the briefing');
}
assert.ok(lines[0].show_condition.eq === 1 && !lines[0].text.endsWith('*'), 'app connected: no star');
assert.ok(lines[1].show_condition.ne === 1 && lines[1].text.endsWith('*'), 'app not connected: star after the dispatcher');
assert.ok(!briefing.some((o) => o.text && o.text.startsWith('LINK:')), 'the debug LINK line is gone');
console.log('accept bar condition ok');
