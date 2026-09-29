// Paid membership rule (#65), shared by every members-only check on the server.
// A user is a member with a live Stripe subscription, or with a role that
// includes membership (staff and manually granted tiers).

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];
const MEMBER_ROLES = ['Owner', 'Dev', 'VIP', 'Member'];

const isMember = (user) =>
  !!user && (
    ACTIVE_SUBSCRIPTION_STATUSES.includes(user.subscription_status) ||
    MEMBER_ROLES.includes(user.role)
  );

/**
 * SQL for the public `is_subscriber` flag. Public user payloads expose only this
 * boolean, never the subscription status or billing dates. `table` is the users
 * table alias in the query ('u'), or omitted when selecting from users directly.
 */
const isSubscriberSql = (table) => {
  const col = table ? `${table}.subscription_status` : 'subscription_status';
  const list = ACTIVE_SUBSCRIPTION_STATUSES.map(s => `'${s}'`).join(', ');
  return `COALESCE(${col} IN (${list}), FALSE) AS is_subscriber`;
};

module.exports = { isMember, isSubscriberSql, ACTIVE_SUBSCRIPTION_STATUSES, MEMBER_ROLES };
