#!/usr/bin/env node
'use strict';

// End of mission and crew casualty scene. The production macros run on a small synchronous HPG subset interpreter
// (one thread queue, positions as plain points). HPG/MSFS object, door and animation behavior is NOT modeled:
// this proves command order, branching and ownership only; the simulator test stays pending.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const macroDirectory = path.join(__dirname, '..', 'mission-src', 'macros');
const macros = {};
for (const file of fs.readdirSync(macroDirectory).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(macroDirectory, file), 'utf8')));
const text = (name) => JSON.stringify(macros[name]);
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

// ---- static contract --------------------------------------------------------------------------
{
  // 1. Only END SHIFT ends the mission (MISSION_END_WAITING 2); nothing in the flow completes it by itself.
  const writers = Object.entries(macros).flatMap(([name, commands]) => collect(commands, (c) => c.set?.local === 'MISSION_END_WAITING' && c.value === 2).map(() => name));
  assert.deepEqual(writers, ['end menu'], `MISSION_END_WAITING 2 may only be written by the end menu END SHIFT button: ${writers}`);
  const buttons = collect(macros['end menu'], (c) => Array.isArray(c.buttonbar))[0].buttonbar;
  assert.deepEqual(buttons.map((b) => b.title), ['SUBMIT REPORT', 'END SHIFT', 'RELOAD MISSION']);
  const [submit, endShift, reload] = buttons;
  assert.deepEqual(submit.commands, [{ call_macro: 'submit report' }]);
  const names = (b) => b.commands.map((c) => c.call_macro || Object.keys(c)[0]);
  assert.deepEqual(endShift.commands.slice(0, 2), [{ set: { local: 'archive_event' }, value: 'end_shift' }, { call_macro: 'archive closing dispatch' }], 'END SHIFT saves the automatic snapshot first');
  assert.ok(names(endShift).indexOf('call_macro') >= 0 || endShift.commands.some((c) => c.set?.local === 'MISSION_END_WAITING' && c.value === 2));
  assert.deepEqual(reload.commands.slice(0, 2), [{ set: { local: 'archive_event' }, value: 'reload_mission' }, { call_macro: 'archive closing dispatch' }], 'RELOAD saves the automatic snapshot first');
  assert.ok(reload.commands.findIndex((c) => c.reload_mission) > reload.commands.findIndex((c) => c.call_macro === 'archive closing dispatch'), 'the snapshot is saved before the reload');
  assert.ok(reload.commands.some((c) => c.set?.local === 'dispatch_diag_keep' && c.value === 1), 'a reload keeps the dispatch diagnostics file');

  // 2. At the base the end menu is offered at once and the deboarding runs in parallel; deboarding never overwrites END SHIFT.
  const deboarding = macros.deboarding;
  assert.deepEqual(deboarding.slice(-2), [
    { wait_for: { local: 'deboard_pilot_done' }, eq: 1 },
    { if: { local: 'MISSION_END_WAITING' }, eq: 0, then: [{ set: { local: 'MISSION_END_WAITING' }, value: 1 }] },
  ]);
  assert.equal(collect(deboarding.slice(0, -2), (c) => c.set?.local === 'MISSION_END_WAITING').length, 0);
  assert.equal(collect(deboarding, (c) => c.set?.local === 'deboard_pilot_done' && c.value === 1).length, 3, 'every pilot exit path reports completion');
  const rtb = macros['return to base'];
  assert.ok(!collect(rtb, (c) => c.sleep === 10).length, 'return to base no longer opens the end menu on a timer');
  assert.ok(!collect(rtb, (c) => c.wait_for?.local === 'DEBOARDING_COMPLETE').length, 'return to base does not wait for the deboarding');
  const tail = rtb.slice(-3);
  assert.deepEqual(tail, [{ set: { local: 'MISSION_END_WAITING' }, value: 1 }, { call_macro: 'end menu' }, { set_dispatch_dialog: 1 }], 'the end menu is offered right after the landing');
  const branch = collect(rtb, (c) => c.if?.local === 'CCS_BASE_NEED' && c.else)[0];
  assert.deepEqual(branch.then, [{ call_macro: 'crew casualty destination scene' }]);
  assert.ok(branch.else.some((c) => c.create_thread?.commands?.[0]?.call_macro === 'deboarding'), 'the deboarding starts in parallel');
  assert.equal(collect(rtb, (c) => c.call_macro === 'crew base scene need').length, 2, 'the base scene need is evaluated when the base is approached and again at the landing');
  assert.ok(!text('return to base').includes('"local":"CREW_EMERGENCY_ACTIVE"'), 'the base scene no longer depends on the emergency flag alone');
  assert.ok(!JSON.stringify(macros).includes('DEBOARDING_COMPLETE'));
  // The failure of the previous mission does not label the new one (locals survive reload_mission).
  assert.ok(collect(macros['initialize crew lifescores for shift'], (c) => c.set?.local === 'MISSION_FAILED' && c.value === null).length === 1);
  // 3. No dispatch while a crew emergency is active.
  assert.deepEqual(macros.accept_dispatch[0], { if: { local: 'CREW_EMERGENCY_ACTIVE' }, eq: 'yes', then: [{ set_message: { text: 'DISPATCH NOT AVAILABLE: crew emergency, shift terminated.' } }, { return: 1 }] });
  assert.ok(collect(macros['ready dispatch'], (c) => c.wait_for?.local === 'CREW_EMERGENCY_ACTIVE' && c.ne === 'yes').length === 1);
  assert.ok(text('next_dispatch').includes('"require":{"local":"CREW_EMERGENCY_ACTIVE"},"ne":"yes"'));

  // 4. Second dispatch during or after the deboarding: positions stored before the reload, crew boarded after it.
  const arraysWith = (value, predicate, found = []) => {
    if (Array.isArray(value)) { if (predicate(value)) found.push(value); value.forEach((item) => arraysWith(item, predicate, found)); }
    else if (value && typeof value === 'object') Object.values(value).forEach((child) => arraysWith(child, predicate, found));
    return found;
  };
  const accept = arraysWith(macros.accept_dispatch, (list) => list.some((x) => x?.reload_mission))[0];
  assert.ok(accept.findIndex((c) => c.call_macro === 'crew reboard snapshot') >= 0 && accept.findIndex((c) => c.call_macro === 'crew reboard snapshot') < accept.findIndex((c) => c.reload_mission));
  assert.deepEqual(macros['crew boarding'][0], { call_macro: 'crew reboard interrupted crew' });
  assert.ok(collect(macros.objective1, (c) => c.call_macro === 'crew reboard clear').length === 1);

  // 5. Documented states only: Medic and Policeman use VAR 1 0 and walk through VAR1 1; the Medic Stretcher uses VAR 2 1 and 3;
  //    Crew uses 14/16 for pilots and 1/3 or 2 for rear crew. Literal VAR1, no param in drive names.
  const hospitalNames = ['crew hospital unload', 'crew hospital arrival', 'crew hospital finish', 'crew hospital ambulance call', 'crew emergency ambulance prime', 'crew emergency route to care', 'crew emergency divert', 'crew emergency choice', 'crew emergency continue', 'crew base scene need', 'crew hospital police watch', 'crew emergency return to base', 'crew emergency destination menu', 'crew emergency replacement unit', 'crew hospital scene stretchers', 'crew hospital scene place', 'crew hospital handover roles', 'crew hospital crew back', ...[1, 2, 3, 4].flatMap((k) => [`crew hospital unload ${k}`, `crew hospital deliver walk ${k}`, `crew hospital deliver ambulance ${k}`])];
  const casualtyNames = ['crew casualty plan', 'crew casualty scene vehicles', 'crew casualty load member', 'crew casualty pilot walk', 'crew casualty destination scene', ...hospitalNames];
  for (const name of casualtyNames) {
    assert.ok(/^[\x20-\x7e]*$/.test(text(name)), `${name} must be ASCII`);
    for (const drive of collect(macros[name], (c) => c.drive_object)) {
      assert.equal(typeof drive.drive_object.name, 'string', `${name}: drive_object name must be literal`);
      assert.equal(typeof drive.drive_object.VAR1, 'number', `${name}: drive_object VAR1 must be literal`);
    }
  }
  const stretcherVars = collect(macros['crew casualty load member'], (c) => c.set?.object === 'ccs_stretcher').map((c) => `${c.set.var}=${c.value}`);
  assert.deepEqual([...new Set(stretcherVars)].sort(), ['VAR 1=0', 'VAR 2=3']);
  const stretcherDrives = collect(macros['crew casualty load member'], (c) => c.drive_object?.name === 'ccs_stretcher');
  assert.ok(stretcherDrives.length === 8 && stretcherDrives.every((c) => c.drive_object.VAR1 === 1), 'the stretcher always moves with the documented walking state');
  assert.ok(stretcherDrives.slice(4).every((c) => JSON.stringify(c.drive_object.to.at(-1)) === '{"bearing2":180,"dist":2.5,"object":"ambulance5"}'), 'the stretcher is loaded through the rear (bearing2 180)');
  const vehicles = JSON.stringify(macros['crew casualty scene vehicles']);
  assert.ok(vehicles.includes('"bearing":20,"dist":50,"heading":20,"object":"ccs_site"') && vehicles.includes('"bearing":340,"dist":50,"heading":340,"object":"ccs_site"'), 'ambulance and police car are parked 50 m from the pre-set landing point, 34 m apart');
  assert.ok(vehicles.includes('"name":"ccs_medic"') && vehicles.includes('"name":"ccs_stretcher"') && vehicles.includes('"name":"ccs_policeman"'));
  const emergencyRoute = text('crew emergency route to care');
  assert.ok(!emergencyRoute.includes('crew casualty destination scene') && !emergencyRoute.includes('crew casualty scene vehicles') && !emergencyRoute.includes('crew emergency hospital admission'), 'no ambulance and police scene at the hospital: the hospital unloads with its own stretchers');
  assert.ok(emergencyRoute.includes('{"if":{"has_location":"hospital_user"},"eq":0,"then":[{"call_macro":"Query closest hospital"}]}'), 'the crew emergency reuses the hospital of the dispatch and queries one only when there is none');
  assert.ok(emergencyRoute.includes('"object":"hospital_user"') && emergencyRoute.includes('crew hospital arrival') && emergencyRoute.includes('manual_hospital_destination_setup'), 'a patient aboard uses the normal destination flow, otherwise the crew arrival flow');
  const menuMacro = text('crew emergency destination menu');
  assert.ok(menuMacro.includes('"title":"CHOOSE DESTINATION"') && menuMacro.includes('Choose manual type modal') && menuMacro.includes('"local":"CREW_DEST_CONFIRMED"},"value":"yes"'), 'the crew emergency offers manual selection and confirmation of the hospital');
  assert.ok(menuMacro.includes('No hospital found. Select the hospital destination manually.') && !menuMacro.includes('return to base'), 'without a hospital the user selects it, no automatic return to base');
  assert.ok(!emergencyRoute.includes('"call_macro":"return to base"') && !emergencyRoute.includes('BACK_TO_HOSPITAL'), 'the care route never falls back to the base on its own');
  assert.ok(emergencyRoute.indexOf('CREW_EMERGENCY_BOARDING_DONE') < emergencyRoute.indexOf('crew emergency destination menu') && emergencyRoute.indexOf('crew emergency destination menu') < emergencyRoute.indexOf('"CREW_DEST_CONFIRMED"') + 1000 && emergencyRoute.indexOf('"local":"CREW_DEST_CONFIRMED"},"eq":"yes"') < emergencyRoute.indexOf('routeupdate'), 'crew boarded, then menu, then confirmation, then the route is set');
  const destMenu = macros['user destination menu'];
  assert.ok(JSON.stringify(destMenu[0]).includes('"local":"CREW_DIVERT"},"eq":"yes"') && JSON.stringify(destMenu[0]).includes('crew emergency destination menu') && JSON.stringify(destMenu[0]).includes('"return":0'), 'the shared destination menu (manual map/list/DB selection ends there) diverts to the crew menu once the mission is diverted, not after Continue');
  assert.ok(text('crew impact events').includes('{"if":{"local":"CREW_DIVERT"},"ne":"yes","then":[{"if":{"local":"crew_first_member"}'), 'a death after Continue still reaches the emergency response');
  const finishHook = macros['Return to base or continue menu'].find((c) => c.if?.and?.some((x) => x.require?.local === 'cambuchoice'));
  assert.deepEqual(finishHook.then, [{ call_macro: 'crew hospital finish' }, { return: 0 }], 'a hospital stop with a crew emergency hands over the crew and returns to base instead of the dispatch menu');
  assert.ok(macros['Return to base or continue menu'].indexOf(finishHook) < macros['Return to base or continue menu'].findIndex((c) => c.if?.local === 'LIFESCORE'), 'the hook comes before any dispatch modal');
  const unloadText = text('crew hospital unload') + [1, 2, 3, 4].map((k) => text(`crew hospital unload ${k}`) + text(`crew hospital deliver walk ${k}`) + text(`crew hospital deliver ambulance ${k}`)).join('');
  assert.ok(!unloadText.includes('Ambulance5') || unloadText.includes('crew hospital ambulance call'), 'the hospital unload never parks the police/ambulance scene');
  assert.ok(!text('crew hospital arrival').includes('crew casualty scene vehicles'));
  // one stretcher per casualty; one medic only when none exists, created once (the 169.29 test: a medic per casualty walked to the hospital on his own and back, for nothing)
  assert.equal(text('crew hospital unload').split('"name":"chs_med_1"').length - 1, 1, 'one medic, created once');
  assert.ok(text('crew hospital unload').includes('{"require":{"has_object":"ambumedic"},"eq":0}'), 'no medic is created when the medic of the patient exists');
  // the medic stands beside the casualty door, 15 degrees toward the nose and 5.5 m (the stretcher comes from abeam to 4 m), and faces the door
  const doorBlocks = collect(macros['crew hospital unload 1'], (c) => Array.isArray(c.then) && c.then.some((x) => x.create_location === 'chs_door_1')).map((c) => c.then);
  assert.equal(doorBlocks.length, 5, 'five casualty doors');
  for (const block of doorBlocks) {
    const door = block.find((x) => x.create_location === 'chs_door_1').zones[0].zone.location.bearing;
    const side = block.find((x) => x.set?.local === 'chs_dside_1').value;
    const place = block.find((x) => x.create_location === 'chs_mdoor_1').zones[0].zone.location;
    assert.deepEqual(place, { bearing: door + (side === 'R' ? -15 : 15), dist: 5.5 }, `door ${door}${side}: the medic is beside the stretcher, toward the nose`);
  }
  const medicThreads = collect(macros['crew hospital unload 1'], (c) => c.create_thread && JSON.stringify(c.create_thread).includes('"name":"chs_med_1"'));
  assert.equal(medicThreads.length, 4);
  assert.ok(medicThreads.every((c) => JSON.stringify(c.create_thread.commands.at(-1)) === '{"point_object":"chs_med_1","to":"chs_door_1"}'), 'he faces the casualty door');
  for (const k of [1, 2, 3, 4]) {
    const body = text(`crew hospital unload ${k}`);
    assert.ok(body.includes(`"name":"chs_str_${k}"`) && !body.includes('"create_object":{"name":"chs_med'), `casualty ${k} has its own stretcher and creates no medic`);
    assert.ok(!text(`crew hospital deliver walk ${k}`).includes(`chs_end_${k}`) && !text(`crew hospital deliver walk ${k}`).includes('chs_mend_'), `casualty ${k}: removed at hospital_door, no other place to go`);
    assert.ok(text(`crew hospital deliver walk ${k}`).includes('hospital_wp3') && text(`crew hospital deliver walk ${k}`).includes('"hospital_door"'), `casualty ${k} follows the hospital waypoints to the hospital door`);
  }
}

