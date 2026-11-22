# One-shot (2026-11-22): DE/FR/IT screen texts of the 4 keys UI.3908-3911 (status refusal messages, release 0.997 170.53). Idempotent.
# Run: python tools/add-translations-2026-11-22.py
import json, re, io
T = {
'UI.3908': ('ABMELDEN NUR NACH EINSATZENDE MÖGLICH', 'DÉCONNEXION POSSIBLE SEULEMENT APRÈS LA FIN DE LA MISSION', 'DISCONNESSIONE POSSIBILE SOLO DOPO LA FINE DELLA MISSIONE'),
'UI.3909': ('ABMELDEN NUR NACH EINSATZENDE MÖGLICH', 'DÉCONNEXION POSSIBLE SEULEMENT APRÈS LA FIN DE LA MISSION', 'DISCONNESSIONE POSSIBILE SOLO DOPO LA FINE DELLA MISSIONE'),
'UI.3910': ('EINSATZ BEREITS ÜBERNOMMEN', 'MISSION DÉJÀ ACCEPTÉE', 'MISSIONE GIÀ ACCETTATA'),
'UI.3911': ('EINSATZ BEREITS ÜBERNOMMEN', 'MISSION DÉJÀ ACCEPTÉE', 'MISSIONE GIÀ ACCETTATA'),
}
def jstr(t): return json.dumps(t, ensure_ascii=False).replace('&', '\u0026')
for i, lang in enumerate(['DE', 'FR', 'IT']):
    p = 'uitexts/%s.json' % lang
    with io.open(p, encoding='utf-8') as f: s = f.read()
    d = json.loads(s)
    missing = [k for k in T if k not in d['texts']]
    if not missing: continue
    end = s.rstrip().rfind('}')
    end2 = s.rfind('}', 0, end)
    head = s[:end2].rstrip()
    close = s[end2:]
    ind = re.search(r'\n(\s*)"UI\.0001"', s).group(1)
    body = ',\n'.join('%s"%s":  %s' % (ind, k, jstr(T[k][i])) for k in missing)
    s2 = head + ',\n' + body + '\n' + close
    json.loads(s2)
    with io.open(p, 'w', encoding='utf-8', newline='') as f: f.write(s2)
print('translations written')
