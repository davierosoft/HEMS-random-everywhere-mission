// One-shot source merge (2026-11-22): Status Patch 170.32 of Dr.DougRoss (S1-S8, notes in his PDF) and his rule for status 3
// (collective above 32 percent and ground speed above 20 kt before "On the way to the hospital"). Each replacement checks its count.
const fs = require('fs');
const rd = (f) => fs.readFileSync(f, 'utf8');
const wr = (f, s) => fs.writeFileSync(f, s);
const M = 'mission-src/macros/';
const DP = '{"var":["L:DISPATCH_PHASE","number"]}';
const RAW = '{"var":["L:DISPATCH_PHASE_RAW","number"]}';
function rep(s, a, b, n, label) {
  const c = s.split(a).length - 1;
  if (c !== n) throw new Error(`[${label}] expected ${n}, found ${c}: ${a.slice(0, 90)}`);
  return s.split(a).join(b);
}
const done = (f, marker) => rd(f).includes(marker);

// ---- S1 data tables (06)
{
  const f = 'mission-src/data/06-special-health-and-messages.json';
  if (!done(f, '8. Resource logged off')) {
    const d = JSON.parse(rd(f));
    d.statusMessages0.push('8. Resource logged off');
    d.statusMessages0translation = [
      ['0. Dispatch accepted', 0], ['1. On the way to the scene', 1], ['2. At the scene', 2], ['3. On the way to the hospital', 3], ['4. At the hospital', 4],
      ['5. On the way back to base (Available)', 5], ['6. At Home base (Available)', 6], ['7. Unavailable for dispatch', 7], ['8. Resource logged off', 8], ['9. Function not assigned', 9]
    ].map(([name, LVAR], id) => ({ id, name, LVAR }));
    const de = [['0 Abgemeldet', 8], ['1 Frei Wache', 6], ['2 Zum Berufungsort', 1], ['3 Am Berufungsort', 2], ['4 Zum Abgabeort', 3], ['5 Am Abgabeort', 4],
      ['6 Frei ueber Funk', 5], ['7 Nicht Einsatzbereit', 7], ['8 Funktion nicht belegt', 9], ['9 Alarmiert und Quittiert', 0]];
    d.statusMessages1 = de.map((x) => x[0]);
    d.statusMessages1translation = de.map(([name, LVAR], id) => ({ id, name, LVAR }));
    wr(f, JSON.stringify(d, null, 2) + '\n');
  }
}

// ---- S5 guards: every "phase ne 7" guard also excludes 8
for (const f of ['03-aircraft-crew-checklists', '05-navigation-queries', '09-hoist-ground-ops', '10-transfer-special-missions', '11-mission-lifecycle', '13-crew-emergency']) {
  const p = M + f + '.json'; let s = rd(p);
  const a = `{"if": ${DP}, "ne": 7,`;
  const b = `{"if": {"and": [{"require":${DP},"ne":7},{"require":${DP},"ne":8}]}, "eq": 1,`;
  s = s.split(a).join(b); wr(p, s);
}

// ---- S2 objective4: status 1 at lift-off (thread) instead of at cabin ready
{
  const p = M + '11-mission-lifecycle.json'; let s = rd(p);
  const a = `    {"if": {"local":"DISPATCHER_AUTO"}, "eq": 0,
      "then": [
        {"if": {"and": [{"require":${DP},"ne":7},{"require":${DP},"ne":8}]}, "eq": 1,
          "then": [
            {"set":{"var":["L:DISPATCH_PHASE","number"]},"value":1},
            {"call_macro":"Update_raw from dispatchphase"}
        ]}
    ]},
    {"if": {"local":"SECOND_DISPATCH"}, "eq": 1,`;
  const b = `    {"#comment":"Status patch of Dr.DougRoss: status 1 (on the way to the scene) is reported at lift-off (rotor above 50 percent and collective above 32), not when the cabin is ready; only in automatic mode, never over a later status or a log-off."},
    {"if": {"local":"DISPATCHER_AUTO"}, "eq": 0,
      "then": [
        {"create_thread": {
          "commands": [
            {"wait_for":{"var":["L:{local:HXX}_SDK_ROTOR_RPM","number"]},"gt":50},
            {"wait_for":{"var":["L:Collective","number"]},"gt":32},
            {"if": {"and": [{"require":{"local":"DISPATCHER_AUTO"},"eq":0},{"require":${DP},"ne":7},{"require":${DP},"ne":8},{"require":{"or": [{"require":${DP},"lt":2},{"require":${DP},"eq":100}]},"eq":1}]}, "eq": 1,
              "then": [
                {"set":{"var":["L:DISPATCH_PHASE","number"]},"value":1},
                {"call_macro":"Update_raw from dispatchphase"}
            ]}
        ]}}
    ]},
    {"if": {"local":"SECOND_DISPATCH"}, "eq": 1,`;
  if (!s.includes('status 1 (on the way to the scene) is reported at lift-off')) { s = rep(s, a, b, 1, 'S2'); wr(p, s); }
}

