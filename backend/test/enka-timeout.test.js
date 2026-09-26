// Stub global fetch before enkaService loads, so nothing leaves this process.
// Each call is recorded; `mode` decides how it behaves.
const calls = [];
let mode = 'ok';
const timeoutError = () => new DOMException('The operation was aborted due to timeout', 'TimeoutError');
const json = (body) => ({ ok: true, status: 200, json: async () => body });

global.fetch = async (url, opts = {}) => {
  calls.push({ url, opts });
  if (mode === 'timeout-request' && url.includes('enka.network')) throw timeoutError();
  if (mode === 'timeout-body' && url.includes('enka.network')) {
    return { ok: true, status: 200, json: async () => { throw timeoutError(); } };
  }
  if (mode === 'network' && url.includes('enka.network')) throw new TypeError('fetch failed');
  if (url.includes('enka.network')) {
    return json({ uid: '1300000001', region: 'na', ttl: 60, PlayerInfo: { SocialDetail: { ProfileDetail: { Nickname: 'T', Level: 1 } }, ShowcaseDetail: { AvatarList: [] } } });
  }
  return json({ en: {} }); // metadata files
};

const { fetchZZZPlayer } = require('../src/services/enkaService.js');

let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };
const attempt = async () => { try { return { data: await fetchZZZPlayer('1300000001') }; } catch (err) { return { err }; } };

(async () => {
  console.log('\n--- every outbound request is time-limited and identifies us ---');
  mode = 'ok';
  const r = await attempt();
  check('lookup succeeds', !!r.data && r.data.nickname === 'T', r.err?.message);
  check('metadata + player requests made', calls.length >= 2, calls.length);
  check('every request carries an AbortSignal', calls.every(c => c.opts.signal instanceof AbortSignal), calls.map(c => c.url).join(', '));
  check('User-Agent names the site and a URL', calls.every(c => /^MyGachaList\/\S+ \(\+https:\/\/mygachalist\.com\)$/.test(c.opts.headers?.['User-Agent'])),
        calls[0]?.opts.headers?.['User-Agent']);

  console.log('\n--- a timeout becomes a clear 504 ---');
  mode = 'timeout-request';
  let t = await attempt();
  check('request timeout -> status 504', t.err?.status === 504, t.err && `${t.err.status} ${t.err.message}`);
  check('  message tells the user to retry', /took too long/.test(t.err?.message || ''), t.err?.message);

  mode = 'timeout-body';
  t = await attempt();
  check('timeout while reading the body -> 504', t.err?.status === 504, t.err && `${t.err.status} ${t.err.message}`);

  console.log('\n--- other failures are not relabelled as timeouts ---');
  mode = 'network';
  t = await attempt();
  check('network error passes through unchanged', t.err instanceof TypeError && t.err.status === undefined, t.err && `${t.err.name} ${t.err.status}`);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
