const fs = require('fs');

const read = (name) => JSON.parse(fs.readFileSync(`mission-src/macros/${name}.json`, 'utf8'));
const diagnostics = read('19-location-diagnostics');
const lifecycle = read('11-mission-lifecycle');
const shared = read('14-shared-runtime');
const saves = read('02-save-load-presets');

const trace = diagnostics['trace dispatch handoff'];
if (!Array.isArray(trace)) throw new Error('trace dispatch handoff macro is missing');
const traceText = JSON.stringify(trace);
for (const token of [
  '"append"', '"dispatch_handoff_log"', '"stage":{"param":"stage"}',
  'PRE_ACCIDENT_LOCATION LAT', 'PRE_RESCUE_LOCATION LAT', 'CUS_ACCIDENT LAT', 'CUS_RESCUE LAT',
  'SECOND_DISPATCH_ACCEPTED', 'CUS_SEND_DISPATCH', 'gap_accident_rescue_m', 'gap_landing_accident_m', '"removeIndex":0'
]) {
  if (!traceText.includes(token)) throw new Error(`handoff trace is missing ${token}`);
}

const starter = JSON.stringify(diagnostics['start location diagnostics']);
if (starter.includes('dispatch_handoff_log')) {
  throw new Error('start location diagnostics must not reset dispatch_handoff_log: it has to survive next_dispatch and reload_mission');
}
if (!JSON.stringify(diagnostics['capture crew movement snapshot']).includes('"key":"dispatch_handoff_log"')) {
  throw new Error('every snapshot must carry dispatch_handoff_log');
}

const sampler = JSON.stringify(diagnostics['sample diagnostic locations']);
if (sampler.includes('"var":"lat"') || sampler.includes('"var":"lon"')) {
  throw new Error('location coordinates must be read through the LVAR LAT/LON written from the location, not through a lat/lon location variable (it returned 0 for every location in a real snapshot)');
}
for (const name of ['accident_location', 'rescue_location', 'userA', 'landing_spot']) {
  if (!sampler.includes(`"value":{"location":"${name}"}`) || !sampler.includes(`L:DIAG_${name} LAT`)) {
    throw new Error(`sampler does not capture ${name} through its LVAR coordinates`);
  }
}

function countStages(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => countStages(item, found));
  else if (value && typeof value === 'object') {
    if (value.call_macro === 'trace dispatch handoff') found.add(value.params?.stage);
    Object.values(value).forEach((child) => countStages(child, found));
  }
  return found;
}
const stages = new Set();
for (const macros of [lifecycle, shared, saves]) countStages(macros, stages);
for (const stage of [
  'randomized', 'preview_done', 'preview_superseded', 'accept_second', 'objective1_start', 'objective1_rebuilt',
  'scene_ready', 'custom_mission_start', 'custom_pregenerated', 'reloadtemp_launch'
]) {
  if (!stages.has(stage)) throw new Error(`missing handoff trace stage ${stage}`);
}

const snapshot = JSON.stringify(diagnostics['capture diagnostic snapshot']);
for (const token of ['var:L:PRE_USERA LAT', 'var:L:CUS_ACCIDENT LAT', 'var:L:SECOND_DISPATCH_ACCEPTED', 'location:accident_location:distance:m:to_rescue_location']) {
  if (!snapshot.includes(token)) throw new Error(`snapshot_locations is missing ${token}`);
}

console.log(JSON.stringify({ result: 'PASS', stages: [...stages].sort() }, null, 2));
