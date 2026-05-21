import { useEffect, useRef } from 'react'

// Renders an official Twitter/X embedded tweet via Twitter's widgets.js.
// Falls back to a plain link card when tweetId is unavailable.
export default function TwitterEmbed({ tweetId, title, sourceUrl }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!tweetId) return

    const render = () => {
      if (containerRef.current && window.twttr?.widgets) {
        containerRef.current.innerHTML = ''
        window.twttr.widgets.createTweet(tweetId, containerRef.current, {
          theme: 'dark',
          dnt: true,
        })
      }
    }

    if (window.twttr) {
      render()
    } else {
      // Load Twitter widgets.js once if not already present
      if (!document.getElementById('twitter-wjs')) {
        const script = document.createElement('script')
        script.id = 'twitter-wjs'
        script.src = 'https://platform.twitter.com/widgets.js'
        script.async = true
        script.onload = render
        document.head.appendChild(script)
      } else {
        // Script tag exists but twttr not ready yet — wait for it
        const interval = setInterval(() => {
          if (window.twttr?.widgets) { clearInterval(interval); render() }
        }, 100)
      }
    }
  }, [tweetId])

  if (!tweetId) {
    return (
      <a className="news-card" href={sourceUrl} target="_blank" rel="noopener noreferrer">
        <div className="news-card__platform">𝕏 Twitter / X</div>
        <p className="news-card__title">{title}</p>
        <span className="news-card__link">View on X →</span>
      </a>
    )
  }

  return <div ref={containerRef} className="tweet-embed" />
}
