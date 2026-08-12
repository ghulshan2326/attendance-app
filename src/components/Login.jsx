import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Lock, Mail, User, Shield, Info } from 'lucide-react';

export default function Login() {
  const { login, signup, isFirebaseConfigured } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee'); // 'admin' | 'employee'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signup(email, password, name, role);
      } else {
        await login(email, password);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login Handler
  const handleQuickDemoLogin = async (demoRole) => {
    setError('');
    const demoEmail = demoRole === 'admin' ? 'admin@company.com' : 'employee@company.com';
    try {
      await login(demoEmail, 'password123');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
        
        {/* Brand Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: '54px', height: '54px' }}>
            <CheckSquare size={30} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>Attendance Tracker Pro</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            {isSignUp ? 'Create your account to continue' : 'Sign in to access your portal'}
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div style={{ 
            background: 'rgba(99, 102, 241, 0.12)', 
            border: '1px solid rgba(99, 102, 241, 0.3)', 
            borderRadius: '12px', 
            padding: '0.85rem 1rem', 
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem'
          }}>
            <Info size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Firebase Setup Note:</strong> Paste your `firebaseConfig` keys into <code>src/firebase/config.js</code>. 
              <br />
              <span style={{ opacity: 0.85 }}>You can use the <strong>Quick Demo Login</strong> buttons below to test Admin vs Employee roles right now!</span>
            </div>
          </div>
        )}

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.15)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '8px', 
            padding: '0.75rem', 
            color: 'var(--status-absent)', 
            fontSize: '0.85rem',
            marginBottom: '1.25rem' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label>Full Name</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <User size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
          </div>

          {isSignUp && (
            <div className="form-group">
              <label>Account Role</label>
              <div style={{ position: 'relative' }}>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                >
                  <option value="employee">Employee (View Register & Check In)</option>
                  <option value="admin">Admin (Full Control & Manage Staff)</option>
                </select>
                <Shield size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', height: '44px' }}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* Quick Demo Role Switching Buttons */}
        <div style={{ marginTop: '1.5rem', pt: '1rem', borderTop: '1px solid var(--bg-card-border)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>Quick Demo Role Login:</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => handleQuickDemoLogin('admin')}
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
            >
              👑 Login as Admin
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => handleQuickDemoLogin('employee')}
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
            >
              👤 Login as Employee
            </button>
          </div>
        </div>

        {/* Toggle between Sign In and Sign Up */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          </span>
          <button 
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '700', cursor: 'pointer' }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

      </div>
    </div>
  );
}
