#!/usr/bin/env node

import path from 'node:path';
import { execSync } from 'node:child_process';

const SCRIPT_DIR = import.meta.dirname;

const REPO_DIR = process.env.REPO_DIR
  ? path.resolve(process.env.REPO_DIR)
  : path.resolve(SCRIPT_DIR, '..', '..');

function git(...args) {
  return execSync(
    `git ${args.map((a) => `'${String(a).replace(/'/g, "'\\''")}'`).join(' ')}`,
    { cwd: REPO_DIR, encoding: 'utf8' },
  ).trim();
}

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

function timestampTag(date = new Date()) {
  return date.toISOString().slice(0, 19).replace(/:/g, '-') + 'Z';
}

function uniqueTag(tags) {
  const existing = new Set(tags);
  let date = new Date();
  let tag = timestampTag(date);
  while (existing.has(tag)) {
    date = new Date(date.getTime() + 1000);
    tag = timestampTag(date);
  }
  return tag;
}

function publishedTags() {
  return git('tag').split('\n').filter(Boolean);
}

// Authenticate git against the remote using GH_TOKEN. Set as a credential
// helper in local config (not per-command argv) so the token never surfaces
// in command output or error messages. Covers fetch/ls-remote/push during
// preflight and release.
function configureAuth() {
  const token = process.env.GH_TOKEN;
  if (!token) return;
  const esc = token.replace(/'/g, "'\\''");
  git(
    'config',
    '--local',
    'credential.helper',
    `!f(){ echo username=x-access-token; echo password=${esc}; }; f`,
  );
  console.log('[OK] configured credential helper for origin (GH_TOKEN)');
}

// --- release gate: everything must be right before creating a tag ---
function preflight() {
  const dirty = git('status', '--porcelain');
  if (dirty) {
    fail(`working tree is not clean:\n${dirty.split('\n').map((l) => '  ' + l).join('\n')}`);
  }

  git('fetch', 'origin', 'main');
  const remoteCommit = git('rev-parse', 'origin/main');
  const headCommit = git('rev-parse', 'HEAD');
  if (remoteCommit !== headCommit) {
    fail(`HEAD (${headCommit}) does not match origin/main (${remoteCommit}) — refusing to release an unpublished commit`);
  }

  try {
    git('lfs', 'fsck');
  } catch (e) {
    fail(`git lfs fsck failed:\n${e.stderr || e.message}`);
  }
  console.log('[OK] preflight passed: clean tree, HEAD == origin/main, lfs fsck clean');
}

function pushTag(tag) {
  const token = process.env.GH_TOKEN;
  const url = git('remote', 'get-url', 'origin');
  if (token) {
    const authed = url.replace(/^https:\/\//, `https://x-access-token:${token}@`);
    execSync(`git push '${authed}' '${tag}'`, { cwd: REPO_DIR, encoding: 'utf8', stdio: 'inherit' });
  } else {
    git('push', 'origin', tag);
  }
}

const cmd = process.argv[2];
if (cmd !== 'publish') {
  console.error('usage: node publish-tag.js publish');
  process.exit(1);
}

configureAuth();
preflight();

const tag = uniqueTag(publishedTags());
git('tag', tag);
pushTag(tag);
console.log(`[OK] pushed tag ${tag}`);

const remoteRef = git('ls-remote', '--tags', 'origin', tag);
if (!remoteRef) {
  fail(`tag ${tag} not present on remote origin`);
}
const remoteCommit = remoteRef.split('\t')[0];
const headCommit = git('rev-parse', 'HEAD');
if (remoteCommit !== headCommit) {
  fail(`tag ${tag} (${remoteCommit}) does not match latest commit (${headCommit})`);
}
console.log(`[OK] tag ${tag} present on origin at latest commit ${headCommit}`);

const zipOutput = execSync(
  `node '${path.join(SCRIPT_DIR, 'release-zip.js')}' '${tag}'`,
  { cwd: REPO_DIR, encoding: 'utf8' },
);
console.log(zipOutput.trim());
const zipPath = zipOutput.trim().split('\n').pop();

if (!process.env.GH_TOKEN) {
  fail('GH_TOKEN not set — cannot create the GitHub release');
}
execSync(
  `gh release create '${tag}' '${zipPath}' --title '${tag}' --generate-notes`,
  { cwd: REPO_DIR, encoding: 'utf8', stdio: 'inherit' },
);
console.log(`[OK] release ${tag} created with asset ${zipPath}`);
