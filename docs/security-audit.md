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

### ✅ Client-IP trust hardening — done 2026-09-25 (was "Open follow-up")

**Files: `backend/src/utils/googleRanges.js` (new), `backend/src/utils/clientIp.js`, `server.js`, `internalRoutes.js`**

**Measured in production first, as the earlier note insisted.** `/internal/whoami` is not reachable through Firebase (`firebase.json` rewrites only `/api/**`), so the shape was established two other ways:

| Probe | Result |
|---|---|
| Direct to Cloud Run, no forgery | hops `["184.148.216.20"]` — the real peer |
| Direct to Cloud Run, forged header | hops `["10.5.5.9","184.148.216.20"]` — **real peer appended last** |
| Direct vs Firebase, same client | **one shared rate-limit bucket** → both resolve to the same real IP |
| Forged header via Firebase | bucket unchanged → **Firebase discards caller-supplied XFF** |

Two facts fall out: Cloud Run always **appends** the address it actually received the connection from, so the **last hop is never client-controlled**; and the first hop is trustworthy *only* when the request came through Google's edge.

**The rule now applied:**

- last hop is a Google address → arrived via Firebase Hosting → use the **first** hop (the end user, unforgeable because Firebase discards what the caller sent)
- last hop is anything else → direct hit on the Cloud Run URL → use the **last** hop, ignoring every forged entry before it

Membership is tested against Google's published ranges (`https://www.gstatic.com/ipranges/goog.json`, ~145 prefixes, IPv4 and IPv6), fetched at startup and refreshed daily. Verified the list covers the edge address actually observed in production, `66.102.8.167`, via `66.102.0.0/20`.

**Fallback is deliberately the available choice, not the strict one.** While the ranges are unloaded (startup, or a failing fetch) resolution falls back to the first hop — the previous behaviour. Guessing "direct" instead would collapse every Firebase-proxied user onto one shared edge address and rate-limit the entire site as a single client. Leaving the bypass open for a few seconds is the lesser failure.

`CLIENT_IP_SOURCE` still overrides without a redeploy: `auto` (default), `first`, `last`, `socket`.

`GET /internal/whoami` now also reports `googleRangesLoaded`, `lastHopIsGoogle` and `arrivedVia`, so the decision can be confirmed against the live service.

**Not closed by this:** rate-limit state is still per-instance in memory, so the effective ceiling remains 100/min × running instances (`maxScale=10`).

### Cache memory bounds (2026-09-25)

The Enka player cache is bounded by **bytes** (`MAX_CACHE_BYTES`, 16 MB) with an entry ceiling (`MAX_CACHE_ENTRIES`, 1000) as a secondary guard, replacing the original 5000-entry-only limit.

**The original limit was set without reference to the container's 512Mi, but measurement showed the risk was overstated:** a realistic 8-agent ZZZ showcase serialises to **~4.0 KB**, so the old ceiling was a ~20 MB worst case — roughly 4% of the container, not the large fraction first assumed. The change is still worthwhile because entry count is a poor proxy for memory when profile size varies; a byte budget bounds the worst case directly instead of relying on an estimate. At current sizes the entry ceiling binds first, at ~3.9 MB.

Byte accounting is centralised in `dropCached()` so every removal keeps the running total in step — a removal that bypassed it would let the total drift and silently disable the budget. Eviction reclaims expired entries first, then evicts oldest-inserted, and never evicts the entry just written.

**Also measured, not a concern:** the `enkaService` metadata caches (ZZZ avatars/weapons/locs, Genshin characters/loc, HSR avatars) total ~1.3 MB of JSON, a few MB parsed, held for one hour.


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

### Update (2026-09-26) — public lookup route removed, global ceiling added (#48)

