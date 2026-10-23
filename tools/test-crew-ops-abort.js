#!/usr/bin/env node
'use strict';

// User rules of 2026-10-18 after a flight log (copilot dead in a crash while the doctor was visiting the patient, the mission went on, nobody said anything, an
// engine fire passed unnoticed): a crew emergency with the crew outside aborts the ground operations (mandatory), a critical failure obliges to stop and to call a
// mayday, the death is reported on the radio by the designated member or the surviving one, the cold dispatch is a notification read back by the crew, the search and
// rescue briefing, the skid collective limits 5 lower. Static checks of the production sources and of the packs: no HPG/MSFS behaviour is modeled, runtime PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const loadDir = (dir) => {
  const out = {};
  for (const file of fs.readdirSync(path.join(root, 'mission-src', dir)).filter((name) => name.endsWith('.json'))) Object.assign(out, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', dir, file), 'utf8')));
  return out;
};
const macros = loadDir('macros');
const text = (value) => JSON.stringify(value);
const count = (haystack, needle) => haystack.split(needle).length - 1;
const all = text(macros);
const idx = (haystack, needle) => { const i = haystack.indexOf(needle); assert.ok(i >= 0, `missing ${needle.slice(0, 80)}`); return i; };

// 1. crew emergency with the crew outside: the abort is mandatory (no Divert or Continue question), the flags are reset at every shift start
const init = text(macros['initialize crew lifescores for shift']);
for (const flag of ['CREW_OPS_ABORT', 'CREW_NO_PATIENT', 'CREW_TOUR_ACTIVE', 'CRIT_FAIL_ACTIVE']) assert.ok(init.includes(`"local":"${flag}"`), `${flag} is reset at the start`);
const out = text(macros['crew ops outside']);
for (const obj of ['hoist_crew', 'pax1', 'pax2', 'pax3']) assert.ok(out.includes(`"has_object":"${obj}"`), `crew ops outside looks at ${obj}`);
assert.ok(out.includes('"L:HOISTED","number"]},"ne":1'), 'only while no patient is aboard');
const resp = text(macros['crew emergency response']);
assert.ok(idx(resp, '"call_macro":"crew ops outside"') < idx(resp, '"call_macro":"crew emergency choice"') && resp.includes('"param":"cer_out"},"eq":1,"then":[{"call_macro":"crew emergency divert"}],"else":[{"call_macro":"crew emergency choice"}]'), 'a critical member with the crew outside diverts without the question');
const divert = text(macros['crew emergency divert']);
assert.ok(divert.includes('"local":"CREW_OPS_ABORT"},"value":"yes"') && divert.includes('"local":"CREW_NO_PATIENT"},"value":"yes"') && divert.includes('"call_macro":"voice crew divert"'), 'the divert aborts the ground operations and tells it');
const route = text(macros['crew emergency route to care']);
assert.ok(route.includes('"local":"CREW_NO_PATIENT"},"eq":"yes"') && route.includes('"L:MISSION_HOIST","number"]},"ne":0') && route.includes('"wait_for":{"var":["L:HOISTED","number"]},"eq":1'), 'skid and hoist: the crew comes back with the pickup of the operation, no teleport boarding');
assert.ok(route.includes('"require":{"local":"CREW_NO_PATIENT"},"ne":"yes"'), 'the patient path of the hospital is not taken when the patient stayed');
const board = text(macros['board crew after emergency']);
assert.ok(board.includes('"local":"CREW_TOUR_ACTIVE"},"ne":1') && board.indexOf('CREW_TOUR_ACTIVE') < board.indexOf('"has_object":"pax3"'), 'the boarding waits for the running tour');

