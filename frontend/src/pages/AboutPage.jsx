import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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

const LEGAL_UPDATED = 'September 26, 2026'

const TERMS = [
  {
    title: 'Using MyGachaList',
    desc: 'By creating an account or using the site you agree to these terms and to the Community Rules above. If you do not agree, please do not use the site.',
  },
  {
    title: 'Your account',
    desc: 'You are responsible for activity on your account and for keeping your sign-in details secure. Usernames that impersonate others or break the Community Rules may be changed or removed.',
  },
  {
    title: 'Your content',
    desc: 'You keep ownership of what you post (boards, comments, reviews, notes, profile images). By posting, you give MyGachaList permission to store and display it on the site. Only post content you have the right to share.',
  },
  {
    title: 'Moderation',
    desc: 'We may remove content or suspend accounts that break these terms or the Community Rules, with or without notice. You can report content you believe breaks the rules using the report button.',
  },
  {
    title: 'Game data and third-party content',
    desc: 'Game information, media and linked-account stats come from official channels and third-party services such as enka.network. We do our best to keep it accurate but cannot guarantee it.',
  },
  {
    title: 'No warranty',
    desc: 'MyGachaList is a free fan project provided "as is". We do not guarantee the site will always be available or error-free, and we are not liable for losses arising from its use.',
  },
  {
    title: 'Changes',
    desc: 'We may update these terms. The date at the top of this section shows when they last changed; continuing to use the site after a change means you accept it.',
  },
]

const PRIVACY = [
  {
    title: 'What we collect',
    desc: 'Your email address and sign-in details (through Firebase Authentication, including Google sign-in); the username, bio, birthday, avatar and banner you add to your profile; the boards, comments, reviews, profile notes, follows and favourites you create; the in-game UIDs you link; and any reports or suggestions you submit.',
  },
  {
    title: 'What is public',
    desc: 'Your username, avatar, banner, bio, boards, comments, reviews, profile notes, follows, favourites and linked game accounts are visible to anyone, including people who are not signed in. If you add a birthday, only the month and day are shown publicly; the year is never shown to other users. Your email address is never shown publicly.',
  },
  {
    title: 'Why we use it',
    desc: 'Only to run the site: signing you in, showing your profile and content, sending you in-site notifications, looking up your linked game accounts, and moderating content. We do not sell your data, show ads, or use third-party analytics or tracking.',
  },
  {
    title: 'Who else handles it',
    desc: 'Firebase Authentication (Google) handles sign-in. Our database is hosted by Neon (AWS, us-east-2, United States) and the site runs on Google Cloud Run. When a linked game account is looked up, its UID is sent to enka.network to fetch your in-game stats.',
  },
  {
    title: 'Stored on your device',
    desc: 'The site uses your browser\'s local storage to keep you signed in and to remember small preferences such as notification read state. It does not use advertising or tracking cookies.',
  },
  {
    title: 'How long we keep it',
    desc: 'Your data is kept for as long as your account exists. You can edit or remove individual items (boards, reviews, notes, linked accounts, profile details) at any time. Our hosting providers keep short-lived server logs for security and debugging.',
  },
  {
    title: 'Deleting your account',
    desc: 'You can delete your account from your Account settings. This removes your profile and the content tied to it, along with your sign-in record. Reports and suggestions you submitted are kept for moderation but are no longer linked to you.',
  },
  {
    title: 'Your rights',
    desc: 'Depending on where you live (for example under the GDPR or CCPA), you may have the right to access, correct, delete or export your data. Most of this can be done directly from your Account settings.',
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
    <>
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

      <LegalSection
        id="terms"
        title="Terms of Service"
        intro="These terms cover your use of MyGachaList and the content you share on it."
        items={TERMS}
      />

      <LegalSection
        id="privacy"
        title="Privacy Policy"
        intro="This explains what personal data MyGachaList collects, why, who else handles it, and how to remove it."
        items={PRIVACY}
      />
    </>
  )
}

function LegalSection({ id, title, intro, items }) {
  return (
    <section id={id} className="about-section">
      <h2 className="about-section__title">{title}</h2>
      <p className="about-section__meta">Last updated {LEGAL_UPDATED}</p>
      <p className="about-section__body">{intro}</p>
      <dl className="about-features-list">
        {items.map(({ title, desc }) => (
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
  const { hash } = useLocation()
  const legalTarget = hash === '#terms' || hash === '#privacy' ? hash.slice(1) : null
  const [active, setActive] = useState(legalTarget ? 'rules' : 'about')

  // /about#terms and /about#privacy (footer, sign-up) open Rules at that section.
  useEffect(() => {
    if (legalTarget) {
      setActive('rules')
      requestAnimationFrame(() => document.getElementById(legalTarget)?.scrollIntoView())
    } else {
      window.scrollTo(0, 0)
    }
  }, [legalTarget])

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
