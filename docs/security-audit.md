# Security Audit — GachaVerse Backend

> Audited: 2026-06-18

---

## ✅ Fixed (2026-09-20) — Unauthenticated Admin Routes

**File: `backend/src/app.js`, lines 30–142**

**Resolution:** `requireTaskSecret` was extracted from `internalRoutes.js` into `backend/src/middleware/requireTaskSecret.js` (now with a timing-safe comparison) and mounted as `app.use('/api/admin', requireTaskSecret)` ahead of every admin route, so current and future admin routes are guarded by default. Callers must send `Authorization: Bearer <TASK_SECRET>`; if `TASK_SECRET` is unset the routes fail closed with 503.

---

<details>
<summary>Original finding</summary>

Every `/api/admin/*` route has **zero authentication**. Anyone who knows your API URL can hit these:

| Route | Impact |
|---|---|
| `POST /api/admin/backfill` | Triggers full YouTube ingestion for **all 5 game channels** at once. Burns your entire YouTube Data API quota (10,000 units/day) in one call. |
| `POST /api/admin/seed-characters` | Runs 5 DB seed scripts. Repeated calls = duplicate data / DB load. |
| `POST /api/admin/migrate-reviews` | Runs raw DDL (`CREATE TABLE`). Harmless now but shouldn't be public. |
| `POST /api/admin/tag-videos` | Triggers re-classification of all videos. |
| `POST /api/admin/seed-lore` / `seed-images` | Same — unguarded background jobs. |

**Fix:** Add the same `requireTaskSecret` guard already used on `/internal` routes (see `backend/src/routes/internalRoutes.js:14`), or wrap all admin routes in an IP allowlist / `authenticateToken` + role check.

</details>

---

## ✅ Fixed (2026-09-25) — `GET /api/posts` Returns the Entire Table

**File: `backend/src/controllers/postController.js:30`**

**Resolution:** `getAllPosts` is now paginated using the same convention as `getPostComments` and `getGameNews` — `?limit` (default 30, capped at 100) and `?page`, fetching `limit + 1` rows to compute `hasMore`. The four hand-written filter branches were replaced by a built `WHERE` clause so `LIMIT`/`OFFSET` always occupy the last two placeholders. `limit` is clamped on **both** ends: `Math.min(Math.max(n, 1), 100)`, because `parseInt('-5') || 30` yields `-5` (truthy), which would emit `LIMIT -4` and 500.

**Response shape changed** from a bare array to `{ items, hasMore }`, matching the other paginated endpoints. Safe to do because nothing in the frontend consumes `/api/posts` yet.

---

<details>
<summary>Original finding</summary>

When called with no filters, `getAllPosts` runs `SELECT ... FROM posts ORDER BY created_at DESC` with **no LIMIT at all**. As the platform grows this becomes a full table scan returned to the caller. Anyone can hit it in a loop.

**Fix:** Add `LIMIT`/pagination the same way `getPostComments` already does on the same file.

</details>

---

## ✅ Fixed (2026-09-25) — No Rate Limiting Anywhere

**Files: `backend/src/middleware/rateLimit.js` (new), `backend/src/utils/clientIp.js` (new), `backend/src/app.js:32`**

**Resolution:** `express-rate-limit` v8 mounted on `/api` — **100 requests per minute per client IP** by default, tunable without a redeploy via `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`. Blocked requests return **429** with `Retry-After`, `RateLimit` (draft-7) headers and a JSON `{ message, retryAfter }` body the existing frontend error paths already render.

Deliberately **not** covered:
- `/internal/*` — reached by Cloud Scheduler and Cloud Tasks from rotating Google IPs, already guarded by `TASK_SECRET`, and bursts five requests on the hour.
- `/api/admin/*` — already guarded by `TASK_SECRET` and run by hand; a seed or backfill should not be throttled.

### Client IP resolution — the part that makes this work

`firebase.json` rewrites `/api/**` to Cloud Run, so production traffic is **user → Firebase Hosting (Google edge) → Cloud Run**. Cloud Run request logs confirm the proxied peer is a Google address (e.g. `66.102.8.167`), *not* the visitor. Keying on `req.ip` would therefore have put **every visitor in one bucket** — a 100/min cap for the entire site.

