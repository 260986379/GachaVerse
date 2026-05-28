// Fetches current and upcoming Genshin Impact wish banners directly from
// the HoYoverse public announcement API. No auth required.
// Called by bannerSyncService every 6 hours (same cadence as the static sync).

const HOYO_API =
  'https://sg-hk4e-api.hoyoverse.com/common/hk4e_global/announcement/api/getAnnList' +
  '?game=hk4e&game_biz=hk4e_global&lang=en-us&bundle_id=hk4e_global' +
  '&region=os_usa&level=55&uid=900000000&platform=pc';

// HoYoverse timestamps are expressed in UTC+8 — convert to proper UTC ISO string
function parseHoyoTime(str) {
  if (!str) return null;
  const d = new Date(str.replace(' ', 'T') + '+08:00');
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Turn a raw announcement into a banner entry, or null if it isn't a wish banner.
//
// Title patterns we handle:
//   'Event Wish "Yearning for Blooms" – Boosted Characters: Nicole (Limited 5-Star)'
//   'Weapon Event Wish "Epitome Invocation" – Featured Weapons: ...'
function parseBannerEntry(ann) {
  const title = ann.title || '';

  const isWeapon = /weapon event wish|epitome invocation/i.test(title);
  const isChar   = !isWeapon && /event wish/i.test(title);
  if (!isChar && !isWeapon) return null;

  const starts_at = parseHoyoTime(ann.start_time);
  const ends_at   = parseHoyoTime(ann.end_time);
  if (!starts_at || !ends_at) return null;

  let name;
  if (isWeapon) {
    name = 'Weapon Event Wish';
  } else {
    // Extract the character name that follows "Boosted Characters: "
    const m = title.match(/Boosted\s+Characters?:\s*([^(,\n–—–—-]+)/i);
    name = m
      ? `${m[1].trim()} Character Event Wish`
      : title.replace(/[""]/g, '').replace(/\s*[–—-].*$/, '').trim();
  }

  return {
    name,
    type:      isWeapon ? 'Weapon' : 'Character',
    starts_at,
    ends_at,
    // HoYo provides a promo banner image — used as auto fallback until you
    // upload your own to /public/genshin-banners/ and add it to bannerConfig.js
    image_url: ann.banner || null,
  };
}

async function fetchGenshinBanners() {
  const res = await fetch(HOYO_API, {
    headers: { 'User-Agent': 'GachaVerse/1.0' },
    signal:  AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`HoYoverse API returned HTTP ${res.status}`);

  const json = await res.json();
  if (json.retcode !== 0) throw new Error(`HoYoverse API error: ${json.message}`);

  // The API groups announcements by type — flatten them all
  const allAnns = (json.data?.list ?? []).flatMap(group => group.list ?? []);

  const banners = allAnns.map(parseBannerEntry).filter(Boolean);

  if (!banners.length) throw new Error('No wish banners found in announcement list');

  return banners;
}

module.exports = { fetchGenshinBanners };
