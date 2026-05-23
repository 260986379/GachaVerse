// Title-based classification rules per game slug.
// classifyVideoTitle() returns a category string or null (skip this video).

const RULES = {
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