// 2. the tour and the visit stop at the next check; the skid and hoist macros go on with the pickup, the landing macros end
const tour = text(macros['multipatient registry crew tour safe']);
assert.ok(tour.includes('"local":"CREW_TOUR_ACTIVE"},"value":1') && tour.includes('"local":"CREW_TOUR_ACTIVE"},"value":0'), 'the tour marks itself active');
const visit = text(macros['multipatient registry crew visit']);
assert.ok(count(visit, '"local":"CREW_OPS_ABORT"},"eq":"yes"') >= 3, 'the visit stops at its entry, before the clinical completion and after the release');
assert.ok(visit.includes('"param":"assessment"},"value":2'), 'no clinical completion after an abort');
const assess = text(macros['crew physical HEMS assessment']);
assert.equal(count(assess, '"call_macro":"sleep unless crew abort"'), 6, 'the six sleeps of the assessment stop at the abort');
assert.ok(!/"sleep":\{"local":"TIME[123]SHORT"\}/.test(assess), 'no plain sleep of the assessment is left');
for (const name of ['HOISTING', '3 crew SKID LDG', '4 crew SKID LDG', '5 crew SKID LDG']) {
  const body = text(macros[name]);
  assert.ok(body.includes('{"require":{"param":"tour_complete"},"ne":1},{"require":{"local":"CREW_OPS_ABORT"},"ne":"yes"}'), `${name}: an aborted tour goes on with the pickup`);
  assert.ok(body.includes('"local":"crewvisitended"},"value":"yes"'), `${name}: the visit counts as ended`);
}
for (const name of ['3 crew ground ops', '4 or 5 crew ground ops']) assert.ok(!text(macros[name]).includes('CREW_OPS_ABORT'), `${name}: the landing macros end at an aborted tour (the crew boards at once)`);
const sel = text(macros['select HEMS patient']);
assert.ok(sel.indexOf('CREW_OPS_ABORT') < sel.indexOf('multipatient registry crew barrier') && sel.includes('"local":"whobringpatient"},"value":"ambulance"'), 'select HEMS patient: no patient for the helicopter after the abort');
const sleep = text(macros['sleep unless crew abort']);
assert.ok(sleep.includes('"local":"CREW_OPS_ABORT"},"eq":"yes"') && sleep.includes('"sleep":1'), 'sleep unless crew abort sleeps one second at a time');

// 3. critical failure: engine fire (5, 6) and transmission damage (18, 19) stop the helicopter and call a mayday
const check = text(macros['critical failure check']);
for (const code of [5, 6, 18, 19]) assert.ok(check.includes(`"param":"code"},"eq":${code}`), `critical code ${code}`);
assert.ok(text(macros['apply aircraft failure']).includes('"call_macro":"critical failure check"'), 'apply aircraft failure calls the check');
const may = text(macros['critical failure mayday']);
for (const part of ['CRIT_FAIL_ACTIVE', 'CREW_OPS_ABORT', 'CREW_MISSION_TERMINATED', '"call_macro":"voice mayday"', 'MAYDAY - LAND AND SHUT DOWN', 'MAYDAY MAYDAY MAYDAY', '"call_macro":"end menu"', 'wait_modal']) assert.ok(may.includes(part), `critical failure mayday: ${part}`);
assert.ok(all.includes('"eq":"CRITICAL_FAILURE"'), 'the dispatch page and the end menu know the critical failure');

