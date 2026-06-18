# Security Audit — GachaVerse Backend

> Audited: 2026-06-18

---

## 🔴 Critical — Unauthenticated Admin Routes

**File: `backend/src/app.js`, lines 30–142**

Every `/api/admin/*` route has **zero authentication**. Anyone who knows your API URL can hit these:

| Route | Impact |
|---|---|
| `POST /api/admin/backfill` | Triggers full YouTube ingestion for **all 5 game channels** at once. Burns your entire YouTube Data API quota (10,000 units/day) in one call. |
| `POST /api/admin/seed-characters` | Runs 5 DB seed scripts. Repeated calls = duplicate data / DB load. |
| `POST /api/admin/migrate-reviews` | Runs raw DDL (`CREATE TABLE`). Harmless now but shouldn't be public. |
| `POST /api/admin/tag-videos` | Triggers re-classification of all videos. |
| `POST /api/admin/seed-lore` / `seed-images` | Same — unguarded background jobs. |

**Fix:** Add the same `requireTaskSecret` guard already used on `/internal` routes (see `backend/src/routes/internalRoutes.js:14`), or wrap all admin routes in an IP allowlist / `authenticateToken` + role check.

---

## 🔴 Critical — `GET /api/posts` Returns the Entire Table

**File: `backend/src/controllers/postController.js:42`**

When called with no filters, `getAllPosts` runs `SELECT ... FROM posts ORDER BY created_at DESC` with **no LIMIT at all**. As the platform grows this becomes a full table scan returned to the caller. Anyone can hit it in a loop.

**Fix:** Add `LIMIT`/pagination the same way `getPostComments` already does on the same file.

---

## 🟠 High — No Rate Limiting Anywhere

There is **no rate limiting on any endpoint** in the entire backend (`express-rate-limit` is not installed or used). Every public endpoint is fully open to bot traffic — data scraping, Enka lookup spam, suggestion flooding, etc.

**Fix:** Install `express-rate-limit` and apply a global default (e.g. 100 req/min per IP) with tighter limits on sensitive routes like the Enka player lookup.

---

## 🟠 High — No Rate Limiting on the Enka Player Lookup

**File: `backend/src/routes/gameRoutes.js:13` → `backend/src/controllers/gameController.js:127`**

`GET /api/games/:id/player/:uid` is public and uncached. Every request fires a live fetch to `enka.network`. A user (or bot) can hammer this in a loop with different UIDs and:

- Exhaust Enka's rate limit for your server's IP (getting your IP banned)
- Generate sustained DB + network load with zero friction

**Fix:** Add `express-rate-limit` on this specific route. Also cache successful responses using the `ttl` field Enka returns in its response — the TTL tells you exactly how long to cache before re-fetching is safe.

---

## 🟠 High — `POST /api/suggestions` is a Free Anonymous Spam Endpoint

**File: `backend/src/routes/suggestionRoutes.js:5` → `backend/src/controllers/suggestionController.js:5`**

Suggestions can be submitted by completely unauthenticated users with no rate limiting. A bot could flood the suggestions table indefinitely. The `reference_link` field is also stored as any arbitrary string — not validated as a URL.

**Fix:** Either require auth, or add IP-based rate limiting. Validate `reference_link` with `Joi.string().uri()`.

---

## 🟠 High — `getGameMedia` Returns Unlimited Rows

**File: `backend/src/controllers/gameController.js:76`**

`GET /api/games/:id/media` has no `LIMIT` clause. As the media library grows, a single request could return thousands of rows. Anyone can call this repeatedly.

**Fix:** Add `LIMIT` and pagination the same way `getGameNews` already does it (`gameController.js:55`).

---

## 🟡 Medium — No Input Length Limits on User Content

**Files: `backend/src/controllers/boardController.js:33` (caption), `boardController.js:125` (comment text), `userController.js:80` (bio)**

Board captions, comment text, and user bios are stored with no maximum length. The Express body limit is 10mb (`app.js:25`), so a user can send megabytes of text per request.

**Fix:** Reject inputs over a reasonable limit (e.g. `caption` ≤ 500 chars, comment `text` ≤ 2000 chars, `bio` ≤ 500 chars) via Joi validation or a length check before insert.

