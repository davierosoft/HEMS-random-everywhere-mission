'use strict';
// Static contract of the SAR visual hints and of the four custom SAR missions (65-68).
// Reads the modular sources directly. HPG/MSFS behaviour stays PENDING (docs/testing/RUNTIME_VALIDATION.md).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'mission-src');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'macros')).filter((name) => name.endsWith('.json'))) {
  Object.assign(macros, read(path.join('macros', file)));
}
const accidents = read('data/02-waypoints-and-categories.json').accidents;
const assets = read('data/04-vehicles-and-scene-assets.json');
const fail = (message) => { throw new Error(message); };
const expect = (condition, message) => { if (!condition) fail(message); };
const text = (value) => JSON.stringify(value);

// --- the four missions -------------------------------------------------------------------------
const wanted = { 65: { mnumber: 1, type: 24, camping: 42 }, 66: { mnumber: 2, type: 26, camping: 44 }, 67: { mnumber: 1, type: 25, camping: 43 }, 68: { mnumber: 2, type: 27, camping: 45 } };
const cards = accidents.map((a) => a.ID_CARD);
expect(new Set(cards).size === cards.length, 'ID_CARD values must be unique');
for (const [card, expected] of Object.entries(wanted)) {
  const mission = accidents.find((a) => a.ID_CARD === Number(card));
  expect(mission, `mission ${card} missing`);
  expect(Number(card) < 100, `mission ${card} must use a number below 100`);
  expect(mission.id.startsWith(`ID:${card}/`), `mission ${card} id label must start with ID:${card}/`);
  expect(mission.mnumber === expected.mnumber, `mission ${card} mnumber must be ${expected.mnumber} (1 road/vehicle accident, 2 otherwise)`);
  expect(mission.type === expected.type && mission.camping === expected.camping, `mission ${card} type/camping must be ${expected.type}/${expected.camping}`);
  expect(mission.SAR === 'yes' && mission.browse_category1 === 'SAR', `mission ${card} must be a SAR mission`);
  for (const key of ['description1', 'description2', 'description3', 'description4', 'general_description', 'objective', 'name']) {
    expect(typeof mission[key] === 'string' && mission[key].length > 10 && /^[\x20-\x7e]+$/.test(mission[key]), `mission ${card} ${key} must be non-empty printable ASCII`);
  }
  expect(macros[mission.scene_macro], `mission ${card} scene macro ${mission.scene_macro} does not exist`);
  expect(macros[mission.location_macro], `mission ${card} location macro ${mission.location_macro} does not exist`);
  expect(mission.location_name === 'accident_location', `mission ${card} must keep the classic accident_location name`);
  expect(['plb_person', 'normal', 'crash'].includes(mission.ELT_mode), `mission ${card} ELT mode is unknown`);
  expect(!('is_random' in mission), `mission ${card} must be randomizable`);
}
// type is the key of mnumber 1 missions and camping of mnumber 2 ones (missionupdatemultiplayer): never repeat them, and keep the new values unique everywhere.
for (const mnumber of [1, 2]) {
  const key = mnumber === 1 ? 'type' : 'camping';
  const values = accidents.filter((a) => a.mnumber === mnumber).map((a) => a[key]);
  expect(new Set(values).size === values.length, `mnumber ${mnumber} ${key} values must not repeat`);
}
for (const key of ['type', 'camping']) {
  const fresh = Object.values(wanted).map((w) => w[key]);
  const others = accidents.filter((a) => !(a.ID_CARD >= 65 && a.ID_CARD <= 68)).map((a) => a[key]);
  expect(fresh.every((v) => !others.includes(v)), `new ${key} values must not be used by any other mission`);
}

