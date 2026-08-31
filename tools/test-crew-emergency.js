const fs = require('node:fs');
const path = require('node:path');

const mission = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'everywhere_all.json'), 'utf8'));

function evaluate(value, context) {
  if (value === null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => evaluate(item, context));
  if (value.local) return context.locals[value.local];
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
  };
  for (let member = 1; member <= 5; member += 1) {
    locals[`CREW_LIFESCORE_${member}`] = member === 3 ? memberScore : 100;
    locals[`CREW_LIFESCORE_ALERT_${member}`] = 0;
  }
  return { locals, params: {}, objects: new Set(['pax3']) };
}

function apply(state, score) {
  state.params = { member: 3, score, cause: 'TEST IMPACT' };
  execute(mission.macros['apply crew lifescore impact'], state);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const monitorJson = JSON.stringify(mission.macros['start crew lifescore monitor']);
const hoistJson = JSON.stringify(mission.macros['apply hoist crew lifescore impact']);
assert(monitorJson.includes('"object":"pax3","member":2'), 'pax3 exposure is not mapped to medical crew member 2');
assert(hoistJson.includes('"member":3') && !hoistJson.includes('"member":4') && !hoistJson.includes('"member":5'), 'hoist_crew impact is not mapped exclusively to hoist operator member 3');

const ordinary = initialState(100);
apply(ordinary, 1);
assert(ordinary.locals.CREW_LIFESCORE_3 === 99, 'ordinary impact did not reduce the target member');
assert([1, 2, 4, 5].every((member) => ordinary.locals[`CREW_LIFESCORE_${member}`] === 100), 'ordinary impact changed a non-target member');
assert(ordinary.locals.CREW_EMERGENCY_ACTIVE === 'no', 'ordinary impact incorrectly triggered an emergency');
assert(ordinary.locals.CREW_LIFESCORE_ALERT_3 === 1, 'first injury/exposure warning was not recorded');

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

console.log(JSON.stringify({ result: 'PASS', scenarios: ['role-mapping', 'targeted-impact', 'critical-at-10', 'fatal-at-0', 'fatal-survivor-boarding'] }, null, 2));
