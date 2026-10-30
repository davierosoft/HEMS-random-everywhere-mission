'use strict';
// Halloween (31 October, local date of the simulator): the scene, its 15 spoken/sound lines (HW1-HW15) and its models.
// Static gate: the mission raises each counter, the packs of the Companion have the text, the basepack has the wav and the sound.xml entry.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const macros = {};
const data = {};
for (const [dir, target] of [['macros', macros], ['data', data]]) {
  const folder = path.join(root, 'mission-src', dir);
  for (const name of fs.readdirSync(folder).filter((file) => file.endsWith('.json'))) Object.assign(target, JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8')));
}
const text = (value) => JSON.stringify(value);
const all = text(macros);

// 1. The mode is on only on 31 October, and the scene is raised only by the two accident scenes that exist in the original.
assert.ok(/"E:LOCAL MONTH OF YEAR","number"\]\},"eq":10\},\{"require":\{"var":\["E:LOCAL DAY OF MONTH","number"\]\},"eq":31\}[^]{0,120}"halloween"\},"value":1/.test(all), 'halloween must be set only on month 10, day 31');
const callers = Object.entries(macros).filter(([, commands]) => text(commands).includes('"call_macro":"random halloween"')).map(([name]) => name).sort();
assert.deepEqual(callers, ['CAMPING_SITE', 'CRASH_SITE'], 'random halloween must be called by CRASH_SITE and CAMPING_SITE only');

// 2. Every one of the 15 lines is raised by the scene, the hoist button or the engine.
const raised = new Set();
for (const match of all.matchAll(/"L:\{local:VCP\}HW(\d+)"/g)) raised.add(Number(match[1]));
for (let n = 1; n <= 15; n += 1) assert.ok(raised.has(n), `L:{local:VCP}HW${n} is never raised by the mission`);
assert.ok([...raised].every((n) => n >= 1 && n <= 15), `unknown HW counter raised: ${[...raised].join(',')}`);
assert.ok(text(macros['random halloween']).includes('"local":"crewvisitended"') && text(macros['random halloween']).includes('"local":"crewpatientloaded"'), 'HW13-HW15 wait for the crew visit and the load');
for (const local of ['crewvisitended', 'crewpatientloaded']) assert.ok(Object.entries(macros).some(([name, commands]) => name !== 'random halloween' && text(commands).includes(`"set":{"local":"${local}"},"value":"yes"`)), `${local} is never set to yes`);

// 3. Companion packs: text, lvar and wav for each line.
const packs = path.join(root, '..', 'HPG-Mission-Companion', 'voicepacks');
if (fs.existsSync(packs)) {
  for (const lang of ['EN', 'DE', 'FR']) {
    const xml = fs.readFileSync(path.join(packs, `${lang}.xml`), 'utf8');
    for (let n = 1; n <= 15; n += 1) {
      const match = xml.match(new RegExp(`<message key="HW\\.${n}"([^>]*)>([^]*?)</message>`));
      assert.ok(match, `${lang}.xml has no HW.${n}`);
      assert.ok(match[1].includes(`lvar="L:{VCP}HW${n}"`), `${lang}.xml HW.${n}: lvar must be L:{VCP}HW${n}`);
      assert.ok(match[1].includes(`wav="AND.HW${n}.wav"`), `${lang}.xml HW.${n}: wav must be AND.HW${n}.wav`);
      assert.ok(/<o>[^<\s][^<]*<\/o>/.test(match[2]), `${lang}.xml HW.${n} has no text`);
    }
  }
}

// 4. Wav files and sound.xml entries of the pack ANDREW (VOICEPACK default).
const sounds = path.join(root, 'basepack', 'Simobjects', 'Airplanes', 'hpg-airbus-h145-ems', 'Sound');
const soundXml = fs.readFileSync(path.join(sounds, 'sound.xml'), 'utf8');
for (let n = 1; n <= 15; n += 1) {
  const wav = path.join(sounds, `AND.HW${n}.wav`);
  assert.ok(fs.existsSync(wav) && fs.statSync(wav).size > 10000, `AND.HW${n}.wav is missing or empty in basepack`);
  assert.ok(new RegExp(`<Sound [^>]*FileName="AND\\.HW${n}"[^>]*LocalVar="ANDREWHW${n}"`).test(soundXml), `sound.xml has no AND.HW${n} entry with LocalVar ANDREWHW${n}`);
}

// 5. Models: the 30West models need the add-on, so each creation has a fallback, and the decor exists only with the add-on.
const scene = text(macros['random halloween']);
for (const list of ['zombiesw', 'zombiesi', 'zombiesd']) {
  const creations = (scene.match(new RegExp(`\\{"create_object":\\{"name":"z[^"]*","title":\\{"struct":\\{"static":"${list}"\\}[^]*?"location"`, 'g')) || []);
  assert.ok(creations.length >= 1, `no creation from ${list}`);
  for (const creation of creations) assert.ok(creation.includes('"fallback_title":"Airbus H145 '), `a ${list} creation has no fallback_title`);
}
assert.ok(scene.includes('"local":"30West_installed"},"eq":"OK"') && scene.includes('HDECO{local:hallo_deco}'), 'the decor must be guarded by 30West_installed');
for (const list of ['zombiesw', 'zombiesi', 'zombiesd', 'healthhalloween']) assert.ok(Array.isArray(data[list]) && data[list].length > 0, `data ${list} is missing`);
assert.ok(data.zombiesd.length >= 3 && data.zombiesd.slice(2).every((title) => /^30West (Stone|pumpkin)/.test(title)), 'zombiesd entries from index 2 are the decor (stones, pumpkin)');

// 6. The tablet shows the alert only on 31 October.
assert.ok(all.includes('"local":"hallomessage"},"ne":null},{"require":{"local":"halloween"},"eq":1'), 'the alert of the tablet must require halloween');

console.log(`Halloween PASS: HW1-HW15 raised, in 3 packs, wav and sound.xml entries present, ${data.healthhalloween.length} pathologies, models with fallback.`);