---

## 🟡 Medium — URL Fields Not Validated

**Files: `backend/src/controllers/boardController.js:34` (`image_url`), `userController.js:82–83` (`avatar_url`, `banner_url`)**

These fields are only checked for existence — not validated as URLs or restricted to trusted domains. Users can store arbitrary values in the DB. If anything ever fetches these URLs server-side, it becomes an SSRF vector.

**Fix:** Validate with `Joi.string().uri()` and optionally restrict to a known CDN domain allowlist.

---

## 🟡 Medium — Firebase API Key Hardcoded in Git

**File: `frontend/src/firebase.js:20`**

The Firebase API key is committed directly in source code. For client-side Firebase Auth this is somewhat expected (Google documents it as a "public identifier"), but it means anyone with repo access can:

- Use your Firebase project to create unlimited accounts (burning Firebase Auth quotas)
- Enumerate registered email addresses via the API

**Fix:** Move it to a `VITE_` prefixed env variable so future rotation doesn't require a git commit. More importantly, check **Firebase Console → Authentication → Settings → Authorized Domains** to ensure only your actual domain is listed.

---

## 🟡 Medium — `getReviews` and `getUserReviews` Have No LIMIT

**File: `backend/src/controllers/reviewController.js:14` and `:141`**

Both return all reviews for a game/user with no pagination or LIMIT clause. Same pattern as the posts issue — low risk now but grows over time.

**Fix:** Add LIMIT + pagination, consistent with `getPostComments`.

---

## 🟡 Medium — Review `body` Has No Length Limit

**File: `backend/src/controllers/reviewController.js:53`**

`body` is stored as-is with no max length check — same issue as bio/comment text.

**Fix:** Add a max length (e.g. ≤ 5000 chars) via a check before insert or Joi validation.

---

## 🟢 Low — `JWT_SECRET` Has a Weak Hardcoded Default

**File: `backend/src/config/index.js:7`**

Defaults to `'change_this_secret_in_production'`. Auth currently uses Firebase token verification so this secret appears unused — but if any code ever starts relying on it without the env var set, it's a silent failure.

**Fix:** Remove the fallback entirely so the app fails loudly on startup if unset: `JWT_SECRET: process.env.JWT_SECRET`.

---

## ✅ What's Already Good

- `/internal` ingestion routes are properly guarded with `requireTaskSecret`.
- `TASK_SECRET` defaulting to `''` is safe — `requireTaskSecret` explicitly returns 503 if empty.
- Auth middleware correctly verifies Firebase ID tokens server-side — no JWT forgery risk.
- `assignRole` checks the actor's role server-side — users cannot self-promote.
- Board/post/comment deletes all use `AND user_id=$N` — users can't delete other people's content.
- Comment delete properly allows board owners to remove comments on their own boards.
- `BOARD_LIMIT = 10` prevents board spam per user.
- All DB queries use parameterized `$1` placeholders — no SQL injection risk.
- UID format is validated with a regex before hitting the Enka API.
- Post text is validated with Joi `max(5000)` in `postController`.
- Comment routes use Joi validation schemas.
- `followUser` prevents self-follows.
- Review sort order uses hardcoded server-side strings, not user input — no SQL injection.
- Concert Hall `count` param is user-controlled but capped at 20 server-side.

---

## Suggested Fix Order

1. **Add auth to all `/api/admin/*` routes** — highest urgency, biggest cost risk (YouTube quota)
2. **Install `express-rate-limit` globally** — blanket protection for all endpoints
3. **Add tighter rate limit + response cache to `/api/games/:id/player/:uid`** — prevents Enka IP ban
4. **Add `LIMIT` + pagination to `getAllPosts`, `getGameMedia`, `getReviews`, `getUserReviews`** — prevents full table scans
5. **Rate limit or require auth on `POST /api/suggestions`** — prevents anonymous spam
6. **Add length caps to caption / comment text / bio / review body** — prevents oversized DB writes
7. **Move Firebase config to env variables** — enables key rotation without git commits
8. **Validate URL fields** (`image_url`, `avatar_url`, `banner_url`, `reference_link`) — good hygiene
9. **Remove `JWT_SECRET` fallback default** — fail loudly if env var is missing
