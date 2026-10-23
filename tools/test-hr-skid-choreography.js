#!/usr/bin/env node
'use strict';

// Tester report of 2026-10-18 (MPR, avalanche, skid landing): the heli rescuer walked away from the patient toward the helicopter (the first point of his route is
// measured from the helicopter, which had moved) and boarded minutes late. User rules: in a skid landing the heli rescuer goes back to the skid point (MEET) and
// waits for the crew, the crew wait for him and follow him to the scene, he restores the scene while the patient is brought back and goes back to the skid point to
// board last; avalanche: the four scene points are placed again around the final position of the injured. The heli rescuer is optional (HELIRESCUER_BOARDED 0).
// Static check of the production source; the walking itself is HPG runtime behaviour (PENDING).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'mission-src', 'macros');
const macros = {};
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
const text = (value) => JSON.stringify(value);

// 1. the three skid landing macros
for (const name of ['3 crew SKID LDG', '4 crew SKID LDG', '5 crew SKID LDG']) {
  const body = text(macros[name]);
  const at = (needle, from = 0) => { const i = body.indexOf(needle, from); assert.ok(i >= 0, `${name}: ${needle.slice(0, 70)}`); return i; };
  for (const flag of ['HR_SKID_SECURED', 'HR_SKID_MEET_READY', 'HR_SKID_AT_MEET', 'HR_SKID_CLEANUP', 'HR_SKID_RETURNED']) {
    assert.ok(body.includes(`{"set":{"local":"${flag}"},"value":0}`), `${name} resets ${flag} at the start`);
  }
  assert.ok(at('"SKID_TOTAL"') < at('{"set":{"local":"HR_SKID_SECURED"},"value":0}'), `${name}: flags reset after the counter`);
  // "Site is safe" only after the heli rescuer secured the area, and only when he is aboard (he is optional)
  // (nobody judges the site without him: no message and no wait when he is not aboard)
  const safe = '{"if":{"local":"HELIRESCUER_BOARDED"},"ne":0,"then":[{"or":[{"wait_for":{"local":"HR_SKID_SECURED"},"eq":1},{"wait_for":{"has_object":"jolly"},"eq":0}]},{"set_message":{"text":"Site is safe for operation. You can return to the skid landing area"}}]}';
  assert.ok(body.includes(safe), `${name}: site safe waits for the heli rescuer and is said only with him`);
  assert.equal(body.split('Site is safe for operation').length - 1, 1, `${name}: the message is only inside that condition`);
  // the skid point exists, then the heli rescuer may come back
  const meet = at('{"create_location":"MEET"');
  assert.ok(body.includes('{"set":{"local":"HR_SKID_MEET_READY"},"value":1}', meet) && at('{"set":{"local":"HR_SKID_MEET_READY"},"value":1}', meet) < at('"crew_name":"hoist_crew"', meet), `${name}: MEET ready right after MEET`);
  // the crew wait for him after the helicopter took off and before they walk to the scene
  const takeoff = at('{"wait_for":{"object":"hoist_crew","var":"distance"},"gt":0.01}');
  const crewWait = '{"if":{"local":"HELIRESCUER_BOARDED"},"ne":0,"then":[{"set_message":{"text":"Crew is waiting for the heli-rescuer';
  assert.ok(at(crewWait, takeoff) < at('"Ground time"', takeoff), `${name}: the crew wait for the heli rescuer before the ground operations`);
  assert.ok(body.includes('{"or":[{"wait_for":{"local":"HR_SKID_AT_MEET"},"eq":1},{"wait_for":{"has_object":"jolly"},"eq":0}]},{"sleep":2}'), `${name}: wait for him at the skid point, then a couple of seconds`);
  // the patient is brought back: he restores the scene
  assert.ok(at('{"set":{"local":"HR_SKID_CLEANUP"},"value":1}') > at('Ground operations almost completed'), `${name}: cleanup flag with the return of the crew`);
}

