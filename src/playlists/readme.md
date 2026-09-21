# 🎬 Playlists

**Eyes + ears — what you watch and listen to.** Media you consume, cataloged by type. Every content file is **data tables only** — the templates, columns, and rules for each type live in this readme.

## 🗂️ Contents

- `series/` — cartoon, anime, and live-action series, watched online. See [📺 Series](#-series).
- `audiobooks/` — finished and queued audiobooks. See [🎧 Audiobooks](#-audiobooks).
- `music/` — the music library (standard, remix, instrumental, soundtrack, live, cover). See [🎵 Music](#-music).
- `podcasts/` — podcast queues, one file per language. See [🎙️ Podcasts](#%EF%B8%8F-podcasts).
- `sounds/` — background soundscapes and noise. See [🔊 Sounds](#-sounds).

## 🧱 Shared rules

Every content file starts with its `# <H1>` and then its data tables. Each registry file carries a **`## 😖 Didn't like`** table as its first data block:

<!-- begin table -->
| Title | Why disliked |
| --- | --- |
<!-- end table -->

Tables are wrapped in begin/end-table comment markers (one per line, nothing else). The **Status** marker is 🟢 watched · 🟡 in progress · 🔴 not started.

## 📺 Series

Three files: `series/cartoon.md`, `series/anime.md`, `series/live-action.md`. One `## 📺 <name>` section per series (anime also lists a `Didn't like` set on top), each with a `> ~Xh total` note and one table:

<!-- begin table -->
| Season | Year | Episodes | Runtime | Rating | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | 2005 | 13 | 4h46m | 7.8 👍 | 🟢 | — |
<!-- end table -->

Rules:

- One row per season; very long shows use era rows instead (e.g. `Classic (S1–8)`, `Water`).
- **Year** — release year(s). **Episodes** / **Runtime** use `~` where approximate.
- **Rating** — 0–10 consensus plus a tier: `👍` ≥ 7 · `😐` 5–6.9 · `👎` < 5. `—` until filled.
- **Status** — 🟢 watched · 🟡 in progress · 🔴 not started.
- **Notes** — interpretation link (`../../interpretations/lore/…`) or note.

## 🎧 Audiobooks

`audiobooks/finished.md` and `audiobooks/queue.md`. Finished book rows:

<!-- begin table -->
| Book | Author | Length | Finished | Rating | Notes |
| --- | --- | --- | --- | --- | --- |
<!-- end table -->

The queue file has an `In progress` section and a `Waiting` section:

<!-- begin table -->
| Book | Author | Started | Last position | % Remaining | Time left |
| --- | --- | --- | --- | --- | --- |
<!-- end table -->

<!-- begin table -->
| Book | Author | Length | Why |
| --- | --- | --- | --- |
<!-- end table -->

## 🎵 Music

The music library is **audio-only** — watch it on screen or just listen. Organized by folders; each content file holds one `## 📝 Suggestions` table:

<!-- begin table -->
| Song | Original | Type | Performer | Artist | Featuring | Context | Media | Album | Duration | Link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
<!-- end table -->

Folders:

- `standard/` — **standard songs**, plain studio recordings (genre-organized)
- `remix/` — remixes & production variants (slowed+reverb, fast, bass-boosted, edits)
- `instrumental/` — non-vocal music, no lyrics
- `soundtrack/` — videogames / movies / tv-series OSTs
- `live/` — live & orchestral (original band out of the studio)
- `cover/` — anyone but the original band performing a song

Where does a song go?

1. Original band, studio track → `standard/`
2. Remix / slowed+reverb / fast / boosted / edit → `remix/`
3. Non-vocal, no lyrics → `instrumental/`
4. Soundtrack → `soundtrack/`
5. Original band performing out of the studio → `live/`
6. Anyone but the original band → `cover/`

> **Live-vs-cover rule:** if at least one official member of the original band performs → `live/`; otherwise → `cover/`.

- Original band live → `live/live.md` · unplugged/acoustic → `live/acoustic.md` · orchestral (band-agnostic) → `live/orchestra.md`
- No original member → `cover/` (organized by instrument: guitar, piano, bass, drums, flute, harmonica, ukulele, vocal, other)

Sub-folder rules:

- `soundtrack/videogames/` · `soundtrack/movies/` · `soundtrack/tv-series/` — by media type
- `instrumental/chill.md` · `instrumental/dance.md` · `instrumental/dark.md` — by style

## 🎙️ Podcasts

**Ears first** — the core of a podcast is the message being heard. Files: `english.md`, `portuguese.md`, `spanish.md`. Each waiting list is ranked by approximate reach within its language, split by domain:

<!-- begin table -->
| Podcast | Subs | Avg | Find on |
| --- | --- | --- | --- |
<!-- end table -->

(`Subs` may be omitted where not tracked.)

Language strategy:

- **Portuguese** — informal, mundane, gossip, comedy, male-hosted general content, Brazilian finance
- **English** — technical, formal, serious (tech, finance, news, science, history, interviews, philosophy)
- **Spanish** — very famous LATAM shows only

## 🔊 Sounds

Background soundscapes and noise for patience / focus. Just listen — no screen needed. One row per video:

<!-- begin table -->
| Title | Duration | Channel | Link |
| --- | --- | --- | --- |
<!-- end table -->

- `natural.md` — natural sources (water, weather, forest) — you can see the source
- `tools.md` — machine-made noise (fan, appliances) — you can't see the source
- `colors.md` — generated noise colors (white, pink, brown)