// --- sar_objects static ---------------------------------------------------------------------
const objects = assets.sar_objects;
expect(Array.isArray(objects) && objects.length >= 20, 'sar_objects static is missing');
for (const o of objects) {
  expect(o.kind && o.title && o.fallback_title && (o.needs30west === 'yes' || o.needs30west === 'no'), `sar_objects entry incomplete: ${text(o)}`);
  expect(/^[\x20-\x7e]+$/.test(text(o)), `sar_objects entry must be ASCII: ${text(o)}`);
  if (o.kind === 'car' || o.kind === 'atv') expect(o.model, `${o.title} needs a model for the dispatch text`);
}
const kinds = new Set(objects.map((o) => o.kind));
for (const kind of ['car', 'atv', 'tent', 'campfire', 'bag', 'bike', 'dog', 'ski', 'snowmobile', 'glider']) expect(kinds.has(kind), `sar_objects lacks kind ${kind}`);
for (const kind of kinds) expect(!/flare|smoke|debris/i.test(kind), 'no flare, smoke or debris hints: they already exist in the scenes or do not exist as objects');
expect(!objects.some((o) => /flare|smoke/i.test(o.title)), 'no flare or smoke object in sar_objects');

// --- macros -----------------------------------------------------------------------------------
for (const name of ['SAR pick object', 'SAR hint place', 'SAR hint road car', 'SAR visual hints', 'SAR car dispatch text', 'SAR OVERDUE VEHICLE', 'SAR PARKED CAR', 'Query random parked car walk', 'Query random wandering person']) {
  expect(Array.isArray(macros[name]), `macro ${name} missing`);
}
// hook after the scene macro in both generators, guarded by SAR yes
for (const name of ['CRASH_SITE', 'CAMPING_SITE']) {
  const arr = macros[name];
  const idx = arr.findIndex((c) => c.call_macro && c.call_macro.local === 'scene_macro');
  expect(idx >= 0, `${name} scene call missing`);
  const next = arr[idx + 1];
  expect(next && next.if && next.if.local === 'SAR' && next.eq === 'yes' && text(next.then) === '[{"call_macro":"SAR visual hints"}]', `${name} must call SAR visual hints right after the scene macro when SAR is yes`);
}
// dispatch text hook after every HELOVICTIMS refinement
let hookSites = 0;
let refinementSites = 0;
(function walk(node) {
  if (Array.isArray(node)) {
    node.forEach((child, i) => {
      if (child && child.call_macro === 'HELOVICTIMS refinement') { refinementSites += 1; if (node[i + 1] && node[i + 1].call_macro === 'SAR car dispatch text') hookSites += 1; }
      walk(child);
    });
  } else if (node && typeof node === 'object') Object.values(node).forEach(walk);
})(read('macros/11-mission-lifecycle.json'));
expect(refinementSites === 4 && hookSites === 4, `the dispatch text hook must follow all 4 HELOVICTIMS refinement calls (found ${hookSites}/${refinementSites})`);
const dispatchText = text(macros['SAR car dispatch text']);
expect(dispatchText.includes('sar_desc_final') && dispatchText.includes('CASUALTY_PERCENTAGE'), 'dispatch text must be idempotent and deterministic from CASUALTY_PERCENTAGE');

// hints: radius inside the ring, cosmetic only, cars only when the query ran, glider rare, nothing for 18 and 19
const hints = macros['SAR visual hints'];
const hintText = text(hints);
expect(hintText.includes('"SAR_MAX_RADIUS"') && hintText.includes('"distance:m"'), 'hint radius must be bounded by the search ring margin');
expect(!hintText.includes('"VAR_MISSION_NUMBER"},"eq":18') && !hintText.includes('"VAR_MISSION_NUMBER"},"eq":19'), 'missions 18 and 19 must not get extra hints');
const block = (card) => hints.find((c) => c.if && c.if.local === 'VAR_MISSION_NUMBER' && c.eq === card);
for (const card of [17, 40, 42, 44, 46, 66, 67, 68]) expect(block(card), `hint block for mission ${card} missing`);
expect(!block(65), 'mission 65 gets its clue from the vehicle and the routes, not from random hints');
const gliderChances = [...text(block(17)).matchAll(/"kind":"glider","chance":(\d+)/g)].map((m) => Number(m[1]));
expect(gliderChances.length === 1 && gliderChances[0] <= 15, 'the second paraglider must stay rare (chance <= 15)');
for (const card of [17, 66, 67, 68]) expect(!text(block(card)).includes('SAR hint road car'), `mission ${card} must not place road cars`);
(function checkRoadCar(node, guarded) {
  if (Array.isArray(node)) node.forEach((c) => checkRoadCar(c, guarded));
  else if (node && typeof node === 'object') {
    if (node.call_macro === 'SAR hint road car') expect(guarded, 'SAR hint road car must only be called when the query was not skipped');
    const nowGuarded = guarded || (node.if && node.if.local === 'query_skipped' && node.ne === 'yes');
    for (const [key, value] of Object.entries(node)) checkRoadCar(value, key === 'then' ? nowGuarded : guarded);
  }
})(hints, false);
const placeText = text(macros['SAR hint place']);
expect(placeText.includes('sar_hint1') && placeText.includes('sar_hint6') && placeText.includes('"lte":6'), 'hint objects must use literal names sar_hint1..6');

