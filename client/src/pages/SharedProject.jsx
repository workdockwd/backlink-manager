import { useState, useEffect } from 'react';
import { ClipboardList, Clock, Send, CheckCircle, Target, Globe, LayoutDashboard } from 'lucide-react';
import { projectsApi } from '../api';

export default function SharedProject({ token, navigateTo }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProject();
  }, [token]);

  async function loadProject() {
    try {
      const data = await projectsApi.getShared(token);
      setProject(data);
    } catch (err) {
      setError(err.message || 'Failed to load shared project');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="loader"><div className="spinner"></div></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-title">Project not found</div>
          <div className="empty-state-text">{error}</div>
          <button onClick={() => { window.history.pushState({}, '', '/'); window.location.reload(); }} className="btn btn-primary" style={{ marginTop: 16 }}>Go to Homepage</button>
        </div>
      </div>
    );
  }

  let keywords = [];
  try { keywords = typeof project.keywords === 'string' ? JSON.parse(project.keywords) : project.keywords || []; } catch {}

  const progress = project.stats?.total > 0
    ? Math.round(((project.stats.submitted + project.stats.approved) / project.stats.total) * 100)
    : 0;

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="page-title">{project.name}</h1>
              <p className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Shared by {project.owner_name}
                {project.domain && (
                  <>
                    <span style={{ opacity: 0.5 }}>|</span>
                    <Globe size={14} /> {project.domain}
                  </>
                )}
              </p>
            </div>
          </div>
          <button onClick={() => { window.history.pushState({}, '', '/'); window.location.reload(); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LayoutDashboard size={16} /> Create Your Own Projects
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Project Stats */}
        <div className="stats-grid">
          <div className="stat-card accent-blue">
            <div className="stat-card-icon"><ClipboardList size={22} /></div>
            <div className="stat-card-value">{project.stats?.total || 0}</div>
            <div className="stat-card-label">Total Assigned</div>
          </div>
          <div className="stat-card accent-orange">
            <div className="stat-card-icon"><Clock size={22} /></div>
            <div className="stat-card-value">{project.stats?.pending || 0}</div>
            <div className="stat-card-label">Pending</div>
          </div>
          <div className="stat-card accent-cyan">
            <div className="stat-card-icon"><Send size={22} /></div>
            <div className="stat-card-value">{project.stats?.submitted || 0}</div>
            <div className="stat-card-label">Submitted</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-card-icon"><CheckCircle size={22} /></div>
            <div className="stat-card-value">{project.stats?.approved || 0}</div>
            <div className="stat-card-label">Approved</div>
          </div>
        </div>

        {/* Progress */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 14, fontWeight: 500 }}>Progress</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: progress > 70 ? 'var(--success)' : 'var(--accent-light)' }}>
              {progress}%
            </span>
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="card mb-4">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Target size={16} /> Target Keywords</h3>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {keywords.map((kw, i) => (
                <span key={i} className="badge badge-category">{kw}</span>
              ))}
            </div>
          </div>
        )}

        {/* Submissions List */}
        <div className="card">
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Backlink Submissions</h2>
          {!project.submissions?.length ? (
            <div className="empty-state">
              <div className="empty-state-title">No backlinks assigned yet</div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Category</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {project.submissions.map(sub => (
                    <tr key={sub.id}>
                      <td>
                        <div className="table-domain">{sub.site_domain}</div>
                        <a href={sub.site_url} target="_blank" rel="noopener noreferrer" className="table-url" style={{ fontSize: 11 }}>
                          {sub.site_url}
                        </a>
                      </td>
                      <td>
                        <span className="badge badge-category" style={{ textTransform: 'capitalize' }}>
                          {(sub.site_category || '').replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${
                          sub.status === 'approved' ? 'approved' : 
                          sub.status === 'submitted' ? 'free' : 
                          sub.status === 'rejected' ? 'danger' : 'category'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