// 4. voices: the designated member (the copilot, else a survivor), reactions to an impact, the abort, the continue, the mayday
const speaker = text(macros['voice crew speaker']);
assert.ok(speaker.includes('"first"') && speaker.includes('"aboard"') && speaker.includes('"skip"'), 'voice crew speaker params');
const ok = text(macros['voice crew member ok']);
assert.ok(ok.includes('"CREW_DEAD_3"') && ok.includes('"CREW_LIFESCORE_3"},"gte":15') && ok.includes('"CREW_OUT_3"},"eq":0'), 'a member can speak when alive, not below 15, and aboard when asked');
assert.ok(text(macros['crew impact events']).indexOf('"call_macro":"voice crew impact"') < text(macros['crew impact events']).indexOf('"call_macro":"crew members cap"'), 'the impact voices start before the evaluation clears its flags');
assert.ok(text(macros['crew member event announce']).includes('"call_macro":"voice crew event"'), 'a death or a critical member is reported on the radio');
assert.ok(text(macros['crew emergency continue']).includes('"call_macro":"voice crew continue"'), 'Continue is acknowledged');
const ev = text(macros['voice crew event']);
assert.ok(ev.includes('"first":"copilot"') && ev.includes('CEM.RAD.D') && ev.includes('CEM.RAD.C') && ev.includes('CEM.DSP'), 'the copilot calls, a survivor when the copilot cannot; the dispatcher answers');
const imp = text(macros['voice crew impact']);
assert.ok(count(imp, '"call_macro":"voice crew hurt"') === 5 && imp.includes('CEM.DEAD') && imp.includes('CEM.CRIT') && imp.includes('"local":"cvi_e1"'), 'every member can complain, the reactions say a death or a critical member');
const hurt = text(macros['voice crew hurt']);
assert.ok(hurt.includes('CEM.HURT') && hurt.includes('CEM.WEAK') && hurt.includes('"lt":90'), 'hurt under 90, weak at critical');
const div = text(macros['voice crew divert']);
assert.ok(div.includes('CEM.OPS') && div.includes('CEM.ABORT'), 'the abort is told');
const myd = text(macros['voice mayday']);
assert.ok(myd.includes('MAY.REACT') && myd.includes('MAY.CALL.{1}') && myd.includes('MAY.DSP') && myd.includes('"first":"copilot"'), 'the mayday: reaction, call by the designated member, dispatcher');

// 5. cold dispatch: only a notification, read back by the crew; the call to the dispatcher when the radio is on; the nudge waits for the radio
const ready = text(macros['voice radio ready']);
assert.ok(ready.includes('_SDK_OH_BATTERY_MASTER') && ready.includes('_SDK_GPCP_PWR_SWITCH') && ready.includes('"L:CARLS_CONNECTED","number"]},"eq":1'), 'voice radio ready = power (battery or GPCP switch) and CARLS connected');
const rd = text(macros['voice read dispatch']);
const rb = text(macros['voice dispatch readback']);
assert.ok(rd.includes('"call_macro":"voice radio ready"') && rd.includes('"call_macro":"voice dispatch readback"'), 'voice read dispatch calls the readback when the radio is off');
assert.ok(rb.includes('DSA.RB.A') && rb.includes('DSA.RB.Q') && !rb.includes('<radio:off>') && rb.includes('<actor{0}>') && rb.includes('"first":"copilot"') && rb.includes('"aboard":1'), 'the readback by a crew member aboard when the radio is off, with no radio tag (the program decides: the intercom with power, the voice without it; user report 2026-10-20)');
assert.ok(idx(rd, '<actor8><radio><text:DSC.{0}.{1}>') < idx(rd, 'voice dispatch readback'), 'the dispatcher reads only with the radio on');
const triage = text(macros['voice dispatch triage run']);
assert.ok(triage.includes('"local":"vrd_rb"},"ne":1') && triage.includes('"param":"tr_t"},"gte":60') && triage.includes('"call_macro":"voice radio ready"'), 'no second question after the readback, the nudge only with the radio on');
const chat = text(macros['voice briefing chat']);
assert.ok(chat.includes('"call_macro":"voice radio ready"') && chat.includes('"vbw_t"') && chat.includes('"local":"vb_seq_snapshot"'), 'the call to the dispatcher waits for the radio (15 minutes, not for an older dispatch)');

// 6. search and rescue: the briefing after the take-off, one nautical mile before the ring, with the numbers of SAR sighting
const brief = text(macros['voice sar briefing']);
for (const key of ['SAR.TYP.{0}', 'SAR.INF.R', 'SAR.INF.N', 'SAR.VEH', 'SAR.VEHN', 'SAR.MET.R', 'SAR.MET.V', 'SAR.CLK', 'SAR.OPT', 'SAR.END']) assert.ok(brief.includes(key), `SAR briefing: ${key}`);
assert.ok(brief.includes('1000//80//{0}') && text(macros['SAR sighting']).includes('"divide":[{"var":["RADIO HEIGHT","feet"]},1000]') && text(macros['SAR sighting']).includes('"divide":[80,{"var":["GPS GROUND SPEED","knots"]}]'), 'the best altitude (1000 ft) and speed (80 kt) are the ones of the spotting logic');
const obj4 = text(macros['objective4']);
assert.ok(obj4.includes('"call_macro":"voice sar briefing"') && obj4.includes('"add":[{"global":"SAR_MAX_RADIUS"},1852]') && obj4.includes('"sleep":6'), 'the briefing: one nautical mile before the ring, at once without a ring');
for (const kind of ['SAR', 'SARV', 'SARC', 'SARH']) assert.ok(text(macros['voice mission class']).includes(`"value":"${kind}"`), `class ${kind}`);

