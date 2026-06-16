import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAMES } from '../data/games'
import { loadYTApi } from '../utils/ytApi'
import './ConcertHallPage.css'

const API = import.meta.env.VITE_API_URL || '/api'
const ROUND_OPTIONS = [5, 6, 7, 8, 9, 10]

/* ── Guess checking ──────────────────────────────────────── */

// Words too generic to count as a track title guess
const STOP_WORDS = new Set([
  'bgm', 'theme', 'themesong', 'song', 'songs', 'ep', 'full', 'ver',
  'version', 'official', 'mv', 'pv', 'ost', 'soundtrack', 'opening',
  'ending', 'insert', 'prod', 'the', 'a', 'an', 'and', 'or', 'of',
  'in', 'on', 'at', 'to', 'for', 'from', 'with', 'by', 'ft', 'feat',
  'featuring',
])

// Alias → game slug (all lowercase keys)
const GAME_ALIASES = [
  ['zenless zone zero', 'zenless-zone-zero'],
  ['zenless',           'zenless-zone-zero'],
  ['zzz',               'zenless-zone-zero'],
  ['nikke',             'nikke'],
  ['goddess of victory','nikke'],
  ['honkai star rail',  'honkai-star-rail'],
  ['honkai starrail',   'honkai-star-rail'],
  ['star rail',         'honkai-star-rail'],
  ['hsr',               'honkai-star-rail'],
  ['wuthering waves',   'wuthering-waves'],
  ['wuwa',              'wuthering-waves'],
  ['wuthering',         'wuthering-waves'],
  ['genshin impact',    'genshin-impact'],
  ['genshin',           'genshin-impact'],
  ['blue archive',      'blue-archive'],
  ['arknights',         'arknights'],
  ['reverse 1999',      'reverse-1999'],
  ['limbus company',    'limbus-company'],
  ['limbus',            'limbus-company'],
]

function norm(s) {
  return s.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function sigWords(s) {
  return norm(s).split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w))
}

// Game-name suffixes that appear after " | " as attribution (not the track name)
const GAME_ATTRIB_RE = /^(?:honkai[\s:]+star rail|zenless zone zero|wuthering waves|genshin impact|nikke[\s:]|blue archive|arknights|reverse[\s:]+1999|limbus company)/i

