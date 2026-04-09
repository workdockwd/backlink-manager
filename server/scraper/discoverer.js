import { getDb } from '../db/index.js';
import { fetchPage, extractLinksFromPage, categorizeFromQuery, extractDomain, checkUrlAlive, delay } from './parser.js';
import * as cheerio from 'cheerio';

/**
 * Search queries to find backlink submission sites
 */
const SEARCH_QUERIES = [
  // Blog Submission
  'free blog submission sites list 2025',
  'high DA blog submission sites',
  'instant approval blog submission sites list',
  'dofollow blog submission sites',
  
  // Web 2.0
  'web 2.0 submission sites list 2025',
  'high authority web 2.0 sites for backlinks',
  'free web 2.0 sites list for SEO',
  
  // Directory Submission
  'free directory submission sites list 2025',
  'high DA directory submission sites',
  'instant approval directory submission sites',
  
  // Forum Submission
  'high DA forum submission sites list',
  'dofollow forum posting sites 2025',
  
  // Guest Posting
  'free guest posting sites list 2025',
  'high DA guest blogging sites',
  'guest post submission sites that accept posts',
  
  // Social Bookmarking
  'social bookmarking sites list 2025',
  'high DA social bookmarking submission sites',
  
  // Article Submission
  'free article submission sites list 2025',
  'high DA article submission sites',
  
  // Profile Creation
  'profile creation sites list 2025',
  'high DA profile backlink sites',
  
  // Comment Backlinks
  'dofollow blog commenting sites list',
  'high DA blog commenting sites 2025',
  
  // Image / Infographic
  'image submission sites list 2025',
  'infographic submission sites for backlinks',
  
  // Video Submission
  'video submission sites list for SEO',
  
  // PDF / Document
  'PDF submission sites list 2025',
  'document sharing sites for backlinks',
  
  // Classified
  'free classified submission sites list 2025',
  'high DA classified sites for backlinks',
  
  // Wiki
  'wiki submission sites list 2025',
  
  // Press Release
  'free press release submission sites 2025',
  
  // Q&A
  'question answer sites list for SEO 2025',
];

/**
 * Known SEO blog URLs that contain lists of backlink sites
 * These are the starting seeds for scraping
 */
