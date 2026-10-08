// Regenerate src/consumables views from scripts/data/consumables/*.json.
//   npm run consumables
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const here = import.meta.dirname;
const REPO = process.env.REPO_DIR || path.resolve(here, '..', '..');
const TBL = '<!-- begin table -->';
const END = '<!-- end table -->';

const DOMAINS = {
  grocery: { title: '🛒 Grocery', order: ['fruits', 'protein', 'greens', 'vegetables'],
    emoji: { fruits: '🍎', protein: '🥩', greens: '🥬', vegetables: '🥕' } },
  pharmacy: { title: '💊 Pharmacy', order: ['supplements', 'regulars', 'on-call'],
    emoji: { supplements: '💊', regulars: '💧', 'on-call': '🧴' } },
  household: { title: '🧼 Household', order: ['cleaning', 'hygiene'],
    emoji: { cleaning: '🧹', hygiene: '🧼' } },
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export async function buildViews(repoDir = REPO) {
  const views = {};
  for (const [dom, spec] of Object.entries(DOMAINS)) {
    let items;
    try { items = JSON.parse(await readFile(path.join(repoDir, 'scripts', 'data', 'consumables', `${dom}.json`), 'utf8')); }
    catch { continue; }
    const lines = [`# ${spec.title}`, ''];
    for (const section of spec.order) {
      lines.push(`## ${spec.emoji[section] || '•'} ${cap(section)}`, '', TBL,
        '| # | Item | Note |', '| --- | --- | --- |');
      items.filter((i) => i.section === section).forEach((it, i) => {
        lines.push(`| ${i + 1} | ${it.name} | ${it.note || '—'} |`);
      });
      lines.push(END, '');
    }
    views[`src/consumables/${dom}.md`] = lines.join('\n');
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
  console.log(`[consumables] wrote ${Object.keys(views).length} view(s)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
