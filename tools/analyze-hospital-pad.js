#!/usr/bin/env node
'use strict';

// Geometry of the hospital pad from a debug snapshot (tester report 2026-10-12, build 169.45: the medic never reached the hospital stretcher).
// Reads the rows `target = hospital pad` of `ground_crew_runtime_trace` written by the macro `hospital pad trace`: one row of distances from the
// helicopter and one row `pad_points` (coordinates in degrees of the helicopter, its true heading, the waypoints hospital_user, DAMBWP, DAMBU, DRUP,
// DSTR, DMED, hospital_wp1 and the stretcher, the medic, hoist_crew and pax1) for each stage: after_predefined_move, after_landing_locations,
// after_hospital_crew_walk, before_second_drive and second_drive_t<seconds> (every 10 s while the second drive runs).
// It rebuilds the plane around the helicopter (metres east/north, bearings relative to its heading as the mission uses them), the routes that the
// mission drives with the points that are given as bearing and distance from the helicopter, and prints for every route the legs, the turns, the
// total length against the straight line (zig-zag index) and the turns above 90 degrees (reversals). Usage:
//   node tools/analyze-hospital-pad.js <snapshot.json> [more snapshots]      (also a file with the trace text)
//   node tools/analyze-hospital-pad.js --selftest
const fs = require('node:fs');

const NAMES = ['hospital_user', 'DAMBWP', 'DAMBU', 'DRUP', 'DSTR', 'DMED', 'hospital_wp1'];
const OBJECTS = ['str', 'med', 'crew', 'pax1'];
const OBJECT_LABEL = { str: 'hospital stretcher', med: 'hospital medic', crew: 'hoist_crew', pax1: 'pax1' };

// the routes of User destination1 (bearing and distance are from the helicopter, as the mission writes them)
const H = (bearing, dist) => ({ h: [bearing, dist] });
const ROUTES = [
  { name: 'hospital medic (ambumedic)', who: 'med', points: ['DRUP', 'DAMBWP', H(350, 10)] },
  { name: 'hospital stretcher (ambustretcher)', who: 'str', points: ['DAMBWP', H(10, 9), H(345, 9)] },
  { name: 'hoist_crew first walk', who: 'crew', points: [H(20, 3.2), H(40, 3.7), H(130, 3), H(200, 2)] },
  { name: 'hoist_crew walk with the trolley', who: 'crew', points: [H(120, 5), H(88, 4), H(5, 9), H(345, 7.5)] }
];

function rowsOf(snapshot) {
  const trace = snapshot.ground_crew_runtime_trace;
  const out = [];
  if (Array.isArray(trace)) {
    for (const r of trace) out.push({ time: Number(r.time), target: String(r.target), state: String(r.state) });
  } else {
    for (const line of String(trace || '').split(/\r?\n/)) {
      const m = /time=([^;]+); macro=[^;]*; actor=[^;]*; target=([^;]*); state=(.*)\}\s*$/.exec(line);
      if (m) out.push({ time: Number(m[1]), target: m[2].trim(), state: m[3] });
    }
  }
  return out.filter((r) => r.target === 'hospital pad');
}

function parsePoints(state) {
  const parts = state.split(' | ').map((s) => s.trim());
  const head = /^pad_points (.+)$/.exec(parts[0]);
  if (!head) return null;
  const rec = { stage: head[1], v: {} };
  for (const p of parts.slice(1)) {
    const m = /^([A-Za-z0-9_]+)=(-?[0-9.eE+-]+)$/.exec(p);
    if (m) rec.v[m[1]] = Number(m[2]);
  }
  return rec;
}

function parseDistances(state) {
  const m = /^([^:]+): from the helicopter (.*)$/.exec(state);
  if (!m) return null;
  const rec = { stage: m[1], d: {} };
  const re = /(hospital_user|DAMBWP|DAMBU|DRUP|DSTR|DMED|hospital_wp1|stretcher to hospital_user|hoist_crew to stretcher|stretcher|medic|hoist_crew|ambulance5|pax1) (-?[0-9.]+)/g;
  let x;
  while ((x = re.exec(m[2]))) rec.d[x[1]] = Number(x[2]);
  return rec;
}

