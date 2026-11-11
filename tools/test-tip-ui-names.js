#!/usr/bin/env node
'use strict';
// Crew tips name the menus and buttons of the tablet (user request of 2026-11-11, app issue 109 / 114): in a translated pack every name a tip quotes must be
// exactly the text of the same menu or button in the interface translation of that language (uitexts/XX.json), and no English name may be left in the tip.
// NAMES: key of the interface text, as it appears in the tips (case does not matter, the part before a colon, the markers "+ ", "- ", "(P)" are dropped).
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const NAMES = ['UI.0060', 'UI.0063', 'UI.0064', 'UI.0114', 'UI.0157', 'UI.0220', 'UI.0221', 'UI.0309', 'UI.0397', 'UI.0401', 'UI.0402', 'UI.0403', 'UI.0404', 'UI.0413', 'UI.0441', 'UI.0444', 'UI.0447', 'UI.0455', 'UI.0493', 'UI.0513', 'UI.0604', 'UI.0629', 'UI.0637', 'UI.0639', 'UI.0866', 'UI.0867', 'UI.0509'];
// The tips that quote the name (a name only has to appear in the pack at least once; some are inflected or shortened on purpose and listed in SKIP per language).
const SKIP = {
  DE: ['UI.0063', 'UI.0064', 'UI.0220', 'UI.0157', 'UI.0397', 'UI.0444', 'UI.0309', 'UI.0639', 'UI.0637', 'UI.0629', 'UI.0509', 'UI.0414'],
  FR: ['UI.0063', 'UI.0064', 'UI.0220', 'UI.0157', 'UI.0397', 'UI.0444', 'UI.0309', 'UI.0639', 'UI.0637', 'UI.0629', 'UI.0509', 'UI.0414']
};
const ENGLISH = ['Quick links', 'Save or reload a mission', 'Reload last accepted mission', 'Save actual config to file', 'Flight assists', 'Crew health simulation', 'Weight of the installed kits', 'Debug center', 'Capture snapshot', 'Medical options', 'Reset failures', 'Crew chatter', 'Audio options', 'Dispatch options', 'On conditions missions', 'Crew tips', 'Technical page', 'Rookie', 'Expert pilot'];
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'ui-texts.json'), 'utf8'));
const en = new Map(manifest.fields.map((f) => [f.key, f.en]));
const clean = (s) => s.replace(/^[+\-]\s*/, '').replace(/^\(P\)/, '').split(':')[0].replace(/\s*\(.*$/, '').trim().toLowerCase();
const problems = [];
for (const code of ['DE', 'FR']) {
  const ui = JSON.parse(fs.readFileSync(path.join(root, 'uitexts', `${code}.json`), 'utf8')).texts;
  const xml = fs.readFileSync(path.join(root, 'voicepacks', `${code}.xml`), 'utf8');
  const tips = [...xml.matchAll(/<message key="TIP\.[A-Z]+\.\d"[^>]*>([\s\S]*?)<\/message>/g)].map((m) => m[1]).join('\n').toLowerCase();
  for (const key of NAMES) {
    if (SKIP[code].includes(key)) continue;
    const name = clean(ui[key] ?? en.get(key));
    if (!name) { problems.push(`${code} ${key}: no interface text`); continue; }
    if (!tips.includes(name)) problems.push(`${code} ${key}: the tips never quote the interface name "${name}"`);
  }
  for (const e of ENGLISH) if (tips.includes(e.toLowerCase())) problems.push(`${code}: an English interface name is left in the tips: ${e}`);
  if (/\[lang:/i.test(tips)) problems.push(`${code}: a tip still carries a [lang:] tag`);
}
if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\ntip UI names FAILED: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('tip UI names ok');
