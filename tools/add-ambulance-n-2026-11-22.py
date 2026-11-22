# Additional ambulances 3 and 4 (2026-11-22), see docs/architecture/AMBULANCE_ADDITIONAL.md.
# Usage: python tools/add-ambulance-n-2026-11-22.py [--write]   (dry run prints the report; idempotent: it refuses to run twice)
# Step 1: the macros that mention ambulance 2 get the same logic for 3 and 4 (sibling clones, vehicle chains, condition lists, struct keys).
# Step 2: the macro family of ambulance 2 is cloned into macros/27-ambulance-additional.json (live ground path only).
import json, glob, os, sys, importlib.util
spec = importlib.util.spec_from_file_location('eng', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ambulance-n-engine.py'))
eng = importlib.util.module_from_spec(spec); spec.loader.exec_module(eng)
FAM = ['Ambulance2', 'park_ambulance2', 'park_ambulance2_scene', 'ambulance2_restart_at_slow_speed', 'drive ambulance2 safe',
       'drive ambulance2 safe multiplier', 'ambulance2 secondary rescue', 'scene spacing ambulance2']
LEGACY = {'ambulance2 secondary patient2', 'ambulance2 secondary patient3'}
SKIP = set(FAM) | LEGACY
write = '--write' in sys.argv
OUT = 'mission-src/macros/27-ambulance-additional.json'
if os.path.exists(OUT):
    sys.exit('already applied (%s exists)' % OUT)

E = eng.Eng(2, 1, (3, 4))
macros = {}
for f in sorted(glob.glob('mission-src/macros/*.json')):
    d = json.load(open(f, encoding='utf-8'))
    changed = False
    for k, v in list(d.items()):
        if k in SKIP or not E.has_base(v):
            continue
        new = E.process_list(v, os.path.basename(f)[:2] + ':' + k, '')
        if eng.js(new) != eng.js(v):
            d[k] = new; changed = True
    macros[f] = (d, changed)

# step 2: the family, vehicle n = self, the vehicles below it are the obstacles of the parking rules
M = {}
for f in glob.glob('mission-src/macros/*.json'):
    M.update(json.load(open(f, encoding='utf-8')))
new_macros = {}
for n in (3, 4):
    obst = tuple(range(2, n))
    O = eng.Eng(1, n, obst)
    for name in FAM:
        text = E.sub(eng.js(M[name]), n)
        if name == 'Ambulance2':
            # every added ambulance starts at its own place and waits behind the previous ones (the clone would put it on top of ambulance 2)
            a = '"bearing": 30, "dist": 30, "heading"'
            assert text.count(a) == 1, text.count(a)
            text = text.replace(a, '"bearing": %d, "dist": %d, "heading"' % (30 + 60 * (n - 2), 30 + 10 * (n - 2)))
            import re
            text, k = re.subn(r'"bearing2": 180, "dist": 20, ("heading": 10, )?"object": "ambulance1"', lambda m: '"bearing2": 180, "dist": %d, %s"object": "ambulance1"' % (20 * (n - 1), m.group(1) or ''), text)
            assert k == 3, k
        body = json.loads(text)
        newname = E.sub(name, n)
        if name == 'ambulance2 secondary rescue':
            # live path only: everything after the live ground dispatch (legacy patient macros) is dropped
            def trim(lst):
                for i, c in enumerate(lst):
                    if isinstance(c, dict) and c.get('if') == {'local': 'patient_live_mode'}:
                        return lst[:i + 1] + [{'return': 0}], True
                    if isinstance(c, dict) and isinstance(c.get('then'), list):
                        t, ok = trim(c['then'])
                        if ok:
                            c = dict(c); c['then'] = t
                            return lst[:i] + [c] + lst[i + 1:], True
                return lst, False
            body, ok = trim(body)
            assert ok, 'live-mode command not found in the secondary rescue'
        body = O.process_list(body, newname, '')
        new_macros[newname] = body
    for key, items in O.report.items():
        [E.rep('FAM%d-%s' % (n, key), x) for x in items]
for k, v in E.report.items():
    print(k, len(v))
for k in sorted(E.report):
    if 'FLAG' in k:
        for x in E.report[k]:
            print(k, x)
if write:
    for f, (d, changed) in macros.items():
        if changed:
            txt = json.dumps(d, ensure_ascii=False, indent=2).encode('utf-8')
            with open(os.path.normpath(f), 'wb') as fh:
                fh.write(txt)
    with open(OUT, 'wb') as fh:
        fh.write(json.dumps(new_macros, ensure_ascii=False, indent=2).encode('utf-8'))
    print('written', len(new_macros), 'macros into', OUT)
