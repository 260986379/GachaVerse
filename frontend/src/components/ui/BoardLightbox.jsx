import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getRoleStyle } from '../../utils/roles'
import { displayRole } from '../../utils/membership'
import ReportModal from './ReportModal'
import './BoardLightbox.css'

const API = import.meta.env.VITE_API_URL || '/api'

function Avatar({ src, name, size = 32 }) {
  return (
    <div className="lb-avatar" style={{ '--sz': `${size}px` }}>
      {src
        ? <img src={src} alt={name} />
        : <span>{name?.[0]?.toUpperCase()}</span>
      }
    </div>
  )
}

export default function BoardLightbox({ board, boardOwner, onClose }) {
  const { user, isLoggedIn, authFetch } = useAuth()
  const [comments,      setComments]     = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [draft,         setDraft]        = useState('')
  const [submitting,    setSubmitting]   = useState(false)
  const [following,     setFollowing]    = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [reporting,     setReporting]    = useState(false)
  const listRef = useRef(null)

  const isOwnBoard = !!(boardOwner?.id && user?.id === boardOwner.id)

  // Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Load comments
  useEffect(() => {
    setCommentsLoading(true)
    fetch(`${API}/boards/${board.id}/comments`)
      .then(r => r.json())
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false))
  }, [board.id])

  // Check follow status (only if viewing someone else's board while logged in)
  useEffect(() => {
    if (!isLoggedIn || isOwnBoard || !boardOwner?.id) return
    authFetch(`${API}/users/${boardOwner.id}/follow-status`)
      .then(r => r.json())
      .then(data => setFollowing(data.following ?? false))
      .catch(() => {})
  }, [isLoggedIn, boardOwner?.id, isOwnBoard])

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [comments])

  const handleFollow = async () => {
    if (!isLoggedIn || !boardOwner?.id || followLoading) return
    setFollowLoading(true)
    try {
      await authFetch(`${API}/users/${boardOwner.id}/follow`, {
        method: following ? 'DELETE' : 'POST',
      })
      setFollowing(f => !f)
    } catch {}
    setFollowLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!draft.trim() || !isLoggedIn || submitting) return
    setSubmitting(true)
    try {
      const res = await authFetch(`${API}/boards/${board.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: draft.trim() }),
      })
      if (res.ok) {
        const newComment = await res.json()
        setComments(prev => [...prev, newComment])
        setDraft('')
      }
    } catch {}
    setSubmitting(false)
  }

  const handleDelete = async (commentId) => {
    try {
      const res = await authFetch(`${API}/boards/${board.id}/comments/${commentId}`, {
        method: 'DELETE',
      })
      if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId))
    } catch {}
  }

  const canDelete = (c) => !!(user && (c.user_id === user.id || isOwnBoard))

  return (
    <>
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox__close" onClick={onClose}>✕</button>
      <div className="lightbox__container" onClick={e => e.stopPropagation()}>

        {/* ── Left: image ── */}
        <div className="lightbox__image-side">
          <img
            className="lightbox__img"
            src={board.image_url}
            alt={board.caption || board.game_name}
          />
          {board.caption && <p className="lightbox__caption">{board.caption}</p>}
        </div>

        {/* ── Right: author + comments ── */}
        <div className="lightbox__panel">

          {/* Author row */}
          {boardOwner && (
            <div className="lightbox__panel-header">
              <div className="lightbox__author">
                <Avatar src={boardOwner.avatar_url} name={boardOwner.username} size={34} />
                <div className="lightbox__author-info">
                  <span className="lightbox__author-name" style={getRoleStyle(displayRole(boardOwner))}>
                    {boardOwner.username}
                  </span>
                  <span className="lightbox__author-game">{board.game_name}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {!isOwnBoard && isLoggedIn && (
                  <>
                    <button
                      className={`lightbox__follow-btn${following ? ' lightbox__follow-btn--on' : ''}`}
                      onClick={handleFollow}
                      disabled={followLoading}
                    >
                      {following ? '✓ Following' : '+ Follow'}
                    </button>
                    <button className="lightbox__report-btn" onClick={() => setReporting(true)} title="Report this board">
                      Report
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="lightbox__comments-list" ref={listRef}>
            {commentsLoading ? (
              <p className="lightbox__comments-empty">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="lightbox__comments-empty">No comments yet. Be the first!</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="lightbox__comment">
                  <Avatar src={c.avatar_url} name={c.username} size={26} />
                  <div className="lightbox__comment-body">
                    <span className="lightbox__comment-author" style={getRoleStyle(displayRole(c))}>
                      {c.username}
                    </span>
                    <span className="lightbox__comment-text">{c.text}</span>
                  </div>
                  {canDelete(c) && (
                    <button
                      className="lightbox__comment-delete"
                      onClick={() => handleDelete(c.id)}
                      title="Delete comment"
                    >✕</button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div className="lightbox__comment-form-area">
            {isLoggedIn ? (
              <form className="lightbox__comment-form" onSubmit={handleSubmit}>
                <Avatar src={user.avatar_url} name={user.username} size={28} />
                <input
                  className="lightbox__comment-input"
                  type="text"
                  placeholder="Add a comment…"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  maxLength={280}
                  autoComplete="off"
                />
                <button
                  className="lightbox__comment-submit"
                  type="submit"
                  disabled={!draft.trim() || submitting}
                >Post</button>
              </form>
            ) : (
              <p className="lightbox__login-prompt">Log in to leave a comment.</p>
            )}
          </div>

        </div>
      </div>
    </div>

    {reporting && (
      <ReportModal
        contentType="board"
        contentId={board.id}
        contentPreview={board.caption || board.game_name}
        onClose={() => setReporting(false)}
      />
    )}
    </>
  )
}