- **`GET /api/games/:id/player/:uid` no longer exists.** Linked accounts now store a server-fetched snapshot on `user_game_accounts.snapshot` (`services/playerSnapshot.js`), and profile views read that instead of calling Enka. Enka is called only from two authenticated routes: `PUT /api/users/me/game-accounts/:gameId` (link) and `POST /api/users/me/game-accounts/:gameId/refresh` (owner only, once per 10 minutes per account). The `AccountPage.jsx` auto-lookup-on-every-visit described above is gone.
- **Global outbound ceiling** in `playerLookupGuard.js`: at most `GLOBAL_MAX` Enka calls per 60 s per instance (default 6, `ENKA_GLOBAL_MAX_PER_MIN` overrides). Checked before the per-client limit, so a client's budget is not spent while the global ceiling is exhausted. Blocked requests get 429 + `Retry-After` with `reason: "global"` and an "Enka needs to cool down" message; a refused refresh leaves the stored snapshot in place.
- **Per-instance caveat, sized for:** with `maxScale=10` the fleet-wide ceiling is up to 10 × 6 = 60 calls/min. Enka publishes no tolerated rate, so this is a conservative guess to revise.
- The per-UID TTL cache and the per-client 120 s limit are unchanged. Tests: `enka-rate-limit`, `player-lookup-guard`, `game-account-snapshot`.

---

<details>
<summary>Original finding</summary>

`GET /api/games/:id/player/:uid` is public and uncached. Every request fires a live fetch to `enka.network`. A user (or bot) can hammer this in a loop with different UIDs and:

- Exhaust Enka's rate limit for your server's IP (getting your IP banned)
- Generate sustained DB + network load with zero friction

**Fix:** Add `express-rate-limit` on this specific route. Also cache successful responses using the `ttl` field Enka returns in its response — the TTL tells you exactly how long to cache before re-fetching is safe.

</details>

---

## ✅ Fixed (2026-09-25) — `POST /api/suggestions` is a Free Anonymous Spam Endpoint

**Files: `backend/src/controllers/suggestionController.js:4`, `backend/src/routes/suggestionRoutes.js:10`, `backend/src/middleware/rateLimit.js`**

**Resolution:** the endpoint stays open to anonymous submitters — `SuggestEntry.jsx:62` deliberately falls back to an unauthenticated `fetch` when logged out, so requiring auth would remove the "Can't find your game?" prompt for visitors. It is hardened instead:

1. **Per-submitter rate limit: 10/hour** (`SUGGESTION_RATE_MAX` / `SUGGESTION_RATE_WINDOW_MS`). The global 100/min limit was far too loose here — it allowed roughly 6000 spam rows an hour. Keyed by **user id when logged in, IP otherwise**, so a shared IP does not let one person block everyone else, and a logged-in spammer is tracked by account rather than a rotatable address.
2. **Joi validation** (`submitSuggestionSchema`), applied via the existing `validate` middleware.

Middleware order is `optionalAuth → validate → suggestionLimiter → submitSuggestion`: auth first so the limiter can key on `req.user`, validation before the limiter so a malformed submission — which never inserts a row — does not spend the caller's budget. Invalid-body floods remain capped by the global limit.

| Field | Rule |
|---|---|
| `type` | required, one of `game` / `character` / `artwork` |
| `entry_name` | required, trimmed, 1–120 chars |
| `game_name` | required (1–120) for `character` and `artwork`; optional otherwise |
| `reference_link` | optional; must be a valid **http(s)** URL, max 500 chars |

**`reference_link` is now scheme-restricted**, so `javascript:`, `data:` and `file:` values are rejected rather than stored — closing the stored-value vector the audit flagged, and removing the SSRF risk if anything ever fetches these server-side.

**Length caps also close part of the separate "No Input Length Limits" finding** for this endpoint: `express.json` allows 10mb, so a single submission could previously carry megabytes of text into the table. Verified a 500KB `entry_name` is now rejected with nothing inserted.

**Behaviour change:** a bare `reference_link` like `example.com` (no scheme) is now rejected. The frontend already renders `data.message`, so the submitter sees "reference_link must be a valid http(s) URL."

