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
        /\bAnimation\b/i,
      ],
    },
    {
      category: 'Character Demo',
      patterns: [
        /Motion Demonstration/i,
        /Costume Introduction/i,
      ],
    },
    {
      category: 'Promotional',
      patterns: [
        /Outpost[:\s]+Off-Duty Tales/i,
        /\bPV\b/,
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
