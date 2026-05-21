# GachaVerse — App Review & Status Audit

_Last updated: 2026-05-21_

---

## What's Fully Built

### Backend — solid foundation
- Express server, all middleware (auth JWT, CORS, validation, error handler)
- 9-table PostgreSQL schema with proper foreign keys and cascade rules
- All auth routes: `register`, `login`, `me`
- Game routes: list, detail, characters, news, media
- User routes: profile, game library (add/remove)
- Post and comment create/read routes
- Auto-seeding on first server start (ZZZ + NIKKE games, characters, demo news/media, ingestion logs)
- Twitter + YouTube ingestion services — code complete, gated by placeholder API keys

### Frontend — visual layer
- `ExplorePage`: spotlight YouTube carousel, genre-filtered game grid
- `GamePage`: News Feed, Media, and Cast tabs all fetch live from the backend
- `GameCard`, `TwitterEmbed`, `YouTubeEmbed` components are solid

---

## What's a Stub or Disconnected

| Area | Status |
|---|---|
| `AccountPage` | Renders "Guest User" only — no auth, no data, no forms |
| Auth UI (login/register) | No forms exist anywhere in the frontend |
| Auth state management | No Context/Redux — JWT has nowhere to live |
| `GET /api/games` backend endpoint | Exists but frontend ignores it; uses hardcoded `games.js` instead |
| `GET /api/comments` endpoint | **Missing entirely** — no way to fetch comments for a post |
| Post create/view UI | Backend works, no frontend UI |
| Comment UI | Backend works, no frontend UI |
| User profile pages | No page, no click-through from usernames |
| Navbar search | Input renders but has no `onChange` or API call |
| GamePage tabs: Lore, Community, Guides, More like this | "Coming soon" placeholders |
| Post/comment edit + delete routes | Not implemented |
| Pagination on posts/news/media | None — returns everything at once |

---

## Critical Things to Fix Before Adding New Features

These are genuine blockers — building on top of them now will cause rework.

### 1. Auth state management
You need a React Context (or similar) that holds the JWT and user object, persists to `localStorage`, and exposes `login`/`logout`. Every protected UI feature depends on this.

### 2. Central API client
Right now each component calls `fetch('/api/...')` independently. A small wrapper that attaches the `Authorization: Bearer <token>` header automatically will save pain on every auth-protected feature.

### 3. Game data unification
Frontend has 10 hardcoded games in `games.js` with fields the backend doesn't have (`color1`, `color2`, `youtubeId`, `events`, `status`, `rating`). Backend only seeds ZZZ and NIKKE. Visiting `/game/genshin-impact` returns nothing from the backend. Options:
- Seed all 10 games in the backend and extend the schema or handle extra fields in a frontend mapping layer
- Trim the frontend to match what's in the DB

### 4. Missing `GET /api/comments/:postId` endpoint
The schema and create route exist but there's no read endpoint. Any community or post feature needs this before it can work end-to-end.

### 5. JWT secret
`backend/.env` currently has `JWT_SECRET=YOUR_VERY_STRONG_JWT_SECRET_HERE`. Tokens signed with a weak/guessable secret are a real security issue. Set it to a long random string before any user-facing auth goes live.

---

## Suggested Order to Unblock Everything

1. Fix JWT secret — set a real random value in `backend/.env`
2. Build auth Context + API client wrapper (frontend)
3. Build login/register forms + wire `AccountPage`
4. Unify game data (decide on the model, seed backend, drop or map `games.js`)
5. Add `GET /api/comments/:postId` endpoint (backend, quick)
6. Build post feed + post create form (Community tab on GamePage is the natural home)
7. Build threaded comment UI
8. Wire up user profile pages + tracked games UI

---

## Getting the App Running (First-Time Setup)

If the News Feed, Media, or Cast tabs show errors, it means the backend isn't running or the database hasn't been created yet. Fix in order:

**Step 1 — create the DB user and database** (only needed once):

