const { query } = require('../config/db');
const { createUserNotification } = require('./userNotificationController');

const MAX_LENGTH = 50;

/** GET /api/users/:id/notes — public */
const getNotes = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT pn.id, pn.content, pn.created_at,
              u.id          AS author_id,
              u.username    AS author_username,
              u.avatar_url  AS author_avatar,
              u.role        AS author_role
       FROM   profile_notes pn
       JOIN   users u ON u.id = pn.author_id
       WHERE  pn.target_user_id = $1
       ORDER  BY pn.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/** POST /api/users/:id/notes — authenticated; one note per author per profile (upsert) */
const upsertNote = async (req, res, next) => {
  try {
    const authorId = req.user.id;
    const targetId = req.params.id;
    const content  = (req.body.content || '').trim().slice(0, MAX_LENGTH);

    if (!content)            return res.status(400).json({ message: 'Note cannot be empty.' });
    if (authorId === targetId) return res.status(400).json({ message: 'Cannot leave a note on your own profile.' });

    // Detect new vs edit before the upsert
    const { rows: existing } = await query(
      'SELECT id FROM profile_notes WHERE author_id = $1 AND target_user_id = $2',
      [authorId, targetId]
    );
    const isNew = existing.length === 0;

    const { rows } = await query(
      `INSERT INTO profile_notes (author_id, target_user_id, content)
       VALUES ($1, $2, $3)
       ON CONFLICT (author_id, target_user_id)
       DO UPDATE SET content = EXCLUDED.content, created_at = NOW()
       RETURNING id, content, created_at`,
      [authorId, targetId, content]
    );

    // Only notify on a brand-new note, not on edits
    if (isNew) {
      createUserNotification(authorId, targetId, 'profile_note').catch(() => {});
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/users/:id/notes/:noteId — author only */
const deleteNote = async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM profile_notes WHERE id = $1 AND author_id = $2',
      [req.params.noteId, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ message: 'Note not found.' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
};

/** GET /api/users/:id/notes/mine — returns the caller's own note on this profile (or null) */
const getMyNote = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, content, created_at FROM profile_notes WHERE target_user_id = $1 AND author_id = $2',
      [req.params.id, req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotes, upsertNote, deleteNote, getMyNote };
