const ENKA_BASE   = 'https://enka.network';
const META_ZZZ    = 'https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/zzz';
const META_GI     = 'https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store';
const META_HSR    = 'https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/hsr';
const HEADERS     = { 'User-Agent': 'GachaVerse/1.0' };
const META_TTL_MS = 60 * 60 * 1000;

// ── ZZZ metadata cache ────────────────────────────────────────────
let zzzMetaCache = null;
let zzzMetaFetchedAt = 0;

async function fetchZZZMeta() {
  if (zzzMetaCache && Date.now() - zzzMetaFetchedAt < META_TTL_MS) return zzzMetaCache;
  const [avatarsRes, weaponsRes, locsRes] = await Promise.all([
    fetch(`${META_ZZZ}/avatars.json`, { headers: HEADERS }),
    fetch(`${META_ZZZ}/weapons.json`, { headers: HEADERS }),
    fetch(`${META_ZZZ}/locs.json`,    { headers: HEADERS }),
  ]);
  if (!avatarsRes.ok || !weaponsRes.ok || !locsRes.ok) throw new Error('Failed to fetch ZZZ metadata');
  const [avatars, weapons, locs] = await Promise.all([avatarsRes.json(), weaponsRes.json(), locsRes.json()]);
  zzzMetaCache = { avatars, weapons, en: locs.en || {} };
  zzzMetaFetchedAt = Date.now();
  return zzzMetaCache;
}

// ── Genshin metadata cache ────────────────────────────────────────
let giMetaCache = null;
let giMetaFetchedAt = 0;

async function fetchGenshinMeta() {
  if (giMetaCache && Date.now() - giMetaFetchedAt < META_TTL_MS) return giMetaCache;
  const [charsRes, locRes] = await Promise.all([
    fetch(`${META_GI}/characters.json`, { headers: HEADERS }),
    fetch(`${META_GI}/loc.json`,        { headers: HEADERS }),
  ]);
  if (!charsRes.ok || !locRes.ok) throw new Error('Failed to fetch Genshin metadata');
  const [chars, loc] = await Promise.all([charsRes.json(), locRes.json()]);
  giMetaCache = { chars, en: loc.en || {} };
  giMetaFetchedAt = Date.now();
  return giMetaCache;
}

// ── ZZZ transforms ────────────────────────────────────────────────
const ZZZ_ELEMENT_MAP = {
  Physics:         { label: 'Physical', color: '#a8a8c0' },
  Elec:            { label: 'Electric', color: '#ffbc2e' },
  Ice:             { label: 'Ice',      color: '#22bdcc' },
  FireFrost:       { label: 'Ice',      color: '#22bdcc' },
  Fire:            { label: 'Fire',     color: '#f59e42' },
  Ether:           { label: 'Ether',    color: '#c47aff' },
  AuricEther:      { label: 'Ether',    color: '#f1cc4d' },
  ZhenZhenAssault: { label: 'Physical', color: '#a8a8c0' },
};

const PROFESSION_MAP = {
  Attack:  'Attacker',
  Stun:    'Stunner',
  Anomaly: 'Anomaly',
  Support: 'Support',
  Defense: 'Defender',
  Rupture: 'Rupture',
};

function resolveZZZElement(elementTypes = []) {
  const key = elementTypes[elementTypes.length - 1];
  return ZZZ_ELEMENT_MAP[key] || { label: key, color: '#888' };
}

