/**
 * Enriches Music-category videos with a highlight_start timestamp
 * pulled from YouTube's "Most Replayed" heatmap via yt-dlp.
 *
 * HOW TO USE:
 *   node backend/scripts/enrichHighlights.js
 *
 * Prerequisites:
 *   - yt-dlp must be installed and on PATH  (https://github.com/yt-dlp/yt-dlp)
 *   - Run once; safe to re-run — already-enriched videos are skipped unless
 *     you pass --force to re-fetch everything.
 *
 * What it does:
 *   1. Adds highlight_start INTEGER column to media_content (idempotent).
 *   2. For every published Music video without a highlight_start, fetches
 *      the yt-dlp JSON dump and finds the peak of the heatmap array.
 *   3. Stores that timestamp (seconds) back into the DB.
 *   4. Waits 2 s between requests to avoid rate-limiting.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { exec }          = require('child_process');
const { promisify }     = require('util');
const { query, testConnection } = require('../src/config/db');

const execAsync = promisify(exec);
const DELAY_MS  = 2000;
const FORCE     = process.argv.includes('--force');

// ── Resolve yt-dlp binary ─────────────────────────────────────────────────────

function resolveYtDlp() {
  // Common locations when not on PATH (e.g. WinGet install on Windows)
  const candidates = [
    'yt-dlp',
    `${process.env.LOCALAPPDATA}\\Microsoft\\WinGet\\Packages\\yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe\\yt-dlp.exe`,
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];
  const { execFileSync } = require('child_process');
  for (const bin of candidates) {
    try {
      execFileSync(bin, ['--version'], { stdio: 'ignore', timeout: 5000 });
      return bin;
    } catch {}
  }
  throw new Error('yt-dlp not found. Install it: https://github.com/yt-dlp/yt-dlp#installation');
}

const YTDLP = resolveYtDlp();
console.log(`Using yt-dlp: ${YTDLP}\n`);

// ── Fetch heatmap peak from yt-dlp ────────────────────────────────────────────

async function getHighlightStart(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  // Quote path in case it contains spaces
  const bin = YTDLP.includes(' ') ? `"${YTDLP}"` : YTDLP;
  try {
    const { stdout } = await execAsync(
      `${bin} -j --skip-download --no-playlist --quiet "${url}"`,
      { timeout: 45000 }
    );

    const info    = JSON.parse(stdout.trim());
    const heatmap = info.heatmap;

    if (!Array.isArray(heatmap) || heatmap.length === 0) return null;

    // Find the segment with the highest replay value
    const peak = heatmap.reduce((best, seg) =>
      seg.value > best.value ? seg : best
    );

    return Math.round(peak.start_time);
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const main = async () => {
  await testConnection();

  // Ensure column exists
  await query(`
    ALTER TABLE media_content
    ADD COLUMN IF NOT EXISTS highlight_start INTEGER
  `);

  const whereExtra = FORCE ? '' : 'AND mc.highlight_start IS NULL';

  const { rows } = await query(`
    SELECT mc.id, mc.external_id, mc.title, g.name AS game_name
    FROM   media_content mc
    JOIN   games g ON g.id = mc.game_id
    WHERE  mc.category     = 'Music'
      AND  mc.status       = 'published'
      AND  mc.external_id  IS NOT NULL
      ${whereExtra}
    ORDER  BY COALESCE(mc.view_count, 0) DESC
  `);

  if (rows.length === 0) {
    console.log('Nothing to process — all Music videos already have highlight timestamps.');
    return;
  }

  console.log(`Processing ${rows.length} video(s)…\n`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const { id, external_id, title, game_name } = rows[i];
    const label = `[${i + 1}/${rows.length}] [${game_name}] ${title.slice(0, 55)}`;

    process.stdout.write(`${label}\n  → fetching… `);

    const start = await getHighlightStart(external_id);

    if (start !== null) {
      await query(
        `UPDATE media_content SET highlight_start = $1 WHERE id = $2`,
        [start, id]
      );
      console.log(`highlight at ${start}s ✓`);
      updated++;
    } else {
      console.log('no heatmap data, skipped');
      skipped++;
    }

    if (i < rows.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone — ${updated} updated, ${skipped} skipped (no heatmap).`);
};

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { enrichHighlights: main };
