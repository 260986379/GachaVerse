const ENKA_BASE = 'https://enka.network';
const META_BASE = 'https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/zzz';
const HEADERS = { 'User-Agent': 'GachaVerse/1.0' };

let metaCache = null;
let metaFetchedAt = 0;
const META_TTL_MS = 60 * 60 * 1000; // refresh metadata every hour

async function fetchMeta() {
  if (metaCache && Date.now() - metaFetchedAt < META_TTL_MS) return metaCache;

  const [avatarsRes, weaponsRes, locsRes] = await Promise.all([
    fetch(`${META_BASE}/avatars.json`, { headers: HEADERS }),
    fetch(`${META_BASE}/weapons.json`, { headers: HEADERS }),
    fetch(`${META_BASE}/locs.json`,    { headers: HEADERS }),
  ]);

  if (!avatarsRes.ok || !weaponsRes.ok || !locsRes.ok) {
    throw new Error('Failed to fetch Enka metadata');
  }

  const [avatars, weapons, locs] = await Promise.all([
    avatarsRes.json(),
    weaponsRes.json(),
    locsRes.json(),
  ]);

  metaCache = { avatars, weapons, en: locs.en || {} };
  metaFetchedAt = Date.now();
  return metaCache;
}

const ELEMENT_MAP = {
  Physics:        { label: 'Physical', color: '#a8a8c0' },
  Elec:           { label: 'Electric', color: '#ffbc2e' },
  Ice:            { label: 'Ice',      color: '#22bdcc' },
  FireFrost:      { label: 'Ice',      color: '#22bdcc' },
  Fire:           { label: 'Fire',     color: '#f59e42' },
  Ether:          { label: 'Ether',    color: '#c47aff' },
  AuricEther:     { label: 'Ether',    color: '#f1cc4d' },
  ZhenZhenAssault:{ label: 'Physical', color: '#a8a8c0' },
};

const PROFESSION_MAP = {
  Attack:  'Attacker',
  Stun:    'Stunner',
  Anomaly: 'Anomaly',
  Support: 'Support',
  Defense: 'Defender',
  Rupture: 'Rupture',
};

function resolveElement(elementTypes = []) {
  // The last type is the primary in-game element
  const key = elementTypes[elementTypes.length - 1];
  return ELEMENT_MAP[key] || { label: key, color: '#888' };
}

function transformAgent(raw, meta) {
  const av = meta.avatars[raw.Id] || {};
  const displayName = av.Name ? (meta.en[av.Name] || av.Name) : `Agent ${raw.Id}`;
  const element = resolveElement(av.ElementTypes);

  const wp = raw.Weapon ? (meta.weapons[raw.Weapon.Id] || {}) : {};
  const weaponName = wp.ItemName ? (meta.en[wp.ItemName] || wp.ItemName) : null;

  return {
    id: raw.Id,
    displayName,
    element: element.label,
    elementColor: element.color,
    profession: PROFESSION_MAP[av.ProfessionType] || av.ProfessionType || 'Unknown',
    rarity: av.Rarity === 4 ? 'S' : 'A',
    iconUrl: av.CircleIcon ? `${ENKA_BASE}${av.CircleIcon}` : null,
    portraitUrl: av.Image ? `${ENKA_BASE}${av.Image}` : null,
    accentColor: av.Colors?.Accent || '#888',
    level: raw.Level,
    promotionLevel: raw.PromotionLevel,
    mindscapeLevel: raw.TalentLevel,
    coreSkillLevel: raw.CoreSkillEnhancement,
    weapon: raw.Weapon ? {
      id: raw.Weapon.Id,
      name: weaponName,
      level: raw.Weapon.Level,
      refinement: raw.Weapon.UpgradeLevel,
      iconUrl: wp.ImagePath ? `${ENKA_BASE}${wp.ImagePath}` : null,
      rarity: wp.Rarity === 4 ? 'S' : 'A',
    } : null,
  };
}

async function fetchZZZPlayer(uid) {
  const [meta, enkaRes] = await Promise.all([
    fetchMeta(),
    fetch(`${ENKA_BASE}/api/zzz/uid/${uid}`, { headers: HEADERS }),
  ]);

  if (enkaRes.status === 404) {
    const err = new Error('UID not found');
    err.status = 404;
    throw err;
  }
  if (!enkaRes.ok) {
    const err = new Error(`Enka API error: ${enkaRes.status}`);
    err.status = 502;
    throw err;
  }

  const raw = await enkaRes.json();
  const profile = raw.PlayerInfo?.SocialDetail?.ProfileDetail || {};
  const bio = raw.PlayerInfo?.SocialDetail?.Desc || '';
  const avatarList = raw.PlayerInfo?.ShowcaseDetail?.AvatarList || [];

  return {
    uid: raw.uid,
    region: raw.region,
    ttl: raw.ttl,
    nickname: profile.Nickname || '',
    level: profile.Level || 0,
    bio,
    agents: avatarList.map(a => transformAgent(a, meta)),
  };
}

module.exports = { fetchZZZPlayer };
