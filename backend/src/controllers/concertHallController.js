const { query } = require('../config/db')

// Videos manually excluded from Concert Hall (previews, teasers, non-playable clips)
const EXCLUDED_IDS = new Set([
  '1JxIfrgk0mM', // NIKKE 2.5th Anniversary Theme Song Preview
])

/**
 * GET /api/concert-hall/videos
 * Returns weighted-random Music-category videos for a Concert Hall session.
 *
 * Query params:
 *   source  — 'all' | 'specific'
 *   games   — comma-separated game slugs (only used when source=specific)
 *   count   — number of videos to return (default 8, max 20)
 *
 * Selection weight: -LN(RANDOM()) / LN(view_count + 2)
 * Log-dampened: popular videos still appear more often but the gap vs. less-viewed
 * tracks is much smaller (a 10M-view video is ~1.5× more likely than a 100K-view
 * video rather than 100×).
 */
const getVideos = async (req, res, next) => {
  try {
    const { source, games: gamesParam, count } = req.query
    const limit = Math.min(parseInt(count) || 8, 20)

    const params = []
    let gameFilter = ''

    if (source === 'specific' && gamesParam) {
      const slugs = gamesParam.split(',').map(s => s.trim()).filter(Boolean)
      if (slugs.length > 0) {
        params.push(slugs)
        gameFilter = `AND g.slug = ANY($${params.length})`
      }
    }

    params.push(limit)
    const limitIdx = `$${params.length}`

    params.push([...EXCLUDED_IDS])
    const excludeIdx = `$${params.length}`

    const { rows } = await query(`
      SELECT
        mc.id,
        mc.external_id,
        mc.title,
        COALESCE(mc.view_count, 0)  AS view_count,
        mc.highlight_start,
        g.name   AS game_name,
        g.slug   AS game_slug
      FROM media_content mc
      JOIN games g ON g.id = mc.game_id
      WHERE mc.status       = 'published'
        AND mc.category     IN ('Music', 'Opening')
        AND mc.external_id  IS NOT NULL
        AND mc.title        IS NOT NULL
        AND mc.external_id  != ALL(${excludeIdx})
        ${gameFilter}
      ORDER BY -LN(RANDOM()) / LN(COALESCE(mc.view_count, 0)::float + 2)
      LIMIT ${limitIdx}
    `, params)

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No music videos found for the selected games.' })
    }

    res.json(rows)
  } catch (err) {
    next(err)
  }
}

module.exports = { getVideos }
