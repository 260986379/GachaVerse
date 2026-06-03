# GachaVerse — Architecture & Deployment Overview

## How Everything Fits Together

### Backend (Cloud Run)

Serves only API requests (`/api/**`). Does not serve the frontend.

- **Local:** `http://localhost:5000` — run `npm run dev` inside `backend/`
- **Live:** `https://gachaverse-backend-50606435860.us-central1.run.app` — never accessed directly by users; Firebase Hosting proxies all `/api/**` calls to it automatically
- **Scales to zero** when idle — no 24/7 billing
- **How to deploy:** run `deploy.ps1` from the project root — builds the Docker image via Cloud Build and deploys it to Cloud Run

### Frontend (Firebase Hosting)

Serves the React app from a global CDN. Any request to `/api/**` is transparently proxied to Cloud Run via `firebase.json`.

- **Local:** `http://localhost:5173` — run `npm run dev` inside `frontend/`; Vite proxies `/api/**` to `localhost:5000`
- **Live:** `https://gachaverse-497204.web.app` — the URL you share with users
- **How to deploy:**
  ```
  cd frontend && npm run build
  cd .. && firebase deploy --only hosting
  ```

### YouTube Ingestion

| Mode | Behaviour |
|---|---|
| Local (`NODE_ENV=development`) | `setInterval` runs `runYouTubeIngestion` every hour inside the Express process |
| Production (`NODE_ENV=production`) | Cloud Scheduler fires hourly → `POST /internal/schedule/youtube` → enqueues 5 Cloud Tasks (one per game) → each task calls `POST /internal/tasks/ingest/youtube` → Cloud Run processes it and goes idle |

Adding a new game requires updating `GAME_SLUGS` in `ingestionScheduler.js` and `GAME_CHANNELS` in `internalRoutes.js`.

---

## URL Reference

| | Local | Live |
|---|---|---|
| Frontend | `http://localhost:5173` | `https://gachaverse-497204.web.app` |
| Backend API | `http://localhost:5000/api` | proxied via Firebase Hosting |
| Backend direct | — | `https://gachaverse-backend-50606435860.us-central1.run.app` |

---

## Deployment Checklist

### Backend
1. Make changes in `backend/`
2. Run `deploy.ps1` from the project root

### Frontend
1. Make changes in `frontend/`
2. Run `npm run build` inside `frontend/`
3. Run `firebase deploy --only hosting` from the project root

### Both (automated)
Pushing to `main` triggers the `deploy-backend` Cloud Build trigger, which rebuilds the Docker image and deploys the frontend to Firebase Hosting in one pipeline.
