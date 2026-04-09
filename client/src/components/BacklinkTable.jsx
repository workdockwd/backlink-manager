import { Bookmark, Eye, EyeOff, Trash2 } from 'lucide-react';

const STATUS_CONFIG = {
  added:   { label: 'Added',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  title: 'You added this to a project' },
  skipped: { label: 'Skipped', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', title: 'You marked this as skipped' },
  viewed:  { label: 'Viewed',  color: '#6366f1', bg: 'rgba(99,102,241,0.12)', title: 'You have viewed this link' },
};

function InteractionBadge({ status }) {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      title={cfg.title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}40`,
        borderRadius: 4,
        padding: '1px 6px',
        marginLeft: 6,
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}

export default function BacklinkTable({ 
  sites, 
  sort = 'discovered_at', 
  order = 'desc', 
  onSort, 
  selected = new Set(), 
  onSelect, 
  onSelectAll,
  onDelete, 
  onSkip,
  onBookmark,
  bookmarkedId,
  onRowClick,
  readOnly = false 
}) {

  const SortIcon = ({ col }) => {
    if (sort !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: 'var(--accent-light)' }}>{order === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {!readOnly && (
              <th style={{ width: 40 }}>
                <div 
                  className={`checkbox ${sites.length > 0 && selected.size === sites.length ? 'checked' : ''}`}
                  onClick={onSelectAll}
                >
                  {sites.length > 0 && selected.size === sites.length && '✓'}
                </div>
              </th>
            )}
            <th onClick={() => onSort?.('domain')} style={{ cursor: onSort ? 'pointer' : 'default' }}>
              Website {onSort && <SortIcon col="domain" />}
            </th>
            <th onClick={() => onSort?.('category')} style={{ cursor: onSort ? 'pointer' : 'default' }}>
              Category {onSort && <SortIcon col="category" />}
            </th>
            <th>DA / PA</th>
            <th onClick={() => onSort?.('discovered_at')} style={{ cursor: onSort ? 'pointer' : 'default' }}>
              Discovered {onSort && <SortIcon col="discovered_at" />}
            </th>
            {!readOnly && (onDelete || onSkip || onBookmark) && <th style={{ width: 120 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {sites.map(site => {
            const isBookmarked = bookmarkedId === site.id;
            return (
              <tr 
                key={site.id}
                id={`bl-row-${site.id}`}
                onClick={() => onRowClick?.(site)}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  opacity: site.interaction_status === 'skipped' ? 0.55 : 1,
                  background: isBookmarked
                    ? 'rgba(99,102,241,0.08)'
                    : site.interaction_status === 'added'
                    ? 'rgba(34,197,94,0.04)'
                    : site.interaction_status === 'skipped'
                    ? 'rgba(245,158,11,0.04)'
                    : undefined,
                  borderLeft: isBookmarked ? '3px solid #6366f1' : '3px solid transparent',
                  transition: 'opacity 0.2s, background 0.2s, border-left 0.2s',
                }}
                className={onRowClick ? 'clickable-row' : ''}
              >
                {!readOnly && (
                  <td>
                    <div 
                      className={`checkbox ${selected.has(site.id) ? 'checked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onSelect?.(site.id); }}
                    >
                      {selected.has(site.id) && '✓'}
                    </div>
                  </td>
                )}
                <td className="table-domain">
                  <a 
                    href={site.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="table-url-hover"
                    onClick={(e) => {
                      if (onRowClick) {
                        e.preventDefault();
                        onRowClick(site);
                      } else {
                        e.stopPropagation();
                      }
                    }}
                    style={{ textDecoration: 'none', color: 'inherit', fontWeight: 500 }}
                  >
                    {site.domain || site.url || 'Unknown Website'}
                  </a>
                  <InteractionBadge status={site.interaction_status} />
                  {isBookmarked && (
                    <span style={{ marginLeft: 6, color: '#6366f1', fontSize: 12 }} title="Resume point — you left off here">
                      🔖
                    </span>
                  )}
                </td>
                <td>
                  <span className="badge badge-category" data-cat={site.category || 'other'} style={{ textTransform: 'capitalize' }}>
                    {site.category ? site.category.replace(/-/g, ' ') : 'Other'}
                  </span>
                </td>
                <td>
                  {site.da_score ? (
                    <span>{site.da_score} / {site.pa_score || '-'}</span>
                  ) : (
                    <a 
                      href={`https://moz.com/link-explorer?site=${encodeURIComponent(site.url)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent text-sm"
                      style={{ textDecoration: 'none' }}
                    >
                      Check →
                    </a>
                  )}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {new Date(site.discovered_at).toLocaleDateString()}
                </td>
                {!readOnly && (onDelete || onSkip || onBookmark) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {onBookmark && (
                        <button
                          className={`btn btn-ghost btn-icon btn-sm icon-animated-toggle bookmark-icon ${isBookmarked ? 'active jump-animation' : ''}`}
                          onClick={(e) => { e.stopPropagation(); onBookmark(site.id); }}
                          title={isBookmarked ? 'Remove resume bookmark' : 'Set as resume point (I left off here)'}
                          style={{ color: isBookmarked ? 'var(--accent)' : 'inherit' }}
                        >
                          <Bookmark size={16} style={{ fill: isBookmarked ? 'var(--accent)' : 'none' }} />
                        </button>
                      )}
                      {onSkip && (
                        <button
                          className={`btn btn-ghost btn-icon btn-sm icon-animated-toggle skip-icon ${site.interaction_status === 'skipped' ? 'active jump-animation' : ''}`}
                          onClick={(e) => { e.stopPropagation(); onSkip(site.id, site.interaction_status); }}
                          title={site.interaction_status === 'skipped' ? 'Click to un-skip (restore to list)' : 'Skip / mark as seen'}
                          style={{ color: site.interaction_status === 'skipped' ? 'var(--danger)' : 'inherit' }}
                        >
                          {site.interaction_status === 'skipped' ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={(e) => { e.stopPropagation(); onDelete(site.id); }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
