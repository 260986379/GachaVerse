/**
 * Manually tag videos in the database.
 *
 * HOW TO USE:
 *  1. Run `node backend/scripts/tagVideos.js` with no TAG_MAP entries to see
 *     a full list of all videos with their YouTube IDs and current tags.
 *  2. Fill in TAG_MAP below: key = YouTube video ID (external_id), value = array of tags.
 *     Tags are matched against character names, so use the character's display_name
 *     (e.g. 'Ellen', 'Miyabi', 'Anby: Soldier 0').
 *  3. Run again to apply. Re-running is safe — it overwrites the tags for each listed video.
 *
 * Example:
 *   'dQw4w9WgXcQ': ['Ellen', 'Victoria Housekeeping'],
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { query, testConnection } = require("../src/config/db");

// ─── Fill this in ────────────────────────────────────────────────────────────
const TAG_MAP = {
  // Cinematics
  UgeN7naPPz4: ["Miyabi", "Ye Shunguang", "Yixuan"],
  Rp9YEFcwBiQ: ["Miyabi", "Harumasa", "Yanagi", "Soukaku"],
  NWIGi1NUqEE: ["Koleda", "Grace", "Anton", "Ben"],
  "cte-F_cebsI": ["Burnice", "Lighter", "Piper", "Luciana", "Caesar"],
  oJhL9SXgFyQ: ["Miyabi", "Harumasa", "Yanagi", "Soukaku"],
  Z9Y1pgPjppU: ["Miyabi", "Harumasa", "Yanagi", "Soukaku"],
  Chs8ZHZneKc: ["Miyabi"],
  "4O_KUvqwuoI": ["Astra"],
  ynAkmY5_Drk: ["Anby", "Soldier 11"],
  kKPwOTz6z5Q: ["Trigger"],
  JP3Fn9dJGMg: ["Hugo", "Lycaon"],
  GLyeKu_Arro: ["Vivian"],
  sZpirqboXOM: ["Yixuan"],
  "-m-ZPZDJdLM": ["Yixuan"],
  bWiqsh5DcZs: ["Alice", "Yuzuha"],
  ahldGA_Lee8: ["Seed"],
  ZNJAi0FOjnM: ["Ye Shunguang"],
  hAT1SP4AZp8: ["Sunna", "Aria", "Nangong Yu"],
  uhjmUDrXHng: ["Sunna", "Aria", "Nangong Yu"],
  // Teasers
  hsy3OLFi04o: ["Jane", "Seth"],
  YzElFb4S64s: ["Burnice", "Lighter", "Piper", "Luciana", "Caesar"],
  pvP1bv_gLtQ: ["Miyabi", "Harumasa", "Yanagi", "Soukaku"],
  "9aFEcYP0ZFs": ["Miyabi", "Harumasa", "Yanagi", "Soukaku"],
  TJCES9aILrI: ["Astra", "Evelyn"],
  "5L1CS1xjBaE": ["Anby", "Trigger", "Soldier 11"],
  OJhzGhOOI2w: ["Vivian", "Hugo"],
  u8cwFGkNO1w: ["Yixuan", "Ju Fufu", "Pan Yinhu", "Ye Shunguang"],
  ZeDWAW3Q31c: ["Alice", "Yuzuha"],
  fewL0nKeG8w: ["Seed", "Orphie & Magus"],
  OZCagSfqQJw: ["Banyue", "Dialyn", "Ye Shunguang"],
  V8iNHiWSQF4: ["Ye Shunguang", "Zhao"],
  pMchTj9qzQY: ["Sunna", "Aria", "Nangong Yu"],
  QoixgtmqRvo: ["Cissia", "Nangong Yu"],
  FBRhpWTTPu4: ["Promeia", "Cissia", "Billy", "Belle", "Wise"],
};
// ─────────────────────────────────────────────────────────────────────────────

const main = async () => {
  await testConnection();

  // Apply tags for any entries in TAG_MAP
  let updated = 0;
  for (const [externalId, tags] of Object.entries(TAG_MAP)) {
    const { rowCount } = await query(
      `UPDATE media_content SET tags = $1 WHERE external_id = $2`,
      [tags, externalId],
    );
    if (rowCount) {
      console.log(`  Tagged [${externalId}] → [${tags.join(", ")}]`);
      updated++;
    } else {
      console.warn(`  NOT FOUND: ${externalId}`);
    }
  }

  if (updated > 0) console.log(`\n${updated} video(s) tagged.\n`);

  // Always print the full video list so you can see what needs tagging
  const { rows } = await query(
    `SELECT external_id, title, category, tags
     FROM media_content
     WHERE status = 'published'
     ORDER BY category, title`,
  );

  console.log("─".repeat(90));
  console.log(
    `${"ID".padEnd(14)} ${"Category".padEnd(16)} ${"Tags".padEnd(20)} Title`,
  );
  console.log("─".repeat(90));
  for (const v of rows) {
    const tags = v.tags?.length ? v.tags.join(", ") : "(none)";
    console.log(
      `${(v.external_id || "").padEnd(14)} ${(v.category || "").padEnd(16)} ${tags.padEnd(20)} ${v.title || ""}`,
    );
  }
  console.log("─".repeat(90));
  console.log(`Total: ${rows.length} videos`);

};

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
}

module.exports = { tagVideos: main };
