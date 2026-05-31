const { query } = require('../config/db');

const requireMod = (req, res, next) => {
  if (!['Owner', 'Dev'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  next();
};

/** POST /api/reports — any logged-in user */
const fileReport = async (req, res, next) => {
  try {
    const { content_type, content_id, content_preview, reason } = req.body;
    if (!content_type || !content_id) {
      return res.status(400).json({ message: 'content_type and content_id are required.' });
    }

    // Prevent duplicate report from the same user on the same content
    const { rows: existing } = await query(
      `SELECT id FROM reports WHERE reporter_id = $1 AND content_id = $2 AND content_type = $3 AND status = 'pending'`,
      [req.user.id, content_id, content_type]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'You have already reported this.' });
    }

    const { rows } = await query(
      `INSERT INTO reports (reporter_id, content_type, content_id, content_preview, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [req.user.id, content_type, content_id, content_preview || null, reason?.trim() || null]
    );
    res.status(201).json({ id: rows[0].id, message: 'Report submitted.' });
  } catch (err) {
    next(err);
  }
};

/** GET /api/reports — Owner/Dev only */
const getReports = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const type   = req.query.type;

    let sql = `
      SELECT r.id, r.content_type, r.content_id, r.content_preview, r.reason,
             r.status, r.created_at, r.resolved_at,
             u.username  AS reporter_username,
             u.avatar_url AS reporter_avatar,
             m.username  AS resolved_by_username
      FROM reports r
      LEFT JOIN users u ON u.id = r.reporter_id
      LEFT JOIN users m ON m.id = r.resolved_by
      WHERE r.status = $1
    `;
    const params = [status];

    if (type) {
      params.push(type);
      sql += ` AND r.content_type = $${params.length}`;
    }

    sql += ' ORDER BY r.created_at DESC LIMIT 100';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const CONTENT_DELETE_SQL = {
  board:  'DELETE FROM boards         WHERE id = $1',
  review: 'DELETE FROM game_reviews   WHERE id = $1',
  note:   'DELETE FROM profile_notes  WHERE id = $1',
};

/** PATCH /api/reports/:id — Owner/Dev only */
const resolveReport = async (req, res, next) => {
  try {
    const { action } = req.body; // 'resolve' | 'dismiss'
    if (!['resolve', 'dismiss'].includes(action)) {
      return res.status(400).json({ message: "action must be 'resolve' or 'dismiss'." });
    }

    const { rows } = await query(
      `SELECT content_type, content_id FROM reports WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Report not found.' });

    const { content_type, content_id } = rows[0];

    if (action === 'resolve') {
      const deleteSql = CONTENT_DELETE_SQL[content_type];
      if (deleteSql) await query(deleteSql, [content_id]);

      // Mark all pending reports for the same content as resolved
      await query(
        `UPDATE reports
         SET status = 'resolved', resolved_by = $1, resolved_at = NOW()
         WHERE content_id = $2 AND status = 'pending'`,
        [req.user.id, content_id]
      );
    } else {
      await query(
        `UPDATE reports
         SET status = 'dismissed', resolved_by = $1, resolved_at = NOW()
         WHERE id = $2`,
        [req.user.id, req.params.id]
      );
    }

    res.json({ message: `Report ${action}d.` });
  } catch (err) {
    next(err);
  }
};

module.exports = { fileReport, getReports, resolveReport, requireMod };
