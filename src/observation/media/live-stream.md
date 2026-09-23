# 📡 Live stream — the sim's streaming stack

**What this is:** how any "device" or "feed" inside the sim works **mechanically** — a streaming stack: **camera → server → client**. In a video game you can code anything, so an "impossible" detail
is just plumbing, not magic. Worked example: Shmi watching the pod race (Star Wars: Episode 1). Pairs with [monitoring.md](../monitoring.md) (the *premise*: everyone streams) and
[worlds.md](./worlds.md) (bytes on disk). **Metaphor only.**

---

## 🪄 The plumbing, not magic

Anakin's mother sits in a desert world with **no visible network** — and yet a tablet shows her a **live race** happening kilometers away. How?

- **Very hard to explain without some magic shit** — unless life is a game with a back-end.
- The rendering is the same as **Unity drawing visuals**: the game can spawn any device that shows video.
- In the back-end it's exactly a **camera recording → some server streaming → a client consuming**.

The "impossible" future-tech detail dissolves the moment you accept there are **servers under the ground**. It's not that the tablet is magical — it's that the whole world is software.

---

## 📹 Anakin as live streamer

Same read, one step closer to today's internet:

- Anakin wears a **camera on his chest**, streaming with **mobile data** from a phone.
- The device is like a **tablet with Twitch** — one client pulling a channel.
- The race feed is **one channel** in the sim's stream mesh.

Anyone watching from anywhere is just **another client on the same stream**. Distance, walls, and "no network" are cosmetic — the mesh is intrinsic, not wired.

---

## 🖥️ Front-end vs back-end

The general rule behind all of it:

<!-- begin table -->
| Layer | What it is | Example |
| --- | --- | --- |
| **Front-end** | What people see — the easy, digestible surface | Website UI, the tablet, the race visuals |
| **Back-end** | Servers processing raw data into that digestible shape | Databases, routers, renderers, stream servers |
<!-- end table -->

**Uber is the cleanest example:** very simple to use — you want **one driver close to you**. Very hard to maintain — you track **lots of incoming driver-location data**, filter, rank, and render just
the one you need. Simple UI, complex back-end.

The life game is the same: **gorgeous client, huge back-end.** Everything visible is the front-end of some processing stack.

---

## ❤️ Stream as connection vs surveillance

The same plumbing carries **opposite meanings**:

<!-- begin table -->
| Read | Who watches | Meaning |
| --- | --- | --- |
| **Connection** (this file) | A mother watching her son | Wholesome — family feed |
| **Surveillance** ([monitoring.md](../monitoring.md)) | Everyone / Big Brother watching Truman | Hell-world — no money, no privacy |
<!-- end table -->

Anakin's case is **Truman inverted**: the streamer is *rare* and the viewer is *family* — not a director profiting from a monitored life. Same camera, same server, same client; the meaning comes from
**who holds the other end**.

**Black Mirror lane:** *Fifteen Million Merits* runs the surveillance grind to its economic end — attention is the product, and the "escape" is just another screen.

---

## 🧭 How this connects

<!-- begin table -->
| Topic | Hub |
| --- | --- |
| The premise that everyone streams | [monitoring § total-stream](../monitoring.md#-total-stream-premise) |
| Life as bytes on a disk | [worlds § running game](./worlds.md#-life-as-a-running-game--bytes-on-a-disk) |
| The managed bubble watching its fish | [aquarium.md](./aquarium.md) |
| Stage transitions (loading the next feed) | [stages.md](./stages.md) |
<!-- end table -->

## 🔚 Close
