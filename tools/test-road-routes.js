'use strict';
// "road nodes generator" creates the traffic routes route1..3 and takes the approach points from their array entries
// (walked backward from the end), not from OSM data. A small interpreter runs the real macro on synthetic routes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const macroDir = path.join(root, 'mission-src', 'macros');
const shared = JSON.parse(fs.readFileSync(path.join(macroDir, '14-shared-runtime.json'), 'utf8'));
const scene = JSON.parse(fs.readFileSync(path.join(macroDir, '06-scene-generation.json'), 'utf8'));
const macro = shared['road nodes generator'];
assert.ok(Array.isArray(macro), 'road nodes generator missing');

// ---------- static contract ----------
const text = JSON.stringify(macro);
assert.ok(!text.includes('osm_query_data') && !text.includes('osm_get_'), 'the generator must not query OSM data any more');
for (const n of [1, 2, 3]) {
  assert.ok(text.includes(`"name":"route${n}"`) && text.includes(`"route":"route${n}"`), `the generator must create and read route${n}, the traffic route`);
  for (const name of ['wpc', 'wprescue', 'wph', 'wpt']) assert.ok(text.includes(`"to":"${name}${n}"`), `missing ${name}${n}`);
  assert.ok(text.includes(`"to":"route_ready${n}"`) || text.includes(`"route_ready${n}"`), `missing route_ready${n}`);
}
assert.ok(text.includes('legacy scene routing check') && text.includes('"legacy_scene_routing"'), 'the generator must respect the legacy routing mode');
assert.ok(text.includes('"to":"rescue_location"') && text.includes('"to":"accident_location"'), 'the route ends at rescue_location, else at accident_location');
const residential = JSON.stringify(scene.residential);
assert.ok(residential.includes('"wph{local:amburoad}"') && !residential.includes('"wpt{local:amburoad}"'), 'the residential heading must start from wph');
const launcher = JSON.stringify(scene['random residential road nodes launcher']);
for (const n of [1, 2, 3]) assert.ok(launcher.includes(`"create_location":"wph${n}"`), `the cardinal fallback must create wph${n}`);
assert.ok(launcher.includes('"road_wait"') && launcher.includes('"ne":"failed"'), 'the fallback wait must end early when the generator fails');
for (const name of ['random residential road nodes launcher', 'random crashed launcher']) {
  const body = JSON.stringify(scene[name]);
  for (const n of [1, 2, 3]) assert.ok(body.includes(`"set":{"local":"route_ready${n}"},"value":"no"`), `${name} must reset route_ready${n}`);
}
// the traffic creates its own route only when the generator did not (fallback, legacy mode)
const traffic = JSON.stringify(scene['random traffic launcher'] || scene['random traffic launcher'.replace('launcher', '')] || Object.values(scene).filter((m) => JSON.stringify(m).includes('trafficroads')));
for (const n of [1, 2, 3]) {
  assert.ok(traffic.includes(`{"if":{"local":"route_ready${n}"},"ne":"yes","then":[{"create_route":{"name":"route${n}"`), `the traffic must create route${n} only when route_ready${n} is not yes`);
}

