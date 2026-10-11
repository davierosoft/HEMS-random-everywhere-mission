#!/usr/bin/env node
'use strict';

// Scene spacing watchdog (08-ground-response.json). The production macros run on a small synchronous interpreter of the
// HPG subset with a flat road model: x right, y toward the accident, which sits at the origin; vehicles park heading
// forward and reverse along y (VELOCITY Z -3 moves 0.83 m per second, the rate measured from the 169.26 log: 5 m in 6 s).
// HPG/MSFS vehicle behavior is NOT modeled: this proves priority, limits and ordering only; the simulator test stays pending.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const macroDirectory = path.join(__dirname, '..', 'mission-src', 'macros');
const macros = {};
for (const file of fs.readdirSync(macroDirectory).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(macroDirectory, file), 'utf8')));
const collect = (value, predicate, found = []) => {
  if (Array.isArray(value)) value.forEach((item) => collect(item, predicate, found));
  else if (value && typeof value === 'object') { if (predicate(value)) found.push(value); Object.values(value).forEach((child) => collect(child, predicate, found)); }
  return found;
};

class Returned extends Error {}
class Road {
  constructor(positions, locals = {}) {
    this.pos = Object.fromEntries(Object.entries(positions).map(([name, p]) => [name, [...p]]));
    this.pos.accident_location = [0, 0];
    this.locals = { ambu1stopdistance: 7, ambu2stopdistance: 9, scene_spacing_lock: 0, ...locals };
    this.vz = {}; this.reversed = {}; this.traces = [];
  }
  dist(a, b) { return Math.hypot(this.pos[a][0] - this.pos[b][0], this.pos[a][1] - this.pos[b][1]); }
  cmp(a, node, p) {
    const op = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].filter((key) => Object.hasOwn(node, key));
    assert.equal(op.length, 1, JSON.stringify(node));
    const b = this.q(node[op[0]], p);
    return { eq: () => a === b, ne: () => a !== b, gt: () => a > b, gte: () => a >= b, lt: () => a < b, lte: () => a <= b }[op[0]]();
  }
  q(x, p) {
    if (x === null || typeof x !== 'object') return x;
    if (Object.hasOwn(x, 'local')) return this.locals[x.local] ?? null;
    if (Object.hasOwn(x, 'param')) return p[x.param] ?? null;
    if (x.has_object !== undefined) return Number(Boolean(this.pos[x.has_object]));
    if ((x.location || x.object) && x.var === 'distance:m') return this.dist(x.location ?? x.object, x.to);
    if (x.object && x.var === 'VELOCITY Z') return this.vz[x.object] ?? 0;
    if (x.require) return this.cmp(this.q(x.require, p), x, p);
    if (x.and) return Number(x.and.every((item) => this.q(item, p)));
    if (x.or) return Number(x.or.some((item) => this.q(item, p)));
    if (x.add) return x.add.map((item) => this.q(item, p)).reduce((sum, n) => sum + n, 0);
    if (x.subtract) return x.subtract.map((item) => this.q(item, p)).reduce((a, b) => a - b);
    if (x.multiply) return x.multiply.map((item) => this.q(item, p)).reduce((a, b) => a * b, 1);
    if (x.round !== undefined) { const step = x.to ?? 1; return Math.round(this.q(x.round, p) / step) * step; }
    if (x.text !== undefined) return x.text.replace(/\{(\d+)\}/g, (_, n) => this.q(x.params[Number(n)], p));
    throw new Error(`Unsupported query ${JSON.stringify(x)}`);
  }
  run(list, p = {}) {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.sleep !== undefined) { for (const [name, v] of Object.entries(this.vz)) if (v) { this.pos[name][1] += (v / 3) * 0.83 * c.sleep; this.reversed[name] = (this.reversed[name] || 0) + Math.abs((v / 3) * 0.83 * c.sleep); } }
      else if (c.set) {
        const value = this.q(c.value, p);
        if (c.set.local) this.locals[c.set.local] = value;
        else if (c.set.object && c.set.var === 'VELOCITY Z') this.vz[c.set.object] = value;
        else throw new Error(`Unsupported set ${JSON.stringify(c.set)}`);
      } else if (c.if) this.run(this.cmp(this.q(c.if, p), c, p) ? c.then : (c.else || []), p);
      else if (c.while) { let guard = 0; while (this.cmp(this.q(c.while, p), c, p)) { assert.ok(++guard < 60, 'while loop does not end'); this.run(c.do, p); } }
      else if (c.wait_for) assert.ok(this.cmp(this.q(c.wait_for, p), c, p), `wait not satisfied ${JSON.stringify(c.wait_for)}`);
      else if (c.call_macro) {
        if (c.call_macro === 'ground crew runtime trace') this.traces.push(this.q(c.params.state, p));
        else this.call(c.call_macro);
      } else if (Object.hasOwn(c, 'return')) throw new Returned();
      else throw new Error(`Unsupported command ${JSON.stringify(c).slice(0, 140)}`);
    }
  }
  call(name) { assert.ok(macros[name], `unknown macro ${name}`); try { this.run(macros[name]); } catch (error) { if (!(error instanceof Returned)) throw error; } }
}
const gap = (road, a, b) => road.dist(a, b);
const lateral = (road, a, b) => Math.abs(road.pos[a][0] - road.pos[b][0]);
const frontal = (road, a, b) => Math.abs(road.pos[a][1] - road.pos[b][1]);

