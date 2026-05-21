const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({ connectionString: config.DATABASE_URL });

const query = (text, params) => pool.query(text, params);

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('PostgreSQL connected successfully');
    client.release();
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
  }
};

module.exports = { pool, query, testConnection };
