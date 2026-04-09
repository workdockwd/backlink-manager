import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login({ navigateTo }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigateTo('home');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-main)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ 
            width: 48, 
            height: 48, 
            background: 'var(--accent)', 
            borderRadius: 12, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 16px',
            fontSize: 24,
            color: 'white'
          }}>
            🔗
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            {isRegistering ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            {isRegistering ? 'Join LinkVault to manage your SEO projects.' : 'Log in to securely manage your SEO projects.'}
          </p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            color: '#ef4444', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 20, 
            fontSize: 14 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Adding...' : (isRegistering ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-secondary)' }}>
          {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            type="button"
            className="btn-ghost"
            style={{ color: 'var(--accent)', textDecoration: 'none', padding: 0, fontWeight: 600 }}
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
          >
            {isRegistering ? 'Log In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
