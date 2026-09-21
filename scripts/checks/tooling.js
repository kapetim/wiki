// Tooling checks — large-file/LFS policy.

import path from 'node:path';
import { stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const LFS_POLICY_BYTES = 5 * 1024 * 1024;

function git(repoDir, ...args) {
  return spawnSync('git', args, { cwd: repoDir, encoding: 'utf8' });
}

export async function checkLfsPolicy(repoDir) {
  const errors = [];
  const ls = git(repoDir, 'ls-files', '-z');
  if (ls.error || ls.status !== 0) {
    return [`git ls-files failed: ${ls.stderr || ls.status}`];
  }
  const paths = ls.stdout.split('\0').filter(Boolean);
  if (!paths.length) return errors;

  const big = [];
  for (const p of paths) {
    let st;
    try { st = await stat(path.join(repoDir, p)); } catch { continue; }
    if (st.size > LFS_POLICY_BYTES) big.push(p);
  }
  if (!big.length) return errors;

  const ca = git(repoDir, 'check-attr', 'filter', '--', ...big);
  if (ca.error || ca.status !== 0) {
    return [`git check-attr failed: ${ca.stderr || ca.status}`];
  }
  const attr = new Map();
  for (const line of ca.stdout.split('\n')) {
    const m = line.match(/^([^:]+): filter: (\S+)$/);
    if (m) attr.set(m[1], m[2]);
  }
  for (const p of big) {
    if (attr.get(p) !== 'lfs') {
      errors.push(`${p}: ${(await stat(path.join(repoDir, p))).size} bytes but not LFS-tracked (policy limit ${LFS_POLICY_BYTES} bytes)`);
    }
  }
  return errors;
}

// Two tracked paths differing only in case silently clobber each other on
// case-insensitive filesystems (macOS/Windows) — reject them.
export async function checkCaseCollisions(repoDir) {
  const ls = git(repoDir, 'ls-files', '-z');
  if (ls.error || ls.status !== 0) {
    return [`git ls-files failed: ${ls.stderr || ls.status}`];
  }
  const seen = new Map();
  const errors = [];
  for (const p of ls.stdout.split('\0').filter(Boolean)) {
    const idx = p.lastIndexOf('/');
    const dir = idx === -1 ? '' : p.slice(0, idx);
    const key = `${dir}\u0000${p.slice(idx + 1).toLowerCase()}`;
    const prev = seen.get(key);
    if (prev) errors.push(`case collision: ${prev} vs ${p}`);
    else seen.set(key, p);
  }
  return errors;
}
