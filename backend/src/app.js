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

const app = express();

app.use(corsMiddleware);
app.use(express.json());
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

app.post('/api/admin/backfill', async (req, res) => {
  const { ingestVideosForGame } = require('./services/youtubeIngestionService');
  const { reclassifyExistingVideos } = require('./services/youtubeIngestionService');
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

app.use(errorHandler);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

module.exports = app;
