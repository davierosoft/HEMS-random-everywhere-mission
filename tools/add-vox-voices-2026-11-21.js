// One-shot (2026-11-21): voice keys VOX.ASK.* and VOX.FIX.* (ICS VOX glitch) in the packs EN/DE/FR, before </voicepack>; version +1. Idempotent.
const fs = require('fs');
const actor = { CPL: 2, P1: 4, P2: 5, P3: 3 };
const T = {
  EN: { ASK: ['Everybody, please check your VOX level, my headset keeps opening on noise.', 'Guys, somebody has the VOX too sensitive, check your levels please.', 'Please check your VOX setting, the intercom keeps keying on the wind noise.'],
        FIX: ['Okay, I lowered my VOX level.', 'Found it, my VOX was too high, fixed.', 'That was my VOX, adjusted now.'] },
  DE: { ASK: ['Alle bitte den VOX-Pegel prüfen, bei mir öffnet das Headset ständig durch Geräusche.', 'Leute, bei jemandem ist VOX zu empfindlich, bitte Pegel prüfen.', 'Bitte VOX-Einstellung prüfen, die Bordsprechanlage öffnet durch den Wind.'],
        FIX: ['Okay, ich habe meinen VOX-Pegel gesenkt.', 'Gefunden, mein VOX war zu hoch, behoben.', 'Das war mein VOX, jetzt angepasst.'] },
  FR: { ASK: ['Tout le monde, vérifiez votre niveau VOX, mon casque s\'ouvre sans cesse sur le bruit.', 'Quelqu\'un a le VOX trop sensible, vérifiez vos niveaux s\'il vous plaît.', 'Vérifiez votre réglage VOX, l\'interphone s\'ouvre sur le bruit du vent.'],
        FIX: ['D\'accord, j\'ai baissé mon niveau VOX.', 'Trouvé, mon VOX était trop haut, corrigé.', 'C\'était mon VOX, réglé maintenant.'] }
};
for (const L of Object.keys(T)) {
  const f = `voicepacks/${L}.xml`; let s = fs.readFileSync(f, 'utf8');
  if (s.includes('key="VOX.ASK.CPL"')) continue;
  let add = '';
  for (const k of ['ASK', 'FIX']) for (const [n, a] of Object.entries(actor))
    add += `    <message key="VOX.${k}.${n}" actor="${a}" radio="ics" new="1" trigger="${L === 'EN' ? (k === 'ASK' ? 'a crew member asks everybody to check the VOX level after the intercom keyed on noise' : 'the crew member who found the VOX too high says it is fixed, then does a comm check') : 'vox glitch'}">\n${T[L][k].map((t) => `      <o>${t}</o>`).join('\n')}\n    </message>\n`;
  s = s.replace('</voicepack>', () => add + '</voicepack>').replace(/(<voicepack [^>]*version=")(\d+)"/, (m, p, v) => p + (+v + 1) + '"');
  fs.writeFileSync(f, s);
}
console.log('VOX voices added');
