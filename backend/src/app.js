const express = require('express');
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

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

app.use(errorHandler);

module.exports = app;