function transformZZZAgent(raw, meta) {
  const av = meta.avatars[raw.Id] || {};
  const displayName = av.Name ? (meta.en[av.Name] || av.Name) : `Agent ${raw.Id}`;
  const element = resolveZZZElement(av.ElementTypes);
  const wp = raw.Weapon ? (meta.weapons[raw.Weapon.Id] || {}) : {};
  const weaponName = wp.ItemName ? (meta.en[wp.ItemName] || wp.ItemName) : null;
  return {
    id: raw.Id,
    displayName,
    element: element.label,
    elementColor: element.color,
    profession: PROFESSION_MAP[av.ProfessionType] || av.ProfessionType || 'Unknown',
    rarity: av.Rarity === 4 ? 'S' : 'A',
    iconUrl:     av.CircleIcon ? `${ENKA_BASE}${av.CircleIcon}` : null,
    portraitUrl: av.Image      ? `${ENKA_BASE}${av.Image}`      : null,
    accentColor: av.Colors?.Accent || '#888',
    level:            raw.Level,
    promotionLevel:   raw.PromotionLevel,
    mindscapeLevel:   raw.TalentLevel,
    coreSkillLevel:   raw.CoreSkillEnhancement,
    weapon: raw.Weapon ? {
      id:         raw.Weapon.Id,
      name:       weaponName,
      level:      raw.Weapon.Level,
      refinement: raw.Weapon.UpgradeLevel,
      iconUrl:    wp.ImagePath ? `${ENKA_BASE}${wp.ImagePath}` : null,
      rarity:     wp.Rarity === 4 ? 'S' : 'A',
    } : null,
  };
}

// ── Genshin transforms ────────────────────────────────────────────
const GI_ELEMENT_MAP = {
  Fire:     { label: 'Pyro',    color: '#ef4444' },
  Water:    { label: 'Hydro',   color: '#3b82f6' },
  Ice:      { label: 'Cryo',    color: '#67e8f9' },
  Electric: { label: 'Electro', color: '#a855f7' },
  Rock:     { label: 'Geo',     color: '#eab308' },
  Wind:     { label: 'Anemo',   color: '#34d399' },
  Grass:    { label: 'Dendro',  color: '#84cc16' },
};

function getGenshinRegion(uid) {
  const first = String(uid)[0];
  if (first === '6') return 'America';
  if (first === '7') return 'Europe';
  if (first === '8') return 'Asia';
  if (first === '9') return 'TW/HK/MO';
  return 'China';
}

function transformGenshinCharacter(raw, meta) {
  const cm = meta.chars[String(raw.avatarId)] || {};
  const nameHash = cm.NameTextMapHash;
  const displayName = nameHash ? (meta.en[String(nameHash)] || `Character ${raw.avatarId}`) : `Character ${raw.avatarId}`;
  const element = GI_ELEMENT_MAP[cm.Element] || { label: cm.Element || 'Unknown', color: '#888' };
  const rarity = cm.qualityType === 'QUALITY_ORANGE' ? '5★' : '4★';

  const level      = parseInt(raw.propMap?.['4001']?.val || 0);
  const ascension  = parseInt(raw.propMap?.['1002']?.val || 0);
  const constellations = (raw.talentIdList || []).length;

  const sideIcon = cm.SideIconName || '';
  const iconName = sideIcon.replace('UI_AvatarIcon_Side_', 'UI_AvatarIcon_');
  const iconUrl  = iconName ? `${ENKA_BASE}/ui/${iconName}.png` : null;

  const weaponEquip = (raw.equipList || []).find(e => e.flat?.itemType === 'ITEM_WEAPON');
  let weapon = null;
  if (weaponEquip) {
    const nh   = weaponEquip.flat?.NameTextMapHash;
    const name = nh ? (meta.en[String(nh)] || null) : null;
    const refineRaw = weaponEquip.weapon?.affixMap ? Object.values(weaponEquip.weapon.affixMap)[0] : 0;
    weapon = {
      name,
      level:      weaponEquip.weapon?.level || 0,
      refinement: refineRaw + 1,
      rarity:     weaponEquip.flat?.rankLevel || 0,
      iconUrl:    weaponEquip.flat?.icon ? `${ENKA_BASE}/ui/${weaponEquip.flat.icon}.png` : null,
    };
  }

  return {
    id: raw.avatarId,
    displayName,
    element:      element.label,
    elementColor: element.color,
    rarity,
    iconUrl,
    portraitUrl:  null,
    level,
    promotionLevel: ascension,
    constellations,
    weapon,
  };
}

// ── Public fetch functions ────────────────────────────────────────
const UID_RE = /^\d{9,10}$/;

