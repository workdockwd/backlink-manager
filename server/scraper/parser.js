import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch a URL with retry and random user-agent
 */
export async function fetchPage(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await axios.get(url, {
        headers: {
          'User-Agent': randomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        timeout: 15000,
        maxRedirects: 5,
      });
      return resp.data;
    } catch (err) {
      if (i < retries) {
        await delay(2000 * (i + 1));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Extract external links from a blog post / list page
 * These are typically the backlink submission sites listed in SEO articles
 */
export function extractLinksFromPage(html, sourceUrl) {
  const $ = cheerio.load(html);
  const links = new Set();
  const sourceDomain = new URL(sourceUrl).hostname;

  // Get all anchor tags
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    try {
      const url = new URL(href);
      
      // Filter: only http/https, skip same-domain, skip known non-submission sites
      if (!['http:', 'https:'].includes(url.protocol)) return;
      if (url.hostname === sourceDomain) return;
      if (isExcludedDomain(url.hostname)) return;

      // Heuristic: Collapse deep "example profile" or "example post" URLs to their root platform domain.
      // If a path has more than 1 segment, assume it's a deep link and extract just the base domain.
      const pathSegments = url.pathname.split('/').filter(p => p.length > 0);
      let finalUrl = url;
      if (pathSegments.length > 1) {
        finalUrl = new URL(`${url.protocol}//${url.hostname}`);
      }

      // Ignore messy URLs with tracking/sharing query parameters
      if (url.search && (url.search.includes('share') || url.search.includes('ref') || url.search.includes('camp') || url.search.length > 15)) return;
      
      const pathLow = finalUrl.pathname.toLowerCase();

      // Ignore common non-target paths or internal CMS routes
      const badPaths = ['/author/', '/category/', '/tag/', '/about', '/contact', '/privacy', '/terms', '/wp-content/', '/wp-admin/', '/blog', '/news', '/article'];
      const badExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
      
      if (badPaths.some(bp => pathLow.includes(bp))) return;
      if (badExtensions.some(ext => pathLow.endsWith(ext))) return;
      
      // Clean the URL  
      const cleanUrl = `${finalUrl.protocol}//${finalUrl.hostname}${finalUrl.pathname}`.replace(/\/+$/, '');
      links.add(cleanUrl);
    } catch {
      // Invalid URL, skip
    }
  });

  return [...links];
}

/**
 * Domains to exclude (social media, search engines, tools, etc.)
 */
const EXCLUDED_DOMAINS = [
  // Search & Social
  'google.', 'facebook.com', 'twitter.com', 'x.com', 'youtube.com',
  'instagram.com', 'linkedin.com', 'pinterest.com', 'reddit.com',
  'tiktok.com', 'snapchat.com', 'whatsapp.com', 'messenger.com',
  'discord.com', 'twitch.tv', 'quora.com',
  
  // Tech/Corp
  'amazon.com', 'apple.com', 'microsoft.com', 'yahoo.com', 'bing.com',
  'mozilla.org', 'w3.org', 'adobe.com', 'oracle.com', 'ibm.com',

  // Dev/Assets
  'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
  'codepen.io', 'unsplash.com', 'freepik.com', 'pexels.com', 'pixabay.com',
  
  // News/Media
  'cnn.com', 'bbc.com', 'nytimes.com', 'forbes.com', 'bloomberg.com',
  'reuters.com', 'wsj.com', 'theguardian.com', 'washingtonpost.com',

  // SEO tools
  'moz.com', 'ahrefs.com', 'semrush.com', 'majestic.com', 'hubspot.com',

  // CDNs / Trackers / Shorteners
  'fonts.google.com', 'cdn.', 'googleapis.com', 'gstatic.com',
  'cloudflare.com', 'wp.com', 'gravatar.com', 'creativecommons.org',
  't.co', 'bit.ly', 'tinyurl.com', 'ow.ly', 'goo.gl', 'is.gd', 'buff.ly',

  // E-commerce/Platform generic
  'shopify.com', 'ebay.com', 'etsy.com', 'aliexpress.com', 'walmart.com',
];

function isExcludedDomain(hostname) {
  return EXCLUDED_DOMAINS.some(d => hostname.includes(d));
}

/**
 * Categorize a backlink site based on the search query used to find it
 */
export function categorizeFromQuery(query) {
  const q = query.toLowerCase();
  if (q.includes('blog submission') || q.includes('blog posting')) return 'blog';
  if (q.includes('web 2.0')) return 'web2.0';
  if (q.includes('directory submission') || q.includes('directory sites')) return 'directory';
  if (q.includes('forum') || q.includes('forum submission')) return 'forum';
  if (q.includes('guest post') || q.includes('guest blogging')) return 'guest-post';
  if (q.includes('social bookmarking')) return 'social-bookmark';
  if (q.includes('article submission')) return 'article';
  if (q.includes('profile creation') || q.includes('profile backlink')) return 'profile';
  if (q.includes('comment') || q.includes('blog comment')) return 'comment';
  if (q.includes('image submission') || q.includes('infographic')) return 'image';
  if (q.includes('video submission')) return 'video';
  if (q.includes('pdf submission') || q.includes('document sharing')) return 'document';
  if (q.includes('classified')) return 'classified';
  if (q.includes('wiki')) return 'wiki';
  if (q.includes('press release')) return 'press-release';
  if (q.includes('question answer') || q.includes('q&a')) return 'qa';
  return 'general';
}

/**
 * Extract domain from URL
 */
export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Check if a URL is alive via HEAD request
 */
export async function checkUrlAlive(url, timeout = 8000) {
  try {
    const resp = await axios.head(url, {
      headers: { 'User-Agent': randomUA() },
      timeout,
      maxRedirects: 3,
      validateStatus: (s) => s < 400,
    });
    return { alive: true, status: resp.status };
  } catch {
    try {
      // Fallback: try GET if HEAD fails
      const resp = await axios.get(url, {
        headers: { 'User-Agent': randomUA() },
        timeout,
        maxRedirects: 3,
        validateStatus: (s) => s < 400,
      });
      return { alive: true, status: resp.status };
    } catch {
      return { alive: false, status: 0 };
    }
  }
}