---

<details>
<summary>Original finding</summary>

Suggestions can be submitted by completely unauthenticated users with no rate limiting. A bot could flood the suggestions table indefinitely. The `reference_link` field is also stored as any arbitrary string — not validated as a URL.

**Fix:** Either require auth, or add IP-based rate limiting. Validate `reference_link` with `Joi.string().uri()`.

</details>

---

## ✅ Fixed (2026-09-25) — 🟡 Medium (downgraded from High) — `getGameMedia` Returns Unlimited Rows

**File: `backend/src/controllers/gameController.js:85`**

**Severity downgraded to Medium.** Every row returned is published, public content that is meant to be visible, so this is not an exposure issue. The real cost is bandwidth and database load, growing monotonically as hourly YouTube ingestion adds rows. Measured before the fix:

| Game | Rows | Payload |
|---|---|---|
| nikke | 519 | 674 KB |
| genshin-impact | 464 | 595 KB |
| wuthering-waves | 255 | 297 KB |
| honkai-star-rail | 190 | 257 KB |
| zenless-zone-zero | 156 | 235 KB |

At the global 100/min limit a single IP could pull roughly 4 GB/hour of billable Cloud Run egress.

**Pagination was rejected as the fix.** All four consumers filter the complete set client-side — `MediaTab.jsx:179` (search), `CastTab.jsx:61` (character→video matching over every title and tag), `NewsFeedTab.jsx:27`, `NikkeCharactersTab.jsx:270`. Slicing the list into pages would silently break search and character matching rather than securing anything.

**What was done instead:**

1. **Dropped `description` from the query.** Field-level measurement showed it was **65.7% of the payload** (443 KB of 659 KB for nikke) and no client reads it — the only `description` references in the frontend are `char.description` and `game.description`, different objects. NIKKE drops from ~659 KB to roughly 215 KB with zero frontend impact.
2. **`Cache-Control: public, max-age=300`.** The list is identical for every caller and only changes when the hourly ingestion runs, so Firebase Hosting's CDN now serves repeats without reaching Cloud Run or Postgres at all. The 404 path is deliberately left uncached.
3. **Safety `LIMIT 2000`** — a ceiling, not pagination. Well clear of the largest game today (519 rows); it exists only to stop unbounded growth. If a game approaches it, the correct response is moving search and character matching server-side, not raising the number.

**Checked and not a concern:** the sibling art endpoints share the same unbounded shape but are tiny in practice — `/api/games/:id/art` returns 0 rows and `/api/games/art/all` returns 13 (4.6 KB). Left alone deliberately.

**Still open:** this is a ceiling plus a cache, not true pagination. Genuine server-side filtering (`?category=`, `?search=`) with the client updated to match remains the correct long-term shape, and becomes necessary if any game nears the 2000 ceiling.

---

<details>
<summary>Original finding</summary>

`GET /api/games/:id/media` has no `LIMIT` clause. As the media library grows, a single request could return thousands of rows. Anyone can call this repeatedly.

**Fix:** Add `LIMIT` and pagination the same way `getGameNews` already does it (`gameController.js:55`).

</details>

---

## ✅ Fixed (2026-09-25) — No Input Length Limits on User Content

**Files: `backend/src/utils/limits.js` (new), `boardController.js`, `userController.js:60`, `boardRoutes.js`, `userRoutes.js:37`**

**Resolution:** Joi schemas applied through the existing `validate` middleware, with the caps centralised in `utils/limits.js`:

| Field | Endpoint | Cap | UI input limit |
|---|---|---|---|
| `caption` | `POST /api/boards` | 500 | none |
| `text` | `POST /api/boards/:id/comments` | 2000 | none |
| `bio` | `PATCH /api/users/me` | 500 | `maxLength={300}` |
| `username` | `PATCH /api/users/me` | 30 | `maxLength={30}` |
| `game_id`, `game_name` | `POST /api/boards` | 100 | n/a |

