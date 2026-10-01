# 🌐 Network mess awareness

**What this is:** awareness that every network use leaves a trace — and that the trace outlives the request.
**Metaphor only.**

## 📡 On whose behalf

A request from the current computer is made **on behalf of someone** on it — it carries an **IP**, a local
**MAC**, and a **timestamp**. The device is the actor, not the person clicking.

## 🗄️ Logs outlive intent

Stopping the requests does not erase the logs. Deleting them is **not guaranteed** — a server, an ISP, or a
bystander may keep a copy. Anyone willing to store them is building a de-facto **perfect library of data**: a
record of what happened, from more than one angle.

## 💾 Storage reality

Such a library grows quickly and costs real money to keep. That cost is the natural brake — **life's garbage
collector** tends to reclaim things in a not-so-long window. Until something is publicly called out, it is **a
fly in the air**: possibly harmful, easily forgotten.

## 🧹 Practical hygiene

- **Make few mistakes** — the cheapest cleanup is the request you did not send.
- **Clean up when a problem appears** — do not wait for the pile to grow.
- **Do not assume deletion is complete** — plan as if a copy survived.

## 🔗 Related

- [cleanup.md](cleanup.md) — recovering after a mess
- [self-containment.md](self-containment.md) — scoping work to prevent one
