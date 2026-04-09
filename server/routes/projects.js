import { Router } from 'express';
import { getDb } from '../db/index.js';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public Route (must be before requireAuth)
// GET /api/projects/shared/:token
router.get('/shared/:token', (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT p.*, u.username as owner_name FROM projects p JOIN users u ON p.user_id = u.id WHERE p.share_token = ?').get(req.params.token);
  if (!project) return res.status(404).json({ error: 'Shared project not found or invalid token' });

  const submissions = db.prepare(`
    SELECT s.*, b.url as site_url, b.domain as site_domain, b.category as site_category
    FROM submissions s
    JOIN backlink_sites b ON s.backlink_site_id = b.id
    WHERE s.project_id = ?
    ORDER BY s.is_last_done DESC, s.created_at ASC
  `).all(project.id);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  res.json({ ...project, submissions, stats });
});

// Protect all routes below
router.use(requireAuth);

// GET /api/projects
router.get('/', (req, res) => {
  const db = getDb();
  const projects = db.prepare(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM submissions s WHERE s.project_id = p.id) as total_submissions,
      (SELECT COUNT(*) FROM submissions s WHERE s.project_id = p.id AND s.status = 'submitted') as completed_submissions,
      (SELECT COUNT(*) FROM submissions s WHERE s.project_id = p.id AND s.status = 'approved') as approved_submissions
    FROM projects p
    WHERE p.user_id = ?
    ORDER BY p.updated_at DESC
  `).all(req.user.id);
  res.json(projects);
});

// POST /api/projects
router.post('/', (req, res) => {
  const db = getDb();
  const { name, domain, keywords, description } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const result = db.prepare(
    `INSERT INTO projects (user_id, name, domain, keywords, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).run(req.user.id, name, domain, JSON.stringify(keywords || []), description);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  // Get submissions with backlink site info
  const submissions = db.prepare(`
    SELECT s.*, b.url as site_url, b.domain as site_domain, b.title as site_title, 
           b.category as site_category,
           COALESCE(s.da_score, b.da_score) as da_score, 
           COALESCE(s.pa_score, b.pa_score) as pa_score,
           s.spam_score, b.is_private
    FROM submissions s
    JOIN backlink_sites b ON s.backlink_site_id = b.id
    WHERE s.project_id = ?
    ORDER BY s.is_last_done DESC, s.created_at ASC
  `).all(req.params.id);

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
  };

  res.json({ ...project, submissions, stats });
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, domain, keywords, description, target_urls, content_snippets } = req.body;
  
  const fields = ["updated_at = datetime('now')"];
  const params = [];

  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (domain !== undefined) { fields.push('domain = ?'); params.push(domain); }
  if (keywords !== undefined) { fields.push('keywords = ?'); params.push(JSON.stringify(keywords)); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (target_urls !== undefined) { fields.push('target_urls = ?'); params.push(JSON.stringify(target_urls)); }
  if (content_snippets !== undefined) { fields.push('content_snippets = ?'); params.push(JSON.stringify(content_snippets)); }

  params.push(req.params.id, req.user.id);
  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
  
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// POST /api/projects/:id/share
router.post('/:id/share', (req, res) => {
  const db = getDb();
  let project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (!project.share_token) {
    const token = crypto.randomUUID();
    db.prepare('UPDATE projects SET share_token = ? WHERE id = ?').run(token, project.id);
    project.share_token = token;
  }
  
  res.json({ share_token: project.share_token });
});

// GET /api/projects/:id/export
router.get('/:id/export', (req, res) => {
  const db = getDb();
  const project = db.prepare('SELECT name FROM projects WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const submissions = db.prepare(`
    SELECT s.status, s.anchor_text, s.target_url, s.notes, s.submitted_at, s.created_at, b.url, b.domain, b.category
    FROM submissions s
    JOIN backlink_sites b ON s.backlink_site_id = b.id
    WHERE s.project_id = ?
    ORDER BY s.created_at ASC
  `).all(req.params.id);

  const header = ['Date (Working)', 'URL', 'Domain', 'Category', 'Status', 'Anchor Text', 'Target URL', 'Notes', 'Submitted At'];
  let prevDate = null;
  const rows = submissions.map(s => {
    const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString() : '';
    const showDate = dateStr !== prevDate;
    prevDate = dateStr;
    return [
      showDate ? dateStr : '', s.url, s.domain, s.category, s.status, s.anchor_text || '', s.target_url || '', s.notes || '', s.submitted_at || ''
    ];
  });

  const csvContent = [header, ...rows]
    .map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=project-${project.name.replace(/\\s+/g, '-')}-export.csv`);
  res.send(csvContent);
});

export default router;
