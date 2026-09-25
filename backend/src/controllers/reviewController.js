const { query } = require('../config/db');
const Joi = require('joi');
const { REVIEW_BODY_MAX } = require('../utils/limits');

// Safe server-side constants — never derived from user input
const ORDER_TOP = 'COUNT(uv.user_id) DESC, r.created_at DESC';
const ORDER_LATEST = 'r.created_at DESC';

// Reviews embed the reviewer's avatar_url, which is a base64 data URL — a single
// row measured at ~56KB, of which the avatar is 99.5%. Row counts therefore
// understate the payload badly, so the page size is small on purpose.
const REVIEW_PAGE_DEFAULT = 20;
const REVIEW_PAGE_MAX = 50;

const pageParams = (req, def = REVIEW_PAGE_DEFAULT, max = REVIEW_PAGE_MAX) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || def, 1), max);
  const offset = (Math.max(parseInt(req.query.page) || 1, 1) - 1) * limit;
  return { limit, offset };
};

const getReviews = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const orderBy = req.query.sort === 'top' ? ORDER_TOP : ORDER_LATEST;
    const userId = req.user?.id || null;
    const { limit, offset } = pageParams(req);

    // Built so LIMIT/OFFSET always occupy the last two placeholders whether or
    // not the caller is authenticated.
    const params = [gameId];
    let upvotedExpr = 'FALSE AS user_upvoted';
    if (userId) {
      params.push(userId);
      upvotedExpr = `COALESCE(BOOL_OR(uv.user_id = $${params.length}), FALSE) AS user_upvoted`;
    }
    params.push(limit + 1, offset);

    const { rows } = await query(
      `SELECT r.id, r.rating, r.body, r.created_at,
                u.id AS user_id, u.username, u.avatar_url,
                COUNT(uv.user_id)::int AS upvote_count,
                ${upvotedExpr}
         FROM game_reviews r
         JOIN users u ON r.user_id = u.id
         LEFT JOIN review_upvotes uv ON uv.review_id = r.id
         WHERE r.game_id = $1
         GROUP BY r.id, u.id
         ORDER BY ${orderBy}
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    // The caller's own review is returned explicitly so the edit form still
    // prefills once their review falls off the first page.
    let myReview = null;
    if (userId) {
      myReview = items.find((r) => r.user_id === userId) || null;
      if (!myReview) {
        const { rows: mine } = await query(
          `SELECT r.id, r.rating, r.body, r.created_at,
                u.id AS user_id, u.username, u.avatar_url,
                COUNT(uv.user_id)::int AS upvote_count,
                  TRUE AS user_upvoted
           FROM game_reviews r
           JOIN users u ON r.user_id = u.id
           LEFT JOIN review_upvotes uv ON uv.review_id = r.id
           WHERE r.game_id = $1 AND r.user_id = $2
           GROUP BY r.id, u.id`,
          [gameId, userId]
        );
        myReview = mine[0] || null;
      }
    }

    res.json({ items, hasMore, myReview });
  } catch (err) {
    next(err);
  }
};

/**
 * Review bodies are free text from any authenticated user and land straight in
 * the database, so they are capped. The form textarea is capped to match, so a
 * submission is only rejected here if the client limit was bypassed.
 */
const upsertReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(10).required()
    .messages({
      'any.required':    'Rating must be between 1 and 10.',
      'number.base':     'Rating must be between 1 and 10.',
      'number.min':      'Rating must be between 1 and 10.',
      'number.max':      'Rating must be between 1 and 10.',
      'number.integer':  'Rating must be between 1 and 10.',
    }),
  body: Joi.string().trim().max(REVIEW_BODY_MAX).allow('', null).optional()
    .messages({ 'string.max': `Review must be ${REVIEW_BODY_MAX} characters or fewer.` }),
});

const upsertReview = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { rating, body } = req.body;

    const { rows } = await query(
      `INSERT INTO game_reviews (game_id, user_id, rating, body)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (game_id, user_id) DO UPDATE
         SET rating = EXCLUDED.rating, body = EXCLUDED.body
       RETURNING *, (xmax = 0) AS inserted`,
      [gameId, req.user.id, rating, body?.trim() || null]
    );

    const status = rows[0].inserted ? 201 : 200;
    const { inserted: _, ...review } = rows[0];
    res.status(status).json(review);
  } catch (err) {
    next(err);
  }
};

const deleteReview = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM game_reviews WHERE id = $1 AND user_id = $2',
      [req.params.reviewId, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Review not found or not yours.' });
    res.json({ message: 'Review deleted.' });
  } catch (err) {
    next(err);
  }
};

const toggleUpvote = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const { rows: reviewRows } = await query(
      'SELECT user_id FROM game_reviews WHERE id = $1',
      [reviewId]
    );
    if (reviewRows.length === 0) return res.status(404).json({ message: 'Review not found.' });
    if (reviewRows[0].user_id === userId) {
      return res.status(400).json({ message: 'Cannot upvote your own review.' });
    }

    const { rows: existing } = await query(
      'SELECT 1 FROM review_upvotes WHERE review_id = $1 AND user_id = $2',
      [reviewId, userId]
    );

    if (existing.length > 0) {
      await query('DELETE FROM review_upvotes WHERE review_id = $1 AND user_id = $2', [reviewId, userId]);
      res.json({ upvoted: false });
    } else {
      await query('INSERT INTO review_upvotes (review_id, user_id) VALUES ($1, $2)', [reviewId, userId]);
      res.json({ upvoted: true });
    }
  } catch (err) {
    next(err);
  }
};

const getUserStats = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(r.id)::int               AS review_count,
         COALESCE(SUM(uv_counts.cnt), 0)::int AS total_upvotes
       FROM game_reviews r
       LEFT JOIN (
         SELECT review_id, COUNT(*)::int AS cnt
         FROM review_upvotes
         GROUP BY review_id
       ) uv_counts ON uv_counts.review_id = r.id
       WHERE r.user_id = $1`,
      [req.params.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const getUserReviews = async (req, res, next) => {
  try {
    const { limit, offset } = pageParams(req);
    const { rows } = await query(
      `SELECT r.id, r.game_id, r.rating, r.body, r.created_at,
              COUNT(uv.user_id)::int AS upvote_count
       FROM game_reviews r
       LEFT JOIN review_upvotes uv ON uv.review_id = r.id
       WHERE r.user_id = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.userId, limit + 1, offset]
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    // Totals are computed server-side so callers do not have to sum a page and
    // get an answer that silently only covers the rows they happened to fetch.
    const { rows: totals } = await query(
      `SELECT COUNT(r.id)::int AS total,
              COALESCE(SUM(uv_counts.cnt), 0)::int AS total_upvotes
       FROM game_reviews r
       LEFT JOIN (
         SELECT review_id, COUNT(*)::int AS cnt
         FROM review_upvotes
         GROUP BY review_id
       ) uv_counts ON uv_counts.review_id = r.id
       WHERE r.user_id = $1`,
      [req.params.userId]
    );

    res.json({ items, hasMore, total: totals[0].total, totalUpvotes: totals[0].total_upvotes });
  } catch (err) {
    next(err);
  }
};

module.exports = { getReviews, upsertReview, deleteReview, toggleUpvote, getUserReviews, getUserStats, upsertReviewSchema };
