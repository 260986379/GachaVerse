import { useEffect } from 'react'
import './ImageLightbox.css'

export default function ImageLightbox({ src, title, sourceUrl, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="img-lightbox-overlay" onClick={onClose}>
      <button className="img-lightbox__close" onClick={onClose}>✕</button>
      <div className="img-lightbox__content" onClick={(e) => e.stopPropagation()}>
        <img className="img-lightbox__img" src={src} alt={title} />
        {(title || sourceUrl) && (
          <div className="img-lightbox__footer">
            {title && <p className="img-lightbox__title">{title}</p>}
            {sourceUrl && (
              <a
                className="img-lightbox__source"
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                View source ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
