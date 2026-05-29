const { query } = require('../config/db');

const PROTECTED_ROLES = ['Owner', 'Dev', 'VIP'];

/** Roles that can see Debug accounts */
const canSeeDebug = (user) => user?.role === 'Owner' || user?.role === 'Dev';

// ── Profile ────────────────────────────────────────────────────────────────

const getUserProfile = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, username, avatar_url, banner_url, bio, birthday, role, created_at,
              (SELECT COUNT(*) FROM user_follows WHERE follower_id  = users.id) AS following_count,
              (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) AS followers_count
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    if (rows[0].role === 'Debug' && !canSeeDebug(req.user)) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/** GET /api/users/by-username/:username */
const getUserByUsername = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, username, avatar_url, banner_url, bio, birthday, role, created_at,
              (SELECT COUNT(*) FROM user_follows WHERE follower_id  = users.id) AS following_count,
              (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) AS followers_count
       FROM users WHERE username = $1`,
      [req.params.username]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    if (rows[0].role === 'Debug' && !canSeeDebug(req.user)) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/users/me — update bio, username, birthday, avatar_url, banner_url */
const updateMe = async (req, res, next) => {
  try {
    const { username, bio, birthday, avatar_url, banner_url } = req.body;

    // Username uniqueness + role-protection check
    if (username != null) {
      const existing = await query(
        'SELECT id, role FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2',
        [username, req.user.id]
      );
      if (existing.rows.length > 0) {
        const takenByRole = existing.rows[0].role;
        if (PROTECTED_ROLES.includes(takenByRole)) {
          return res.status(409).json({ message: 'That username belongs to a protected account and cannot be claimed.' });
        }
        if (PROTECTED_ROLES.includes(req.user.role)) {
          return res.status(409).json({ message: 'That username is already taken. Protected accounts cannot claim names from other users.' });
        }
        return res.status(409).json({ message: 'Username already taken.' });
      }
    }

    // Build SET clause dynamically so only provided fields are updated.
    // Passing null explicitly clears the column; omitting the key leaves it unchanged.
    const fields = [];
    const values = [];
    let idx = 1;

    if ('username'   in req.body) { fields.push(`username = $${idx++}`);          values.push(username || null); }
    if ('bio'        in req.body) { fields.push(`bio = $${idx++}`);               values.push(bio ?? null); }
    if ('birthday'   in req.body) { fields.push(`birthday = $${idx++}::date`);    values.push(birthday || null); }
    if ('avatar_url' in req.body) { fields.push(`avatar_url = $${idx++}`);        values.push(avatar_url || null); }
    if ('banner_url' in req.body) { fields.push(`banner_url = $${idx++}`);        values.push(banner_url || null); }

    if (fields.length === 0) return res.status(400).json({ message: 'Nothing to update.' });

    fields.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const { rows } = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, username, email, avatar_url, banner_url, bio, birthday, role, created_at`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// ── Games ──────────────────────────────────────────────────────────────────

