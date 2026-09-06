#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { assertCicersBranch } = require('./assert-cicers-branch');
const { assertBuildIntent, markBuildConsumed } = require('./release-contract');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const ARTIFACT_PATH = path.join(REPOSITORY_ROOT, 'everywhere_all.json');
const SOURCE_ROOT = path.join(REPOSITORY_ROOT, 'mission-src');
const MANIFEST_PATH = path.join(SOURCE_ROOT, 'manifest.json');

const MACRO_MODULES = [
  {
    file: 'macros/01-bootstrap-settings.json',
    description: 'Version checks, custom settings, CICERS integration, service selection, and startup fallbacks.',
    matches: (name) => /version check|custom settings|CICERS|DATAQUERY|addon check|^TEST$|ensure pathology|voice pack fallback|nation autoselect|normalize orange target|ensure data query|restore data query/i.test(name),
  },
  {
    file: 'macros/02-save-load-presets.json',
    description: 'Save slots, reload, reset, persistent mission presets, and aircraft profile persistence.',
    matches: (name) => /^(savetemp|save[123]|delete[123]|preload[123]|reloadtemp|savegame page|locationtemp)|preset|resetdefault|resetstats|custom aircraft profile|aircraft profile link|link aircraft profile|unlink aircraft profile/i.test(name),
  },
  {
    file: 'macros/03-aircraft-crew-checklists.json',
    description: 'Aircraft setup, boarding, engines, fuel, weights, audio, crew configuration, and checklists.',
    matches: (name) => /boarding|COMM CHECK|preflight|^engine[12]$|quickstart|refuel|fuel truck|^kit |^weights$|aircraft factory|aircraft profile|crew vol|chk vol|volume update|checkliste|checklist|ckl$|^Ground time$/i.test(name),
  },
  {
    file: 'macros/16-release-test-tracker.json',
    description: 'Release Test Tracker page, persistent execution states, and tester result workflow.',
    matches: (name) => /^test tracker/.test(name),
  },
  {
    file: 'macros/15-debug-and-df-ui.json',
    description: 'Debug Center plus CARLS Direction Finder controls, renderer, and persistent DF-station database UI.',
    matches: (name) => /^debug page$|^CARLS|^DF stations/.test(name),
  },
  {
    file: 'macros/04-dispatch-tablet-ui.json',
    description: 'Tablet pages, settings, mission lists, debug UI, CARLS controls, and keypad events.',
    matches: (name) => /page|homepage|^settings$|^description2?$|Mission dispatch|mission_list|missioncount|mission enable engine|mission manual new|variant_selection|Mission description|HEMS mission_type|end menu|dispatch control|CARLS|^button\d$|events creator|select medical patient page|sync medical patient display|refresh aircraft profile page state/i.test(name),
  },
  {
    file: 'macros/05-navigation-queries.json',
    description: 'Location queries, waypoint resolution, routes, maps, landing spots, and destination selection.',
    matches: (name) => /^(Query|QUERY|query)|location|routeupdate|legcolor|map and route|landing spot selection|zoom out|teleport|destination_selection|predestination|destination scene|destination hoist|destination1$|hospital WP|hangar WP|pick doctor|closest ambulance|Ambulance destination/i.test(name),
  },
  {
    file: 'macros/06-scene-generation.json',
    description: 'Random scene assets, incidents, people, vehicles, VFX, SAR scenes, and accident profiles.',
    matches: (name) => /random VFX|VFXA|random people|random waving|random fool|random halloween|random traffic|random residential road|random crashed|multiple injured|SAR sighting|SAR mapldgspot|CRASH_SITE|random scene|truck vs car|BUS|TRACTOR|QUARRY|HELICOPTER|AIRPLANE|CONSTRUCTION|Bycicle|pedestrian|forklift|^train$|^QUAD$|flare|fence road|CAMP|CLIMBER|POWER TRANSFORMER|residential|quarrel|CEMETERY|hunting|fishing|^empty$|tomb_generator/i.test(name),
  },
  {
    file: 'macros/07-patient-medical.json',
    description: 'Patient generation, physiology, clinical workflows, LifeScore, CPR, identity, and multi-patient state.',
    matches: (name) => /pathology|consciousness|injured|dead|life decrease|Life rescued|patient health|^CPR$|Patient\d* status|patient[123]? physiology|medical action|manual patient|manual current patient|manual_hospital|patient clinical|patient1 postvisit|patient1 transport|patient_wait|assign patient|identity|multipatient|manual treatment|medical patient|More casualties|ambulance assess patient/i.test(name),
  },
  {
    file: 'macros/08-ground-response.json',
    description: 'Ambulance, police, fire, road travel, parking, clinical handover, and secondary rescue.',
    matches: (name) => /ambulance|Ambulance|ambu_|ambustretcher|police|Police|firetruck|Firetruck|^Extra vehicle$|rescue vehicles|park_|park |drive |closest ambulance police|preambustretcher|deploy_/i.test(name),
  },
  {
    file: 'macros/09-hoist-ground-ops.json',
    description: 'Hoist state, skid/ground operations, heli-rescuer choreography, and crew return to aircraft.',
    matches: (name) => /hoist|HOIST|ground ops|crew ground ops|SKID LDG|helirescuer|heli rescuer|pax3_visits|drive_pax3|45 crew assistant|defibrillator|from_any_injured|failure engine/i.test(name),
  },
  {
    file: 'macros/10-transfer-special-missions.json',
    description: 'Patient and organ transfers, ELT, special mission launch, midway loading, and destination arrival.',
    matches: (name) => /Special mission|injured only|patient transfer|organ transfer|ELT |crash site approach|midway|transfer patient|organ pick up|Organ destination|user destination|shared user destination|on-site operations/i.test(name),
  },
  {
    file: 'macros/11-mission-lifecycle.json',
    description: 'Dispatch lifecycle, objectives, report submission, cancellation, return-to-base, and RescueTrack updates.',
    matches: (name) => /randomize|missionupdate|mission local|mission LVAR|next_dispatch|CUSTOM_MISSION|objective\d|delayed threads|submit report|ready dispatch|dispatch ringtone|UpdateRescue|Update_dispatch|Update_raw|accept_dispatch|first_dispatch|dispatch cancellation|cancel HEMS|Return to base|return to base|deboarding|paperwork|mission dispatched by custom menu/i.test(name),
  },
  {
    file: 'macros/12-marshalling.json',
    description: 'Base, hospital, and technical marshaller creation, snapshots, guidance, and animations.',
    matches: (name) => /marshall/i.test(name),
  },
  {
    file: 'macros/13-crew-emergency.json',
    description: 'Crew LifeScore, environmental impact, fatal replacement, emergency recovery, and care routing.',
    matches: (name) => /crew lifescore|crew safety|crew emergency|deceased crew|post crew|object crew|hoist crew lifescore/i.test(name),
  },
  {
    file: 'macros/14-shared-runtime.json',
    description: 'Shared repeated blocks and small runtime helpers not owned by a narrower subsystem.',
    matches: () => true,
  },
];