// Pull the actual track name from a video title using multiple strategies
function extractTrackName(title) {
  // 1. Quoted / bracketed text — most reliable
  // For 「」, scan all matches and skip ones that are just a game name attribution
  const kakkoMatches = [...title.matchAll(/「([^」]{2,})」/g)].map(m => m[1].trim())
  const trackKakko = kakkoMatches.find(m => !GAME_ATTRIB_RE.test(m))
  if (trackKakko) return trackKakko

  const quoted = [/"([^"]{2,})"/, /"([^"]{2,})"/, /''([^']{2,})''/]
  for (const p of quoted) {
    const m = title.match(p)
    if (m) return m[1].trim()
  }

  // 2. Pipe separator — two sub-cases
  const pipeM = title.match(/\|\s*([^|]+?)\s*$/)
  if (pipeM) {
    const afterPipe = pipeM[1].trim()

    if (GAME_ATTRIB_RE.test(afterPipe)) {
      // Pipe tail is a game name (e.g. "EP: Hope Is the Thing With Feathers | Honkai: Star Rail")
      // → extract track name from before the pipe
      const beforePipe = title.slice(0, title.lastIndexOf('|')).trim()
      const c = beforePipe
        .replace(/^(?:EP|Music Video|MV)\s*[:\s]+/i, '')          // strip "EP: " prefix
        .replace(/\s*[-–—]\s*(?:Live|Official|Dance|Concert|Animated|Short|Full|Motion)\b.*/i, '') // strip descriptor
        .replace(/#\S+/g, '')                                       // strip hashtags
        .trim()
      if (c.length >= 2) return c
    } else {
      // Pipe separates track name (WuWa pattern: "EP 1.1 | Thawing Fates")
      let c = afterPipe
      if (/Theme Song/i.test(c)) {
        const dash = c.match(/[-–—]\s*(.+)$/)
        if (dash) c = dash[1].trim()
      }
      c = c.replace(/\s+Full\b.*/i, '').trim()
      if (c.length >= 2) return c
    }
  }

  // 3. "EP: Track Name" without a pipe (e.g. "Honkai: Star Rail EP: Proi Proi")
  const epColonM = title.match(/\bEP\s*:\s+(.+?)(?:\s*[|—–]\s*|$)/i)
  if (epColonM) {
    const c = epColonM[1].trim()
    if (c.length >= 2) return c
  }

  // 4. Meaningful text AFTER "Theme Song" / "BGM"
  //    "QUEEN BEE Theme Song Headless Angel Full Ver." → "Headless Angel"
  const afterM = title.match(
    /\b(?:Theme Song|BGM)\b\s+([A-Za-z぀-鿿0-9\s'!?,._]{2,}?)(?:\s+Full\b|\s*[-–—]\s*|\s*\|\s*|$)/i
  )
  if (afterM) {
    const c = afterM[1].trim()
    if (c.length >= 2 && !/^Full/i.test(c)) return c
  }

  // 5. Text BEFORE "Theme Song" / "BGM" / "Story Event" / "Opening" / "Ending"
  //    "RED ASH Theme Song Full Ver." → "RED ASH"
  const beforeM = title.match(/^(.+?)\s+(?:Theme Song|BGM|Story Event|Opening|Ending)\b/i)
  if (beforeM) {
    const c = beforeM[1]
      .replace(/^(?:NIKKE|Zenless Zone Zero|Zenless|Genshin Impact|Genshin|Honkai[\s:]+Star Rail|Wuthering Waves)[:\s,x\d.]*\s*/i, '')
      .trim()
    if (c.length >= 2 && !/^\d[\d.x]*$/.test(c)) return c
  }

  return null
}

function checkGuess(guess, video) {
  const trackName = extractTrackName(video.title)
  if (!guess.trim()) return { gameCorrect: false, titleCorrect: false, points: 0, trackName }

  const g = norm(guess)

  // Game check — two strategies, either one winning is enough

  // 1. Alias map (handles abbreviations like zzz, hsr, wuwa)
  const sortedAliases = [...GAME_ALIASES].sort((a, b) => b[0].length - a[0].length)
  const aliasHit = sortedAliases.some(([alias, slug]) =>
    slug === video.game_slug && g.includes(alias)
  )

  // 2. Direct game name match — every significant word in the guess must appear
  //    in the normalised game name (e.g. "nikke" in "nikke goddess of victory")
  const nameTokens  = norm(video.game_name).split(' ').filter(w => w.length > 1)
  const guessTokens = g.split(' ').filter(w => w.length > 1 && !STOP_WORDS.has(w))
  const nameHit = guessTokens.length > 0 &&
    guessTokens.every(gt => nameTokens.some(nt => nt === gt || nt.startsWith(gt)))

  // Title check (computed before gameCorrect so a correct title also credits the game)
  let titleCorrect = false
  if (trackName) {
    const trackWords = sigWords(trackName)
    const guessWords = sigWords(guess)
    if (trackWords.length > 0 && guessWords.length > 0) {
      const matches = trackWords.filter(tw =>
        guessWords.some(gw => gw === tw || gw.includes(tw) || tw.includes(gw))
      ).length
      titleCorrect = matches / trackWords.length >= (trackWords.length === 1 ? 1.0 : 0.7)
    }
  }

  // 3. Character / prominent name in the video title
  //    "Caesar EP - 'pinKing'" → guessing "Caesar" credits ZZZ
  //    Scoped to THIS video's title so cross-game false positives can't happen
  const titleTokens      = norm(video.title).split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w))
  const guessTitleTokens = g.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w))
  const titleNameHit = guessTitleTokens.length > 0 &&
    guessTitleTokens.every(gt => titleTokens.some(tt => tt === gt))

  const gameCorrect = aliasHit || nameHit || titleCorrect || titleNameHit

  const points = (gameCorrect ? 100 : 0) + (titleCorrect ? 50 : 0)
  return { gameCorrect, titleCorrect, points, trackName }
}

/* ── Round indicator ─────────────────────────────────────── */

function RoundIndicator({ current, total }) {
  return (
    <div className="ch-round-indicator">
      <div className="ch-round-dots">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`ch-round-dot${
              i < current - 1 ? ' ch-round-dot--done' :
              i === current - 1 ? ' ch-round-dot--active' : ''
            }`}
          />
        ))}
      </div>
      <span className="ch-round-label">Round {current} / {total}</span>
    </div>
  )
}

