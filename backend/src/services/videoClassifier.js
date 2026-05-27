// Title-based classification rules per game slug.
// classifyVideoTitle() returns a category string or null (skip this video).

const RULES = {
  'nikke': [
    {
      category: null, // exclude — never store these
      patterns: [
        /\blivestream\b/i,
        /\binterview\b/i,
      ],
    },
    {
      category: 'Main Story',
      patterns: [
        /Main Story Chapter/i,
        /Main Chapter/i,
      ],
    },
    {
      category: 'Music',
      patterns: [
        /Theme Song/i,
        /\bBGM\b/,
      ],
    },
    {
      category: 'Anniversary',
      patterns: [
        /\bAnniversary\b/i,
      ],
    },
    {
      category: 'Opening',
      patterns: [
        /\bOpening\b/i,
      ],
    },
    {
      category: 'Collaboration',
      patterns: [
        /\bCollab(?:oration)?\b/i,
      ],
    },
    {
      category: 'ASMR',
      patterns: [
        /\bASMR\b/i,
      ],
    },
    {
      category: 'Animation',
      patterns: [
        /Outpost[:\s]+Off-Duty Tales/i,
        /\bAnimation\b/i,
      ],
    },
    {
      category: 'Character Demo',
      patterns: [
        /Motion Demonstration/i,
      ],
    },
    {
      category: 'Costume Showcase',
      patterns: [
        /Costume Introduction/i,
      ],
    },
    {
      category: 'Promotional',
      patterns: [
        /\bPV\b/,
      ],
    },
  ],
  'wuthering-waves': [
    // — Exclusions —
    {
      category: null,
      patterns: [
        /\blivestream\b/i,
        /special program/i,
        /Dev Talk/i,
      ],
    },
    // — Main Story Updates: Narrative Recaps + version trailers/teasers.
    //   No ^ anchor — WW titles are prefixed with "Wuthering Waves | " so they
    //   never start directly with "Version". —
    {
      category: 'Main Story',
      patterns: [
        /Narrative Recap/i,
        /\bVersion\b.*\b(?:Trailer|Teaser)\b/i,
      ],
    },
    // — Resonator Showcase (before Version exclusion so showcase titles with
    //   "[Version X.X]" in brackets aren't accidentally excluded) —
    {
      category: 'Resonator Showcase',
      patterns: [
        /Resonator Showcase/i,
        /Combat Showcase/i,
        /Outfit Showcase/i,
      ],
    },
    // — Cinematics: Story Cinematics (plural), Cinematic Shorts, Special Cinematics —
    {
      category: 'Cinematic',
      patterns: [
        /\bCinematics?\b/i,
        /\bStory CG\b/i,
      ],
    },
    // — Animations —
    {
      category: 'Animation',
      patterns: [
        /\bAnimation\b/i,
      ],
    },
    // — Music/BGM: EP releases, Special Choir, Fleet Snowfluff music —
    // \bEP(?:[\d.]|\b) catches both "EP 2.0" and "EP3.3" (digit attached directly)
    {
      category: 'Music',
      patterns: [
        /\bEP(?:[\d.]|\b)/,
        /Special Choir/i,
        /Fleet Snowfluff/i,
      ],
    },
    // — Midnight Podcast —
    {
      category: 'Midnight Podcast',
      patterns: [
        /Midnight Podcast/i,
      ],
    },
    // — Collaboration —
    {
      category: 'Collaboration',
      patterns: [
        /\bCollab(?:oration)?\b/i,
      ],
    },
    // — Remaining Version## videos (dev logs, announcements, patch notes, etc.)
    //   Must be last so specific categories above can match first. No ^ anchor
    //   for the same reason as Main Story above. —
    {
      category: null,
      patterns: [
        /\bVersion\b/i,
      ],
    },
  ],

  'genshin-impact': [
    // — Exclusions —
    {
      category: null,
      patterns: [
        /\blivestream\b/i,
        /special program/i,
        /events overview/i,
        /\bextract\b/i,
        /\bexcerpt\b/i,
        /character showcase/i,
      ],
    },
    // — Character Demos (before generic Trailer/Teaser to avoid misclassification) —
    {
      category: 'Character Demo',
      patterns: [
        /Character Trailer/i,
        /Character Teaser/i,
        /Character Anecdote/i,
        /Collected Miscellany/i,
        /Character Demo/i,
      ],
    },
    // — Cinematics —
    {
      category: 'Cinematic',
      patterns: [
        /Cutscene Animation/i,
      ],
    },
    // — Animations —
    {
      category: 'Animation',
      patterns: [
        /Animated Short/i,
      ],
    },
    // — Music/BGM —
    {
      category: 'Music',
      patterns: [
        /Theme Song/i,
        /Live Performance/i,
      ],
    },
    // — Main Story Updates: version-prefixed trailers/teasers ("Version 5.1 '...' Trailer")
    //   Must come before the generic Trailer rule so they're split out correctly —
    {
      category: 'Main Story',
      patterns: [
        /^Version\b.*\b(?:Trailer|Teaser)\b/i,
      ],
    },
    // — Trailers: non-version teasers, story teasers, gamescom, etc. —
    {
      category: 'Trailer',
      patterns: [
        /Preview Teaser/i,
        /Story Teaser/i,
        /\bTrailer\b/i,
        /gamescom/i,
      ],
    },
    // — Remaining Version videos (no trailer/teaser keyword) excluded —
    {
      category: null,
      patterns: [
        /^Version\b/i,
      ],
    },
  ],

  'honkai-star-rail': [
    // — Exclusions —
    {
      category: null,
      patterns: [
        /\blivestream\b/i,
        /special program/i,
      ],
    },
    // — Main Story: Version trailers/teasers —
    {
      category: 'Main Story',
      patterns: [
        /\bVersion\b.*\b(?:Trailer|Teaser)\b/i,
      ],
    },
    // — Music Videos with version numbers (before Version exclusion) —
    {
      category: 'Music',
      patterns: [
        /Music Video/i,
      ],
    },
    // — Remaining Version videos (patch notes, dev diaries, etc.) excluded —
    {
      category: null,
      patterns: [
        /\bVersion\b/i,
      ],
    },
    // — Myriad Celestia (before generic Trailer rule) —
    {
      category: 'Myriad Celestia',
      patterns: [
        /Myriad Celestia/i,
      ],
    },
    // — Midnight Carriage excluded —
    {
      category: null,
      patterns: [
        /Midnight Carriage/i,
      ],
    },
    // — A Moment Among the Stars episodes first — some have "Collab" in the title —
    {
      category: 'Animation',
      patterns: [
        /A Moment Among the Stars/i,
      ],
    },
    // — Collaboration (before generic Trailer to avoid collab trailers going to Character Demo) —
    {
      category: 'Collaboration',
      patterns: [
        /\bCollab(?:oration)?\b/i,
      ],
    },
    // — Animation concept trailers (before generic Trailer so they don't land in Character Demo) —
    {
      category: 'Animation',
      patterns: [
        /Concept Trailer/i,
      ],
    },
    // — Character Demo: explicit keywords + generic Trailer (non-version, non-collab) —
    {
      category: 'Character Demo',
      patterns: [
        /Character Trailer/i,
        /Character Demo/i,
        /Character Teaser/i,
        /\bTrailer\b/i,
      ],
    },
    // — Animation: Animated Shorts, PVs, general animations, A Moment Among the Stars —
    {
      category: 'Animation',
      patterns: [
        /Animated Short/i,
        /A Moment Among the Stars/i,
        /\bPV\b/,
        /\bAnimation\b/i,
      ],
    },
    // — Music/BGM: EPs, Theme Songs, Concerts —
    {
      category: 'Music',
      patterns: [
        /\bEP(?:[\d.]|\b)/,
        /Theme Song/i,
        /\bConcert\b/i,
      ],
    },
  ],

  'zenless-zone-zero': [
    {
      category: 'Character Demo',
      patterns: [
        /Character\s+Demo/i,
        /Character\s+Teaser/i,
      ],
    },
    {
      category: 'Trailer',
      patterns: [
        /Season\s+\d+\s+Teaser/i,
        /Version\s+[\d.]+\s+Teaser/i,
        /Ver\.\s*[\d.]+\s+Teaser/i,
      ],
    },
    {
      category: 'Cinematic',
      patterns: [
        /Cutscene/i,
      ],
    },
    {
      category: 'Music',
      patterns: [
        /\bEP\b/,
      ],
    },
  ],
};

/**
 * Returns the matching category for a video title, or null if no rule matches.
 * Rules are checked in order — first match wins.
 */
function classifyVideoTitle(gameSlug, title) {
  const rules = RULES[gameSlug] || [];
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(title))) {
      return rule.category;
    }
  }
  return null;
}

module.exports = { classifyVideoTitle, RULES };