// metres east and north of the helicopter
function frame(rec) {
  const lat0 = rec.v.heli_lat;
  const lon0 = rec.v.heli_lon;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const at = (lat, lon) => ({ x: (lon - lon0) * 111320 * k, y: (lat - lat0) * 110574 });
  const pts = {};
  const known = (n) => rec.v[n + '_lat'] !== undefined && rec.v[n + '_lat'] !== -1 && rec.v[n + '_lon'] !== undefined && rec.v[n + '_lon'] !== -1;
  for (const n of [...NAMES, ...OBJECTS]) if (known(n)) pts[n] = at(rec.v[n + '_lat'], rec.v[n + '_lon']);
  return { pts, hdg: rec.v.heli_hdg };
}

const polar = (p, hdg) => {
  const dist = Math.hypot(p.x, p.y);
  const absolute = (Math.atan2(p.x, p.y) * 180) / Math.PI;
  return { dist, bearing: ((absolute - hdg) % 360 + 360) % 360 };
};
const fromHeli = (h, hdg) => {
  const a = ((hdg + h.h[0]) * Math.PI) / 180;
  return { x: h.h[1] * Math.sin(a), y: h.h[1] * Math.cos(a) };
};

function routeGeometry(route, fr) {
  const start = fr.pts[route.who];
  const pts = [];
  if (start) pts.push({ label: OBJECT_LABEL[route.who], p: start });
  for (const w of route.points) {
    if (typeof w === 'string') { if (fr.pts[w]) pts.push({ label: w, p: fr.pts[w] }); else pts.push({ label: w + ' (missing)', p: null }); }
    else pts.push({ label: 'heli ' + w.h[0] + ' deg ' + w.h[1] + ' m', p: fromHeli(w, fr.hdg) });
  }
  const ok = pts.filter((q) => q.p);
  const legs = [];
  const turns = [];
  let total = 0;
  for (let i = 1; i < ok.length; i++) {
    const dx = ok[i].p.x - ok[i - 1].p.x;
    const dy = ok[i].p.y - ok[i - 1].p.y;
    const len = Math.hypot(dx, dy);
    legs.push({ from: ok[i - 1].label, to: ok[i].label, len, dir: ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360 });
    total += len;
  }
  for (let i = 1; i < legs.length; i++) {
    let t = legs[i].dir - legs[i - 1].dir;
    t = ((t + 540) % 360) - 180;
    turns.push(Math.abs(t));
  }
  const straight = ok.length > 1 ? Math.hypot(ok[ok.length - 1].p.x - ok[0].p.x, ok[ok.length - 1].p.y - ok[0].p.y) : 0;
  return { legs, turns, total, straight, index: straight > 0.01 ? total / straight : null, reversals: turns.filter((t) => t > 90).length, missing: pts.length - ok.length };
}

function analyze(snapshot) {
  const rows = rowsOf(snapshot);
  const stages = [];
  const dist = [];
  for (const r of rows) {
    const p = parsePoints(r.state);
    if (p) stages.push({ time: r.time, ...p });
    else { const d = parseDistances(r.state); if (d) dist.push({ time: r.time, ...d }); }
  }
  return { rows: rows.length, stages, dist };
}

const f1 = (n) => (n === undefined || n === null || Number.isNaN(n) ? '-' : n.toFixed(1));

