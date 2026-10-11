const fs = require('node:fs');
const path = require('node:path');

const mission = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'everywhere_all.json'), 'utf8'));

function evaluate(value, context) {
  if (value === null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => evaluate(item, context));
  if (value.local) return context.locals[value.local];
  if (value.global) return context.globals[value.global];
  if (value.param) return context.params[value.param];
  if (value.has_object) return context.objects.has(value.has_object) ? 1 : 0;
  if (value.and) return value.and.every((item) => Boolean(evaluateCondition(item, context))) ? 1 : 0;
  if (value.or) return value.or.some((item) => Boolean(evaluateCondition(item, context))) ? 1 : 0;
  if (value.add) return value.add.reduce((total, item) => total + Number(evaluate(item, context) || 0), 0);
  if (value.subtract) return Number(evaluate(value.subtract[0], context) || 0) - Number(evaluate(value.subtract[1], context) || 0);
  if (value.clamp) {
    const number = Number(evaluate(value.clamp[0], context) || 0);
    return Math.max(Number(evaluate(value.clamp[1], context)), Math.min(Number(evaluate(value.clamp[2], context)), number));
  }
  if (value.text) return value.text;
  return value;
}

function evaluateCondition(condition, context) {
  const source = condition.require || condition.if || condition;
  const left = evaluate(source, context);
  for (const operator of ['eq', 'ne', 'gt', 'gte', 'lt', 'lte']) {
    if (!Object.hasOwn(condition, operator)) continue;
    const right = evaluate(condition[operator], context);
    if (operator === 'eq') return left === right;
    if (operator === 'ne') return left !== right;
    if (operator === 'gt') return left > right;
    if (operator === 'gte') return left >= right;
    if (operator === 'lt') return left < right;
    if (operator === 'lte') return left <= right;
  }
  return Boolean(left);
}

function execute(commands, context) {
  for (const command of commands || []) {
    if (command.if) {
      execute(evaluateCondition(command, context) ? command.then : command.else, context);
      continue;
    }
    if (command.set?.local) {
      context.locals[command.set.local] = evaluate(command.value, context);
      continue;
    }
    if (command.set?.global) {
      context.globals[command.set.global] = evaluate(command.value, context);
      continue;
    }
    if (command.call_macro) {
      if (!mission.macros[command.call_macro]) continue;
      const previous = context.params;
      context.params = Object.fromEntries(Object.entries(command.params || {}).map(([key, value]) => [key, evaluate(value, context)]));
      execute(mission.macros[command.call_macro], context);
      context.params = previous;
      continue;
    }
    if (command.create_thread) continue;
    if (command.destroy_object) context.objects.delete(command.destroy_object);
    if (command.create_object?.name) context.objects.add(command.create_object.name);
  }
}

function initialState(memberScore) {
  const locals = {
    CREW: 5,
    CREW_EMERGENCY_ACTIVE: 'no',
    CREW_LIFESCORE_TOTAL_IMPACT: 0,
    CREW_IMPACT_OBJECT: 'pax3',
    HELIRESCUER_BOARDED: 0,
    HOIST_CABLE_PERSON_TYPE: 'crew',
  };
  for (let member = 1; member <= 5; member += 1) {
    locals[`CREW_LIFESCORE_${member}`] = member === 3 ? memberScore : 100;
    locals[`CREW_LIFESCORE_ALERT_${member}`] = 0;
  }
  return {
    globals: { HOIST_SAFETY_MONITOR: 'yes' },
    locals,
    params: {},
    objects: new Set(['pax3']),
  };
}

