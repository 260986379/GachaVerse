const Stripe = require('stripe');
const config = require('../config');
const { query } = require('../config/db');

/**
 * Paid membership through Stripe Checkout + Customer Portal (#65).
 *
 * Stripe hosts the payment and manage pages, so no card data reaches us.
 * Subscription state is written only by the webhook: checkout and the portal
 * just redirect, and every renewal, failed payment and cancellation arrives
 * as an event.
 */

const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;

const PRICES = {
  monthly: config.STRIPE_PRICE_MONTHLY,
  yearly:  config.STRIPE_PRICE_YEARLY,
};

// A user with one of these already has a subscription to manage, not a new one to buy.
const HAS_SUBSCRIPTION = ['active', 'trialing', 'past_due', 'unpaid'];

// When a customer somehow has several subscriptions, the one that counts is the
// best of these, in order. Anything else (incomplete, canceled...) ranks last.
const STATUS_RANK = ['active', 'trialing', 'past_due', 'unpaid', 'paused'];
const rank = (status) => {
  const i = STATUS_RANK.indexOf(status);
  return i === -1 ? STATUS_RANK.length : i;
};

const requireStripe = (res) => {
  if (stripe) return true;
  res.status(503).json({ message: 'Billing is not available right now.' });
  return false;
};

/**
 * Returns the user's Stripe customer id, creating the customer on first use.
 * The customer exists before Checkout so a user never ends up with two.
 */
const getOrCreateCustomer = async (user) => {
  const { rows } = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [user.id]);
  if (rows[0]?.stripe_customer_id) return rows[0].stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { user_id: user.id },
  });
  // Two concurrent requests can both get here; only the first link wins, and
  // the loser uses the winner's customer (its own stays unused in Stripe).
  await query(
    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL',
    [customer.id, user.id]
  );
  const { rows: linked } = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [user.id]);
  return linked[0].stripe_customer_id;
};

/** POST /api/billing/checkout  { plan: 'monthly' | 'yearly' } — returns { url } */
const createCheckoutSession = async (req, res, next) => {
  if (!requireStripe(res)) return;
  try {
    const price = PRICES[req.body?.plan];
    if (!price) {
      return res.status(400).json({ message: "plan must be 'monthly' or 'yearly'." });
    }
    if (HAS_SUBSCRIPTION.includes(req.user.subscription_status)) {
      return res.status(409).json({ message: 'You already have a membership. Use Manage subscription instead.' });
    }

    const customer = await getOrCreateCustomer(req.user);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: req.user.id,
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { user_id: req.user.id } },
      success_url: `${config.FRONTEND_URL}/account?upgraded=1`,
      cancel_url:  `${config.FRONTEND_URL}/account`,
    });
    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

/** POST /api/billing/portal — returns { url } to the Stripe Customer Portal */
const createPortalSession = async (req, res, next) => {
  if (!requireStripe(res)) return;
  try {
    const { rows } = await query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.user.id]);
    const customer = rows[0]?.stripe_customer_id;
    if (!customer) {
      return res.status(400).json({ message: 'No billing account yet. Become a member first.' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${config.FRONTEND_URL}/account`,
    });
    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

/**
 * Writes a customer's current subscription state to their user row.
 *
 * Always reads the latest state from Stripe instead of trusting the event
 * payload, so duplicate or out-of-order events all end with the same, current
 * result and are safe to repeat.
 */
const syncCustomer = async (customerId) => {
  const { data } = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 });
  const sub = data.sort((a, b) => rank(a.status) - rank(b.status) || b.created - a.created)[0];

  // Since API 2025-03-31 the billing period lives on each item, not the subscription.
  const periodEnd = sub ? Math.max(...sub.items.data.map(i => i.current_period_end)) : null;

  // Cancelled in the portal but still paid up: the portal sets cancel_at_period_end
  // or, on newer API versions, cancel_at. Perks stay until the period ends, when
  // customer.subscription.deleted arrives.
  const cancelling = !!sub && sub.status !== 'canceled' && (sub.cancel_at_period_end || !!sub.cancel_at);

  const { rowCount } = await query(
    `UPDATE users
        SET subscription_status = $1,
            subscription_current_period_end = $2,
            subscription_cancel_at_period_end = $3
      WHERE stripe_customer_id = $4`,
    [sub?.status || null, periodEnd ? new Date(periodEnd * 1000) : null, cancelling, customerId]
  );
  if (rowCount === 0) {
    console.warn(`[Billing] No user linked to Stripe customer ${customerId}`);
  }
};

/**
 * POST /api/billing/webhook — called by Stripe, not the frontend.
 * Mounted in app.js with express.raw() before express.json(), because the
 * signature is checked against the exact bytes Stripe sent.
 */
const webhook = async (req, res) => {
  if (!stripe || !config.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ message: 'Billing is not configured.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      config.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.warn('[Billing] Webhook signature check failed:', err.message);
    return res.status(400).json({ message: 'Invalid signature.' });
  }

  try {
    const obj = event.data.object;
    switch (event.type) {
      case 'checkout.session.completed': {
        if (obj.mode !== 'subscription' || !obj.client_reference_id) break;
        // Normally already linked by getOrCreateCustomer; this covers a user
        // whose link was lost. Never moves a user to a different customer.
        await query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2 AND stripe_customer_id IS NULL',
          [obj.customer, obj.client_reference_id]
        );
        await syncCustomer(obj.customer);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncCustomer(obj.customer);
        break;
      default:
        break; // not subscribed to in the dashboard, or not needed
    }
    res.json({ received: true });
  } catch (err) {
    // A non-2xx makes Stripe retry the event later.
    console.error(`[Billing] Failed to handle ${event.type} (${event.id}):`, err.message);
    res.status(500).json({ message: 'Webhook handler failed.' });
  }
};

module.exports = { createCheckoutSession, createPortalSession, webhook };
