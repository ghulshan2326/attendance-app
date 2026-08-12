import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, CheckSquare, Info, ArrowLeft } from 'lucide-react';

export default function AdminLogin({ onNavigateToEmployeeLogin }) {
  const { login, isFirebaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Login succeeded - App router will display Admin Panel for /admin path
    } catch (err) {
      console.error("Admin Login Error:", err);
      setError(err.message || 'Authentication failed. Check your admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
        
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: '58px', height: '58px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            <Shield size={32} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f59e0b' }}>Admin Portal Login</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Administrative Control Panel Access (`/admin`)
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.12)', 
            border: '1px solid rgba(245, 158, 11, 0.3)', 
            borderRadius: '12px', 
            padding: '0.85rem 1rem', 
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem'
          }}>
            <Info size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Admin Route Notice:</strong> Authenticate with your administrator credentials to access management controls.
            </div>
          </div>
        )}

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.15)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '8px', 
            padding: '0.75rem 1rem', 
            color: 'var(--status-absent)', 
            fontSize: '0.85rem',
            marginBottom: '1.25rem' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Admin Email</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                required
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem', borderColor: 'rgba(245, 158, 11, 0.3)' }}
              />
              <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Admin Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem', borderColor: 'rgba(245, 158, 11, 0.3)' }}
              />
              <Lock size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b' }} />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn"
            disabled={loading}
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              height: '44px', 
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#ffffff',
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
            }}
          >
            {loading ? 'Authenticating...' : '👑 Sign In to Admin Panel'}
          </button>
        </form>

        {/* Link back to Employee Login */}
        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.85rem' }}>
          <button 
            type="button"
            onClick={onNavigateToEmployeeLogin}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted)', 
              fontWeight: '600', 
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <ArrowLeft size={15} /> Back to Employee Portal Login
          </button>
        </div>

      </div>
    </div>
  );
}
