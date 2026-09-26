// Network isolation: googleRanges.refresh() would otherwise fetch gstatic.com.
require('./helpers/stub-google-ranges').install();
const path = require('path');
const BE = require('path').join(__dirname, '..', 'src');
const gr = require(path.join(BE, 'utils/googleRanges.js'));
const { clientIp } = require(path.join(BE, 'utils/clientIp.js'));

let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  got: ' + e : '')); } };
const req = (xff, sock) => ({ headers: xff === undefined ? {} : { 'x-forwarded-for': xff }, socket: { remoteAddress: sock || '::ffff:169.254.169.126' } });

(async () => {
  console.log('\n--- before ranges load: falls back to first hop (availability over strictness) ---');
  check('unloaded -> first hop', clientIp(req('203.0.113.9, 66.102.8.167')) === '203.0.113.9');
  check('isGoogleIp -> null when unloaded', gr.isGoogleIp('66.102.8.167') === null);

  await gr.refresh();
  check('ranges loaded', gr.isLoaded() === true);

  console.log('\n--- range membership ---');
  check('66.102.8.167 is Google (observed edge)', gr.isGoogleIp('66.102.8.167') === true);
  check('8.8.8.8 is Google',                      gr.isGoogleIp('8.8.8.8') === true);
  check('184.148.216.20 is NOT Google (real ISP)',gr.isGoogleIp('184.148.216.20') === false);
  check('203.0.113.9 is NOT Google',              gr.isGoogleIp('203.0.113.9') === false);
  check('10.5.5.9 is NOT Google',                 gr.isGoogleIp('10.5.5.9') === false);
  check('::ffff:8.8.8.8 mapped form',             gr.isGoogleIp('::ffff:8.8.8.8') === true);
  check('garbage -> false',                       gr.isGoogleIp('not-an-ip') === false);
  check('empty -> false',                         gr.isGoogleIp('') === false);

  console.log('\n--- FIREBASE PATH: real users keep individual buckets ---');
  check('[user, googleEdge] -> user',    clientIp(req('203.0.113.9, 66.102.8.167')) === '203.0.113.9');
  check('[user] only            -> user',clientIp(req('203.0.113.9')) === '203.0.113.9', clientIp(req('203.0.113.9')));
  check('two different users differ',
    clientIp(req('198.51.100.1, 66.102.8.167')) !== clientIp(req('198.51.100.2, 66.102.8.167')));
  check('multi Google hops -> user',     clientIp(req('203.0.113.9, 66.102.8.167, 8.8.8.8')) === '203.0.113.9');

  console.log('\n--- DIRECT PATH: the bypass measured in production is closed ---');
  // Production: direct + forged gave hops ["10.5.5.9","184.148.216.20"]
  check('forged first hop ignored -> real peer',
    clientIp(req('10.5.5.9, 184.148.216.20')) === '184.148.216.20', clientIp(req('10.5.5.9, 184.148.216.20')));
  check('rotating forged values cannot change the key',
    clientIp(req('10.5.5.1, 184.148.216.20')) === clientIp(req('10.5.5.2, 184.148.216.20')));
  check('direct, no forgery -> real peer', clientIp(req('184.148.216.20')) === '184.148.216.20');
  check('forging a Google IP first still ignored',
    clientIp(req('66.102.8.167, 184.148.216.20')) === '184.148.216.20');
  check('forging many hops still ignored',
    clientIp(req('1.1.1.1, 2.2.2.2, 8.8.8.8, 184.148.216.20')) === '184.148.216.20');

  console.log('\n--- fallbacks ---');
  check('no XFF -> socket', clientIp(req(undefined, '203.0.113.50')) === '203.0.113.50');
  check('empty XFF -> socket', clientIp(req('', '203.0.113.50')) === '203.0.113.50');
  check('whitespace tolerated', clientIp(req('  203.0.113.9 , 66.102.8.167 ')) === '203.0.113.9');

  console.log('\n--- IPv6 ---');
  check('ipv6 user behind google edge', clientIp(req('2001:db8::1, 66.102.8.167')) === '2001:db8::1');
  check('ipv6 direct -> last hop', clientIp(req('10.5.5.9, 2001:db8::99')) === '2001:db8::99');

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