/* ── Waveform visualizer ─────────────────────────────────── */

function WaveformVisualizer() {
  return (
    <div className="ch-waveform">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="ch-waveform-bar" style={{ animationDelay: `${i * 0.09}s` }} />
      ))}
    </div>
  )
}

/* ── Timer ring ──────────────────────────────────────────── */

function TimerRing({ seconds, total }) {
  const r    = 36
  const circ = 2 * Math.PI * r
  const frac = Math.max(seconds / total, 0)
  const color = seconds > 10 ? '#7c3aed' : seconds > 5 ? '#d97706' : '#dc2626'
  return (
    <svg className="ch-timer-ring" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle
        cx="44" cy="44" r={r} fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - frac)}
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s' }}
      />
      <text x="44" y="44" textAnchor="middle" dominantBaseline="central"
        fill="#fff" fontSize="15" fontWeight="700" fontFamily="inherit"
      >
        {seconds}
      </text>
    </svg>
  )
}

/* ── Reveal bar ──────────────────────────────────────────── */

function RevealBar({ video, result, countdown, score, onNext }) {
  const game = GAMES.find(g => g.id === video.game_slug)
  return (
    <div className="ch-reveal-bar">
      <div className="ch-reveal-answers">

        <div className={`ch-reveal-item${result.gameCorrect ? ' ch-reveal-item--hit' : ''}`}>
          <span className="ch-reveal-dot" style={{ background: game?.color1 ?? '#888' }} />
          <div className="ch-reveal-item-body">
            <span className="ch-reveal-item-label">Game</span>
            <span className="ch-reveal-item-value">{video.game_name}</span>
          </div>
          {result.gameCorrect
            ? <span className="ch-reveal-pts ch-reveal-pts--game">+100</span>
            : <span className="ch-reveal-miss">✕</span>}
        </div>

        {result.trackName && (
          <div className={`ch-reveal-item${result.titleCorrect ? ' ch-reveal-item--hit' : ''}`}>
            <span className="ch-reveal-note-icon">♪</span>
            <div className="ch-reveal-item-body">
              <span className="ch-reveal-item-label">Track</span>
              <span className="ch-reveal-item-value">{result.trackName}</span>
            </div>
            {result.titleCorrect
              ? <span className="ch-reveal-pts ch-reveal-pts--track">+50</span>
              : <span className="ch-reveal-miss">✕</span>}
          </div>
        )}

      </div>

      <div className="ch-reveal-right">
        <span className="ch-reveal-round-pts">
          {result.points > 0 ? `+${result.points} pts` : 'No points'}
        </span>
        <span className="ch-reveal-total">Total: {score}</span>
        <button className="ch-next-btn" onClick={onNext}>
          Next
          {countdown > 0 && <span className="ch-next-count">{countdown}</span>}
        </button>
      </div>
    </div>
  )
}

/* ── Game over screen ────────────────────────────────────── */

