/**
 * Database Migration Script
 * Run this to bring an existing database up to the current schema.
 * Safe to run multiple times (idempotent).
 */
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'backlinks.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF'); // Disable FK checks during migration

function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

function tableExists(table) {
  return !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
}

console.log('🔧 Running database migrations...\n');

// Migration 1: Add user_id to projects table
if (tableExists('projects') && !columnExists('projects', 'user_id')) {
  console.log('  [M1] Adding user_id column to projects...');
  db.exec('ALTER TABLE projects ADD COLUMN user_id INTEGER REFERENCES users(id)');
  console.log('       ✅ Done');
} else {
  console.log('  [M1] projects.user_id — already exists, skipping.');
}

// Migration 2: Ensure users table has username and bio columns
if (tableExists('users')) {
  if (!columnExists('users', 'username')) {
    console.log('  [M2] Adding username column to users...');
    db.exec('ALTER TABLE users ADD COLUMN username TEXT UNIQUE');
    console.log('       ✅ Done');
  }
  if (!columnExists('users', 'bio')) {
    console.log('  [M3] Adding bio column to users...');
    db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
    console.log('       ✅ Done');
  }
}

// Migration 3: Add is_last_done to submissions if missing
if (tableExists('submissions') && !columnExists('submissions', 'is_last_done')) {
  console.log('  [M4] Adding is_last_done column to submissions...');
  db.exec('ALTER TABLE submissions ADD COLUMN is_last_done INTEGER DEFAULT 0');
  console.log('       ✅ Done');
} else {
  console.log('  [M4] submissions.is_last_done — already exists, skipping.');
}

// Migration 4: Fix usernames for users who don't have one
console.log('\n  [M5] Fixing missing usernames...');
const usersWithoutUsername = db.prepare('SELECT id, email FROM users WHERE username IS NULL').all();
if (usersWithoutUsername.length > 0) {
  for (const user of usersWithoutUsername) {
    const baseName = user.email.split('@')[0];
    const username = `${baseName}_${Math.floor(Math.random() * 10000)}`;
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, user.id);
    console.log(`       Assigned username "${username}" to ${user.email}`);
  }
  console.log(`       ✅ Fixed ${usersWithoutUsername.length} users`);
} else {
  console.log('       All users already have usernames, skipping.');
}

// Migration 5: Ensure scrape_sources table exists
if (!tableExists('scrape_sources')) {
  console.log('\n  [M6] Creating scrape_sources table...');
  db.exec(`CREATE TABLE scrape_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    query TEXT,
    last_scraped DATETIME,
    sites_found INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active'
  )`);
  console.log('       ✅ Done');
}

// Migration 6: Ensure scrape_log table exists
if (!tableExists('scrape_log')) {
  console.log('\n  [M7] Creating scrape_log table...');
  db.exec(`CREATE TABLE scrape_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url TEXT,
    sites_found INTEGER DEFAULT 0,
    sites_new INTEGER DEFAULT 0,
    status TEXT,
    error TEXT,
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('       ✅ Done');
}

// Migration 7: Add share_token to projects if missing
if (tableExists('projects') && !columnExists('projects', 'share_token')) {
  console.log('  [M8] Adding share_token column to projects...');
  db.exec('ALTER TABLE projects ADD COLUMN share_token TEXT');
  console.log('       ✅ Done');
} else {
  console.log('  [M8] projects.share_token — already exists, skipping.');
}

// Migration 8: Add is_private to backlink_sites if missing
if (tableExists('backlink_sites') && !columnExists('backlink_sites', 'is_private')) {
  console.log('  [M9] Adding is_private column to backlink_sites...');
  db.exec('ALTER TABLE backlink_sites ADD COLUMN is_private INTEGER DEFAULT 0');
  console.log('       ✅ Done');
} else {
  console.log('  [M9] backlink_sites.is_private — already exists, skipping.');
}

// Migration 9: Ensure user_vault table exists
if (!tableExists('user_vault')) {
  console.log('\n  [M10] Creating user_vault table...');
  db.exec(`CREATE TABLE user_vault (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    backlink_site_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, backlink_site_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (backlink_site_id) REFERENCES backlink_sites(id) ON DELETE CASCADE
  )`);
  console.log('       ✅ Done');
} else {
  console.log('  [M10] user_vault table — already exists, skipping.');
}

// Ensure indexes exist
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_backlink_category ON backlink_sites(category);
  CREATE INDEX IF NOT EXISTS idx_backlink_status ON backlink_sites(status);
  CREATE INDEX IF NOT EXISTS idx_backlink_domain ON backlink_sites(domain);
  CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_site ON submissions(backlink_site_id);
`);

// Migration 11: Create user_bookmarks table for resume pointer in global directory & project explorer
if (!tableExists('user_bookmarks')) {
  console.log('\n  [M11] Creating user_bookmarks table...');
  db.exec(`CREATE TABLE user_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    backlink_site_id INTEGER NOT NULL,
    context TEXT DEFAULT 'global',
    bookmarked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, context),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (backlink_site_id) REFERENCES backlink_sites(id) ON DELETE CASCADE
  )`);
  console.log('       ✅ Done');
} else {
  console.log('  [M11] user_bookmarks table — already exists, skipping.');
}

// Migration 12: Add live_url to submissions for proof/live link tracking
if (tableExists('submissions') && !columnExists('submissions', 'live_url')) {
  console.log('  [M12] Adding live_url column to submissions...');
  db.exec('ALTER TABLE submissions ADD COLUMN live_url TEXT');
  console.log('       ✅ Done');
} else {
  console.log('  [M12] submissions.live_url — already exists, skipping.');
}

// Migration 13: Ensure user_interactions table exists
if (!tableExists('user_interactions')) {
  console.log('\n  [M13] Creating user_interactions table...');
  db.exec(`CREATE TABLE user_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    backlink_site_id INTEGER NOT NULL,
    status TEXT DEFAULT 'viewed',
    interacted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, backlink_site_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (backlink_site_id) REFERENCES backlink_sites(id) ON DELETE CASCADE
  )`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_interactions_user ON user_interactions(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_user_interactions_site ON user_interactions(backlink_site_id)');
  console.log('       ✅ Done');
} else {
  console.log('  [M13] user_interactions table — already exists, skipping.');
}

db.pragma('foreign_keys = ON');
db.close();

console.log('\n✅ All migrations complete!\n');
