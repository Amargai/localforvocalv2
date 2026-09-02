import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { XIcon, SparklesIcon, ShieldCheckIcon, PhoneIcon, UserIcon, CheckIcon } from './Icons';
import { cleanPhone, isValidPhone, isValidEmail } from '../utils/validation';

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

  // Phone OTP Flow State
  const [otpMode, setOtpMode] = useState('login'); // 'login' or 'register'
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [userName, setUserName] = useState('');
  const [otpAccountType, setOtpAccountType] = useState('customer');
  const [resendTimer, setResendTimer] = useState(0);

  // Email / Password Flow State
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('customer');

  // Loading, error, & helper action state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFoundForLogin, setNotFoundForLogin] = useState(false);
  const [existsForRegister, setExistsForRegister] = useState(false);

  const otpInputRef = useRef(null);

  // Focus OTP input when step 2 opens
  useEffect(() => {
    if (otpSent && otpInputRef.current) {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [otpSent]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && authModalOpen) {
        setAuthModalOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen, setAuthModalOpen]);

  if (!authModalOpen) return null;

  function clearState() {
    setError('');
    setNotFoundForLogin(false);
    setExistsForRegister(false);
  }

  // 1-Click Fast Demo Login
  async function handleDemo(role) {
    try {
      setLoading(true);
      clearState();
      await demoLogin(role);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Send OTP for Login or Registration
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    const sanitized = cleanPhone(phone);
    if (!isValidPhone(sanitized)) {
      setError('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (otpMode === 'register' && (!userName || userName.trim().length < 2)) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    try {
      setLoading(true);
      clearState();
      const res = await sendOtp(sanitized, otpMode);
      setOtpSent(true);
      setResendTimer(30); // 30s countdown
      if (res?.devOtp) {
        setDevOtp(res.devOtp);
      }
    } catch (err) {
      const errMsg = err.message || 'Failed to process OTP request.';
      setError(errMsg);
      if (errMsg.includes('No registered account') || errMsg.includes('ACCOUNT_NOT_FOUND')) {
        setNotFoundForLogin(true);
      } else if (errMsg.includes('already exists') || errMsg.includes('ACCOUNT_ALREADY_EXISTS')) {
        setExistsForRegister(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    const sanitized = cleanPhone(phone);
    if (!otpCode || otpCode.trim().length < 4) {
      setError('Please enter the 6-digit OTP code received on your mobile.');
      return;
    }

    try {
      setLoading(true);
      clearState();
      await verifyOtp(sanitized, otpCode.trim(), otpMode, userName.trim(), otpAccountType);
    } catch (err) {
      setError(err.message || 'Invalid OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  // Email / Password Auth
  async function handleEmailAuth(e) {
    e.preventDefault();
    try {
      setLoading(true);
      clearState();
      if (isRegisterMode) {
        if (!regName.trim() || regName.trim().length < 2) {
          setError('Please enter your full name (minimum 2 characters).');
          return;
        }
        if (!isValidEmail(email)) {
          setError('Please enter a valid email address (e.g. name@example.com).');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
        }
        if (regPhone && !isValidPhone(regPhone)) {
          setError('Mobile number must be an exact 10-digit number starting with 6, 7, 8, or 9.');
          return;
        }
        await registerUser({
          name: regName.trim(),
          email: email.trim().toLowerCase(),
          phone: regPhone ? cleanPhone(regPhone) : undefined,
          password,
          accountType: regRole
        });
      } else {
        if (!email.trim()) {
          setError('Please enter your email or mobile number.');
          return;
        }
        if (!password) {
          setError('Please enter your password.');
          return;
        }
        await loginWithPassword(email.trim().toLowerCase(), password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
      <div
        className="modal-card"
        style={{ maxWidth: '460px', width: '100%', padding: '32px 28px', position: 'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setAuthModalOpen(false)}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'var(--bg-surface)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            padding: '6px',
            borderRadius: '50%',
            cursor: 'pointer'
          }}
          title="Close (Esc)"
        >
          <XIcon className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>🌿</div>
          <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
            Local for Vocal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '4px', marginBottom: 0 }}>
            Neighborhood Marketplace & Local Commerce
          </p>
        </div>

        {/* Main Tab Selection */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-input)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '18px',
          border: '1px solid var(--border)'
        }}>
          <button
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              fontSize: '0.84rem',
              fontWeight: 700,
              background: authModalTab === 'otp' ? 'var(--primary)' : 'transparent',
              color: authModalTab === 'otp' ? '#080911' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => { setAuthModalTab('otp'); clearState(); }}
          >
            📱 Mobile OTP
          </button>
          <button
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              fontSize: '0.84rem',
              fontWeight: 700,
              background: authModalTab === 'email' ? 'var(--primary)' : 'transparent',
              color: authModalTab === 'email' ? '#080911' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => { setAuthModalTab('email'); clearState(); }}
          >
            ✉️ Password
          </button>
        </div>

        {/* Error Alert with Quick Switch Action */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: notFoundForLogin || existsForRegister ? '10px' : '0' }}>
              <span style={{ fontSize: '1rem', lineHeight: '1' }}>⚠️</span>
              <div style={{ flex: 1, lineHeight: '1.4' }}>{error}</div>
            </div>

            {notFoundForLogin && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.82rem', padding: '6px 12px', background: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ade80' }}
                onClick={() => { setOtpMode('register'); clearState(); }}
              >
                + Switch to Create Account
              </button>
            )}

            {existsForRegister && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.82rem', padding: '6px 12px', background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' }}
                onClick={() => { setOtpMode('login'); clearState(); }}
              >
                → Switch to Sign In
              </button>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 1: PHONE OTP (Strict Register vs Login Separation)    */}
        {/* ======================================================== */}
        {authModalTab === 'otp' && (
          <div>
            {/* Sub-toggle: Sign In vs Create Account */}
            {!otpSent && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                background: 'var(--bg-surface)',
                padding: '3px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                marginBottom: '18px'
              }}>
                <button
                  type="button"
                  style={{
                    padding: '7px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: otpMode === 'login' ? 'var(--bg-card)' : 'transparent',
                    color: otpMode === 'login' ? 'var(--text-heading)' : 'var(--text-muted)',
                    boxShadow: otpMode === 'login' ? 'var(--shadow-sm)' : 'none'
                  }}
                  onClick={() => { setOtpMode('login'); clearState(); }}
                >
                  Sign In (Existing)
                </button>
                <button
                  type="button"
                  style={{
                    padding: '7px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: otpMode === 'register' ? 'var(--bg-card)' : 'transparent',
                    color: otpMode === 'register' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: otpMode === 'register' ? 'var(--shadow-sm)' : 'none'
                  }}
                  onClick={() => { setOtpMode('register'); clearState(); }}
                >
                  + Create Account (New)
                </button>
              </div>
            )}

            {!otpSent ? (
              /* STEP 1: ENTER PHONE & DETAILS */
              <form onSubmit={handleSendOtp}>
                {otpMode === 'register' && (
                  <>
                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label className="form-label" style={{ fontSize: '0.82rem' }}>Full Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Rajesh Kumar"
                        value={userName}
                        onChange={(e) => { setUserName(e.target.value); setError(''); }}
                        required
                        autoFocus
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label className="form-label" style={{ fontSize: '0.82rem' }}>I am registering as: *</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setOtpAccountType('customer')}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '8px',
                            border: `1px solid ${otpAccountType === 'customer' ? 'var(--primary)' : 'var(--border)'}`,
                            background: otpAccountType === 'customer' ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-surface)',
                            color: otpAccountType === 'customer' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <span style={{ fontSize: '1.2rem' }}>👤</span>
                          <span>Resident / Customer</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setOtpAccountType('shop_owner')}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '8px',
                            border: `1px solid ${otpAccountType === 'shop_owner' ? 'var(--primary)' : 'var(--border)'}`,
                            background: otpAccountType === 'shop_owner' ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-surface)',
                            color: otpAccountType === 'shop_owner' ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <span style={{ fontSize: '1.2rem' }}>🏪</span>
                          <span>Shop Owner</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', margin: 0 }}>Mobile Number *</label>
                    {phone.length > 0 && (
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: isValidPhone(phone) ? '#22c55e' : (phone.length === 10 ? '#ef4444' : '#f59e0b')
                      }}>
                        {isValidPhone(phone) ? '✓ Exact 10 digits' : (phone.length === 10 ? '⚠️ Must start with 6, 7, 8, 9' : `${phone.length}/10 digits`)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0 12px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: 'var(--text-main)'
                    }}>
                      🇮🇳 +91
                    </div>
                    <input
                      type="tel"
                      className="form-input"
                      style={{
                        flex: 1,
                        fontSize: '1rem',
                        letterSpacing: '1px',
                        borderColor: phone.length === 10 ? (isValidPhone(phone) ? '#22c55e' : '#ef4444') : undefined
                      }}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => { setPhone(cleanPhone(e.target.value)); setError(''); }}
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoFocus={otpMode === 'login'}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 800 }}
                  disabled={loading}
                >
                  {loading ? 'Checking & Sending OTP...' : otpMode === 'register' ? 'Register & Send OTP →' : 'Sign In with OTP →'}
                </button>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
                  {otpMode === 'login' ? (
                    <span>Don't have an account? <a href="#register" onClick={(e) => { e.preventDefault(); setOtpMode('register'); clearState(); }} style={{ color: 'var(--primary)', fontWeight: 700 }}>Create an account</a></span>
                  ) : (
                    <span>Already registered? <a href="#login" onClick={(e) => { e.preventDefault(); setOtpMode('login'); clearState(); }} style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign in here</a></span>
                  )}
                </div>
              </form>
            ) : (
              /* STEP 2: ENTER OTP CODE */
              <form onSubmit={handleVerifyOtp}>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {otpMode === 'register' ? `Creating ${otpAccountType === 'shop_owner' ? 'Shop Owner' : 'Customer'} account for` : 'Signing in with'}
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.95rem' }}>
                      {userName ? `${userName} (+91 ${phone})` : `+91 ${phone}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); setDevOtp(''); clearState(); }}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Change
                  </button>
                </div>

                {/* Dev OTP Helper in Local Testing Mode */}
                {devOtp && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px dashed rgba(34, 197, 94, 0.4)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>🔑 Local Dev OTP:</span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(devOtp)}
                      style={{
                        background: 'var(--primary)',
                        color: '#080911',
                        fontWeight: 800,
                        letterSpacing: '2px',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.88rem'
                      }}
                      title="Click to fill OTP code"
                    >
                      {devOtp} (Fill ⚡)
                    </button>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontSize: '0.84rem', textAlign: 'center', display: 'block' }}>
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    className="form-input"
                    style={{
                      textAlign: 'center',
                      fontSize: '1.6rem',
                      letterSpacing: '0.35em',
                      fontWeight: 800,
                      padding: '10px 14px'
                    }}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      setError('');
                    }}
                    maxLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}
                  disabled={loading || otpCode.length < 4}
                >
                  {loading ? 'Verifying Code...' : otpMode === 'register' ? 'Verify & Create Account 🚀' : 'Verify & Sign In 🚀'}
                </button>

                {/* Resend OTP Timer */}
                <div style={{ textAlign: 'center', fontSize: '0.82rem' }}>
                  {resendTimer > 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>
                      Resend code in <strong style={{ color: 'var(--primary)' }}>{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      🔄 Resend OTP Code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: EMAIL + PASSWORD AUTH                            */}
        {/* ======================================================== */}
        {authModalTab === 'email' && (
          <form onSubmit={handleEmailAuth}>
            {isRegisterMode && (
              <>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={regName}
                    onChange={(e) => { setRegName(e.target.value); setError(''); }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Account Type *</label>
                  <select
                    className="form-select"
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                  >
                    <option value="customer">Resident / Customer</option>
                    <option value="shop_owner">Shop Owner / Service Provider</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>Email Address *</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ fontSize: '0.82rem', marginBottom: 0 }}>Password *</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.76rem', cursor: 'pointer' }}
                >
                  {showPassword ? 'Hide 👁️' : 'Show 👁️'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 800, marginBottom: '14px' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : isRegisterMode ? 'Create Account →' : 'Sign In →'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {isRegisterMode ? (
                <span>
                  Already have an account?{' '}
                  <a
                    href="#signin"
                    onClick={(e) => { e.preventDefault(); setIsRegisterMode(false); clearState(); }}
                    style={{ color: 'var(--primary)', fontWeight: 700 }}
                  >
                    Sign In
                  </a>
                </span>
              ) : (
                <span>
                  Don't have an account?{' '}
                  <a
                    href="#signup"
                    onClick={(e) => { e.preventDefault(); setIsRegisterMode(true); clearState(); }}
                    style={{ color: 'var(--primary)', fontWeight: 700 }}
                  >
                    Register here
                  </a>
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
