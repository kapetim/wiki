# 🍚 Hunger fund — the wheel that pays forever

**What this is:** a **perpetual-value wheel** — the "infinite money" idea. Hunger is mostly **missing steady income**; the fix is a **self-reinvesting principal** that pays a monthly
stipend and never dies. The wheel is easy on paper: don't eat the top, spend only what the wheel grows. The hard part is starting it, protecting it, and deciding who runs it.

## 📋 Problem statement

<!-- begin table -->
| Axis | Answer | Note |
| ------ | -------- | ------ |
| **Problem** | Households without steady income go hungry | a funded principal could pay a monthly stipend forever while the top keeps growing |
| **Population affected** | Tens of millions in Brazil in some degree of food insecurity | order of magnitude — exact count is an open question |
| **Time to implement** | The wheel starts in 1–5 yr (legal vehicle + capital + distribution) | growing the principal to meaningful scale takes decades |
| **Lifespan** | **Perpetual iff** monthly spend stays ≤ real yield and the principal is governed well | depletes otherwise (see below) |
<!-- end table -->

## ⚙️ How the infinite wheel works

```text
P  = principal (the top, never spent)
r  = monthly real yield (after inflation and tax)
W  = monthly stipend = P × r          # spend only the growth
P  grows by inflation every year      # the top stays real, forever
```

The wheel is **linear in P** — double the principal, double the stipend. The constraints are what change at scale.

## 📐 Assumptions

<!-- begin table -->
| Input | Value | Source |
| ------- | ------- | -------- |
| CDI | 14.5% a.a. | `government/brazil/cpf/finance/net-worth.md` assumption |
| CDB | ~100% CDI | gross `g = 14.5%` a.a. |
| IR on gains | 15% (held > 2 yr) | long-term bracket |
| Inflation (IPCA) | 4.5% a.a. | ~target band |
| **Net nominal yield** | 14.5% × (1 − 0.15) = **12.33%** a.a. | after tax |
| **Real yield** | 1.1233 / 1.045 − 1 = **7.49%** a.a. | after tax + inflation |
<!-- end table -->

## 💰 Example — R$ 100k

<!-- begin table -->
| Metric | Value |
| -------- | ------- |
| Generates per month (gross) | **R$ 1,208**/mo |
| Generates per month (net after IR) | **~R$ 1,027**/mo |
| **Feasible perpetual withdrawal** | **~R$ 624**/mo |
| Doubling time (fully reinvested) | **~5.8 yr** (72 ÷ 12.33) |
<!-- end table -->

**Growth over the years** if every cent is reinvested:

<!-- begin table -->
| Horizon | Principal | Read |
| --------- | ----------- | ------ |
| Now | R$ 100,000 | — |
| 5 yr | ~R$ 179k | +79% |
| 10 yr | ~R$ 320k | ×3.2 |
| 20 yr | ~R$ 1.02M | ×10 |
| 30 yr | ~R$ 3.27M | ×33 |
<!-- end table -->

**The withdrawal rule — how much is actually feasible:**

<!-- begin table -->
| Spend | What it does to the top | Verdict |
| ------- | ------------------------ | --------- |
| **≤ 7.49%/yr** (~R$ 624/mo) | Top keeps up with inflation | **Perpetual** — never eat the principal |
| **~12%/yr** (1%/mo ≈ R$ 1,027/mo, the "1k" rule) | Nominal top stays flat; real buying power erodes ~4.5%/yr | Not sustainable forever — real top halves in ~16 yr |
| **> 12.33%/yr** (2%/mo) | Nominal top itself shrinks | Finite — see depletion |
<!-- end table -->

Your "100k → 1k/month" rule is the **net nominal** yield: it *preserves the top in numbers* but quietly loses to inflation. Truly perpetual money is **~0.62%/mo** (~R$ 624).

## 📈 Scaling — 100k → 100MM → 100B

The math is linear; the **constraints** are not:

<!-- begin table -->
| Scale | Net yield /mo | Perpetual spend /mo | What actually changes | Detail |
| ------- | --------------- | --------------------- | ---------------------- | -------- |
| **R$ 100k** | ~R$ 1,027 | ~R$ 624 | Fully **FGC-guaranteed** (cap R$250k/bank) — pure retail CDB, trivial | |
| **R$ 100MM** | ~R$ 1.03M | ~R$ 624k | Exceeds the FGC cap → must split across banks / treasury / brokerage | custody + diversification become real |
| **R$ 100B** | ~R$ 1.03B | ~R$ 624M | Retail banking is irrelevant → sovereign-wealth-fund grade | buying that much moves CDI; needs duration/currency management; governance of who spends R$ 624M/mo |
<!-- end table -->

**The scaling lesson:** at 100k the wheel is a bank account; at 100MM it's an endowment; at 100B it *is* a fiscal institution — and the binding constraint stops being math and becomes
**who watches the wheel**.

## ⏳ Depletion — how long it lasts if you overspend

If spend > net yield, the top shrinks at `net − spend` per year:

<!-- begin table -->
| Spend | Top behavior | Time to halve | Time to <10% |
| ------- | -------------- | --------------- | -------------- |
| 1%/mo (12%/yr) | Real erosion ~4.5%/yr | ~16 yr (real) | ~50 yr (real) |
| 2%/mo (24%/yr) | Nominal shrink ~11.7%/yr | ~6 yr | ~19 yr |
| 0.62%/mo (7.49%/yr) | None — inflation-proof | never | never |
<!-- end table -->

"Preserving the top" is only true up to the **real yield**. Past it, the wheel pays you for a while and then quietly dies — which is exactly how most "fixed income" spending plans fail.

## 🏛️ The government angle

Any guaranteed income — hunger benefit, UBI, pension — **is a trust fund**. The design questions are the same at any scale:

1. **Who holds the principal `P`** and can they lose it (war, default, theft)?
2. **What is it invested in** — and does the "safe" yield beat inflation after tax?
3. **Who audits the wheel** so the top is never eaten by managers? See the
   [control pole](../../observation/society/futures.md#-control-pole-who-steers-the).
4. **Who decides the stipend** when the wheel is bigger than one life — and can a future government *stop* feeding it?

The money is the easy part. The **governance of the wheel** is the unsolved problem.

## ❓ Open questions

- Exact count of the population the fund would cover (severe vs moderate food insecurity)
- Target stipend per household and its real-yield gap at today's CDI
- Vehicle that survives politicians: endowment, earmarked fund, constitutional lock
- Whether CDI stays at 14.5% — the whole wheel depends on the real spread (net − inflation) staying positive
- At 100B: currency and market-impact math, and who is accountable for R$ 624M/mo
