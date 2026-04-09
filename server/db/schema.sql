-- Backlink Directory Database Schema

CREATE TABLE IF NOT EXISTS backlink_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  title TEXT,
  category TEXT DEFAULT 'general',
  da_score INTEGER,
  pa_score INTEGER,
  spam_score INTEGER,
  is_free INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_checked DATETIME,
  source_url TEXT,
  notes TEXT,
  user_id INTEGER REFERENCES users(id),
  is_private INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_vault (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  backlink_site_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, backlink_site_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (backlink_site_id) REFERENCES backlink_sites(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  domain TEXT,
  keywords TEXT DEFAULT '[]',
  target_urls TEXT DEFAULT '[]',
  content_snippets TEXT DEFAULT '[]',
  description TEXT,
  share_token TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  backlink_site_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  submitted_at DATETIME,
  anchor_text TEXT,
  target_url TEXT,
  content_title TEXT,
  content_description TEXT,
  notes TEXT,
  da_score INTEGER,
  pa_score INTEGER,
  spam_score INTEGER,
  is_last_done INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (backlink_site_id) REFERENCES backlink_sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scrape_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  query TEXT,
  last_scraped DATETIME,
  sites_found INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS scrape_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_url TEXT,
  sites_found INTEGER DEFAULT 0,
  sites_new INTEGER DEFAULT 0,
  status TEXT,
  error TEXT,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE,
  bio TEXT,
  gemini_api_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_backlink_category ON backlink_sites(category);
CREATE INDEX IF NOT EXISTS idx_backlink_status ON backlink_sites(status);
CREATE INDEX IF NOT EXISTS idx_backlink_domain ON backlink_sites(domain);
CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_site ON submissions(backlink_site_id);

CREATE TABLE IF NOT EXISTS user_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  backlink_site_id INTEGER NOT NULL,
  status TEXT DEFAULT 'viewed', -- 'skipped', 'added', etc.
  interacted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, backlink_site_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (backlink_site_id) REFERENCES backlink_sites(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_site ON user_interactions(backlink_site_id);
