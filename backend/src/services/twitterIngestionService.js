const { query } = require('../config/db');
const config = require('../config');

// Fetches recent tweets for a given Twitter handle and stores new ones in news_articles.
// Requires a valid TWITTER_BEARER_TOKEN in .env — skips gracefully with a placeholder.
const ingestTweetsForGame = async (gameSlug, twitterHandle) => {
  if (config.TWITTER_BEARER_TOKEN.startsWith('PLACEHOLDER')) {
    console.log(`[Twitter] Skipping ingestion for @${twitterHandle} — no real Bearer Token set.`);
    return;
  }

  const { rows: gameRows } = await query('SELECT id FROM games WHERE slug=$1', [gameSlug]);
  if (!gameRows.length) return;
  const gameId = gameRows[0].id;

  // Fetch the last ingested tweet ID from ingestion_logs so we only get new ones
  const { rows: logRows } = await query(
    'SELECT last_fetched_id FROM ingestion_logs WHERE game_id=$1 AND platform=$2',
    [gameId, 'TwitterX']
  );
  const sinceId = logRows[0]?.last_fetched_id || null;

  // Twitter API v2 — recent search for tweets from a specific user
  const params = new URLSearchParams({
    query: `from:${twitterHandle} -is:retweet`,
    max_results: '10',
    'tweet.fields': 'created_at,text',
  });
  if (sinceId) params.set('since_id', sinceId);

  const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${config.TWITTER_BEARER_TOKEN}` },
  });

  if (!res.ok) {
    console.error(`[Twitter] API error for @${twitterHandle}:`, res.status, await res.text());
    return;
  }

  const data = await res.json();
  const tweets = data.data || [];
  if (!tweets.length) return;

  for (const tweet of tweets) {
    const sourceUrl = `https://twitter.com/${twitterHandle}/status/${tweet.id}`;
    // INSERT … ON CONFLICT DO NOTHING prevents duplicates via external_id uniqueness
    await query(
      `INSERT INTO news_articles (game_id, title, external_platform, external_id, source_url, published_at, is_automated, status)
       VALUES ($1,$2,'TwitterX',$3,$4,$5,TRUE,'published')
       ON CONFLICT (external_id) DO NOTHING`,
      [gameId, tweet.text.slice(0, 280), tweet.id, sourceUrl, tweet.created_at]
    );
  }

  // Update the log with the most recent tweet ID (first in the list)
  const newestId = tweets[0].id;
  await query(
    `INSERT INTO ingestion_logs (game_id, platform, last_fetched_id, last_run_at, status)
     VALUES ($1,'TwitterX',$2,NOW(),'success')
     ON CONFLICT (game_id, platform) DO UPDATE SET last_fetched_id=$2, last_run_at=NOW(), status='success'`,
    [gameId, newestId]
  );

  console.log(`[Twitter] Ingested ${tweets.length} tweet(s) for @${twitterHandle}`);
};

const runTwitterIngestion = async () => {
  try {
    await ingestTweetsForGame('zenless-zone-zero', config.ZZZ_TWITTER_HANDLE);
    await ingestTweetsForGame('nikke', config.NIKKE_TWITTER_HANDLE);
  } catch (err) {
    console.error('[Twitter] Ingestion error:', err.message);
  }
};

module.exports = { runTwitterIngestion };