// ---- status 3 (Stefan 2026-11-21): after accepting the hospital destination, only when the helicopter really flies there
{
  const p = M + '05-navigation-queries.json'; let s = rd(p);
  const a = `  "User predestination": [
    {"if": {"local":"DISPATCHER_AUTO"}, "eq": 0,
      "then": [
        {"if": {"and": [{"require":${DP},"ne":7},{"require":${DP},"ne":8}]}, "eq": 1,
          "then": [
            {"set":{"var":["L:DISPATCH_PHASE","number"]},"value":3},
            {"call_macro":"Update_raw from dispatchphase"}
        ]}
    ]},`;
  const b = `  "User predestination": [
    {"#comment":"Status 3 (on the way to the hospital) is no longer sent when the hospital destination is accepted but when the helicopter flies: collective above 32 percent and ground speed above 20 kt (Dr.DougRoss 2026-11-21). One waiting thread at a time."},
    {"if": {"local":"DISPATCHER_AUTO"}, "eq": 0,
      "then": [
        {"if": {"local":"status3_waiting"}, "ne": 1,
          "then": [
            {"set":{"local":"status3_waiting"},"value":1},
            {"create_thread": {
              "commands": [
                {"wait_for":{"var":["GROUND VELOCITY","knots"]},"gt":20},
                {"wait_for":{"var":["L:Collective","number"]},"gt":32},
                {"if": {"and": [{"require":{"local":"DISPATCHER_AUTO"},"eq":0},{"require":${DP},"ne":7},{"require":${DP},"ne":8},{"require":${DP},"lt":3}]}, "eq": 1,
                  "then": [
                    {"set":{"var":["L:DISPATCH_PHASE","number"]},"value":3},
                    {"call_macro":"Update_raw from dispatchphase"}
                ]},
                {"set":{"local":"status3_waiting"},"value":0}
            ]}}
        ]}
    ]},`;
  if (!s.includes('Status 3 (on the way to the hospital) is no longer sent')) { s = rep(s, a, b, 1, 'status3'); wr(p, s); }
}

// ---- ready dispatch / first dispatch / stall watcher count 8 like 7
{
  const p = M + '11-mission-lifecycle.json'; let s = rd(p);
  if (!s.includes('"ne":8}],"eq":1},\n    {"wait_for":{"local":"CREW_EMERGENCY_ACTIVE"}')) {
    s = rep(s, `{"and":[{"wait_for":${DP},"gt":4},{"wait_for":${DP},"ne":7}],"eq":1},`, `{"and":[{"wait_for":${DP},"gt":4},{"wait_for":${DP},"ne":7},{"wait_for":${DP},"ne":8}],"eq":1},`.replace('{"wait_for":' + DP + ',"ne":8}],"eq":1}', '{"wait_for":' + DP + ',"ne":8}],"eq":1}'), 1, 'ready wait');
    s = rep(s, `{"require":${DP},"eq":7}\n                      ]}, "eq": 1,`, `{"require":${DP},"eq":7},\n                        {"require":${DP},"eq":8}\n                      ]}, "eq": 1,`, 1, 'stall');
    s = rep(s, `    {"wait_for":${DP},"ne":7},\n    {"#comment":"Tester report of 2026-11-01`, `    {"wait_for":${DP},"ne":7},\n    {"wait_for":${DP},"ne":8},\n    {"#comment":"Tester report of 2026-11-01`, 1, 'first dispatch');
    wr(p, s);
  }
}

