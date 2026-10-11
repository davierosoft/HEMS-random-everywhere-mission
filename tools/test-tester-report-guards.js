#!/usr/bin/env node
'use strict';

// Tester report (Daikan, 2026-10-11, build 169.45): three banners.
// 1. "Object 2car6 doesn't exist" on `set WP INDEX` of a traffic car: the worker that waits for the car to come near the scene ran after the
//    owning loop had destroyed the car (it reaches the scene and is destroyed), so the set hit a missing object.
// 2. ERR101 "FAILED to find a suitable location within {0} meters": since 169.41 one OSM query without an answer set ATTEMPTS_COUNT to
//    MAX_ATTEMPTS, so a single slow or failed Overpass answer ended the whole search (the original retries with a larger radius); the text also
//    showed the raw {0} because the params sat on the `set`, not in a text formatter.
// 3. TypeError "Object.keys(undefined)" in the RescueTrack phase macros at the mission start: the static is named from the local RESCUETRACK_ID,
//    which the start-up threads (Ready dispatch 5/6) can read before the mission init has set it.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', file), 'utf8'));
const walk = (value, visit) => {
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else if (value && typeof value === 'object') {
    visit(value);
    Object.values(value).forEach((item) => walk(item, visit));
  }
};

// 1. traffic cars: every WP INDEX set of a traffic car sits inside `if has_object <same car>`
const scene = read('06-scene-generation.json');
for (const k of [1, 2, 3]) {
  const name = `{local:carname${k}}`;
  let guarded = 0;
  walk(scene[`random traffic${k}`], (node) => {
    if (node.if && node.if.has_object === name && node.eq === 1 && Array.isArray(node.then)) {
      const sets = node.then.filter((c) => c.set && c.set.object === name && c.set.var === 'WP INDEX');
      if (sets.length) guarded += sets.length;
    }
  });
  let total = 0;
  walk(scene[`random traffic${k}`], (node) => {
    if (node.set && node.set.object === name && node.set.var === 'WP INDEX') total += 1;
  });
  assert.equal(total, 1, `random traffic${k}: one WP INDEX set`);
  assert.equal(guarded, 1, `random traffic${k}: the WP INDEX set of the car waits for has_object (the loop may have destroyed the car)`);
  // every other set on the car (VELOCITY Z, both workers) is guarded the same way
  let velocity = 0; let velocityGuarded = 0;
  walk(scene[`random traffic${k}`], (node) => {
    if (node.set && node.set.object === name && node.set.var === 'VELOCITY Z') velocity += 1;
    if (node.if && node.if.has_object === name && Array.isArray(node.then)) velocityGuarded += node.then.filter((c) => c.set && c.set.object === name && c.set.var === 'VELOCITY Z').length;
  });
  let waits = 0;
  walk(scene[`random traffic${k}`], (node) => {
    if (node.if && node.if.has_object === name && Array.isArray(node.then) && node.then.some((c) => c.wait_for && c.wait_for.object === name && c.wait_for.var === 'VELOCITY Z')) waits += 1;
  });
  assert.equal(waits, 1, `random traffic${k}: the wait on VELOCITY Z only starts when the car exists`);
  assert.equal(velocity, 2, `random traffic${k}: two VELOCITY Z sets (stop near the scene, start of a stopped car)`);
  assert.equal(velocityGuarded, 2, `random traffic${k}: every VELOCITY Z set of the car is guarded by has_object`);
}

// 2. sampling query: a null answer is one failed attempt, never the end of the search
const nav = read('05-navigation-queries.json');
const sampling = nav['Query closest nodes with sampling'];
const text = JSON.stringify(sampling);
assert.ok(!/"set":\{"param":"ATTEMPTS_COUNT"\},"value":\{"param":"MAX_ATTEMPTS"\}/.test(text), 'a query without an answer must not set ATTEMPTS_COUNT to MAX_ATTEMPTS');
assert.ok(text.includes('OSM query: no answer in 10 s, next attempt.'), 'the no-answer branch moves to the next attempt');
const failed = [];
walk(sampling, (node) => { if (node.set && node.set.local === 'queryfailed') failed.push(node); });
assert.equal(failed.length, 1, 'one ERR101 text');
assert.ok(failed[0].value && failed[0].value.text && /within \{0\} meters/.test(failed[0].value.text) && Array.isArray(failed[0].value.params), 'ERR101 formats SAMPLE_RADIUS through a text formatter');
assert.ok(!('params' in failed[0]), 'no params next to the set command');

// 3. RescueTrack macros that name a static from RESCUETRACK_ID call the guard first
const life = read('11-mission-lifecycle.json');
const guard = life['rescuetrack id guard'];
assert.ok(guard, 'the guard macro exists');
const guardText = JSON.stringify(guard);
assert.ok(guardText.includes('"local":"RESCUETRACK_ID"},"eq":null') && guardText.includes('"local":"RESCUETRACK_ID"},"gt":1'), 'the guard replaces a missing or out of range id (statics exist for 0 and 1)');
for (const name of ['UpdateRescueTrack', 'Update_dispatchphase from raw', 'Update_raw from dispatchphase']) {
  assert.ok(life[name], `${name} exists`);
  assert.deepEqual(life[name][0], { call_macro: 'rescuetrack id guard' }, `${name} starts with the id guard`);
}

