#!/usr/bin/env node

'use strict';

// Payload station weights: executes `station weights recompute`, `kit weights target` and `set station weight` on scripted
// simulator answers and checks the thread, the reload at objective1, the option pipeline and the technical page switch.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'mission-src/manifest.json'), 'utf8'));
const loadSection = (section) => Object.assign({}, ...manifest.modules[section].map((m) => JSON.parse(fs.readFileSync(path.join(root, 'mission-src', m.file), 'utf8'))));
const macros = loadSection('macros');
const threads = loadSection('threads');
const text = (value) => JSON.stringify(value);

class Sim {
  constructor() {
    this.locals = { HXX: 'H145' };
    this.globals = { STATION_1: 90, STATION_2: 90, STATION_3: 90, STATION_4: 90, STATION_5: 90, STATION_6: 90 };
    this.vars = {};
    this.seats({ copilot: 1, pilot: 1, pax1: 0, pax2: 0, stretcher: 0, pax3: 0 });
  }
  // seat LVARs: IMPL_PILOT1 reads 0 when the copilot is present, SDK_CABIN_PAX_n 1 when seated, PAX_5 2 with a patient.
  // The pilot is the simmer: the mission flag PILOT_OUT (1 = outside); the pilot model LVAR IMPL_PILOT0 stays 1 (hidden by an option).
  seats({ copilot, pilot, pax1, pax2, stretcher, pax3 }) {
    this.vars['L:H145_IMPL_PILOT1'] = copilot ? 0 : 1;
    this.locals.PILOT_OUT = pilot ? 0 : 1;
    this.vars['L:H145_IMPL_PILOT0'] = 1;
    this.vars['L:H145_SDK_CABIN_PAX_1'] = pax1;
    this.vars['L:H145_SDK_CABIN_PAX_2'] = pax2;
    this.vars['L:H145_SDK_CABIN_PAX_5'] = stretcher;
    this.vars['L:H145_SDK_CABIN_PAX_3'] = pax3;
  }
  name(varName) { return varName.replace(/\{local:(\w+)\}/g, (_, n) => this.locals[n]); }
  q(x, p) {
    if (x === null || typeof x !== 'object') return x;
    if (Object.hasOwn(x, 'local')) return this.locals[x.local] ?? null;
    if (Object.hasOwn(x, 'param')) return p[x.param] ?? null;
    if (Object.hasOwn(x, 'global')) return this.globals[x.global] ?? null;
    if (Array.isArray(x.var)) return this.vars[this.name(x.var[0])] ?? null;
    if (x.add) return x.add.map((item) => this.q(item, p)).reduce((sum, n) => sum + n, 0);
    throw new Error(`unsupported query ${text(x)}`);
  }
  cmp(left, c, p) {
    const op = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'].find((o) => Object.hasOwn(c, o));
    const right = this.q(c[op], p);
    return { eq: left === right, ne: left !== right, gt: left > right, gte: left >= right, lt: left < right, lte: left <= right }[op];
  }
  run(list, p = {}) {
    for (const c of list) {
      if (c['#comment']) continue;
      if (c.set) {
        const value = this.q(c.value, p);
        if (c.set.local) this.locals[c.set.local] = value;
        else if (c.set.global) this.globals[c.set.global] = value;
        else if (c.set.var) this.vars[this.name(c.set.var[0])] = value;
        else throw new Error(`unsupported set ${text(c.set)}`);
      } else if (c.if) this.run(this.cmp(this.q(c.if, p), c, p) ? c.then : (c.else || []), p);
      else if (c.call_macro) {
        const args = Object.fromEntries(Object.entries(c.params || {}).map(([k, v]) => [k, this.q(v, p)]));
        this.run(macros[c.call_macro], args);
      } else throw new Error(`unsupported command ${text(c).slice(0, 120)}`);
    }
  }
  call(name, args) { this.run(macros[name], args); }
  recompute() { this.call('station weights recompute'); return this.stations(); }
  stations() { return [1, 2, 3, 4, 5, 6].map((n) => this.vars[`PAYLOAD STATION WEIGHT:${n}`] ?? 0); }
  kit(lvar, value) { this.vars[`L:H145_${lvar}`] = value; }
}
const near = (actual, expected, message) => assert.ok(actual.length === expected.length && actual.every((v, i) => Math.abs(v - expected[i]) < 1e-9), `${message}: ${actual} != ${expected}`);

