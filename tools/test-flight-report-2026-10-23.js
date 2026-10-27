#!/usr/bin/env node
'use strict';

// Reports of the testers of 2026-10-21 to 2026-10-23 (sources only, runtime PENDING): the time left said again and again, the heli rescuer that walks to the wrong door,
// the handover line of an ambulance that takes nothing, the CPR started after the drop-off.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const load = (dir) => {
  const out = {};
  for (const file of fs.readdirSync(path.join(root, 'mission-src', dir)).filter((name) => name.endsWith('.json'))) Object.assign(out, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', dir, file), 'utf8')));
  return out;
};
const macros = load('macros');
const text = (value) => JSON.stringify(value);

// 1. ground update: stable and serious are one stage in the signature, so the same time left is not repeated at every swing of the LIFESCORE
{
  const t = text(macros['voice ground update']);
  assert.ok(t.includes('{"set":{"local":"gu_sk"},"value":{"local":"gu_key"}}'), 'the signature key starts from the key');
  assert.ok(t.includes('"value":"GRD.TRT"'), 'stable and serious share one signature key');
  assert.ok(t.includes('"params":[{"local":"gu_sk"},{"local":"gu_eb"}]'), 'the signature uses the shared key');
  assert.ok(!t.includes('"params":[{"local":"gu_key"},{"local":"gu_eb"}]'), 'the raw key is no longer in the signature');
  assert.ok(t.includes('"call_macro":"voice say","params":{"key":{"param":"tk_key"}'), 'the spoken line still uses the real key (stable or serious)');
}

// 2. the heli rescuer boards by the door that opens: left with 5 crew, right with fewer (both branches of the skid and non-skid paths)
{
  const t = text(macros['gnd ops heli rescuer up']);
  assert.equal(t.split('"to":["lpaxdoor"]').length - 1, 2, 'the left door is the target only twice (5 crew, both paths)');
  assert.equal(t.split('"to":["rpaxdoor"]').length - 1, 2, 'the right door is the target twice (fewer than 5 crew, both paths)');
  assert.ok(t.includes('"open_door":"pax_left"') && t.includes('"door":"pax_right","want":"open"'), 'doors opened by CREW as before');
  for (const k of ['{"bearing":30,"dist":8},{"bearing":125,"dist":8}', '{"bearing":135,"dist":15},{"bearing":60,"dist":12},{"bearing":90,"dist":10}']) assert.ok(t.includes(k), 'right side approach points: ' + k);
  for (const k of ['{"bearing":330,"dist":8},{"bearing":235,"dist":8}', '{"bearing":225,"dist":15},{"bearing":300,"dist":12},{"bearing":270,"dist":10}']) assert.ok(t.includes(k), 'left side approach points kept: ' + k);
}

// 3. an ambulance that arrives while the crew loads the patient (whobringpatient us) does not trigger the handover line
{
  const t = text(macros['wav unit arrival']);
  assert.ok(t.includes('"wua_handover_open"') && t.includes('"require":{"local":"whobringpatient"},"eq":"us"'), 'the handover gate looks at who brings the patient');
  assert.ok(t.includes('"PATIENT LOADING / CREW RETURN"') && t.includes('"FINAL CREW RETURN"'), 'only in the loading and return stages');
  const amb = t.slice(t.indexOf('"eq":"ambulance"'), t.indexOf('"eq":"police"'));
  assert.ok(amb.includes('"require":{"local":"wua_handover_open"},"eq":1') && amb.includes('L:PAX3{local:VCP}32'), 'the ambulance wav is behind the gate');
}

// 4. CPR never starts on a patient already handed over (L:SAVED 1)
{
  const t = text(macros['CPR']);
  const at = t.indexOf('"require":{"local":"cpr_provider_present"},"eq":1}');
  assert.ok(at > 0 && t.slice(at, at + 160).includes('"require":{"var":["L:SAVED","number"]},"ne":1'), 'the start condition of the CPR excludes a saved patient');
}

