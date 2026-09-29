# MyGachaList — Monetization Estimates (October 2026)

> Written 2026-09-29. Replaces the revenue numbers in `monetization.md` (June 2026), which overestimated income by roughly 3–7×.

This document estimates potential income only. It covers two scenarios: the current catalogue (5 games) and a future catalogue of 20+ games. All figures are monthly, in USD, after payment fees and before income tax. They are estimates, not measured data; replace the assumptions below with real analytics as they become available.

---

## Current state

- **Paid membership is live** (#65, shipped 2026-09-29): $2.99/month or $29.99/year via Stripe Checkout. Membership is stored in `users.subscription_*`; the `VIP` role is a separate, manually granted tier.
- **Not yet built:** donations (#61), affiliate links (#62), cosmetic extras (#63), display ads (#64).

---

## Key assumptions

| Assumption | Old doc | This doc | Reasoning |
|---|---|---|---|
| Membership net revenue | $3–5/sub/mo | **~$2.40/sub/mo** | $2.99 / $29.99, assuming half monthly and half yearly subs, minus Stripe 2.9% + 30¢, the Billing fee and international card fees. The fixed 30¢ hurts most at this price. |
| Membership conversion | 1–3% of MAU | **0.5–1.5%** (5 games), **0.75–2%** (20+ games) | MAU counts every visitor, not only logged-in regulars. Fan-site memberships with cosmetic perks usually land around 1%. A profile spanning more of a user's games is worth more. |
| Pageviews per MAU | 70/month | **~15** (5 games), **~20** (20+ games) | 70 is power-user behaviour. People who play several games browse several game sections. |
| Ad revenue | $2–4 CPM | **$1–2.50 page RPM** at low traffic | Ad blockers are common among gamers, and much of the ZZZ/NIKKE audience is in low-CPM regions like SEA. Higher-paying networks (Mediavine, Raptive) need roughly 300k pageviews/month. |
| Sponsorships | $100–500/placement under 10k MAU | **~$0 below ~15–20k MAU** | Publishers mostly buy through influencer agencies. With 20+ publishers to pitch, deals become plausible at medium traffic. |
| Top-up affiliates | $10–50/mo at 500 MAU | **~$0–5** | About 1% of MAU buying through a link, ~$20 top-up, ~2% commission ≈ 40¢ per sale. |
| Donations, cosmetics | Estimated independently | **Reduced** | Both compete with the membership for the same core supporters. Small one-time purchases lose ~13% to fees. |

### Effect of growing to 20+ games

- **Traffic grows about 3×, not 4×.** The first 5 games are likely among the largest gacha titles, and gacha players often play 2–3 games, so audiences overlap. Traffic tiers scale from 500 / 5k / 25k to **1.5k / 15k / 75k MAU**. Which games are added matters more than how many.
- **Each visitor is worth more:** more pageviews per user, higher membership conversion, access to higher-paying ad networks, more publishers to sponsor, more top-up affiliate coverage, more cosmetic themes, and a cross-game dataset that is worth licensing.

---

## Combined estimate: 5 games (current)

### Realistic

| Stream | Low (500 MAU) | Medium (5k) | High (25k) |
|---|---|---|---|
| Membership | $7–19 | $60–180 | $300–900 |
| Display ads | $7–15 | $75–150 | $560–940 |
| Sponsorships | $0 | $0 | $0–500 |
| Affiliate | $0–5 | $10–50 | $50–250 |
| Donations | $5–15 | $30–100 | $100–300 |
| Cosmetics | $3–13 | $40–130 | $200–650 |
| API licensing | $0 | $0 | $0–100 |
| **Total** | **$22–67** | **$215–610** | **$1,210–3,640** |

### Optimistic

| Stream | Low | Medium | High |
|---|---|---|---|
| Membership | $24–48 | $240–480 | $1,200–2,400 |
| Display ads | $20–38 | $375–500 | $2,500–3,100 |
| Sponsorships | $0 | $0–300 | $500–2,000 |
| Affiliate | $10–25 | $50–200 | $250–1,000 |
| Donations | $15–40 | $100–250 | $300–800 |
| Cosmetics | $10–30 | $130–400 | $650–2,000 |
| API licensing | $0 | $0–50 | $100–500 |
| **Total** | **$79–181** | **$895–2,180** | **$5,500–11,800** |

---

## Combined estimate: 20+ games (future)

### Realistic

| Stream | Low (1.5k MAU) | Medium (15k) | High (75k) |
|---|---|---|---|
| Membership | $27–72 | $270–720 | $1,350–3,600 |
| Display ads | $30–60 | $450–900 | $3,000–5,250 |
| Sponsorships | $0 | $0–500 | $1,000–4,000 |
| Affiliate | $3–15 | $30–150 | $150–750 |
| Donations | $10–30 | $50–150 | $200–500 |
| Cosmetics | $10–40 | $120–400 | $600–2,000 |
| API licensing | $0 | $0–100 | $100–500 |
| **Total** | **$80–217** | **$920–2,920** | **$6,400–16,600** |

### Optimistic

| Stream | Low | Medium | High |
|---|---|---|---|
| Membership | $90–162 | $900–1,620 | $4,500–8,100 |
| Display ads | $75–110 | $1,500–1,900 | $9,400–11,250 |
| Sponsorships | $0 | $300–1,500 | $4,000–10,000 |
| Affiliate | $15–40 | $150–600 | $750–3,000 |
| Donations | $30–75 | $150–400 | $500–1,200 |
| Cosmetics | $30–90 | $400–1,200 | $2,000–6,000 |
| API licensing | $0 | $50–300 | $500–2,000 |
| **Total** | **$240–477** | **$3,450–7,520** | **$21,650–41,550** |

---

## Comparison with the June 2026 estimates

| Scenario | Low | Medium | High |
|---|---|---|---|
| June 2026, realistic | $65–592 | $1,550–5,037 | $7,750–24,330 |
| 5 games, realistic | $22–67 | $215–610 | $1,210–3,640 |
| 20+ games, realistic | $80–217 | $920–2,920 | $6,400–16,600 |
| June 2026, optimistic | $610–1,725 | $5,400–14,050 | $27,000–70,750 |
| 5 games, optimistic | $79–181 | $895–2,180 | $5,500–11,800 |
| 20+ games, optimistic | $240–477 | $3,450–7,520 | $21,650–41,550 |

---

## Breakeven vs running costs

5-game costs are from `running-costs.md`; 20+ game costs are a rough scaling for traffic, per-game data pipelines and asset storage.

| Scenario | Low | Medium | High |
|---|---|---|---|
| 5 games: costs | $1–13 | $41–148 | $129–431 |
| 5 games: realistic revenue | $22–67 | $215–610 | $1,210–3,640 |
| 20+ games: costs (est.) | $15–40 | $100–400 | $400–1,300 |
| 20+ games: realistic revenue | $80–217 | $920–2,920 | $6,400–16,600 |

Revenue covers costs at every level in both scenarios. At 5 games and medium traffic it is a modest profit, not a comfortable one.

---

## Takeaways

- **Traffic is the main lever.** Realistic revenue per MAU is about **$0.04–0.12/month with 5 games** and **$0.06–0.19 with 20+ games**. No mix of revenue streams changes the order of magnitude.
- **Membership alone covers hosting at low traffic** (3–8 subscribers). Other streams start to matter above ~5k MAU.
- **Push yearly plans.** One 30¢ fee per year beats twelve. Raising monthly to $3.99 while keeping $29.99/yr would widen the gap on purpose.
- **Ads become the largest stream at high traffic** and give the membership's ad-free perk real value.
- **With 20+ games, sponsorships and data licensing become real income** instead of near zero.
- **The hidden cost of 20+ games is maintenance time.** Keeping data current across patches and new characters is solo-dev work; prefer games already covered by Enka or similar APIs.
- **Replace the assumptions with real data.** Once analytics show real MAU, pageviews per user, audience regions and traffic gained per added game, update these tables.
