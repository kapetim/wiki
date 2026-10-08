# 🧊 Self-contain AI to prevent mess

**What this is:** keeping AI-assisted work scoped to a single repo and a single environment, so a high-throughput
mistake cannot cascade into another repo. Pairs with [cleanup.md](cleanup.md). **Metaphor only.**

## 🛡️ Validators as the safety net

Every repo ships its own checks that **fail closed**:

- **Structure** — folders, headings, tables, indexes.
- **Content gate** — forbidden terms and required links.
- **Integrity** — manifests hold the immutable documents.
- **Links** — targets and anchors resolve.
- **Secrets** — no tokens or keys in the tree.

Run them before every push and mirror them in CI. A check that does not fail loudly is decoration.

## 📦 Isolated environments

- **One image per repo** — its own devcontainer and Docker stages; nothing shared by accident.
- **Least privilege** — a token scoped to one repo, never an account-wide key.
- **No cross-repo reach** — the environment cannot see a sibling repo or a private one.

## 🎯 Scope the agent

- **One repo per session** — the working directory is the boundary.
- **Allowlists, not broad access** — the tools the task needs, no more.
- **Read before write** — search and read, then edit.

## 👀 Review gates

Never auto-push. Commit locally, read the diff, then push. The gate is the diff, not the tool's confidence.

## 🧯 When prevention fails

Prevention lowers the odds; it does not hit zero. When something slips through, the runbook is
[cleanup.md](cleanup.md).

## 🔗 Related

- [cleanup.md](cleanup.md) — recovering after a mess
- [network.md](network.md) — the traces a request leaves
