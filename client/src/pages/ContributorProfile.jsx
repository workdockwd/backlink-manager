import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Target, Calendar, Shield, Star, Zap, Crown, TrendingUp, CheckCircle, Settings } from 'lucide-react';
import { usersApi } from '../api';
import BacklinkGrid from '../components/BacklinkGrid';
import UserSettings from '../components/UserSettings';
import { useAuth } from '../contexts/AuthContext';

// Gamification Rank Engine
const RANKS = [
  { name: 'Scout',       icon: Shield,     min: 0,   color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  { name: 'Contributor', icon: Star,       min: 5,   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { name: 'Builder',     icon: Zap,        min: 15,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { name: 'Expert',      icon: Award,      min: 40,  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { name: 'Master',      icon: Crown,      min: 100, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
];

function getRank(total) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (total >= r.min) rank = r;
  }
  return rank;
}

function getNextRank(total) {
  for (const r of RANKS) {
    if (total < r.min) return r;
  }
  return null;
}

export default function ContributorProfile({ username, onBack }) {
  const { user } = useAuth();
  const isCurrentUser = user && user.username === username;
  const [showSettings, setShowSettings] = useState(false);
  
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    usersApi.getProfile(username)
      .then(res => {
        setProfile(res.user);
        setStats(res.stats);
        setSubmissions(res.submissions);
      })
      .catch(err => {
        console.error(err);
        setError('User not found or an error occurred.');
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="loader" style={{ height: '100vh' }}><div className="spinner"></div></div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center' }}><h2>{error}</h2><button className="btn btn-secondary" onClick={onBack}>Go Back</button></div>;

  const totalContributions = stats.totalSubmissions;
  const currentRank = getRank(totalContributions);
  const nextRank = getNextRank(totalContributions);
  const RankIcon = currentRank.icon;

  // Progress toward next rank
  let progressPercent = 100;
  let remaining = 0;
  if (nextRank) {
    const rangeStart = currentRank.min;
    const rangeEnd = nextRank.min;
    const progress = totalContributions - rangeStart;
    const range = rangeEnd - rangeStart;
    progressPercent = Math.round((progress / range) * 100);
    remaining = rangeEnd - totalContributions;
  }

  return (
    <div style={{ padding: '0 5vw', maxWidth: 1200, margin: '0 auto', animation: 'fadeIn 0.5s ease-out' }}>
      <header style={{ padding: '32px 0 16px', borderBottom: '1px solid var(--border)', marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost hover-lift" onClick={onBack}>← Back</button>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Contributor Profile</h2>
        </div>
        {isCurrentUser && (
          <button 
            className={`btn ${showSettings ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setShowSettings(!showSettings)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Settings size={14} /> 
            {showSettings ? 'View Profile' : 'Profile Settings'}
          </button>
        )}
      </header>

      <div className="profile-grid">
        
        {/* Profile Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
        >
          {/* User Card */}
          <div className="glass-panel" style={{ padding: 32, borderRadius: 24, textAlign: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, margin: '0 auto 16px', boxShadow: 'var(--shadow-md)' }}>
              {(profile.username || 'U')[0].toUpperCase()}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>@{profile.username}</h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
              <Calendar size={13} /> Joined {new Date(profile.joinedAt).toLocaleDateString()}
            </div>
          </div>

          {/* Rank Badge Card */}
          <div className="glass-panel" style={{ padding: 24, borderRadius: 20, border: `1px solid ${currentRank.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: currentRank.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RankIcon size={24} color={currentRank.color} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Current Rank</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: currentRank.color }}>{currentRank.name}</div>
              </div>
            </div>

            {/* All Rank Tiers */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {RANKS.map(r => {
                const Icon = r.icon;
                const isActive = totalContributions >= r.min;
                return (
                  <div
                    key={r.name}
                    title={`${r.name} — ${r.min}+ links`}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 10, textAlign: 'center',
                      background: isActive ? r.bg : 'var(--bg-secondary)',
                      opacity: isActive ? 1 : 0.35,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Icon size={16} color={isActive ? r.color : 'var(--text-muted)'} />
                  </div>
                );
              })}
            </div>

            {/* Progress Bar to Next Rank */}
            {nextRank ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>
                  <span>{currentRank.name}</span>
                  <span>{nextRank.name}</span>
                </div>
                <div style={{ width: '100%', height: 8, borderRadius: 8, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${currentRank.color}, ${nextRank.color})` }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                  {remaining} more link{remaining !== 1 ? 's' : ''} to <span style={{ fontWeight: 700, color: nextRank.color }}>{nextRank.name}</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', fontSize: 13, color: currentRank.color, fontWeight: 600 }}>
                <Crown size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Maximum rank achieved!
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="glass-panel" style={{ padding: 20, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13 }}>
                <Target size={15} /> Total Links
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{stats.totalSubmissions}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>
                <CheckCircle size={15} /> Active
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{stats.activeLinks}</span>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ width: '100%' }}
        >
          {showSettings ? (
            <UserSettings />
          ) : (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} /> Links Contributed
              </h3>
              {submissions.length > 0 ? (
                <BacklinkGrid sites={submissions} />
              ) : (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No links contributed yet.
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