```bash
psql -U postgres -c "CREATE USER gachauser WITH PASSWORD 'gachapass';"
psql -U postgres -c "CREATE DATABASE gachaverse_db OWNER gachauser;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE gachaverse_db TO gachauser;"
```

**Step 2 — start the backend** (in `backend/`):

```bash
npm run dev
```

On first start, the server auto-creates all 9 tables and seeds ZZZ + NIKKE data. Watch for `Database schema ready` and `Server running on http://localhost:5000`.

**Step 3 — start the frontend** (in `frontend/`, separate terminal):

```bash
npm run dev
```

The Vite dev server proxies all `/api/*` requests to `localhost:5000` automatically — no CORS config needed.

---

## How the Database Gets Populated

There are four distinct layers of data:

### 1. Static game and character data (auto-seeded at startup)
`backend/src/services/gameDataService.js` seeds ZZZ and NIKKE — including metadata, characters, demo news, and demo YouTube videos — on every first server start (`games` table empty = seed runs). To add a new game, add its data object and character list to that file and it will seed on the next fresh DB start. This is the only manual step for adding new supported games.

### 2. Live news + media via ingestion (automated, needs API keys)
Once real API keys are set in `backend/.env`, the scheduler in `ingestionScheduler.js` runs:
- Twitter ingestion every **15 minutes** — fetches tweets from official game handles, stores in `news_articles`
- YouTube ingestion every **60 minutes** — fetches videos from official channel IDs, stores in `media_content`

Both services are idempotent (use `ON CONFLICT DO NOTHING`) so re-runs don't create duplicates. To enable:
- Set `TWITTER_BEARER_TOKEN` to a real Twitter API v2 Bearer Token
- Set `YOUTUBE_API_KEY` to a real YouTube Data API v3 key

### 3. User-generated content (needs auth UI — not yet built)
Posts and comments will be created by users once the auth UI and post creation forms are built. These hit `POST /api/posts` and `POST /api/comments/:postId` and go directly into the `posts` and `comments` tables.

### 4. User game libraries (needs auth UI — not yet built)
When users add games to their tracked list, it writes to the `user_games` table via `POST /api/users/me/games`. This is also gated on the auth UI being built.

---

## Full Feature Status Table

| Component | Status | Notes |
|---|---|---|
| Backend entry (server.js, app.js) | ✅ Complete | Functional |
| Database schema | ✅ Complete | 9 tables, proper relations |
| Auth routes | ✅ Complete | register, login, me |
| Auth middleware | ✅ Complete | JWT verification working |
| Game routes | ✅ Complete | GET for games, characters, news, media |
| User routes | ⚠️ Partial | Read + add/remove game work; no update profile |
| Post routes | ⚠️ Partial | Create + read work; no update/delete/likes |
| Comment routes | ⚠️ Partial | Create works; no GET, update, or delete |
| Twitter ingestion | ⚠️ Gated | Code complete; needs real `TWITTER_BEARER_TOKEN` |
| YouTube ingestion | ⚠️ Gated | Code complete; needs real `YOUTUBE_API_KEY` |
| Frontend router | ✅ Complete | 3 pages set up correctly |
| ExplorePage | ✅ Mostly | Spotlight + game grid work; games are hardcoded |
| GamePage | ✅ Mostly | News/Media/Cast tabs work; Lore/Community/Guides/More are stubs |
| AccountPage | ❌ Stub | No auth, no user data, no functionality |
| Auth UI (login/register) | ❌ Missing | No forms in frontend |
| Post feed UI | ❌ Missing | No way to view community posts |
| Post creation UI | ❌ Missing | No form to create posts |
| User profile pages | ❌ Missing | No page; can't navigate to a user |
| Search | ❌ Missing | Navbar input non-functional |
| API client layer | ❌ Missing | No centralized fetch wrapper |
| Auth state management | ❌ Missing | No Context/store for token and user |
| Comments GET endpoint | ❌ Missing | Not implemented in backend |
| Pagination | ❌ Missing | All list endpoints return full result sets |
