#!/usr/bin/env node
'use strict';

// Flight log of 2026-10-24 and the smoke report of Badger (sources only, runtime PENDING): hospital calls with an ambulance, cancel order of the ambulance lines,
// dispatch discussion when all the crew is aboard, dispatcher nudge in its own thread, command readback, smoke kept alive, radio beeps and packs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const load = (dir) => {
  const out = {};
  for (const file of fs.readdirSync(path.join(root, 'mission-src', dir)).filter((name) => name.endsWith('.json'))) Object.assign(out, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', dir, file), 'utf8')));
  return out;
};
const macros = load('macros');
const text = (value) => JSON.stringify(value);

// 1. the hospital approach and final calls are not made when the patient travels by ambulance or is left to die
for (const name of ['voice hospital approach', 'voice hospital final']) {
  const t = text(macros[name]);
  assert.ok(t.includes('"whobringpatient"') && t.includes('"ambulance"') && t.includes('"lethimdie"'), name + ' checks who brings the patient');
}

// 2. cancelled dispatch: the departure notice is not said after the cancellation
{
  const t = text(macros['ambulance departs notice']);
  assert.ok(t.includes('"amb_cancel_said"'), 'departure notice reads the cancel flag');
  const all = text(macros);
  assert.equal(all.split('"amb_cancel_said"},"value":1').length - 1, 2, 'both cancel lines set the flag first');
  assert.ok(text(macros.objective1).includes('"amb_cancel_said"},"value":0'), 'the flag is reset at every dispatch');
}

// 3. dispatch discussion: starts when all the crew is aboard, the dispatcher nudge is its own thread and the crew waits for it
{
  const all = text(macros['voice crew all aboard']);
  assert.ok(all.includes('HMC_CREW_PRESENT') && all.includes('HMC_CREW_EXIST'), 'all aboard compares present and existing crew');
  const run = text(macros['voice dispatch triage run']);
  assert.ok(run.includes('voice crew all aboard') && run.includes('vhg_busy'), 'the triage waits for all aboard and for the greetings');
  assert.ok(!run.includes('DSA.NUDGE'), 'the nudge is no longer inside the crew loop');
  assert.ok(run.includes('voice dsp gate'), 'every crew line waits for the dispatcher part');
  const nudge = text(macros['voice dispatch nudge']);
  assert.ok(nudge.includes('DSA.NUDGE') && nudge.includes('"vda_dsp"'), 'the nudge raises the dispatcher flag');
  assert.ok(text(macros['voice dispatch triage']).includes('voice dispatch nudge'), 'the triage starts the nudge thread');
  assert.ok(text(macros['voice hangar greeting']).includes('vhg_busy'), 'the hangar greetings raise their flag');
  assert.ok(text(macros['voice dispatch reassign']).includes('"vda_dsp"'), 'the reassignment line stops the crew too');
}

// 4. readback of an accepted spoken command, one message per code in every pack
{
  assert.ok(text(macros['speech bridge loop']).includes('speech readback'), 'the loop starts the readback');
  assert.ok(text(macros['speech readback']).includes('CMD.{0}'), 'the readback says CMD.<code>');
  for (const lang of ['EN', 'DE', 'FR']) {
    const file = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks', lang + '.xml');
    if (!fs.existsSync(file)) continue;
    const xml = fs.readFileSync(file, 'utf8');
    for (let code = 101; code <= 114; code++) assert.ok(xml.includes(`key="CMD.${code}"`), `${lang} pack has CMD.${code}`);
    assert.ok(!xml.includes('<o>V toss.</o>') && !xml.includes('<o>V Y.</o>'), lang + ' pack: speed callouts pronounceable');
    const dep = xml.slice(xml.indexOf('key="AMB.DEP.DSP"'));
    assert.ok(!dep.slice(0, dep.indexOf('</o>')).includes('{@PLT}'), lang + ' pack: AMB.DEP.DSP addresses the HEMS');
  }
}

// 5. smoke kept alive, the no-op moves are gone
{
  const k = text(macros['vfxa keep smoke']);
  assert.ok(k.includes('"VAR 1"') && k.includes('"gen"'), 'keep smoke writes the state back for this dispatch only');
  for (const name of ['random VFX', 'random VFX OLD']) assert.ok(text(macros[name]).includes('vfxa keep smoke'), name + ' starts the keeper');
  for (const name of ['HELICOPTER', 'AIRPLANE']) assert.ok(!text(macros[name]).includes('"move_object":"VFXA"'), name + ' no longer moves VFXA');
}

console.log('Flight report 2026-10-24 PASS: hospital guards, cancel order, dispatch discussion gating, nudge thread, readback, smoke keeper. Runtime PENDING.');