const getUserGames = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT g.*, ug.is_featured, ug.personal_notes
       FROM games g
       JOIN user_games ug ON g.id = ug.game_id
       WHERE ug.user_id = $1`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const addUserGame = async (req, res, next) => {
  try {
    const { game_id, game_slug, is_featured = false, personal_notes = null } = req.body;
    if (game_slug) {
      await query(
        `INSERT INTO user_games (user_id, game_id, is_featured, personal_notes)
         SELECT $1, id, $3, $4 FROM games WHERE slug = $2
         ON CONFLICT DO NOTHING`,
        [req.user.id, game_slug, is_featured, personal_notes]
      );
    } else {
      await query(
        'INSERT INTO user_games (user_id, game_id, is_featured, personal_notes) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [req.user.id, game_id, is_featured, personal_notes]
      );
    }
    res.status(201).json({ message: 'Game added to your list' });
  } catch (err) {
    next(err);
  }
};

const { UUID_RE } = require('../utils/uuid');

const removeUserGame = async (req, res, next) => {
  try {
    if (UUID_RE.test(req.params.id)) {
      await query('DELETE FROM user_games WHERE user_id=$1 AND game_id=$2', [req.user.id, req.params.id]);
    } else {
      await query(
        'DELETE FROM user_games WHERE user_id=$1 AND game_id=(SELECT id FROM games WHERE slug=$2)',
        [req.user.id, req.params.id]
      );
    }
    res.json({ message: 'Game removed from your list' });
  } catch (err) {
    next(err);
  }
};

// ── Follows ────────────────────────────────────────────────────────────────

/** POST /api/users/:id/follow  — follow a user */
const followUser = async (req, res, next) => {
  try {
    const followingId = req.params.id;
    const followerId  = req.user.id;

    if (followerId === followingId) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    // Verify the target exists
    const target = await query('SELECT id FROM users WHERE id = $1', [followingId]);
    if (target.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    await query(
      'INSERT INTO user_follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [followerId, followingId]
    );

    const counts = await _getCounts(followingId);
    res.json({ following: true, ...counts });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/users/:id/follow  — unfollow a user */
const unfollowUser = async (req, res, next) => {
  try {
    const followingId = req.params.id;
    const followerId  = req.user.id;

    await query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    const counts = await _getCounts(followingId);
    res.json({ following: false, ...counts });
  } catch (err) {
    next(err);
  }
};

/** GET /api/users/:id/follow-status  — check if the authed user follows :id */
const getFollowStatus = async (req, res, next) => {
  try {
    const targetId   = req.params.id;
    const requesterId = req.user?.id;

    let isFollowing = false;
    if (requesterId) {
      const { rows } = await query(
        'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2',
        [requesterId, targetId]
      );
      isFollowing = rows.length > 0;
    }

    const counts = await _getCounts(targetId);
    res.json({ following: isFollowing, ...counts });
  } catch (err) {
    next(err);
  }
};

/** GET /api/users/:id/followers */
const getFollowers = async (req, res, next) => {
  try {
    const seeDebug = canSeeDebug(req.user)
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar_url, uf.created_at AS followed_at
       FROM user_follows uf
       JOIN users u ON u.id = uf.follower_id
       WHERE uf.following_id = $1
         AND ($2 OR u.role != 'Debug')
       ORDER BY uf.created_at DESC`,
      [req.params.id, seeDebug]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/** GET /api/users/:id/following */
