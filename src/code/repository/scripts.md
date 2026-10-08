# 🔧 Go vs sh split of concerns

**What this is:** the rule for what belongs in Go versus shell across the repos — shell stays a thin caller, Go owns everything that touches files.

## 🧭 The rule

**Test: does the script change files?**

- **Go** — anything that creates, modifies, or transforms **repo file content**: markdown, manifests, tables, READMEs, config, templates, filenames, records.
- Generic logic lives in `kapetim/cli`; repo-specific content checks live in `scripts/go` (importing `cli/pkg/*`).
- **sh** — everything else: orchestrating external CLIs and APIs (`gh`, `rclone`, `latexmk`) and calling the Go binary. Shell stays a thin **caller**.

Rule of thumb: if you removed the external tools and it would still be doing file I/O, it is Go; if it would be empty, it is sh.

## ✅ Examples

<!-- begin table -->
| Script | Home | Why |
| --- | --- | --- |
| content checks (`validate`, `lint`, `scan`) | Go | read and check file content |
| generators (`tree`, `table-columns`, README table) | Go | write files |
| `scaffold-issue-templates.sh` | Go | generates files |
| `local.sh` | sh | calls the Go binary |
| `sync-image.sh` | sh | calls `gh` + Docker, authors no files |
| `upload/*.sh` | sh | calls `gh` + `rclone`, authors no files |
| `ensure-epics.sh`, `sync-labels.sh` | sh | calls `gh`, authors no files |
| `build-resume.sh` | sh | wraps `latexmk` |
<!-- end table -->

A shell script may still pipe JSON through `jq`/`gh api` or read a tag **without changing files** — that stays sh. A script that writes or rewrites files is Go.

## 🔗 Related

- [`../../guides/cleanup.md`](../../guides/cleanup.md) — recovering after a mess
- [`../../guides/self-containment.md`](../../guides/self-containment.md) — keeping AI work scoped
