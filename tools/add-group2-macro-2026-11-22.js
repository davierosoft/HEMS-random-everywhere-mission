// One-shot (2026-11-22): macro "voice say recorded" (mission-src/macros/03-aircraft-crew-checklists.json): with the Companion in recorded mode
// the lines of voice say (<say:KEY>, spoken only through the voice server) raise the counter of their wav (table of add-group2-wavs). Idempotent.
// Usage: node tools/add-group2-macro-2026-11-22.js jobs3.json
const fs = require('fs');
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const F = 'mission-src/macros/03-aircraft-crew-checklists.json';
let s = fs.readFileSync(F, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
if (s.includes('"voice say recorded": [')) { console.log('already present'); process.exit(0); }
const chain = rows.map(r => `    {"if": {"param":"key"}, "eq": "${r.key}",${nl}      "then": [${nl}        {"set":{"var":["${r.mv}","number"]},"value":{"add":[{"var":["${r.mv}","number"]},1]}}${nl}    ]}`).join(',' + nl);
const macro = `  "voice say recorded": [${nl}` +
`    {"#comment":"Recorded voices (L:HMC_APP_RECORDED 1, 2026-11-22): the lines of voice say are spoken through the voice server (<say:KEY>), which a Companion in recorded mode does not have; the Companion plays the recorded wav of the counters L:xxxAPPnn instead. This table raises the counter of the wav of each fixed line (families APR BRF CRZ DTH GRD HLD HCL DBF HPC MID; the numbers are the lvar of the pack message and the LocalVar of its sound.xml entry). Lines with a value in the text (GRD.ETA.N, APR.WND, HCL.H, APR.PLT.P) have no wav. Called from voice say; param key, param declut (1 = chatter, skipped by the AUDIO_DECLUT levels 1 to 3)."},${nl}` +
`    {"if": {${nl}      "and": [${nl}        {"require":{"local":"VCP"},"eq":"APP"},${nl}        {"require":{"var":["L:HMC_APP_RECORDED","number"]},"eq":1}${nl}      ]}, "eq": 1,${nl}      "then": [${nl}` +
`        {"set":{"local":"vsr_ok"},"value":1},${nl}` +
`        {"if": {"param":"declut"}, "eq": 1,${nl}          "then": [${nl}            {"if": {${nl}              "and": [${nl}                {"require":{"global":"AUDIO_DECLUT"},"gt":0},${nl}                {"require":{"global":"AUDIO_DECLUT"},"lte":3}${nl}              ]}, "eq": 1,${nl}              "then": [${nl}                {"set":{"local":"vsr_ok"},"value":0}${nl}            ]}${nl}        ]},${nl}` +
`        {"if": {"local":"vsr_ok"}, "eq": 1,${nl}          "then": [${nl}${chain.split(nl).map(l => '    ' + l).join(nl)}${nl}        ]}${nl}    ]}${nl}  ],${nl}`;
const marker = `  "voice mission class": [`;
if (!s.includes(marker)) throw new Error('marker');
s = s.replace(marker, macro + marker);
const oldElse = `      ],"else": [${nl}        {"call_macro":"voice app check"}${nl}    ]}${nl}  ],${nl}  "voice mission class": [`;
// the else of voice say sits right before the new macro
const idx = s.indexOf('"voice say recorded": [');
const head = s.slice(0, idx), tail = s.slice(idx);
const oldBlock = `      ],"else": [${nl}        {"call_macro":"voice app check"}${nl}    ]}${nl}  ],${nl}`;
const pos = head.lastIndexOf(oldBlock);
if (pos < 0 || head.length - pos - oldBlock.length > 5) throw new Error('else block of voice say not found');
const newBlock = `      ],"else": [${nl}        {"set":{"local":"vsr_declut"},"value":0},${nl}        {"if": {"param":"declut"}, "eq": 1,${nl}          "then": [${nl}            {"set":{"local":"vsr_declut"},"value":1}${nl}        ]},${nl}        {"call_macro":"voice say recorded","params":{"key":{"param":"key"},"declut":{"local":"vsr_declut"}}},${nl}        {"call_macro":"voice app check"}${nl}    ]}${nl}  ],${nl}`;
s = head.slice(0, pos) + newBlock + tail;
fs.writeFileSync(F, s); console.log('macro added with', rows.length, 'lines');
