// One-shot generator (2026-11-21): ICS VOX glitch of the crew headsets. Writes mission-src/macros/26-vox-glitch.json,
// wires the start into objective1 (11) and adds the module to the manifest, README and WORKSPACE_MAP. Idempotent.
// Behaviour (Andrew 2026-11-21): in 20 percent of the flights, with engines on, collective up and crew aboard, a badly set VOX opens the ICS
// PTT on noise alone: 1 to 5 short bursts (0.5-2 s) published to the Companion as L:HMC_VOX_DUR (ms) + L:HMC_VOX_SEQ (counter).
// After the third burst someone aboard asks everyone to check VOX; after the last burst a random operator fixes it and does a comm check.
const fs = require('fs');
const rd = (f) => fs.readFileSync(f, 'utf8');
const g = (v) => ({ var: [v, 'number'] });
const L = (n) => ({ local: n });
const set = (n, v) => ({ set: { local: n }, value: v });
const rnd = (a, b) => ({ rand: [a, b] });
const pres = ['PILOT1', 'PAX_1', 'PAX_2', 'PAX_3'];

const mod = {
  'vox glitch start': [
    { '#comment': 'ICS VOX glitch of the crew headsets (Andrew 2026-11-21). Started by objective1 at every load, one loop only. No option: the roll (20 percent per flight) is the only gate.' },
    { if: L('vox_running'), ne: 1, then: [set('vox_running', 1), set('vox_rolled', 0), set('vox_done', 0), { create_thread: { commands: [{ call_macro: 'vox glitch loop' }] } }] }
  ],
  'vox glitch ready': [
    { '#comment': 'Sets vox_ready 1 when the glitch can happen: ICS powered (battery or GPCP switch), an engine running (N1 above 20), rotor above 40 percent, collective above 20 and somebody else aboard.' },
    set('vox_ready', 0),
    { call_macro: 'vox pick crew' },
    { if: L('vox_who'), gt: 0, then: [
      { if: g('L:{local:HXX}_SDK_ROTOR_RPM'), gt: 40, then: [
        { if: g('L:Collective'), gt: 20, then: [
          { if: g('L:{local:HXX}_SDK_ENG_1_N1'), gt: 20, then: [set('vox_eng', 1)], else: [{ if: g('L:{local:HXX}_SDK_ENG_2_N1'), gt: 20, then: [set('vox_eng', 1)], else: [set('vox_eng', 0)] }] },
          { if: L('vox_eng'), eq: 1, then: [
            { if: g('L:{local:HXX}_SDK_OH_BATTERY_MASTER'), eq: 1, then: [set('vox_ready', 1)], else: [{ if: g('L:{local:HXX}_SDK_GPCP_PWR_SWITCH'), eq: 1, then: [set('vox_ready', 1)] }] }
          ] }
        ] }
      ] }
    ] }
  ],
  'vox pick crew': [
    { '#comment': 'Random crew member aboard: vox_who 1 copilot, 2 PAX1, 3 PAX2, 4 PAX3, 0 nobody.' },
    set('vox_who', 0),
    // eight unrolled random tries, no loop (stack audit)
    ...Array.from({ length: 8 }, () => ({ if: L('vox_who'), eq: 0, then: [
      set('vox_cand', { floor: rnd(1, 5) }),
      { if: L('vox_cand'), eq: 1, then: [{ if: g('L:{local:HXX}_PERSIST_PILOT1'), eq: 0, then: [set('vox_who', 1)] }] },
      { if: L('vox_cand'), eq: 2, then: [{ if: g('L:{local:HXX}_SDK_CABIN_PAX_1'), eq: 1, then: [set('vox_who', 2)] }] },
      { if: L('vox_cand'), eq: 3, then: [{ if: g('L:{local:HXX}_SDK_CABIN_PAX_2'), eq: 1, then: [set('vox_who', 3)] }] },
      { if: L('vox_cand'), eq: 4, then: [{ if: g('L:{local:HXX}_SDK_CABIN_PAX_3'), eq: 1, then: [set('vox_who', 4)] }] }
    ] }))
  ],
  'vox glitch loop': [
    { '#comment': 'Once per flight: roll 20 percent, then N = 1 to 5 bursts with random gaps. After the third burst: a crew member asks to check the VOX. After the last burst (more than 2): a random operator fixes it and does a comm check.' },
    { while: 1, gt: 0, do: [
      { if: L('vox_done'), eq: 1, then: [{ sleep: 30 }], else: [
        { call_macro: 'vox glitch ready' },
        { if: L('vox_ready'), eq: 1, then: [
          { if: L('vox_rolled'), ne: 1, then: [
            set('vox_rolled', 1), set('vox_count', 0),
            set('vox_left', { floor: rnd(1, 6) }),
            set('vox_roll', rnd(0, 100)), { if: L('vox_roll'), gte: 20, then: [set('vox_done', 1)] },
            set('vox_total', L('vox_left'))
          ], else: [
            set('vox_gap', rnd(15, 60)), { sleep: L('vox_gap') },
            { call_macro: 'vox glitch ready' },
            { if: L('vox_ready'), eq: 1, then: [{ call_macro: 'vox glitch burst' }] }
          ] }
        ], else: [{ sleep: 3 }] },
        { sleep: 1 }
      ] }
    ] }
  ],
  'vox glitch burst': [
    { '#comment': 'One burst: the Companion plays ICS hiss and wind for L:HMC_VOX_DUR milliseconds (counter L:HMC_VOX_SEQ). The mission only publishes it.' },
    set('vox_ms', { floor: rnd(500, 2001) }),
    { set: { var: ['L:HMC_VOX_DUR', 'number'] }, value: L('vox_ms') },
    { set: { var: ['L:HMC_VOX_SEQ', 'number'] }, value: { add: [g('L:HMC_VOX_SEQ'), 1] } },
    { sleep: { divide: [L('vox_ms'), 1000] } },
    set('vox_count', { add: [L('vox_count'), 1] }),
    set('vox_left', { subtract: [L('vox_left'), 1] }),
    { if: L('vox_count'), eq: 3, then: [{ sleep: 2 }, { call_macro: 'vox pick crew' }, { call_macro: 'vox say', params: { kind: 'ASK' } }] },
    { if: L('vox_left'), lte: 0, then: [
      set('vox_done', 1),
      { if: L('vox_count'), gt: 2, then: [set('vox_gap', rnd(6, 12)), { sleep: L('vox_gap') }, { call_macro: 'vox pick crew' }, { call_macro: 'vox say', params: { kind: 'FIX' } }, { sleep: 3 }, { call_macro: 'vox comm check' }] }
    ] }
  ],
  'vox say': [
    { '#comment': 'Pack line VOX.<kind>.<who> (kind ASK or FIX) spoken by the crew member picked in vox_who: 1 copilot (CPL), 2 PAX1, 3 PAX2, 4 PAX3.' },
    ...['ASK', 'FIX'].flatMap((k) => [['1', 'CPL'], ['2', 'P1'], ['3', 'P2'], ['4', 'P3']].map(([w, n]) => ({ if: { param: 'kind' }, eq: k, then: [{ if: L('vox_who'), eq: +w, then: [{ call_macro: 'voice say', params: { key: 'VOX.' + k + '.' + n } }] }] })))
  ],
  'vox comm check': [
    { '#comment': 'The operator who fixed the VOX does his own comm check line (same variables as COMM CHECK).' },
    { if: L('vox_who'), eq: 1, then: [{ set: { var: ['L:CPL{local:VCP}5', 'number'] }, value: { add: [g('L:CPL{local:VCP}5'), 1] } }] },
    { if: L('vox_who'), eq: 2, then: [{ set: { var: ['L:{local:VCP}25', 'number'] }, value: { add: [g('L:{local:VCP}25'), 1] } }] },
    { if: L('vox_who'), eq: 3, then: [{ set: { var: ['L:PAX2{local:VCP}1', 'number'] }, value: { add: [g('L:PAX2{local:VCP}1'), 1] } }] },
    { if: L('vox_who'), eq: 4, then: [{ set: { var: ['L:PAX3{local:VCP}2', 'number'] }, value: { add: [g('L:PAX3{local:VCP}2'), 1] } }] }
  ]
};
fs.writeFileSync('mission-src/macros/26-vox-glitch.json', JSON.stringify(mod, null, 2) + '\n');

const patch = (file, find, repl) => { let s = rd(file); if (s.includes(repl)) return; if (!s.includes(find)) throw new Error('anchor ' + file); fs.writeFileSync(file, s.replace(find, () => repl)); };
if (process.argv.includes('--wire')) {
  patch('mission-src/macros/11-mission-lifecycle.json', '    {"call_macro":"flight constraints start"},', '    {"call_macro":"flight constraints start"},\n    {"call_macro":"vox glitch start"},');
  patch('mission-src/manifest.json', '        "file": "macros/15-debug-and-df-ui.json",', '        "file": "macros/26-vox-glitch.json",\n        "description": "ICS VOX glitch of the crew headsets: random short noise bursts on the intercom, crew asks to check the VOX, an operator fixes it and does a comm check."\n      },\n      {\n        "file": "macros/15-debug-and-df-ui.json",');
}
console.log('vox module written');