Caps sit at or above the corresponding UI limits so no existing flow is affected. Client-side `maxLength` is not a control — these are the server-side backstop.

### Image fields — why they appear here

`Joi.object()` rejects unknown keys, and the capped text fields share request bodies with image fields (`caption` with `image_url`; `bio` with `avatar_url` / `banner_url`). Declaring only the text fields would have rejected those keys and broken board creation and avatar upload outright, so the image fields **had** to be declared.

They are given a deliberately generous cap of **2,000,000 chars** (`IMAGE_DATA_URL_MAX`) rather than being left unrestricted, because the frontend submits avatars, banners and board images as inline base64 data URLs via `compressImage()` — making them the largest instance of the very "megabytes per request" vector this finding describes. The cap is ~1.5MB of image data against a largest client output of 900x1400 @ 0.88 quality, so there is substantial headroom. Verified: 300KB data URL uploads succeed.

**Partial-update semantics preserved.** `updateMe` uses `'field' in req.body`, so an absent key leaves a column unchanged while an explicit `null` clears it. Every field in `updateMeSchema` is therefore optional and nullable; verified that `{bio}` alone still produces a `SET bio =` clause on its own and that an empty body still returns 400.

**Not covered here:** review `body` has its own finding below. `personal_notes` on user games was not reviewed.

---

<details>
<summary>Original finding</summary>

Board captions, comment text, and user bios are stored with no maximum length. The Express body limit is 10mb (`app.js:25`), so a user can send megabytes of text per request.

**Fix:** Reject inputs over a reasonable limit (e.g. `caption` ≤ 500 chars, comment `text` ≤ 2000 chars, `bio` ≤ 500 chars) via Joi validation or a length check before insert.

</details>

---

## ✅ Fixed (2026-09-25) — URL Fields Not Validated

**Files: `backend/src/utils/imageSource.js` (new), `boardController.js:14`, `userController.js:65-66`**

**The suggested fix could not be applied as written — both halves are wrong for this codebase:**

- `Joi.string().uri()` alone is **not a control**. It validates URI *syntax*, so it accepts `javascript:alert(1)`, `data:text/html;base64,...` and `file:///etc/passwd`. Verified directly against the installed Joi.
- `uri({ scheme: ['http','https'] })` and a **CDN allowlist would break every upload**. There is no CDN: the frontend submits images inline as `canvas.toDataURL('image/jpeg')` (`compressImage`), stored directly in Postgres.

**Resolution:** a shared `imageSource` validator with a single accepted shape.

**Only inline `data:image/<jpeg|jpg|png|gif|webp|avif>;base64,...` values are accepted.** External `http(s)` URLs are rejected on every user-writable path.

Applied to `boards.image_url` (required), `users.avatar_url` and `users.banner_url` (optional, nullable — `null` and `''` still clear the column).

**Why external URLs are refused, not just scheme-checked.** These columns render as `<img>` sources and CSS background-images on pages that list many users (community, gallery, explore, both search modals, review cards, board lightbox). An externally hosted value therefore gives its host:

- **a tracking pixel** — the IP, User-Agent and Referer of every user who merely browses a listing containing that avatar or banner, which is a live deanonymisation channel against your users;
- **unreviewable content** — the host can serve a clean image during moderation and swap it afterwards; a stored data URL cannot change;
- **a latent SSRF sink** — live the moment any server-side code fetches these columns (thumbnailing, moderation, or migrating these images out of Postgres, which is a plausible next step). The runtime service account holds `roles/editor`, so the blast radius would be project-wide.

**Rejected and unstorable:** `javascript:` (any casing), `data:text/html`, `data:application/javascript`, `data:image/svg+xml` (SVG is scriptable, so it is deliberately excluded), `file:`, `gopher:`, `vbscript:`, protocol-relative `//host/x`, internal addresses such as `http://169.254.169.254/` and `http://127.0.0.1/`, and arbitrary non-URL text.

