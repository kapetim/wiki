// Table conventions for src/ — every table is wrapped in
// <!-- begin table --> / <!-- end table --> markers.

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { walkMd } from '../shared/md-walk.js';
import { fragment } from '../shared/fragments.js';

const DELIMITER = /^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|$/;
const FENCE_RE = /^\s*(```+|~~~+)/;
const BEGIN = '<!-- begin table -->';
const END = '<!-- end table -->';
// Marker-lookalike — an HTML-comment mentioning begin/end table that isn't exact.
const MARKER_LIKE = /<!--\s*(begin|end)\s+table/i;

// A row that starts and ends with a pipe and holds at least two cells (a
// header/data row), as opposed to a bare delimiter or a single-cell line.
function isTableRow(s) {
  if (!s.startsWith('|') || !s.endsWith('|')) return false;
  if (DELIMITER.test(s)) return false;
  const body = s.replace(/^\|/, '').replace(/\|$/, '');
  return body.split(/(?<!\\)\|/).length >= 2;
}

export async function checkTables(repoDir) {
  const errors = [];
  const files = await walkMd(repoDir);

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    const lines = (await readFile(f, 'utf8')).split('\n');
    let depth = 0;
    let inCode = false;
    let sawHeader = false;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const s = raw.trim();
      if (FENCE_RE.test(raw)) {
        inCode = !inCode;
        continue;
      }
      if (inCode) continue;
      if (s === BEGIN) {
        if (depth > 0) errors.push(`${rel}:${i + 1} nested begin table marker`);
        depth++;
        sawHeader = false;
        continue;
      }
      if (s === END) {
        if (depth === 0) {
          errors.push(`${rel}:${i + 1} end table without begin`);
        } else {
          if (!sawHeader) errors.push(`${rel}:${i + 1} empty table block (no header row)`);
          depth--;
        }
        continue;
      }
      if (depth > 0) {
        if (isTableRow(s)) sawHeader = true;
        continue;
      }
      // outside any block — any table-looking line must be wrapped
      if (DELIMITER.test(s)) {
        errors.push(`${rel}:${i + 1} table not wrapped in begin/end markers`);
      } else if (isTableRow(s)) {
        errors.push(`${rel}:${i + 1} table row not wrapped in begin/end markers`);
      } else if (MARKER_LIKE.test(s)) {
        errors.push(`${rel}:${i + 1} malformed table marker (must be exactly '${BEGIN}' / '${END}')`);
      }
    }
    if (depth !== 0) errors.push(`${rel}: ${depth} unclosed begin table marker(s)`);
  }

  return errors;
}

// Table cell length — a row's line can be under the MD013 line limit while a
// single cell runs far past a sane reading width. Every cell inside a
// begin/end block is checked against CELL_LIMIT on its *rendered* text
// (markdown syntax stripped: `[abc](url)` counts as `abc`, `**bold**` as
// `bold`). Micromark is markdownlint's parser, so the render matches.
import { micromark } from 'micromark';

const CELL_LIMIT = 99;

function renderedLength(cell) {
  const html = micromark(cell, { allowDangerousHtml: true });
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
  return [...text.trim()].length; // code-point aware (emoji = 1)
}

export function checkCellLengths(content, rel) {
  const errors = [];
  const lines = content.split('\n');
  let inTable = false;
  let inCode = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const s = raw.trim();
    if (FENCE_RE.test(raw)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (s === BEGIN) { inTable = true; continue; }
    if (s === END) { inTable = false; continue; }
    if (!inTable) continue;
    if (DELIMITER.test(s)) continue;
    const body = s.replace(/^\|/, '').replace(/\|$/, '');
    const cells = body.split(/(?<!\\)\|/);
    for (let c = 0; c < cells.length; c++) {
      const len = renderedLength(cells[c]);
      if (len > CELL_LIMIT) {
        errors.push(`${rel}:${i + 1} table cell #${c + 1} renders to ${len} chars (exceeds ${CELL_LIMIT})`);
      }
    }
  }
  return errors;
}

export async function checkTableCells(repoDir) {
  const errors = [];
  const files = await walkMd(repoDir);

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    errors.push(...checkCellLengths(await readFile(f, 'utf8'), rel));
  }

  return errors;
}

// Table column manifest — scripts/config/table-columns.json maps each file to the
// column count of every <!-- begin table --> block, in order. The gate enforces
// that the live tables match the manifest exactly (missing / extra / mismatch).
const MANIFEST = path.join('scripts', 'config', 'table-columns.json');

export async function checkTableColumns(repoDir) {
  const errors = [];
  const manifestPath = path.join(repoDir, MANIFEST);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return [`${MANIFEST}: missing or invalid — run node scripts/tools/generate-table-columns.js`];
  }

  const files = await walkMd(repoDir);
  const extra = new Set(Object.keys(manifest));

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    const lines = (await readFile(f, 'utf8')).split('\n');
    const counts = [];
    let inTable = false;
    let inCode = false;
    let startLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].trim();
      if (FENCE_RE.test(lines[i])) {
        inCode = !inCode;
        continue;
      }
      if (inCode) continue;
      if (s === '<!-- begin table -->') {
        inTable = true;
        startLine = i + 1;
        continue;
      }
      if (s === '<!-- end table -->') {
        inTable = false;
        continue;
      }
      if (!inTable) continue;
      if (DELIMITER.test(s)) continue;
      const body = s.replace(/^\|/, '').replace(/\|$/, '');
      counts.push({ cols: body.split(/(?<!\\)\|/).length, line: startLine });
      inTable = false; // only the header row defines the column count
    }

    if (!counts.length) continue;
    extra.delete(rel);

    const expected = manifest[rel];
    if (!expected) {
      errors.push(`${rel}: table columns not in ${MANIFEST} — run node scripts/tools/generate-table-columns.js`);
      continue;
    }
    if (counts.length !== expected.length) {
      errors.push(`${rel}: ${MANIFEST} lists ${expected.length} table(s) but file has ${counts.length}`);
    }
    const n = Math.min(counts.length, expected.length);
    for (let i = 0; i < n; i++) {
      if (counts[i].cols !== expected[i]) {
        errors.push(`${rel}:${counts[i].line} table ${i + 1} must have ${expected[i]} columns (got ${counts[i].cols})`);
      }
    }
  }

  for (const rel of extra) {
    errors.push(`${rel}: listed in ${MANIFEST} but has no tables`);
  }

  return errors;
}

