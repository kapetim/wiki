# 🚽 Sewage treatment — the pipe that leaks shit

**What this is:** a **perpetual-damage wheel** — basic sanitation (saneamento básico). The collection-and-treatment pipe system **exists and mostly works**, but it **under-treats**: raw sewage still
enters
the waterway at a point upstream and flows, stinking, toward the ocean. Tietê's smell is the visible symptom; the wheel is the missing "filter the input before it reaches the river" step.

## 📋 Problem statement

<!-- begin table -->
| Axis | Answer | Note |
| ------ | -------- | ------ |
| **Problem** | The pipe network collects sewage but treats only a share of it | the untreated rest enters the water at point A and flows downstream, badly managed and stinking |
| **Population affected** | ~21M in the São Paulo metro (order of magnitude) | everyone downriver of point A smells and drinks the consequence |
| **Time to implement** | 10–20 yr of buildout: interceptors, treatment plants, connections | decades-long programs, not one contract |
| **Lifespan** | Indefinite **iff** the input is treated at source and the plant is maintained | otherwise the damage wheel self-refills every day |
<!-- end table -->

## ⚙️ The wheel model

Treat the failure as a flow problem, not a mood problem:

<!-- begin table -->
| Variable | Meaning | Why it matters |
| ---------- | --------- | ---------------- |
| `N` | Untreated sewage entering at point A (liters/min) | The **input** — the only lever that ends the wheel |
| `M` | Distance the shit travels to the ocean (km) | Exposure length — who smells it, for how long |
| `O` | Speed the water carries it | Transit time = how fast the smell reaches people |
<!-- end table -->

**The leverage rule:** cleaning the *output* (the river) re-spends forever. Closing the *input* (`N → 0` by treating before point A) stops the re-fill — the river then self-clears on its own.

## 💰 Cost of install vs maintain

<!-- begin table -->
| Spend | What it buys | Trap |
| ------- | -------------- | ------ |
| **Install** | Interceptors + treatment capacity to make `N ≈ 0` | Big upfront, one-time |
| **Maintain** | Run the plants, fix leaks, keep connections enforced | Small yearly, but **forever** — and the budget line most often cut |
<!-- end table -->

**Who pays:** the downstream cleaner (municipality, health system, everyone who smells it) pays for the damage wheel *today*. The fix asks the **upstream feeder** — households, industry, illegal
hookups — to pay for treatment instead. That inversion is the political fight.

**Who profits from broken:** the contract that bills per-liters-processed or the body that budgets cleanup year after year may earn more from `N > 0` than from closing it. Audit who makes money from
the wheel staying open.

## ❓ Open questions

- Real `N` at point A — liters/min of untreated sewage, and the share treated today
- Real `M` / `O` — actual distance and flow speed; transit time to population
- Cost to install (interceptors + plants) vs yearly maintenance, current vs target
- Who holds the treatment contracts and whether fees reward volume over closure
- How many of the ~21M are actually connected vs serviced but untreated