**Signup is unaffected.** `authController.js:59` stores the Google account picture (an https URL) directly and does not pass through this validator — the value comes from a verified Firebase token, not user input. Existing http avatars keep rendering, since validation only applies on write. The frontend never submits an http value for these fields; it only uploads data URLs, so nothing in the UI changes.

**To allow external URLs again**, add an http(s) branch to `imageSource` **and** a host allowlist. Re-opening it without one reinstates every problem above.

---

<details>
<summary>Original finding</summary>

These fields are only checked for existence — not validated as URLs or restricted to trusted domains. Users can store arbitrary values in the DB. If anything ever fetches these URLs server-side, it becomes an SSRF vector.

**Fix:** Validate with `Joi.string().uri()` and optionally restrict to a known CDN domain allowlist.

</details>

---

## ✅ Fixed (2026-09-25) — 🟢 Low (downgraded from Medium) — Firebase API Key Hardcoded in Git

**Files: `frontend/src/firebase.js:19`, `frontend/.env.example` (new), `.gitignore`**

**Severity downgraded.** Verified against the live project, two of the three concerns in the original finding were already mitigated, and the third is not what it appears:

| Original concern | Actual state (verified 2026-09-25) |
|---|---|
| "Enumerate registered email addresses" | **Already mitigated** — `emailPrivacyConfig.enableImprovedEmailPrivacy: true` |
| Authorized domains | **Already correct** — `["localhost", "gachaverse-497204.firebaseapp.com", "gachaverse-497204.web.app"]`, no stray entries |
| Key committed to git | Not itself an exposure — see below |

**The key is not a secret and cannot be made one.** Vite inlines it into the client bundle at build time, so anyone who opens the site can read it regardless of where it is stored; Google documents the web API key as a public identifier. Moving it to an env var hides nothing. The legitimate benefit is the one the finding names — rotating the key, or pointing a build at a different Firebase project, without editing source.

**Resolution:** all six config values now read from `VITE_FIREBASE_*` with the current values retained as fallbacks.

**Why the values stay committed as fallbacks.** `cloudbuild.yaml` passes no env vars to the frontend build step, and with no `.gcloudignore` present `gcloud builds submit` applies `.gitignore` semantics — so a gitignored `frontend/.env` would not reach the build either. Removing the fallbacks without also rebuilding the deploy pipeline would ship `apiKey: undefined` and **break authentication entirely**. Since the values are public identifiers, committing them costs nothing; making the build depend on a value that lives only on one developer's machine would.

**Verified by building both ways:**
- Plain `npm run build` (the production path) → real config inlined, bundle functional.
- `VITE_FIREBASE_API_KEY=... npm run build` → override inlined, original **absent**. Rotation works without touching source.

`frontend/.env` and `.env.local` are now gitignored (with `.env.example` explicitly un-ignored) so a local override cannot be committed by accident.

### ✅ Referrer restrictions applied (2026-09-25)

The browser key previously had **no** HTTP referrer restrictions (`browserKeyRestrictions={}`) — verified before the change that it answered requests from `evil-attacker.example` and with no `Referer` header at all. Now restricted to:

```
https://gachaverse-497204.web.app/*
https://gachaverse-497204.firebaseapp.com/*   (signInWithRedirect auth handler)
http://localhost/*
http://127.0.0.1/*
```

**Update (2026-09-26):** the custom domain is now live. Verified via the Identity Toolkit and API Keys APIs: authorized domains and the key's referrers both include `mygachalist.com` and `www.mygachalist.com`. The frontend's `authDomain` moved from `gachaverse-497204.firebaseapp.com` to `mygachalist.com`, because browsers that partition third-party storage lose the `signInWithRedirect` result when the auth handler is on a different site from the app (Google sign-in returned the user signed out). This requires `https://mygachalist.com/__/auth/handler` in the OAuth web client's authorized redirect URIs.