{
  // Crew names (member 1 Pilot, 2 Medic, 3 Copilot, 4 HEMS 1, 5 HEMS 2; listed Pilot, Copilot, Medic, HEMS 1, HEMS 2) and the crew lifescores in the dispatch page,
  // hidden and shown with the patient lifescores, just above them.
  const rows = collect(macros['Mission dispatch'] ?? [], (c) => Array.isArray(c.set_dispatch ?? null))[0]?.set_dispatch
    ?? Object.values(macros).flatMap((m) => collect(m, (c) => Array.isArray(c.set_dispatch))).flatMap((c) => c.set_dispatch);
  const texts = rows.map((row) => String(row.text ?? ''));
  // displayed order: Pilot (1), Copilot (3), Medic (2), HEMS 1 (4), HEMS 2 (5)
  const shown = [[1, 'Pilot'], [3, 'Copilot'], [2, 'Medic'], [4, 'HEMS 1'], [5, 'HEMS 2']];
  const crewRows = shown.map(([, name]) => texts.findIndex((t) => t === `${name} lifescore: {0} %`));
  assert.ok(crewRows.every((i) => i >= 0), 'one crew lifescore row per member, names spelled out');
  const patient1 = texts.findIndex((t) => t === 'Patient 1 lifescore: {0} %');
  // every member has five rows (fit, critical, deceased, unloaded at the hospital, deceased unloaded), one after the other, the last group right above the patient lifescores
  assert.ok(crewRows.every((i, n) => i < patient1 && (n === 0 || i === crewRows[n - 1] + 5)) && patient1 === crewRows[4] + 5, 'the crew rows sit right above the patient lifescores, in the order pilot, copilot, medic, HEMS 1, HEMS 2');
  const roleNames = ['Pilot', 'Medic', 'Copilot', 'HEMS 1', 'HEMS 2'];
  crewRows.forEach((index, position) => {
    const n = shown[position][0] - 1;
    const cond = JSON.stringify(rows[index].show_condition);
    assert.ok(cond.includes('"local":"dispatch_lifescores_visible"},"eq":1'), 'hidden like the patient lifescores');
    assert.ok(cond.includes(`"local":"CREW"},"gte":${n + 1}`) && cond.includes('CREW_LIFESCORE_SHIFT_ACTIVE'));
    assert.deepEqual(rows[index].params, [{ local: `CREW_LIFESCORE_${n + 1}` }]);
    assert.ok(cond.includes(`{"require":{"local":"CREW_LIFESCORE_${n + 1}"},"gt":{"local":"CREW_AMBULANCE_LIMIT"}}`), 'the fit row is replaced by the red one when the member is critical');
    // critical (above 0, at or below the limit) and deceased members: always shown, red, whatever the show/hide choice
    for (const [offset, label, extra] of [[1, 'CRITICAL', ['"gt":0', '"lte":{"local":"CREW_AMBULANCE_LIMIT"}']], [2, 'DECEASED', ['"lte":0']]]) {
      const row = rows[index + offset];
      const c = JSON.stringify(row.show_condition);
      assert.equal(row.text, `${roleNames[n]} lifescore: {0} % - ${label}`);
      assert.equal(row.color, 'red');
      assert.deepEqual(row.params, [{ local: `CREW_LIFESCORE_${n + 1}` }]);
      assert.ok(!c.includes('dispatch_lifescores_visible'), `${label}: the hide lifescores choice is bypassed`);
      assert.ok(c.includes(`"local":"CREW"},"gte":${n + 1}`) && c.includes('CREW_LIFESCORE_SHIFT_ACTIVE') && extra.every((part) => c.includes(part)));
      assert.ok(!c.includes('"or"') && Array.isArray(row.show_condition.and), 'renderer conditions use AND only');
      assert.ok(c.includes(`{"require":{"local":"CREW_HOSPITAL_${n + 1}"},"ne":1}`), `${label}: replaced by the hospital row once the member was unloaded`);
    }
    // unloaded at the hospital: shown in red, whatever the show/hide choice, in place of the critical/deceased row
    for (const [offset, label, extra] of [[3, 'UNLOADED AT HOSPITAL', '"gt":0'], [4, 'DECEASED, UNLOADED AT HOSPITAL', '"lte":0']]) {
      const row = rows[index + offset];
      const c = JSON.stringify(row.show_condition);
      assert.equal(row.text, `${roleNames[n]} lifescore: {0} % - ${label}`);
      assert.equal(row.color, 'red');
      assert.ok(!c.includes('dispatch_lifescores_visible') && !c.includes('"or"') && c.includes(`{"require":{"local":"CREW_HOSPITAL_${n + 1}"},"eq":1}`) && c.includes(extra), `${label}: shown from the hospital unload`);
    }
  });
  // CREW_HOSPITAL_n is cleared at the shift start and set when the stretcher reaches the hospital, walking or with the ambulance
  for (let n = 1; n <= 5; n += 1) assert.ok(macros['initialize crew lifescores for shift'].some((c) => c.set?.local === `CREW_HOSPITAL_${n}` && c.value === 0), `CREW_HOSPITAL_${n} cleared`);
  for (const kind of ['walk', 'ambulance']) {
    for (let k = 1; k <= 4; k += 1) {
      const body = macros[`crew hospital deliver ${kind} ${k}`];
      const marked = [1, 2, 3, 4, 5].every((n) => JSON.stringify(body).includes(`{"if":{"local":"CHS_MEMBER_${k}"},"eq":${n},"then":[{"set":{"local":"CREW_HOSPITAL_${n}"},"value":1}]}`));
      assert.ok(marked, `${kind} ${k}: the member is marked as unloaded at the hospital`);
      const markAt = body.findIndex((c) => c.if && JSON.stringify(c).includes('CREW_HOSPITAL_'));
      assert.ok(markAt > 0 && markAt < body.findIndex((c) => c.set?.local === 'CHS_DELIVERED'), `${kind} ${k}: marked on arrival, before the delivery is counted`);
    }
  }
  // the statistics of the old dispatch show a value only when it was set, the failure is described, the values are cleared at every mission start
  const statRow = (start) => rows.find((row) => String(row.text ?? '').startsWith(start));
  for (const start of ['Base to accident site distance', 'Base to loading site distance', 'Base to ambulance meeting point distance', 'Number of injured on scene']) {
    assert.ok(JSON.stringify(statRow(start).show_condition).includes('{"require":{"var":["L:STAT_TTG","number"]},"gt":0}'), `${start}: only when the scene was reached`);
  }
  assert.ok(JSON.stringify(statRow('Time spent for on-site operations').show_condition).includes('{"require":{"var":["L:STAT_TOG","number"]},"gt":{"var":["L:STAT_TTG","number"]}}'), 'on-site time only when the operations took place (never negative)');
  assert.ok(JSON.stringify(statRow('Total time from dispatch to arrival').show_condition).includes('{"require":{"var":["L:STAT_TOT","number"]},"gt":0}'), 'total time only when the hospital was reached');
  assert.ok(statRow('Scene not reached') && statRow('MISSION FAILED: crew member seriously injured.') && statRow('MISSION FAILED: crew member deceased.') && statRow('Cause: {0}').params[0].local === 'CREW_EMERGENCY_CAUSE', 'failure statistics: result, cause');
  assert.deepEqual(statRow('Crew seriously injured').params, [{ local: 'STAT_CREW_CRITICAL' }, { local: 'STAT_CREW_DEAD' }]);
  assert.ok(rows.filter((row) => /^(Scene not reached|MISSION FAILED|Cause:|Crew seriously|Patients deceased)/.test(String(row.text ?? ''))).every((row) => !JSON.stringify(row.show_condition).includes('"or"') && Array.isArray(row.show_condition.and)), 'AND only');
  const resetStats = macros['reset mission statistics'].filter((c) => c.set?.var).map((c) => c.set.var[0]);
  assert.deepEqual(resetStats, ['L:STAT_TTG', 'L:STAT_TOG', 'L:STAT_TOT', 'L:OLD_HELOVICTIMS']);
  // 169.29 test: the on-scene ground operation of a diverted mission is still armed and wrote STAT_TTG (660 s) when the rotor was stopped at the hospital
  const guard = macros['ground ops'].find((c) => c.if?.local === 'CREW_DIVERT' && c.ne === 'yes' && JSON.stringify(c.then).includes('L:STAT_TTG'));
  assert.ok(guard && JSON.stringify(guard.then).includes('L:OLD_HELOVICTIMS'), 'a diverted mission writes no time to the scene');
  assert.equal(collect(macros['ground ops'], (c) => c.set?.var?.[0] === 'L:STAT_TTG').length, 1, 'the only writer of the time to the scene in ground ops is the guarded one');
  assert.ok(macros['delayed threads'].some((c) => c.call_macro === 'reset mission statistics') && macros['return to base menu'][0].call_macro === 'mission failure statistics', 'cleared at the mission start, failure counted when the dispatch ends');
  const allRoles = Object.values(macros).flatMap((m) => collect(m, (c) => c.set?.local === 'crew_role_name').map((c) => c.value));
  assert.deepEqual(allRoles.slice(0, 5), ['PILOT', 'MEDIC', 'COPILOT', 'HEMS 1', 'HEMS 2']);
  const debug = JSON.stringify(macros['debug page']);
  assert.ok(debug.includes('CREW HEALTH | Pilot:{0} Copilot:{1} Medic:{2} HEMS 1:{3} HEMS 2:{4}'), 'debug names the crew in full');
  assert.ok(!/MEDICAL CREW|HOIST OPERATOR|CREW MEMBER [45]|P:\{0\} M:\{1\} H:\{2\}/.test(JSON.stringify([macros['end menu'], macros['debug page']])), 'old role names are gone');
}
// ---- interpreter ------------------------------------------------------------------------------
class Returned { constructor(value) { this.value = value; } }
class Sim {
  constructor() {
    this.locals = { CREW: 4, ccs_vehicles_ready: 'no', CREW_EMERGENCY_ACTIVE: 'yes', CREW_POLICE_LIMIT: 20, CREW_AMBULANCE_LIMIT: 10, CCS_DONE_1: 0, CCS_DONE_2: 0, CCS_DONE_3: 0, CCS_DONE_4: 0, CCS_DONE_5: 0 };
    this.globals = {}; this.vars = {}; this.objects = new Set(); this.pos = {}; this.threads = []; this.log = [];
    this.objectVars = {}; this.presence = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0 }; this.stubs = {}; this.modals = []; this.actions = {};
    this.vars['L:{local:HXX}_SDK_ROTOR_RPM'] = 0; this.vars['L:{local:HXX}_SDK_DOOR_COCKPIT_R'] = 1;
    this.vars['SIM ON GROUND'] = 1; this.vars['GPS GROUND SPEED'] = 0;
    Object.assign(this.pos, { ccs_pol_L: [-9, 0], ccs_pol_R: [9, 0], ccs_med_L: [-9, -2], ccs_med_R: [9, -2], ccs_str_L: [-8, 0], ccs_str_R: [8, 0] });
  }
  cmp(a, node, p) {
    const op = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].filter((key) => Object.hasOwn(node, key));
    assert.equal(op.length, 1, JSON.stringify(node));
    const b = this.q(node[op[0]], p);
    return { eq: () => a === b, ne: () => a !== b, gt: () => a > b, gte: () => a >= b, lt: () => a < b, lte: () => a <= b }[op[0]]();
  }
  q(x, p) {
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) return x.map((item) => this.q(item, p));
    if (Object.hasOwn(x, 'local')) return this.locals[x.local] ?? null;
    if (Object.hasOwn(x, 'param')) return p[x.param] ?? null;
    if (Object.hasOwn(x, 'global')) return this.globals[x.global] ?? null;
    if (Array.isArray(x.var)) return this.vars[x.var[0]] ?? null;
    if (x.has_object !== undefined) return Number(this.objects.has(this.q(x.has_object, p)));
    if (x.has_location !== undefined) return Number(Boolean(this.pos[x.has_location]));
    if (x.floor !== undefined) return Math.floor(this.q(x.floor, p));
    if (x.rand !== undefined) return this.q(x.rand[1], p) - 0.5;
    if (x.location && x.var === 'distance') return this.dist?.[x.location] ?? 0;
    if (x.location && x.var === 'distance:m') {
      const a = this.pos[x.location], b = this.pos[x.to];
      assert.ok(a && b, `positions required for ${x.location} / ${x.to}`);
      return Math.hypot(a[0] - b[0], a[1] - b[1]);
    }
    if (x.location && Object.keys(x).length === 1) return this.pos[x.location];
    if (x.require) return this.cmp(this.q(x.require, p), x, p);
    if (x.and) return Number(x.and.every((item) => this.q(item, p)));
    if (x.or) return Number(x.or.some((item) => this.q(item, p)));
    if (x.add) return x.add.map((item) => this.q(item, p)).reduce((sum, n) => sum + n, 0);
    if (x.subtract) return x.subtract.map((item) => this.q(item, p)).reduce((diff, n) => diff - n);
    if (x.text !== undefined) return x.text.replace(/\{(\d+)\}/g, (_, n) => this.q(x.params[Number(n)], p));
    if (x.if !== undefined) return this.cmp(this.q(x.if, p), x, p) ? this.q(x.then, p) : this.q(x.else, p);
    if (x.dist !== undefined && (x.bearing !== undefined || x.bearing2 !== undefined)) return this.label(x);
    throw new Error(`Unsupported query ${JSON.stringify(x)}`);
  }
  label(point) {
    if (typeof point === 'string') return point;
    if (point?.object) return `${point.object}@${point.bearing2 ?? point.bearing}/${point.dist}`;
    return JSON.stringify(point);
  }
  position(point) {
    if (typeof point === 'string') return this.pos[point];
    if (point?.object) return this.pos[point.object];
    return undefined;
  }
  stub(name, p) {
    if (this.stubs[name]) { this.log.push(['call', name, p]); this.stubs[name](p); return true; }
    switch (name) {
      case 'post crew safety message': case 'zoom out': case 'test tracker begin': case 'test tracker complete': case 'Update_raw from dispatchphase': case 'post dispatcher message':
        this.log.push(['call', name, p]); return true;
      case 'crew members cap': this.locals.CREW_MEMBER_CAP = this.locals.CREW; return true;
      case 'crew presence flags': for (const n of [1, 2, 3, 4, 5]) this.locals[`CREW_PRESENT_${n}`] = this.presence[n]; return true;
      case 'ground crew runtime trace': case 'crew spawn launch': case 'crew spawn wait': return true;
      case 'crew spawn failure': throw new Error(`crew spawn failure ${p.crew_name}`);
      case 'Ambulance5': this.objects.add('ambulance5'); this.pos.ambulance5 = [0, 0]; this.log.push(['create', 'ambulance5']); return true;
      case 'Police7': this.objects.add('police7'); this.pos.police7 = [0, 0]; this.log.push(['create', 'police7']); return true;
      case 'end menu': this.log.push(['end menu']); return true;
      default: return false;
    }
  }
  run(list, p = {}) {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.sleep !== undefined) continue;
      if (c.set) {
        const value = this.q(c.value, p);
        if (c.set.local) this.locals[c.set.local] = value;
        else if (c.set.param) p[c.set.param] = value;
        else if (c.set.global) this.globals[c.set.global] = value;
        else if (c.set.object) { this.objectVars[`${c.set.object}.${c.set.var}`] = value; this.log.push(['setvar', c.set.object, c.set.var, value]); }
        else if (c.set.var) {
          const name = c.set.var[0];
          if (Array.isArray(value)) { this.vars[`${name} LAT`] = value[0]; this.vars[`${name} LON`] = value[1]; } else this.vars[name] = value;
          this.log.push(['setlvar', name, value]);
        } else throw new Error(`Unsupported set ${JSON.stringify(c.set)}`);
      } else if (c.if) this.run(this.cmp(this.q(c.if, p), c, p) ? c.then : (c.else || []), p);
      else if (c.call_macro) {
        const args = Object.fromEntries(Object.entries(c.params || {}).map(([k, v]) => [k, this.q(v, p)]));
        if (!this.stub(c.call_macro, args)) { assert.ok(macros[c.call_macro], `unknown macro ${c.call_macro}`); this.call(c.call_macro, args); }
      } else if (c.create_location) {
        const zone = c.zones[0].zone.location;
        if (zone.resolve_location) this.pos[c.create_location] = this.q(zone.resolve_location.create_array, p);
        else if (!this.pos[c.create_location]) this.pos[c.create_location] = this.pos[zone.object] ? [...this.pos[zone.object]] : [0, 0];
        this.log.push(['location', c.create_location]);
      } else if (c.create_object) {
        const name = c.create_object.name;
        this.objects.add(name);
        const at = c.create_object.location;
        this.pos[name] = (typeof at === 'string' ? this.pos[at] : at?.object ? this.pos[at.object] : null) ?? [0, 0];
        this.log.push(['create', name, c.create_object.title]);
      } else if (c.destroy_object) { this.objects.delete(c.destroy_object); this.log.push(['destroy', c.destroy_object]); }
      else if (c.move_object) { this.log.push(['move', c.move_object, this.label(c.to)]); const to = this.position(typeof c.to === 'string' ? c.to : c.to); if (to) this.pos[c.move_object] = [...to]; }
      else if (c.drive_object) {
        const d = c.drive_object;
        assert.ok(this.objects.has(d.name), `drive of a missing object ${d.name}`);
        this.log.push(['drive', d.name, d.VAR1, d.to.map((point) => this.label(point))]);
        const end = this.position(d.to.at(-1)); if (end) this.pos[d.name] = [...end];
      } else if (c.open_door || c.close_door || c.trigger || c.point_object || c.set_message || c.set_dispatch_dialog !== undefined) {
        const key = Object.keys(c)[0];
        this.log.push([key, c[key]?.text ?? c[key], c.to]);
      } else if (c.set_modal) { this.modals.push(c.set_modal); this.log.push(['modal', c.set_modal.title]); }
      else if (c.create_user_action) { this.actions[c.create_user_action.id] = c.create_user_action; this.log.push(['action', c.create_user_action.id, c.create_user_action.title]); }
      else if (c.destroy_user_action) { delete this.actions[c.destroy_user_action]; this.log.push(['destroy_action', c.destroy_user_action]); }
      else if (c.set_hover_display) this.log.push(['hover']);
      else if (c.while) { let guard = 0; while (this.cmp(this.q(c.while, p), c, p)) { assert.ok(++guard < 50, 'while loop does not end'); this.run(c.do, p); } }
      else if (c.and && !c.if) c.and.forEach((w) => assert.ok(this.cmp(this.q(w.wait_for, p), w, p), `wait not satisfied ${JSON.stringify(w.wait_for)}`));
      else if (c.or) {
        assert.ok(c.or.some((w) => this.cmp(this.q(w.wait_for, p), w, p)), 'none of the alternative waits is satisfied');
      } else if (c.wait_for) {
        if (c.wait_for.local) {
          while (!this.cmp(this.q(c.wait_for, p), c, p)) { const t = this.threads.shift(); assert.ok(t, `wait on ${c.wait_for.local} would never finish`); this.run(t.commands, t.params); }
        } else assert.ok(this.cmp(this.q(c.wait_for, p), c, p), `wait on ${JSON.stringify(c.wait_for)} not satisfied`);
      } else if (c.create_thread) this.threads.push({ commands: c.create_thread.commands, params: { ...p } });
      else if (c.try) { try { this.run(c.try, p); } catch (error) { if (error instanceof Returned) throw error; p.$ERROR = error.message; this.run(c.catch || [], p); } }
      else if (Object.hasOwn(c, 'return')) throw new Returned(this.q(c.return, p));
      else throw new Error(`Unsupported command ${JSON.stringify(c).slice(0, 160)}`);
    }
  }
  call(name, args = {}) {
    try { this.run(macros[name], args); } catch (error) { if (error instanceof Returned) return error.value; throw error; }
    return undefined;
  }
  flush() { while (this.threads.length) { const t = this.threads.shift(); this.run(t.commands, t.params); } }
  events(kind) { return this.log.filter((entry) => entry[0] === kind); }
  drives(name) { return this.log.filter((entry) => entry[0] === 'drive' && entry[1] === name); }
  index(predicate) { return this.log.findIndex(predicate); }
}
const scene = (configure) => {
  const sim = new Sim();
  Object.assign(sim.locals, { CREW_LIFESCORE_1: 100, CREW_LIFESCORE_2: 100, CREW_LIFESCORE_3: 100, CREW_LIFESCORE_4: 100, CREW_LIFESCORE_5: 100 });
  // the vehicles are parked by crew casualty scene vehicles (tested apart): here the actors start where the test puts them
  sim.locals.ccs_vehicles_ready = 'yes';
  for (const name of ['ambulance5', 'police7', 'ccs_medic', 'ccs_stretcher', 'ccs_policeman']) sim.objects.add(name);
  Object.assign(sim.pos, { ambulance5: [0, 50], police7: [30, 50], ccs_stretcher: [-3, 50], ccs_medic: [-3, 50], ccs_policeman: [30, 50] });
  configure(sim);
  sim.call('crew casualty destination scene');
  sim.flush();
  return sim;
};
const NOSE_L_TO_R = ['ccs_str_L', 'ccs_nose_L', 'ccs_nose_C', 'ccs_nose_R', 'ccs_str_R', 'ccs_door'];

