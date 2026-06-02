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

**Currently:** `ingestionScheduler.js` runs `setInterval` loops inside the Express process for YouTube ingestion (every 1h) and banner sync (every 6h). This forces `min-instances=1` and CPU-always-allocated — the container bills 24/7 regardless of actual user traffic.

**Optimized:** Scheduler is extracted to Cloud Scheduler + Cloud Tasks (see below). Cloud Run reverts to the default request-based CPU model and scales to zero when idle. It only serves API requests — static frontend files are no longer routed through it.

- vCPU: $0.000024/second (first 180k free/month)
- Memory: $0.0000025/GiB-second (first 360k free/month)
- Requests: $0.40/million (first 2M free/month)

At low traffic the instance sits at zero most of the time. At high traffic, instances spin up during peak hours and back down overnight instead of running flat-out constantly.

---

### PostgreSQL Database

**Currently / Optimized:** No change to the database itself — it stays on Cloud SQL (or an external provider) connected via `DATABASE_URL`. The optimized setup does not affect the DB tier needed.

| Tier | RAM | Use case | Monthly |
|---|---|---|---|
| db-f1-micro | 614 MB | Low traffic / dev | ~$7 |
| db-g1-small | 1.7 GB | Medium traffic | ~$26 |
| db-n1-standard-2 | 7.5 GB | High traffic | ~$100 |
| + Storage | — | $0.17/GB/month | ~$0–5 |
| + HA failover | — | Doubles compute cost | +$7–100 |

Cheaper alternatives: **Neon** free tier (0.5 GB, $0 → $19/month Pro) or **Supabase** free tier (500 MB, $0 → $25/month Pro). Either can bring the low-traffic DB cost to $0.

---

### YouTube Data API v3 *(free)*

**Currently / Optimized:** The API calls themselves are unchanged — same `playlistItems` + `videos?part=statistics` pattern, same hourly cadence, same 5 game channels. The only difference is *what triggers* the ingestion (see Cloud Scheduler below). API cost stays at $0.

Ingestion uses `playlistItems` (1 unit/page) + `videos?part=statistics` (1 unit per 50 IDs). Free quota: **10,000 units/day**.

| Scenario | Units/day | Cost |
|---|---|---|
| Normal hourly polling (5 games) | ~240 | $0 |
| Force backfill all 5 channels (one-time) | ~5,000 | $0 |
| If quota exceeded | per 1,000 units over | $0.29 |

Currently using ~2.4% of the daily quota. Free unless many more games are added.

---

### Twitter/X API v2

**Currently:** `twitterIngestionService.js` is wired up and would call the Recent Search endpoint for ZZZ and NIKKE if a valid `TWITTER_BEARER_TOKEN` is set. The minimum usable tier is Basic at $100/month.

**Optimized:** Bearer token left as a placeholder. The ingestion code remains in the codebase but never executes. Cost: $0.

---

### Firebase Authentication *(free)*

**Currently / Optimized:** No change. Already using Firebase Auth for Email/Password and Google OAuth. Both are free at all realistic MAU levels.

| MAU | Cost |
|---|---|
| 0 – 10,000 | $0 (Spark free tier) |
| 10,000 – 100M | $0 (Email/password and Google OAuth free at all plan levels) |

No realistic cost unless SMS phone auth is added ($0.006/verification).

---

### Google Cloud Build

**Currently / Optimized:** No change. `cloudbuild.yaml` uses `E2_HIGHCPU_8` (8-vCPU machine), which multiplies build-minute consumption by 8×. Free tier covers ~450 real build-minutes/month; beyond that $0.034/build-minute. Typical dev cadence: **$0–5/month**.

---

### Google Artifact Registry

**Currently / Optimized:** No change. Docker image (~200–400 MB) stored at $0.10/GB/month. Egress within the same region is free. **< $1/month**.

---

### Network Egress (Cloud Run)

**Currently:** Cloud Run serves everything — API responses and all frontend static assets (HTML, JS bundles, CSS, game data JSON). Every page load bills egress.

**Optimized:** Cloud Run only serves API responses. Static assets are offloaded to Firebase Hosting. Egress volume drops significantly at all traffic levels.

Pricing: first 1 GB/month free, then $0.08/GB (US regions to internet).

---

### Cloud Scheduler + Cloud Tasks *(new in optimized setup)*

**Currently:** Does not exist — background jobs run as `setInterval` loops inside the Express process.

**Optimized:** Two Cloud Scheduler jobs replace the in-process timers:
- YouTube ingestion: fires hourly, enqueues 5 Cloud Tasks (one per game channel)
- Banner sync: fires every 6 hours, enqueues 1 Cloud Task

Cloud Run exposes internal handler endpoints that each Task calls. This decouples the scheduler lifetime from the web server entirely.

- Cloud Scheduler: first 3 jobs/month free → **$0**
- Cloud Tasks: ~3,600 tasks/month → ~$0.0015 → **< $1**

---

### Firebase Hosting *(new in optimized setup)*

**Currently:** Does not exist — the Dockerfile copies the Vite build output into the container (`COPY --from=frontend-build /frontend/dist ./frontend/dist`) and Express serves it as static files in production via `app.use(express.static(distPath))`.

**Optimized:** The frontend build is deployed separately to Firebase Hosting, which serves assets from a global CDN. The Express static file middleware and the `COPY --from=frontend-build` step in the Dockerfile can be removed, shrinking the container image and eliminating all static-asset request handling from Cloud Run.

First 10 GB/month transfer free, then $0.15/GB.

| Traffic level | Est. transfer/month | Cost |
|---|---|---|
| Low | < 5 GB | $0 |
| Medium | 10–30 GB | $0–5 |
| High | 30–50 GB | $5–35 |

---

### Google Cloud Logging *(free)*

**Currently / Optimized:** No change. First 50 GiB/month ingested free. Unlikely to exceed this at any realistic traffic level. **$0–5/month**.