// 7. skid landing: every collective limit 5 lower than before (the ground effect of the last MSFS update)
const skidMacros = ['HOISTING', '3 crew SKID LDG', '4 crew SKID LDG', '5 crew SKID LDG', 'gnd ops heli rescuer up', 'shared repeated block 052', 'hoist heli rescuer up', 'Hoisting back up', 'Hoisting back ground'];
const limits = [];
for (const name of skidMacros) for (const m of (text(macros[name] || []).matchAll(/"L:Collective","number"\]\},"(gte?)":(\d+)/g))) limits.push(Number(m[2]));
assert.ok(limits.length >= 10, 'the skid macros have the collective limits');
assert.ok(limits.every((v) => v <= 32), `no skid collective limit above 32 (found ${[...new Set(limits)].join(', ')})`);
assert.ok(!/"L:Collective","number"\]\},"gt":(35|37)\b/.test(all), 'no old limit 35 or 37 is left in the macros');

// 8. the packs (when the Companion repository is next to this one)
const packPath = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'EN.xml');
if (fs.existsSync(packPath)) {
  const pack = fs.readFileSync(packPath, 'utf8');
  const keys = new Set([...pack.matchAll(/<message key="([^"]+)"/g)].map((m) => m[1]));
  const wanted = ['DSA.RB.A', 'DSA.RB.Q', 'SAR.TYP.SAR', 'SAR.TYP.SARV', 'SAR.TYP.SARC', 'SAR.TYP.SARH', 'SAR.INF.R', 'SAR.INF.N', 'SAR.VEH', 'SAR.VEHN', 'SAR.MET.R', 'SAR.MET.V', 'SAR.CLK', 'SAR.OPT', 'SAR.END', 'CEM.HURT', 'CEM.WEAK', 'CEM.DEAD', 'CEM.CRIT', 'CEM.RAD.D', 'CEM.RAD.C', 'CEM.OPS', 'CEM.ABORT', 'CEM.CONT', 'CEM.DSP', 'MAY.REACT', 'MAY.CALL.F', 'MAY.CALL.G', 'MAY.DSP'];
  for (const key of wanted) {
    assert.ok(keys.has(key), `${key} in the pack EN`);
    const block = pack.slice(pack.indexOf(`<message key="${key}"`), pack.indexOf('</message>', pack.indexOf(`<message key="${key}"`)));
    assert.equal(count(block, '<o>'), 6, `${key}: six options`);
  }
  const de = fs.readFileSync(path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', 'DE.xml'), 'utf8');
  for (const key of wanted) assert.ok(de.includes(`<message key="${key}"`), `${key} in the pack DE`);
  assert.ok(/<message key="DSP\.RQ" actor="2"/.test(pack), 'the call to the dispatcher is made by the copilot');
  for (const key of ['CPL.7', 'CPL.9', 'CPL.25']) assert.ok(new RegExp(`<message key="${key.replace('.', '\\.')}"[^>]*standin="1"`).test(pack), `${key} goes to another crew member when the copilot cannot speak`);
  for (const key of ['DSA.GO', 'DSA.ASKP']) assert.ok(new RegExp(`<message key="${key.replace('.', '\\.')}"[^>]*radio="ics"`).test(pack), `${key} is heard on the intercom or by voice, not on the radio`);
}

console.log('Crew ops abort PASS: forced abort of the ground operations, critical failure mayday, casualty voices, cold dispatch readback, SAR briefing, skid collective limits, packs. HPG/MSFS PENDING.');
