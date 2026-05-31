const Joi = require('joi');
const { query } = require('../config/db');

const createPostSchema = Joi.object({
  game_id: Joi.string().uuid().allow(null).optional(),
  content_type: Joi.string().valid('text', 'image', 'link', 'video').required(),
  text_content: Joi.string().max(5000).allow(null, '').optional(),
  media_url: Joi.string().uri().allow(null, '').optional(),
  link_url: Joi.string().uri().allow(null, '').optional(),
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

module.exports = { createPost, getAllPosts, getPostById, createPostSchema };