function apply(state, score) {
  state.params = { member: 3, score, cause: 'TEST IMPACT' };
  execute(mission.macros['apply crew lifescore impact'], state);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const monitorJson = JSON.stringify(mission.macros['start crew lifescore monitor']);
const recorderJson = JSON.stringify(mission.macros['record crew acceleration maxima']);
const fireExposureJson = JSON.stringify(mission.macros['monitor crew fire exposure']);
const hoistJson = JSON.stringify(mission.macros['apply hoist crew lifescore impact']);
const hoistDownJson = JSON.stringify(mission.macros['hoist down']);
const hoistRiskJson = JSON.stringify(mission.macros['start hoist out risk monitor']);
const hoistFatalJson = JSON.stringify(mission.macros['hoist cable casualty']);
const attachedRiskJson = JSON.stringify(mission.macros['start hoist attached risk monitor']);
const bootstrapJson = JSON.stringify(mission.macros['normalize crew health simulation setting']);
assert(monitorJson.includes('"call_macro":"record crew acceleration maxima"'), 'crew monitor does not retain acceleration maxima recording');
assert(!monitorJson.includes('CREW_ACCELERATION_DAMAGE') && !mission.macros['apply aircraft acceleration lifescore impact'], 'the small-threshold acceleration monitors (3/6/10 ft/s2) must be replaced by the crash tiers');
assert(!monitorJson.includes('"local":"MISSION_PHASE"'), 'crew monitor is still coupled to mission phase');
assert(JSON.stringify(mission.macros['apply crew lifescore impact']).includes('"global":"HOIST_SAFETY_MONITOR"'), 'crew LifeScore damage is not gated by HOIST_SAFETY_MONITOR YES');
const presenceJson = JSON.stringify(mission.macros['crew presence flags']);
const trackerJson = JSON.stringify(mission.macros['crew seat tracker tick']);
const crashApplyJson = JSON.stringify(mission.macros['apply aircraft crash lifescore impact']);
assert(presenceJson.includes('_IMPL_PILOT0') && presenceJson.includes('_SDK_CABIN_PAX_5') && presenceJson.includes('"call_macro":"crew seat tracker tick"'), 'crew presence flags must read the pilot LVAR (IMPL_PILOT0, 0 is present), the stretcher LVAR (SDK_CABIN_PAX_5, 2 is a patient) and take the other members from the seat tracker');
assert(trackerJson.includes('_IMPL_PILOT1') && trackerJson.includes('_SDK_CABIN_PAX_1') && trackerJson.includes('_SDK_CABIN_PAX_2') && trackerJson.includes('_SDK_CABIN_PAX_3'), 'seat tracker does not read the four seat LVARs (IMPL_PILOT1 where 0 is present, SDK_CABIN_PAX_1/2/3 where 1 is present)');
assert(!/_SDK_(PILOT_CAPT|PILOT_FO|PAX_\d)_ON/.test(presenceJson + trackerJson), 'crew presence still reads the HVAR event names as LVARs');
assert(crashApplyJson.includes('"local":"CREW_PATIENT_ABOARD"'), 'a patient on the stretcher does not take the aircraft impact damage');
assert([1, 2, 3, 4, 5].every((member) => crashApplyJson.includes(`"local":"CREW_PRESENT_${member}"`)), 'crash impacts do not restrict every member to its onboard presence flag');
assert(crashApplyJson.includes('"defer":1') && crashApplyJson.includes('"force":{"param":"force"}'), 'crash impacts must be deferred to one batch of events and carry the fatal-crash force flag');
const crashMonitorJson = JSON.stringify(mission.macros['monitor aircraft crash impact']) + JSON.stringify(mission.macros['crash monitor loop']);
assert(crashMonitorJson.includes('crash_ops'), 'crash impact monitor does not record crash_ops traces');
assert(['6400', '22500', '3600'].every((squared) => crashMonitorJson.includes('"gte":' + squared) || crashMonitorJson.includes('"lt":' + squared)) && ['crash_tier_3', 'crash_tier_4', 'crash_tier_5', 'crash_tier_6'].every((latch) => crashMonitorJson.includes(`"local":"${latch}"`)), 'the impact loop must trigger the minor injuries from 80 ft/s2 and the crash tiers from 150 ft/s2, and set the four crash tiers');
assert(!crashMonitorJson.includes('"require":{"var":["ACCELERATION BODY') && crashMonitorJson.includes('"local":"cm_mag2"'), 'crash impact severity must come from the sampled window, not from the first sample after the trigger');
assert(['[10,31]', '[45,61]', '[0,4]', '[3,9]', '[7,21]'].every((range) => crashApplyJson.includes(`"floor":{"rand":${range}}`)) && crashApplyJson.includes('"local":"crash_member_score"'), 'crash injury is not drawn at random for each present person (0-3 at 1 g, 3-8 at 2 g, 7-20 at 150, 10-30 at 250 and 330, 45-60 at 400)');
assert(fireExposureJson.includes('"object":"pax3","member":2'), 'pax3 exposure is not mapped to medical crew member 2');
assert(hoistJson.includes('"local":"hoist_member"') && hoistJson.includes('"value":2') && !hoistJson.includes('"member":3') && !hoistJson.includes('CREW_LIFESCORE_3'), 'the copilot (member 3) is never on the cable: the hoisted crew member is the medic (member 2) and a helirescuer is member 4 or 5');
assert(hoistRiskJson.includes('"global":"HOIST_SAFETY_MONITOR"') && hoistRiskJson.includes('"eq":"yes"'), 'hoist-out LifeScore monitoring is not gated by YES');
assert(hoistFatalJson.includes('"global":"HOIST_SAFETY_MONITOR"') && hoistFatalJson.includes('"ne":"yes"'), 'hoist cable casualties are not gated by YES');
assert(attachedRiskJson.includes('"local":"HOIST_CREW_ON_CABLE"') && attachedRiskJson.includes('"gt":0'), 'attached hoist operator monitor is not tied to the cable state');
assert(attachedRiskJson.includes('"local":"HOIST_IMPACT_RATE_FPS"') && attachedRiskJson.includes('"fn":"hoist_get_distance_from_ground:ft"'), 'attached hoist operator monitor does not derive risk from measured descent rate');
assert(!attachedRiskJson.includes('ACCELERATION BODY'), 'the attached hoist operator ground-impact monitor stays on the measured descent rate; the aircraft accelerations belong to the separate hoist cable stress monitor');
assert(attachedRiskJson.includes('"fn":"hoist_get_distance_from_ground:ft"'), 'attached hoist operator ground-impact monitor is missing');
assert(hoistDownJson.includes('"local":"HOIST_CREW_ON_CABLE"') && hoistDownJson.includes('"start hoist attached risk monitor"'), 'hoist-down cable procedure does not start the attached-person monitor');
assert(bootstrapJson.includes('"eq":"active"') && bootstrapJson.includes('"value":"yes"'), 'crew health bootstrap does not restore the canonical enabled value');
assert(!bootstrapJson.includes('"eq":"yes"'), 'crew health bootstrap still rewrites the canonical enabled value away from yes');

const ordinary = initialState(100);
apply(ordinary, 1);
assert(ordinary.locals.CREW_LIFESCORE_3 === 99, 'ordinary impact did not reduce the target member');
assert([1, 2, 4, 5].every((member) => ordinary.locals[`CREW_LIFESCORE_${member}`] === 100), 'ordinary impact changed a non-target member');
assert(ordinary.locals.CREW_EMERGENCY_ACTIVE === 'no', 'ordinary impact incorrectly triggered an emergency');
assert(ordinary.locals.CREW_LIFESCORE_ALERT_3 === 1, 'first injury/exposure warning was not recorded');

const helirescuerOne = initialState(100);
helirescuerOne.locals.CREW = 3;
helirescuerOne.locals.HELIRESCUER_BOARDED = 1;
helirescuerOne.locals.HOIST_CABLE_PERSON_TYPE = 'helirescuer';
helirescuerOne.params = { score: 1, cause: 'TEST HELIRESCUER IMPACT' };
execute(mission.macros['apply hoist crew lifescore impact'], helirescuerOne);
assert(helirescuerOne.locals.CREW_LIFESCORE_4 === 99 && helirescuerOne.locals.CREW_LIFESCORE_3 === 100, 'first helirescuer impact was not assigned to member 4');

const helirescuerTwo = initialState(100);
helirescuerTwo.locals.CREW = 3;
helirescuerTwo.locals.HELIRESCUER_BOARDED = 2;
helirescuerTwo.locals.HOIST_CABLE_PERSON_TYPE = 'helirescuer';
helirescuerTwo.params = { score: 1, cause: 'TEST HELIRESCUER IMPACT' };
execute(mission.macros['apply hoist crew lifescore impact'], helirescuerTwo);
assert(helirescuerTwo.locals.CREW_LIFESCORE_5 === 99 && helirescuerTwo.locals.CREW_LIFESCORE_3 === 100, 'second helirescuer impact was not assigned to member 5');

const disabled = initialState(100);
disabled.globals.HOIST_SAFETY_MONITOR = 'disabled';
apply(disabled, 100);
assert(disabled.locals.CREW_LIFESCORE_3 === 100, 'disabled crew-health simulation changed the hoist operator LifeScore');
assert(disabled.locals.CREW_EMERGENCY_ACTIVE === 'no', 'disabled crew-health simulation triggered a crew emergency');

const disabledHoistFatal = initialState(100);
disabledHoistFatal.globals.HOIST_SAFETY_MONITOR = 'disabled';
disabledHoistFatal.locals.CREW = 3;
disabledHoistFatal.params = { score: 100, cause: 'FATAL HOIST IMPACT' };
execute(mission.macros['apply hoist crew lifescore impact'], disabledHoistFatal);
assert(disabledHoistFatal.locals.CREW_LIFESCORE_2 === 100, 'disabled crew-health simulation lost the hoist operator');

const activeHoistFatal = initialState(100);
activeHoistFatal.locals.CREW = 3;
activeHoistFatal.params = { score: 100, cause: 'FATAL HOIST IMPACT' };
execute(mission.macros['apply hoist crew lifescore impact'], activeHoistFatal);
assert(activeHoistFatal.locals.CREW_LIFESCORE_2 === 0 && activeHoistFatal.locals.CREW_LIFESCORE_3 === 100, 'active crew-health simulation did not apply the fatal hoist loss to the medic (member 2) and left the copilot alone');

const critical = initialState(11);
apply(critical, 1);
assert(critical.locals.CREW_LIFESCORE_3 === 10, 'critical threshold did not reach exactly 10');
assert(critical.locals.CREW_EMERGENCY_ACTIVE === 'yes', 'LifeScore 10 did not trigger an emergency');
assert(critical.locals.MISSION_FAILED === 'CREW_CRITICAL', 'LifeScore 10 did not fail the mission as critical');

const fatal = initialState(5);
fatal.globals.CREW_KILLED_TOTAL = 0;
apply(fatal, 5);
assert(fatal.locals.CREW_LIFESCORE_3 === 0, 'fatal impact did not reduce LifeScore to zero');
assert(fatal.locals.CREW_EMERGENCY_ACTIVE === 'yes', 'LifeScore zero did not trigger an emergency');
assert(fatal.locals.MISSION_FAILED === 'CREW_FATAL', 'LifeScore zero did not fail the mission as fatal');
assert(fatal.globals.CREW_KILLED_TOTAL === 1, 'a crew death must be added once to the career statistics');
assert(fatal.objects.has('pax3'), 'fatal replacement did not preserve the original object name');

const survivorBoarding = initialState(0);
survivorBoarding.locals.CREW_EMERGENCY_FATAL = 'yes';
survivorBoarding.locals.CREW_IMPACT_OBJECT = 'pax3';
survivorBoarding.objects = new Set(['pax3', 'pax1', 'pax2', 'hoist_crew']);
execute(mission.macros['board crew after emergency'], survivorBoarding);
assert(survivorBoarding.objects.size === 1 && survivorBoarding.objects.has('pax3'), 'fatal recovery did not leave only the packaged deceased object on scene');


// --- per-member lock, events, RescueTrack and mission termination ---
const sentMessages = (state) => (state.messages || []);
const lowAlert = initialState(100);
apply(lowAlert, 60);
assert(lowAlert.locals.CREW_LIFESCORE_3 === 40 && lowAlert.locals.CREW_LIFESCORE_ALERT_3 === 2, 'a 40 point member did not reach the deteriorating alert');

const lockedMember = initialState(8);
lockedMember.locals.CREW_LOCK_3 = 1;
apply(lockedMember, 5);
assert(lockedMember.locals.CREW_LIFESCORE_3 === 8, 'a critical or dead member must stop taking damage');
const otherMember = initialState(100);
otherMember.locals.CREW_LOCK_3 = 1;
otherMember.params = { member: 2, score: 5, cause: 'TEST IMPACT' };
execute(mission.macros['apply crew lifescore impact'], otherMember);
assert(otherMember.locals.CREW_LIFESCORE_2 === 95, 'a locked member must not block damage to the other members');
const forced = initialState(8);
forced.locals.CREW_LOCK_3 = 1;
forced.params = { member: 3, score: 5, cause: 'TEST IMPACT', force: 1 };
execute(mission.macros['apply crew lifescore impact'], forced);
assert(forced.locals.CREW_LIFESCORE_3 === 3, 'a fatal crash must override the per-member lock');

const survivorsLeft = initialState(100);
survivorsLeft.locals.CREW_LIFESCORE_3 = 0;
survivorsLeft.locals.CREW_LIFESCORE_ALERT_3 = 0;
apply(survivorsLeft, 1);
assert(survivorsLeft.locals.CREW_EMERGENCY_ACTIVE === 'yes' && survivorsLeft.locals.CREW_ALIVE_COUNT >= 1 && survivorsLeft.locals.CREW_MISSION_TERMINATED !== 'yes', 'a death that leaves survivors must abort the mission without terminating it');

const pilotsDead = initialState(100);
pilotsDead.locals.CREW_LIFESCORE_1 = 0;
pilotsDead.locals.CREW_DEAD_1 = 1;
pilotsDead.locals.CREW_LOCK_1 = 1;
pilotsDead.locals.CREW_LIFESCORE_3 = 6;
apply(pilotsDead, 6);
assert(pilotsDead.locals.CREW_LIFESCORE_3 === 0 && pilotsDead.locals.CREW_MISSION_TERMINATED === 'yes' && pilotsDead.locals.MISSION_FAILED === 'CREW_FATAL', 'pilot and copilot both dead must terminate the mission immediately');

const rescueTrackJson = JSON.stringify(mission.macros['post crew safety message']);
assert(rescueTrackJson.includes('"param":"rescuetrack"') && rescueTrackJson.indexOf('"set_message"') < rescueTrackJson.indexOf('UpdateRescueTrack'), 'RescueTrack posting must be optional and the on-screen message unconditional');
const stateJson = JSON.stringify(mission.macros['crew member state event']);
assert(stateJson.includes('"rescuetrack":"no"') && !JSON.stringify(mission.macros['crew member event announce']).includes('"rescuetrack":"no"'), 'only the 100 and 50 point alerts may skip RescueTrack; critical and death events must post it');
assert(JSON.stringify(mission.macros['crew impact events']).includes('crew mission terminated') && JSON.stringify(mission.macros['crew emergency route to care']).includes('CREW_MISSION_TERMINATED'), 'a terminated mission must stop the care route');

// --- aircraft failures: table restored from the original, used by the failure engine and the crash tiers ---
const originalMission = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'starting point', 'baseline-0.997-original-fully-functional.json'), 'utf8'));
const originalBranches = originalMission.macros['failure engine'][0].create_thread.commands[0].do.filter((c) => c.if && c.if.var && c.if.var[0] === 'L:FAILURE');
const failureTable = mission.macros['apply aircraft failure'].filter((c) => c.if);
assert(originalBranches.length === 28 && failureTable.length === 39, 'the aircraft failure table must keep the 28 original codes and add the 11 codes 30 to 40 (the fuel leakage code 29 has its own macro; tools/test-failure-ladder.js)');
assert(failureTable.slice(28).map((branch) => branch.eq).join(',') === '30,31,32,33,34,35,36,37,38,39,40', 'the added failure codes must be 30 to 40, after the original ones');
assert(originalBranches.every((branch, index) => JSON.stringify(branch.then) === JSON.stringify(failureTable[index].then) && branch.eq === failureTable[index].eq), 'an aircraft failure code does not match the original damage');
const failureEngineJson = JSON.stringify(mission.macros['failure engine']);
assert(failureEngineJson.includes('"global":"ENGINE_FAILURES_ENABLED"') && !failureEngineJson.includes('"global":"DIFFICULTY"') && failureEngineJson.includes('"call_macro":"apply aircraft failure"') && failureEngineJson.includes('"sleep":[120,3600]'), 'failure engine must apply the L:FAILURE code under ENGINE_FAILURES_ENABLED');
const crashFailureJson = JSON.stringify(mission.macros['crash random failures']);
assert(crashFailureJson.includes('"global":"ENGINE_FAILURES_ENABLED"') && crashFailureJson.includes('"call_macro":"apply ladder failure"') && crashFailureJson.includes('"first":{"param":"first"},"last":{"param":"last"}'), 'crash failures must draw from the severity ladder between the levels first and last (the 28 original codes stay in apply aircraft failure)');
const failureThread = crashMonitorJson.slice(crashMonitorJson.indexOf('"local":"crash_fail_4"},"eq":1'));
assert(['crash_fail_4', 'crash_fail_5', 'crash_fail_6'].every((flag) => crashMonitorJson.includes('"set":{"local":"' + flag + '"}')), 'the crash failures must snapshot the tier latches before the single failure thread');
assert((crashMonitorJson.match(/"call_macro":"crash random failures"/g) || []).length === 3 && !crashMonitorJson.slice(0, crashMonitorJson.indexOf('"local":"crash_fail_4"')).includes('crash random failures'), 'crash failures must be applied by one sequential thread: threads sharing the failure locals overwrite each other');
assert(failureThread.includes('"first":1,"last":10') && failureThread.includes('"rand":[1,3]') && failureThread.indexOf('"first":1,"last":10') < failureThread.indexOf('"first":7,"last":11'), 'the severe tier must apply 1 to 2 failures from the lightest to the engine failure (ladder levels 1 to 10, no engine fire), before the higher tiers');
assert((failureThread.match(/"count":1,"first":7,"last":11/g) || []).length === 2, 'the two highest tiers must apply one failure each from the fuel failures to the engine fire (ladder levels 7 to 11)');
assert(crashMonitorJson.includes('"local":"cm_peak2"') && [6400, 14400, 22500].every((squared) => crashMonitorJson.includes('"gte":' + squared)) && crashMonitorJson.includes('impact_peak'), 'an impact split over several axes must reach the acceleration tiers through the sampled resultant, and the peak must be traced');
assert(['625', '2500', '8100', '22500'].every((squared) => crashMonitorJson.includes('"local":"cm_dv2"') && crashMonitorJson.includes('"gte":' + squared)) && ['X', 'Y', 'Z'].every((axis) => crashMonitorJson.includes('VELOCITY WORLD ' + axis)) && crashMonitorJson.includes('dv2={local:cm_dv2_round}'), 'the crash tiers above 150 must come from the sampled loss of world velocity (25, 50, 90 and 150 ft/s squared), not from the acceleration peak, and the loss must be traced');
assert(!/"local":"crash_peak2"\},"gte":(62500|108900|160000)/.test(crashMonitorJson), 'an acceleration peak alone must not reach the severe, heavy or catastrophic tiers: a scrape along the ground reads more than a dive');
assert(crashMonitorJson.includes('"try":[') && crashMonitorJson.includes('monitor_error') && ['first_tier_applied', 'minor_applied', 'impact_applied'].every((stageName) => crashMonitorJson.includes(stageName)), 'the impact loop must catch an error of a tick, trace it and go on, and trace its stages');
const terminatedJson = JSON.stringify(mission.macros['crew mission terminated']);
const abortJson = JSON.stringify(mission.macros['crew emergency divert']);
const unavailableGate = '{"if":{"local":"DISPATCHER_AUTO"},"eq":0,"then":[{"if":{"var":["L:DISPATCH_PHASE","number"]},"ne":7,"then":[{"set":{"var":["L:DISPATCH_PHASE","number"]},"value":7},{"call_macro":"Update_raw from dispatchphase"}]}]}';
assert(terminatedJson.includes(unavailableGate) && abortJson.includes(unavailableGate), 'a crew abort or termination must set the status to unavailable (7) with Update_raw from dispatchphase, only when status reports are automatic and not over an existing 7');
assert(!/"L:DISPATCH_PHASE","number"\]\},"value":[56]/.test(terminatedJson + abortJson), 'a crew abort or termination must never mark the helicopter available (5 or 6): the NEW DISPATCH thread would reopen the briefing and the crew cannot take a dispatch');
const stateEventJson = JSON.stringify(mission.macros['crew member state event']);
const endMenuJson = JSON.stringify(mission.macros['end menu']);
assert(stateEventJson.split('"global":"CREW_KILLED_TOTAL"},"value":{"add"').length === 6, 'every crew member must add its death once to CREW_KILLED_TOTAL');
assert(JSON.stringify(mission.macros['multipatient registry acceleration impact']).includes('"global":"PATIENTS_KILLED_TOTAL"'), 'a loaded patient killed by an impact must be added to PATIENTS_KILLED_TOTAL');
assert(['CREW_KILLED_TOTAL', 'PATIENTS_KILLED_TOTAL'].every((name) => JSON.stringify(mission.macros.resetstats).includes('"global":"' + name + '"},"value":null') && JSON.stringify(mission.macros.objective1).includes('"if":{"global":"' + name + '"},"eq":null') && endMenuJson.includes('"global":"' + name + '"')), 'the new career statistics must be initialized, shown in the report and cleared by the stats reset');
assert(endMenuJson.includes('MISSION FAILED - {0} DECEASED. OPERATION AND SHIFT TERMINATED.') && endMenuJson.includes('ALL CREW MEMBERS') && !endMenuJson.includes('MISSION FAILED - CREW MEMBER DECEASED'), 'the crew death report must name the number of deceased members or all of them');
const failureTargets = new Set();
(function collect(node) {
  if (Array.isArray(node)) return node.forEach(collect);
  if (!node || typeof node !== 'object') return;
  if (node.set && node.set.var && !/^L:CPL/.test(node.set.var[0])) failureTargets.add(node.set.var[0]);
  Object.values(node).forEach(collect);
}(mission.macros['apply aircraft failure']));
const repairJson = JSON.stringify(mission.macros['reset aircraft failures']);
assert(failureTargets.size >= 16 && [...failureTargets].every((name) => repairJson.includes('{"set":{"var":["' + name + '","number"]},"value":0}')), 'the repair macro must clear every failure and persistent damage that the failure table sets');
assert(JSON.stringify(mission.macros['crew member state event']).split('"global":"CREW_DEATH_REPAIR_PENDING"').length === 11, 'every crew death and every critical member must mark the helicopter and crew for repair at the next mission start');
const objective1Json = JSON.stringify(mission.macros.objective1);
assert(objective1Json.includes('{"if":{"global":"CREW_DEATH_REPAIR_PENDING"},"eq":"yes","then":[{"call_macro":"reset aircraft failures"}') && objective1Json.includes('"global":"CREW_DEATH_REPAIR_PENDING"},"value":"no"'), 'the mission start must repair the helicopter and clear the flag after a crew death');
const startMonitorJson = JSON.stringify(mission.macros['start crew lifescore monitor']);
assert(startMonitorJson.includes('"local":"CREW_MONITOR_RUNNING"},"eq":1') && startMonitorJson.includes('monitor_start_refused') && startMonitorJson.includes('monitor_started') && objective1Json.includes('"local":"CREW_MONITOR_RUNNING"},"value":0'), 'a second start of the crew monitors in the same mission pass must be refused and traced, and a new mission pass must be able to start them');
const deboardingJson = JSON.stringify(mission.macros.deboarding);
assert(deboardingJson.includes('"local":"DEBOARD_FAILURES_PRESENT"},"eq":0') && deboardingJson.includes('"local":"DEBOARD_FAILURES_PRESENT"},"eq":1'), 'the crew must report active failures to the technician even without a crash, overspeed or persistent damage flag');
const startCommands = mission.macros.objective1;
const startPhaseWrite = startCommands.findIndex((command) => JSON.stringify(command).includes('"L:DISPATCH_PHASE","number"]},"value":100'));
const startFirstWait = startCommands.findIndex((command) => /"sleep"|"wait_for"|"wait_modal"|"call_macro":"(addon check|version check|voice pack fallback|msn preset loading)"/.test(JSON.stringify(command)));
assert(startPhaseWrite >= 0 && startPhaseWrite < startFirstWait && JSON.stringify(startCommands[startPhaseWrite]).includes('"L:SECOND_DISPATCH_ACCEPTED"') && JSON.stringify(startCommands.slice(startPhaseWrite + 1)).split('"L:DISPATCH_PHASE","number"]},"value":100').length === 1, 'the persistent dispatch phase must be reset to 100 once, before the first sleep, wait or slow call of objective1, so a phase 5 or 6 left by the previous mission cannot open a dispatch during the initialization');
assert(crashApplyJson.includes('"crash_member_room"') && crashApplyJson.includes('"subtract":[{"local":"CREW_LIFESCORE_1"},{"param":"floor"}]'), 'crash tiers must not take a member below the tier floor');
const floorOf = (cause) => { const m = crashMonitorJson.match(new RegExp('"score":-?\\d+,"cause":"' + cause + '"(?:,"floor":(\\d+))?')); return m ? Number(m[1] || 0) : -1; };
assert(floorOf('MINOR AIRCRAFT IMPACT') === 70 && floorOf('MODERATE AIRCRAFT IMPACT') === 40 && floorOf('AIRCRAFT CRASH IMPACT') === 20, 'the survival floors must be 70, 40 and 20 for the first three tiers');
assert(floorOf('SEVERE AIRCRAFT CRASH IMPACT') === 0 && floorOf('HEAVY AIRCRAFT CRASH IMPACT') === 0 && floorOf('CATASTROPHIC AIRCRAFT CRASH IMPACT') === 0, 'the 250, 330 and 400 tiers must have no floor');
// Only two waits are allowed in the impact loop and both read a source no other thread writes: the Settings option "Crew health simulation"
// (the loop sleeps while it is off) and the altitude gate (PLANE ALT ABOVE GROUND / SIM ON GROUND of the simulator, see docs/architecture/PERFORMANCE_OPTIONS.md).
const loopWaits = [];
(function collectWaits(node) {
  if (Array.isArray(node)) return node.forEach(collectWaits);
  if (!node || typeof node !== 'object') return;
  if (node.wait_for !== undefined) loopWaits.push(JSON.stringify(node.wait_for));
  Object.values(node).forEach(collectWaits);
}([mission.macros['monitor aircraft crash impact'], mission.macros['crash monitor loop']]));
const allowedWait = (text) => text === '{"global":"HOIST_SAFETY_MONITOR"}' || /^\{"var":\["(PLANE ALT ABOVE GROUND|SIM ON GROUND)","[A-Za-z]+"\]\}$/.test(text);
assert(!crashMonitorJson.includes('"sleep":1}') && loopWaits.every(allowedWait), 'the impact loop must not hold a fixed cooldown or wait on a condition another thread can leave unset: rearming follows the acceleration only (the only waits are the crew health option and the altitude gate sensors)');
assert(['probe_trigger', 'probe_after', 'PLANE TOUCHDOWN NORMAL VELOCITY', 'SIM ON GROUND', 'PLANE ALT ABOVE GROUND', 'VERTICAL SPEED', 'GROUND VELOCITY', 'L:CRASH'].every((name) => crashMonitorJson.includes(name)) && (crashMonitorJson.match(/probe_error/g) || []).length === 2, 'every impact must trace the alternative signals, each probe inside its own try so that it cannot stop the injuries');
const crashChainJson = ['apply aircraft crash lifescore impact', 'apply crew lifescore impact', 'crew impact events'].map((name) => JSON.stringify(mission.macros[name])).join('');
assert(!/open_table|save_table|"call_macro":"test tracker/.test(crashChainJson), 'the damage path must not touch the test tables');
assert(mission.macros['record crew health test'] === undefined && !JSON.stringify(mission.macros['apply crew lifescore impact']).includes('CREW_TEST_TRACK') && !JSON.stringify(mission.macros['monitor aircraft crash impact']).includes('record crew health test'), 'the Test Tracker bookkeeping of the crew health test (own thread and flag) was removed with the tracker');
assert(['monitor_error_caught', 'stage minor_apply_start', 'stage events_start', 'stage events_done'].every((name) => crashMonitorJson.includes(name)) && crashChainJson.includes('apply_enter') && crashChainJson.includes('apply_exit') && crashChainJson.includes('member_apply') && crashChainJson.includes('member_applied') && crashChainJson.includes('events_exit') && crashMonitorJson.indexOf('monitor_error_caught') < crashMonitorJson.indexOf('"local":"cm_error"'), 'every call of the damage chain must be traced, and the caught error must leave a constant row before $ERROR is read');
assert(crashMonitorJson.includes('"local":"crash_event_log"') && crashMonitorJson.includes('"local":"crash_event_count"') && JSON.stringify(mission.macros['capture crew movement snapshot']).includes('"key":"crash_event_log"'), 'every impact must be kept in the in-memory event log, which the snapshot copies without any file access of its own');
assert(crashMonitorJson.includes('"local":"cm_minor_armed"') && crashMonitorJson.includes('"local":"cm_crash_armed"') && !crashMonitorJson.includes('crash_apply_busy'), 'a light impact must not blind the crash tiers: two arming states in one loop, and no shared lock');
const loopTickStart = crashMonitorJson.indexOf('"local":"cm_td_hit"},"value":0');
assert(loopTickStart > 0 && crashMonitorJson.includes('"local":"cm_sig_hit"') && crashMonitorJson.includes('"require":{"local":"cm_sig_hit"},"gte":1') && crashMonitorJson.includes('"local":"cm_td_prev"') && crashMonitorJson.includes('"local":"cm_d1"') && crashMonitorJson.includes('"require":{"local":"cm_agl_now"},"lt":100') && crashMonitorJson.includes('loop_alive'), 'the crash path must also be started by a new simulator touchdown speed and by a one-tick velocity loss close to the ground, so a single-frame acceleration spike that falls between two ticks cannot hide a crash; a heartbeat row shows that the loop runs');
const applyCalls = (crashMonitorJson.match(/"call_macro":"apply aircraft crash lifescore impact","params":\{[^}]*\}\},\{"sleep":0\.02\}/g) || []).length;
assert(applyCalls === 6 && (crashMonitorJson.match(/"call_macro":"apply aircraft crash lifescore impact"/g) || []).length === 6, 'every crash damage application must be followed by a sleep: the stack of a thread unwinds only at a sleep, and the 169.16 catastrophic tier overflowed it');
assert(crashMonitorJson.includes('"catch":[{"sleep":0.02},{"call_macro":"ground crew runtime trace","params":{"macro":"crash_ops","actor":"crew","target":"crash","state":"monitor_error_caught"'), 'the catch of the impact loop must start with a sleep so that its own trace cannot overflow the stack');
assert((crashApplyJson.match(/"force":\{"param":"force"\}\}\},\{"sleep":0\.02\}/g) || []).length === 5, 'the five members of a crash application must be separated by a sleep');
const failedModalJson = JSON.stringify(mission.macros['crew mission terminated']);
assert((failedModalJson.match(/"text":"VIEW REPORT","style":"danger"/g) || []).length === 3 && !/"text":"VIEW REPORT","style":"primary"/.test(failedModalJson), 'the MISSION FAILED modals must have a red (danger) button');
const impactEventsJson = JSON.stringify(mission.macros['crew impact events']);
assert(impactEventsJson.includes('"local":"CREW_PILOTS_UNFIT"') && impactEventsJson.includes('{"require":{"local":"CREW_PILOTS_UNFIT"},"eq":1}') && failedModalJson.includes('Pilot and copilot are incapacitated') && failedModalJson.includes('"value":"CREW_CRITICAL"'), 'pilot and copilot both dead or critical must end the mission, with an incapacitated text when somebody is still alive');
const medicGate = [1, 2, 3].map((n) => JSON.stringify(mission.macros['apply patient' + n + ' medical action effect'])).join('');
assert((medicGate.match(/"require":\{"local":"CREW_CRIT_2"\},"ne":1/g) || []).length === 3, 'the treatment effects of the three patients must not apply while the medic is critical or dead');
const deadSceneJson = JSON.stringify(mission.macros['random deads']);
assert(deadSceneJson.includes('"call_macro":"Police1"') && deadSceneJson.includes('"local":"POLICE_AVAIL"},"value":2') && deadSceneJson.includes('"local":"POLICE_AVAIL"},"eq":0') && deadSceneJson.includes('"local":"player"},"ne":"multiplayer"') && deadSceneJson.includes('Deceased on scene. Requesting police.') && deadSceneJson.includes('"from":"crew"') && deadSceneJson.includes('Copy. Police tasked.'), 'a deceased on scene must request the police once, as the Request police button does: the crew asks, the dispatcher answers');
const sceneDeathJson = JSON.stringify(mission.macros['multipatient registry tick']);
assert(sceneDeathJson.includes('"call_macro":"Police1"') && sceneDeathJson.includes('"local":"POLICE_AVAIL"},"eq":0') && sceneDeathJson.includes('"local":"player"},"ne":"multiplayer"') && sceneDeathJson.includes('Requesting police.') && sceneDeathJson.includes('Police tasked.') && sceneDeathJson.includes('CLINICAL DETERIORATION'), 'a patient who dies on scene must request the police once and leave a cause');
const deathCauseJson = JSON.stringify(mission.macros['multipatient registry acceleration impact']) + JSON.stringify(mission.macros['multipatient registry live physiology step']) + JSON.stringify(mission.macros['Hoisting back up']);
assert(['PILOTING (IMPACT DAMAGE)', 'CLINICAL DETERIORATION', 'HOIST LOSS (HIGH SPEED)'].every((cause) => deathCauseJson.includes(cause)), 'a patient death aboard must record its cause: piloting, clinical deterioration or a hoist loss');
const reportMenuJson = JSON.stringify(mission.macros['end menu']);
assert(reportMenuJson.includes('Patient death cause: {0}') && reportMenuJson.includes('(ANSV)') && JSON.stringify(mission.macros.objective1).includes('"local":"PATIENT_DEATH_CAUSE"},"value":null'), 'the end report must show the patient death cause and the investigation authority notice, and the cause must be reset at the mission start');
const j = (name) => JSON.stringify(mission.macros[name]);
assert(j('post dispatcher message').includes('"modify_array":{"local":"Dispatcher_Messages"}') && j('post dispatcher message').includes('"global":"GRPNAME"') && j('post dispatcher message').includes('UpdateRescueTrack'), 'the dispatcher helper must post one RescueTrack message from the dispatcher');
assert(j('record patient death time').includes('clock now') && !mission.macros['sim time text'] && !j('record patient death time').includes('get_time_string') && !j('random deads').includes('get_time_string') && j('record patient death time').includes('DEATH_TIME_1') && j('record patient death time').includes('DEATH_TIME_3') && j('sync medical patient display').includes('medical_display_death_time') && j('patient health').includes('Time of death: {0:TIME}{1}') && j('multipatient registry tick').includes('record patient death time'), 'the time of death must be kept at the death or the visit and shown in the medical page');
assert(['multipatient registry live physiology step'].every((n) => (j(n).match(/"from":"crew","text":"Patient deceased on board\. Continuing to destination\./g) || []).length === 3), 'a death aboard must reach the dispatcher, reported by the crew');
assert(j('Ambulance destination1').includes('"from":"crew","text":"Patient handed over to ED."') && j('User destination1').includes('"from":"crew","text":"Patient handed over to ED."'), 'the hospital handover must reach the dispatcher, reported by the crew');
// who knows says: the helicopter crew is the sender -OUT-, the units on scene their call sign, the dispatcher only what it decides or answers
assert(j('post crew safety message').includes('"from":"-OUT-"') && !j('post crew safety message').includes('GRPNAME'), 'the crew status is a message of the crew (-OUT-), never of the dispatcher');
assert(['crew', 'fire', 'police', 'ambulance'].every((from) => j('post dispatcher message').includes(`"param":"from"},"eq":"${from}"`)) && j('post dispatcher message').includes('"-OUT-"') && j('post dispatcher message').includes('"local":"post_from"'), 'the dispatcher helper chooses the sender: crew -OUT-, fire, police, ambulance, otherwise the dispatcher');
assert(!j('crew emergency choice').includes('post crew safety message') && j('crew emergency choice').startsWith('[{"#comment"') && j('crew emergency choice').indexOf('"set_dispatch_dialog":0') < j('crew emergency choice').indexOf('"set_modal"'), 'the Divert or Continue question is on screen only (not a radio message) and the dispatch page is hidden before the modal');
assert(!JSON.stringify(mission.macros).includes('crew secured. Direct to hospital') && !JSON.stringify(mission.macros).includes('Divert to hospital or continue: choose on the tablet') && !JSON.stringify(mission.macros).includes('Handover completed. Return to base.","cause"'), 'no message tells the dispatcher a question of the simulator');
assert(j('Police1').includes('Police on scene, scene secured.') && j('police_rescuetrack_ontheway-arrived').includes('Police on scene, scene secured.'), 'the police arrival must say that the scene is secured');
assert(j('post crew safety message').includes('crew_post_role') && !j('post crew safety message').includes('LifeScore') && j('crew member event announce').includes('Accident report required.'), 'crew messages must use the role, no LifeScore, and the first loss must ask for the accident report');
const fireJson = JSON.stringify(mission.macros['random VFX']);
assert(['Scene NOT safe, fire active.', 'Scene NOT safe, smoke on site.', 'Scene safe, no fire, no smoke.', 'Fire out, scene safe for HEMS.'].every((text) => fireJson.includes(text)) && fireJson.includes('"local":"FIREENGINE_AVAIL"},"eq":1') && fireJson.includes('"params":{"from":"fire"'), 'the fire service must report the safety of the scene at its arrival and the end of the fire, with its own call sign as the sender');
const deadPageJson = JSON.stringify(mission.macros['deceased scene page']);
assert(deadPageJson.includes('DECEASED ON SCENE') && deadPageJson.includes('"image":"homebar"') && deadPageJson.includes('Back to dispatch screen') && deadPageJson.includes('POORDEAD_REPORT_TIME') && (JSON.stringify(mission.macros['patient health']).match(/"title":"Deceased"/g) || []).length === 2 && JSON.stringify(mission.macros['random deads']).includes('POORDEAD_REPORT_TIME'), 'the deceased found on scene must have a minimal page with the header and tabs of the patient pages');
assert(crashMonitorJson.includes('impact_ignored') && crashMonitorJson.includes('"local":"cm_ignore"') && crashMonitorJson.includes('{"require":{"local":"cm_sig_hit"},"eq":0}') && crashMonitorJson.includes('{"require":{"local":"cm_dv2"},"lt":100}'), 'an acceleration spike without the touchdown or velocity trigger and without a real change of velocity must be ignored, so a soft touchdown does not hurt the crew');
assert(j('clock now').includes('E:ZULU TIME') && j('clock now').includes('E:LOCAL TIME') && j('clock now').includes('CLOCK_MODE') && j('eta clock').includes('clock now') && j('eta clock').includes('86400') && ['closest ambulance', 'Ambulance1', 'Ambulance2', 'Firetruck1', 'police_rescuetrack_ontheway-arrived'].every((name) => j(name).includes('"call_macro":"eta clock"') && j(name).includes('"local":"ETA_CLOCK"')) && !/ETA \{\d:TIME\}[^"]*","params":\[(\{"round")/.test(j('closest ambulance') + j('Ambulance1') + j('Firetruck1')), 'every vehicle ETA must be a time of day (the simulator UTC clock plus the travel time), not a duration');
assert(j('truck vs car').includes('Fire out, scene safe for HEMS.') && j('truck vs car').includes('"from":"fire"') && j('random VFX').includes('"object":"trailer","var":"VAR 1"},"gt":0') && j('random VFX').includes('fire_report_text'), 'the fire service report must cover the truck scene (trailer) and report its fire out');
const stampLeft = Object.entries(mission.macros).filter(([name, macro]) => name !== 'capture crew movement snapshot' && JSON.stringify(macro).includes('"time":{"fn":"get_time_string"}')).map(([name]) => name);
assert(stampLeft.length <= 2 && JSON.stringify(mission.macros['post dispatcher message']).includes('"global":"CLOCK_MODE"') && JSON.stringify(mission.macros['dispatch control']).includes('"set":{"global":"CLOCK_MODE"},"value":"local"') && JSON.stringify(mission.macros['dispatch control']).includes('"set":{"global":"CLOCK_MODE"},"value":"utc"'), 'dispatcher message times must follow the clock chosen in the dispatch control page (UTC Z or local L), and the setting must exist');
assert(crashMonitorJson.includes('"IS SLEW ACTIVE","bool"') && crashMonitorJson.includes('"local":"cm_slew_hold"') && crashMonitorJson.indexOf('"IS SLEW ACTIVE"') < crashMonitorJson.indexOf('"local":"cm_calm_minor"},"value":{"add"'), 'while slew mode is active (and for a few ticks after it) every impact trigger must be suppressed, before any threshold is evaluated');
assert(/"params":\{"score":100,"cause":"CATASTROPHIC AIRCRAFT CRASH IMPACT","force":1\}/.test(crashMonitorJson), 'a crash above 150 ft/s must be fatal for everyone aboard');
assert(!crashMonitorJson.includes('monitor_stalled') && (crashMonitorJson.match(/"call_macro":"crash monitor loop"/g) || []).length === 1, 'the impact loop is started once and nothing restarts it: a stalled thread must be explained, not hidden by a watchdog');
assert(JSON.stringify(mission.macros['apply crew lifescore impact']).includes('"local":"crew_loss_before"'), 'IMPACT must count the points really removed');
assert(JSON.stringify(mission.macros['recover crew lifescore over time']).includes('"gt":0') , 'the LifeScore recovery must not revive a member at zero');
assert(!JSON.stringify(mission.macros['crew impact events']).includes('"eq":"critical"') && JSON.stringify(mission.macros['crew impact events']).includes('events_enter'), 'the batch events must use plain numeric announce flags and trace their entry');
console.log(JSON.stringify({ result: 'PASS', scenarios: ['role-mapping', 'targeted-impact', 'helirescuer-member-4', 'helirescuer-member-5', 'disabled-no-impact', 'disabled-no-hoist-loss', 'active-fatal-hoist-loss', 'critical-at-10', 'fatal-at-0', 'fatal-survivor-boarding', 'member-lock', 'fatal-crash-force', 'survivors-abort', 'pilots-dead-termination', 'failure-table-original', 'crash-failures'] }, null, 2));
