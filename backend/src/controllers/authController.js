const Joi = require('joi');
const { query } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existing = await query('SELECT id FROM users WHERE email=$1 OR username=$2', [email, username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email or username already in use' });
    }

    const password_hash = await hashPassword(password);
    const { rows } = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id, username, email, created_at',
      [username, email, password_hash]
    );

    const user = rows[0];
    const token = generateToken({ id: user.id, username: user.username, email: user.email });
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query('SELECT * FROM users WHERE email=$1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken({ id: user.id, username: user.username, email: user.email });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatar_url: user.avatar_url } });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, username, email, avatar_url, bio, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = { registerUser, loginUser, getMe, registerSchema, loginSchema };
