// Paid membership (#65). Mirrors backend/src/utils/membership.js — the server
// enforces membership; this only decides what the UI shows.

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing']
const MEMBER_ROLES = ['Owner', 'Dev', 'VIP', 'Member']

/**
 * True while the user has a live Stripe subscription. Your own user object has
 * subscription_status; other people's public profiles only carry is_subscriber.
 */
export const hasActiveSubscription = (user) =>
  !!user?.is_subscriber || ACTIVE_SUBSCRIPTION_STATUSES.includes(user?.subscription_status)

/**
 * The role to show for a user (name colour, role pill): a Regular user who
 * subscribes shows as Member. Their stored role stays Regular — use `role`
 * itself for permission checks and the role picker.
 */
export const displayRole = (user) =>
  user?.role === 'Regular' && hasActiveSubscription(user) ? 'Member' : user?.role

/** Badges shown on a profile: the role (unless Regular), plus Member for subscribers. */
export const profileBadges = (user) => [
  ...(user.role !== 'Regular' ? [user.role] : []),
  ...(hasActiveSubscription(user) && user.role !== 'Member' ? ['Member'] : []),
]

/** True for subscribers and for roles that include membership. */
export const isMember = (user) =>
  !!user && (hasActiveSubscription(user) || MEMBER_ROLES.includes(user.role))

/** True when a renewal failed and the user needs to update their card. */
export const hasPaymentProblem = (user) =>
  ['past_due', 'unpaid'].includes(user?.subscription_status)

// The first plan is the default selection in the membership popup.
export const PLANS = {
  monthly: { label: 'Monthly', price: '$2.99', period: '/ month' },
  yearly:  { label: 'Yearly',  price: '$29.99', period: '/ year', note: '2 months free' },
}

// Listed in the membership popup. Only add a perk once it actually ships.
export const PERKS = [
  { icon: '✦', title: 'Member badge', text: 'A Member badge on your profile.' },
  { icon: '♥', title: 'Support GachaVerse', text: 'Help keep the site running and growing.' },
]
