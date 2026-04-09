import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, Zap, Target, Activity, Lock, ArrowRight, TrendingUp, Compass, Search } from 'lucide-react';
import { backlinksApi } from '../api';
import BacklinkGrid from '../components/BacklinkGrid';// Dynamic submission tips based on category
const SUBMISSION_TIPS = {
  'profile': "Fill out the bio completely with your target keywords naturally sprinkled in. Upload a real avatar to avoid deletion.",
  'web2.0': "Publish at least a 500-word unique article. Don't just drop links - make it look like a real blog to pass manual reviews.",
  'social-bookmark': "Use a catchy title and write a custom 2-sentence description. Tag relevant keywords.",
  'forum': "Contribute a meaningful answer to a thread before dropping your link in your signature or a relevant post.",
  'article': "Submit highly relevant, well-formatted content with H2s and H3s. Contextual links carry the most authority.",
  'image': "Add detailed descriptions (100+ words) to your images and include a link back to your source post.",
  'video': "Include your link in the first 2 lines of the video description so it's above the 'Show More' fold.",
  'document': "Embed your links naturally inside the PDF pages. Ensure the document provides real value to get views.",
  'directory': "Ensure your NAP (Name, Address, Phone) is perfectly identical to your local listings.",
  'default': "Always use diverse anchor texts to maintain a natural backlink profile."
};

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'profile', label: 'Profiles' },
  { id: 'web2.0', label: 'Web 2.0' },
  { id: 'social-bookmark', label: 'Bookmarks' },
  { id: 'forum', label: 'Forums' },
  { id: 'article', label: 'Articles' },
];

