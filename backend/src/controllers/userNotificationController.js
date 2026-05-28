const { query } = require('../config/db');

/**
 * Shared helper — called by other controllers to insert a personal notification.
 * Fire-and-forget safe: callers should .catch(() => {}) so errors don't break the parent request.
 */
const createUserNotification = async (actorId, recipientId, type) => {
  if (actorId === recipientId) return; // never notify yourself
  await query(
    `INSERT INTO user_notifications (actor_id, recipient_id, type)
     VALUES ($1, $2, $3)`,
    [actorId, recipientId, type]
  );
};

/** GET /api/user-notifications — auth required */
const getUserNotifications = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT un.id, un.type, un.read, un.created_at,
              u.id          AS actor_id,
              u.username    AS actor_username,
              u.avatar_url  AS actor_avatar,
              u.role        AS actor_role
       FROM   user_notifications un
       JOIN   users u ON u.id = un.actor_id
       WHERE  un.recipient_id = $1
       ORDER  BY un.created_at DESC
       LIMIT  40`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/** POST /api/user-notifications/read-all — auth required */
const markAllRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE user_notifications SET read = TRUE WHERE recipient_id = $1 AND read = FALSE',
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUserNotifications, markAllRead, createUserNotification };
