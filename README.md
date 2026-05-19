# GachaVerse

> The Ultimate Gacha Social Hub

**Mission:** To create the premier centralized, multi-game social platform where gacha game enthusiasts can connect, share their passion, track their journey via user-curated content, and discover all the latest news and events in a vibrant, visually engaging environment.

**USP:** GachaVerse offers a "Pinterest-like" visual experience for showcasing gacha achievements and content, fostering a strong cross-game community, and providing a unified hub for news and events across multiple titles — all within an ethical, user-centric framework.

---

## Guiding Principles

1. **Community First** — Empowering players to connect, share, and celebrate their gacha journey.
2. **Visual Excellence** — An intuitive, beautiful, and engaging user interface.
3. **Ethical & Transparent** — Strictly adhering to game Terms of Service. No unauthorized data scraping.
4. **Multi-Game Convenience** — A single destination for all gacha interests.
5. **Reliable & Up-to-Date** — Delivering accurate news and event information.

---

## Project Roadmap

### Phase 0 — Research, Planning & Foundation *(1–2 Months)*

**Goal:** Validate the concept, define the core product, establish legal and technical foundations.

- **Market Research:** Analyze existing platforms (Reddit, Discord, Fandom, Prydwen, KeqingMains, Game8). Identify underserved areas and high-engagement content patterns.
- **Target Games:** Identify 2–3 initial games for MVP (e.g., Genshin Impact, Honkai: Star Rail).
- **Branding & Legal:** Name, logo, domain, legal structure, ToS, Privacy Policy.
- **Product Spec:** Wireframes, mockups, detailed feature backlog, tech stack selection.
- **Pre-Launch:** "Coming Soon" landing page with email sign-up. Start building presence on relevant subreddits and Discord servers.

---

### Phase 1 — Minimum Viable Product *(3–6 Months)*

**Goal:** Launch a stable, engaging platform for 1–2 target games, attract early adopters, validate core social features.

**Features:**

- **User Authentication** — Email/password, Google/Discord login. User profiles with avatar, bio, display name.
- **My Gacha Showcase** — Users manually add characters from a pre-populated database, upload screenshots of builds/pulls, and write descriptions. *No direct game account access.*
- **Content Feed** — Image/text/link posts, tagging system (`#GenshinImpact`, `#LuckyPull`, etc.), likes, comments, and filters by game/tag/following.
- **Curated News & Events** — Official announcements, patch notes, character reveals, event schedules for initial games (team-managed, links to original sources).
- **Basic Search & Discovery** — Search by user, game, or tag. "Trending" section by engagement.
- **Admin/Moderation Tools** — User/post/comment management and ToS enforcement.

**Marketing:** Targeted outreach on Reddit/Discord, influencer collaborations, launch contests, active community management.

**Monetization:** Free-to-use. Focus entirely on user acquisition and engagement.

---

### Phase 2 — Feature Expansion & Multi-Game Support *(6–12 Months Post-MVP)*

**Goal:** Expand game coverage, deepen social interaction, enhance profiles, grow the user base significantly.

**Features:**

- **Expanded Game Coverage** — Add 3–5 more popular games based on demand.
- **Advanced Showcase** — Build templates, user-inputted pull tracker/wish history, achievement badges, profile banners and themes.
- **Advanced Content** — Video embeds (YouTube/Twitch), community polls, long-form guides and articles.
- **Private Messaging** — Direct conversations between users.
- **Groups/Clubs** — Public or private groups with dedicated feeds and discussions.
- **Personalized Discovery** — "For You" feed, "People You Might Know," notification system.
- **User-Submitted News** — Community submissions with moderation queue.

**Monetization:**
- Display advertising (non-intrusive, native).
- **GachaVerse Pro** subscription — ad-free, enhanced customization, increased storage, early feature access, priority support.
- Affiliate marketing with reputable gaming partners.

---

### Phase 3 — Optimization, Scaling & Strategic Positioning *(12–24 Months Post-MVP)*

