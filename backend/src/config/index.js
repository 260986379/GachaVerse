require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://gachauser:gachapass@localhost:5432/gachaverse_db',
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_secret_in_production',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
