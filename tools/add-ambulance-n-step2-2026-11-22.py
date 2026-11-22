# Step 2 of the additional ambulances (2026-11-22): requests, button, reset. Run after tools/add-ambulance-n-2026-11-22.py --write.
import json, os
def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s):
    with open(p, 'wb') as fh: fh.write(s.encode('utf-8'))
# manifest
p = 'mission-src/manifest.json'; s = rd(p)
a = '        "file": "macros/26-vox-glitch.json",'
i = s.index(a); j = s.index('      },\n', i) + len('      },\n')
s = s[:j] + '''      {
        "file": "macros/27-ambulance-additional.json",
        "description": "Additional ground ambulances 3 and 4 (clones of the ambulance 2 family, live ground path only), next-free request and the HEMS medical page button."
      },
''' + s[j:]
wr(p, s)
# 08: reset flags and no automatic start of 3 and 4
p = 'mission-src/macros/08-ground-response.json'; s = rd(p)
old = '''    {"set":{"local":"Ambulance4clearance"},"value":null},
    {"set":{"local":"ambu1_parked"},"value":"no"},'''
assert s.count(old) == 1
s = s.replace(old, '''    {"set":{"local":"Ambulance4clearance"},"value":null},
    {"set":{"local":"ambulance_requested_2"},"value":0},
    {"set":{"local":"ambulance_requested_3"},"value":0},
    {"set":{"local":"ambulance_requested_4"},"value":0},
    {"set":{"local":"ambu1_parked"},"value":"no"},''')
old = '''                        {"call_macro":"Ambulance2"},
                        {"call_macro":"Ambulance3"},
                        {"call_macro":"Ambulance4"}
'''
assert s.count(old) == 1
s = s.replace(old, '''                        {"set":{"local":"ambulance_requested_2"},"value":1},
                        {"call_macro":"Ambulance2"}
''')
wr(p, s)
# 27: new macros
p = 'mission-src/macros/27-ambulance-additional.json'
d = json.load(open(p, encoding='utf-8'))
def cond(n, then, els=None):
    c = {"if": {"local": "ambulance_requested_%d" % n}, "ne": 1, "then": then}
    if els: c["else"] = els
    return c
def setn(n): return [{"set": {"local": "ambulance_next_free"}, "value": n}]
m = [{"#comment": "Lowest additional ambulance (2, 3, 4) not requested yet: local ambulance_next_free = N, or 0 when none is left; ambulance_pending = 1 while a requested one has not been created yet. A fifth one is one more branch here and the family clone."},
     {"set": {"local": "ambulance_next_free"}, "value": 0},
     {"set": {"local": "ambulance_pending"}, "value": 0},
     cond(2, setn(2), [cond(3, setn(3), [cond(4, setn(4))])])]
for n in (2, 3, 4):
    m.append({"if": {"and": [{"require": {"local": "ambulance_requested_%d" % n}, "eq": 1}, {"require": {"has_object": "ambulance%d" % n}, "ne": 1}]}, "eq": 1, "then": [{"set": {"local": "ambulance_pending"}, "value": 1}]})
d["ambulance next free"] = m
def start(n): return {"if": {"local": "ambulance_next_free"}, "eq": n, "then": [
    {"set": {"local": "ambulance_requested_%d" % n}, "value": 1},
    {"set_message": {"text": "Ambulance %d requested to the scene." % n}},
    {"create_thread": {"commands": [{"call_macro": "Ambulance%d" % n}]}}]}
d["call additional ambulance"] = [
    {"#comment": "HEMS medical page button: calls the next unused ambulance (2, then 3, then 4) when every ambulance on scene already takes a patient."},
    {"call_macro": "ambulance next free"},
    {"if": {"local": "ambulance_next_free"}, "eq": 0, "then": [{"set_message": {"text": "No more ambulances available."}}, {"return": 0}]},
    start(2), start(3), start(4)]
wr(p, json.dumps(d, ensure_ascii=False, indent=2))
# 07: ok flag and button
p = 'mission-src/macros/07-patient-medical.json'; s = rd(p)
old = '''    {"set":{"local":"medical_display_hems_ok"},"value":1},
    {"set":{"local":"medical_display_hems_reason"},"value":""},
    {"if": {"local":"mtc_other_hems"}, "gt": 0,'''
assert s.count(old) == 1
new = '''    {"#comment":"CALL AMBULANCE button: ground is blocked only because every ambulance on scene already has a patient, a free one exists and none is still driving in."},
    {"set":{"local":"medical_display_amb_call_ok"},"value":0},
    {"if": {"and":[
        {"require":{"local":"mtc_amb"},"gt":0},
        {"require":{"local":"medical_display_ground_ok"},"ne":1},
        {"require":{"local":"mtc_amb"},"lte":{"local":"mtc_other_ground"}}
      ]}, "eq": 1,
      "then": [
        {"call_macro":"ambulance next free"},
        {"if": {"and":[
            {"require":{"local":"ambulance_next_free"},"gt":0},
            {"require":{"local":"ambulance_pending"},"ne":1}
          ]}, "eq": 1,
          "then": [
            {"set":{"local":"medical_display_amb_call_ok"},"value":1}
        ]}
    ]},
'''
s = s.replace(old, new + old)
line = [l for l in s.split('\n') if l.strip().startswith('{"text":"{0}","params":[{"local":"medical_display_ground_reason"}')]
assert len(line) == 1
cnd = '"show_condition":{"and":[{"require":{"local":"medical_display_manual_mode"},"eq":"manual"},{"require":{"local":"medical_display_manual_state"},"eq":"transport"},{"require":{"local":"medical_display_report_finalized"},"ne":"yes"},{"require":{"local":"manual_active_patient"},"eq":{"local":"medical_display_patient"}},{"require":{"local":"medical_display_amb_call_ok"},"eq":1}],"eq":1}'
btn = '        {"buttonbar":[{"title":"CALL AMBULANCE","color":"yellow","commands":[{"call_macro":"call additional ambulance"}]}],' + cnd + '},'
s = s.replace(line[0], line[0] + '\n' + btn)
wr(p, s)
print('step 2 written')
