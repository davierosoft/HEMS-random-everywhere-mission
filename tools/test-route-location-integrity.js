const fs = require('fs');

const queries = JSON.parse(fs.readFileSync('mission-src/macros/05-navigation-queries.json', 'utf8'));
const scenes = JSON.parse(fs.readFileSync('mission-src/macros/06-scene-generation.json', 'utf8'));
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
if (!serialized.includes('"zone_type":"query_closest_result"')) throw new Error('residential rescue query must use the closest access result');
if (serialized.includes('"zone_type":"query_random_result"')) throw new Error('residential rescue query must not choose a random access result');
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
if (serialized.includes('"bearing":90')) throw new Error('residential location fallback must not use the helicopter-relative bearing field');
if (serialized.includes('"set_route"')) throw new Error('residential rescue query must not own flight routing');

const distanceGuard = residential.find((item) => item?.if?.location === 'accident_location' && item.if.var === 'distance:km' && item.if.to === 'rescue_location');
if (!distanceGuard || distanceGuard.gt > 0.3 || distanceGuard.gt <= 0) throw new Error('residential rescue distance watchdog must reject distances above 0.3 km');

const residentialScene = scenes.residential;
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

const lifecycle = require('../mission-src/macros/11-mission-lifecycle.json')['delayed threads'];
const flightPlanThread = lifecycle.find((item) => item?.create_thread?.commands?.[0]?.while?.do?.some((command) => command?.or));
const flightPlanCommands = flightPlanThread?.create_thread?.commands?.[0]?.while?.do;
const routeStartRefresh = flightPlanCommands?.findIndex((command) => command?.create_location === 'route_start');
const routeErrorReset = flightPlanCommands?.findIndex((command) => command?.set?.local === 'routeupdate_error');
if (routeStartRefresh < 0 || routeErrorReset < 0 || routeStartRefresh > routeErrorReset) {
  throw new Error('flight-plan redraw must refresh route_start from the helicopter before drawing the route');
}

console.log(JSON.stringify({ result: 'PASS', residentialScenes: residentialData.length, hotelForcedIds: [...expectedHotelMissionIds], injuredCounts, fireBranch: 'HELOVICTIMS=3', patientMoves: patientMoves.length, rescue: 'rescue_location', sceneAccess: 'accident_location', hospital: 'ambu_station', maxDistanceKm: distanceGuard.gt }, null, 2));
