# GachaVerse Tech Stack

## Frontend
- **React + Vite** — UI, compiled to static files
- **Firebase Hosting** — serves static files via CDN
- **Firebase Auth** — handles login/signup (Google, email, etc.)

## Backend
- **Node.js + Express** — REST API (users, characters, posts, reviews, notifications, moderation, etc.)
- **Google Cloud Run** — runs the Express app in a Docker container; scales to zero when idle
- **JWT** — session tokens used alongside Firebase Auth
- **Google Secret Manager** — stores `DATABASE_URL`, `JWT_SECRET`, `YOUTUBE_API_KEY`

## Database
- **Neon (PostgreSQL 15)** — serverless Postgres, scales to zero, free tier
  - Region: AWS us-east-2 (Ohio)
  - Migrated from Cloud SQL on 2026-06-04

## Data Ingestion
- **YouTube Data API v3** — pulls videos and news from official channels (ZZZ, NIKKE, Genshin, HSR, Wuthering Waves)
- **Twitter/X API v2** — pulls tweets from official game accounts
- **Cloud Tasks** (`youtube-ingestion` queue) — queues ingestion jobs asynchronously
- **Cloud Scheduler** — triggers ingestion on a cron schedule

## CI/CD & Infrastructure
- **Cloud Build** — on git push: builds Docker image, deploys to Cloud Run
  - Machine type: `E2_MEDIUM` (default)
- **Artifact Registry** — stores Docker images (`us-central1-docker.pkg.dev/gachaverse-497204/gachaverse/app`)
- **Cloud Storage** — Cloud Build artifacts and cache (`gachaverse-497204_cloudbuild`)

## Request Flow
```
User → Firebase Hosting (React) → Cloud Run (Express API) → Neon (PostgreSQL)
                                        ↑
                          Cloud Scheduler → Cloud Tasks → YouTube/Twitter APIs
```

## GCP Project
- Project ID: `gachaverse-497204`
- Primary region: `us-central1`
- Cloud Run service: `gachaverse-backend`
