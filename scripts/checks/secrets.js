// Secret/credential scan — fail if tracked files contain obvious secret material.

import path from 'node:path';
import { readFile, readdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const MAX_BYTES = 512 * 1024;

export const PATTERNS = [
  { name: 'private key', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP |ENCRYPTED |DSA )?PRIVATE KEY-----/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'OpenAI key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: 'generic bearer token', re: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}\b/i },
];

function isSkipped(name) {
  return name === '.git' || name === 'node_modules';
}

function isBinary(ext) {
  return /\.(pdf|png|jpe?g|gif|webp|zip|7z|tar|gz|mp3|mp4|mov|woff2?|ttf|otf)$/i.test(ext);
}

export async function checkSecrets(repoDir) {
  const errors = [];
  const files = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (isSkipped(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else files.push(p);
    }
  };
  await walk(repoDir);

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    if (isBinary(path.extname(f))) continue;
    let st;
    try { st = await stat(f); } catch { continue; }
    if (st.size === 0 || st.size > MAX_BYTES) continue;

    let buf;
    try { buf = await readFile(f, 'utf8'); } catch { continue; }
    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(buf)) {
        errors.push(`${rel}: possible ${name} detected`);
        break;
      }
    }
  }

  return errors;
}

// Scan git history diffs for the same secret patterns — catches material that
// only exists in history (e.g. a secret committed then removed in a later edit).
export async function checkHistory(repoDir) {
  const r = spawnSync('git', ['log', '-p', '--all'], {
    cwd: repoDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  if (r.error || r.status !== 0) {
    return [`git log failed: ${r.stderr || r.status}`];
  }
  const errors = [];
  let commit = '';
  let file = '';
  for (const line of r.stdout.split('\n')) {
    const cm = line.match(/^commit\s+([0-9a-f]{40})/);
    if (cm) { commit = cm[1].slice(0, 7); continue; }
    const fm = line.match(/^[+-]{3}\s+(?:a\/|b\/)?([^\t]+)/);
    if (fm) { file = fm[1]; continue; }
    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line)) {
        errors.push(`${commit} ${file}: possible ${name} detected`);
        break;
      }
    }
  }
  return errors;
}
