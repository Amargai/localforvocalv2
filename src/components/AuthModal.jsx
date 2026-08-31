import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { XIcon, SparklesIcon, ShieldCheckIcon, PhoneIcon, UserIcon } from './Icons';

export function AuthModal() {
  const {
    authModalOpen,
    authModalTab,
    setAuthModalOpen,
    setAuthModalTab,
    demoLogin,
    sendOtp,
    verifyOtp,
    loginWithPassword,
    registerUser
  } = useAuth();

  // Phone OTP State
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState('');
  const [userName, setUserName] = useState('');
  const [otpAccountType, setOtpAccountType] = useState('customer');

  // Email / Password State
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('customer');

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!authModalOpen) return null;

  async function handleDemo(role) {
    try {
      setLoading(true);
      setError('');
      await demoLogin(role);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const res = await sendOtp(phone);
      setOtpSent(true);
      setSimulatedCode(res.simulatedCode || '123456');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await verifyOtp(phone, otpCode, userName, otpAccountType);
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailAuth(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      if (isRegisterMode) {
        await registerUser({ name: regName, email, phone: regPhone, password, accountType: regRole });
      } else {
        await loginWithPassword(email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setAuthModalOpen(false)}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--bg-surface)', color: 'var(--text-main)', padding: '6px', borderRadius: '50%' }}
        >
          <XIcon className="w-5 h-5" />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '4px' }}>🌿</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-heading)' }}>Welcome to Local for Vocal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sign in to explore nearby businesses and broadcast requirements</p>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border)' }}>
          <button
            style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, background: authModalTab === 'demo' ? 'var(--primary)' : 'transparent', color: authModalTab === 'demo' ? '#080911' : 'var(--text-muted)' }}
            onClick={() => { setAuthModalTab('demo'); setError(''); }}
          >
            ⚡ 1-Click Demo
          </button>
          <button
            style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, background: authModalTab === 'otp' ? 'var(--primary)' : 'transparent', color: authModalTab === 'otp' ? '#080911' : 'var(--text-muted)' }}
            onClick={() => { setAuthModalTab('otp'); setError(''); }}
          >
            📱 Phone OTP
          </button>
          <button
            style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, background: authModalTab === 'email' ? 'var(--primary)' : 'transparent', color: authModalTab === 'email' ? '#080911' : 'var(--text-muted)' }}
            onClick={() => { setAuthModalTab('email'); setError(''); }}
          >
            ✉️ Email Login
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* TAB 1: 1-Click Fast Demo Login */}
        {authModalTab === 'demo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: '#4ade80' }}>
              💡 Instant demo access with pre-configured accounts and live local database.
            </div>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '14px' }}
              onClick={() => handleDemo('customer')}
              disabled={loading}
            >
              <span style={{ fontSize: '1.4rem' }}>👤</span>
              <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading)' }}>Login as Resident / Customer</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Browse shops, write reviews, post requirements</div>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '14px' }}
              onClick={() => handleDemo('shop_owner')}
              disabled={loading}
            >
              <span style={{ fontSize: '1.4rem' }}>🏪</span>
              <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>Login as Shop Owner (Care & Cure Chemist)</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Manage listings, toggle Open/Closed, receive customer leads</div>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '14px' }}
              onClick={() => handleDemo('admin')}
              disabled={loading}
            >
              <span style={{ fontSize: '1.4rem' }}>🛡️</span>
              <div style={{ textAlign: 'left', marginLeft: '8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#b45309' }}>Login as Platform Admin</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Approve pending shops, toggle featured, view stats</div>
              </div>
            </button>
          </div>
        )}

        {/* TAB 2: Free Local Phone OTP */}
        {authModalTab === 'otp' && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Enter 10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Role</label>
                  <select className="form-select" value={otpAccountType} onChange={(e) => setOtpAccountType(e.target.value)}>
                    <option value="customer">Resident / Customer</option>
                    <option value="shop_owner">Shop Owner / Service Provider</option>
                  </select>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  🔒 100% Free OTP Simulation. No SMS charges or external API balance required.
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Sending OTP...' : 'Send Free OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ background: '#dcfce7', color: '#15803d', padding: '12px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '16px', fontWeight: 600 }}>
                  🔑 Local Test OTP: <span style={{ fontSize: '1.1rem', letterSpacing: '2px', color: '#0f172a' }}>{simulatedCode}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Enter 6-Digit OTP Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter OTP (e.g. 123456)"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Your Name (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '10px' }} disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                <button type="button" onClick={() => setOtpSent(false)} style={{ width: '100%', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Change phone number
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: Email + Password */}
        {authModalTab === 'email' && (
          <form onSubmit={handleEmailAuth}>
            {isRegisterMode && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Type</label>
                  <select className="form-select" value={regRole} onChange={(e) => setRegRole(e.target.value)}>
                    <option value="customer">Resident / Customer</option>
                    <option value="shop_owner">Shop Owner / Service Provider</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '14px' }} disabled={loading}>
              {loading ? 'Please wait...' : isRegisterMode ? 'Create Account' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
              {isRegisterMode ? (
                <span>Already have an account? <a href="#signin" onClick={(e) => { e.preventDefault(); setIsRegisterMode(false); }} style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign In</a></span>
              ) : (
                <span>Need a new account? <a href="#signup" onClick={(e) => { e.preventDefault(); setIsRegisterMode(true); }} style={{ color: 'var(--primary)', fontWeight: 700 }}>Register here</a></span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