// 4. Second tester report (2026-10-11, build 169.45, German ambulance): the ambulance loaded the patient on the stretcher, the stretcher walked to
// the vehicle and the load ended right there (no medic drive followed in the trace); the dispatch then counted the ambulance as having no patient,
// the medic boarded and the ambulance left, the stretcher with the patient stayed on scene. The only silent exit after that drive was the distance
// gate `stretcher to vehicle centre > 4 m -> return 0` (a long vehicle stops its stretcher farther than 4 m from its centre). Crew movement is
// synchronous: a distance must not decide whether the drive completed, so the gate is gone and the distance is traced instead.
const multi = read('17-multipatient-runtime.json');
const loadObjects = JSON.stringify(multi['multipatient registry live ground load objects']);
assert.ok(!/"location":"ambustretcher[27]","var":"distance:m","to":"ambulance[12]"\},"gt":4/.test(loadObjects), 'the live ground load must not abort on the distance of the stretcher to the vehicle centre');
assert.equal((loadObjects.match(/stretcher_after_drive_distance_to_vehicle/g) || []).length, 2, 'both vehicles trace the distance after the stretcher drive');
assert.ok(JSON.stringify(multi['multipatient registry live ground load']).includes('objects_not_loaded'), 'a load that stops on the objects says why in the trace');

// 5. Third tester report (2026-10-11, build 169.45): the second dispatch started on the location of the first. objective1 rebuilds
// accident_location, rescue_location and userA of an accepted second dispatch from the PRE_* LVARs; the preview wrote PRE_ACCIDENT_LOCATION only
// outside SAR and PRE_RESCUE_LOCATION / PRE_USERA only for their own scene, and nothing cleared them, so a SAR dispatch after a normal one (and a
// climber after a residential one) was rebuilt on the earlier dispatch (snapshot: accident 19 km from the real one, rescue_location of the first dispatch).
const shared = read('14-shared-runtime.json');
const clearText = JSON.stringify(shared['dispatch pre clear']);
for (const name of ['PRE_ACCIDENT_LOCATION', 'PRE_RESCUE_LOCATION', 'PRE_USERA']) {
  for (const axis of ['LAT', 'LON']) {
    assert.ok(clearText.includes(`{"set":{"var":["L:${name} ${axis}","number"]},"value":0}`), `dispatch pre clear zeroes ${name} ${axis}`);
  }
}
assert.equal((clearText.match(/"set"/g) || []).length, 6, 'dispatch pre clear writes the six coordinates and nothing else');

