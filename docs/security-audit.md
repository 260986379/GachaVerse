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

## 🟠 High — No Rate Limiting on the Enka Player Lookup

**File: `backend/src/routes/gameRoutes.js:13` → `backend/src/controllers/gameController.js:127`**

`GET /api/games/:id/player/:uid` is public and uncached. Every request fires a live fetch to `enka.network`. A user (or bot) can hammer this in a loop with different UIDs and:

- Exhaust Enka's rate limit for your server's IP (getting your IP banned)
- Generate sustained DB + network load with zero friction

**Fix:** Add `express-rate-limit` on this specific route. Also cache successful responses using the `ttl` field Enka returns in its response — the TTL tells you exactly how long to cache before re-fetching is safe.

---

## 🟠 High — `getGameMedia` Returns Unlimited Rows

**File: `backend/src/controllers/gameController.js:76`**

`GET /api/games/:id/media` has no `LIMIT` clause. As the media library grows, a single request could return thousands of rows. Anyone can call this repeatedly.

**Fix:** Add `LIMIT` and pagination the same way `getGameNews` already does it (`gameController.js:55`).

---

## 🟡 Medium — No Input Length Limits on User Content

**Files: `backend/src/controllers/boardController.js:33` (caption), `boardController.js:125` (comment text)**

Board captions and comment text are stored with no maximum length. The Express body limit is 10mb (`app.js:25`), so a user can send megabytes of text per request.

**Fix:** Truncate or reject inputs over a reasonable limit (e.g. `caption` ≤ 500 chars, comment `text` ≤ 2000 chars) either via slice before insert or Joi validation middleware.

---

## 🟡 Medium — `image_url` Not Validated

**File: `backend/src/controllers/boardController.js:34`**

`image_url` is only checked for existence — not validated as a URL or restricted to trusted domains. Users can store arbitrary URLs in the DB. If anything ever fetches that URL server-side, this becomes an SSRF vector.

**Fix:** Validate it's a well-formed `https://` URL and optionally restrict to a known CDN domain allowlist.

---

## ✅ What's Already Good

- `/internal` ingestion routes are properly guarded with `requireTaskSecret`.
- Auth middleware correctly verifies Firebase ID tokens server-side — no JWT forgery risk.
- Board delete uses `WHERE id=$1 AND user_id=$2` — users can't delete other people's boards.
- Comment delete properly checks ownership or board ownership.
- `BOARD_LIMIT = 10` prevents board spam per user.
- All DB queries use parameterized `$1` placeholders — no SQL injection risk.
- UID format is validated with a regex before hitting the Enka API.

---

## Suggested Fix Order

1. **Add auth to all `/api/admin/*` routes** — highest urgency, biggest cost risk (YouTube quota)
2. **Rate limit + cache `/api/games/:id/player/:uid`** — prevents Enka IP ban
3. **Add `LIMIT` + pagination to `getGameMedia`** — prevents large payload abuse
4. **Add length caps to caption / comment text** — prevents oversized DB writes
5. **Validate `image_url` format** — low risk now, good hygiene
