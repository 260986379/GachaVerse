const { query } = require('../config/db');

const BOARD_LIMIT = 10;

/** GET /api/boards/user/:userId — public, returns all boards for a user */
const getBoards = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, game_id, game_name, image_url, caption, created_at
       FROM boards
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/** POST /api/boards — authenticated, add a board (max 10) */
const addBoard = async (req, res, next) => {
  try {
    const { rows: countRows } = await query(
      'SELECT COUNT(*) FROM boards WHERE user_id = $1',
      [req.user.id]
    );
    if (parseInt(countRows[0].count) >= BOARD_LIMIT) {
      return res.status(400).json({ message: `Board limit reached (${BOARD_LIMIT} max).` });
    }

    const { game_id = '', game_name = '', image_url, caption = '' } = req.body;
    if (!image_url) return res.status(400).json({ message: 'image_url is required.' });

    const { rows } = await query(
      `INSERT INTO boards (user_id, game_id, game_name, image_url, caption)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, game_id, game_name, image_url, caption, created_at`,
      [req.user.id, game_id, game_name, image_url, caption]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/boards/:id — authenticated, only the owner can delete */
const deleteBoard = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM boards WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Board not found or not yours.' });
    }
    res.json({ message: 'Board deleted.' });
  } catch (err) {
    next(err);
  }
};

/** GET /api/boards/game/:gameId — public, all boards for a game across all users */
const getBoardsByGame = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT b.id, b.game_id, b.game_name, b.image_url, b.caption, b.created_at,
              u.id AS posted_by_id, u.username AS posted_by, u.avatar_url AS posted_by_avatar
       FROM boards b
       JOIN users u ON u.id = b.user_id
       WHERE b.game_id = $1
       ORDER BY b.created_at DESC
       LIMIT 60`,
      [req.params.gameId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getBoards, addBoard, deleteBoard, getBoardsByGame };