// tiny evaluator of the refresh macro: conditions, sets of LVARs, nested call_macro; maps, sleeps and traces are not needed here
function runRefresh(world) {
  const lvar = world.lvar;
  const value = (node) => {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      if ('local' in node) return world.local[node.local] ?? null;
      if ('param' in node) return world.param[node.param] ?? null;
      if ('has_location' in node) return world.locations[node.has_location] ? 1 : 0;
      if ('location' in node) return world.locations[node.location] || null;
      if ('var' in node) return lvar[node.var[0].replace(/^L:/, '')] ?? 0;
    }
    return node;
  };
  const compare = (left, op, right) => {
    if (op === 'eq') return left === right;
    if (op === 'ne') return left !== right;
    throw new Error(`operator ${op} not simulated`);
  };
  const test = (node) => {
    if (node.and) return node.and.every((item) => compare(value(item.require), item.eq !== undefined ? 'eq' : 'ne', item.eq !== undefined ? item.eq : item.ne));
    const op = ['eq', 'ne'].find((key) => key in node);
    return compare(value(node.if), op, value(node[op]));
  };
  const run = (commands) => {
    for (const command of commands) {
      if (command['#comment'] !== undefined || command.set_map || command.sleep !== undefined) continue;
      if (command.call_macro === 'trace dispatch handoff' || command.call_macro === 'clear_unaccepted_dispatch_map') continue;
      if (command.call_macro) { run(shared[command.call_macro]); continue; }
      if (command.set) {
        const key = command.set.var[0].replace(/^L:/, '');
        const coordinate = command.value && command.value.location ? world.locations[command.value.location] : null;
        if (coordinate) { lvar[`${key} LAT`] = coordinate.lat; lvar[`${key} LON`] = coordinate.lon; } else lvar[key] = command.value;
        continue;
      }
      if (command.if) {
        const header = command.if.and ? { and: command.if.and, eq: command.eq } : command;
        const taken = command.if.and ? test({ and: command.if.and }) : test(command);
        const branch = taken ? command.then : command.else;
        if (branch) run(branch);
        continue;
      }
      if (command.create_thread) { run(command.create_thread.commands); continue; }
      if (command.or) continue;
      if (command.wait_for !== undefined) continue;
      throw new Error(`command not simulated: ${JSON.stringify(command).slice(0, 80)}`);
    }
  };
  world.param.generation = world.local.map_preview_generation;
  run(shared.refresh_unaccepted_dispatch_map);
}
const dispatch = (world, kind, accident, rescue, userA) => {
  world.locations = { accident_location: accident, rescue_location: rescue || world.locations.rescue_location, userA: userA || world.locations.userA };
  world.local.SAR = kind === 'sar' ? 'yes' : 'no';
  world.local.MISSION_NUMBER = kind === 'organ' ? 4 : 1;
  world.local.location_name = kind === 'residential' ? 'rescue_location' : kind === 'organ' ? 'userA' : 'accident_location';
  world.local.has_location = 'yes';
  world.local.map_preview_generation += 1;
  runRefresh(world);
};
const world = { lvar: {}, local: { map_preview_generation: 0 }, param: {}, locations: {} };
const A1 = { lat: 47.65, lon: 10.38 }; const R1 = { lat: 47.66, lon: 10.38 };
const A2 = { lat: 47.53, lon: 10.56 }; const A3 = { lat: 47.47, lon: 10.43 }; const U4 = { lat: 46.1, lon: 9.2 };
dispatch(world, 'residential', A1, R1);
assert.deepEqual([world.lvar['PRE_ACCIDENT_LOCATION LAT'], world.lvar['PRE_RESCUE_LOCATION LAT']], [A1.lat, R1.lat], 'residential dispatch: accident and rescue written');
dispatch(world, 'climber', A2);
assert.equal(world.lvar['PRE_ACCIDENT_LOCATION LAT'], A2.lat, 'climber dispatch after a residential one: its own accident');
assert.equal(world.lvar['PRE_RESCUE_LOCATION LAT'], 0, 'climber dispatch after a residential one: the rescue_location of the first dispatch is not rebuilt');
dispatch(world, 'sar', A3);
assert.equal(world.lvar['PRE_ACCIDENT_LOCATION LAT'], A3.lat, 'SAR dispatch after a normal one: its own accident, not the location of the previous mission');
assert.equal(world.lvar['PRE_ACCIDENT_LOCATION LON'], A3.lon, 'SAR dispatch: longitude too');
assert.equal(world.lvar['PRE_RESCUE_LOCATION LAT'], 0, 'SAR dispatch: no rescue_location rebuilt');
dispatch(world, 'organ', null, null, U4);
assert.equal(world.lvar['PRE_ACCIDENT_LOCATION LAT'], 0, 'organ dispatch (mission 4): no accident of an earlier dispatch rebuilt');
assert.equal(world.lvar['PRE_USERA LAT'], U4.lat, 'organ dispatch: its own userA');
dispatch(world, 'climber', A2);
assert.equal(world.lvar['PRE_USERA LAT'], 0, 'dispatch after an organ one: userA of the earlier dispatch is not rebuilt');

// 6. Fourth tester report (2026-10-11, build 169.45, mission 62, two patients): the ambulance parked on scene and never deployed its crew, and the
// helicopter crew never visited patient 1 either (HEMS took patient 2 alone, patient 1 stayed on scene with the ambulance next to him). Two locals of the
// previous dispatch survived reload_mission: ambulance1_thread_started (ambustretcher full returns at once when it is yes) and P1_GROUND_PROVIDER (crew
// eligibility answers assigned for a patient with a ground provider). Every flag the ambulance workers and the shelter conditions read at the start of a
// dispatch is written back at mission start.
const resetText = JSON.stringify(life.objective1);
for (const name of ['ambulance1_thread_started', 'ambulance1_gate', 'ambulance1_log', 'ambulance1_medic_created', 'ambulance1_crew_at_scene', 'ambulance1_assessment_complete', 'P1_AMBULANCE_DECISION', 'P2_AMBULANCE_DECISION', 'P3_AMBULANCE_DECISION']) {
  assert.ok(new RegExp(`"set":\\{"local":"${name}"\\},"value":(null|"no")`).test(resetText), `objective1 resets ${name} at mission start`);
}
assert.ok(/"ambulance1_thread_started"\},"value":"no"/.test(resetText), 'the re-entry guard of ambustretcher full starts open');
const liveInit = multi['multipatient registry live initialize'];
const iReset = liveInit.findIndex((c) => c.set && c.set.local === 'P1_GROUND_PROVIDER');
const iRestore = liveInit.findIndex((c) => c.call_macro === 'multipatient registry live restore open');
assert.ok(iReset >= 0 && iRestore > iReset, 'the ground providers are cleared before the saved mission restore (which sets them)');
for (const name of ['P2_GROUND_PROVIDER', 'P3_GROUND_PROVIDER']) assert.ok(liveInit.some((c) => c.set && c.set.local === name && c.value === null), `${name} is cleared at start`);

console.log('Tester report guards PASS: traffic car sets wait for the car, a query without an answer retries with a larger radius, ERR101 shows the radius, RescueTrack phase macros never name a missing static, the live ambulance load does not abort on the vehicle-centre distance, a finished dispatch preview clears the PRE_* locations and writes the SAR accident (second dispatch no longer rebuilt on the first). HPG/MSFS PENDING.');
