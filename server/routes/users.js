import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 10;

// GET /api/users/settings — Get current user's settings (auth required, handled by middleware)
router.get('/settings', requireAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const db = getDb();
  const user = db.prepare('SELECT username, bio, email, gemini_api_key FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // Mask the API key for display
  const maskedKey = user.gemini_api_key
    ? user.gemini_api_key.slice(0, 6) + '••••••' + user.gemini_api_key.slice(-4)
    : null;
  res.json({ ...user, gemini_api_key_masked: maskedKey, has_api_key: !!user.gemini_api_key });
});

// PUT /api/users/settings — Update API key
router.put('/settings', requireAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const db = getDb();
  const { gemini_api_key } = req.body;
  
  if (gemini_api_key !== undefined) {
    db.prepare('UPDATE users SET gemini_api_key = ? WHERE id = ?').run(gemini_api_key || null, req.user.id);
  }
  
  res.json({ success: true, has_api_key: !!gemini_api_key });
});

// PUT /api/users/profile — Update username/bio
router.put('/profile', requireAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const db = getDb();
  const { username, bio } = req.body;

  const fields = [];
  const params = [];
  if (username !== undefined) { fields.push('username = ?'); params.push(username); }
  if (bio !== undefined) { fields.push('bio = ?'); params.push(bio); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.user.id);
  try {
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    const updated = db.prepare('SELECT id, username, bio, email FROM users WHERE id = ?').get(req.user.id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    throw err;
  }
});

// PUT /api/users/password — Change password
router.put('/password', requireAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const db = getDb();
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both current and new password required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

  const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
  res.json({ success: true });
});

// DELETE /api/users/account — Delete account
router.delete('/account', requireAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const db = getDb();
  const { password } = req.body;

  if (!password) return res.status(400).json({ error: 'Password required for account deletion' });

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(400).json({ error: 'Incorrect password' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.json({ success: true });
});

// GET /api/users/:username - Public profile
router.get('/:username', (req, res) => {
  const db = getDb();
  const identifier = req.params.username;

  let user = db.prepare('SELECT id, username, bio, created_at FROM users WHERE username = ?').get(identifier);
  if (!user) {
    user = db.prepare('SELECT id, username, bio, created_at FROM users WHERE email LIKE ?').get(`${identifier}@%`);
  }
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const submissions = db.prepare(
    `SELECT backlink_sites.*, users.username 
     FROM backlink_sites 
     LEFT JOIN users ON backlink_sites.user_id = users.id 
     WHERE backlink_sites.user_id = ? 
     ORDER BY backlink_sites.discovered_at DESC`
  ).all(user.id);

  const stats = {
    totalSubmissions: submissions.length,
    activeLinks: submissions.filter(s => s.status === 'active').length,
  };

  res.json({
    user: {
      username: user.username,
      bio: user.bio,
      joinedAt: user.created_at
    },
    stats,
    submissions
  });
});

export default router;
