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
const hoistJson = JSON.stringify(mission.macros['apply hoist crew lifescore impact']);
const hoistDownJson = JSON.stringify(mission.macros['hoist down']);
const hoistRiskJson = JSON.stringify(mission.macros['start hoist out risk monitor']);
const hoistFatalJson = JSON.stringify(mission.macros['hoist out fatal failure']);
const accelerationJson = JSON.stringify(mission.macros['apply aircraft acceleration lifescore impact']);
const attachedRiskJson = JSON.stringify(mission.macros['start hoist attached risk monitor']);
const bootstrapJson = JSON.stringify(mission.macros['normalize crew health simulation setting']);
assert(monitorJson.includes('"call_macro":"record crew acceleration maxima"'), 'crew monitor does not retain acceleration maxima recording');
assert((monitorJson.match(/"while":1/g) || []).length === 3, 'crew acceleration monitor does not have three independent wait_for threads');
assert((monitorJson.match(/"wait_for":/g) || []).length >= 18, 'crew acceleration monitor does not use wait_for thresholds');
assert(monitorJson.includes('"global":"HOIST_SAFETY_MONITOR"') && monitorJson.includes('"eq":"yes"'), 'crew acceleration monitor is not gated by HOIST_SAFETY_MONITOR YES');
assert(!monitorJson.includes('"local":"MISSION_PHASE"'), 'crew monitor is still coupled to mission phase');
assert(accelerationJson.includes('"ACCELERATION BODY X"') && accelerationJson.includes('"ACCELERATION BODY Y"') && accelerationJson.includes('"ACCELERATION BODY Z"'), 'aircraft acceleration monitor does not read the simulator body-axis simvars');
assert(!accelerationJson.includes('SDK_ACCELERATION_BODY_'), 'aircraft acceleration monitor still uses non-simulator SDK acceleration aliases');
assert(accelerationJson.includes('SDK_PILOT_CAPT_ON') && accelerationJson.includes('SDK_PAX_1_ON') && accelerationJson.includes('SDK_PAX_2_ON') && accelerationJson.includes('SDK_PAX_3_ON'), 'aircraft acceleration monitor does not restrict impacts to onboard crew seats');
assert(accelerationJson.includes('"var":["L:{local:HXX}_SDK_PAX_2_ON","number"]') && accelerationJson.includes('"eq":1'), 'aircraft acceleration monitor does not restrict member 3 to the onboard seat HVAR');
assert(!accelerationJson.includes('"local":"HOIST_OUT"'), 'aircraft acceleration monitor still uses HOIST_OUT as a proxy for onboard member 3');
assert(accelerationJson.includes('"member":3') && accelerationJson.includes('"cause":"ABRUPT AIRCRAFT ACCELERATION"'), 'non-hoist-out winch operator is not covered by aircraft acceleration LifeScore monitoring');
assert(recorderJson.includes('"object":"pax3","member":2'), 'pax3 exposure is not mapped to medical crew member 2');
assert(hoistJson.includes('"member":3') && hoistJson.includes('"member":4') && hoistJson.includes('"member":5'), 'hoist impact is not mapped to operator and helirescuer LifeScores 3, 4, and 5');
assert(hoistRiskJson.includes('"global":"HOIST_SAFETY_MONITOR"') && hoistRiskJson.includes('"eq":"yes"'), 'hoist-out LifeScore monitoring is not gated by YES');
assert(hoistFatalJson.includes('"global":"HOIST_SAFETY_MONITOR"') && hoistFatalJson.includes('"eq":"yes"'), 'fatal hoist loss is not gated by YES');
assert(attachedRiskJson.includes('"local":"HOIST_CREW_ON_CABLE"') && attachedRiskJson.includes('"gt":0'), 'attached hoist operator monitor is not tied to the cable state');
assert(attachedRiskJson.includes('"ACCELERATION BODY X"') && attachedRiskJson.includes('"ACCELERATION BODY Y"') && attachedRiskJson.includes('"ACCELERATION BODY Z"'), 'attached hoist operator monitor does not read all body-axis acceleration simvars');
assert(attachedRiskJson.includes('"cause":"ABRUPT HOIST OPERATOR ACCELERATION"') && attachedRiskJson.includes('"cause":"FATAL HOIST OPERATOR ACCELERATION"'), 'attached hoist operator acceleration penalties are incomplete');
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

console.log(JSON.stringify({ result: 'PASS', scenarios: ['role-mapping', 'targeted-impact', 'helirescuer-member-4', 'helirescuer-member-5', 'disabled-no-impact', 'disabled-no-hoist-loss', 'active-fatal-hoist-loss', 'critical-at-10', 'fatal-at-0', 'fatal-survivor-boarding'] }, null, 2));
