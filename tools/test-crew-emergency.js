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
const hoistFatalJson = JSON.stringify(mission.macros['hoist out fatal failure']);
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
const crashMonitorJson = JSON.stringify(mission.macros['monitor aircraft crash impact']);
assert(crashMonitorJson.includes('crash_ops'), 'crash impact monitor does not record crash_ops traces');
assert(['32', '150', '300', '500', '800'].every((threshold) => crashMonitorJson.includes(`"gte":${threshold}`) && crashMonitorJson.includes(`"lte":-${threshold}`)) && ['crash_tier_3', 'crash_tier_4', 'crash_tier_5', 'crash_tier_6'].every((latch) => crashMonitorJson.includes(`"local":"${latch}"`)), 'crash impact monitor does not wait on every axis for the 32 and 150 triggers and the 300, 500 and 800 latches');
assert(!crashMonitorJson.includes('"require":{"var":["ACCELERATION BODY'), 'crash impact severity must come from the tier latches, not from the first sample after the trigger');
assert(['[10,31]', '[45,61]', '[0,4]', '[3,9]', '[7,21]'].every((range) => crashApplyJson.includes(`"floor":{"rand":${range}}`)) && crashApplyJson.includes('"local":"crash_member_score"'), 'crash injury is not drawn at random for each present person (0-3 at 1 g, 3-8 at 2 g, 7-20 at 150, 10-30, 45-60 at 800)');
assert(fireExposureJson.includes('"object":"pax3","member":2'), 'pax3 exposure is not mapped to medical crew member 2');
assert(hoistJson.includes('"member":3') && hoistJson.includes('"member":4') && hoistJson.includes('"member":5'), 'hoist impact is not mapped to operator and helirescuer LifeScores 3, 4, and 5');
assert(hoistRiskJson.includes('"global":"HOIST_SAFETY_MONITOR"') && hoistRiskJson.includes('"eq":"yes"'), 'hoist-out LifeScore monitoring is not gated by YES');
assert(hoistFatalJson.includes('"global":"HOIST_SAFETY_MONITOR"') && hoistFatalJson.includes('"eq":"yes"'), 'fatal hoist loss is not gated by YES');
assert(attachedRiskJson.includes('"local":"HOIST_CREW_ON_CABLE"') && attachedRiskJson.includes('"gt":0'), 'attached hoist operator monitor is not tied to the cable state');
assert(attachedRiskJson.includes('"local":"HOIST_IMPACT_RATE_FPS"') && attachedRiskJson.includes('"fn":"hoist_get_distance_from_ground:ft"'), 'attached hoist operator monitor does not derive risk from measured descent rate');
assert(!attachedRiskJson.includes('ACCELERATION BODY'), 'attached hoist operator monitor must not use aircraft acceleration as a hoist proxy');
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
helirescuerOne.locals.HELIRESCUER_BOARDED = 1;
helirescuerOne.locals.HOIST_CABLE_PERSON_TYPE = 'helirescuer';
helirescuerOne.params = { score: 1, cause: 'TEST HELIRESCUER IMPACT' };
execute(mission.macros['apply hoist crew lifescore impact'], helirescuerOne);
assert(helirescuerOne.locals.CREW_LIFESCORE_4 === 99 && helirescuerOne.locals.CREW_LIFESCORE_3 === 100, 'first helirescuer impact was not assigned to member 4');

const helirescuerTwo = initialState(100);
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
execute(mission.macros['hoist out fatal failure'], disabledHoistFatal);
assert(disabledHoistFatal.locals.CREW_LIFESCORE_3 === 100, 'disabled crew-health simulation lost the hoist operator');

const activeHoistFatal = initialState(100);
execute(mission.macros['hoist out fatal failure'], activeHoistFatal);
assert(activeHoistFatal.locals.CREW_LIFESCORE_3 === 0, 'active crew-health simulation did not apply fatal hoist loss');