// Per-folder heading templates — the stable, convention-wide shape each
// document must start with. Enforced in addition to markdownlint's MD041
// (file starts with an H1) and MD043 (exactly one H1).
//   - every file: H1 starts with an emoji
//   - accounts/*.md: H1 then `## 🧭 Index` (per-account nav)
//   - interpretations/lore/*.md (series summaries): H1 then `## 📊 Metadata`
//   - interpretations/lore/naruto/*.md (except readme): H1 then a
//     `**What this is:**` line
const EMOJI_HEADING_RE = /^#[^\S\n]*\P{ASCII}/u;
const LORE_META = '## 📊 Metadata';
const WHAT_THIS_IS = '**What this is:**';
const ACCOUNTS_INDEX = '## 🧭 Index';

export async function checkHeadingTemplates(repoDir) {
  const errors = [];
  const files = await walkMd(repoDir);

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    const lines = (await readFile(f, 'utf8')).split('\n');
    const h1 = lines.findIndex((l) => /^#{1}\s+\S/.test(l.trim()));
    if (h1 === -1) continue; // missing H1 is markdownlint MD041's job
    const first = lines[h1].trim();

    if (!EMOJI_HEADING_RE.test(first)) {
      errors.push(`${rel}:${h1 + 1} heading must start with an emoji`);
    }

    if (rel.startsWith('src/accounts/')) {
      const h2 = lines.slice(h1 + 1).findIndex((l) => /^#{2}\s+\S/.test(l.trim()));
      const second = h2 === -1 ? null : lines[h1 + 1 + h2].trim();
      if (second !== ACCOUNTS_INDEX) {
        errors.push(`${rel}:${h1 + 1} accounts file must have '${ACCOUNTS_INDEX}' as its second heading (got ${second ? `'${second}'` : 'none'})`);
      }
    }

    if (rel.startsWith('src/interpretations/lore/') && !rel.endsWith('readme.md') && !rel.includes('/lore/naruto/')) {
      const h2 = lines.slice(h1 + 1).findIndex((l) => /^#{2}\s+\S/.test(l.trim()));
      const second = h2 === -1 ? null : lines[h1 + 1 + h2].trim();
      if (second !== LORE_META) {
        errors.push(`${rel}:${h1 + 1} lore summary must have '${LORE_META}' as its second heading (got ${second ? `'${second}'` : 'none'})`);
      }
    }

    if (rel.startsWith('src/interpretations/lore/naruto/') && !rel.endsWith('readme.md')) {
      if (!lines.some((l) => l.includes(WHAT_THIS_IS))) {
        errors.push(`${rel} naruto subfile must contain a '${WHAT_THIS_IS}' line`);
      }
    }
  }

  return errors;
}

// Every heading at any level (H1–H6) must start with an emoji (a non-ASCII
// symbol), matching the repo-wide convention. Fence-aware so headings inside
// code blocks are ignored.
export async function checkHeadingEmoji(repoDir) {
  const errors = [];
  const files = await walkMd(repoDir);
  const HEADING_ANY = /^#{1,6}\s+(\S)/;

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    const lines = (await readFile(f, 'utf8')).split('\n');
    let inCode = false;
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (FENCE_RE.test(raw)) { inCode = !inCode; continue; }
      if (inCode) continue;
      const m = raw.match(HEADING_ANY);
      if (!m) continue;
      if (/\P{ASCII}/u.test(m[1])) continue; // first char is a non-ASCII symbol/emoji
      errors.push(`${rel}:${i + 1} heading must start with an emoji`);
    }
  }

  return errors;
}

// GitHub-fragment uniqueness — headings that normalize to the same fragment
// within a file collide (e.g. `#team-7` vs `#team-7-1`), making links
// ambiguous. Uses the same fragment algorithm as markdownlint MD051.
const HEADING_RE = /^#{1,6}\s+(.+)$/;

export async function checkHeadingSlugs(repoDir) {
  const errors = [];
  const files = await walkMd(repoDir);

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    const lines = (await readFile(f, 'utf8')).split('\n');
    const seen = new Map();
    let inCode = false;
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].trim();
      if (FENCE_RE.test(s)) { inCode = !inCode; continue; }
      if (inCode) continue;
      const m = s.match(HEADING_RE);
      if (!m) continue;
      const slug = fragment(m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'));
      if (!slug) continue;
      const prev = seen.get(slug);
      if (prev !== undefined) {
        errors.push(`${rel}:${i + 1} duplicate heading fragment "${slug}" (also at line ${prev})`);
      } else {
        seen.set(slug, i + 1);
      }
    }
  }

  return errors;
}