// ---------- interpreter ----------
const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;
function haversine(a, b) {
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function destination(a, bearing, d) {
  const br = rad(bearing), dr = d / R, lat1 = rad(a[0]), lon1 = rad(a[1]);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(dr) + Math.cos(lat1) * Math.sin(dr) * Math.cos(br));
  const lon2 = lon1 + Math.atan2(Math.sin(br) * Math.sin(dr) * Math.cos(lat1), Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2));
  return [(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI];
}
class Sim {
  // routeFor(call) -> entries or null; call = {n, name, from, to}
  constructor(routeFor) {
    this.locals = { roadnode_query_generation: 1, roadqueryattempt: 0, NATION: 0, '30West_installed': 'NO' };
    this.params = { road_generation: 1 };
    this.locations = { accident_location: [45, 8] };
    this.routeFor = routeFor; this.routes = {}; this.calls = []; this.legacy = 'no'; this.objects = [];
  }
  value(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map((x) => this.value(x));
    if ('local' in v) return this.locals[v.local];
    if ('param' in v) return this.params[v.param];
    if ('static' in v) return { 0: { title: 'marker' } };
    if ('route' in v) return this.routes[v.route];
    if ('has_location' in v) return this.locations[v.has_location] ? 1 : 0;
    if ('add' in v) return v.add.map((x) => this.value(x)).reduce((a, b) => a + b);
    if ('subtract' in v) { const [a, b] = v.subtract.map((x) => this.value(x)); return a - b; }
    if ('multiply' in v) return v.multiply.map((x) => this.value(x)).reduce((a, b) => a * b);
    if ('divide' in v) { const [a, b] = v.divide.map((x) => this.value(x)); return a / b; }
    if ('floor' in v) return Math.floor(this.value(v.floor));
    if ('rand' in v) { const [lo, hi] = v.rand.map((x) => this.value(x)); return lo + (hi - lo) * 0.5; }
    if ('add360' in v) { const [a, b] = v.add360.map((x) => this.value(x)); return (((a + b) % 360) + 360) % 360; }
    if ('create_array' in v) return v.create_array.map((x) => this.value(x));
    if ('struct' in v) {
      let base = this.value(v.struct);
      if ('index' in v) base = base[this.value(v.index)];
      if ('path' in v) base = v.path === 'length' ? base.length : v.path.split('.').reduce((o, k) => (o == null ? o : o[k]), base);
      return base;
    }
    if ('location' in v && v.var === 'distance:m') return haversine(this.locations[v.location], this.locations[v.to]);
    if ('object' in v && v.var === 'distance:m') return 0;
    if ('resolve_location' in v) return this.value(v.resolve_location);
    throw new Error('unsupported value ' + JSON.stringify(v));
  }
  test(cond, cmp, rhs) {
    const lhs = this.value(cond), r = this.value(rhs);
    switch (cmp) {
      case 'eq': return lhs === r || (lhs == null && r == null);
      case 'ne': return !(lhs === r || (lhs == null && r == null));
      case 'gt': return lhs > r; case 'gte': return lhs >= r; case 'lt': return lhs < r; case 'lte': return lhs <= r;
      default: throw new Error('unsupported comparison ' + cmp);
    }
  }
  condition(c) {
    const cmp = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].find((k) => k in c);
    const cond = c.if || c.while;
    if (cond && cond.and) return cond.and.every((o) => this.requireOp(o));
    if (cond && cond.or) return cond.or.some((o) => this.requireOp(o));
    return this.test(cond, cmp, c[cmp]);
  }
  requireOp(o) {
    const cmp = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].find((k) => k in o);
    return this.test(o.require, cmp, o[cmp]);
  }
  zoneLocation(loc) {
    if ('resolve_location' in loc) return this.value(loc.resolve_location);
    if ('bearing' in loc) return destination(this.locations[loc.object], this.value(loc.bearing), this.value(loc.dist));
    throw new Error('unsupported zone ' + JSON.stringify(loc));
  }
  run(cmds) {
    for (const c of cmds) {
      if (c['#comment']) continue;
      if (c.set) {
        const v = this.value(c.value);
        if (c.set.local) this.locals[c.set.local] = v; else if (c.set.param) this.params[c.set.param] = v;
      } else if ('if' in c) {
        const branch = this.condition(c) ? c.then : c.else;
        if (branch) { const r = this.run(branch); if (r === 'return') return r; }
      } else if ('while' in c) {
        let guard = 0;
        while (this.condition(c)) { if (++guard > 5000) throw new Error('loop did not end'); const r = this.run(c.do); if (r === 'return') return r; }
      } else if (c.create_location) {
        this.locations[c.create_location] = this.zoneLocation(c.zones[0].zone.location);
      } else if (c.copy_location) {
        this.locations[c.to] = this.locations[c.copy_location];
      } else if (c.create_route) {
        const q = c.create_route.query;
        const call = { n: this.calls.length + 1, name: c.create_route.name, from: this.locations[q.from], to: q.to, toLocation: this.locations[q.to] };
        this.calls.push(call);
        const entries = this.routeFor(call);
        if (entries) {
          this.routes[call.name] = entries;
          let length = 0;
          for (let i = 1; i < entries.length; i += 1) length += haversine(entries[i - 1], entries[i]);
          this.params['$CREATE_ROUTE:DURATION'] = 120; this.params['$CREATE_ROUTE:DISTANCE'] = length;
        } else { this.params['$CREATE_ROUTE:DURATION'] = null; this.params['$CREATE_ROUTE:DISTANCE'] = null; }
      } else if (c.call_macro === 'legacy scene routing check') {
        this.locals.legacy_scene_routing = this.legacy;
      } else if ('return' in c) {
        return 'return';
      } else if (c.sleep !== undefined || c.create_object || c.point_object || c.destroy_object) {
        if (c.create_object) this.objects.push(c.create_object.name);
      } else {
        throw new Error('unsupported command ' + JSON.stringify(c).slice(0, 120));
      }
    }
    return undefined;
  }
}

