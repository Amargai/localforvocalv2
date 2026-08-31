import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { LocationIcon, PhoneIcon, WhatsappIcon } from './Icons';

export function RequirementCard({ requirement, onRefresh }) {
  const { user, openAuthModal } = useAuth();
  const [responseMsg, setResponseMsg] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [showResponseBox, setShowResponseBox] = useState(false);

  const urgencyColors = {
    urgent: { bg: '#fee2e2', text: '#b91c1c', label: '🚨 Immediate / Urgent' },
    today: { bg: '#fef3c7', text: '#b45309', label: '⚡ Needed Today' },
    this_week: { bg: '#dbeafe', text: '#1d4ed8', label: '🗓️ Needed This Week' }
  };

  const urgencyInfo = urgencyColors[requirement.urgency] || urgencyColors.today;

  async function handleSendResponse(e) {
    e.preventDefault();
    if (!user) {
      openAuthModal('demo');
      return;
    }
    if (!responseMsg.trim()) return;

    try {
      setIsResponding(true);
      await api(`/requirements/${requirement.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ message: responseMsg })
      });
      setResponseMsg('');
      setShowResponseBox(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to send response');
    } finally {
      setIsResponding(false);
    }
  }

  return (
    <article style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <span className="badge badge-green">{requirement.category.toUpperCase()}</span>
          <span className="badge" style={{ background: urgencyInfo.bg, color: urgencyInfo.text }}>
            {urgencyInfo.label}
          </span>
          {requirement.distanceKm !== undefined && requirement.distanceKm !== null && (
            <span className="badge badge-blue">📍 {requirement.distanceKm} km away</span>
          )}
        </div>

        {requirement.budget && (
          <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', background: 'rgba(34, 197, 94, 0.12)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
            Budget: {requirement.budget}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-heading)' }}>
          {requirement.title}
        </h3>
        {requirement.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.5' }}>
            {requirement.description}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <LocationIcon className="w-4 h-4" />
          <span>{requirement.area || 'Neighborhood'}, {requirement.city}</span>
        </div>

        <div>
          Posted by <strong style={{ color: 'var(--text-heading)' }}>{requirement.customerName}</strong>
        </div>
      </div>

      {/* Responses Section */}
      {requirement.responses && requirement.responses.length > 0 && (
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Shop Responses ({requirement.responses.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {requirement.responses.map((resp, idx) => (
              <div key={idx} style={{ background: 'var(--bg-surface)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{resp.shopName}</div>
                <div style={{ color: 'var(--text-main)' }}>{resp.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '6px' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, padding: '8px 14px', fontSize: '0.88rem' }}
          onClick={() => setShowResponseBox(!showResponseBox)}
        >
          💬 {showResponseBox ? 'Cancel Response' : 'Respond as Shop'}
        </button>

        <a
          href={`tel:${requirement.phone}`}
          className="btn btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.88rem' }}
        >
          <PhoneIcon className="w-4 h-4" />
          Call
        </a>

        <a
          href={`https://wa.me/91${requirement.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${requirement.customerName}, regarding your requirement "${requirement.title}" on Local for Vocal:`)}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-whatsapp"
          style={{ padding: '8px 14px', fontSize: '0.88rem' }}
        >
          <WhatsappIcon className="w-4 h-4" />
        </a>
      </div>

      {showResponseBox && (
        <form onSubmit={handleSendResponse} style={{ marginTop: '8px', animation: 'fadeIn 0.2s ease' }}>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Tell the customer if you have this in stock or when you can service..."
            value={responseMsg}
            onChange={(e) => setResponseMsg(e.target.value)}
            style={{ marginBottom: '8px' }}
            required
          />
          <button type="submit" className="btn btn-accent" style={{ padding: '6px 16px', fontSize: '0.85rem' }} disabled={isResponding}>
            {isResponding ? 'Sending...' : 'Send Response to Customer'}
          </button>
        </form>
      )}
    </article>
  );
}
