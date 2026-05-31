const express = require('express');
const path = require('path');
const morgan = require('morgan');
const corsMiddleware = require('./middleware/cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');
const boardRoutes     = require('./routes/boardRoutes');
const videoRoutes     = require('./routes/videoRoutes');
const characterRoutes     = require('./routes/characterRoutes');
const artworkRoutes       = require('./routes/artworkRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const reviewRoutes        = require('./routes/reviewRoutes');
const reportRoutes        = require('./routes/reportRoutes');

const app = express();

app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/api/hello', (req, res) => res.json({ message: 'Hello from GachaVerse Backend!' }));

app.post('/api/admin/seed-characters', async (req, res) => {
  res.json({ message: 'Character seed started in background' });
  try {
    const { seedZZZCharacters } = require('../scripts/seedZZZCharacters');
    await seedZZZCharacters();
    console.log('[Admin] Character seed complete.');
  } catch (err) {
    console.error('[Admin] Character seed error:', err.message);
  }
});

app.post('/api/admin/seed-lore', async (req, res) => {
  res.json({ message: 'Lore seed started in background' });
  try {
    const { seedLoreVideos } = require('../scripts/seedLoreVideos');
    await seedLoreVideos();
    console.log('[Admin] Lore seed complete.');
  } catch (err) {
    console.error('[Admin] Lore seed error:', err.message);
  }
});

app.post('/api/admin/seed-images', async (req, res) => {
  res.json({ message: 'Image seed started in background' });
  try {
    const { updateZZZImages } = require('../scripts/updateZZZImages');
    await updateZZZImages();
    console.log('[Admin] Image seed complete.');
  } catch (err) {
    console.error('[Admin] Image seed error:', err.message);
  }
});

app.post('/api/admin/migrate-reviews', async (req, res) => {
  const { query } = require('./config/db');
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS game_reviews (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_id    VARCHAR(100) NOT NULL,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating     SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 10),
        body       TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (game_id, user_id)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_game_reviews_game ON game_reviews(game_id, created_at DESC)`);
    await query(`
      CREATE TABLE IF NOT EXISTS review_upvotes (
        review_id UUID NOT NULL REFERENCES game_reviews(id) ON DELETE CASCADE,
        user_id   UUID NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
        PRIMARY KEY (review_id, user_id)
      )
    `);
    const { rows } = await query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name IN ('game_reviews','review_upvotes')
    `);
    res.json({ ok: true, tables: rows.map(r => r.table_name) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/backfill', async (req, res) => {
  const { ingestVideosForGame, reclassifyExistingVideos } = require('./services/youtubeIngestionService');
  const config = require('./config');
  res.json({ message: 'Backfill started in background' });
  try {
    await ingestVideosForGame('zenless-zone-zero', config.ZZZ_YOUTUBE_CHANNEL_ID, { forceBackfill: true });
    await ingestVideosForGame('nikke', config.NIKKE_YOUTUBE_CHANNEL_ID, { forceBackfill: true });
    await reclassifyExistingVideos('zenless-zone-zero');
    await reclassifyExistingVideos('nikke');
    console.log('[Admin] Force backfill complete.');
  } catch (err) {
    console.error('[Admin] Backfill error:', err.message);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/boards',     boardRoutes);
app.use('/api/videos',     videoRoutes);
app.use('/api/characters',    characterRoutes);
app.use('/api/artworks',      artworkRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/reports',       reportRoutes);

app.use(errorHandler);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

module.exports = app;
