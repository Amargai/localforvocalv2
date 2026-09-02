import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoryContext';
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
  const { rawCategories, refreshCategories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'shops', 'users', 'requirements', 'subscriptions', 'reviews', 'reports', 'categories'

  const [stats, setStats] = useState(null);
  const [shops, setShops] = useState([]);
  const [users, setUsers] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [activities, setActivities] = useState([]);
  const [adminCategories, setAdminCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Shops tab
  const [shopSearch, setShopSearch] = useState('');
  const [shopStatusFilter, setShopStatusFilter] = useState('all');
  const [shopCatFilter, setShopCatFilter] = useState('all');

  // Filters for Users tab
  const [userSearch, setUserSearch] = useState('');

  // Category Tab State & Modals
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'active', 'with_shops'
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState('add'); // 'add', 'edit'
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    name: '',
    icon: '🏷️',
    color: '#10b981',
    description: '',
    subCategories: [],
    suggestedTags: [],
    isActive: true
  });
  const [subCatInput, setSubCatInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

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
      const [statsRes, shopsRes, usersRes, reqsRes, revsRes, actRes, catsRes] = await Promise.all([
        api('/admin/stats').catch(() => null),
        api('/admin/shops').catch(() => ({ shops: [] })),
        api('/admin/users').catch(() => ({ users: [] })),
        api('/admin/requirements').catch(() => ({ requirements: [] })),
        api('/admin/reviews').catch(() => ({ reviews: [] })),
        api('/admin/activity').catch(() => ({ activities: [] })),
        api('/admin/categories').catch(() => ({ categories: [] }))
      ]);

      setStats(statsRes);
      setShops(shopsRes?.shops || []);
      setUsers(usersRes?.users || []);
      setRequirements(reqsRes?.requirements || []);
      setReviews(revsRes?.reviews || []);
      setActivities(actRes?.activities || []);
      setAdminCategories(catsRes?.categories || []);
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

  // Category Modal Handlers
  function openAddCategoryModal() {
    setCategoryModalMode('add');
    setCategoryForm({
      id: '',
      name: '',
      icon: '🏷️',
      color: '#10b981',
      description: '',
      subCategories: [],
      suggestedTags: [],
      isActive: true
    });
    setSubCatInput('');
    setTagInput('');
    setCategoryError('');
    setIsCategoryModalOpen(true);
  }

  function openEditCategoryModal(cat) {
    setCategoryModalMode('edit');
    setCategoryForm({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || '🏷️',
      color: cat.color || '#10b981',
      description: cat.description || cat.desc || '',
      subCategories: Array.isArray(cat.subCategories) ? [...cat.subCategories] : [],
      suggestedTags: Array.isArray(cat.suggestedTags) ? [...cat.suggestedTags] : [],
      isActive: cat.isActive ?? true
    });
    setSubCatInput('');
    setTagInput('');
    setCategoryError('');
    setIsCategoryModalOpen(true);
  }

  function handleNameChange(nameVal) {
    if (categoryModalMode === 'add') {
      const slug = nameVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setCategoryForm(prev => ({ ...prev, name: nameVal, id: slug }));
    } else {
      setCategoryForm(prev => ({ ...prev, name: nameVal }));
    }
  }

  function handleAddSubCategory() {
    if (!subCatInput.trim()) return;
    const newItems = subCatInput.split(',').map(s => s.trim()).filter(Boolean);
    setCategoryForm(prev => ({
      ...prev,
      subCategories: Array.from(new Set([...prev.subCategories, ...newItems]))
    }));
    setSubCatInput('');
  }

  function handleRemoveSubCategory(index) {
    setCategoryForm(prev => ({
      ...prev,
      subCategories: prev.subCategories.filter((_, i) => i !== index)
    }));
  }

  function handleAddSuggestedTag() {
    if (!tagInput.trim()) return;
    const newItems = tagInput.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean);
    setCategoryForm(prev => ({
      ...prev,
      suggestedTags: Array.from(new Set([...prev.suggestedTags, ...newItems]))
    }));
    setTagInput('');
  }

  function handleRemoveSuggestedTag(index) {
    setCategoryForm(prev => ({
      ...prev,
      suggestedTags: prev.suggestedTags.filter((_, i) => i !== index)
    }));
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setCategoryError('Please enter a category name');
      return;
    }
    if (!categoryForm.id.trim()) {
      setCategoryError('Please specify a category identifier / slug');
      return;
    }

    try {
      setCategorySubmitting(true);
      setCategoryError('');

      if (categoryModalMode === 'add') {
        await addCategory({
          id: categoryForm.id,
          name: categoryForm.name,
          icon: categoryForm.icon,
          color: categoryForm.color,
          description: categoryForm.description,
          subCategories: categoryForm.subCategories,
          suggestedTags: categoryForm.suggestedTags,
          isActive: categoryForm.isActive
        });
      } else {
        await updateCategory(categoryForm.id, {
          name: categoryForm.name,
          icon: categoryForm.icon,
          color: categoryForm.color,
          description: categoryForm.description,
          subCategories: categoryForm.subCategories,
          suggestedTags: categoryForm.suggestedTags,
          isActive: categoryForm.isActive
        });
      }

      await loadAdminData();
      await refreshCategories();
      setIsCategoryModalOpen(false);
    } catch (err) {
      setCategoryError(err.message || 'Failed to save category');
    } finally {
      setCategorySubmitting(false);
    }
  }

  async function handleConfirmDeleteCategory() {
    if (!deletingCategory) return;
    try {
      setIsDeletingCategory(true);
      await deleteCategory(deletingCategory.id);
      await loadAdminData();
      await refreshCategories();
      setDeletingCategory(null);
    } catch (err) {
      alert(err.message || 'Failed to delete category');
    } finally {
      setIsDeletingCategory(false);
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
            <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
              {adminCategories.length || rawCategories.length}
            </span>
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
                  {(adminCategories.length > 0 ? adminCategories : rawCategories).map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
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
                          {r.description && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '340px' }}>{r.description}</div>}
                          {(r.target_shop_name || r.targetShopName) && (
                            <div style={{ marginTop: '4px' }}>
                              <span className="badge badge-amber" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>
                                🎯 Direct: {r.target_shop_name || r.targetShopName}
                              </span>
                            </div>
                          )}
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
          {/* ====================================================
              TAB 8: CATEGORIES MANAGEMENT (Full Admin Control)
              ==================================================== */}
          {activeTab === 'categories' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div className="admin-heading-section" style={{ marginBottom: 0 }}>
                  <h1 className="admin-heading-title">Platform Categories</h1>
                  <p className="admin-heading-subtitle">Create, customize and manage business categories, icons, sub-categories & search tags</p>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.95rem', borderRadius: '12px', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)' }}
                  onClick={openAddCategoryModal}
                >
                  <span style={{ fontSize: '1.1rem' }}>✨</span>
                  <span>+ Add New Category</span>
                </button>
              </div>

              {/* 4 Summary Metric Cards */}
              <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem' }}>🗂️</span>
                  </div>
                  <div>
                    <div className="admin-stat-value">{(adminCategories.length > 0 ? adminCategories : rawCategories).length}</div>
                    <div className="admin-stat-label">Total Categories</div>
                    <div className="admin-stat-sub">Platform taxonomy</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem' }}>✅</span>
                  </div>
                  <div>
                    <div className="admin-stat-value">
                      {(adminCategories.length > 0 ? adminCategories : rawCategories).filter(c => c.isActive !== false).length}
                    </div>
                    <div className="admin-stat-label">Active Categories</div>
                    <div className="admin-stat-sub">Visible to residents</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem' }}>🏪</span>
                  </div>
                  <div>
                    <div className="admin-stat-value">
                      {(adminCategories.length > 0 ? adminCategories : rawCategories).reduce((acc, c) => acc + (c.totalShops || c.shopCount || 0), 0)}
                    </div>
                    <div className="admin-stat-label">Mapped Shops</div>
                    <div className="admin-stat-sub">Across all categories</div>
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                    <span style={{ fontSize: '1.5rem' }}>🏷️</span>
                  </div>
                  <div>
                    <div className="admin-stat-value">
                      {(adminCategories.length > 0 ? adminCategories : rawCategories).reduce((acc, c) => acc + (c.subCategories?.length || 0), 0)}
                    </div>
                    <div className="admin-stat-label">Sub-categories Defined</div>
                    <div className="admin-stat-sub">Speciality filters</div>
                  </div>
                </div>
              </div>

              {/* Search and Filters Bar */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
                <input
                  type="text"
                  placeholder="Search categories by name, slug, description, sub-specialty..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  style={{ flex: 1, minWidth: '260px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-heading)', outline: 'none' }}
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-heading)', fontWeight: 600 }}
                >
                  <option value="all">All Categories ({(adminCategories.length > 0 ? adminCategories : rawCategories).length})</option>
                  <option value="active">Active Only</option>
                  <option value="with_shops">With Registered Shops</option>
                </select>
              </div>

              {/* Categories Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                {(adminCategories.length > 0 ? adminCategories : rawCategories)
                  .filter(c => {
                    const matchQuery = !categorySearch.trim() ||
                      c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                      c.id.toLowerCase().includes(categorySearch.toLowerCase()) ||
                      (c.description && c.description.toLowerCase().includes(categorySearch.toLowerCase())) ||
                      (Array.isArray(c.subCategories) && c.subCategories.some(s => s.toLowerCase().includes(categorySearch.toLowerCase()))) ||
                      (Array.isArray(c.suggestedTags) && c.suggestedTags.some(t => t.toLowerCase().includes(categorySearch.toLowerCase())));

                    const matchFilter = categoryFilter === 'all' ||
                      (categoryFilter === 'active' ? c.isActive !== false : ((c.totalShops || c.shopCount || 0) > 0));

                    return matchQuery && matchFilter;
                  })
                  .map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '16px',
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div>
                        {/* Header with Icon, Name, and Status */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '14px',
                              background: `${c.color || '#10b981'}1f`,
                              border: `1px solid ${c.color || '#10b981'}40`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.6rem',
                              flexShrink: 0
                            }}>
                              {c.icon || '🏷️'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-heading)', lineHeight: 1.2 }}>{c.name}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                                  #{c.id}
                                </span>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color || '#10b981' }} title={`Theme: ${c.color || '#10b981'}`} />
                              </div>
                            </div>
                          </div>

                          <span className={`badge ${c.isActive !== false ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.72rem' }}>
                            {c.isActive !== false ? 'Active' : 'Hidden'}
                          </span>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '12px', minHeight: '36px', lineHeight: 1.4 }}>
                          {c.description || c.desc || 'Specialized neighborhood services and local businesses.'}
                        </p>

                        {/* Store & Demand Counts */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', background: 'var(--bg-surface)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 600 }}>
                            <span>🏪</span>
                            <span>{c.totalShops || c.shopCount || 0} Registered Shops</span>
                          </div>
                          {c.requirementCount !== undefined && c.requirementCount > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)', fontWeight: 600 }}>
                              <span>📋</span>
                              <span>{c.requirementCount} Demands</span>
                            </div>
                          )}
                        </div>

                        {/* Sub-categories */}
                        {Array.isArray(c.subCategories) && c.subCategories.length > 0 && (
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', fontWeight: 700, marginBottom: '6px' }}>
                              Sub-Categories ({c.subCategories.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {c.subCategories.slice(0, 3).map((sub, idx) => (
                                <span key={idx} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-surface)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                                  {sub}
                                </span>
                              ))}
                              {c.subCategories.length > 3 && (
                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                                  +{c.subCategories.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Suggested Tags */}
                        {Array.isArray(c.suggestedTags) && c.suggestedTags.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-light)', fontWeight: 700, marginBottom: '6px' }}>
                              Search Keywords
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {c.suggestedTags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.08)', color: '#4ade80' }}>
                                  #{tag}
                                </span>
                              ))}
                              {c.suggestedTags.length > 3 && (
                                <span style={{ fontSize: '0.72rem', padding: '2px 6px', color: 'var(--text-muted)' }}>
                                  +{c.suggestedTags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          onClick={() => openEditCategoryModal(c)}
                        >
                          <span>✏️</span>
                          <span>Edit</span>
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '7px 12px', fontSize: '0.82rem', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Delete category"
                          onClick={() => setDeletingCategory(c)}
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====================================================
          MODAL 1: ADD / EDIT CATEGORY MODAL
          ==================================================== */}
      {isCategoryModalOpen && (
        <div className="modal-overlay" onClick={() => !categorySubmitting && setIsCategoryModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => !categorySubmitting && setIsCategoryModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                {categoryModalMode === 'add' ? '✨' : '✏️'}
              </div>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)', margin: 0 }}>
                  {categoryModalMode === 'add' ? 'Add New Platform Category' : `Edit Category: ${categoryForm.name || categoryForm.id}`}
                </h2>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Define category name, emoji icon, color theme, sub-specialties, and search tags
                </p>
              </div>
            </div>

            {/* Form Error Banner */}
            {categoryError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', fontWeight: 600 }}>
                ⚠️ {categoryError}
              </div>
            )}

            <form onSubmit={handleSaveCategory}>
              {/* Category Name & Slug */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Category Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Pet Care & Veterinary"
                    value={categoryForm.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Identifier / Slug *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. pet-care"
                    value={categoryForm.id}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    disabled={categoryModalMode === 'edit'}
                    required
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {categoryModalMode === 'add' ? 'Auto-generated for routing & API' : 'Unique ID cannot be changed'}
                  </div>
                </div>
              </div>

              {/* Icon Emoji & Theme Color */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Icon Emoji *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '1.4rem', textAlign: 'center' }}
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                    maxLength={4}
                    required
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Theme Color *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      value={categoryForm.color || '#10b981'}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                      style={{ width: '42px', height: '42px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', padding: 0 }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1 }}
                      value={categoryForm.color || '#10b981'}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#10b981"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Emoji Suggestions Palette */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Quick Icon Suggestions (Click to select):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['🐾', '🌿', '📸', '🧼', '☕', '🎂', '📦', '🎨', '🚗', '🏥', '🛒', '💇', '🪚', '💍', '✂️', '📱', '🔧', '🏋️', '📚', '🔨', '📝', '🧹', '🚚', '🧵', '⚡', '💊', '🥐', '🍗', '🧸', '💡', '🎸', '⚽', '🔑', '🪴', '👗', '🦷'].map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setCategoryForm(prev => ({ ...prev, icon: emoji }))}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        border: categoryForm.icon === emoji ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: categoryForm.icon === emoji ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-surface)',
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Color Palette Presets */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Preset Color Themes:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { name: 'Emerald', color: '#10b981' },
                    { name: 'Red', color: '#ef4444' },
                    { name: 'Orange', color: '#f97316' },
                    { name: 'Amber', color: '#f59e0b' },
                    { name: 'Blue', color: '#3b82f6' },
                    { name: 'Indigo', color: '#6366f1' },
                    { name: 'Purple', color: '#a855f7' },
                    { name: 'Pink', color: '#ec4899' },
                    { name: 'Teal', color: '#14b8a6' },
                    { name: 'Slate', color: '#64748b' }
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.color}
                      onClick={() => setCategoryForm(prev => ({ ...prev, color: p.color }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: categoryForm.color?.toLowerCase() === p.color.toLowerCase() ? `2px solid ${p.color}` : '1px solid var(--border)',
                        background: categoryForm.color?.toLowerCase() === p.color.toLowerCase() ? `${p.color}22` : 'var(--bg-surface)',
                        color: 'var(--text-main)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Short Description */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Short Description</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. Veterinary clinics, pet grooming salons, cat & dog food supplies, and animal daycare"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Sub-Categories (Specialities) */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Sub-Categories / Specialities</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type sub-category and press Enter or click Add (e.g. Pet Clinic, Grooming)..."
                    value={subCatInput}
                    onChange={(e) => setSubCatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddSubCategory}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Add
                  </button>
                </div>

                {categoryForm.subCategories.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {categoryForm.subCategories.map((sub, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          fontSize: '0.82rem',
                          color: 'var(--text-heading)'
                        }}
                      >
                        <span>{sub}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubCategory(idx)}
                          style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1 }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    No sub-categories added yet. Vendors in this category will select from these options during registration.
                  </div>
                )}
              </div>

              {/* Suggested Search Tags */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Suggested Search Keywords / Tags</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type keyword and press Enter (e.g. Dog Food, Vaccination, Vet)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSuggestedTag();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddSuggestedTag}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Add Tag
                  </button>
                </div>

                {categoryForm.suggestedTags.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {categoryForm.suggestedTags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '1px solid rgba(34, 197, 94, 0.25)',
                          fontSize: '0.82rem',
                          color: '#4ade80'
                        }}
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSuggestedTag(idx)}
                          style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1 }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    No search tags added yet. These help residents find shops via search.
                  </div>
                )}
              </div>

              {/* Status active checkbox */}
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="cat-is-active"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="cat-is-active" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-heading)', cursor: 'pointer' }}>
                  Active & Visible in Explore & Homepage
                </label>
              </div>

              {/* Live Preview Box */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-light)', fontWeight: 800, marginBottom: '10px' }}>
                  Live Preview Widget
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  {/* Explore Pill Preview */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)'
                  }}>
                    <span>{categoryForm.icon || '🏷️'}</span>
                    <span>{categoryForm.name || 'New Category'}</span>
                  </div>

                  {/* Home Grid Card Preview */}
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <div style={{ fontSize: '1.5rem' }}>{categoryForm.icon || '🏷️'}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                      {(categoryForm.name || 'New Category').split('&')[0]}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCategoryModalOpen(false)}
                  disabled={categorySubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={categorySubmitting}
                  style={{ minWidth: '140px' }}
                >
                  {categorySubmitting ? 'Saving...' : (categoryModalMode === 'add' ? 'Create Category' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 2: DELETE CATEGORY CONFIRMATION
          ==================================================== */}
      {deletingCategory && (
        <div className="modal-overlay" onClick={() => !isDeletingCategory && setDeletingCategory(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                🗑️
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '8px' }}>
                Delete "{deletingCategory.name}"?
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Are you sure you want to delete this category? Any shops or requirements under this category will be safely reassigned to <strong>"Other Local Services"</strong> so no store records are lost.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDeletingCategory(null)}
                disabled={isDeletingCategory}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, background: '#e11d48' }}
                onClick={handleConfirmDeleteCategory}
                disabled={isDeletingCategory}
              >
                {isDeletingCategory ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


