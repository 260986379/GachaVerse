import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { hasActiveSubscription, hasPaymentProblem, PLANS, PERKS } from '../../utils/membership'
import './MembershipModal.css'

const API = import.meta.env.VITE_API_URL || '/api'

// After Checkout, Stripe's webhook usually lands within a few seconds of the
// redirect back; poll /auth/me until it does.
const POLL_MS    = 2000
const POLL_TRIES = 15

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

/**
 * Membership popup on the account page (#65): plans for non-members, status and
 * Manage subscription for subscribers. `justUpgraded` is set when Stripe
 * Checkout redirects back with ?upgraded=1.
 */
export default function MembershipModal({ justUpgraded, onClose }) {
  const { user, authFetch, refreshUser } = useAuth()
  const [busy,  setBusy]  = useState(null)   // null | 'checkout' | 'portal'
  const [error, setError] = useState('')
  const [plan,  setPlan]  = useState(Object.keys(PLANS)[0])

  const subscribed     = hasActiveSubscription(user)
  const paymentProblem = hasPaymentProblem(user)
  const activating     = justUpgraded && !subscribed
  const periodEnd      = user?.subscription_current_period_end

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!activating) return
    let tries = 0
    const id = setInterval(() => {
      tries++
      refreshUser()
      if (tries >= POLL_TRIES) clearInterval(id)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [activating, refreshUser])

  const redirectTo = async (path, body, which) => {
    setBusy(which)
    setError('')
    try {
      const res  = await authFetch(`${API}/billing/${path}`, { method: 'POST', body: JSON.stringify(body || {}) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.message || 'Something went wrong. Please try again.')
      window.location.assign(data.url)
    } catch (e) {
      setError(e.message)
      setBusy(null)
    }
  }

  const title = subscribed || paymentProblem || activating ? 'Membership' : 'Become a Member'

  return (
    <div className="membership-modal-overlay" onClick={onClose}>
      <div className="membership-modal" onClick={e => e.stopPropagation()}>
        <div className="membership-modal__header">
          <span className="membership-modal__title">✦ {title}</span>
          <button className="membership-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="membership-modal__body">
          {activating ? (
            <p className="membership-modal__notice">
              Thanks for becoming a member! Activating your membership…
            </p>
          ) : subscribed || paymentProblem ? (
            <>
              {justUpgraded && (
                <p className="membership-modal__notice">
                  Thanks for becoming a member! Your membership is active.
                </p>
              )}
              <p className="membership-modal__status">
                {paymentProblem ? (
                  <span className="membership-modal__warn">
                    Your last payment failed. Update your card to keep your membership.
                  </span>
                ) : (
                  <>
                    <span className="membership-modal__active">Member</span>
                    {periodEnd && (
                      user.subscription_cancel_at_period_end
                        ? <> · Ends on {formatDate(periodEnd)}</>
                        : <> · Renews on {formatDate(periodEnd)}</>
                    )}
                  </>
                )}
              </p>
              <button
                className="membership-modal__manage"
                onClick={() => redirectTo('portal', null, 'portal')}
                disabled={!!busy}
              >
                {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
              </button>
              <p className="membership-modal__fine">
                Change your card, cancel or view invoices on Stripe.
              </p>
            </>
          ) : (
            <>
              <p className="membership-modal__pitch">
                Support GachaVerse and unlock member perks.
              </p>

              <ul className="membership-perks">
                {PERKS.map(perk => (
                  <li key={perk.title} className="membership-perk">
                    <span className="membership-perk__icon">{perk.icon}</span>
                    <span>
                      <span className="membership-perk__title">{perk.title}</span>
                      <span className="membership-perk__text">{perk.text}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="membership-checkout">
                <label className="membership-checkout__label" htmlFor="membership-plan">Plan</label>
                <div className="membership-checkout__row">
                  <select
                    id="membership-plan"
                    className="membership-checkout__select"
                    value={plan}
                    onChange={e => setPlan(e.target.value)}
                    disabled={!!busy}
                  >
                    {Object.entries(PLANS).map(([key, p]) => (
                      <option key={key} value={key}>
                        {p.label} · {p.price} {p.period}{p.note ? ` (${p.note})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    className="membership-checkout__btn"
                    onClick={() => redirectTo('checkout', { plan }, 'checkout')}
                    disabled={!!busy}
                  >
                    {busy === 'checkout' ? 'Redirecting…' : 'Subscribe'}
                  </button>
                </div>
              </div>

              <p className="membership-modal__fine">
                Secure payment by Stripe. Renews automatically; cancel anytime.
              </p>
            </>
          )}

          {error && <p className="membership-modal__error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
