import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Upload, ClipboardList, Clock,
  Send, CheckCircle, XCircle, Share2, Trash2, ArrowLeft,
  Plus, Link as LinkIcon, Download, ChevronDown, ChevronUp, ChevronsUpDown, PenLine, BookmarkCheck, X, Lock
} from 'lucide-react';
import { projectsApi, submissionsApi, backlinksApi } from '../api';
import ContentKit from '../components/ContentKit';
import SubmissionWorkspace from '../components/SubmissionWorkspace';

// ─── Resume Point Icon (animated pulsing dot) ────────────────────────────────
function ResumePointIcon({ active }) {
  return (
    <span
      title={active ? 'Resume point set — click to clear' : 'Set as resume point'}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: 28, height: 28 }}
    >
      {active && <span className="resume-ring active" />}
      <span className={`resume-dot${active ? ' active' : ''}`} />
    </span>
  );
}

// ─── Live Status Badge (click-cycle) ─────────────────────────────────────────
const LIVE_STATUS_CYCLE = ['pending', 'live', 'broken', 'removed'];
const LIVE_STATUS_LABELS = { pending: '— Pending', live: '✓ Live', broken: '✕ Broken', removed: '⊘ Removed' };
function LiveStatusBadge({ value, onChange }) {
  const current = value || 'pending';
  function handleClick() {
    const next = LIVE_STATUS_CYCLE[(LIVE_STATUS_CYCLE.indexOf(current) + 1) % LIVE_STATUS_CYCLE.length];
    onChange(next);
  }
  return (
    <button className={`live-status-badge ${current}`} onClick={handleClick} title="Click to cycle status">
      {LIVE_STATUS_LABELS[current] || current}
    </button>
  );
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: Clock },
  submitted: { label: 'Submitted', color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  icon: Send },
  approved:  { label: 'Approved',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   icon: CheckCircle },
  rejected:  { label: 'Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle },
};

const NEXT_STATUS = { pending: 'submitted', submitted: 'approved', approved: 'rejected', rejected: 'pending' };

function StatusBadge({ status, onClick, loading }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={onClick ? `Click to advance → ${NEXT_STATUS[status]}` : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 600, color: cfg.color,
        background: cfg.bg, border: `1px solid ${cfg.color}40`,
        borderRadius: 20, padding: '3px 10px',
        cursor: onClick ? 'pointer' : 'default',
        whiteSpace: 'nowrap', transition: 'opacity 0.15s',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {cfg.label}
      {onClick && <ChevronDown size={10} style={{ marginLeft: 2 }} />}
    </button>
  );
}

// ─── Mini inline-editable cell ───────────────────────────────────────────────
function EditableCell({ value, placeholder, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  if (!editing) {
    return (
      <span
        className="editable-cell-trigger"
        onClick={() => setEditing(true)}
        title="Click to edit"
        style={{ cursor: 'text', color: val ? 'inherit' : 'var(--text-muted)', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        {val || placeholder}
        <PenLine className="edit-icon" size={12} style={{ opacity: 0.3 }} />
      </span>
    );
  }
  return (
    <input
      autoFocus
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); onSave(val); }}
      onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onSave(val); } if (e.key === 'Escape') setEditing(false); }}
      style={{ fontSize: 13, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--accent)', background: 'var(--bg-secondary)', color: 'inherit', width: '100%', minWidth: 80 }}
    />
  );
}

// ─── Custom Filter Dropdown ──────────────────────────────────────────────────
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
        <ChevronDown size={12} style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
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

