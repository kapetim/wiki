import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { parseTables, clean } from '../shared/tables.js';

const EXPECTED = ['Song', 'Original', 'Type', 'Performer', 'Artist', 'Featuring', 'Context', 'Media', 'Album', 'Duration', 'Link'];
const DURATION = /^\d+:\d{2}(:\d{2})?$/;
const LINK = /^\[[^\]]*\]\(https?:\/\/[^)]+\)$/;
// Link column must be empty OR a markdown link — never a raw URL
const RAW_URL = /^https?:\/\/\S+$/;

export async function checkMusicTables(repoDir) {
  const errors = [];
  const root = path.join(repoDir, 'src', 'playlists', 'music');
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(repoDir, full);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.name.endsWith('.md') && e.name !== 'readme.md') {
        const md = await readFile(full, 'utf8');
        const tables = parseTables(md);
        let dataTables = 0;
        for (const t of tables) {
          const hdr = t[0].map((c) => clean(c));
          if (hdr[0] !== 'Song') continue;
          if (hdr.join('|') !== EXPECTED.join('|')) {
            errors.push(`${rel}: header ${hdr.join(' | ')} != ${EXPECTED.join(' | ')}`);
          }
          const hkey = hdr.join('|');
          const di = hdr.indexOf('Duration');
          const li = hdr.indexOf('Link');
          const data = t.slice(1);
          if (data.length) dataTables++;
          for (const r of data) {
            if (r.map((c) => clean(c)).join('|') === hkey) {
              errors.push(`${rel}: duplicate header row as first data row`);
            }
            const song = clean(r[0] || '');
            if (!song) {
              errors.push(`${rel}: empty Song cell in row`);
            }
            if (di >= 0) {
              const d = clean(r[di] || '');
              if (d && !DURATION.test(d)) {
                errors.push(`${rel}: bad duration "${d}" in row "${song}"`);
              }
            }
            if (li >= 0) {
              const link = clean(r[li] || '');
              if (link) {
                if (RAW_URL.test(link)) {
                  errors.push(`${rel}: raw URL in Link column (use [text](url)) for "${song}"`);
                } else if (!LINK.test(link)) {
                  errors.push(`${rel}: malformed Link "${link}" for "${song}"`);
                }
              }
            }
          }
        }
        if (dataTables > 1) errors.push(`${rel}: more than one data-bearing table`);
      }
    }
  }
  return errors;
}
