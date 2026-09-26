# Backend tests

```bash
npm test                  # all suites
npm test -- client-ip     # suites whose filename contains "client-ip"
npm test -- --verbose     # show every suite's output, not just failures
```

Exits non-zero if any suite fails, so it is safe to gate CI on.

## What these cover

They exist because most of this code is security-relevant and fails *quietly* when broken — a rate limiter keyed on the wrong value still returns 200, a validator with a loosened pattern still accepts good input. Each suite pins behaviour that was established by measurement, not assumption:

| Suite | Pins |
|---|---|
| `client-ip-resolution` | which `X-Forwarded-For` hop identifies the user, per access path |
| `global-rate-limit` | 100/min per client; `/internal` and `/api/admin` exempt |
| `enka-rate-limit` | via account linking: 1 Enka call per client per 120s, global ceiling ("Enka needs to cool down"), cache hits free |
| `enka-timeout` | every Enka/metadata request has a timeout and our User-Agent; a timeout surfaces as 504 |
| `game-account-snapshot` | linking stores a server-fetched snapshot; profile views never call Enka; refresh cooldown |
| `player-lookup-guard` | TTL clamping, cache keys, per-client and global window expiry |
| `cache-memory-bounds` | byte accounting cannot drift; eviction order |
| `image-url-validation` | image columns accept only `data:image/*` (legacy) or a Storage file in the caller's own folder for that field (#45) |
| `storage-cleanup` | deleting a board (owner/mod/report), replacing an avatar/banner, or deleting an account also deletes the stored file(s) |
| `storage-files` | Storage deletes hit only our bucket, 404 is fine, failures are logged not thrown, no broad-prefix deletes |
| `input-length-caps` | caption 500, comment 2000, bio 500 |
| `review-body-cap` | review body 500; rating 1–10 |
| `posts-pagination`, `reviews-pagination`, `game-media` | LIMIT applied, response shape, clamping; `/media` and `/art` capped at 2000 rows |
| `posts-comments` | comments listed oldest-first and paginated; only authors edit; authors or Owner/Dev delete; others get 404 |
| `suggestions` | 10/hour per user-or-IP, field validation |
| `account-deletion` | `DELETE /api/users/me` needs the exact username; Owner blocked; Firebase failure rolls back the DB |
| `board-delete` | owner or Owner/Dev can delete a board; anyone else (incl. VIP) gets 404 |
| `error-handler` | unexpected errors return a generic 500; `err.status` errors keep their message; full detail still logged |

## Conventions

**Each file is standalone.** It prints its own `PASS`/`FAIL` lines, ends with `N passed, N failed`, and exits non-zero on failure. The runner parses that line — keep the format.

**Suites run in separate processes.** Several replace modules via `require.cache` (the database pool, `enkaService`, auth middleware) and rely on module-level state such as rate-limit counters and caches. Sharing a process would leak state across suites and make results depend on file order.

**Nothing touches the real database or network.** The pg pool is stubbed per-suite; `googleRanges` is fed a fixture through `helpers/stub-google-ranges`. A suite that needs egress is a suite that will flake in CI.

## Gotchas found the hard way

- **Stub before requiring.** Controllers destructure at module load (`const { query } = require('../config/db')`), so replacing `require.cache` *after* the controller loads has no effect — the controller already holds the old reference. Install stubs first, and switch behaviour with a flag rather than by reassigning the export.
- **Don't assert `true`.** A placeholder assertion passes forever and proves nothing. If something cannot be asserted yet, leave it out and say so.
- **When behaviour changes deliberately, update the assertion to the new contract** rather than deleting it — several of these encode a trade-off that was chosen on purpose, and the test is where that decision is recorded.
