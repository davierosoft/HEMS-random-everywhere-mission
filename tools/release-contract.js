#!/usr/bin/env node

'use strict';

const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

const INTENT_SCHEMA = 1;
const INTENT_FILE = '.workspace-state/release-intent.json';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function parseRelease(value) {
  const match = /^(\d+)\.(\d+)\s+(\d+)$/.exec(String(value || '').trim());
  if (!match) throw new Error(`invalid release identity: ${JSON.stringify(value)}`);
  return { major: Number(match[1]), minor: Number(match[2]), build: Number(match[3]), text: match[0] };
}

function compareRelease(left, right) {
  const a = parseRelease(left);
  const b = parseRelease(right);
  for (const key of ['major', 'minor', 'build']) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  return 0;
}

function releaseFromTitle(title) {
  const match = /(\d+\.\d+\s+\d+)\s*$/.exec(String(title || ''));
  if (!match) throw new Error(`mission title does not end with a release identity: ${JSON.stringify(title)}`);
  return parseRelease(match[1]).text;
}

function firstChangelogRelease(changelog) {
  const match = /^## Release (\d+\.\d+\s+\d+)\s*$/m.exec(String(changelog || ''));
  if (!match) throw new Error('CHANGELOG.en.md has no first release heading');
  return parseRelease(match[1]).text;
}

function intentPath(repositoryRoot) {
  return path.join(repositoryRoot, INTENT_FILE);
}

function readIntent(repositoryRoot) {
  const file = intentPath(repositoryRoot);
  if (!fs.existsSync(file)) throw new Error('no active release intent; run node tools/release-workflow.js begin before build');
  let intent;
  try {
    intent = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`invalid release intent: ${error.message}`);
  }
  if (intent.schema !== INTENT_SCHEMA || typeof intent.release !== 'string' || !intent.scope) {
    throw new Error('release intent is missing required fields');
  }
  parseRelease(intent.release);
  return intent;
}

function writeIntent(repositoryRoot, intent) {
  const file = intentPath(repositoryRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.codex-${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(intent, null, 2)}\n`);
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function assertReleaseIdentity(repositoryRoot, artifactText) {
  const mission = JSON.parse(artifactText);
  const titleRelease = releaseFromTitle(mission.title);
  const changelogRelease = firstChangelogRelease(fs.readFileSync(path.join(repositoryRoot, 'CHANGELOG.en.md'), 'utf8'));
  if (titleRelease !== changelogRelease) {
    throw new Error(`release identity mismatch: mission ${titleRelease}, changelog ${changelogRelease}`);
  }
  const expectedBuild = parseRelease(titleRelease).build;
  const releaseAssignments = (mission.macros?.objective1 || []).filter((command) => command.set?.var?.[0] === 'L:RELEASE_BUILD');
  if (releaseAssignments.length !== 1 || releaseAssignments[0].value !== expectedBuild) {
    throw new Error(`runtime release build mismatch: objective1 L:RELEASE_BUILD must be ${expectedBuild}`);
  }
  return { mission, release: titleRelease };
}

function assertBuildIntent(repositoryRoot, artifactText, options = {}) {
  const purpose = options.purpose || 'read';
  const intent = readIntent(repositoryRoot);
  const identity = assertReleaseIdentity(repositoryRoot, artifactText);
  if (intent.release !== identity.release) {
    throw new Error(`release intent ${intent.release} does not match mission/changelog ${identity.release}`);
  }
  const allowedStatuses = {
    build: ['prepared'],
    static: ['built', 'static_pass'],
    package: ['static_pass'],
    read: ['prepared', 'built', 'static_pass', 'packaged'],
  };
  if (!allowedStatuses[purpose]) throw new Error(`unknown release-intent purpose: ${purpose}`);
  if (!allowedStatuses[purpose].includes(intent.status)) {
    throw new Error(`release ${intent.release} is ${intent.status}; ${purpose} requires ${allowedStatuses[purpose].join(' or ')}`);
  }
  return intent;
}

function markBuildConsumed(repositoryRoot, artifactText) {
  const intent = assertBuildIntent(repositoryRoot, artifactText, { purpose: 'build' });
  intent.status = 'built';
  intent.builtAt = new Date().toISOString();
  intent.builtArtifactSha256 = sha256(artifactText);
  writeIntent(repositoryRoot, intent);
  return intent;
}

module.exports = {
  INTENT_FILE,
  INTENT_SCHEMA,
  assertBuildIntent,
  assertReleaseIdentity,
  compareRelease,
  firstChangelogRelease,
  intentPath,
  markBuildConsumed,
  parseRelease,
  readIntent,
  releaseFromTitle,
  sha256,
  writeIntent,
};
