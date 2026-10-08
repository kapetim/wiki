# 🧹 Cleanup after mess

**What this is:** recovering after a wrong push, a leaked file, or a damaged history — and resetting a repo to a
clean slate. **Metaphor only** — nothing here is a guarantee.

## 🚑 Stop the bleeding

Before rewriting anything, contain the damage:

- **Rotate** any credential or token that may have been exposed.
- **Make the repo private** if the content is still live and must not be seen.
- **Assess scope** — which commits, which files, which collaborators or forks.

## 🧼 Clean-slate runbook

The blunt path: start the repo over.

1. **Export** what must survive — issues (`gh issue list --json`), labels, description.
2. **Delete** the repository.
3. **Recreate** it fresh, then re-push the current tree.
4. **Re-tag and release** the tip.

Cheap when the repo has no stars or forks — the history is simply gone.

## ✂️ Surgical rewrite

When the repo must keep its history, strip the problem out of it:

```sh
git filter-repo --invert-paths --path <dir-to-drop> --mailmap <mailmap> --replace-text <scrub>
```

Then **force-push** every ref and rewrite the tags. This is the flow used on this repo.

## 🕳️ What persists

Deletion **reduces** exposure; it does not erase it:

<!-- begin table -->
| Trace | Why it lingers |
| --- | --- |
| **Unreachable commits** | GitHub still serves them by SHA for a while |
| **Release assets** | zips survive until the release is deleted |
| **Caches / artifacts** | CI keeps copies the tree no longer has |
| **Forks / clones** | every copy is an independent record |
| **Backups** | cloud and USB copies sit outside the repo |
<!-- end table -->

## ✅ Verify and learn

- Re-run the repo validator and diff the tree against what you expect.
- Log the incident: what leaked, how, and the check that would have caught it.

## 🔁 Eventual perfection

A repo is never finished — it is an **infinite pursuit**. Some steps introduce bugs, some delete what mattered.
Treat each one as a pass, add the validator that closes the gap, and keep going.

## 🔗 Related

- [self-containment.md](self-containment.md) — preventing the mess in the first place
- [network.md](network.md) — why requests leave traces