function report(result, label) {
  const out = [];
  out.push('== ' + label + ': ' + result.rows + ' rows of the hospital pad, ' + result.stages.length + ' coordinate rows');
  if (!result.stages.length) { out.push('   no pad_points rows: the snapshot comes from a build without the hospital pad diagnosis (169.51 or later has it)'); return out.join('\n'); }
  for (const st of result.stages) {
    const fr = frame(st);
    out.push('-- t=' + st.time + ' ' + st.stage + ' (helicopter heading ' + f1(st.v.heli_hdg) + ')');
    const names = [...NAMES, ...OBJECTS].filter((n) => fr.pts[n]);
    out.push('   ' + names.map((n) => { const q = polar(fr.pts[n], fr.hdg); return (OBJECT_LABEL[n] || n) + ' ' + f1(q.dist) + ' m @' + f1(q.bearing); }).join('; '));
    if (st.stage === 'after_landing_locations' || st.stage === 'after_hospital_crew_walk' || st.stage === 'before_second_drive') {
      for (const route of ROUTES) {
        const g = routeGeometry(route, fr);
        if (!g.legs.length) continue;
        out.push('   route ' + route.name + ': legs ' + g.legs.map((l) => f1(l.len)).join(' + ') + ' = ' + f1(g.total) + ' m, straight ' + f1(g.straight) + ' m, zig-zag index ' + f1(g.index) + ', turns ' + g.turns.map(f1).join('/') + ', reversals ' + g.reversals + (g.missing ? ', missing points ' + g.missing : ''));
      }
    }
    if (fr.pts.crew && fr.pts.str) out.push('   hoist_crew to stretcher ' + f1(Math.hypot(fr.pts.crew.x - fr.pts.str.x, fr.pts.crew.y - fr.pts.str.y)) + ' m');
  }
  const walk = result.stages.filter((s) => /^second_drive_t/.test(s.stage));
  if (walk.length) {
    out.push('-- second drive, every 10 s: seconds, hoist_crew to stretcher, hoist_crew from the helicopter, stretcher from the helicopter');
    let prev = null;
    for (const s of walk) {
      const fr = frame(s);
      if (!fr.pts.crew || !fr.pts.str) continue;
      const cs = Math.hypot(fr.pts.crew.x - fr.pts.str.x, fr.pts.crew.y - fr.pts.str.y);
      const ch = polar(fr.pts.crew, fr.hdg).dist;
      const sh = polar(fr.pts.str, fr.hdg).dist;
      out.push('   ' + s.stage + ': ' + f1(cs) + ' m, ' + f1(ch) + ' m, ' + f1(sh) + ' m' + (prev !== null ? (cs > prev + 0.5 ? '  (moving away from the stretcher)' : cs < prev - 0.5 ? '  (approaching)' : '  (not moving)') : ''));
      prev = cs;
    }
  }
  // consistency: the distances the macro measured against the coordinates
  for (const d of result.dist) {
    const st = result.stages.find((s) => s.stage === d.stage && s.time === d.time);
    if (!st) continue;
    const fr = frame(st);
    const bad = [];
    for (const n of NAMES) if (d.d[n] !== undefined && d.d[n] >= 0 && fr.pts[n] && Math.abs(polar(fr.pts[n], fr.hdg).dist - d.d[n]) > 2.5) bad.push(n + ' ' + d.d[n] + ' vs ' + f1(polar(fr.pts[n], fr.hdg).dist));
    if (bad.length) out.push('   t=' + d.time + ' ' + d.stage + ': distance row and coordinates differ by more than 2.5 m: ' + bad.join(', '));
  }
  return out.join('\n');
}