const SEED_URLS = [
  // Blog submission lists
  { url: 'https://innovkraft.com/100-free-blog-submission-sites-for-high-quality-backlinks-in-2025/', query: 'blog submission sites' },
  { url: 'https://techeasify.com/web-2-0-submission-sites/', query: 'web 2.0 submission sites' },
  { url: 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide', query: 'general' },
  
  // More seed URLs from popular SEO blogs
  { url: 'https://www.flaviocopes.com/sample-blog-submission-sites/', query: 'blog submission sites' },
  { url: 'https://bloggerspassion.com/blog-submission-sites/', query: 'blog submission sites' },
  { url: 'https://www.flaviocopes.com/web-2-0-sites-for-link-building/', query: 'web 2.0 submission sites' },
];

/**
 * Discover backlink sites from a single source URL
 */
export async function discoverFromUrl(sourceUrl, query = 'general') {
  const db = getDb();
  const category = categorizeFromQuery(query);
  let sitesFound = 0;
  let sitesNew = 0;

  try {
    console.log(`🔍 Scraping: ${sourceUrl}`);
    const html = await fetchPage(sourceUrl);
    const links = extractLinksFromPage(html, sourceUrl);
    sitesFound = links.length;

    console.log(`   Found ${links.length} external links`);

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO backlink_sites (url, domain, title, category, source_url, discovered_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const link of links) {
      const domain = extractDomain(link);
      const result = insertStmt.run(link, domain, domain, category, sourceUrl);
      if (result.changes > 0) sitesNew++;
    }

    // Log the scrape
    db.prepare(`
      INSERT INTO scrape_log (source_url, sites_found, sites_new, status, scraped_at)
      VALUES (?, ?, ?, 'success', datetime('now'))
    `).run(sourceUrl, sitesFound, sitesNew);

    // Update scrape source
    db.prepare(`
      INSERT INTO scrape_sources (url, query, last_scraped, sites_found, status)
      VALUES (?, ?, datetime('now'), ?, 'active')
      ON CONFLICT(url) DO UPDATE SET last_scraped = datetime('now'), sites_found = sites_found + ?
    `).run(sourceUrl, query, sitesNew, sitesNew);

    console.log(`   ✅ Added ${sitesNew} new sites (${sitesFound - sitesNew} duplicates skipped)`);

    return { sitesFound, sitesNew, status: 'success' };
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    
    db.prepare(`
      INSERT INTO scrape_log (source_url, sites_found, sites_new, status, error, scraped_at)
      VALUES (?, 0, 0, 'failed', ?, datetime('now'))
    `).run(sourceUrl, err.message);

    return { sitesFound: 0, sitesNew: 0, status: 'failed', error: err.message };
  }
}

/**
 * Run a Google search and scrape the result pages for backlink lists
 */
export async function discoverFromSearch(query) {
  console.log(`\n🔎 Searching for: "${query}"`);
  
  // Use DuckDuckGo HTML search (more scrape-friendly than Google)
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' sites list')}`;
  
  try {
    const html = await fetchPage(searchUrl);
    const $ = cheerio.load(html);
    const resultUrls = [];

    // Extract search result URLs from DuckDuckGo HTML
    $('a.result__a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) {
        resultUrls.push(href);
      }
    });

    // Also try the snippet URLs
    $('a.result__url').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const url = href.startsWith('http') ? href : `https://${href.trim()}`;
          resultUrls.push(url);
        } catch {}
      }
    });

    console.log(`   Found ${resultUrls.length} search results`);

    let totalNew = 0;
    // Scrape top 5 results
    for (const url of resultUrls.slice(0, 5)) {
      await delay(2000 + Math.random() * 3000); // Respectful delay
      const result = await discoverFromUrl(url, query);
      totalNew += result.sitesNew;
    }

    return { totalNew, resultsScraped: Math.min(resultUrls.length, 5) };
  } catch (err) {
    console.error(`   ❌ Search failed: ${err.message}`);
    return { totalNew: 0, resultsScraped: 0, error: err.message };
  }
}

/**
 * Run the full discovery pipeline
 * 1. Scrape known seed URLs
 * 2. Search DuckDuckGo for new sources
 */
export async function runFullDiscovery(options = {}) {
  const { searchQueries = 3, scrapeSeeds = true } = options;
  const db = getDb();
  
  console.log('\n═══════════════════════════════════════');
  console.log('🚀 Starting Full Backlink Discovery');
  console.log('═══════════════════════════════════════\n');

  const startCount = db.prepare('SELECT COUNT(*) as count FROM backlink_sites').get().count;
  let totalNew = 0;

  // Step 1: Scrape seed URLs
  if (scrapeSeeds) {
    console.log('📋 Phase 1: Scraping seed URLs...\n');
    for (const seed of SEED_URLS) {
      const result = await discoverFromUrl(seed.url, seed.query);
      totalNew += result.sitesNew;
      await delay(2000 + Math.random() * 2000);
    }
  }

  // Step 2: Search for new sources
  console.log('\n📋 Phase 2: Searching for new sources...\n');
  const queriesToRun = SEARCH_QUERIES
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, searchQueries);

  for (const query of queriesToRun) {
    const result = await discoverFromSearch(query);
    totalNew += result.totalNew;
    await delay(5000 + Math.random() * 5000); // Longer delay between searches
  }

  const endCount = db.prepare('SELECT COUNT(*) as count FROM backlink_sites').get().count;

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Discovery Complete!`);
  console.log(`   Total sites in DB: ${endCount}`);
  console.log(`   New sites added: ${endCount - startCount}`);
  console.log('═══════════════════════════════════════\n');

  return {
    totalSites: endCount,
    newSitesAdded: endCount - startCount,
    startCount,
    endCount,
  };
}

