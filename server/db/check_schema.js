import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'backlinks.db'));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
let output = '';
tables.forEach(t => {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  output += `${t.name}: ${cols.map(c => c.name).join(', ')}\n`;
});
writeFileSync(join(__dirname, 'schema_check.txt'), output);
db.close();
console.log('Written to schema_check.txt');
