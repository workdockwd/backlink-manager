const fs = require('fs');

async function fix() {
  const file = 'e:\\AI app development\\Backlink directory\\client\\src\\pages\\ProjectDetail.jsx';
  const txt = fs.readFileSync(file, 'utf8');

  // 1. Top Part (Imports, Component state, Page Header layout)
  const topEnd = txt.indexOf("      <div className={sheetMode ? 'sheet-modal-overlay' : 'page-content'}>");
  const topPart = txt.substring(0, topEnd);

  // 2. Tabs Content (From the first `<div className="tabs">` until just before the extra `</div></div></div>`)
  const tabsStart = txt.indexOf('<div className="tabs">');
  const modalsStart = txt.indexOf('      {/* Import URLs Modal */}');
  
  // We extract the raw tabs content which includes the bad closing tags at the end
  let rawTabsContent = txt.substring(tabsStart, modalsStart);
  
  // We remove the trailing `</div>` tags. There are 3 of them.
  // We'll split by newline, trim, and drop the last 3 elements that contain '</div>' or just remove the last 3 '</div>'s and '</div>' closing tags.
  let tabLines = rawTabsContent.split('\n');
  let divsToRemove = 3;
  while(divsToRemove > 0 && tabLines.length > 0) {
    let lastLine = tabLines[tabLines.length - 1].trim();
    if (lastLine === '</div>' || lastLine === '') {
      if (lastLine === '</div>') divsToRemove--;
      tabLines.pop();
    } else {
      break; // Something else is here!
    }
  }
  const cleanTabsContent = tabLines.join('\n');

  // 3. Modals Content
  // Extract from {/* Import URLs Modal */} to the very end of the file, but we only want the LAST valid closing brackets: `</>\n  );\n}\n`
  const lastReturnObj = '  );\n}\n';
  let modalsContent = txt.substring(modalsStart);
  
  // Clean up any extra trailing junk if there's multiple copies, by finding the first instance of the delete confirmation modal, up to the end of the return statement
  const deleteConfirmIndex = modalsContent.indexOf('{/* Delete Confirmation Modal */}');
  const afterDeleteConfirm = modalsContent.indexOf('</>', deleteConfirmIndex);
  
  // The correct modals block should end right after the fragment closing </>
  modalsContent = modalsContent.substring(0, afterDeleteConfirm + 3);

  // 4. Reassemble!
  const newCode = `${topPart}      <div className={sheetMode ? 'sheet-modal-overlay' : 'page-content'}>
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
                ${cleanTabsContent}
              </div>
            </div>
          </div>
        ) : (
          <>
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
            ${cleanTabsContent}
          </>
        )}
      </div>

${modalsContent}
  );
}
`;

  fs.writeFileSync('client/src/pages/ProjectDetail.jsx', newCode);
  console.log('Successfully fixed ProjectDetail.jsx. Total lines: ' + newCode.split('\\n').length);
}

fix();
