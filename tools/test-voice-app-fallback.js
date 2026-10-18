#!/usr/bin/env node
'use strict';

// User request of 2026-10-18 after a tester report (Companion not connected: L:TTS 0 with L:AUDIOINHIBIT 1 left every voice and sound silent):
// with the app selected (L:AUDIOINHIBIT not 0 and not 100) but no voice server the mission returns to the last selection of the user, the wav pack
// (VCP = VOICEPACK, L:AUDIOINHIBIT 0), so that the sound LVARs play the wavs; one popup per simulator session tells it; with a wav pack nothing is
// shown. Also the debug row "Time to second dispatch" (it printed a negative tofixed string through the TIME format). Static checks of the production
// sources: no HPG/MSFS behaviour is modeled, runtime PENDING.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const macros = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'macros')).filter((name) => name.endsWith('.json'))) Object.assign(macros, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'macros', file), 'utf8')));
const threads = {};
for (const file of fs.readdirSync(path.join(root, 'mission-src', 'threads')).filter((name) => name.endsWith('.json'))) Object.assign(threads, JSON.parse(fs.readFileSync(path.join(root, 'mission-src', 'threads', file), 'utf8')));
const text = (value) => JSON.stringify(value);
const count = (haystack, needle) => haystack.split(needle).length - 1;
const allMacroText = text(macros);

// 1. the connection: the attempt is timed and a refused or dropped connection is the fallback, not only TTS 0
const connect = text(macros['voice app connect']);
assert.ok(connect.includes('"local":"VOICE_APP_T0"') && connect.includes('"on_disconnected":[{"call_macro":"voice app lost"}]'), 'voice app connect must time the attempt and send a refused or dropped connection to voice app lost');
assert.ok(connect.includes('"on_connected":[{"set":{"local":"TTS"},"value":1},{"set":{"local":"voice_app_lost"},"value":"no"}'), 'a connection clears the lost flag');

// 2. the fallback: only for the app selection, the last wav selection, L:AUDIOINHIBIT back to 0 (what the original thread does when the external program is off), one popup
const lost = text(macros['voice app lost']);
assert.ok(lost.includes('"local":"TTS"},"value":0') && lost.includes('"local":"voice_app_lost"},"value":"yes"'), 'voice app lost marks the app as lost');
assert.ok(lost.includes('{"require":{"var":["L:AUDIOINHIBIT","number"]},"ne":0}') && lost.includes('{"require":{"var":["L:AUDIOINHIBIT","number"]},"ne":100}'), 'the fallback applies only to the app selection (L:AUDIOINHIBIT not 0 and not 100)');
assert.ok(lost.includes('"set":{"var":["L:AUDIOINHIBIT","number"]},"value":0') && lost.includes('"set":{"local":"VCP"},"value":{"global":"VOICEPACK"}'), 'the fallback is the last wav selection: VCP = VOICEPACK and L:AUDIOINHIBIT 0');
assert.ok(lost.indexOf('"call_macro":"voice app popup"') > lost.indexOf('"set":{"local":"VCP"}'), 'the popup comes after the fallback, inside the app selection check');
assert.ok(count(allMacroText, '"call_macro":"voice app popup"') === 1, 'the popup has one call site (voice app lost): never with a wav pack');
const popup = text(macros['voice app popup']);
assert.ok(popup.includes('"L:HMC_APP_POPUP_SHOWN","number"]},"eq":0') && popup.includes('"L:HMC_APP_POPUP_SHOWN","number"]},"value":1') && popup.includes('"set_modal"') && popup.includes('Mission Companion not connected'), 'one popup per simulator session, kept in an LVAR');

// 3. the check: a message requested (voice say) or the thread every second counts the silence after 25 s as lost
const check = text(macros['voice app check']);
assert.ok(check.includes('"local":"VCP"},"eq":"APP"') && check.includes('"local":"TTS"},"ne":1') && check.includes('"local":"VOICE_APP_T0"') && check.includes('"add":[{"local":"VOICE_APP_T0"},25]') && check.includes('"call_macro":"voice app lost"'), 'voice app check: 25 s without a voice server while the voice code is APP');
const say = macros['voice say'];
assert.ok(text(say).includes('"else":[{"call_macro":"voice app check"}]'), 'a message requested without the app runs the check (first message requested)');
const thread = text(threads['EXTERNAL XML AUDIO ENABLE']);
assert.ok(thread.includes('"call_macro":"voice app check"') && thread.includes('"local":"TTS"},"ne":1') && thread.includes('"call_macro":"voice app connect"') && thread.includes('"local":"VCP"},"value":{"global":"VOICEPACK"}'), 'the thread keeps the original rules (VOICEPACK when L:AUDIOINHIBIT is 0, APP and connection otherwise) and runs the check');

// 4. the checklist assistant connection keeps its own handlers (a wav pack with the old audio service): no popup, no fallback
const checklistsConnect = fs.readFileSync(path.join(root, 'mission-src', 'macros', '22-checklists.json'), 'utf8');
assert.ok(!checklistsConnect.includes('voice app lost'), 'the checklist assistant connection must not trigger the app fallback or its popup');

// 5. the debug row of the time to second dispatch: a number for the TIME format, shown only while a second dispatch is scheduled
const debug = text(macros['debug page']);
assert.ok(!debug.includes('"tofixed":{"subtract":[{"local":"ENDWAIT_SECOND_DISPATCH"}'), 'the time to second dispatch is not a tofixed string any more (the TIME format printed 00:0-210.0)');
assert.ok(debug.includes('"floor":{"subtract":[{"local":"ENDWAIT_SECOND_DISPATCH"},{"var":["L:MISSION_TIME","number"]}]}') && debug.includes('"local":"ENDWAIT_SECOND_DISPATCH"},"gt":{"var":["L:MISSION_TIME","number"]}'), 'the countdown is a floored number shown only while ENDWAIT_SECOND_DISPATCH is in the future');
assert.ok(debug.includes('Time to second dispatch: not scheduled') && debug.includes('Time to second dispatch: reached'), 'without a scheduled second dispatch the row says so');
console.log('Voice app fallback PASS: wav pack fallback with the app selected and no Companion, one popup per session (never with a wav pack), debug countdown. HPG/MSFS PENDING.');