**Port-less localhost patterns are deliberate.** `http://localhost:*/*` is *not* honoured — it blocked local dev outright — and an explicit `http://localhost:5173/*` matches only that one port, which breaks when Vite drifts to 5174. Bare `http://localhost/*` matches any port. Verified: 5173, 5174 and 3000 all pass.

All 27 `apiTargets` were confirmed byte-identical before and after, so nothing was silently widened while adding the browser restriction.

Verified after applying — production, deep paths, the `firebaseapp.com` auth handler and local dev on any port all return 200; an attacker domain, a lookalike suffix (`...web.app.evil.test`) and a request with no `Referer` all return 403. Live site healthy.

**This is still a soft control.** `Referer` is client-supplied and can be forged with a single curl flag, so it stops casual and browser-based misuse — another site embedding the key in its own pages — not a determined attacker. **Firebase App Check is the strong version and remains unimplemented.**

A restore point for the key's prior state is not kept in the repo; to revert, clear the browser restrictions with `gcloud services api-keys update 5e1cdc90-43a7-4d04-aa64-c73d0d4e6be7 --clear-restrictions` (note this also clears apiTargets, so re-add them).

`localhost` being an authorized domain is also a mild loosening — it lets a locally-run app use this Firebase project for auth. It is the Firebase default and removing it would break local development, so it is left in place deliberately.

---

<details>
<summary>Original finding</summary>

The Firebase API key is committed directly in source code. For client-side Firebase Auth this is somewhat expected (Google documents it as a "public identifier"), but it means anyone with repo access can:

- Use your Firebase project to create unlimited accounts (burning Firebase Auth quotas)
- Enumerate registered email addresses via the API

**Fix:** Move it to a `VITE_` prefixed env variable so future rotation doesn't require a git commit. More importantly, check **Firebase Console → Authentication → Settings → Authorized Domains** to ensure only your actual domain is listed.

</details>

---

## ✅ Fixed (2026-09-25) — `getReviews` and `getUserReviews` Have No LIMIT

**Files: `backend/src/controllers/reviewController.js`, `GameReviewsSection.jsx`, `AccountPage.jsx`**

**Resolution:** both endpoints paginate via `?limit` / `?page` and return `{ items, hasMore }`, consistent with `getPostComments` and `getGameNews`. `limit` is clamped on both ends (`Math.min(Math.max(n, 1), 50)`), so `?limit=-5` cannot emit a negative `LIMIT`.

**Page size is 20, not 50 — and that is the important detail.** Row count badly understates the payload here: a single review measured **56 KB on production**, of which **`avatar_url` is 99.5%**, because reviewer avatars are stored as base64 data URLs. At 100 reviews the unpaginated response would have been ~5.6 MB.

> **Follow-up worth doing:** even at 20 rows a page is ~1.1 MB, essentially all avatar bytes. The real fix is to stop serving avatars inline — move them to object storage and return a URL, or omit `avatar_url` from list responses and resolve it client-side. Until then the page size is doing the heavy lifting.

### Two things pagination would have silently broken

Both consumers assumed a bare array and did whole-collection work on it. Naive pagination would have broken them quietly rather than loudly:

1. **`GameReviewsSection.jsx:29`** derived the caller's own review with `reviews.find(r => r.user_id === user.id)` to prefill the edit form. Once a game exceeded one page, a user whose review fell off page 1 would have been shown "write a review" instead of "edit", silently. `getReviews` now returns **`myReview`** explicitly — taken from the current page when present, otherwise fetched directly — so the prefill is correct on any page.
2. **`AccountPage.jsx` `MyReviewsModal`** computed `totalUpvotes` by summing the fetched rows, and recomputed `review_count` from array length on delete. Both would have silently reported only the loaded page. `getUserReviews` now returns server-computed **`total`** and **`totalUpvotes`**, and the delete handler adjusts those rather than re-summing.

