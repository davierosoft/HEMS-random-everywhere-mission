'use strict';
// Every OSM route used by a rescue vehicle must have a straight-line (legacy) fallback:
//  - create_route sits under a legacy/route-mode guard and is followed by a duration validity check;
//  - every drive or draw_route on a mission route is guarded by a direct-drive flag;
//  - the station query is timeout-guarded and the ETA constant is the measured one.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const macroDir = path.join(root, 'mission-src', 'macros');
const TRAFFIC_ROUTES = new Set(['hallo', 'route1', 'route2', 'route3', 'crash_one']); // scenery traffic, not rescue vehicles
const FLAG = /^(rd_|ambu_direct_drive$|ambulance2_direct_drive$|poli_direct_drive$|fire_direct_drive$|legacy_scene_routing$)/;

function isIf(node) { return node && typeof node === 'object' && node.if && ('then' in node || 'else' in node); }
function condLocal(node) { return node.if && typeof node.if.local === 'string' ? node.if.local : null; }

function audit(modules) {
  const violations = [];
  const routeNames = new Set();
  for (const [file, macros] of Object.entries(modules)) {
    for (const [macro, body] of Object.entries(macros)) {
      (function collect(x) {
        if (Array.isArray(x)) x.forEach(collect);
        else if (x && typeof x === 'object') {
          if (x.create_route && !TRAFFIC_ROUTES.has(x.create_route.name)) routeNames.add(x.create_route.name);
          Object.values(x).forEach(collect);
        }
      })(body);
    }
  }
  for (const [file, macros] of Object.entries(modules)) {
    for (const [macro, body] of Object.entries(macros)) {
      const where = `${file}::${macro}`;
      // guards: stack of enclosing if-nodes; arrays: stack of [array,index] for the validity check
      (function walk(node, guards, arrays) {
        if (Array.isArray(node)) {
          node.forEach((c, i) => walk(c, guards, arrays.concat([[node, i]])));
          return;
        }
        if (!node || typeof node !== 'object') return;
        if (node.create_route && !TRAFFIC_ROUTES.has(node.create_route.name)) {
          const name = node.create_route.name;
          if (!guards.some((g) => FLAG.test(condLocal(g) || '') || (g.if && g.if.global === 'ambu_route_mode'))) {
            violations.push(`${where}: create_route ${name} is not under a legacy/direct guard`);
          }
          let checked = false;
          for (const [arr, idx] of arrays.slice().reverse()) {
            const next = arr.slice(idx + 1, idx + 14);
            const snap = next.find((c) => c && c.set && c.set.local && c.value && c.value.param === '$CREATE_ROUTE:DURATION');
            if (snap && next.some((c) => isIf(c) && condLocal(c) === snap.set.local && ('gt' in c || 'lte' in c || c.eq === null))) { checked = true; break; }
          }
          if (!checked) violations.push(`${where}: create_route ${name} has no duration validity check`);
        }
        const drivesRoute = node.call_macro && /^drive /.test(node.call_macro) && node.params && typeof node.params.to === 'string' && routeNames.has(node.params.to);
        const rawDrive = node.drive_object && typeof node.drive_object.to === 'string' && routeNames.has(node.drive_object.to);
        const draws = typeof node.draw_route === 'string' && routeNames.has(node.draw_route);
        if (drivesRoute || rawDrive || draws) {
          const name = drivesRoute ? node.params.to : rawDrive ? node.drive_object.to : node.draw_route;
          if (!guards.some((g) => FLAG.test(condLocal(g) || ''))) violations.push(`${where}: use of route ${name} is not guarded by a direct-drive flag`);
        }
        for (const [k, v] of Object.entries(node)) {
          if (isIf(node) && (k === 'then' || k === 'else')) walk(v, guards.concat([node]), arrays);
          else walk(v, guards, arrays);
        }
      })(body, [], []);
    }
  }
  return violations;
}

const modules = {};
for (const f of fs.readdirSync(macroDir).filter((n) => n.endsWith('.json'))) modules[f] = JSON.parse(fs.readFileSync(path.join(macroDir, f), 'utf8'));

// 1. the mission passes
const real = audit(modules);
assert.deepEqual(real, [], 'route fallback violations:\n' + real.join('\n'));

// 2. focused failure mode: an unprotected route must be reported (three distinct findings)
const synthetic = audit({ 'synthetic.json': { test: [
  { create_route: { name: 'bad', query: { to: 'a', from: 'b', type: 'car' } } },
  { draw_route: 'bad', stroke: { width: 2 } },
  { call_macro: 'drive ambulance1 safe multiplier', params: { to: 'bad', fallback: 'a', speed: 4, var1: 0, timeout: 120 } },
] } });
assert.equal(synthetic.length, 4, 'synthetic unprotected route must yield 4 findings, got: ' + synthetic.join(' | '));

// 3. station query timeout guards and the measured ETA constant
const ground = JSON.stringify(modules['08-ground-response.json']);
for (const token of ['ambu_station_query_state', 'police_station_query_state', 'fire_station_query_state', '"timeout"']) {
  assert.ok(ground.includes(token), 'missing station query guard: ' + token);
}
for (const [file, macros] of Object.entries(modules)) {
  assert.ok(!JSON.stringify(macros).includes('22.222'), file + ': nominal 22.222 ETA constant must not come back (measured 24.6 m/s at speed 80)');
}
assert.ok(modules['14-shared-runtime.json']['legacy scene routing check'], 'legacy scene routing check macro missing');

console.log('Route legacy fallback PASS: every rescue-vehicle route is guarded, validated and has a direct-drive fallback.');
