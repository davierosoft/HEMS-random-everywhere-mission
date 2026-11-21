#!/usr/bin/env node
'use strict';
// DF tuning contract (user rule 2026-11-20): with a mission beacon and automatic tuning the CARLS DF page and the FND get the SAME value;
// without a tuned beacon the FND follows the frequency saved on the DF page (global CARLS_DF_FREQUENCY). Static gate; runtime stays PENDING until simulated.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const macros = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', '10-transfer-special-missions.json'), 'utf8'));
const update = JSON.stringify(macros['DF emergency beacon update']);
const clear = JSON.stringify(macros['DF emergency beacon clear']);
assert.ok(update && clear, 'DF macros missing');
// every set_df with a location divides the CARLS variable (never the mission param) by 1000
const located = update.match(/"set_df":\{"location":.*?"freq":(\{.*?\})\}\}/g) || [];
assert.ok(located.length >= 2, 'the beacon update must tune the FND in automatic and manual mode');
for (const s of located) assert.ok(s.includes('"divide":[{"var":["L:CARLS_DF_FREQUENCY","number"]},1000]'), 'FND frequency must come from L:CARLS_DF_FREQUENCY: ' + s.slice(0, 120));
assert.ok(!/"freq":\{"param":"frequency_mhz"\}/.test(update + clear), 'the mission frequency param must not tune the FND directly');
assert.ok(update.includes('CARLS DF set active channel'), 'automatic mode must write the CARLS channel');
assert.ok(clear.includes('CARLS DF clear bearing') && clear.includes('CARLS DF startup sync'), 'without a beacon the FND follows the saved DF page frequency');
assert.ok(!/"set_df"/.test(clear), 'the clear macro must not call set_df with the mission frequency');
for (const k of ['DF_DBG_REASON', 'DF_DBG_RESULT', 'DF_DBG_FND', 'DF_DBG_CARLS_L', 'DF_DBG_CARLS_G', 'DF_DBG_COUNT']) {
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', '19-location-diagnostics.json'), 'utf8').includes('"local:' + k + '"'), 'snapshot misses ' + k);
}
console.log('DF tuning logic PASS (static). HPG/MSFS runtime PENDING.');
