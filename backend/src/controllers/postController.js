const Joi = require('joi');
const { query } = require('../config/db');

const createPostSchema = Joi.object({
  game_id: Joi.string().uuid().allow(null).optional(),
  content_type: Joi.string().valid('text', 'image', 'link', 'video').required(),
  text_content: Joi.string().max(5000).allow(null, '').optional(),
  media_url: Joi.string().uri().allow(null, '').optional(),
  link_url: Joi.string().uri().allow(null, '').optional(),
});

const editPostSchema = Joi.object({
  text_content: Joi.string().max(5000).allow(null, '').optional(),
});

const createPost = async (req, res, next) => {
  try {
    const { game_id, content_type, text_content, media_url, link_url } = req.body;
    const { rows } = await query(
      `INSERT INTO posts (user_id, game_id, content_type, text_content, media_url, link_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, game_id || null, content_type, text_content || null, media_url || null, link_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const getAllPosts = async (req, res, next) => {
  try {
    const { game_id, user_id } = req.query;
    const BASE = `SELECT p.*, u.username, u.avatar_url FROM posts p JOIN users u ON p.user_id=u.id`;

    let rows;
    if (game_id && user_id) {
      ({ rows } = await query(`${BASE} WHERE p.game_id=$1 AND p.user_id=$2 ORDER BY p.created_at DESC`, [game_id, user_id]));
    } else if (game_id) {
      ({ rows } = await query(`${BASE} WHERE p.game_id=$1 ORDER BY p.created_at DESC`, [game_id]));
    } else if (user_id) {
      ({ rows } = await query(`${BASE} WHERE p.user_id=$1 ORDER BY p.created_at DESC`, [user_id]));
    } else {
      ({ rows } = await query(`${BASE} ORDER BY p.created_at DESC`));
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.*, u.username, u.avatar_url FROM posts p JOIN users u ON p.user_id=u.id WHERE p.id=$1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Post not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/** GET /api/posts/:id/comments — chronological, paginated */
const getPostComments = async (req, res, next) => {
  try {
    const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (Math.max(parseInt(req.query.page)  || 1, 1) - 1) * limit;
    const { rows } = await query(
      `SELECT c.id, c.text_content, c.parent_comment_id, c.created_at, c.updated_at, c.user_id,
              u.username, u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit + 1, offset]
    );
    const hasMore = rows.length > limit;
    res.json({ items: hasMore ? rows.slice(0, limit) : rows, hasMore });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/posts/:id — author only */
const editPost = async (req, res, next) => {
  try {
    const { text_content } = req.body;
    const { rows } = await query(
      `UPDATE posts
       SET text_content = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [text_content ?? null, req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Post not found or not yours.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/posts/:id — author or mod */
const deletePost = async (req, res, next) => {
  try {
    const isMod = ['Owner', 'Dev'].includes(req.user.role);
    const { rowCount } = isMod
      ? await query('DELETE FROM posts WHERE id = $1', [req.params.id])
      : await query('DELETE FROM posts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Post not found or not yours.' });
    res.json({ message: 'Post deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPost, getAllPosts, getPostById, getPostComments, editPost, deletePost, createPostSchema, editPostSchema };
