require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://gachauser:gachapass@localhost:5432/gachaverse_db',
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_secret_in_production',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Twitter/X API (v2 Bearer Token)
  TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN || 'PLACEHOLDER_TWITTER_BEARER_TOKEN',
  ZZZ_TWITTER_HANDLE: process.env.ZZZ_TWITTER_HANDLE || 'ZenlessZoneZero',
  NIKKE_TWITTER_HANDLE: process.env.NIKKE_TWITTER_HANDLE || 'NIKKE_en',

  // YouTube Data API v3
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || 'PLACEHOLDER_YOUTUBE_API_KEY',
  // To find a channel ID: once API key is set, call:
  // GET https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=ZZZ_JP&key=YOUR_KEY
  ZZZ_YOUTUBE_CHANNEL_ID: process.env.ZZZ_YOUTUBE_CHANNEL_ID || 'PLACEHOLDER_ZZZ_CHANNEL_ID',
  NIKKE_YOUTUBE_CHANNEL_ID: process.env.NIKKE_YOUTUBE_CHANNEL_ID || 'UCmmgZwsqQRD6PKeo87uq1bA',
  GENSHIN_YOUTUBE_CHANNEL_ID: process.env.GENSHIN_YOUTUBE_CHANNEL_ID || 'UCiS882YPwZt1NfaM0gR0D9Q',
  WW_YOUTUBE_CHANNEL_ID: process.env.WW_YOUTUBE_CHANNEL_ID || 'UC0Bi5KMcECRVYis5Gb_ZYZQ',
  HSR_YOUTUBE_CHANNEL_ID: process.env.HSR_YOUTUBE_CHANNEL_ID || 'UC2PeMPA8PAOp-bynLoCeMLA',
};
