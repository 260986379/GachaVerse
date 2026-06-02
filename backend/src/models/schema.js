// SQL schema definitions — run these against your PostgreSQL database
// See docs/schema.sql for the full migration file

const CREATE_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    firebase_uid VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    banner_url TEXT,
    bio TEXT,
    birthday DATE,
    role VARCHAR(10) NOT NULL DEFAULT 'Regular'
      CHECK (role IN ('Owner', 'Dev', 'VIP', 'Member', 'Regular')),
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

// ── User social graph ──────────────────────────────────────────────────────
const ALTER_USERS_ADD_FIREBASE_UID = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE;
`;

const ALTER_USERS_PASSWORD_NULLABLE = `
  ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
`;

const ALTER_USERS_ADD_BANNER_URL = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url VARCHAR(500);
`;

const ALTER_USERS_ADD_BIRTHDAY = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
`;

const ALTER_USERS_IMAGES_TO_TEXT = `
  ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;
  ALTER TABLE users ALTER COLUMN banner_url TYPE TEXT;
`;

const ALTER_USERS_ADD_ROLE = `
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'Regular';
`;

const ALTER_USERS_ADD_DEBUG_ROLE = `
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('Owner', 'Dev', 'VIP', 'Member', 'Regular', 'Debug'));
`;

const CREATE_USER_FOLLOWS = `
  CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
  );
`;

const CREATE_USER_FOLLOWS_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
  CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
`;

const ALTER_CHARACTERS_ADD_GAME_FIELDS = `
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS combat_type VARCHAR(20);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS special_type VARCHAR(50);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS season SMALLINT;
`;

const ALTER_CHARACTERS_ADD_NIKKE_FIELDS = `
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS weapon_type VARCHAR(50);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS burst VARCHAR(10);
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS webm_url VARCHAR(500);
`;

const CREATE_USER_FAVORITE_VIDEOS = `
  CREATE TABLE IF NOT EXISTS user_favorite_videos (
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES media_content(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, video_id)
  );
  CREATE INDEX IF NOT EXISTS idx_ufv_user   ON user_favorite_videos(user_id);
  CREATE INDEX IF NOT EXISTS idx_ufv_video  ON user_favorite_videos(video_id);
`;

const CREATE_BOARD_COMMENTS = `
  CREATE TABLE IF NOT EXISTS board_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id   UUID NOT NULL REFERENCES boards(id)  ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    text       TEXT NOT NULL CHECK (char_length(text) <= 280),
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_board_comments_board ON board_comments(board_id);
  CREATE INDEX IF NOT EXISTS idx_board_comments_user  ON board_comments(user_id);
`;

const CREATE_USER_FAVORITE_CHARACTERS = `
  CREATE TABLE IF NOT EXISTS user_favorite_characters (
    user_id      UUID NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    created_at   TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, character_id)
  );
  CREATE INDEX IF NOT EXISTS idx_ufc_user ON user_favorite_characters(user_id);
`;

const CREATE_USER_FAVORITE_ARTWORKS = `
  CREATE TABLE IF NOT EXISTS user_favorite_artworks (
    user_id  UUID NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES media_content(id)  ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, media_id)
  );
  CREATE INDEX IF NOT EXISTS idx_ufa_user ON user_favorite_artworks(user_id);
`;

const CREATE_USER_GAME_ACCOUNTS = `
  CREATE TABLE IF NOT EXISTS user_game_accounts (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id VARCHAR(100) NOT NULL,
    uid     VARCHAR(100) NOT NULL,
    linked_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, game_id)
  );
`;

const CREATE_BOARDS = `
  CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id VARCHAR(100) NOT NULL DEFAULT '',
    game_name VARCHAR(255) NOT NULL DEFAULT '',
    image_url TEXT NOT NULL,
    caption TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
`;

const CREATE_USER_NOTIFICATIONS = `
  CREATE TABLE IF NOT EXISTS user_notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         VARCHAR(30) NOT NULL CHECK (type IN ('profile_note', 'board_comment')),
    read         BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_user_notifs_recipient ON user_notifications(recipient_id, created_at DESC);
`;

const CREATE_PROFILE_NOTES = `
  CREATE TABLE IF NOT EXISTS profile_notes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content        VARCHAR(50) NOT NULL,
    created_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE (author_id, target_user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_profile_notes_target ON profile_notes(target_user_id);
`;

const ALTER_CHARACTERS_ADD_VERSION = `
  ALTER TABLE characters ADD COLUMN IF NOT EXISTS version VARCHAR(10);
`;