// 2. the heli rescuer (ground and skid down macro)
const down = macros['gnd ops heli rescuer down'].filter((e) => !(e && typeof e === 'object' && '#comment' in e));
const downText = text(down);
const done = downText.indexOf('"HRS.DONE"');
assert.ok(done > 0 && downText.indexOf('{"set":{"local":"HR_SKID_SECURED"},"value":1}', done) > done, 'HR_SKID_SECURED right after HRS.DONE');
const skid = '{"if":{"var":["L:MISSION_HOIST","number"]},"eq":2,"then":[{"set_message":{"text":"Heli-rescuer is going back to the skid point to meet the crew"}},{"wait_for":{"local":"HR_SKID_MEET_READY"},"eq":1}';
assert.ok(downText.includes(skid), 'skid landing: back to the skid point when it exists');
const meetPts = '"closest":[{"bearing":320,"dist":7,"object":"MEET"},{"bearing":90,"dist":7,"object":"MEET"},{"bearing":220,"dist":11,"object":"MEET"}]';
assert.ok(downText.includes(meetPts + ',"to":"jolly"}],"VAR1":3,"speed":6}},{"set":{"object":"jolly","var":"VAR 1"},"value":1},{"set":{"local":"HR_SKID_AT_MEET"},"value":1}'), 'the points keep bearing and distance but from MEET, then he is at the skid point');
assert.ok(downText.includes('"else":[{"sleep":[12,25]},{"set":{"object":"jolly","var":"VAR 1"},"value":1},{"drive_object":{"name":"jolly","to":[{"closest":[{"bearing":320,"dist":7},{"bearing":90,"dist":7},{"bearing":220,"dist":11}],"to":"{local:HEMS_VISIT_OBJECT}"}]'), 'the other modes keep the original route');
assert.ok(downText.includes('{"wait_for":{"local":"HR_SKID_CLEANUP"},"eq":1}') && downText.includes('{"set":{"local":"HR_SKID_RETURNED"},"value":1}'), 'he restores the scene when the crew bring the patient back and is back at the skid point');
for (const lap of ['"to":["LDWN"]', '"to":["RDWN"]', '"to":["RUP"]', '"to":["LUP"]']) assert.ok(downText.indexOf(lap, downText.indexOf('HR_SKID_CLEANUP')) > 0, `restore lap ${lap}`);
assert.ok(downText.includes('"TIME1LONG"') && downText.includes('"CREW_SLOTH"'), 'the original waits stay for the other modes');
assert.ok(downText.lastIndexOf('{"wait_for":{"local":"HOLDHOISTED"},"eq":1}') > downText.indexOf('HR_SKID_RETURNED'), 'he boards last: the wait for the crew comes after the return');

// 3. boarding in skid: already at the skid point, the wait looks at MEET and tells the pilot what is needed
const up = text(macros['gnd ops heli rescuer up']);
assert.ok(up.includes('{"if":{"local":"HR_SKID_RETURNED"},"eq":1,"then":[{"drive_object":{"name":"jolly","to":[{"bearing":0,"dist":9,"object":"MEET"}]'), 'boarding: no walk to a scene point when he is already at the skid point');
// Report 2026-10-23: the waits are one loop that names the missing condition (collective, ground speed, on the ground, position on MEET and in the landing spot)
// and says it after 10 s, then every 45 s (pack HRS.W.POS / GND / STILL / COLL); the first message still tells the pilot what is needed.
assert.ok(up.includes('{"set_message":{"text":"Heli-rescuer is waiting at the skid point'), 'boarding: message at the skid point');
for (const needle of ['{"require":{"location":"MEET","var":"distance"},"gte":0.03}', '{"require":{"location":"landing_spot","var":"distance:m"},"gte":{"local":"ldg_spot_area_size"}}',
  '{"if":{"var":["L:Collective","number"]},"lt":27', '{"if":{"var":["GPS GROUND SPEED","knots"]},"gte":0.5', '{"require":{"var":["SIM ON GROUND","bool"]},"ne":1}', '{"require":{"var":["RADIO HEIGHT","feet"]},"gte":20}']) {
  assert.ok(up.includes(needle), `boarding: the wait loop checks ${needle.slice(0, 60)}`);
}
for (const miss of ['POS', 'GND', 'STILL', 'COLL']) assert.ok(up.includes(`{"set":{"local":"hrw_miss"},"value":"${miss}"}`), `boarding: the loop names the missing condition ${miss}`);
assert.ok(up.includes('{"call_macro":"voice say","params":{"key":{"text":"HRS.W.{0}","params":[{"local":"hrw_miss"}]}}}'), 'boarding: the heli rescuer says what is missing through the pack keys HRS.W.*');
assert.ok(!up.includes('{"wait_for":{"location":"jolly","var":"distance"},"lt":0.025}'), 'the wait no longer reads the distance of the live helicopter from the heli rescuer');

