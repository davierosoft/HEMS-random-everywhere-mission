const fs = require('fs');
const path = require('path');

const missionPath = process.argv[2] || path.join(__dirname, '..', 'everywhere_all.json');
const mission = JSON.parse(fs.readFileSync(missionPath, 'utf8'));
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const compact = (value) => JSON.stringify(value);
const walk = (value, visit) => {
  if (!value || typeof value !== 'object') return;
  visit(value);
  if (Array.isArray(value)) value.forEach((item) => walk(item, visit));
  else Object.values(value).forEach((item) => walk(item, visit));
};
const countText = (text, literal) => (text.match(new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

const tableName = 'DF_Stations_Table';
const tableId = 'Andrews_df_stations';
const slots = Array.from({ length: 15 }, (_, index) => index + 1);
const objectStations = [
  ['ambulance1', 'Ambulance 1', 251425], ['ambulance2', 'Ambulance 2', 372850],
  ['police1', 'Police 1', 229675], ['fire_engine_1', 'Fire Engine 1', 318125],
  ['fire_engine_2', 'Fire Engine 2', 266950], ['fire_engine_crew_1', 'Fire Engine crew 1', 347525],
  ['main_injured', 'Main injured', 239075], ['injured_2', 'Injured 2', 388250],
  ['injured_3', 'Injured 3', 276800], ['crashed_car', 'Crashed car', 334425],
  ['crew_member', 'Crew member', 243675], ['hoist_crew', 'Hoist crew member', 359925],
  ['doctor', 'Doctor', 291550], ['doctor_2', 'Doctor 2', 396775]
];
const objectFrequencies = objectStations.map(([, , frequency]) => frequency);

expect(mission.data?.[tableName] === tableId, 'DF Stations: missing persistent DF_Stations_Table data binding');
const macros = mission.macros || {};
for (const name of ['DF stations page', 'DF stations validate', 'DF stations save', 'DF stations delete', 'DF stations tune custom', 'DF stations tune object', 'DF stations debug state', 'CARLS DF set active channel', 'CARLS DF clear bearing']) {
  expect(Array.isArray(macros[name]), `DF Stations: missing macro ${name}`);
}

const page = macros['DF stations page'] || [];
const pageJson = compact(page);
expect(pageJson.includes('ADD DF STATIONS TO DB'), 'DF Stations: page title is missing');
expect(!pageJson.includes('"title":"SET"'), 'DF Stations: obsolete SET action must not be rendered');
expect(countText(pageJson, '"text":"NAME"') >= 15, 'DF Stations: each custom slot must label NAME');
expect(countText(pageJson, '"text":"FREQUENCY MHz"') >= 15, 'DF Stations: each custom slot must label FREQUENCY MHz');
expect(countText(pageJson, '"text":"LAT/LON"') >= 15, 'DF Stations: each custom slot must label LAT/LON');
for (const slot of slots) {
  for (const field of ['name', 'frequency', 'location']) expect(pageJson.includes(`"textbox":"df_station_${slot}_${field}"`), `DF Stations: slot ${slot} is missing its ${field} textbox`);
  expect(pageJson.includes(`"slot":${slot}`), `DF Stations: slot ${slot} is not wired to SAVE`);
  const previous = slot - 1;
  if (slot > 1) expect(pageJson.includes(`station_${previous}_name`) && pageJson.includes(`station_${slot}_name`), `DF Stations: slot ${slot} must be progressive after slot ${previous}`);
}
expect(countText(pageJson, '"title":"SAVE"') >= 15, 'DF Stations: expected one SAVE action for every custom slot');
expect(countText(pageJson, '"title":"SET DF"') >= 15, 'DF Stations: expected one SET DF action for every custom slot');
expect(pageJson.includes('"df_station_1_name"') && pageJson.includes('"df_station_1_frequency"') && pageJson.includes('"df_station_1_location"'), 'DF Stations: SAVE must require all three text fields');
const saveJson = compact(macros['DF stations save'] || []);
expect(saveJson.includes('DF stations validate') && saveJson.includes('"param":"name"') && saveJson.includes('"param":"frequency"') && saveJson.includes('"param":"location"'), 'DF Stations: SAVE must validate its own input before persistence');

const nonAscii = [];
for (const [name, body] of Object.entries(macros)) {
  if (!name.startsWith('DF stations') && !name.startsWith('CARLS DF')) continue;
  walk(body, (node) => {
    for (const value of Object.values(node)) if (typeof value === 'string' && /[^\x20-\x7E]/.test(value)) nonAscii.push(`${name}: ${JSON.stringify(value)}`);
  });
}
expect(nonAscii.length === 0, `DF Stations: non-ASCII mission text is forbidden (${nonAscii.join('; ')})`);

const validationJson = compact(macros['DF stations validate'] || []);
for (const [minimum, maximum] of [[108000, 117975], [118000, 136975], [156000, 162000], [225000, 399975]]) {
  expect(validationJson.includes(`"gte":${minimum}`) && validationJson.includes(`"lte":${maximum}`), `DF Stations: missing DF band ${minimum}-${maximum}`);
}
expect(validationJson.includes('"floor"') && validationJson.includes('"divide"') && validationJson.includes('"multiply"') && validationJson.includes('"eq":0'), 'DF Stations: frequency validation must enforce the 25 kHz grid');
for (const reserved of [121500, 281500, 282575, ...objectFrequencies]) expect(validationJson.includes(String(reserved)), `DF Stations: missing reserved channel ${reserved}`);
expect(validationJson.includes('FREQUENCY ALREADY ASSIGNED TO A CUSTOM STATION'), 'DF Stations: duplicate custom frequencies must be rejected');
expect(validationJson.includes('DF_STATIONS_DRAFT_LAT') && validationJson.includes('DF_STATIONS_DRAFT_LON'), 'DF Stations: custom station coordinates are not validated');

const acceptedStationChannel = (frequency) => frequency % 25 === 0 && (
  (frequency >= 108000 && frequency <= 117975) ||
  (frequency >= 118000 && frequency <= 136975) ||
  (frequency >= 156000 && frequency <= 162000) ||
  (frequency >= 225000 && frequency <= 399975)
);
for (const frequency of [108000, 117975, 118000, 136975, 156000, 162000, 225000, 399975]) expect(acceptedStationChannel(frequency), `DF Stations: valid boundary ${frequency} was not accepted by the test model`);
for (const frequency of [107975, 117990, 137000, 155975, 162025, 224975, 400000, 225010]) expect(!acceptedStationChannel(frequency), `DF Stations: invalid band/grid value ${frequency} was accepted by the test model`);

expect(new Set(objectFrequencies).size === objectStations.length, 'DF Stations: object station frequencies are not unique');
expect(!objectFrequencies.every((frequency, index) => frequency === 225000 + index * 25), 'DF Stations: object frequencies must not be sequential');
for (const frequency of objectFrequencies) expect(frequency >= 225000 && frequency < 400000 && frequency % 25 === 0, `DF Stations: object frequency ${frequency} must be UHF and on the 25 kHz grid`);
for (const [id, label, frequency] of objectStations) {
  expect(pageJson.includes(label), `DF Stations: primary object label ${label} is missing from the menu`);
  expect(pageJson.includes(`object_${id}_enabled`), `DF Stations: primary object ${label} is missing its ON/OFF state`);
  expect(pageJson.includes((frequency / 1000).toFixed(3)), `DF Stations: primary object ${label} is missing its displayed frequency`);
}

const objectButtonbars = [];
walk(page, (node) => {
  if (Array.isArray(node.buttonbar) && typeof node.buttonbar[0]?.text === 'string') objectButtonbars.push(node.buttonbar);
});
for (const [id, label, frequency] of objectStations) {
  const display = label + ': ' + (frequency / 1000).toFixed(3) + ' MHz FM';
  const buttons = objectButtonbars.find((buttonbar) => buttonbar[0]?.text === display);
  expect(Array.isArray(buttons), 'DF Stations: object row must display ' + display);
  for (const state of ['ON', 'OFF']) {
    const button = (buttons || []).find((item) => item.title === state);
    const commands = button?.commands || [];
    const key = 'object_' + id + '_enabled';
    const writesSelection = commands.some((command) => command.set?.table?.static === tableName && command.set.key === key && command.value === state);
    const savesSelection = commands.some((command) => command.save_table?.static === tableName);
    expect(writesSelection && savesSelection, 'DF Stations: ' + label + ' ' + state + ' selection must persist in the DF table');
  }
}

const assign = macros['CARLS DF assign mission bearing'] || [];
const assignJson = compact(assign);
expect(assign[0]?.open_table?.static === tableName, 'DF Stations: CARLS bearing assignment must open the DF Stations table');
expect(assignJson.includes('CARLS DF clear bearing') && assignJson.includes('"global":"CARLS_DF_FREQUENCY"') && assignJson.includes('"param":"frequency"'), 'DF Stations: bearing assignment must first synchronize CARLS and clear an obsolete reference');
for (const slot of slots) expect(assignJson.includes(`station_${slot}_frequency`) && assignJson.includes(`station_${slot}_lat`) && assignJson.includes(`station_${slot}_lon`), `DF Stations: saved custom slot ${slot} is not connected to set_df`);
for (const [, label, frequency] of objectStations) expect(assignJson.includes(label) && assignJson.includes(String(frequency)), `DF Stations: object bearing ${label} is not connected to set_df`);
const clearJson = compact(macros['CARLS DF clear bearing'] || []);
expect(clearJson.includes('"set_df"') && clearJson.includes('"global":"CARLS_DF_FREQUENCY"'), 'DF Stations: clearing a DF reference must use the selected CARLS frequency');
const activeJson = compact(macros['CARLS DF set active channel'] || []);
for (const field of ['CARLS_DF_FREQUENCY', 'CARLS_DF_SOURCE', 'CARLS_DF_MODULATION', 'CARLS DF render']) expect(activeJson.includes(field), `DF Stations: automatic set_df sync must update ${field}`);

const startupJson = compact(macros['CARLS DF startup sync'] || []);
expect(startupJson.includes('CARLS_DF_INITIALIZED') && startupJson.includes('CARLS_DF_FREQUENCY') && startupJson.includes('118000') && startupJson.includes('CARLS DF clear bearing'), 'DF Stations: startup must restore the saved CARLS channel through set_df');
const objective1Json = compact(macros.objective1 || []);
expect(objective1Json.includes('CARLS DF startup sync'), 'DF Stations: objective1 must synchronize set_df before the DF page is opened');

const setDfOwners = new Map();
for (const [name, body] of Object.entries(macros)) {
  let count = 0;
  walk(body, (node) => { if (node.set_df) count += 1; });
  if (count) setDfOwners.set(name, count);
}
const allowedSetDfOwners = new Set(['CARLS DF clear bearing', 'CARLS DF assign mission bearing', 'DF emergency beacon update', 'DF emergency beacon clear']);
for (const [name] of setDfOwners) expect(allowedSetDfOwners.has(name), 'DF Stations: direct set_df remains outside the centralized CARLS or emergency-beacon macros: ' + name);

const emergencyUpdate = macros['DF emergency beacon update'] || [];
const emergencyClear = macros['DF emergency beacon clear'] || [];
const plbPersonal = macros['ELT plb_person'] || [];
const emergencyUpdateJson = compact(emergencyUpdate);
const emergencyClearJson = compact(emergencyClear);
expect(Array.isArray(emergencyUpdate) && Array.isArray(emergencyClear) && Array.isArray(plbPersonal), 'DF Stations: centralized emergency beacon macros are missing');
expect(emergencyUpdateJson.includes('"DF_EMERGENCY_RX_RANGE_M"') && emergencyUpdateJson.includes('"rand":[75,125]'), 'DF Stations: emergency reception range must randomize within plus or minus 25 percent');
expect(emergencyUpdateJson.includes('"has_object":"{param:object}"') && emergencyUpdateJson.includes('"var":"distance:m"'), 'DF Stations: emergency beacon update must require a present emitter and range check');
expect(emergencyUpdateJson.includes('"set_df":{"location"') && emergencyUpdateJson.includes('"CARLS DF set active channel"'), 'DF Stations: in-range emergency beacon update must synchronize CARLS before set_df');
expect(emergencyClearJson.includes('"set_df":{"freq"') && !emergencyClearJson.includes('"location"'), 'DF Stations: out-of-range emergency beacon clearing must use frequency-only set_df');
expect(assignJson.includes('CARLS_DF_SAR_PLB_PERSON_ACTIVE') && assignJson.includes('DF_EMERGENCY_RX_RANGE_M'), 'DF Stations: manual mission bearing must honor the PLB state and randomized range');
for (const [name, activeVar, range] of [
  ['pick doctor', 'L:HOLD', 25000],
  ['ELT normal', 'L:HOISTED', 25000],
  ['ELT crash', 'L:HOISTED', 40000],
  ['ELT plb_person', 'L:HOISTED', 12000]
]) {
  const text = compact(macros[name] || []);
  expect(text.includes('DF emergency beacon update') && text.includes('DF emergency beacon clear'), 'DF Stations: ' + name + ' must use the centralized emergency beacon lifecycle');
  expect(text.includes('"sleep":[5,10]'), 'DF Stations: ' + name + ' must refresh the emergency range every 5 to 10 seconds');
  expect(text.includes(activeVar) && text.includes('"range_m":' + range), 'DF Stations: ' + name + ' must preserve its active state and coherent base range');
}

const openJson = compact(macros['CARLS DF open'] || []);
const renderJson = compact(macros['CARLS DF render'] || []);
expect(openJson.includes('"DB"'), 'DF Stations: DF open must preserve DB as a source');
expect(renderJson.includes('"CARLS_DF_RENDER_SOURCE"') && renderJson.includes('"value":"DB"'), 'DF Stations: DF renderer must show the DB source');
expect(compact(macros['HEMS mission_type'] || []).includes('ADD DF STATIONS TO DB'), 'DF Stations: mission setup link is missing');
expect(compact(macros['debug page'] || []).includes('DF STATIONS:'), 'DF Stations: Debug Center does not expose the DB state');
expect(compact(macros['debug page'] || []).includes('DF stations debug state'), 'DF Stations: Debug Center does not refresh the DB state');

if (errors.length) {
  console.error(`DF Stations gate FAILED (${errors.length})`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`DF Stations gate PASS (${slots.length} custom slots, ${objectStations.length} randomized object stations, ASCII UI, all DF bands, 25 kHz grid, and CARLS/set_df synchronization)`);
