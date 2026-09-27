# Monetization and publisher IP: discussion notes

Recorded 2026-09-26. Related issues: #61 (donations), #62 (affiliate links), #63 (cosmetic extras), #64 (ads).

> General information, not legal advice. If the site starts making meaningful money, a short consultation with a lawyer who handles IP is worth it.

---

## 1. Is the worst case a cease-and-desist, removing ads, or legal trouble?

Mostly yes, but the most likely trouble isn't a letter from the publisher. It's losing your hosting or your income accounts.

### What usually happens, from most to least likely

1. **Nothing.** Publishers generally tolerate fan sites because they promote the games. Small, clearly unofficial, non-commercial projects are rarely touched.
2. **A takedown notice sent to your host.** This is the most common enforcement route. The publisher reports images or pages to Google (which hosts the site and its files), which removes them or disables the site, often quickly and without you arguing first. Repeated notices can get the project suspended. **The site going offline is the most realistic worst case.**
3. **Losing your income accounts.** Ad networks and affiliate programs have their own copyrighted-content rules and can close your account and **keep unpaid earnings**, with no publisher involved.
4. **A cease-and-desist letter.** A demand to stop making money from it, remove assets, or shut down. If you comply promptly, it usually ends there.
5. **A lawsuit.** Rare for small fan projects, and typically only after ignoring takedowns and letters, or making real money from the publisher's IP (e.g. selling merch with their art). It's the only step with serious financial risk.

### Why making money changes things

- **"Fan project" vs "business".** Earning from their characters and art makes the site look like a business, which publishers, platforms and courts treat differently.
- **Damages in Canada** (if applicable). Statutory damages for **non-commercial** infringement are capped at **$5,000 total**; **commercial** infringement ranges from **$500 to $20,000 per work**. Monetizing next to official art could shift you from the first category to the second. A reason for care, not a precise figure; check or ask a lawyer.

### This site's exposure

- **Official art hosted directly:** ~316 MB of character art and videos in `frontend/public`. The main exposure, because the site published it, not its users.
- **User uploads** (boards, avatars): less risky with a clear takedown process; the Terms already commit to removing rule-breaking content. For formal US "safe harbour" protection for user content, register a copyright (DMCA) agent with the US Copyright Office (small fee).
- **Name and branding:** "MyGachaList" plus the existing "not affiliated" disclaimers are good. Never use official logos in a way that suggests endorsement.

### Keeping risk low while funding the site