const DATA_MODULES = [
  {
    file: 'data/01-persistence-tables.json',
    description: 'Debug, mission preset, aircraft profile, and DF-station persistent table mappings.',
    matches: (name) => /^(Debug_Table|Config_Table|Aircraft_Profile)/.test(name),
  },
  {
    file: 'data/02-waypoints-and-categories.json',
    description: 'Hospital, hangar, accident, and browse-category datasets.',
    matches: (name) => /wps$|^accidents$|^browse_category$/.test(name),
  },
  {
    file: 'data/03-people-and-names.json',
    description: 'Patient, civilian, worker, responder, and name pools.',
    matches: (name) => /injured|dead|waving|civils|dancers|zombies|tombstones|stdcivils|workers|FiremanEU|surnames|malenames|femalenames|ambunames|polinames|firenames/.test(name),
  },
  {
    file: 'data/04-vehicles-and-scene-assets.json',
    description: 'Response vehicles, barriers, lights, transport, wrecks, and other scene object pools.',
    matches: (name) => !/^health/.test(name) && !/^statusMessages/.test(name) && name !== 'CARLSmessages',
  },
  {
    file: 'data/05-health-profiles.json',
    description: 'Numbered primary medical and pathology profiles.',
    matches: (name) => /^health\d+$/.test(name),
  },
  {
    file: 'data/06-special-health-and-messages.json',
    description: 'Secondary/Halloween health profiles plus status and CARLS message catalogs.',
    matches: () => true,
  },
];

function fail(message) {
  console.error(`mission-workspace: ${message}`);
  process.exitCode = 1;
}

function skipWhitespace(source, index) {
  while (index < source.length && /\s/.test(source[index])) index += 1;
  return index;
}

function stringEnd(source, start) {
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '"') {
      return index + 1;
    }
  }
  throw new Error(`unterminated JSON string at offset ${start}`);
}

