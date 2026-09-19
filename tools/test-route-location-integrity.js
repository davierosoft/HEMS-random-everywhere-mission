const fs = require('fs');

const queries = JSON.parse(fs.readFileSync('mission-src/macros/05-navigation-queries.json', 'utf8'));
const scenes = JSON.parse(fs.readFileSync('mission-src/macros/06-scene-generation.json', 'utf8'));
const ground = JSON.parse(fs.readFileSync('mission-src/macros/08-ground-response.json', 'utf8'));
const data = JSON.parse(fs.readFileSync('mission-src/data/02-waypoints-and-categories.json', 'utf8'));
const residentialData = (Array.isArray(data) ? data : Object.values(data).flat(Infinity))
  .filter((item) => item?.location_macro === 'Query random apartm detatched hotel');
const expectedHotelMissionIds = new Set([24, 26, 27, 28]);
if (residentialData.length !== 15) throw new Error(`unexpected residential query data count: ${residentialData.length}`);
if (residentialData.some((item) => item.location_name !== 'rescue_location')) {
  throw new Error('all residential query scenes must route to rescue_location');
}
const hotelForcedIds = residentialData
  .map((item) => Number(String(item.id).match(/ID:(\d+)/)?.[1]))
  .filter((id) => id < 29);
if (hotelForcedIds.length !== expectedHotelMissionIds.size || hotelForcedIds.some((id) => !expectedHotelMissionIds.has(id))) {
  throw new Error(`unexpected hotel-forcing mission IDs: ${hotelForcedIds.join(',')}`);
}
const injuredCounts = Object.fromEntries(residentialData.map((item) => [String(item.id).match(/ID:(\d+)/)?.[1], item.max_injured]));
const residential = queries['query closest residential rescue team'];
if (!Array.isArray(residential)) throw new Error('residential rescue query macro is missing');

const serialized = JSON.stringify(residential);
for (const token of [
  '"has_location":"accident_location"',
  '"location":"accident_location"',
  '"object":"accident_location"',
  '"location_name"',
  '"distance:km"',
  '"bearing2":0',
  '"dist":25',
  '"radius":150',
  '"minRadius":10'
]) {
  if (!serialized.includes(token)) throw new Error(`residential location watchdog is incomplete: ${token}`);
}
if (serialized.includes('"object":"ambu_station"')) throw new Error('residential rescue query must never use ambu_station as a scene location');
if (serialized.includes('"set_route"')) throw new Error('residential rescue query must not own flight routing');

const distanceGuard = residential.find((item) => item?.if?.location === 'accident_location' && item.if.var === 'distance:km' && item.if.to === 'rescue_location');
if (!distanceGuard || distanceGuard.gt > 0.3 || distanceGuard.gt <= 0) throw new Error('residential rescue distance watchdog must reject distances above 0.3 km');

const residentialScene = scenes.residential;
const sceneLines = [];
function collectSceneLines(value) {
  if (Array.isArray(value)) return value.forEach(collectSceneLines);
  if (!value || typeof value !== 'object') return;
  if (value.set_map?.add?.line) sceneLines.push(value.set_map.add.line);
  for (const child of Object.values(value)) collectSceneLines(child);
}
collectSceneLines(scenes);
if (sceneLines.some((line) => JSON.stringify(line.points) === JSON.stringify(['accident_location', 'rescue_location']))) {
  throw new Error('scene generation must not draw a ciano line from accident_location to rescue_location');
}
const patientMoves = [];
function collectPatientMoves(value, fireBranch = false) {
  if (Array.isArray(value)) return value.forEach((item) => collectPatientMoves(item, fireBranch));
  if (!value || typeof value !== 'object') return;
  if (value.move_object && /^injured_human[2-3]?$/.test(value.move_object)) patientMoves.push({ name: value.move_object, fireBranch, to: value.to });
  const nextFireBranch = fireBranch || (value.if?.local === 'HELOVICTIMS' && value.eq === 3);
  for (const child of Object.values(value)) collectPatientMoves(child, nextFireBranch);
}
collectPatientMoves(residentialScene);
if (patientMoves.length !== 3 || patientMoves.some((move) => !move.fireBranch || move.to?.object !== 'rescue_location')) {
  throw new Error('residential patients must move to rescue_location only inside the three-injured fire branch');
}

