# GachaVerse

> The Ultimate Gacha Social Hub — live at **[mygachalist.com](https://mygachalist.com)**

**Mission:** To create the premier centralized, multi-game social platform where gacha game enthusiasts can connect, share their passion, track their journey via user-curated content, and discover all the latest news and events in a vibrant, visually engaging environment.

**USP:** GachaVerse offers a "Pinterest-like" visual experience for showcasing gacha achievements and content, fostering a strong cross-game community, and providing a unified hub for news and events across multiple titles — all within an ethical, user-centric framework.

> Product vision, roadmap, team and monetization plan live in [docs/product-plan.md](docs/product-plan.md).

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5, React Router 7 |
| Backend | Node.js 20 + Express 5 |
| Database | PostgreSQL on **Neon** (AWS `us-east-2`) |
| Auth | **Firebase Auth** — Google + email/password; backend verifies ID tokens via `firebase-admin` |
| Frontend hosting | **Firebase Hosting** — serves the SPA and rewrites `/api/**` to Cloud Run |
| Backend hosting | **Google Cloud Run** (`us-central1`), image built by Cloud Build |
| Secrets | **Google Secret Manager** (`DATABASE_URL`, `YOUTUBE_API_KEY`, `TASK_SECRET`, …) |
| Scheduled jobs | **Cloud Scheduler → Cloud Tasks** — hourly YouTube ingestion |
| Validation | Joi |
| Rate limiting | express-rate-limit, plus a dedicated guard for the Enka lookup |
| Logging | morgan (requests) + winston (errors) |
| CI | GitHub Actions |
| External APIs | YouTube Data API v3, [enka.network](https://enka.network) (player profiles) |

**Architecture note:** the database is on AWS while the backend is on GCP, so every query crosses clouds (~30 ms, measured). Keep per-request query counts low and prefer caching over extra round trips.

---

## Local development

```bash
cd backend  && npm install && npm run dev    # http://localhost:5000
cd frontend && npm install && npm run dev    # http://localhost:5173
```

Vite proxies `/api/*` to the backend, mirroring the Firebase Hosting rewrite used in production.

`backend/.env` is required locally and is gitignored. It needs at minimum `DATABASE_URL`. Add `TASK_SECRET` (any random value — it only has to match itself locally) if you want to exercise `/internal/*` or `/api/admin/*`.

---

## Making a change

1. **Branch** — `git checkout -b short-description`. Direct commits to `main` work, but a branch lets CI run before the change lands on `main`.
2. **Make the change.**
3. **Add or update a test** if it touches behaviour that can fail quietly — see below.
4. **Run the tests.**
5. **Commit, push, check CI, deploy.**

### What deserves a test

Most of this backend fails *silently* when broken: a rate limiter keyed on the wrong value still returns 200, a loosened validator still accepts valid input. If a change touches any of these, pin it with a test:

- anything using the client's IP (`utils/clientIp.js`)
- rate limits, quotas or caches
- input validation and length caps
- authorization checks (`authenticateToken`, `requireMod`, `requireTaskSecret`)
- SQL with `LIMIT` / `OFFSET`, or placeholder numbering

Conventions and gotchas: [backend/test/README.md](backend/test/README.md).

---

## Tests

```bash
cd backend
npm test                  # all suites (~8s)
npm test -- client-ip     # only suites whose filename matches
npm test -- --verbose     # show every suite's output, not just failures
```

### Reading the output

```
  PASS  client-ip-resolution.test.js       25 assertions    49ms
  FAIL  suggestions.test.js                28 assertions    497ms
        ...full output of the failing suite...

----------------------------------------------------------------
FAILED  1 of 12 suites: suggestions.test.js
        283 assertions passed, 2 failed
```

- A **failing suite prints its full output automatically** — `--verbose` is not needed to diagnose it.
- `crashed` instead of an assertion count means the suite threw before finishing (usually a syntax or import error), not that an assertion failed.
- The runner **exits non-zero** on any failure, which is what CI keys on.

Tests need no database, no network and no secrets — the pg pool, `enkaService`, auth middleware and Google's IP ranges are all stubbed. A suite that needs real egress is a bug in the test.

### When a test fails after a deliberate change

Update the assertion to the new contract; do not delete it. Several of these tests encode a trade-off chosen on purpose, and the test is where that decision is recorded.

---

## Commit and push

```bash
git add -A
git status                # confirm no stray files, and that NEW files are included
git commit -m "fix(security): cap review body at 500 chars"
git push
```

**New files are the usual footgun.** Several modules are imported by others (`utils/limits.js`, `utils/imageSource.js`, `utils/clientIp.js`, `utils/googleRanges.js`, `services/playerLookupGuard.js`). Leaving a new file out of a commit produces a backend that **will not boot** — and local tests will not catch it, because your copy still has the file. Check `git status` before committing.

If you change `package.json`, commit `package-lock.json` with it. `npm ci` fails on drift, which breaks both CI and the Docker build.

---

## CI

Pushing triggers [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Job | What it does |
|---|---|
| `backend-tests` | `npm ci` + `npm test` on Node 20 — the same version as the container |
| `frontend-build` | `npm ci` + `npm run build` — catches broken imports before a deploy does |

```bash
gh run watch              # block until the current run finishes
gh run view --log-failed  # show only what failed
```

**CI does not gate deployment.** Pushing does not deploy, and deploying does not check CI. The two are independent, which is why running `npm test` locally before deploying matters.

Frontend lint is deliberately excluded from CI: the existing code has ~150 pre-existing violations, so it would fail from day one and train everyone to ignore a red badge. Worth enabling once those are cleared.

---

## Deploying

```powershell
.\deploy.ps1
```

`deploy.ps1` is **gitignored and local-only** — it lives on the maintainer's machine, not in this repo. It runs:

1. `gcloud run services update` — applies scaling settings
2. `gcloud builds submit --config cloudbuild.yaml` — builds the backend image **and** the frontend, then deploys the frontend to Firebase Hosting
3. `gcloud run deploy` — rolls out the new backend image

### Before you run it

- **It ships the frontend and backend together.** Whatever is in your working tree goes live. Check `git status` first — uncommitted frontend work will deploy alongside your backend fix.
- **It does not run the tests.** Run `npm test` yourself first, or add a gate to the top of the script.
- **A push does not deploy.** The `deploy-backend` Cloud Build trigger is disabled; deployment is always this manual step.
- **Backend changes need a deploy to take effect.** Editing `backend/` and pushing changes nothing in production until `deploy.ps1` runs.

### After deploying

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://mygachalist.com/api/hello"
```

`200` means the new revision is serving. For anything touching auth, rate limiting or images, exercise the real feature in a browser — the API being up does not mean the change works.

---

## Configuration and secrets

- **Never commit secrets.** `backend/.env`, `frontend/.env` and `firebase-service-account.json` are gitignored.
- Production secrets live in **Google Secret Manager** and are mounted into Cloud Run as environment variables. Changing one means updating the secret and redeploying.
- `frontend/.env.example` documents the frontend variables. Those are **public identifiers, not secrets** — Vite inlines them into the client bundle, so they are readable by anyone who opens the site.

---

## Documentation

| Doc | Description |
|---|---|
| [docs/architecture.md](docs/architecture.md) | How the pieces fit together |
| [docs/local-dev-setup.md](docs/local-dev-setup.md) | Full local environment setup |
| [docs/schema.sql](docs/schema.sql) | Database schema |
| [docs/security-audit.md](docs/security-audit.md) | Security findings, what was fixed and why, and open follow-ups |
| [backend/test/README.md](backend/test/README.md) | Test conventions and gotchas |
| [docs/stack.md](docs/stack.md) | Stack decisions |
| [docs/running-costs.md](docs/running-costs.md) | Infrastructure costs |
| [docs/product-plan.md](docs/product-plan.md) | Mission, roadmap, team |
| [docs/monetization.md](docs/monetization.md) | Monetization plan |

---

*This project strictly avoids accessing, scraping, or using unofficial APIs to retrieve gacha game account information. All user-facing showcases are manually curated by users themselves.*
