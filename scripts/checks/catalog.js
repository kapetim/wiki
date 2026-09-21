import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { parseTables, clean } from '../shared/tables.js';
import { approx } from '../shared/numbers.js';

const CATALOG_DIR = ['src', 'playlists'];
const STATUS_OK = new Set(['🟢', '🟡', '🔴', '✅', '⏳', '']);

// tv-series: Episodes × Avg Duration = Total Duration (kept for legacy data)
function toMin(s) {
  s = String(s).replace(/,/g, '').trim();
  const hm = s.match(/(\d+)h(\d+)m/);
  if (hm) return +hm[1] * 60 + +hm[2];
  const h = s.match(/(\d+)h/);
  if (h) return +h[1] * 60;
  const m = s.match(/(\d+)m/);
  if (m) return +m[1];
  return null;
}

function epCount(s) {
  const m = String(s).match(/^(\d+)/);
  return m ? +m[1] : null;
}

function avgDur(s) {
  const m = String(s).match(/(\d+)m/);
  return m ? +m[1] : null;
}

// Watch catalog files: series/cartoon.md + series/anime.md + series/live-action.md. Validates:
//  - movie queue `#` sequential
//  - franchise `#` ascending + unique
//  - Status column values (🟢/🟡/🔴/✅/⏳/blank)
//  - series Episodes × Avg Duration = Total Duration (where those columns exist)
const WATCH_FILES = [
  path.join('series', 'cartoon.md'),
  path.join('series', 'anime.md'),
  path.join('series', 'live-action.md'),
];

export async function checkCatalog(repoDir) {
  const errors = [];
  const watch = path.join(repoDir, ...CATALOG_DIR);

  for (const fn of WATCH_FILES) {
    const rel = path.join(...CATALOG_DIR, fn);
    let md;
    try {
      md = await readFile(path.join(watch, fn), 'utf8');
    } catch {
      continue;
    }

    for (const t of parseTables(md)) {
      const hdr = t[0];

      // --- status column values ---
      const statusIdx = hdr.findIndex((h) => clean(h).toLowerCase() === 'status');
      if (statusIdx !== -1) {
        for (const r of t.slice(1)) {
          const v = clean(r[statusIdx] || '');
          if (!STATUS_OK.has(v)) {
            errors.push(`${rel}: invalid Status "${v}" (expect 🟢/🟡/🔴/✅/⏳)`);
          }
        }
      }

      // --- series duration cross-check (legacy column set) ---
      const ei = hdr.indexOf('Episodes');
      const di = hdr.indexOf('Avg Duration');
      const ti = hdr.indexOf('Total Duration');
      if (ei >= 0 && di >= 0 && ti >= 0) {
        for (const r of t.slice(1)) {
          const n = epCount(r[ei]);
          const avg = avgDur(r[di]);
          const tot = toMin(r[ti]);
          if (n === null || avg === null || tot === null) continue;
          const exp = n * avg;
          if (!approx(exp, tot)) {
            errors.push(`${rel}: "${r[0]}" total ${r[ti]} != ${n} × ${avg}m = ${exp}m`);
          }
        }
      }

      // --- movie queue `#` sequential (no Path column, no Status → queue) ---
      if (hdr.includes('IMDb') && !hdr.includes('Path') && !hdr.includes('Status')) {
        let expect = 1;
        for (const r of t.slice(1)) {
          const n = parseInt(r[0], 10);
          if (!Number.isNaN(n) && n !== expect) {
            errors.push(`${rel}: queue "#" ${r[0]} != ${expect} (${r[1] || ''})`);
          }
          expect++;
        }
      }

      // --- franchise `#` ascending + unique (has Path or # + Title) ---
      if (hdr.includes('Path') || (hdr.includes('#') && hdr.includes('Title'))) {
        let prev = null;
        const seen = new Set();
        for (const r of t.slice(1)) {
          const n = parseInt(r[0], 10);
          if (Number.isNaN(n)) continue;
          if (seen.has(n)) errors.push(`${rel}: franchise duplicate # ${n} (${r[1] || ''})`);
          seen.add(n);
          if (prev !== null && n < prev) {
            errors.push(`${rel}: franchise # ${n} (${r[1] || ''}) after # ${prev} — not ascending`);
          }
          prev = n;
        }
      }
    }
  }

  return errors;
}
