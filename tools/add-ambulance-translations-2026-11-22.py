# One-shot (2026-11-22): DE/FR/IT screen texts of UI.3912-3916 (CALL AMBULANCE button and request messages, release 0.997 170.54). Idempotent.
# Run: python tools/add-translations-2026-11-22.py
import json, re, io
T = {
'UI.3912': ('RTW RUFEN', 'APPELER AMBULANCE', 'CHIAMA AMBULANZA'),
'UI.3913': ('Keine weiteren Rettungswagen verfügbar.', 'Plus aucune ambulance disponible.', 'Nessuna altra ambulanza disponibile.'),
'UI.3914': ('Rettungswagen 2 zur Einsatzstelle angefordert.', 'Ambulance 2 demandée sur place.', 'Ambulanza 2 richiesta sul posto.'),
'UI.3915': ('Rettungswagen 3 zur Einsatzstelle angefordert.', 'Ambulance 3 demandée sur place.', 'Ambulanza 3 richiesta sul posto.'),
'UI.3916': ('Rettungswagen 4 zur Einsatzstelle angefordert.', 'Ambulance 4 demandée sur place.', 'Ambulanza 4 richiesta sul posto.'),
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
