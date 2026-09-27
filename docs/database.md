# Database: Neon plan, limits and decisions

Recorded 2026-09-26 for issue #49. Revisit when traffic grows (see "When to revisit").

## Current setup (measured)

| | |
|---|---|
| Provider / plan | Neon, **Free** (confirmed: `neon.max_cluster_size = 512 MB`, Free's storage cap) |
| Region | AWS `us-east-2` (Ohio). Backend is Cloud Run, GCP `us-central1` (Iowa) |
| Compute | Autoscaling **0.25 → 2 CU** (inferred from `max_connections = 901` / max cache 6.5 GB = 2 CU ceiling, current cache limit 819 MB = 0.25 CU) |
| Scale to zero | After **5 min idle** (fixed on Free) |
| Database size | 18 MB of 512 MB (images moved out to Firebase Storage in #45) |
| Latency | ~30 ms per query (cross-cloud), ~250 ms to open a connection |
| Endpoint | **Direct** (not `-pooler`) |

## What uses the compute allowance

Free includes **100 CU-hours/month**. Compute is billed while the database is awake, and it stays awake until 5 minutes after the last query.

- **Hourly YouTube ingestion** (Cloud Scheduler, every hour) does ~10–20 s of work per run but keeps the database awake ~5 min each hour: **~65 h/month ≈ 16 CU-hours** at 0.25 CU.
- That leaves ~84 CU-hours ≈ **~11 h/day** of visitor-driven awake time at 0.25 CU.
- Continuous activity 24/7 would use ~180 CU-hours and **exhaust the allowance around day 16–17**, after which the database is suspended until the next month and the API stops working.
- Busy periods scale compute above 0.25 CU, which uses the allowance faster.

Rough capacity: fine below ~100 daily users; risky from ~100–300 daily users spread across the day. CDN caching of public GET responses (#49) reduces load and latency but does **not** materially reduce awake time: cache windows (60 s–10 min) are close to the 5-minute idle timeout.

## Decisions

### 1. Plan: upgrade to Neon **Launch** before inviting a real audience

- Removes the monthly hard stop, the only failure here that takes the whole site down.
- Expected cost at current usage: **~$2–5/month** (16–30 CU-hours × $0.106 + storage at $0.35/GB-month). Check whether Launch has a monthly minimum.
- Settings to use: keep the 5-minute idle suspend, and **cap autoscaling at 1 CU** (this site's queries do not need 2 CU; it halves the worst-case burn rate).
- Status: **pending** (owner to upgrade in the Neon console).

### 2. Stay on Neon for now; do not move to Cloud SQL yet

- The ~30 ms per-query delay comes from crossing AWS ↔ GCP. Moving Neon to another AWS region does not remove it; Neon does not run in GCP regions.
- Google Cloud SQL in `us-central1` would cut queries to ~1–2 ms, but **has no scale-to-zero**: the smallest instance costs roughly $9–10/month always-on (verify current pricing). Stopping it manually or on a schedule takes a minute or more to restart, so it cannot wake per request. AlloyDB and Spanner are also always-on and far more expensive.
- A self-managed Postgres on the free e2-micro VM would be fast and ~$0, but means owning backups, patching and recovery for real user data. Not recommended.

### 3. Connection endpoint: keep the **direct** endpoint for now

- Worst case today: 10 Cloud Run instances × 10 connections (node-postgres default pool) = **100 connections**.
- `max_connections` scales with the autoscaling **maximum**: 901 at 2 CU, ~450 at 1 CU, **~104 at 0.25 CU**. Capping at 1 CU (decision 1) keeps ample headroom.
- **Switch to the pooled (`-pooler`) endpoint** if the autoscaling max is ever set to 0.25 CU, or if Cloud Run `maxScale` / the pool size is raised so 100 connections could be exceeded.

## Backups / point-in-time restore

**Not yet confirmed.** Free keeps only a short restore window; paid plans keep days of history. Check the value in the Neon console (project settings → restore window / history retention) after upgrading, and record it here. It must be judged acceptable before real user data lands.

## When to revisit

Move to **Cloud SQL in `us-central1`** when Neon's usage page shows the database awake **most of the day**. At that point Neon at 0.25 CU always-on costs ~$19/month, more than an always-on Cloud SQL instance (~$10), and Cloud SQL is also faster. The data migration itself is small (pg_dump/restore); most of the work is the connection change and a careful cut-over.

## Related changes made on 2026-09-26

- **Startup migrations skipped when unchanged** (`backend/src/models/migrate.js`): cold starts no longer run ~66 sequential schema/seed queries (1.7–2.9 s); one fingerprint query (~33 ms) instead.
- **CDN caching for public GET responses** (`backend/src/middleware/cacheControl.js`).
