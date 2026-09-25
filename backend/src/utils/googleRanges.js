/**
 * Membership test against Google's published IP ranges.
 *
 * Used to tell apart the two ways a request can reach this service:
 *   - through Firebase Hosting's edge (every real user), or
 *   - directly to the Cloud Run URL (which bypasses Firebase entirely).
 *
 * See utils/clientIp.js for why that distinction matters.
 *
 * The list is small (~145 prefixes) and published by Google at a stable URL.
 * It is fetched once at startup and refreshed daily; failures are non-fatal and
 * leave the previous answer in place (see `isGoogleIp` returning null).
 */

const RANGES_URL = 'https://www.gstatic.com/ipranges/goog.json';
const REFRESH_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

let v4 = [];        // [{ net: uint32, mask: uint32 }]
let v6 = [];        // [{ net: BigInt, mask: BigInt }]
let loadedAt = 0;
let inFlight = null;

// ---- address parsing -------------------------------------------------------

const ipv4ToInt = (s) => {
  const parts = s.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const o = Number(p);
    if (o > 255) return null;
    n = ((n << 8) >>> 0) + o;
  }
  return n >>> 0;
};

const ipv6ToBigInt = (s) => {
  let str = s;
  // An IPv4-mapped address (::ffff:1.2.3.4) keeps its trailing dotted quad.
  const v4tail = str.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4tail) {
    const n = ipv4ToInt(v4tail[1]);
    if (n === null) return null;
    const hi = (n >>> 16).toString(16);
    const lo = (n & 0xffff).toString(16);
    str = str.slice(0, -v4tail[1].length) + hi + ':' + lo;
  }
  const halves = str.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':').filter(Boolean) : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':').filter(Boolean) : [];
  const fill = 8 - head.length - tail.length;
  if (halves.length === 1 && head.length !== 8) return null;
  if (fill < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? fill : 0).fill('0'), ...tail];
  if (groups.length !== 8) return null;
  let n = 0n;
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    n = (n << 16n) + BigInt(parseInt(g, 16));
  }
  return n;
};

/** Strips a zone/port and normalises ::ffff: mapped form to plain IPv4. */
const normalise = (raw) => {
  if (typeof raw !== 'string') return '';
  let ip = raw.trim().replace(/%.*$/, '');
  if (ip.startsWith('[')) ip = ip.slice(1, ip.indexOf(']') > 0 ? ip.indexOf(']') : undefined);
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  return mapped ? mapped[1] : ip;
};

// ---- range loading ---------------------------------------------------------

const parsePrefixes = (prefixes) => {
  const nv4 = [];
  const nv6 = [];
  for (const p of prefixes || []) {
    if (p.ipv4Prefix) {
      const [net, bitsStr] = p.ipv4Prefix.split('/');
      const bits = Number(bitsStr);
      const n = ipv4ToInt(net);
      if (n === null || !(bits >= 0 && bits <= 32)) continue;
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      nv4.push({ net: (n & mask) >>> 0, mask });
    } else if (p.ipv6Prefix) {
      const [net, bitsStr] = p.ipv6Prefix.split('/');
      const bits = Number(bitsStr);
      const n = ipv6ToBigInt(net);
      if (n === null || !(bits >= 0 && bits <= 128)) continue;
      const mask = bits === 0 ? 0n : ((1n << BigInt(bits)) - 1n) << BigInt(128 - bits);
      nv6.push({ net: n & mask, mask });
    }
  }
  return { nv4, nv6 };
};

const refresh = async () => {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(RANGES_URL, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const { nv4, nv6 } = parsePrefixes(json.prefixes);
      if (!nv4.length && !nv6.length) throw new Error('no prefixes parsed');
      v4 = nv4; v6 = nv6; loadedAt = Date.now();
      console.log(`[GoogleRanges] Loaded ${nv4.length} IPv4 + ${nv6.length} IPv6 prefixes.`);
    } catch (err) {
      // Non-fatal: keep whatever was loaded before. clientIp falls back safely.
      console.error('[GoogleRanges] Refresh failed:', err.message);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
};

const isLoaded = () => v4.length > 0 || v6.length > 0;

/**
 * true / false when the ranges are available, null when they are not yet
 * loaded — callers must decide what an unknown answer means for them.
 */
const isGoogleIp = (raw) => {
  if (!isLoaded()) {
    if (Date.now() - loadedAt > REFRESH_MS) refresh();
    return null;
  }
  if (Date.now() - loadedAt > REFRESH_MS) refresh(); // stale-while-revalidate
  const ip = normalise(raw);
  if (!ip) return false;
  const n4 = ipv4ToInt(ip);
  if (n4 !== null) return v4.some(({ net, mask }) => ((n4 & mask) >>> 0) === net);
  const n6 = ipv6ToBigInt(ip);
  if (n6 === null) return false;
  return v6.some(({ net, mask }) => (n6 & mask) === net);
};

module.exports = { isGoogleIp, refresh, isLoaded, _internals: { ipv4ToInt, ipv6ToBigInt, normalise, parsePrefixes } };
