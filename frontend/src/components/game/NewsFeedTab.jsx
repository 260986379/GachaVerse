import { useState, useEffect, useRef } from 'react'
import TwitterEmbed from '../ui/TwitterEmbed'
import YouTubeEmbed from '../ui/YouTubeEmbed'

export default function NewsFeedTab({ gameId, youtubeId, youtubeTitle, isVisible }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fetchedTitle, setFetchedTitle] = useState(null)
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!youtubeId || youtubeTitle) return
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`)
      .then((r) => r.json())
      .then((data) => setFetchedTitle(data.title))
      .catch(() => {})
  }, [youtubeId, youtubeTitle])

  useEffect(() => {
    if (isVisible || !iframeRef.current) return
    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
      '*'
    )
  }, [isVisible])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/games/${gameId}/news`)
      .then((r) => { if (!r.ok) throw new Error('Failed to load news'); return r.json() })
      .then((data) => { setItems(data); setLoading(false) })
      .catch((err) => { setError(err.message); setLoading(false) })
  }, [gameId])

  return (
    <div className="news-feed-layout">
      {youtubeId && (
        <div className="news-feed__featured">
          <span className="news-feed__featured-label">Featured Video</span>
          {(youtubeTitle || fetchedTitle) && (
            <p className="news-feed__featured-title">{youtubeTitle || fetchedTitle}</p>
          )}
          <YouTubeEmbed videoId={youtubeId} ref={iframeRef} />
        </div>
      )}

      <div className="news-feed-bottom">
        <div className="news-feed__banners">
          <div className="news-feed__banner-section">
            <h3 className="news-feed__banner-title">Current Banners</h3>
            <p className="news-feed__banner-empty">No active banners.</p>
          </div>
          <div className="news-feed__banner-section">
            <h3 className="news-feed__banner-title">Upcoming Banners</h3>
            <p className="news-feed__banner-empty">No upcoming banners.</p>
          </div>
        </div>

        <div className="news-feed__posts-col">
          <span className="news-feed__featured-label">Latest News</span>
          {loading && <p className="tab-status">Loading news...</p>}
          {error && <p className="tab-status tab-status--error">{error}</p>}
          {!loading && !error && !items.length && (
            <p className="tab-status">No news yet. Check back soon.</p>
          )}
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
      </div>
    </div>
  )
}
