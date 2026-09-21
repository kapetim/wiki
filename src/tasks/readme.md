# ✅ Tasks

Recurring task board rows live as single JSON cards — one file per task, shaped like a GitHub issue payload. Each subfolder is a **tag** — every task inside carries that `tag` and is validated against
it. A card holds as few instructions as possible: it links to its detail file in the notes domains.

## 📋 Template

Each task card follows one JSON template, validated by `scripts/checks/task-model.js`:

```text
{
  "title": "🧹 cleaning",
  "labels": ["housekeeping"],
  "body": "# 🧭 Steps\n\n1. …\n\n## ✅ Done when\n\n- …",
  "priority": 3,
  "tag": "housekeeping",
  "recurrence": "weeks",
  "interval": 1,
  "deadline": "2026-08-31",
  "enabled": true
}
```

- **`title` / `labels` / `body`** — GitHub issue payload fields; a card can ship directly as a GitHub issue.
- **`body`** — the `# 🧭 Steps` numbered list followed by the `## ✅ Done when` bullet list, as renderable markdown.
- **`recurrence`** — cadence unit, one of `days`, `weeks`, `months`, `years`.
- **`interval`** — positive integer; cycle length = `interval` × `recurrence` (e.g. `weeks` + `2` = every 2 weeks).
- Next occurrence = `deadline + interval × recurrence` (see `scripts/tools/next-task.js`).

## 🗂️ Tags

<!-- count: 3 -->
<!-- begin table -->
| Tag | Folder | # Tasks |
| --- | --- | ---: |
| government | government/ | 9 |
| health | health/ | 8 |
| housekeeping | housekeeping/ | 5 |
<!-- end table -->

Total: 22 tasks. Each task card enforces the `# 🧭 Steps → ## ✅ Done when` outline inside its `body`, checked by the content gate.
