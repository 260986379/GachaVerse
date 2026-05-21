const Joi = require('joi');
const { query } = require('../config/db');

const createCommentSchema = Joi.object({
  text_content: Joi.string().min(1).max(2000).required(),
  parent_comment_id: Joi.string().uuid().allow(null).optional(),
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

module.exports = { createComment, createCommentSchema };
