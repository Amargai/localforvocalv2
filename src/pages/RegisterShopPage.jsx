import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoryContext';
import { LocationIcon, PlusIcon, CheckIcon } from '../components/Icons';
import { reverseGeocode, setUserSavedLocation, getUserSavedLocation, getCurrentBrowserPosition } from '../utils/geo';
import { compressImage } from '../utils/image';
import { cleanPhone, isValidPhone, cleanPin, isValidPin } from '../utils/validation';

export function RegisterShopPage({ setActivePage }) {
  const { user, refreshSession, openAuthModal } = useAuth();
  const { rawCategories, subCategoriesMap, suggestedTagsMap } = useCategories();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('medical');
  const [subCategory, setSubCategory] = useState('');
  const [ownerName, setOwnerName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState(() => {
    const saved = getUserSavedLocation();
    return saved?.area && saved?.area !== 'Current Location' ? saved.area : '';
  });
  const [city, setCity] = useState(() => {
    const saved = getUserSavedLocation();
    return saved?.city && saved?.city !== 'Near You' ? saved.city : '';
  });
  const [pin, setPin] = useState('');
  const [tags, setTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [openDays, setOpenDays] = useState('Mon - Sun');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80');

  // Location Coordinates
  const [lat, setLat] = useState(() => {
    const saved = getUserSavedLocation();
    return saved?.lat || 19.1136;
  });
  const [lng, setLng] = useState(() => {
    const saved = getUserSavedLocation();
    return saved?.lng || 72.8697;
  });
  const [locDetected, setLocDetected] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState('');

  const [uploadingImg, setUploadingImg] = useState(false);

  async function handleUploadShopImg(file) {
    if (!file) return;
    try {
      setUploadingImg(true);
      const optimizedFile = await compressImage(file);
      const formData = new FormData();
      formData.append('image', optimizedFile);
      const res = await api('/uploads', {
        method: 'POST',
        body: formData
      });
      setImageUrl(res.url);
    } catch (err) {
      alert(err.message || 'Image upload failed');
    } finally {
      setUploadingImg(false);
    }
  }

  function handleToggleTag(tag) {
    if (!tag) return;
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    if (tags.includes(cleanTag)) {
      setTags(tags.filter(t => t !== cleanTag));
    } else {
      setTags([...tags, cleanTag]);
    }
  }

  function handleAddTag(tag) {
    if (!tag) return;
    const cleanTag = tag.trim();
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
  }

  function handleRemoveTag(tag) {
    setTags(tags.filter(t => t !== tag));
  }

  async function detectGPS() {
    try {
      setDetectingGps(true);
      setGpsStatusMsg('Fetching exact GPS...');
      const pos = await getCurrentBrowserPosition();
      const newLat = Number(pos.lat);
      const newLng = Number(pos.lng);
      setLat(newLat);
      setLng(newLng);
      setLocDetected(true);
      setGpsStatusMsg(`Lat: ${newLat.toFixed(4)}, Lng: ${newLng.toFixed(4)}`);

      // Reverse geocode to auto-populate area/city/pin
      const geo = await reverseGeocode(newLat, newLng);
      if (geo) {
        if (geo.area && (!area || area === 'Andheri West')) setArea(geo.area);
        if (geo.city && (!city || city === 'Mumbai')) setCity(geo.city);
        if (geo.pin && !pin) setPin(geo.pin);
      }

      setUserSavedLocation({
        lat: newLat,
        lng: newLng,
        area: geo?.area || area || 'Current Location',
        city: geo?.city || city || 'Near You',
        pin: geo?.pin || pin || ''
      });
    } catch (err) {
      setGpsStatusMsg('GPS permission denied or unavailable');
    } finally {
      setDetectingGps(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) {
      openAuthModal('demo');
      return;
    }

    try {
      setSubmitting(true);
      const cleanLat = Number(lat) || 19.1136;
      const cleanLng = Number(lng) || 72.8697;
      const cleanArea = area.trim() || 'Neighborhood';
      const cleanCity = city.trim() || 'Your City';

      await api('/shops', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          category,
          subCategory: subCategory || undefined,
          ownerName: ownerName.trim(),
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || phone.trim(),
          address: address.trim(),
          area: cleanArea,
          city: cleanCity,
          pin: pin.trim(),
          tags,
          latitude: cleanLat,
          longitude: cleanLng,
          businessHours: { open: openTime, close: closeTime, days: openDays },
          images: [imageUrl]
        })
      });

      // Save user location so Explore and other pages center on the newly created shop
      setUserSavedLocation({
        lat: cleanLat,
        lng: cleanLng,
        area: cleanArea,
        city: cleanCity,
        pin: pin.trim()
      });

      await refreshSession();
      setActivePage('dashboard');
    } catch (err) {
      alert(err.message || 'Failed to register shop');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container" style={{ maxWidth: '750px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="badge badge-green" style={{ marginBottom: '8px' }}>FOR BUSINESS OWNERS</span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>List Your Shop on Local for Vocal</h1>
          <p style={{ color: 'var(--text-muted)' }}>Reach thousands of nearby residents looking for your products and services.</p>
        </div>

        {/* Step Wizard Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
          {['1. Business Info', '2. Location & Contact', '3. Timings & Catalog'].map((label, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                textAlign: 'center',
                paddingBottom: '8px',
                borderBottom: step === idx + 1 ? '3px solid var(--primary)' : '2px solid #e2e8f0',
                color: step === idx + 1 ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '36px', boxShadow: 'var(--shadow-md)' }}>
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Business Details</h3>

              <div className="form-group">
                <label className="form-label">Shop / Business Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Care & Cure Chemist, Verma Wood Crafts"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Main Category *</label>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setSubCategory(''); }}
                >
                  {rawCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {subCategoriesMap[category] && subCategoriesMap[category].length > 0 && (
                <div className="form-group">
                  <label className="form-label">Sub-Category / Speciality</label>
                  <select
                    className="form-select"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                  >
                    <option value="">Select sub-category...</option>
                    {subCategoriesMap[category].map((sub, idx) => (
                      <option key={idx} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Owner / Contact Person Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rajesh Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
                onClick={() => {
                  if (!name || !ownerName) alert('Please fill shop name and owner name');
                  else setStep(2);
                }}
              >
                Continue to Location & Contact →
              </button>
            </div>
          )}

          {/* STEP 2: Location & Contact */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Location & Contact Numbers</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Phone Number *</label>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>WhatsApp Number</label>
                    {whatsapp.length > 0 && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isValidPhone(whatsapp) ? '#22c55e' : '#f59e0b' }}>
                        {isValidPhone(whatsapp) ? '✓ 10 digits' : `${whatsapp.length}/10 digits`}
                      </span>
                    )}
                  </div>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="10-digit WhatsApp number"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(cleanPhone(e.target.value))}
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    style={{ borderColor: whatsapp.length === 10 ? (isValidPhone(whatsapp) ? '#22c55e' : '#ef4444') : undefined }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Shop Address / Street Details *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Shop 4, Green Plaza, Opp. City Station"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Area / Locality *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Andheri West"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Pin Code</label>
                    {pin.length > 0 && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isValidPin(pin) ? '#22c55e' : '#f59e0b' }}>
                        {isValidPin(pin) ? '✓ 6 digits' : `${pin.length}/6`}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 400058"
                    value={pin}
                    onChange={(e) => setPin(cleanPin(e.target.value))}
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    style={{ borderColor: pin.length === 6 ? (isValidPin(pin) ? '#22c55e' : '#ef4444') : undefined }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📍 Exact GPS Coordinates</span>
                      <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Radius Search</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {gpsStatusMsg || (locDetected ? `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` : 'Auto-detect your shop location or enter below')}
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={detectGPS} 
                    disabled={detectingGps}
                    style={{ fontSize: '0.84rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <LocationIcon className="w-4 h-4" />
                    {detectingGps ? 'Locating...' : locDetected ? 'Re-Detect GPS' : 'Detect GPS'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 17.3715"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 73.9008"
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                  onClick={() => {
                    if (!phone || !isValidPhone(phone)) {
                      alert('Please enter a valid 10-digit calling phone number starting with 6, 7, 8, or 9');
                      return;
                    }
                    if (whatsapp && !isValidPhone(whatsapp)) {
                      alert('Please enter a valid 10-digit WhatsApp number starting with 6, 7, 8, or 9');
                      return;
                    }
                    if (pin && !isValidPin(pin)) {
                      alert('Please enter a valid 6-digit postal PIN code');
                      return;
                    }
                    if (!address.trim() || address.trim().length < 5) {
                      alert('Please provide a complete shop address (minimum 5 characters)');
                      return;
                    }
                    if (!area.trim() || !city.trim()) {
                      alert('Please fill area and city');
                      return;
                    }
                    setStep(3);
                  }}
                >
                  Continue to Timings & Tags →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Timings, Tags, Photo */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Business Hours & Catalog Tags</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Opening Time</label>
                  <input type="time" className="form-input" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Closing Time</label>
                  <input type="time" className="form-input" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Working Days</label>
                  <input type="text" className="form-input" value={openDays} onChange={(e) => setOpenDays(e.target.value)} />
                </div>
              </div>

              {/* Suggested Tags */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Service & Product Keywords (Click to toggle on/off)</label>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{tags.length} selected</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {(suggestedTagsMap[category] || []).map((tag, idx) => {
                    const isSelected = tags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleToggleTag(tag)}
                        className={`badge ${isSelected ? 'badge-green' : 'badge-gray'}`}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #22c55e' : '1px solid var(--border)',
                          transition: 'all 0.15s ease'
                        }}
                        title={isSelected ? 'Click to deselect' : 'Click to select'}
                      >
                        {isSelected ? '✓ ' : '+ '} {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Selected keywords display */}
                {tags.length > 0 && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Active Keywords on Shop Profile:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="badge badge-green"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>{tag}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#15803d',
                              cursor: 'pointer',
                              fontWeight: 900,
                              padding: 0,
                              lineHeight: 1,
                              fontSize: '0.85rem'
                            }}
                            title={`Remove ${tag}`}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add custom keyword tag (e.g. 24hr Home Delivery)..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customTagInput.trim()) {
                          handleAddTag(customTagInput.trim());
                          setCustomTagInput('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (customTagInput.trim()) {
                        handleAddTag(customTagInput.trim());
                        setCustomTagInput('');
                      }
                    }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Photo Image URL & Upload */}
              <div className="form-group">
                <label className="form-label">Storefront / Catalog Photo (Upload or Paste URL)</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <label className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📁 {uploadingImg ? 'Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadShopImg(e.target.files[0]);
                        }
                      }}
                      disabled={uploadingImg}
                    />
                  </label>
                </div>
                {imageUrl && (
                  <div style={{ position: 'relative', width: '120px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img src={imageUrl} alt="Storefront preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 2, padding: '14px', fontSize: '1rem', fontWeight: 700 }}
                  disabled={submitting}
                >
                  {submitting ? 'Registering Shop...' : '🚀 Publish Shop Listing'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
