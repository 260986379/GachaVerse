/**
 * Makes googleRanges.refresh() hermetic.
 *
 * The real implementation fetches Google's published prefix list over the
 * network. Tests must not depend on that: a CI runner without egress, or a
 * transient gstatic hiccup, would fail suites that are actually about client-IP
 * resolution. Stubbing fetch keeps the assertions deterministic.
 *
 * The fixture is a real subset of the published list, and deliberately includes
 * 66.102.0.0/20 — the edge range observed serving this project's Firebase
 * Hosting traffic in production.
 */
const fixture = require('../fixtures/google-ranges.json');

let original = null;

const install = () => {
  if (original) return;
  original = global.fetch;
  global.fetch = async (url) => {
    if (typeof url === 'string' && url.includes('gstatic.com/ipranges')) {
      return { ok: true, status: 200, json: async () => fixture };
    }
    throw new Error('Unexpected network call in tests: ' + url);
  };
};

const restore = () => {
  if (!original) return;
  global.fetch = original;
  original = null;
};

module.exports = { install, restore, fixture };
