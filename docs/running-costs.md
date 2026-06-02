# GachaVerse — Live Server Cost Breakdown

> Last updated: June 2026

Your stack: **Google Cloud Run** (backend + frontend served together) · **PostgreSQL** (Cloud SQL or external) · **Firebase Auth** · **YouTube Data API v3** · **Twitter/X API v2** · **Google Cloud Build + Artifact Registry**

---

## Current Setup vs Optimized Setup

The optimized setup applies three changes:

1. **Twitter ingestion disabled** — bearer token left as placeholder, saves $100/month flat
2. **YouTube scheduler moved to Cloud Scheduler + Cloud Tasks** — removes the need for CPU-always-allocated or min-instances=1, letting Cloud Run scale to zero during quiet hours
3. **Frontend moved to Firebase Hosting** — static assets (HTML, JS, CSS) served from a CDN instead of the Cloud Run container, reducing instance load and egress billing

### Low Traffic *(< 1,000 MAU, < 10k page views/day)*

| Cost source | Current | Optimized | Notes |
|---|---|---|---|
| Cloud Run | $55–65 | $5–20 | Request-based CPU + scale-to-zero. Nearly idle at low traffic. |
| PostgreSQL | $7–15 | $7–15 | No change. Neon free tier can bring this to $0. |
| YouTube API | $0 | $0 | — |
| Twitter/X API | $0–100 | $0 | Disabled |
| Firebase Auth | $0 | $0 | — |
| Cloud Build | $0–2 | $0–2 | — |
| Artifact Registry | < $1 | < $1 | — |
| Egress (Cloud Run) | < $1 | < $1 | API responses only in optimized |
| Cloud Scheduler | — | $0 | First 3 jobs/month free |
| Cloud Tasks | — | < $1 | ~3,600 tasks/month = ~$0.0015 |
| Firebase Hosting | — | $0 | Well within 10 GB/month free tier |
| **Total (no Twitter)** | **$63–83** | **$12–38** | |
| **Total (with Twitter)** | **$163–183** | — | |
| **Savings** | | **~$45–55/month (~60%)** | |

### Medium Traffic *(1,000–10,000 MAU, 50k–200k page views/day)*

| Cost source | Current | Optimized | Notes |
|---|---|---|---|
| Cloud Run | $100–180 | $25–80 | Request-based; fewer instances needed since Firebase handles static files |
| PostgreSQL | $25–30 | $25–30 | No change |
| YouTube API | $0 | $0 | — |
| Twitter/X API | $0–100 | $0 | Disabled |
| Firebase Auth | $0 | $0 | — |
| Cloud Build | $2–5 | $2–5 | — |
| Artifact Registry | < $1 | < $1 | — |
| Egress (Cloud Run) | $1–4 | < $1 | API responses only |
| Cloud Scheduler | — | $0 | — |
| Cloud Tasks | — | < $1 | — |
| Firebase Hosting | — | $0–5 | ~10–30 GB/month; partially within free tier |
| **Total (no Twitter)** | **$128–220** | **$52–121** | |
| **Total (with Twitter)** | **$228–320** | — | |
| **Savings** | | **~$76–99/month (~55%)** | |

### High Traffic *(10,000+ MAU, 500k+ page views/day)*

| Cost source | Current | Optimized | Notes |
|---|---|---|---|
| Cloud Run | $250–600 | $60–200 | No always-on requirement; instances scale with actual request load |
| PostgreSQL | $100–200 | $100–200 | No change |
| YouTube API | $0 | $0 | — |
| Twitter/X API | $100 | $0 | Disabled |
| Firebase Auth | $0 | $0 | — |
| Cloud Build | $5–15 | $5–15 | — |
| Artifact Registry | < $1 | < $1 | — |
| Egress (Cloud Run) | $8–40 | $2–10 | API responses only |
| Cloud Scheduler | — | $0 | — |
| Cloud Tasks | — | < $1 | — |
| Firebase Hosting | — | $5–35 | ~30–50 GB/month served via CDN; $0.15/GB after first 10 GB |
| **Total** | **$463–956** | **$172–462** | |
| **Savings** | | **~$191–394/month (~50%)** | |

---

### Summary across all traffic levels

| Traffic | Current (with Twitter) | Optimized | Monthly savings | % cheaper |
|---|---|---|---|---|
| Low | $163–183 | $12–38 | ~$125–145 | ~79% |
| Medium | $228–320 | $52–121 | ~$107–199 | ~57% |
| High | $463–956 | $172–462 | ~$191–394 | ~51% |

