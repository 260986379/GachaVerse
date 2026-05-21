const { query } = require('../config/db');

const getAllGames = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM games ORDER BY name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

const getGameById = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM games WHERE id=$1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Game not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

const getCharactersByGameId = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM characters WHERE game_id=$1 ORDER BY rarity DESC, name',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllGames, getGameById, getCharactersByGameId };
