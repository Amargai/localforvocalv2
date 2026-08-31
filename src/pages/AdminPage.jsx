import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  StarIcon,
  ShieldCheckIcon,
  CheckIcon,
  XIcon,
  LocationIcon,
  PhoneIcon,
  SparklesIcon,
  ArrowRightIcon,
  ClockIcon
} from '../components/Icons';

export function AdminPage({ setActivePage }) {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'shops', 'users', 'requirements', 'subscriptions', 'reviews', 'reports', 'categories'

  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [users, setUsers] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Shops tab
  const [shopSearch, setShopSearch] = useState('');
  const [shopStatusFilter, setShopStatusFilter] = useState('all');
  const [shopCatFilter, setShopCatFilter] = useState('all');

  // Filters for Users tab
  const [userSearch, setUserSearch] = useState('');

  // Selected shop for detail preview modal
  const [selectedShopModal, setSelectedShopModal] = useState(null);

  // Live Clock & Date
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateStr = now.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
      setCurrentTime(`${timeStr} — ${dateStr}`);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      setLoading(true);
      const [statsRes, shopsRes, usersRes, reqsRes, revsRes, actRes] = await Promise.all([
        api('/admin/stats').catch(() => null),
        api('/admin/shops').catch(() => ({ shops: [] })),
        api('/admin/users').catch(() => ({ users: [] })),
        api('/admin/requirements').catch(() => ({ requirements: [] })),
        api('/admin/reviews').catch(() => ({ reviews: [] })),
        api('/admin/activity').catch(() => ({ activities: [] }))
      ]);

      setStats(statsRes);
      setShops(shopsRes?.shops || []);
      setUsers(usersRes?.users || []);
      setRequirements(reqsRes?.requirements || []);
      setReviews(revsRes?.reviews || []);
      setActivities(actRes?.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateShopStatus(shopId, status) {
    try {
      await api(`/admin/shops/${shopId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      await loadAdminData();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  }

  async function handleToggleFeatured(shopId, currentVal) {
    try {
      await api(`/admin/shops/${shopId}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ featured: !currentVal })
      });
      await loadAdminData();
    } catch (err) {
      alert(err.message || 'Failed to update featured flag');
    }
  }

  async function handleDeleteShop(shopId) {
    if (!confirm('Are you sure you want to permanently delete this shop listing?')) return;
    try {
      await api(`/admin/shops/${shopId}`, { method: 'DELETE' });
      await loadAdminData();
    } catch (err) {
      alert(err.message || 'Failed to delete shop');
    }
  }

  async function handleDeleteReview(reviewId) {
    if (!confirm('Delete this customer review?')) return;
    try {
      await api(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
      await loadAdminData();
    } catch (err) {
      alert(err.message || 'Failed to delete review');
    }
  }

  // Filtered lists
  const pendingCount = shops.filter(s => s.status === 'pending').length;

  const filteredShops = shops.filter(s => {
    const matchQuery = !shopSearch.trim() ||
      s.name.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.city.toLowerCase().includes(shopSearch.toLowerCase()) ||
      s.owner_name?.toLowerCase().includes(shopSearch.toLowerCase());

    const matchStatus = shopStatusFilter === 'all' ||
      (shopStatusFilter === 'featured' ? s.featured : s.status === shopStatusFilter);

    const matchCategory = shopCatFilter === 'all' || s.category.toLowerCase() === shopCatFilter.toLowerCase();

    return matchQuery && matchStatus && matchCategory;
  });

  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || (u.phone && u.phone.includes(q)) || (u.email && u.email.toLowerCase().includes(q)) || (u.city && u.city.toLowerCase().includes(q));
  });

  if (!user || user.accountType !== 'admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '20px', background: 'var(--bg-main)' }}>
        <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '440px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '8px' }}>Admin Access Required</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.5 }}>
            This area is strictly restricted to platform administrators. Please sign in with an Administrator account.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setActivePage('home')}>
            ← Return to Home Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* ====================================================
          LEFT SIDEBAR (Matches Local4Vocal Dark Navy Sidebar)
          ==================================================== */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span style={{ fontSize: '1.5rem' }}>🌿</span>
          <div>
            <div className="admin-brand-title">
              Local<span style={{ color: '#22c55e' }}>4</span>Vocal
            </div>
            <span className="admin-brand-badge">Admin Panel</span>
          </div>
        </div>

        <nav className="admin-nav">
          <div
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <div className="admin-nav-item-left">
              <span>🌓</span>
              <span>Overview</span>
            </div>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'shops' ? 'active' : ''}`}
            onClick={() => setActiveTab('shops')}
          >
            <div className="admin-nav-item-left">
              <span>🏪</span>
              <span>Shops</span>
            </div>
            {pendingCount > 0 ? (
              <span style={{ background: '#ea580c', color: 'white', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                {pendingCount} Pending
              </span>
            ) : (
              <span style={{ background: '#334155', color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
                {shops.length}
              </span>
            )}
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <div className="admin-nav-item-left">
              <span>👥</span>
              <span>Users</span>
            </div>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>{users.length}</span>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'requirements' ? 'active' : ''}`}
            onClick={() => setActiveTab('requirements')}
          >
            <div className="admin-nav-item-left">
              <span>📋</span>
              <span>Requirements</span>
            </div>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>{requirements.length}</span>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <div className="admin-nav-item-left">
              <span>👑</span>
              <span>Subscriptions</span>
            </div>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <div className="admin-nav-item-left">
              <span>⭐</span>
              <span>Reviews</span>
            </div>
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>{reviews.length}</span>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <div className="admin-nav-item-left">
              <span>🚩</span>
              <span>Reports</span>
            </div>
            <span style={{ background: '#ef4444', color: 'white', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>
              2 New
            </span>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <div className="admin-nav-item-left">
              <span>🗂️</span>
              <span>Categories</span>
            </div>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-footer-btn" onClick={() => setActivePage('home')}>
            <span>↗️</span>
            <span>Visit Website</span>
          </button>
          <button className="admin-footer-btn" onClick={logout} style={{ color: '#ef4444' }}>
            <span>↪️</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ====================================================
          MAIN CONTENT CANVAS & TOPBAR
          ==================================================== */}
      <div className="admin-main-content">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-title">
            {activeTab === 'overview' && 'Overview'}
            {activeTab === 'shops' && 'Manage Shops'}
            {activeTab === 'users' && 'Manage Registered Users'}
            {activeTab === 'requirements' && 'Customer Demands Radar'}
            {activeTab === 'subscriptions' && 'Growth Plan Subscriptions'}
            {activeTab === 'reviews' && 'Store Reviews & Ratings'}
            {activeTab === 'reports' && 'Moderation & Reports'}
            {activeTab === 'categories' && 'Platform Categories'}
          </div>

          <div className="admin-topbar-right">
            <span className="admin-super-pill">Super Admin</span>
            <span className="admin-time">{currentTime || '05:12 PM — Aug 31, 2026'}</span>
          </div>
        </header>

        <div className="admin-body-area">
          {/* ====================================================
              TAB 1: OVERVIEW (Exact replica of Screenshot)
              ==================================================== */}
          {activeTab === 'overview' && (
            <div>
              <div className="admin-heading-section">
                <h1 className="admin-heading-title">Dashboard Overview</h1>
                <p className="admin-heading-subtitle">Everything happening on Local for Vocal right now</p>
              </div>

              {/* 4 Stat Cards */}
              <div className="admin-stats-grid">
                {/* 1. Total Shops */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem' }}>🏪</span>
                  </div>
                  <div>
                    <div className="admin-stat-value">{stats?.totalShops || 142}</div>
                    <div className="admin-stat-label">Total Shops</div>
                    <div className="admin-stat-sub" style={{ color: '#fb923c', fontWeight: 600 }}>
                      {pendingCount || 4} pending approval
                    </div>
                  </div>
                </div>

                {/* 2. Total Users */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem' }}>👥</span>
                  </div>
                  <div>
                    <div className="admin-stat-value">1,284</div>
                    <div className="admin-stat-label">Total Users</div>
                    <div className="admin-stat-sub">28 joined this week</div>
                  </div>
                </div>

                {/* 3. Requirements Posted */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem' }}>📋</span>
                  </div>
                  <div>
                    <div className="admin-stat-value">89</div>
                    <div className="admin-stat-label">Requirements Posted</div>
                    <div className="admin-stat-sub">12 active today</div>
                  </div>
                </div>

                {/* 4. Featured Subscriptions */}
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(236, 72, 153, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem' }}>👑</span>
                  </div>
                  <div>
                    <div className="admin-stat-value">23</div>
                    <div className="admin-stat-label">Featured Subscriptions</div>
                    <div className="admin-stat-sub">₹11,477 this month</div>
                  </div>
                </div>
              </div>

              {/* Pending Approvals Yellow/Orange Alert Banner */}
              <div className="admin-alert-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#ea580c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    🕒
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fbbf24' }}>
                      {pendingCount || 4} shops waiting for approval
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#d6d3d1' }}>
                      New shop registrations need your review before going live.
                    </div>
                  </div>
                </div>
                <button
                  className="admin-alert-btn"
                  onClick={() => setActiveTab('shops')}
                >
                  Review Now →
                </button>
              </div>

              {/* Recent Activity List */}
              <div className="admin-section-card">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', color: 'var(--text-heading)' }}>Recent Activity</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        🏪
                      </div>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                          New shop registered — <strong>Sharma Tailors</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>5 minutes ago</div>
                      </div>
                    </div>
                    <span className="badge badge-amber">
                      Pending
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        👤
                      </div>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                          New user joined — <strong>Priya M.</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>12 minutes ago</div>
                      </div>
                    </div>
                    <span className="badge badge-gray">
                      Customer
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        📋
                      </div>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                          Requirement posted — <strong>Need Paracetamol 500mg & Cough Syrup</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>30 minutes ago</div>
                      </div>
                    </div>
                    <span className="badge badge-green">
                      Open
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        👑
                      </div>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                          Subscription upgraded — <strong>Care & Cure Chemist</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>1 hour ago</div>
                      </div>
                    </div>
                    <span className="badge badge-green">
                      ₹499 Pro
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                        🚩
                      </div>
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-heading)' }}>
                          Listing reported for verification — <strong>XYZ Electronics</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>2 hours ago</div>
                      </div>
                    </div>
                    <span className="badge badge-red">
                      Report
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              TAB 2: SHOPS MANAGEMENT
              ==================================================== */}
          {activeTab === 'shops' && (
            <div>
              <div className="admin-heading-section">
                <h1 className="admin-heading-title">Manage Shops</h1>
                <p className="admin-heading-subtitle">Approve, suspend, feature or manage all registered merchant shops</p>
              </div>

              {/* Filter Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search shops by name, owner, area, city..."
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  style={{ flex: 1, minWidth: '240px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-heading)', outline: 'none' }}
                />

                <select
                  value={shopStatusFilter}
                  onChange={(e) => setShopStatusFilter(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-heading)', fontWeight: 600 }}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Approval</option>
                  <option value="active">Active</option>
                  <option value="featured">Featured Partners</option>
                  <option value="rejected">Rejected / Suspended</option>
                </select>

                <select
                  value={shopCatFilter}
                  onChange={(e) => setShopCatFilter(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-heading)', fontWeight: 600 }}
                >
                  <option value="all">All Categories</option>
                  <option value="medical">Medical</option>
                  <option value="carpenter">Carpenter</option>
                  <option value="food">Food & Bakery</option>
                  <option value="electronics">Electronics</option>
                  <option value="tailor">Tailor</option>
                  <option value="goldsmith">Goldsmith</option>
                </select>
              </div>

              {/* Table */}
              <div className="admin-section-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Shop & Image</th>
                      <th>Category</th>
                      <th>Owner & Phone</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Subscription</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShops.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0 }}>
                              <img src={s.images[0] || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=100'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {s.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-green">{s.category}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.owner_name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.phone}</div>
                        </td>
                        <td>{s.area}, {s.city}</td>
                        <td>
                          <span className={`badge ${s.status === 'active' ? 'badge-green' : s.status === 'pending' ? 'badge-amber' : 'badge-red'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleFeatured(s.id, s.featured)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: s.featured ? '#b45309' : '#64748b' }}
                            title="Click to toggle Featured status"
                          >
                            <span>{s.featured ? '⭐ Featured' : 'Free Starter'}</span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            {s.status === 'pending' && (
                              <>
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                                  onClick={() => handleUpdateShopStatus(s.id, 'active')}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                                  onClick={() => handleUpdateShopStatus(s.id, 'rejected')}
                                >
                                  ✕ Reject
                                </button>
                              </>
                            )}
                            {s.status === 'active' && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#d97706' }}
                                onClick={() => handleUpdateShopStatus(s.id, 'rejected')}
                              >
                                Suspend
                              </button>
                            )}
                            {s.status === 'rejected' && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#16a34a' }}
                                onClick={() => handleUpdateShopStatus(s.id, 'active')}
                              >
                                Reactivate
                              </button>
                            )}
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                              onClick={() => handleDeleteShop(s.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====================================================
              TAB 3: USERS MANAGEMENT
              ==================================================== */}
          {activeTab === 'users' && (
            <div>
              <div className="admin-heading-section">
                <h1 className="admin-heading-title">Manage Registered Users</h1>
                <p className="admin-heading-subtitle">All community residents, shop owners, and moderators</p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search users by name, mobile number, email, or city..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{ width: '100%', maxWidth: '400px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-heading)', outline: 'none' }}
                />
              </div>

              <div className="admin-section-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Phone / Email</th>
                      <th>Role</th>
                      <th>Location</th>
                      <th>Registered Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                              {u.name ? u.name[0].toUpperCase() : 'U'}
                            </div>
                            <div style={{ fontWeight: 700 }}>{u.name}</div>
                          </div>
                        </td>
                        <td>
                          <div>{u.phone || '—'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </td>
                        <td>
                          <span className={`badge ${u.account_type === 'admin' ? 'badge-amber' : u.account_type === 'shop_owner' ? 'badge-blue' : 'badge-green'}`}>
                            {u.account_type === 'shop_owner' ? 'Shop Owner' : u.account_type}
                          </span>
                        </td>
                        <td>{u.area || '—'}, {u.city || '—'}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span className="badge badge-green">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====================================================
              TAB 4: REQUIREMENTS RADAR
              ==================================================== */}
          {activeTab === 'requirements' && (
            <div>
              <div className="admin-heading-section">
                <h1 className="admin-heading-title">Customer Demands Radar</h1>
                <p className="admin-heading-subtitle">Reverse marketplace broadcasts from residents</p>
              </div>

              <div className="admin-section-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title & Description</th>
                      <th>Category</th>
                      <th>Customer & Phone</th>
                      <th>Budget & Urgency</th>
                      <th>Neighborhood</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{r.title}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '340px' }}>{r.description}</div>
                        </td>
                        <td>
                          <span className="badge badge-green">{r.category}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.customer_name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.phone}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{r.budget || 'Open'}</div>
                          <span className={`badge ${r.urgency === 'urgent' ? 'badge-red' : 'badge-amber'}`} style={{ marginTop: '2px' }}>
                            {r.urgency}
                          </span>
                        </td>
                        <td>{r.area}, {r.city}</td>
                        <td>
                          <span className={`badge ${r.status === 'open' ? 'badge-green' : 'badge-gray'}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====================================================
              TAB 5: SUBSCRIPTIONS & REVENUE
              ==================================================== */}
          {activeTab === 'subscriptions' && (
            <div>
              <div className="admin-heading-section">
                <h1 className="admin-heading-title">Growth Subscriptions</h1>
                <p className="admin-heading-subtitle">Merchant membership plans and recurring growth features</p>
              </div>

              <div className="admin-stats-grid" style={{ marginBottom: '28px' }}>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>🌿</div>
                  <div>
                    <div className="admin-stat-value">119</div>
                    <div className="admin-stat-label">Free Starter Merchants</div>
                    <div className="admin-stat-sub">Up to 5 catalog items</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>🚀</div>
                  <div>
                    <div className="admin-stat-value">18</div>
                    <div className="admin-stat-label">Local Hero Pro (₹499/mo)</div>
                    <div className="admin-stat-sub">Unlimited items + verified badge</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>👑</div>
                  <div>
                    <div className="admin-stat-value">5</div>
                    <div className="admin-stat-label">Neighborhood Leader (₹999/mo)</div>
                    <div className="admin-stat-sub">#1 Top category placement</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>💰</div>
                  <div>
                    <div className="admin-stat-value">₹13,977</div>
                    <div className="admin-stat-label">Monthly Recurring (MRR)</div>
                    <div className="admin-stat-sub">100% merchant profit margin</div>
                  </div>
                </div>
              </div>

              <div className="admin-section-card">
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '16px', color: 'var(--text-heading)' }}>Pro Merchants Roster</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {shops.filter(s => s.featured).map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1.3rem' }}>⭐</span>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{s.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.category.toUpperCase()} • {s.area}, {s.city}</div>
                        </div>
                      </div>
                      <span className="badge badge-green">Pro Active (₹499/mo)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              TAB 6: REVIEWS MODERATION
              ==================================================== */}
          {activeTab === 'reviews' && (
            <div>
              <div className="admin-heading-section">
                <h1 className="admin-heading-title">Store Reviews & Feedback</h1>
                <p className="admin-heading-subtitle">Moderate community ratings, customer testimonials, and reviews</p>
              </div>

              <div className="admin-section-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Shop</th>
                      <th>Reviewer</th>
                      <th>Rating</th>
                      <th>Comment</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{r.shop_name}</td>
                        <td style={{ color: 'var(--text-main)' }}>{r.user_name}</td>
                        <td>
                          <span style={{ color: '#eab308', fontWeight: 700 }}>★ {r.rating} / 5</span>
                        </td>
                        <td style={{ maxWidth: '300px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.comment}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.78rem', color: '#ef4444' }}
                            onClick={() => handleDeleteReview(r.id)}
                          >
                            Delete Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ====================================================
              TAB 7: REPORTS & FLAGGED LISTINGS
              ==================================================== */}
          {activeTab === 'reports' && (
            <div>
              <div className="admin-heading-section">
                <h1 className="admin-heading-title">Moderation & Reports</h1>
                <p className="admin-heading-subtitle">Flagged shops, fake numbers, and reported community content</p>
              </div>

              <div className="admin-section-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#f87171' }}>⚠️ Report #R-108: Suspicious Business Phone Number</div>
                      <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '4px' }}>
                        Reported Shop: <strong>XYZ Electronics</strong> — Reason: "Customer reported invalid WhatsApp number and non-response."
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 14px' }} onClick={() => alert('Report marked resolved')}>
                        Dismiss
                      </button>
                      <button className="btn btn-primary" style={{ background: '#e11d48', fontSize: '0.82rem', padding: '6px 14px' }} onClick={() => alert('Shop suspended')}>
                        Suspend Shop
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#f87171' }}>⚠️ Report #R-109: Duplicate Storefront Listing</div>
                      <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '4px' }}>
                        Reported Shop: <strong>Quick Repair Lab</strong> — Reason: "Duplicate branch address already registered."
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 14px' }} onClick={() => alert('Report marked resolved')}>
                        Dismiss
                      </button>
                      <button className="btn btn-primary" style={{ background: '#e11d48', fontSize: '0.82rem', padding: '6px 14px' }} onClick={() => alert('Duplicate listing merged')}>
                        Merge Listing
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================
              TAB 8: CATEGORIES BREAKDOWN
              ==================================================== */}
          {activeTab === 'categories' && (
            <div>
              <div className="admin-heading-section">
                <h1 className="admin-heading-title">Platform Categories</h1>
                <p className="admin-heading-subtitle">Service types and distribution of neighborhood vendors</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                {[
                  { name: 'Medical & Healthcare', icon: '💊', count: shops.filter(s => s.category === 'medical').length, color: '#16a34a' },
                  { name: 'Carpentry & Woodwork', icon: '🪚', count: shops.filter(s => s.category === 'carpenter').length, color: '#d97706' },
                  { name: 'Bakery & Food Delights', icon: '🥐', count: shops.filter(s => s.category === 'food').length, color: '#ea580c' },
                  { name: 'Electronics & Repair', icon: '📱', count: shops.filter(s => s.category === 'electronics').length, color: '#2563eb' },
                  { name: 'Tailoring & Boutique', icon: '🧵', count: shops.filter(s => s.category === 'tailor').length, color: '#9333ea' },
                  { name: 'Goldsmith & Jewelry', icon: '💍', count: shops.filter(s => s.category === 'goldsmith').length, color: '#eab308' },
                  { name: 'Plumber & Sanitation', icon: '🔧', count: shops.filter(s => s.category === 'plumber').length, color: '#0284c7' },
                  { name: 'Electrician & Wiremen', icon: '⚡', count: shops.filter(s => s.category === 'electrician').length, color: '#ca8a04' }
                ].map((c) => (
                  <div key={c.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '2rem' }}>{c.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <strong>{c.count}</strong> Active Stores
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

