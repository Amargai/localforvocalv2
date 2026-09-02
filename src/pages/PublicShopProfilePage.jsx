import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  StarIcon, LocationIcon, PhoneIcon, WhatsappIcon,
  ClockIcon, ShieldCheckIcon, SparklesIcon, CheckIcon
} from '../components/Icons';

export function PublicShopProfilePage({ shopId, setActivePage, onBack, onPostRequirement }) {
  const { user, openAuthModal } = useAuth();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'offers', 'about', 'reviews'

  // Favorite / Bookmark state
  const [isSaved, setIsSaved] = useState(false);

  // Review Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Filter products by search within shop
  const [prodSearch, setProdSearch] = useState('');
  const [selectedProdCat, setSelectedProdCat] = useState('all');

  useEffect(() => {
    if (!shopId) return;
    loadPublicShop();

    // Check if shop is saved in local bookmarks
    try {
      const saved = JSON.parse(localStorage.getItem('l4v_favorites') || '[]');
      setIsSaved(saved.includes(shopId));
    } catch (e) {}
  }, [shopId]);

  async function loadPublicShop() {
    try {
      setLoading(true);
      const [shopData, prodsData, offersData] = await Promise.all([
        api(`/shops/${shopId}`),
        api(`/products/shop/${shopId}`).catch(() => ({ products: [] })),
        api('/offers').catch(() => ({ offers: [] }))
      ]);

      setShop(shopData.shop);
      setReviews(shopData.reviews || []);
      setProducts(prodsData.products || []);
      setOffers((offersData.offers || []).filter(o => o.shopId === shopId));
    } catch (err) {
      console.error('Failed to load shop public profile', err);
    } finally {
      setLoading(false);
    }
  }

  function handleToggleFavorite() {
    try {
      const saved = JSON.parse(localStorage.getItem('l4v_favorites') || '[]');
      let updated;
      if (saved.includes(shopId)) {
        updated = saved.filter(id => id !== shopId);
        setIsSaved(false);
      } else {
        updated = [...saved, shopId];
        setIsSaved(true);
      }
      localStorage.setItem('l4v_favorites', JSON.stringify(updated));
    } catch (e) {}
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!user) {
      openAuthModal('demo');
      return;
    }
    if (!comment.trim()) return;

    try {
      setSubmittingReview(true);
      await api(`/shops/${shopId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      });
      setComment('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 4000);
      await loadPublicShop();
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏪</div>
        <h2>Loading Storefront...</h2>
        <p style={{ color: 'var(--text-muted)' }}>Fetching verified products, price list, and neighborhood deals.</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Store Not Found</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>The requested neighborhood business could not be located.</p>
        <button className="btn btn-primary" onClick={() => setActivePage('explore')}>
          ← Back to Explore
        </button>
      </div>
    );
  }

  const defaultBanner = shop.images?.[0] || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&auto=format&fit=crop&q=80';

  // Unique product categories for filter chips
  const prodCategories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Filtered products
  const filteredProducts = products.filter(p => {
    const matchesSearch = !prodSearch.trim() || p.name.toLowerCase().includes(prodSearch.toLowerCase()) || (p.description && p.description.toLowerCase().includes(prodSearch.toLowerCase()));
    const matchesCategory = selectedProdCat === 'all' || p.category === selectedProdCat;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ background: 'var(--bg-main)', minHeight: '100vh', paddingBottom: '80px' }}>
      
      {/* TOP NAVIGATION BREADCRUMB */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
            <button
              onClick={() => (onBack ? onBack() : setActivePage('explore'))}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--primary)' }}
            >
              ← Back to Explore
            </button>
            <span style={{ color: 'var(--text-light)' }}>/</span>
            <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{shop.category}</span>
            <span style={{ color: 'var(--text-light)' }}>/</span>
            <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{shop.name}</span>
          </div>

          <button
            onClick={handleToggleFavorite}
            className="btn btn-secondary"
            style={{
              padding: '6px 14px',
              fontSize: '0.85rem',
              color: isSaved ? '#ef4444' : 'var(--text-heading)',
              borderColor: isSaved ? '#fecaca' : 'var(--border)',
              background: isSaved ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface)'
            }}
          >
            <span>{isSaved ? '❤️ Saved' : '🤍 Save Store'}</span>
          </button>
        </div>
      </div>

      <div className="container" style={{ marginTop: '24px' }}>
        
        {/* PUBLIC STORE HERO BANNER & HEADER */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '28px'
        }}>
          {/* Banner Photo */}
          <div style={{
            height: '240px',
            position: 'relative',
            background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
            overflow: 'hidden'
          }}>
            <img
              src={defaultBanner}
              alt={shop.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)'
            }} />

            {/* Badges in Banner */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
              <span className={`badge ${shop.availableToday ? 'badge-green' : 'badge-red'}`}>
                ● {shop.availableToday ? 'OPEN TODAY' : 'CURRENTLY CLOSED'}
              </span>
              {shop.featured && (
                <span className="badge badge-amber">★ VERIFIED PRO PARTNER</span>
              )}
            </div>

            {/* Category Chip */}
            <div style={{ position: 'absolute', bottom: '16px', left: '24px' }}>
              <span className="badge badge-green" style={{ fontSize: '0.78rem', background: 'rgba(20, 83, 45, 0.85)', backdropFilter: 'blur(4px)', color: '#86efac' }}>
                {shop.category?.toUpperCase()} {shop.subCategory ? `• ${shop.subCategory}` : ''}
              </span>
            </div>
          </div>

          {/* Header Content & Quick Actions */}
          <div style={{ padding: '28px 32px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>
                  {shop.name}
                </h1>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <LocationIcon size={16} />
                    <span>{shop.address}, {shop.area}, {shop.city} {shop.pin ? `- ${shop.pin}` : ''}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#eab308', fontWeight: 700 }}>
                    <StarIcon size={18} filled />
                    <span>{Number(shop.rating || 5.0).toFixed(1)}</span>
                    <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>({reviews.length} reviews)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ClockIcon size={16} />
                    <span>Open 8:00 AM – 10:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Direct Post Requirement + WhatsApp + Call */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    padding: '12px 22px',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                  onClick={() => onPostRequirement ? onPostRequirement(shop) : setActivePage('requirements')}
                >
                  <span>📋</span>
                  <span>Request Item / Quote from {shop.name}</span>
                </button>

                {Boolean(shop.whatsapp && shop.whatsapp.replace(/\D/g, '')) && (
                  <a
                    href={`https://wa.me/91${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${shop.name}, I found your storefront on Local for Vocal and would like to place an order/inquire.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp"
                    style={{ padding: '12px 18px', fontSize: '0.92rem', borderRadius: '10px' }}
                  >
                    <WhatsappIcon size={18} />
                    WhatsApp
                  </a>
                )}

                {Boolean(shop.phone && shop.phone.replace(/\D/g, '')) && (
                  <a
                    href={`tel:${shop.phone.replace(/\D/g, '')}`}
                    className="btn btn-secondary"
                    style={{ padding: '12px 18px', fontSize: '0.92rem', borderRadius: '10px' }}
                  >
                    <PhoneIcon size={18} />
                    Call {shop.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Tags / Specializations */}
            {shop.tags && shop.tags.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {shop.tags.map((tag, i) => (
                  <span key={i} className="shop-tag" style={{ fontSize: '0.78rem' }}>#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS FOR STORE PROFILE */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '28px', overflowX: 'auto' }}>
          <button
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: activeTab === 'products' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'products' ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('products')}
          >
            <span>📦 Products & Price List</span>
            <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>{products.length}</span>
          </button>

          {offers.length > 0 && (
            <button
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.95rem',
                background: activeTab === 'offers' ? 'var(--primary-light)' : 'transparent',
                color: activeTab === 'offers' ? 'var(--primary)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={() => setActiveTab('offers')}
            >
              <span>🔥 Flash Deals & Offers</span>
              <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>{offers.length}</span>
            </button>
          )}

          <button
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: activeTab === 'about' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'about' ? 'var(--primary)' : 'var(--text-muted)'
            }}
            onClick={() => setActiveTab('about')}
          >
            ℹ️ About Store & Hours
          </button>

          <button
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: activeTab === 'reviews' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'reviews' ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setActiveTab('reviews')}
          >
            <span>⭐ Customer Reviews</span>
            <span className="badge badge-gray" style={{ fontSize: '0.72rem' }}>{reviews.length}</span>
          </button>
        </div>

        {/* TAB 1: PRODUCT SHOWCASE & GALLERY */}
        {activeTab === 'products' && (
          <div>
            {/* Search & Category Filter Inside Store */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Search items in ${shop.name}...`}
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  style={{ padding: '10px 14px' }}
                />
              </div>

              {prodCategories.length > 2 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {prodCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedProdCat(cat)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        background: selectedProdCat === cat ? 'var(--primary)' : 'var(--bg-surface)',
                        color: selectedProdCat === cat ? '#0c0d18' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer'
                      }}
                    >
                      {cat === 'all' ? 'All Items' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)', padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📦</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-heading)' }}>
                  {products.length === 0 ? 'No products currently cataloged' : 'No items match your search'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
                  You can still chat directly with {shop.name} on WhatsApp to inquire about available stock or custom orders!
                </p>
                {shop.whatsapp && (
                  <a
                    href={`https://wa.me/91${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${shop.name}, do you have items in stock right now?`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-whatsapp"
                  >
                    <WhatsappIcon size={16} /> Ask on WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      position: 'relative'
                    }}
                  >
                    {/* Product Photo */}
                    <div style={{ height: '180px', background: 'var(--bg-surface)', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={p.imageUrl || 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&auto=format&fit=crop&q=80'}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                        <span className={`badge ${p.inStock ? 'badge-green' : 'badge-red'}`}>
                          ● {p.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {p.category && (
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>
                          {p.category}
                        </div>
                      )}

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                        {p.name}
                      </h3>

                      {p.description && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                          {p.description}
                        </p>
                      )}

                      {/* Pricing */}
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          ₹{p.price}
                        </span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', textDecoration: 'line-through' }}>
                            ₹{p.originalPrice}
                          </span>
                        )}
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
                            Save {Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%
                          </span>
                        )}
                      </div>

                      {/* 1-Click WhatsApp Order CTA */}
                      {shop.whatsapp && (
                        <a
                          href={`https://wa.me/91${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${shop.name}, I would like to order / inquire about "${p.name}" (₹${p.price}) seen on your Local for Vocal profile.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-whatsapp"
                          style={{ width: '100%', padding: '10px', fontSize: '0.85rem', justifyContent: 'center', borderRadius: '8px' }}
                        >
                          <WhatsappIcon size={15} /> Order / Inquire via WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OFFERS & DEALS */}
        {activeTab === 'offers' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {offers.map((o) => (
                <div
                  key={o.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid #fed7aa',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className="badge badge-amber" style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                      🔥 {o.discount}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Valid: {o.validTill}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-heading)' }}>
                    {o.title}
                  </h3>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '18px', lineHeight: '1.5' }}>
                    {o.description}
                  </p>

                  {shop.whatsapp && (
                    <a
                      href={`https://wa.me/91${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${shop.name}, I want to claim the deal: "${o.title}" (${o.discount}) from Local for Vocal.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-whatsapp"
                      style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                    >
                      <WhatsappIcon size={16} /> Claim Deal on WhatsApp
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ABOUT STORE & WORKING HOURS */}
        {activeTab === 'about' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '32px', maxWidth: '780px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '18px', color: 'var(--text-heading)' }}>Business Overview</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Store Owner</div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '4px', color: 'var(--text-heading)' }}>{shop.ownerName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '2px' }}>Verified Neighborhood Merchant</div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Operating Hours</div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '4px', color: 'var(--text-heading)' }}>Mon - Sun (8:00 AM - 10:00 PM)</div>
                <div style={{ fontSize: '0.85rem', color: '#4ade80', marginTop: '2px' }}>● Fast Doorstep Delivery</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-heading)' }}>Store Address</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                {shop.address}, {shop.area}, {shop.city} {shop.pin ? `- ${shop.pin}` : ''}
              </p>
            </div>

            {/* Reverse Marketplace Callout */}
            <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 'var(--radius-lg)', padding: '22px', marginTop: '28px' }}>
              <div style={{ fontWeight: 800, color: '#4ade80', fontSize: '1.05rem', marginBottom: '4px' }}>
                Looking for something specific or custom quote?
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '14px', lineHeight: 1.5 }}>
                Post a requirement directly to <strong>{shop.name}</strong> or broadcast it across all neighborhood {shop.category} stores.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => onPostRequirement ? onPostRequirement(shop) : setActivePage('requirements')}
              >
                📋 Post Requirement to {shop.name}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: REVIEWS & RATINGS */}
        {activeTab === 'reviews' && (
          <div style={{ maxWidth: '780px' }}>
            {/* Add Review Box */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '28px', marginBottom: '28px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-heading)' }}>Rate & Review {shop.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '18px' }}>Share your neighborhood shopping experience with others.</p>

              {reviewSuccess && (
                <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 600 }}>
                  <CheckIcon size={16} /> Thank you! Your review was submitted successfully.
                </div>
              )}

              <form onSubmit={handleSubmitReview}>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-heading)' }}>Your Rating:</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setRating(num)}
                        style={{ color: num <= rating ? '#eab308' : '#475569' }}
                      >
                        <StarIcon size={24} filled={num <= rating} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Your Feedback / Review *</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Share details about product availability, pricing, doorstep delivery, or shopkeeper response..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Post Customer Review'}
                </button>
              </form>
            </div>

            {/* List of Reviews */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reviews.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No customer reviews yet. Be the first to review {shop.name}!
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-heading)' }}>
                          {r.userName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-heading)' }}>{r.userName || 'Local Customer'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', color: '#eab308' }}>
                        {[...Array(r.rating || 5)].map((_, i) => (
                          <StarIcon key={i} size={15} filled />
                        ))}
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      {r.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
