// Regenerate src/tasks views from scripts/data/tasks/*.json.
//   npm run tasks
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const here = import.meta.dirname;
const REPO = process.env.REPO_DIR || path.resolve(here, '..', '..');
const DATA = path.join(REPO, 'scripts', 'data', 'tasks');
const OUT = path.join(REPO, 'src', 'tasks');

const CATS = { government: '🏛️ Government', health: '🏥 Health', housekeeping: '🧹 Housekeeping' };
const TBL = '<!-- begin table -->';
const END = '<!-- end table -->';

export async function buildViews(repoDir = REPO) {
  const views = {};
  for (const [cat, heading] of Object.entries(CATS)) {
    let tasks;
    try { tasks = JSON.parse(await readFile(path.join(repoDir, 'scripts', 'data', 'tasks', `${cat}.json`), 'utf8')); }
    catch { continue; }
    const lines = [`# ${heading}`, '', '## 🗂️ Tasks', '', TBL,
      '| # | Task | Recurrence | Priority | Steps |', '| --- | --- | --- | --- | --- |'];
    tasks.forEach((t, i) => {
      const rec = `${t.recurrence} ×${t.interval}`;
      lines.push(`| ${i + 1} | ${t.title} | ${rec} | ${t.priority} | ${t.summary} |`);
    });
    lines.push(END, '');
    views[`src/tasks/${cat}.md`] = lines.join('\n');
  }
  return views;
}

export async function main() {
  const views = await buildViews();
  for (const [rel, text] of Object.entries(views)) {
    const p = path.join(REPO, rel);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, text);
  }
  console.log(`[tasks] wrote ${Object.keys(views).length} view(s)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