**Goal:** Achieve significant user growth, establish GachaVerse as a market leader, position for official developer partnerships.

**Features:**

- Performance and infrastructure scaling for millions of users.
- Internal analytics (aggregated/anonymous data only).
- Verified Creator program, moderator recruitment, mentorship programs.
- Full localization (Japanese, Korean, Chinese, Spanish, etc.).
- Native iOS and Android mobile apps.
- Limited read-only API for content creators (game data from curated database, not user accounts).

**Monetization:** Maximized ad revenue, growing premium subscriptions, initial strategic developer sponsorships (marketing collaboration, not API access yet).

---

### Phase 4 — Market Dominance & Lucrative Partnerships *(24+ Months)*

**Goal:** Establish GachaVerse as the undisputed leader in gacha social platforms. Secure major developer partnerships and achieve sustainable revenue.

**Key Achievements:**
- Global industry recognition and trust.
- Millions of monthly active users with high session times.
- Self-sustaining community ecosystem.

**Monetization:**
- Premium ad placements and exclusive gaming company ad deals.
- Robust, stable premium subscription base.
- **Major Developer Partnerships** — Co-branded events, exclusive reveals, large-scale sponsorships.
- **Limited Official API Access** — Under formal legal agreements with developers, for specific non-sensitive data points (e.g., official character data in showcases).
- Merchandise sales.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Primary Database | PostgreSQL |
| Flexible Content Store | MongoDB (future) |
| Search | Elasticsearch (future) |
| Caching | Redis (future) |
| Cloud Hosting | AWS / GCP / Azure |
| CDN | Cloudflare / AWS CloudFront |
| Media Processing | Cloud-based image/video optimization |
| Moderation | AI moderation services + human moderators |

---

## Team

**Core Founders:**
- **Product Visionary / CEO** — Vision, strategy, marketing, community building, business development.
- **Lead Full-Stack Developer** — Core platform architecture and development.
- **UI/UX Designer** — Visual and interactive experience (critical for the Pinterest-like feel).

**Future Hires (as revenue allows):** Frontend/backend developers, community managers, content curators, marketing/SEO specialist, data analyst.

**Funding:** Bootstrapped through initial phases. Seed funding from angel investors or VCs to be pursued after MVP validation and demonstrated user growth.

---

## Critical Success Factors

1. Exceptional, fast, beautiful user experience.
2. Vibrant, welcoming, actively managed community.
3. Accurate and timely official news; high-quality moderated user content.
4. Strict ethical adherence — absolutely no ToS violations.
5. Scalable architecture from day one.
6. Patience and adaptability.

---

## Key Challenges & Mitigations

| Challenge | Mitigation |
|---|---|
| Cold start (no users, no content) | Hyper-focus on 1–2 active communities at launch; contests with desirable prizes; incentivize early creators |
| Content moderation at scale | Clear guidelines from day one; robust reporting tools; trusted community moderators; AI moderation tools |
| Technical scalability | Cloud-native architecture; performance optimization every sprint; aggressive caching |
| Monetization without alienating users | Start fully free; introduce ads slowly after growth; make premium genuinely valuable |
| ToS compliance | Strictly user-generated/manual showcase model; clearly communicate no game account access; never use unofficial APIs |
| Keeping up with multiple games | Start limited; community-submitted news with moderation; automate character list imports from public wikis |

---

## Planning & Tools

| Category | Tool |
|---|---|
| Project Management | Notion or Asana |
| Documentation | Notion / Google Workspace |
| Version Control | Git + GitHub (this repo) |

---

## Local Development Setup

See the [dev environment setup guide](#) for instructions on running the frontend and backend locally.

**Quick start:**

```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

Frontend proxies all `/api/*` requests to the backend automatically.

---

*This project strictly avoids accessing, scraping, or using unofficial APIs to retrieve gacha game account information. All user-facing showcases are manually curated by users themselves.*
