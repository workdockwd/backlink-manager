import Database from 'better-sqlite3';

const db = new Database('server/db/backlinks.db');

try {
  // Query all items
  const sites = db.prepare('SELECT id, domain, url FROM backlink_sites WHERE domain LIKE "%/%"').all();
  console.log(`Found ${sites.length} sites with a slash in the domain.`);
  
  let fixed = 0;
  
  const updateStmt = db.prepare('UPDATE backlink_sites SET domain = ? WHERE id = ?');
  
  for (const site of sites) {
    try {
      // Use URL parser to get the clean host
      const parsed = new URL(site.url.startsWith('http') ? site.url : `https://${site.url}`);
      let newDomain = parsed.hostname.replace(/^www\./, '');
      updateStmt.run(newDomain, site.id);
      fixed++;
    } catch (e) {
      console.log('Failed to parse:', site.url);
    }
  }
  
  console.log(`Fixed ${fixed} domains.`);

  // Also query what substack domains exist
  const subs = db.prepare('SELECT id, domain, url FROM backlink_sites WHERE domain LIKE "%substack%"').all();
  console.log('Substack domains:', subs);
  
} finally {
  db.close();
}