async function fetchZZZPlayer(uid) {
  const [meta, enkaRes] = await Promise.all([
    fetchZZZMeta(),
    fetch(`${ENKA_BASE}/api/zzz/uid/${uid}`, { headers: HEADERS }),
  ]);
  if (enkaRes.status === 404) { const e = new Error('UID not found'); e.status = 404; throw e; }
  if (enkaRes.status === 424) { const e = new Error('Enka API is currently unavailable. Please try again later.'); e.status = 424; throw e; }
  if (!enkaRes.ok) { const e = new Error(`Enka API error: ${enkaRes.status}`); e.status = 502; throw e; }

  const raw     = await enkaRes.json();
  const profile = raw.PlayerInfo?.SocialDetail?.ProfileDetail || {};
  const bio     = raw.PlayerInfo?.SocialDetail?.Desc || '';
  const avatarList = raw.PlayerInfo?.ShowcaseDetail?.AvatarList || [];

  return {
    uid:      raw.uid,
    region:   raw.region,
    ttl:      raw.ttl,
    nickname: profile.Nickname || '',
    level:    profile.Level || 0,
    bio,
    agents:   avatarList.map(a => transformZZZAgent(a, meta)),
  };
}

async function fetchGenshinPlayer(uid) {
  const [meta, enkaRes] = await Promise.all([
    fetchGenshinMeta(),
    fetch(`${ENKA_BASE}/api/uid/${uid}`, { headers: HEADERS }),
  ]);
  if (enkaRes.status === 404) { const e = new Error('UID not found'); e.status = 404; throw e; }
  if (!enkaRes.ok) { const e = new Error(`Enka API error: ${enkaRes.status}`); e.status = 502; throw e; }

  const raw  = await enkaRes.json();
  const info = raw.playerInfo || {};

  return {
    uid:          String(raw.uid || uid),
    region:       getGenshinRegion(raw.uid || uid),
    ttl:          raw.ttl,
    nickname:     info.nickname || '',
    level:        info.level || 0,
    worldLevel:   info.worldLevel ?? null,
    achievements: info.finishAchievementNum ?? null,
    abyssFloor:   info.towerFloor ?? null,
    abyssLevel:   info.towerLevel ?? null,
    bio:          info.signature || '',
    characters:   (raw.avatarInfoList || []).map(c => transformGenshinCharacter(c, meta)),
  };
}

// ── HSR (Enka) ───────────────────────────────────────────────────
// avatars.json is the only metadata file that exists in the HSR store.
// There is no localization file, so names are resolved via a hardcoded map
// and fall back to "Element · Path" for any unknown IDs.

let hsrMetaCache    = null;
let hsrMetaFetchedAt = 0;

