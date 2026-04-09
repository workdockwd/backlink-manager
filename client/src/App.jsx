import { useState, useEffect } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { LayoutDashboard, Link, Folder, Search as SearchIcon, Mountain, TrendingUp, Settings, Menu, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react'
import './index.css'
import Dashboard from './pages/Dashboard'
import BacklinkDirectory from './pages/BacklinkDirectory'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Scraper from './pages/Scraper'
import Home from './pages/Home'
import Login from './pages/Login'
import ContributorProfile from './pages/ContributorProfile'
import SharedProject from './pages/SharedProject'
import { useAuth } from './contexts/AuthContext'

const PAGES = {
  dashboard: { component: Dashboard, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  directory: { component: BacklinkDirectory, label: 'Backlink Directory', icon: <Link size={18} /> },
  projects: { component: Projects, label: 'Projects', icon: <Folder size={18} /> },
  scraper: { component: Scraper, label: 'Discovery Engine', icon: <SearchIcon size={18} /> },
};

function App() {
  const { user, logout, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => localStorage.getItem('currentPage') || 'home');
  const [selectedProjectId, setSelectedProjectId] = useState(() => localStorage.getItem('selectedProjectId') || null);
  const [selectedUsername, setSelectedUsername] = useState(() => localStorage.getItem('selectedUsername') || null);
  const [shareToken, setShareToken] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check if loading a shared project link
    if (window.location.pathname.startsWith('/shared/')) {
      const token = window.location.pathname.split('/shared/')[1];
      if (token) {
        setShareToken(token);
        setCurrentPage('shared-project');
      }
    }

    const handleNavProfile = (e) => navigateTo('profile', { username: e.detail });
    window.addEventListener('nav-profile', handleNavProfile);
    return () => window.removeEventListener('nav-profile', handleNavProfile);
  }, []);

  // Default redirect logic based on auth
  useEffect(() => {
    if (!loading) {
      if (!user && currentPage !== 'home' && currentPage !== 'login' && currentPage !== 'shared-project') {
        setCurrentPage('home');
        localStorage.setItem('currentPage', 'home');
      } else if (user && (currentPage === 'home' || currentPage === 'login')) {
        setCurrentPage('dashboard');
        localStorage.setItem('currentPage', 'dashboard');
      }
    }
  }, [user, loading, currentPage]);

  const navigateTo = (page, data = {}) => {
    if (page === 'project-detail' && data.projectId) {
      setSelectedProjectId(data.projectId);
      setCurrentPage('project-detail');
      localStorage.setItem('selectedProjectId', data.projectId);
      localStorage.setItem('currentPage', 'project-detail');
    } else if (page === 'profile' && data.username) {
      setSelectedUsername(data.username);
      setCurrentPage('profile');
      localStorage.setItem('selectedUsername', data.username);
      localStorage.setItem('currentPage', 'profile');
    } else {
      setCurrentPage(page);
      setSelectedProjectId(null);
      setSelectedUsername(null);
      localStorage.setItem('currentPage', page);
      localStorage.removeItem('selectedProjectId');
      localStorage.removeItem('selectedUsername');
    }
    setSidebarOpen(false);
  };

  const renderPage = () => {
    if (loading) return <div className="loader" style={{ height: '100vh' }}><div className="spinner"></div></div>;
    
    if (currentPage === 'home') return <Home navigateTo={navigateTo} />;
    if (currentPage === 'login') return <Login navigateTo={navigateTo} />;
    if (currentPage === 'shared-project' && shareToken) return <SharedProject token={shareToken} navigateTo={navigateTo} />;
    if (currentPage === 'profile' && selectedUsername) {
      return <ContributorProfile username={selectedUsername} onBack={() => navigateTo('dashboard')} navigateTo={navigateTo} />;
    }

    // Protected routes
    if (!user) return <Home navigateTo={navigateTo} />;

    if (currentPage === 'project-detail' && selectedProjectId) {
      return <ErrorBoundary><ProjectDetail projectId={selectedProjectId} onBack={() => navigateTo('projects')} /></ErrorBoundary>;
    }
    const pageConfig = PAGES[currentPage];
    if (!pageConfig) return <Dashboard />;
    const Component = pageConfig.component;
    return <Component navigateTo={navigateTo} />;
  };

  if (currentPage === 'home' || currentPage === 'login' || currentPage === 'shared-project') {
    return renderPage(); // Render without sidebar
  }

  return (
    <div className="app-layout">
      {/* Mobile menu toggle */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 150,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          padding: '8px 12px',
          fontSize: 18,
          cursor: 'pointer',
        }}
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ overflow: 'hidden', minWidth: 0 }}>
            <div className="sidebar-logo-icon" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Link size={24} />
            </div>
            <div className="sidebar-logo-text-wrapper" style={{ overflow: 'hidden', minWidth: 0 }}>
              <div className="sidebar-logo-text">LinkVault</div>
              <div className="sidebar-logo-sub">SEO Backlinks</div>
            </div>
          </div>
          {/* Collapse toggle button in header */}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          {/* Expand button - only shown when collapsed */}
          <button
            className="sidebar-expand-btn"
            onClick={() => setSidebarCollapsed(false)}
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>

          {!sidebarCollapsed && <div className="sidebar-section-title">Main</div>}

          {Object.entries(PAGES).map(([key, page]) => (
            <button
              key={key}
              className={`sidebar-link ${currentPage === key || (currentPage === 'project-detail' && key === 'projects') ? 'active' : ''}`}
              onClick={() => navigateTo(key)}
              title={sidebarCollapsed ? page.label : ''}
            >
              <span className="sidebar-icon" style={{ display: 'flex', alignItems: 'center' }}>{page.icon}</span>
              <span className="sidebar-link-label">{page.label}</span>
            </button>
          ))}

          {!sidebarCollapsed && <div className="sidebar-section-title" style={{ marginTop: 24 }}>Quick Links</div>}
          <a 
            href="https://moz.com/link-explorer" 
            target="_blank" 
            rel="noopener noreferrer"
            className="sidebar-link"
            title={sidebarCollapsed ? 'Check DA on Moz' : ''}
          >
            <span className="sidebar-icon" style={{ display: 'flex', alignItems: 'center' }}><Mountain size={18} /></span>
            <span className="sidebar-link-label">Check DA on Moz</span>
          </a>
          <a 
            href="https://www.semrush.com/analytics/backlinks/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="sidebar-link"
            title={sidebarCollapsed ? 'SEMrush Backlinks' : ''}
          >
            <span className="sidebar-icon" style={{ display: 'flex', alignItems: 'center' }}><TrendingUp size={18} /></span>
            <span className="sidebar-link-label">SEMrush Backlinks</span>
          </a>
          <a 
            href="https://ahrefs.com/backlink-checker" 
            target="_blank" 
            rel="noopener noreferrer"
            className="sidebar-link"
            title={sidebarCollapsed ? 'Ahrefs Checker' : ''}
          >
            <span className="sidebar-icon" style={{ display: 'flex', alignItems: 'center' }}><SearchIcon size={18} /></span>
            <span className="sidebar-link-label">Ahrefs Checker</span>
          </a>
          <a 
            href="https://smallseotools.com/domain-authority-checker/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="sidebar-link"
            title={sidebarCollapsed ? 'SmallSEOTools DA' : ''}
          >
            <span className="sidebar-icon" style={{ display: 'flex', alignItems: 'center' }}><Settings size={18} /></span>
            <span className="sidebar-link-label">SmallSEOTools DA</span>
          </a>
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {user && (
            <button
              className={`sidebar-profile-card ${currentPage === 'profile' ? 'active' : ''}`}
              onClick={() => navigateTo('profile', { username: user.username || user.email?.split('@')[0] })}
              title={sidebarCollapsed ? `@${user.username || user.email?.split('@')[0]}` : ''}
              style={{ overflow: 'hidden' }}
            >
              <div className="sidebar-profile-avatar" style={{ flexShrink: 0 }}>
                {(user.username || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="sidebar-profile-info">
                <div className="sidebar-profile-name">
                  @{user.username || user.email?.split('@')[0]}
                </div>
                <div className="sidebar-profile-status">My Profile</div>
              </div>
            </button>
          )}

          <button 
            className="btn btn-secondary btn-sm" 
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}
            onClick={() => logout()}
            title={sidebarCollapsed ? 'Log Out' : ''}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            <span className="btn-logout-label">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {renderPage()}
      </main>
    </div>
  );
}

export default App