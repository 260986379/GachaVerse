const { query } = require('../config/db');
const BANNER_CONFIG = require('../config/bannerConfig');

// Replaces all banner rows for each game found in config.
// DELETE + INSERT (not upsert) so stale/wrong entries from previous runs are removed.
const syncBanners = async () => {
  try {
    const slugs = Object.keys(BANNER_CONFIG);
    if (!slugs.length) return;

    const placeholders = slugs.map((_, i) => `$${i + 1}`).join(',');
    const { rows: games } = await query(
      `SELECT id, slug FROM games WHERE slug IN (${placeholders})`,
      slugs
    );
    if (!games.length) return;

    const gameMap = Object.fromEntries(games.map((g) => [g.slug, g.id]));
    let count = 0;

    for (const [slug, banners] of Object.entries(BANNER_CONFIG)) {
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
