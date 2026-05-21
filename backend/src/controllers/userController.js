const { query } = require('../config/db');

const getUserProfile = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, username, avatar_url, bio, created_at FROM users WHERE id=$1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const getUserGames = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT g.*, ug.is_featured, ug.personal_notes
       FROM games g
       JOIN user_games ug ON g.id = ug.game_id
       WHERE ug.user_id=$1`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const addUserGame = async (req, res, next) => {
  try {
    const { game_id, is_featured = false, personal_notes = null } = req.body;
    await query(
      'INSERT INTO user_games (user_id, game_id, is_featured, personal_notes) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      [req.user.id, game_id, is_featured, personal_notes]
    );
    res.status(201).json({ message: 'Game added to your list' });
  } catch (err) {
    next(err);
  }
};

const removeUserGame = async (req, res, next) => {
  try {
    await query('DELETE FROM user_games WHERE user_id=$1 AND game_id=$2', [req.user.id, req.params.id]);
    res.json({ message: 'Game removed from your list' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUserProfile, getUserGames, addUserGame, removeUserGame };