// ---- S3 end shift macro + button, S4 send dispatch phase, S7 status list and keypad, S8 tablet * and #
{
  const p = M + '04-dispatch-tablet-ui.json'; let s = rd(p);
  if (!s.includes('"end shift": [')) {
    const oldBtn = '"commands":[{"set":{"local":"archive_event"},"value":"end_shift"},{"create_thread":{"commands":[{"sleep":0.02},{"call_macro":"archive closing dispatch"},{"set_dispatch_dialog":0},{"set":{"var":["L:DISPATCH_PHASE","number"]},"value":7},{"call_macro":"Update_raw from dispatchphase"},{"call_macro":"trace return to base","params":{"stage":"end_waiting_write","detail":"END SHIFT to=2"}},{"set":{"local":"MISSION_END_WAITING"},"value":2}]}}]';
    s = rep(s, oldBtn, '"commands":[{"call_macro":"end shift"}]', 1, 'S3 button');
    s = rep(s, '  "end menu": [\n', `  "end shift": [
    {"#comment":"END SHIFT (button of the end menu, or the log-off status 8 of the keypads): archives the closing dispatch, closes the dispatch window, sets the internal phase 8 (resource logged off, Dr.DougRoss status patch) and MISSION_END_WAITING = 2."},
    {"set":{"local":"archive_event"},"value":"end_shift"},
    {"create_thread": {
      "commands": [
        {"sleep":0.02},
        {"call_macro":"archive closing dispatch"},
        {"set_dispatch_dialog":0},
        {"set":{"var":["L:DISPATCH_PHASE","number"]},"value":8},
        {"call_macro":"Update_raw from dispatchphase"},
        {"call_macro":"trace return to base","params":{"stage":"end_waiting_write","detail":"END SHIFT to=2"}},
        {"set":{"local":"MISSION_END_WAITING"},"value":2}
    ]}}
  ],
  "end menu": [\n`, 1, 'S3 macro');

    // S4
    const i = s.indexOf('  "send dispatch phase": [\n');
    const j = s.indexOf('\n  ],\n', i);
    const carls = '{"or":[{"require":{"var":["L:CARLS_CONNECTED","number"]},"eq":1},{"require":{"local":"wificonnect"},"eq":"Connected"}]}';
    const body = `  "send dispatch phase": [
    {"#comment":"Sends the status report (key 0-9 of the keypad, param phase) to the dispatcher; called by the tablet keypad and by the CARLS radio keypad. Only a key different from the current one is sent. The key is translated to the internal phase (sdp_lvar) through the status table of the language (Dr.DougRoss status patch): phase 8 (log off) only after the end of the mission, phase 0 (accept) not while a dispatch is running (phase 1-4), the CARLS popup only for the phases whose own threads do not raise it (not 0, 5, 6, 7)."},
    {"if": ${RAW}, "ne": {"param":"phase"},
      "then": [
        {"call_macro":"rescuetrack id guard"},
        {"set":{"local":"sdp_lvar"},"value":{"param":"phase"}},
        {"for_each": {"static":"statusMessages{local:RESCUETRACK_ID}translation"},
          "do": [
            {"if": {"struct":{"param":"$item"},"path":"id"}, "eq": {"param":"phase"},
              "then": [
                {"set":{"local":"sdp_lvar"},"value":{"struct":{"param":"$item"},"path":"LVAR"}}
            ]},
            {"sleep":0.01}
        ]},
        {"if": {"and": [{"require":{"local":"sdp_lvar"},"eq":8},{"require":{"local":"MISSION_END_WAITING"},"ne":1}]}, "eq": 1,
          "then": [
            {"set_message":{"text":"{0}","params":[{"if":{"local":"RESCUETRACK_ID"},"eq":1,"then":"ABMELDEN NUR NACH EINSATZENDE MOEGLICH","else":"LOG OFF IS ONLY POSSIBLE AFTER THE END OF THE MISSION"}]}},
            {"return":0}
        ]},
        {"if": {"and": [{"require":{"local":"sdp_lvar"},"eq":0},{"require":${DP},"gte":1},{"require":${DP},"lte":4}]}, "eq": 1,
          "then": [
            {"set_message":{"text":"{0}","params":[{"if":{"local":"RESCUETRACK_ID"},"eq":1,"then":"EINSATZ BEREITS UEBERNOMMEN","else":"DISPATCH ALREADY ACCEPTED"}]}},
            {"return":0}
        ]},
        {"set":{"var":["L:DISPATCH_PHASE_RAW","number"]},"value":{"param":"phase"}},
        {"call_macro":"Update_dispatchphase from raw"},
        {"if": {
          "and": [
            {"require":{"local":"sdp_lvar"},"ne":0},
            {"require":{"local":"sdp_lvar"},"ne":5},
            {"require":{"local":"sdp_lvar"},"ne":6},
            {"require":{"local":"sdp_lvar"},"ne":7}
          ]}, "eq": 1,
          "then": [
            {"set":{"var":["L:CARLS_TEMP","number"]},"value":1}
        ]},
        {"set":{"local":"dispatch_phase_log"},"value":{"text":"Status sent: {0}","params":[{"local":"rescuetrack_name"}]}},
        {"call_macro":"post dispatcher message","params":{"from":"crew","text":{"local":"dispatch_phase_log"}}},
        {"if": {"local":"sdp_lvar"}, "eq": 8,
          "then": [
            {"call_macro":"end shift"}
        ]}
    ]}`;
    s = s.slice(0, i) + body + s.slice(j);

    // S7/S8 status list lines (dispatch control) and keypad rows
    const lines = s.split('\n');
    const dcStart = lines.findIndex((l) => l === '  "dispatch control": [');
    const dcEnd = lines.findIndex((l, k) => k > dcStart && l === '  ],');
    const isStat = (l) => l.includes('"params":[{"local":"rescuetrack_');
    const first = lines.findIndex((l, k) => k > dcStart && k < dcEnd && isStat(l));
    const stat = lines.filter((l, k) => k > dcStart && k < dcEnd && isStat(l));
    if (stat.length < 25) throw new Error('S7 lines ' + stat.length);
    const ind = '        ';
    const nl = [];
    for (let k = 0; k < 10; k++) {
      nl.push(`${ind}{"text":"{0}","params":[{"local":"rescuetrack_${k}"}],"color":"white","show_condition":{"require":${RAW},"ne":${k}}},`);
      nl.push(`${ind}{"text":"{0}","params":[{"local":"rescuetrack_${k}"}],"color":"green","show_condition":{"require":${RAW},"eq":${k}}},`);
    }
    const kept = lines.filter((l, k) => !(k > dcStart && k < dcEnd && isStat(l)));
    kept.splice(first, 0, ...nl);
    s = kept.join('\n');
    const key = (k, extra) => `{"title":" ${k} ",${extra || ''}"select_condition":{"require":${RAW},"ne":${k}},"commands":[{"if":${carls},"eq":1,"then":[{"call_macro":"send dispatch phase","params":{"phase":${k}}}]}]}`;
    const row = (ks) => `${ind}{"buttonbar":[${ks.map((k) => key(k)).join(',')}]},`;
    const star = (t) => `{"title":" ${t} ","commands":[{"set_message":{"text":"NO ASSIGNED FUNCTION"}},{"sleep":[1,5]},{"set_message":{"text":" "}}]}`;
    const rows = { '7': row([7, 8, 9]), '4': row([4, 5, 6]), '1': row([1, 2, 3]),
      '*': `${ind}{"buttonbar":[${star('*')},${key(0, '"disabled_condition":{"require":{"local":"has_location"},"eq":"no"},')},${star('#')}]},` };
    const L2 = s.split('\n');
    for (const [t, repl] of Object.entries(rows)) {
      const idx = L2.findIndex((l) => l.startsWith(`${ind}{"buttonbar":[{"title":" ${t} "`));
      if (idx < 0) throw new Error('keypad row ' + t);
      L2[idx] = repl;
    }
    s = L2.join('\n');
    wr(p, s);
  }
}