// ---- people from the seat LVARs
{
  const s = new Sim();
  s.seats({ copilot: 1, pilot: 1, pax1: 1, pax2: 0, stretcher: 0, pax3: 1 });
  near(s.recompute(), [90, 90, 90, 0, 0, 90], 'copilot, pilot, PAX 1 and PAX 3 seated');
  s.seats({ copilot: 0, pilot: 1, pax1: 1, pax2: 1, stretcher: 0, pax3: 1 });
  near(s.recompute(), [0, 90, 90, 90, 0, 90], 'the copilot leaves, PAX 2 boards');
  s.vars['L:H145_SDK_CABIN_PAX_5'] = 1;
  near(s.recompute(), [0, 90, 90, 90, 0, 90], 'an empty stretcher weighs nothing');
  s.vars['L:H145_SDK_CABIN_PAX_5'] = 2;
  near(s.recompute(), [0, 90, 90, 90, 90, 90], 'a stretcher with a patient loads station 5');
  s.globals.STATION_3 = 95;
  near(s.recompute(), [0, 90, 95, 90, 90, 90], 'a changed crew weight setting follows');
  s.globals.STATION_3 = null;
  near(s.recompute(), [0, 90, 0, 90, 90, 90], 'an unset crew weight never breaks the recompute');
  s.seats({ copilot: 0, pilot: 0, pax1: 0, pax2: 0, stretcher: 0, pax3: 0 });
  near(s.recompute(), [0, 0, 0, 0, 0, 0], 'an empty aircraft');
}

// ---- hoist: the weight stays while the person hangs and goes when the person touches the ground
{
  const s = new Sim();
  s.seats({ copilot: 1, pilot: 1, pax1: 1, pax2: 0, stretcher: 0, pax3: 0 });
  s.recompute();
  s.call('set station weight', { station: 3, occupied: 1 }); // lowered by the cable: the weight is kept
  s.seats({ copilot: 1, pilot: 1, pax1: 0, pax2: 0, stretcher: 0, pax3: 0 }); // the seat LVAR already reads empty
  near(s.recompute(), [90, 90, 90, 0, 0, 0], 'the person on the cable still weighs on the station');
  s.call('set station weight', { station: 3, occupied: 0 }); // touches the ground
  near(s.stations(), [90, 90, 0, 0, 0, 0], 'the weight is removed when the person touches the ground');
  s.call('set station weight', { station: 6, occupied: 1 }); // hook starts rising with someone
  near(s.stations(), [90, 90, 0, 0, 0, 90], 'the weight is added when the hook starts rising');
  s.seats({ copilot: 1, pilot: 1, pax1: 0, pax2: 0, stretcher: 0, pax3: 1 }); // arrives and sits
  s.call('set station weight', { station: 6, occupied: 1 });
  near(s.stations(), [90, 90, 0, 0, 0, 90], 'seat LVAR and hoist flag together count the person once');
  s.call('set station weight', { station: 6, occupied: 0 });
  near(s.stations(), [90, 90, 0, 0, 0, 90], 'a cleared flag does not remove a seated person');
}

// ---- kits
const installed = (s, ...names) => names.forEach((n) => s.kit(n, 1));
{
  const s = new Sim();
  installed(s, 'SDK_EQUIP_HOIST', 'SDK_EQUIP_HISL', 'SDK_EQUIP_EMERGENCY_FLOATS');
  s.globals.KIT_WEIGHTS = 'no';
  near(s.recompute(), [90, 90, 0, 0, 0, 0], 'option off: kits weigh nothing');
  s.globals.KIT_WEIGHTS = 'yes';
  near(s.recompute(), [115, 90, 10, 60, 10, 10], 'option on: searchlight on 1, hoist on 4, floats on 3-6');
  near(s.recompute(), [115, 90, 10, 60, 10, 10], 'recomputing again changes nothing');
  s.seats({ copilot: 1, pilot: 1, pax1: 0, pax2: 1, stretcher: 0, pax3: 0 });
  near(s.recompute(), [115, 90, 10, 150, 10, 10], 'the person and the kit add up on the same station');
  s.kit('SDK_EQUIP_HOIST', 0);
  near(s.recompute(), [115, 90, 10, 100, 10, 10], 'removing the hoist removes only its mass');
  s.globals.KIT_WEIGHTS = 'no';
  near(s.recompute(), [90, 90, 0, 90, 0, 0], 'switching the option off removes every kit mass');
}
{
  const s = new Sim();
  s.globals.KIT_WEIGHTS = 'yes';
  s.seats({ copilot: 0, pilot: 0, pax1: 0, pax2: 0, stretcher: 0, pax3: 0 });
  // every kit the target macro reads is installed at its highest value (RADOME 2 replaces RADOME 1)
  const reads = macros['kit weights target'].find((c) => c.if && c.if.global === 'KIT_WEIGHTS').then;
  assert.ok(reads.length >= 20, 'the target macro reads the kits');
  for (const c of reads) s.vars[s.name(c.if.var[0])] = Math.max(s.vars[s.name(c.if.var[0])] ?? 0, c.eq);
  const total = s.recompute().reduce((a, b) => a + b, 0);
  assert.ok(total > 250 && total < 330, `every readable kit installed weighs between 250 and 330 kg, got ${total}`);
}

// ---- static contract
const all = text(macros);
const writers = Object.entries(macros).filter(([, body]) => text(body).includes('"PAYLOAD STATION WEIGHT:')).map(([name]) => name).sort();
assert.deepEqual(writers, ['station weights recompute'], 'only the recompute macro writes the payload stations');
assert.ok(!Object.hasOwn(macros, 'weights') && !Object.hasOwn(macros, 'kit weights sync'), 'the parked weights macro and the delta sync are gone');
// the remaining hoist-flag writers are the hoist macros only
const holders = Object.entries(macros).filter(([, body]) => text(body).includes('"call_macro":"set station weight"')).map(([name]) => name);
const hoistFile = Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/09-hoist-ground-ops.json'), 'utf8')));
assert.ok(holders.length > 0 && holders.every((name) => hoistFile.includes(name) || /hoist/i.test(name)), `set station weight is called only by hoist macros: ${holders.filter((n) => !hoistFile.includes(n) && !/hoist/i.test(n))}`);
const calls = (all.match(/"call_macro":"set station weight"/g) || []).length;
assert.ok(calls > 150 && calls < 260, `the hoist operations keep their station flags (${calls} calls)`);

