import { Router } from 'express';
import { getDb } from '../db/index.js';
import { runFullDiscovery, discoverFromUrl } from '../scraper/discoverer.js';

const router = Router();

let isRunning = false;
let lastRunResult = null;

// POST /api/scraper/run — Trigger manual scraper run
router.post('/run', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: 'Scraper is already running' });
  }

  const { searchQueries = 3 } = req.body;

  isRunning = true;
  res.json({ message: 'Scraper started', status: 'running' });

  try {
    lastRunResult = await runFullDiscovery({ searchQueries });
    lastRunResult.completedAt = new Date().toISOString();
  } catch (err) {
    lastRunResult = { error: err.message, completedAt: new Date().toISOString() };
  } finally {
    isRunning = false;
  }
});

// POST /api/scraper/scrape-url — Scrape a specific URL
router.post('/scrape-url', async (req, res) => {
  const { url, query = 'general' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const result = await discoverFromUrl(url, query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scraper/status
router.get('/status', (req, res) => {
  res.json({
    isRunning,
    lastRunResult,
  });
});

// GET /api/scraper/history — Scrape log
router.get('/history', (req, res) => {
  const db = getDb();
  const logs = db.prepare(
    'SELECT * FROM scrape_log ORDER BY scraped_at DESC LIMIT 50'
  ).all();
  const sources = db.prepare(
    'SELECT * FROM scrape_sources ORDER BY last_scraped DESC'
  ).all();
  res.json({ logs, sources });
});

export default router;
