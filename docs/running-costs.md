# GachaVerse — Live Server Cost Breakdown

> Last updated: June 2026

**Stack:** Google Cloud Run · Neon (PostgreSQL) · Firebase Auth · Firebase Hosting · YouTube Data API v3 · Google Cloud Build · Artifact Registry · Cloud Scheduler · Cloud Tasks

**Assumptions:** Twitter ingestion disabled · YouTube scheduler runs via Cloud Scheduler + Cloud Tasks · Frontend served from Firebase Hosting

---

## Monthly Estimates

| Cost source | Low traffic | Medium traffic | High traffic |
|---|---|---|---|
| Cloud Run | $1–10 | $20–70 | $50–180 |
| Neon (PostgreSQL) | $0 | $19–69 | $69–200 |
| YouTube API | $0 | $0 | $0 |
| Firebase Auth | $0 | $0 | $0 |
| Cloud Build | $0–2 | $2–5 | $5–15 |
| Artifact Registry | < $1 | < $1 | < $1 |
| Cloud Run egress | < $1 | < $1 | $2–10 |
| Cloud Scheduler | $0 | $0 | $0 |
| Cloud Tasks | < $1 | < $1 | < $1 |
| Firebase Hosting | $0 | $0–3 | $3–25 |
| **Total** | **$1–13** | **$41–148** | **$129–431** |

> Traffic tiers: Low = < 1,000 MAU / < 10k page views/day · Medium = 1,000–10,000 MAU / 50k–200k page views/day · High = 10,000+ MAU / 500k+ page views/day

---

## Service Details

### Google Cloud Run

`ingestionScheduler.js` is a no-op in production — YouTube ingestion is triggered externally by Cloud Scheduler + Cloud Tasks (see below). Cloud Run is configured with `--min-instances=0` and `--cpu-throttling`, so it scales to zero when idle and only bills during active API requests.

- vCPU: $0.000024/second (first 180k free/month)
- Memory: $0.0000025/GiB-second (first 360k free/month)
- Requests: $0.40/million (first 2M free/month)

At low traffic the instance sits at zero most of the time. At high traffic, instances spin up during peak hours and back down overnight instead of running flat-out constantly.

---

### Neon (PostgreSQL)

Serverless PostgreSQL connected via `DATABASE_URL`. Scales to zero between requests — no idle compute cost. Branching is built-in, which makes preview deploys and staging environments cheap.

| Plan | Storage | Compute hours included | Monthly |
|---|---|---|---|
| Free | 0.5 GB | 191.9 hrs (~0.25 CU continuous) | $0 |
| Launch | 10 GB | 300 hrs, then $0.16/CU-hr | $19 |
| Scale | 50 GB | 750 hrs, then $0.16/CU-hr | $69 |

- **Low traffic:** Free tier is sufficient (< 0.5 GB data, light query load). $0.
- **Medium traffic:** Launch plan covers most cases; Scale if query volume spikes. $19–69.
- **High traffic:** Scale plan as baseline; overages accrue at $0.16/CU-hour. $69–200.

---

### YouTube Data API v3 *(free)*

API calls are unchanged — same `playlistItems` + `videos?part=statistics` pattern, same hourly cadence, same 5 game channels. The only difference is what triggers the ingestion (Cloud Scheduler — see below). API cost stays at $0.

Ingestion uses `playlistItems` (1 unit/page) + `videos?part=statistics` (1 unit per 50 IDs). Free quota: **10,000 units/day**.

| Scenario | Units/day | Cost |
|---|---|---|
| Normal hourly polling (5 games) | ~240 | $0 |
| Force backfill all 5 channels (one-time) | ~5,000 | $0 |
| If quota exceeded | per 1,000 units over | $0.29 |

Currently using ~2.4% of the daily quota. Free unless many more games are added.

---

### Twitter/X API v2

`twitterIngestionService.js` is wired up but never executes — bearer token is left as a placeholder. The minimum usable tier is Basic at $100/month. Cost: $0.

---

### Firebase Authentication *(free)*

Using Firebase Auth for Email/Password and Google OAuth. Both are free at all realistic MAU levels.

| MAU | Cost |
|---|---|
| 0 – 10,000 | $0 (Spark free tier) |
| 10,000 – 100M | $0 (Email/password and Google OAuth free at all plan levels) |

No realistic cost unless SMS phone auth is added ($0.006/verification).

---

### Google Cloud Build

`cloudbuild.yaml` uses `E2_HIGHCPU_8` (8-vCPU machine), which multiplies build-minute consumption by 8×. Free tier covers ~450 real build-minutes/month; beyond that $0.034/build-minute. Each build now includes the frontend Vite build + Firebase Hosting deploy in addition to the Docker image build. Typical dev cadence: **$0–5/month**.

---

### Google Artifact Registry

Docker image (~200–400 MB, backend only — frontend is no longer bundled in the container) stored at $0.10/GB/month. Egress within the same region is free. **< $1/month**.

---

### Network Egress (Cloud Run)

Cloud Run serves only API responses. All static frontend assets (HTML, JS bundles, CSS, game data) are served from Firebase Hosting. Egress from Cloud Run is limited to JSON API responses only.

Pricing: first 1 GB/month free, then $0.08/GB (US regions to internet).

---

### Cloud Scheduler + Cloud Tasks

One Cloud Scheduler job replaces the in-process `setInterval` timer:
- YouTube ingestion: fires hourly → calls `POST /internal/schedule/youtube` on Cloud Run → enqueues 5 Cloud Tasks (one per game channel) → each task calls `POST /internal/tasks/ingest/youtube`

Cloud Run exposes internal handler endpoints that each Task calls. This decouples the scheduler lifetime from the web server entirely and allows Cloud Run to scale to zero.

- Cloud Scheduler: 1 job → **$0** (first 3 jobs free)
- Cloud Tasks: ~3,600 tasks/month (5 games × 720 fires) → ~$0.0015 → **< $1**

---

### Firebase Hosting

The frontend build is deployed separately to Firebase Hosting via `firebase deploy --only hosting`, which serves assets from a global CDN. The Express static file middleware and the frontend build stage in the Dockerfile have been removed, shrinking the container image and eliminating all static-asset request handling from Cloud Run.

All `/api/**` requests from the frontend are rewritten by Firebase Hosting to the Cloud Run service — the backend URL is never exposed directly to users.

First 10 GB/month transfer free, then $0.15/GB.

| Traffic level | Est. transfer/month | Cost |
|---|---|---|
| Low | < 5 GB | $0 |
| Medium | 10–30 GB | $0–5 |
| High | 30–50 GB | $5–35 |

---

### Google Cloud Logging *(free)*

First 50 GiB/month ingested free. Unlikely to exceed this at any realistic traffic level. **$0–5/month**.
