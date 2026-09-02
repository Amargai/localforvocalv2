import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoryContext';
import { RequirementCard } from '../components/RequirementCard';
import { SparklesIcon, CheckIcon, PlusIcon, SearchIcon } from '../components/Icons';
import { cleanPhone, isValidPhone, cleanPositiveNumber } from '../utils/validation';

export function PostRequirementPage({ setActivePage, targetShop, onClearTargetShop, onBack }) {
  const { user, shop, openAuthModal } = useAuth();
  const { rawCategories } = useCategories();

  const [activeTab, setActiveTab] = useState('post'); // 'post' or 'browse'

  // Internal or Prop-based Target Shop state
  const [internalTargetShop, setInternalTargetShop] = useState(targetShop || null);
  const activeTargetShop = targetShop || internalTargetShop;
  const [isDirectToShop, setIsDirectToShop] = useState(Boolean(activeTargetShop));

  // Available shops for in-page targeting
  const [availableShops, setAvailableShops] = useState([]);
  const [showShopPicker, setShowShopPicker] = useState(false);

  // Post Demand Form State
  const [category, setCategory] = useState(activeTargetShop?.category || 'medical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('today');
  const [budget, setBudget] = useState('');
  const [radius, setRadius] = useState(10);
  const [phone, setPhone] = useState(user?.phone || '');
  const [area, setArea] = useState(activeTargetShop?.area || user?.area || 'Andheri West');
  const [city, setCity] = useState(activeTargetShop?.city || user?.city || 'Mumbai');
  const [lat, setLat] = useState(activeTargetShop?.latitude ? Number(activeTargetShop.latitude) : 19.1136);
  const [lng, setLng] = useState(activeTargetShop?.longitude ? Number(activeTargetShop.longitude) : 72.8697);
  const [gpsStatus, setGpsStatus] = useState(activeTargetShop ? `Shop Location Attached 📍 (${activeTargetShop.name})` : '');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdReq, setCreatedReq] = useState(null);

  // Load available shops for in-page selection
  useEffect(() => {
    async function fetchShops() {
      try {
        const res = await api('/shops?limit=100');
        setAvailableShops(res.shops || []);
      } catch (err) {
        console.error('Failed to load shops for selector:', err);
      }
    }
    fetchShops();
  }, []);

  // Sync state when prop targetShop changes
  useEffect(() => {
    if (targetShop) {
      setInternalTargetShop(targetShop);
      setIsDirectToShop(true);
      if (targetShop.category) setCategory(targetShop.category);
      if (targetShop.area) setArea(targetShop.area);
      if (targetShop.city) setCity(targetShop.city);
      if (targetShop.latitude) setLat(Number(targetShop.latitude));
      if (targetShop.longitude) setLng(Number(targetShop.longitude));
      setGpsStatus(`Shop Location Attached 📍 (${targetShop.name})`);
    } else if (!internalTargetShop) {
      setIsDirectToShop(false);
    }
  }, [targetShop]);

  // Sync user profile data when user session finishes loading
  useEffect(() => {
    if (user) {
      if (!phone && user.phone) setPhone(user.phone);
      if ((!area || area === 'Andheri West') && user.area) setArea(user.area);
      if ((!city || city === 'Mumbai') && user.city) setCity(user.city);
    }
  }, [user]);

  function handleSelectTargetShop(chosenShop) {
    if (!chosenShop) {
      handleClearTargetShop();
      return;
    }
    setInternalTargetShop(chosenShop);
    setIsDirectToShop(true);
    if (chosenShop.category) setCategory(chosenShop.category);
    if (chosenShop.area) setArea(chosenShop.area);
    if (chosenShop.city) setCity(chosenShop.city);
    if (chosenShop.latitude) setLat(Number(chosenShop.latitude));
    if (chosenShop.longitude) setLng(Number(chosenShop.longitude));
    setGpsStatus(`Shop Location Attached 📍 (${chosenShop.name})`);
    setShowShopPicker(false);
  }

  function handleClearTargetShop() {
    setInternalTargetShop(null);
    setIsDirectToShop(false);
    setGpsStatus('');
    setShowShopPicker(false);
    if (onClearTargetShop) onClearTargetShop();
  }

  // Community Demands Browse State
  const [allRequirements, setAllRequirements] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    if (activeTab === 'browse') {
      loadCommunityDemands();
    }
  }, [activeTab, filterCategory]);

  async function loadCommunityDemands() {
    try {
      setLoadingReqs(true);
      const url = filterCategory !== 'all' 
        ? `/requirements?category=${encodeURIComponent(filterCategory)}`
        : '/requirements';
      const res = await api(url);
      setAllRequirements(res.requirements || []);
    } catch (err) {
      console.error('Failed to load demands:', err);
    } finally {
      setLoadingReqs(false);
    }
  }

  function handleDetectGps() {
    if ('geolocation' in navigator) {
      setGpsStatus('Locating...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setGpsStatus('GPS Attached ✅');
        },
        () => {
          setGpsStatus('GPS unavailable (using neighborhood)');
        }
      );
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      openAuthModal('otp');
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      alert('Please enter a title for your requirement (minimum 3 characters)');
      return;
    }

    const sanitizedPhone = cleanPhone(phone || user?.phone);
    if (!isValidPhone(sanitizedPhone)) {
      alert('Please enter a valid 10-digit contact mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api('/requirements', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          urgency,
          budget: budget.trim() || undefined,
          radius: Number(radius),
          phone: sanitizedPhone,
          area: area.trim(),
          city: city.trim(),
          latitude: lat,
          longitude: lng,
          targetShopId: (activeTargetShop && isDirectToShop) ? activeTargetShop.id : undefined,
          targetShopName: (activeTargetShop && isDirectToShop) ? activeTargetShop.name : undefined
        })
      });

      setCreatedReq(res.requirement);
      setSubmitted(true);
    } catch (err) {
      alert(err.message || 'Failed to submit requirement');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setTitle('');
    setDescription('');
    setBudget('');
    setSubmitted(false);
    setCreatedReq(null);
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        
        {/* Back navigation button if coming from a shop */}
        {/* Back navigation button if coming from a shop */}
        {activeTargetShop && (
          <div style={{ marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => onBack ? onBack() : setActivePage('explore')}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ← Back to {activeTargetShop.name}
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span className="badge badge-green" style={{ marginBottom: '12px' }}>
            {activeTargetShop ? 'CUSTOM STORE REQUIREMENT' : 'REVERSE NEIGHBORHOOD MARKETPLACE'}
          </span>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '10px' }}>
            {activeTargetShop ? `Request Custom Item from ${activeTargetShop.name}` : 'Tell Your Neighborhood What You Need'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto' }}>
            {activeTargetShop
              ? `Send a direct quote request to ${activeTargetShop.name} or broadcast across your neighborhood.`
              : "Can't find a medicine in stock, need an emergency carpenter, or looking for a specific local service? Broadcast your requirement to nearby shops."}
          </p>
        </div>

        {/* Top Tab Switcher */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
          <button
            className={`btn ${activeTab === 'post' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 24px', fontSize: '0.95rem', borderRadius: '10px' }}
            onClick={() => setActiveTab('post')}
          >
            📢 {activeTargetShop ? 'Post Shop Requirement' : 'Post New Demand'}
          </button>
          <button
            className={`btn ${activeTab === 'browse' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 24px', fontSize: '0.95rem', borderRadius: '10px' }}
            onClick={() => setActiveTab('browse')}
          >
            🎯 Browse Neighborhood Demands
          </button>
        </div>

        {activeTab === 'post' ? (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            {/* TARGET SHOP BANNER & SCOPE SWITCHER */}
            {activeTargetShop ? (
              <div style={{
                background: 'var(--bg-card)',
                border: '1.5px solid var(--primary)',
                borderRadius: 'var(--radius-xl)',
                padding: '22px',
                marginBottom: '24px',
                boxShadow: 'var(--shadow-md)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px', marginBottom: '2px' }}>
                      TARGET STORE SELECTED
                    </div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>
                      {activeTargetShop.name}
                    </h3>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Category: <strong>{activeTargetShop.category?.toUpperCase()}</strong> {activeTargetShop.area ? `• ${activeTargetShop.area}, ${activeTargetShop.city}` : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearTargetShop}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}
                  >
                    ✕ Remove Store Target
                  </button>
                </div>

                {/* Scope Switcher Toggle */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Who should receive this requirement?
                  </label>
                  
                  <div style={{ background: 'var(--bg-input)', padding: '4px', borderRadius: '8px', display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsDirectToShop(true)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        background: isDirectToShop ? 'var(--primary)' : 'transparent',
                        color: isDirectToShop ? '#080911' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isDirectToShop ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      🎯 Send Directly to {activeTargetShop.name} Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDirectToShop(false)}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        background: !isDirectToShop ? 'var(--primary)' : 'transparent',
                        color: !isDirectToShop ? '#080911' : 'var(--text-muted)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: !isDirectToShop ? 'var(--shadow-sm)' : 'none'
                      }}
                    >
                      🌐 Broadcast to All {activeTargetShop.category} Shops in Area
                    </button>
                  </div>
                </div>

                {/* Dynamic Scope Explanation Alert */}
                <div style={{
                  background: isDirectToShop ? 'rgba(34, 197, 94, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                  border: isDirectToShop ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(59, 130, 246, 0.35)',
                  color: isDirectToShop ? '#166534' : '#1e40af',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  lineHeight: 1.45
                }}>
                  {isDirectToShop ? (
                    <>
                      🔒 <strong>Direct Store Request:</strong> This requirement will be sent <strong>exclusively to {activeTargetShop.name}</strong>. Other shops will not see it.
                    </>
                  ) : (
                    <>
                      📢 <strong>Public Marketplace Demand:</strong> This requirement will be <strong>broadcasted to all local {activeTargetShop.category} merchants</strong> in {activeTargetShop.area || area} so you can compare multiple quotes.
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* OPTIONAL TARGET STORE SELECTOR WHEN NONE IS PRE-SELECTED */
              <div style={{
                background: 'var(--bg-card)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '14px 18px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                    🎯 Want to request a quote from a specific local store?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    By default, your requirement is broadcasted to all nearby shops in this category.
                  </div>
                </div>

                {!showShopPicker ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    onClick={() => setShowShopPicker(true)}
                  >
                    + Target Specific Shop
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                    <select
                      className="form-select"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.88rem' }}
                      defaultValue=""
                      onChange={(e) => {
                        const chosen = availableShops.find(s => s.id === e.target.value);
                        if (chosen) handleSelectTargetShop(chosen);
                      }}
                    >
                      <option value="" disabled>Select a local shop to target directly...</option>
                      {availableShops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category.toUpperCase()} • {s.area})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                      onClick={() => setShowShopPicker(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {submitted ? (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '48px 32px',
                textAlign: 'center',
                boxShadow: 'var(--shadow-md)',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '10px', color: 'var(--primary)' }}>
                  {activeTargetShop && isDirectToShop
                    ? `Requirement Sent Directly to ${activeTargetShop.name}!`
                    : 'Requirement Broadcasted Successfully!'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '520px', margin: '0 auto 28px', lineHeight: '1.6' }}>
                  {activeTargetShop && isDirectToShop
                    ? `Your requirement has been sent directly to ${activeTargetShop.name}. The merchant has been notified and can contact you directly.`
                    : `Your requirement has been broadcasted to all active ${category.toUpperCase()} shops within a ${radius} km radius.`}
                </p>

                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'left', marginBottom: '28px', maxWidth: '550px', margin: '0 auto 28px' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px', color: 'var(--text-heading)' }}>{createdReq?.title}</div>
                  {createdReq?.description && (
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{createdReq?.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-amber">Urgency: {createdReq?.urgency}</span>
                    {createdReq?.budget && <span className="badge badge-green">Budget: {createdReq?.budget}</span>}
                    {createdReq?.isDirect && (
                      <span className="badge badge-green" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                        🎯 Direct to: {createdReq?.targetShopName || activeTargetShop?.name}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  {activeTargetShop && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => onBack ? onBack() : setActivePage('explore')}
                    >
                      ← Return to {activeTargetShop.name}
                    </button>
                  )}
                  <button className="btn btn-primary" onClick={handleReset}>
                    <PlusIcon className="w-4 h-4" />
                    Post Another Requirement
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('browse')}>
                    View All Demands
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px',
                boxShadow: 'var(--shadow-md)'
              }}>
                {/* Category Selector */}
                <div className="form-group">
                  <label className="form-label">1. Select Category *</label>
                  <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {rawCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label">2. What are you looking for? (Title) *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={
                      activeTargetShop?.category === 'medical' ? 'e.g. Urgent BP medicine delivery, Baby diapers'
                      : activeTargetShop?.category === 'carpenter' ? 'e.g. Custom 4-seater dining table, door repair'
                      : activeTargetShop?.category === 'bakery' ? 'e.g. 1kg Eggless Black Forest Cake with custom text'
                      : 'e.g. Urgent BP medicine delivery, Need sofa repair carpenter, Birthday cake'
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">3. Description / Details</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Specify dimensions, medicine name/prescription details, timing preferences..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Urgency & Budget Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">4. How Urgent is this?</label>
                    <select className="form-select" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                      <option value="urgent">🚨 Immediate / Emergency</option>
                      <option value="today">⚡ Needed Today</option>
                      <option value="this_week">🗓️ Needed This Week</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">5. Approximate Budget (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. ₹500 - ₹1000"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    />
                  </div>
                </div>

                {/* Broadcast Radius (Only applicable when broadcasting to area) */}
                {(!targetShop || !isDirectToShop) && (
                  <div className="form-group" style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label className="form-label" style={{ marginBottom: 0, color: 'var(--text-heading)' }}>6. Broadcast Radius</label>
                      <strong style={{ color: 'var(--primary)' }}>Within {radius} km</strong>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--primary)' }}
                    />
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Nearby shop owners within this distance will receive your alert.
                    </div>
                  </div>
                )}

                {/* Contact Phone & Area */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Contact Mobile Number *</label>
                      {phone.length > 0 && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isValidPhone(phone) ? '#22c55e' : '#f59e0b' }}>
                          {isValidPhone(phone) ? '✓ 10 digits' : `${phone.length}/10 digits`}
                        </span>
                      )}
                    </div>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 9820011111"
                      value={phone}
                      onChange={(e) => setPhone(cleanPhone(e.target.value))}
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      style={{ borderColor: phone.length === 10 ? (isValidPhone(phone) ? '#22c55e' : '#ef4444') : undefined }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Your Area / Neighborhood</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Andheri West, Bandra"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.85rem', color: '#4ade80' }}>
                    <strong>📍 GPS Proximity:</strong> {gpsStatus || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                    onClick={handleDetectGps}
                  >
                    Attach Current GPS
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '1.05rem', fontWeight: 700, borderRadius: 'var(--radius-md)', marginTop: '10px' }}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Submitting...'
                    : (targetShop && isDirectToShop)
                    ? `🎯 Send Direct Request to ${targetShop.name}`
                    : '📢 Broadcast Requirement to Neighborhood'}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* TAB 2: BROWSE DEMANDS WITH CATEGORY FILTER */
          <div>
            {/* Filter Bar */}
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
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)' }}>Filter by Category:</span>
                <select
                  className="form-select"
                  style={{ width: 'auto', minWidth: '180px', padding: '6px 12px' }}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">🌟 All Categories</option>
                  {rawCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>

                {/* Quick 1-Click Filter for Logged-In Shop Owner */}
                {shop?.category && (
                  <button
                    className={`btn ${filterCategory === shop.category ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => setFilterCategory(filterCategory === shop.category ? 'all' : shop.category)}
                  >
                    🎯 My Shop's Category ({shop.category.toUpperCase()})
                  </button>
                )}
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Showing <strong>{allRequirements.length}</strong> active demands
              </div>
            </div>

            {/* Demand Cards List */}
            {loadingReqs ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                Scanning neighborhood demands...
              </div>
            ) : allRequirements.length === 0 ? (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '50px 20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎯</div>
                <h3 style={{ fontWeight: 700, marginBottom: '6px' }}>No active demands found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  {filterCategory !== 'all' ? `No demands currently posted under the "${filterCategory}" category.` : 'No demands posted yet.'}
                </p>
                {filterCategory !== 'all' && (
                  <button className="btn btn-secondary" onClick={() => setFilterCategory('all')}>
                    View All Categories
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {allRequirements.map((req) => (
                  <RequirementCard
                    key={req.id}
                    requirement={req}
                    onRefresh={loadCommunityDemands}
                    setActivePage={setActivePage}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

