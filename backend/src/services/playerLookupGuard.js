/**
 * Cache + rate limiting for the Enka player lookup.
 *
 * Enka is a free third-party API with no contract; hammering it gets our
 * server's IP banned. Two layers protect it:
 *
 *   1. A per-UID response cache honouring the `ttl` Enka returns. Repeat views
 *      of a profile never leave our process.
 *   2. A per-client-IP limiter of one *outbound Enka call* per 120s. Cache hits
 *      are free, so normal browsing (the Account page auto-loads a linked UID
 *      on every visit) is unaffected; only genuinely new lookups spend budget.
 *
 * Both maps are per-instance and in-memory, matching the metadata caches in
 * enkaService.js. Cloud Run may run several instances, so the effective limit
 * is (1 per 120s) x (instance count) — still a hard ceiling, and this service
 * runs at min-instances=0 with low traffic.
 */

const WINDOW_MS = 120 * 1000; // one Enka call per client per 2 minutes

// Enka's ttl is a hint, not a guarantee — clamp it so a bad value can't pin an
// entry forever or make the cache useless.
const DEFAULT_TTL_MS = 60 * 1000; // HSR responses carry no ttl
const MIN_TTL_MS     = 10 * 1000;
const MAX_TTL_MS     = 10 * 60 * 1000;

// Ceilings so a UID-scanning bot cannot grow either map without bound.
const MAX_CACHE_ENTRIES = 5000;
const MAX_CLIENT_ENTRIES = 10000;

const cache   = new Map(); // "game:uid" -> { data, expiresAt }
const clients = new Map(); // ip -> timestamp of last allowed Enka call

// Client IP resolution is shared with the global limiter; see utils/clientIp.
const { clientIp } = require('../utils/clientIp');

const prune = (map, now) => {
  for (const [k, v] of map) {
    const dead = typeof v === 'number' ? now - v >= WINDOW_MS : v.expiresAt <= now;
    if (dead) map.delete(k);
  }
};

/** Cached profile for this game+uid, or null. */
const getCached = (gameId, uid, now = Date.now()) => {
  const hit = cache.get(`${gameId}:${uid}`);
  if (!hit) return null;
  if (hit.expiresAt <= now) { cache.delete(`${gameId}:${uid}`); return null; }
  return hit.data;
};

/** Store a profile, honouring Enka's ttl (seconds) when present. */
const setCached = (gameId, uid, data, now = Date.now()) => {
  const fromEnka = Number(data?.ttl);
  const ttlMs = Number.isFinite(fromEnka) && fromEnka > 0
    ? Math.min(Math.max(fromEnka * 1000, MIN_TTL_MS), MAX_TTL_MS)
    : DEFAULT_TTL_MS;

  if (cache.size >= MAX_CACHE_ENTRIES) {
    prune(cache, now);
    // Still full of live entries — drop the oldest inserted (Map keeps order).
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  }
  cache.set(`${gameId}:${uid}`, { data, expiresAt: now + ttlMs });
  return ttlMs;
};

/**
 * Spend this client's budget for one outbound Enka call.
 * Call ONLY on a cache miss, immediately before fetching.
 * Returns { allowed } or { allowed: false, retryAfterSec }.
 */
const consume = (ip, now = Date.now()) => {
  const last = clients.get(ip);
  if (last !== undefined && now - last < WINDOW_MS) {
    return { allowed: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - last)) / 1000) };
  }
  if (clients.size >= MAX_CLIENT_ENTRIES) prune(clients, now);
  clients.set(ip, now);
  return { allowed: true };
};

// Test-only.
const _reset = () => { cache.clear(); clients.clear(); };

module.exports = { clientIp, getCached, setCached, consume, _reset, WINDOW_MS, DEFAULT_TTL_MS };
