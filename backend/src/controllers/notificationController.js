const { query } = require('../config/db');

/**
 * Notification rules — which game/category combos trigger updates.
 * Add new entries here when more games are brought in.
 */
const NOTIF_RULES = [
  { slug: 'zenless-zone-zero', categories: ['Lore', 'Trailer']    },
  { slug: 'nikke',             categories: ['Lore', 'Main Story'] },
  { slug: 'genshin-impact',    categories: ['Main Story']         },
  { slug: 'honkai-star-rail',  categories: ['Main Story']         },
  { slug: 'wuthering-waves',   categories: ['Main Story']         },
];

/**
 * GET /api/notifications
 * Returns the 50 most recent notification-worthy media items across all tracked games.
 * Public — no auth required.
 */
const getNotifications = async (req, res, next) => {
  try {
    // Build parameterised WHERE clause from the rules
    const params = [];
    const conditions = NOTIF_RULES.flatMap(rule =>
      rule.categories.map(cat => {
        params.push(rule.slug, cat);
        const i = params.length;
        return `(g.slug = $${i - 1} AND mc.category = $${i})`;
      })
    ).join(' OR ');

    const { rows } = await query(
      `SELECT mc.id, mc.title, mc.external_id, mc.thumbnail_url,
              mc.published_at, mc.category,
              g.name AS game_name, g.slug AS game_slug
       FROM   media_content mc
       JOIN   games g ON g.id = mc.game_id
       WHERE  mc.status = 'published'
         AND  (${conditions})
       ORDER  BY mc.published_at DESC
       LIMIT  50`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications };
