import { forwardRef } from 'react'

const YouTubeEmbed = forwardRef(function YouTubeEmbed({ videoId, title, thumbnailUrl, autoplay = true }, ref) {
  return (
    <div className="yt-embed-wrap">
      {thumbnailUrl && (
        <div className="yt-embed__ambient" style={{ backgroundImage: `url(${thumbnailUrl})` }} />
      )}
      <div className="yt-embed">
        <iframe
          ref={ref}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&enablejsapi=1`}
          title={title || 'YouTube video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
})

export default YouTubeEmbed
