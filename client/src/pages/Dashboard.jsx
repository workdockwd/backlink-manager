import { useState, useEffect } from 'react';
import { Link, CheckCircle, Folder, Send, Grid, Sparkles, Search, Rocket, User } from 'lucide-react';
import { backlinksApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard({ navigateTo }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await backlinksApi.stats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">Overview of your backlink directory</p>
            </div>
          </div>
        </div>
        <div className="page-content">
          <div className="loader"><div className="spinner"></div></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Overview of your backlink directory & SEO projects</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => navigateTo('scraper')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={16} /> Run Discovery
            </button>
            <button className="btn btn-primary" onClick={() => navigateTo('directory')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link size={16} /> Browse Backlinks
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card accent-blue">
            <div className="stat-card-icon"><Link size={22} /></div>
            <div className="stat-card-value">{stats?.total || 0}</div>
            <div className="stat-card-label">Total Backlink Sites</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-card-icon"><CheckCircle size={22} /></div>
            <div className="stat-card-value">{stats?.active || 0}</div>
            <div className="stat-card-label">Active Sites</div>
          </div>
          <div className="stat-card accent-orange">
            <div className="stat-card-icon"><Folder size={22} /></div>
            <div className="stat-card-value">{stats?.totalProjects || 0}</div>
            <div className="stat-card-label">SEO Projects</div>
          </div>
          <div className="stat-card accent-cyan">
            <div className="stat-card-icon"><Send size={22} /></div>
            <div className="stat-card-value">{stats?.totalSubmissions || 0}</div>
            <div className="stat-card-label">Total Submissions</div>
          </div>
        </div>

        {/* Contributor Status Card */}
        {user && (
          <div className="card mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
                {(user.username || user.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>@{user.username || user.email?.split('@')[0]}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your Contributor Profile</div>
              </div>
            </div>
            {user.username && (
              <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => navigateTo('profile', { username: user.username })}>
                <User size={14} /> View Profile
              </button>
            )}
          </div>
        )}

        {stats?.categories?.length > 0 && (
          <div className="card mb-4">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Grid size={18} /> Backlinks by Category</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {stats.categories.map(cat => (
                <div
                  key={cat.category}
                  className="card"
                  style={{ cursor: 'pointer', padding: '12px 16px' }}
                  onClick={() => navigateTo('directory')}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-light)' }}>{cat.count}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {cat.category.replace(/-/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recently Discovered */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={18} /> Recently Discovered</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigateTo('directory')}>
              View All →
            </button>
          </div>
          {stats?.recentlyAdded?.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Domain</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Discovered</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentlyAdded.map(site => (
                    <tr key={site.id}>
                      <td>
                        <a href={site.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="table-url">
                          {site.domain}
                        </a>
                      </td>
                      <td>
                        <span className="badge badge-category" style={{ textTransform: 'capitalize' }}>
                          {site.category.replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${site.is_free ? 'badge-free' : 'badge-paid'}`}>
                          {site.is_free ? 'Free' : 'Paid'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(site.discovered_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><Search size={40} /></div>
              <div className="empty-state-title">No backlinks yet</div>
              <div className="empty-state-text">
                Run the Discovery Engine to find backlink submission sites from across the web.
              </div>
              <button className="btn btn-primary" onClick={() => navigateTo('scraper')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Rocket size={16} /> Start Discovery
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