// ---- synthetic check: a known geometry must give the known numbers ----
function synthetic() {
  const lat0 = 56.5;
  const lon0 = -3.0;
  const hdg = 90;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const toLL = (p) => ({ lat: lat0 + p.y / 110574, lon: lon0 + p.x / (111320 * k) });
  const heliPoint = (b, d) => fromHeli({ h: [b, d] }, hdg);
  const named = { hospital_user: heliPoint(0, 6), DAMBWP: heliPoint(340, 18), DAMBU: heliPoint(10, 20), DRUP: heliPoint(10, 15), DSTR: heliPoint(345, 9), DMED: heliPoint(350, 10) };
  const objects = { str: heliPoint(345, 9), med: heliPoint(340, 9), crew: heliPoint(345, 7.5) };
  const v = { heli_lat: lat0, heli_lon: lon0, heli_hdg: hdg };
  for (const [n, p] of Object.entries(named)) { const ll = toLL(p); v[n + '_lat'] = ll.lat; v[n + '_lon'] = ll.lon; }
  v.hospital_wp1_lat = -1; v.hospital_wp1_lon = -1;
  for (const [n, p] of Object.entries(objects)) { const ll = toLL(p); v[n + '_lat'] = ll.lat; v[n + '_lon'] = ll.lon; }
  v.pax1_lat = -1; v.pax1_lon = -1;
  const stateOf = (stage) => 'pad_points ' + stage + ' | ' + Object.entries(v).map(([k2, x]) => k2 + '=' + x).join(' | ');
  const trace = [
    '@{sequence=1; time=2300; macro=ambulance_ops; actor=hoist_crew; target=hospital pad; state=' + stateOf('after_landing_locations') + '}',
    '@{sequence=2; time=2355; macro=ambulance_ops; actor=hoist_crew; target=hospital pad; state=' + stateOf('before_second_drive') + '}'
  ].join('\n');
  return { ground_crew_runtime_trace: trace };
}

function selftest() {
  const result = analyze(synthetic());
  if (result.stages.length !== 2) throw new Error('two coordinate rows expected, got ' + result.stages.length);
  const fr = frame(result.stages[0]);
  const q = polar(fr.pts.DAMBWP, fr.hdg);
  if (Math.abs(q.dist - 18) > 0.1 || Math.abs(q.bearing - 340) > 0.1) throw new Error('DAMBWP expected 18 m at 340, got ' + q.dist + ' m at ' + q.bearing);
  const stretcher = routeGeometry(ROUTES[1], fr);
  // stretcher route: from 9 m at 345, DAMBWP (18 m at 340), 9 m at 10, 9 m at 345: legs 13.6 + 20.2 + 3.9 (rounded) and a reversal at the third point
  if (stretcher.legs.length !== 3 || stretcher.missing !== 0) throw new Error('three legs and no missing point expected');
  if (!(stretcher.total > stretcher.straight)) throw new Error('the route has to be longer than the straight line');
  const crew = routeGeometry(ROUTES[3], fr);
  const expected = Math.hypot(heliPointXY(120, 5).x - fr.pts.crew.x, heliPointXY(120, 5).y - fr.pts.crew.y);
  if (Math.abs(crew.legs[0].len - expected) > 0.05) throw new Error('first leg of the trolley walk wrong');
  const flat = routeGeometry({ who: 'crew', points: [H(0, 10), H(180, 10)] }, { pts: { crew: { x: 0, y: 0 } }, hdg: 0 });
  if (flat.reversals !== 1) throw new Error('a there-and-back of two legs has one turn of 180 degrees: one reversal');
  return report(result, 'synthetic geometry');
  function heliPointXY(b, d) { return fromHeli({ h: [b, d] }, 90); }
}

module.exports = { analyze, report, routeGeometry, frame, polar, selftest, ROUTES };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--selftest')) {
    try { console.log(selftest()); console.log('analyze-hospital-pad selftest PASS'); }
    catch (e) { console.error('analyze-hospital-pad selftest FAIL: ' + e.message); process.exit(1); }
  } else if (!args.length) {
    console.error('usage: node tools/analyze-hospital-pad.js <snapshot.json> [more snapshots] | --selftest');
    process.exit(2);
  } else {
    for (const file of args) {
      let snap;
      const text = fs.readFileSync(file, 'utf8');
      try { snap = JSON.parse(text); } catch (e) { snap = { ground_crew_runtime_trace: text }; }
      console.log(report(analyze(snap), file));
    }
  }
}