const getFollowing = async (req, res, next) => {
  try {
    const seeDebug = canSeeDebug(req.user)
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar_url, uf.created_at AS followed_at
       FROM user_follows uf
       JOIN users u ON u.id = uf.following_id
       WHERE uf.follower_id = $1
         AND ($2 OR u.role != 'Debug')
       ORDER BY uf.created_at DESC`,
      [req.params.id, seeDebug]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ── Search ─────────────────────────────────────────────────────────────────

/** GET /api/users/search?q=query */
const searchUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return res.json([])
    const seeDebug = canSeeDebug(req.user)
    const { rows } = await query(
      `SELECT id, username, avatar_url, banner_url, bio, role,
              (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) AS followers_count
       FROM users
       WHERE username ILIKE $1
         AND ($2 OR role != 'Debug')
       ORDER BY (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) DESC
       LIMIT 20`,
      [`%${q}%`, seeDebug]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

// ── Community ──────────────────────────────────────────────────────────────

/**
 * GET /api/users/community
 * Only users with both avatar + banner.
 * Ordered by most recent board upload DESC, then profile created_at as fallback.
 */
const getCommunityUsers = async (req, res, next) => {
  try {
    const seeDebug = canSeeDebug(req.user)
    const { rows } = await query(
      `SELECT u.id, u.username, u.avatar_url, u.banner_url, u.role,
              (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) AS followers_count
       FROM users u
       WHERE u.avatar_url IS NOT NULL AND u.avatar_url <> ''
         AND u.banner_url IS NOT NULL AND u.banner_url <> ''
         AND ($1 OR u.role != 'Debug')
       ORDER BY
         COALESCE(
           (SELECT MAX(b.created_at) FROM boards b WHERE b.user_id = u.id),
           u.created_at
         ) DESC
       LIMIT 20`,
      [seeDebug]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// ── Directory ─────────────────────────────────────────────────────────────

/**
 * GET /api/users/directory
 * All users. Profile completeness tier first:
 *   0 = both avatar + banner, 1 = one image, 2 = no images
 * Within each tier: followers DESC, then join date DESC.
 */
const getDirectoryUsers = async (req, res, next) => {
  try {
    const seeDebug = canSeeDebug(req.user)
    const { rows } = await query(
      `SELECT id, username, avatar_url, banner_url, bio, role,
              (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) AS followers_count
       FROM users
       WHERE ($1 OR role != 'Debug')
       ORDER BY
         CASE
           WHEN (avatar_url IS NOT NULL AND avatar_url <> '')
            AND (banner_url IS NOT NULL AND banner_url <> '') THEN 0
           WHEN (avatar_url IS NOT NULL AND avatar_url <> '')
             OR (banner_url IS NOT NULL AND banner_url <> '') THEN 1
           ELSE 2
         END ASC,
         (SELECT COUNT(*) FROM user_follows WHERE following_id = users.id) DESC,
         created_at DESC
       LIMIT 100`,
      [seeDebug]
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

// ── Game Accounts ──────────────────────────────────────────────────────────

/** GET /api/users/:id/game-accounts — public */
const getUserGameAccounts = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT game_id, uid, linked_at FROM user_game_accounts WHERE user_id = $1',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/users/me/game-accounts/:gameId — upsert UID */
const upsertGameAccount = async (req, res, next) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: 'uid is required.' });

    const { rows } = await query(
      `INSERT INTO user_game_accounts (user_id, game_id, uid)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, game_id) DO UPDATE SET uid = EXCLUDED.uid, linked_at = NOW()
       RETURNING game_id, uid, linked_at`,
      [req.user.id, req.params.gameId, uid]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/users/me/game-accounts/:gameId — unlink */
const removeGameAccount = async (req, res, next) => {
  try {
    await query(
      'DELETE FROM user_game_accounts WHERE user_id = $1 AND game_id = $2',
      [req.user.id, req.params.gameId]
    );
    res.json({ message: 'Game account unlinked.' });
  } catch (err) {
    next(err);
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function _getCounts(userId) {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*) FROM user_follows WHERE follower_id  = $1) AS following_count,
       (SELECT COUNT(*) FROM user_follows WHERE following_id = $1) AS followers_count`,
    [userId]
  );
  return rows[0];
}

const ASSIGNABLE_ROLES = ['Owner', 'Dev', 'VIP', 'Member', 'Regular', 'Debug'];

const assignRole = async (req, res, next) => {
  try {
    const actorRole = req.user.role;
    if (actorRole !== 'Owner' && actorRole !== 'Dev') {
      return res.status(403).json({ message: 'Only Owner or Dev can assign roles.' });
    }

    const { role } = req.body;
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    // Dev cannot assign Owner or Dev roles, and cannot touch users who are Owner/Dev
    if (actorRole === 'Dev') {
      if (role === 'Owner' || role === 'Dev') {
        return res.status(403).json({ message: 'Dev cannot assign Owner or Dev roles.' });
      }
      const { rows: target } = await query('SELECT role FROM users WHERE id = $1', [req.params.id]);
      if (target.length && (target[0].role === 'Owner' || target[0].role === 'Dev')) {
        return res.status(403).json({ message: 'Dev cannot modify Owner or Dev accounts.' });
      }
    }

    const { rows } = await query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role',
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUserProfile,
  getUserByUsername,
  searchUsers,
  getCommunityUsers,
  getDirectoryUsers,
  updateMe,
  getUserGames,
  addUserGame,
  removeUserGame,
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getUserGameAccounts,
  upsertGameAccount,
  removeGameAccount,
  assignRole,
};
