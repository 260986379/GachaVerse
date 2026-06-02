const Joi = require('joi');
const { query } = require('../config/db');

const createCommentSchema = Joi.object({
  text_content: Joi.string().min(1).max(2000).required(),
  parent_comment_id: Joi.string().uuid().allow(null).optional(),
});

const editCommentSchema = Joi.object({
  text_content: Joi.string().min(1).max(2000).required(),
});

const createComment = async (req, res, next) => {
  try {
    const { text_content, parent_comment_id } = req.body;
    const { rows } = await query(
      `INSERT INTO comments (user_id, post_id, text_content, parent_comment_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, req.params.postId, text_content, parent_comment_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/comments/:id — author only */
const editComment = async (req, res, next) => {
  try {
    const { text_content } = req.body;
    const { rows } = await query(
      `UPDATE comments
       SET text_content = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [text_content, req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Comment not found or not yours.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/comments/:id — author or mod */
const deleteComment = async (req, res, next) => {
  try {
    const isMod = ['Owner', 'Dev'].includes(req.user.role);
    const { rowCount } = isMod
      ? await query('DELETE FROM comments WHERE id = $1', [req.params.id])
      : await query('DELETE FROM comments WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (rowCount === 0) return res.status(404).json({ message: 'Comment not found or not yours.' });
    res.json({ message: 'Comment deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createComment, editComment, deleteComment, createCommentSchema, editCommentSchema };