async function fetchHSRMeta() {
  if (hsrMetaCache && Date.now() - hsrMetaFetchedAt < META_TTL_MS) return hsrMetaCache;
  const res = await fetch(`${META_HSR}/avatars.json`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch HSR metadata: ${res.status}`);
  hsrMetaCache    = await res.json();
  hsrMetaFetchedAt = Date.now();
  return hsrMetaCache;
}

const HSR_ELEMENT_COLORS = {
  Fire: '#ef4444', Ice: '#67e8f9', Thunder: '#a855f7',
  Wind: '#34d399', Quantum: '#818cf8', Imaginary: '#fde047', Physical: '#a8a8c0',
};

const HSR_PATH_NAMES = {
  Warrior: 'Destruction', Rogue: 'The Hunt', Mage: 'Erudition',
  Shaman:  'Harmony',     Warlock: 'Nihility', Knight: 'Preservation',
  Priest:  'Abundance',   Memory: 'Remembrance',
};

const HSR_NAME_MAP = {
  1001: 'March 7th',       1002: 'Dan Heng',      1003: 'Himeko',
  1004: 'Welt',            1005: 'Kafka',          1006: 'Silver Wolf',
  1008: 'Arlan',           1009: 'Asta',           1013: 'Herta',
  1101: 'Bronya',          1102: 'Seele',          1103: 'Serval',
  1104: 'Gepard',          1105: 'Natasha',        1106: 'Pela',
  1107: 'Clara',           1108: 'Sampo',          1109: 'Hook',
  1110: 'Lynx',            1111: 'Luka',           1112: 'Topaz & Numby',
  1201: 'Qingque',         1202: 'Tingyun',        1203: 'Luocha',
  1204: 'Jing Yuan',       1205: 'Blade',          1206: 'Sushang',
  1207: 'Yukong',          1208: 'Fu Xuan',        1209: 'Yanqing',
  1210: 'Guinaifen',       1211: 'Bailu',          1212: 'Jingliu',
  1213: 'Dan Heng · IL',   1214: 'Xueyi',          1215: 'Hanya',
  1217: 'Huohuo',          1218: 'Jiaoqiu',        1220: 'Feixiao',
  1221: 'Yunli',           1222: 'Lingsha',        1223: 'Moze',
  1224: 'March 7th',       1225: 'Fugue',
  1301: 'Gallagher',       1302: 'Argenti',        1303: 'Ruan Mei',
  1304: 'Aventurine',      1305: 'Dr. Ratio',      1306: 'Sparkle',
  1307: 'Black Swan',      1308: 'Misha',          1309: 'Robin',
  1310: 'Firefly',         1311: 'Boothill',       1312: 'Acheron',
  1313: 'Jade',            1314: 'Rappa',          1315: 'Herta',
  1317: 'Aglaea',          1401: 'Sunday',         1402: 'Mydei',
  1403: 'Cipher',          1404: 'Castorice',      1405: 'Hyacine',
  8001: 'Trailblazer',     8002: 'Trailblazer',    8003: 'Trailblazer',
  8004: 'Trailblazer',     8005: 'Trailblazer',    8006: 'Trailblazer',
};

function transformHSRCharacter(raw, avatars) {
  const cm        = avatars[String(raw.avatarId)] || {};
  const element   = cm.Element      || 'Unknown';
  const pathKey   = cm.AvatarBaseType || '';
  const profession = HSR_PATH_NAMES[pathKey] || pathKey || null;
  const rarity    = cm.Rarity === 5 ? '5★' : '4★';
  const iconUrl   = cm.AvatarSideIconPath      ? `${ENKA_BASE}${cm.AvatarSideIconPath}`      : null;
  const portraitUrl = cm.AvatarCutinFrontImgPath ? `${ENKA_BASE}${cm.AvatarCutinFrontImgPath}` : null;
  const displayName = HSR_NAME_MAP[raw.avatarId] || `${element} · ${profession || 'Unknown'}`;

  return {
    id:             raw.avatarId,
    displayName,
    element,
    elementColor:   HSR_ELEMENT_COLORS[element] || '#888',
    profession,
    rarity,
    iconUrl,
    portraitUrl,
    level:          raw.level,
    promotionLevel: raw.promotion,
    eidolons:       raw.rank,
    weapon:         null,
  };
}

function getHSRRegion(uid) {
  const first = String(uid)[0];
  if (first === '6') return 'America';
  if (first === '7') return 'Europe';
  if (first === '8') return 'Asia';
  if (first === '9') return 'TW/HK/MO';
  return 'China';
}

async function fetchHSRPlayer(uid) {
  const [avatars, enkaRes] = await Promise.all([
    fetchHSRMeta(),
    fetch(`${ENKA_BASE}/api/hsr/uid/${uid}`, { headers: HEADERS }),
  ]);

  if (enkaRes.status === 404) { const e = new Error('UID not found'); e.status = 404; throw e; }
  if (!enkaRes.ok)            { const e = new Error(`Enka API error: ${enkaRes.status}`); e.status = 502; throw e; }

  const raw       = await enkaRes.json();
  const info      = raw.detailInfo  || {};
  const record    = info.recordInfo || {};
  const challenge = record.challengeInfo || {};

  return {
    uid:          String(raw.uid || uid),
    region:       raw.region || getHSRRegion(raw.uid || uid),
    nickname:     info.nickname  || '',
    level:        info.level     || 0,
    worldLevel:   info.worldLevel     ?? null,
    achievements: record.achievementCount ?? null,
    mocFloor:     challenge.noneScheduleMaxLevel ?? null,
    bio:          info.signature || '',
    characters:   (info.assistAvatarList || []).map(c => transformHSRCharacter(c, avatars)),
  };
}

module.exports = { fetchZZZPlayer, fetchGenshinPlayer, fetchHSRPlayer };
