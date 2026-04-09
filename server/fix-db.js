import { getDb } from './db/index.js';

try {
  const db = getDb();
  db.prepare('ALTER TABLE submissions ADD COLUMN content_title TEXT').run();
  console.log('Added content_title');
} catch (e) {
  console.log(e.message);
}

try {
  const db = getDb();
  db.prepare('ALTER TABLE submissions ADD COLUMN content_description TEXT').run();
  console.log('Added content_description');
} catch (e) {
  console.log(e.message);
}