`utils/clientIp.js` reads the **first** `X-Forwarded-For` entry, which Google's edge sets to the originating client. `playerLookupGuard.js` now shares this helper, correcting the Enka limiter, which had the same latent flaw.

**Known trade-off:** Cloud Run ingress is `all`, so the service is reachable directly, bypassing Firebase. A caller on that path can forge the first `X-Forwarded-For` entry and select their own bucket. Reading the last entry instead would be forgery-proof but wrong for all real traffic, so it is not a fix. **Restricting Cloud Run ingress is NOT a viable mitigation — tested and ruled out 2026-09-25.** Setting `--ingress internal-and-cloud-load-balancing` made the Firebase Hosting path return 404 alongside the direct path: Firebase’s Cloud Run rewrite does not go through a customer Google Cloud load balancer, so it is blocked too. Reverted to `all` immediately; both paths verified healthy afterwards. The remaining option is verifying the request genuinely arrived via Google’s edge before trusting the forwarded client address — which requires first observing the real `X-Forwarded-For` shape in production via `GET /internal/whoami`. `CLIENT_IP_SOURCE` (`first` | `last` | `socket`) allows switching strategy without a code change.

`GET /internal/whoami` (secret-guarded) reports the resolved IP, strategy and full hop chain, so the above can be confirmed against the live service on both access paths.

### ⏭️ Open follow-up — harden client IP trust (picks up where 2026-09-25 left off)

**Status:** rate limiting is live and correct for all real users. One bypass remains, documented here so it is not lost.

**The gap.** Client IP is taken from the *first* `X-Forwarded-For` entry. That is correct for traffic through Firebase Hosting (the only path real users take). A caller hitting the Cloud Run URL **directly** can forge that entry and hand themselves a fresh rate-limit bucket. Impact is limited to evading rate limits — no data access, no auth bypass — and it is still strictly better than the previous state of no rate limiting at all.

**Ruled out:** restricting Cloud Run ingress (tested 2026-09-25, see above — it blocks Firebase too).

**Also ruled out:** keying on the TCP peer (`req.socket.remoteAddress`). On Cloud Run the container sits behind Cloud Run's own proxy, so the socket peer is an internal address for *every* request and cannot distinguish the direct path from the proxied one.

#### Step 1 — measure before coding (do not skip)

The right hop to verify is unknown until the real header is observed in production. An earlier assumption that the *last* hop was the client turned out to be wrong and would have made the Enka limiter global; do not guess again.

After any deploy, run both:

```powershell
$S = gcloud secrets versions access latest --secret=TASK_SECRET

# via Firebase Hosting — the real user path
curl.exe -s -H "Authorization: Bearer $S" "https://gachaverse-497204.web.app/internal/whoami"

# direct to Cloud Run — the bypass path
curl.exe -s -H "Authorization: Bearer $S" "https://gachaverse-backend-50606435860.us-central1.run.app/internal/whoami"
```

Each returns `resolvedClientIp`, `strategy`, `forwardedForHops`, `socketRemote`, `host`. Diffing the two shows which hops Google's edge controls and which the caller can forge.

**Known wrinkle:** `firebase.json` only rewrites `/api/**`, so the first call may hit the SPA fallback and return `index.html` instead of reaching the backend. That result is itself informative — it would mean `/internal` is unreachable through Firebase, narrowing the exposed surface. If so, move the diagnostic to `/api/admin/whoami` (already secret-guarded by the `/api/admin` mount) and repeat.

#### Step 2 — implement

Verify the request genuinely arrived via Google's edge before trusting the forwarded address: check the appropriate hop against Google's published ranges (`https://www.gstatic.com/ipranges/goog.json`), cached with a long TTL.

- Hop is Google-owned → came through Firebase → trust the client entry.
- Otherwise → direct hit → treat as untrusted and fall back to the most restrictive key.

**Fail closed:** if the range list cannot be fetched, fall back to the restrictive interpretation, never the permissive one.

Slots into `backend/src/utils/clientIp.js` behind the interface both limiters already use, so neither call site changes. `CLIENT_IP_SOURCE` (`first` | `last` | `socket`) remains as a no-redeploy override.