const CREATE_GAME_REVIEWS = `
  CREATE TABLE IF NOT EXISTS game_reviews (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id    VARCHAR(100) NOT NULL,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 10),
    body       TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (game_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_game_reviews_game ON game_reviews(game_id, created_at DESC);
`;

const CREATE_REVIEW_UPVOTES = `
  CREATE TABLE IF NOT EXISTS review_upvotes (
    review_id UUID NOT NULL REFERENCES game_reviews(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (review_id, user_id)
  );
`;

const ALTER_FAV_VIDEOS_ADD_SORT_ORDER = `
  ALTER TABLE user_favorite_videos     ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
`;
const ALTER_FAV_CHARACTERS_ADD_SORT_ORDER = `
  ALTER TABLE user_favorite_characters ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
`;
const ALTER_FAV_ARTWORKS_ADD_SORT_ORDER = `
  ALTER TABLE user_favorite_artworks   ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
`;

const CREATE_REPORTS = `
  CREATE TABLE IF NOT EXISTS reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    content_type    VARCHAR(20) NOT NULL CHECK (content_type IN ('board', 'review', 'note')),
    content_id      UUID NOT NULL,
    content_preview TEXT,
    reason          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at      TIMESTAMP DEFAULT NOW(),
    resolved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
`;

const ALTER_USER_NOTIFICATIONS_ADD_FOLLOW = `
  ALTER TABLE user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
  ALTER TABLE user_notifications ADD CONSTRAINT user_notifications_type_check
    CHECK (type IN ('profile_note', 'board_comment', 'follow'));
`;

const CREATE_SUGGESTIONS = `
  CREATE TABLE IF NOT EXISTS suggestions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitter_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    type           VARCHAR(20) NOT NULL CHECK (type IN ('game', 'character', 'artwork')),
    entry_name     VARCHAR(255) NOT NULL,
    game_name      VARCHAR(255),
    reference_link TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at     TIMESTAMP DEFAULT NOW(),
    reviewed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at    TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status, created_at DESC);
`;

const ALL_TABLES = [
  CREATE_USERS,
  ALTER_USERS_ADD_FIREBASE_UID,
  ALTER_USERS_PASSWORD_NULLABLE,
  ALTER_USERS_ADD_BANNER_URL,
  ALTER_USERS_ADD_BIRTHDAY,
  ALTER_USERS_IMAGES_TO_TEXT,
  ALTER_USERS_ADD_ROLE,
  ALTER_USERS_ADD_DEBUG_ROLE,
  CREATE_GAMES,
  CREATE_CHARACTERS,
  ALTER_CHARACTERS_ADD_FACTION,
  ALTER_CHARACTERS_ADD_NAME_UNIQUE,
  ALTER_CHARACTERS_ADD_DETAILS,
  ALTER_CHARACTERS_ADD_GAME_FIELDS,
  ALTER_CHARACTERS_ADD_NIKKE_FIELDS,
  CREATE_POSTS,
  CREATE_COMMENTS,
  CREATE_USER_GAMES,
  CREATE_USER_FOLLOWS,
  CREATE_USER_FOLLOWS_INDEXES,
  CREATE_NEWS_ARTICLES,
  CREATE_MEDIA_CONTENT,
  ALTER_MEDIA_CONTENT_ADD_VIEW_COUNT,
  ALTER_MEDIA_CONTENT_ADD_TAGS,
  CREATE_INGESTION_LOGS,
  ALTER_INGESTION_LOGS_ADD_MESSAGE,
  CREATE_GAME_BANNERS,
  ALTER_GAME_BANNERS_ADD_IMAGE_URL,
  CREATE_USER_FAVORITE_VIDEOS,
  CREATE_BOARD_COMMENTS,
  CREATE_USER_FAVORITE_CHARACTERS,
  CREATE_USER_FAVORITE_ARTWORKS,
  CREATE_USER_GAME_ACCOUNTS,
  CREATE_BOARDS,
  CREATE_PROFILE_NOTES,
  CREATE_USER_NOTIFICATIONS,
  ALTER_CHARACTERS_ADD_VERSION,
  CREATE_GAME_REVIEWS,
  CREATE_REVIEW_UPVOTES,
  ALTER_FAV_VIDEOS_ADD_SORT_ORDER,
  ALTER_FAV_CHARACTERS_ADD_SORT_ORDER,
  ALTER_FAV_ARTWORKS_ADD_SORT_ORDER,
  CREATE_REPORTS,
  ALTER_USER_NOTIFICATIONS_ADD_FOLLOW,
  CREATE_SUGGESTIONS,
];

module.exports = { ALL_TABLES };
