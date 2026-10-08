# 👀 watch

**What this is:** everything with a screen — films, series, and internet video. Audio-only lives in [listen/](../listen/readme.md); the global card rules are in the [card readme](../readme.md).

## 🗂️ Layout

```text
watch/
├── movies/    films — animation and live-action by genre
├── series/    studio TV
└── youtube/   non-studio — stand-up, fan series, nature, game longplays
```

## 🧭 Index

<!-- begin table -->
| Folder | What |
| --- | --- |
| `movies/` | Films — animated features plus live-action by genre and theme |
| `series/` | Studio TV shows |
| `youtube/` | Non-studio and internet video |
<!-- end table -->

## 📐 Rules

- Bitrate: every file at or above 0.25 Mbps; re-encode toward 1.0 Mbps.
- Audio: keep only the original-language main track.
- Subtitles: PT/EN audio carries none; another language keeps its original audio plus an English subtitle.

## 🏷️ Naming

- A film is `<title>-<year>.<ext>`.
- A series episode is `<show>_s01eNN.<ext>` under its series folder.