// ---- behavior ---------------------------------------------------------------------------------
{
  // Plan: the worst casualty is loaded; the pilot walks when alive and not loaded, otherwise the copilot.
  const sim = new Sim();
  Object.assign(sim.locals, { CREW: 4, CREW_LIFESCORE_1: 100, CREW_LIFESCORE_2: 0, CREW_LIFESCORE_3: 100, CREW_LIFESCORE_4: 7, CREW_LIFESCORE_5: 100 });
  sim.call('crew casualty plan');
  assert.deepEqual([sim.locals.CCS_LOAD_MEMBER, sim.locals.CCS_CASUALTY_COUNT, sim.locals.CCS_DEAD_COUNT, sim.locals.CCS_WALK_MEMBER], [2, 2, 1, 1]);
  sim.locals.CREW_LIFESCORE_1 = 0; sim.locals.CREW_LIFESCORE_2 = 100; sim.locals.CREW_LIFESCORE_4 = 100;
  sim.call('crew casualty plan');
  assert.deepEqual([sim.locals.CCS_LOAD_MEMBER, sim.locals.CCS_CASUALTY_COUNT, sim.locals.CCS_WALK_MEMBER], [1, 1, 3], 'a dead pilot is replaced by the copilot');
  sim.presence[3] = 0; sim.call('crew casualty plan');
  assert.equal(sim.locals.CCS_WALK_MEMBER, 0, 'nobody walks when neither the pilot nor the copilot is available');
  sim.presence = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0 }; sim.locals.CREW_LIFESCORE_1 = 5; sim.locals.CREW_LIFESCORE_3 = 8;
  sim.call('crew casualty plan');
  assert.deepEqual([sim.locals.CCS_LOAD_MEMBER, sim.locals.CCS_DEAD_COUNT, sim.locals.CCS_WALK_MEMBER], [1, 0, 3], 'a critical (not dead) crew member is a casualty too, the lowest score is loaded');
  sim.presence[2] = 0; sim.locals.CREW_LIFESCORE_2 = 0; sim.locals.CREW_LIFESCORE_1 = 100; sim.locals.CREW_LIFESCORE_3 = 100;
  sim.call('crew casualty plan');
  assert.equal(sim.locals.CCS_CASUALTY_COUNT, 0, 'a dead member that is not aboard (replaced object on scene) is not loaded');
}
{
  // One dead medic, stretcher and medic start on the left, the casualty door is on the right: around the nose, never across.
  const sim = scene((s) => {
    s.locals.CREW_LIFESCORE_2 = 0; s.pos.ccs_stretcher = [-3, 50]; s.pos.ccs_medic = [-3, 50]; s.pos.ccs_policeman = [30, 50];
  });
  assert.deepEqual(sim.drives('ccs_stretcher')[0], ['drive', 'ccs_stretcher', 1, NOSE_L_TO_R], 'stretcher on the left, door on the right (pax_right): around the nose');
  const open = sim.index((e) => e[0] === 'open_door' && e[1] === 'pax_right');
  const release = sim.index((e) => e[0] === 'trigger' && e[1] === 'H:{local:HXX}_SDK_PAX_3_OFF');
  const loaded = sim.index((e) => e[0] === 'setvar' && e[1] === 'ccs_stretcher' && e[2] === 'VAR 2' && e[3] === 3);
  const arrive = sim.index((e) => e[0] === 'drive' && e[1] === 'ccs_stretcher');
  assert.ok(open >= 0 && open < arrive, 'the casualty door is opened before the stretcher arrives');
  assert.ok(sim.index((e) => e[0] === 'drive' && e[1] === 'ccs_stretcher') < release && release < loaded, 'the stretcher arrives, the person disappears from the seat, then appears on the stretcher');
  assert.ok(sim.index((e) => e[0] === 'close_door' && e[1] === 'pax_right') > loaded);
  assert.ok(sim.events('trigger').some((e) => e[1] === 'H:{local:HXX}_SDK_PAX_3_OFF'));
  assert.ok(!sim.events('setlvar').some((e) => String(e[1]).startsWith('PAYLOAD STATION WEIGHT')), 'the station weight follows the seat LVAR (thread STATION WEIGHTS), the casualty macro writes none');
  const back = sim.drives('ccs_stretcher')[1];
  assert.deepEqual(back[3], ['ccs_str_R', 'ccs_nose_R', 'ccs_nose_C', 'ccs_nose_L', 'ccs_str_L', 'ambulance5@180/2.5'], 'the stretcher returns around the nose and enters the ambulance by the rear');
  assert.ok(sim.events('destroy').some((e) => e[1] === 'ccs_stretcher'), 'the loaded stretcher disappears into the ambulance');
  assert.ok(sim.index((e) => e[0] === 'destroy' && e[1] === 'ccs_stretcher') > sim.index((e) => e[0] === 'drive' && e[1] === 'ccs_stretcher' && e[3].at(-1) === 'ambulance5@180/2.5'));
  // policeman and medic go to the closest side, on different stage points, and face the helicopter
  assert.deepEqual(sim.drives('ccs_policeman')[0][3], ['ccs_pol_R'], 'policeman at the right of the helicopter walks to the right side');
  assert.deepEqual(sim.drives('ccs_medic')[0][3], ['ccs_med_L']);
  assert.equal(sim.log.filter((e) => e[0] === 'point_object' && e[1] === 'ccs_policeman' && e[2] === '$USER').length, 1);
  // single casualty: the pilot (door on the right) walks to the policeman (on the right): direct
  assert.deepEqual(sim.drives('pilot')[0], ['drive', 'pilot', 16, ['ccs_policeman@0/2.5']], 'same side: direct');
  assert.ok(sim.log.some((e) => e[0] === 'point_object' && e[1] === 'ccs_policeman' && e[2] === 'pilot'), 'the policeman points at the pilot');
  assert.deepEqual(sim.log.at(-2), ['end menu']);
  assert.equal(sim.locals.MISSION_END_WAITING, 1);
  assert.deepEqual(sim.log.at(-1), ['set_dispatch_dialog', 1, undefined]);
}
{
  // The policeman is on the left: the pilot walks around the nose, never through the helicopter.
  const sim = scene((s) => { s.locals.CREW_LIFESCORE_2 = 0; s.pos.ccs_policeman = [-30, 50]; });
  assert.deepEqual(sim.drives('pilot')[0][3], ['ccs_nose_R', 'ccs_nose_C', 'ccs_nose_L', 'ccs_policeman@0/2.5']);
  assert.equal(sim.events('open_door').filter((e) => e[1] === 'cockpit_right').length, 0, 'the pilot door is opened by the user (gate on SDK_DOOR_COCKPIT_R), not by the scene');
}
{
  // Dead pilot: loaded through the right cockpit door; the copilot walks out of the left door.
  const sim = scene((s) => { s.locals.CREW_LIFESCORE_1 = 0; s.pos.ccs_policeman = [30, 50]; });
  assert.ok(sim.events('open_door').some((e) => e[1] === 'cockpit_right'));
  assert.ok(sim.events('trigger').some((e) => e[1] === 'H:{local:HXX}_SDK_PILOT_CAPT_OFF'));
  assert.ok(sim.events('open_door').some((e) => e[1] === 'cockpit_left'), 'the copilot door is opened by the scene');
  assert.ok(sim.events('trigger').some((e) => e[1] === 'H:{local:HXX}_SDK_PILOT_FO_OFF'));
  assert.equal(sim.drives('pilot').length, 0);
  assert.deepEqual(sim.drives('copilott')[0][3], ['ccs_nose_L', 'ccs_nose_C', 'ccs_nose_R', 'ccs_policeman@0/2.5'], 'copilot door on the left, policeman on the right: around the nose');
  assert.equal(sim.locals.COPILOT, 0);
}
{
  // Two casualties: one is loaded, nobody walks, the end menu follows.
  const sim = scene((s) => { s.locals.CREW_LIFESCORE_2 = 0; s.locals.CREW_LIFESCORE_4 = 3; s.pos.ccs_policeman = [30, 50]; });
  assert.equal(sim.locals.CCS_LOAD_MEMBER, 2);
  assert.equal(sim.events('drive').filter((e) => e[1] === 'ccs_stretcher').length, 2, 'only one stretcher trip');
  assert.equal(sim.drives('pilot').length + sim.drives('copilott').length, 0, 'no walk with more than one casualty');
  assert.deepEqual(sim.log.at(-2), ['end menu']);
}
{
  // The stretcher side equals the door side: no nose route.
  const sim = scene((s) => { s.locals.CREW_LIFESCORE_4 = 0; s.pos.ccs_stretcher = [-3, 50]; });
  assert.deepEqual(sim.drives('ccs_stretcher')[0][3], ['ccs_str_L', 'ccs_door']);
  assert.deepEqual(sim.drives('ccs_stretcher')[1][3], ['ccs_str_L', 'ambulance5@180/2.5']);
}
{
  // Vehicles are created once, whoever asks first.
  const police = new Sim();
  police.locals.CCS_CASUALTY_COUNT = 0;
  police.call('crew casualty scene vehicles');
  assert.equal(police.events('create').filter((e) => e[1] === 'ambulance5' || e[1] === 'ccs_medic' || e[1] === 'ccs_stretcher').length, 0, 'no casualty aboard: the police alone, no ambulance');
  assert.equal(police.events('create').filter((e) => e[1] === 'police7' || e[1] === 'ccs_policeman').length, 2);
  const sim = new Sim();
  sim.locals.CCS_CASUALTY_COUNT = 1;
  sim.call('crew casualty scene vehicles'); sim.call('crew casualty scene vehicles');
  assert.equal(sim.events('create').filter((e) => e[1] === 'ambulance5').length, 1);
  assert.equal(sim.events('move').filter((e) => e[1] === 'ambulance5' && e[2] === 'ccs_site@20/50').length, 1);
  assert.equal(sim.events('move').filter((e) => e[1] === 'police7' && e[2] === 'ccs_site@340/50').length, 1);
  assert.equal(sim.locals.ccs_vehicles_ready, 'yes');
}
{
  // Deceased patient aboard: police car and policeman 50 m from the landing point, once per mission; the ambulance is the one of the destination scene.
  assert.ok(/^[\x20-\x7e]*$/.test(text('deceased patient police scene')));
  const hooks = Object.entries(macros).filter(([, commands]) => JSON.stringify(commands).includes('"call_macro":"deceased patient police scene"')).map(([name]) => name);
  assert.deepEqual(hooks.sort(), ['User predestination', 'crew hospital police watch'], `one patient hook and one crew hook expected: ${hooks}`);
  assert.ok(JSON.stringify(macros['User predestination']).includes('"local":"patientlife"},"eq":"died"'), 'the police is requested only for a deceased patient');
  assert.ok(JSON.stringify(macros['crew hospital police watch']).includes('"local":"CCS_DEAD_COUNT"},"gt":0'), 'or for a dead crew member aboard');
  const sim = new Sim();
  sim.locals.ccs_police_ready = 'no';
  sim.pos.ccs_site = [0, 0];
  sim.call('deceased patient police scene'); sim.call('deceased patient police scene');
  assert.equal(sim.events('create').filter((e) => e[1] === 'police7').length, 1);
  assert.equal(sim.events('create').filter((e) => e[1] === 'ccs_policeman').length, 1);
  assert.equal(sim.events('create').filter((e) => e[1] === 'ambulance5').length, 0, 'the ambulance of the normal destination scene is not duplicated');
  assert.equal(sim.events('move').filter((e) => e[1] === 'police7' && e[2] === 'ccs_site@340/50').length, 1);
  // The guard: after the unloading, at the first sign of departure the policeman walks 12 m to bearing 300 or 30 (closest) and faces the user.
  const guard = (configure) => { const s = new Sim(); s.objects.add('ccs_policeman'); s.vars['L:SAVED'] = 1; configure(s); s.call('deceased patient police guard'); return s; };
  const closest = [{ closest: [{ bearing: 300, dist: 12 }, { bearing: 30, dist: 12 }], to: 'ccs_policeman' }];
  for (const [rotor, rpm, go] of [[1, 6, true], [1, 4, false], [0, 87, true], [0, 85, false]]) {
    const s = new Sim(); s.objects.add('ccs_policeman'); s.vars['L:SAVED'] = 1; s.locals.GNDOPS_ROTOR = rotor; s.vars['L:{local:HXX}_SDK_ROTOR_RPM'] = rpm; s.vars['L:{local:HXX}_SDK_OH_FUEL_ENG1_PRIME'] = 0; s.vars['L:{local:HXX}_SDK_OH_FUEL_ENG2_PRIME'] = 0;
    if (go) { s.call('deceased patient police guard'); assert.deepEqual(s.events('drive')[0].slice(1, 3), ['ccs_policeman', 1], 'walking state'); assert.deepEqual(s.events('drive')[0][3], [JSON.stringify(closest[0])]); assert.deepEqual(s.events('point_object')[0].slice(1, 3), ['ccs_policeman', '$USER']); }
    else assert.throws(() => s.call('deceased patient police guard'), /none of the alternative waits/, 'NR below the threshold does not move the policeman');
  }
  for (const pump of ['L:{local:HXX}_SDK_OH_FUEL_ENG1_PRIME', 'L:{local:HXX}_SDK_OH_FUEL_ENG2_PRIME']) {
    const s = guard((x) => { x.locals.GNDOPS_ROTOR = 0; x.vars['L:{local:HXX}_SDK_ROTOR_RPM'] = 0; x.vars[pump] = 1; });
    assert.equal(s.events('drive').length, 1, 'a prime pump ON is enough');
  }
  assert.throws(() => guard((x) => { x.vars['L:SAVED'] = 0; x.locals.GNDOPS_ROTOR = 0; x.vars['L:{local:HXX}_SDK_ROTOR_RPM'] = 100; }), /would never finish|not satisfied|none of the alternative waits/, 'nothing happens before the patient is delivered or the crew handed over');
  const crewDone = guard((x) => { x.vars['L:SAVED'] = 0; x.locals.CHS_UNLOADED = 'yes'; x.locals.GNDOPS_ROTOR = 0; x.vars['L:{local:HXX}_SDK_ROTOR_RPM'] = 100; });
  assert.equal(crewDone.events('drive').length, 1, 'the end of the crew handover releases the policeman as the patient delivery does');
}
{
  // No dispatch is accepted during a crew emergency, and nothing is changed by the refusal.
  const sim = new Sim();
  const result = sim.call('accept_dispatch');
  assert.equal(result, 1);
  assert.equal(sim.vars['L:DISPATCH_PHASE'], undefined);
  assert.ok(sim.events('set_message')[0][1].startsWith('DISPATCH NOT AVAILABLE'));
}
{
  // Second dispatch while the crew is outside: positions stored, crew boarded from there after the reload, flags consumed.
  const sim = new Sim();
  sim.locals.CREW = 4;
  for (const name of ['pax1', 'pax3', 'pilot']) { sim.objects.add(name); }
  Object.assign(sim.pos, { pax1: [11, 4], pax3: [12, 5], pilot: [13, 6] });
  sim.call('crew reboard snapshot');
  assert.equal(sim.vars['L:REBOARD_PAX1_ON'], 1); assert.equal(sim.vars['L:REBOARD_PAX3_ON'], 1); assert.equal(sim.vars['L:REBOARD_PILOT_ON'], 1);
  assert.equal(sim.vars['L:REBOARD_PAX2_ON'], 0); assert.equal(sim.vars['L:REBOARD_COPILOT_ON'], 0);
  assert.deepEqual([sim.vars['L:REBOARD_PAX1 LAT'], sim.vars['L:REBOARD_PAX1 LON']], [11, 4]);
  // reload: the objects are gone, the LVARs stay
  sim.objects.clear(); sim.log.length = 0;
  sim.vars['L:REBOARD_PAX1 LAT'] = 11; sim.vars['L:REBOARD_PAX1 LON'] = 4;
  sim.call('crew reboard interrupted crew');
  const creates = sim.events('create');
  assert.deepEqual(creates.map((e) => e[1]), ['pax1', 'pax3', 'pilot']);
  for (const [name, door, trigger, v1] of [['pax1', 'lpaxdoor', 'H:{local:HXX}_SDK_PAX_1_ON', 2], ['pax3', 'rpaxdoor', 'H:{local:HXX}_SDK_PAX_3_ON', 3], ['pilot', 'rcocdoor', 'H:{local:HXX}_SDK_PILOT_CAPT_ON', 16]]) {
    const off = trigger.replace(/_ON$/, '_OFF');
    assert.ok(sim.index((e) => e[0] === 'trigger' && e[1] === off) >= 0 && sim.index((e) => e[0] === 'trigger' && e[1] === off) < sim.index((e) => e[0] === 'create' && e[1] === name), 'the seat is released before the crew walks in, so the start sequence cannot leave a second person in it');
    const drive = sim.drives(name)[0];
    assert.deepEqual(drive[3], [door], `${name} walks back to its door`);
    assert.equal(drive[2], v1, `${name} uses the documented walking state`);
    assert.ok(sim.events('trigger').some((e) => e[1] === trigger));
    assert.ok(sim.index((e) => e[0] === 'drive' && e[1] === name) < sim.index((e) => e[0] === 'destroy' && e[1] === name));
  }
  for (const flag of ['PAX1', 'PAX2', 'PAX3', 'COPILOT', 'PILOT']) assert.equal(sim.vars[`L:REBOARD_${flag}_ON`], 0, 'the flags are consumed');
  // nothing stored, nothing done
  const idle = new Sim(); idle.call('crew reboard interrupted crew');
  assert.equal(idle.log.length, 0);
}
{
  // 3-crew pax3 keeps the documented pilot states (16 walking, 14 standing before and after), 4/5-crew uses the rear crew states.
  const sim = new Sim(); sim.locals.CREW = 3; sim.objects.add('pax3'); sim.pos.pax3 = [1, 1];
  sim.call('crew reboard snapshot'); sim.objects.clear(); sim.log.length = 0; sim.call('crew reboard interrupted crew');
  assert.equal(sim.drives('pax3')[0][2], 16);
  assert.deepEqual(sim.events('setvar').filter((e) => e[1] === 'pax3' && e[2] === 'VAR 1').map((e) => e[3]), [14, 14]);
}

