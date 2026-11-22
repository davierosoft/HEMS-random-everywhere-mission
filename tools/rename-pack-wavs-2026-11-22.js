// One-shot (2026-11-22): the 24 pack wavs that had no recording get the actor/prefix naming (AND.<actor>.<prefix>.<phrase>)
// and a sound.xml entry with the LVAR of the pack message. Idempotent. Usage: node tools/rename-pack-wavs-2026-11-22.js
const fs = require('fs');
const SX = 'basepack/Simobjects/Airplanes/hpg-airbus-h145-ems/Sound/sound.xml';
// [old name, new name (no .wav), LVAR name, template sound entry FileName (last entry of the actor)]
const M = [
 ['AND.route.unavailable.check.tablet','AND.cpl.yd.route.unavailable.check.tablet','CPLANDREW62'],
 ['AND.route.changed.check.tablet','AND.cpl.ye.route.changed.check.tablet','CPLANDREW63'],
 ['AND.cockpit.engine.start.hold','AND.cpl.yf.engine.start.hold','CPLANDREW64'],
 ['AND.dispatch.cancelled.await.tasking','AND.plt.vac.dispatch.cancelled.await.tasking','PLTANDREW46'],
 ['AND.technical.inspection.required','AND.frank.z.technical.inspection.required','FRAANDREW9'],
 ['AND.crew.returning.to.aircraft','AND.pax1.wgc.k.crew.returning.to.aircraft','ANDREW82'],
 ['AND.hoist.operation.paused','AND.PAX2.t.hoist.operation.paused','PAX2ANDREW5'],
 ['AND.hoist.operation.abort','AND.PAX2.u.hoist.operation.abort','PAX2ANDREW6'],
 ['AND.medical.assessment.in.progress','AND.pax3.wep.medical.assessment.in.progress','PAX3ANDREW27'],
 ['AND.medical.critical.vital.signs','AND.pax3.weq.medical.critical.vital.signs','PAX3ANDREW28'],
 ['AND.medical.patient.ready.for.transport','AND.pax3.wer.medical.patient.ready.for.transport','PAX3ANDREW29'],
 ['AND.medical.cpr.awaiting.landing','AND.pax3.wes.medical.cpr.awaiting.landing','PAX3ANDREW30'],
 ['AND.medical.cpr.stopped','AND.pax3.wet.medical.cpr.stopped','PAX3ANDREW31'],
 ['AND.ground.ambulance.handover.ready','AND.pax3.weu.ground.ambulance.handover.ready','PAX3ANDREW32'],
 ['AND.ground.second.ambulance.assigned','AND.pax3.wev.ground.second.ambulance.assigned','PAX3ANDREW33'],
 ['AND.ground.police.securing.scene','AND.pax3.wew.ground.police.securing.scene','PAX3ANDREW34'],
 ['AND.ground.fire.service.hazard','AND.pax3.wex.ground.fire.service.hazard','PAX3ANDREW35'],
 ['AND.ops.ground.operations.delayed','AND.pax3.wey.ops.ground.operations.delayed','PAX3ANDREW36'],
 ['AND.medical.additional.patients.on.scene','AND.pax3.wez.medical.additional.patients.on.scene','PAX3ANDREW37'],
 ['AND.marshal.move.left','AND.marshal.a.move.left','MARANDREW1'],
 ['AND.marshal.move.right','AND.marshal.b.move.right','MARANDREW2'],
 ['AND.marshal.come.forward','AND.marshal.c.come.forward','MARANDREW3'],
 ['AND.marshal.hold.position','AND.marshal.d.hold.position','MARANDREW4'],
 ['AND.marshal.landing.area.clear','AND.marshal.e.landing.area.clear','MARANDREW5'],
];
for (const l of ['EN','DE','FR']) {
  const f = `voicepacks/${l}.xml`; let s = fs.readFileSync(f, 'utf8'); let n = 0;
  for (const [o, nw] of M) { const a = `wav="${o}.wav"`; if (s.includes(a)) { s = s.split(a).join(`wav="${nw}.wav"`); n++; } }
  if (n) s = s.replace(/(<voicepack [^>]*version=")(\d+)"/, (m, p, v) => p + (+v + 1) + '"');
  fs.writeFileSync(f, s); console.log(l, 'renamed', n);
}
let sx = fs.readFileSync(SX, 'utf8'); const nl = sx.includes('\r\n') ? '\r\n' : '\n';
const getVar = () => { const o = {}; for (const b of sx.matchAll(/[ \t]*<Sound [^>]*LocalVar="([A-Za-z0-9]+)"[\s\S]*?<\/Sound>/g)) o[b[1]] = b; return o; };
// template = last existing entry of the actor series
const tmplVar = { CPL:'CPLANDREW61', PLT:'PLTANDREW45', FRA:'FRAANDREW8', ANDREW:'ANDREW87', PAX2:'PAX2ANDREW4', PAX3:'PAX3ANDREW26', MAR:'CPLANDREW61' };
let added = 0;
for (const [, nw, lv] of M) {
  if (sx.includes(`FileName="${nw}"`)) continue;
  const key = lv.startsWith('CPL')?'CPL':lv.startsWith('PLT')?'PLT':lv.startsWith('FRA')?'FRA':lv.startsWith('PAX2')?'PAX2':lv.startsWith('PAX3')?'PAX3':lv.startsWith('MAR')?'MAR':'ANDREW';
  const t = getVar()[tmplVar[key]]; if (!t) throw new Error('template ' + tmplVar[key]);
  let e = t[0].replace(/FileName="[^"]*"/, `FileName="${nw}"`).replace(/(<Sound [^>]*LocalVar=")[A-Za-z0-9]+"/, `$1${lv}"`);
  // insert after the last block of the series (or after the template for a new series)
  const prefix = key==='MAR'?'MARANDREW':lv.replace(/\d+$/, '');
  const same = [...sx.matchAll(new RegExp("[ "+"\\t]*<Sound [^>]*LocalVar=\""+prefix+"\\d+\"["+"\\s\\S]*?</Sound>", "g"))];
  const last = same.length ? same[same.length-1] : t;
  const at = last.index + last[0].length;
  sx = sx.slice(0, at) + nl + e + sx.slice(at); added++;
}
fs.writeFileSync(SX, sx); console.log('sound.xml entries added', added);
