import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './AboutPage.css'

const FEATURES = [
  {
    title: 'Game Library',
    desc: 'Browse every supported gacha game: trailers, characters, official art, and key info all in one place.',
  },
  {
    title: 'Profiles',
    desc: 'Build your profile with favorite characters, videos, and artwork, plus link your in-game accounts to display your progress.',
  },
  {
    title: 'Community Boards',
    desc: 'Share your screenshots and artwork on per-game community boards and comment on others\'.',
  },
  {
    title: 'User Reviews',
    desc: 'Read and write honest reviews for any game. Rate out of 10 and upvote the ones you agree with.',
  },
  {
    title: 'Official Media',
    desc: 'Watch trailers, story chapters, and character demos curated directly from each game\'s official channel.',
  },
  {
    title: 'Character Database',
    desc: 'Explore detailed character rosters with rarity, element, faction, and more for each game.',
  },
]

const RULES = [
  {
    title: 'Be respectful',
    desc: 'Treat every member of the community with respect. Harassment, hate speech, and personal attacks are not tolerated.',
  },
  {
    title: 'No spam',
    desc: 'Do not flood boards, reviews, or comments with repeated or irrelevant content.',
  },
  {
    title: 'Keep content relevant',
    desc: 'Posts, boards, and reviews should relate to the game they are submitted under. Off-topic content may be removed.',
  },
  {
    title: 'No spoilers without warning',
    desc: 'Be considerate of players who have not finished the story. Mark major plot points clearly before discussing them.',
  },
  {
    title: 'Honest reviews',
    desc: 'Reviews should reflect your genuine experience with a game. Review bombing or coordinated rating manipulation is not allowed.',
  },
  {
    title: 'Appropriate content only',
    desc: 'Do not upload or share explicit, illegal, or otherwise inappropriate content. This includes board images and profile photos.',
  },
]

const FAQ = [
  {
    title: 'Is MyGachaList free to use?',
    desc: 'Yes, completely free. There are no paywalls, subscriptions, or premium tiers.',
  },
  {
    title: 'Which games are supported?',
    desc: 'We currently support Zenless Zone Zero, NIKKE, Genshin Impact, Honkai: Star Rail, and Wuthering Waves, with more games planned.',
  },
  {
    title: 'How do I link my in-game account?',
    desc: 'Head to your Profile page and open the Game Account Showcase section. Select a game, enter your UID, and your stats will be pulled automatically.',
  },
  {
    title: 'Can I edit or delete my review?',
    desc: 'Yes. Open the game page, click "Edit your review" at the top of the reviews section, and update or delete it from there.',
  },
  {
    title: 'What are community boards?',
    desc: 'Boards are your personal gallery of in-game screenshots and artwork. Each board post appears on the relevant game\'s Community tab for others to see.',
  },
  {
    title: 'Is MyGachaList affiliated with any game publisher?',
    desc: 'No. MyGachaList is an independent fan project with no affiliation to any game developer or publisher.',
  },
]

const NAV = [
  { id: 'about',  label: 'About Us' },
  { id: 'rules',  label: 'Rules' },
  { id: 'faq',    label: 'Frequently Asked' },
]

function AboutContent() {
  return (
    <>
      <section className="about-section">
        <h2 className="about-section__title">What is MyGachaList?</h2>
        <p className="about-section__body">
          Whether you're checking out a new game, keeping up with story updates, or looking for
          a community of fellow players, MyGachaList is built for you. If you ever wanted to
          have a site like MAL, Pinterest or even Letterboxd all in one place, but for Gacha
          Game specifically. You can leave dedicated reviews about the games you play, browse
          their relevant videos that come out, favorite them, and even showcase your in game
          accounts.
        </p>
      </section>

      <section className="about-section">
        <h2 className="about-section__title">What we offer</h2>
        <dl className="about-features-list">
          {FEATURES.map(({ title, desc }) => (
            <div key={title} className="about-features-list__item">
              <dt className="about-features-list__term">{title}</dt>
              <dd className="about-features-list__desc">{desc}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="about-section">
        <h2 className="about-section__title">A note on content</h2>
        <p className="about-section__body">
          MyGachaList is an independent fan project and is not affiliated with, endorsed by,
          or sponsored by any of the game publishers or developers featured on the site.
          All game names, characters, trademarks, and intellectual property belong to their
          respective owners.
        </p>
      </section>
    </>
  )
}

function RulesContent() {
  return (
    <section className="about-section">
      <h2 className="about-section__title">Community Rules</h2>
      <p className="about-section__body">
        MyGachaList is a community space. To keep it enjoyable for everyone, we ask all users
        to follow these guidelines.
      </p>
      <dl className="about-features-list">
        {RULES.map(({ title, desc }) => (
          <div key={title} className="about-features-list__item">
            <dt className="about-features-list__term">{title}</dt>
            <dd className="about-features-list__desc">{desc}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function FaqContent() {
  return (
    <section className="about-section">
      <h2 className="about-section__title">Frequently Asked Questions</h2>
      <dl className="about-features-list">
        {FAQ.map(({ title, desc }) => (
          <div key={title} className="about-features-list__item">
            <dt className="about-features-list__term">{title}</dt>
            <dd className="about-features-list__desc">{desc}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default function AboutPage() {
  const navigate = useNavigate()
  const [active, setActive] = useState('about')

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="about-page">
      <div className="about-hero">
        <div className="about-hero__inner">
          <h1 className="about-hero__title">MyGachaList</h1>
          <p className="about-hero__sub">
            Your Gacha game news, cool media and account displays all in one place.
          </p>
        </div>
      </div>

      <div className="about-body">
        <nav className="about-nav">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              className={`about-nav__item${active === id ? ' about-nav__item--active' : ''}`}
              onClick={() => setActive(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="about-content">
          {active === 'about' && <AboutContent />}
          {active === 'rules' && <RulesContent />}
          {active === 'faq'   && <FaqContent />}

          <div className="about-back">
            <button className="about-back__btn" onClick={() => navigate('/')}>
              Back to Explore
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
