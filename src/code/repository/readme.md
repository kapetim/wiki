# 🗄️ Organize repositories

**What this is:** the shape every repo shares — folders, language split, one image, and checks that fail closed.

## 📁 Layout

<!-- begin table -->
| Part | Holds |
| --- | --- |
| `src/` | records — the content, one concern per file |
| `scripts/` | tooling — a thin caller plus a tiny Go import |
| `docs/` | architecture and usage |
| GitHub Actions | CI workflows |
| Dockerfile | the repo's image(s) |
<!-- end table -->

## 🧭 One concern per repo

One responsibility per repository; cross-repo automation lives in its own repo.

## 🐹 Language split

Go owns anything that touches files; shell stays a thin caller that orchestrates external tools. See [scripts.md](scripts.md).

## 🧪 Checks fail closed

Every repo ships its own validators (structure · content · links · records) and mirrors them in CI.

## 🖼️ One image per repo

Its own devcontainer and Docker stages; nothing shared by accident.

## 💾 Backups

Archives follow [../backup.md](../backup.md).

## 🔗 Related

- [../issue/readme.md](../issue/readme.md) — organizing issues
- [improvement.md](improvement.md) — improving a repo
