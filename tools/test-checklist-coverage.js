#!/usr/bin/env node
'use strict';
// Checklists taken from the flight manual (section 4, interior check to the IFR procedures): format, page size, page links, step
// bookkeeping and a cooperative-scheduler run of every page, with the aircraft state assumed compliant (waits on aircraft
// variables pass; the waits on L:CHECKLIST_STEP are real).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const macros = Object.assign({}, JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/03-aircraft-crew-checklists.json'), 'utf8')), JSON.parse(fs.readFileSync(path.join(root, 'mission-src/macros/22-checklists.json'), 'utf8')));
const failures = [];
const requireTrue = (condition, message) => { if (!condition) failures.push(message); };

const SPEECH_RATE = 2.3; // words per second of the voice, spelled letters count as words
const SPEECH_LEAD = 0.4;
const speechSeconds = (text) => SPEECH_LEAD + text.replace(/[^A-Za-z0-9\s.']/g, ' ').split(/\s+/).filter(Boolean).length / SPEECH_RATE;
const PAGE_ROWS = 26; // rows a page may show: the interior check showed 27 rows up to its step 12
const STEMS = ['interior', 'quickprep', 'quickavionics', 'quickheating', 'quickpoweroff', 'afterheating', 'afterengstartckl1', 'afterengstartckl2', 'takeoffproc', 'prelanding', 'landing', 'shutdown', 'ifr'];
const PAGES = Object.keys(macros).filter((name) => /ckl[0-9a-z]*$/.test(name) && STEMS.some((stem) => name.startsWith(stem)));
const ENTRIES = ['interiorckl', 'quickprep1ckl', 'afterengstartckl1b', 'afterengstartckl2', 'takeoffprocckl', 'prelandingckl', 'landingckl', 'shutdownckl', 'ifrdepckl', 'ifrobsckl', 'ifrobscancelckl', 'ifrparallelckl', 'ifrparallelcancelckl', 'ifrholdckl', 'ifrilsckl', 'ifrlnavckl', 'ifrlpvckl', 'ifrmissedckl', 'ifrvtfckl'];
for (const entry of ENTRIES) requireTrue(Array.isArray(macros[entry]), `${entry} is missing`);

const walk = (node, visit) => {
  if (Array.isArray(node)) return node.forEach((entry) => walk(entry, visit));
  if (!node || typeof node !== 'object') return;
  visit(node);
  Object.values(node).forEach((entry) => walk(entry, visit));
};
const stepValues = (macro) => { const found = new Set(); walk(macro, (n) => { if (n.set?.var?.[0] === 'L:CHECKLIST_STEP' && typeof n.value === 'number') found.add(n.value); }); return found; };
const dispatchRows = (macro) => { let rows = []; walk(macro, (n) => { if (Array.isArray(n.set_dispatch)) rows = rows.concat(n.set_dispatch); }); return rows; };
const callsOf = (macro) => { const found = []; walk(macro, (n) => { if (typeof n.call_macro === 'string') found.push(n.call_macro); }); return found; };
const isSlopeRow = (row) => JSON.stringify(row.show_condition || {}).includes('L:CHECKLIST_SLOPE');
// rows one page shows at the same time: a white/yellow/gray triplet is one line; the guidance that only shows on a slope is not counted
const visibleRows = (rows) => {
  let visible = 0;
  for (let i = 0; i < rows.length;) {
    const row = rows[i];
    if (row.monospace === 1 && row.color === undefined && rows[i + 1]?.color === 'yellow' && rows[i + 2]?.color === 'gray') { visible += 1; i += 3; continue; }
    if (!isSlopeRow(row)) visible += 1;
    i += 1;
  }
  return visible;
};

// ---------------------------------------------------------------- static checks, every page
const ranges = [];
for (const name of PAGES) {
  const macro = macros[name];
  const text = JSON.stringify(macro);
  requireTrue(/^[\x20-\x7e]*$/.test(text.replace(/\\"/g, '"')), `${name} contains characters outside printable ASCII`);
  requireTrue(!text.includes('"param"') && !text.includes('"or"'), `${name} must not use param references or OR conditions`);
  const rows = dispatchRows(macro);
  const numbered = rows.filter((row) => row.monospace === 1 && /^[0-9]+\./.test(row.text || ''));
  requireTrue(numbered.every((row) => row.text.length === 49), `${name}: every numbered row must have exactly 49 characters: ${numbered.filter((row) => row.text.length !== 49).map((row) => row.text).join(' | ')}`);
  requireTrue(rows.filter((row) => row.monospace === 1).every((row) => row.text.length <= 49 || (row.text || '').startsWith('If OAT')), `${name}: a row is longer than 49 characters`);
  const mono = rows.filter((row) => row.monospace === 1);
  requireTrue(mono.length % 3 === 0, `${name}: monospace rows are not in white/yellow/gray triplets`);
  for (let i = 0; i + 2 < mono.length; i += 3) {
    const [white, yellow, gray] = mono.slice(i, i + 3);
    requireTrue(yellow.color === 'yellow' && gray.color === 'gray' && !white.color, `${name}: row triplet ${i / 3} has the wrong colours`);
    requireTrue(white.text.endsWith('[ ]') === yellow.text.endsWith('[ ]') && (gray.text.endsWith('[V]') === white.text.endsWith('[ ]')), `${name}: row triplet ${i / 3} has inconsistent markers`);
  }
  // the notes and cautions of a page are read out
  const spoken = [];
  walk(macro, (n) => { if (typeof n.speak === 'string') spoken.push(n.speak); });
  if (rows.some((row) => /^CAUTION:/.test(row.text || ''))) requireTrue(spoken.some((line) => /Caution!/.test(line)), `${name}: its caution is not read out`);
  if (rows.some((row) => /^NOTE:/.test(row.text || '') && !/Required if OAT/.test(row.text))) requireTrue(spoken.some((line) => /Note!/.test(line)), `${name}: its note is not read out`);
  // the prompt of a step ends before the step moves on (the next prompt interrupts it); the opening gets 4 s
  walk(macro, (n) => {
    const commands = n.create_thread?.commands;
    if (!Array.isArray(commands) || typeof commands[0]?.speak !== 'string') return;
    const waitSeconds = [...commands].reverse().find((c) => typeof c.sleep === 'number')?.sleep;
    if (waitSeconds === undefined) return;
    requireTrue(speechSeconds(commands[0].speak) <= waitSeconds, `${name}: "${commands[0].speak.slice(0, 60)}" lasts about ${speechSeconds(commands[0].speak).toFixed(1)} s but the step moves on after ${waitSeconds} s`);
  });
  {
    const opening = macro.find((c) => typeof c.speak === 'string');
    const afterRows = macro.findIndex((c) => Array.isArray(c.set_dispatch));
    const openingWait = macro[afterRows + 1]?.sleep;
    requireTrue(opening && openingWait >= 4 && speechSeconds(opening.speak) <= openingWait, `${name}: the opening announcement does not fit its ${openingWait} s`);
  }
  requireTrue(visibleRows(rows) <= PAGE_ROWS, `${name}: shows ${visibleRows(rows)} rows, a page holds ${PAGE_ROWS}`);
  // every step number between the start and the completion is set by some command, so no wait_for can hang
  const sets = stepValues(macro);
  const base = Math.min(...sets);
  const max = Math.max(...sets);
  for (let n = base; n <= max; n += 1) requireTrue(sets.has(n), `${name}: step ${n} is never reached`);
  ranges.push([name, base, max]);
  // an optional block is two links guarded by the step
  if (text.includes('L:CHECKLIST_BRANCH')) requireTrue(rows.filter((row) => row.link && row.commands?.some((c) => c.if?.var?.[0] === 'L:CHECKLIST_STEP')).length >= 2, `${name}: the choice needs two links guarded by the step`);
  requireTrue(!text.includes('"sleep":20') || rows.some((row) => row.link && row.commands?.some((c) => c.if?.local)), `${name}: the 20-second continuation needs its link`);
}
for (let i = 0; i < ranges.length; i += 1) for (let j = i + 1; j < ranges.length; j += 1) {
  requireTrue(ranges[i][2] < ranges[j][1] || ranges[j][2] < ranges[i][1], `step ranges of ${ranges[i][0]} and ${ranges[j][0]} overlap`);
}
for (const [name, from] of ranges) requireTrue(from > 135, `${name}: range overlaps the older checklists`);

// page links: every NEXT PAGE link has its PREV PAGE link on the following page, pages are reachable from an entry
for (const name of PAGES) {
  const rows = dispatchRows(macros[name]);
  const next = rows.find((row) => /^NEXT PAGE \(/.test(row.link || ''));
  if (next) {
    const target = next.commands[0].then.find((c) => c.call_macro).call_macro;
    const back = dispatchRows(macros[target]).find((row) => /^< PREV PAGE \(/.test(row.link || ''));
    requireTrue(back && back.commands.some((c) => c.call_macro === name), `${name}: the page ${target} has no PREV PAGE link back`);
    requireTrue(!next.show_condition, `${name}: the NEXT PAGE link must be always visible`);
  }
}
// automatic continuation: 5 s (3 + 2) between pages of one list, 20 s only between different checklists
const SAME_LIST = new Set(['quickavionicsckl', 'quickheatingmenuckl', 'quickpoweroffckl', 'afterengstartckl1c']);
for (const name of PAGES) {
  walk(macros[name], (n) => {
    const commands = n.create_thread?.commands;
    if (!commands || typeof commands[0]?.sleep !== 'number') return;
    const call = commands.flatMap((c) => c.then || []).find((c) => c.call_macro)?.call_macro;
    if (!call || !PAGES.includes(call)) return;
    const sameList = SAME_LIST.has(call) || (call.replace(/[0-9]*ckl$/, '') === name.replace(/[0-9]*ckl$/, '')) || (call === name.replace(/ckl$/, '') + 'ckl');
    const continuation = sameList || /^NEXT PAGE/.test(dispatchRows(macros[name]).find((row) => row.link && JSON.stringify(row.commands).includes('"' + call + '"'))?.link || '');
    requireTrue(continuation ? commands[0].sleep <= 2 : commands[0].sleep === 20, `${name}: the continuation to ${call} waits ${commands[0].sleep} s (continuation pages 2 s after the 3 s of completion, other checklists 20 s)`);
  });
}
const reachable = new Set(ENTRIES);
for (let grew = true; grew;) { grew = false; for (const name of [...reachable]) for (const call of callsOf(macros[name])) if (PAGES.includes(call) && !reachable.has(call)) { reachable.add(call); grew = true; } }
requireTrue(PAGES.every((name) => reachable.has(name)), `pages not reachable from an entry: ${PAGES.filter((name) => !reachable.has(name)).join(', ')}`);

// main page: every procedure listed by its title, nothing opens the wrong list
{
  const homeRows = macros['checklist home'].find((entry) => entry.set_dispatch).set_dispatch;
  const home = homeRows.filter((row) => row.link && row.commands?.[0]?.call_macro);
  const target = (text) => home.find((row) => row.link === text)?.commands[0].call_macro;
  const expected = {
    '- INTERIOR CHECK': 'interiorckl', '- QUICK START: ADDITIONAL PREFLIGHT CHECKS': 'quickprep1ckl', '- AFTER ENGINE START (HEATING AND AVIONICS CHECKS)': 'afterengstartckl1b',
    '- AFTER ENGINE START CHECKLIST (PART 2)': 'afterengstartckl2', '- TAKE-OFF': 'takeoffprocckl', '- PRE-LANDING CHECK': 'prelandingckl', '- LANDING': 'landingckl', '- ENGINE SHUTDOWN': 'shutdownckl',
    '- IFR PREFLIGHT CHECK AND DEPARTURE (SID)': 'ifrdepckl', '- OBS NAVIGATION: SELECT': 'ifrobsckl', '- OBS NAVIGATION: CANCEL': 'ifrobscancelckl', '- PARALLEL TRACK: SELECT': 'ifrparallelckl',
    '- PARALLEL TRACK: CANCEL': 'ifrparallelcancelckl', '- HOLDING PATTERN': 'ifrholdckl', '- ILS APPROACH': 'ifrilsckl', '- LNAV OR LP APPROACH': 'ifrlnavckl', '- LPV OR LNAV/VNAV APPROACH': 'ifrlpvckl',
    '- MISSED APPROACH (GPS APPROACHES ONLY)': 'ifrmissedckl', '- VECTORS-TO-FINAL': 'ifrvtfckl',
  };
  for (const [text, macro] of Object.entries(expected)) requireTrue(target(text) === macro, `main page: ${text} must open ${macro}, not ${target(text)}`);
  for (const text of ['- TAKE-OFF', '- PRE-LANDING CHECK', '- LANDING', '- ENGINE SHUTDOWN', ...Object.keys(expected).filter((t) => /IFR|OBS|PARALLEL|HOLDING|ILS|LNAV|LPV|MISSED|VECTORS/.test(t))]) requireTrue(!home.find((row) => row.link === text)?.show_condition, `${text} must be always visible on the main page`);
  requireTrue(home.filter((row) => row.commands[0].call_macro === 'startupckl').every((row) => row.link === '- START-UP CHECKLIST (Quick start)'), 'a main page entry other than the quick start start-up opens startupckl');
  requireTrue(!home.some((row) => /HOVER CHECK|AFTER TAKE-OFF|CRUISE CHECKLIST|BEFORE LANDING|SHUT-DOWN/.test(row.link)), 'the placeholders of the original main page must be gone');
  for (const row of home) requireTrue(Array.isArray(macros[row.commands[0].call_macro]), `main page: ${row.link} opens a missing macro ${row.commands[0].call_macro}`);
}
// LVARs given by the user
{
  const all = JSON.stringify(macros);
  for (const lvar of ['SDK_ROTOR_BRAKE', 'SDK_ECP_FADEC_EMER_1', 'SDK_ECP_FADEC_EMER_2', 'SDK_AIRCP_DEFOG', 'SDK_OH_EMER_SHED_BUS', 'SDK_CCP_MFD_MODE', 'SDK_ELT_SWITCH']) requireTrue(all.includes(`L:{local:HXX}_${lvar}`), `the LVAR ${lvar} is not used through HXX`);
  // ENG MAIN: 0 FLT, 1 IDLE, 2 OFF
  const interior = PAGES.filter((n) => n.startsWith('interior')).map((n) => JSON.stringify(macros[n])).join('');
  requireTrue(/SDK_ECP_MAIN_1","number"\]},"eq":2/.test(interior), 'the interior check must wait for ENG MAIN OFF = 2');
  // ELT switch: 1 armed, 0 test, 2 on
  requireTrue(/SDK_ELT_SWITCH","number"\]},"eq":1/.test(interior) && /SDK_ELT_SWITCH","number"\]},"eq":0/.test(interior), 'the interior check must wait for the ELT switch ARMED = 1 and TEST = 0');
  const shutdown = PAGES.filter((n) => n.startsWith('shutdown')).map((n) => JSON.stringify(macros[n])).join('');
  requireTrue(/SDK_ECP_MAIN_1","number"\]},"eq":1/.test(shutdown) && /SDK_ECP_MAIN_1","number"\]},"eq":2/.test(shutdown), 'the shutdown must wait for ENG MAIN IDLE = 1 and OFF = 2');
}
for (const name of ['takeoffprocckl', 'landingckl']) {
  const text = JSON.stringify(macros[name]);
  requireTrue(text.includes('L:CHECKLIST_SLOPE') && text.includes('"while"') && text.includes('0.20944'), `${name}: slope guidance must follow the 12-degree pitch/bank threshold through L:CHECKLIST_SLOPE`);
}

// ---------------------------------------------------------------- scheduler
function run(name, options = {}) {
  const state = { 'L:CHECKLIST_STEP': 0, 'L:CHECKLIST_BRANCH': 0, 'L:CHECKLIST_SKIP': options.skip || 0, 'E:TIME OF DAY': options.night ? 2 : 1, 'AMBIENT TEMPERATURE': 15 };
  const locals = {};
  const calls = [];
  const trail = [];
  const pending = [...(options.clicks || [])];
  let dispatch = [];
  let t = 0;
  let events = 0;
  const get = (v) => (state[v[0]] === undefined ? 0 : state[v[0]]);
  const value = (v) => {
    if (typeof v !== 'object' || v === null) return v;
    if (v.add) return v.add.reduce((sum, x) => sum + value(x), 0);
    if (v.var) return get(v.var);
    if (v.local) return locals[v.local] === undefined ? 0 : locals[v.local];
    return 0;
  };
  const compare = (leftValue, c) => {
    for (const key of ['eq', 'ne', 'gt', 'gte', 'lt', 'lte']) {
      if (c[key] === undefined) continue;
      const right = value(c[key]);
      return { eq: leftValue === right, ne: leftValue !== right, gt: leftValue > right, gte: leftValue >= right, lt: leftValue < right, lte: leftValue <= right }[key];
    }
    return !!leftValue;
  };
  const left = (c) => (c.var ? get(c.var) : c.local ? (locals[c.local] === undefined ? 0 : locals[c.local]) : 0);
  const shown = (row) => {
    const sc = row.show_condition;
    if (!sc) return true;
    if (sc.require?.var?.[0] === 'L:CHECKLIST_STEP') return compare(get(sc.require.var), sc);
    return true;
  };
  const threads = [];
  function* exec(commands) {
    for (const c of commands) {
      if (c.set) {
        const v = value(c.value);
        if (c.set.var) { state[c.set.var[0]] = v; if (c.set.var[0] === 'L:CHECKLIST_STEP') trail.push(v); } else if (c.set.local) locals[c.set.local] = v;
        events += 1;
      } else if (c.if) {
        const branch = compare(left(c.if), c) ? c.then : c.else;
        if (branch) yield* exec(branch);
      } else if (c.wait_for) {
        if (c.wait_for.var?.[0] === 'L:CHECKLIST_STEP') { while (!compare(get(c.wait_for.var), c)) yield { wait: true }; }
      } else if (c.while) {
        while (compare(left(c.while), c)) yield* exec(c.do);
      } else if (c.sleep) { events += 1; yield { sleep: c.sleep }; }
      else if (c.create_thread) { events += 1; threads.push({ gen: exec(c.create_thread.commands), wake: t }); }
      else if (c.call_macro) { if (!/volume|crew vol|chk vol/.test(c.call_macro)) calls.push(c.call_macro); }
      else if (c.set_dispatch) dispatch = c.set_dispatch;
    }
  }
  threads.push({ gen: exec(macros[name]), wake: 0 });
  for (let guard = 0; guard < 400000; guard += 1) {
    if (pending.length) {
      const row = dispatch.find((r) => r.link === pending[0] && shown(r));
      if (row) { pending.shift(); events += 1; threads.push({ gen: exec(row.commands), wake: t }); }
    }
    const before = events;
    for (const th of threads.slice()) {
      if (th.done || th.wake > t) continue;
      const r = th.gen.next();
      if (r.done) { th.done = true; events += 1; } else if (r.value?.sleep) th.wake = t + r.value.sleep;
    }
    if (events !== before) continue;
    const sleepers = threads.filter((th) => !th.done && th.wake > t).map((th) => th.wake);
    if (!sleepers.length) break;
    t = Math.min(...sleepers);
    if (t > 1000) break;
  }
  if (pending.length) failures.push(`${name}: the link "${pending[0]}" was never shown`);
  return { state, calls, trail, locals, dispatch };
}
const expectCalls = (label, result, expected) => requireTrue(JSON.stringify(result.calls) === JSON.stringify(expected), `${label}: calls ${JSON.stringify(result.calls)} instead of ${JSON.stringify(expected)}`);
const doneOf = (name) => Math.max(...stepValues(macros[name]));
const linkTexts = (name) => dispatchRows(macros[name]).filter((row) => row.link).map((row) => row.link);
const choiceLinks = (name) => dispatchRows(macros[name]).filter((row) => row.link && row.commands?.some((c) => c.if?.var?.[0] === 'L:CHECKLIST_STEP' && c.then?.some((x) => x.set?.var?.[0] === 'L:CHECKLIST_BRANCH' || x.set?.var?.[0] === 'L:CHECKLIST_STEP'))).map((row) => row.link);

// every page, alone: stops at its optional-block choice, takes either link, and reaches its last step
for (const name of PAGES) {
  const choices = choiceLinks(name);
  const done = doneOf(name);
  if (choices.length) {
    const waiting = run(name, { night: true });
    requireTrue(waiting.state['L:CHECKLIST_STEP'] < done && waiting.state['L:CHECKLIST_BRANCH'] === 0 && waiting.calls.every((c) => !PAGES.includes(c)), `${name}: must stop at the choice, day or night, and wait for a link`);
    for (const link of choices) {
      const result = run(name, { clicks: [link] });
      requireTrue(result.state['L:CHECKLIST_STEP'] === done, `${name}: after "${link}" the page must reach its last step (${result.state['L:CHECKLIST_STEP']} of ${done})`);
    }
  } else {
    const result = run(name);
    requireTrue(result.state['L:CHECKLIST_STEP'] === done, `${name}: does not run through all its steps (${result.state['L:CHECKLIST_STEP']} of ${done})`);
  }
}

// a list follows its pages by itself (NEXT PAGE and the proceed links) and stops where the manual leaves the choice to the pilot
function chain(first, options = {}) {
  const visited = [];
  let name = first;
  let clicks = options.clicks || [];
  let last;
  while (name && !visited.includes(name)) {
    visited.push(name);
    const pageChoices = choiceLinks(name);
    const mine = clicks.filter((c) => linkTexts(name).includes(c));
    clicks = clicks.filter((c) => !mine.includes(c));
    last = run(name, { ...options, clicks: mine });
    const next = last.calls.find((c) => PAGES.includes(c));
    if (pageChoices.length && !mine.length) break;
    name = next;
  }
  return { visited, last };
}
{
  const expectList = (label, first, clicks, expected, finalCalls) => {
    const r = chain(first, { clicks });
    requireTrue(JSON.stringify(r.visited) === JSON.stringify(expected), `${label}: visited ${r.visited.join(' > ')} instead of ${expected.join(' > ')}`);
    if (finalCalls) expectCalls(`${label} (last page)`, r.last, finalCalls);
  };
  const NIGHT = 'Click here for: - PREPARATION FOR NIGHT FLIGHT - - - -';
  const NO_NIGHT = '- SKIP PREPARATION FOR NIGHT FLIGHT';
  const interior = PAGES.filter((n) => /^interior\d*ckl$/.test(n)).sort();
  const interiorOrder = ['interiorckl', ...interior.filter((n) => n !== 'interiorckl')];
  expectList('interior check', 'interiorckl', [], interiorOrder, []);
  expectList('interior check, normal start-up', 'interiorckl', ['PROCEED WITH START-UP CHECKLIST (NORMAL)'], interiorOrder, ['normstartupckl']);
  requireTrue(chain('interiorckl', { clicks: ['PROCEED WITH QUICK START: ADDITIONAL PREFLIGHT CHECKS'] }).visited.includes('quickprep1ckl'), 'interior check: the quick preflight link must open the additional preflight checks');
  expectList('interior check, quick start-up', 'interiorckl', ['PROCEED WITH START-UP CHECKLIST (QUICK START)'], interiorOrder, ['startupckl']);
  // additional preflight checks: the night block by the pilot's link, then avionics, heating choice, power off
  const quickNight = chain('quickprep1ckl', { clicks: [NIGHT] });
  requireTrue(quickNight.visited.includes('quickavionicsckl') && quickNight.last.state['L:CHECKLIST_BRANCH'] !== undefined, 'additional preflight checks must continue with the avionic checks');
  const quickDay = chain('quickprep1ckl', { clicks: [NO_NIGHT] });
  requireTrue(quickDay.visited.includes('quickavionicsckl') && quickDay.visited.includes('quickheatingmenuckl'), 'additional preflight checks must continue with the avionic checks and the heating choice');
  expectList('quick heating choice (no click)', 'quickheatingmenuckl', [], ['quickheatingmenuckl'], []);
  expectList('quick heating choice, heating', 'quickheatingmenuckl', ['HEATING SYSTEM CHECK'], ['quickheatingmenuckl', 'quickheatingckl', 'quickheating2ckl', 'quickpoweroffckl'], []);
  expectList('quick heating choice, skip', 'quickheatingmenuckl', ['- SKIP HEATING SYSTEM CHECK'], ['quickheatingmenuckl', 'quickpoweroffckl'], []);
  // after engine start: heating choice, heating check, avionics checks, avionic test or part 2
  expectCalls('after engine start', run('afterengstartckl'), ['afterengstartckl1b']);
  expectList('heating choice (no click)', 'afterengstartckl1b', [], ['afterengstartckl1b'], []);
  expectList('heating check', 'afterengstartckl1b', ['HEATING SYSTEM CHECK'], ['afterengstartckl1b', 'afterheatingckl', 'afterheating2ckl', 'afterengstartckl1c'], []);
  expectList('heating skipped, avionic test', 'afterengstartckl1b', ['- SKIP HEATING SYSTEM CHECK', 'PROCEED WITH AVIONIC/PREFLIGHT TEST'], ['afterengstartckl1b', 'afterengstartckl1c'], ['aviopftckl']);
  expectList('heating skipped, avionic test skipped', 'afterengstartckl1b', ['- SKIP HEATING SYSTEM CHECK', '- SKIP AVIONICS/PREFLIGHT TEST'], ['afterengstartckl1b', 'afterengstartckl1c', 'afterengstartckl2']);
  const early = run('afterengstartckl1c', { skip: 1 });
  expectCalls('skip chosen on the previous page', early, ['afterengstartckl2']);
  requireTrue(early.state['L:CHECKLIST_SKIP'] === 0, 'the skip flag must be consumed');
  // part 2 continues with the before take-off list whether the night block is taken or skipped
  expectList('part 2, night', 'afterengstartckl2', [NIGHT], ['afterengstartckl2', 'afterengstartckl2b'], ['beforetockl']);
  expectList('part 2, no night', 'afterengstartckl2', [NO_NIGHT], ['afterengstartckl2', 'afterengstartckl2b'], ['beforetockl']);
  // before take-off keeps its own hand-over, the take-off check leads to the take-off, the phase lists stop
  expectCalls('before take-off', run('beforetockl'), ['takeoffckl']);
  requireTrue(JSON.stringify(macros.takeoffckl.at(-1)) === '{"call_macro":"takeoffprocckl"}', 'the take-off check must continue with the take-off');
  for (const first of ['takeoffprocckl', 'prelandingckl', 'landingckl', 'shutdownckl', 'ifrdepckl', 'ifrilsckl', 'ifrlnavckl', 'ifrlpvckl', 'ifrmissedckl', 'ifrvtfckl', 'ifrholdckl']) {
    const r = chain(first, {});
    expectCalls(`${first} list`, r.last, []);
    for (const page of r.visited) {
      const text = JSON.stringify(macros[page]);
      const foreign = callsOf(macros[page]).filter((call) => ['prelandingckl', 'landingckl', 'shutdownckl', 'takeoffckl', 'Mission dispatch'].includes(call) && !page.startsWith(call.replace(/ckl$/, '')));
      requireTrue(!foreign.length && !text.includes('Mission dispatch'), `${page} must not hand over to another procedure (${foreign.join(', ')}): the pilot chooses it from the main page`);
    }
  }
  const night = run('prelandingckl', { night: true });
  requireTrue(night.state['L:CHECKLIST_STEP'] === doneOf('prelandingckl'), 'pre-landing by night must run through');
}

if (failures.length) {
  console.error(`Checklist coverage FAIL (${failures.length})`);
  failures.forEach((message) => console.error(` - ${message}`));
  process.exit(1);
}
console.log(`Checklist coverage PASS: ${PAGES.length} pages, 49-character rows, ${PAGE_ROWS}-row pages, page links, step bookkeeping and scheduler runs.`);
