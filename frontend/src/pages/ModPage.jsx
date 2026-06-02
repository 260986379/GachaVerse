import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ModPage.css'

// ── Reports ──────────────────────────────────────────────────────────────────

const REPORT_TYPE_LABELS = { board: 'Board', review: 'Review', note: 'Note' }
const REPORT_TYPE_COLORS = { board: '#818cf8', review: '#4ade80', note: '#facc15' }

function ReportsSection({ authFetch }) {
  const [status,     setStatus]     = useState('pending')
  const [typeFilter, setTypeFilter] = useState('')
  const [reports,    setReports]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [acting,     setActing]     = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ status })
    if (typeFilter) params.set('type', typeFilter)
    authFetch(`/api/reports?${params}`)
      .then(r => r.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [status, typeFilter])

  const handleAction = async (reportId, action) => {
    setActing(reportId)
    try {
      const res = await authFetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        if (action === 'resolve') {
          const target = reports.find(r => r.id === reportId)
          setReports(prev => prev.filter(r => r.content_id !== target?.content_id))
        } else {
          setReports(prev => prev.filter(r => r.id !== reportId))
        }
      }
    } catch {}
    setActing(null)
  }

  return (
    <>
      <div className="mod-filters">
        <div className="mod-filters__group">
          {['pending', 'resolved', 'dismissed'].map(s => (
            <button
              key={s}
              className={`mod-filter-btn${status === s ? ' mod-filter-btn--active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="mod-filters__group">
          {['', 'board', 'review', 'note'].map(t => (
            <button
              key={t}
              className={`mod-filter-btn${typeFilter === t ? ' mod-filter-btn--active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t ? REPORT_TYPE_LABELS[t] : 'All Types'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mod-empty">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="mod-empty">
          No {status} reports{typeFilter ? ` for ${REPORT_TYPE_LABELS[typeFilter]}s` : ''}.
        </p>
      ) : (
        <div className="mod-list">
          {reports.map(r => (
            <div key={r.id} className="mod-card">
              <div className="mod-card__top">
                <span className="mod-card__type" style={{ '--tc': REPORT_TYPE_COLORS[r.content_type] }}>
                  {REPORT_TYPE_LABELS[r.content_type]}
                </span>
                <span className="mod-card__time">{timeAgo(r.created_at)}</span>
              </div>

              {r.content_preview && (
                <p className="mod-card__preview">"{r.content_preview}"</p>
              )}

              <div className="mod-card__meta">
                <span>Reported by <strong>{r.reporter_username ?? 'deleted user'}</strong></span>
                {r.reason && <span className="mod-card__reason">— {r.reason}</span>}
              </div>

              {status !== 'pending' && r.resolved_by_username && (
                <p className="mod-card__resolved-by">
                  {status === 'resolved' ? 'Resolved' : 'Dismissed'} by{' '}
                  <strong>{r.resolved_by_username}</strong>
                </p>
              )}

              {status === 'pending' && (
                <div className="mod-card__actions">
                  <button
                    className="mod-card__btn mod-card__btn--resolve"
                    onClick={() => handleAction(r.id, 'resolve')}
                    disabled={acting === r.id}
                  >
                    {acting === r.id ? '…' : 'Resolve & Delete'}
                  </button>
                  <button
                    className="mod-card__btn mod-card__btn--dismiss"
                    onClick={() => handleAction(r.id, 'dismiss')}
                    disabled={acting === r.id}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTION_TYPE_LABELS = { game: 'Game', character: 'Character', artwork: 'Artwork' }
const SUGGESTION_TYPE_COLORS = { game: '#60a5fa', character: '#a78bfa', artwork: '#f472b6' }

function SuggestionsSection({ authFetch }) {
  const [status,     setStatus]     = useState('pending')
  const [typeFilter, setTypeFilter] = useState('')
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [acting,     setActing]     = useState(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ status })
    if (typeFilter) params.set('type', typeFilter)
    authFetch(`/api/suggestions?${params}`)
      .then(r => r.json())
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [status, typeFilter])

  const handleAction = async (id, action) => {
    setActing(id)
    try {
      const res = await authFetch(`/api/suggestions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      if (res.ok) setItems(prev => prev.filter(s => s.id !== id))
    } catch {}
    setActing(null)
  }

  return (
    <>
      <div className="mod-filters">
        <div className="mod-filters__group">
          {['pending', 'reviewed', 'dismissed'].map(s => (
            <button
              key={s}
              className={`mod-filter-btn${status === s ? ' mod-filter-btn--active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="mod-filters__group">
          {['', 'game', 'character', 'artwork'].map(t => (
            <button
              key={t}
              className={`mod-filter-btn${typeFilter === t ? ' mod-filter-btn--active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {t ? SUGGESTION_TYPE_LABELS[t] : 'All Types'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mod-empty">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mod-empty">
          No {status} suggestions{typeFilter ? ` for ${SUGGESTION_TYPE_LABELS[typeFilter]}s` : ''}.
        </p>
      ) : (
        <div className="mod-list">
          {items.map(s => (
            <div key={s.id} className="mod-card">
              <div className="mod-card__top">
                <span className="mod-card__type" style={{ '--tc': SUGGESTION_TYPE_COLORS[s.type] }}>
                  {SUGGESTION_TYPE_LABELS[s.type]}
                </span>
                <span className="mod-card__time">{timeAgo(s.created_at)}</span>
              </div>

              <p className="mod-card__entry-name">{s.entry_name}</p>

              <div className="mod-card__meta">
                {s.game_name && <span>Game: <strong>{s.game_name}</strong></span>}
                {s.reference_link && (
                  <span>
                    Link:{' '}
                    <a
                      className="mod-card__link"
                      href={s.reference_link.startsWith('http') ? s.reference_link : `https://${s.reference_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {s.reference_link}
                    </a>
                  </span>
                )}
                <span>
                  Submitted by <strong>{s.submitter_username ?? 'Anonymous'}</strong>
                </span>
              </div>

              {status !== 'pending' && s.reviewed_by_username && (
                <p className="mod-card__resolved-by">
                  {status === 'reviewed' ? 'Reviewed' : 'Dismissed'} by{' '}
                  <strong>{s.reviewed_by_username}</strong>
                </p>
              )}

              {status === 'pending' && (
                <div className="mod-card__actions">
                  <button
                    className="mod-card__btn mod-card__btn--reviewed"
                    onClick={() => handleAction(s.id, 'reviewed')}
                    disabled={acting === s.id}
                  >
                    {acting === s.id ? '…' : 'Mark Reviewed'}
                  </button>
                  <button
                    className="mod-card__btn mod-card__btn--dismiss"
                    onClick={() => handleAction(s.id, 'dismissed')}
                    disabled={acting === s.id}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ModPage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, loadingAuth, authFetch } = useAuth()
  const [section, setSection] = useState('reports')

  const isMod = ['Owner', 'Dev'].includes(user?.role)

  useEffect(() => {
    if (!loadingAuth && (!isLoggedIn || !isMod)) navigate('/', { replace: true })
  }, [loadingAuth, isLoggedIn, isMod])

  if (loadingAuth || !isMod) return null

  return (
    <div className="mod-page">
      <div className="mod-page__inner">
        <div className="mod-header">
          <h1 className="mod-header__title">Moderation</h1>
        </div>

        <div className="mod-section-tabs">
          <button
            className={`mod-section-tab${section === 'reports' ? ' mod-section-tab--active' : ''}`}
            onClick={() => setSection('reports')}
          >
            Reports
          </button>
          <button
            className={`mod-section-tab${section === 'suggestions' ? ' mod-section-tab--active' : ''}`}
            onClick={() => setSection('suggestions')}
          >
            Suggestions
          </button>
        </div>

        {section === 'reports'
          ? <ReportsSection authFetch={authFetch} />
          : <SuggestionsSection authFetch={authFetch} />
        }
      </div>
    </div>
  )
}
