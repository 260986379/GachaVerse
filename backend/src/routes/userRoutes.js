const router = require('express').Router();
const { validate } = require('../middleware/validation');
const {
  getUserProfile,
  getUserByUsername,
  searchUsers,
  getCommunityUsers,
  getDirectoryUsers,
  updateMe, updateMeSchema,
  deleteMe,
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
  refreshGameAccount,
  removeGameAccount,
  assignRole,
} = require('../controllers/userController');
const { getNotes, upsertNote, deleteNote, getMyNote } = require('../controllers/profileNoteController');
const { getPublicFavVideos }    = require('../controllers/videoFavoriteController');
const { getPublicFavChars }     = require('../controllers/characterFavoriteController');
const { getPublicFavArtworks }  = require('../controllers/artworkFavoriteController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { anonymousCache } = require('../middleware/cacheControl');

// Community / Search / Directory
// Signed-out views are CDN-cached for 60s (#49); moderators see Debug accounts,
// so signed-in responses stay private.
router.get('/community',             anonymousCache(60), optionalAuth, getCommunityUsers);
router.get('/directory',             anonymousCache(60), optionalAuth, getDirectoryUsers);
router.get('/search',                anonymousCache(60), optionalAuth, searchUsers);

// Profile
router.get('/by-username/:username', optionalAuth, getUserByUsername);
router.get('/:id',                   optionalAuth, getUserProfile);
router.patch('/me',                  authenticateToken, validate(updateMeSchema), updateMe);
router.delete('/me',                 authenticateToken, deleteMe);

// Games
router.get('/:id/games',                           getUserGames);
router.post('/me/games',                           authenticateToken, addUserGame);
router.delete('/me/games/:id',                     authenticateToken, removeUserGame);

// Linked game accounts (UID)
router.get('/:id/game-accounts',                   getUserGameAccounts);
router.put('/me/game-accounts/:gameId',            authenticateToken, upsertGameAccount);
router.post('/me/game-accounts/:gameId/refresh',   authenticateToken, refreshGameAccount);
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