// a straight route ending near the end location: entries every 20 m, entry 0 repeated, [lat, lon, alt, spd]
function straight(endPoint, bearingFromEndBack, lengthM, step = 20) {
  const pts = [];
  for (let d = lengthM; d >= 0; d -= step) pts.push(destination(endPoint, bearingFromEndBack, d));
  if (lengthM % step) pts.push(destination(endPoint, bearingFromEndBack, 0));
  const entries = pts.map((p) => [p[0], p[1], 0, 30]);
  entries.unshift(entries[0]);
  return entries;
}
const acc = [45, 8];
const dist = (sim, a, b) => haversine(sim.locations[a], sim.locations[b]);

// 1. three arms to rescue_location (60 m from the accident): west, north and a duplicate of the west tail
{
  const rescue = destination(acc, 180, 60);
  const endW = destination(rescue, 270, 10), endN = destination(rescue, 0, 12);
  const sim = new Sim((c) => (c.n === 1 ? straight(endW, 270, 600) : c.n === 2 ? straight(endN, 0, 800) : straight(endW, 270, 600)));
  sim.locations.rescue_location = rescue;
  sim.run(macro);
  assert.deepEqual(sim.calls.map((c) => c.name), ['route1', 'route2', 'route3', 'route3'], 'the duplicate third arm is retried once in its slot and then given up');
  assert.ok(sim.calls.every((c) => c.to === 'rescue_location'), 'every route ends at rescue_location');
  assert.equal(sim.locals.roads, 2, 'two distinct arms');
  assert.deepEqual([sim.locals.route_ready1, sim.locals.route_ready2, sim.locals.route_ready3], ['yes', 'yes', 'no']);
  assert.equal(sim.locals.has_accident_location, 'yes');
  assert.equal(sim.locals.roadnode_query_status, 'nodes_ready');
  for (const [n, end, len] of [[1, endW, 600], [2, endN, 800]]) {
    sim.locations.end = end;
    for (const [name, want] of [['wpc', 25], ['wprescue', 60], ['wph', 110], ['wpt', len]]) {
      const got = dist(sim, `${name}${n}`, 'end');
      assert.ok(Math.abs(got - want) < 1.5, `${name}${n} must be ${want} m from the route end, got ${got.toFixed(2)}`);
    }
  }
  assert.ok(!sim.locations.wpc3, 'no third arm');
}
// 2. no rescue_location, or one farther than 300 m: the route ends at accident_location
for (const rescue of [null, destination(acc, 180, 500)]) {
  const sim = new Sim((c) => straight(destination(acc, 90, 8), 90, 500));
  if (rescue) sim.locations.rescue_location = rescue;
  sim.run(macro);
  assert.ok(sim.calls.length > 0 && sim.calls.every((c) => c.to === 'accident_location'), 'the route must end at accident_location');
}
// 3. a route longer than 1200 m (the far point snapped to a distant road) is retried once on another bearing
{
  const end = destination(acc, 270, 10);
  const sim = new Sim((c) => (c.n === 1 ? straight(end, 270, 3000) : c.n === 2 ? straight(end, 270, 700) : null));
  sim.run(macro);
  assert.equal(sim.locals.roads, 1);
  assert.equal(sim.calls[0].name, 'route1'); assert.equal(sim.calls[1].name, 'route1');
  assert.notEqual(sim.calls[0].from[0], sim.calls[1].from[0], 'the retry uses another bearing');
  sim.locations.end = end;
  assert.ok(Math.abs(dist(sim, 'wpt1', 'end') - 700) < 1.5, 'wpt = first entry of the accepted route');
}
// 4. a route shorter than the checkpoint: the checkpoint is the start of the route
{
  const end = destination(acc, 90, 8);
  const sim = new Sim((c) => (c.n === 1 ? straight(end, 90, 90) : null));
  sim.run(macro);
  assert.equal(sim.locals.roads, 1);
  sim.locations.end = end;
  assert.ok(Math.abs(dist(sim, 'wph1', 'end') - 90) < 1.5, 'wph = start of a 90 m route');
  assert.ok(Math.abs(dist(sim, 'wpt1', 'end') - 90) < 1.5);
}
// 5. a bend: the points follow the polyline (arc length), not the straight line
{
  const end = destination(acc, 270, 10);
  const corner = destination(end, 270, 100);
  const leg1 = straight(end, 270, 100, 10).slice(1), leg2 = straight(corner, 0, 500, 10).slice(1);
  const entries = [leg2[0], ...leg2, ...leg1.slice(1)];
  const sim = new Sim((c) => (c.n === 1 ? entries : null));
  sim.run(macro);
  assert.ok(Math.abs(haversine(sim.locations.wprescue1, end) - 60) < 1.5, 'wprescue on the first leg');
  assert.ok(Math.abs(haversine(sim.locations.wph1, corner) - 10) < 2, 'wph is 10 m past the corner on the second leg');
  assert.ok(Math.abs(haversine(sim.locations.wpt1, end) - Math.hypot(100, 500)) < 3, 'wpt is the start of the route, 600 m along the bend');
}
// 6. no route at all: failure reported, no arm, no flag
{
  const sim = new Sim(() => null);
  sim.run(macro);
  assert.equal(sim.locals.roads, 0);
  assert.equal(sim.locals.has_accident_location, 'failed');
  assert.equal(sim.locals.roadnode_query_status, 'no_route');
  assert.deepEqual([sim.locals.route_ready1, sim.locals.route_ready2, sim.locals.route_ready3], ['no', 'no', 'no']);
  assert.equal(sim.calls.length, 2, 'slot 1 is tried twice and the generator stops: no hole in the arms');
}
// 7. legacy routing mode (SKIP QUERY or ambu_route_mode legacy): no route is created
{
  const sim = new Sim(() => straight(destination(acc, 270, 10), 270, 600));
  sim.legacy = 'yes';
  sim.run(macro);
  assert.equal(sim.calls.length, 0);
  assert.equal(sim.locals.has_accident_location, 'failed');
  assert.equal(sim.locals.roadnode_query_status, 'legacy_routing');
  assert.equal(sim.locals.route_ready1, 'no');
}
// 8. a restarted mission generation stops the worker before any route
{
  const sim = new Sim(() => straight(destination(acc, 270, 10), 270, 600));
  sim.params.road_generation = 1; sim.locals.roadnode_query_generation = 2;
  sim.run(macro);
  assert.equal(sim.calls.length, 0, 'a stale generation must stop at the first check');
  assert.ok(!sim.locations.wpc1);
}
console.log('Road routes PASS: the generator creates route1..3 to rescue_location, the approach points are 25/60/110 m from the route end and wpt is its start, retries, duplicates, legacy mode and stale generations behave.');
