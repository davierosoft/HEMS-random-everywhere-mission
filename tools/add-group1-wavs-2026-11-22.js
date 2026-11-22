// One-shot (2026-11-22): wav names, pack wav attributes and sound.xml entries for the 23 pack lines that had an LVAR but no wav
// (boarding / briefing / debrief chats and four PAX3 prompts). Idempotent. Usage: node tools/add-group1-wavs-2026-11-22.js [jobs-out.json]
const fs = require('fs');
const SX = 'basepack/Simobjects/Airplanes/hpg-airbus-h145-ems/Sound/sound.xml';
// [key, wav name (no ext), LVAR, text used for the recording (null = first variant of the EN pack)]
const L = [
 ['PLT.47','AND.plt.vad.board.everybody.aboard','PLTANDREW47',null],
 ['PLT.48','AND.plt.vae.board.start.checklist','PLTANDREW48',null],
 ['PLT.49','AND.plt.vaf.brief.dispatch.received','PLTANDREW49',null],
 ['PLT.50','AND.plt.vag.brief.lift.off.when.ready','PLTANDREW50',null],
 ['PLT.51','AND.plt.vah.debrief.good.job.everyone','PLTANDREW51',null],
 ['PLT.52','AND.plt.vai.debrief.finish.shutdown','PLTANDREW52',null],
 ['PLT.53','AND.plt.vaj.debrief.hard.one.crew','PLTANDREW53',null],
 ['PLT.54','AND.plt.vak.debrief.talk.about.it.later','PLTANDREW54',null],
 ['CPL.65','AND.cpl.yg.board.belts.doors.closed','CPLANDREW65',null],
 ['CPL.66','AND.cpl.yh.brief.set.route.watch.weather','CPLANDREW66',null],
 ['CPL.67','AND.cpl.yi.debrief.instruments.looked.fine','CPLANDREW67','Everything on the instruments looked fine.'],
 ['CPL.68','AND.cpl.yj.debrief.nobody.could.have.done.more','CPLANDREW68','Nobody could have done more.'],
 ['PAX1.90','AND.pax1.wgd.board.rear.crew.ready','ANDREW90',null],
 ['PAX1.91','AND.pax1.wge.brief.rear.crew.copy','ANDREW91',null],
 ['PAX1.92','AND.pax1.wgf.debrief.gear.stowed','ANDREW92',null],
 ['PAX3.38','AND.pax3.wfa.board.kit.secured','PAX3ANDREW38','Doc here, kit secured, all set in the back.'],
 ['PAX3.39','AND.pax3.wfb.brief.assess.patient.after.landing','PAX3ANDREW39',null],
 ['PAX3.40','AND.pax3.wfc.debrief.patient.stable.handed.over','PAX3ANDREW40',null],
 ['PAX3.41','AND.pax3.wfd.debrief.write.clinical.report','PAX3ANDREW41',null],
 ['PAX3.42','AND.pax3.wfe.crew.on.way.to.loading.point','PAX3ANDREW42',null],
 ['PAX3.43','AND.pax3.wff.crew.waiting.helicopter.landing.spot','PAX3ANDREW43',null],
 ['PAX3.44','AND.pax3.wfg.crew.waiting.take.off.hover.over.spot','PAX3ANDREW44',null],
 ['PAX3.45','AND.pax3.wfh.ambulance.still.on.way.meet.yes.no','PAX3ANDREW45',null],
];
const jobs = [];
const en = fs.readFileSync('voicepacks/EN.xml', 'utf8');
for (const [k, nw, , txt] of L) {
  const m = en.match(new RegExp('<message key="' + k.replace('.', '[.]') + '"[^]*?</message>'));
  const mm = [...m[0].matchAll(/<o(?: [^>]*[^\/>])?>([^<]*)<\/o>/g)][0]; const first = mm ? mm[1] : null;
  jobs.push({ key: k, wav: nw + '.wav', text: txt || first });
}
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(jobs, null, 1));
for (const lg of ['EN', 'DE', 'FR']) {
  const f = `voicepacks/${lg}.xml`; let s = fs.readFileSync(f, 'utf8'); let n = 0;
  for (const [k, nw] of L) {
    const re = new RegExp('(<message key="' + k.replace('.', '[.]') + '"(?![^>]* wav=)[^>]*?lvar="[^"]*")');
    if (re.test(s)) { s = s.replace(re, `$1 wav="${nw}.wav"`); n++; }
  }
  if (n) s = s.replace(/(<voicepack [^>]*version=")(\d+)"/, (m, p, v) => p + (+v + 1) + '"');
  fs.writeFileSync(f, s); console.log(lg, 'wav attributes added', n);
}
let sx = fs.readFileSync(SX, 'utf8'); const nl = sx.includes('\r\n') ? '\r\n' : '\n'; let added = 0;
const blocks = () => [...sx.matchAll(/[ \t]*<Sound [^>]*LocalVar="([A-Za-z0-9]+)"[\s\S]*?<\/Sound>/g)];
for (const [, nw, lv] of L) {
  if (sx.includes(`FileName="${nw}"`)) continue;
  const prefix = lv.replace(/\d+$/, '');
  const same = blocks().filter(b => b[1].replace(/\d+$/, '') === prefix);
  const last = same[same.length - 1]; if (!last) throw new Error('no series ' + prefix);
  const e = last[0].replace(/FileName="[^"]*"/, `FileName="${nw}"`).replace(/(<Sound [^>]*LocalVar=")[A-Za-z0-9]+"/, `$1${lv}"`);
  const at = last.index + last[0].length;
  sx = sx.slice(0, at) + nl + e + sx.slice(at); added++;
}
fs.writeFileSync(SX, sx); console.log('sound.xml entries added', added);