// ---- static contract --------------------------------------------------------------------------
{
  const watchers = ['park_ambulance1_scene', 'park_ambulance2_scene', 'park_police', 'park_firetruck1', 'park_firetruck2'];
  for (const name of watchers) {
    const calls = collect(macros[name], (c) => c.create_thread && JSON.stringify(c.create_thread.commands) === JSON.stringify([{ call_macro: 'scene spacing watch' }]));
    assert.equal(calls.length, 1, `${name} starts the scene watchdog once, in its own thread`);
  }
  assert.deepEqual(collect(macros['scene spacing watch'], (c) => c.call_macro).map((c) => c.call_macro), ['scene spacing ambulance2', 'scene spacing ambulance1', 'scene spacing police'], 'ambulance 2, ambulance 1, then the police; no fire engine step');
  // priority: nobody reverses for a lower priority vehicle, the fire engines never reverse
  const yields = (name) => collect(macros[name], (c) => c.call_macro === 'scene spacing pair').length;
  assert.equal(yields('scene spacing ambulance1'), 3); assert.equal(yields('scene spacing ambulance2'), 3); assert.equal(yields('scene spacing police'), 4);
  const text = (name) => JSON.stringify(macros[name]);
  assert.ok(!text('scene spacing ambulance1').includes('"location":"police"') && !text('scene spacing ambulance1').includes('"has_object":"police"'), 'an ambulance never yields to the police');
  for (const name of ['scene spacing ambulance1', 'scene spacing ambulance2', 'scene spacing police', 'scene spacing watch', 'scene spacing pair']) {
    assert.equal(collect(macros[name], (c) => c.set?.object?.startsWith('firetruck') || c.drive_object?.name?.startsWith('firetruck')).length, 0, `${name} never moves a fire engine`);
    assert.ok(!text(name).includes('bearing2'), `${name} never moves sideways`);
  }
  assert.ok(collect(macros['scene spacing police'], (c) => c.set?.object === 'police' && c.set.var === 'VELOCITY Z' && c.value === -3).length === 1);
  assert.equal(collect(macros['scene spacing ambulance1'], (c) => c.set?.object === 'firetruck1').length, 0);
  // lateral jogs of the parking macros stay within the road (4 m), the spacing is made along it
  const jogs = (name, vehicle) => collect(macros[name], (c) => c.drive_object?.name === vehicle).map((c) => c.drive_object.to[0]);
  for (const p of [...jogs('park_ambulance1_scene', 'ambulance1'), ...jogs('park_firetruck1', 'firetruck1')]) assert.ok(p.dist <= 6, JSON.stringify(p));
  assert.deepEqual(jogs('park_ambulance1_scene', 'ambulance1').map((p) => `${p.bearing2}:${p.dist}`), ['270:4', '90:2', '270:5']);
  assert.deepEqual(jogs('park_ambulance2_scene', 'ambulance2').map((p) => `${p.bearing2}:${p.dist}`), ['270:4', '90:2', '270:5'], 'ambulance 2 parks on the left like ambulance 1, the fire engines on the right');
  assert.deepEqual(jogs('park_ambulance2_scene', 'ambulance2').map((p) => `${p.bearing2}:${p.dist}`), ['270:4', '90:2', '270:5'], 'ambulance 2 parks on the left like ambulance 1 (fire engines on the right)');
  // the route-stop worker must not hold the parking flag of the real call (169.26 log: the fire engine never parked)
  for (const [park, v] of [['park_firetruck1', 'fire1'], ['park_firetruck2', 'fire2']]) {
    assert.equal(collect(macros[park], (c) => c.set?.local === `${v}_parking` && c.value === 'yes').length, 1, `${park} sets the parking flag once`);
    const gate = collect(macros[park], (c) => c.if?.param === 'stop_only' && c.eq === 1 && JSON.stringify(c.then) === JSON.stringify([{ set: { local: `${v}_stop_active` }, value: 'yes' }]));
    assert.equal(gate.length, 1, `${park}: the stop worker only marks ${v}_stop_active`);
    assert.ok(JSON.stringify(gate[0].else).includes(`"wait_for":{"local":"${v}_stop_active"},"ne":"yes"`), `${park}: the real call waits for the stop worker`);
    assert.equal(collect(macros[park], (c) => c.set?.local === `${v}_stop_active` && c.value === 'no').length, 1, `${park}: the stop worker releases ${v}_stop_active`);
  }
}

