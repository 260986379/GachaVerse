// SQL schema definitions — run these against your PostgreSQL database
// See docs/schema.sql for the full migration file

const CREATE_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_GAMES = `
  CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    developer VARCHAR(255),
    publisher VARCHAR(255),
    release_date DATE,
    cover_image_url VARCHAR(500),
    banner_image_url VARCHAR(500),
    platforms TEXT[],
    genres TEXT[]
  );
`;

const CREATE_CHARACTERS = `
  CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rarity VARCHAR(10),
    element_type VARCHAR(50),
    description TEXT,
    splash_art_url VARCHAR(500),
    icon_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_POSTS = `
  CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    content_type VARCHAR(20) NOT NULL,
    text_content TEXT,
    media_url VARCHAR(500),
    link_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_COMMENTS = `
  CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    text_content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_USER_GAMES = `
  CREATE TABLE IF NOT EXISTS user_games (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    is_featured BOOLEAN DEFAULT FALSE,
    personal_notes TEXT,
    PRIMARY KEY (user_id, game_id)
  );
`;

const CREATE_NEWS_ARTICLES = `
  CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    external_platform VARCHAR(50),
    external_id VARCHAR(255) UNIQUE,
    source_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    published_at TIMESTAMP,
    is_automated BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'published',
    created_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_MEDIA_CONTENT = `
  CREATE TABLE IF NOT EXISTS media_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    title VARCHAR(500),
    description TEXT,
    external_platform VARCHAR(50),
    external_id VARCHAR(255) UNIQUE,
    source_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    published_at TIMESTAMP,
    is_automated BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'published',
    category VARCHAR(50) DEFAULT 'Video',
    created_at TIMESTAMP DEFAULT NOW()
  );
`;

const CREATE_INGESTION_LOGS = `
  CREATE TABLE IF NOT EXISTS ingestion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    platform VARCHAR(50),
    last_fetched_id VARCHAR(255),
    last_run_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending',
    UNIQUE (game_id, platform)
  );
`;

const ALTER_INGESTION_LOGS_ADD_MESSAGE = `
  ALTER TABLE ingestion_logs ADD COLUMN IF NOT EXISTS message TEXT;
`;

const ALTER_CHARACTERS_ADD_FACTION = `
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS faction VARCHAR(100);
`;

const ALTER_CHARACTERS_ADD_NAME_UNIQUE = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_characters_game_id_name ON characters (game_id, name);
`;

const ALTER_CHARACTERS_ADD_DETAILS = `
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS title VARCHAR(255);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS voice_actor_en VARCHAR(255);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS voice_actor_jp VARCHAR(255);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS splash_art_urls TEXT[];
`;

const ALTER_MEDIA_CONTENT_ADD_VIEW_COUNT = `
  ALTER TABLE media_content ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0;
`;

const ALTER_MEDIA_CONTENT_ADD_TAGS = `
  ALTER TABLE media_content ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
`;

const CREATE_GAME_BANNERS = `
  CREATE TABLE IF NOT EXISTS game_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    banner_type VARCHAR(50) DEFAULT 'Character',
    starts_at TIMESTAMP,
    ends_at TIMESTAMP NOT NULL,
    is_manual BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (game_id, name, ends_at)
  );
`;

const ALTER_GAME_BANNERS_ADD_IMAGE_URL = `
  ALTER TABLE game_banners ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
`;

const ALTER_CHARACTERS_ADD_GAME_FIELDS = `
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS combat_type VARCHAR(20);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS special_type VARCHAR(50);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS season SMALLINT;
`;

const ALL_TABLES = [
  CREATE_USERS,
  CREATE_GAMES,
  CREATE_CHARACTERS,
  ALTER_CHARACTERS_ADD_FACTION,
  ALTER_CHARACTERS_ADD_NAME_UNIQUE,
  ALTER_CHARACTERS_ADD_DETAILS,
  ALTER_CHARACTERS_ADD_GAME_FIELDS,
  ALTER_INGESTION_LOGS_ADD_MESSAGE,
  CREATE_POSTS,
  CREATE_COMMENTS,
  CREATE_USER_GAMES,
  CREATE_NEWS_ARTICLES,
  CREATE_MEDIA_CONTENT,
  ALTER_MEDIA_CONTENT_ADD_VIEW_COUNT,
  ALTER_MEDIA_CONTENT_ADD_TAGS,
  CREATE_INGESTION_LOGS,
  CREATE_GAME_BANNERS,
  ALTER_GAME_BANNERS_ADD_IMAGE_URL,
];

module.exports = { ALL_TABLES };
