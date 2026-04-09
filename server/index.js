import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { getDb, closeDb } from './db/index.js';
import backlinkRoutes from './routes/backlinks.js';
import projectRoutes from './routes/projects.js';
import submissionRoutes from './routes/submissions.js';
import scraperRoutes from './routes/scraper.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import aiRoutes from './routes/ai.js';
import { runFullDiscovery } from './scraper/discoverer.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
getDb();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/backlinks', backlinkRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/submissions', requireAuth, submissionRoutes);
app.use('/api/scraper', requireAuth, scraperRoutes);
app.use('/api/ai', requireAuth, aiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM backlink_sites').get().count;
  res.json({ status: 'ok', backlinks: count, timestamp: new Date().toISOString() });
});

// Schedule weekly scraping (every Sunday at 2 AM)
cron.schedule('0 2 * * 0', async () => {
  console.log('⏰ Running scheduled weekly scrape...');
  try {
    await runFullDiscovery({ searchQueries: 5 });
  } catch (err) {
    console.error('Scheduled scrape failed:', err.message);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`\n🚀 Backlink Directory Server running on http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Scraper scheduled: Every Sunday at 2:00 AM\n`);
});