function GameOverScreen({ score, total, playedRounds, onPlayAgain, onExit }) {
  const navigate = useNavigate()

  return (
    <div className="ch-gameover">
      <span className="ch-gameover__icon">🎵</span>
      <h2 className="ch-gameover__title">Game Over</h2>
      <p className="ch-gameover__score">{score} pts</p>
      <p className="ch-gameover__sub">across {total} rounds</p>

      {playedRounds.length > 0 && (
        <div className="ch-gameover__tracklist">
          {playedRounds.map(({ video, result }, i) => (
            <div
              key={i}
              className={`ch-gameover__track${result.points > 0 ? ' ch-gameover__track--scored' : ''}`}
            >
              <div
                className="ch-gameover__track-bg"
                style={{ backgroundImage: `url(https://img.youtube.com/vi/${video.external_id}/mqdefault.jpg)` }}
              />
              <div className="ch-gameover__track-overlay" />
              <span className="ch-gameover__track-num">{i + 1}</span>
              <div className="ch-gameover__track-info">
                <span className="ch-gameover__track-name">
                  {result.trackName || video.title}
                </span>
                <span className="ch-gameover__track-game">{video.game_name}</span>
              </div>
              <span className="ch-gameover__track-pts">
                {result.points > 0 ? `+${result.points}` : '—'}
              </span>
              <button
                className="ch-gameover__track-arrow"
                onClick={() => {
                  const url = new URL(`/game/${video.game_slug}`, window.location.origin)
                  url.searchParams.set('tab', 'Official Videos')
                  url.searchParams.set('video', video.external_id)
                  window.open(url.toString(), '_blank', 'noopener,noreferrer')
                }}
                title="View in Official Videos"
              >›</button>
            </div>
          ))}
        </div>
      )}

      <div className="ch-gameover__actions">
        <button className="ch-btn ch-btn--primary" onClick={onPlayAgain}>Play Again</button>
        <button className="ch-btn ch-btn--ghost" onClick={onExit}>Exit</button>
      </div>
    </div>
  )
}

/* ── Game session ────────────────────────────────────────── */

const GUESS_TIME = 30

