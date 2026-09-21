// Heading emoji-coverage snapshot for the README "Coverage" section.
// Computes, from the live repo, how many headings there are and how many start
// with an emoji (a non-ASCII symbol). Mirrors checkHeadingEmoji's definition so
// the integration test and the generator agree. The test ensures the README
// numbers match.

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { walkMd } from '../shared/md-walk.js';

const FENCE_RE = /^\s*(```+|~~~+)/;
const HEADING_ANY = /^#{1,6}\s+(\S)/;

export function isEmojiStart(c) {
  return c !== undefined && /\P{ASCII}/u.test(c);
}

export async function computeCoverage(repoDir) {
  let total = 0;
  let withEmoji = 0;
  const missing = new Map(); // rel -> [line, heading][]

  for (const f of await walkMd(repoDir)) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    const lines = (await readFile(f, 'utf8')).split('\n');
    let inCode = false;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (FENCE_RE.test(raw)) { inCode = !inCode; continue; }
      if (inCode) continue;
      const m = raw.match(HEADING_ANY);
      if (!m) continue;
      total += 1;
      if (isEmojiStart(m[1])) {
        withEmoji += 1;
      } else {
        const text = m[0].replace(/^#{1,6}\s+/, '').trim();
        if (!missing.has(rel)) missing.set(rel, []);
        missing.get(rel).push([i + 1, text]);
      }
    }
  }

  const pct = total === 0 ? 0 : (100 * withEmoji) / total;
  return { total, withEmoji, missing, pct };
}

// Renders the four lines that the integration test compares (the snapshot body + table).
export function renderCoverage(cov) {
  const missingRows = [...cov.missing.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([rel, hits]) => `| ${rel} | ${hits.length} |`);
  const filesLine = cov.missing.size === 0
    ? 'Files with headings missing an emoji: none.'
    : `Files with headings missing an emoji: ${cov.missing.size}.`;
  return {
    summary: `**Total: ${cov.total} headings · ${cov.withEmoji} with emoji · ${cov.pct.toFixed(2)}% coverage.**`,
    files: filesLine,
    table: [
      '<!-- begin table -->',
      '| File | Missing |',
      '| --- | ---: |',
      ...missingRows,
      '<!-- end table -->',
    ],
  };
}

// Gate check: the README "Coverage" numbers + missing-file table must match the
// live repo. Enforced in the integration tests so CI fails when stale.
export async function checkCoverage(repoDir) {
  const rel = 'README.md';
  const readme = path.join(repoDir, rel);
  const lines = (await readFile(readme, 'utf8')).split('\n');
  const secIdx = lines.findIndex((l) => l.startsWith('### 📊 Coverage'));
  if (secIdx === -1) return [`${rel}: missing '### 📊 Coverage' section`];

  const cov = await computeCoverage(repoDir);
  const want = renderCoverage(cov);
  const errors = [];

  // summary line: '<h1-ish> **Total...' — match by content
  const summaryLine = lines.find((l) => l.includes('**Total:') && l.includes('headings'));
  if (!summaryLine) {
    errors.push(`${rel}: Coverage summary line not found`);
  } else if (summaryLine.trim() !== want.summary) {
    errors.push(`${rel}: Coverage summary is stale — run 'npm run heading-coverage' (got '${summaryLine.trim()}')`);
  }

  const filesLine = lines.find((l) => l.startsWith('Files with headings missing an emoji'));
  if (filesLine && filesLine.trim() !== want.files) {
    errors.push(`${rel}: Coverage missing-files line is stale — run 'npm run heading-coverage'`);
  }

  // parse the table block right after the summary line
  const tblStart = lines.findIndex((l, i) => i > secIdx && l.trim() === '<!-- begin table -->');
  if (tblStart === -1) {
    errors.push(`${rel}: Coverage table not found`);
  } else {
    let tblEnd = -1;
    for (let i = tblStart + 1; i < lines.length; i++) {
      if (lines[i].trim() === '<!-- end table -->') { tblEnd = i; break; }
    }
    if (tblEnd === -1) {
      errors.push(`${rel}: Coverage table unclosed`);
    } else {
      const got = lines.slice(tblStart, tblEnd + 1).map((l) => l.trim());
      const wantTbl = want.table.map((l) => l.trim());
      if (got.join('\n') !== wantTbl.join('\n')) {
        errors.push(`${rel}: Coverage table is stale — run 'npm run heading-coverage'`);
      }
    }
  }

  return errors;
}
