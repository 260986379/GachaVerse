const { fetchZZZPlayer, fetchGenshinPlayer, fetchHSRPlayer } = require('./enkaService');
const playerGuard = require('./playerLookupGuard');

/**
 * Linked-account snapshots.
 *
 * When a user links a game account, the processed Enka profile is saved on
 * user_game_accounts.snapshot. Profile views read that stored copy and never
 * call Enka, so visitors cost Enka nothing and do not spend their own lookup
 * budget. Only the account owner can refresh it, at most once per
 * REFRESH_COOLDOWN_MS.
 *
 * Only games with an Enka endpoint get snapshots. Other games still store a
 * UID only; they will get their own account-info source.
 */
const SNAPSHOT_FETCHERS = {
  'zenless-zone-zero': fetchZZZPlayer,
  'genshin-impact':    fetchGenshinPlayer,
  'honkai-star-rail':  fetchHSRPlayer,
};

const UID_RE = /^\d{9,10}$/;
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;

const hasSnapshot = (gameId) => Object.prototype.hasOwnProperty.call(SNAPSHOT_FETCHERS, gameId);

/**
 * Fetch a profile for storing. A cache hit is free; a miss hits Enka and
 * spends the caller's lookup budget, exactly like GET /api/games/:id/player/:uid.
 * Returns { data } or { retryAfterSec } when the budget is spent.
 * Enka errors (404 UID not found, 424, 502) are thrown with err.status set.
 */
const fetchForStorage = async (gameId, uid, req) => {
  const cached = playerGuard.getCached(gameId, uid);
  if (cached) return { data: cached };

  const gate = playerGuard.consume(playerGuard.clientIp(req));
  if (!gate.allowed) return { retryAfterSec: gate.retryAfterSec };

  const data = await SNAPSHOT_FETCHERS[gameId](uid);
  playerGuard.setCached(gameId, uid, data);
  return { data };
};

module.exports = { SNAPSHOT_FETCHERS, UID_RE, REFRESH_COOLDOWN_MS, hasSnapshot, fetchForStorage };
