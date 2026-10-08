// Regenerate every playlists view from the JSON source of truth (scripts/data/playlists).
// `buildViews` is shared with the sync check so a stale view fails CI.
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const here = import.meta.dirname;
const REPO = process.env.REPO_DIR || path.resolve(here, '..', '..');

const MOVIE_DOMAINS = ['action', 'comedy', 'crime', 'drama', 'fantasy', 'horror', 'sci_fi', 'thriller',
  'superhero', 'wizard', 'spiritism', 'stock_market', 'time_travel', 'rabbit_hole',
  'torture', 'survival', 'genius', 'revenge', 'serial_killer'];
const SERIES_DOMAINS = ['crime', 'sci_fi', 'drama', 'comedy', 'superhero', 'thriller'];
const TOPIC = { news: '📰', finance: '💰', tech: '💻', learning: '🔬', culture: '📜', sports: '⚽', health: '🩺' };
const TITLE = { sci_fi: 'Sci-Fi', stock_market: 'Stock Market', time_travel: 'Time Travel',
  rabbit_hole: 'Rabbit Hole', serial_killer: 'Serial Killer' };
const EMOJI = { drama: '🎭', crime: '🕵️', comedy: '😂', action: '💥', horror: '👻', sci_fi: '🛸',
  thriller: '🔪', fantasy: '🐉', superhero: '🦸', wizard: '🧙', spiritism: '🕯️', stock_market: '📈',
  time_travel: '⏳', rabbit_hole: '🐇', torture: '⛓️', survival: '🏕️', genius: '🧠', revenge: '🩸',
  serial_killer: '🔪' };
const SMALL = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'and', 'or', 'for', 'on', 'at', 'by', 'with', 'from', 'vs', 'x']);
const TBL = '<!-- begin table -->';
const END = '<!-- end table -->';

const sk = (s) => { const w = String(s).toLowerCase().split(/\s+/).filter(Boolean); while (w.length && SMALL.has(w[0])) w.shift(); return w.join(' '); };
const name = (d) => TITLE[d] || d.replace(/(^|_)([a-z])/g, (_, a, b) => a + b.toUpperCase()).replace(/_/g, ' ');

function render(h1, entries) {
  const groups = new Map();
  for (const e of entries) { if (!groups.has(e.franchise)) groups.set(e.franchise, []); groups.get(e.franchise).push(e); }
  const names = [...groups.keys()].sort((a, b) => (sk(a) < sk(b) ? -1 : 1));
  const out = [h1, '', '## 🧭 Index', '', TBL, '| Franchise | Entries |', '| --- | --- |'];
  for (const n of names) out.push(`| ${n} | ${groups.get(n).length} |`);
  out.push(END, '', '## ⏳ In progress', '', TBL, '| Franchise | Type | Next |', '| --- | --- |');
  for (const n of names) { const y = groups.get(n).find((e) => e.status === '🟡'); if (y) out.push(`| ${n} | ${y.type.startsWith('season') ? 'series' : 'film'} | ${y.title} |`); }
  out.push(END, '', '## 🔴 Not started', '', TBL, '| Franchise | Type | Next |', '| --- | --- |');
  for (const n of names) { const st = new Set(groups.get(n).map((e) => e.status)); if (!st.has('🟢') && !st.has('🟡')) { const f = groups.get(n)[0]; out.push(`| ${n} | ${f.type.startsWith('season') ? 'series' : (f.type === '—' ? '—' : 'film')} | ${f.title} |`); } }
  out.push(END, '', '## 📚 Catalog', '', TBL,
    '| # | Franchise | Title | Type | Year | Runtime | Rating | Verdict | Status |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  let i = 1;
  for (const n of names) for (const e of groups.get(n)) out.push(`| ${i++} | ${e.franchise} | ${e.title} | ${e.type} | ${e.year} | ${e.runtime} | ${e.rating} | ${e.verdict} | ${e.status} |`);
  out.push(END, '');
  return out.join('\n');
}

export async function buildViews(repoDir = REPO) {
  const DATA = path.join(repoDir, 'scripts', 'data', 'playlists');
  const load = async (f) => JSON.parse(await readFile(path.join(DATA, f), 'utf8'));
  const movies = await load('movies.json');
  const series = await load('series.json');
  const views = {};
  for (const d of MOVIE_DOMAINS) {
    const es = movies.filter((e) => e.domains.includes(d));
    if (es.length) views[`src/playlists/entertainment/movies/${d}.md`] = render(`# ${EMOJI[d] || '🎬'} ${name(d)}`, es);
  }
  for (const region of ['west', 'east']) {
    const es = movies.filter((e) => e.region === region);
    if (es.length) views[`src/playlists/entertainment/movies/animation/${region}.md`] = render(`# 🎞️ Animation — ${region}`, es);
  }
  for (const d of SERIES_DOMAINS) {
    const es = series.filter((e) => e.domains.includes(d));
    if (es.length) views[`src/playlists/entertainment/series/${d}.md`] = render(`# ${EMOJI[d] || '📺'} ${name(d)}`, es);
  }
  for (const region of ['west', 'east']) {
    const es = series.filter((e) => e.region === region);
    if (es.length) views[`src/playlists/entertainment/series/animation/${region}.md`] = render(`# 🎞️ Animation — ${region}`, es);
  }
  const podcasts = await load('podcasts.json');
  for (const topic of Object.keys(TOPIC)) {
    const ps = podcasts.filter((p) => p.topics.includes(topic)).sort((a, b) => a.name.localeCompare(b.name));
    if (!ps.length) continue;
    const lines = [`# ${TOPIC[topic]} ${name(topic)}`, '',
      `**What this is:** ${topic} content — starting with podcasts.`, '',
      '## 🎙️ Podcasts', '', TBL, '| Podcast | Subs | Avg | Find on |', '| --- | --- | --- | --- |'];
    for (const p of ps) lines.push(`| ${p.name} | ${p.subs || '—'} | ${p.avg} | ${p.link ? `[${p.name}](${p.link})` : '—'} |`);
    lines.push(END, '');
    views[`src/playlists/${topic}/readme.md`] = lines.join('\n');
  }
  // prose+table pages (music / audiobooks / sounds / games)
  for (const file of ['music', 'audiobooks', 'sounds', 'games']) {
    for (const pg of await load(`${file}.json`)) {
      views[pg.path] = pg.blocks.map((b) => (b.table
        ? ['<!-- begin table -->', ...b.table, '<!-- end table -->'].join('\n')
        : b.md)).join('\n');
    }
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
  console.log(`[playlists] wrote ${Object.keys(views).length} view(s)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