{
  // Plan thresholds: injured (police) at 20 or less, casualty (ambulance) at 10 or less, handed over members are ignored.
  const sim = new Sim();
  Object.assign(sim.locals, { CREW: 4, CREW_LIFESCORE_1: 100, CREW_LIFESCORE_2: 100, CREW_LIFESCORE_3: 20, CREW_LIFESCORE_4: 100, CREW_LIFESCORE_5: 100 });
  const counts = () => { sim.call('crew casualty plan'); return [sim.locals.CCS_INJURED_COUNT, sim.locals.CCS_CASUALTY_COUNT, sim.locals.CCS_LOAD_MEMBER]; };
  assert.deepEqual(counts(), [1, 0, 0], '20 is injured (police), not a casualty');
  sim.locals.CREW_LIFESCORE_3 = 21; assert.deepEqual(counts(), [0, 0, 0], 'above 20 nobody is met');
  sim.locals.CREW_LIFESCORE_3 = 11; assert.deepEqual(counts(), [1, 0, 0], '11 is injured only');
  sim.locals.CREW_LIFESCORE_3 = 10; assert.deepEqual(counts(), [1, 1, 3], '10 is a casualty (ambulance)');
  sim.locals.CCS_DONE_3 = 1; assert.deepEqual(counts(), [0, 0, 0], 'a handed over member is ignored');
  assert.ok(collect(macros['crew casualty load member'], (c) => c.set?.local === 'CCS_DONE_3').length === 1, 'the base load marks the member as handed over');
}
{
  // Base scene need: police after a crew emergency or with somebody hurt aboard, nothing otherwise.
  const need = (configure) => {
    const sim = new Sim();
    Object.assign(sim.locals, { CREW_LIFESCORE_SHIFT_ACTIVE: 'yes', CREW_EMERGENCY_ACTIVE: 'no', CREW_LIFESCORE_1: 100, CREW_LIFESCORE_2: 100, CREW_LIFESCORE_3: 100, CREW_LIFESCORE_4: 100, CREW_LIFESCORE_5: 100 });
    configure(sim); sim.call('crew base scene need'); return sim.locals.CCS_BASE_NEED;
  };
  assert.equal(need(() => {}), 'no', 'a normal return to base keeps the normal deboarding');
  assert.equal(need((s) => { s.locals.CREW_LIFESCORE_4 = 15; }), 'yes', 'a hurt crew member (20 or less) is met by the police');
  assert.equal(need((s) => { s.locals.CREW_EMERGENCY_ACTIVE = 'yes'; }), 'yes', 'after a crew emergency the police waits at the base');
  assert.equal(need((s) => { s.locals.CREW_LIFESCORE_SHIFT_ACTIVE = 'no'; s.locals.CREW_LIFESCORE_4 = 3; }), 'no', 'no crew lifescore shift, nothing is evaluated');
}
{
  // Base scene without any casualty aboard (everybody was handed over at the hospital): police only, the pilot walks to the policeman.
  const sim = scene(() => {});
  assert.equal(sim.drives('ccs_medic').length + sim.drives('ccs_stretcher').length, 0, 'no medic and no stretcher without a casualty aboard');
  assert.deepEqual(sim.drives('ccs_policeman')[0][3], ['ccs_pol_R'], 'the policeman walks to the side closest to him');
  assert.equal(sim.drives('pilot').length, 1, 'the pilot walks to the policeman');
  assert.deepEqual(sim.log.at(-2), ['end menu']);
}

