const { query } = require('../config/db');

const getReviews = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const sort = req.query.sort === 'top' ? 'top' : 'latest';
    const userId = req.user?.id || null;

    const orderBy = sort === 'top'
      ? 'COUNT(uv.user_id) DESC, r.created_at DESC'
      : 'r.created_at DESC';

    const userUpvotedExpr = userId
      ? `COALESCE(BOOL_OR(uv.user_id = $2), FALSE) AS user_upvoted`
      : `FALSE AS user_upvoted`;

    const { rows } = await query(
      `SELECT
         r.id,
         r.rating,
         r.body,
         r.created_at,
         u.id        AS user_id,
         u.username,
         u.avatar_url,
         COUNT(uv.user_id)::int AS upvote_count,
         ${userUpvotedExpr}
       FROM game_reviews r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN review_upvotes uv ON uv.review_id = r.id
       WHERE r.game_id = $1
       GROUP BY r.id, u.id
       ORDER BY ${orderBy}`,
      userId ? [gameId, userId] : [gameId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const upsertReview = async (req, res, next) => {
  try {
    const { gameId } = req.params;
    const { rating, body } = req.body;

    if (!rating || rating < 1 || rating > 10) {
      return res.status(400).json({ message: 'Rating must be between 1 and 10.' });
    }

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
    const { rows } = await query(
      `SELECT r.id, r.game_id, r.rating, r.body, r.created_at,
              COUNT(uv.user_id)::int AS upvote_count
       FROM game_reviews r
       LEFT JOIN review_upvotes uv ON uv.review_id = r.id
       WHERE r.user_id = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getReviews, upsertReview, deleteReview, toggleUpvote, getUserReviews, getUserStats };
