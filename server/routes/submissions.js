import { Router } from 'express';
import { getDb } from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// Decode user token on all submission routes (non-blocking)
router.use(optionalAuth);

// POST /api/submissions — Create submission(s)
router.post('/', (req, res) => {
  const db = getDb();
  const { project_id, backlink_site_ids, backlink_site_id } = req.body;
  
  if (!project_id) return res.status(400).json({ error: 'project_id required' });

  // Support both single and bulk creation
  const siteIds = backlink_site_ids || (backlink_site_id ? [backlink_site_id] : []);
  if (!siteIds.length) return res.status(400).json({ error: 'At least one backlink_site_id required' });

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO submissions (project_id, backlink_site_id, status, created_at)
    VALUES (?, ?, 'pending', datetime('now'))
  `);
  
  const interactStmt = db.prepare(`
    INSERT INTO user_interactions (user_id, backlink_site_id, status, interacted_at)
    VALUES (?, ?, 'added', CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, backlink_site_id) DO UPDATE SET 
      status = 'added',
      interacted_at = CURRENT_TIMESTAMP
  `);

  const inserted = [];
  for (const sid of siteIds) {
    const result = insertStmt.run(project_id, sid);
    if (result.changes > 0) inserted.push(result.lastInsertRowid);
    
    // Automatically track that the user 'added' this link so it can be filtered globally
    if (req.user) {
      interactStmt.run(req.user.id, sid);
    }
  }

  res.status(201).json({ created: inserted.length, ids: inserted });
});

// PUT /api/submissions/:id — Update submission
router.put('/:id', (req, res) => {
  const db = getDb();
  const { status, anchor_text, target_url, notes } = req.body;
  
  const fields = [];
  const params = [];

  if (status !== undefined) {
    fields.push('status = ?');
    params.push(status);
    if (status === 'submitted') {
      fields.push("submitted_at = datetime('now')");
    }
  }
  if (anchor_text !== undefined) { fields.push('anchor_text = ?'); params.push(anchor_text); }
  if (target_url !== undefined) { fields.push('target_url = ?'); params.push(target_url); }
  if (req.body.content_title !== undefined) { fields.push('content_title = ?'); params.push(req.body.content_title); }
  if (req.body.content_description !== undefined) { fields.push('content_description = ?'); params.push(req.body.content_description); }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
  if (req.body.live_url !== undefined) { fields.push('live_url = ?'); params.push(req.body.live_url); }
  if (req.body.da_score !== undefined) { fields.push('da_score = ?'); params.push(req.body.da_score); }
  if (req.body.pa_score !== undefined) { fields.push('pa_score = ?'); params.push(req.body.pa_score); }
  if (req.body.spam_score !== undefined) { fields.push('spam_score = ?'); params.push(req.body.spam_score); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE submissions SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  
  const sub = db.prepare(`
    SELECT s.*, b.url as site_url, b.domain as site_domain, b.title as site_title
    FROM submissions s
    JOIN backlink_sites b ON s.backlink_site_id = b.id
    WHERE s.id = ?
  `).get(req.params.id);
  
  res.json(sub);
});

// PUT /api/submissions/:id/mark-last — Mark as "last done" for resume feature
router.put('/:id/mark-last', (req, res) => {
  const db = getDb();
  
  // Get the submission to find its project
  const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  // Clear all other "last done" markers for this project
  db.prepare('UPDATE submissions SET is_last_done = 0 WHERE project_id = ?').run(sub.project_id);
  
  let newStatus = 0;
  // If it wasn't marked before, we set it. Otherwise we leave it cleared (toggled off)
  if (!sub.is_last_done) {
    db.prepare('UPDATE submissions SET is_last_done = 1 WHERE id = ?').run(req.params.id);
    newStatus = 1;
  }

  res.json({ success: true, is_last_done: newStatus });
});

// DELETE /api/submissions/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  
  // Find backlink_site_id before deleting
  const sub = db.prepare('SELECT backlink_site_id FROM submissions WHERE id = ?').get(req.params.id);
  
  db.prepare('DELETE FROM submissions WHERE id = ?').run(req.params.id);

  // If no other submissions exist for this user & backlink, un-hide it
  if (req.user && sub) {
    const activeCount = db.prepare(`
      SELECT COUNT(*) as count FROM submissions s 
      JOIN projects p ON s.project_id = p.id 
      WHERE p.user_id = ? AND s.backlink_site_id = ?
    `).get(req.user.id, sub.backlink_site_id).count;
    
    if (activeCount === 0) {
      db.prepare("DELETE FROM user_interactions WHERE user_id = ? AND backlink_site_id = ? AND status = 'added'")
        .run(req.user.id, sub.backlink_site_id);
    }
  }

  res.json({ success: true });
});

// Bulk status update
router.put('/bulk/status', (req, res) => {
  const db = getDb();
  const { ids, status } = req.body;
  
  if (!ids || !ids.length || !status) {
    return res.status(400).json({ error: 'ids array and status required' });
  }

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE submissions SET status = ? WHERE id IN (${placeholders})`).run(status, ...ids);

  res.json({ updated: ids.length });
});

// Bulk delete update
router.delete('/bulk', (req, res) => {
  const db = getDb();
  const { ids } = req.body;
  
  if (!ids || !ids.length) {
    return res.status(400).json({ error: 'ids array required' });
  }

  try {
    const placeholders = ids.map(() => '?').join(',');
    
    // Find backlink_site_ids before deleting
    const subs = db.prepare(`SELECT DISTINCT backlink_site_id FROM submissions WHERE id IN (${placeholders})`).all(...ids);
    
    db.prepare(`DELETE FROM submissions WHERE id IN (${placeholders})`).run(...ids);
    
    // Un-hide if no other submissions exist
    if (req.user && subs.length > 0) {
      for (const sub of subs) {
        const activeCount = db.prepare(`
          SELECT COUNT(*) as count FROM submissions s 
          JOIN projects p ON s.project_id = p.id 
          WHERE p.user_id = ? AND s.backlink_site_id = ?
        `).get(req.user.id, sub.backlink_site_id).count;
        
        if (activeCount === 0) {
          db.prepare("DELETE FROM user_interactions WHERE user_id = ? AND backlink_site_id = ? AND status = 'added'")
            .run(req.user.id, sub.backlink_site_id);
        }
      }
    }

    res.json({ deleted: ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
