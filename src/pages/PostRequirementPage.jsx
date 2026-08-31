import React, { useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES } from '../utils/constants';
import { SparklesIcon, CheckIcon, PlusIcon } from '../components/Icons';

export function PostRequirementPage({ setActivePage }) {
  const { user, openAuthModal } = useAuth();

  const [category, setCategory] = useState('medical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('today');
  const [budget, setBudget] = useState('');
  const [radius, setRadius] = useState(10);
  const [phone, setPhone] = useState(user?.phone || '');
  const [area, setArea] = useState(user?.area || 'Andheri West');
  const [city, setCity] = useState(user?.city || 'Mumbai');
  const [lat, setLat] = useState(19.1136);
  const [lng, setLng] = useState(72.8697);
  const [gpsStatus, setGpsStatus] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdReq, setCreatedReq] = useState(null);

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
      openAuthModal('demo');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a title for your requirement');
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
          phone: phone.trim() || user.phone,
          area: area.trim(),
          city: city.trim(),
          latitude: lat,
          longitude: lng
        })
      });

      setCreatedReq(res.requirement);
      setSubmitted(true);
    } catch (err) {
      alert(err.message || 'Failed to broadcast requirement');
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
      <div className="container" style={{ maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <span className="badge badge-green" style={{ marginBottom: '12px' }}>
            REVERSE NEIGHBORHOOD MARKETPLACE
          </span>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '10px' }}>
            Tell Your Neighborhood What You Need
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Can't find a medicine in stock, need an emergency carpenter, or looking for specific local service? Broadcast your requirement to nearby shops.
          </p>
        </div>

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
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🎉</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '10px', color: 'var(--primary)' }}>
              Requirement Broadcasted Successfully!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 28px', lineHeight: '1.6' }}>
              Your requirement has been broadcasted to all active <strong>{category.toUpperCase()}</strong> shops within a <strong>{radius} km</strong> radius.
            </p>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'left', marginBottom: '28px', maxWidth: '550px', margin: '0 auto 28px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px', color: 'var(--text-heading)' }}>{createdReq?.title}</div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{createdReq?.description}</div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                <span className="badge badge-amber">Urgency: {createdReq?.urgency}</span>
                {createdReq?.budget && <span className="badge badge-green">Budget: {createdReq?.budget}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button className="btn btn-primary" onClick={handleReset}>
                <PlusIcon className="w-4 h-4" />
                Post Another Requirement
              </button>
              <button className="btn btn-secondary" onClick={() => setActivePage('home')}>
                Return to Home
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
                {CATEGORIES.slice(1).map((c) => (
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
                placeholder="e.g. Urgent BP medicine delivery, Need sofa repair carpenter, Birthday cake"
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

            {/* Broadcast Radius */}
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

            {/* Contact Phone & Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Contact Mobile Number *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="10-digit phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
              {submitting ? 'Broadcasting...' : '📢 Broadcast Requirement to Neighborhood'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