function GameSession({ config, onExit, onPlayAgain }) {
  const [videos,       setVideos]       = useState(null)
  const [fetchError,   setFetchError]   = useState(null)
  const [roundIndex,   setRoundIndex]   = useState(0)
  const [phase,        setPhase]        = useState('round')
  const [guess,        setGuess]        = useState('')
  const [score,        setScore]        = useState(0)
  const [roundResult,  setRoundResult]  = useState(null)
  const [guessTimer,   setGuessTimer]   = useState(GUESS_TIME)
  const [revealCount,  setRevealCount]  = useState(GUESS_TIME)
  const [playedRounds, setPlayedRounds] = useState([])

  const playerWrapRef  = useRef(null)
  const playerRef      = useRef(null)
  const playerReadyRef = useRef(false)
  const firstRound     = useRef(true)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // ── Fetch videos ──
  useEffect(() => {
    const params = new URLSearchParams({ count: config.rounds })
    if (config.source === 'specific' && config.games.length > 0) {
      params.set('source', 'specific')
      params.set('games', config.games.join(','))
    } else {
      params.set('source', 'all')
    }
    fetch(`${API}/concert-hall/videos?${params}`)
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw Object.assign(new Error(r.status), { status: r.status, body })
        }
        return r.json()
      })
      .then(data => setVideos(data))
      .catch(err => {
        console.error('[ConcertHall] fetch error', err)
        setFetchError(
          err.status === 404
            ? (err.body?.message || 'No music videos found for the selected games.')
            : `Could not load videos (${err.status ?? 'network error'}). Is the backend running?`
        )
      })
  }, [])

  // ── Mount YT player once videos are ready ──
  useEffect(() => {
    if (!videos || !playerWrapRef.current) return
    const wrap = playerWrapRef.current
    const container = document.createElement('div')
    wrap.appendChild(container)

    loadYTApi(() => {
      if (!wrap.isConnected) return
      playerRef.current = new window.YT.Player(container, {
        width: '100%', height: '100%',
        videoId: videos[0].external_id,
        playerVars: {
          autoplay: 1, controls: 0, rel: 0,
          modestbranding: 1, playsinline: 1,
          start: videos[0].highlight_start || 0,
        },
        events: {
          onReady: (e) => { playerReadyRef.current = true; e.target.playVideo() },
        },
      })
    })

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
      playerReadyRef.current = false
      container.remove()
    }
  }, [videos])

  // ── Load next video when round changes ──
  useEffect(() => {
    if (firstRound.current) { firstRound.current = false; return }
    if (!playerRef.current || !videos) return
    const v = videos[roundIndex]
    playerRef.current.loadVideoById({ videoId: v.external_id, startSeconds: v.highlight_start || 0 })
  }, [roundIndex])

  // ── On reveal: seek back to highlight timestamp ──
  useEffect(() => {
    if (phase !== 'reveal' || !playerRef.current || !playerReadyRef.current || !videos) return
    const v = videos[roundIndex]
    playerRef.current.seekTo(v.highlight_start || 0, true)
    playerRef.current.playVideo()
  }, [phase])

  // ── 20-second guess timer ──
  useEffect(() => {
    if (phase !== 'round') return
    if (guessTimer <= 0) {
      const v = videos?.[roundIndex]
      endRound({ gameCorrect: false, titleCorrect: false, points: 0, trackName: v ? extractTrackName(v.title) : null })
      return
    }
    const t = setTimeout(() => setGuessTimer(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, guessTimer])

  // ── Reveal countdown (auto-advance) ──
  useEffect(() => {
    if (phase !== 'reveal') return
    if (revealCount <= 0) { advanceRound(); return }
    const t = setTimeout(() => setRevealCount(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, revealCount])

  const totalRounds  = videos ? videos.length : config.rounds
  const currentVideo = videos?.[roundIndex]

  function endRound(result) {
    setScore(s => s + result.points)
    setRoundResult(result)
    setRevealCount(GUESS_TIME)
    setPlayedRounds(prev => [...prev, { video: videos[roundIndex], result }])
    setPhase('reveal')
  }

  function advanceRound() {
    if (roundIndex < totalRounds - 1) {
      setRoundIndex(i => i + 1)
      setGuess('')
      setRoundResult(null)
      setGuessTimer(GUESS_TIME)
      setPhase('round')
    } else {
      setPhase('gameover')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (phase !== 'round' || !guess.trim() || !currentVideo) return
    endRound(checkGuess(guess, currentVideo))
  }

  const handleSkip = () => {
    if (phase !== 'round' || !currentVideo) return
    endRound({ gameCorrect: false, titleCorrect: false, points: 0, trackName: extractTrackName(currentVideo.title) })
  }

  // ── Loading / error ──
  if (!videos && !fetchError) {
    return <div className="ch-session ch-session--loading"><p className="ch-loading-text">Loading songs…</p></div>
  }
  if (fetchError) {
    return (
      <div className="ch-session ch-session--loading">
        <p className="ch-loading-text">{fetchError}</p>
        <button className="ch-btn ch-btn--primary" style={{ marginTop: '1rem' }} onClick={onExit}>Go Back</button>
      </div>
    )
  }

  // ── Game over ──
  if (phase === 'gameover') {
    return (
      <div className="ch-session">
        <GameOverScreen score={score} total={totalRounds} playedRounds={playedRounds} onPlayAgain={onPlayAgain} onExit={onExit} />
      </div>
    )
  }

  return (
    <div className={`ch-session${phase === 'reveal' ? ' ch-session--reveal' : ''}`}>

      <header className="ch-session__header">
        <RoundIndicator current={roundIndex + 1} total={totalRounds} />
      </header>
      <div className="ch-session__subheader">
        <button className="ch-session__exit" onClick={onExit}>Exit Game</button>
        <span className="ch-session__score">Score: {score}</span>
      </div>

      <div className="ch-session__video-area">
        <div className="ch-player-container">

          {/* Ambient glow — reveal phase only */}
          {phase === 'reveal' && currentVideo && (
            <div
              className="ch-ambient"
              style={{ backgroundImage: `url(https://img.youtube.com/vi/${currentVideo.external_id}/maxresdefault.jpg)` }}
            />
          )}

          <div className="ch-session__player-wrap">
            {/* YT player mounts here */}
            <div ref={playerWrapRef} className="ch-player-inner" />

            {/* Overlay covers video during guessing */}
            {phase === 'round' && (
              <div className="ch-player-overlay">
                <WaveformVisualizer />
                <TimerRing seconds={guessTimer} total={GUESS_TIME} />
              </div>
            )}
          </div>

        </div>
      </div>

      {phase === 'round' ? (
        <div className="ch-session__chat-area">
          <form className="ch-guess-form" onSubmit={handleSubmit}>
            <span className="ch-guess-icon">🎵</span>
            <input
              className="ch-guess-input"
              placeholder="Guess the game or track name…"
              value={guess}
              onChange={e => setGuess(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </form>
          <button type="button" className="ch-skip-btn" onClick={handleSkip}>
            Skip
            <svg className="ch-skip-icon" viewBox="0 0 16 16" fill="none">
              <path d="M3 4l6 4-6 4V4zM13 4v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : (
        <RevealBar
          video={currentVideo}
          result={roundResult}
          countdown={revealCount}
          score={score}
          onNext={advanceRound}
        />
      )}

    </div>
  )
}

/* ── Page ────────────────────────────────────────────────── */

export default function ConcertHallPage() {
  const [session,        setSession]        = useState(null)
  const [sessionKey,     setSessionKey]     = useState(0)
  const [optionsOpen,    setOptionsOpen]    = useState(false)
  const [source,         setSource]         = useState('all')
  const [selectedGames,  setSelectedGames]  = useState([])
  const [rounds,         setRounds]         = useState(8)
  const [gamesWithVideos, setGamesWithVideos] = useState([])

  useEffect(() => { window.scrollTo(0, 0) }, [])

  useEffect(() => {
    fetch(`${API}/games/latest-video-dates`)
      .then(r => r.json())
      .then(data => {
        const slugsWithVideos = new Set(data.filter(d => d.latest_published_at).map(d => d.slug))
        setGamesWithVideos(GAMES.filter(g => slugsWithVideos.has(g.id) && g.id !== 'genshin-impact'))
      })
      .catch(() => setGamesWithVideos(GAMES.filter(g => g.id !== 'genshin-impact')))
  }, [])

  const toggleGame = (id) => {
    setSource('specific')
    setSelectedGames(prev => {
      const next = prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
      if (next.length === 0) setSource('all')
      return next
    })
  }

  const canStart = source === 'all' || selectedGames.length > 0

  if (session) {
    return (
      <GameSession
        key={sessionKey}
        config={session}
        onExit={() => setSession(null)}
        onPlayAgain={() => setSessionKey(k => k + 1)}
      />
    )
  }

  return (
    <div className="ch-page">
      <div className="ch-page__bg" />

      <div className="ch-page__content">

        {/* Hero */}
        <div className="ch-hero">
          <span className="ch-hero__icon">🎵</span>
          <h1 className="ch-hero__title">Concert Hall</h1>
          <p className="ch-hero__desc">
            Eight rounds. One song plays. Guess the game it&apos;s from — and name the
            track for bonus points.
          </p>
          <button
            className={`ch-btn ch-btn--primary ch-hero__cta${optionsOpen ? ' ch-hero__cta--open' : ''}`}
            onClick={() => setOptionsOpen(o => !o)}
          >
            {optionsOpen ? 'Cancel' : 'Create Session'}
          </button>
        </div>

        {/* Inline options */}
        {optionsOpen && (
          <div className="ch-options">

            <div className="ch-options__section">
              <span className="ch-options__label">Games</span>
              <div className="ch-game-cards">

                {/* All Games card */}
                <button
                  type="button"
                  className={`ch-game-card ch-game-card--all${source === 'all' ? ' ch-game-card--selected' : ''}`}
                  onClick={() => { setSource('all'); setSelectedGames([]) }}
                >
                  <span className="ch-game-card__name">All Games</span>
                </button>

                {/* Per-game cards */}
                {gamesWithVideos.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    className={`ch-game-card${selectedGames.includes(g.id) ? ' ch-game-card--selected' : ''}`}
                    style={{ '--gc': g.color1 }}
                    onClick={() => toggleGame(g.id)}
                  >
                    <span className="ch-game-card__dot" />
                    <span className="ch-game-card__name">{g.name}</span>
                  </button>
                ))}

              </div>
            </div>

            <div className="ch-options__section">
              <span className="ch-options__label">Rounds</span>
              <div className="ch-pill-row">
                {ROUND_OPTIONS.map(n => (
                  <button
                    key={n} type="button"
                    className={`ch-pill${rounds === n ? ' ch-pill--active' : ''}`}
                    onClick={() => setRounds(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="ch-btn ch-btn--primary"
              disabled={!canStart}
              onClick={() => { setSession({ source, games: selectedGames, rounds }); setOptionsOpen(false) }}
            >
              Start Game
            </button>

          </div>
        )}

      </div>
    </div>
  )
}
