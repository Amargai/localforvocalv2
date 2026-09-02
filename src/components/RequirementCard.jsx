import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { LocationIcon, PhoneIcon, WhatsappIcon, CheckIcon } from './Icons';

export function RequirementCard({ requirement, onRefresh, setActivePage }) {
  const { user, shop, openAuthModal } = useAuth();
  const [responseMsg, setResponseMsg] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [showResponseBox, setShowResponseBox] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const urgencyColors = {
    urgent: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', text: '#f87171', label: '🚨 Immediate / Urgent' },
    today: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', text: '#fbbf24', label: '⚡ Needed Today' },
    this_week: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: '#60a5fa', label: '🗓️ Needed This Week' }
  };

  const urgencyInfo = urgencyColors[requirement.urgency] || urgencyColors.today;

  // Role and Category Checks
  const isOwner = Boolean(user && requirement && user.id === requirement.customerId);
  const isAdmin = Boolean(user?.accountType === 'admin');
  const isShopOwner = Boolean(shop || user?.accountType === 'shop_owner');
  
  const isDirectTarget = Boolean(requirement.targetShopId || requirement.isDirect);
  const isMyTargetShop = Boolean(shop && requirement.targetShopId && shop.id === requirement.targetShopId);
  const isOtherShopDirect = Boolean(shop && requirement.targetShopId && shop.id !== requirement.targetShopId);

  const shopCat = shop?.category?.trim().toLowerCase();
  const reqCat = requirement?.category?.trim().toLowerCase();
  const categoryMatches = Boolean(shopCat && reqCat && (shopCat === reqCat || reqCat === 'all' || reqCat === 'other' || reqCat === 'general'));
  
  // Responding permissions
  const canRespond = isDirectTarget
    ? (isMyTargetShop && !isOwner) || isAdmin
    : (isShopOwner && categoryMatches && !isOwner) || isAdmin;

  const isCategoryMismatch = !isDirectTarget && isShopOwner && !categoryMatches && !isAdmin && !isOwner;
  const isNormalUser = Boolean(user && !isShopOwner && !isAdmin && !isOwner);

  // Check if current shop already replied
  const myResponse = shop ? (requirement.responses || []).find(r => r.shopId === shop.id) : null;

  async function handleSendResponse(e) {
    e.preventDefault();
    if (!user) {
      openAuthModal('demo');
      return;
    }

    if (!canRespond) {
      alert('Only the targeted shop or verified shops in this category can respond to this requirement.');
      return;
    }

    if (!responseMsg.trim()) return;

    try {
      setIsResponding(true);
      await api(`/requirements/${requirement.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ message: responseMsg.trim() })
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

  async function handleToggleStatus(newStatus) {
    try {
      setUpdatingStatus(true);
      await api(`/requirements/${requirement.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this requirement?')) return;
    try {
      await api(`/requirements/${requirement.id}`, { method: 'DELETE' });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to delete requirement');
    }
  }

  function handleOpenResponseBox() {
    if (!showResponseBox && myResponse) {
      setResponseMsg(myResponse.message || '');
    }
    setShowResponseBox(!showResponseBox);
  }

  return (
    <article style={{
      background: 'var(--bg-card)',
      border: isMyTargetShop
        ? '1.5px solid var(--primary)'
        : isOwner
        ? '1px solid rgba(34, 197, 94, 0.4)'
        : '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: isMyTargetShop ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      position: 'relative'
    }}>
      {/* Top Header Tags */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span className="badge badge-green" style={{ textTransform: 'uppercase', fontWeight: 800 }}>
            {requirement.category}
          </span>
          <span className="badge" style={{ background: urgencyInfo.bg, color: urgencyInfo.text, border: `1px solid ${urgencyInfo.border}` }}>
            {urgencyInfo.label}
          </span>
          {requirement.distanceKm !== undefined && requirement.distanceKm !== null && (
            <span className="badge badge-blue">📍 {requirement.distanceKm} km away</span>
          )}
          {isMyTargetShop && (
            <span className="badge badge-green" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)', fontWeight: 800 }}>
              🎯 DIRECT REQUEST TO YOUR SHOP
            </span>
          )}
          {!isMyTargetShop && requirement.isDirect && !isOwner && (
            <span className="badge badge-amber" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              🎯 Direct to: {requirement.targetShopName || 'Specific Shop'}
            </span>
          )}
          {isOwner && (
            <span className="badge badge-green" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}>
              👤 Your Posted Demand {requirement.isDirect && `(Direct to ${requirement.targetShopName || 'Shop'})`}
            </span>
          )}
          {!isDirectTarget && canRespond && (
            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              🎯 Category Matched
            </span>
          )}
          {isCategoryMismatch && (
            <span className="badge badge-gray" style={{ background: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8' }}>
              🔒 Other Category
            </span>
          )}
        </div>

        {requirement.budget && (
          <div style={{
            fontWeight: 700,
            color: 'var(--primary)',
            fontSize: '0.92rem',
            background: 'rgba(34, 197, 94, 0.12)',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            whiteSpace: 'nowrap'
          }}>
            Budget: {requirement.budget}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-heading)' }}>
          {requirement.title}
        </h3>
        {requirement.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.5', margin: 0 }}>
            {requirement.description}
          </p>
        )}
      </div>

      {/* Location & Posted By */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--border)',
        paddingTop: '12px',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <LocationIcon className="w-4 h-4" />
          <span>{requirement.area || 'Neighborhood'}, {requirement.city}</span>
        </div>

        <div>
          Posted by <strong style={{ color: 'var(--text-heading)' }}>{requirement.customerName}</strong>
        </div>
      </div>

      {/* Responses / Quotes Received Section */}
      {requirement.responses && requirement.responses.length > 0 && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🏪 Verified Shop Quotes ({requirement.responses.length})
            </div>
            {myResponse && (
              <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                ✓ You Responded
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {requirement.responses.map((resp, idx) => (
              <div
                key={resp.id || idx}
                style={{
                  background: 'var(--bg-card)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: resp.shopId === shop?.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                  fontSize: '0.86rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong style={{ color: 'var(--primary)' }}>{resp.shopName}</strong>
                    {resp.shopCategory && (
                      <span className="badge badge-blue" style={{ fontSize: '0.66rem', padding: '0 5px' }}>
                        {resp.shopCategory}
                      </span>
                    )}
                    {resp.shopArea && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        • {resp.shopArea}
                      </span>
                    )}
                  </div>
                  {resp.at && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(resp.at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
                  {resp.message}
                </div>

                {/* Direct Action for Buyer to Contact the Responding Shop */}
                {isOwner && resp.shopPhone && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border)' }}>
                    <a
                      href={`tel:${resp.shopPhone}`}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.76rem', gap: '4px' }}
                    >
                      <PhoneIcon className="w-3.5 h-3.5" /> Call Shop ({resp.shopPhone})
                    </a>
                    <a
                      href={`https://wa.me/91${String(resp.shopPhone).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi ${resp.shopName}, I received your quote on Local4Vocal for "${requirement.title}". Let's finalize:`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-whatsapp"
                      style={{ padding: '4px 10px', fontSize: '0.76rem', gap: '4px' }}
                    >
                      <WhatsappIcon className="w-3.5 h-3.5" /> WhatsApp Shop
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTION & RESPONSE SECTION (Strictly Role & Category Governed) */}
      <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
        {/* CASE 1: Creator of the Requirement (Buyer / Customer) */}
        {isOwner ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Status: <strong style={{ color: requirement.status === 'fulfilled' ? '#4ade80' : 'var(--text-heading)' }}>
                {requirement.status === 'fulfilled' ? '✅ Fulfilled' : '🟢 Open for Shop Quotes'}
              </strong>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {requirement.status === 'open' ? (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#4ade80' }}
                  onClick={() => handleToggleStatus('fulfilled')}
                  disabled={updatingStatus}
                >
                  <CheckIcon className="w-3.5 h-3.5" /> Mark Fulfilled
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => handleToggleStatus('open')}
                  disabled={updatingStatus}
                >
                  Reopen
                </button>
              )}

              <button
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#f87171' }}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        ) : canRespond ? (
          /* CASE 2: Verified Shop Owner with Matching Category */
          <div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className={`btn ${myResponse ? 'btn-secondary' : 'btn-primary'}`}
                style={{ flex: 1, padding: '8px 14px', fontSize: '0.88rem' }}
                onClick={handleOpenResponseBox}
              >
                💬 {showResponseBox ? 'Cancel' : myResponse ? '✏️ Edit Your Quote' : `Send Quote as ${shop?.name || 'Shop'}`}
              </button>

              <a
                href={`tel:${requirement.phone}`}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
                title="Call Customer"
              >
                <PhoneIcon className="w-4 h-4" />
                <span className="hidden-mobile">Call</span>
              </a>

              <a
                href={`https://wa.me/91${String(requirement.phone).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Hi ${requirement.customerName}, regarding your demand "${requirement.title}" in ${requirement.category} on Local4Vocal from ${shop?.name || 'our shop'}:`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-whatsapp"
                style={{ padding: '8px 14px', fontSize: '0.88rem' }}
                title="WhatsApp Customer"
              >
                <WhatsappIcon className="w-4 h-4" />
              </a>
            </div>

            {showResponseBox && (
              <form onSubmit={handleSendResponse} style={{ marginTop: '12px', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ fontSize: '0.78rem', color: '#93c5fd', marginBottom: '6px', fontWeight: 600 }}>
                  Replying as: <strong>{shop?.name || user.name}</strong> ({shop?.category?.toUpperCase() || requirement.category?.toUpperCase()})
                </div>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder={`Hi ${requirement.customerName}, we have this in stock at ₹... / We can service this by today at your address...`}
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                  style={{ marginBottom: '8px', fontSize: '0.88rem' }}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                    onClick={() => setShowResponseBox(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                    disabled={isResponding}
                  >
                    {isResponding ? 'Sending Quote...' : myResponse ? 'Update Quote' : 'Send Quote to Buyer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : isOtherShopDirect ? (
          /* CASE 3: Shop Owner but requirement was sent directly and exclusively to another shop */
          <div style={{
            background: 'rgba(245, 158, 11, 0.04)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#fbbf24'
          }}>
            🔒 <strong>Direct Store Request:</strong> This demand was sent directly and exclusively to <strong>{requirement.targetShopName || 'another store'}</strong>. Only the targeted merchant can respond.
          </div>
        ) : isCategoryMismatch ? (
          /* CASE 4: Shop Owner but DIFFERENT Category */
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              🔒 <strong>Category Restricted:</strong> Only <strong>{requirement.category.toUpperCase()}</strong> shops can quote. Your shop is in <strong>{shop?.category?.toUpperCase()}</strong>.
            </div>
          </div>
        ) : isNormalUser ? (
          /* CASE 4: Normal Shopper / Customer Account */
          <div style={{
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#93c5fd', lineHeight: '1.4' }}>
              🏪 <strong>Shop-Only Quoting:</strong> Only verified local <strong>{requirement.category.toUpperCase()}</strong> shops can respond to buyer demands.
            </div>
            {setActivePage && (
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                onClick={() => setActivePage('register-shop')}
              >
                + Register Shop
              </button>
            )}
          </div>
        ) : (
          /* CASE 5: Unauthenticated Guest */
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Are you a local <strong>{requirement.category.toUpperCase()}</strong> business?
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => openAuthModal('demo')}
            >
              🏪 Log in as Shop to Quote
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