const critical = initialState(11);
apply(critical, 1);
assert(critical.locals.CREW_LIFESCORE_3 === 10, 'critical threshold did not reach exactly 10');
assert(critical.locals.CREW_EMERGENCY_ACTIVE === 'yes', 'LifeScore 10 did not trigger an emergency');
assert(critical.locals.MISSION_FAILED === 'CREW_CRITICAL', 'LifeScore 10 did not fail the mission as critical');

const fatal = initialState(5);
apply(fatal, 5);
assert(fatal.locals.CREW_LIFESCORE_3 === 0, 'fatal impact did not reduce LifeScore to zero');
assert(fatal.locals.CREW_EMERGENCY_ACTIVE === 'yes', 'LifeScore zero did not trigger an emergency');
assert(fatal.locals.MISSION_FAILED === 'CREW_FATAL', 'LifeScore zero did not fail the mission as fatal');
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
assert(originalBranches.length === 28 && failureTable.length === 28, 'the aircraft failure table must keep the 28 original codes');
assert(originalBranches.every((branch, index) => JSON.stringify(branch.then) === JSON.stringify(failureTable[index].then) && branch.eq === failureTable[index].eq), 'an aircraft failure code does not match the original damage');
const failureEngineJson = JSON.stringify(mission.macros['failure engine']);
assert(failureEngineJson.includes('"global":"ENGINE_FAILURES_ENABLED"') && !failureEngineJson.includes('"global":"DIFFICULTY"') && failureEngineJson.includes('"call_macro":"apply aircraft failure"') && failureEngineJson.includes('"sleep":[120,3600]'), 'failure engine must apply the L:FAILURE code under ENGINE_FAILURES_ENABLED');
const crashFailureJson = JSON.stringify(mission.macros['crash random failures']);
assert(crashFailureJson.includes('"global":"ENGINE_FAILURES_ENABLED"') && crashFailureJson.includes('"floor":{"rand":[1,29]}') && crashFailureJson.includes('"floor":{"rand":[1,27]}') && crashFailureJson.includes('"add":[{"local":"crash_failure_code"},2]'), 'crash failures must draw codes 1 to 28 and skip the engine fires 5 and 6 unless fires is yes');
const failureThread = crashMonitorJson.slice(crashMonitorJson.indexOf('"local":"crash_fail_4"},"eq":1'));
assert(['crash_fail_4', 'crash_fail_5', 'crash_fail_6'].every((flag) => crashMonitorJson.includes('"set":{"local":"' + flag + '"}')), 'the crash failures must snapshot the tier latches before the single failure thread');
assert((crashMonitorJson.match(/"call_macro":"crash random failures"/g) || []).length === 3 && !crashMonitorJson.slice(0, crashMonitorJson.indexOf('"local":"crash_fail_4"')).includes('crash random failures'), 'crash failures must be applied by one sequential thread: threads sharing the failure locals overwrite each other');
assert(failureThread.includes('"fires":"no"') && failureThread.includes('"rand":[1,3]') && failureThread.indexOf('"fires":"no"') < failureThread.indexOf('"fires":"yes"'), 'the 193 tier must apply 1 to 2 failures without engine fires, before the higher tiers');
assert((failureThread.match(/"count":1,"fires":"yes"/g) || []).length === 2, 'the 386 and 600 tiers must apply one failure each, engine fires allowed');
assert(crashMonitorJson.includes('"local":"crash_peak2"') && [4096, 22500, 90000, 250000, 640000].every((squared) => crashMonitorJson.includes('"gte":' + squared + ',')) && crashMonitorJson.includes('impact_peak'), 'an impact split over several axes must reach the tiers through the sampled vector peak, and the peak must be traced');
assert(crashMonitorJson.includes('"try":[') && crashMonitorJson.includes('worker_error') && crashMonitorJson.includes('minor_error') && ['first_tier_applied', 'tiers_and_failures_done', 'cycle_done'].every((stageName) => crashMonitorJson.includes('stage ' + stageName)), 'both impact paths must run in a try/catch that traces its error, with stage traces on the crash path');
const terminatedJson = JSON.stringify(mission.macros['crew mission terminated']);
const abortJson = JSON.stringify(mission.macros['crew emergency response']);
const unavailableGate = '{"if":{"local":"DISPATCHER_AUTO"},"eq":0,"then":[{"if":{"var":["L:DISPATCH_PHASE","number"]},"ne":7,"then":[{"set":{"var":["L:DISPATCH_PHASE","number"]},"value":7},{"call_macro":"Update_raw from dispatchphase"}]}]}';
assert(terminatedJson.includes(unavailableGate) && abortJson.includes(unavailableGate), 'a crew abort or termination must set the status to unavailable (7) with Update_raw from dispatchphase, only when status reports are automatic and not over an existing 7');
assert(!/"L:DISPATCH_PHASE","number"\]\},"value":[56]/.test(terminatedJson + abortJson), 'a crew abort or termination must never mark the helicopter available (5 or 6): the NEW DISPATCH thread would reopen the briefing and the crew cannot take a dispatch');
assert(crashApplyJson.includes('"crash_member_room"') && crashApplyJson.includes('"subtract":[{"local":"CREW_LIFESCORE_1"},{"param":"floor"}]'), 'crash tiers must not take a member below the tier floor');
const floorOf = (cause) => { const m = crashMonitorJson.match(new RegExp('"score":-?\\d+,"cause":"' + cause + '"(?:,"floor":(\\d+))?')); return m ? Number(m[1] || 0) : -1; };
assert(floorOf('MINOR AIRCRAFT IMPACT') === 70 && floorOf('MODERATE AIRCRAFT IMPACT') === 40 && floorOf('AIRCRAFT CRASH IMPACT') === 20, 'the survival floors must be 70, 40 and 20 for the first three tiers');
assert(floorOf('SEVERE AIRCRAFT CRASH IMPACT') === 0 && floorOf('HEAVY AIRCRAFT CRASH IMPACT') === 0 && floorOf('CATASTROPHIC AIRCRAFT CRASH IMPACT') === 0, 'the 300, 500 and 800 tiers must have no floor');
assert(!crashMonitorJson.includes('"sleep":1}') && !crashMonitorJson.includes('"sleep":3}'), 'the impact monitor must not hold a fixed cooldown: rearming follows the acceleration only');
assert(crashMonitorJson.includes('minor_detected') && crashMonitorJson.includes('"local":"crash_vec_trigger"') && crashMonitorJson.includes('"local":"crash_apply_busy"'), 'a light impact must not blind the crash path: two independent paths, the minor one waking the crash one on a resultant of 150, sharing a lock only while applying');
assert((crashMonitorJson.match(/"wait_for":\{"local":"crash_apply_busy"\},"eq":0/g) || []).length === 2 && (crashMonitorJson.match(/"set":\{"local":"crash_apply_busy"\},"value":0/g) || []).length >= 4, 'both paths must take the apply lock and release it, also on error');
assert(JSON.stringify(mission.macros['apply crew lifescore impact']).includes('"local":"crew_loss_before"'), 'IMPACT must count the points really removed');
assert(JSON.stringify(mission.macros['recover crew lifescore over time']).includes('"gt":0') , 'the LifeScore recovery must not revive a member at zero');
assert(!JSON.stringify(mission.macros['crew impact events']).includes('"eq":"critical"') && JSON.stringify(mission.macros['crew impact events']).includes('events_enter'), 'the batch events must use plain numeric announce flags and trace their entry');
console.log(JSON.stringify({ result: 'PASS', scenarios: ['role-mapping', 'targeted-impact', 'helirescuer-member-4', 'helirescuer-member-5', 'disabled-no-impact', 'disabled-no-hoist-loss', 'active-fatal-hoist-loss', 'critical-at-10', 'fatal-at-0', 'fatal-survivor-boarding', 'member-lock', 'fatal-crash-force', 'survivors-abort', 'pilots-dead-termination', 'failure-table-original', 'crash-failures'] }, null, 2));
