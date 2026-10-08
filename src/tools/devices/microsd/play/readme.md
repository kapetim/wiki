# 🎮 play

**What this is:** the playable games — the ROMs/ISOs and the emulators that run them. Watchable longplays live in [watch/](../watch/readme.md); the global card rules are in the [card readme](../readme.md).

## 🗂️ Layout

```text
play/
├── roms/<brand>/<console>/   playable ROMs / ISOs
└── emulators/                installers and portable builds
```

## 🧭 Index

<!-- begin table -->
| Folder | What |
| --- | --- |
| `roms/` | Playable ROMs/ISOs, by brand and console |
| `emulators/` | Emulator installers and portable builds |
<!-- end table -->

## 📐 Scope

- Platforms: PlayStation 1/2 + PSP, Nintendo NES through GameCube (GB/GBC/GBA), Sega Genesis, and original Xbox.
- Out of scope: PS3 and newer, Xbox 360 and newer, Wii U/Switch, Sega Saturn, and dual-screen handhelds.
- Xbox games stay extracted — `<game>/default.xbe` plus data, not archives.
- Original over remake; prefer the best in-scope version; prefer the USA region.

## 🏷️ Naming

- One game per row; paired versions (for example Red & Blue) are grouped.
- Native dump extension only — never `.zip`/`.7z`.
