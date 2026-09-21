#!/usr/bin/env node

// Post-release verification — runs as the last step of CI, after the release job.
// Confirms the release tag points at the latest commit on main and that the
// uploaded zip is byte-for-byte identical to the tracked tree at that commit
// (same files, nothing more, nothing less).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = import.meta.dirname;

const REPO_DIR = process.env.REPO_DIR
  ? path.resolve(process.env.REPO_DIR)
  : path.resolve(SCRIPT_DIR, '..', '..');

function run(cmd, args, { cwd = REPO_DIR, capture = true, env } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env });
  if (r.error || r.status !== 0) {
    throw new Error(`\`${cmd} ${args.join(' ')}\` failed:\n${r.stderr || r.stdout || r.error?.message}`);
  }
  return capture ? r.stdout.trim() : undefined;
}

function fail(msg) {
  console.error(`[FAIL] ${msg}`);
  process.exit(1);
}

// Authenticate git against the remote using GH_TOKEN (mirrors publish-tag.js).
function configureAuth() {
  const token = process.env.GH_TOKEN;
  if (!token) return;
  const esc = token.replace(/'/g, "'\\''");
  run('git', ['config', '--local', 'credential.helper',
    `!f(){ echo username=x-access-token; echo password=${esc}; }; f`]);
}

function treeEntries() {
  const out = [];
  for (const rel of run('git', ['ls-files']).split('\n')) {
    const p = path.join(REPO_DIR, rel);
    out.push({ rel, sha256: createHash('sha256').update(fs.readFileSync(p)).digest('hex') });
  }
  return out;
}

function listFiles(root) {
  const out = [];
  const walk = (dir, rel) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      if (fs.statSync(p).isDirectory()) walk(p, r);
      else out.push(r);
    }
  };
  walk(root, '');
  return out;
}

function downloadAndVerify(tag, expected) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'private-verify-'));
  try {
    run('gh', ['release', 'download', tag, '--pattern', '*.zip', '--dir', tmp], { capture: false });
    const zips = fs.readdirSync(tmp).filter((n) => n.endsWith('.zip'));
    if (zips.length !== 1) fail(`expected exactly one zip asset, found ${zips.length}`);
    const extract = path.join(tmp, 'x');
    fs.mkdirSync(extract);
    run('unzip', ['-q', path.join(tmp, zips[0]), '-d', extract], { capture: false });

    const actual = new Map();
    for (const rel of listFiles(extract)) {
      actual.set(rel, createHash('sha256').update(fs.readFileSync(path.join(extract, rel))).digest('hex'));
    }

    const expectedMap = new Map(expected.map((e) => [e.rel, e.sha256]));
    const problems = [];
    if (actual.size !== expectedMap.size) {
      problems.push(`archive has ${actual.size} files, expected ${expectedMap.size}`);
    }
    for (const rel of expectedMap.keys()) {
      if (!actual.has(rel)) problems.push(`missing from archive: ${rel}`);
    }
    for (const rel of actual.keys()) {
      if (!expectedMap.has(rel)) problems.push(`unexpected in archive: ${rel}`);
    }
    for (const [rel, want] of expectedMap) {
      const got = actual.get(rel);
      if (got !== undefined && got !== want) {
        problems.push(`content mismatch for ${rel} (sha256 differ)`);
      }
    }
    if (problems.length) {
      throw new Error(`archive does not match the commit content:\n  ${problems.join('\n  ')}`);
    }
    return actual.size;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

configureAuth();
const head = run('git', ['rev-parse', 'HEAD']);
run('git', ['fetch', 'origin', 'main', '--tags'], { capture: false });
const originMain = run('git', ['rev-parse', 'origin/main']);
if (originMain !== head) {
  fail(`origin/main (${originMain}) does not match HEAD (${head}) — release is not the latest commit on main`);
}

const tags = run('git', ['tag', '--points-at', head]).split('\n').filter(Boolean);
if (tags.length === 0) fail(`no tag at HEAD ${head} — nothing released for this commit`);
if (tags.length > 1) fail(`multiple tags at HEAD ${head}: ${tags.join(', ')} — ambiguous`);
const tag = tags[0];

const tagCommit = run('git', ['rev-parse', tag]);
if (tagCommit !== head) fail(`tag ${tag} (${tagCommit}) does not point at HEAD (${head})`);

const count = downloadAndVerify(tag, treeEntries());
console.log(`[OK] release ${tag} verified: tag == origin/main (${head}), zip == commit content (${count} files)`);
