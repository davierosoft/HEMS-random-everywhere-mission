'use strict';
// Destination edit/confirm page (user decisions 2026-11-15 and 2026-11-16).
// Simulator tests 2026-11-15 (standalone-tests/modal-refresh-test.json): set_modal shows the content of its FIRST execution at every call site and
// never updates it, and it blocks the world. A dispatch page re-evaluates its rows with the current locals and leaves the pilot free, so every
// hospital menu is a page: no modal, texts, buttons, coordinates, clinical data and the way back all in the page.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const macros = {};
const dir = path.join(root, 'mission-src', 'macros');
for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
const briefing = JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'root', '03-briefing.json'), 'utf8')).briefing;
const text = (name) => JSON.stringify(macros[name]);

// 1. The remaining modals of the mission keep fixed text (the simulator keeps the first execution); params are never read in a modal.
const modals = [];
(function walk(node, owner) {
  if (Array.isArray(node)) node.forEach((item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) for (const key of ['set_modal', 'wait_modal']) if (item[key] && typeof item[key] === 'object') modals.push({ owner, key, modal: item[key] });
    walk(item, owner);
  }); else if (node && typeof node === 'object') for (const value of Object.values(node)) walk(value, owner);
})(Object.entries(macros), '');
for (const [name, commands] of Object.entries(macros)) (function walk(node) {
  if (Array.isArray(node)) node.forEach((item) => { if (item && typeof item === 'object' && !Array.isArray(item)) for (const key of ['set_modal', 'wait_modal']) if (item[key] && typeof item[key] === 'object' && Object.keys(item[key]).length) { assert.ok(!Object.hasOwn(item[key], 'params'), `${name}: ${key} uses params`); assert.equal(typeof item[key].text, 'string', `${name}: ${key} text must be fixed`); assert.equal(typeof item[key].title, 'string', `${name}: ${key} title must be fixed`); } walk(item); });
  else if (node && typeof node === 'object') for (const value of Object.values(node)) walk(value);
})(commands);

// 2. No modal in any hospital destination flow (a modal blocks the world, user 2026-11-16) and the old modal macros are gone.
const destinationMacros = ['destination cancel selection', 'destination page', 'destination confirm', 'destination unload here', 'destination select map list', 'destination select custom db', 'destination selection done', 'destination cambu ask', 'destination cambu go', 'destination unload far ambulance', 'user destination menu', 'crew emergency destination menu', 'destination_selection_and_confirmationmsg'];
for (const name of destinationMacros) {
  assert.ok(Array.isArray(macros[name]), `macro "${name}" is missing`);
  assert.ok(!/"(set|wait)_modal"/.test(text(name)), `${name}: no modal in the destination flows`);
}
for (const gone of ['Choose manual type modal', 'destination modal text', 'destination modal trace']) assert.ok(!Object.hasOwn(macros, gone), `${gone} must be gone`);
for (const old of ['destination_modal_base', 'destination_modal_fast', 'destination_page_title']) for (const name of destinationMacros) assert.ok(!text(name).includes(old), `${name} must not use ${old}`);