const residentialFireLocation = residentialScene.find((item) => item?.create_location === 'FIRE');
if (JSON.stringify(residentialFireLocation) !== JSON.stringify({
  create_location: 'FIRE',
  zones: [{ zone: { location: { bearing: 190, dist: 2, object: 'accident_location' } } }]
})) {
  throw new Error('residential fire geometry must remain authored at 2 m from accident_location');
}
let fireMovedToTarget = false;
function findFireMove(value) {
  if (Array.isArray(value)) return value.some(findFireMove);
  if (!value || typeof value !== 'object') return false;
  if (value.move_object === 'VFXA' && value.to === 'FIRE') fireMovedToTarget = true;
  return Object.values(value).some(findFireMove);
}
findFireMove(residentialScene);
if (!fireMovedToTarget) throw new Error('residential three-patient fire must use the authored FIRE location');

function findRouteTo(value, target, found = []) {
  if (Array.isArray(value)) value.forEach((item) => findRouteTo(item, target, found));
  else if (value && typeof value === 'object') {
    if (value.create_route?.query?.to === target) found.push(value.create_route);
    Object.values(value).forEach((child) => findRouteTo(child, target, found));
  }
  return found;
}
function findCreatedLocation(value, name) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findCreatedLocation(item, name);
      if (found) return found;
    }
  } else if (value && typeof value === 'object') {
    if (value.create_location === name) return value;
    for (const child of Object.values(value)) {
      const found = findCreatedLocation(child, name);
      if (found) return found;
    }
  }
  return null;
}
for (const macroName of ['Firetruck1', 'Firetruck2']) {
  const macro = ground[macroName];
  if (!macro) throw new Error(`missing ${macroName} macro`);
  if (!JSON.stringify(macro).includes('fire_truck_scene_access')) {
    throw new Error(`${macroName} must use the road-access location`);
  }
  if (macroName === 'Firetruck1') {
    const access = findCreatedLocation(macro, 'fire_truck_scene_access');
    if (access?.zones?.[0]?.zone?.location?.object !== 'accident_location') {
      throw new Error(`${macroName} must let the road router resolve the nearest road to accident_location`);
    }
  }
  if (JSON.stringify(macro).includes('"object":"rescue_location"')) {
    throw new Error(`${macroName} must not use rescue_location as the fire-truck route target`);
  }
}
if (findCreatedLocation(ground.Firetruck1, 'FIRE')) throw new Error('Firetruck1 must not overwrite the authored FIRE location');
for (const [macroName, watchdogName] of [['park_firetruck1', 'watchdog_firetruck1_scene_approach'], ['park_firetruck2', 'watchdog_firetruck2_scene_approach']]) {
  const parkingText = JSON.stringify(ground[macroName]);
  if (!parkingText.includes('fire_truck_scene_access')) throw new Error(`${macroName} must retain the route access guard`);
  if (!parkingText.includes(watchdogName)) throw new Error(`${macroName} must retain a fire-overlay watchdog fallback`);
  if (parkingText.includes('"bearing2":90,"dist":5') || parkingText.includes('"bearing2":270,"dist":5')) {
    throw new Error(`${macroName} must not perform redundant lateral parking maneuvers`);
  }
}

console.log(JSON.stringify({ result: 'PASS', residentialScenes: residentialData.length, hotelForcedIds: [...expectedHotelMissionIds], injuredCounts, fireBranch: 'HELOVICTIMS=3', patientMoves: patientMoves.length, fire: 'accident_location', fireTruckRoute: 'nearest_road_to_accident_location', hospital: 'ambu_station', maxDistanceKm: distanceGuard.gt }, null, 2));