export default function Home({ navigateTo }) {
  const [backlinks, setBacklinks] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  
  // Modal State
  const [selectedSite, setSelectedSite] = useState(null);

  const fetchBacklinks = (currentPage, currentCategory, currentSearch) => {
    setLoading(true);
    const params = { page: currentPage, limit: 24, sort: 'newest' };
    if (currentCategory) params.category = currentCategory;
    if (currentSearch) params.search = currentSearch;

    backlinksApi.list(params)
      .then(res => {
        setBacklinks(res.sites || []);
        if (res.pagination) {
          setTotalPages(res.pagination.pages || 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBacklinks(page, category, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, category, search]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  useEffect(() => {
    backlinksApi.list({ limit: 3, sort: 'newest' })
      .then(res => setTrending(res.sites || []))
      .catch(console.error);
  }, []);

  const handleCategoryClick = (catId) => {
    setCategory(catId);
    setPage(1);
  };

  const getTip = (cat) => SUBMISSION_TIPS[cat] || SUBMISSION_TIPS['default'];

  return (
    <div style={{ padding: '0 3vw', margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '24px 0', borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            fontSize: 24, background: 'var(--accent)', color: 'white', 
            width: 40, height: 40, display: 'flex', alignItems: 'center', 
            justifyContent: 'center', borderRadius: 10 
          }}>
            <Link size={22} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>LinkVault</h1>
        </div>
        <div>
          <button className="btn btn-ghost" onClick={() => navigateTo('login')} style={{ marginRight: 16 }}>Login</button>
          <button className="btn btn-primary" onClick={() => navigateTo('login')}>Get Started</button>
        </div>
      </header>

      {/* Hero Section with Features */}
      <main style={{ padding: '80px 0 64px' }} className="glowing-bg">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 60px' }}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow-sm)', color: 'var(--accent)', borderRadius: 30, fontSize: 13, fontWeight: 600, marginBottom: 24 }}
          >
            <Zap size={16} /> <span>The Ultimate Link Building Workspace</span>
          </motion.div>
          
          <h2 style={{ fontSize: 56, fontWeight: 800, marginBottom: 24, lineHeight: 1.1, letterSpacing: '-1.5px', color: 'var(--text-primary)' }}>
            Supercharge your SEO with <span style={{ color: 'var(--accent)' }}>High-Quality Backlinks</span>
          </h2>
          
          <p style={{ fontSize: 20, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 640, margin: '0 auto 40px' }}>
            Browse a massive, constantly updating directory of premium backlink targets. Stop managing messy spreadsheets—start ranking higher.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" style={{ borderRadius: 30, padding: '14px 28px' }} onClick={() => document.getElementById('directory-preview').scrollIntoView({ behavior: 'smooth' })}>
              Explore Directory <ArrowRight size={18} />
            </button>
            <button className="btn btn-secondary btn-lg" style={{ borderRadius: 30, padding: '14px 28px' }} onClick={() => navigateTo('login')}>
              Start Tracking Free
            </button>
          </div>
        </motion.div>

        {/* Live Platform Stats Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="glass-panel hover-glow"
          style={{ maxWidth: 900, margin: '0 auto 80px', borderRadius: 24, padding: '32px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>15,000+</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Link size={16} color="var(--accent)" /> Active Links
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>48<span style={{ fontSize: 24, color: 'var(--text-muted)' }}>h</span></div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Activity size={16} color="var(--success)" /> Freshness Check
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <Lock size={16} color="var(--text-secondary)" /> Always Free Basic
            </div>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 100 }}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="card glass-panel hover-lift" 
            style={{ padding: '32px 24px' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Target size={24} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Curated Directory</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>Access thousands of free Web 2.0s, profiles, and directories filterable by DA/PA and category metrics.</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="card glass-panel hover-lift" 
            style={{ padding: '32px 24px' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--info-bg)', color: 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <TrendingUp size={24} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Project Tracking</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>Organize campaigns per client. Track which links are built, pending, or approved with visual pipelines.</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="card glass-panel hover-lift" 
            style={{ padding: '32px 24px' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Compass size={24} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Discovery Engine</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>Our automated intelligence engine finds and categorizes new backlink targets weekly, keeping you ahead.</p>
          </motion.div>
        </div>

        {/* Trending Section */}
        {trending.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ marginBottom: 60 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--warning-bg)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={20} />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Trending This Week</h3>
            </div>
            <BacklinkGrid sites={trending} onRowClick={(site) => setSelectedSite(site)} />
          </motion.div>
        )}

        {/* Interactive Directory Viewer */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          id="directory-preview" 
          className="glass-panel"
          style={{ borderRadius: 24, padding: '32px 32px 24px', overflow: 'hidden' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link size={20} color="var(--accent)" /> Premium Target Database
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Live preview of our top-tier targets across all categories.</p>
            </div>
            
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
              <div className="search-container" style={{ flex: '1', minWidth: '250px' }}>
                <span className="search-icon"><Search size={16} /></span>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search domains or URLs..." 
                  value={search}
                  onChange={handleSearch}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`btn btn-sm ${category === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: 20 }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="loader" style={{ margin: '60px auto' }}><div className="spinner"></div></div>
          ) : (
            <>
              <BacklinkGrid 
                sites={backlinks} 
                onRowClick={(site) => setSelectedSite(site)}
              />
              
              {/* Pagination Controls */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button 
                  className="btn btn-secondary btn-sm hover-lift" 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Page {page} of {Math.max(1, totalPages)}
                </span>
                <button 
                  className="btn btn-secondary btn-sm hover-lift"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </motion.div>
      </main>

      {/* Link Detail Modal */}
      {selectedSite && (
        <div className="modal-overlay" onClick={() => setSelectedSite(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', background: 'var(--gradient-header)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="badge badge-category" style={{ marginBottom: 12, display: 'inline-block' }}>
                    {selectedSite.category.replace(/-/g, ' ').toUpperCase()}
                  </span>
                  <h3 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                    {selectedSite.domain}
                  </h3>
                  <a href={selectedSite.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none' }}>
                    {selectedSite.url} ↗
                  </a>
                </div>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedSite(null)}>✕</button>
              </div>
            </div>
            
            <div style={{ padding: '32px' }}>
              <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Domain Authority</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{selectedSite.da_score || '?'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Page Authority</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{selectedSite.pa_score || '?'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Pricing</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: selectedSite.is_free ? 'var(--success)' : 'var(--warning)' }}>
                    {selectedSite.is_free ? 'Free' : 'Paid'}
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 12, marginBottom: 32 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  💡 Submission Strategy
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                  {getTip(selectedSite.category)}
                </p>
              </div>

              <div style={{ textAlign: 'center', padding: '24px 0 0', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
                  Ready to start building?
                </h4>
                <button 
                  className="btn btn-primary btn-lg" 
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => navigateTo('login')}
                >
                  Create Free Account to Save Target
                </button>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
                  Track your submissions, manage clients, and auto-discover new links.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <footer style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        <p>&copy; {new Date().getFullYear()} LinkVault. All rights reserved.</p>
      </footer>
    </div>
  );
}
