-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shortened links
CREATE TABLE links (
  id SERIAL PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency: same user (or IP) + same URL should reuse existing short code
CREATE UNIQUE INDEX idx_links_user_url ON links (user_id, original_url) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_links_ip_url ON links (ip_address, original_url) WHERE user_id IS NULL;

-- Click tracking
CREATE TABLE clicks (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referer TEXT
);

CREATE INDEX idx_clicks_link_id ON clicks (link_id);
