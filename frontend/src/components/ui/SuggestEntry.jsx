import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import './SuggestEntry.css'

const API = import.meta.env.VITE_API_URL || '/api'

const ALL_TYPES = [
  { value: 'game',      label: 'New Game Entry' },
  { value: 'character', label: 'New Character Entry' },
  { value: 'artwork',   label: 'New Artwork Entry' },
]

const NAME_LABEL = {
  game:      'Game name',
  character: 'Character name',
  artwork:   'Artwork name',
}

const NAME_PLACEHOLDER = {
  game:      'e.g. Blue Protocol',
  character: 'e.g. Hu Tao',
  artwork:   'e.g. New Year 2025 Illustration',
}

export default function SuggestEntry({
  label        = "Can't find your game?",
  allowedTypes = ['game', 'character', 'artwork'],
  gameName     = null,
}) {
  const { authFetch, isLoggedIn } = useAuth()
  const types = ALL_TYPES.filter((t) => allowedTypes.includes(t.value))

  const [open, setOpen]           = useState(false)
  const [type, setType]           = useState(types[0].value)
  const [name, setName]           = useState('')
  const [game, setGame]           = useState('')
  const [link, setLink]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')

  const needsGame    = type === 'character' || type === 'artwork'
  const gameProvided = gameName != null

  const handleTypeChange = (e) => {
    setType(e.target.value)
    setName('')
    setGame('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const body = JSON.stringify({
        type,
        entry_name:     name.trim(),
        game_name:      gameProvided ? gameName : (game.trim() || undefined),
        reference_link: link.trim() || undefined,
      })
      const doFetch = isLoggedIn
        ? (url, opts) => authFetch(url, opts)
        : (url, opts) => fetch(url, { ...opts, headers: { 'Content-Type': 'application/json' } })
      const res = await doFetch(`${API}/suggestions`, { method: 'POST', body })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || 'Something went wrong.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Network error — please try again.')
    }
    setSubmitting(false)
  }

  const handleClose = () => {
    setOpen(false)
    setSubmitted(false)
    setSubmitting(false)
    setError('')
    setType(types[0].value)
    setName('')
    setGame('')
    setLink('')
  }

  const canSubmit = !submitting && name.trim() && (!needsGame || gameProvided || game.trim())

  return (
    <>
      <button className="suggest-btn" onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div className="suggest-overlay" onClick={handleClose}>
          <div className="suggest-modal" onClick={(e) => e.stopPropagation()}>
            <div className="suggest-modal__header">
              <h2 className="suggest-modal__title">Suggest an Entry</h2>
              <button className="suggest-modal__close" onClick={handleClose}>✕</button>
            </div>

            {submitted ? (
              <div className="suggest-modal__success">
                <p>Thanks for your suggestion! We'll review it soon.</p>
                <button className="suggest-modal__submit" onClick={handleClose}>Close</button>
              </div>
            ) : (
              <form className="suggest-modal__body" onSubmit={handleSubmit}>
                <div className="suggest-modal__field">
                  <label className="suggest-modal__label" htmlFor="suggest-type">
                    What are you suggesting?
                  </label>
                  <select
                    id="suggest-type"
                    className="suggest-modal__select"
                    value={type}
                    onChange={handleTypeChange}
                  >
                    {types.map(({ value, label: optLabel }) => (
                      <option key={value} value={value}>{optLabel}</option>
                    ))}
                  </select>
                </div>

                <div className="suggest-modal__field">
                  <label className="suggest-modal__label" htmlFor="suggest-name">
                    {NAME_LABEL[type]}
                  </label>
                  <input
                    id="suggest-name"
                    type="text"
                    className="suggest-modal__input"
                    placeholder={NAME_PLACEHOLDER[type]}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {needsGame && !gameProvided && (
                  <div className="suggest-modal__field">
                    <label className="suggest-modal__label" htmlFor="suggest-game">
                      {type === 'character' ? 'Game they belong to' : 'Game it belongs to'}
                    </label>
                    <input
                      id="suggest-game"
                      type="text"
                      className="suggest-modal__input"
                      placeholder="e.g. Genshin Impact"
                      value={game}
                      onChange={(e) => setGame(e.target.value)}
                    />
                  </div>
                )}

                <div className="suggest-modal__field">
                  <label className="suggest-modal__label" htmlFor="suggest-link">
                    Reference link
                  </label>
                  <input
                    id="suggest-link"
                    type="text"
                    className="suggest-modal__input"
                    placeholder="Official website, YouTube, wiki..."
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                  <span className="suggest-modal__hint">Optional but helps us find it faster</span>
                </div>

                {error && <p className="suggest-modal__error">{error}</p>}

                <div className="suggest-modal__actions">
                  <button type="button" className="suggest-modal__cancel" onClick={handleClose}>
                    Cancel
                  </button>
                  <button type="submit" className="suggest-modal__submit" disabled={!canSubmit}>
                    {submitting ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
