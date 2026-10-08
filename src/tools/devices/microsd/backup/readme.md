# 💾 backup

**What this is:** personal archives — the vault and the public repo backups, one zip per day. The global card rules are in the [card readme](../readme.md).

## 🗂️ Layout

```text
backup/
├── private/              the vault — one zip per day
├── public/<n>_<repo>/    one folder per public repo
└── <repo>/issues/        the open-issue snapshot
```

## 📐 Rules

- One folder per repo under `public/`, named `<n>_<repo>`, with a stable single-digit id; never renumber.
- One file per day per repo: `<repo>_<yyyy-mm-dd>.zip`; the date is the archive day, not the write time.
- The vault is a single stream: `private_<yyyy-mm-dd>.zip`.
- Never overwrite — if a file exists, stop and resolve it by hand.
- The `issues/` snapshot is rebuilt on every update.

## 🧮 Budget

Soft cap 2 GB for the whole folder — exceeding it flags the folder; trim or prune.