// 3. The page: status bar, back link, title, the rows of the user's layout in order.
const page = macros['destination page'];
const rows = page.find((c) => c.set_dispatch).set_dispatch;
const find = (pred, label) => { const i = rows.findIndex(pred); assert.ok(i >= 0, `page row missing: ${label}`); return i; };
assert.equal(rows.filter((r) => r.image && /^sbar\d\d$/.test(r.image)).length, 20, 'the twenty status bars (wifi, 5G) on the page');
assert.ok(rows.some((r) => r.text === '{0}' && r.params && r.params[0].local === 'TIP_LINE'), 'the voice commands line of the status bar');
const iBack = find((r) => r.link === 'Back to main screen', 'back link');
assert.deepEqual(rows[iBack].commands, [{ call_macro: 'shared repeated block 029' }], 'Back to main screen goes to the page opened before (prev_page)');
const iTitle = find((r) => r.text === 'DESTINATION EDIT/CONFIRM PAGE', 'title');
const iBar1 = rows.findIndex((r, i) => i > iTitle && r.image === 'bar');
const iActual = find((r) => (r.text || '').startsWith('Actual destination: '), 'actual destination');
const iNone = find((r) => r.text === 'NO ACTUAL DESTINATION SELECTED', 'no actual destination');
const iCoord = find((r) => (r.text || '').startsWith('Coordinates: '), 'coordinates');
const iConfirm = find((r) => r.buttonbar && r.buttonbar.some((b) => b.title === 'CONFIRM SELECTION'), 'confirm');
const iBar2 = rows.findIndex((r, i) => i > iConfirm && r.image === 'bar');
const iEdit = find((r) => r.text === 'EDIT DESTINATION:', 'edit label');
assert.ok(iBack < iTitle && iTitle < iBar1 && iBar1 < iActual && iActual < iNone && iNone < iCoord && iCoord < iConfirm && iConfirm < iBar2 && iBar2 < iEdit, 'order: back, title, bar, actual destination, coordinates, confirm and map, second bar, EDIT DESTINATION');
assert.ok(!JSON.stringify(rows).includes('Select destination helipad'), 'the old helipad text is gone');
const confirmBar = rows[iConfirm].buttonbar;
assert.deepEqual(confirmBar.map((b) => b.title), ['CONFIRM SELECTION', 'SHOW ON MAP'], 'confirm and show on map side by side');
assert.equal(confirmBar[0].color, 'green');
for (const b of confirmBar) assert.ok(JSON.stringify(b.show_condition).includes('"has_location":"hospital_user"'), `${b.title}: only with a valid hospital_user`);
assert.deepEqual(confirmBar[1].commands, [{ set_user_poi: 'hospital_user' }, { set_dispatch_dialog: 0 }], 'show on map: poi and close the tablet');
assert.deepEqual(rows[iNone].show_condition, { require: { has_location: 'hospital_user' }, eq: 0 });
assert.equal(rows[iCoord].text, 'Coordinates: {0:LOCATION}', 'coordinates in the HPG location format (degrees), never decimal');
assert.deepEqual(rows[iCoord].params, ['hospital_user'], 'the location object is the parameter');
assert.ok(!JSON.stringify(rows).includes('"var":"lat"'), 'no decimal latitude on the page');
const edit = rows[iEdit + 1].buttonbar;
assert.deepEqual(edit.map((b) => b.title), ['MANUALLY SELECT FROM MAP', 'MANUALLY SELECT FROM LIST', 'SELECT FROM CUSTOM DB'], 'the two manual buttons side by side');
assert.ok(JSON.stringify(edit[0].show_condition).includes('"DESTINATION_SELECTION_MODE"') && JSON.stringify(edit[0].show_condition).includes('"eq":1'), 'map when the selection mode is the map');
assert.ok(JSON.stringify(edit[1].show_condition).includes('"DESTINATION_SELECTION_MODE"') && JSON.stringify(edit[1].show_condition).includes('"eq":0'), 'list in legacy (list) mode');
for (const b of edit) assert.ok(JSON.stringify(b.commands).includes('create_thread'), `${b.title}: waits for the user, in a thread`);

