/**
 * Cache + rate limiting for outbound Enka calls.
 *
 * Enka is a free third-party API with no contract; hammering it gets our
 * server's IP banned, and then account linking breaks for everyone. Enka is
 * only called when an account is linked or its owner presses Refresh (profile
 * views read the snapshot stored on user_game_accounts). Three layers:
 *
 *   1. A per-UID response cache honouring the `ttl` Enka returns, so linking
 *      and refreshing the same UID in quick succession costs one call.
 *   2. A per-client-IP limit of one outbound Enka call per 120s, so one
 *      visitor cannot spend the budget below.
 *   3. A global ceiling on outbound calls (GLOBAL_MAX per GLOBAL_WINDOW_MS),
 *      so the total Enka sees from our address stays bounded however many
 *      clients there are. Checked first; while it is exhausted, nobody's
 *      per-client budget is spent.
 *
 * All state is per-instance and in-memory. Cloud Run runs up to 10 instances
 * (maxScale), so the fleet-wide ceiling is up to 10x the per-instance numbers:
 * GLOBAL_MAX is sized per instance with that multiplier in mind. Enka does not
 * publish a tolerated rate, so it is a conservative guess to revise, not a
 * known limit.
 */

const WINDOW_MS = 120 * 1000; // one Enka call per client per 2 minutes

// Per instance: 6/min here is at most 60/min (1 req/s) across 10 instances.
const GLOBAL_WINDOW_MS = 60 * 1000;
const GLOBAL_MAX = Math.max(1, Number(process.env.ENKA_GLOBAL_MAX_PER_MIN) || 6);

// Enka's ttl is a hint, not a guarantee — clamp it so a bad value can't pin an
// entry forever or make the cache useless.
const DEFAULT_TTL_MS = 60 * 1000; // HSR responses carry no ttl
const MIN_TTL_MS     = 10 * 1000;
const MAX_TTL_MS     = 10 * 60 * 1000;

// Ceilings so a UID-scanning bot cannot grow either map without bound.
//
// The cache is bounded primarily by BYTES, not entry count. The container runs
// with 512Mi and serves up to 80 concurrent requests, and a cached profile is a
// whole showcase (agents/characters, each with weapon, stats and image URLs) —
// its size varies enough that an entry count is a poor proxy for memory. A
// byte budget bounds the worst case directly. MAX_CACHE_ENTRIES remains as a
// secondary guard against many tiny entries.
const MAX_CACHE_BYTES = 16 * 1024 * 1024; // ~3% of the 512Mi container
const MAX_CACHE_ENTRIES = 1000;
const MAX_CLIENT_ENTRIES = 10000;

const cache   = new Map(); // "game:uid" -> { data, expiresAt, bytes }
const clients = new Map(); // ip -> timestamp of last allowed Enka call
let outbound  = [];        // timestamps of allowed Enka calls in the global window, oldest first
let cacheBytes = 0;        // running total of the cache's approximate footprint

// Client IP resolution is shared with the global limiter; see utils/clientIp.
const { clientIp } = require('../utils/clientIp');

// Drops one cache entry and keeps the byte total in step. Every removal from
// `cache` must go through here, or the total drifts and the budget stops working.
const dropCached = (key) => {
  const hit = cache.get(key);
  if (!hit) return;
  cacheBytes -= hit.bytes;
  cache.delete(key);
};

const pruneCache = (now) => {
  for (const [k, v] of cache) if (v.expiresAt <= now) dropCached(k);
};

const pruneClients = (now) => {
  for (const [k, ts] of clients) if (now - ts >= WINDOW_MS) clients.delete(k);
};

// Approximate resident cost of a cached profile. JSON length is a proxy, not a
// true heap measurement — good enough to bound the worst case, and cheap.
const approxBytes = (data) => {
  try { return JSON.stringify(data).length; } catch { return 0; }
};

/** Cached profile for this game+uid, or null. */
const getCached = (gameId, uid, now = Date.now()) => {
  const hit = cache.get(`${gameId}:${uid}`);
  if (!hit) return null;
  if (hit.expiresAt <= now) { dropCached(`${gameId}:${uid}`); return null; }
  return hit.data;
};

/** Store a profile, honouring Enka's ttl (seconds) when present. */
const setCached = (gameId, uid, data, now = Date.now()) => {
  const fromEnka = Number(data?.ttl);
  const ttlMs = Number.isFinite(fromEnka) && fromEnka > 0
    ? Math.min(Math.max(fromEnka * 1000, MIN_TTL_MS), MAX_TTL_MS)
    : DEFAULT_TTL_MS;

  const key = `${gameId}:${uid}`;
  const bytes = approxBytes(data);

  // Replacing an existing entry: remove the old cost first.
  dropCached(key);
  cache.set(key, { data, expiresAt: now + ttlMs, bytes });
  cacheBytes += bytes;

  // Expired entries are free to reclaim, so try those before evicting live ones.
  if (cacheBytes > MAX_CACHE_BYTES || cache.size > MAX_CACHE_ENTRIES) pruneCache(now);

  // Still over budget — evict oldest-inserted first (Map preserves order), never
  // the entry just written.
  while ((cacheBytes > MAX_CACHE_BYTES || cache.size > MAX_CACHE_ENTRIES) && cache.size > 1) {
    const oldest = cache.keys().next().value;
    if (oldest === key) break;
    dropCached(oldest);
  }

  return ttlMs;
};

/**
 * Spend budget for one outbound Enka call: the global ceiling and this client's.
 * Call ONLY on a cache miss, immediately before fetching.
 * Returns { allowed: true } or { allowed: false, reason, retryAfterSec }, where
 * reason is 'global' (Enka needs to cool down) or 'client' (this caller's limit).
 */
const consume = (ip, now = Date.now()) => {
  outbound = outbound.filter((ts) => now - ts < GLOBAL_WINDOW_MS);
  if (outbound.length >= GLOBAL_MAX) {
    return {
      allowed: false,
      reason: 'global',
      retryAfterSec: Math.max(1, Math.ceil((outbound[0] + GLOBAL_WINDOW_MS - now) / 1000)),
    };
  }

  const last = clients.get(ip);
  if (last !== undefined && now - last < WINDOW_MS) {
    return { allowed: false, reason: 'client', retryAfterSec: Math.ceil((WINDOW_MS - (now - last)) / 1000) };
  }
  if (clients.size >= MAX_CLIENT_ENTRIES) pruneClients(now);
  clients.set(ip, now);
  outbound.push(now);
  return { allowed: true };
};

// Test-only.
const _reset = () => { cache.clear(); clients.clear(); outbound = []; cacheBytes = 0; };

const _stats = () => ({ entries: cache.size, bytes: cacheBytes, clients: clients.size });

module.exports = { clientIp, getCached, setCached, consume, _reset, _stats, WINDOW_MS, GLOBAL_WINDOW_MS, GLOBAL_MAX, DEFAULT_TTL_MS, MAX_CACHE_BYTES, MAX_CACHE_ENTRIES };