function valueEnd(source, start) {
  const first = source[start];
  if (first === '"') return stringEnd(source, start);
  if (first !== '{' && first !== '[') {
    let index = start;
    while (index < source.length && source[index] !== ',' && source[index] !== '}') index += 1;
    return index;
  }

  const stack = [first];
  let inString = false;
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
    } else if (character === '{' || character === '[') {
      stack.push(character);
    } else if (character === '}' || character === ']') {
      const open = stack.pop();
      if ((open === '{' && character !== '}') || (open === '[' && character !== ']')) {
        throw new Error(`mismatched JSON delimiter at offset ${index}`);
      }
      if (stack.length === 0) return index + 1;
    }
  }
  throw new Error(`unterminated JSON value at offset ${start}`);
}

function objectMembers(source) {
  let index = skipWhitespace(source, 0);
  if (source[index] !== '{') throw new Error('expected a JSON object');
  index += 1;
  const members = [];

  while (true) {
    index = skipWhitespace(source, index);
    if (source[index] === '}') return members;
    if (source[index] !== '"') throw new Error(`expected a JSON key at offset ${index}`);
    const keyStart = index;
    const keyEnd = stringEnd(source, keyStart);
    const key = JSON.parse(source.slice(keyStart, keyEnd));
    index = skipWhitespace(source, keyEnd);
    if (source[index] !== ':') throw new Error(`expected ':' after ${key}`);
    index = skipWhitespace(source, index + 1);
    const start = index;
    const end = valueEnd(source, start);
    members.push({ key, keyStart, valueStart: start, valueEnd: end, value: source.slice(start, end) });
    index = skipWhitespace(source, end);
    if (source[index] === ',') {
      index += 1;
      continue;
    }
    if (source[index] === '}') return members;
    throw new Error(`expected ',' or '}' after ${key}`);
  }
}

function renderObject(entries, indent, eol = '\n') {
  const body = entries.map(({ key, value }) => `${indent}${JSON.stringify(key)}: ${value}`).join(`,${eol}`);
  return `{${eol}${body}${eol}${indent.slice(0, -2)}}`;
}

function captureFormat(source, entries) {
  const open = source.indexOf('{');
  const close = source.lastIndexOf('}');
  if (open < 0 || close < open || entries.length === 0) throw new Error('cannot capture empty or malformed object formatting');
  const normalize = (value) => value.replace(/\r\n/g, '\n');
  return {
    prefix: normalize(source.slice(open + 1, entries[0].keyStart)),
    headers: entries.map((entry) => normalize(source.slice(entry.keyStart, entry.valueStart))),
    separators: entries.slice(0, -1).map((entry, index) => normalize(source.slice(entry.valueEnd, entries[index + 1].keyStart))),
    suffix: normalize(source.slice(entries.at(-1).valueEnd, close)),
  };
}

function renderCapturedObject(entries, format, eol) {
  if (format.headers.length !== entries.length || format.separators.length !== entries.length - 1) {
    throw new Error('manifest formatting metadata does not match the current entry count');
  }
  const expand = (value) => value.replace(/\n/g, eol);
  let result = `{${expand(format.prefix)}`;
  entries.forEach((entry, index) => {
    result += `${expand(format.headers[index])}${entry.value}`;
    result += expand(index < format.separators.length ? format.separators[index] : format.suffix);
  });
  return `${result}}`;
}

function classify(entries, definitions) {
  const groups = new Map(definitions.map((definition) => [definition.file, []]));
  for (const entry of entries) {
    const definition = definitions.find((candidate) => candidate.matches(entry.key));
    groups.get(definition.file).push(entry);
  }
  return groups;
}