// 4. No condition with OR in a page row (the renderer evaluates AND only) and no row without a reachable macro.
assert.ok(!/"or":\[/.test(JSON.stringify(rows)), 'no OR in the show conditions of the page');
const all = JSON.stringify([...Object.values(macros)]);
for (const name of destinationMacros) (text(name).match(/"call_macro":"([^"]+)"/g) || []).forEach((m) => { const n = m.slice(14, -1); assert.ok(Object.hasOwn(macros, n), `${name} calls the missing macro ${n}`); });
assert.ok(all.length > 0);

// 5. Static render of every kind and state: the page always offers a way to go back, to choose a destination and, with a hospital, to confirm.
const evalCond = (c, st) => {
  if (!c) return true;
  const get = (req) => {
    if (req.local !== undefined) return st.locals[req.local] === undefined ? null : st.locals[req.local];
    if (req.global !== undefined) return st.globals[req.global];
    if (req.has_location !== undefined) return st.has[req.has_location] ? 1 : 0;
    if (req.has_object !== undefined) return st.has[req.has_object] ? 1 : 0;
    if (req.var !== undefined) return (st.vars || {})[req.var[0]] ?? 0;
    throw new Error('unsupported ' + JSON.stringify(req));
  };
  const one = (x) => { const v = get(x.require); for (const [op, fn] of [['eq', (p, q) => p === q], ['ne', (p, q) => p !== q], ['gt', (p, q) => p > q], ['gte', (p, q) => p >= q], ['lt', (p, q) => p < q], ['lte', (p, q) => p <= q]]) if (x[op] !== undefined) return fn(v, x[op]); throw new Error('op ' + JSON.stringify(x)); };
  if (c.and) return c.and.every(one);
  return one(c);
};
const visible = (st) => rows.filter((r) => evalCond(r.show_condition, st)).flatMap((r) => (r.buttonbar ? r.buttonbar.filter((b) => evalCond(b.show_condition, st)).map((b) => b.title) : []).concat(r.link ? [r.link] : []));
// the locals computed at build
const buildFlags = (kind, extra) => {
  const l = { destination_busy: 0, destination_page_kind: kind, destination_flag_clinical: kind === 'patient' || kind === 'patient_cambu' ? 1 : 0, destination_flag_unload: kind === 'patient' || kind === 'patient_cambu' ? 1 : 0, destination_cambu_ask: 0, destination_far_ambu: 0, ...extra };
  return l;
};
let states = 0;
for (const kind of ['patient', 'patient_cambu', 'ambudoc', 'organ', 'crew']) for (const hospital of [false, true]) for (const mode of [0, 1]) for (const far of [0, 1]) for (const ask of [0, 1]) {
  if (far && !(kind === 'patient' || kind === 'patient_cambu')) continue;
  if (ask && kind !== 'patient_cambu') continue;
  const st = { locals: buildFlags(kind, { destination_far_ambu: far, destination_cambu_ask: ask }), globals: { DESTINATION_SELECTION_MODE: mode }, has: { hospital_user: hospital } };
  const v = visible(st);
  states++;
  assert.ok(v.includes('Back to main screen'), `${kind}: always a way back`);
  assert.ok(v.includes(mode === 1 ? 'MANUALLY SELECT FROM MAP' : 'MANUALLY SELECT FROM LIST') && v.includes('SELECT FROM CUSTOM DB'), `${kind}: always a way to choose a destination`);
  assert.equal(v.includes('CONFIRM SELECTION'), hospital, `${kind}: confirm only with a hospital`);
  assert.equal(v.includes('SHOW ON MAP'), hospital, `${kind}: show on map only with a hospital`);
  assert.equal(v.includes('UNLOAD PATIENT HERE'), kind === 'patient' || kind === 'patient_cambu', `${kind}: unload here`);
  assert.equal(v.includes('UNLOAD TO CLOSEST AMBULANCE'), kind === 'patient_cambu', `${kind}: closest ambulance`);
  assert.equal(v.includes('UNLOAD TO AMBULANCE (FAR)'), far === 1, `${kind}: far ambulance`);
  assert.equal(v.includes('PICK UP DOCTOR HERE'), kind === 'ambudoc', `${kind}: doctor pickup`);
  assert.equal(v.includes('DROP ORGAN BOX HERE'), kind === 'organ', `${kind}: organ drop`);
  assert.equal(v.includes('YES') && v.includes('NO (BACK TO MENU)'), ask === 1, `${kind}: the ambulance question is in the page`);
  const shows = rows.some((r) => (r.text || '').startsWith('PATIENT {0} CLINICAL DATA') && evalCond(r.show_condition, st));
  assert.equal(shows, kind === 'patient' || kind === 'patient_cambu', `${kind}: diagnosis and vitals only when we carry the patient`);
}
assert.equal(states, 36, "36 renderable states");
// a selection in progress (map or custom DB): only the way back and CANCEL SELECTION, never a second selection or a confirmation
for (const kind of ['patient', 'patient_cambu', 'ambudoc', 'organ', 'crew']) for (const hospital of [false, true]) for (const mode of [0, 1]) {
  const st = { locals: buildFlags(kind, { destination_busy: 1 }), globals: { DESTINATION_SELECTION_MODE: mode }, has: { hospital_user: hospital } };
  const v = visible(st); states++;
  assert.ok(v.includes('Back to main screen') && !v.includes('CANCEL SELECTION'), `${kind}: busy page has the way back and no cancel button`);
  for (const title of ['CONFIRM SELECTION', 'MANUALLY SELECT FROM MAP', 'MANUALLY SELECT FROM LIST', 'SELECT FROM CUSTOM DB', 'UNLOAD PATIENT HERE', 'UNLOAD TO CLOSEST AMBULANCE', 'UNLOAD TO AMBULANCE (FAR)', 'PICK UP DOCTOR HERE', 'DROP ORGAN BOX HERE']) assert.ok(!v.includes(title), `${kind}: busy page hides ${title}`);
  assert.equal(v.includes('SHOW ON MAP'), hospital, `${kind}: show on map follows the hospital`);
}
assert.ok(!visible({ locals: buildFlags('patient', {}), globals: { DESTINATION_SELECTION_MODE: 1 }, has: { hospital_user: true } }).includes('CANCEL SELECTION'), 'no cancel without a selection');
assert.equal(states, 56);

// 6. The page is built once and never reopened by a selection; the briefing button follows the pending flag.
const flagWrites = (name, value) => (text(name).match(new RegExp('"destination_pending"\\},"value":' + value, 'g')) || []).length;
assert.equal(flagWrites('destination page', 1), 1, 'building the page raises the pending flag');
for (const name of ['destination confirm', 'destination unload here', 'destination cambu go', 'destination unload far ambulance']) assert.ok(flagWrites(name, 0) >= 1, `${name}: a confirming action clears the pending flag`);
assert.equal(flagWrites('destination selection done', 1), 1, 'a selection leaves the flag up');
for (const flagName of ['destination_busy', 'destination_map_waiting', 'destination_db_waiting']) { assert.ok(text('destination selection done').includes(`"${flagName}"},"value":0`), `done clears ${flagName}`); assert.ok(text('objective1').includes(`"${flagName}"},"value":0`), `a new mission clears ${flagName}`); }
assert.ok(text('destination select map list').includes('"destination_map_waiting"},"eq":1') && text('destination select custom db').includes('"destination_db_waiting"},"eq":1'), 'a second press never starts a second selection');
assert.ok(text('destination cancel selection').includes('"modalwait"},"value":"cancel"') && text('destination cancel selection').includes('destroy_user_action') && text('destination select custom db').includes('"eq":"cancel"'), 'the cancel ends both selections');
for (const name of ['destination_selection_and_confirmationmsg', 'destination select map list', 'destination select custom db']) assert.ok(!text(name).includes('"call_macro":"user destination menu"') && !text(name).includes('"call_macro":"destination page"'), `${name}: the page is opened by destination selection done only`);
assert.ok(text('destination selection done').includes('"call_macro":"destination page"'), 'user rule 2026-11-18: after every selection, rejection or discard the destination page opens again');
assert.ok(!text('destination selection done').includes('user destination menu'), 'no second dispatch pause or menu rebuild');
assert.ok(text('destination_selection_and_confirmationmsg').includes('"call_macro":"destination selection done"') && text('destination select custom db').includes('"call_macro":"destination selection done"'), 'both selections end in destination selection done');
const dispatchRows = macros['Mission dispatch'].find((c) => c.set_dispatch).set_dispatch;
const button = dispatchRows.find((r) => r.buttonbar && r.buttonbar[0].title === 'DESTINATION CONFIRMATION MENU');
assert.ok(button, 'the dispatch page has DESTINATION CONFIRMATION MENU');
assert.equal(button.buttonbar[0].color, 'green');
assert.deepEqual(button.show_condition, { require: { local: 'destination_pending' }, eq: 1 }, 'visible only while the destination is pending');
assert.deepEqual(button.buttonbar[0].commands, [{ set: { local: 'prev_page' }, value: 'Mission dispatch' }, { call_macro: 'destination page' }], 'it opens the page and Back returns to the dispatch page');
assert.ok(!JSON.stringify(briefing).includes('DESTINATION CONFIRMATION MENU') && !JSON.stringify(briefing).includes('CONFIRM HOSPITAL MENU'), 'not in the briefing');
assert.ok(text('objective1').includes('"destination_pending"},"value":0'), 'a new mission starts with no pending destination');

// 7. The callers: kind and no modal base text; every kind reaches the page.
for (const [owner, kind] of [['user destination menu', 'patient'], ['user destination menu', 'patient_cambu'], ['user destination menu', 'ambudoc'], ['user destination menu', 'organ'], ['crew emergency destination menu', 'crew']]) {
  assert.ok(text(owner).includes(`{"set":{"local":"destination_page_kind"},"value":"${kind}"},{"call_macro":"destination page"}`), `${owner}: kind ${kind} must call the destination page`);
}
// the confirm macro: one branch per kind, each with the validation of the former button
const confirm = text('destination confirm');
for (const kind of ['patient', 'patient_cambu', 'ambudoc', 'organ', 'crew']) assert.ok(confirm.includes(`"local":"destination_page_kind"},"eq":"${kind}"`), `destination confirm: ${kind}`);
assert.ok(confirm.includes('manual_hospital_destination_setup') && confirm.includes('User predestination') && confirm.includes('pick doctor') && confirm.includes('"CREW_DEST_CONFIRMED"'), 'every kind keeps its former action');
assert.equal((confirm.match(/No destination selected, first select a destination, and then confirm/g) || []).length, 5, 'every kind answers a confirm without a hospital');
// the custom DB page returns to the destination page while it is pending; Back never calls an empty macro name
const hosp = JSON.stringify(macros['additional hospitals page']);
assert.ok(hosp.includes('"destination_db_waiting"},"eq":1,"then":[{"set":{"local":"modalwait"},"value":"cancel"}]'), 'custom DB Back while selecting discards the selection (the wait ends with cancel and the page opens again)');
assert.equal((hosp.match(/"call_macro":"Mission dispatch"/g) || []).length, (hosp.split("{\"if\":{\"local\":\"destination_db_waiting\"},\"ne\":1,\"then\":[{\"call_macro\":\"Mission dispatch\"}]}").length - 1) + 1, 'every Mission dispatch call of the custom DB page is guarded by destination_db_waiting ne 1, plus the Back link outside a selection (SET AS DESTINATION never leaves for the dispatch page while a selection waits)');
assert.ok(text('shared repeated block 025').includes('"prev_page2"},"ne":null'), 'block 025 never calls a macro with an empty name');
// the status bar on the pages that had none
for (const name of ['homepage', 'multiplayer page', 'additional hospitals page', 'end menu', 'DF stations page', 'hoist panel', 'destination page']) {
  const r = (function f(n) { let x = null; (function w(y) { if (x) return; if (Array.isArray(y)) y.forEach(w); else if (y && typeof y === 'object') { if (y.set_dispatch) { x = y.set_dispatch; return; } Object.values(y).forEach(w); } })(n); return x; })(macros[name]);
  assert.equal(r.filter((q) => q.image && /^sbar\d\d$/.test(q.image)).length, 20, `${name}: status bar`);
}
console.log(`destination page: ${states} states rendered, ${destinationMacros.length} macros without modal`);

// 8. Voice commands of the destination confirmation menu (user 2026-11-16): same macros as the buttons, none opens a map or a list.
const voice = JSON.stringify(macros['speech bridge'] || Object.entries(macros).filter(([n]) => /speech/i.test(n)));
for (const call of ['destination confirm', 'destination unload here', 'destination cambu ask', 'destination unload far ambulance', 'destination cancel selection', 'destination page']) assert.ok(voice.includes(`"call_macro":"${call}"`), `voice reaches ${call}`);
assert.ok(!voice.includes('destination select map list') && !voice.includes('destination select custom db'), 'no voice command opens a map, a list or the custom database');
console.log('destination voice commands: 8 actions, none selects from map or list');
// 10. Clinical block (user 2026-11-18): the transported patient only, diagnosis always, NO INFO without data, no status or rescue-team lines.
{
  const pageText = JSON.stringify(page);
  assert.ok(pageText.includes('{"set":{"local":"medical_display_patient"},"value":{"local":"HEMS_PATIENT_NUMBER"}},{"call_macro":"sync medical patient display"}'), 'the page shows the HEMS patient (the one transported), never a cycling slot');
  assert.ok(pageText.includes('"destination_flag_noinfo"'), 'no patient data: NO INFO');
  assert.ok(rows.some((r) => (r.text || '').includes('- NO INFO -')), 'the NO INFO row exists');
  for (const gone of ['Status upon medical arrival', 'Status reported by the rescue team', 'Info from rescue team', 'Preliminary diagnosys']) assert.ok(!pageText.includes(gone), 'removed line: ' + gone);
  const diag = rows.find((r) => (r.text || '').startsWith('Diagnosis: '));
  assert.ok(diag && JSON.stringify(diag.show_condition) === JSON.stringify({ require: { local: 'destination_flag_clinical' }, eq: 1 }), 'the diagnosis row follows the clinical flag only (also with the patient on board and not visited)');
  assert.ok(pageText.includes('"destination_diag_text"'), 'diagnosis falls back to the pathology, then NO INFO');
}
// 9. The ambulance question is asked aloud (pack message PAX3.45 in EN, DE and FR) and answered by voice yes / no.
assert.ok(text('destination cambu ask').includes('PAX3{local:VCP}45'), 'the copilot asks the question aloud');
for (const lang of ['EN', 'DE', 'FR']) assert.ok(fs.readFileSync(path.join(root, 'voicepacks', lang + '.xml'), 'utf8').includes('key="PAX3.45"'), `pack ${lang} has the question`);
assert.ok(voice.includes('"destination_cambu_ask"},"value":0') && voice.includes('"call_macro":"destination cambu go"'), 'voice yes and no');