// ---- behavior ---------------------------------------------------------------------------------
// R = 26: the road ends 26 m from the accident, farther than every stop distance (169.26 log).
{
  // 169.26 log: the fire engine never parked and stayed mid-road; ambulance and police were parked beside it.
  const road = new Road({ firetruck1: [0, -26], ambulance1: [-4, -24], police: [4, -29] });
  road.call('scene spacing watch');
  assert.equal(road.reversed.firetruck1 ?? 0, 0, 'the fire engine never reverses');
  assert.ok(road.reversed.ambulance1 > 0, 'the ambulance yields to the fire engine first');
  assert.ok(lateral(road, 'ambulance1', 'firetruck1') >= 6 || frontal(road, 'ambulance1', 'firetruck1') >= 10, 'the ambulance is clear of the fire engine');
  assert.ok(road.reversed.police > 0 && gap(road, 'police', 'firetruck1') > 9, 'then the police yields');
  assert.ok(road.pos.police[1] <= road.pos.ambulance1[1] + 0.01 || lateral(road, 'police', 'ambulance1') >= 6, 'the police ends behind (or clear of) the ambulance: it closes the scene');
  assert.equal(road.locals.scene_spacing_lock, 0, 'the lock is released');
}
{
  // The fire engine parked (4 right, 6 forward): the layout of the 169.26 scene needs almost nothing.
  const road = new Road({ firetruck1: [4, -20], ambulance1: [-4, -24], police: [4, -29] });
  road.call('scene spacing watch');
  assert.equal(road.reversed.ambulance1 ?? 0, 0, 'ambulance 8 m to the side of the fire engine: no move');
  assert.ok(road.reversed.police > 0 && road.reversed.police < 3, 'the police is 9 m behind the fire engine in its lane: one short step');
  assert.ok(frontal(road, 'police', 'firetruck1') >= 10);
}
{
  // Ambulances left, fire engines right (two of each): everything stands at the road end, ambulance 2 and ambulance 1 on the same spot.
  const road = new Road({ firetruck1: [4, -20], firetruck2: [4, -32], ambulance1: [-4, -24], ambulance2: [-4, -24], police: [4, -29] });
  road.call('scene spacing watch');
  assert.equal((road.reversed.firetruck1 ?? 0) + (road.reversed.firetruck2 ?? 0), 0, 'the fire engines never reverse');
  assert.ok(road.reversed.ambulance1 === undefined || road.reversed.ambulance1 === 0 || road.reversed.ambulance2 > 0, 'the ambulances separate along their lane');
  assert.ok(frontal(road, 'ambulance1', 'ambulance2') >= 10, 'ambulance 2 ends at least 10 m from ambulance 1 in the lane');
  assert.ok(lateral(road, 'ambulance1', 'firetruck1') >= 6, 'the ambulance lane is clear of the fire lane');
  assert.ok(road.traces.some((t) => /blocked=1/.test(t)), 'the police sits between the two fire engines: it is traced as blocked, never driven through one');
  assert.ok(road.pos.police[1] >= road.pos.firetruck2[1], 'the police never drives through the second fire engine');
}
{
  // Two ambulances in the lane, the second one ahead: the one behind reverses, the one ahead is blocked and stays.
  const road = new Road({ ambulance1: [-4, -26], ambulance2: [-4, -24] });
  road.call('scene spacing watch');
  assert.equal(road.reversed.ambulance2 ?? 0, 0, 'the ambulance ahead stays');
  assert.ok(road.reversed.ambulance1 > 0 && frontal(road, 'ambulance1', 'ambulance2') >= 10, 'the ambulance behind yields');
}
{
  // The police is the only vehicle to reverse: ambulances and fire engines at their places.
  const road = new Road({ firetruck1: [4, -20], ambulance1: [-4, -24], police: [4, -22] });
  road.call('scene spacing watch');
  assert.deepEqual(Object.keys(road.reversed), ['police'], 'only the police moved');
  assert.ok(frontal(road, 'police', 'firetruck1') >= 10);
}{
  // The other branch of the ambulance (closer than its stop distance) faces back along the road: no reverse.
  const road = new Road({ firetruck1: [0, -3], ambulance1: [-4, 0.5], police: [4, -29] }, { ambu1stopdistance: 7 });
  road.call('scene spacing watch');
  assert.equal(road.reversed.ambulance1 ?? 0, 0, 'an ambulance parked closer than its stop distance is left alone');
}
{
  // Nothing near: nothing moves.
  const road = new Road({ firetruck1: [4, -10], ambulance1: [-4, -22], police: [4, -35] });
  road.call('scene spacing watch');
  assert.deepEqual(Object.keys(road.reversed), [], 'a clean scene is not touched');
}

