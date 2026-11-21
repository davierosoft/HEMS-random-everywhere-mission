// One-shot (2026-11-21): free action "FIT HEADSET" on the HEMS medical patient page (never a mandatory step, Andrew choice 2).
// Sets Pn_HEADSET = 1; the flight constraint NOISE then ignores that patient. Idempotent. Macro 'fit patient headset' lives in 25 (generator).
const fs = require('fs');
const rd = (f) => fs.readFileSync(f, 'utf8');
const M7 = 'mission-src/macros/07-patient-medical.json', M4 = 'mission-src/macros/04-dispatch-tablet-ui.json';
let s7 = rd(M7);
if (!s7.includes('"fit patient headset"')) {
  const anchor = '        {"text":"MEDICAL ACTIONS","color":"yellow"';
  if (!s7.includes(anchor)) throw new Error('anchor 07 page');
  const vis = '{"and":[{"require":{"local":"medical_display_manual_active"},"eq":"yes"},{"require":{"local":"medical_display_visited"},"eq":"yes"},{"require":{"local":"medical_display_patientlife"},"ne":"died"},{"require":{"local":"medical_display_report_finalized"},"ne":"yes"}';
  const add = '        {"buttonbar":[{"title":"FIT HEADSET","commands":[{"call_macro":"fit patient headset","params":{"patient":{"local":"medical_display_patient"}}}],"show_condition":' + vis + ',{"require":{"local":"medical_display_headset"},"ne":1}],"eq":1}}]},\n' +
    '        {"text":"HEADSET FITTED: the noise no longer hurts the patient.","color":"green","show_condition":' + vis + ',{"require":{"local":"medical_display_headset"},"eq":1}],"eq":1}},\n';
  s7 = s7.replace(anchor, () => add + anchor);
  const init = '  "initialize patient extra clinical state": [\n';
  if (!s7.includes(init)) throw new Error('anchor 07 init');
  s7 = s7.replace(init, () => init + '    {"if": {"param":"patient"}, "eq": 1, "then": [{"set":{"local":"P1_HEADSET"},"value":0}]},\n    {"if": {"param":"patient"}, "eq": 2, "then": [{"set":{"local":"P2_HEADSET"},"value":0}]},\n    {"if": {"param":"patient"}, "eq": 3, "then": [{"set":{"local":"P3_HEADSET"},"value":0}]},\n');
  fs.writeFileSync(M7, s7);
}
let s4 = rd(M4);
if (!s4.includes('medical_display_headset')) {
  const pairs = [['ambulance_patient_report_finalized', 'P1_HEADSET'], ['P2_AMBULANCE_REPORT_FINALIZED', 'P2_HEADSET'], ['P3_AMBULANCE_REPORT_FINALIZED', 'P3_HEADSET']];
  for (const [src, hs] of pairs) {
    const a = '        {"set":{"local":"medical_display_report_finalized"},"value":{"local":"' + src + '"}},\n';
    if (!s4.includes(a)) throw new Error('anchor 04 ' + src);
    s4 = s4.replace(a, () => a + '        {"set":{"local":"medical_display_headset"},"value":{"local":"' + hs + '"}},\n');
  }
  fs.writeFileSync(M4, s4);
}
console.log('headset wired');
