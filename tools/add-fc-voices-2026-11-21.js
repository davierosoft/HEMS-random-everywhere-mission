// One-shot (2026-11-21): voice keys FC.GX, FC.GZ, FC.PDOWN in the packs EN/DE/FR, inserted before FC.CLEAR; pack version +1. Idempotent.
const fs = require('fs');
const D = {
  EN: { GX: ['the sideways load on the patient is above the limit of the pathology', 'Captain, too much sideways load for the patient. Smooth turns please.', 'Easy on the turns captain, the patient is being thrown around.', 'Captain, the lateral loads are hurting the patient.'],
        GZ: ['braking or acceleration is above the limit of the pathology', 'Captain, easy on the braking and acceleration, the patient cannot take it.', 'Smoother speed changes please captain, the patient is suffering.', 'Captain, too abrupt, the patient does not tolerate these changes of speed.'],
        NOISE: ['the engine and rotor noise is above what the pathology tolerates', 'Captain, the noise is hurting the patient. Can we reduce power or shut down?', 'The patient cannot stand this noise, captain.', 'Captain, the engine noise is too much for the patient.'],
        PDOWN: ['the nose is too low for a patient with a head injury', 'Captain, nose too low for the patient. Raise the nose a little.', 'Raise the nose please captain, the pressure in the patient head is rising.', 'Captain, the patient does not tolerate this nose down attitude.'] },
  DE: { GX: ['flight constraints', 'Captain, zu viel Seitenlast für den Patienten. Bitte sanfter kurven.', 'Sanfter in den Kurven, Captain, der Patient wird hin und her geworfen.', 'Captain, die Seitenkräfte schaden dem Patienten.'],
        GZ: ['flight constraints', 'Captain, vorsichtig beim Bremsen und Beschleunigen, der Patient verträgt das nicht.', 'Bitte gleichmäßigere Geschwindigkeitswechsel, Captain, der Patient leidet.', 'Captain, zu abrupt, der Patient verträgt diese Geschwindigkeitsänderungen nicht.'],
        NOISE: ['flight constraints', 'Captain, der Lärm schadet dem Patienten. Können wir die Leistung reduzieren oder abschalten?', 'Der Patient erträgt diesen Lärm nicht, Captain.', 'Captain, der Triebwerkslärm ist zu viel für den Patienten.'],
        PDOWN: ['flight constraints', 'Captain, die Nase ist zu tief für den Patienten. Nase etwas anheben.', 'Bitte die Nase anheben, Captain, der Druck im Kopf des Patienten steigt.', 'Captain, der Patient verträgt diese Nase-unten-Lage nicht.'] },
  FR: { GX: ['flight constraints', 'Commandant, trop de charge latérale pour le patient. Virages plus doux, s\'il vous plaît.', 'Doucement dans les virages, commandant, le patient est ballotté.', 'Commandant, les charges latérales font souffrir le patient.'],
        GZ: ['flight constraints', 'Commandant, doucement au freinage et à l\'accélération, le patient ne le supporte pas.', 'Des changements de vitesse plus progressifs, s\'il vous plaît, commandant, le patient souffre.', 'Commandant, trop brusque, le patient ne supporte pas ces changements de vitesse.'],
        NOISE: ['flight constraints', 'Commandant, le bruit fait souffrir le patient. Peut-on réduire la puissance ou couper ?', 'Le patient ne supporte pas ce bruit, commandant.', 'Commandant, le bruit des moteurs est trop fort pour le patient.'],
        PDOWN: ['flight constraints', 'Commandant, le nez est trop bas pour le patient. Relevez un peu le nez.', 'Relevez le nez s\'il vous plaît, commandant, la pression dans la tête du patient augmente.', 'Commandant, le patient ne supporte pas cette assiette nez bas.'] }
};
for (const L of Object.keys(D)) {
  const f = `voicepacks/${L}.xml`; let s = fs.readFileSync(f, 'utf8');

  const add = Object.entries(D[L]).filter(([k]) => !s.includes('key="FC.' + k + '"')).map(([k, v]) => `    <message key="FC.${k}" actor="2" radio="ics" new="1" trigger="${v[0]}">\n${v.slice(1).map((t) => `      <o>${t}</o>`).join('\n')}\n    </message>\n`).join('');
  if (!add) continue;
  const a = '    <message key="FC.CLEAR"';
  if (!s.includes(a)) throw new Error('anchor ' + L);
  s = s.replace(a, add + a).replace(/(<voicepack [^>]*version=")(\d+)"/, (m, p, v) => p + (+v + 1) + '"');
  fs.writeFileSync(f, s);
}
console.log('FC voices added');