// 4. avalanche: the scene points around the final position of the injured
const climber = text(macros.CLIMBER);
const moved = climber.indexOf('{"move_object":"injured_human","to":{"bearing":{"rand":[0,359]},"dist":{"rand":[0,59]},"object":"accident_location"}}');
assert.ok(moved > 0, 'avalanche: the injured is still thrown up to 59 m');
// same bearings and distance as the original, no bearing2 (a location has no heading)
for (const [n, b] of [['RUP', 35], ['RDWN', 130], ['LDWN', 225], ['LUP', 325]]) {
  const create = `{"create_location":"${n}","zones":[{"zone":{"location":{"bearing":${b},"dist":4,"object":"injured_human"}}}]}`;
  assert.ok(climber.indexOf(create, moved) > moved, `avalanche: ${n} placed again around the injured`);
}
assert.ok(!/"create_location":"(LUP|RUP|RDWN|LDWN)","zones":\[\{"zone":\{"location":\{"bearing2"/.test(climber), 'no bearing2 for the scene points');
assert.ok(climber.indexOf('{"create_location":"LUP"') < moved, 'the points stay created for every scene before the move');
// 5. hover / hoist operations: the hover point MEET, the heli rescuer waits there for the crew, leads them, restores the scene, goes back when the hover is stable
const hoisting = text(macros.HOISTING);
for (const flag of ['HR_HOIST_AT_MEET', 'HR_HOIST_CREW_DOWN', 'HR_HOIST_CLEANUP', 'HR_HOIST_RETURNED']) assert.ok(hoisting.includes(`{"set":{"local":"${flag}"},"value":0}`), `HOISTING resets ${flag}`);
assert.ok(hoisting.indexOf('{"set":{"local":"HR_HOIST_CREW_DOWN"},"value":1}') > hoisting.indexOf('"COUPLED"},"value":0}'), 'the crew down flag is set when the crew member is on the ground');
const crewWaitsHr = '{"if":{"local":"HELIRESCUER_BOARDED"},"ne":0,"then":[{"set_message":{"text":"Crew is waiting for the heli-rescuer, who is coming to the hoist point to lead them to the patient"}}';
assert.ok(hoisting.includes(crewWaitsHr), 'hoist: the crew wait for the heli rescuer only when he is aboard');
assert.ok(hoisting.indexOf(crewWaitsHr) > hoisting.indexOf('Medic on ground, helicopter clear, free to leave hover'), 'hoist: the wait comes after the hoist is clear and before the crew walk');
assert.ok(hoisting.includes('{"or":[{"wait_for":{"local":"HR_HOIST_AT_MEET"},"eq":1},{"wait_for":{"has_object":"jolly"},"eq":0}]},{"sleep":2}'), 'hoist: he is waited for at the hover point, then a couple of seconds (also the second member, crew 4 and 5)');
for (const back of ['Hoisting back up', 'Hoisting back ground']) assert.ok(text(macros[back]).startsWith('[{"call_macro":"select HEMS patient"},{"set":{"local":"HR_HOIST_CLEANUP"},"value":1}'), `${back} starts the cleanup of the heli rescuer right after the HEMS selection`);
const hDown = text(macros['hoist heli rescuer down']);
const hMeet = hDown.indexOf('{"create_location":"MEET","zones":[{"zone":{"location":{"bearing":30,"dist":1.5}}}]}');
assert.ok(hMeet > hDown.indexOf('MISSION_GUIDANCE_OVERRIDE') && hMeet < hDown.indexOf('"Steady!"'), 'hover point MEET created when the hoist operations start (stable hover, before the cable)');
const hSecured = hDown.indexOf('{"id":"hr_h_secured"');
assert.ok(hSecured > hDown.indexOf('"HRS.DONE"'), 'he is secured after the voice line');
const toMeet = '"closest":[{"bearing":320,"dist":7,"object":"MEET"},{"bearing":90,"dist":7,"object":"MEET"},{"bearing":220,"dist":11,"object":"MEET"}]';
assert.ok(hDown.indexOf(toMeet, hSecured) > hSecured && hDown.indexOf('{"wait_for":{"local":"HR_HOIST_CREW_DOWN"},"eq":1}') > hDown.indexOf(toMeet, hSecured), 'hoist: he goes to the hover point and waits for the crew on the ground');
assert.ok(hDown.indexOf('{"wait_for":{"local":"HR_HOIST_CREW_DOWN"},"eq":1}') < hDown.indexOf('"bearing2":0,"dist":2.1'), 'hoist: he walks to the patient with the crew');
const cleanAt = hDown.indexOf('{"wait_for":{"local":"HR_HOIST_CLEANUP"},"eq":1}');
assert.ok(cleanAt > hDown.indexOf('"CREW_SLOTH"') && cleanAt < hDown.lastIndexOf('{"wait_for":{"local":"HR_HOISTING_LOCK"},"eq":0}'), 'hoist: he restores the scene after the patient waits and before he is hoisted');
for (const lapPoint of ['"to":["LDWN"]', '"to":["RDWN"]', '"to":["RUP"]', '"to":["LUP"]']) assert.ok(hDown.indexOf(lapPoint, cleanAt) > cleanAt, `hoist restore lap ${lapPoint}`);
assert.ok(hDown.includes('{"while":{"param":"hover"},"eq":0,"do":[{"if":{"var":["SIM ON GROUND","bool"]},"eq":1,"then":[{"set":{"param":"hover"},"value":2}]}'), 'hoist: waiting for the stable hover also ends when the pilot lands (no block)');
assert.ok(hDown.includes('{"require":{"location":"landing_spot","var":"distance:m"},"lt":{"local":"ldg_spot_area_size"}},{"require":{"var":["GPS GROUND SPEED","knots"]},"lte":1},{"require":{"var":["RADIO HEIGHT","feet"]},"gt":40},{"require":{"var":["RADIO HEIGHT","feet"]},"lt":163}'), 'hoist: stable hover = inside the landing spot, speed, height window');
assert.ok(hDown.indexOf('{"set":{"local":"HR_HOIST_RETURNED"},"value":1}') > hDown.indexOf('{"set":{"param":"hover"},"value":0}'), 'hoist: back at the hover point only after the hover check');
const hUp = text(macros['hoist heli rescuer up']);
assert.ok(hUp.indexOf('{"id":"hr_h_up_hover_ok"') < hUp.indexOf('{"drive_object":{"name":"jolly","to":[{"bearing":30,"dist":1.5}]'), 'hoist: the walk to the cable point starts after a stable hover');

// 6. skid macros: no deadlock without a HEMS ticket (deceased patient, or a patient the ambulance takes), the decision is asked again, pick-up outside the landing spot
for (const name of ['3 crew SKID LDG', '4 crew SKID LDG', '5 crew SKID LDG']) {
  const body = text(macros[name]);
  const prep = body.indexOf('{"call_macro":"prepare selected HEMS patient","result":"prepared"}');
  assert.ok(prep > 0 && body.lastIndexOf('{"if":{"local":"HEMS_TRANSPORT_TICKET"},"ne":null,"then":[', prep) > prep - 60, `${name}: the patient is prepared only when there is a HEMS ticket`);
  assert.equal(body.split('{"call_macro":"prepare selected HEMS patient"').length - 1, 1, `${name}: one prepare`);
  const whileAt = body.indexOf('{"while":{"and":[{"require":{"local":"whobringpatient"},"ne":"us"},{"require":{"local":"whobringpatient"},"ne":"ambulance"},{"require":{"local":"whobringpatient"},"ne":"ambudoc"}]},"eq":1,"do":[');
  assert.ok(whileAt > prep, `${name}: the transport decision is asked again until it is us, ambulance or ambudoc`);
  assert.ok(body.includes('{"sleep":5},{"call_macro":"select patient1 transport","params":{"automatic":"us"}},{"set":{"param":"dwait"}'), `${name}: the decision loop asks again every 5 s`);
  assert.ok(body.includes('"id":"skid_prepare_failed"') && body.includes('"id":"skid_no_ticket"') && body.includes('"id":"skid_decision_wait"'), `${name}: diagnostics of the decision`);
  assert.ok(body.includes('"id":"skid_start"') && body.includes('"id":"skid_meet_ready"') && body.includes('"id":"skid_crew_go"') && body.includes('"id":"skid_tour_done"'), `${name}: checkpoints of the skid steps`);
  assert.ok(body.includes('{"set":{"local":"ground_ops_post_rotor"},"value":1}'), `${name}: the stall watch is armed`);
}
const skid3 = text(macros['3 crew SKID LDG']);
assert.ok(skid3.includes('{"if":{"local":"patientlife"},"eq":"died","then":[{"set_message":{"text":"Patient is deceased, no transport is needed. Return to the skid landing area to pick up the cabin crew"}}]'), 'skid: a deceased patient is not announced as ambulance transport');
const out = skid3.indexOf('{"if":{"location":"landing_spot","var":"distance:m"},"gte":{"local":"ldg_spot_area_size"},"then":[{"set_message":{"text":"Crew is waiting at the skid point. The crew do not go beyond the landing spot');
assert.ok(out > 0 && out < skid3.indexOf('"Crew is ready at the landing area. Land on skids to complete the pickup"'), 'skid: the crew ask the helicopter to come back inside the landing spot');

// 7. diagnostics of the heli rescuer and the skid in the ground ops state
const diag = text(macros['sample ground ops state']);
for (const key of ['"hr_flags"', '"meet_exists"', '"dist_aircraft_to_meet_m"', '"jolly_exists"', '"dist_aircraft_to_jolly_m"', '"dist_aircraft_to_hoist_crew_m"']) assert.ok(diag.includes(key), `ground ops state ${key}`);
assert.ok(text(macros['ground ops watch start']).includes('hr={24}') && text(macros['ground ops watch start']).includes('"path":"hr_flags"'), 'the watch signature carries the heli rescuer flags');

// 8. SAR reports (Daikan, MPR, 2026-10-18): number, age and sex stay, no medical information in any SAR; person(s) instead of injured; PLT.30; adult driver
const sarText = text(macros['SAR car dispatch text']);
const tabletSrc = fs.readFileSync(path.join(dir, '04-dispatch-tablet-ui.json'), 'utf8').replace(/\s+/g, ' ');
const lifecycle = fs.readFileSync(path.join(dir, '11-mission-lifecycle.json'), 'utf8').replace(/\s+/g, ' ');
const medical = fs.readFileSync(path.join(dir, '07-patient-medical.json'), 'utf8').replace(/\s+/g, ' ');
for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.json'))) assert.ok(!fs.readFileSync(path.join(dir, file), 'utf8').includes('sar_unseen'), `${file}: the sar_unseen idea of the same day is gone`);
assert.ok(sarText.includes('{"set":{"local":"casualty_word"},"value":"person(s)"}'), 'SAR says person(s) instead of injured');
assert.ok(tabletSrc.includes('{"text":"1 person(s)//{0} yrs, {1}","params":[{"local":"AGE1"},{"local":"SEX1"}]') && tabletSrc.includes('{"text":"2 person(s)//{0} yrs, {1}//{2} yrs, {3}"') && tabletSrc.includes('{"text":"3 person(s)//{0} yrs, {1}//{2} yrs, {3}//{4} yrs, {5}"'), 'tablet: SAR rows with number, age and sex only');
assert.ok(!/"text":"\d person\(s\)[^}]*consciousness/.test(tabletSrc), 'tablet: no consciousness or pathology in the SAR rows');
assert.ok(!/person\(s\)\/\/[^"]*SEX_TIME/.test(tabletSrc) && !/"At least one person/.test(tabletSrc), 'tablet: the SAR rows do not wait for the dispatcher info');
const sarDisp = text(macros['SAR dispatcher text'].filter((e) => !(e && typeof e === 'object' && '#comment' in e)));
assert.ok(sarDisp.includes('Update: {local:HELOVICTIMS} {local:casualty_word}. {local:AGE1} {local:SEX1}.') && !/consciousness|symptoms|pathology/.test(sarDisp), 'dispatcher: SAR update with number, age and sex only');
const sarCalls = (medical.match(/"call_macro":"SAR dispatcher text"\}, \{"call_macro":"append poordead to victim message"\}/g) || []).length + (lifecycle.match(/"call_macro":"SAR dispatcher text"\}, \{"call_macro":"append poordead to victim message"\}/g) || []).length;
assert.equal(sarCalls, 9, 'the SAR text is rebuilt after each of the 9 dispatcher update texts, before the deceased note');
assert.ok(/"require":\{"local":"SAR"\},"eq":"yes"\}, \{"require":\{"local":"sar_route_known"\},"ne":"yes"\}/.test(lifecycle), 'PLT.30 only when a search area exists (not for the route mission)');
assert.equal((medical.match(/"gte":65\}, \{"require":\{"local":"VAR_MISSION_NUMBER"\},"lte":67\}, \{"require":\{"local":"AGE1"\},"lt":18\}/g) || []).length, 2, 'driver or rider of 65-67 is an adult (both roll paths)');console.log('HR skid choreography PASS: back to the skid point, the crew wait for him, he restores the scene and boards last, hover/hoist point and stable hover, skid decision without ticket, diagnostics, avalanche points around the injured, SAR without medical information and missions 65-68 reports. Simulator runtime PENDING.');