function writeFile(relativePath, contents, eol = '\n') {
  const target = path.join(SOURCE_ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  writeFileAtomic(target, `${contents}${eol}`);
}

function writeFileAtomic(target, contents) {
  const temporary = `${target}.codex-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, contents, 'utf8');
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function extract() {
  assertCicersBranch(REPOSITORY_ROOT);
  if (fs.existsSync(MANIFEST_PATH) && !process.argv.includes('--force')) {
    throw new Error('mission-src already exists; use extract --force only when the artifact intentionally replaces every module');
  }

  const artifact = fs.readFileSync(ARTIFACT_PATH, 'utf8');
  const eol = artifact.includes('\r\n') ? '\r\n' : '\n';
  JSON.parse(artifact);
  const rootEntries = objectMembers(artifact);
  const root = new Map(rootEntries.map((entry) => [entry.key, entry]));
  const macroEntries = objectMembers(root.get('macros').value);
  const dataEntries = objectMembers(root.get('data').value);
  const macroGroups = classify(macroEntries, MACRO_MODULES);
  const dataGroups = classify(dataEntries, DATA_MODULES);

  for (const definition of MACRO_MODULES) {
    writeFile(definition.file, renderObject(macroGroups.get(definition.file), '    ', eol), eol);
  }
  for (const definition of DATA_MODULES) {
    writeFile(definition.file, renderObject(dataGroups.get(definition.file), '    ', eol), eol);
  }

  const manifest = {
    schemaVersion: 1,
    artifact: 'everywhere_all.json',
    modularSections: ['macros', 'data'],
    artifactOnlySections: rootEntries.map((entry) => entry.key).filter((key) => key !== 'macros' && key !== 'data'),
    macroOrder: macroEntries.map((entry) => entry.key),
    dataOrder: dataEntries.map((entry) => entry.key),
    modules: {
      macros: MACRO_MODULES.map(({ file, description }) => ({ file, description })),
      data: DATA_MODULES.map(({ file, description }) => ({ file, description })),
    },
    format: {
      macros: captureFormat(root.get('macros').value, macroEntries),
      data: captureFormat(root.get('data').value, dataEntries),
    },
  };
  writeFileAtomic(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Extracted ${macroEntries.length} macros and ${dataEntries.length} data entries into ${MACRO_MODULES.length + DATA_MODULES.length} modules.`);
}

function loadManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (manifest.schemaVersion !== 1) throw new Error(`unsupported manifest schema ${manifest.schemaVersion}`);
  return manifest;
}

function collectModules(moduleDefinitions, sectionName) {
  const entriesByKey = new Map();
  const ownerByKey = new Map();
  const discoveredOrder = [];
  for (const definition of moduleDefinitions) {
    const source = fs.readFileSync(path.join(SOURCE_ROOT, definition.file), 'utf8');
    JSON.parse(source);
    for (const entry of objectMembers(source)) {
      if (entriesByKey.has(entry.key)) {
        throw new Error(`${sectionName}.${entry.key} appears in both ${ownerByKey.get(entry.key)} and ${definition.file}`);
      }
      entriesByKey.set(entry.key, entry);
      ownerByKey.set(entry.key, definition.file);
      discoveredOrder.push(entry.key);
    }
  }

  return { discoveredOrder, entriesByKey, ownerByKey };
}

function loadModules(moduleDefinitions, expectedOrder, sectionName) {
  const { entriesByKey, ownerByKey } = collectModules(moduleDefinitions, sectionName);

  const expected = new Set(expectedOrder);
  const missing = expectedOrder.filter((key) => !entriesByKey.has(key));
  const unexpected = [...entriesByKey.keys()].filter((key) => !expected.has(key));
  if (missing.length) throw new Error(`${sectionName} entries missing from modules: ${missing.join(', ')}`);
  if (unexpected.length) throw new Error(`${sectionName} entries absent from manifest order: ${unexpected.join(', ')}`);

  return {
    entries: expectedOrder.map((key) => entriesByKey.get(key)),
    ownerByKey,
  };
}

function reindexSection(manifest, sectionName, orderProperty) {
  const collected = collectModules(manifest.modules[sectionName], sectionName);
  const oldOrder = manifest[orderProperty];
  const oldFormat = manifest.format[sectionName];
  const present = new Set(collected.discoveredOrder);
  const oldSet = new Set(oldOrder);
  const newOrder = oldOrder.filter((key) => present.has(key));
  newOrder.push(...collected.discoveredOrder.filter((key) => !oldSet.has(key)));

  const oldIndex = new Map(oldOrder.map((key, index) => [key, index]));
  const headers = newOrder.map((key) => {
    const index = oldIndex.get(key);
    return index === undefined ? `${JSON.stringify(key)}: ` : oldFormat.headers[index];
  });
  const separatorByPair = new Map(oldOrder.slice(0, -1).map((key, index) => [`${key}\u0000${oldOrder[index + 1]}`, oldFormat.separators[index]]));
  const separators = newOrder.slice(0, -1).map((key, index) => (
    separatorByPair.get(`${key}\u0000${newOrder[index + 1]}`) || ',\n    '
  ));

  manifest[orderProperty] = newOrder;
  manifest.format[sectionName] = { prefix: oldFormat.prefix, headers, separators, suffix: oldFormat.suffix };
  return {
    added: newOrder.filter((key) => !oldSet.has(key)),
    removed: oldOrder.filter((key) => !present.has(key)),
  };
}

