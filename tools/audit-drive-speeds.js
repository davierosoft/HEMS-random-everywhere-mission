#!/usr/bin/env node
'use strict';

// Audit of every drive command of the production sources (mission-src/macros): the direct drive_object commands and the calls of the macros that wrap
// one (a macro whose drive_object takes its speed or route from a param). Speeds are km/h. Two checks, both against the user rules of 2026-10-07 and
// 2026-10-17 (a speed limit belongs only to a whole drive of under 2 m, never above 3 km/h; a longer or unknown-length route runs at walking speed,
// 4 to 7; the original behaviour of starting point/baseline-0.997-original-fully-functional.json is the reference):
//   R  regression: the same drive (same macro, same actor, same route) is slower than in the baseline
//   N  new or changed drive (not in the baseline): a person that walks slower than 4 km/h on a route that is not proven shorter than 2 m
//      (a route of named locations, nodes of the road or points of a longer path has no known length)
//   node tools/audit-drive-speeds.js            summary and the findings, exit 1 when there is a finding
//   node tools/audit-drive-speeds.js --all      every drive of the production sources
//   node tools/audit-drive-speeds.js --json     machine readable
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macroDir = path.join(root, 'mission-src', 'macros');
const macros = {};
const fileOf = {};
for (const file of fs.readdirSync(macroDir).filter((n) => n.endsWith('.json')).sort()) {
  const data = JSON.parse(fs.readFileSync(path.join(macroDir, file), 'utf8'));
  for (const [name, body] of Object.entries(data)) { macros[name] = body; fileOf[name] = file; }
}
const baselineFile = path.join(root, 'starting point', 'baseline-0.997-original-fully-functional.json');
const baselineMacros = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')).macros || {} : null;

const WALK_MIN = 4;          // km/h: the lowest walking speed of the baseline for a route
const SHORT_M = 2;           // a drive up to this length may be slower, never above SHORT_MAX_SPEED
const SHORT_MAX_SPEED = 3;
const VEHICLE_MIN = 5;      // km/h: a vehicle that moves over more than SHORT_M metres (the parking manoeuvres) is not slower than this

const isVehicleName = (n) => typeof n === 'string' && /^(ambulance\d*|police\d*|firetruck\d*|ftruck|fire\d*|bus|truck\d*|car_crash|wreckedcar\d*|trailer)$/i.test(n);

function walk(node, visit) {
  if (Array.isArray(node)) node.forEach((child) => walk(child, visit));
  else if (node && typeof node === 'object') {
    visit(node);
    for (const v of Object.values(node)) walk(v, visit);
  }
}
const literal = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : null);
const describe = (v) => (v === undefined ? '(none)' : typeof v === 'object' ? JSON.stringify(v) : String(v));

function wrappersOf(all) {
  const w = {};
  for (const [name, body] of Object.entries(all)) {
    walk(body, (node) => {
      const d = node.drive_object;
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        const viaParam = (v) => v && typeof v === 'object' && (v.param || v.local);
        if (viaParam(d.speed) || viaParam(d.to)) w[name] = w[name] || d;
      }
    });
  }
  return w;
}

// the points of a route; strings and {closest,to} have no known length
function points(to) {
  if (Array.isArray(to)) return to;
  if (to && typeof to === 'object' && ('bearing' in to || 'bearing2' in to)) return [to];
  return null;
}
function xy(p) {
  if (!p || typeof p !== 'object') return null;
  const bearing = literal(p.bearing2 !== undefined ? p.bearing2 : p.bearing);
  const dist = literal(p.dist);
  if (bearing === null || dist === null) return null;
  const a = (bearing * Math.PI) / 180;
  return { x: dist * Math.sin(a), y: dist * Math.cos(a), frame: (p.bearing2 !== undefined ? 'b2:' : 'b:') + describe(p.object) };
}
// the legs between consecutive points of the same frame are known; the first leg from the place of the actor never is
function routeInfo(to) {
  const pts = points(to);
  if (!pts) return { known: 0, legs: 0, unknownLegs: 1, first: null, n: 0, provenShort: false };
  const xs = pts.map(xy);
  let known = 0, legs = 0, unknownLegs = 0;
  for (let i = 1; i < pts.length; i += 1) {
    if (xs[i] && xs[i - 1] && xs[i].frame === xs[i - 1].frame) { known += Math.hypot(xs[i].x - xs[i - 1].x, xs[i].y - xs[i - 1].y); legs += 1; }
    else unknownLegs += 1;
  }
  const first = xs[0] ? Math.hypot(xs[0].x, xs[0].y) : null;
  // proven short: a single offset point close to its reference (the actor stands at the reference), or legs that add up to under SHORT_M with a close first point
  const provenShort = (pts.length === 1 && first !== null && first <= SHORT_M) || (pts.length > 1 && unknownLegs === 0 && known <= SHORT_M && first !== null && first <= SHORT_M);
  return { known, legs, unknownLegs, first, n: pts.length, provenShort };
}

