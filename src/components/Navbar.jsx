import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  PlusIcon, 
  UserIcon, 
  ShieldCheckIcon, 
  SparklesIcon, 
  ChevronDownIcon, 
  ChevronRightIcon, 
  LogoutIcon, 
  StoreIcon, 
  DocumentTextIcon 
} from './Icons';

export function Navbar({ activePage, setActivePage }) {
  const { user, shop, openAuthModal, logout, switchMode } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

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

            {(user?.accountType === 'shop_owner' || shop) && (
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
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                {/* Modern Luxury Profile Trigger Button */}
                <button
                  className={`profile-trigger-btn ${dropdownOpen ? 'active' : ''}`}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  title="Account settings & profile"
                >
                  <div className="profile-trigger-avatar">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      {(user?.name || 'User').split(' ')[0]}
                    </span>
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      color: user?.accountType === 'admin' ? '#fbbf24' : user?.accountType === 'shop_owner' ? '#60a5fa' : '#4ade80'
                    }}>
                      {user?.accountType === 'admin' ? '🛡️ Admin' : user?.accountType === 'shop_owner' ? '🏪 Owner' : '🌿 Shopper'}
                    </span>
                  </div>
                  <ChevronDownIcon className={`profile-trigger-chevron ${dropdownOpen ? 'rotated' : ''}`} size={14} />
                </button>

                {/* Ultra Sleek Floating Profile Dropdown Popup */}
                {dropdownOpen && (
                  <div className="profile-dropdown-popup" role="menu">
                    {/* Header Card */}
                    <div className="profile-popup-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="profile-header-avatar-large">
                          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          <span className="profile-header-online-dot" title="Active Session" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.94rem',
                              color: 'var(--text-heading)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '145px'
                            }}>
                              {user.name}
                            </span>
                            <span className={`badge ${
                              user.accountType === 'admin' 
                                ? 'badge-amber' 
                                : user.accountType === 'shop_owner' 
                                ? 'badge-blue' 
                                : 'badge-green'
                            }`} style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
                              {user.accountType === 'shop_owner' ? 'Shop Owner' : user.accountType === 'admin' ? 'Admin' : 'Shopper'}
                            </span>
                          </div>
                          <div style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.74rem',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {user.email || user.phone || 'Local Community Member'}
                          </div>
                        </div>
                      </div>

                      {/* Associated Shop Banner (if user owns a shop) */}
                      {shop && (
                        <div style={{
                          marginTop: '10px',
                          padding: '7px 10px',
                          background: 'rgba(59, 130, 246, 0.12)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#93c5fd', fontWeight: 600, minWidth: 0 }}>
                            <span>🏪</span>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                              {shop.name}
                            </span>
                          </div>
                          <button
                            style={{ color: '#60a5fa', fontWeight: 700, fontSize: '0.72rem', background: 'transparent' }}
                            onClick={() => { setActivePage('dashboard'); setDropdownOpen(false); }}
                          >
                            Dashboard →
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Single-User Mode Switcher (If user owns a shop, toggle Rajesh between Shopper & Merchant mode) */}
                    {shop ? (
                      <div style={{ padding: '0 2px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span className="profile-menu-section-label" style={{ padding: '2px 6px' }}>Active Account View</span>
                        </div>
                        <div className="profile-demo-switch-bar">
                          <button
                            className={`profile-demo-role-btn ${user.accountType === 'customer' ? 'active role-customer' : ''}`}
                            onClick={async () => {
                              await switchMode('customer');
                            }}
                            title="Browse and post requirements as a Shopper"
                          >
                            🌿 Shopper Mode
                          </button>
                          <button
                            className={`profile-demo-role-btn ${user.accountType === 'shop_owner' ? 'active role-owner' : ''}`}
                            onClick={async () => {
                              await switchMode('shop_owner');
                            }}
                            title="Manage catalogue, deals and inquiries as Shop Owner"
                          >
                            🏪 Merchant Mode
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        margin: '4px 2px 6px',
                        padding: '10px 12px',
                        background: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-heading)' }}>🏪 Sell on Local4Vocal</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>List your business & receive leads</span>
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                          onClick={() => { setActivePage('register-shop'); setDropdownOpen(false); }}
                        >
                          + List Shop
                        </button>
                      </div>
                    )}

                    <div className="profile-popup-divider" />

                    {/* Navigation Menu List */}
                    <div className="profile-menu-list">
                      <button
                        className="profile-menu-item"
                        onClick={() => { setActivePage('profile'); setDropdownOpen(false); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                          <div className="profile-item-icon-box green">
                            <UserIcon size={16} />
                          </div>
                          <div className="profile-item-text">
                            <span className="profile-item-title">My Profile & Demands</span>
                            <span className="profile-item-subtitle">Manage inquiries & replies</span>
                          </div>
                        </div>
                        <ChevronRightIcon className="profile-item-chevron" size={14} />
                      </button>

                      {(user.accountType === 'shop_owner' || shop) && (
                        <button
                          className="profile-menu-item"
                          onClick={() => { setActivePage('dashboard'); setDropdownOpen(false); }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                            <div className="profile-item-icon-box blue">
                              <StoreIcon size={16} />
                            </div>
                            <div className="profile-item-text">
                              <span className="profile-item-title">Shop Dashboard</span>
                              <span className="profile-item-subtitle">Catalog, deals & inquiries</span>
                            </div>
                          </div>
                          <ChevronRightIcon className="profile-item-chevron" size={14} />
                        </button>
                      )}

                      {user.accountType === 'admin' && (
                        <button
                          className="profile-menu-item"
                          onClick={() => { setActivePage('admin'); setDropdownOpen(false); }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                            <div className="profile-item-icon-box amber">
                              <ShieldCheckIcon size={16} />
                            </div>
                            <div className="profile-item-text">
                              <span className="profile-item-title">Admin Moderation</span>
                              <span className="profile-item-subtitle">Verify shops & audit logs</span>
                            </div>
                          </div>
                          <ChevronRightIcon className="profile-item-chevron" size={14} />
                        </button>
                      )}

                      <button
                        className="profile-menu-item"
                        onClick={() => { setActivePage('requirements'); setDropdownOpen(false); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                          <div className="profile-item-icon-box green">
                            <DocumentTextIcon size={16} />
                          </div>
                          <div className="profile-item-text">
                            <span className="profile-item-title">Post New Demand</span>
                            <span className="profile-item-subtitle">Get quotes from local shops</span>
                          </div>
                        </div>
                        <ChevronRightIcon className="profile-item-chevron" size={14} />
                      </button>

                      <button
                        className="profile-menu-item"
                        onClick={() => { setActivePage('plans'); setDropdownOpen(false); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                          <div className="profile-item-icon-box purple">
                            <SparklesIcon size={16} />
                          </div>
                          <div className="profile-item-text">
                            <span className="profile-item-title">
                              Growth Plans
                              <span className="badge badge-amber" style={{ fontSize: '0.6rem', padding: '0 5px', height: '16px' }}>Pro</span>
                            </span>
                            <span className="profile-item-subtitle">Boost business reach</span>
                          </div>
                        </div>
                        <ChevronRightIcon className="profile-item-chevron" size={14} />
                      </button>

                      <div className="profile-popup-divider" />

                      {/* Sign Out Button */}
                      <button
                        className="profile-menu-item profile-menu-danger"
                        onClick={() => { logout(); setDropdownOpen(false); }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                          <div className="profile-item-icon-box red">
                            <LogoutIcon size={16} />
                          </div>
                          <div className="profile-item-text">
                            <span className="profile-item-title" style={{ color: '#f87171' }}>Sign Out</span>
                            <span className="profile-item-subtitle">Log out of your session safely</span>
                          </div>
                        </div>
                        <ChevronRightIcon className="profile-item-chevron" size={14} />
                      </button>
                    </div>
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
            {/* Mobile User Profile Card */}
            {user ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(19, 20, 36, 0.8) 100%)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                padding: '14px',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.35)'
                    }}>
                      {user.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-heading)' }}>{user.name}</div>
                      <span className={`badge ${user.accountType === 'admin' ? 'badge-amber' : user.accountType === 'shop_owner' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {user.accountType === 'shop_owner' ? 'Shop Owner' : user.accountType === 'admin' ? 'Admin' : 'Shopper'}
                      </span>
                    </div>
                  </div>

                  <button
                    style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, background: 'rgba(34, 197, 94, 0.12)', padding: '6px 10px', borderRadius: '8px' }}
                    onClick={() => { setActivePage('profile'); setMobileMenuOpen(false); }}
                  >
                    Profile →
                  </button>
                </div>

                {/* Mobile Mode Switcher for Shop Owners */}
                {shop && (
                  <div className="profile-demo-switch-bar" style={{ margin: 0 }}>
                    <button
                      className={`profile-demo-role-btn ${user.accountType === 'customer' ? 'active role-customer' : ''}`}
                      onClick={() => switchMode('customer')}
                    >
                      🌿 Shopper
                    </button>
                    <button
                      className={`profile-demo-role-btn ${user.accountType === 'shop_owner' ? 'active role-owner' : ''}`}
                      onClick={() => switchMode('shop_owner')}
                    >
                      🏪 Merchant
                    </button>
                  </div>
                )}
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

            {(user?.accountType === 'shop_owner' || shop) && (
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
