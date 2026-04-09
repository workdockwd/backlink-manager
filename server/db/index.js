import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

export function getDb() {
  if (!db) {
    db = new Database(join(__dirname, 'backlinks.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Initialize schema
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);
    
    // Migrations
    try { db.exec('ALTER TABLE submissions ADD COLUMN da_score INTEGER;'); } catch (e) { /* exists */ }
    try { db.exec('ALTER TABLE submissions ADD COLUMN pa_score INTEGER;'); } catch (e) { /* exists */ }
    try { db.exec('ALTER TABLE submissions ADD COLUMN spam_score INTEGER;'); } catch (e) { /* exists */ }
    try { db.exec("ALTER TABLE projects ADD COLUMN target_urls TEXT DEFAULT '[]';"); } catch (e) { /* exists */ }
    try { db.exec("ALTER TABLE projects ADD COLUMN content_snippets TEXT DEFAULT '[]';"); } catch (e) { /* exists */ }
    try { db.exec('ALTER TABLE users ADD COLUMN gemini_api_key TEXT;'); } catch (e) { /* exists */ }
    
    console.log('✅ Database initialized');
  }
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
