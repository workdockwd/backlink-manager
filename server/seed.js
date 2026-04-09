import { getDb } from './db/index.js';

const HIGH_QUALITY_SEEDS = [
  // Profile Creation
  { domain: 'github.com', url: 'https://github.com/join', category: 'profile', title: 'GitHub Profile', is_free: 1, da_score: 96, pa_score: 96 },
  { domain: 'producthunt.com', url: 'https://www.producthunt.com/signup', category: 'profile', title: 'Product Hunt Profile', is_free: 1, da_score: 90, pa_score: 90 },
  { domain: 'behance.net', url: 'https://www.behance.net/signup', category: 'profile', title: 'Behance Portfolio', is_free: 1, da_score: 95, pa_score: 94 },
  { domain: 'dribbble.com', url: 'https://dribbble.com/signup', category: 'profile', title: 'Dribbble Developer Profile', is_free: 1, da_score: 93, pa_score: 92 },
  { domain: 'ted.com', url: 'https://www.ted.com/participate/ted-community', category: 'profile', title: 'TED Community Profile', is_free: 1, da_score: 93, pa_score: 90 },
  { domain: 'soundcloud.com', url: 'https://soundcloud.com/signup', category: 'profile', title: 'SoundCloud Profile', is_free: 1, da_score: 93, pa_score: 92 },
  { domain: 'about.me', url: 'https://about.me/', category: 'profile', title: 'About.me Personal Page', is_free: 1, da_score: 89, pa_score: 88 },
  { domain: 'vimeo.com', url: 'https://vimeo.com/join', category: 'profile', title: 'Vimeo Creator Profile', is_free: 1, da_score: 94, pa_score: 94 },
  
  // Web 2.0
  { domain: 'medium.com', url: 'https://medium.com/m/signin', category: 'web2.0', title: 'Medium Blog', is_free: 1, da_score: 95, pa_score: 94 },
  { domain: 'wordpress.com', url: 'https://wordpress.com/start', category: 'web2.0', title: 'WordPress Free Site', is_free: 1, da_score: 95, pa_score: 96 },
  { domain: 'tumblr.com', url: 'https://www.tumblr.com/register', category: 'web2.0', title: 'Tumblr Microblog', is_free: 1, da_score: 85, pa_score: 85 },
  { domain: 'blogger.com', url: 'https://www.blogger.com/about', category: 'web2.0', title: 'Blogger / Blogspot', is_free: 1, da_score: 99, pa_score: 98 },
  { domain: 'wix.com', url: 'https://manage.wix.com/signin', category: 'web2.0', title: 'Wix Free Website', is_free: 1, da_score: 94, pa_score: 93 },
  { domain: 'weebly.com', url: 'https://www.weebly.com/signup', category: 'web2.0', title: 'Weebly Free Site', is_free: 1, da_score: 93, pa_score: 92 },
  { domain: 'strikingly.com', url: 'https://www.strikingly.com/s/signup', category: 'web2.0', title: 'Strikingly One-Page Site', is_free: 1, da_score: 89, pa_score: 88 },
  
  // Social Bookmarking
  { domain: 'reddit.com', url: 'https://www.reddit.com/register', category: 'social-bookmark', title: 'Reddit Submissions', is_free: 1, da_score: 95, pa_score: 94 },
  { domain: 'slashdot.org', url: 'https://slashdot.org/login.pl', category: 'social-bookmark', title: 'Slashdot Technology News', is_free: 1, da_score: 91, pa_score: 90 },
  { domain: 'scoop.it', url: 'https://www.scoop.it/signup', category: 'social-bookmark', title: 'Scoop.it Content Curation', is_free: 1, da_score: 92, pa_score: 90 },
  { domain: 'diigo.com', url: 'https://www.diigo.com/sign-up', category: 'social-bookmark', title: 'Diigo Bookmarking', is_free: 1, da_score: 89, pa_score: 88 },
  { domain: 'pearltrees.com', url: 'https://www.pearltrees.com/', category: 'social-bookmark', title: 'Pearltrees Organization', is_free: 1, da_score: 85, pa_score: 84 },
  { domain: 'bizsugar.com', url: 'https://share.bizsugar.com/register', category: 'social-bookmark', title: 'BizSugar Business Bookmarks', is_free: 1, da_score: 72, pa_score: 70 },

  // Forum Submissions & Q&A
  { domain: 'quora.com', url: 'https://www.quora.com/', category: 'qa', title: 'Quora Answers', is_free: 1, da_score: 93, pa_score: 93 },
  { domain: 'stackoverflow.com', url: 'https://stackoverflow.com/users/signup', category: 'forum', title: 'Stack Overflow Developer Forum', is_free: 1, da_score: 93, pa_score: 93 },
  { domain: 'warriorforum.com', url: 'https://www.warriorforum.com/register.php', category: 'forum', title: 'Warrior Forum Marketing', is_free: 1, da_score: 81, pa_score: 82 },
  { domain: 'digitalpoint.com', url: 'https://forums.digitalpoint.com/register', category: 'forum', title: 'Digital Point SEO Forums', is_free: 1, da_score: 85, pa_score: 84 },
  
  // Audio / Video / Image
  { domain: 'pinterest.com', url: 'https://www.pinterest.com/', category: 'image', title: 'Pinterest Pin Submissions', is_free: 1, da_score: 94, pa_score: 94 },
  { domain: 'flickr.com', url: 'https://identity.flickr.com/sign-up', category: 'image', title: 'Flickr Image Hosting', is_free: 1, da_score: 94, pa_score: 93 },
  { domain: 'imgur.com', url: 'https://imgur.com/register', category: 'image', title: 'Imgur Image Sharing', is_free: 1, da_score: 92, pa_score: 91 },
  { domain: 'youtube.com', url: 'https://www.youtube.com/', category: 'video', title: 'YouTube Video Description', is_free: 1, da_score: 99, pa_score: 99 },
  { domain: 'dailymotion.com', url: 'https://www.dailymotion.com/signup', category: 'video', title: 'Dailymotion Videos', is_free: 1, da_score: 94, pa_score: 93 },

  // Document / PDF
  { domain: 'slideshare.net', url: 'https://www.slideshare.net/signup', category: 'document', title: 'SlideShare Presentations', is_free: 1, da_score: 95, pa_score: 95 },
  { domain: 'issuu.com', url: 'https://issuu.com/signup', category: 'document', title: 'Issuu Digital Publishing', is_free: 1, da_score: 94, pa_score: 94 },
  { domain: 'scribd.com', url: 'https://www.scribd.com/login', category: 'document', title: 'Scribd Document Hosting', is_free: 1, da_score: 92, pa_score: 91 },
  { domain: 'calameo.com', url: 'https://www.calameo.com/signup', category: 'document', title: 'Calameo Publications', is_free: 1, da_score: 89, pa_score: 88 },
  
  // Blog Commenting / Article
  { domain: 'dev.to', url: 'https://dev.to/enter', category: 'article', title: 'DEV Community Blog', is_free: 1, da_score: 88, pa_score: 87 },
  { domain: 'hashnode.com', url: 'https://hashnode.com/signup', category: 'article', title: 'Hashnode Developer Blogs', is_free: 1, da_score: 84, pa_score: 83 },
  { domain: 'hubpages.com', url: 'https://hubpages.com/user/new', category: 'article', title: 'HubPages Article Creation', is_free: 1, da_score: 88, pa_score: 88 },

  // Business Directories
  { domain: 'yelp.com', url: 'https://biz.yelp.com/signup', category: 'directory', title: 'Yelp for Business', is_free: 1, da_score: 94, pa_score: 93 },
  { domain: 'trustpilot.com', url: 'https://business.trustpilot.com/', category: 'directory', title: 'Trustpilot Reviews', is_free: 1, da_score: 93, pa_score: 92 },
  { domain: 'foursquare.com', url: 'https://foursquare.com/add-place', category: 'directory', title: 'Foursquare City Guide', is_free: 1, da_score: 91, pa_score: 90 },
  { domain: 'hotfrog.com', url: 'https://www.hotfrog.com/add-your-business', category: 'directory', title: 'HotFrog Business Directory', is_free: 1, da_score: 84, pa_score: 82 },
];

async function runSeed() {
  console.log('🌱 Seeding high quality backlink targets...');
  const db = getDb();
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO backlink_sites (url, domain, title, category, da_score, pa_score, is_free, source_url, discovered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'system_seed', datetime('now'))
  `);

  let added = 0;
  for (const site of HIGH_QUALITY_SEEDS) {
    const result = insertStmt.run(site.url, site.domain, site.title, site.category, site.da_score, site.pa_score, site.is_free);
    if (result.changes > 0) added++;
  }
  
  console.log(`✅ Seeded ${added} premium backlink submission sites!`);
}

runSeed();
