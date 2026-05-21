import { useState, useEffect } from 'react'
import TwitterEmbed from '../ui/TwitterEmbed'

export default function NewsFeedTab({ gameId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/games/${gameId}/news`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load news'); return r.json() })
      .then((data) => { setItems(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  if (loading) return <p className="tab-status">Loading news...</p>
  if (error) return <p className="tab-status tab-status--error">{error}</p>
  if (!items.length) return <p className="tab-status">No news yet. Check back soon.</p>

  return (
    <div className="news-feed">
      {items.map((item) => (
        <div key={item.id} className="news-feed__item">
          <TwitterEmbed
            tweetId={item.external_id || null}
            title={item.title}
            sourceUrl={item.source_url}
          />
        </div>
      ))}
    </div>
  )
}
