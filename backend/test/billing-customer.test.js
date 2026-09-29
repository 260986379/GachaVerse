// Billing: a saved Stripe customer id that Stripe no longer has (deleted in the
// dashboard, or created with a key from the other mode) must not break checkout
// or the portal. Checkout replaces it with a new customer; the portal unlinks it.
process.env.RATE_LIMIT_MAX = '10000';
process.env.STRIPE_SECRET_KEY = 'sk_test_x';
process.env.STRIPE_PRICE_MONTHLY = 'price_monthly';
process.env.STRIPE_PRICE_YEARLY = 'price_yearly';
const path = require('path'), http = require('http');
const BE = path.join(__dirname, '..', 'src');

const caller = { id: 'u1', username: 'alice', email: 'a@x', avatar_url: null, bio: null, role: 'Regular', subscription_status: null };

// Stub the DB: one user row whose stripe_customer_id the billing code reads and writes.
let savedCustomer = null;
const dbPath = require.resolve(path.join(BE, 'config/db.js'));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true,
  exports: {
    query: async (sql, params = []) => {
      if (/FROM users WHERE firebase_uid/i.test(sql)) return { rows: [caller] };
      if (/^SELECT stripe_customer_id FROM users WHERE id/i.test(sql.trim())) return { rows: [{ stripe_customer_id: savedCustomer }] };
      if (/SET stripe_customer_id = NULL/i.test(sql)) {
        if (savedCustomer === params[1]) { savedCustomer = null; return { rowCount: 1, rows: [] }; }
        return { rowCount: 0, rows: [] };
      }
      if (/SET stripe_customer_id = \$1 WHERE id = \$2 AND stripe_customer_id IS NULL/i.test(sql)) {
        if (savedCustomer === null) { savedCustomer = params[0]; return { rowCount: 1, rows: [] }; }
        return { rowCount: 0, rows: [] };
      }
      return { rows: [], rowCount: 0 };
    },
    pool: { connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }) },
  } };

// Stub Firebase: any bearer token verifies.
const fbPath = require.resolve(path.join(BE, 'config/firebase.js'));
require.cache[fbPath] = { id: fbPath, filename: fbPath, loaded: true,
  exports: { admin: { auth: () => ({ verifyIdToken: async () => ({ uid: 'fb-alice' }) }) } } };

// Stub Stripe: `existing` holds the customers Stripe knows under the current key.
const missing = (param) => Object.assign(new Error('No such customer'), { code: 'resource_missing', param });
let existing = new Set(), deletedCustomers = new Set(), created = [], checkoutCustomer = null, retrieveError = null;
const stripePath = require.resolve('stripe', { paths: [path.join(__dirname, '..')] });
require.cache[stripePath] = { id: stripePath, filename: stripePath, loaded: true,
  exports: function Stripe() {
    return {
      customers: {
        retrieve: async (id) => {
          if (retrieveError) throw retrieveError;
          if (deletedCustomers.has(id)) return { id, deleted: true };
          if (!existing.has(id)) throw missing('id');
          return { id };
        },
        create: async () => { const id = 'cus_new' + (created.length + 1); existing.add(id); created.push(id); return { id }; },
      },
      checkout: { sessions: { create: async (p) => { checkoutCustomer = p.customer; return { url: 'https://checkout.test/s' }; } } },
      billingPortal: { sessions: { create: async (p) => {
        if (!existing.has(p.customer)) throw missing('customer');
        return { url: 'https://portal.test/s' };
      } } },
    };
  } };

const app = require(path.join(BE, 'app.js'));
let pass = 0, fail = 0;
const check = (n, c, e) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '\n        got: ' + e : '')); } };

const server = app.listen(0, async () => {
  const port = server.address().port;
  const post = (p, body) => new Promise(resolve => {
    const data = JSON.stringify(body || {});
    const r = http.request({ port, method: 'POST', path: p, headers: {
      'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: 'Bearer tok',
    } }, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: (() => { try { return JSON.parse(b); } catch { return b; } })() })); });
    r.write(data); r.end();
  });
  const reset = (saved, known = []) => {
    savedCustomer = saved; existing = new Set(known); deletedCustomers = new Set();
    created = []; checkoutCustomer = null; retrieveError = null;
  };

  console.log('\n--- checkout: first time creates a customer ---');
  reset(null);
  let r = await post('/api/billing/checkout', { plan: 'monthly' });
  check('200 with a Checkout URL', r.status === 200 && r.body.url === 'https://checkout.test/s', JSON.stringify(r));
  check('one customer created', created.length === 1, created.join(','));
  check('and saved on the user', savedCustomer === 'cus_new1', savedCustomer);
  check('checkout uses it', checkoutCustomer === 'cus_new1', checkoutCustomer);

  console.log('\n--- checkout: a valid saved customer is reused ---');
  reset('cus_ok', ['cus_ok']);
  r = await post('/api/billing/checkout', { plan: 'yearly' });
  check('200', r.status === 200, r.status);
  check('no new customer', created.length === 0, created.join(','));
  check('checkout uses the saved one', checkoutCustomer === 'cus_ok', checkoutCustomer);

  console.log('\n--- checkout: saved customer from the other mode (test id, live key) ---');
  reset('cus_testmode');
  r = await post('/api/billing/checkout', { plan: 'monthly' });
  check('200 instead of 500', r.status === 200, JSON.stringify(r));
  check('a new customer is created', created.length === 1, created.join(','));
  check('the stale id is replaced', savedCustomer === 'cus_new1', savedCustomer);
  check('checkout uses the new one', checkoutCustomer === 'cus_new1', checkoutCustomer);

  console.log('\n--- checkout: saved customer deleted in the dashboard ---');
  reset('cus_deleted');
  deletedCustomers.add('cus_deleted');
  r = await post('/api/billing/checkout', { plan: 'monthly' });
  check('200', r.status === 200, JSON.stringify(r));
  check('replaced with a new customer', savedCustomer === 'cus_new1' && checkoutCustomer === 'cus_new1', `${savedCustomer} ${checkoutCustomer}`);

  console.log('\n--- checkout: other Stripe errors are not swallowed ---');
  reset('cus_ok', ['cus_ok']);
  retrieveError = Object.assign(new Error('Stripe is down'), { code: 'api_error' });
  r = await post('/api/billing/checkout', { plan: 'monthly' });
  check('500', r.status === 500, r.status);
  check('saved customer kept', savedCustomer === 'cus_ok', savedCustomer);
  check('no new customer', created.length === 0, created.join(','));

  console.log('\n--- portal ---');
  reset('cus_ok', ['cus_ok']);
  r = await post('/api/billing/portal');
  check('valid customer -> 200 with portal URL', r.status === 200 && r.body.url === 'https://portal.test/s', JSON.stringify(r));

  reset('cus_testmode');
  r = await post('/api/billing/portal');
  check('missing customer -> 400, not 500', r.status === 400, JSON.stringify(r));
  check('  and the stale id is unlinked', savedCustomer === null, savedCustomer);

  reset(null);
  r = await post('/api/billing/portal');
  check('no customer at all -> 400', r.status === 400, r.status);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  server.close(() => process.exit(fail ? 1 : 0));
});
