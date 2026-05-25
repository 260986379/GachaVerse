import { useState, useEffect, useRef } from 'react'
import {
  getBoardComments, addBoardComment, deleteBoardComment,
  isFollowingUser, toggleFollowUser,
} from '../../utils/bookmarks'
import './BoardLightbox.css'

const LOCAL_USER = { id: 'local_user', name: 'You' }

export default function BoardLightbox({ board, onClose }) {
  const [comments, setComments]   = useState(() => getBoardComments(board.id))
  const [draft, setDraft]         = useState('')
  const [following, setFollowing] = useState(() => isFollowingUser(LOCAL_USER.id))
  const listRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Scroll to bottom when new comment arrives
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [comments])

  const handleFollow = () => {
    const nowFollowing = toggleFollowUser(LOCAL_USER)
    setFollowing(nowFollowing)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    addBoardComment(board.id, draft)
    setComments(getBoardComments(board.id))
    setDraft('')
  }

  const handleDelete = (commentId) => {
    deleteBoardComment(board.id, commentId)
    setComments(getBoardComments(board.id))
  }

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox__close" onClick={onClose}>✕</button>
      <div className="lightbox__container" onClick={(e) => e.stopPropagation()}>

        {/* Left: image */}
        <div className="lightbox__image-side">
          <img
            className="lightbox__img"
            src={board.imageUrl}
            alt={board.caption || board.gameName}
          />
          {board.caption && <p className="lightbox__caption">{board.caption}</p>}
        </div>

        {/* Right: author + follow + comments */}
        <div className="lightbox__panel">
          <div className="lightbox__panel-header">
            <div className="lightbox__author">
              <div className="lightbox__author-avatar">{LOCAL_USER.name[0]}</div>
              <div className="lightbox__author-info">
                <span className="lightbox__author-name">{LOCAL_USER.name}</span>
                <span className="lightbox__author-game">{board.gameName}</span>
              </div>
            </div>
            <button
              className={`lightbox__follow-btn${following ? ' lightbox__follow-btn--on' : ''}`}
              onClick={handleFollow}
            >
              {following ? '✓ Following' : '+ Follow'}
            </button>
          </div>

          <div className="lightbox__comments-list" ref={listRef}>
            {comments.length === 0 ? (
              <p className="lightbox__comments-empty">No comments yet. Be the first!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="lightbox__comment">
                  <div className="lightbox__comment-body">
                    <span className="lightbox__comment-author">{c.author}</span>
                    <span className="lightbox__comment-text">{c.text}</span>
                  </div>
                  <button
                    className="lightbox__comment-delete"
                    onClick={() => handleDelete(c.id)}
                    title="Delete"
                  >✕</button>
                </div>
              ))
            )}
          </div>

          <form className="lightbox__comment-form" onSubmit={handleSubmit}>
            <input
              className="lightbox__comment-input"
              type="text"
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={280}
            />
            <button
              className="lightbox__comment-submit"
              type="submit"
              disabled={!draft.trim()}
            >Post</button>
          </form>
        </div>

      </div>
    </div>
  )
}