Both consumers also still accept a bare array, so a cached bundle against the new backend renders rather than showing an empty list.

**A "Load more reviews" control was added**, because paginating without one would have made older reviews unreachable — trading an unbounded query for silently hidden content.

**Unchanged:** sort remains server-side via the `ORDER_TOP` / `ORDER_LATEST` constants, never interpolated from user input — verified that an unrecognised `?sort=` falls back to `created_at DESC` rather than reaching the query.

---

<details>
<summary>Original finding</summary>

Both return all reviews for a game/user with no pagination or LIMIT clause. Same pattern as the posts issue — low risk now but grows over time.

**Fix:** Add LIMIT + pagination, consistent with `getPostComments`.

</details>

---

## ✅ Fixed (2026-09-25) — Review `body` Has No Length Limit

**Files: `backend/src/utils/limits.js`, `reviewController.js:82`, `reviewRoutes.js:13`, `GameReviewsSection.jsx:10`**

**Resolution:** `body` is capped at **500 characters** (`REVIEW_BODY_MAX`), enforced by a Joi schema through the existing `validate` middleware. The original finding suggested ≤ 5000; 500 was chosen deliberately as a tighter limit for now.

The form textarea previously allowed **1000** characters, so a 500-char server cap on its own would have let users type 1000 and then be rejected on submit. The textarea is now bound to the same constant, with a comment on each side pointing at the other so they are not changed independently. The client limit is convenience; the server cap is the control.

`rating` validation moved into the same schema and its behaviour is preserved exactly — 1–10 integers only, with the original "Rating must be between 1 and 10." message retained for every failure mode (missing, zero, out of range, non-numeric, fractional). Numeric strings such as `"8"` are still accepted, as Joi converts them.

`body` remains optional: omitted, `''` and `null` are all accepted and stored as `NULL`. Values are still trimmed before insert.

**Existing rows are unaffected** — validation applies on write only. Production currently holds one review with a 74-character body, so nothing in the table exceeds the new cap.

---

<details>
<summary>Original finding</summary>

`body` is stored as-is with no max length check — same issue as bio/comment text.

**Fix:** Add a max length (e.g. ≤ 5000 chars) via a check before insert or Joi validation.

</details>

---

## ✅ Fixed (2026-09-25) — `JWT_SECRET` Has a Weak Hardcoded Default

**Files: `backend/src/config/index.js:6` (removed), `backend/src/utils/jwt.js` (deleted), `backend/package.json`**

**Resolution: the secret and everything that would have used it were deleted, rather than the fallback merely being removed.**

The finding's own risk was *"if any code ever starts relying on it without the env var set, it's a silent failure."* Confirmed that nothing relies on it today:

- `backend/src/utils/jwt.js` exported a single `generateToken()` — **nothing imported it anywhere** in `src`, `scripts` or `server.js`.
- Authentication is entirely Firebase: `admin.auth().verifyIdToken()` at `middleware/auth.js:14`, `:47` and `:69`. No local token is ever minted or verified.

So the weak default guarded dead code. Removing only the fallback (`JWT_SECRET: process.env.JWT_SECRET`) would have left `undefined` flowing into a `jwt.sign()` that nobody calls — no louder, and the dead path still waiting to be wired up by accident.

Removed instead:
1. `JWT_SECRET` from `config/index.js`.
2. `backend/src/utils/jwt.js`.
3. `jsonwebtoken` from `package.json` dependencies.

**Dropping the dependency is safe:** `firebase-admin` declares `jsonwebtoken ^9.0.0` itself, so the package stays resolvable in `node_modules` and the Docker build is unaffected. Verified `package.json` and `package-lock.json` are back in sync (11 root deps each), which `npm ci --omit=dev` requires.

