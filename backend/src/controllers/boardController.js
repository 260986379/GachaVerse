const { query } = require('../config/db');
const { createUserNotification } = require('./userNotificationController');
const Joi = require('joi');
const { CAPTION_MAX, COMMENT_MAX, GAME_LABEL_MAX } = require('../utils/limits');
const { imageSource } = require('../utils/imageSource');
const { isSubscriberSql } = require('../utils/membership');
const { deleteImageByUrl } = require('../services/storageFiles');

/**
 * image_url is validated by imageSource (a Storage file in the caller's own
 * board folder, or a legacy data:image/* value); caption is capped tightly.
 */
const addBoardSchema = Joi.object({
  game_id:   Joi.string().trim().max(GAME_LABEL_MAX).allow('', null).optional(),
  game_name: Joi.string().trim().max(GAME_LABEL_MAX).allow('', null).optional(),
  image_url: imageSource('board').required()
    .messages({ 'any.required': 'image_url is required.', 'string.empty': 'image_url is required.' }),
  caption:   Joi.string().trim().max(CAPTION_MAX).allow('', null).optional(),
});

const addBoardCommentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(COMMENT_MAX).required()
    .messages({ 'string.empty': 'text is required.', 'any.required': 'text is required.' }),
});


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

/** DELETE /api/boards/:id — authenticated; the owner, or Owner/Dev as a takedown */
const deleteBoard = async (req, res, next) => {
  try {
    const isMod = ['Owner', 'Dev'].includes(req.user.role);
    const { rowCount, rows } = isMod
      ? await query('DELETE FROM boards WHERE id = $1 RETURNING image_url', [req.params.id])
      : await query('DELETE FROM boards WHERE id = $1 AND user_id = $2 RETURNING image_url', [req.params.id, req.user.id]);
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Board not found or not yours.' });
    }
    // Remove the stored image too, or a takedown leaves it reachable by URL.
    await deleteImageByUrl(rows?.[0]?.image_url);
    res.json({ message: 'Board deleted.' });
  } catch (err) {
    next(err);
  }
};

/** GET /api/boards/all — public, all boards across every game */
const getAllBoards = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT b.id, b.game_id, b.game_name, b.image_url, b.caption, b.created_at,
              u.id AS posted_by_id, u.username AS posted_by, u.avatar_url AS posted_by_avatar
       FROM boards b
       JOIN users u ON u.id = b.user_id
       ORDER BY b.created_at DESC
       LIMIT 120`
    );
    res.json(rows);
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

// ── Board comments ────────────────────────────────────────────────────────

/** GET /api/boards/:id/comments — public */
const getComments = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT bc.id, bc.text, bc.created_at, bc.user_id,
              u.username, u.avatar_url, u.role, ${isSubscriberSql('u')}
       FROM board_comments bc
       JOIN users u ON u.id = bc.user_id
       WHERE bc.board_id = $1
       ORDER BY bc.created_at ASC
       LIMIT 200`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/** POST /api/boards/:id/comments — authenticated */
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'text is required.' });

    const { rows } = await query(
      `INSERT INTO board_comments (board_id, user_id, text)
       VALUES ($1, $2, $3)
       RETURNING id, text, created_at, user_id`,
      [req.params.id, req.user.id, text.trim()]
    );
    const comment = rows[0];

    // Notify the board owner (fire-and-forget)
    query('SELECT user_id FROM boards WHERE id = $1', [req.params.id])
      .then(({ rows: b }) => {
        if (b[0]?.user_id) createUserNotification(req.user.id, b[0].user_id, 'board_comment').catch(() => {});
      })
      .catch(() => {});

    // Return with full user info so the frontend can display it immediately
    res.status(201).json({
      ...comment,
      username:   req.user.username,
      avatar_url: req.user.avatar_url,
      role:       req.user.role,
    });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/boards/:id/comments/:commentId — own comment OR board owner OR mod */
const deleteComment = async (req, res, next) => {
  try {
    const { id: boardId, commentId } = req.params;
    const userId = req.user.id;
    const isMod  = ['Owner', 'Dev'].includes(req.user.role);

    // Mods can delete any comment without a DB check
    if (isMod) {
      const { rowCount } = await query(
        'DELETE FROM board_comments WHERE id = $1 AND board_id = $2',
        [commentId, boardId]
      );
      if (rowCount === 0) return res.status(404).json({ message: 'Comment not found.' });
      return res.json({ message: 'Comment deleted.' });
    }

    // Allow if: commenter == user  OR  board owner == user
    const { rowCount } = await query(
      `DELETE FROM board_comments
       WHERE id = $1
         AND board_id = $2
         AND (
           user_id = $3
           OR $3 IN (SELECT user_id FROM boards WHERE id = $2)
         )`,
      [commentId, boardId, userId]
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Comment not found or not authorised.' });
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBoards, addBoard, deleteBoard, getAllBoards, getBoardsByGame, getComments, addComment, deleteComment, addBoardSchema, addBoardCommentSchema };