// the validator caps the speed of the HEMS walkers (hoist_crew, pax3, hpax1) at 2.5 times the shortest geometric route of a drive with two or more waypoints
function guardCap(drive) {
  if (!['hoist_crew', 'pax3', 'hpax1'].includes(drive.name) || !Array.isArray(drive.to)) return Infinity;
  const polar = (w) => {
    if (Array.isArray(w)) return w.flatMap(polar);
    if (!w || typeof w !== 'object') return [];
    if (Array.isArray(w.closest)) return w.closest.flatMap(polar);
    const b = typeof w.bearing2 === 'number' ? w.bearing2 : typeof w.bearing === 'number' ? w.bearing : null;
    if (b === null || typeof w.dist !== 'number' || w.dist < 0) return [];
    const r = (b * Math.PI) / 180;
    return [{ x: w.dist * Math.sin(r), y: w.dist * Math.cos(r) }];
  };
  const sets = drive.to.map(polar);
  if (sets.length < 2 || sets.some((s) => s.length === 0)) return Infinity;
  let min = Infinity;
  const visit = (i, prev, dist) => {
    if (i === sets.length) { min = Math.min(min, dist); return; }
    sets[i].forEach((q) => visit(i + 1, q, dist + (prev ? Math.hypot(q.x - prev.x, q.y - prev.y) : 0)));
  };
  visit(0, null, 0);
  return !Number.isFinite(min) || min <= 0 ? Infinity : 2.5 * min;
}

function collect(all, files, wrappers) {
  const out = [];
  const add = (macro, kind, d) => out.push({
    macro, file: files ? files[macro] : '', kind,
    name: d.name === undefined ? '(?)' : describe(d.name),
    speed: d.speed, speedNum: literal(d.speed),
    var1: describe(d.VAR1 !== undefined ? d.VAR1 : d.var1),
    multiplier: d.speedMultiplier === undefined ? null : d.speedMultiplier,
    to: d.to, toKey: JSON.stringify(d.to === undefined ? null : d.to), route: routeInfo(d.to), node: d
  });
  for (const [name, body] of Object.entries(all)) {
    walk(body, (node) => {
      const d = node.drive_object;
      if (d && typeof d === 'object' && !Array.isArray(d) && wrappers[name] !== d) add(name, 'direct', d);
      if (typeof node.call_macro === 'string' && wrappers[node.call_macro] && node.params) {
        const p = node.params;
        add(name, 'wrapper:' + node.call_macro, { name: p.name !== undefined ? p.name : (node.call_macro.match(/^drive (\w+) safe/) || [])[1], to: p.to, speed: p.speed, VAR1: p.var1, speedMultiplier: p.speedMultiplier });
        out[out.length - 1].callNode = node;
      }
    });
  }
  return out;
}

const wrappers = wrappersOf(macros);
const drives = collect(macros, fileOf, wrappers);
const baseDrives = baselineMacros ? collect(baselineMacros, null, wrappersOf(baselineMacros)) : [];
const baseByMacro = {};
baseDrives.forEach((d) => { (baseByMacro[d.macro] = baseByMacro[d.macro] || []).push(d); });

// ---- compare with the baseline: same macro, then the same actor and route; else the same actor in the same position ----
const used = new Set();
for (const d of drives) {
  const list = baseByMacro[d.macro] || [];
  let m = list.find((b) => !used.has(b) && b.name === d.name && b.toKey === d.toKey && b.var1 === d.var1);
  if (!m) m = list.find((b) => !used.has(b) && b.name === d.name && b.toKey === d.toKey);
  d.match = m ? 'same' : null;
  if (!m) {
    const sameActor = list.filter((b) => !used.has(b) && b.name === d.name);
    const index = drives.filter((x) => x.macro === d.macro && x.name === d.name).indexOf(d);
    const cand = sameActor[0];
    if (cand && index >= 0) { m = cand; d.match = 'changed'; }
  }
  if (m) used.add(m);
  d.base = m || null;
}

