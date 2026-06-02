const { query } = require('../config/db');
const { requireMod } = require('./reportController');

/** POST /api/suggestions — any visitor, auth optional */
const submitSuggestion = async (req, res, next) => {
  try {
    const { type, entry_name, game_name, reference_link } = req.body;

    if (!type || !['game', 'character', 'artwork'].includes(type)) {
      return res.status(400).json({ message: 'type must be game, character, or artwork.' });
    }
    if (!entry_name?.trim()) {
      return res.status(400).json({ message: 'entry_name is required.' });
    }
    if ((type === 'character' || type === 'artwork') && !game_name?.trim()) {
      return res.status(400).json({ message: 'game_name is required for character and artwork suggestions.' });
    }

    const { rows } = await query(
      `INSERT INTO suggestions (submitter_id, type, entry_name, game_name, reference_link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        req.user?.id ?? null,
        type,
        entry_name.trim(),
        game_name?.trim() || null,
        reference_link?.trim() || null,
      ]
    );

    res.status(201).json({ id: rows[0].id, message: 'Suggestion submitted.' });
  } catch (err) {
    next(err);
  }
};

/** GET /api/suggestions — Owner/Dev only */
const getSuggestions = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const type   = req.query.type;

    let sql = `
      SELECT s.id, s.type, s.entry_name, s.game_name, s.reference_link,
             s.status, s.created_at, s.reviewed_at,
             u.username   AS submitter_username,
             u.avatar_url AS submitter_avatar,
             m.username   AS reviewed_by_username
      FROM suggestions s
      LEFT JOIN users u ON u.id = s.submitter_id
      LEFT JOIN users m ON m.id = s.reviewed_by
      WHERE s.status = $1
    `;
    const params = [status];

    if (type) {
      params.push(type);
      sql += ` AND s.type = $${params.length}`;
    }

    sql += ' ORDER BY s.created_at DESC LIMIT 200';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/suggestions/:id — Owner/Dev only; action: 'reviewed' | 'dismissed' */
const resolveSuggestion = async (req, res, next) => {
  try {
    const { action } = req.body;
    if (!['reviewed', 'dismissed'].includes(action)) {
      return res.status(400).json({ message: "action must be 'reviewed' or 'dismissed'." });
    }

    const { rowCount } = await query(
      `UPDATE suggestions
       SET status = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3 AND status = 'pending'`,
      [action, req.user.id, req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: 'Suggestion not found or already actioned.' });
    }

    res.json({ message: `Suggestion marked as ${action}.` });
  } catch (err) {
    next(err);
  }
};

module.exports = { submitSuggestion, getSuggestions, resolveSuggestion, requireMod };