// objective1 clears the hoist flags and recomputes after a mission reload
const objective1 = text(macros.objective1 || []);
assert.ok([1, 2, 3, 4, 5, 6].every((n) => objective1.includes(`"set":{"global":"HOISTOCC_${n}"},"value":0`)) && objective1.includes('"call_macro":"station weights recompute"'), 'objective1 clears the hoist flags and recomputes the stations');
assert.ok(!objective1.includes('"call_macro":"set station weight"'), 'objective1 no longer sets station weights one by one');

// the thread wakes on every LVAR the recompute depends on
const thread = text(threads['STATION WEIGHTS'] || {});
assert.ok(thread.includes('"or":[') && thread.includes('"call_macro":"station weights read"') && thread.includes('"call_macro":"station weights recompute"'), 'the STATION WEIGHTS thread waits with or and recomputes');
const recomputeText = text(macros['station weights recompute']);
const targetText = text(macros['kit weights target']);
const lvars = [...new Set([...(recomputeText + targetText).matchAll(/L:\{local:HXX\}_(\w+)/g)].map((m) => m[1]))];
assert.ok(lvars.length >= 27, `the recompute reads the seat and kit LVARs (${lvars.length})`);
for (const lv of lvars) assert.ok(thread.includes(`L:{local:HXX}_${lv}`), `the thread watches ${lv}`);
// the pilot is the simmer (PILOT_OUT), never the pilot model LVAR that an option can hide
const withoutComments = text(macros['station weights recompute'].filter((c) => !c['#comment']));
assert.ok(!withoutComments.includes('IMPL_PILOT0') && withoutComments.includes('"local":"PILOT_OUT"'), 'station 2 follows PILOT_OUT, not the pilot model');
assert.ok(thread.includes('"wait_for":{"local":"PILOT_OUT"},"ne":{"local":"SW_P2"}'), 'the thread watches PILOT_OUT');
assert.ok(thread.includes('"wait_for":{"global":"KIT_WEIGHTS"}') && [1, 2, 3, 4, 5, 6].every((n) => thread.includes(`"wait_for":{"global":"STATION_${n}"}`)), 'the thread watches the option and the crew weights');
const readText = text(macros['station weights read']);
for (const m of thread.matchAll(/"ne":\{"local":"(SW_\w+)"\}/g)) assert.ok(readText.includes(`"local":"${m[1]}"`), `${m[1]} is stored by station weights read`);

// the option reaches every layer of the profile pipeline
const has = (macro, needle) => text(macros[macro] || []).includes(needle);
assert.ok(has('save custom aircraft profile', '"key":"KIT_WEIGHTS"') && has('load custom aircraft profile', '"key":"KIT_WEIGHTS"'), 'KIT_WEIGHTS is saved and loaded with the custom profile');
assert.ok(has('resetdefault', '"set":{"global":"KIT_WEIGHTS"},"value":null'), 'resetdefault clears KIT_WEIGHTS');
assert.ok(has('objective1', '"if":{"global":"KIT_WEIGHTS"},"eq":null'), 'objective1 defaults KIT_WEIGHTS');
for (const profile of ['DEFAULT', 'ROOKIE PILOT', 'EXPERT PILOT', 'EXPERT HEMS']) assert.ok(has(`aircraft factory ${profile}`, '"set":{"global":"KIT_WEIGHTS"},"value":"no"'), `factory profile ${profile} sets KIT_WEIGHTS`);
assert.ok(all.includes('"global:KIT_WEIGHTS":{"global":"KIT_WEIGHTS"}'), 'the diagnostic snapshot states the option');
const techpage = text(macros.techpage || []);
assert.ok(techpage.includes('WEIGHT OF THE INSTALLED KITS') && techpage.includes('"set":{"global":"KIT_WEIGHTS"},"value":"yes"') && techpage.includes('"set":{"global":"KIT_WEIGHTS"},"value":"no"'), 'the technical page offers the switch');
assert.ok(techpage.includes('"call_macro":"mark aircraft profile custom"') && techpage.includes('"call_macro":"station weights recompute"'), 'the switch marks the profile CUSTOM and recomputes at once');
const techText = techpage.slice(techpage.indexOf('WEIGHT OF THE INSTALLED KITS'), techpage.indexOf('GROUND HANDLING & DOORS'));
assert.ok(/^[\x20-\x7e]*$/.test(techText), 'the technical page texts are ASCII only');

console.log('Station weights PASS: people from the seat LVARs, hoist flags, kit masses per station, option off/on, reload at objective1, thread, persistence pipeline, technical page.');
