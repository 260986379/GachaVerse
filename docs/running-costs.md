# GachaVerse — Live Server Cost Breakdown

> Last updated: June 2026

Your stack: **Google Cloud Run** (backend + frontend served together) · **PostgreSQL** (Cloud SQL or external) · **Firebase Auth** · **YouTube Data API v3** · **Twitter/X API v2** · **Google Cloud Build + Artifact Registry**

---

## 1. Google Cloud Run *(biggest driver)*

The app has an in-process scheduler (`setInterval`) that runs YouTube ingestion every hour and banner sync every 6 hours. **This means the container can never scale to zero** — it needs at least one always-alive instance or the scheduler silently dies.

| Setting | Low | Medium | High |
|---|---|---|---|
| Instances running | 1 (min-instances=1) | 1–3 autoscaling | 3–10 autoscaling |
| CPU always allocated | Required | Required | Required |
| Estimated monthly | **$55–65** | **$100–180** | **$250–600** |

Key pricing levers:
- vCPU: $0.000024/second (first 180k free/month)
- Memory: $0.0000025/GiB-second (first 360k free/month)
- Requests: $0.40/million (first 2M free/month)
- 1 vCPU always-on ≈ 2.6M vCPU-sec/month → ~$58/month after free tier

> **Cost reduction option**: Move the scheduler out of the app into **Cloud Scheduler + Cloud Tasks** (a few dollars/month combined), letting Cloud Run scale to zero. This can drop idle compute to ~$5–15/month at low traffic.

---

## 2. PostgreSQL Database

Connected via `DATABASE_URL`. Most likely **Google Cloud SQL**:

| Tier | RAM | Use case | Monthly |
|---|---|---|---|
| db-f1-micro | 614 MB | Low traffic / dev | ~$7 |
| db-g1-small | 1.7 GB | Medium traffic | ~$26 |
| db-n1-standard-2 | 7.5 GB | High traffic | ~$100 |
| + Storage | — | $0.17/GB/month | ~$0–5 |
| + HA failover | — | Doubles compute cost | +$7–100 |

**Cheaper alternatives to start:**
- **Neon** free tier (0.5 GB, serverless): $0 → scales to ~$19/month Pro
- **Supabase** free tier (500 MB): $0 → $25/month Pro

---

## 3. YouTube Data API v3 *(currently free)*

Ingestion uses `playlistItems` (1 unit/page) + `videos?part=statistics` (1 unit per 50 IDs). Daily free quota: **10,000 units**.

| Scenario | Units/day | Cost |
|---|---|---|
| Normal hourly polling (5 games) | ~240 | **$0** |
| Force backfill (all 5 channels, one-time) | ~5,000 | **$0** |
| If quota exceeded | per 1,000 units over | $0.29 |

Currently using ~2.4% of the free daily quota. Essentially free unless many more games are added or very deep daily backfills are run.

---

## 4. Twitter/X API v2 *(potentially expensive)*

`twitterIngestionService.js` uses Recent Search for ZZZ and NIKKE tweet ingestion.

| Tier | Monthly | Read quota |
|---|---|---|
| Free | $0 | 500 tweets/month (Search endpoint) |
| Basic | $100 | 10,000 tweets/month |
| Pro | $5,000 | 1,000,000 tweets/month |

**Basic at $100/month is the minimum usable tier** if Twitter ingestion is enabled. Leaving `TWITTER_BEARER_TOKEN` as a placeholder keeps this cost at $0.

---

## 5. Firebase Authentication *(free at any realistic scale)*

Email/Password and Google OAuth via Firebase Auth.

| MAU | Cost |
|---|---|
| 0 – 10,000 | **$0** (Spark free tier) |
| 10,000 – 100M | **$0** (Email/password and Google OAuth are free at all plan levels) |

No realistic cost unless SMS phone authentication is added ($0.006/verification).

---

## 6. Google Cloud Build *(low cost)*

`cloudbuild.yaml` uses `E2_HIGHCPU_8` (8-vCPU machine), which multiplies build-minute consumption by 8×.

| Scenario | Effective free budget | Cost |
|---|---|---|
| Free tier | 3,600 min/month ÷ 8 = **450 real minutes** | $0 |
| Each ~5-min build (E2_HIGHCPU_8) | 40 equivalent minutes | ~$0 if < 11 builds/month |
| Over free tier | $0.034/build-minute | ~$1–10/month |

For a typical dev cadence (a few deploys per day): likely **$0–5/month**.

---

## 7. Google Artifact Registry *(negligible)*

Stores the Docker image (~200–400 MB).

- Storage: $0.10/GB/month → ~$0.03–0.04/month
- Egress within the same region (Cloud Run pulling the image): free

**Cost: < $1/month**

---

## 8. Network Egress

The frontend (HTML, CSS, JS bundle, game data JSON) is served directly from the Cloud Run container — there is no CDN. Every page load downloads assets from Cloud Run.

| Traffic level | Est. egress/month | Cost |
|---|---|---|
| Low (< 10k visits) | < 5 GB | ~$0.40 |
| Medium (50k–200k visits) | 10–50 GB | ~$1–4 |
| High (500k+ visits) | 100–500 GB | ~$8–40 |

Pricing: first 1 GB free, then $0.08/GB (US regions to internet).

> **Cost reduction option**: Move the frontend to **Firebase Hosting** or **Cloudflare Pages** (both have generous free tiers). This removes all static asset egress from Cloud Run and adds global CDN caching.

---

## 9. Google Cloud Logging *(likely free)*

Cloud Run emits logs; `cloudbuild.yaml` uses `CLOUD_LOGGING_ONLY`.

- Free: first 50 GiB/month ingested
- Very high traffic or verbose logging would be needed to exceed this

**Cost: $0 for low/medium, possibly $1–5/month for high**

---

## Total Monthly Estimates

| | Low traffic | Medium traffic | High traffic |
|---|---|---|---|
| Cloud Run | $55–65 | $100–180 | $250–600 |
| PostgreSQL | $7–15 | $25–30 | $100–200 |
| YouTube API | $0 | $0 | $0 |
| Twitter/X API | $0 or $100 | $0 or $100 | $100 |
| Firebase Auth | $0 | $0 | $0 |
| Cloud Build | $0–2 | $2–5 | $5–15 |
| Artifact Registry | < $1 | < $1 | < $1 |
| Egress | < $1 | $1–4 | $8–40 |
| **Total (no Twitter)** | **~$63–83** | **~$128–220** | **~$363–856** |
| **Total (with Twitter)** | **~$163–183** | **~$228–320** | **~$463–956** |

---

## The Biggest Cost Levers

1. **Cloud Run idle compute** dominates at low traffic. Externalizing the in-process scheduler to Cloud Scheduler + Cloud Tasks drops the idle bill from ~$60 to ~$5–10/month.
2. **Twitter API** is a clean on/off switch — $0 vs $100/month simply by leaving the bearer token unset.
3. **Cloud SQL vs external Postgres** — Neon or Supabase free tiers eliminate the database cost entirely until the dataset exceeds ~500 MB–1 GB.
4. **Frontend egress** — Serving static files from Firebase Hosting or Cloudflare Pages is free and removes all per-request asset egress billing from Cloud Run.
