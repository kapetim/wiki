// Ordering rules for the movies tree (`src/playlists/performers` +
// `src/playlists/animation`): the four template tables appear in a fixed order,
// their rows are alphabetically sorted by franchise, and the Catalog groups
// franchises alphabetically.
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { walkMd } from '../shared/md-walk.js';

const SMALL = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'and', 'or', 'for', 'on', 'at', 'by', 'with', 'from', 'vs', 'x']);

function sortKey(s) {
  const w = String(s).toLowerCase().split(/\s+/).filter(Boolean);
  while (w.length && SMALL.has(w[0])) w.shift();
  return w.join(' ');
}

function tables(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const s = raw.trim();
    if (s === '<!-- begin table -->') { cur = []; continue; }
    if (s === '<!-- end table -->') { if (cur) out.push(cur); cur = null; continue; }
    if (cur && s.startsWith('|')) {
      if (/^\|[\s:|-]+\|$/.test(s)) continue;
      cur.push(s.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    }
  }
  return out;
}

function isSorted(rows, idx) {
  for (let i = 1; i < rows.length; i++) {
    if (sortKey(rows[i][idx]) < sortKey(rows[i - 1][idx])) return false;
  }
  return true;
}

export async function checkOrder(repoDir) {
  const errors = [];
  const roots = ["src/playlists/entertainment/movies", "src/playlists/entertainment/series"];
  const files = (await walkMd(repoDir)).filter((f) => {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    return roots.some((r) => rel.startsWith(`${r}/`)) && !rel.endsWith('readme.md');
  });

  for (const f of files) {
    const rel = path.relative(repoDir, f).split(path.sep).join('/');
    const ts = tables(await readFile(f, 'utf8'));
    const headers = ts.map((t) => t[0].join('|'));
    const idx = headers.indexOf('Franchise|Entries');
    const shorts = headers.map((h, i) => (h === 'Franchise|Type|Next' ? i : -1)).filter((i) => i >= 0);
    const cat = headers.findIndex((h) => h.includes('Franchise') && h.includes('Status'));

    if (idx < 0 || shorts.length < 2 || cat < 0) {
      errors.push(`${rel}: missing one of the four template tables (Index · In progress · Not started · Catalog)`);
      continue;
    }
    const [ip, ns] = shorts;
    if (!(idx < ip && ip < ns && ns < cat)) errors.push(`${rel}: template tables out of order`);
    if (!isSorted(ts[idx].slice(1), 0)) errors.push(`${rel}: Index rows not alphabetical`);
    if (!isSorted(ts[ip].slice(1), 0)) errors.push(`${rel}: In progress rows not alphabetical`);
    if (!isSorted(ts[ns].slice(1), 0)) errors.push(`${rel}: Not started rows not alphabetical`);

    const seen = new Set();
    const franchises = [];
    for (const r of ts[cat].slice(1)) {
      if (!seen.has(r[1])) { seen.add(r[1]); franchises.push(r[1]); }
    }
    if (!isSorted(franchises.map((x) => [x]), 0)) errors.push(`${rel}: Catalog franchises not alphabetical`);
  }
  return errors;
}
