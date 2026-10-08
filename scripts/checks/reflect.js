import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';

// Season files (`YYYY-*.md`) must cross-link the chain: every file except the
// earliest needs a `- Prior:` bullet, every file except the latest needs a
// `- Next:` bullet. Reciprocity is intentionally one-way (some `Prior:`
// links are narrative revisits, not strict predecessors).
export async function checkTimelineChain(repoDir) {
  const errors = [];
  const dir = path.join(repoDir, 'src', 'timeline');
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return errors;
  }
  const seasons = files
    .filter((f) => /^\d{4}-.+\.md$/.test(f))
    .map((f) => ({ file: f, year: +f.slice(0, 4) }));
  if (!seasons.length) return errors;
  const minYear = Math.min(...seasons.map((s) => s.year));
  const maxYear = Math.max(...seasons.map((s) => s.year));
  for (const s of seasons) {
    const rel = path.join('src', 'timeline', s.file);
    const md = await readFile(path.join(dir, s.file), 'utf8');
    const hasPrior = /^[-*]\s*Prior:\s*\[.*?\]\(\.\/\d{4}-[^)]+\.md\)/m.test(md);
    const hasNext = /^[-*]\s*Next:\s*\[.*?\]\(\.\/\d{4}-[^)]+\.md\)/m.test(md);
    if (s.year > minYear && !hasPrior) errors.push(`${rel}: missing "- Prior:" cross-link`);
    if (s.year < maxYear && !hasNext) errors.push(`${rel}: missing "- Next:" cross-link`);
  }
  return errors;
}