- **Donations** (#61) are safest: people support you, not the publisher's art, and nothing is sold.
- **Keep money-making features off pages built around official art**, and never sell anything featuring their characters.
- **If a notice arrives, comply quickly and politely.** That almost always ends it.
- **Read each game's fan-content policy** before #62–#64; they differ, and some explicitly allow small donations or ads.

**Realistic worst case:** losing the site or the income for a while. Legal trouble with real money involved mostly comes from ignoring warnings or making substantial money off their art.

---

## 2. What about MyAnimeList? Same idea for anime, runs ads, has been around for decades

It shows ads on a fan database can work for years, but MAL differs in ways that matter.

### Why MyAnimeList can run ads comfortably

1. **The industry owns part of it.** Company-owned since around 2008; currently owned by Media Do, with investment from major Japanese publishers (Kodansha, Shueisha, Shogakukan). It partners with the industry (official streaming links, a licensed manga store). It's an industry-backed business, not a tolerated fan project.
2. **Mostly small, promotional images.** Small thumbnails of promotional material used to identify and catalogue a work have a well-established US fair-use argument (upheld for image search engines).
3. **Its main content is user-written text:** scores, reviews, lists, forums.
4. **YouTube embeds aren't copies.** An embedded trailer is served by YouTube under the uploader's permission.
5. **It has legal staff and a takedown process.**

### The closer precedent for this site

Gacha fan sites and guides (Game8, Prydwen, Fandom wikis, character-database sites) run ads next to game art all the time, and publishers largely tolerate it because guides keep players engaged. That's real precedent, **but it's tolerance, not permission**: a publisher can change its mind about any one site.

### Where this site is more exposed than MyAnimeList

- **Hosted, full-size assets:** ~316 MB of character art, including splash art and 29 costume videos (4–7 MB each), far beyond identifying thumbnails.
- **Where the assets came from:** assets extracted from game files are a weaker position than the publisher's own promotional material, and are what publishers most often object to.
- **YouTube embeds:** the same as MAL's, no issue.

### What this means for ads

Plausible, and normally tolerated in the gacha fan-site world. To stay closer to the MAL end of the spectrum:

- prefer official promotional art and smaller images over full-size extracted assets, especially on pages that carry ads;
- lean on user content (reviews, boards, profiles) and YouTube embeds;
- remove anything promptly if a publisher or host asks;
- check each game's fan-content policy, some of which address ads directly.

The practical objection remains (#64): at current traffic ads would earn little and change the site's feel.

---

## 3. So: stop hosting their art, or keep ads away from those parts of the site?

Roughly yes, refined: the point is **how** their art is used and **where** money sits relative to it, not necessarily hosting none of it. From most to least useful:

1. **Keep money away from their art.** Put ads or affiliate links on pages built around *your* content (reviews, community, boards, profiles), not character, art or costume pages. Cheapest change, covers most of the risk.
2. **Be careful about what you host, not whether you host.**
   - **Safer:** official promotional material (key visuals, press-kit art, the publisher's own posts) at reasonable sizes.
   - **Riskier:** assets pulled from game files, especially full-size splash art and costume videos.
   - **Safest:** YouTube embeds of official videos. For costume videos, an embed of the publisher's own showcase video (if one exists) could replace hosting the file.
3. **Don't rely on hotlinking** (showing images straight from the publisher's servers). Some US courts treat embedding as not copying, others have rejected that, it's weaker outside the US, and publisher links break without warning.
4. **Always:** respond to any takedown request quickly and politely.
5. **Donations (#61) sidestep most of this**, because people pay to support you, not to see the publisher's art.

Possible next step: inventory `frontend/public` into official/promotional, likely extracted from game files, and unclear, to know which files are higher-risk before deciding on ads (read-only check).

---

## 4. Are user accounts, and a premium version, a bad idea?

Neither is bad in itself.

**Accounts:** standard for this kind of site. The obligations are already covered: Privacy Policy, Terms, account deletion (#51, #52).

**A premium tier:** there's good precedent:

- **Letterboxd** sells **Pro and Patron** subscriptions while showing studios' posters and stills.
- **MyAnimeList** has a paid supporter membership that removes ads and adds perks.

What makes those work is that they sell **their own features**, not the studios' content.

| Premium that sells *your* features: lower risk | Premium that sells *their* content: higher risk |
|---|---|
| no ads (once you have them) | exclusive character art or wallpapers |
| profile themes, custom banners | high-resolution or extra official assets |
| extra board slots, stats, list exports | anything where the publisher's IP is the thing being paid for |

### What to weigh first

1. **Your current promise.** The About page says the site is "completely free… no paywalls, subscriptions, or premium tiers". That wording would change; ideally keep everything that exists today free, so premium only *adds* things.
2. **Operational weight.** Payment processing, sales tax/VAT (Stripe or Paddle can handle much of it), refunds, failed payments, and what happens to premium on account deletion. Use a hosted checkout such as Stripe Checkout so card details never touch the server.
3. **Legal paperwork.** Terms and Privacy Policy sections on payments, renewals and refunds.
4. **Scale.** Costs are ~$5–15/month. Donations with thank-you perks (#61) likely cover that with far less machinery; premium makes more sense once traffic justifies ads or extra features.

**In short:** accounts are fine; premium is fine if it sells your own features and keeps today's free experience intact. At the current size: donations first, premium later. #63 covers the cosmetic-perks version.
