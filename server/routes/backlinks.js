import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/backlinks — List all backlinks with filtering, search, pagination (deduplicated by domain)
router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const {
    page = 1,
    limit = 50,
    category,
    status,
    search,
    sort = 'discovered_at',
    order = 'desc',
    is_free,
    hideProcessed,
    min_da
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // Pick ONE canonical row per domain (lowest id = original/cleanest URL)
  // This eliminates substack.com/tos, substack.com/@user, substack.com/ccpa → keeps only one substack.com
  const canonicalSubquery = `SELECT MIN(id) as id FROM backlink_sites WHERE is_private = 0 GROUP BY domain`;
  
  const conditions = [`backlink_sites.id IN (${canonicalSubquery})`];
  const params = [];

  // Exclude sites the user has interacted with if hideProcessed flag is set
  if (hideProcessed === 'true' && req.user) {
    conditions.push('NOT EXISTS (SELECT 1 FROM user_interactions ui WHERE ui.backlink_site_id = backlink_sites.id AND ui.user_id = ?)');
    params.push(req.user.id);
  }

  if (category && category !== 'all') {
    conditions.push('backlink_sites.category = ?');
    params.push(category);
  }
  if (status && status !== 'all') {
    conditions.push('backlink_sites.status = ?');
    params.push(status);
  }
  if (is_free !== undefined) {
    conditions.push('backlink_sites.is_free = ?');
    params.push(is_free === 'true' ? 1 : 0);
  }
  if (min_da) {
    conditions.push('backlink_sites.da_score >= ?');
    params.push(parseInt(min_da, 10));
  }
  if (search) {
    conditions.push('(backlink_sites.url LIKE ? OR backlink_sites.domain LIKE ? OR backlink_sites.title LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Validate sort column
  const validSorts = ['discovered_at', 'domain', 'category', 'da_score', 'url', 'title'];
  const sortCol = validSorts.includes(sort) ? sort : 'discovered_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const total = db.prepare(`SELECT COUNT(*) as count FROM backlink_sites ${where}`).get(...params).count;
  
  // Also fetch interaction status for each site if user is logged in
  const selectInteraction = req.user
    ? `(SELECT status FROM user_interactions ui WHERE ui.backlink_site_id = backlink_sites.id AND ui.user_id = ${req.user.id}) as interaction_status`
    : `NULL as interaction_status`;
  
  const sites = db.prepare(
    `SELECT backlink_sites.*, users.username, ${selectInteraction}
     FROM backlink_sites 
     LEFT JOIN users ON backlink_sites.user_id = users.id 
     ${where} ORDER BY backlink_sites.${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset);

  // Get category counts (deduplicated by domain)
  const categories = db.prepare(
    `SELECT category, COUNT(*) as count 
     FROM backlink_sites 
     WHERE id IN (${canonicalSubquery})
     GROUP BY category ORDER BY count DESC`
  ).all();

  res.json({
    sites,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
    categories,
  });
});

// GET /api/backlinks/bookmark — Get current resume bookmark for a context
router.get('/bookmark', requireAuth, (req, res) => {
  const db = getDb();
  const { context = 'global' } = req.query;
  try {
    const bookmark = db.prepare(
      'SELECT backlink_site_id FROM user_bookmarks WHERE user_id = ? AND context = ?'
    ).get(req.user.id, context);
    res.json({ backlink_site_id: bookmark?.backlink_site_id || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error fetching bookmark' });
  }
});

// GET /api/backlinks/vault — List user's private vault links with filters
router.get('/vault', requireAuth, (req, res) => {
  const db = getDb();
  const { page = 1, limit = 50, sort = 'discovered_at', order = 'desc', min_da = '0', category, search } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const validSorts = ['discovered_at', 'domain', 'category', 'da_score', 'url'];
  const sortCol = validSorts.includes(sort) ? sort : 'discovered_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const conditions = ['uv.user_id = ?'];
  const params = [req.user.id];

  if (parseInt(min_da) > 0) { conditions.push('bs.da_score >= ?'); params.push(parseInt(min_da)); }
  if (category && category !== 'all') { conditions.push('bs.category = ?'); params.push(category); }
  if (search) { conditions.push('(bs.domain LIKE ? OR bs.url LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM backlink_sites bs
    JOIN user_vault uv ON bs.id = uv.backlink_site_id ${where}
  `).get(...params).count;

  const sites = db.prepare(`
    SELECT bs.* FROM backlink_sites bs
    JOIN user_vault uv ON bs.id = uv.backlink_site_id
    ${where} ORDER BY bs.${sortCol} ${sortOrder} LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const catCounts = db.prepare(`
    SELECT bs.category, COUNT(*) as count FROM backlink_sites bs
    JOIN user_vault uv ON bs.id = uv.backlink_site_id
    WHERE uv.user_id = ? GROUP BY bs.category ORDER BY count DESC
  `).all(req.user.id);

  res.json({
    sites,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    categories: catCounts,
  });
});

// DELETE /api/backlinks/vault/:id — Remove from vault (smart cleanup)
router.delete('/vault/:id', requireAuth, (req, res) => {
  const db = getDb();
  const siteId = req.params.id;

  // Remove from this user's vault
  db.prepare('DELETE FROM user_vault WHERE user_id = ? AND backlink_site_id = ?').run(req.user.id, siteId);

  // Check if ANY other user still has it in their vault
  const otherVaultUsers = db.prepare('SELECT COUNT(*) as c FROM user_vault WHERE backlink_site_id = ?').get(siteId).c;

  if (otherVaultUsers === 0) {
    // Check if it's still private (no public exposure)
    const site = db.prepare('SELECT is_private FROM backlink_sites WHERE id = ?').get(siteId);
    if (site && site.is_private === 1) {
      // Also remove from submissions (clean up all project associations)
      db.prepare('DELETE FROM submissions WHERE backlink_site_id = ?').run(siteId);
      // Safe to fully delete the backlink_sites row
      db.prepare('DELETE FROM backlink_sites WHERE id = ?').run(siteId);
    }
  }

  res.json({ success: true });
});

// POST /api/backlinks/vault/:id/add-to-project — Cherry-pick a vault link into a project
router.post('/vault/:id/add-to-project', requireAuth, (req, res) => {
  const db = getDb();
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });

  // Verify user owns this vault entry
  const vaultEntry = db.prepare('SELECT * FROM user_vault WHERE user_id = ? AND backlink_site_id = ?').get(req.user.id, req.params.id);
  if (!vaultEntry) return res.status(404).json({ error: 'Vault entry not found' });

  // Verify user owns the project
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.user.id);
  if (!project) return res.status(403).json({ error: 'Project not found' });

  db.prepare(
    `INSERT OR IGNORE INTO submissions (project_id, backlink_site_id, status, created_at) VALUES (?, ?, 'pending', datetime('now'))`
  ).run(projectId, req.params.id);

  res.json({ success: true });
});

// GET /api/backlinks/stats — Dashboard stats
router.get('/stats', (req, res) => {
  const db = getDb();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM backlink_sites').get().count;
  const active = db.prepare("SELECT COUNT(*) as count FROM backlink_sites WHERE status = 'active'").get().count;
  const categories = db.prepare(
    'SELECT category, COUNT(*) as count FROM backlink_sites GROUP BY category ORDER BY count DESC'
  ).all();
  const recentlyAdded = db.prepare(
    'SELECT * FROM backlink_sites GROUP BY domain ORDER BY discovered_at DESC LIMIT 10'
  ).all();
  const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const totalSubmissions = db.prepare('SELECT COUNT(*) as count FROM submissions').get().count;

  res.json({
    total,
    active,
    categories,
    recentlyAdded,
    totalProjects,
    totalSubmissions,
  });
});

// GET /api/backlinks/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const site = db.prepare('SELECT * FROM backlink_sites WHERE id = ?').get(req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json(site);
});

// POST /api/backlinks — Manually add a backlink
router.post('/', requireAuth, (req, res) => {
  const db = getDb();
  const { url, title, category = 'general', is_free = true, notes } = req.body;
  
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname !== '/' && parsedUrl.pathname !== '') {
      return res.status(400).json({ error: 'Deep links are not allowed. Please submit the root domain only.' });
    }

    // Normalize the domain: strip www. and common subdomain prefixes
    let domain = parsedUrl.hostname.replace(/^www\./, '');
    
    // Strip known non-content subdomains (about., blog., m., etc.) to detect duplicates
    const coreDomain = domain.replace(/^(about|blog|m|support|help|login|signup|en|us|uk|app|my)\./, '');

    // Check for duplicates by core domain
    const existing = db.prepare(
      `SELECT id, url, domain FROM backlink_sites WHERE 
        domain = ? OR domain = ? OR domain = ?`
    ).get(domain, coreDomain, `www.${coreDomain}`);

    if (existing) {
      return res.status(409).json({ 
        error: `Duplicate detected — "${existing.domain}" already exists in the directory.`,
        existingUrl: existing.url
      });
    }

    const result = db.prepare(
      `INSERT INTO backlink_sites (url, domain, title, category, is_free, notes, discovered_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`
    ).run(url, domain, title || domain, category, is_free ? 1 : 0, notes, req.user.id);
    
    const site = db.prepare('SELECT * FROM backlink_sites WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(site);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'This URL already exists in the directory' });
    }
    res.status(500).json({ error: err.message });
  }
});

function guessCategoryFromUrl(url) {
  const lower = url.toLowerCase();
  if (lower.includes('forum') || lower.includes('board') || lower.includes('thread')) return 'forum';
  if (lower.includes('blog') || lower.includes('wordpress') || lower.includes('article')) return 'blog';
  if (lower.includes('dir') || lower.includes('list')) return 'directory';
  if (lower.includes('profile') || lower.includes('user')) return 'profile';
  if (lower.includes('wiki')) return 'wiki';
  if (lower.includes('news') || lower.includes('press')) return 'press-release';
  return null;
}

const VALID_CATEGORIES = ['blog', 'web2.0', 'directory', 'forum', 'guest-post', 'social-bookmark', 'article', 'profile', 'comment', 'image', 'video', 'document', 'classified', 'wiki', 'press-release', 'qa', 'general'];

// POST /api/backlinks/import — Bulk import URLs from a text list
router.post('/import', requireAuth, (req, res) => {
  const db = getDb();
  let { urls, category = 'auto', source = 'manual-import', projectId, contributeToPublic = true } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls array is required' });
  }

  if (urls.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 URLs per import' });
  }

  const results = { added: 0, skipped: 0, failed: 0, errors: [] };

  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO backlink_sites (url, domain, title, category, notes, discovered_at, user_id, is_private)
     VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)`
  );

  const checkStmt = db.prepare(
    `SELECT id, is_private FROM backlink_sites WHERE domain = ? OR domain = ? OR domain = ?`
  );
  
  const insertSubStmt = db.prepare(
    `INSERT OR IGNORE INTO submissions (project_id, backlink_site_id, status, created_at) VALUES (?, ?, 'pending', datetime('now'))`
  );

  const insertVaultStmt = db.prepare(
    `INSERT OR IGNORE INTO user_vault (user_id, backlink_site_id) VALUES (?, ?)`
  );

  const upgradePublicStmt = db.prepare(
    `UPDATE backlink_sites SET is_private = 0 WHERE id = ? AND is_private = 1`
  );

  for (const rawUrl of urls) {
    const trimmed = rawUrl.trim();
    if (!trimmed) continue;

    try {
      let extractedUrl = trimmed;
      let finalCategory = category;

      // Simple delimiter split (space, comma, tab) mapping URL -> Category
      const parts = trimmed.split(/[\s,;\t]+/);
      if (parts.length >= 2) {
        extractedUrl = parts[0];
        const potentialCategory = parts[parts.length - 1].toLowerCase();
        if (VALID_CATEGORIES.includes(potentialCategory)) {
          finalCategory = potentialCategory;
        }
      }

      if (finalCategory === 'auto' || finalCategory === 'general') {
        finalCategory = guessCategoryFromUrl(extractedUrl) || 'general';
      }

      const parsedUrl = new URL(extractedUrl.startsWith('http') ? extractedUrl : `https://${extractedUrl}`);
      let domain = parsedUrl.hostname.replace(/^www\./, '');
      const coreDomain = domain.replace(/^(about|blog|m|support|help|login|signup|en|us|uk|app|my)\./, '');
      const normalizedUrl = `${parsedUrl.protocol}//${domain}`;

      let siteId = null;

      // Check for duplicate by core domain
      const existing = checkStmt.get(domain, coreDomain, `www.${coreDomain}`);
      if (existing) {
        siteId = existing.id;
        results.skipped++;
        // If they contributed an originally private link to public, upgrade it
        if (contributeToPublic && existing.is_private === 1) {
          upgradePublicStmt.run(siteId);
        }
      } else {
        const isPrivateFlag = contributeToPublic ? 0 : 1;
        const result = insertStmt.run(
          normalizedUrl,
          domain,
          domain, // Use domain as title
          finalCategory,
          `Imported from ${source}`,
          req.user.id,
          isPrivateFlag
        );

        if (result.changes > 0) {
          siteId = result.lastInsertRowid;
          results.added++;
        } else {
          results.skipped++;
        }
      }

      // Add to user's personal vault
      if (siteId) {
        insertVaultStmt.run(req.user.id, siteId);
      }

      // If imported inside a project, also add it to that project immediately
      if (siteId && projectId) {
        insertSubStmt.run(projectId, siteId);
      }
    } catch (err) {
      results.failed++;
      if (results.errors.length < 10) {
        results.errors.push({ url: rawUrl.trim(), error: err.message });
      }
    }
  }

  res.json({
    success: true,
    ...results,
    total: urls.filter(u => u.trim()).length,
  });
});

// PUT /api/backlinks/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const { title, category, da_score, pa_score, spam_score, is_free, status, notes } = req.body;
  
  const fields = [];
  const params = [];

  if (title !== undefined) { fields.push('title = ?'); params.push(title); }
  if (category !== undefined) { fields.push('category = ?'); params.push(category); }
  if (da_score !== undefined) { fields.push('da_score = ?'); params.push(da_score); }
  if (pa_score !== undefined) { fields.push('pa_score = ?'); params.push(pa_score); }
  if (spam_score !== undefined) { fields.push('spam_score = ?'); params.push(spam_score); }
  if (is_free !== undefined) { fields.push('is_free = ?'); params.push(is_free ? 1 : 0); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE backlink_sites SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  
  const site = db.prepare('SELECT * FROM backlink_sites WHERE id = ?').get(req.params.id);
  res.json(site);
});

// DELETE /api/backlinks/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM backlink_sites WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/backlinks/export — Export backlinks as CSV
router.post('/export', (req, res) => {
  const db = getDb();
  const { category, status } = req.body;
  
  let query = 'SELECT url, domain, title, category, da_score, pa_score, spam_score, status, discovered_at FROM backlink_sites';
  const conditions = [];
  const params = [];

  if (category) { conditions.push('category = ?'); params.push(category); }
  if (status) { conditions.push('status = ?'); params.push(status); }

  if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY discovered_at DESC';

  const sites = db.prepare(query).all(...params);
  
  const csv = [
    'URL,Domain,Title,Category,DA,PA,Spam Score,Status,Discovered',
    ...sites.map(s => 
      `"${s.url}","${s.domain}","${s.title || ''}","${s.category}","${s.da_score || ''}","${s.pa_score || ''}","${s.spam_score || ''}","${s.status}","${s.discovered_at}"`
    )
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=backlinks.csv');
  res.send(csv);
});

// POST /api/backlinks/:id/interaction — Mark a backlink as viewed, skipped, or added
router.post('/:id/interaction', requireAuth, (req, res) => {
  const db = getDb();
  const { status } = req.body; // expected: 'viewed', 'skipped', or 'added'
  if (!['viewed', 'skipped', 'added'].includes(status)) {
    return res.status(400).json({ error: 'Invalid interaction status' });
  }

  try {
    db.prepare(`
      INSERT INTO user_interactions (user_id, backlink_site_id, status, interacted_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, backlink_site_id) DO UPDATE SET 
        status = excluded.status,
        interacted_at = CURRENT_TIMESTAMP
    `).run(req.user.id, req.params.id, status);
    
    res.json({ message: 'Interaction saved' });
  } catch (err) {
    if (err.message.includes('FOREIGN KEY')) {
      return res.status(404).json({ error: 'Backlink not found' });
    }
    console.error(err);
    res.status(500).json({ error: 'Database error saving interaction' });
  }
});

// DELETE /api/backlinks/:id/interaction — Remove interaction (un-skip / reset a link)
router.delete('/:id/interaction', requireAuth, (req, res) => {
  const db = getDb();
  try {
    db.prepare(
      'DELETE FROM user_interactions WHERE user_id = ? AND backlink_site_id = ?'
    ).run(req.user.id, req.params.id);
    res.json({ message: 'Interaction cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error clearing interaction' });
  }
});

// POST /api/backlinks/:id/bookmark — Set resume bookmark for a context (global or project:123)
router.post('/:id/bookmark', requireAuth, (req, res) => {
  const db = getDb();
  const { context = 'global' } = req.body;
  try {
    db.prepare(`
      INSERT INTO user_bookmarks (user_id, backlink_site_id, context, bookmarked_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, context) DO UPDATE SET
        backlink_site_id = excluded.backlink_site_id,
        bookmarked_at = CURRENT_TIMESTAMP
    `).run(req.user.id, req.params.id, context);
    res.json({ message: 'Bookmark set' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error setting bookmark' });
  }
});

// DELETE /api/backlinks/bookmark — Clear resume bookmark for a context
router.delete('/bookmark', requireAuth, (req, res) => {
  const db = getDb();
  const { context = 'global' } = req.body;
  try {
    db.prepare('DELETE FROM user_bookmarks WHERE user_id = ? AND context = ?').run(req.user.id, context);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error clearing bookmark' });
  }
});

export default router;
