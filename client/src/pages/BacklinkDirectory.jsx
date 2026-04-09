import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Plus, Search, Link, Rocket, Upload, CheckCircle, XCircle, SkipForward, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { backlinksApi } from '../api';
import BacklinkTable from '../components/BacklinkTable';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'blog', label: 'Blog' },
  { key: 'web2.0', label: 'Web 2.0' },
  { key: 'directory', label: 'Directory' },
  { key: 'forum', label: 'Forum' },
  { key: 'guest-post', label: 'Guest Post' },
  { key: 'social-bookmark', label: 'Social Bookmark' },
  { key: 'article', label: 'Article' },
  { key: 'profile', label: 'Profile' },
  { key: 'comment', label: 'Comment' },
  { key: 'image', label: 'Image' },
  { key: 'video', label: 'Video' },
  { key: 'document', label: 'Document/PDF' },
  { key: 'classified', label: 'Classified' },
  { key: 'wiki', label: 'Wiki' },
  { key: 'press-release', label: 'Press Release' },
  { key: 'qa', label: 'Q&A' },
  { key: 'general', label: 'General' },
];

function FilterDropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => o.value === value);
  const isActive = value !== options[0]?.value;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className={`filter-select-btn${isActive ? ' active' : ''}${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span>{selected?.label || placeholder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div className={`filter-dropdown-panel${open ? ' open' : ''}`}>
        {options.map(opt => (
          <button
            key={opt.value}
            className={`filter-dropdown-item${opt.value === value ? ' selected' : ''}`}
            onClick={() => { onChange(opt.value); setOpen(false); }}
          >
            {opt.value === value && <span style={{ color: 'var(--accent)', marginRight: 6, fontSize: 10 }}>✓</span>}
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BacklinkDirectory({ navigateTo }) {
  const [data, setData] = useState({ sites: [], pagination: { total: 0, totalPages: 0 }, categories: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [minDa, setMinDa] = useState('0');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('discovered_at');
  const [order, setOrder] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ url: '', title: '', category: 'general' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importCategory, setImportCategory] = useState('auto');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [hideProcessed, setHideProcessed] = useState(false);
  const [bookmarkedId, setBookmarkedId] = useState(null);
  const scrolledToBookmark = useRef(false);

  const loadBacklinks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50, sort, order };
      if (category !== 'all') params.category = category;
      if (parseInt(minDa) > 0) params.min_da = minDa;
      if (search) params.search = search;
      if (hideProcessed) params.hideProcessed = true;
      const result = await backlinksApi.list(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load backlinks:', err);
    } finally {
      setLoading(false);
    }
  }, [page, category, minDa, search, sort, order, hideProcessed]);

  useEffect(() => {
    loadBacklinks();
  }, [loadBacklinks]);

  // Load bookmark on mount
  useEffect(() => {
    backlinksApi.getBookmark('global').then(res => {
      if (res?.backlink_site_id) setBookmarkedId(res.backlink_site_id);
    }).catch(() => {});
  }, []);

  // Scroll to bookmarked row after data loads
  useEffect(() => {
    if (bookmarkedId && !loading && data.sites.length > 0 && !scrolledToBookmark.current) {
      const row = document.getElementById(`bl-row-${bookmarkedId}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        scrolledToBookmark.current = true;
      }
    }
  }, [bookmarkedId, loading, data.sites]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function handleSort(col) {
    if (sort === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setOrder('desc');
    }
    setPage(1);
  }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await backlinksApi.create(addForm);
      setShowAddModal(false);
      setAddForm({ url: '', title: '', category: 'general' });
      loadBacklinks();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    const urls = importText
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      alert('Please paste at least one URL');
      return;
    }
    if (urls.length > 500) {
      alert('Maximum 500 URLs per import. Please split into smaller batches.');
      return;
    }

    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await backlinksApi.import(urls, importCategory, 'global-import', null, true);
      setImportResult(res);
      loadBacklinks();
    } catch (err) {
      setImportResult({ success: false, error: err.message });
    } finally {
      setImportLoading(false);
    }
  }

  function handleCloseImport() {
    setShowImportModal(false);
    setImportText('');
    setImportCategory('auto');
    setImportResult(null);
    setImportLoading(false);
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setImportText(event.target.result);
    reader.readAsText(file);
    e.target.value = ''; // Reset input so same file can be selected again
  };

  async function handleExport() {
    try {
      const csv = await backlinksApi.export(category !== 'all' ? { category } : {});
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backlinks-${category}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    }
  }

  // Get category counts from the API response  
  const categoryCounts = {};
  (data.categories || []).forEach(c => { categoryCounts[c.category] = c.count; });

  const SortIcon = ({ col }) => {
    if (sort !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: 'var(--accent-light)' }}>{order === 'asc' ? '↑' : '↓'}</span>;
  };

  const scrollToBookmark = () => {
    if (bookmarkedId) {
      const row = document.getElementById(`bl-row-${bookmarkedId}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.transition = 'background-color 0.5s ease';
        row.style.backgroundColor = 'var(--accent-soft, rgba(99, 102, 241, 0.1))';
        setTimeout(() => {
          row.style.backgroundColor = '';
        }, 1500);
      } else {
        // If it's not on the current page, we might need to notify the user
        alert('Your bookmarked site is not on this page. Try searching or navigating.');
      }
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Backlink Directory</h1>
            <p className="page-subtitle">{data.pagination.total} backlink submission sites</p>
          </div>
          <div className="flex gap-2">
            {bookmarkedId && (
              <button className="btn btn-primary" onClick={scrollToBookmark} style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 16 }}>
                <ArrowRight size={16} /> Resume from Last
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={16} /> Import URLs
            </button>
            <button className="btn btn-primary btn-outline" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add Manually
            </button>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Search & Track Toggle */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-container" style={{ flex: 1, minWidth: '300px' }}>
            <span className="search-icon"><Search size={16} /></span>
            <input
              className="search-input"
              placeholder="Search by URL, domain, or title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            className={`btn btn-sm ${hideProcessed ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', padding: '8px 16px' }}
            onClick={() => setHideProcessed(!hideProcessed)}
            title="Hide backlinks you have already viewed, skipped, or added."
          >
            {hideProcessed ? <EyeOff size={16} /> : <Eye size={16} />} 
            {hideProcessed ? 'Hidden Processed' : 'Show All'}
          </button>
        </div>

        {/* Category & DA Filters */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <FilterDropdown
            value={category}
            onChange={val => { setCategory(val); setPage(1); }}
            options={CATEGORIES.map(cat => {
              const count = cat.key === 'all' ? data.pagination.total : (data.categories?.find(c => c.category === cat.key)?.count || 0);
              if (cat.key !== 'all' && !count) return null;
              return { value: cat.key, label: `${cat.label} (${count})` };
            }).filter(Boolean)}
            placeholder="All Categories"
          />
          
          <FilterDropdown
            value={minDa}
            onChange={val => { setMinDa(val); setPage(1); }}
            options={[
              { value: '0', label: 'DA: All' },
              { value: '10', label: 'DA 10+' },
              { value: '20', label: 'DA 20+' },
              { value: '30', label: 'DA 30+' },
              { value: '40', label: 'DA 40+' },
              { value: '50', label: 'DA 50+' }
            ]}
            placeholder="DA: All"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="loader"><div className="spinner"></div></div>
        ) : data.sites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Link size={40} /></div>
            <div className="empty-state-title">No backlinks found</div>
            <div className="empty-state-text">
              {search ? 'Try a different search term' : 'Run the Discovery Engine to find backlink sites'}
            </div>
            {!search && (
              <button className="btn btn-primary" onClick={() => navigateTo('scraper')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Rocket size={16} /> Start Discovery
              </button>
            )}
          </div>
        ) : (
          <>
            <BacklinkTable 
              sites={data.sites}
              sort={sort}
              order={order}
              onSort={handleSort}
              bookmarkedId={bookmarkedId}
              onBookmark={async (id) => {
                try {
                  if (bookmarkedId === id) {
                    setBookmarkedId(null);
                  } else {
                    await backlinksApi.setBookmark(id, 'global');
                    setBookmarkedId(id);
                  }
                } catch (e) {
                  console.error('Failed to set bookmark', e);
                }
              }}
              onSkip={async (id, currentStatus) => {
                try {
                  if (currentStatus === 'skipped') {
                    await backlinksApi.clearInteraction(id);
                    setData(prev => ({
                      ...prev,
                      sites: prev.sites.map(s => s.id === id ? { ...s, interaction_status: null } : s)
                    }));
                  } else {
                    await backlinksApi.markInteraction(id, 'skipped');
                    if (hideProcessed) {
                      setData(prev => ({ ...prev, sites: prev.sites.filter(s => s.id !== id) }));
                    } else {
                      setData(prev => ({
                        ...prev,
                        sites: prev.sites.map(s => s.id === id ? { ...s, interaction_status: 'skipped' } : s)
                      }));
                    }
                  }
                } catch (e) {
                  console.error('Failed to toggle skip', e);
                }
              }}
            />

            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-info">
                Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, data.pagination.total)} of {data.pagination.total}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, page - 2) + i;
                  if (pageNum > data.pagination.totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  className="pagination-btn"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Import URLs Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={handleCloseImport}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={20} /> Import URLs
            </h2>
            {!importResult ? (
              <form onSubmit={handleImport}>
                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 4 }}>
                    <label className="input-label" style={{ marginBottom: 0 }}>
                      URLs to Import
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>(one per line, max 500)</span>
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <a 
                        href="data:text/csv;charset=utf-8,URL,Category%0Ahttps://example.com/forum,forum%0Ahttps://myblogsite.com,blog" 
                        download="LinkVault_Template.csv" 
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                      ><Download size={14} /> Download Template</a>
                      <label className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                        <Upload size={14} /> Select .CSV
                        <input type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                  <textarea
                    className="input"
                    style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                    placeholder={`https://example.com/forum  forum\nhttps://anotherdomain.net\nblogsubmit.org`}
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    required
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {importText.split('\n').filter(u => u.trim()).length} URLs entered
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Category for all imported URLs</label>
                  <select
                    className="input select"
                    value={importCategory}
                    onChange={e => setImportCategory(e.target.value)}
                  >
                    <option value="auto">🌟 Auto-Detect / Read from Text</option>
                    {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '10px 12px', background: 'var(--accent-glow)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                  💡 Auto-Detect will parse your <code>.csv</code> or pasted text matching <code>URL [space] category</code>, or guess from the URL context. Duplicates are automatically detected and skipped.
                </div>
                
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseImport} disabled={importLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={importLoading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {importLoading ? (
                      <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Importing...</>
                    ) : (
                      <><Upload size={14} /> Import {importText.split('\n').filter(u => u.trim()).length} URLs</>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {importResult.success ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 600, fontSize: 16 }}>
                      <CheckCircle size={22} /> Import Complete
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div style={{ textAlign: 'center', padding: '16px 12px', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>{importResult.added}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> Added
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '16px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-muted)' }}>{importResult.skipped}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <SkipForward size={12} /> Skipped (duplicate)
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '16px 12px', background: importResult.failed > 0 ? 'var(--danger-bg)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: importResult.failed > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border)' }}>
                        <div style={{ fontSize: 28, fontWeight: 700, color: importResult.failed > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{importResult.failed}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <XCircle size={12} /> Failed
                        </div>
                      </div>
                    </div>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-bg)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                        <strong>Failed URLs:</strong>
                        <ul style={{ marginTop: 6, paddingLeft: 16 }}>
                          {importResult.errors.map((e, i) => (
                            <li key={i}>{e.url} — {e.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <XCircle size={18} /> {importResult.error}
                  </div>
                )}
                <div className="modal-footer" style={{ marginTop: 24 }}>
                  <button className="btn btn-secondary" onClick={handleCloseImport}>Close</button>
                  {importResult.success && (
                    <button className="btn btn-primary" onClick={() => { setImportResult(null); setImportText(''); }}>
                      Import More
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Backlink Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add Backlink Site</h2>
            <form onSubmit={handleAdd}>
              <div className="input-group">
                <label className="input-label">URL *</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://example.com"
                  value={addForm.url}
                  onChange={e => setAddForm(f => ({ ...f, url: e.target.value }))}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Title</label>
                <input
                  className="input"
                  placeholder="Site name (optional)"
                  value={addForm.title}
                  onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select 
                  className="input select"
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Add Site</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
