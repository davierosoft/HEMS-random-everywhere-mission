#!/usr/bin/env node
'use strict';

// Crew transported by police (custom landing spot far from the accident). In 168.147 the walk of the no-police branch (heli-relative
// points near the helicopter, then the patient) slipped out of its else: with police the crew, dropped at the accident, walked all the way
// back to the helicopter and again to the patient (about 700 s each way for 830 m), and the late `L:STEP 3` of that stale walk reset the
// step counter, so the mission waited forever (169.26 tester logs, 3 crew ground ops).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const macros = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', '09-hoist-ground-ops.json'), 'utf8'));
const collect = (value, predicate, found = [], ancestors = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found, ancestors));
  else if (value && typeof value === 'object') {
    if (predicate(value)) found.push({ node: value, ancestors: ancestors.slice() });
    for (const key of Object.keys(value)) collect(value[key], predicate, found, ancestors.concat([[key, value]]));
  }
  return found;
};
const mentionsPoliceLoading = (node) => /policeloadingenabled/.test(JSON.stringify(node.then ?? '')) && /"yes"/.test(JSON.stringify(node.then));

for (const name of ['3 crew ground ops', '4 or 5 crew ground ops']) {
  const macro = macros[name];
  assert.ok(macro, `${name} exists`);
  // 1. the heli-relative walks of the no-police case (points near the helicopter, closest to the patient) run only without police
  const heliWalks = collect(macro, (c) => {
    const d = c.drive_object;
    return d && (d.name === 'pax3' || d.name === 'hoist_crew') && /"bearing":(345|45|40|160|155|225),"dist":(7|10)\},\{"bearing":(225|155|160),"dist":(10|7)\}\],"to":"\{local:HEMS_VISIT_OBJECT\}"/.test(JSON.stringify(d.to));
  });
  assert.ok(heliWalks.length >= 2, `${name}: both crew walks of the no-police case exist`);
  for (const { ancestors } of heliWalks) {
    assert.ok(ancestors.some(([key, node]) => key === 'else' && mentionsPoliceLoading(node)), `${name}: a walk to points near the helicopter must be inside the else of the police if (police drop-off at the accident otherwise sends the crew back to the helicopter)`);
  }
  // 2. the police case: after the drop the crew walks from the police car to the patient side points and sets the steps once
  const policeThen = collect(macro, (c) => Array.isArray(c.then) && Array.isArray(c.else) && mentionsPoliceLoading(c)).map((entry) => entry.node);
  assert.ok(policeThen.length >= 1, `${name}: the police if exists`);
  const text = JSON.stringify(policeThen[0].then);
  assert.ok(text.includes('"closest":["LUP","RUP","RDWN","LDWN"],"to":"pax3"') && text.includes('"closest":["LUP","RUP","RDWN","LDWN"],"to":"hoist_crew"'), `${name}: with police the crew walks to the patient side points after the drop`);
  assert.equal((text.match(/"L:STEP","number"\]\},"value":3/g) || []).length, 1, `${name}: the police case sets step 3 once (pax3 arrived)`);
  assert.equal((text.match(/"L:STEP","number"\]\},"value":4/g) || []).length, 1, `${name}: the police case sets step 4 once (hoist crew arrived)`);
  // 3. the step 3 of the no-police walk is part of that walk only: no `set STEP 3` outside the two cases of the pax3 thread
  const elseText = JSON.stringify(policeThen[0].else);
  assert.ok(elseText.includes('"L:STEP","number"]},"value":3') && elseText.includes('"L:STEP","number"]},"value":4'), `${name}: the no-police case keeps its own steps`);
}

// 4. The drive timeout of a car on the route polya/polyb must not read `param:$CREATE_ROUTE:DURATION`: that param belongs to the thread that created the
// route, a drive started by another thread (the crew thread that sends the police from the landing spot to the accident, 169.43 tester snapshot) read
// nothing, the timeout was not a number, the watchdog fired at once and moved the car to the accident (teleport) while the route drive went on and led
// it away from the crew. The duration is saved in poli_polya_s / poli_polyb_s right after create_route, and the timeout reads the local.
{
  const files = ['08-ground-response.json', '09-hoist-ground-ops.json', '14-shared-runtime.json'];
  let routes = 0; let drives = 0;
  for (const file of files) {
    const mod = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', file), 'utf8'));
    // every create_route polya/polyb is followed by the local that keeps its duration
    const visit = (value) => {
      if (Array.isArray(value)) {
        value.forEach((c, i) => {
          if (c && c.create_route && (c.create_route.name === 'polya' || c.create_route.name === 'polyb')) {
            routes++;
            const want = c.create_route.name === 'polya' ? 'poli_polya_s' : 'poli_polyb_s';
            // the validity check (route_check_value) comes first, then the local that keeps the duration
            assert.ok(value[i + 1] && value[i + 1].set && value[i + 1].set.local === 'route_check_value', `${file}: create_route ${c.create_route.name} must be followed by its validity check`);
            const next = value[i + 2];
            assert.ok(next && next.set && next.set.local === want && next.value && next.value.param === '$CREATE_ROUTE:DURATION', `${file}: create_route ${c.create_route.name} must keep its duration in ${want}`);
          }
          visit(c);
        });
      } else if (value && typeof value === 'object') {
        const call = value.call_macro;
        if (typeof call === 'string' && /^drive (police|ambulance1) safe multiplier$/.test(call) && value.params && (value.params.to === 'polya' || value.params.to === 'polyb')) {
          drives++;
          const timeout = JSON.stringify(value.params.timeout);
          assert.ok(!timeout.includes('$CREATE_ROUTE:DURATION'), `${file}: the timeout of the drive on ${value.params.to} must read the saved duration`);
          assert.ok(timeout.includes(value.params.to === 'polya' ? 'poli_polya_s' : 'poli_polyb_s'), `${file}: the timeout of the drive on ${value.params.to} must read its own local`);
        }
        Object.values(value).forEach(visit);
      }
    };
    visit(mod);
  }
  assert.ok(routes >= 10 && drives >= 10, `route durations checked (${routes} routes, ${drives} drives)`);
  const ground = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mission-src', 'macros', '08-ground-response.json'), 'utf8'));
  for (const name of ['drive police safe multiplier', 'drive ambulance1 safe multiplier']) {
    assert.ok(JSON.stringify(ground[name].slice(0, 2)).includes('"isNaN":{"param":"timeout"}'), `${name} must replace a timeout that is not a number`);
  }
}

console.log('Police crew transport PASS: the no-police walk to the helicopter points stays inside its else, with police the crew walks from the police car to the patient (3 and 4/5 crew), the route drives read the saved durations. HPG/MSFS PENDING.');
