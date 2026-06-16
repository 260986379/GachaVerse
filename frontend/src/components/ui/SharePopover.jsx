import { useState, useRef, useEffect } from 'react'
import './SharePopover.css'

const ShareIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
)

export default function SharePopover({ url, tweetText, label, className = '' }) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(url) } catch {}
    setCopied(true)
    setTimeout(() => { setCopied(false); setOpen(false) }, 1500)
  }

  const handleTweet = () => {
    const params = new URLSearchParams({ text: tweetText, url })
    window.open(`https://twitter.com/intent/tweet?${params}`, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  return (
    <div className={`share-pop${className ? ` ${className}` : ''}`} ref={ref}>
      <button
        className={`share-pop__btn${open ? ' share-pop__btn--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Share"
      >
        <ShareIcon />
        {label && <span>{label}</span>}
      </button>
      {open && (
        <div className="share-pop__menu">
          <button className="share-pop__item" onClick={handleCopy}>
            {copied ? '✓ Copied!' : '↗ Copy link'}
          </button>
          <button className="share-pop__item" onClick={handleTweet}>
            𝕏 Share on X
          </button>
        </div>
      )}
    </div>
  )
}
