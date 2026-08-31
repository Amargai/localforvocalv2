import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlusIcon, UserIcon, ShieldCheckIcon, SparklesIcon } from './Icons';

export function Navbar({ activePage, setActivePage }) {
  const { user, openAuthModal, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="navbar-wrapper">
      <div className="container">
        <nav className="navbar">
          <div className="nav-brand" style={{ cursor: 'pointer' }} onClick={() => { setActivePage('home'); setMobileMenuOpen(false); }}>
            <span style={{ fontSize: '1.25rem' }}>🌿</span>
            <span>Local<span style={{ color: 'var(--primary)' }}>4</span>Vocal</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="nav-links">
            <button
              className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
              onClick={() => setActivePage('home')}
            >
              Home
            </button>
            <button
              className={`nav-link ${activePage === 'explore' ? 'active' : ''}`}
              onClick={() => setActivePage('explore')}
            >
              Explore
            </button>
            <button
              className={`nav-link ${activePage === 'offers' ? 'active' : ''}`}
              onClick={() => setActivePage('offers')}
            >
              🔥 Deals & Offers
            </button>
            <button
              className={`nav-link ${activePage === 'requirements' ? 'active' : ''}`}
              onClick={() => setActivePage('requirements')}
            >
              📢 Post Demand
            </button>
            <button
              className={`nav-link ${activePage === 'plans' ? 'active' : ''}`}
              onClick={() => setActivePage('plans')}
            >
              Plans
            </button>

            {user?.accountType === 'shop_owner' && (
              <button
                className={`nav-link ${activePage === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActivePage('dashboard')}
              >
                🏪 My Dashboard
              </button>
            )}

            {user?.accountType === 'admin' && (
              <button
                className={`nav-link ${activePage === 'admin' ? 'active' : ''}`}
                onClick={() => setActivePage('admin')}
              >
                🛡️ Admin
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
              onClick={() => {
                if (!user) openAuthModal('demo');
                else setActivePage('register-shop');
              }}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden-mobile">List Shop</span>
            </button>

            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>{user.name.split(' ')[0]}</span>
                  <span className={`badge ${user.accountType === 'admin' ? 'badge-amber' : user.accountType === 'shop_owner' ? 'badge-blue' : 'badge-green'}`} style={{ marginLeft: 2 }}>
                    {user.accountType === 'shop_owner' ? 'Owner' : user.accountType}
                  </span>
                </button>

                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-xl)',
                    minWidth: '220px',
                    padding: '8px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{user.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{user.phone || user.email}</div>
                    </div>

                    <button
                      style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '0.88rem' }}
                      onClick={() => { setActivePage('profile'); setDropdownOpen(false); }}
                    >
                      👤 My Profile & Demands
                    </button>

                    {user.accountType === 'shop_owner' && (
                      <button
                        style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '0.88rem' }}
                        onClick={() => { setActivePage('dashboard'); setDropdownOpen(false); }}
                      >
                        🏪 Shop Owner Dashboard
                      </button>
                    )}

                    {user.accountType === 'admin' && (
                      <button
                        style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '0.88rem' }}
                        onClick={() => { setActivePage('admin'); setDropdownOpen(false); }}
                      >
                        🛡️ Admin Moderation
                      </button>
                    )}

                    <button
                      style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '6px', fontSize: '0.88rem', color: '#ef4444', borderTop: '1px solid #f1f5f9' }}
                      onClick={() => { logout(); setDropdownOpen(false); }}
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                onClick={() => openAuthModal('demo')}
              >
                Sign In
              </button>
            )}

            {/* Mobile Hamburger Menu Button */}
            <button
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                background: mobileMenuOpen ? 'var(--primary)' : 'var(--bg-surface)',
                color: mobileMenuOpen ? '#080911' : 'var(--text-heading)',
                border: mobileMenuOpen ? '1px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: '10px',
                width: '40px',
                height: '40px',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                marginLeft: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: mobileMenuOpen ? '0 0 15px rgba(34, 197, 94, 0.4)' : 'none'
              }}
              title="Toggle Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div style={{
            background: 'rgba(19, 20, 36, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            margin: '8px 0 16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            animation: 'slideUp 0.2s ease-out'
          }}>
            {/* Mobile User Profile Pill */}
            {user ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#080911',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem'
                  }}>
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-heading)' }}>{user.name}</div>
                    <span className={`badge ${user.accountType === 'admin' ? 'badge-amber' : user.accountType === 'shop_owner' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {user.accountType === 'shop_owner' ? 'Shop Owner' : user.accountType}
                    </span>
                  </div>
                </div>

                <button
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'transparent', padding: '4px 8px' }}
                  onClick={() => { setActivePage('profile'); setMobileMenuOpen(false); }}
                >
                  Profile →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
                  onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }}
                >
                  Sign In
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
                  onClick={() => { openAuthModal('demo'); setMobileMenuOpen(false); }}
                >
                  Demo Accounts
                </button>
              </div>
            )}

            {/* Mobile Nav Links */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 14px',
                borderRadius: '8px',
                fontSize: '0.92rem',
                fontWeight: 600,
                textAlign: 'left',
                background: activePage === 'home' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                color: activePage === 'home' ? 'var(--primary)' : 'var(--text-main)',
                borderLeft: activePage === 'home' ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'all 0.15s'
              }}
              onClick={() => { setActivePage('home'); setMobileMenuOpen(false); }}
            >
              <span>🏠</span> <span>Home</span>
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 14px',
                borderRadius: '8px',
                fontSize: '0.92rem',
                fontWeight: 600,
                textAlign: 'left',
                background: activePage === 'explore' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                color: activePage === 'explore' ? 'var(--primary)' : 'var(--text-main)',
                borderLeft: activePage === 'explore' ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'all 0.15s'
              }}
              onClick={() => { setActivePage('explore'); setMobileMenuOpen(false); }}
            >
              <span>🔍</span> <span>Explore Businesses</span>
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 14px',
                borderRadius: '8px',
                fontSize: '0.92rem',
                fontWeight: 600,
                textAlign: 'left',
                background: activePage === 'offers' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                color: activePage === 'offers' ? 'var(--primary)' : 'var(--text-main)',
                borderLeft: activePage === 'offers' ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'all 0.15s'
              }}
              onClick={() => { setActivePage('offers'); setMobileMenuOpen(false); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🔥</span> <span>Deals & Offers</span>
              </div>
              <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>Hot</span>
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 14px',
                borderRadius: '8px',
                fontSize: '0.92rem',
                fontWeight: 600,
                textAlign: 'left',
                background: activePage === 'requirements' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                color: activePage === 'requirements' ? 'var(--primary)' : 'var(--text-main)',
                borderLeft: activePage === 'requirements' ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'all 0.15s'
              }}
              onClick={() => { setActivePage('requirements'); setMobileMenuOpen(false); }}
            >
              <span>📢</span> <span>Post Demand</span>
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 14px',
                borderRadius: '8px',
                fontSize: '0.92rem',
                fontWeight: 600,
                textAlign: 'left',
                background: activePage === 'plans' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                color: activePage === 'plans' ? 'var(--primary)' : 'var(--text-main)',
                borderLeft: activePage === 'plans' ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'all 0.15s'
              }}
              onClick={() => { setActivePage('plans'); setMobileMenuOpen(false); }}
            >
              <span>👑</span> <span>Growth Plans</span>
            </button>

            {user?.accountType === 'shop_owner' && (
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  background: activePage === 'dashboard' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: '#60a5fa',
                  borderLeft: activePage === 'dashboard' ? '3px solid #60a5fa' : '3px solid transparent',
                  transition: 'all 0.15s'
                }}
                onClick={() => { setActivePage('dashboard'); setMobileMenuOpen(false); }}
              >
                <span>🏪</span> <span>Shop Owner Dashboard</span>
              </button>
            )}

            {user?.accountType === 'admin' && (
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  textAlign: 'left',
                  background: activePage === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  color: '#fbbf24',
                  borderLeft: activePage === 'admin' ? '3px solid #fbbf24' : '3px solid transparent',
                  transition: 'all 0.15s'
                }}
                onClick={() => { setActivePage('admin'); setMobileMenuOpen(false); }}
              >
                <span>🛡️</span> <span>Platform Admin Panel</span>
              </button>
            )}

            {/* Mobile Actions Footer */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (!user) openAuthModal('demo');
                  else setActivePage('register-shop');
                }}
              >
                <PlusIcon className="w-4 h-4" />
                <span>List Your Shop</span>
              </button>

              {user && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#ef4444' }}
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                >
                  🚪 Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
