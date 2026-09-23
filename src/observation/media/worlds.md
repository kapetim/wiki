# 🌐 Worlds — world organization and transition

**What this is:** how parallel "worlds" (game instances, tanks, aquariums) are organized — and how a player moves between them. Life as a running video game: bytes on a disk, CPU handling state, GPU
rendering visuals, and you as metadata. Pairs with [aquarium.md](./aquarium.md) (the managed bubble), [civilization-ladder.md](./civilization-ladder.md) (world presets), and
[restart.md](../framework/restart.md) (born queue / slot). **Metaphor only.**

**Closest game reads:** The Matrix · Super Mario (world-to-world) · Minecraft (parallel servers) · The Sims.

---

## 🎮 Life as a running game — bytes on a disk

A life is roughly a **bunch of bytes on a hard disk**. The **CPU** handles state changes, the **GPU** renders the visuals, and you are **metadata** — the sheet describing a state, not the machine.

- **Blue pill = normal life** — the running default instance.
- **Red pill = a transition to another stage** — same mechanic as Mario reaching the finish line and moving from 1-1 to 1-2.
- The Matrix **dramatizes** taking the pill and moving to another dimension — but it's the same thing as advancing a level.

---

## 🖥️ Two instances, not one flow

If the game is uninterrupted, it's easier to read as **two separate instances running in parallel** — two Minecraft servers up 24/7, or two containers running different game images.

- The red pill ≈ **a request from one server to the other** (latency and handshake included — odd in story, boring in systems).
- With good transition management, you'd have a **pre-spawned bot in one game waiting** — like an empty car waiting for a driver. You touch something in instance A, and appear in instance B.

**How Mario moves 1-1 → 1-2:** black screen → load new screen. If the game never pauses, the clean read is **parallel instances**: show **one player dead in A**, a **new one appearing in
B**. The better the transition, the more fluid it looks — Mario 64 (jumping into a wall painting) is a strong example: disappear from instance A, appear in instance B.

---

## 🚪 The queue — entrance and exit

The obscure part: **what if someone is already in the same place?**

- Think of it as a **queue / nightclub entrance door**.
- Entering a picture = **exit door from A + entrance door of B** — a **two-way street with a toll**.
- Most players go through a **one-way path and wait in the queue**; some come back the other way and wait in the same queue.

---

## ⚔️ World presets — Flintstones vs Jetsons

Different worlds are like **selectable game images**:

- **Flintstones** — no electricity → little to no risk of being managed by robots — but you're like a **dinosaur** (raw hazard, no armor).
- **Jetsons** — near WALL·E / I-Robot territory, but probably the **best of life**: a king in your bedroom, everything comes to you.
- No right or wrong — just **different points of view** and trade-offs.

**Matrix as the meta-game:** a computer running instances — one Jetsons, one Flintstones — and you **pick the game and play** (Xbox-style). It can be a very
complex game, including an **infinite war between humans and resistant robots** — and most of the time **robots win**, like the dentist and the fish.

**Dentist-and-fish asymmetry:** not even infinite fish can beat the dentist. If he moves to a desert, they'd die without water — unless they can carry a water bottle, in which case they could visit
pleasanter environments than boring sand.

**Black  Mirror  lanes:**  *USS  Callister*  and  *San  Junipero*  are  selectable  uploaded  worlds  —  a  consciousness  inserted  into  a  game/afterlife  instance,  the  Matrix  read  with  a
copy  twist  (uploaded  selves  as  bytes  on  disk).

---

## 🧭 Cross-reads

<!-- begin table -->
| Topic | Hub |
| --- | --- |
| Managed bubble / nested monitoring | [aquarium.md](./aquarium.md) |
| World presets (Flintstones → Matrix) | [civilization-ladder.md](./civilization-ladder.md) |
| Post-death transition / born queue | [restart.md](../framework/restart.md) |
| Automation force edge | [civilization-ladder § automation](./civilization-ladder.md#-automations-force-edge) |
<!-- end table -->

## 🔚 Close
