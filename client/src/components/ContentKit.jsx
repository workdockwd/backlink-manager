import { useState, useRef } from 'react';
import { ChevronDown, ChevronUp, Copy, Plus, Trash2, Sparkles, Link as LinkIcon, Bold, Check, Globe, Key, Type } from 'lucide-react';
import { projectsApi, aiApi } from '../api';

export default function ContentKit({ project, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [rephraseIndex, setRephraseIndex] = useState(null);
  const [aiError, setAiError] = useState(null);
  const descRefs = useRef({});
  let targetUrls = [];
  let snippets = [];
  let keywords = [];
  try { targetUrls = JSON.parse(project.target_urls || '[]'); } catch { /* ignore */ }
  try { snippets = JSON.parse(project.content_snippets || '[]'); } catch { /* ignore */ }
  try { keywords = JSON.parse(project.keywords || '[]'); } catch { /* ignore */ }

  const keywordsText = keywords.join(', ');

  async function save(data) {
    setSaving(true);
    try {
      await projectsApi.update(project.id, data);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  }

  // --- Target URLs ---
  function addUrl() {
    const url = newUrl.trim();
    if (!url) return;
    const updated = [...targetUrls, url];
    save({ target_urls: updated });
    setNewUrl('');
  }

  function removeUrl(index) {
    const updated = targetUrls.filter((_, i) => i !== index);
    save({ target_urls: updated });
  }

  // --- Keywords ---
  function handleKeywordsBlur(e) {
    const kws = e.target.value.split(/[,\n]/).map(k => k.trim()).filter(k => k);
    save({ keywords: kws });
  }

  // --- Snippets ---
  function addSnippet() {
    const updated = [...snippets, { id: Date.now(), title: '', description: '' }];
    save({ content_snippets: updated });
  }

  function updateSnippet(index, field, value) {
    const updated = [...snippets];
    updated[index] = { ...updated[index], [field]: value };
    save({ content_snippets: updated });
  }

  function removeSnippet(index) {
    const updated = snippets.filter((_, i) => i !== index);
    save({ content_snippets: updated });
  }

  function getDescriptionHtml(index) {
    const ref = descRefs.current[index];
    return ref ? ref.innerHTML : snippets[index]?.description || '';
  }

  // --- Copy ---
  async function copyText(text, id) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* ignore */ }
  }

  async function copyHtml(html, id) {
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const plainBlob = new Blob([html.replace(/<[^>]+>/g, '')], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': plainBlob })
      ]);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Fallback to plain text
      copyText(html.replace(/<[^>]+>/g, ''), id);
    }
  }

  // --- Rich Text Commands ---
  function execBold() { document.execCommand('bold'); }
  function execLink() {
    const url = prompt('Enter URL:');
    if (url) document.execCommand('createLink', false, url);
  }

  // --- AI Generate ---
  async function generateWithAI() {
    if (keywords.length === 0) {
      setAiError('Add some keywords first before generating content.');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await aiApi.generateContent(keywords, targetUrls[0] || '', 1);
      if (result.snippets && result.snippets.length > 0) {
        const newSnippets = result.snippets.map(s => ({
          id: Date.now() + Math.random(),
          title: s.title,
          description: s.description,
        }));
        save({ content_snippets: [...snippets, ...newSnippets] });
      }
    } catch (err) {
      if (err.message.includes('No API key') || err.message.includes('needsApiKey')) {
        setAiError('Add your free Gemini API key in Profile Settings → AI Integration');
      } else {
        setAiError(err.message);
      }
    } finally {
      setAiLoading(false);
    }
  }
  async function rephraseSnippet(index) {
    if (keywords.length === 0) {
      setAiError('Add some keywords first before rephrasing.');
      return;
    }
    setRephraseIndex(index);
    setAiError(null);
    try {
      const result = await aiApi.generateContent(keywords, targetUrls[0] || '', 1);
      if (result.snippets && result.snippets.length > 0) {
        const newContent = result.snippets[0];
        const updated = [...snippets];
        updated[index] = { ...updated[index], title: newContent.title, description: newContent.description };
        save({ content_snippets: updated });
      }
    } catch (err) {
      if (err.message.includes('No API key') || err.message.includes('needsApiKey')) {
        setAiError('Add your free Gemini API key in Profile Settings → AI Integration');
      } else {
        setAiError(err.message);
      }
    } finally {
      setRephraseIndex(null);
    }
  }

  const summaryText = `${snippets.length} snippet${snippets.length !== 1 ? 's' : ''}, ${keywords.length} keyword${keywords.length !== 1 ? 's' : ''}, ${targetUrls.length} URL${targetUrls.length !== 1 ? 's' : ''}`;

  return (
    <div className="content-kit" style={{ marginBottom: 16 }}>
      {/* Collapsed Header */}
      <div
        className="content-kit-header"
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Type size={16} color="var(--accent)" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>Content Workspace</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({summaryText})</span>
          {saving && <span style={{ fontSize: 11, color: 'var(--accent)' }}>Saving...</span>}
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="content-kit-body">
          {/* Target URLs */}
          <div className="ck-section">
            <label className="ck-label"><Globe size={13} /> Target URLs</label>
            <div className="ck-list">
              {targetUrls.map((url, i) => (
                <div key={i} className="ck-list-item">
                  <span className="ck-url">{url}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => copyText(url, `url-${i}`)}
                      title="Copy URL"
                    >
                      {copiedId === `url-${i}` ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeUrl(i)}
                      title="Remove"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="input"
                style={{ fontSize: 12, padding: '5px 8px', flex: 1 }}
                placeholder="https://mysite.com/page"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addUrl()}
              />
              <button className="btn btn-secondary btn-sm" onClick={addUrl}>
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Keywords */}
          <div className="ck-section">
            <label className="ck-label"><Key size={13} /> Keywords</label>
            <textarea
              className="input"
              style={{ fontSize: 12, padding: '6px 8px', minHeight: 50, resize: 'vertical' }}
              placeholder="best seo tools, link building, backlink checker"
              defaultValue={keywordsText}
              onBlur={handleKeywordsBlur}
            />
            {keywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="ck-keyword-chip"
                    onClick={() => copyText(kw, `kw-${i}`)}
                    title="Click to copy"
                  >
                    {copiedId === `kw-${i}` ? '✓ Copied' : kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content Snippets */}
          <div className="ck-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="ck-label"><Type size={13} /> Content Snippets</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={generateWithAI}
                  disabled={aiLoading}
                  style={{ fontSize: 11, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, transition: 'opacity 0.3s ease', opacity: aiLoading ? 0.7 : 1 }}
                >
                  <Sparkles size={13} className={aiLoading ? 'spin-anim' : ''} /> 
                  <span className={aiLoading ? 'pulse-anim' : ''}>{aiLoading ? 'Generating...' : 'Generate with AI'}</span>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={addSnippet} style={{ fontSize: 11 }}>
                  <Plus size={12} /> Add Snippet
                </button>
              </div>
            </div>

            {aiError && (
              <div style={{ fontSize: 12, color: 'var(--danger)', padding: '6px 10px', background: 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', marginTop: 6 }}>{aiError}</div>
            )}

            {snippets.map((snippet, index) => (
              <div key={snippet.id || index} className="ck-snippet">
                <div className="ck-snippet-header">
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Snippet {index + 1}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Rephrase with AI"
                      onClick={() => rephraseSnippet(index)}
                      disabled={rephraseIndex === index}
                      style={{ color: 'var(--accent)' }}
                    >
                      <Sparkles size={12} className={rephraseIndex === index ? 'spin-anim' : ''} />
                      <span style={{ fontSize: 10, marginLeft: 2 }} className={rephraseIndex === index ? 'pulse-anim' : ''}>
                        {rephraseIndex === index ? 'Rephrasing...' : 'Rephrase'}
                      </span>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Copy All (Title + Description)"
                      onClick={() => {
                        const desc = getDescriptionHtml(index);
                        const plain = `${snippet.title}\n\n${desc.replace(/<[^>]+>/g, '')}`;
                        copyText(plain, `all-${index}`);
                      }}
                    >
                      {copiedId === `all-${index}` ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                      <span style={{ fontSize: 10, marginLeft: 2 }}>All</span>
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => removeSnippet(index)} title="Delete snippet">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Title</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 2, height: 18 }}
                      onClick={() => copyText(snippet.title, `title-${index}`)}
                    >
                      {copiedId === `title-${index}` ? <Check size={10} color="var(--success)" /> : <Copy size={10} />}
                    </button>
                  </div>
                  <input
                    className="input"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                    placeholder="SEO-optimized title..."
                    defaultValue={snippet.title}
                    onBlur={e => {
                      if (e.target.value !== snippet.title) updateSnippet(index, 'title', e.target.value);
                    }}
                  />
                </div>

                {/* Description (Rich Text) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Description</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 2, height: 18 }}
                      onClick={() => copyHtml(getDescriptionHtml(index), `desc-${index}`)}
                    >
                      {copiedId === `desc-${index}` ? <Check size={10} color="var(--success)" /> : <Copy size={10} />}
                    </button>
                    {/* Mini Toolbar */}
                    <div className="ck-toolbar">
                      <button className="ck-toolbar-btn" onMouseDown={e => { e.preventDefault(); execBold(); }} title="Bold">
                        <Bold size={12} />
                      </button>
                      <button className="ck-toolbar-btn" onMouseDown={e => { e.preventDefault(); execLink(); }} title="Insert Link">
                        <LinkIcon size={12} />
                      </button>
                    </div>
                  </div>
                  <div
                    ref={el => descRefs.current[index] = el}
                    className="ck-richtext"
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: snippet.description || '' }}
                    onBlur={() => {
                      const html = getDescriptionHtml(index);
                      if (html !== snippet.description) updateSnippet(index, 'description', html);
                    }}
                    data-placeholder="Write or generate your description..."
                  />
                </div>
              </div>
            ))}

            {snippets.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                No snippets yet. Click "Add Snippet" or "Generate with AI" to get started.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
