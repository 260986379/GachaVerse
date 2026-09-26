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
| `enka-rate-limit` | 1 outbound Enka call per client per 120s; cache hits are free |
| `player-lookup-guard` | TTL clamping, cache keys, window expiry |
| `cache-memory-bounds` | byte accounting cannot drift; eviction order |
| `image-url-validation` | only `data:image/*` is storable |
| `input-length-caps` | caption 500, comment 2000, bio 500 |
| `review-body-cap` | review body 500; rating 1–10 |
| `posts-pagination`, `reviews-pagination`, `game-media` | LIMIT applied, response shape, clamping |
| `suggestions` | 10/hour per user-or-IP, field validation |

## Conventions

**Each file is standalone.** It prints its own `PASS`/`FAIL` lines, ends with `N passed, N failed`, and exits non-zero on failure. The runner parses that line — keep the format.

**Suites run in separate processes.** Several replace modules via `require.cache` (the database pool, `enkaService`, auth middleware) and rely on module-level state such as rate-limit counters and caches. Sharing a process would leak state across suites and make results depend on file order.

**Nothing touches the real database or network.** The pg pool is stubbed per-suite; `googleRanges` is fed a fixture through `helpers/stub-google-ranges`. A suite that needs egress is a suite that will flake in CI.

## Gotchas found the hard way

- **Stub before requiring.** Controllers destructure at module load (`const { query } = require('../config/db')`), so replacing `require.cache` *after* the controller loads has no effect — the controller already holds the old reference. Install stubs first, and switch behaviour with a flag rather than by reassigning the export.
- **Don't assert `true`.** A placeholder assertion passes forever and proves nothing. If something cannot be asserted yet, leave it out and say so.
- **When behaviour changes deliberately, update the assertion to the new contract** rather than deleting it — several of these encode a trade-off that was chosen on purpose, and the test is where that decision is recorded.
