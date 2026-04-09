import { useState, useEffect } from 'react';
import { Plus, Folder, Globe } from 'lucide-react';
import { projectsApi } from '../api';

export default function Projects({ navigateTo }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ name: '', domain: '', description: '', keywords: '' });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const keywords = form.keywords.split(',').map(k => k.trim()).filter(Boolean);
      await projectsApi.create({ ...form, keywords });
      setShowCreateModal(false);
      setForm({ name: '', domain: '', description: '', keywords: '' });
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project? All submission data will be lost.')) return;
    try {
      await projectsApi.delete(id);
      loadProjects();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">SEO Projects</h1>
            <p className="page-subtitle">Manage your client websites and track backlink submissions</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> New Project
          </button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loader"><div className="spinner"></div></div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Folder size={40} /></div>
            <div className="empty-state-title">No projects yet</div>
            <div className="empty-state-text">
              Create a project for each client website to track backlink submissions and progress.
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 auto' }}>
              <Plus size={16} /> Create First Project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {projects.map(project => {
              const progress = project.total_submissions > 0
                ? Math.round(((project.completed_submissions + project.approved_submissions) / project.total_submissions) * 100)
                : 0;
              let keywords = [];
              try { keywords = JSON.parse(project.keywords || '[]'); } catch {}
              
              return (
                <div
                  key={project.id}
                  className="card"
                  style={{ cursor: 'pointer', position: 'relative' }}
                  onClick={() => navigateTo('project-detail', { projectId: project.id })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</h3>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                      title="Delete project"
                    >
                      ×
                    </button>
                  </div>
                  
                  {project.domain && (
                    <div style={{ fontSize: 13, color: 'var(--accent-light)', marginBottom: 8 }}>
                      <Globe size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{project.domain}
                    </div>
                  )}

                  {project.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                      {project.description}
                    </div>
                  )}

                  {keywords.length > 0 && (
                    <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
                      {keywords.slice(0, 4).map((kw, i) => (
                        <span key={i} className="badge badge-category" style={{ fontSize: 11 }}>
                          {kw}
                        </span>
                      ))}
                      {keywords.length > 4 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          +{keywords.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {project.completed_submissions + project.approved_submissions}/{project.total_submissions} completed
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: progress > 70 ? 'var(--success)' : 'var(--text-secondary)' }}>
                      {progress}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create New Project</h2>
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label className="input-label">Project Name *</label>
                <input
                  className="input"
                  placeholder="e.g., Client ABC - Link Building"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Client Website Domain</label>
                <input
                  className="input"
                  placeholder="example.com"
                  value={form.domain}
                  onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Target Keywords</label>
                <input
                  className="input"
                  placeholder="keyword1, keyword2, keyword3"
                  value={form.keywords}
                  onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
                />
                <span className="text-sm text-muted" style={{ marginTop: 4, display: 'block' }}>
                  Comma-separated keywords
                </span>
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea
                  className="input textarea"
                  placeholder="Brief project description..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