// ─── Submissions Table ─────────────────────────────────────────────────────
function SubmissionsTable({
  submissions,
  onStatusChange,
  onFieldSave,
  onDelete,
  onMarkLast,
  updatingId,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  filterActive,
  onOpenWorkspace,
  tableRef
}) {
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');

  const sorted = [...submissions].sort((a, b) => {
    let A = a[sort], B = b[sort];
    // Custom sort for da_score to handle DA/PA/SS combination if sort is set to da_score
    if (sort === 'da_score') {
      A = a.da_score || 0;
      B = b.da_score || 0;
    }
    if (typeof A === 'string') A = A.toLowerCase();
    if (typeof B === 'string') B = B.toLowerCase();
    if (A < B) return order === 'asc' ? -1 : 1;
    if (A > B) return order === 'asc' ? 1 : -1;
    return 0;
  });

  function handleSort(col) {
    if (sort === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('asc'); }
  }

  const Th = ({ col, explain, children, style, className }) => (
    <th onClick={() => col && handleSort(col)} className={className} style={{ cursor: col ? 'pointer' : 'default', whiteSpace: 'nowrap', ...style }} title={explain || undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {children}
        {col && sort === col && (order === 'asc' ? <ChevronUp size={14} color="var(--accent-light)"/> : <ChevronDown size={14} color="var(--accent-light)"/>)}
        {col && sort !== col && <ChevronsUpDown size={14} style={{ opacity: 0.3 }} />}
      </div>
    </th>
  );

  const isFirstOfDay = (index) => {
    if (index === 0) return true;
    const cur = new Date(sorted[index].submitted_at || sorted[index].created_at).toDateString();
    const prev = new Date(sorted[index - 1].submitted_at || sorted[index - 1].created_at).toDateString();
    return cur !== prev;
  };

  if (!submissions.length) return null;

  return (
    <div ref={tableRef} style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', scrollbarWidth: 'thin', scrollbarColor: 'var(--border-light) transparent' }}>
      <table style={{ width: 'max-content', minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 40 }}>
              <input
                className="custom-checkbox"
                type="checkbox"
                checked={submissions.length > 0 && selectedIds.size === submissions.length}
                onChange={onSelectAll}
                title="Select All"
              />
            </th>
            <Th col="submitted_at" explain="The date when this link was added or submitted">Date</Th>
            <Th col="site_domain" className="table-sticky-col" style={{ zIndex: 11 }} explain="The domain or root URL of the backlink site">Website</Th>
            <Th col="target_url" explain="The URL on your site that you are building this backlink for">Target URL</Th>
            <Th col="live_url" explain="The actual public URL where your backlink is live">Live URL</Th>
            <Th col="anchor_text" explain="The clickable text phrasing for your backlink">Anchor / Keyword</Th>
            <Th col="da_score" explain="Domain Authority / Page Authority / Spam Score">DA / PA / SS</Th>
            <Th col="site_category" explain="The general niche or platform type">Category</Th>
            <Th col="status" explain="Current progress status of the backlink">Status</Th>
            <th style={{ width: 80 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((sub, idx) => (
            <tr
              key={sub.id}
              id={`sub-row-${sub.id}`}
              style={{
                borderLeft: sub.is_last_done ? '3px solid #6366f1' : '3px solid transparent',
                background: sub.is_last_done ? 'rgba(99,102,241,0.05)' : undefined,
                opacity: sub.status === 'rejected' ? 0.6 : 1,
                transition: 'background 0.2s',
              }}
            >
              <td>
                <input
                  className="custom-checkbox"
                  type="checkbox"
                  checked={selectedIds.has(sub.id)}
                  onChange={() => onSelectToggle(sub.id)}
                />
              </td>

              {/* Date */}
              <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                {(filterActive || isFirstOfDay(idx)) && (sub.submitted_at || sub.created_at) ? new Date(sub.submitted_at || sub.created_at).toLocaleDateString() : ''}
              </td>

              {/* Website */}
              <td className="table-domain table-sticky-col">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <a
                    href={sub.site_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}
                    onClick={e => e.stopPropagation()}
                  >
                    {sub.site_domain || sub.site_url || '—'}
                  </a>
                  {sub.is_private === 1 && (
                    <span title="Private Link (Only visible in your projects)" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: 4, transform: 'translateY(-1px)' }}>
                      <Lock size={12} />
                    </span>
                  )}
                </div>
              </td>

              {/* Target URL */}
              <td style={{ minWidth: 110 }}>
                <EditableCell
                  value={sub.target_url}
                  placeholder="+ target URL"
                  onSave={v => onFieldSave(sub.id, { target_url: v })}
                />
              </td>

              {/* Live URL */}
              <td style={{ minWidth: 110 }}>
                <EditableCell
                  value={sub.live_url}
                  placeholder="+ live URL"
                  onSave={v => onFieldSave(sub.id, { live_url: v })}
                />
              </td>

              {/* Anchor Text */}
              <td style={{ minWidth: 110 }}>
                <EditableCell
                  value={sub.anchor_text}
                  placeholder="+ anchor"
                  onSave={v => onFieldSave(sub.id, { anchor_text: v })}
                />
              </td>

              {/* DA/PA/SS */}
              <td>
                <div className="multi-input-cell">
                  <input
                    type="text"
                    value={sub.da_score || ''}
                    placeholder="DA"
                    title="DA"
                    onChange={e => onFieldSave(sub.id, { da_score: e.target.value })}
                  />
                  <span>/</span>
                  <input
                    type="text"
                    value={sub.pa_score || ''}
                    placeholder="PA"
                    title="PA"
                    onChange={e => onFieldSave(sub.id, { pa_score: e.target.value })}
                  />
                  <span>/</span>
                  <input
                    type="text"
                    value={sub.ss_score || ''}
                    placeholder="SS"
                    title="SS"
                    onChange={e => onFieldSave(sub.id, { ss_score: e.target.value })}
                  />
                </div>
              </td>

              {/* Category */}
              <td style={{ whiteSpace: 'nowrap' }}>
                <span className="badge badge-category" data-cat={sub.site_category || 'other'} style={{ fontSize: 11 }}>
                  {(sub.site_category || 'other').replace(/-/g, ' ')}
                </span>
              </td>

              {/* Status — click-cycle badge */}
              <td>
                {updatingId === sub.id ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>…</span>
                ) : (
                  <StatusBadge
                    status={sub.status || 'pending'}
                    onClick={() => onStatusChange(sub.id, NEXT_STATUS[sub.status || 'pending'])}
                    loading={false}
                  />
                )}
              </td>

              {/* Actions */}
              <td>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Content Workspace"
                    onClick={() => onOpenWorkspace(sub.id)}
                  >
                    <PenLine size={14} color="var(--accent-light)" />
                  </button>
                  <button
                    className="resume-point-btn"
                    title={sub.is_last_done ? 'Clear resume point' : 'Set as resume point'}
                    onClick={() => onMarkLast(sub.id)}
                  >
                    <ResumePointIcon active={!!sub.is_last_done} />
                  </button>
                  {(selectedIds.has(sub.id) || selectedIds.size > 0) && (
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Remove from project"
                      onClick={() => onDelete(sub.id)}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Private Vault Tab ---
const UPLOAD_CATEGORIES = [
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
  { key: 'image', label: 'Image/Photo' },
  { key: 'video', label: 'Video' },
  { key: 'document', label: 'Document/PDF' },
  { key: 'classified', label: 'Classified' },
  { key: 'wiki', label: 'Wiki' },
  { key: 'press-release', label: 'Press Release' },
  { key: 'qa', label: 'Q&A' },
  { key: 'general', label: 'General / Other' },
];

function ImportModal({ onClose, onImported }) {
  const [importText, setImportText] = useState('');
  const [importCategory, setImportCategory] = useState('auto');
  const [contributeToPublic, setContributeToPublic] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const urlCount = importText.split('\n').filter(u => u.trim()).length;

  const handleImport = async () => {
    const urls = importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!urls.length) return alert('Enter at least one URL');
    setImportLoading(true); setImportResult(null);
    try {
      const res = await backlinksApi.import(urls, importCategory, 'private-vault', null, contributeToPublic);
      setImportResult(res);
      if (res.added > 0) onImported();
    } catch (err) { setImportResult({ success: false, error: err.message }); }
    finally { setImportLoading(false); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setImportText(prev => prev + (prev ? '\n' : '') + evt.target.result);
    reader.readAsText(file); e.target.value = '';
  };

  const downloadDemo = () => {
    const c = 'url,category\nhttps://exampleblog.com,blog\nhttps://directory.com,directory';
    const b = new Blob([c], { type: 'text/csv' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = 'vault_demo.csv'; a.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 760, width: '90vw' }}>
        <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload size={18} /> Import to Private Vault
        </h2>
        {!importResult ? (
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <textarea className="input" placeholder="https://example.com" value={importText}
                onChange={e => setImportText(e.target.value)}
                style={{ flex: 1, minHeight: 280, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{urlCount} URL{urlCount !== 1 ? 's' : ''} detected</span>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={downloadDemo}>
                  <Download size={13} style={{ marginRight: 4 }} /> Demo Template
                </button>
              </div>
            </div>
            <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select className="input select" value={importCategory} onChange={e => setImportCategory(e.target.value)}>
                  <option value="auto">Auto-Detect</option>
                  {UPLOAD_CATEGORIES.filter(c => c.key !== 'all').map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <input type="file" id="vault-csv" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                <label htmlFor="vault-csv" className="btn btn-secondary"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
                  <Upload size={13} /> Upload CSV
                </label>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={contributeToPublic} onChange={e => setContributeToPublic(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: 'var(--accent)', marginTop: 2 }} />
                  <span style={{ fontSize: 13, lineHeight: 1.4 }}>
                    <strong style={{ display: 'block', marginBottom: 4 }}>Contribute Globally</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>If off, links stay private to your vault only.</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {importResult.success ? (
              <>
                <CheckCircle size={40} color="var(--success)" style={{ marginBottom: 12 }} />
                <h3 style={{ marginBottom: 16 }}>Import Complete!</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ padding: 16, background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>{importResult.added}</div>
                    <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>Added to Vault</div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-muted)' }}>{importResult.skipped}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Skipped</div>
                  </div>
                  <div style={{ padding: 16, background: importResult.failed>0?'var(--danger-bg)':'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: importResult.failed>0?'1px solid rgba(239,68,68,0.2)':'1px solid var(--border)' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: importResult.failed>0?'var(--danger)':'var(--text-muted)' }}>{importResult.failed}</div>
                    <div style={{ fontSize: 12, color: importResult.failed>0?'var(--danger)':'var(--text-secondary)', marginTop: 4 }}>Failed</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <XCircle size={40} color="var(--danger)" style={{ marginBottom: 12 }} />
                <p style={{ color: 'var(--danger)' }}>{importResult.error}</p>
              </>
            )}
          </div>
        )}
        <div className="modal-footer" style={{ marginTop: 20 }}>
          {!importResult ? (
            <>
              <button className="btn btn-secondary" onClick={onClose} disabled={importLoading}>Cancel</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importLoading || !urlCount}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {importLoading
                  ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Importing...</>
                  : <><Upload size={14} /> Import {urlCount} URLs</>}
              </button>
            </>
          ) : importResult.success ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => { setImportResult(null); setImportText(''); }}>Import More</button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={() => setImportResult(null)}>Try Again</button>
          )}
        </div>
      </div>
    </div>
  );
}

function PrivateVaultTab({ projectId, existingIds, onAdded }) {
  const [sites, setSites] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [minDa, setMinDa] = useState('0');
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const [catCounts, setCatCounts] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showImport, setShowImport] = useState(false);
  const [adding, setAdding] = useState(new Set());
  const [added, setAdded] = useState(new Set());
  const [deleting, setDeleting] = useState(new Set());
  const PER_PAGE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PER_PAGE, sort: 'da_score', order: 'desc' };
      if (parseInt(minDa) > 0) params.min_da = minDa;
      if (filterCategory !== 'all') params.category = filterCategory;
      if (search) params.search = search;
      const res = await backlinksApi.vaultList(params);
      setSites(res.sites || []);
      setTotal(res.pagination?.total || 0);
      const counts = {};
      (res.categories || []).forEach(c => { counts[c.category] = c.count; });
      setCatCounts(counts);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [page, minDa, filterCategory, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [minDa, filterCategory, search]);
  useEffect(() => { setAdded(new Set([...existingIds])); }, [existingIds]);

  const handleAddToProject = async (siteId) => {
    if (adding.has(siteId) || added.has(siteId)) return;
    setAdding(p => new Set([...p, siteId]));
    try {
      await backlinksApi.vaultAddToProject(siteId, projectId);
      setAdded(p => new Set([...p, siteId]));
      onAdded();
    } catch (e) { alert(e.message); }
    finally { setAdding(p => { const n = new Set(p); n.delete(siteId); return n; }); }
  };

  const handleBulkAdd = async () => {
    const toAdd = [...selectedIds].filter(id => !added.has(id));
    for (const id of toAdd) await handleAddToProject(id);
    setSelectedIds(new Set());
  };

  const handleDelete = async (siteId) => {
    if (!window.confirm('Remove from vault? If private and unused by others, it will be permanently deleted.')) return;
    setDeleting(p => new Set([...p, siteId]));
    try {
      await backlinksApi.vaultDelete(siteId);
      setSites(prev => prev.filter(s => s.id !== siteId));
      setTotal(t => t - 1);
    } catch (e) { alert(e.message); }
    finally { setDeleting(p => { const n = new Set(p); n.delete(siteId); return n; }); }
  };

  const toggleSelect = (id) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => setSelectedIds(
    selectedIds.size === sites.length ? new Set() : new Set(sites.map(s => s.id))
  );
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div>
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); load(); }} />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {selectedIds.size > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)',
            padding: '6px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--accent)', width: '100%' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedIds.size} selected</span>
            <button className="btn btn-primary btn-sm" onClick={handleBulkAdd}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={13} /> Add to Project
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>Clear</button>
          </div>
        ) : (
          <>
            <div className={`search-expand-wrapper${searchOpen ? ' open' : ''}`}
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && !search) setSearchOpen(false); }}>
              <button className={`search-expand-btn ${searchOpen ? 'open' : ''}`}
                onClick={() => {
                  if (searchOpen) { setSearchOpen(false); setSearch(''); }
                  else { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); }
                }}><Search size={15} /></button>
              <input ref={searchRef} className="search-expand-input" type="text" placeholder="Search domain..."
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } }} />
              {searchOpen && search && (
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', paddingRight: 6 }}
                  onClick={() => { setSearch(''); searchRef.current?.focus(); }}><X size={12} /></button>
              )}
            </div>
            <FilterDropdown
              value={minDa}
              onChange={setMinDa}
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
            <FilterDropdown
              value={filterCategory}
              onChange={setFilterCategory}
              options={[
                { value: 'all', label: `All Categories (${total})` },
                ...Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({
                  value: cat,
                  label: `${cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} (${count})`
                }))
              ]}
              placeholder="All Categories"
            />
            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowImport(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={14} /> Import Links
              </button>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="loader" style={{ height: '30vh' }}><div className="spinner" /></div>
      ) : sites.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '48px 20px' }}>
            <div className="empty-state-icon"><Lock size={32} /></div>
            <div className="empty-state-title">Your Private Vault is Empty</div>
            <div className="empty-state-text">
              Import your personal backlink lists here. Links stage safely — you cherry-pick only the good ones into your active project.
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowImport(true)}>
              <Upload size={14} style={{ marginRight: 6 }} /> Import Links
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input className="custom-checkbox" type="checkbox"
                    checked={selectedIds.size === sites.length && sites.length > 0}
                    onChange={toggleAll} />
                </th>
                <th>Domain</th>
                <th>Category</th>
                <th>DA / PA</th>
                <th style={{ width: 140 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sites.map(site => {
                const isAdded = added.has(site.id);
                const isAdding = adding.has(site.id);
                const isDel = deleting.has(site.id);
                return (
                  <tr key={site.id} style={{ opacity: isDel ? 0.4 : 1, transition: 'opacity 0.3s' }}>
                    <td>
                      <input className="custom-checkbox" type="checkbox"
                        checked={selectedIds.has(site.id)} onChange={() => toggleSelect(site.id)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <a href={site.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontWeight: 500, color: 'inherit', textDecoration: 'none' }}>
                          {site.domain}
                        </a>
                        {site.is_private === 1 && (
                          <span title="Not in global directory"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)',
                              background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>
                            <Lock size={10} /> Private
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`category-badge cat-${site.category}`}>{site.category || 'general'}</span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {site.da_score != null ? `DA ${site.da_score}` : '—'}
                      {site.pa_score != null ? ` / PA ${site.pa_score}` : ''}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className={`btn btn-sm ${isAdded ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleAddToProject(site.id)}
                          disabled={isAdded || isAdding}
                          title={isAdded ? 'Already in Submissions' : 'Add to active Submissions'}
                          style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '85px' }}>
                          {isAdded
                            ? <><CheckCircle size={12} /> Added</>
                            : isAdding
                              ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                              : <><Plus size={12} /> Add</>}
                        </button>
                        <button className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => handleDelete(site.id)} disabled={isDel}
                          title="Remove from vault" style={{ color: 'var(--danger)', padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Find Links Tab ───────────────────────────────────────────────────────────
function FindLinksTab({ projectId, existingIds, onAdded }) {
  const [sites, setSites] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [category, setCategory] = useState('all');
  const [minDa, setMinDa] = useState('0');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(new Set());
  const [added, setAdded] = useState(new Set());
  const [categoryCounts, setCategoryCounts] = useState({});
  const [bookmarkedId, setBookmarkedId] = useState(null);
  const [hideProcessed, setHideProcessed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25, sort: 'da_score', order: 'desc' };
      if (category !== 'all') params.category = category;
      if (search) params.search = search;
      if (minDa !== '0') params.min_da = minDa;
      if (hideProcessed) params.hideProcessed = true;
      const res = await backlinksApi.list(params);
      setSites(res.sites || []);
      setTotal(res.pagination?.total || 0);

      const counts = {};
      (res.categories || []).forEach(c => { counts[c.category] = c.count; });
      setCategoryCounts(counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, category, search, minDa, hideProcessed]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, category, minDa, hideProcessed]);

  useEffect(() => {
    // Load bookmark
    backlinksApi.getBookmark(`project-${projectId}`).then(res => {
       if(res && res.backlink_site_id) setBookmarkedId(res.backlink_site_id);
    }).catch(e => console.error(e));
  }, [projectId]);

  async function handleAdd(siteId) {
    setAdding(s => new Set(s).add(siteId));
    try {
      await submissionsApi.create({ project_id: projectId, backlink_site_id: siteId });
      setAdded(s => new Set(s).add(siteId));
      onAdded();
    } catch (e) {
      alert(e.message);
    } finally {
      setAdding(s => { const n = new Set(s); n.delete(siteId); return n; });
    }
  }

  async function handleBookmark(id) {
    try {
      if (bookmarkedId === id) {
        await backlinksApi.clearBookmark(`project-${projectId}`);
        setBookmarkedId(null);
      } else {
        await backlinksApi.setBookmark(id, `project-${projectId}`);
        setBookmarkedId(id);
      }
    } catch (e) {
      console.error('Failed to set bookmark', e);
    }
  }

  const catOptions = [
    { value: 'all', label: `All Categories (${total})` },
    ...Object.entries(categoryCounts)
      .sort((a,b) => b[1] - a[1])
      .map(([cat, count]) => ({
        value: cat,
        label: `${cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${count})`
      }))
  ];

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className={`search-expand-wrapper${searchOpen ? ' open' : ''}`} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && !search) setSearchOpen(false); }}>
          <button className={`search-expand-btn ${searchOpen ? 'open' : ''}`} onClick={() => { if (searchOpen) { setSearchOpen(false); setSearch(''); } else { setSearchOpen(true); } }} title="Search directory">
            <Search size={15} />
          </button>
          <input
            ref={searchInputRef}
            className="search-expand-input"
            type="text"
            placeholder="Search domain, URL..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } }}
          />
          {searchOpen && search && (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', paddingRight: 6 }} onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}>
              <X size={12} />
            </button>
          )}
        </div>

        <button 
          className={`btn btn-sm ${hideProcessed ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', padding: '8px 16px' }}
          onClick={() => setHideProcessed(!hideProcessed)}
          title="Hide backlinks you have already added or skipped."
        >
          {hideProcessed ? 'Hidden Processed' : 'Show All'}
        </button>

        <FilterDropdown
          value={category}
          onChange={setCategory}
          options={catOptions}
          placeholder="All Categories"
        />

        <FilterDropdown
          value={minDa}
          onChange={setMinDa}
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

        {bookmarkedId && (
           <button className="btn btn-primary btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }} onClick={() => {
              const el = document.getElementById(`find-row-${bookmarkedId}`);
              if (el) { 
                el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
              } else {
                alert('Your resume point is not on this page. Try searching or navigating.');
              }
           }}>
             <BookmarkCheck size={14} /> Resume
           </button>
        )}
      </div>

      {loading ? (
        <div className="loader" style={{ padding: 40 }}><div className="spinner"></div></div>
      ) : sites.length === 0 ? (
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-state-icon"><LinkIcon size={32} /></div>
          <div className="empty-state-title">No sites found</div>
          <div className="empty-state-text">Try adjusting your search or DA filter.</div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th title="The domain or root URL of the backlink site">Website</th>
                  <th title="The general niche or platform type">Category</th>
                  <th title="Domain Authority / Page Authority / Spam Score">DA / PA / SS</th>
                  <th style={{ width: 100 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sites.map(site => {
                  const alreadyInProject = existingIds.has(site.id) || added.has(site.id);
                  const isBookmarked = bookmarkedId === site.id;
                  return (
                    <tr key={site.id} id={`find-row-${site.id}`} style={{ opacity: alreadyInProject ? 0.55 : 1, borderLeft: isBookmarked ? '3px solid var(--accent)' : '3px solid transparent', background: isBookmarked ? 'rgba(99,102,241,0.04)' : undefined }}>
                      <td>
                        <button
                          className={`resume-point-btn ${isBookmarked ? 'active jump-animation' : ''}`}
                          onClick={() => handleBookmark(site.id)}
                          title={isBookmarked ? 'Clear bookmark' : 'Set as bookmark'}
                        >
                          <ResumePointIcon active={isBookmarked} />
                        </button>
                      </td>
                      <td className="table-domain">
                        <a href={site.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }} onClick={e => e.stopPropagation()}>
                          {site.domain || site.url}
                        </a>
                      </td>
                      <td>
                        <span className="badge badge-category" data-cat={site.category || 'other'} style={{ fontSize: 11 }}>
                          {(site.category || 'other').replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {site.da_score ? `${site.da_score} / ${site.pa_score || '—'}` : '—'}
                      </td>
                      <td>
                        {alreadyInProject ? (
                          <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>✓ Added</span>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={adding.has(site.id)}
                            onClick={() => handleAdd(site.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {adding.has(site.id) ? '...' : <><Plus size={13} /> Add</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
            <span>{total} sites total</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ lineHeight: '32px' }}>Page {page}</span>
              <button className="btn btn-secondary btn-sm" disabled={sites.length < 25} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectDetail({ projectId, onBack }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI
  const [sheetMode, setSheetMode] = useState(false);
  const [sheetSidebarOpen, setSheetSidebarOpen] = useState(true);
  const [tab, setTab] = useState(() => localStorage.getItem('projectDetailTab') || 'submissions');
  
  useEffect(() => {
    localStorage.setItem('projectDetailTab', tab);
  }, [tab]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const tableContainerRef = useRef(null);
  const submissionsRef = useRef(null);

  // Submissions state
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [activeWorkspaceSubId, setActiveWorkspaceSubId] = useState(null);

  const handleSelectToggle = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === submissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissions.map(s => s.id)));
    }
  };

  // Modals
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareToken, setShareToken] = useState(null);

  useEffect(() => { loadProject(); }, [projectId]);

  async function loadProject() {
    try {
      setLoading(true);
      const data = await projectsApi.get(projectId);
      setProject(data);
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(err.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id, newStatus) {
    setUpdatingId(id);
    try {
      await submissionsApi.update(id, { status: newStatus });
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus, submitted_at: newStatus === 'submitted' ? new Date().toISOString() : s.submitted_at } : s));
    } catch (e) {
      alert(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleFieldSave(id, data) {
    try {
      await submissionsApi.update(id, data);
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleBulkStatusChange(newStatus) {
    if (!newStatus || newStatus === 'none') return;
    try {
      const updates = Array.from(selectedIds).map(id => submissionsApi.update(id, { status: newStatus }));
      await Promise.all(updates);
      setSubmissions(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, status: newStatus, submitted_at: newStatus === 'submitted' ? new Date().toISOString() : s.submitted_at } : s));
      setSelectedIds(new Set());
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleMarkLast(id) {
    try {
      await submissionsApi.markLast(id);
      setSubmissions(prev => prev.map(s => ({ ...s, is_last_done: s.id === id ? (s.is_last_done ? 0 : 1) : 0 })));
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleDelete(id) {
    setDeleteConfirm({ type: 'single', id });
  }

  async function handleBulkDelete() {
    setDeleteConfirm({ type: 'bulk', count: selectedIds.size });
  }

  async function confirmDelete() {
    try {
      if (deleteConfirm.type === 'single') {
        await submissionsApi.delete(deleteConfirm.id);
        setSubmissions(prev => prev.filter(s => s.id !== deleteConfirm.id));
      } else if (deleteConfirm.type === 'bulk') {
        await submissionsApi.bulkDelete(Array.from(selectedIds));
        setSubmissions(prev => prev.filter(s => !selectedIds.has(s.id)));
        setSelectedIds(new Set());
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleteConfirm(null);
    }
  }

  async function handleShare() {
    try {
      const data = await projectsApi.share(projectId);
      setShareToken(data.share_token);
      setShowShareModal(true);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleExport() {
    try {
      const csv = await projectsApi.export(projectId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${project.name}-export.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <div className="loader" style={{ height: '60vh' }}><div className="spinner"></div></div>;
  if (error) return (
    <div className="page-content">
      <div className="empty-state">
        <div className="empty-state-icon"><XCircle size={40} color="var(--danger)" /></div>
        <div className="empty-state-title">Error Loading Project</div>
        <div className="empty-state-text">{error}</div>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={onBack}>Go Back</button>
      </div>
    </div>
  );
  if (!project) return null;

  // Derived stats natively calculated internally so they animate live
  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => !s.status || s.status === 'pending' || s.status === 'not-started').length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    approved: submissions.filter(s => s.status === 'approved' || s.status === 'live').length,
    rejected: submissions.filter(s => s.status === 'rejected' || s.status === 'dropped').length,
  };
  const progress = stats.total ? Math.round(((stats.submitted + stats.approved) / stats.total) * 100) : 0;

  // Filter submissions for display
  const filteredSubs = submissions.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (s.site_domain || '').toLowerCase().includes(q) || (s.site_url || '').toLowerCase().includes(q) || (s.anchor_text || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchCategory = filterCategory === 'all' || s.site_category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const existingIds = new Set(submissions.map(s => s.backlink_site_id));

  // ── Tabs Content ──────────────────────────────────────────────────────────
  const tabsContent = (
    <div className="project-detail-tabs-section">
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab ${tab === 'submissions' ? 'active' : ''}`} onClick={() => setTab('submissions')}>
          Submissions
          {submissions.length > 0 && <span className="badge" style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', background: 'var(--accent)', color: '#fff', borderRadius: 10 }}>{submissions.length}</span>}
        </button>
        <button className={`tab ${tab === 'find' ? 'active' : ''}`} onClick={() => setTab('find')}>
          Find Links
        </button>
        <button className={`tab ${tab === 'uploads' ? 'active' : ''}`} onClick={() => setTab('uploads')}>
          Private Vault
        </button>
      </div>
      <div key={tab} className="fade-in" style={{ minHeight: '600px' }}>

      {/* ── Submissions Tab ── */}
      {tab === 'submissions' && (
        <div>
        
        {/* Bulk Action Toolbar OR Normal Toolbar */}
        {selectedIds.size > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--accent)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{selectedIds.size} selected</span>
            <div style={{ width: 1, height: 16, background: 'var(--border)' }}></div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Set status:</span>
            <FilterDropdown
              value="none"
              onChange={(val) => handleBulkStatusChange(val)}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' }
              ]}
              placeholder="Bulk Update..."
            />
            <button className="btn btn-ghost btn-sm" onClick={handleBulkDelete} style={{ color: 'var(--danger)', padding: '4px 8px' }}>
              <Trash2 size={13} style={{ marginRight: 4 }} /> Delete
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())} style={{ padding: '4px 8px' }}>
              Clear Selection
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Animated expandable search */}
            <div
              className={`search-expand-wrapper${searchOpen ? ' open' : ''}`}
              onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && !searchQuery) setSearchOpen(false); }}
            >
              <button
                className={`search-expand-btn ${searchOpen ? 'open' : ''}`}
                onClick={() => { if (searchOpen) { setSearchOpen(false); setSearchQuery(''); } else { setSearchOpen(true); } }}
                title="Search submissions"
              >
                <Search size={15} />
              </button>
              <input
                ref={searchInputRef}
                className="search-expand-input"
                type="text"
                placeholder="Domain, URL, Anchor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false); } }}
              />
              {searchOpen && searchQuery && (
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', paddingRight: 6 }}
                  onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {submissions.some(s => s.is_last_done) && (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => {
                  const lastRow = submissions.find(s => s.is_last_done);
                  if (lastRow) {
                    const el = document.getElementById(`sub-row-${lastRow.id}`);
                    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
                  }
                  if (submissionsRef.current) submissionsRef.current.scrollIntoView({ behavior: 'smooth' });
                }} 
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                title="Scroll to Resume Point"
              >
                <BookmarkCheck size={14} /> Resume
              </button>
            )}


            {/* Category filter dropdown */}
            <FilterDropdown
              value={filterCategory}
              onChange={setFilterCategory}
              options={[
                { value: 'all', label: 'All Categories' },
                ...Array.from(new Set(submissions.map(s => s.site_category).filter(Boolean))).sort().map(cat => ({
                  value: cat,
                  label: cat.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                }))
              ]}
              placeholder="All Categories"
            />

            {/* Status filter dropdown */}
            <FilterDropdown
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              placeholder="All Statuses"
            />

            {/* Pen icon → open Content Workspace (no row selected) */}
            <button
              className="btn btn-secondary btn-sm"
              title="Content Workspace"
              onClick={() => setActiveWorkspaceSubId('project')}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <PenLine size={13} /> Workspace
            </button>

            {/* Scroll table right shortcut */}
            <button
              className="btn btn-ghost btn-sm"
              title="Scroll table to end"
              onClick={() => { const el = tableContainerRef.current; if (el) el.scrollLeft = el.scrollWidth; }}
              style={{ fontSize: 13 }}
            >→ End</button>

            <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={13} /> CSV
            </button>
          </div>
        )}

          {filteredSubs.length === 0 ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon"><ClipboardList size={32} /></div>
                <div className="empty-state-title" style={{ fontSize: 16 }}>No submissions yet</div>
                <div className="empty-state-text">Use the <strong>Find Links</strong> tab to discover and add backlink sites to this project.</div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTab('find')}>
                  <LinkIcon size={14} style={{ marginRight: 6 }} /> Find Links
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              <SubmissionsTable
                submissions={filteredSubs}
                onStatusChange={handleStatusChange}
                onFieldSave={handleFieldSave}
                onDelete={handleDelete}
                onMarkLast={handleMarkLast}
                updatingId={updatingId}
                selectedIds={selectedIds}
                onSelectToggle={handleSelectToggle}
                onSelectAll={handleSelectAll}
                filterActive={searchQuery !== '' || filterStatus !== 'all'}
                onOpenWorkspace={setActiveWorkspaceSubId}
                tableRef={tableContainerRef}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Find Links Tab ── */}
      {tab === 'find' && (
        <FindLinksTab
          projectId={projectId}
          existingIds={existingIds}
          onAdded={loadProject}
        />
      )}

      {/* -- Private Vault Tab -- */}
      {tab === 'uploads' && (
        <PrivateVaultTab projectId={projectId} existingIds={existingIds} onAdded={loadProject} />
      )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div
              className="flex items-center gap-2 mb-1"
              style={{ color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}
              onClick={onBack}
            >
              <ArrowLeft size={14} /> Back to Projects
            </div>
            <h1 className="page-title">{project.name}</h1>
            <p className="page-subtitle">
              {project.domain || 'No domain'} • {stats.total || 0} links tracked
            </p>
          </div>
        {/* Page header action buttons */}
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Share2 size={15} /> Share
            </button>
          </div>
        </div>
      </div>

      {/* ── Page Content ── */}
      <div className="page-content" style={{ padding: '24px 32px' }}>
        {/* Stats Row */}
        <div className="stats-grid">
          {[
            { label: 'Total Links', value: stats.total || 0, icon: ClipboardList, accent: 'accent-blue' },
            { label: 'Pending', value: stats.pending || 0, icon: Clock, accent: 'accent-orange' },
            { label: 'Submitted', value: stats.submitted || 0, icon: Send, accent: 'accent-cyan' },
            { label: 'Approved', value: stats.approved || 0, icon: CheckCircle, accent: 'accent-green' },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className={`stat-card ${accent}`}>
              <div className="stat-card-icon"><Icon size={20} /></div>
              <div className="stat-card-value" style={{ fontSize: 26 }}>{value}</div>
              <div className="stat-card-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Overall Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: progress >= 100 ? '#22c55e' : 'var(--text-primary)' }}>{progress}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: progress >= 100 ? '#22c55e' : '#6366f1', borderRadius: 2, transition: 'width 0.5s ease' }}></div>
          </div>
        </div>

        {/* Content Workspace — project-level, collapsible, placed between progress bar and tabs */}
        <div style={{ marginBottom: 24 }}>
          <ContentKit project={project} onUpdate={loadProject} />
        </div>

        {/* Full-width Tabs (table never competes with ContentKit for space) */}
        {tabsContent}
      </div>

      {/* ── AI Workspace Overlay (slide-in from right) ── */}
      {activeWorkspaceSubId && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
          background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)', zIndex: 200,
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.25s ease-out'
        }}>
          <SubmissionWorkspace 
            submission={activeWorkspaceSubId === 'project' ? null : submissions.find(s => s.id === activeWorkspaceSubId)}
            project={project}
            onClose={() => setActiveWorkspaceSubId(null)}
            onSave={handleFieldSave}
          />
        </div>
      )}

      {/* ── Share Modal ── */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Share2 size={20} /> Share Project
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Invite a user via email, or share a direct client access link.
            </p>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Invite via Email (Demo)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="email" className="input" placeholder="colleague@example.com" />
                <button className="btn btn-primary" onClick={() => alert('Invites will be integrated with our email provider later!')}>Send Invite</button>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', height: '1px', marginBottom: 20 }}></div>

            <div className="input-group">
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Direct Client Link</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" className="input" readOnly
                  value={`${window.location.origin}/shared/${shareToken}`}
                />
                <button className="btn btn-secondary" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/shared/${shareToken}`);
                  alert('Copied!');
                }}>
                  Copy
                </button>
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowShareModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Trash2 size={26} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {deleteConfirm.type === 'bulk' ? `Delete ${deleteConfirm.count} submissions?` : 'Remove this submission?'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-secondary" style={{ minWidth: 100 }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ minWidth: 100 }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