const findings = [];
for (const d of drives) {
  const vehicle = isVehicleName(d.name);
  const r = d.route;
  const reasons = [];
  const bs = d.base && (!vehicle || d.match === 'same') ? d.base.speedNum : null;
  const capped = d.speedNum !== null && d.node && d.speedNum >= Math.floor(guardCap(d.node) * 10) / 10 - 1e-9;
  if (d.base && d.speedNum !== null && bs !== null && d.speedNum < bs && !capped) reasons.push(`R: ${d.speedNum} km/h, baseline ${bs} km/h (${d.match} route)`);
  if (d.base && d.speedNum === null && bs !== null) reasons.push(`R: speed ${describe(d.speed)} (an expression), baseline ${bs} km/h`);
  if (!vehicle && d.speedNum !== null && d.speedNum < WALK_MIN && !r.provenShort && d.match !== 'same' && !capped) {
    reasons.push(`N: ${d.speedNum} km/h on a route of ${r.n} point(s), ${r.legs} known leg(s) of ${r.known.toFixed(1)} m${r.first === null ? '' : ', first point ' + r.first.toFixed(1) + ' m'}${d.match === 'changed' ? ' (baseline ' + describe(d.base.speed) + ' on another route)' : ' (not in the baseline)'}`);
  }
  if (!vehicle && d.speedNum !== null && d.speedNum < WALK_MIN && !r.provenShort && d.match === 'same' && bs !== null && d.speedNum >= bs) {
    // same as the baseline: the original design, listed only with --all
  }
  if (vehicle && d.multiplier === null && d.speedNum !== null && d.speedNum < VEHICLE_MIN && d.match !== 'same' && !(r.provenShort) && !(r.first !== null && r.first <= SHORT_M && r.n <= 1)) {
    reasons.push(`V: vehicle at ${d.speedNum} km/h on a route of ${r.n} point(s)${r.first === null ? '' : ', first point ' + r.first.toFixed(1) + ' m'} (not in the baseline)`);
  }
  if (typeof d.multiplier === 'number' && d.multiplier < 1 && !vehicle && !(d.base && d.base.multiplier === d.multiplier)) reasons.push(`R: speedMultiplier ${d.multiplier}`);
  if (reasons.length) findings.push({ ...d, reasons });
}

module.exports = { drives, findings, wrappers, isVehicleName, WALK_MIN, VEHICLE_MIN, macros, fileOf, guardCap };
if (require.main !== module) return;
const args = process.argv.slice(2);
const strip = (d) => ({ macro: d.macro, file: d.file, kind: d.kind, name: d.name, speed: d.speed, var1: d.var1, to: d.to, baseSpeed: d.base ? d.base.speed : null, match: d.match, reasons: d.reasons });
if (args.includes('--json')) { console.log(JSON.stringify({ drives: drives.length, findings: findings.map(strip) }, null, 1)); process.exit(findings.length ? 1 : 0); }

console.log(`Drive audit: ${drives.length} drives (${drives.filter((d) => d.kind === 'direct').length} direct, ${drives.filter((d) => d.kind !== 'direct').length} through ${Object.keys(wrappers).length} wrapper macros); baseline ${baseDrives.length} drives`);
const speeds = {};
drives.forEach((d) => { const k = d.speedNum === null ? (d.speed === undefined ? 'none' : 'expr') : String(d.speedNum); speeds[k] = (speeds[k] || 0) + 1; });
console.log('speeds used (km/h):', Object.entries(speeds).sort((a, b) => (Number(a[0]) || 999) - (Number(b[0]) || 999)).map(([k, v]) => `${k}x${v}`).join(' '));
const rows = args.includes('--all') ? drives.map((d) => ({ ...d, reasons: d.reasons || [] })) : findings;
for (const f of rows) {
  console.log(`${f.file.slice(0, 2)} [${f.macro}] ${f.kind} ${f.name} VAR1=${f.var1} speed=${describe(f.speed)} ${f.reasons && f.reasons.length ? '<- ' + f.reasons.join('; ') : ''}`);
}
const veh = findings.filter((f) => f.reasons.some((x) => x.startsWith('V:'))).length;
const reg = findings.filter((f) => f.reasons.some((x) => x.startsWith('R:'))).length;
const neu = findings.filter((f) => f.reasons.some((x) => x.startsWith('N:'))).length;
console.log(`${findings.length} finding(s): ${reg} slower than the baseline (R), ${neu} new or changed walks under ${WALK_MIN} km/h with no proven short route (N), ${veh} vehicle manoeuvres under ${VEHICLE_MIN} km/h over more than ${SHORT_M} m (V)`);
process.exit(findings.length ? 1 : 0);
