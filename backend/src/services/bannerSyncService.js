const { query } = require('../config/db');
const BANNER_CONFIG = require('../config/bannerConfig');
const { fetchGenshinBanners } = require('./genshinBannerFetcher');

// Builds the effective banner config for this sync run.
// Genshin Impact is fetched live from the HoYoverse announcement API;
// all other games fall back to the static bannerConfig.js.
async function buildEffectiveConfig() {
  const config = { ...BANNER_CONFIG };

  try {
    const live = await fetchGenshinBanners();
    config['genshin-impact'] = live;
    console.log(`[Banners] Fetched ${live.length} Genshin banner(s) live from HoYoverse API`);
  } catch (err) {
    console.warn(`[Banners] Genshin live fetch failed — using static config: ${err.message}`);
  }

  return config;
}

// Replaces all banner rows for each tracked game.
// DELETE + INSERT so stale entries from previous runs are removed.
const syncBanners = async () => {
  try {
    const effectiveConfig = await buildEffectiveConfig();

    const slugs = Object.keys(effectiveConfig);
    if (!slugs.length) return;

    const placeholders = slugs.map((_, i) => `$${i + 1}`).join(',');
    const { rows: games } = await query(
      `SELECT id, slug FROM games WHERE slug IN (${placeholders})`,
      slugs
    );
    if (!games.length) return;

    const gameMap = Object.fromEntries(games.map((g) => [g.slug, g.id]));
    let count = 0;

    for (const [slug, banners] of Object.entries(effectiveConfig)) {
      const gameId = gameMap[slug];
      if (!gameId) continue;

      await query('DELETE FROM game_banners WHERE game_id=$1', [gameId]);

      for (const b of banners) {
        await query(
          `INSERT INTO game_banners (game_id, name, banner_type, starts_at, ends_at, image_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [gameId, b.name, b.type, b.starts_at, b.ends_at, b.image_url || null]
        );
        count++;
      }
    }

    console.log(`[Banners] Synced ${count} banner entries across ${games.length} game(s)`);
  } catch (err) {
    console.error('[Banners] Sync failed:', err.message);
  }
};

module.exports = { syncBanners };
