import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './ModPage.css'

const TYPE_LABELS = { board: 'Board', review: 'Review', note: 'Note' }
const TYPE_COLORS = { board: '#818cf8', review: '#4ade80', note: '#facc15' }

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function ModPage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, loadingAuth, authFetch } = useAuth()

  const [status,   setStatus]   = useState('pending')
  const [typeFilter, setTypeFilter] = useState('')
  const [reports,  setReports]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [acting,   setActing]   = useState(null) // report id being actioned

  const isMod = ['Owner', 'Dev'].includes(user?.role)

  useEffect(() => {
    if (!loadingAuth && (!isLoggedIn || !isMod)) navigate('/', { replace: true })
  }, [loadingAuth, isLoggedIn, isMod])

  useEffect(() => {
    if (!isMod) return
    setLoading(true)
    const params = new URLSearchParams({ status })
    if (typeFilter) params.set('type', typeFilter)
    authFetch(`/api/reports?${params}`)
      .then(r => r.json())
      .then(data => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [status, typeFilter, isMod])

  const handleAction = async (reportId, action) => {
    setActing(reportId)
    try {
      const res = await authFetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        if (action === 'resolve') {
          // Backend resolves all pending reports for the same content — remove them all
          const target = reports.find(r => r.id === reportId)
          setReports(prev => prev.filter(r => r.content_id !== target?.content_id))
        } else {
          setReports(prev => prev.filter(r => r.id !== reportId))
        }
      }
    } catch {}
    setActing(null)
  }

  if (loadingAuth || !isMod) return null

  return (
    <div className="mod-page">
      <div className="mod-page__inner">

        <div className="mod-header">
          <h1 className="mod-header__title">Moderation</h1>
          <span className="mod-header__count">
            {loading ? '…' : reports.length} {status}
          </span>
        </div>

        {/* Filters */}
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
                {t ? TYPE_LABELS[t] : 'All Types'}
              </button>
            ))}
          </div>
        </div>

        {/* Report list */}
        {loading ? (
          <p className="mod-empty">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="mod-empty">No {status} reports{typeFilter ? ` for ${TYPE_LABELS[typeFilter]}s` : ''}.</p>
        ) : (
          <div className="mod-list">
            {reports.map(r => (
              <div key={r.id} className="mod-card">
                <div className="mod-card__top">
                  <span
                    className="mod-card__type"
                    style={{ '--tc': TYPE_COLORS[r.content_type] }}
                  >
                    {TYPE_LABELS[r.content_type]}
                  </span>
                  <span className="mod-card__time">{timeAgo(r.created_at)}</span>
                </div>

                {r.content_preview && (
                  <p className="mod-card__preview">"{r.content_preview}"</p>
                )}

                <div className="mod-card__meta">
                  <span>
                    Reported by{' '}
                    <strong>{r.reporter_username ?? 'deleted user'}</strong>
                  </span>
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
      </div>
    </div>
  )
}
