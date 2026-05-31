import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import ReportModal from '../ui/ReportModal'

const API = import.meta.env.VITE_API_URL || '/api'

function ratingColor(r) {
  if (r >= 8) return '#4ade80'
  if (r >= 5) return '#facc15'
  return '#f87171'
}

function timeAgo(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function GameReviewsSection({ gameId }) {
  const { user, authFetch, isLoggedIn } = useAuth()
  const [reviews, setReviews]   = useState([])
  const [sort, setSort]         = useState('latest')
  const [loading, setLoading]   = useState(true)
  const [rating, setRating]     = useState(0)
  const [body, setBody]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [hovered, setHovered]   = useState(0)
  const [formOpen, setFormOpen] = useState(false)

  const myReview = reviews.find((r) => r.user_id === user?.id)

  const fetchReviews = useCallback(() => {
    setLoading(true)
    const req = isLoggedIn
      ? authFetch(`${API}/reviews/${gameId}?sort=${sort}`)
      : fetch(`${API}/reviews/${gameId}?sort=${sort}`)
    req
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [gameId, sort, isLoggedIn, authFetch])

  useEffect(() => { fetchReviews() }, [fetchReviews])

  // Pre-fill form if user already has a review
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating)
      setBody(myReview.body || '')
    } else {
      setRating(0)
      setBody('')
    }
  }, [myReview?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) return
    setSubmitting(true)
    try {
      const res = await authFetch(`${API}/reviews/${gameId}`, {
        method: 'POST',
        body: JSON.stringify({ rating, body }),
      })
      if (res.ok) { fetchReviews(); setFormOpen(false) }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!myReview) return
    const res = await authFetch(`${API}/reviews/review/${myReview.id}`, { method: 'DELETE' })
    if (res.ok) {
      setRating(0)
      setBody('')
      setFormOpen(false)
      fetchReviews()
    }
  }

  const [pendingUpvote, setPendingUpvote] = useState(null)
  const [reportingReview, setReportingReview] = useState(null)

  const handleUpvote = async (review) => {
    if (!isLoggedIn || review.user_id === user?.id || pendingUpvote === review.id) return
    setPendingUpvote(review.id)
    try {
      const res = await authFetch(`${API}/reviews/review/${review.id}/upvote`, { method: 'POST' })
      if (res.ok) {
        const { upvoted } = await res.json()
        setReviews((prev) => prev.map((r) =>
          r.id === review.id
            ? { ...r, upvote_count: (r.upvote_count || 0) + (upvoted ? 1 : -1), user_upvoted: upvoted }
            : r
        ))
      }
    } catch (_) {
    } finally {
      setPendingUpvote(null)
    }
  }

  const displayRating = hovered || rating

  return (
    <>
    <div className="reviews-section">
      <div className="reviews-section__header">
        <h3 className="reviews-section__title">User Reviews</h3>
        <div className="reviews-sort">
          <button
            className={`reviews-sort__btn${sort === 'latest' ? ' reviews-sort__btn--active' : ''}`}
            onClick={() => setSort('latest')}
          >Latest</button>
          <button
            className={`reviews-sort__btn${sort === 'top' ? ' reviews-sort__btn--active' : ''}`}
            onClick={() => setSort('top')}
          >Most Upvoted</button>
        </div>
      </div>

      {isLoggedIn && !formOpen && (
        <button
          className="review-form__trigger"
          onClick={() => setFormOpen(true)}
        >
          {myReview ? `Edit your review  ·  ${myReview.rating}/10` : '+ Write a Review'}
        </button>
      )}

      {isLoggedIn && formOpen && (
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="review-form__rating-row">
            <span className="review-form__label">Your Rating</span>
            <div className="review-form__stars">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`review-form__pip${n <= displayRating ? ' review-form__pip--on' : ''}`}
                  style={n <= displayRating ? { color: ratingColor(displayRating) } : undefined}
                  onMouseEnter={() => setHovered(n)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(n)}
                >
                  {n}
                </button>
              ))}
              {displayRating > 0 && (
                <span className="review-form__rating-display" style={{ color: ratingColor(displayRating) }}>
                  {displayRating}/10
                </span>
              )}
            </div>
          </div>
          <textarea
            className="review-form__body"
            placeholder="Write your review… (optional)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
          />
          <div className="review-form__actions">
            <button
              type="submit"
              className="review-form__submit"
              disabled={rating === 0 || submitting}
            >
              {myReview ? 'Update Review' : 'Post Review'}
            </button>
            {myReview && (
              <button type="button" className="review-form__delete" onClick={handleDelete}>
                Delete
              </button>
            )}
            <button type="button" className="review-form__cancel" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {!isLoggedIn && (
        <p className="reviews-section__guest">Sign in to leave a review.</p>
      )}

      <div className="reviews-list">
        {loading && <p className="reviews-section__empty">Loading…</p>}
        {!loading && reviews.length === 0 && (
          <p className="reviews-section__empty">No reviews yet. Be the first!</p>
        )}
        {[...reviews].sort((a, b) => {
          if (a.user_id === user?.id) return -1
          if (b.user_id === user?.id) return 1
          return 0
        }).map((r) => {
          const isOwn = r.user_id === user?.id
          return (
            <div key={r.id} className={`review-card${isOwn ? ' review-card--own' : ''}`}>
              <div className="review-card__left">
                <Link to={`/u/${r.username}`} className="review-card__profile-link">
                  {r.avatar_url
                    ? <img className="review-card__avatar" src={r.avatar_url} alt={r.username} />
                    : <div className="review-card__avatar review-card__avatar--fallback">{r.username?.[0]?.toUpperCase()}</div>
                  }
                  <span className="review-card__username">{r.username}</span>
                </Link>
              </div>
              <div className="review-card__center">
                {r.body && <p className="review-card__body">{r.body}</p>}
                <span className="review-card__time">{timeAgo(r.created_at)}</span>
              </div>
              <div className="review-card__right">
                <span className="review-card__rating" style={{ color: ratingColor(r.rating) }}>
                  {r.rating}<span className="review-card__rating-denom">/10</span>
                </span>
                <button
                  className={`review-card__upvote${r.user_upvoted ? ' review-card__upvote--on' : ''}${isOwn || !isLoggedIn ? ' review-card__upvote--disabled' : ''}${pendingUpvote === r.id ? ' review-card__upvote--pending' : ''}`}
                  onClick={() => handleUpvote(r)}
                  disabled={isOwn || !isLoggedIn || pendingUpvote === r.id}
                  title={isOwn ? 'Your review' : !isLoggedIn ? 'Sign in to upvote' : r.user_upvoted ? 'Remove upvote' : 'Upvote'}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                    <path d="M4 14h4v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-7h4a1 1 0 0 0 .77-1.64l-8-10a1 1 0 0 0-1.54 0l-8 10A1 1 0 0 0 4 14z"/>
                  </svg>
                  <span>{r.upvote_count || 0}</span>
                </button>
                {!isOwn && isLoggedIn && (
                  <button
                    className="review-card__report"
                    onClick={() => setReportingReview(r)}
                    title="Report this review"
                  >Report</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>

    {reportingReview && (
      <ReportModal
        contentType="review"
        contentId={reportingReview.id}
        contentPreview={reportingReview.body ? reportingReview.body.slice(0, 80) : `${reportingReview.rating}/10 review by ${reportingReview.username}`}
        onClose={() => setReportingReview(null)}
      />
    )}
    </>
  )
}
