import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import './ReportModal.css'

export default function ReportModal({ contentType, contentId, contentPreview, onClose }) {
  const { authFetch } = useAuth()
  const [reason,     setReason]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ content_type: contentType, content_id: contentId, content_preview: contentPreview, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to submit report.')
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <div className="report-modal__header">
          <span className="report-modal__title">Report</span>
          <button className="report-modal__close" onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div className="report-modal__done">
            <p>Report submitted. Our moderation team will review it shortly.</p>
            <button className="report-modal__submit" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {contentPreview && (
              <p className="report-modal__preview">"{contentPreview}"</p>
            )}
            <label className="report-modal__label">Reason <span>(optional)</span></label>
            <textarea
              className="report-modal__textarea"
              placeholder="Describe the issue…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={300}
              rows={3}
            />
            {error && <p className="report-modal__error">{error}</p>}
            <div className="report-modal__footer">
              <span className="report-modal__count">{reason.length}/300</span>
              <button
                className="report-modal__submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
