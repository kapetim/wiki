# 🧱 Organize issues

**What this is:** how work is tracked — a three-level hierarchy linked with sub-issues.

## 🪜 The hierarchy

Every repo's work is a tree:

- **Epic** — a domain or folder (`repo`, `lint`, `pdf`, `table`). One per concern.
- **Feature** — a capability inside an epic.
- **Task** — the detailed, actionable unit inside a feature.

Labels mirror the level: `epic`, `feature`, `task`; the template's default label marks the standing issue.

## 🏷️ Naming

`<domain>: <capability>` — lowercase, colon, one line. The domain is the epic; the capability is the outcome.

## 🔗 Linking

- Every non-epic issue opens with `Parent: #n`.
- Link the real relationship with GitHub sub-issues (issue → Sub-issues → add), not just the text reference.
- Keep parents and children consistent: a closed parent with open children is a gap.

## ✍️ Writing an issue

- **What** it is, **why** it matters, **how** it lands.
- **References** to related issues and the code it touches.
- **Acceptance** — the observable result that closes it.

## 🌱 Open, split, close

- **Open** a feature when a capability is missing or a policy is unclear.
- **Split** a feature into tasks before starting; one task per change.
- **Close** when the acceptance holds — see [cleanup.md](cleanup.md).

## 🔗 Related

- [cleanup.md](cleanup.md) — cleaning up issues
- [../repository/readme.md](../repository/readme.md) — organizing repositories
