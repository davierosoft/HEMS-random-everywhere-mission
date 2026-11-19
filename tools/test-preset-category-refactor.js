#!/usr/bin/env node
'use strict';

// Issue 16 point 3: the category checks of `toggle mission preset category` use one dynamic
// local (name built from the category) instead of seven explicit blocks, and
// `load current mission preset` makes one call. The production lists are run through the
// registry interpreter and compared with the previous explicit implementation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const interpreter = fs.readFileSync(path.join(__dirname, 'test-multipatient-registry.js'), 'utf8');
const context = { require, __dirname, structuredClone, console, module: { exports: {} } };
vm.runInNewContext(interpreter.slice(0, interpreter.indexOf('const create = () =>')) + '\nmodule.exports = HpgRegistry;', context);
const Base = context.module.exports;

const cats = ['RTC', 'MEB', 'MEO', 'JOB', 'SAR', 'SPORT', 'SECONDARY'];
const accidents = [];
cats.forEach((c, i) => { accidents.push({ id: `a${i}`, is_random: 'yes', browse_category1: c }); accidents.push({ id: `b${i}`, is_random: 'yes', browse_category1: c }); });
accidents.push({ id: 'x', is_random: 'no', browse_category1: 'RTC' });

class Reg extends Base {
  query(q, p) {
    if (q && typeof q === 'object' && !Array.isArray(q)) {
      if (Object.hasOwn(q, 'local') && q.local && typeof q.local === 'object') {
        const name = this.query(q.local, p);
        assert.match(name, /^preset_category_[A-Z]+$/);
        return this.locals[name] ?? null;
      }
      if (q.static === 'accidents') return accidents;
      if (q.table) return (this.presetTable || {})[this.query(q.key, p)] ?? null;
    }
    return super.query(q, p);
  }
}
const load = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const newSrc = load(path.join(root, 'mission-src/macros/02-save-load-presets.json'));
const oldSrc = JSON.parse(execOld());
function execOld() { return require('node:child_process').execFileSync('git', ['show', 'HEAD:mission-src/macros/02-save-load-presets.json'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 }); }

function run(src, category, state) {
  const calls = [];
  const macros = { 'toggle mission preset category': src['toggle mission preset category'],
    'apply mission preset category': [], 'loop yield': [] };
  macros['apply mission preset category'] = [{ '#comment': 'stub' }];
  const h = new Reg(macros);
  h.presetTable = state.table;
  h.locals.MSN_CONFIG_PRESET = 'Config_Table1';
  cats.forEach(c => { h.locals[`preset_category_${c}`] = state.cat[c]; });
  const origCall = h.call.bind(h);
  h.call = (name, params = {}) => { if (name === 'apply mission preset category') { calls.push(JSON.stringify(params)); return; } return origCall(name, params); };
  h.call('toggle mission preset category', { category });
  return { calls, any: h.locals.preset_target_any_enabled, all: h.locals.preset_target_all_enabled, pending: h.locals.preset_group_pending ?? null };
}

let compared = 0;
for (let mask = 0; mask < 128; mask += 17) {
  const cat = {}; cats.forEach((c, i) => { cat[c] = Boolean(mask >> i & 1); });
  for (const tableMode of ['all', 'none', 'half']) {
    const table = {};
    accidents.forEach((a, i) => { table[a.id] = tableMode === 'all' ? true : tableMode === 'half' ? i % 2 === 0 : false; });
    for (const category of ['ALL', ...cats, 'IO']) {
      const state = { cat, table };
      assert.deepEqual(run(newSrc, category, state), run(oldSrc, category, state), `${category} mask ${mask} ${tableMode}`);
      compared += 1;
    }
  }
}

const load1 = JSON.stringify(newSrc['load current mission preset']);
assert.equal((load1.match(/msn preset loading/g) || []).length, 1, 'one loading call');
assert.ok(!/Config_Table[0-5]/.test(load1), 'no explicit table branches');
const toggle = JSON.stringify(newSrc['toggle mission preset category']);
assert.equal((toggle.match(/"local":"preset_category_/g) || []).length, 7, 'seven locals only in the ALL conjunction');
assert.ok(toggle.includes('"local":{"param":"category_local"}'));
console.log(`PASS: preset category refactor equals the explicit version in ${compared} states`);
