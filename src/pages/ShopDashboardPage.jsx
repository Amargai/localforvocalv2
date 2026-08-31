import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { RequirementCard } from '../components/RequirementCard';
import { StarIcon, LocationIcon, ClockIcon, SparklesIcon, PlusIcon, PhoneIcon, WhatsappIcon, XIcon, CheckIcon } from '../components/Icons';

export function ShopDashboardPage({ setActivePage }) {
  const { user, shop, refreshSession } = useAuth();

  // Tab State
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'leads', 'offers', 'profile'

  // Open / Close status
  const [isAvailable, setIsAvailable] = useState(shop?.availableToday ?? true);
  const [toggling, setToggling] = useState(false);

  // Products State
  const [products, setProducts] = useState([]);
  const [usage, setUsage] = useState({ count: 0, limit: 5, isPro: false, remaining: 5 });
  const [loadingProds, setLoadingProds] = useState(true);
  const [showAddProdModal, setShowAddProdModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Add/Edit Product Form
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodOriginalPrice, setProdOriginalPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodInStock, setProdInStock] = useState(true);
  const [savingProd, setSavingProd] = useState(false);

  // Leads & Offers State
  const [matchingReqs, setMatchingReqs] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  useEffect(() => {
    if (shop?.id) {
      loadDashboardData();
    }
  }, [shop?.id]);

  async function loadDashboardData() {
    try {
      const [prodsRes, reqsRes, offersRes] = await Promise.all([
        api('/products/mine'),
        api('/requirements/matching'),
        api('/offers')
      ]);

      setProducts(prodsRes.products || []);
      setUsage(prodsRes.usage || { count: 0, limit: 5, isPro: false, remaining: 5 });
      setMatchingReqs(reqsRes.requirements || []);
      setMyOffers((offersRes.offers || []).filter(o => o.shopId === shop?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProds(false);
      setLoadingLeads(false);
    }
  }

  async function handleToggleAvailability() {
    if (!shop) return;
    try {
      setToggling(true);
      const nextStatus = !isAvailable;
      await api(`/shops/${shop.id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availableToday: nextStatus })
      });
      setIsAvailable(nextStatus);
      await refreshSession();
    } catch (err) {
      alert(err.message || 'Failed to update availability');
    } finally {
      setToggling(false);
    }
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;

    if (!usage.isPro && usage.count >= usage.limit) {
      setShowAddProdModal(false);
      setShowLimitModal(true);
      return;
    }

    try {
      setSavingProd(true);
      await api('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: prodName.trim(),
          price: Number(prodPrice),
          originalPrice: prodOriginalPrice ? Number(prodOriginalPrice) : undefined,
          category: prodCategory.trim() || undefined,
          description: prodDesc.trim() || undefined,
          imageUrl: prodImage.trim() || undefined,
          inStock: prodInStock
        })
      });

      setShowAddProdModal(false);
      resetProdForm();
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to add product');
    } finally {
      setSavingProd(false);
    }
  }

  async function handleToggleProductStock(prodId, currentStock) {
    try {
      await api(`/products/${prodId}`, {
        method: 'PUT',
        body: JSON.stringify({ inStock: !currentStock })
      });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to update stock');
    }
  }

  async function handleDeleteProduct(prodId) {
    if (!confirm('Are you sure you want to remove this product from your shop catalog?')) return;
    try {
      await api(`/products/${prodId}`, { method: 'DELETE' });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  }

  async function handleDeleteOffer(offerId) {
    if (!confirm('Are you sure you want to remove this offer?')) return;
    try {
      await api(`/offers/${offerId}`, { method: 'DELETE' });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to delete offer');
    }
  }

  // Image Upload helper
  const [uploadingProdImg, setUploadingProdImg] = useState(false);
  const [uploadingProfileImg, setUploadingProfileImg] = useState(false);

  async function handleFileUpload(file, target = 'product') {
    if (!file) return;
    try {
      if (target === 'product') setUploadingProdImg(true);
      else setUploadingProfileImg(true);

      const formData = new FormData();
      formData.append('image', file);

      const res = await api('/uploads', {
        method: 'POST',
        body: formData
      });

      if (target === 'product') {
        setProdImage(res.url);
      } else {
        setEditImage(res.url);
      }
    } catch (err) {
      alert(err.message || 'Image upload failed. You can paste an image URL instead.');
    } finally {
      if (target === 'product') setUploadingProdImg(false);
      else setUploadingProfileImg(false);
    }
  }

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(shop?.name || '');
  const [editOwnerName, setEditOwnerName] = useState(shop?.ownerName || '');
  const [editCategory, setEditCategory] = useState(shop?.category || 'grocery');
  const [editSubCategory, setEditSubCategory] = useState(shop?.subCategory || '');
  const [editPhone, setEditPhone] = useState(shop?.phone || '');
  const [editWhatsapp, setEditWhatsapp] = useState(shop?.whatsapp || '');
  const [editAddress, setEditAddress] = useState(shop?.address || '');
  const [editArea, setEditArea] = useState(shop?.area || '');
  const [editCity, setEditCity] = useState(shop?.city || '');
  const [editPin, setEditPin] = useState(shop?.pin || '');
  const [editTags, setEditTags] = useState((shop?.tags || []).join(', '));
  const [editImage, setEditImage] = useState(shop?.images?.[0] || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  function handleStartEditProfile() {
    setEditName(shop?.name || '');
    setEditOwnerName(shop?.ownerName || '');
    setEditCategory(shop?.category || 'grocery');
    setEditSubCategory(shop?.subCategory || '');
    setEditPhone(shop?.phone || '');
    setEditWhatsapp(shop?.whatsapp || '');
    setEditAddress(shop?.address || '');
    setEditArea(shop?.area || '');
    setEditCity(shop?.city || '');
    setEditPin(shop?.pin || '');
    setEditTags((shop?.tags || []).join(', '));
    setEditImage(shop?.images?.[0] || '');
    setIsEditingProfile(true);
    setProfileSuccessMsg('');
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!shop?.id) return;
    try {
      setSavingProfile(true);
      const parsedTags = editTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      const parsedImages = editImage.trim() ? [editImage.trim()] : (shop?.images || []);

      await api(`/shops/${shop.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          ownerName: editOwnerName.trim(),
          category: editCategory,
          subCategory: editSubCategory.trim() || undefined,
          phone: editPhone.trim(),
          whatsapp: editWhatsapp.trim() || editPhone.trim(),
          address: editAddress.trim(),
          area: editArea.trim(),
          city: editCity.trim(),
          pin: editPin.trim() || undefined,
          tags: parsedTags,
          images: parsedImages
        })
      });

      await refreshSession();
      await loadDashboardData();
      setIsEditingProfile(false);
      setProfileSuccessMsg('Shop profile updated successfully!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to update shop profile');
    } finally {
      setSavingProfile(false);
    }
  }

  function resetProdForm() {
    setProdName('');
    setProdPrice('');
    setProdOriginalPrice('');
    setProdCategory('');
    setProdDesc('');
    setProdImage('');
    setProdInStock(true);
  }


  if (!user || user.accountType !== 'shop_owner') {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏪</div>
        <h2>Shop Owner Portal</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Register your business to manage your catalog and receive neighborhood leads.</p>
        <button className="btn btn-primary" onClick={() => setActivePage('register-shop')}>
          List Your Shop Now
        </button>
      </div>
    );
  }

  const usagePercent = Math.min(100, Math.round((usage.count / usage.limit) * 100));


  return (
    <div style={{ background: 'var(--bg-main)', minHeight: '100vh', padding: '40px 0 80px' }}>
      <div className="container">
        
        {/* PREMIUM DASHBOARD HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          color: 'white',
          boxShadow: 'var(--shadow-xl)',
          marginBottom: '32px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                {shop?.category?.toUpperCase() || 'LOCAL BUSINESS'}
              </span>
              {shop?.featured ? (
                <span className="badge badge-amber">★ PRO PARTNER</span>
              ) : (
                <span className="badge badge-gray" style={{ background: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }}>FREE STARTER PLAN</span>
              )}
            </div>

            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'white', marginBottom: '6px' }}>
              {shop?.name || 'My Store Dashboard'}
            </h1>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LocationIcon size={15} />
              <span>{shop?.address}, {shop?.area}, {shop?.city}</span>
            </div>
          </div>

          {/* STORE STATUS TOGGLE */}
          <div style={{
            background: isAvailable ? 'rgba(22, 163, 74, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: isAvailable ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 1
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isAvailable ? '#86efac' : '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isAvailable ? '#22c55e' : '#ef4444' }} />
                {isAvailable ? 'OPEN FOR ORDERS' : 'STORE CLOSED'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                {isAvailable ? 'Visible in Open Today filters' : 'Temporarily hidden from search'}
              </div>
            </div>

            <button
              onClick={handleToggleAvailability}
              disabled={toggling}
              className={`btn ${isAvailable ? 'btn-secondary' : 'btn-primary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem', borderRadius: '8px' }}
            >
              {toggling ? '...' : isAvailable ? 'Close Shop' : 'Open Shop'}
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Catalog Items</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-heading)' }}>{products.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-light)', fontWeight: 500 }}>/ {usage.isPro ? '∞' : usage.limit}</span></div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Storefront Views</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-heading)' }}>{shop?.views || 145}</div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer Rating</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#eab308', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <StarIcon size={20} filled />
              <span>{Number(shop?.rating || 5.0).toFixed(1)}</span>
            </div>
          </div>

          <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 'var(--radius-lg)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase' }}>Nearby Customer Demands</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>{matchingReqs.length}</div>
          </div>
        </div>

        {/* DASHBOARD TABS NAVIGATION */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '28px', overflowX: 'auto' }}>
          <button
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.92rem',
              background: activeTab === 'products' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'products' ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('products')}
          >
            <span>📦 Products & Price List</span>
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{products.length}</span>
          </button>

          <button
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.92rem',
              background: activeTab === 'leads' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'leads' ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('leads')}
          >
            <span>🎯 Customer Demand Radar</span>
            <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{matchingReqs.length}</span>
          </button>

          <button
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.92rem',
              background: activeTab === 'offers' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'offers' ? 'var(--primary)' : 'var(--text-muted)'
            }}
            onClick={() => setActiveTab('offers')}
          >
            🔥 My Offers ({myOffers.length})
          </button>

          <button
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.92rem',
              background: activeTab === 'profile' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'profile' ? 'var(--primary)' : 'var(--text-muted)'
            }}
            onClick={() => setActiveTab('profile')}
          >
            ⚙️ Shop Profile
          </button>
        </div>

        {/* TAB 1: PRODUCT CATALOG & CARDS */}
        {activeTab === 'products' && (
          <div>
            {/* PRODUCT QUOTA & SUBSCRIPTION UPSELL BANNER */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              marginBottom: '28px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '0.95rem' }}>Product Catalog Quota:</strong>
                  <span className="badge badge-green">{usage.count} of {usage.isPro ? 'Unlimited' : `${usage.limit} Products`} Used</span>
                </div>
                
                {/* Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', maxWidth: '380px' }}>
                  <div style={{ width: `${usagePercent}%`, height: '100%', background: usagePercent >= 100 ? '#ef4444' : 'var(--primary)', transition: 'width 0.3s' }} />
                </div>
                
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {usage.isPro ? 'Unlimited catalog active with Pro subscription.' : `Free Starter Plan includes up to ${usage.limit} product listings.`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {!usage.isPro && (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', borderColor: '#bbf7d0', background: '#f0fdf4', color: '#166534' }}
                    onClick={() => setActivePage('plans')}
                  >
                    💎 Unlock Unlimited Products (Pro)
                  </button>
                )}

                <button
                  className="btn btn-primary"
                  style={{ fontSize: '0.88rem' }}
                  onClick={() => {
                    if (!usage.isPro && usage.count >= usage.limit) {
                      setShowLimitModal(true);
                    } else {
                      resetProdForm();
                      setShowAddProdModal(true);
                    }
                  }}
                >
                  <PlusIcon size={16} />
                  Add New Product
                </button>
              </div>
            </div>

            {/* PRODUCT CARDS GRID */}
            {loadingProds ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>Loading products...</div>
            ) : products.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)', padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '6px' }}>No products listed yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Add your popular items, pricing, and services so neighborhood customers can view your catalog!
                </p>
                <button className="btn btn-primary" onClick={() => setShowAddProdModal(true)}>
                  <PlusIcon size={16} /> Add Your First Product
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s',
                      position: 'relative'
                    }}
                  >
                    {/* Thumbnail Image */}
                    <div style={{ height: '160px', background: '#f1f5f9', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={prod.imageUrl || 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&auto=format&fit=crop&q=80'}
                        alt={prod.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                        <span className={`badge ${prod.inStock ? 'badge-green' : 'badge-red'}`}>
                          ● {prod.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {prod.category && (
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>
                          {prod.category}
                        </div>
                      )}

                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                        {prod.name}
                      </h4>

                      {prod.description && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.4' }}>
                          {prod.description}
                        </p>
                      )}

                      {/* Price Section */}
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          ₹{prod.price}
                        </span>
                        {prod.originalPrice && prod.originalPrice > prod.price && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', textDecoration: 'line-through' }}>
                            ₹{prod.originalPrice}
                          </span>
                        )}
                        {prod.originalPrice && prod.originalPrice > prod.price && (
                          <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                            Save {Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Actions Bar */}
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <button
                          onClick={() => handleToggleProductStock(prod.id, prod.inStock)}
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: prod.inStock ? '#fee2e2' : '#dcfce7',
                            color: prod.inStock ? '#b91c1c' : '#15803d'
                          }}
                        >
                          {prod.inStock ? 'Mark Out of Stock' : 'Mark Available'}
                        </button>

                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          style={{ fontSize: '0.78rem', color: '#94a3b8', padding: '4px 6px' }}
                          title="Delete Product"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEMAND RADAR */}
        {activeTab === 'leads' && (
          <div>
            <div style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
              Real-time customer requests posted in <strong>{shop?.category?.toUpperCase()}</strong> within your delivery radius.
            </div>

            {loadingLeads ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>Scanning neighborhood demands...</div>
            ) : matchingReqs.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)', padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🎯</div>
                <h3 style={{ fontWeight: 700 }}>No active customer demands right now</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>When a customer in your radius broadcasts a demand for {shop?.category}, you will see it here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {matchingReqs.map((req) => (
                  <RequirementCard key={req.id} requirement={req} onRefresh={loadDashboardData} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MY OFFERS */}
        {activeTab === 'offers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Active neighborhood promotions posted by your shop.</div>
              <button className="btn btn-primary" onClick={() => setActivePage('offers')}>
                <PlusIcon size={15} /> Post New Deal
              </button>
            </div>

            {myOffers.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)', padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔥</div>
                <h3 style={{ fontWeight: 700 }}>You haven't posted any offers yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>Attract more neighborhood customers by publishing a limited-time discount or combo deal.</p>
                <button className="btn btn-primary" onClick={() => setActivePage('offers')}>
                  Create a Special Offer
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {myOffers.map((o) => (
                  <div key={o.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="badge badge-amber">{o.discount}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.validTill}</span>
                    </div>
                    <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>{o.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>{o.description}</p>
                    <div style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleDeleteOffer(o.id)}
                        style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}
                      >
                        🗑️ Delete Offer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STORE PROFILE & EDIT */}
        {activeTab === 'profile' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '32px', maxWidth: '780px' }}>
            {profileSuccessMsg && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckIcon size={16} /> {profileSuccessMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Store & Contact Information</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Keep your store details, phone numbers, and neighborhood tags updated.</p>
              </div>

              {!isEditingProfile && (
                <button className="btn btn-primary" onClick={handleStartEditProfile}>
                  ✏️ Edit Shop Profile
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Shop / Business Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Owner Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editOwnerName}
                      onChange={(e) => setEditOwnerName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Business Category *</label>
                    <select
                      className="form-select"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      required
                    >
                      <option value="medical">Medical & Chemist</option>
                      <option value="grocery">Grocery & Daily Needs</option>
                      <option value="bakery">Bakery & Sweets</option>
                      <option value="carpenter">Carpentry & Furniture</option>
                      <option value="electronics">Electronics & Mobile Repair</option>
                      <option value="plumbing">Plumbing & Hardware</option>
                      <option value="tailor">Tailoring & Boutique</option>
                      <option value="services">Local Home Services</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Specialization / Sub-category</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 24x7 Pharmacy, Custom Woodwork, Eggless Bakery"
                      value={editSubCategory}
                      onChange={(e) => setEditSubCategory(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Calling Phone Number *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">WhatsApp Number for Leads *</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editWhatsapp}
                      onChange={(e) => setEditWhatsapp(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Shop Address *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Neighborhood / Area *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editArea}
                      onChange={(e) => setEditArea(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">PIN Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Search Keywords / Tags (comma separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. medicine, delivery, emergency, baby care, generic"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Shop Front Banner / Image (Upload or Paste URL)</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://images.unsplash.com/..."
                      value={editImage}
                      onChange={(e) => setEditImage(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <label className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📁 {uploadingProfileImg ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0], 'profile');
                          }
                        }}
                        disabled={uploadingProfileImg}
                      />
                    </label>
                  </div>
                  {editImage && (
                    <div style={{ position: 'relative', width: '120px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={editImage} alt="Banner preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={savingProfile}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Shop Details</div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '4px', color: 'var(--text-heading)' }}>{shop?.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>{shop?.category.toUpperCase()} {shop?.subCategory && `• ${shop?.subCategory}`}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>Owner: <strong style={{ color: 'var(--text-heading)' }}>{shop?.ownerName}</strong></div>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Contact Info</div>
                    <div style={{ fontSize: '0.88rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PhoneIcon size={14} /> <span>{shop?.phone}</span>
                    </div>
                    <div style={{ fontSize: '0.88rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80' }}>
                      <WhatsappIcon size={14} /> <span>{shop?.whatsapp} (WhatsApp Leads)</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>Store Address</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{shop?.address}, {shop?.area}, {shop?.city} {shop?.pin ? `- ${shop?.pin}` : ''}</div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>Active Search Keywords</div>
                  <div className="shop-tags">
                    {shop?.tags?.map((t, i) => (
                      <span className="shop-tag" key={i}>#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ADD PRODUCT MODAL */}
        {showAddProdModal && (
          <div className="modal-overlay" onClick={() => setShowAddProdModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-heading)' }}>Add Product to Store Catalog</h3>
                <button onClick={() => setShowAddProdModal(false)} style={{ background: 'var(--bg-surface)', color: 'var(--text-main)', padding: '6px', borderRadius: '50%' }}>
                  <XIcon size={16} />
                </button>
              </div>

              <form onSubmit={handleAddProduct}>
                <div className="form-group">
                  <label className="form-label">Product / Service Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Digital BP Monitor, Custom Wooden Table, Dark Chocolate Cake"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Selling Price (₹) *</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 850"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Original / MRP Price (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 1100 (Optional)"
                      value={prodOriginalPrice}
                      onChange={(e) => setProdOriginalPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Sub-Category / Product Tag</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Medical Devices, Bakery, Custom Furniture"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Product Image (Upload or Paste URL)</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://images.unsplash.com/..."
                      value={prodImage}
                      onChange={(e) => setProdImage(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <label className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📁 {uploadingProdImg ? 'Uploading...' : 'Upload Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0], 'product');
                          }
                        }}
                        disabled={uploadingProdImg}
                      />
                    </label>
                  </div>
                  {prodImage && (
                    <div style={{ position: 'relative', width: '80px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <img src={prodImage} alt="Product preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Features</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Brief details, dimensions, warranty, or brand..."
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <input
                    type="checkbox"
                    id="stockCheck"
                    checked={prodInStock}
                    onChange={(e) => setProdInStock(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="stockCheck" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-heading)' }}>Available & In Stock</label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddProdModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={savingProd}>
                    {savingProd ? 'Adding...' : 'Add to Catalog'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUBSCRIPTION LIMIT REACHED MODAL */}
        {showLimitModal && (
          <div className="modal-overlay" onClick={() => setShowLimitModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>💎</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-heading)' }}>
                Free Plan Catalog Limit Reached
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '20px', lineHeight: '1.5' }}>
                You have reached your <strong>5 product limit</strong> on the Starter Free Plan. Upgrade to <strong>Local Hero Pro</strong> to list unlimited products, get a verified green badge, and receive direct WhatsApp leads.
              </p>

              <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'left', marginBottom: '24px' }}>
                <div style={{ fontWeight: 700, color: '#4ade80', fontSize: '0.9rem', marginBottom: '4px' }}>Pro Plan Benefits:</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>✓ Unlimited catalog products & price lists</div>
                  <div>✓ 🛡️ Green Verified Merchant Badge</div>
                  <div>✓ Instant customer demand alerts in your area</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowLimitModal(false)}>
                  Later
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={() => { setShowLimitModal(false); setActivePage('plans'); }}
                >
                  View Pro Plans (₹499/mo)
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

