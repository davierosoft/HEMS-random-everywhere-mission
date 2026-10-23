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
  assert.ok(/<voicepack name="EN"[^>]* version="24"/.test(pack('EN')), 'base pack EN 24');
  assert.ok(/<voicepack name="DE"[^>]* version="12" basever="24"/.test(pack('DE')), 'pack DE 12 on the base 24');
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
  assert.ok(ui.includes('OPERATIONS DELAYED') && ui.includes('"text":"Still open: {0}","params":[{"local":"ground_ops_blockers"}]'), 'the Dispatch page shows what is still open');
  assert.ok(!/"or":\[/.test(ui.slice(ui.indexOf('OPERATIONS DELAYED'), ui.indexOf('OPERATIONS DELAYED') + 700)), 'renderer conditions of the new rows are AND only');
  const hb = text(macros['Hoisting back up']);
  for (const id of ['hoist2_thread_start', 'hoist2_hover_wait', 'hoist2_hover_ok', 'hoist2_down_start', 'hoist2_down_wait', 'hoist2_on_ground', 'hoist_wait_pax_hoist', 'hoist_pax_hoist_ok', 'hoist_patient_prepare_retry', 'hoist_patient_prepare_failed']) assert.ok(hb.includes('"id":"' + id + '"'), 'checkpoint ' + id);
  assert.ok(hb.includes('"require":{"param":"prepare_try"},"lt":3'), 'the patient preparation is retried three times before it gives up');
  assert.ok(hb.indexOf('hoist_patient_prepare_failed') < hb.indexOf('"return":0'), 'the failure is traced and told before the macro returns');
}

console.log('flight report 2026-10-23: ok');
