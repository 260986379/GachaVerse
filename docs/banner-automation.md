# Banner Automation Ideas

Banner data (names, dates, images) is currently maintained manually in `bannerConfig.js` on both the frontend and backend. This file documents two approaches to automate that process in the future.

---

## Current Manual Workflow

Every patch cycle (~2 weeks for NIKKE, ~3 weeks for ZZZ):

1. Check the official Discord / Twitter for the new banner lineup
2. Update `backend/src/config/bannerConfig.js` and `frontend/src/data/bannerConfig.js`
3. Restart the backend — `bannerSyncService` pushes the changes to the DB automatically

---

## Option A — Admin UI

A simple in-app form that lets you update banners without touching code.

**What it would look like:**
- Protected route at `/admin/banners` (basic auth or session-gated)
- A form per game with fields: banner name, type, start date, end date, image URL
- Submit hits a `POST /api/admin/banners` endpoint that writes directly to the `game_banners` table
- No backend restart needed — changes are live immediately

**Backend work:**
- New `adminRoutes.js` with a protected `POST /api/admin/banners/:gameId` endpoint
- Middleware to gate the route (env-var secret or existing auth)

**Frontend work:**
- New `/admin` page (excluded from the public Navbar)
- A form component per game, pre-populated from the current DB state

**Effort:** ~1 day

---

## Option B — Prydwen.gg Scraper

Prydwen.gg maintains accurate, up-to-date banner schedules for both NIKKE and other gacha games. A scraper could pull this data automatically on a cron schedule.

**How it would work:**
1. A new `bannerScraperService.js` runs on startup and every 6 hours (same cadence as the existing sync)
2. It fetches the Prydwen banner page for each tracked game
3. Parses banner names, start/end dates using a DOM parser (e.g. `cheerio`)
4. Upserts results into `game_banners` — existing rows by name+game are updated, new rows inserted, expired rows left to fall off via `ends_at > NOW()`

**Risks:**
- Scraping is fragile — if Prydwen changes their markup, the parser breaks
- Needs a fallback to the static `bannerConfig.js` if the scrape fails
- Images are unlikely to be scrapeable cleanly — may still need manual `image_url` entries

**Packages needed:** `cheerio` (already common in Node projects), `node-cron` (or use the existing scheduler if one exists)

**Effort:** ~2–3 days, plus ongoing maintenance when Prydwen updates their layout

---

## Recommendation

Start with **Option A** (admin UI). It removes the need to touch code every patch while keeping you in control of the data. Option B is useful only if you're tracking many games and the manual overhead becomes significant.