// ---- police park plan: the worst case is predicted from what is dispatched, the police chooses lane and reverse -----------------
{
  const plan = (rb, locals) => {
    const road = new Road({ police: [0, -rb] }, { police1stopdistance: 20, fire1stopdistance: 12, ambu1stopdistance: 7, ambu2stopdistance: 9, FIREENGINE_AVAIL: 0, AMBU_AVAIL: 0, VFX: 0, HELOVICTIMS: 1, ...locals });
    road.call('police park plan');
    return { lane: road.locals.pp_lane, pre: Math.round(road.locals.pp_pre * 10) / 10, rb: road.locals.pp_rb, road };
  };
  // 169.26 scene: the road ends at 26 m, farther than the police stop distance (20): the road end rules for everybody.
  let r = plan(26, { FIREENGINE_AVAIL: 2, AMBU_AVAIL: 2 });
  assert.deepEqual([r.lane, r.pre], [90, 32], 'one fire engine and one ambulance: fire lane, 6 m behind its stop (fire engine at 20 m, police ends at 30 m)');
  r = plan(26, { FIREENGINE_AVAIL: 2, AMBU_AVAIL: 2, VFX: 8 });
  assert.equal(r.lane, 270, 'random fire (two fire engines) against one ambulance: the police takes the ambulance lane');
  assert.equal(r.pre, 36, 'and ends 10 m behind the ambulance (at 24 m)');
  r = plan(26, { FIREENGINE_AVAIL: 2, AMBU_AVAIL: 2, VFX: 8, HELOVICTIMS: 3 });
  assert.deepEqual([r.lane, r.pre], [90, 44], 'two fire engines and two ambulances: tie, fire lane, 10 m behind the second fire engine (at 32 m)');
  r = plan(26, {});
  assert.deepEqual([r.lane, r.pre], [90, 31], 'nothing dispatched: the old 5 m');
  // the police stopped at its own stop distance (long road): nobody is pushed to the road end, the plan stays close to the old 5 m
  r = plan(20, { FIREENGINE_AVAIL: 2, AMBU_AVAIL: 2, VFX: 8, HELOVICTIMS: 3, police1stopdistance: 32, fire1stopdistance: 16, ambu1stopdistance: 26, ambu2stopdistance: 31 });
  assert.equal(r.road.locals.pp_road_end, 0, 'no road end information when the police stopped on its stop distance');
  assert.ok(r.pre <= 20 + 5 + 14, 'the reverse stays moderate on a long road');
  // an existing second vehicle counts as expected too
  const road = new Road({ police: [0, -26], firetruck1: [4, -20], firetruck2: [4, -32] }, { police1stopdistance: 20, fire1stopdistance: 12, ambu1stopdistance: 7, ambu2stopdistance: 9, FIREENGINE_AVAIL: 1, AMBU_AVAIL: 0, VFX: 0, HELOVICTIMS: 1 });
  road.call('police park plan');
  assert.equal(road.locals.pp_f2, 1, 'a second fire engine already on the scene is expected');
  assert.ok(road.traces.at(-1).startsWith('plan lane='), 'the plan is traced');
  // park_police uses the plan: the lane picks the jog side and a closed loop reaches the predicted distance
  const police = JSON.stringify(macros.park_police);
  assert.ok(police.includes('"call_macro":"police park plan"') && police.includes('"pp_pre"') && police.includes('"pp_lane"'));
  const jogsOf = (lane) => collect(macros.park_police, (c) => c.if?.local === 'pp_lane' && c.eq === lane)[0];
  assert.ok(JSON.stringify(jogsOf(90).then).includes('"bearing2":90,"dist":4') && JSON.stringify(jogsOf(90).else).includes('"bearing2":270,"dist":4'), 'the lanes keep the 4 m jogs: 4 right then 2 forward, or 4 left then 2 forward');
}

console.log('Scene spacing PASS: the priority watchdog (fire never reverses, ambulances first, then the police), the lateral and frontal limits, the blocked case, the route-stop race of the fire engines and the 4 m lateral jogs. HPG/MSFS PENDING.');
