# 🧽 Clean up issues

**What this is:** a repeatable sweep that keeps the tracker honest — re-measure every open issue against the current policy.

## 🧭 The compliance sweep

1. **Pick the policy** — the current rule (for example: pure logic, no external process).
2. **List every open issue.**
3. **Classify** each: keep, re-scope, or close.
4. **Record** the sweep in an umbrella issue that links the decisions.

## 🔎 Classify

- **Keep** — already matches the policy.
- **Re-scope** — the goal is right, the description drifted.
- **Close** — the capability no longer belongs here.

## ✂️ Re-scope (edit the body)

Rewrite the issue body to the new scope: add a short scope note at the top and keep the original text below it. Do not silently drop intent.

## 🪦 Close

Close when the capability leaves the repo:

- Prepend a scope note — what left and who owns it now.
- Leave a closing comment with the reason and the tracker link.
- Label `wontfix` so the decision is visible.

## 🗂️ Umbrella issues

One umbrella issue carries the policy and links every child decision, so the sweep stays auditable.

## 🏷️ Hygiene

- Keep labels aligned with the level (`epic`, `feature`, `task`).
- Keep sub-issue links current.
- Re-check each quarter; a tracker rots quietly.

## 🔗 Related

- [readme.md](readme.md) — organizing issues
- [../repository/improvement.md](../repository/improvement.md) — improving a repo
