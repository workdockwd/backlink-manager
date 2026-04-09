import { useState, useEffect } from 'react';
import { Save, Key, User as UserIcon, LogOut, Check, AlertCircle } from 'lucide-react';
import { usersApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function UserSettings() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile state
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);

  // AI state
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState(null);

  // Danger state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  useEffect(() => {
    usersApi.getSettings().then(res => {
      setUsername(res.username || '');
      setBio(res.bio || '');
      setHasKey(res.has_api_key);
      setMaskedKey(res.gemini_api_key_masked || '');
    }).catch(console.error);
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      await usersApi.updateProfile({ username, bio });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setPwdMsg(null);
    try {
      await usersApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPwdMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSaveAIKey = async (e) => {
    e.preventDefault();
    setSavingKey(true);
    setKeyMsg(null);
    try {
      const res = await usersApi.updateSettings({ gemini_api_key: apiKey });
      setKeyMsg({ type: 'success', text: 'API key saved successfully' });
      setHasKey(res.has_api_key);
      setApiKey('');
      if (res.has_api_key) {
        // reload masked key
        const userSettings = await usersApi.getSettings();
        setMaskedKey(userSettings.gemini_api_key_masked);
      }
      setTimeout(() => setKeyMsg(null), 3000);
    } catch (err) {
      setKeyMsg({ type: 'error', text: err.message || 'Failed to save API key' });
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you absolutely sure you want to delete your account? This cannot be undone.')) return;
    
    setDeleting(true);
    setDeleteMsg(null);
    try {
      await usersApi.deleteAccount(deletePassword);
      logout(); // redirect handled by context
    } catch (err) {
      setDeleteMsg({ type: 'error', text: err.message || 'Failed to delete account' });
      setDeleting(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <UserIcon size={14} style={{ display: 'inline', marginRight: 6 }} /> Profile
        </button>
        <button
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Key size={14} style={{ display: 'inline', marginRight: 6 }} /> Security & AI
        </button>
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {profileMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: profileMsg.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: profileMsg.type === 'error' ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              {profileMsg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
              {profileMsg.text}
            </div>
          )}
          
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
            />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea
              className="input"
              style={{ minHeight: 80 }}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us about your SEO journey..."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : <><Save size={16} /> Save Profile</>}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          
          {/* AI Integration */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-category" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>✨ AI Integration</span>
              Gemini API Key
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Provide your free Google Gemini API key to unlock the Content Kit. This allows generating SEO-optimized titles and descriptions instantly inside your projects.
              <br /><br />
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get your free key from Google AI Studio →</a>
            </p>

            <form onSubmit={handleSaveAIKey} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {keyMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: keyMsg.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: keyMsg.type === 'error' ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  {keyMsg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
                  {keyMsg.text}
                </div>
              )}
              
              <div>
                <label className="label">API Key</label>
                {hasKey && (
                  <div style={{ fontSize: 13, color: 'var(--success)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> Key saved: <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>{maskedKey}</code>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="password"
                    className="input"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={hasKey ? "Enter new API key to replace existing" : "AIzaSy..."}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn btn-secondary" disabled={savingKey}>
                    {savingKey ? 'Saving...' : 'Save Key'}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />

          {/* Change Password */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Change Password</h3>
            <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pwdMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: pwdMsg.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: pwdMsg.type === 'error' ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  {pwdMsg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
                  {pwdMsg.text}
                </div>
              )}
              <div>
                <label className="label">Current Password</label>
                <input
                  type="password"
                  className="input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
               <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button type="submit" className="btn btn-secondary" disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>

          <hr style={{ border: 0, borderTop: '1px solid var(--border)' }} />

          {/* Danger Zone */}
          <section>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--danger)' }}>Danger Zone</h3>
            <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deleteMsg && (
                  <div style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 8 }}>{deleteMsg.text}</div>
                )}
                <div>
                  <label className="label" style={{ color: 'var(--danger)' }}>Confirm password to delete account</label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      type="password"
                      className="input"
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      placeholder="Enter password..."
                      style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ background: 'var(--danger)', color: 'white' }} disabled={deleting || !deletePassword}>
                      {deleting ? 'Deleting...' : 'Delete Account'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
