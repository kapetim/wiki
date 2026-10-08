# 💾 Repository backup methodology

**What this is:** how the repos are backed up — a lean, capacity-pruned archive of every published tag, kept on USB with cloud copies.

## 📦 The unit

- **One archive per repo per published tag/day**: `<repo>_<yyyy-mm-dd>.zip`; the private vault stays encrypted as `private_<yyyy-mm-dd>.zip`.
- **One file per day per repo**, ISO date only, no prefix — and **never overwrite** (refuse and flag instead).
- A repo is backed up only against a **published tag**: if there are commits since the last tag, tag HEAD first, publish it, then archive.

## 📏 Size base and caps

Decimal units (1 GB = 1000 MB). The **total cap is 3 GB**, and per-repo caps guard against mistakes. The profile status table tracks each repo's size (GitHub object size — Git LFS content excluded):

<!-- begin table -->
| Repo type | Cap | Shape |
| --- | --- | --- |
| Code-only (most repos) | ~1 MB | zip |
| Private vault | ~50 MB | encrypted zip |
| UI assets (`ui-assets`) | uncapped | JSON tree manifest (file list + sizes/hashes), never the zipped content |
<!-- end table -->

## ♻️ Retention and pruning

- **Retention is indefinite** — keep every tag; the newest is prioritized.
- **Prune only on capacity** — when the total exceeds the cap, delete the **oldest archives first**, never the latest tag of a repo.

## 🔁 Flow

1. Build the archives (zips, or the assets JSON tree).
2. Copy to the USB pendrive — the primary, reliable copy.
3. Upload to the drives (Google Drive · OneDrive · Proton) as cold copies.
4. Verify size and hash on every destination.

## 🔎 Restore

Pull the archive, verify its hash, then extract.
