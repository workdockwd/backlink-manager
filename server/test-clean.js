import Database from 'better-sqlite3';

const db = new Database('./db/backlinks.db');

try {
  const q = `
    SELECT id, domain, url 
    FROM backlink_sites 
    WHERE id IN (
      SELECT MIN(id) as id FROM backlink_sites WHERE is_private = 0 GROUP BY domain
    )
    AND domain = 'substack.com'
  `;
  const res = db.prepare(q).all();
  console.log("Canonical query result for substack.com:", res);
  
} finally {
  db.close();
}
