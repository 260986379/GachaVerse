const router = require('express').Router();
const {
  getUserProfile,
  getUserByUsername,
  searchUsers,
  getCommunityUsers,
  getDirectoryUsers,
  updateMe,
  getUserGames,
  addUserGame,
  removeUserGame,
  followUser,
  unfollowUser,
  getFollowStatus,
  getFollowers,
  getFollowing,
  getUserGameAccounts,
  upsertGameAccount,
  removeGameAccount,
  assignRole,
} = require('../controllers/userController');
const { getNotes, upsertNote, deleteNote, getMyNote } = require('../controllers/profileNoteController');
const { getPublicFavVideos }    = require('../controllers/videoFavoriteController');
const { getPublicFavChars }     = require('../controllers/characterFavoriteController');
const { getPublicFavArtworks }  = require('../controllers/artworkFavoriteController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Community / Search / Directory
router.get('/community',             optionalAuth, getCommunityUsers);
router.get('/directory',             optionalAuth, getDirectoryUsers);
router.get('/search',                optionalAuth, searchUsers);

// Profile
router.get('/by-username/:username', optionalAuth, getUserByUsername);
router.get('/:id',                   optionalAuth, getUserProfile);
router.patch('/me',                  authenticateToken, updateMe);

// Games
router.get('/:id/games',                           getUserGames);
router.post('/me/games',                           authenticateToken, addUserGame);
router.delete('/me/games/:id',                     authenticateToken, removeUserGame);

// Linked game accounts (UID)
router.get('/:id/game-accounts',                   getUserGameAccounts);
router.put('/me/game-accounts/:gameId',            authenticateToken, upsertGameAccount);
router.delete('/me/game-accounts/:gameId',         authenticateToken, removeGameAccount);

// Follows
router.get('/:id/followers',         optionalAuth, getFollowers);
router.get('/:id/following',         optionalAuth, getFollowing);
router.get('/:id/follow-status',     authenticateToken, getFollowStatus);
router.post('/:id/follow',           authenticateToken, followUser);
router.delete('/:id/follow',         authenticateToken, unfollowUser);

// Public favorites (viewed on other users' profiles)
router.get('/:id/favorites/videos',     getPublicFavVideos);
router.get('/:id/favorites/characters', getPublicFavChars);
router.get('/:id/favorites/artworks',   getPublicFavArtworks);

// Role assignment (Owner / Dev only)
router.patch('/:id/role', authenticateToken, assignRole);

// Profile notes
router.get('/:id/notes',             getNotes);
router.get('/:id/notes/mine',        authenticateToken, getMyNote);
router.post('/:id/notes',            authenticateToken, upsertNote);
router.delete('/:id/notes/:noteId',  authenticateToken, deleteNote);

module.exports = router;
