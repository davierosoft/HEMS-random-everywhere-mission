const fs = require('fs');

const sourcePath = 'mission-src/macros/08-ground-response.json';
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

function fail(message) {
  throw new Error(`${sourcePath}: ${message}`);
}

function containsText(value, text) {
  if (typeof value === 'string') return value.includes(text);
  if (Array.isArray(value)) return value.some((entry) => containsText(entry, text));
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some((entry) => containsText(entry, text));
}

function findAvailabilityCondition(value, expectedState, text) {
  if (Array.isArray(value)) return value.some((entry) => findAvailabilityCondition(entry, expectedState, text));
  if (!value || typeof value !== 'object') return false;
  if (value.if?.local === 'AMBU_AVAIL' && value.eq === expectedState && containsText(value, text)) return true;
  return Object.values(value).some((entry) => findAvailabilityCondition(entry, expectedState, text));
}

function hasArrivalTransition(value) {
  if (Array.isArray(value)) return value.some(hasArrivalTransition);
  if (!value || typeof value !== 'object') return false;
  if (value.set?.local === 'AMBU_AVAIL' && value.value === 1) return true;
  return Object.values(value).some(hasArrivalTransition);
}

function hasExactNode(value, predicate) {
  if (Array.isArray(value)) return value.some((entry) => hasExactNode(entry, predicate));
  if (!value || typeof value !== 'object') return false;
  if (predicate(value)) return true;
  return Object.values(value).some((entry) => hasExactNode(entry, predicate));
}

function findNodes(value, predicate, matches = []) {
  if (Array.isArray(value)) value.forEach((entry) => findNodes(entry, predicate, matches));
  else if (value && typeof value === 'object') {
    if (predicate(value)) matches.push(value);
    Object.values(value).forEach((entry) => findNodes(entry, predicate, matches));
  }
  return matches;
}

function assertBaselineSceneStop(macro, parking, ambulance, stopDistance) {
  const directApproach = findNodes(macro, (node) => node.drive_object?.name === ambulance && node.drive_object.to === 'ambugo' && node.drive_object.VAR1 === 0);
  if (directApproach.length !== 1) fail(`${ambulance} must perform exactly one direct road-route drive to ambugo`);
  if (findNodes(macro, (node) => node.call_macro === `drive ${ambulance} safe multiplier` && node.params?.to === 'ambugo').length !== 0) {
    fail(`${ambulance} must not delegate the scene approach to a child-thread parameter wrapper`);
  }
  if (!hasExactNode(parking, (node) => node.wait_for?.location === ambulance && node.wait_for?.to === 'accident_location' && node.lt?.local === stopDistance)) {
    fail(`${ambulance} must stop the route at its configured minimum scene distance`);
  }
  if (!hasExactNode(parking, (node) => node.set?.object === ambulance && node.set.var === 'WP INDEX' && node.value === 0) ||
      !hasExactNode(parking, (node) => node.set?.object === ambulance && node.set.var === 'VELOCITY Z' && node.value === 0)) {
    fail(`${ambulance} baseline stop monitor must cancel waypoints and stop the vehicle`);
  }
}

const ambulance1 = source.Ambulance1;
if (!Array.isArray(ambulance1)) fail('Ambulance1 macro is missing');

if (!findAvailabilityCondition(ambulance1, 2, 'is on the way to the accident site')) {
  fail('the en-route Dispatch message must be emitted only while AMBU_AVAIL is 2');
}
if (!findAvailabilityCondition(ambulance1, 1, 'Ambulance crew arrived at accident location')) {
  fail('the arrival Dispatch message must be emitted only while AMBU_AVAIL is 1');
}
if (!hasExactNode(ambulance1, (node) => node.sleep?.[0] === 15 && node.sleep?.[1] === 30)) {
  fail('the first ambulance en-route announcement must retain its 15-30 second operational delay');
}
if (!hasExactNode(ambulance1, (node) => node.set?.local === 'ambu1_dispatch_announced' && node.value === 'yes')) {
  fail('the first ambulance must explicitly release the second ambulance announcement');
}

const ambulance2 = source.Ambulance2;
const ambulance1SceneParking = source.park_ambulance1_scene;
const ambulance2SceneParking = source.park_ambulance2_scene;
assertBaselineSceneStop(ambulance1, ambulance1SceneParking, 'ambulance1', 'ambu1stopdistance');
assertBaselineSceneStop(ambulance2, ambulance2SceneParking, 'ambulance2', 'ambu2stopdistance');
if (!hasExactNode(ambulance1SceneParking, (node) => node.drive_object?.name === 'ambulance1' &&
    node.drive_object.to?.[0]?.bearing2 === 270 && node.drive_object.to?.[0]?.dist === 14 &&
    node.drive_object.to?.[0]?.object === 'accident_location')) {
  fail('ambulance1 scene parking must use its independent west accident-location bay');
}
if (!hasExactNode(ambulance2SceneParking, (node) => node.drive_object?.name === 'ambulance2' &&
    node.drive_object.to?.[0]?.bearing2 === 90 && node.drive_object.to?.[0]?.dist === 14 &&
    node.drive_object.to?.[0]?.object === 'accident_location')) {
  fail('ambulance2 scene parking must use its independent east accident-location bay');
}
if (hasExactNode(ambulance1SceneParking, (node) => node.drive_object?.name === 'ambulance1' && JSON.stringify(node.drive_object.to).includes('"object":"ambulance1"')) ||
    hasExactNode(ambulance2SceneParking, (node) => node.wait_for?.object === 'ambulance1' && node.wait_for.var === 'VELOCITY Z') ||
    hasExactNode(ambulance2SceneParking, (node) => node.drive_object?.name === 'ambulance2' && JSON.stringify(node.drive_object.to).includes('"object":"ambulance1"'))) {
  fail('scene parking must not use an ambulance itself or the other ambulance as its parking reference');
}
if (hasExactNode(ambulance2, (node) => node.wait_for?.local === 'ambu1_dispatch_announced' && node.eq === 'yes')) {
  fail('the second ambulance route must not wait for the first ambulance announcement');
}
if (!containsText(ambulance2, "Ambulance '{0}' is following ambulance '{1}'. TTG:{2:TIME} min")) {
  fail('the second ambulance Dispatch text must describe its following role');
}
if (containsText(ambulance2, 'Ambulances {0} and {1} dispatched to the accident site')) {
  fail('the second ambulance must not overwrite a first Dispatch message before publishing');
}
if (!hasExactNode(ambulance2, (node) => node.call_macro === 'UpdateRescueTrack')) {
  fail('the second ambulance announcement must refresh RescueTrack');
}
const parkingMacros = ['park_ambulance1_scene', 'park_closest_ambulance', 'park_ambulance2_scene'];
for (const name of parkingMacros) {
  const macro = source[name];
  if (!hasArrivalTransition(macro)) {
    fail(`${name} must complete the arrival transition to AMBU_AVAIL 1`);
  }
}

console.log(JSON.stringify({ result: 'PASS', availabilityStates: { unavailable: 0, enRoute: 2, arrived: 1 } }, null, 2));