// 5. the heli rescuer tells which condition is missing at the skid point (one loop in the same thread, no new thread), pack EN 23 and DE
{
  const t = text(macros['gnd ops heli rescuer up']);
  assert.ok(t.includes('"while":{"local":"hrw_ok"},"eq":0'), 'the waits are one polling loop');
  assert.ok(!t.includes('{"wait_for":{"var":["L:Collective","number"]},"gte":27}'), 'the blind wait for the collective is gone');
  for (const k of ['COLL', 'STILL', 'GND', 'POS']) assert.ok(t.includes('"hrw_miss"},"value":"' + k + '"'), 'missing condition ' + k);
  assert.ok(t.includes('"text":"HRS.W.{0}","params":[{"local":"hrw_miss"}]'), 'the line is the pack key of the missing condition');
  assert.ok(t.includes('"value":10') && t.includes('"value":45'), 'spoken after 10 s, then every 45 s');
  const pack = (name) => fs.readFileSync(path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', name + '.xml'), 'utf8');
  for (const lang of ['EN', 'DE']) {
    const xml = pack(lang);
    for (const k of ['POS', 'GND', 'STILL', 'COLL']) {
      const m = new RegExp('<message key="HRS\\.W\\.' + k + '"[^>]*>([\\s\\S]*?)</message>').exec(xml);
      assert.ok(m && (m[1].match(/<o>/g) || []).length === 6, lang + ' HRS.W.' + k + ' has 6 options');
    }
  }
  assert.ok(/<voicepack name="EN"[^>]* version="(?:2[7-9]|[3-9]\d)"/.test(pack('EN')), 'base pack EN 27');
  assert.ok(/<voicepack name="DE"[^>]* version="\d+" basever="\d+"/.test(pack('DE')), 'pack DE 15 on the base 27');
}

// 6. the heli rescuer boarding closes each door once (report: the door closed and opened again; close_door is not idempotent)
{
  const t = text(macros['gnd ops heli rescuer up']);
  assert.equal(t.split('{"close_door":"pax_left"}').length - 1, 1, 'pax_left is closed once (only when this macro opened it, 5 crew)');
  assert.ok(!t.includes('{"close_door":"pax_right"}') && t.includes('"ensure door","params":{"door":"pax_right","want":"closed"}'), 'the right door is closed by its state, not twice');
  assert.ok(t.includes('"eq":5,"then":[{"close_door":"pax_left"}]'), 'the left close sits in the 5 crew branch');
}

// 7. the crew says it goes inside for the report and the paperwork after the handover (pack HOS.PAP, HOS.PAP.O for an organ)
{
  const t = text(macros.paperwork);
  assert.ok(t.includes('"call_macro":"voice say","params":{"key":"HOS.PAP"}') && t.includes('"call_macro":"voice say","params":{"key":"HOS.PAP.O"}'), 'paperwork says HOS.PAP / HOS.PAP.O');
  assert.ok(t.indexOf('HOS.PAP"') > t.indexOf('"Crew will follow the patient to ER'), 'said when the crew goes inside');
  const pack = (name) => fs.readFileSync(path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', name + '.xml'), 'utf8');
  for (const lang of ['EN', 'DE']) {
    for (const k of ['HOS.PAP', 'HOS.PAP.O']) {
      const m = new RegExp('<message key="' + k.replace(/\./g, '\\.') + '"[^>]*>([\\s\\S]*?)</message>').exec(pack(lang));
      assert.ok(m && (m[1].match(/<o>/g) || []).length === 6, lang + ' ' + k + ' has 6 options');
    }
  }
}

// 8. mission 65 stuck at Cabin preparation 15%: the route request is caught and traced, the straight-line fallback follows a failed route
{
  const t = text(macros['SAR map and route']);
  assert.ok(t.includes('{"try":[{"create_route":{"name":"sar_route_1","query":{"to":"sar_route_b","from":"sar_route_a","type":"car"}}},{"set":{"local":"sar_route_d1"},"value":{"param":"$CREATE_ROUTE:DURATION"}}],"catch":'), 'create_route sits in a try');
  assert.ok(t.includes('"state":"route_requested"') && t.includes('route_done duration={0}') && t.includes('route_failed {0}'), 'the request, the result and a failure are traced (macro sar_route)');
  assert.ok(t.indexOf('"sar_route_d1"},"value":0}') < t.indexOf('"create_route"'), 'the duration is reset before the request, a stale value never counts as a route');
  assert.ok(t.includes('"local":"sar_route_known"},"ne":"yes"'), 'the straight-line fallback stays behind a failed route');
}

// 9. every change of the voice code VCP is traced (macro voice_vcp: the new code, L:AUDIOINHIBIT and TTS), so that a snapshot shows when the mission went back to a wav pack
// (report MPR 2026-10-18: wavs in the simulator at the engine start while the Companion speaks). Diagnostic only: no logic changed.
{
  const threads = load('threads');
  let sets = 0, traced = 0;
  (function walk(node) {
    if (Array.isArray(node)) {
      node.forEach((child, i) => {
        if (child && child.set && child.set.local === 'VCP') {
          sets++;
          const next = node[i + 1];
          if (next && next.call_macro === 'ground crew runtime trace' && next.params && next.params.macro === 'voice_vcp') traced++;
        }
        walk(child);
      });
      return;
    }
    if (node && typeof node === 'object') Object.values(node).forEach(walk);
  }({ macros, threads }));
  assert.ok(sets >= 12, 'the assignments of VCP are found');
  assert.equal(traced, sets, 'every assignment of VCP is followed by its trace row');
}

// 10. report MPR 2026-10-23 (hoist stuck, nobody knew why): blockers sample, stall diagnostics, Dispatch page details, checkpoints in the hoist wait path, retried patient preparation
{
  const bl = text(macros['hoist blockers sample']);
  for (const k of ['ground speed', 'radio height', 'hoist operator', 'second hoist operator', '"ground_ops_blockers"', 'PAX_HOIST', 'HEMS_PREPARE_TRACE']) assert.ok(bl.includes(k), 'blockers sample: ' + k);
  assert.ok(!/"wait_for"|"sleep"|"create_thread"/.test(bl), 'the blockers sample is read-only: no wait, sleep or thread');
  assert.ok(text(macros['sample ground ops state']).includes('"call_macro":"hoist blockers sample"') && text(macros['sample ground ops state']).includes('"blockers"'), 'every ground ops state (watcher row, snapshot) carries the blockers');
  const mon = text(macros['on-site operations progress monitor']);
  assert.ok(mon.includes('"call_macro":"hoist blockers sample"') && mon.includes('"call_macro":"capture automatic snapshot","params":{"event":"ops_progress_stall"}'), 'the 120 s stall refreshes the blockers and takes an automatic snapshot');
  const ui = text(macros['Mission dispatch']);
  assert.ok(ui.includes('no progress for {0} s after step') && ui.includes('"local":"ground_ops_reason_title"') && ui.includes('Probable cause: {0}') && ui.includes('"text":"Still open: {0}","params":[{"local":"ground_ops_blockers"}]'), 'the Dispatch page shows what is still open');
  assert.ok(!/"or":\[/.test(ui.slice(ui.indexOf('Still open'), ui.indexOf('Still open') + 900)), 'renderer conditions of the new rows are AND only');
  const hb = text(macros['Hoisting back up']);
  for (const id of ['hoist2_thread_start', 'hoist2_hover_wait', 'hoist2_hover_ok', 'hoist2_down_start', 'hoist2_down_wait', 'hoist2_on_ground', 'hoist_wait_pax_hoist', 'hoist_pax_hoist_ok', 'hoist_patient_prepare_retry', 'hoist_patient_prepare_failed']) assert.ok(hb.includes('"id":"' + id + '"'), 'checkpoint ' + id);
  assert.ok(hb.includes('"require":{"param":"prepare_try"},"lt":3'), 'the patient preparation is retried three times before it gives up');
  assert.ok(hb.indexOf('hoist_patient_prepare_failed') < hb.indexOf('"return":0'), 'the failure is traced and told before the macro returns');
}

// 11. reports 2026-10-26 (sssnake74 169.81, MPR 169.66, a third): the crew stands by the patient and the cable never comes down. The synchronous drive ends the walk;
// the distance gate (lte 1.5 m) after it could never hold, so no distance decides completion any more; the remaining waits are traced
{
  const hb = text(macros['Hoisting back up']);
  assert.ok(!hb.includes('"to":"{local:HEMS_PATIENT_OBJECT}"},"lte":1.5'), 'no crew-to-patient distance gate after the stretcher drive');
  for (const id of ['hoist_stretcher_drive', 'hoist_stretcher_done', 'hoist_arming', 'hoist_cable_down']) assert.ok(hb.includes('"id":"' + id + '"'), 'checkpoint ' + id);
  assert.ok(hb.indexOf('hoist_stretcher_drive') < hb.indexOf('hoist_stretcher_done') && hb.indexOf('hoist_stretcher_done') < hb.indexOf('hoist_arming') && hb.indexOf('hoist_arming') < hb.indexOf('hoist_cable_down'), 'checkpoints follow the path');
  assert.ok(!text(macros).includes('"to":"{local:HEMS_PATIENT_OBJECT}"},"lte":1.5'), 'no other crew-to-patient distance gate');
  // the overhead switch turns on with the arm extension (original mission: no switch wait): never awaited before the arm is out
  const sw = text(macros['set hoist switch to on']);
  assert.ok(!/"wait_for"|"sleep"|"create_thread"|"set_message"/.test(sw), 'set hoist switch to on only traces: no wait before the arm extension');
  const arm = text(macros['hoist_arming_and extension']);
  assert.ok(arm.indexOf('HOIST_ARM_DEPLOY') < arm.indexOf('"wait_for":{"var":["L:H145_SDK_OH_HOIST","number"]},"eq":1'), 'manual mode checks the switch after the arm is out');
  assert.ok(arm.includes('"id":"hoist_arm_out"') && arm.includes('"id":"hoist_switch_ok"'), 'arm out and switch ok are traced');
}

// 12. report MPR 2026-10-27: he drops the medical crew, takes off and parks elsewhere until the visits end; "still a bit too far" came on that approach.
// From the crew drop to the end of the visit the too-far callout is off; it is armed again only with the visit ended, above 10 kt and outside the landing spot area
{
  const ca = text(macros['crash site approach']);
  const thread = ca.slice(ca.indexOf('"local":"distancearm"'));
  assert.ok(thread.includes('"while":{"local":"too_far_mute"},"eq":"yes"'), 'the callout thread waits while the mute is on');
  const rearm = thread.slice(thread.indexOf('"while":{"local":"too_far_mute"}'), thread.indexOf('"id":"too_far_rearmed"'));
  for (const k of ['{"require":{"local":"crewvisitended"},"eq":"yes"}', '{"require":{"var":["GPS GROUND SPEED","knots"]},"gt":10}', '{"require":{"object":"landing_spot","var":"distance:m"},"gt":{"local":"ldg_spot_area_size"}}']) assert.ok(rearm.includes(k), 'the re-arm needs: ' + k);
  assert.ok(thread.includes('"id":"too_far_rearmed"'), 'the re-arm is logged');
  // the callout counter itself is guarded in both branches (the thread may already be waiting for the speed when the crew is dropped)
  const guarded = thread.split('{"if":{"local":"too_far_mute"},"ne":"yes","then":[{"set":{"var":["L:{local:VCP}45","number"]}');
  assert.equal(guarded.length - 1, 2, 'both too-far increments are guarded by the mute');
  assert.ok(!/"then":\[\{"set":\{"var":\["L:\{local:VCP\}45","number"\]\}/.test(thread.replace(/\{"if":\{"local":"too_far_mute"\},"ne":"yes","then":\[\{"set":\{"var":\["L:\{local:VCP\}45","number"\]\}/g, '')), 'no unguarded too-far increment is left');
  for (const name of ['5 crew SKID LDG', '4 crew SKID LDG', '3 crew SKID LDG']) {
    const t = text(macros[name]);
    assert.ok(t.indexOf('"id":"skid_crew_go"') < t.indexOf('{"set":{"local":"too_far_mute"},"value":"yes"}') && t.includes('"id":"too_far_mute"'), name + ': the drop sets the mute and logs it');
  }
  assert.ok(text(macros['HOISTING']).includes('{"set":{"local":"too_far_mute"},"value":"yes"}'), 'the hoist crew going down sets the mute');
  assert.ok(text(macros).split('{"set":{"local":"too_far_mute"},"value":"no"}').length - 1 >= 2, 'a new dispatch / patient reset clears the mute');
}

// 13. reports MPR 2026-10-27 (SAR, pickup button): the copilot sits on the left, so the cabin crew takes the right side; the crew sights the target before the
// copilot reports it to the dispatcher; the button title has no stray sign
{
  const found = text(macros['voice sar found']);
  assert.ok(found.indexOf('"wait_for":{"local":"patient_found"},"eq":"yes"') > 0 && found.indexOf('"wait_for":{"local":"patient_found"},"eq":"yes"') < found.indexOf('"key":"SAR.FND.PLT"'), 'the dispatcher call waits for the crew sighting (patient_found, set with PAX1.78)');
  const sight = text(macros['SAR mapldgspot']);
  assert.ok(sight.indexOf('"local":"patient_found"') < sight.indexOf('{local:VCP}78'), 'the crew sighting sets patient_found and speaks PAX1.78');
  assert.ok(!/LOAD PATIENT ON HELO[^"]/.test(text(macros)), 'the load patient button titles end with HELO');
  const packs = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks');
  if (fs.existsSync(packs)) {
    const word = { EN: [/\bright side\b|\bright for me\b|\bright\b/i, /\bleft\b/i], DE: [/rechte|rechts/i, /linke|links/i], FR: [/droit/i, /gauche/i] };
    for (const lang of ['EN', 'DE', 'FR']) {
      const xml = fs.readFileSync(path.join(packs, lang + '.xml'), 'utf8');
      const block = xml.slice(xml.indexOf('<message key="SAR.CLK"'), xml.indexOf('</message>', xml.indexOf('<message key="SAR.CLK"')));
      const first = block.split('<o>')[1];
      assert.ok(first.search(word[lang][0]) >= 0 && first.search(word[lang][0]) < first.search(word[lang][1]), lang + ' SAR.CLK: the speaker takes the right side, the copilot (left seat) the left');
    }
  }
}

// 14. user request 2026-10-27: false sightings in the SAR missions (clock position, distance in meters, denial a random 20 to 75 s later); more and repeated above 1000 ft;
// never under 150 ft, near or after the real target; own thread
{
  const fs14 = text(macros['SAR false sighting']);
  const tr14 = text(macros['SAR false sighting try']);
  assert.ok(fs14.includes('"RADIO HEIGHT","feet"]},"gt":150') && !/"RADIO HEIGHT","feet"\]\},"lt"/.test(fs14 + tr14), 'minimum height 150 ft and no maximum');
  assert.ok(tr14.includes('"rand":[1,100.99]') && tr14.includes('"local":"fs_chance","value":25') === false && tr14.includes('"value":25') && tr14.includes('"value":45'), 'one trial at 25 % below 1000 ft, 45 % above');
  assert.ok(tr14.includes('"gt":1000') && tr14.includes('"value":20.99') && tr14.includes('"value":10.99'), 'distance 100 to 500 m, 100 to 1000 m above 1000 ft');
  assert.ok(tr14.includes('"rand":[2,{"local":"fs_top"}]') && tr14.includes('},50]'), 'distance in steps of 50 m');
  assert.ok(tr14.includes('"rand":[1,12.99]') && tr14.includes('{"local":"fs_hour"},30]') && tr14.includes('"object":"$USER"'), 'clock hour 1 to 12, relative to the helicopter');
  assert.ok(tr14.includes('"local":"fs_low_done"') && fs14.includes('"local":"fs_count"},"gte":4'), 'low altitude: one trial only; at most 4 false sightings');
  assert.ok(tr14.includes('"local":"fs_safe"') && tr14.includes('{"local":"fs_dist"},700]'), 'the false point is at least 700 m from the real target');
  assert.ok(tr14.includes('"rand":[20,75.99]') && tr14.includes('"gte":{"local":"fs_deny"}') && tr14.includes('"gte":20'), 'denial a random 20 to 75 s later, not before 20 s');
  assert.ok(tr14.includes('"key":"SAR.FLS"') && tr14.includes('"key":"SAR.FLN"') && !/SAR\.FLS\.[KN]/.test(fs14 + tr14), 'one line in meters, no units option');
  assert.ok(tr14.includes('"local":"patient_found"},"ne":"yes"') && fs14.includes('"local":"patient_found"},"eq":"yes"'), 'never after the real sighting');
  assert.ok(text(macros['SAR sighting']).includes('"call_macro":"SAR false sighting"'), 'started in an own thread by SAR sighting');
  const packs14 = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks');
  if (fs.existsSync(packs14)) {
    for (const lang of ['EN', 'DE', 'FR']) {
      const xml = fs.readFileSync(path.join(packs14, lang + '.xml'), 'utf8');
      assert.ok(!xml.includes('SAR.FLS.K') && !xml.includes('SAR.FLS.N'), lang + ' has no unit keys');
      for (const key of ['SAR.FLS', 'SAR.FLN']) {
        const at = xml.indexOf('<message key="' + key + '"');
        assert.ok(at > 0, lang + ' has ' + key);
        const block = xml.slice(at, xml.indexOf('</message>', at));
        assert.equal(block.split('<o>').length - 1, 6, lang + ' ' + key + ' has six options');
        if (key === 'SAR.FLS') assert.ok(block.split('<o>').slice(1).every((o) => o.includes('{0}') && o.includes('{1}')), lang + ' ' + key + ' uses both arguments');
      }
    }
  }
}
// 15. MPR report 2026-10-27 (169.82, mission 44, 4 crew, skid): a medical team member vanished (the landed return of "4 crew SKID LDG" never sat the first rear seat again,
// the hoist return did) and the police and the ambulance stayed on the scene and the map after the hospital
{
  const skid = macros['4 crew SKID LDG'];
  const t15 = text(skid);
  const at = t15.indexOf('"call_macro":"set station weight","params":{"station":3,"occupied":1}},{"wait_for":{"fn":"HOIST_REEL_UP_AND_STOW"');
  assert.ok(at > 0, 'landed return of the 4 crew skid operation found');
  assert.ok(t15.slice(Math.max(0, at - 90), at).includes('{"trigger":["H:{local:HXX}_SDK_PAX_1_ON"]}'), 'the landed return seats the first rear passenger again');
  const rb = text(macros['Return to base or continue menu']);
  for (const name of ['policeman', 'policeman2', 'police', 'police7', 'ambumedic7', 'ambustretcher7', 'ambulance1']) {
    assert.ok(rb.includes('{"if":{"has_object":"' + name + '"},"eq":1,"then":[{"destroy_object":"' + name + '"}]}'), name + ' is removed when the patient is at the hospital');
  }
  assert.ok(rb.indexOf('"destroy_object":"police"') < rb.indexOf('"call_macro":"crew hospital finish"'), 'the release comes before every choice of the menu');
}console.log('flight report 2026-10-23: ok');