function reindex() {
  assertCicersBranch(REPOSITORY_ROOT);
  const manifest = loadManifest();
  const macros = reindexSection(manifest, 'macros', 'macroOrder');
  const data = reindexSection(manifest, 'data', 'dataOrder');
  writeFileAtomic(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ macros, data }, null, 2));
  console.log('Manifest reindexed. Run build, inspect the semantic diff, then run check.');
}

function compose() {
  const manifest = loadManifest();
  const artifact = fs.readFileSync(ARTIFACT_PATH, 'utf8');
  const eol = artifact.includes('\r\n') ? '\r\n' : '\n';
  JSON.parse(artifact);
  const rootEntries = objectMembers(artifact);
  const root = new Map(rootEntries.map((entry) => [entry.key, entry]));
  const macros = loadModules(manifest.modules.macros, manifest.macroOrder, 'macros');
  const data = loadModules(manifest.modules.data, manifest.dataOrder, 'data');
  const replacements = [
    { entry: root.get('macros'), value: renderCapturedObject(macros.entries, manifest.format.macros, eol) },
    { entry: root.get('data'), value: renderCapturedObject(data.entries, manifest.format.data, eol) },
  ].sort((left, right) => right.entry.valueStart - left.entry.valueStart);

  let result = artifact;
  for (const replacement of replacements) {
    result = result.slice(0, replacement.entry.valueStart) + replacement.value + result.slice(replacement.entry.valueEnd);
  }
  JSON.parse(result);
  return { artifact, result, manifest, macros, data };
}

function check() {
  const { artifact, result, manifest } = compose();
  if (artifact !== result) {
    const artifactObject = JSON.parse(artifact);
    const resultObject = JSON.parse(result);
    if (JSON.stringify(artifactObject) === JSON.stringify(resultObject)) {
      throw new Error('modules are semantically equal but formatting drift prevents a byte-exact rebuild; run build intentionally or restore fragment formatting');
    }
    throw new Error('modules and everywhere_all.json differ; run build only after reviewing the intended source changes');
  }
  console.log(`Mission workspace PASS (${manifest.macroOrder.length} macros, ${manifest.dataOrder.length} data entries, byte-exact artifact).`);
}

function build() {
  assertCicersBranch(REPOSITORY_ROOT);
  const { artifact, result } = compose();
  const intent = assertBuildIntent(REPOSITORY_ROOT, result, { purpose: 'build' });
  if (artifact === result) {
    markBuildConsumed(REPOSITORY_ROOT, artifact);
    console.log(`Mission artifact already matches the modular sources byte-for-byte; consumed local build ${intent.release}.`);
    return;
  }
  writeFileAtomic(ARTIFACT_PATH, result);
  markBuildConsumed(REPOSITORY_ROOT, result);
  console.log(`Rebuilt everywhere_all.json from mission-src as local build ${intent.release}; review the semantic scope before continuing.`);
}

function locate(query) {
  if (!query) throw new Error('locate requires a macro or data-name substring');
  const manifest = loadManifest();
  const macroData = loadModules(manifest.modules.macros, manifest.macroOrder, 'macros');
  const missionData = loadModules(manifest.modules.data, manifest.dataOrder, 'data');
  const normalized = query.toLowerCase();
  const matches = [];
  for (const [key, owner] of macroData.ownerByKey) {
    if (key.toLowerCase().includes(normalized)) matches.push(`macro\t${key}\tmission-src/${owner}`);
  }
  for (const [key, owner] of missionData.ownerByKey) {
    if (key.toLowerCase().includes(normalized)) matches.push(`data\t${key}\tmission-src/${owner}`);
  }
  if (!matches.length) throw new Error(`no macro or data entry contains ${JSON.stringify(query)}`);
  console.log(matches.join('\n'));
}

function printHelp() {
  console.log(`Usage: node tools/mission-workspace.js <command>\n\nCommands:\n  extract [--force]  Split the deployed artifact into modular sources.\n  reindex            Update manifest order after adding, renaming, or removing entries.\n  check              Require a byte-exact rebuild from modular sources.\n  build              Rebuild everywhere_all.json from modular sources.\n  locate <text>      Find the source module for a macro or data entry.`);
}

function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === 'extract') extract();
  else if (command === 'reindex') reindex();
  else if (command === 'check') check();
  else if (command === 'build') build();
  else if (command === 'locate') locate(argument);
  else if (!command || command === '--help' || command === '-h') printHelp();
  else throw new Error(`unknown command ${command}`);
}

module.exports = { build, check, compose, extract, locate, reindex };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    fail(error.message);
  }
}
