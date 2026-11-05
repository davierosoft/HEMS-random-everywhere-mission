#!/usr/bin/env node
'use strict';
// User request of 2026-11-05 (audit items V3, H4, V11): the hoist pre-check (HPC.Q, HPC.A), the hook height calls while the cable goes down (HCL.H),
// the debrief that names the events of the dispatch (DBF.DEAD, DBF.HARD, DBF.FAIL, DBF.WAIT, DBF.OK). The macros run in a small interpreter.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const macros = {};
for (const f of fs.readdirSync(path.join(root, 'mission-src/macros'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros', f), 'utf8')));
const threadsSrc = fs.readFileSync(path.join(root, 'mission-src/threads/03-flight-monitors.json'), 'utf8');
const txt = (n) => JSON.stringify(macros[n]);

// packs
const keys = { 'HCL.H': [1, '{0}'], 'HPC.Q': [4, null], 'HPC.A': [1, null], 'DBF.DEAD': [3, null], 'DBF.HARD': [2, null], 'DBF.FAIL': [2, null], 'DBF.WAIT': [1, null], 'DBF.OK': [1, null] };
for (const L of ['EN', 'DE', 'FR']) {
  const xml = fs.readFileSync(path.join(root, 'voicepacks', L + '.xml'), 'utf8');
  for (const k of Object.keys(keys)) {
    const m = xml.match(new RegExp(`<message key="${k.replace('.', '\\.')}"[^>]*>([\\s\\S]*?)</message>`));
    assert.ok(m, `${L} has ${k}`);
    const v = m[1].match(/<o>[\s\S]*?<\/o>/g) || [];
    assert.ok(v.length >= 3, `${L} ${k} has three variants`);
    if (keys[k][1]) assert.ok(v.every((x) => x.includes('{0}')), `${L} ${k} variants carry the feet`);
  }
}

// small interpreter
function makeEnv(init) {
  return { locals: {}, lv: {}, params: {}, said: [], sleeps: [], fn: {}, ...init };
}
function run(cmds, env) {
  const val = (x) => {
    if (x === null || typeof x !== 'object') return x;
    if ('local' in x) return env.locals[x.local] === undefined ? null : env.locals[x.local];
    if ('param' in x) return env.params[x.param] === undefined ? null : env.params[x.param];
    if ('var' in x) return env.lv[x.var[0]] === undefined ? 0 : env.lv[x.var[0]];
    if ('fn' in x) return env.fn[x.fn];
    if ('add' in x) return x.add.reduce((a, b) => a + val(b), 0);
    if ('multiply' in x) return x.multiply.reduce((a, b) => a * val(b), 1);
    if ('divide' in x) return val(x.divide[0]) / val(x.divide[1]);
    if ('round' in x) return Math.round(val(x.round));
    if ('text' in x) return x.text.replace(/\{(\d)\}/g, (_, i) => val(x.params[Number(i)]));
    throw new Error('unsupported value ' + JSON.stringify(x));
  };
  const cmp = { eq: (a, b) => a === b, ne: (a, b) => a !== b, gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b };
  const op = (c) => Object.keys(cmp).find((k) => k in c);
  const left = (o) => {
    if (o && o.and) return o.and.every((r) => test(r, r.require)) ? 1 : 0;
    if (o && o.or) return o.or.some((r) => test(r, r.require)) ? 1 : 0;
    return val(o);
  };
  const test = (c, o) => cmp[op(c)](left(o), val(c[op(c)]));
  const exec = (list) => {
    for (const x of list) {
      if (x['#comment'] !== undefined) continue;
      if (x.set) {
        if (x.set.local) env.locals[x.set.local] = val(x.value); else if (x.set.var) env.lv[x.set.var[0]] = val(x.value); else throw new Error('unsupported set');
      } else if (x.if) { if (test(x, x.if)) { const r = exec(x.then || []); if (r === 'return') return r; } else if (x.else) { const r = exec(x.else); if (r === 'return') return r; } }
      else if (x.return !== undefined) return 'return';
      else if (x.sleep !== undefined) env.sleeps.push(x.sleep);
      else if (x.create_thread) { const r = exec(x.create_thread.commands); if (r === 'return') return r; }
      else if (x.call_macro === 'voice say') env.said.push([val(x.params.key), x.params.a === undefined ? null : val(x.params.a)]);
      else throw new Error('unsupported command ' + JSON.stringify(x).slice(0, 80));
    }
    return null;
  };
  exec(cmds);
  return env;
}

// V3: pre-check, once for each hoist operation
{
  const e = makeEnv({ locals: { HPC_DONE: 0 } });
  run(macros['voice hoist precheck'], e);
  assert.deepStrictEqual(e.said.map((s) => s[0]), ['HPC.Q', 'HPC.A'], 'operator challenges, pilot answers');
  assert.ok(e.sleeps.length === 1 && e.sleeps[0] >= 4, 'the answer follows the challenge');
  assert.strictEqual(e.locals.HPC_DONE, 1);
  const again = makeEnv({ locals: { HPC_DONE: 1 } });
  run(macros['voice hoist precheck'], again);
  assert.deepStrictEqual(again.said, [], 'not twice for the same hoist operation');
  assert.ok(/"HPC_DONE"},"value":0/.test(txt('HOISTING')), 'HOISTING clears the flag');
  const arm = macros['hoist_arming_and extension'];
  assert.deepStrictEqual(arm[arm.length - 1], { call_macro: 'voice hoist precheck' }, 'called at the end of the arm macro, after the switch wait');
  assert.ok(!JSON.stringify(macros['voice hoist precheck'].filter((c) => c['#comment'] === undefined)).includes('SDK_HOIST_CONTROL_MODE'), 'the control mode is not read (not verified in the simulator)');
}

// H4: hook height
{
  const h = (ft, who) => run(macros['voice hoist height'], makeEnv({ fn: { 'hoist_get_distance_from_ground:ft': ft }, params: { who } })).said;
  assert.deepStrictEqual(h(32.8, 'crew'), [['HCL.H', '35']], 'about 10 m: 35 ft');
  assert.deepStrictEqual(h(29, null), [['HCL.H', '30']], 'empty hook');
  assert.deepStrictEqual(h(9.8, 'crew'), [['HCL.H', '10']], 'about 3 m: 10 ft');
  assert.deepStrictEqual(h(3, 'crew'), [], 'under 4 ft: silent');
  assert.deepStrictEqual(h(80, 'crew'), [], 'hook still high (reel limit): no wrong height');
  assert.deepStrictEqual(h(20, 'helirescuer'), [], 'heli rescuer has HRS.*');
  const down = macros['hoist down'];
  const calls = down.filter((c) => c.call_macro === 'voice hoist height');
  assert.strictEqual(calls.length, 2, 'two height calls in hoist down');
  const i0 = down.indexOf(calls[0]);
  assert.ok(down[i0 - 1].hoist_control === 'reel_down', 'the first call comes after the cable slowed down');
  assert.ok(down[i0 + 1].wait_for && down[i0 + 1].wait_for.fn === 'hoist_get_distance_from_ground:m' && down[i0 + 1].lt === 3, 'waits for 3 m');
  assert.ok(down[down.indexOf(calls[1]) + 1].wait_for.fn === 'hoist_get_distance_from_ground:ft', 'the wait for the ground stays');
  assert.ok(!txt('hoist up empty').includes('voice hoist height'), 'not on the way up');
}

// V11: debrief by events
{
  const d = (lv, ls) => run(macros['voice debrief events'], makeEnv({ lv: Object.fromEntries(Object.entries(lv).map(([k, v]) => ['L:' + k, v])), locals: { LIFESCORE: ls } }));
  let e = d({ DBF_DEAD: 1, DBF_HARD: 2, DBF_FAIL: 1, DBF_WAIT: 1 }, 2);
  assert.deepStrictEqual(e.said.map((s) => s[0]), ['DBF.DEAD', 'DBF.HARD', 'DBF.FAIL', 'DBF.WAIT'], 'one line for each event, in order');
  assert.deepStrictEqual([e.lv['L:DBF_DEAD'], e.lv['L:DBF_HARD'], e.lv['L:DBF_FAIL'], e.lv['L:DBF_WAIT']], [0, 0, 0, 0], 'counters cleared');
  assert.deepStrictEqual(d({ DBF_HARD: 1 }, 5).said.map((s) => s[0]), ['DBF.HARD'], 'only the hard landing');
  assert.deepStrictEqual(d({}, 5).said.map((s) => s[0]), ['DBF.OK'], 'no event and a good outcome');
  assert.deepStrictEqual(d({}, 2).said, [], 'no event and a bad outcome: nothing to add');
  assert.deepStrictEqual(d({ DBF_WAIT: 1 }, 5).said.map((s) => s[0]), ['DBF.WAIT'], 'a long wait alone is not DBF.OK');
  const chat = macros['voice say'] && JSON.stringify(macros['voice say']);
  assert.ok(chat.includes('AUDIO_DECLUT') && txt('voice debrief events').includes('"declut":1'), 'chatter');
  // call site: after the debrief chat, before the rotor wait
  const all = JSON.stringify(macros);
  assert.ok(all.indexOf('{"call_macro":"voice debrief chat"},{"call_macro":"voice debrief events"}') > 0, 'called right after the debrief chat');
  // event sites
  assert.ok(threadsSrc.includes('"L:DBF_HARD"'), 'hard landing counted in the landing monitor, before the voice call');
  assert.ok(threadsSrc.indexOf('"L:DBF_HARD"') < threadsSrc.indexOf('voice hard landing'), 'counted before the voice call');
  const pd = macros['voice patient died'];
  assert.ok(JSON.stringify(pd.slice(0, 5)).includes('L:DBF_DEAD'), 'death counted before the throttle and the voice guard');
  assert.ok(!txt('failure engine').includes('DBF_FAIL'), 'the failure engine is untouched (test-failure-ladder)');
  assert.ok(JSON.stringify(macros['failure crew announce'].slice(0, 3)).includes('L:DBF_FAIL'), 'aircraft failure counted at the start of the announce macro, before the voice guard');
  assert.ok(JSON.stringify(macros).includes('"set":{"local":"fa_type"},"value":"LEAK"},{"set":{"local":"fa_arg"},"value":1},{"set":{"var":["L:DBF_FAIL","number"]}'), 'fuel leak counted');
  assert.ok(JSON.stringify(macros).includes('{"set":{"local":"ops_progress_warning"},"value":1},{"set":{"var":["L:DBF_WAIT","number"]},"value":1}'), 'stall warning counted');
  assert.ok(['DBF_HARD', 'DBF_DEAD', 'DBF_FAIL', 'DBF_WAIT'].every((n) => txt('accept_dispatch').includes(`L:${n}`)), 'cleared at a new dispatch');
}
console.log('hoist pre-check, hook height and debrief events ok');