// ---- crew emergency: Divert / Continue ---------------------------------------------------------
const calls = (sim, name) => sim.log.filter((e) => e[0] === 'call' && e[1] === name);
const emergencyBase = () => {
  const s = new Sim();
  Object.assign(s.locals, { CREW_EMERGENCY_ACTIVE: 'no', CREW_DIVERT: 'no', DISPATCHER_AUTO: 0, MISSION_PHASE: 4 });
  s.vars['L:HOISTED'] = 0; s.vars['L:DISPATCH_PHASE'] = 3;
  s.stubs['replace deceased crew object'] = () => {};
  return s;
};
{
  // A death diverts at once; a patient not loaded yet stays: the dispatcher tasks another unit.
  const s = emergencyBase();
  s.call('crew emergency response', { member: 2, cause: 'CRASH', score: 0 });
  assert.deepEqual([s.locals.CREW_DIVERT, s.locals.CREW_EMERGENCY_FATAL, s.locals.MISSION_FAILED, s.locals.MISSION_PHASE, s.vars['L:DISPATCH_PHASE']], ['yes', 'yes', 'CREW_FATAL', 8, 7]);
  assert.equal(s.modals.length, 0, 'no choice for a death');
  assert.equal(s.threads.length, 1, 'the route to care starts');
  const message = calls(s, 'post dispatcher message');
  assert.equal(message.length, 2, 'the crew reports the abort, then the dispatcher answers');
  assert.equal(message[0][2].from, 'crew', 'the abort is reported by the crew (sender -OUT-)');
  assert.ok(/Mission aborted/.test(message[0][2].text) && /another unit/.test(message[0][2].text), message[0][2].text);
  assert.ok(message[1][2].from === undefined || message[1][2].from === null, 'the answer is the dispatcher');
  assert.ok(/Copy\. Mission cancelled\. .+ tasked to the scene\.$/.test(message[1][2].text), message[1][2].text);
  s.call('crew emergency divert'); assert.equal(s.threads.length, 1, 'diverting twice does nothing');
  // With the patient aboard (or the transport phase) nobody is left behind: the crew only reports the diversion, the dispatcher has nothing to task.
  const aboard = emergencyBase(); aboard.vars['L:HOISTED'] = 1;
  aboard.call('crew emergency response', { member: 2, cause: 'CRASH', score: 0 });
  assert.equal(calls(aboard, 'post dispatcher message').length, 1);
  assert.equal(calls(aboard, 'post dispatcher message')[0][2].from, 'crew');
  assert.match(calls(aboard, 'post dispatcher message')[0][2].text, /Diverting to hospital/);
  const transport = emergencyBase(); transport.locals.MISSION_PHASE = 9;
  transport.call('crew emergency response', { member: 2, cause: 'CRASH', score: 0 });
  assert.equal(calls(transport, 'post dispatcher message').length, 1);
}
{
  // A critical (alive) member: the user chooses. Continue keeps the mission; only a later death diverts.
  const s = emergencyBase();
  s.call('crew emergency response', { member: 1, cause: 'CRASH', score: 8 });
  assert.deepEqual([s.locals.CREW_DIVERT, s.locals.CREW_EMERGENCY_ACTIVE, s.locals.MISSION_FAILED, s.locals.MISSION_PHASE], ['no', 'yes', 'CREW_CRITICAL', 4], 'nothing is cancelled before the choice');
  assert.equal(s.modals.length, 1);
  assert.deepEqual(s.modals[0].options.map((o) => o.text), ['Divert to hospital', 'Continue mission']);
  s.run(s.modals[0].options[1].commands);
  assert.deepEqual([s.locals.CREW_CONTINUE_CHOSEN, s.locals.CREW_DIVERT], ['yes', 'no']);
  s.call('crew emergency response', { member: 4, cause: 'CRASH', score: 5 });
  assert.equal(s.modals.length, 1, 'a second critical member does not ask again');
  assert.equal(s.locals.CREW_DIVERT, 'no');
  s.call('crew emergency response', { member: 2, cause: 'CRASH', score: 0 });
  assert.deepEqual([s.locals.CREW_DIVERT, s.locals.MISSION_FAILED, s.locals.CREW_EMERGENCY_MEMBER], ['yes', 'CREW_FATAL', 2], 'a death after Continue diverts');
  const d = emergencyBase();
  d.call('crew emergency response', { member: 1, cause: 'CRASH', score: 8 });
  d.run(d.modals[0].options[0].commands);
  assert.equal(d.locals.CREW_DIVERT, 'yes');
  assert.equal(d.locals.MISSION_PHASE, 8);
}
{
  // With the patient aboard the answer would change nothing (the hospital is the destination, a critical member is handed over there):
  // no question, the mission simply continues. Before the pick up and after the delivery the question stays.
  const aboard = emergencyBase(); aboard.vars['L:HOISTED'] = 1; aboard.vars['L:SAVED'] = 0; aboard.locals.MISSION_PHASE = 8;
  aboard.call('crew emergency response', { member: 2, cause: 'CRASH', score: 3 });
  assert.equal(aboard.modals.length, 0, 'no Divert or Continue question with a patient aboard');
  assert.deepEqual([aboard.locals.CREW_CONTINUE_CHOSEN, aboard.locals.CREW_DIVERT, aboard.locals.CREW_EMERGENCY_ACTIVE, aboard.locals.MISSION_PHASE], ['yes', 'no', 'yes', 8], 'the mission continues');
  const delivered = emergencyBase(); delivered.vars['L:HOISTED'] = 1; delivered.vars['L:SAVED'] = 1;
  delivered.call('crew emergency response', { member: 2, cause: 'CRASH', score: 3 });
  assert.equal(delivered.modals.length, 1, 'after the delivery the question stays (divert to a hospital or go on to the base)');
  const before = emergencyBase(); before.vars['L:HOISTED'] = 0;
  before.call('crew emergency response', { member: 2, cause: 'CRASH', score: 3 });
  assert.equal(before.modals.length, 1, 'before the pick up the question stays (Divert cancels the mission)');
}
{
  // Confirmation menu of the hospital.
  const s = new Sim();
  s.stubs['Choose manual type modal'] = () => {};
  s.call('crew emergency destination menu');
  assert.equal(s.modals.length, 1);
  assert.ok(s.log.some((e) => e[0] === 'set_message' && /No hospital found/.test(e[1])));
  s.run(s.modals[0].options[1].commands);
  assert.notEqual(s.locals.CREW_DEST_CONFIRMED, 'yes', 'accept without a hospital does not confirm');
  s.pos.hospital_user = [0, 0]; s.locals.hospital_name = 'Test hospital';
  s.run(s.modals[0].options[1].commands);
  assert.equal(s.locals.CREW_DEST_CONFIRMED, 'yes');
}

