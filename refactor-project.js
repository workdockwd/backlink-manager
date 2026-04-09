const fs = require('fs');

async function refactor() {
  const file = 'e:\\AI app development\\Backlink directory\\client\\src\\pages\\ProjectDetail.jsx';
  let code = fs.readFileSync(file, 'utf8');

  if (!code.includes('const [sheetSidebarOpen')) {
    code = code.replace(
      'const [sheetMode, setSheetMode] = useState(false);',
      'const [sheetMode, setSheetMode] = useState(false);\n  const [sheetSidebarOpen, setSheetSidebarOpen] = useState(true);'
    );
  }

  const tabStart = code.lastIndexOf('<div className="tabs">');
  const rootEnd = code.lastIndexOf('</>');

  if (tabStart === -1 || rootEnd === -1) {
    console.error('tabStart or rootEnd not found');
    return;
  }

  const tabsContent = code.substring(tabStart, rootEnd);

  const newRenderBlock = `      <div className={sheetMode ? 'sheet-modal-overlay' : 'page-content'}>
        {sheetMode ? (
          <div className="sheet-modal-container">
            <div className="sheet-modal-header">
              <h2 style={{ fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                {project.name} <span style={{ opacity: 0.5, fontWeight: 400, fontSize: 16 }}>Sheet View</span>
              </h2>
              <div className="flex items-center gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => setSheetSidebarOpen(!sheetSidebarOpen)}>
                  {sheetSidebarOpen ? 'Hide Panel' : 'Show Panel'}
                </button>
                <button className="btn btn-ghost" onClick={() => setSheetMode(false)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <XCircle size={18} /> Close Sheet
                </button>
              </div>
            </div>
            <div className="sheet-modal-content">
              <div className={\`sheet-modal-sidebar \${sheetSidebarOpen ? '' : 'collapsed'}\`}>
                <ContentKit project={project} onUpdate={loadProject} />
              </div>
              <div className="sheet-modal-main">
                \n${tabsContent}\n
              </div>
            </div>
          </div>
        ) : (
          <>
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

            <div className="card mb-4">
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 14, fontWeight: 500 }}>Progress</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: progress > 70 ? 'var(--success)' : 'var(--accent-light)' }}>
                  {progress}%
                </span>
              </div>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: \`\${progress}%\` }}></div>
              </div>
            </div>

            <ContentKit project={project} onUpdate={loadProject} />
            <div style={{marginTop: 20}}></div>
            \n${tabsContent}\n
          </>
        )}
      </div>\n    `;

  const pageContentStart = code.lastIndexOf('<div className={`page-content ' + '${sheetMode');
  if (pageContentStart !== -1) {
    const before = code.substring(0, pageContentStart);
    const after = code.substring(rootEnd);
    fs.writeFileSync(file, before + newRenderBlock + after);
    console.log('Successfully refactored ProjectDetail.jsx');
  } else {
    console.error('Could not find page content block start');
  }
}
refactor();
