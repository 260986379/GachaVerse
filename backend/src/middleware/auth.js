const { admin } = require('../config/firebase');

/**
 * Verifies a Firebase ID token sent as "Authorization: Bearer <token>".
 * On success, attaches req.user = { id, firebase_uid, username, email }.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    // decoded contains: uid, email, name, picture, email_verified, etc.

    // Look up our internal user row by firebase_uid
    const { query } = require('../config/db');
    const { rows } = await query(
      'SELECT id, username, email, avatar_url, bio, role FROM users WHERE firebase_uid = $1',
      [decoded.uid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found — please sync your account first via POST /api/auth/sync' });
    }

    req.user = { ...rows[0], firebase_uid: decoded.uid };
    next();
  } catch (err) {
    console.error('[Auth] Token verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Same as authenticateToken but does NOT 404 if the user row is missing.
 * Used by the /sync endpoint itself.
 */
const authenticateFirebase = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded; // { uid, email, name, picture }
    next();
  } catch (err) {
    console.error('[Auth] Firebase token verification failed:', err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Like authenticateToken but never rejects.
 * If a valid token is present → req.user is populated.
 * If missing or invalid      → req.user = null and continues.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const { query } = require('../config/db');
    const { rows } = await query(
      'SELECT id, username, email, avatar_url, bio, role FROM users WHERE firebase_uid = $1',
      [decoded.uid]
    );
    req.user = rows[0] || null;
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authenticateToken, authenticateFirebase, optionalAuth };
