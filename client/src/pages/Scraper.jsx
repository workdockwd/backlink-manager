import { useState, useEffect } from 'react';
import { Rocket, Link, Search, CheckCircle, XCircle, ScrollText, Globe, Lightbulb } from 'lucide-react';
import { scraperApi } from '../api';

export default function Scraper({ navigateTo }) {
  const [status, setStatus] = useState({ isRunning: false, lastRunResult: null });
  const [history, setHistory] = useState({ logs: [], sources: [] });
  const [loading, setLoading] = useState(true);
  const [scrapeUrlForm, setScrapeUrlForm] = useState({ url: '', query: 'general' });
  const [scrapeUrlResult, setScrapeUrlResult] = useState(null);
  const [tab, setTab] = useState('control');

  useEffect(() => {
    loadData();
  }, []);

  // Poll status when running
  useEffect(() => {
    if (!status.isRunning) return;
    const interval = setInterval(async () => {
      try {
        const s = await scraperApi.status();
        setStatus(s);
        if (!s.isRunning) clearInterval(interval);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [status.isRunning]);

  async function loadData() {
    try {
      const [s, h] = await Promise.all([
        scraperApi.status(),
        scraperApi.history(),
      ]);
      setStatus(s);
      setHistory(h);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRunFull() {
    try {
      await scraperApi.run(5);
      setStatus({ isRunning: true, lastRunResult: null });
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleScrapeUrl(e) {
    e.preventDefault();
    setScrapeUrlResult(null);
    try {
      const result = await scraperApi.scrapeUrl(scrapeUrlForm.url, scrapeUrlForm.query);
      setScrapeUrlResult(result);
      loadData();
    } catch (err) {
      setScrapeUrlResult({ status: 'failed', error: err.message });
    }
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="loader"><div className="spinner"></div></div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Discovery Engine</h1>
            <p className="page-subtitle">Find backlink submission sites from across the web</p>
          </div>
          <button
            className={`btn ${status.isRunning ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleRunFull}
            disabled={status.isRunning}
          >
            {status.isRunning ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                Running...
              </>
            ) : (
              <><Rocket size={16} style={{ marginRight: 4 }} /> Run Full Discovery</>
            )}
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Status Banner */}
        {status.isRunning && (
          <div className="card mb-4" style={{ 
            background: 'var(--accent-glow)', 
            borderColor: 'var(--border-accent)',
            animation: 'pulse 2s infinite',
          }}>
            <div className="flex items-center gap-3">
              <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--accent-light)' }}>Discovery in progress...</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Scraping search engines and SEO blogs. This may take a few minutes.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Last run result */}
        {status.lastRunResult && !status.isRunning && (
          <div className="card mb-4" style={{ 
            background: status.lastRunResult.error ? 'var(--danger-bg)' : 'var(--success-bg)',
            borderColor: status.lastRunResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
          }}>
            {status.lastRunResult.error ? (
              <div style={{ color: 'var(--danger)' }}>
                <XCircle size={14} style={{ marginRight: 4 }} /> Last run failed: {status.lastRunResult.error}
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--success)' }}>
                  <CheckCircle size={14} style={{ marginRight: 4 }} /> Discovery complete!
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Found {status.lastRunResult.newSitesAdded} new sites • Total: {status.lastRunResult.totalSites} sites
                  {status.lastRunResult.completedAt && (
                    <> • {new Date(status.lastRunResult.completedAt).toLocaleString()}</>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${tab === 'control' ? 'active' : ''}`} onClick={() => setTab('control')}>
            Scrape URL
          </button>
          <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            History ({history.logs.length})
          </button>
          <button className={`tab ${tab === 'sources' ? 'active' : ''}`} onClick={() => setTab('sources')}>
            Sources ({history.sources.length})
          </button>
        </div>

        {/* Scrape URL Tab */}
        {tab === 'control' && (
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              <Link size={16} style={{ marginRight: 4 }} /> Scrape a Specific URL
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Paste a URL from an SEO blog that lists backlink submission sites. 
              The engine will extract all external links and add them to your directory.
            </p>
            <form onSubmit={handleScrapeUrl}>
              <div className="input-group">
                <label className="input-label">Web Page URL</label>
                <input
                  className="input"
                  type="url"
                  placeholder="https://example.com/top-100-backlink-sites-2025/"
                  value={scrapeUrlForm.url}
                  onChange={e => setScrapeUrlForm(f => ({ ...f, url: e.target.value }))}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Category</label>
                <select
                  className="input select"
                  value={scrapeUrlForm.query}
                  onChange={e => setScrapeUrlForm(f => ({ ...f, query: e.target.value }))}
                >
                  <option value="general">General</option>
                  <option value="blog submission">Blog Submission</option>
                  <option value="web 2.0">Web 2.0</option>
                  <option value="directory submission">Directory</option>
                  <option value="forum submission">Forum</option>
                  <option value="guest posting">Guest Post</option>
                  <option value="social bookmarking">Social Bookmarking</option>
                  <option value="article submission">Article</option>
                  <option value="profile creation">Profile Creation</option>
                  <option value="blog comment">Blog Comment</option>
                  <option value="image submission">Image/Infographic</option>
                  <option value="video submission">Video</option>
                  <option value="pdf submission">Document/PDF</option>
                  <option value="classified">Classified</option>
                  <option value="wiki">Wiki</option>
                  <option value="press release">Press Release</option>
                  <option value="question answer">Q&A</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                <Search size={16} style={{ marginRight: 4 }} /> Scrape This URL
              </button>
            </form>

            {scrapeUrlResult && (
              <div className="card mt-4" style={{ 
                background: scrapeUrlResult.status === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                borderColor: scrapeUrlResult.status === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              }}>
                {scrapeUrlResult.status === 'success' ? (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--success)' }}><CheckCircle size={14} style={{ marginRight: 4 }} /> Scrape successful!</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Found {scrapeUrlResult.sitesFound} links • Added {scrapeUrlResult.sitesNew} new sites
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--danger)' }}>
                    <XCircle size={14} style={{ marginRight: 4 }} /> Failed: {scrapeUrlResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <div className="table-container">
            {history.logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><ScrollText size={40} /></div>
                <div className="empty-state-title">No scrape history</div>
                <div className="empty-state-text">Run the Discovery Engine to start finding backlinks.</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Found</th>
                    <th>New</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.logs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <a href={log.source_url} target="_blank" rel="noopener noreferrer" className="table-url">
                          {log.source_url?.substring(0, 60)}...
                        </a>
                      </td>
                      <td>{log.sites_found}</td>
                      <td style={{ color: log.sites_new > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                        +{log.sites_new}
                      </td>
                      <td>
                        <span className={`badge ${log.status === 'success' ? 'badge-status-approved' : 'badge-status-rejected'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {new Date(log.scraped_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Sources Tab */}
        {tab === 'sources' && (
          <div className="table-container">
            {history.sources.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Globe size={40} /></div>
                <div className="empty-state-title">No sources yet</div>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Query</th>
                    <th>Sites Found</th>
                    <th>Last Scraped</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.sources.map(src => (
                    <tr key={src.id}>
                      <td>
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="table-url">
                          {src.url?.substring(0, 50)}...
                        </a>
                      </td>
                      <td style={{ fontSize: 13 }}>{src.query}</td>
                      <td>{src.sites_found}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {src.last_scraped ? new Date(src.last_scraped).toLocaleString() : '—'}
                      </td>
                      <td>
                        <span className={`badge ${src.status === 'active' ? 'badge-status-active' : 'badge-status-rejected'}`}>
                          {src.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* How It Works */}
        <div className="card mt-4">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Lightbulb size={18} /> How Discovery Works</h3>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <p><strong>Full Discovery</strong> runs in two phases:</p>
            <ol style={{ paddingLeft: 20, marginTop: 8 }}>
              <li><strong>Seed Scraping</strong> — Visits known SEO blogs that list backlink submission sites</li>
              <li><strong>Search Discovery</strong> — Searches DuckDuckGo for queries like "free blog submission sites 2025" and scrapes the results</li>
            </ol>
            <p style={{ marginTop: 8 }}>
              All discovered links are deduplicated and categorized automatically. 
              The scraper runs weekly (every Sunday at 2:00 AM) to keep your directory fresh.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
