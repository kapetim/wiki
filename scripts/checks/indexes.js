// Structure conventions for src/ — readme indexes, problem files, and
// interpretation headers. Content-side rules (private-specific).

import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';

const NOTES = ['src'];

async function tableRows(repoDir, rel) {
  const md = await readFile(path.join(repoDir, ...rel.split('/')), 'utf8');
  const rows = [];
  let inTable = false;
  for (const line of md.split('\n')) {
    const t = line.trim();
    if (t === '<!-- begin table -->') { inTable = true; continue; }
    if (t === '<!-- end table -->') { inTable = false; continue; }
    if (inTable && t.startsWith('|') && !/^\|[\s:|-]+\|$/.test(t)) rows.push(t);
  }
  return rows;
}

async function dirNames(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function mdFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith('.md')).map((e) => e.name);
}

export async function checkIndexes(repoDir) {
  const errors = [];

  // problems/readme.md index ↔ files
  const problemsDir = path.join(repoDir, ...NOTES, 'problems');
  const files = (await mdFiles(problemsDir)).filter((f) => f !== 'readme.md');
  const indexed = new Set();
  for (const row of await tableRows(repoDir, 'src/problems/readme.md')) {
    const m = row.match(/\[([a-z0-9-]+\.md)\]\(\.\/\1\)/);
    if (m) indexed.add(m[1]);
  }
  for (const f of files) if (!indexed.has(f)) errors.push(`problems/readme.md index missing file: ${f}`);
  for (const f of indexed) if (!files.includes(f)) errors.push(`problems/readme.md index lists missing file: ${f}`);

  // src/readme.md table ↔ folders
  const manageDir = path.join(repoDir, ...NOTES);
  const manageDirs = await dirNames(manageDir);
  const manageIdx = new Set();
  for (const row of await tableRows(repoDir, 'src/readme.md')) {
    const m = row.match(/`([a-z0-9-]+)\/`/);
    if (m) manageIdx.add(m[1]);
  }
  for (const d of manageDirs) if (!manageIdx.has(d)) errors.push(`src/readme.md table missing folder: ${d}`);
  for (const d of manageIdx) if (!manageDirs.includes(d)) errors.push(`src/readme.md table lists missing folder: ${d}`);

  return errors;
}

export async function checkProblems(repoDir) {
  const errors = [];
  const base = path.join(repoDir, ...NOTES, 'problems');
  for (const sub of ['solvable', 'unsolvable', 'unknown']) {
    const dir = path.join(base, sub);
    let files;
    try {
      files = await mdFiles(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      const md = await readFile(path.join(dir, f), 'utf8');
      if (!/❓ Open questions/.test(md)) errors.push(`problems/${sub}/${f}: missing '❓ Open questions' section`);
    }
  }
  return errors;
}

export async function checkInterpretations(repoDir) {
  const errors = [];
  const base = path.join(repoDir, ...NOTES, 'observation');
  const files = [];
  const walk = async (dir, rel) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p, rel ? `${rel}/${e.name}` : e.name);
      else if (e.name.endsWith('.md')) files.push(rel ? `${rel}/${e.name}` : e.name);
    }
  };
  await walk(base, '');
  for (const f of files) {
    const md = await readFile(path.join(base, f), 'utf8');
    if (!md.includes('**What this is:**')) errors.push(`observation/${f}: missing '**What this is:**'`);
  }
  return errors;
}
