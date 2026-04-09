import { motion } from 'framer-motion';
import { ExternalLink, Award, Inbox } from 'lucide-react';

export default function BacklinkGrid({ sites, onRowClick }) {
  if (!sites || sites.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Inbox size={40} /></div>
        <div className="empty-state-title">No targets found</div>
        <div className="empty-state-text">Try adjusting your category filter.</div>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
        padding: '10px 0'
      }}
    >
      {sites.map(site => (
        <motion.div
          key={site.id}
          variants={item}
          onClick={() => onRowClick?.(site)}
          className="card hover-lift"
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="badge badge-category" style={{ textTransform: 'capitalize', fontSize: '11px' }}>
              {site.category.replace(/-/g, ' ')}
            </span>
            <span className={`badge ${site.is_free ? 'badge-free' : 'badge-paid'}`} style={{ fontSize: '11px' }}>
              {site.is_free ? 'Free' : 'Paid'}
            </span>
          </div>

          <div>
            <h4 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {site.domain}
              {site.da_score > 70 && <Award size={14} color="var(--warning)" />}
            </h4>
            <a 
              href={site.url} 
              target="_blank" 
              rel="noopener noreferrer nofollow ugc" 
              style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={(e) => { e.stopPropagation(); }}
              className="truncate"
            >
              <ExternalLink size={12} /> {site.url}
            </a>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>DA</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: site.da_score >= 50 ? 'var(--info)' : 'var(--text-primary)' }}>
                {site.da_score || '?'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>PA</div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>{site.pa_score || '?'}</div>
            </div>
            {site.username && (
              <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Added by <span onClick={(e) => { e.stopPropagation(); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('nav-profile', { detail: site.username })); }} style={{ color: 'var(--accent)', fontWeight: '600', cursor: 'pointer' }}>@{site.username}</span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
