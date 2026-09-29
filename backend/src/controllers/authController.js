const { query } = require('../config/db');

/**
 * POST /api/auth/sync
 * Called by the frontend right after Firebase sign-in.
 * Creates the user row if it doesn't exist yet, or returns the existing one.
 * Requires: Authorization: Bearer <firebase-id-token>
 *           req.firebaseUser set by authenticateFirebase middleware
 */
const syncUser = async (req, res, next) => {
  try {
    const { uid, email, name, picture } = req.firebaseUser;
    const { username } = req.body; // optional – provided on first sign-up

    const USER_SELECT = `
      SELECT id, username, email, avatar_url, banner_url, bio, birthday, role, created_at,
             subscription_status, subscription_current_period_end, subscription_cancel_at_period_end,
             (SELECT COUNT(*) FROM user_follows WHERE follower_id  = users.id) AS following_count,
             users.followers_count
      FROM users`;

    // Try to find by firebase_uid first
    let result = await query(`${USER_SELECT} WHERE firebase_uid = $1`, [uid]);

    if (result.rows.length > 0) {
      // Existing user – return profile
      return res.json({ user: result.rows[0], isNew: false });
    }

    // Check by email (legacy user who signed up before Firebase)
    const byEmail = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (byEmail.rows.length > 0) {
      // Link firebase_uid to the existing row
      await query('UPDATE users SET firebase_uid = $1 WHERE id = $2', [uid, byEmail.rows[0].id]);
      const updated = await query(`${USER_SELECT} WHERE id = $1`, [byEmail.rows[0].id]);
      return res.json({ user: updated.rows[0], isNew: false });
    }

    // Brand-new user – derive a username
    let finalUsername = username?.trim();
    if (!finalUsername) {
      // Use the part before @ in email, strip non-alphanumeric, ensure uniqueness
      const base = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 25);
      finalUsername = base || 'gachafan';
    }

    // Ensure username uniqueness by appending a counter if needed
    let attempt = finalUsername;
    let counter = 1;
    while (true) {
      const exists = await query('SELECT id FROM users WHERE username = $1', [attempt]);
      if (exists.rows.length === 0) { finalUsername = attempt; break; }
      attempt = `${finalUsername}${counter++}`;
    }

    try {
      const inserted = await query(
        `INSERT INTO users (username, email, firebase_uid, avatar_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [finalUsername, email, uid, picture || null]
      );
      const newUser = await query(`${USER_SELECT} WHERE id = $1`, [inserted.rows[0].id]);
      return res.status(201).json({ user: newUser.rows[0], isNew: true });
    } catch (insertErr) {
      if (insertErr.code === '23505') {
        // Race condition — re-fetch the row that was already inserted
        const existing = await query(`${USER_SELECT} WHERE firebase_uid = $1`, [uid]);
        if (existing.rows.length > 0) return res.json({ user: existing.rows[0], isNew: false });
      }
      throw insertErr;
    }
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
const getMe = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, username, email, avatar_url, banner_url, bio, birthday, role, created_at,
              subscription_status, subscription_current_period_end, subscription_cancel_at_period_end,
              (SELECT COUNT(*) FROM user_follows WHERE follower_id = users.id)  AS following_count,
              users.followers_count
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { syncUser, getMe };