#### Also still open on rate limiting

- Store is in-memory and per-instance: effective ceiling is 100/min × running instances (`maxScale=10`). A shared store is needed for an exact global limit.
- No tighter per-route limits on auth endpoints (login/register brute force).

---

<details>
<summary>Original finding</summary>

There is **no rate limiting on any endpoint** in the entire backend (`express-rate-limit` is not installed or used). Every public endpoint is fully open to bot traffic — data scraping, Enka lookup spam, suggestion flooding, etc.

**Fix:** Install `express-rate-limit` and apply a global default (e.g. 100 req/min per IP) with tighter limits on sensitive routes like the Enka player lookup.

</details>

---

## ✅ Fixed (2026-09-25) — No Rate Limiting on the Enka Player Lookup

**File: `backend/src/services/playerLookupGuard.js` (new) → `backend/src/controllers/gameController.js:128`**

**Resolution:** two layers, both in `playerLookupGuard.js`:

1. **Per-UID response cache**, keyed `game:uid`, honouring the `ttl` Enka returns (`enkaService.js:185,207`). `ttl` is clamped to 10s–600s; HSR returns no `ttl` so it falls back to 60s. Repeat views never leave the process.
2. **Per-client-IP limiter: one *outbound Enka call* per 120s.** Consulted only on a cache miss, so cache hits are free and unlimited. This matters because `AccountPage.jsx:614` auto-fires a lookup on every visit to a linked game — counting cache hits would 429 normal navigation.

A blocked request returns **429** with a `Retry-After` header and a JSON `{ message, retryAfter }` body, which the existing frontend error path (`data.message`) already renders.

**Client IP is resolved from the *last* `X-Forwarded-For` entry**, not via app-wide `trust proxy`. Cloud Run appends the real peer address, so the last entry is infrastructure-supplied; reading the first entry (what `trust proxy: true` does) would let anyone reset their budget with a forged header.

**Not fixed by this change:** the limiter is in-memory and per-instance, so the effective ceiling is 1-per-120s × instance count. Acceptable at `min-instances=0` and current traffic; a shared store would be needed at scale. The separate "No Rate Limiting Anywhere" finding below is still open.

---

<details>
<summary>Original finding</summary>

`GET /api/games/:id/player/:uid` is public and uncached. Every request fires a live fetch to `enka.network`. A user (or bot) can hammer this in a loop with different UIDs and:

- Exhaust Enka's rate limit for your server's IP (getting your IP banned)
- Generate sustained DB + network load with zero friction

**Fix:** Add `express-rate-limit` on this specific route. Also cache successful responses using the `ttl` field Enka returns in its response — the TTL tells you exactly how long to cache before re-fetching is safe.

</details>

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

> **Carried over:** client-IP trust hardening is still open — see "Open follow-up" under the rate limiting finding above.
> Measure with `/internal/whoami` on both access paths *before* writing code; an earlier assumption about which
> `X-Forwarded-For` hop is the client was wrong and would have made the Enka limiter global.

1. ~~**Add auth to all `/api/admin/*` routes**~~ — ✅ done 2026-09-20
2. ~~**Install `express-rate-limit` globally**~~ — ✅ done 2026-09-25 (100/min per IP on /api; /internal and /api/admin exempt)
3. ~~**Add tighter rate limit + response cache to `/api/games/:id/player/:uid`**~~ — ✅ done 2026-09-25 (1 Enka call per IP per 120s + per-UID TTL cache)
4. **Add `LIMIT` + pagination to ~~`getAllPosts`~~, `getGameMedia`, `getReviews`, `getUserReviews`** — prevents full table scans (`getAllPosts` ✅ done 2026-09-25; the other three remain)
5. **Rate limit or require auth on `POST /api/suggestions`** — prevents anonymous spam
6. **Add length caps to caption / comment text / bio / review body** — prevents oversized DB writes
7. **Move Firebase config to env variables** — enables key rotation without git commits
8. **Validate URL fields** (`image_url`, `avatar_url`, `banner_url`, `reference_link`) — good hygiene
9. **Remove `JWT_SECRET` fallback default** — fail loudly if env var is missing
