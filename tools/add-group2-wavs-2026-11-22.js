// One-shot (2026-11-22): recorded wav for the fixed crew lines of the families APR, BRF, CRZ, DTH, GRD, HLD, HCL, DBF, HPC, MID.
// Each target message (static text, no lvar, no wav) gets a pack LVAR (next free number of its actor), a wav name
// AND.<actor>.<prefix>.<words> (prefix letters continue the actor series so the alphabetical rank equals the LVAR number),
// a sound.xml entry, and the macro chain "voice say recorded" (mission-src) is generated from the same table.
// Idempotent: a message that has an lvar is skipped. Usage: node tools/add-group2-wavs-2026-11-22.js [jobs-out.json]
const fs = require('fs');
const SX = 'basepack/Simobjects/Airplanes/hpg-airbus-h145-ems/Sound/sound.xml';
const FAM = /^(APR|BRF|CRZ|DTH|GRD|HLD|HCL|DBF|HPC|MID)\./;
const ACT = { 1: { pk: 'L:PLT{VCP}', sv: 'PLTANDREW', fn: 'plt', mv: 'L:PLT{local:VCP}' },
              2: { pk: 'L:CPL{VCP}', sv: 'CPLANDREW', fn: 'cpl', mv: 'L:CPL{local:VCP}' },
              3: { pk: 'L:PAX3{VCP}', sv: 'PAX3ANDREW', fn: 'pax3', mv: 'L:PAX3{local:VCP}' },
              4: { pk: 'L:{VCP}', sv: 'ANDREW', fn: 'pax1', mv: 'L:{local:VCP}' } };
const nextPrefix = p => { const a = p.split(''); let i = a.length - 1; for (;;) { if (i < 0) { a.unshift('a'); break; } if (a[i] === 'z') { a[i] = 'a'; i--; } else { a[i] = String.fromCharCode(a[i].charCodeAt(0) + 1); break; } } return a.join(''); };
let sx = fs.readFileSync(SX, 'utf8');
const en = fs.readFileSync('voicepacks/EN.xml', 'utf8');
// next number and last prefix per actor (max of the pack lvars and of sound.xml)
const st = {};
for (const [n, a] of Object.entries(ACT)) {
  let mx = 0;
  for (const m of en.matchAll(new RegExp('lvar="' + a.pk.replace(/[{}]/g, '\\$&') + '(\\d+)"', 'g'))) mx = Math.max(mx, +m[1]);
  for (const m of sx.matchAll(new RegExp('LocalVar="' + a.sv + '(\\d+)"', 'g'))) mx = Math.max(mx, +m[1]);
  let last = '';
  for (const m of sx.matchAll(new RegExp('FileName="AND\\.' + a.fn + '\\.([a-z]+)\\.', 'gi'))) if (m[1] > last && m[1].length <= 3) last = m[1];
  st[n] = { n: mx, pre: last };
}
const targets = [];
for (const m of en.matchAll(/<message ([^>]*)>([\s\S]*?)<\/message>/g)) {
  const a = ' ' + m[1]; const g = k => { const r = a.match(new RegExp(' ' + k + '="([^"]*)"')); return r ? r[1] : undefined; };
  const key = g('key'); if (!FAM.test(key) || g('lvar') || g('wav') || !ACT[g('actor')]) continue;
  if (/\{[0-9@]/.test(m[2])) continue;
  const os = [...m[2].matchAll(/<o(?: [^>]*[^\/>])?>([^<]*)<\/o>/g)].map(x => x[1]); if (!os.length) continue;
  targets.push({ key, actor: g('actor'), text: os[0] });
}
const rows = [];
for (const t of targets) {
  const s = st[t.actor], a = ACT[t.actor];
  s.n++; s.pre = nextPrefix(s.pre || 'a');
  const words = t.text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 4).join('.');
  const fam = t.key.split('.')[0].toLowerCase();
  rows.push({ key: t.key, actor: t.actor, text: t.text, lvar: a.pk + s.n, sv: a.sv + s.n, mv: a.mv + s.n, wav: `AND.${a.fn}.${s.pre}.${fam}.${words}.wav` });
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
for (const lg of ['EN', 'DE', 'FR']) {
  const f = `voicepacks/${lg}.xml`; let s = fs.readFileSync(f, 'utf8'); let n = 0;
  for (const r of rows) {
    const re = new RegExp('<message key="' + r.key.replace(/\./g, '[.]') + '" actor="' + r.actor + '"');
    if (re.test(s)) { s = s.replace(re, `<message key="${r.key}" actor="${r.actor}" lvar="${r.lvar}" wav="${r.wav}"`); n++; }
  }
  if (n) s = s.replace(/(<voicepack [^>]*version=")(\d+)"/, (m, p, v) => p + (+v + 1) + '"');
  fs.writeFileSync(f, s); console.log(lg, 'messages wired', n);
}
const nl = sx.includes('\r\n') ? '\r\n' : '\n'; let added = 0;
const blocks = () => [...sx.matchAll(/[ \t]*<Sound [^>]*LocalVar="([A-Za-z0-9]+)"[\s\S]*?<\/Sound>/g)];
for (const r of rows) {
  const fn = r.wav.replace(/\.wav$/, ''); if (sx.includes(`FileName="${fn}"`)) continue;
  const prefix = r.sv.replace(/\d+$/, '');
  const same = blocks().filter(b => b[1].replace(/\d+$/, '') === prefix); const last = same[same.length - 1];
  const e = last[0].replace(/FileName="[^"]*"/, `FileName="${fn}"`).replace(/(<Sound [^>]*LocalVar=")[A-Za-z0-9]+"/, `$1${r.sv}"`);
  const at = last.index + last[0].length; sx = sx.slice(0, at) + nl + e + sx.slice(at); added++;
}
fs.writeFileSync(SX, sx); console.log('targets', rows.length, 'sound.xml entries added', added);
