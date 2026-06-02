# GachaVerse — Live Server Cost Breakdown

> Last updated: June 2026

**Stack:** Google Cloud Run · PostgreSQL (Cloud SQL or external) · Firebase Auth · Firebase Hosting · YouTube Data API v3 · Google Cloud Build · Artifact Registry · Cloud Scheduler · Cloud Tasks

**Assumptions:** Twitter ingestion disabled · YouTube scheduler runs via Cloud Scheduler + Cloud Tasks · Frontend served from Firebase Hosting

---

## Monthly Estimates

| Cost source | Low traffic | Medium traffic | High traffic |
|---|---|---|---|
| Cloud Run | $5–20 | $25–80 | $60–200 |
| PostgreSQL | $7–15 | $25–30 | $100–200 |
| YouTube API | $0 | $0 | $0 |
| Firebase Auth | $0 | $0 | $0 |
| Cloud Build | $0–2 | $2–5 | $5–15 |
| Artifact Registry | < $1 | < $1 | < $1 |
| Cloud Run egress | < $1 | < $1 | $2–10 |
| Cloud Scheduler | $0 | $0 | $0 |
| Cloud Tasks | < $1 | < $1 | < $1 |
| Firebase Hosting | $0 | $0–5 | $5–35 |
| **Total** | **$12–38** | **$52–121** | **$172–462** |

> Traffic tiers: Low = < 1,000 MAU / < 10k page views/day · Medium = 1,000–10,000 MAU / 50k–200k page views/day · High = 10,000+ MAU / 500k+ page views/day

---

## Service Details

### Google Cloud Run

Handles all API requests. With the scheduler moved out, Cloud Run uses request-based CPU allocation and scales to zero between requests.

- vCPU: $0.000024/second (first 180k free/month)
- Memory: $0.0000025/GiB-second (first 360k free/month)
- Requests: $0.40/million (first 2M free/month)

At low traffic the instance is nearly always at zero. At high traffic, multiple instances spin up during peak hours and back down overnight.

### PostgreSQL Database

Connected via `DATABASE_URL`. Recommended tiers:

| Tier | RAM | Use case | Monthly |
|---|---|---|---|
| db-f1-micro | 614 MB | Low traffic / dev | ~$7 |
| db-g1-small | 1.7 GB | Medium traffic | ~$26 |
| db-n1-standard-2 | 7.5 GB | High traffic | ~$100 |
| + Storage | — | $0.17/GB/month | ~$0–5 |
| + HA failover | — | Doubles compute cost | +$7–100 |

Cheaper alternatives: **Neon** free tier (0.5 GB, $0 → $19/month Pro) or **Supabase** free tier (500 MB, $0 → $25/month Pro). Either can bring the low-traffic DB cost to $0.

### YouTube Data API v3 *(free)*

Ingestion uses `playlistItems` (1 unit/page) + `videos?part=statistics` (1 unit per 50 IDs). Free quota: **10,000 units/day**.

| Scenario | Units/day | Cost |
|---|---|---|
| Normal hourly polling (5 games) | ~240 | $0 |
| Force backfill all 5 channels (one-time) | ~5,000 | $0 |
| If quota exceeded | per 1,000 units over | $0.29 |

Currently using ~2.4% of the daily quota. Free unless many more games are added.

### Firebase Authentication *(free)*

| MAU | Cost |
|---|---|
| 0 – 10,000 | $0 (Spark free tier) |
| 10,000 – 100M | $0 (Email/password and Google OAuth are free at all plan levels) |

No realistic cost unless SMS phone auth is added ($0.006/verification).

### Google Cloud Build

`cloudbuild.yaml` uses `E2_HIGHCPU_8` (8-vCPU machine), which multiplies build-minute consumption by 8×. Free tier covers ~450 real build-minutes/month; beyond that $0.034/build-minute. Typical dev cadence: **$0–5/month**.

### Google Artifact Registry

Docker image (~200–400 MB) stored at $0.10/GB/month. Egress within the same region is free. **< $1/month**.

### Network Egress (Cloud Run)

Cloud Run only serves API responses — no static assets. First 1 GB/month free, then $0.08/GB.

### Cloud Scheduler + Cloud Tasks

YouTube ingestion (hourly, 5 games) and banner sync (every 6 hours) run as scheduled jobs rather than in-process timers.

- Cloud Scheduler: first 3 jobs/month free → **$0**
- Cloud Tasks: ~3,600 tasks/month → ~$0.0015 → **< $1**

### Firebase Hosting

Serves the frontend (HTML, JS, CSS) from a global CDN. First 10 GB/month transfer free, then $0.15/GB.

| Traffic level | Est. transfer/month | Cost |
|---|---|---|
| Low | < 5 GB | $0 |
| Medium | 10–30 GB | $0–5 |
| High | 30–50 GB | $5–35 |

### Google Cloud Logging *(free)*

First 50 GiB/month ingested free. Unlikely to exceed this at any realistic traffic level. **$0–5/month**.