// vehicle scenes
const overdue = text(macros['SAR OVERDUE VEHICLE']);
expect(overdue.includes('"sar_route_real"') && overdue.includes('"drive_object"') && overdue.includes('"move_object":"injured_human"'), 'overdue vehicle scene must create the car only on a real route (never on manual locations), optionally drive off, and move the injured next to it');
const parked = text(macros['SAR PARKED CAR']);
expect(parked.includes('"sar_anchor_location"') && parked.includes('"query_skipped"'), 'parked car scene must use the anchor and skip manual locations');
for (const name of ['Query random parked car walk', 'Query random wandering person']) {
  const body = text(macros[name]);
  expect(body.includes('"skip_query"') && body.includes('"sar_anchor_location"') && body.includes('"AGE1"'), `${name} must skip on manual locations, keep an anchor and depend on the age`);
}

// location map and routes
const mapAndRoute = macros['SAR map and route'];
const mapText = text(mapAndRoute);
expect(mapText.includes('"sar_route_1"') && !mapText.includes('"sar_route_2"') && mapText.includes('"draw_route"'), 'mission 65 uses one route and draws it');
expect((mapText.match(/"create_route"/g) || []).length === 1 && mapText.includes('"sar_route_a"') && mapText.includes('"sar_route_b"'), 'mission 65 asks the router once, from the queried road point A to a far point B');
expect(/"rand":\[25000,40001\]/.test(mapText), 'point B is 25-40 km from A');
expect(mapText.includes('sar_route_d1') && (mapText.match(/\$CREATE_ROUTE:DURATION/g) || []).length === 1, 'the route is used and drawn only after a valid $CREATE_ROUTE:DURATION');
expect(/"VAR_MISSION_NUMBER"},"eq":65\},\{"require":\{"local":"query_skipped"\},"ne":"yes"/.test(mapText), 'routes only for mission 65 and never on manual locations');
expect(mapText.includes('{"route":"sar_route_1"}') && mapText.includes('"divide":[{"local":"sar_route_n"},3]') && mapText.includes('"multiply":[{"local":"sar_route_n"},0.9]'), 'the victim moves to a random route entry between the first third and nine tenths of the route');
expect(mapText.includes('"sar_route_chk"') && /"lte":2000/.test(mapText), 'a stale route table entry from an earlier mission is rejected by the distance from A');
expect(/"create_location":"accident_location"/.test(mapText) && mapText.includes('"location_diagnostic_writer_accident_location"'), 'accident_location is recreated on the route entry and the diagnostic writer is recorded');
{
  const relocate = mapText.indexOf('"create_location":"accident_location"');
  const reloadStart = mapText.indexOf('"var":["L:CUS_SAR_reload","number"]},"ne":1');
  const nation = mapText.indexOf('"Query accident location country"');
  expect(relocate > 0 && reloadStart > relocate, 'the victim is moved before SAR_start_location is created, so the ring centre follows the final position');
  expect(nation > relocate && nation < reloadStart && mapText.includes('"VAR_MISSION_NUMBER"},"eq":65,"then":[{"#comment"'), 'the country of mission 65 is asked after the relocation and before the scene macros');
  const notKnown = mapText.indexOf('"sar_route_known"},"ne":"yes"');
  const ringIcon = mapText.indexOf('"text":"LAST KNOWN POS"');
  expect(notKnown > 0 && ringIcon > notKnown && mapText.indexOf('"id":"ringSAR"', notKnown) > notKnown, 'the ring and its icon are not drawn when the route is known');
  expect(mapText.includes('"sar_last_contact"') && mapText.includes('"LAST CONTACT"') && mapText.includes('"value":"sar_last_contact"'), 'a last contact point is the flight plan target when the route is known');
}
{
  // dispatch preview of mission 65: SAR start icon, destination point and straight line instead of the ring; the loading keeps the points and replaces the line
  const nav = read('macros/05-navigation-queries.json');
  const pre = text(nav['accident location pregenerator']);
  expect(pre.includes('"id":"sar_route_a"') && pre.includes('"text":"ORIGN"') && pre.includes('"text":"TO-PT"') && pre.includes('"id":"sar_route_line"') && pre.includes('"sar_page_mode"'), 'the preview of mission 65 shows ORIGN, TO-PT and a straight line');
  expect(/"VAR_MISSION_NUMBER"\},"eq":65,"then":\[\{"#comment":"Mission 65 has no ring[\s\S]*?"else":\[\{"if":\{"global":"SAR_RING"\}/.test(pre), 'mission 65 does not draw the ring in the preview, every other SAR mission does');
  expect(/"text":"(ORIGN|TO-PT)"/.test(pre) && ['ORIGN', 'TO-PT'].every((label) => /^[A-Za-z0-9-]{1,5}$/.test(label)), 'the labels are at most 5 characters (letters, digits and the hyphen of TO-PT)');
  expect(mapText.includes('"sar_route_preview"') && mapText.includes('"id":"sar_route_line"') && mapText.includes('{"line":{"id":"sar_route_line"}}'), 'the loading adds the line when the preview did not run and removes it once the route is real');
  expect((mapText.match(/"sar_route_known"\},"ne":"yes"/g) || []).length === 2, 'the fallback line block and the ring wrapper both depend on the route being unknown');
  expect(mapText.includes('"sar_route_real"') && mapText.includes('"rand":[0.34,0.9]'), 'without a route the victim moves along the straight line between one third and nine tenths');
  for (const macro of ['clear_unaccepted_dispatch_map', 'location reset']) {
    const body = text(macro === 'location reset' ? nav[macro] : read('macros/14-shared-runtime.json')[macro]);
    expect(body.includes('"id":"sar_route_a"') && body.includes('"id":"sar_route_b"') && body.includes('{"line":{"id":"sar_route_line"}}'), `${macro} removes the ORIGN and TO-PT points and the line`);
  }
  // dispatch page: the last known position is the position shown on the map, never the victim
  const page = text(read('macros/04-dispatch-tablet-ui.json')['Mission dispatch']);
  expect(page.includes('"params":["SAR_start_location",{"tofixed":{"object":"SAR_start_location","var":"distance"},"digits":2}]') && page.includes('"params":["sar_route_a"') && page.includes('"params":["sar_last_contact"'), 'the Last known position rows (and their distance) use SAR_start_location, the start A or the last contact');
  expect(!/"text":"Last known position[^}]*"params":\["accident_location"/.test(page), 'no SAR row reads the position of the victim');
  expect(page.includes('{"set_user_poi":"SAR_start_location"}') && page.includes('{"open_location":"SAR_start_location"}'), 'Open on map and Open on PC lead to the last known position in SAR missions');
  // the overdue car exists only on a real route; the injured person lies on the driver side
  expect(overdue.includes('{"require":{"local":"sar_route_real"},"eq":"yes"}'), 'the car of mission 65 is created only when the route is real');
  expect(/"NATION"\},"eq":2,"then":\[\{"move_object":"injured_human","to":\{"bearing2":90[\s\S]*?"else":\[\{"move_object":"injured_human","to":\{"bearing2":270/.test(overdue), 'the injured person lies on the right in the United Kingdom (NATION 2) and on the left elsewhere');
}
{
  const generator = text(read('macros/05-navigation-queries.json')['accident location generator']);
  expect(/"VAR_MISSION_NUMBER"},"ne":65,"then":\[\{"call_macro":"Query accident location country"\}/.test(generator), 'the generator leaves the country of mission 65 to SAR map and route');
  const pre = text(read('macros/05-navigation-queries.json')['accident location pregenerator']);
  expect(pre.includes('{"require":{"local":"SAR"},"ne":"yes"}') && pre.includes('"Query accident location country"'), 'the dispatch country query is skipped for SAR missions');
  expect(overdue.includes('"point_object":"sar_vehicle","to":"sar_route_next"'), 'the overdue car is aligned with the route direction');
  const road = text(macros['SAR hint road car']);
  expect(!road.includes('osm_query_data') && !road.includes('osm_get_closest_nodes') && road.includes('"create_route"') && road.includes('"sar_road_route"') && road.includes('$CREATE_ROUTE:DURATION'), 'the hint car uses one short route and no OSM data query');
  expect(road.includes('"sar_h_rmax"') && road.includes('"distance:m"') && road.includes('"point_object"'), 'the hint car stays inside the radius and follows the road direction');
}
expect(mapText.includes('"sar_anchor_location"') && mapText.includes('"sar_was_reload"'), 'missions 66 and 68 use the anchor as last known position unless a reload keeps the saved one');
expect(!mapText.includes('"remove":{"line":{"id":"sar_route_1"') && !text(read('macros/14-shared-runtime.json').clear_unaccepted_dispatch_map).includes('sar_route_1'), 'the drawn route is not removed by hand: a new mission reload clears it (only the straight line of the dispatch preview is removed, when the route is real)');
expect(/"create_thread":\{"commands":\[[^\]]*"sar_route_generation"[\s\S]*?"MISSION_PHASE"\},"gt":3[\s\S]*?"draw_route":"sar_route_1"/.test(mapText), 'route lines must be drawn after the loading (MISSION_PHASE > 3) and only for the mission that created them');
// ELT: only hikers carry a beacon, the other people follow the classic accident rule
const elt = Object.fromEntries(accidents.filter((a) => a.ID_CARD >= 65 && a.ID_CARD <= 68).map((a) => [a.ID_CARD, a.ELT_mode]));
expect(elt[65] === 'normal' && elt[66] === 'plb_person' && elt[67] === 'normal' && elt[68] === 'normal', 'ELT: 66 (walker) plb_person, 65/67/68 normal');

// AGENTS.md rules on the new macros
const newMacros = ['SAR pick object', 'SAR hint place', 'SAR hint road car', 'SAR visual hints', 'SAR car dispatch text', 'SAR OVERDUE VEHICLE', 'SAR PARKED CAR', 'Query random parked car walk', 'Query random wandering person'];
for (const name of newMacros) {
  (function walk(node) {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      if (node.drive_object) {
        const d = node.drive_object;
        expect(typeof d.name === 'string', `${name}: drive_object name must be a literal string`);
        expect(typeof d.VAR1 === 'number', `${name}: drive_object VAR1 must be literal`);
      }
      if (node.create_object) expect(typeof node.create_object.name === 'string', `${name}: create_object name must be literal`);
      if ('bearing2' in node) expect([0, 90, 180, 270].includes(node.bearing2), `${name}: bearing2 must be cardinal`);
      Object.values(node).forEach(walk);
    }
  })(macros[name]);
}
expect(/^[\x20-\x7e]+$/.test(JSON.stringify(newMacros.map((n) => macros[n]), (k, v) => (k === '#comment' ? undefined : v))), 'new macros must be printable ASCII outside comments');

console.log('SAR hints and missions PASS: missions 65-68 (ids, mnumber, unique type/camping, macros), sar_objects static, hint hook and radius, road cars only after a real query, rare paraglider, vehicle scenes, anchors, routes and cleanup. HPG/MSFS behaviour PENDING.');
