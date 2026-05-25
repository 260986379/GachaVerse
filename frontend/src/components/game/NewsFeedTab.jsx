import { useState, useEffect, useRef } from 'react'
import YouTubeEmbed from '../ui/YouTubeEmbed'
import BANNER_CONFIG from '../../data/bannerConfig'

const FEATURED_CATEGORIES = ['Lore', 'Trailer', 'Character Demo']

function deriveBanners(gameId) {
  const entries = BANNER_CONFIG[gameId] || []
  const now = new Date()
  return {
    current:  entries.filter((b) => new Date(b.starts_at) <= now && new Date(b.ends_at) > now),
    upcoming: entries.filter((b) => new Date(b.starts_at) > now),
  }
}

function timeLeft(endsAt) {
  const ms = new Date(endsAt) - Date.now()
  if (ms <= 0) return 'Ended'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`
}

function BannerCard({ banner, upcoming }) {
  const typeKey = (banner.banner_type || 'standard').toLowerCase()
  return (
    <div className="banner-card">
      {banner.image_url && (
        <img
          className="banner-card__image"
          src={banner.image_url}
          alt={banner.name}
          loading="lazy"
        />
      )}
      <div className="banner-card__info">
        <span className={`banner-card__type banner-card__type--${typeKey}`}>
          {banner.banner_type}
        </span>
        <p className="banner-card__name">{banner.name}</p>
        <span className="banner-card__timer">
          {upcoming
            ? `Starts ${new Date(banner.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : timeLeft(banner.ends_at)}
        </span>
      </div>
    </div>
  )
}

export default function NewsFeedTab({ gameId, youtubeId, youtubeTitle, isVisible }) {
  const [featuredVideo, setFeaturedVideo] = useState(null)
  const [banners, setBanners] = useState(() => deriveBanners(gameId))
  // Don't render the iframe until the tab is first opened — prevents background autoplay
  const [embedReady, setEmbedReady] = useState(isVisible)
  const iframeRef = useRef(null)

  useEffect(() => {
    fetch(`/api/games/${gameId}/media`)
      .then((r) => r.json())
      .then((data) => {
        const latest = data
          .filter((v) => FEATURED_CATEGORIES.includes(v.category))
          .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0]
        if (latest) setFeaturedVideo(latest)
      })
      .catch(() => {})
  }, [gameId])

  useEffect(() => {
    setBanners(deriveBanners(gameId))
    const localEntries = BANNER_CONFIG[gameId] || []
    // If the DB banner has no image_url, patch it from the local config by name
    const patchImages = (list) => list.map((b) => {
      if (b.image_url) return b
      const local = localEntries.find((l) => l.name === b.name)
      return local?.image_url ? { ...b, image_url: local.image_url } : b
    })
    fetch(`/api/games/${gameId}/banners`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && (data.current.length > 0 || data.upcoming.length > 0)) {
          setBanners({ current: patchImages(data.current), upcoming: patchImages(data.upcoming) })
        }
      })
      .catch(() => {})
  }, [gameId])

  useEffect(() => {
    // Mark the embed as renderable the first time the tab becomes active
    if (isVisible) setEmbedReady(true)
  }, [isVisible])

  useEffect(() => {
    if (!iframeRef.current) return
    // Pause when leaving the tab; attempt resume when returning
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

      <div className="news-feed-bottom">
        <div className="news-feed__banners">
          <div className="news-feed__banner-section">
            <h3 className="news-feed__banner-title">Current Banners</h3>
            {banners.current.length === 0
              ? <p className="news-feed__banner-empty">No active banners.</p>
              : banners.current.map((b) => <BannerCard key={b.id} banner={b} />)
            }
          </div>
          <div className="news-feed__banner-section">
            <h3 className="news-feed__banner-title">Upcoming Banners</h3>
            {banners.upcoming.length === 0
              ? <p className="news-feed__banner-empty">No upcoming banners.</p>
              : banners.upcoming.map((b) => <BannerCard key={b.id} banner={b} upcoming />)
            }
          </div>
        </div>

      </div>
    </div>
  )
}
