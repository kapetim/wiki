#!/usr/bin/env node

// Full-content zip of the repo at a ref — resolves LFS pointers to real bytes
// (git archive / GitHub's auto source zip only contain LFS pointer text).
// Then verifies the archive matches the tracked tree exactly (names + sizes).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = import.meta.dirname;

const REPO_DIR = process.env.REPO_DIR
  ? path.resolve(process.env.REPO_DIR)
  : path.resolve(SCRIPT_DIR, '..', '..');

function run(cmd, args, { cwd = REPO_DIR, capture = true } = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    throw new Error(`\`${cmd} ${args.join(' ')}\` failed:\n${r.stderr || r.stdout || r.error?.message}`);
  }
  return capture ? r.stdout : undefined;
}

function trackedFiles() {
  const out = run('git', ['ls-files', '-z']);
  return out.split('\0').filter(Boolean);
}

// Build the zip from the tracked working-tree files (`git ls-files` piped into
// `zip -@`). Unlike `git archive` / GitHub source zips, this carries real
// (LFS-smudged) bytes and covers every tracked file exactly.
function buildZip(out) {
  const list = run('git', ['ls-files']);
  const z = spawnSync('zip', ['-@', out], { cwd: REPO_DIR, input: list, encoding: 'utf8' });
  if (z.error || z.status !== 0) {
    throw new Error(`\`zip -@\` failed:\n${z.stderr || z.stdout || z.error?.message}`);
  }
}

function onDiskSize(repoDir, rel) {
  return fs.statSync(path.join(repoDir, rel)).size;
}

function listDir(dir, rel, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    const st = fs.statSync(p);
    if (st.isDirectory()) listDir(p, r, out);
    else out.push({ path: r, size: st.size });
  }
}

function verify(out, expected) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'private-zip-'));
  try {
    run('unzip', ['-q', out, '-d', tmp], { capture: false });
    const extracted = [];
    listDir(tmp, '', extracted);
    const byPath = new Map(extracted.map((e) => [e.path, e.size]));

    const problems = [];
    if (extracted.length !== expected.length) {
      problems.push(`archive has ${extracted.length} files, expected ${expected.length}`);
    }
    for (const { path: rel } of expected) {
      if (!byPath.has(rel)) problems.push(`missing from archive: ${rel}`);
    }
    for (const { path: rel } of extracted) {
      if (!expected.some((e) => e.path === rel)) problems.push(`unexpected in archive: ${rel}`);
    }
    for (const { path: rel, size } of expected) {
      const actual = byPath.get(rel);
      if (actual !== undefined && actual !== size) {
        problems.push(`size mismatch for ${rel}: archive ${actual}, expected ${size}`);
      }
    }
    if (problems.length) {
      throw new Error(`archive verification failed:\n  ${problems.join('\n  ')}`);
    }
    return extracted.length;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const ref = process.argv[2] || 'HEAD';
const safe = String(ref).replace(/[^A-Za-z0-9._-]/g, '_');
const out = path.join(REPO_DIR, `private-${safe}.zip`);

console.log(`[zip] archiving ${ref} (tracked files, real content) -> ${out}`);
if (fs.existsSync(out)) fs.rmSync(out);
buildZip(out);

const expected = trackedFiles().map((rel) => ({ path: rel, size: onDiskSize(REPO_DIR, rel) }));
const count = verify(out, expected);
console.log(`[OK] ${count}/${expected.length} files verified in ${path.basename(out)}`);
console.log(out);
