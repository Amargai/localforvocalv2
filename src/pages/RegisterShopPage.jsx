import React, { useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, SUB_CATEGORIES, SUGGESTED_TAGS } from '../utils/constants';
import { LocationIcon, PlusIcon, CheckIcon } from '../components/Icons';

export function RegisterShopPage({ setActivePage }) {
  const { user, refreshSession, openAuthModal } = useAuth();

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
  const [area, setArea] = useState('Andheri West');
  const [city, setCity] = useState('Mumbai');
  const [pin, setPin] = useState('400058');
  const [tags, setTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('21:00');
  const [openDays, setOpenDays] = useState('Mon - Sun');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80');

  // Location Coordinates
  const [lat, setLat] = useState(19.1136);
  const [lng, setLng] = useState(72.8697);
  const [locDetected, setLocDetected] = useState(false);

  const [uploadingImg, setUploadingImg] = useState(false);

  async function handleUploadShopImg(file) {
    if (!file) return;
    try {
      setUploadingImg(true);
      const formData = new FormData();
      formData.append('image', file);
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

  function handleAddTag(tag) {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  }

  function handleRemoveTag(tag) {
    setTags(tags.filter(t => t !== tag));
  }

  function detectGPS() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocDetected(true);
      });
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
          area: area.trim(),
          city: city.trim(),
          pin: pin.trim(),
          tags,
          latitude: lat,
          longitude: lng,
          businessHours: { open: openTime, close: closeTime, days: openDays },
          images: [imageUrl]
        })
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
                  {CATEGORIES.slice(1).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {SUB_CATEGORIES[category] && (
                <div className="form-group">
                  <label className="form-label">Sub-Category / Speciality</label>
                  <select
                    className="form-select"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                  >
                    <option value="">Select sub-category...</option>
                    {SUB_CATEGORIES[category].map((sub, idx) => (
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
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="10-digit calling number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">WhatsApp Number (For Direct Chat)</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="10-digit WhatsApp number"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
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
                  <label className="form-label">Pin Code</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 400058"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534' }}>GPS Coordinates for Nearby Radius Search</div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                    {locDetected ? `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` : 'Using standard neighborhood center'}
                  </div>
                </div>
                <button type="button" className="btn btn-secondary" onClick={detectGPS} style={{ fontSize: '0.85rem' }}>
                  <LocationIcon className="w-4 h-4" />
                  {locDetected ? 'GPS Updated' : 'Detect GPS'}
                </button>
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
                    if (!phone || !address || !area || !city) alert('Please fill phone, address, area, and city');
                    else setStep(3);
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
                <label className="form-label">Suggested Product/Service Keywords (Click to add)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                  {(SUGGESTED_TAGS[category] || []).map((tag, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => handleAddTag(tag)}
                      className={`badge ${tags.includes(tag) ? 'badge-green' : 'badge-gray'}`}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {tags.includes(tag) ? '✓ ' : '+ '} {tag}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add custom keyword tag..."
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
                    Add
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
