/**
 * Manually set highlight_start timestamps for specific videos.
 *
 * HOW TO USE:
 *  1. Run with no entries in TIMESTAMPS to print the full list of Music
 *     videos with their current highlight_start values so you can see
 *     what's already set.
 *  2. Fill in TIMESTAMPS below: key = YouTube video ID (external_id),
 *     value = start time in seconds (integer).
 *  3. Run again to apply. Re-running is safe — it overwrites only the
 *     videos listed here.
 *
 * Example:
 *   'U7W8QR9fsFw': 45,   // WHITE NIGHT — start at the chorus
 *   'loWA5o1RdTY': 0,    // reset to beginning
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { query, testConnection } = require("../src/config/db");

// ─── Fill this in ─────────────────────────────────────────────────────────────
const TIMESTAMPS = {
  FaxI5oNATLE: 43, // Caesar EP
  uLMSVstf6zo: 75, // Wuthering Waves EP 1.1
  cK1ABiGuiG0: 60, // Ellen EP
  byA4ep5AEkw: 190, // Honkai: Star Rail Concert 2025: "Take the Journey"
  IsbzgjV2vbA: 50, // Wuthering Waves EP3.0 — Mornye - "Unwritten in the Stars"
  TxpClssrLG8: 70, // Wuthering Waves EP3.1 — Luuk Herssen - "Thawing Light"
  lxqEBOMHsV8: 65, // Wuthering Waves EP2.1 — Phoebe - "Daisy Crown"
  "Z-oRFYVCpms": 55, // GODDESS OF VICTORY: NIKKE | SEA, YOU, AGAIN Theme Song 「SO PLAYFUL」 - Full Ver.
  SNlGBZ0usGI: 55, // GODDESS OF VICTORY: NIKKE | FOOTSTEP, WALK, RUN Story Event BGM 「Rising Higher」 - Full Ver.
  HLv8Dz8t6Hk: 114, // "Turn Heartbeats Into Tempo" - Angels of Delusion EP | Zenless Zone Zero
  fao9fjeAGEI: 40, // Honkai: Star Rail EP: Allegory of the Cave
  LKa1dWH95PQ: 80, // GODDESS OF VICTORY: NIKKE | OVER ZONE Theme Song 「SATELLITES」- Full Ver.
  "hKHv-DuMOyo": 83, // GODDESS OF VICTORY: NIKKE | RED ASH Theme Song Full Ver.
  cuVADrQ3fQI: 45, // Wuthering Waves EP3.3 — Denia - "Decensus Ad Nihilum"
  erDd9_ttZWA: 180, // Wuthering Waves EP2.3 — Zani - "Off Work?"
  J9wcfTVUZNE: 90, // EP: Of Snow and Ember | Honkai: Star Rail
  MD1XbIUPQTw: 128, // ARK GUARDIAN Theme Song「NEARLY WHITE」full Ver. | GODDESS OF VICTORY: NIKKE
  DQDs56LuKEs: 49, //「GODDESS OF VICTORY: NIKKE」 Global Theme Song 「TuNGSTeN」 Hiroyuki SAWANO (feat. mizuki) Full ver.
  HeFeFCPc0DQ: 25, // GODDESS OF VICTORY: NIKKE | COLORLESS Story Event BGM 「COLORLESS」 - Full Ver.
  _VgM_0LkMcc: 49, //「GODDESS OF VICTORY: NIKKE」 Global Theme Song 「TuNGSTeN」 Hiroyuki SAWANO (feat. mizuki)
  H3IlkN0uveM: 85, // GODDESS OF VICTORY: NIKKE | RED ASH BGM 「Our Hometown」 - Full Ver.
  kDq8LvBGJv8: 68, // Wuthering Waves EP3.3 — Hiyuki - "One More Wish"
  "5zK7JH6-wZA": 68, // GODDESS OF VICTORY: NIKKE | Modernia Theme Song - Goodbye For Now
  "L-H7pJEV8v8": 39, // New Opening ''Into the Fire'' – Presented by A-1 Pictures | GODDESS OF VICTORY: NIKKE
  iOWVr2aC6Fg: 48, // GODDESS OF VICTORY: NIKKE | Anime PV (Opening Ver.)
  VpZ0R0Edktc: 0, // 2X2 Love Opening Animation | GODDESS OF VICTORY: NIKKE
  tFcowRy3P2o: 108, // GODDESS OF VICTORY: NIKKE | Nikke BGM - Red Hood 「Costumes」 - Full Ver.
  Zsuik039rvE: 56, // GODDESS OF VICTORY: NIKKE | JUVENILE DAYS Story Event BGM 「Juvenile Days」 - Full Ver.
};
// ─────────────────────────────────────────────────────────────────────────────

const main = async () => {
  await testConnection();

  // Apply any entries in TIMESTAMPS
  let updated = 0;
  for (const [externalId, seconds] of Object.entries(TIMESTAMPS)) {
    if (typeof seconds !== "number" || seconds < 0) {
      console.warn(
        `  SKIPPED [${externalId}] — value must be a non-negative number`,
      );
      continue;
    }
    const { rowCount } = await query(
      `UPDATE media_content SET highlight_start = $1 WHERE external_id = $2`,
      [Math.round(seconds), externalId],
    );
    if (rowCount) {
      console.log(`  [${externalId}] → ${Math.round(seconds)}s ✓`);
      updated++;
    } else {
      console.warn(`  NOT FOUND: ${externalId}`);
    }
  }
  if (updated > 0) console.log(`\n${updated} video(s) updated.\n`);

  // Always print the full list so you can see current state
  const { rows } = await query(`
    SELECT mc.external_id, mc.highlight_start, mc.title, g.name AS game_name
    FROM   media_content mc
    JOIN   games g ON g.id = mc.game_id
    WHERE  mc.category    = 'Music'
      AND  mc.status      = 'published'
    ORDER  BY g.name, mc.title
  `);

  const col = (s, w) =>
    String(s ?? "")
      .padEnd(w)
      .slice(0, w);
  console.log("─".repeat(85));
  console.log(
    `${"ID".padEnd(14)} ${"Start".padEnd(7)} ${"Game".padEnd(22)} Title`,
  );
  console.log("─".repeat(85));
  for (const r of rows) {
    const start =
      r.highlight_start != null ? `${r.highlight_start}s` : "(none)";
    console.log(
      `${col(r.external_id, 14)} ${col(start, 7)} ${col(r.game_name, 22)} ${r.title}`,
    );
  }
  console.log("─".repeat(85));
  console.log(`Total: ${rows.length} videos`);
};

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