// ---- hospital: route, unloading, return to base -----------------------------------------------------------
const hospital = (configure) => {
  const s = new Sim();
  Object.assign(s.locals, { CREW: 4, CREW_EMERGENCY_ACTIVE: 'yes', CREW_DIVERT: 'yes', CREW_MISSION_TERMINATED: 'no', hospital_wptot: 0, GNDOPS_ROTOR: 1, CREW_LIFESCORE_1: 100, CREW_LIFESCORE_2: 100, CREW_LIFESCORE_3: 100, CREW_LIFESCORE_4: 100, CREW_LIFESCORE_5: 100 });
  s.pos.hospital_user = [0, 0]; s.pos.hospital = [0, 0]; s.pos.hospital_door = [0, 7]; s.pos.hospital_wp1 = [3, 3]; s.pos.hospital_wp2 = [6, 6]; s.pos.hospital_wp3 = [9, 9];
  s.globals.FORCE_AMBULANCE = 'no'; s.vars['L:POI_TYPE'] = 2; s.vars['L:HOISTED'] = 0; s.vars['L:SAVED'] = 0;
  s.stubs['board crew after emergency'] = () => { s.locals.CREW_EMERGENCY_BOARDING_DONE = 'yes'; };
  s.stubs['crew emergency destination menu'] = () => { s.locals.CREW_DEST_CONFIRMED = 'yes'; };
  for (const name of ['user hospital WP', 'routeupdate', 'manual_hospital_destination_setup', 'Query closest hospital', 'return to base menu', 'crew hospital police watch', 'drive ambulance5 safe']) s.stubs[name] = () => {};
  configure(s);
  return s;
};
const runRoute = (s) => { s.call('crew emergency route to care'); s.flush(); return s; };
{
  // Patient aboard: the normal destination flow carries the route, the unloading, the ambulance rules; no crew arrival flow, no own button.
  const s = runRoute(hospital((x) => { x.vars['L:HOISTED'] = 1; x.locals.CREW_LIFESCORE_4 = 5; }));
  assert.equal(calls(s, 'manual_hospital_destination_setup').length, 1);
  assert.equal(s.locals.CHS_PATIENT_PATH, 'yes');
  assert.ok(!s.log.some((e) => e[0] === 'action'), 'the patient flow owns the ambulance button');
  assert.ok(!s.log.some((e) => e[0] === 'set_message' && /LAND AND SET ENGINES/.test(e[1])), 'no crew arrival flow');
}
{
  // Crew alone, hospital with the ambulance on request: the button appears after the confirmation and disappears at 0.2 NM.
  const s = runRoute(hospital((x) => { x.locals.CREW_LIFESCORE_2 = 0; x.locals.CREW_LIFESCORE_4 = 5; }));
  assert.equal(calls(s, 'manual_hospital_destination_setup').length, 0);
  const created = s.index((e) => e[0] === 'action' && e[1] === 'crew_ambulance_prime');
  const gone = s.index((e) => e[0] === 'destroy_action' && e[1] === 'crew_ambulance_prime');
  assert.ok(created >= 0 && gone > created, 'button created, then destroyed');
  assert.equal(s.log.filter((e) => e[0] === 'action').length, 1);
  assert.equal(s.actions.crew_ambulance_prime, undefined);
  assert.equal(s.events('create').filter((e) => e[1] === 'ambulance5').length, 0, 'no ambulance unless asked');
  // hospital unload: worst first, one stretcher and one medic per casualty, no ambulance, then the return to base
  const created1 = s.index((e) => e[0] === 'create' && e[1] === 'chs_str_1');
  const created2 = s.index((e) => e[0] === 'create' && e[1] === 'chs_str_2');
  assert.ok(created1 > 0 && created2 > created1, 'two stretchers in sequence');
  assert.ok(s.index((e) => e[0] === 'open_door' && e[1] === 'pax_right') < s.index((e) => e[0] === 'open_door' && e[1] === 'pax_left'), 'the dead medic (pax_right) first, then the rescuer (pax_left)');
  assert.ok(s.events('trigger').some((e) => e[1] === 'H:{local:HXX}_SDK_PAX_3_OFF') && s.events('trigger').some((e) => e[1] === 'H:{local:HXX}_SDK_PAX_1_OFF'));
  assert.deepEqual([s.locals.CCS_DONE_2, s.locals.CCS_DONE_4, s.locals.CCS_DONE_1, s.locals.CCS_DONE_3], [1, 1, 0, 0], 'only the casualties are handed over');
  for (const k of [1, 2]) {
    assert.deepEqual(s.drives(`chs_str_${k}`).at(-1)[3], [`chs_leave_${k}`, 'hospital_door'], 'the stretcher follows the waypoints (none here) to the hospital door and stops there');
    assert.ok(s.events('destroy').some((e) => e[1] === `chs_str_${k}`), 'the stretcher is removed at the hospital door');
    assert.ok(s.drives(`chs_str_${k}`).every((d) => d[2] === 1), 'documented walking state');
  }
  // a crew alone has no medic: one is created, once, goes to the helicopter with the first stretcher, waits there (two casualties) and follows the last one
  assert.equal(s.events('create').filter((e) => e[1] === 'chs_med_1').length, 1, 'one medic, created once');
  assert.deepEqual(s.drives('chs_med_1').map((d) => d[3].at(-1)), ['chs_mdoor_1', 'hospital_door'], 'he goes to the casualty door with the first stretcher, then walks to the hospital door with the last one only');
  assert.ok(s.drives('chs_med_1').every((d) => d[2] === 1), 'documented walking state');
  assert.deepEqual(s.drives('chs_med_1')[1][3], ['chs_leave_1', 'hospital_door']);
  assert.ok(s.events('destroy').some((e) => e[1] === 'chs_med_1') && !s.events('create').some((e) => e[1] === 'chs_med_2'), 'removed at the hospital door like the stretchers');
  // a single casualty: the medic goes with the stretcher and comes back with it
  const one = runRoute(hospital((x) => { x.locals.CREW_LIFESCORE_4 = 5; }));
  assert.deepEqual(one.drives('chs_med_1').map((d) => d[3].at(-1)), ['chs_mdoor_1', 'hospital_door']);
  assert.equal(one.events('destroy').filter((e) => e[1] === 'chs_med_1').length, 1);
  // a medic that exists (the medic of the patient) is enough: nothing is created and nobody else walks
  const exists = runRoute(hospital((x) => { x.locals.CREW_LIFESCORE_4 = 5; x.objects.add('ambumedic'); x.pos.ambumedic = [0, 0]; }));
  assert.equal(exists.events('create').filter((e) => /^chs_med_/.test(e[1])).length, 0);
  assert.equal(exists.drives('chs_med_1').length, 0);
  assert.equal(exists.drives('ambumedic').length, 0, 'the medic of the patient is not moved by the crew unload');
  assert.equal(s.locals.CHS_DELIVERED, 2);
  assert.equal(s.locals.CHS_UNLOADED, 'yes');
  const lastDestroy = Math.max(...s.log.map((e, i) => (e[0] === 'destroy' && /^chs_str_/.test(e[1]) ? i : -1)));
  assert.ok(s.index((e) => e[0] === 'call' && e[1] === 'return to base menu') > lastDestroy, 'the return to base comes after the handover of the stretchers (the medic arrives at the door on his own, nobody waits for him)');
}
{
  // Custom hospital waypoints are followed in order.
  const s = runRoute(hospital((x) => { x.locals.hospital_wptot = 2; x.locals.CREW_LIFESCORE_4 = 4; }));
  assert.deepEqual(s.drives('chs_str_1').at(-1)[3], ['chs_leave_1', 'hospital_wp1', 'hospital_wp2', 'hospital_door']);
  assert.deepEqual(s.drives('chs_med_1').at(-1)[3], ['chs_leave_1', 'hospital_wp1', 'hospital_wp2', 'hospital_door'], 'the medic follows the same waypoints');
  const t = runRoute(hospital((x) => { x.locals.hospital_wptot = 3; x.locals.CREW_LIFESCORE_4 = 4; }));
  assert.deepEqual(t.drives('chs_str_1').at(-1)[3], ['chs_leave_1', 'hospital_wp1', 'hospital_wp2', 'hospital_wp3', 'hospital_door']);
}
{
  // Ambulance requested (L:AMBULANCE 2, crew alone): the stretchers go to its rear, it shuttles to the door and back, one casualty at a time.
  const s = hospital((x) => {
    x.locals.CREW_LIFESCORE_2 = 0; x.locals.CREW_LIFESCORE_4 = 5; x.vars['L:AMBULANCE'] = 2;
    x.objects.add('ambulance5'); x.pos.ambulance5 = [20, 20]; x.pos.DAMBU = [20, 20];
    x.objects.add('ambumedic'); x.pos.ambumedic = [0, 0]; // a medic exists (the interpreter runs the threads after the flow, without time): no medic is created
    x.stubs['drive ambulance5 safe'] = (args) => { x.log.push(['ambulance drive', args.to.join()]); };
  });
  s.call('crew hospital unload'); s.flush();
  assert.equal(s.threads.length, 0);
  // the medic created for a crew alone goes to the side of the ambulance with the last stretcher only
  for (const k of [1, 2, 3, 4]) {
    const body = JSON.stringify(macros[`crew hospital deliver ambulance ${k}`]);
    assert.ok(body.includes(`{"require":{"local":"CHS_TOTAL"},"eq":${k}}`) && body.includes('"name":"chs_med_1","to":["chs_leave_1",{"bearing2":270,"dist":3,"object":"ambulance5"}]') && body.includes('"destroy_object":"chs_med_1"'), `ambulance ${k}: the medic (if any) goes with the last stretcher and is removed when the ambulance is back`);
  }
  assert.deepEqual(s.log.filter((e) => e[0] === 'ambulance drive').map((e) => e[1]), ['hospital_door', 'DAMBU', 'hospital_door', 'DAMBU']);
  assert.deepEqual(s.drives('chs_str_1').at(-1)[3].slice(-1), ['ambulance5@180/2.5']);
  assert.ok(!s.drives('chs_str_1').some((d) => d[3].includes('hospital_door')), 'with the ambulance the stretcher does not walk to the door');
  assert.equal(s.locals.CHS_DELIVERED, 2);
}
{
  // Patient flow ended with the ambulance of the patient gone: the crew calls it again, then hands over and returns to base.
  const s = hospital((x) => {
    x.locals.CREW_LIFESCORE_4 = 5; x.locals.CHS_PATIENT_PATH = 'yes'; x.vars['L:AMBULANCE'] = 2;
    x.objects.add('ambumedic'); x.pos.ambumedic = [0, 0]; // the medic of the patient exists
    x.stubs['drive ambulance5 safe'] = () => {};
  });
  s.stubs.Ambulance5 = () => { s.objects.add('ambulance5'); s.pos.ambulance5 = [0, 0]; };
  s.call('crew hospital finish'); s.flush();
  assert.equal(s.events('create').filter((e) => e[1] === 'chs_str_1').length, 1);
  assert.equal(s.vars['L:AMBULANCE'], 2);
  assert.equal(calls(s, 'return to base menu').length, 1);
  // nothing aboard to hand over: only the return to base
  const idle = hospital(() => {});
  idle.call('crew hospital finish');
  assert.equal(idle.events('create').length, 0);
  assert.equal(calls(idle, 'return to base menu').length, 1);
}
{
  // Hospital handover: the unloading sends the medic and the copilot out of their seats and the destination flow ends right after the boarding
  // trigger. The handover waits for the seat tracker to see them aboard, otherwise the critical member is not counted (169.27 tester run).
  let ticks = 0;
  const s = hospital((x) => {
    x.locals.CREW_LIFESCORE_4 = 5; x.locals.CHS_PATIENT_PATH = 'yes'; x.locals.CREW_OUT_2 = 1; x.locals.CREW_OUT_3 = 1; x.vars['L:AMBULANCE'] = 0;
    x.stubs['crew seat tracker tick'] = () => { ticks += 1; if (ticks >= 4) { x.locals.CREW_OUT_2 = 0; x.locals.CREW_OUT_3 = 0; } };
  });
  s.call('crew hospital finish'); s.flush();
  assert.equal(ticks, 4, 'the handover waited until the crew was back in the seats (and no longer)');
  assert.equal(s.events('create').filter((e) => e[1] === 'chs_str_1').length, 1, 'the critical member is handed over');
  // a member that never gets back does not block the mission for more than 30 s
  let stuck = 0;
  const t = hospital((x) => { x.locals.CREW_OUT_2 = 1; x.stubs['crew seat tracker tick'] = () => { stuck += 1; }; });
  t.call('crew hospital finish');
  assert.equal(stuck, 30);
  assert.equal(calls(t, 'return to base menu').length, 1, 'the return to base still follows');
  // a member being handed over (CCS_DONE_n) left the seat on a stretcher and is not waited for
  let handed = 0;
  const u = hospital((x) => { x.locals.CREW_OUT_2 = 1; x.locals.CCS_DONE_2 = 1; x.stubs['crew seat tracker tick'] = () => { handed += 1; }; });
  u.call('crew hospital crew back');
  assert.equal(handed, 1, 'a casualty on a stretcher is not waited for');
}
{
  // Crew casualties are extracted in parallel with the patient (crew hospital scene stretchers, called by User destination1 and 2 once the
  // rotor has stopped): the stretchers are on the scene before the ground team moves, no extra medic, seat triggers only by the unloading.
  const parallel = (configure) => hospital((x) => {
    x.vars['L:HOISTED'] = 1; x.vars['L:SAVED'] = 1; x.vars['L:AMBULANCE'] = 0; x.locals.cambuchoice = 'no';
    for (const name of ['ambumedic', 'ambustretcher']) x.objects.add(name);
    Object.assign(x.pos, { ambumedic: [10, 10], ambustretcher: [10, 7], DMED: [10, 10], DSTR: [10, 7] });
    configure(x);
  });
  const s = parallel((x) => { x.locals.CREW_LIFESCORE_2 = 3; x.locals.CREW_LIFESCORE_3 = 6; });
  s.call('crew hospital scene stretchers');
  assert.equal(s.locals.CHS_PARALLEL, 'yes');
  assert.equal(s.locals.CHS_MEDIC_HURT, 'yes', 'the medic (member 2) is a casualty: hoist_crew is hospital staff');
  assert.equal(s.locals.CHS_PAPER_HURT, 'no', 'the member of the paperwork (member 4 with four crew) is fit');
  assert.deepEqual(s.events('create').map((e) => e[1]), ['chs_str_1', 'chs_str_2'], 'one stretcher per casualty on the scene at once, no extra medic');
  const pointed = (name) => s.index((e) => e[0] === 'point_object' && e[1] === name && e[2] === 'hospital_user');
  assert.ok(pointed('ambumedic') >= 0 && pointed('ambustretcher') >= 0, 'the ground team points at hospital_user first');
  assert.ok(pointed('chs_str_1') > pointed('ambustretcher') && pointed('chs_str_2') > pointed('chs_str_1'), 'then the stretchers, which point at hospital_user too');
  assert.ok(s.index((e) => e[0] === 'create' && e[1] === 'chs_str_1') > pointed('ambustretcher'), 'the stretchers are placed after the ground team points');
  assert.equal(s.events('trigger').length, 0, 'nothing leaves a seat before the thread runs');
  const place = JSON.stringify(macros['crew hospital scene place']);
  assert.ok(place.includes('"name":"chs_str_1"') && place.includes('"bearing2":270,"dist":3,"object":"ambustretcher"'), 'first stretcher on the left (bearing2 270), 3 m from the stretcher of the patient');
  assert.ok(place.includes('"bearing2":90,"dist":3,"object":"ambumedic"') && place.includes('"bearing2":270,"dist":6,"object":"ambustretcher"') && place.includes('"bearing2":90,"dist":6,"object":"ambumedic"'), 'second on the right of the medic, the second pair 6 m');
  s.flush();
  assert.equal(s.events('create').filter((e) => /^chs_med_/.test(e[1])).length, 0, 'the medic of the patient is enough');
  assert.equal(s.events('create').filter((e) => /^chs_str_/.test(e[1])).length, 2, 'the stretchers are not created twice');
  assert.ok(s.events('trigger').some((e) => e[1] === 'H:{local:HXX}_SDK_PAX_3_OFF') && s.events('trigger').some((e) => e[1] === 'H:{local:HXX}_SDK_PILOT_FO_OFF'), 'the seats are released by the unloading of the casualties');
  assert.deepEqual([s.locals.CCS_DONE_2, s.locals.CCS_DONE_3, s.locals.CHS_DELIVERED, s.locals.CHS_UNLOADED], [1, 1, 2, 'yes']);
  assert.deepEqual(s.drives('chs_str_1').at(-1)[3], ['chs_leave_1', 'hospital_door']);
  assert.ok(s.drives('chs_str_1').every((d) => d[2] === 1) && s.drives('chs_str_2').every((d) => d[2] === 1), 'documented walking state');
  assert.equal(s.drives('chs_med_1').length + s.drives('chs_med_2').length, 0);
  assert.ok(s.events('destroy').some((e) => e[1] === 'chs_str_1') && !s.events('destroy').some((e) => /^chs_med_/.test(e[1])));
  // the stretchers leave after the patient has been handed over (L:SAVED 1)
  for (const k of [1, 2, 3, 4]) {
    const walk = macros[`crew hospital deliver walk ${k}`];
    assert.deepEqual(walk[1], { if: { local: 'CHS_PARALLEL' }, eq: 'yes', then: [{ wait_for: { var: ['L:SAVED', 'number'] }, eq: 1 }] }, `casualty ${k} leaves after the patient`);
    assert.ok(JSON.stringify(macros[`crew hospital deliver ambulance ${k}`][1]).includes('"var":["L:SAVED","number"]'));
  }
  // the handover ends the flow: it only waits for the unloading started in parallel, then returns to base
  const f = parallel((x) => { x.locals.CREW_LIFESCORE_3 = 6; x.locals.CHS_PARALLEL = 'yes'; x.locals.CHS_UNLOADED = 'no'; });
  f.threads.push({ commands: [{ set: { local: 'CHS_UNLOADED' }, value: 'yes' }], params: {} });
  f.call('crew hospital finish');
  assert.equal(f.events('create').length, 0, 'no second unloading after the patient');
  assert.equal(calls(f, 'return to base menu').length, 1);
  assert.equal(f.locals.CHS_PARALLEL, 'no');
  // no casualty at the landing: nothing changes, the roles stay with the crew
  const none = parallel(() => {});
  none.call('crew hospital scene stretchers');
  assert.deepEqual([none.locals.CHS_PARALLEL, none.locals.CHS_MEDIC_HURT, none.locals.CHS_PAPER_HURT], ['no', 'no', 'no']);
  assert.equal(none.threads.length, 0);
  // no emergency, or a destination that is not a hospital stop (ambulance meeting point): no parallel unloading
  for (const [emergency, cambu] of [['no', 'no'], ['yes', 'yes']]) {
    const x = parallel((y) => { y.locals.CREW_LIFESCORE_2 = 3; y.locals.CREW_EMERGENCY_ACTIVE = emergency; y.locals.cambuchoice = cambu; });
    x.call('crew hospital scene stretchers');
    assert.equal(x.locals.CHS_PARALLEL, 'no', `emergency ${emergency} cambuchoice ${cambu}`);
    assert.equal(x.events('create').length, 0);
  }
  // an unload without anything to hand over releases the wait of the handover
  const empty = parallel((x) => { x.locals.CHS_PARALLEL = 'yes'; x.locals.CHS_UNLOADED = 'no'; });
  empty.call('crew hospital unload');
  assert.equal(empty.locals.CHS_UNLOADED, 'yes');
}
{
  // Who of the walking members is a casualty: the medic who hands over the patient (member 2, member 5 with five crew) and the member of the
  // paperwork (member 4, the copilot with three crew). A casualty stays in the seat, the other members keep their roles.
  const roles = (crew, scores, presence = {}) => {
    const x = new Sim();
    Object.assign(x.locals, { CREW: crew, CREW_LIFESCORE_1: 100, CREW_LIFESCORE_2: 100, CREW_LIFESCORE_3: 100, CREW_LIFESCORE_4: 100, CREW_LIFESCORE_5: 100, ...scores });
    Object.assign(x.presence, { 5: crew === 5 ? 1 : 0 }, presence);
    x.call('crew casualty plan'); x.call('crew hospital handover roles');
    return [x.locals.CHS_MEDIC_HURT, x.locals.CHS_PAPER_HURT];
  };
  assert.deepEqual(roles(4, { CREW_LIFESCORE_2: 3 }), ['yes', 'no']);
  assert.deepEqual(roles(4, { CREW_LIFESCORE_4: 5 }), ['no', 'yes']);
  assert.deepEqual(roles(4, { CREW_LIFESCORE_3: 5 }), ['no', 'no'], 'the copilot does not walk with four crew');
  assert.deepEqual(roles(3, { CREW_LIFESCORE_3: 5 }), ['no', 'yes'], 'with three crew the copilot does the paperwork');
  assert.deepEqual(roles(5, { CREW_LIFESCORE_5: 2 }), ['yes', 'no'], 'with five crew the medic of the patient is member 5');
  assert.deepEqual(roles(5, { CREW_LIFESCORE_2: 2 }), ['no', 'no']);
  assert.deepEqual(roles(4, { CREW_LIFESCORE_2: 11, CREW_LIFESCORE_4: 20 }), ['no', 'no'], 'injured but not a casualty (above 10): they walk');
  assert.deepEqual(roles(4, { CREW_LIFESCORE_2: 0 }, { 2: 0 }), ['no', 'no'], 'a member that is not aboard is not a casualty');
  assert.deepEqual(roles(4, {}), ['no', 'no']);
  // the destination flows skip the seat triggers of a casualty medic and the paperwork of a casualty member, and call the scene once the rotor has stopped
  const guards = (name, trigger) => {
    const found = [];
    const walk = (node, stack) => {
      if (Array.isArray(node)) return node.forEach((item) => walk(item, stack));
      if (!node || typeof node !== 'object') return;
      if (JSON.stringify(node.trigger ?? '') === JSON.stringify(trigger) || node.set?.var?.[0] === trigger) found.push(stack.slice());
      const guard = node.if && node.if.local && /^CHS_(MEDIC|PAPER)_HURT$/.test(node.if.local) && node.ne === 'yes' ? node.if.local : null;
      for (const [key, child] of Object.entries(node)) walk(child, guard && key === 'then' ? [...stack, guard] : stack);
    };
    walk(macros[name], []);
    return found;
  };
  for (const name of ['User destination1', 'User destination2']) {
    for (const trigger of ['H:{local:HXX}_SDK_PAX_2_OFF', 'H:{local:HXX}_SDK_PAX_3_OFF', 'H:{local:HXX}_SDK_PAX_2_ON', 'H:{local:HXX}_SDK_PAX_3_ON']) {
      const found = guards(name, trigger);
      assert.ok(found.length >= 1 && found.every((stack) => stack.includes('CHS_MEDIC_HURT')), `${name}: ${trigger} only when the medic is not a casualty`);
    }
    const commands = macros[name];
    const sceneIndex = commands.findIndex((c) => c.call_macro === 'crew hospital scene stretchers');
    const gate = commands.findIndex((c) => c.if?.local === 'GNDOPS_ROTOR' && JSON.stringify(c).includes('"L:{local:HXX}_SDK_ROTOR_RPM","number"]},"lt":10'));
    const firstDrive = commands.findIndex((c) => c.create_thread && JSON.stringify(c.create_thread).includes('"name":"ambumedic","to":["DRUP"'));
    assert.ok(gate >= 0 && gate < sceneIndex && sceneIndex + 1 === firstDrive, `${name}: the casualties are placed once the rotor has stopped, right before the ground team moves`);
  }
  for (const trigger of ['H:{local:HXX}_SDK_PAX_1_OFF', 'H:{local:HXX}_SDK_PAX_1_ON', 'H:{local:HXX}_SDK_PILOT_FO_OFF', 'H:{local:HXX}_SDK_PILOT_FO_ON']) {
    const found = guards('User destination1', trigger);
    assert.ok(found.length >= 1 && found.every((stack) => stack.includes('CHS_PAPER_HURT')), `${trigger} only when the member of the paperwork is not a casualty`);
  }
}
{
  // Parallel and with the ambulance: the patient's ambulance is gone, the crew calls it, the casualties take it one at a time in order.
  const s = hospital((x) => {
    x.vars['L:HOISTED'] = 1; x.vars['L:SAVED'] = 1; x.vars['L:AMBULANCE'] = 2; x.locals.cambuchoice = 'no'; x.locals.CREW_LIFESCORE_2 = 3; x.locals.CREW_LIFESCORE_4 = 5;
    for (const name of ['ambumedic', 'ambustretcher']) x.objects.add(name);
    Object.assign(x.pos, { ambumedic: [10, 10], ambustretcher: [10, 7], DMED: [10, 10], DSTR: [10, 7] });
    x.stubs.Ambulance5 = () => { x.objects.add('ambulance5'); x.pos.ambulance5 = [0, 0]; x.pos.DAMBU = [20, 20]; x.log.push(['create', 'ambulance5']); };
    x.stubs['drive ambulance5 safe'] = (args) => { x.log.push(['ambulance drive', args.to.join()]); };
  });
  s.call('crew hospital scene stretchers'); s.flush();
  assert.equal(s.locals.CHS_UNLOADED, 'yes');
  assert.equal(s.events('create').filter((e) => e[1] === 'ambulance5').length, 1, 'one call of the ambulance');
  assert.deepEqual(s.log.filter((e) => e[0] === 'ambulance drive').map((e) => e[1]).filter((v) => /^hospital_door|^DAMBU/.test(v)), ['hospital_door', 'DAMBU', 'hospital_door', 'DAMBU'], 'one casualty at a time');
  assert.equal(s.locals.CHS_AMB_TURN, 3);
  assert.equal(s.locals.CHS_DELIVERED, 2);
  assert.equal(s.events('create').filter((e) => /^chs_med_/.test(e[1])).length, 0);
  assert.ok(!s.drives('chs_str_1').some((d) => d[3].includes('hospital_door')), 'with the ambulance the stretcher does not walk to the door');
}
{
  // The ambulance: with FORCE_AMBULANCE yes or a POI that is not a hospital it comes by itself; otherwise only by the button.
  for (const [force, poi, button] of [['yes', 2, false], ['no', 3, false], ['no', 2, true]]) {
    const s = hospital((x) => { x.globals.FORCE_AMBULANCE = force; x.vars['L:POI_TYPE'] = poi; x.stubs.Ambulance5 = () => { x.objects.add('ambulance5'); x.pos.ambulance5 = [0, 0]; }; });
    s.call('crew emergency ambulance prime');
    assert.equal(s.log.some((e) => e[0] === 'action'), button, `force=${force} poi=${poi}`);
    if (button) {
      assert.equal(s.vars['L:AMBULANCE'], undefined, 'nothing happens before the click');
      s.run(s.actions.crew_ambulance_prime.click_commands);
      assert.equal(s.vars['L:AMBULANCE'], 2);
      assert.ok(!s.actions.crew_ambulance_prime, 'the button disappears when selected');
    } else {
      assert.equal(s.vars['L:AMBULANCE'], 1);
      s.flush(); assert.equal(s.vars['L:AMBULANCE'], 2);
    }
  }
}
{
  // A dead crew member aboard is met by the police at the hospital, only then.
  for (const [score, police] of [[0, 1], [5, 0]]) {
    const s = hospital((x) => { x.locals.CREW_LIFESCORE_2 = score; x.stubs['deceased patient police scene'] = () => {}; });
    delete s.stubs['crew hospital police watch'];
    s.call('crew hospital police watch');
    assert.equal(calls(s, 'deceased patient police scene').length, police, 'score ' + score);
  }
  assert.equal(text('crew emergency route to care').split('crew hospital police watch').length, 3, 'the watch starts on both paths');
}
{
  // Crew casualties are not met by an ambulance and police scene at the hospital any more.
  const names = ['crew hospital unload', 'crew hospital arrival', 'crew hospital finish', 'crew emergency route to care'];
  for (const name of names) assert.ok(!text(name).includes('crew casualty scene vehicles') && !text(name).includes('Police7'), name);
  // the stretchers are removed at hospital_door: no end point behind it any more
  for (const k of [1, 2, 3, 4]) assert.equal(collect(macros[`crew hospital deliver walk ${k}`], (c) => c.create_location !== undefined).length, 0, `walk ${k}: no place to go after the door`);
}
{
  // 169.26 log: a crash killed the loaded patient "twice" and the patient was still alive (20.57, pure decay) because the
  // physiology pump rewrites the registry lifescore from the local LIFESCORE/LIFESCORE2/LIFESCORE3 every tick.
  const impact = macros['multipatient registry acceleration impact'];
  for (const [slot, local] of [[1, 'LIFESCORE'], [2, 'LIFESCORE2'], [3, 'LIFESCORE3']]) {
    const mirror = collect(impact, (c) => c.if?.path === 'slot' && c.eq === slot && JSON.stringify(c.then) === JSON.stringify([{ set: { local }, value: { param: 'score' } }]));
    assert.equal(mirror.length, 1, `the impact damage of slot ${slot} must also lower the local ${local}`);
  }
  assert.ok(!JSON.stringify(impact).includes('{param:'), 'no interpolated param in the impact trace');
  // A critical member is only announced: the abort text belongs to the death branch, the question to the choice macro.
  const announce = JSON.stringify(macros['crew member event announce']);
  assert.ok(!announce.includes('critical. Mission aborted') && !announce.includes('CREW CRITICAL: {0}. Mission aborted'), 'a critical member must not announce an abort before Divert or Continue');
}
{
  // The doctor estimate: gone after a Divert, and a rough total (visit + deployment, loading and return), not only the visit.
  assert.ok(collect(macros['crew emergency divert'], (c) => c.set?.local === 'MINGND' && c.value === 0).length === 1, 'Divert clears the ground operation estimate');
  const estimate = collect(macros['Ground time'], (c) => c.set?.local === 'MINGND' && c.value?.tofixed)[0];
  const sum = JSON.stringify(estimate.value.tofixed.divide[0]);
  assert.ok(sum.includes('"local":"TIMERGND"') && sum.includes('180') && sum.includes('"local":"HELOVICTIMS"'), 'the estimate adds the fixed allowances and the casualties to the visit time');
  assert.equal(collect(macros['Ground time'], (c) => c.set?.local === 'TIMERGND').length, 4, 'TIMERGND (visit pacing of the progress bar) keeps its own four writers');
}
{
  // 169.29 test: the Divert or Continue modal stayed under the dispatch page until the page hid itself near the scene, and the question went to
  // the dispatcher as a message of the crew. The page is hidden first and the question is on screen only.
  const s = emergencyBase();
  s.call('crew emergency choice');
  const hide = s.index((e) => e[0] === 'set_dispatch_dialog' && e[1] === 0);
  const modal = s.index((e) => e[0] === 'modal');
  assert.ok(hide >= 0 && modal > hide, 'the dispatch page is hidden before the modal');
  assert.equal(calls(s, 'post crew safety message').length + calls(s, 'post dispatcher message').length, 0, 'the question is not a message to the dispatcher');
  assert.equal(s.modals[0].options.length, 2);
}
{
  // The hospital handover is reported once: a second call (the 169.29 test showed the report twice, four minutes apart) neither posts nor returns to base again.
  const s = hospital(() => {});
  s.call('crew emergency return to base'); s.call('crew emergency return to base');
  assert.equal(calls(s, 'return to base menu').length, 1);
  const reports = calls(s, 'post dispatcher message');
  assert.equal(reports.length, 1);
  assert.deepEqual([reports[0][2].from, reports[0][2].text], ['crew', 'Crew handed over to the hospital. Returning to base.']);
  assert.ok(!reports.some((r) => /Cause/.test(String(r[2].text))), 'no accident cause in the handover report');
  const fresh = new Sim(); assert.equal(macros['initialize crew lifescores for shift'].some((c) => c.set?.local === 'CREW_RTB_STARTED' && c.value === 'no'), true, 'reset at every mission start');
  assert.ok(fresh);
}
{
  // The messages belong to who knows: a critical crew member is reported by the crew (-OUT-) and the route is confirmed by the crew, the dispatcher only answers.
  const senders = {};
  for (const [name, commands] of Object.entries(macros)) for (const c of collect(commands, (x) => x.call_macro === 'post dispatcher message')) senders[name] = [...(senders[name] ?? []), c.params.from ?? 'dispatcher'];
  const crewOnly = ['Ambulance destination1', 'Ambulance destination2', 'Ambulance destination hoist', 'User destination1', 'User destination hoist', 'crew emergency return to base'];
  for (const name of crewOnly) assert.deepEqual([...new Set(senders[name])], ['crew'], `${name}: the handover is a report of the crew`);
  assert.deepEqual([...new Set(senders['random VFX'])], ['fire']);
  assert.deepEqual([...new Set(senders['truck vs car'])], ['fire']);
  assert.deepEqual(senders['crew emergency divert'], ['crew', 'dispatcher', 'crew'], 'abort reported by the crew, answered by the dispatcher (patient on scene), or reported alone with the patient aboard');
  assert.deepEqual(senders['random deads'], ['crew', 'dispatcher']);
  assert.deepEqual(senders['multipatient registry tick'], ['crew', 'dispatcher'], 'a patient who dies on scene: the crew asks for the police, the dispatcher answers');
  assert.deepEqual(senders['multipatient registry live physiology step'], ['crew', 'crew', 'crew']);
  assert.deepEqual(senders['crew member event announce'], ['dispatcher'], 'after a death the dispatcher asks for the accident report');
  const route = JSON.stringify(macros['crew emergency route to care']);
  assert.ok(route.includes('"params":{"from":"crew","text":{"local":"crew_dest_text"}}') && route.includes('Proceeding to {0}.') && !route.includes('crew secured'), 'the crew reports the confirmed hospital');
  assert.ok(JSON.stringify(macros['post crew safety message']).includes('"from":"-OUT-"'));
  assert.ok(!Object.values(macros).some((m) => JSON.stringify(m).includes('Fire service reports:')), 'the sender is the fire service, no prefix in the text');
  // ASCII only and no simulator question in any of the new texts
  for (const name of ['crew emergency divert', 'crew emergency route to care', 'crew emergency return to base', 'crew emergency continue', 'crew emergency choice', 'crew member event announce', 'mission failure statistics', 'reset mission statistics']) assert.ok(/^[\x20-\x7e]*$/.test(text(name)), `${name} ASCII`);
}
{
  // Failure statistics: crew seriously injured (above 0, at or below the limit) and deceased, patients deceased only when the scene was reached.
  const run = (configure) => {
    const s = new Sim();
    Object.assign(s.locals, { CREW: 4, CREW_LIFESCORE_SHIFT_ACTIVE: 'yes', CREW_LIFESCORE_1: 100, CREW_LIFESCORE_2: 100, CREW_LIFESCORE_3: 100, CREW_LIFESCORE_4: 100, CREW_LIFESCORE_5: 3 });
    s.vars['L:OLD_HELOVICTIMS'] = 0;
    configure(s);
    s.call('mission failure statistics');
    return [s.locals.STAT_CREW_CRITICAL, s.locals.STAT_CREW_DEAD, s.locals.STAT_PATIENTS_DEAD];
  };
  assert.deepEqual(run(() => {}), [0, 0, 0], 'a healthy crew and no scene: nothing to report; member 5 does not exist with four crew');
  assert.deepEqual(run((s) => { s.locals.CREW_LIFESCORE_3 = 9; }), [1, 0, 0], 'the copilot at 9 is seriously injured');
  assert.deepEqual(run((s) => { s.locals.CREW_LIFESCORE_3 = 10; s.locals.CREW_LIFESCORE_2 = 0; s.locals.CREW_LIFESCORE_4 = 11; }), [1, 1, 0], 'the limit is included, 0 is deceased, 11 is not critical');
  assert.deepEqual(run((s) => { s.vars['L:OLD_HELOVICTIMS'] = 2; s.locals.patientlife = 'died'; s.locals.patientlife2 = 'died'; s.locals.patientlife3 = 'died'; }), [0, 0, 2], 'only the patients that existed are counted');
  assert.deepEqual(run((s) => { s.locals.patientlife = 'died'; }), [0, 0, 0], 'a patient death before the scene is not counted');
}
console.log('End of mission flow PASS: END SHIFT is the only exit, the snapshot is saved before END SHIFT and RELOAD, the end menu is offered at the base landing while the deboarding runs, second dispatch re-boards the crew from where it is, the crew emergency asks Divert or Continue, the hospital unloads the critical crew with one stretcher each (ambulance on request, custom waypoints followed) before the return to base, and the base scene loads, walks and closes in the specified order. HPG/MSFS PENDING.');
