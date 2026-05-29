import { useState, useEffect, useRef } from 'react'
import YouTubeEmbed from '../ui/YouTubeEmbed'
import GameReviewsSection from './GameReviewsSection'

const FEATURED_CATEGORIES_BY_GAME = {
  'genshin-impact':    ['Main Story', 'Animation'],
  'wuthering-waves':   ['Main Story', 'Resonator Showcase'],
  'honkai-star-rail':  ['Main Story', 'Animation'],
  'zenless-zone-zero': ['Main Story', 'Lore', 'Trailer'],
  'nikke':             ['Main Story', 'Lore', 'Trailer'],
}
const FEATURED_CATEGORIES_DEFAULT = ['Main Story', 'Lore', 'Trailer', 'Character Demo']

export default function NewsFeedTab({ gameId, youtubeId, youtubeTitle, isVisible }) {
  const [featuredVideo, setFeaturedVideo] = useState(null)
  const [embedReady, setEmbedReady] = useState(isVisible)
  const iframeRef = useRef(null)

  useEffect(() => {
    fetch(`/api/games/${gameId}/media`)
      .then((r) => r.json())
      .then((data) => {
        const cats = FEATURED_CATEGORIES_BY_GAME[gameId] ?? FEATURED_CATEGORIES_DEFAULT
        const byDate = (a, b) => new Date(b.published_at) - new Date(a.published_at)
        const latest = data
          .filter((v) => cats.includes(v.category))
          .sort(byDate)[0]
        if (latest) setFeaturedVideo(latest)
      })
      .catch(() => {})
  }, [gameId])

  useEffect(() => {
    if (isVisible) setEmbedReady(true)
  }, [isVisible])

  useEffect(() => {
    if (!iframeRef.current) return
    const func = isVisible ? 'playVideo' : 'pauseVideo'
    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    )
  }, [isVisible])

  const displayId = featuredVideo?.external_id || youtubeId
  const displayTitle = featuredVideo?.title || youtubeTitle || null

  return (
    <div className="news-feed-layout">
      {embedReady && displayId && (
        <div className="news-feed__featured">
          <span className="news-feed__featured-label">Featured Video</span>
          {displayTitle && (
            <p className="news-feed__featured-title">{displayTitle}</p>
          )}
          <YouTubeEmbed videoId={displayId} ref={iframeRef} />
        </div>
      )}
      <GameReviewsSection gameId={gameId} />
    </div>
  )
}
