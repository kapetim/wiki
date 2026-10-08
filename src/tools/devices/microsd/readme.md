# 📦 microSD

**What this is:** the offline card — one removable volume that holds the playable games, the watch library, the audio, and the personal backup. Everything here is downloaded straight onto the card; none of it lives in a repository.

## 🗂️ Layout

```text
/
├── play/      playable games — ROMs/ISOs and the emulators that run them
├── watch/     all watchable media — movies · series · youtube
├── listen/    audio only — soundscapes · music
└── backup/    personal files — dated zips
```

## 🧭 Index

<!-- begin table -->
| Folder | What |
| --- | --- |
| [play/](play/readme.md) | Playable games — ROMs and the emulators that run them |
| [watch/](watch/readme.md) | Everything with a screen — films, series, and internet video |
| [listen/](listen/readme.md) | Audio only — soundscapes and music |
| [backup/](backup/readme.md) | Personal archives — the vault and the repo backups |
<!-- end table -->

## 📐 Rules

### 🗂️ Medium

- The card is a plain LUKS-encrypted ext4 volume — no 4 GB file cap.
- Keep output lean (~1 Mbps ≈ 900 MB per 2 h).

### 🏷️ Naming

- A film is `<title>-<year>.<ext>`; a series episode is `<show>_s01eNN.<ext>` under its series folder.
- Lowercase; spaces and dots become underscores; keep the `-yyyy`; strip release tags; drop a leading article; use an `NNN_` prefix for sequences.

### 🚫 Released-only

- A file must be a publicly released title: `year` between 1888 and the current year. Future, prerelease, or CAM leaks are rejected.

### 🧷 Keep, don't delete

- Off-spec or uncertain files are never deleted — mark the problem and keep the file.
- Corrupt or unreadable → delete the bad file and leave a re-download note.
- Missing on disk → keep the note and re-download.

## 🧮 Budget

Soft caps per folder (GB, decimal) — exceeding one flags the folder; trim or prune.

<!-- begin table -->
| Folder | Soft cap |
| --- | --- |
| `play/roms/` | 130 GB |
| `play/emulators/` | 2 GB |
| `watch/` | 300 GB |
| `listen/` | 30 GB |
| `backup/` | 2 GB |
| total | 464 GB |
<!-- end table -->

## 🔁 Sync flow

- Download to the card root, probe it, then move and rename it onto its target path.
- Bring anything over the bitrate goal toward 1.0 Mbps; keep the result lean.