**Verified:** no `JWT_SECRET` reference remains anywhere in backend code, the app boots, and all 260 backend assertions still pass.

### Optional production cleanup

`JWT_SECRET` is still mounted on Cloud Run from Secret Manager. It is now inert — nothing reads it — so it can stay indefinitely with no effect. To tidy up: remove the env mapping with `gcloud run services update gachaverse-backend --region us-central1 --remove-secrets JWT_SECRET`, and only then consider deleting the Secret Manager secret. Deleting the secret first would leave the service referencing a missing secret and **fail to start**, so the order matters.

**Also noticed, not in scope:** `backend/src/utils/password.js` appears to be unused too — the same class of vestigial local-auth code left over from before Firebase. Not touched here.

---

<details>
<summary>Original finding</summary>

Defaults to `'change_this_secret_in_production'`. Auth currently uses Firebase token verification so this secret appears unused — but if any code ever starts relying on it without the env var set, it's a silent failure.

**Fix:** Remove the fallback entirely so the app fails loudly on startup if unset: `JWT_SECRET: process.env.JWT_SECRET`.

</details>

---

## ✅ What's Already Good

- `/internal` ingestion routes are properly guarded with `requireTaskSecret`.
- `TASK_SECRET` defaulting to `''` is safe — `requireTaskSecret` explicitly returns 503 if empty.
- Auth middleware correctly verifies Firebase ID tokens server-side — no JWT forgery risk.
- `assignRole` checks the actor's role server-side — users cannot self-promote.
- Board/post/comment deletes all use `AND user_id=$N` for regular users — they can't delete other people's content. `Owner`/`Dev` can delete any board, post or board comment as a moderation takedown (boards since 2026-09-26, #50).
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

> **Carried over:** client-IP trust hardening is ✅ done (2026-09-25) — see the rate limiting finding. Remaining open items: per-instance rate-limit state, Firebase App Check, and moving avatar/banner images out of Postgres.

1. ~~**Add auth to all `/api/admin/*` routes**~~ — ✅ done 2026-09-20
2. ~~**Install `express-rate-limit` globally**~~ — ✅ done 2026-09-25 (100/min per IP on /api; /internal and /api/admin exempt)
3. ~~**Add tighter rate limit + response cache to `/api/games/:id/player/:uid`**~~ — ✅ done 2026-09-25 (1 Enka call per IP per 120s + per-UID TTL cache); route removed 2026-09-26 in favour of stored snapshots, plus a global Enka ceiling (#48)
4. ~~**Add `LIMIT` + pagination to `getAllPosts`, `getGameMedia`, `getReviews`, `getUserReviews`**~~ — ✅ all four done 2026-09-25 (`getGameMedia` via payload trim + CDN cache + safety ceiling; reviews paginated with server-computed totals and a Load more control)
5. ~~**Rate limit or require auth on `POST /api/suggestions`**~~ — ✅ done 2026-09-25 (10/hour per user-or-IP + Joi validation; stays anonymous by design)
6. ~~**Add length caps to caption / comment text / bio / review body**~~ — ✅ all done 2026-09-25 (caption 500, comment 2000, bio 500, review body 500)
7. ~~**Move Firebase config to env variables**~~ — ✅ done 2026-09-25 (VITE_ overrides with committed fallbacks; downgraded to Low — authorized domains and email-enumeration protection were already correct). Referrer restrictions on the browser key also applied. Firebase App Check remains the open hardening step.
8. ~~**Validate URL fields** (`image_url`, `avatar_url`, `banner_url`, `reference_link`)~~ — ✅ done 2026-09-25 (data:image/* only on user-writable paths; `reference_link` covered by the suggestions fix). SSRF sink and tracking-pixel vector both closed.
9. ~~**Remove `JWT_SECRET` fallback default**~~ — ✅ done 2026-09-25 (secret, dead `utils/jwt.js` and the `jsonwebtoken` dependency all removed; auth is Firebase-only)
