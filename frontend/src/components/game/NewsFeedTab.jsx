import { useState, useEffect } from 'react'
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

export default function NewsFeedTab({ gameId, youtubeId, youtubeTitle }) {
  const [featuredVideo, setFeaturedVideo] = useState(null)

  useEffect(() => {
    fetch(`/api/games/${gameId}/media`)
      .then((r) => r.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : (data.items ?? [])
        const cats = FEATURED_CATEGORIES_BY_GAME[gameId] ?? FEATURED_CATEGORIES_DEFAULT
        const byDate = (a, b) => new Date(b.published_at) - new Date(a.published_at)
        const latest = items
          .filter((v) => cats.includes(v.category))
          .sort(byDate)[0]
        if (latest) setFeaturedVideo(latest)
      })
      .catch(() => {})
  }, [gameId])

  const displayId    = featuredVideo?.external_id || youtubeId
  const displayTitle = featuredVideo?.title || youtubeTitle || null

  return (
    <div className="news-feed-layout">
      {displayId && (
        <div className="news-feed__featured">
          <span className="news-feed__featured-label">Featured Video</span>
          {displayTitle && (
            <p className="news-feed__featured-title">{displayTitle}</p>
          )}
          <YouTubeEmbed videoId={displayId} />
        </div>
      )}
      <GameReviewsSection gameId={gameId} />
    </div>
  )
}
