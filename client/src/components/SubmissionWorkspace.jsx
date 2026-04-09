import { useState } from 'react';
import { XCircle, Wand2, Copy, CheckCircle, RefreshCw, Save } from 'lucide-react';
import { aiApi } from '../api';

export default function SubmissionWorkspace({ submission, project, onClose, onSave }) {
  // submission can be null when opened from the toolbar (project-level workspace)
  const isProjectLevel = !submission;
  const [title, setTitle] = useState(submission?.content_title || '');
  const [body, setBody] = useState(submission?.content_description || '');
  const [loading, setLoading] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);

  const handleCopy = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      let keywords = ['link building'];
      try { keywords = JSON.parse(project.keywords || '[]'); } catch {}
      if (!keywords.length) keywords = ['link building'];
      const targetUrl = submission?.target_url || project.domain || '';
      const { snippets } = await aiApi.generateContent(keywords, targetUrl, 1);
      if (snippets && snippets[0]) {
        setTitle(snippets[0].title || '');
        setBody(snippets[0].description || '');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRephrase = async () => {
    if (!body.trim()) return alert('Please enter some text to rephrase.');
    setLoading(true);
    try {
      const { rephrased } = await aiApi.rephrase(body);
      if (rephrased) setBody(rephrased);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (isProjectLevel) { onClose(); return; }
    onSave(submission.id, { content_title: title, content_description: body });
    onClose();
  };

  return (
    <div className="submission-workspace">
      <div className="header" style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>Content Workspace</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            {isProjectLevel
              ? <span>Project-level content — <strong style={{ color: 'var(--text-muted)' }}>select a row to work on a specific link</strong></span>
              : <>Working on: <strong style={{ color: 'var(--accent-light)' }}>{submission.site_domain}</strong></>
            }
          </p>
        </div>
        <button className="btn btn-ghost" onClick={onClose}><XCircle size={18} /></button>
      </div>

      <div className="body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Action Row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 6 }}
            onClick={handleGenerate}
            disabled={loading}
          >
            <Wand2 size={16} /> Generate Fresh
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 6 }}
            onClick={handleRephrase}
            disabled={loading}
          >
            <RefreshCw size={16} /> AI Rephrase
          </button>
        </div>

        {/* Title Input */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Article / Submission Title</label>
            <button 
              onClick={() => handleCopy(title, 'title')}
              style={{ background: 'none', border: 'none', color: copiedSection === 'title' ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
            >
              {copiedSection === 'title' ? <CheckCircle size={12} /> : <Copy size={12} />} Copy
            </button>
          </div>
          <input 
            className="input" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="e.g. The Ultimate Guide to..."
            style={{ width: '100%' }}
          />
        </div>

        {/* Body Input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Body / Snippet Description</label>
            <button 
              onClick={() => handleCopy(body, 'body')}
              style={{ background: 'none', border: 'none', color: copiedSection === 'body' ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
            >
              {copiedSection === 'body' ? <CheckCircle size={12} /> : <Copy size={12} />} Copy
            </button>
          </div>
          <textarea 
            className="input textarea" 
            value={body} 
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste your base description here and hit 'AI Rephrase', or generate fresh..."
            style={{ width: '100%', flex: 1, minHeight: '200px' }}
          />
        </div>

        {/* Save/Done */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={16} /> Save to Link
          </button>
        </div>
      </div>
      
      {loading && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loader"><div className="spinner"></div></div>
        </div>
      )}
    </div>
  );
}