// ---- S8 CARLS * and # only show the message
{
  const p = M + '15-debug-and-df-ui.json'; let s = rd(p);
  const a1 = `            {"set":{"var":["L:DISPATCH_PHASE_RAW","number"]},"value":0},
            {"call_macro":"Update_dispatchphase from raw"},
            {"set_message":{"text":"NO ASSIGNED FUNCTION"}},`;
  const a2 = `            {"set":{"var":["L:DISPATCH_PHASE","number"]},"value":0},
            {"call_macro":"Update_dispatchphase from raw"},
            {"set_message":{"text":"NO ASSIGNED FUNCTION"}},`;
  if (s.includes(a1) || s.includes(a2)) {
    s = rep(s, a1, '            {"set_message":{"text":"NO ASSIGNED FUNCTION"}},', 1, 'S8 star');
    s = rep(s, a2, '            {"set_message":{"text":"NO ASSIGNED FUNCTION"}},', 1, 'S8 sharp');
    wr(p, s);
  }
}

// ---- S6 CARLS STS shows the key really pressed and the German short text
{
  const p = 'mission-src/threads/02-carls.json'; let s = rd(p);
  if (!s.includes('Alarm quitt.')) {
    const de = ['Alarm quitt.', 'Zum Ber.ort', 'Am Ber.ort', 'Zum Abg.ort', 'Am Abg.ort', 'Frei Funk', 'Frei Wache', 'Nicht EB', 'Abgemeldet'];
    const en = ['Accepted dsptc', 'OTW to scene', 'At scene', 'OTW to hospt', 'At hospital', 'Available', 'At home b.', 'Not Availb', 'Logged off'];
    const keyTxt = '{"text":"Key {0}","params":[{"var":["L:DISPATCH_PHASE_RAW","number"]}]}';
    for (let n = 0; n <= 8; n++) {
      const a = n < 8 ? `[["ACTION:","Key ${n}"],["PREDEF MSG:","${en[n]}"],["TX: Sent","RX: Ackwn."]]` : `[["ACTION:","No prst"],["PREDEF MSG:","None"],["TX: Sent","RX: No answer"]]`;
      const msg = `{"if":{"local":"RESCUETRACK_ID"},"eq":1,"then":"${de[n]}","else":"${en[n]}"}`;
      const b = `[["ACTION:",${keyTxt}],["PREDEF MSG:",${msg}],["TX: Sent","RX: Ackwn."]]`;
      if (n === 8) { const i0 = s.indexOf(a); if (i0 < 0) throw new Error('S6 8'); s = s.slice(0, i0) + b + s.slice(i0 + a.length); } else s = rep(s, a, b, 1, 'S6 ' + n);
    }
    wr(p, s);
  }
}
console.log('status patch merged');