> The lower the traffic, the bigger the relative saving — because the current setup's always-on Cloud Run cost is almost entirely idle waste at low usage.

---

## Where the savings come from

**Cloud Run is the biggest lever at every traffic level.** The in-process `setInterval` scheduler currently forces every instance to stay alive and billing 24/7. Moving it to Cloud Scheduler + Cloud Tasks means Cloud Run can go to zero between requests. At low traffic that's nearly the entire bill. At high traffic you're still running instances during peak hours, but they scale down overnight and on weekends instead of running flat-out constantly.

**Twitter is a clean $100 on/off switch.** No partial savings — it's either enabled or it isn't.

**Firebase Hosting is roughly cost-neutral on its own** ($5–35/month vs the egress you were paying from Cloud Run), but the indirect benefit is that Cloud Run handles fewer requests and needs fewer/smaller instances — which compounds the Cloud Run savings.

---

## Individual Service Details

### Google Cloud Run

The app has an in-process scheduler (`setInterval`) that runs YouTube ingestion every hour and banner sync every 6 hours. **In the current setup this means the container can never scale to zero** — it needs at least one always-alive instance or the scheduler silently dies.

Key pricing:
- vCPU: $0.000024/second (first 180k free/month)
- Memory: $0.0000025/GiB-second (first 360k free/month)
- Requests: $0.40/million (first 2M free/month)
- 1 vCPU always-on ≈ 2.6M vCPU-sec/month → ~$58/month after free tier

### PostgreSQL Database

Connected via `DATABASE_URL`. Most likely **Google Cloud SQL**:

| Tier | RAM | Use case | Monthly |
|---|---|---|---|
| db-f1-micro | 614 MB | Low traffic / dev | ~$7 |
| db-g1-small | 1.7 GB | Medium traffic | ~$26 |
| db-n1-standard-2 | 7.5 GB | High traffic | ~$100 |
| + Storage | — | $0.17/GB/month | ~$0–5 |
| + HA failover | — | Doubles compute cost | +$7–100 |

Cheaper alternatives: **Neon** free tier (0.5 GB, $0 → $19/month Pro) or **Supabase** free tier (500 MB, $0 → $25/month Pro).

### YouTube Data API v3 *(currently free)*

Ingestion uses `playlistItems` (1 unit/page) + `videos?part=statistics` (1 unit per 50 IDs). Daily free quota: **10,000 units**.

| Scenario | Units/day | Cost |
|---|---|---|
| Normal hourly polling (5 games) | ~240 | **$0** |
| Force backfill (all 5 channels, one-time) | ~5,000 | **$0** |
| If quota exceeded | per 1,000 units over | $0.29 |

Currently using ~2.4% of the free daily quota.

### Twitter/X API v2

`twitterIngestionService.js` uses Recent Search for ZZZ and NIKKE. Basic tier at $100/month is the minimum usable tier. Leaving `TWITTER_BEARER_TOKEN` as a placeholder keeps this at $0.

| Tier | Monthly | Read quota |
|---|---|---|
| Free | $0 | 500 tweets/month |
| Basic | $100 | 10,000 tweets/month |
| Pro | $5,000 | 1,000,000 tweets/month |

### Firebase Authentication *(free at any realistic scale)*

| MAU | Cost |
|---|---|
| 0 – 10,000 | **$0** (Spark free tier) |
| 10,000 – 100M | **$0** (Email/password and Google OAuth are free at all plan levels) |

No realistic cost unless SMS phone authentication is added ($0.006/verification).

### Google Cloud Build

`cloudbuild.yaml` uses `E2_HIGHCPU_8` (8-vCPU machine), which multiplies build-minute consumption by 8×. Free tier covers 450 real build-minutes/month; beyond that, $0.034/build-minute. Typical dev cadence: **$0–5/month**.

### Google Artifact Registry

Docker image (~200–400 MB) at $0.10/GB/month. Egress within the same region is free.
**Cost: < $1/month**

### Network Egress

Pricing: first 1 GB free, then $0.08/GB (US regions to internet). In the current setup Cloud Run serves all frontend assets directly. In the optimized setup only API responses go through Cloud Run egress.

### Firebase Hosting *(optimized setup only)*

First 10 GB/month transfer free, then $0.15/GB. At high traffic (~30–50 GB/month served), cost is $3–6/month after the free allowance. Includes a global CDN by default.

### Google Cloud Logging *(likely free)*

First 50 GiB/month ingested free. Unlikely to exceed this except at very high traffic with verbose logging. **$0–5/month**.
