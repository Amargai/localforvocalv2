import React, { useState } from 'react';
import { XIcon, CheckIcon, SparklesIcon, WhatsappIcon, StarIcon } from './Icons';

export function CounterQrModal({ shop, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !shop) return null;

  // Build direct shareable storefront URL with hash routing (using encrypted URL token)
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://localforvocal.in';
  const shopToken = shop.publicId || shop.id;
  const storefrontUrl = `${baseUrl.replace(/\/$/, '')}/#shop/${shopToken}`;

  // High-res QR code image URL (zero cloud bill, public SVG/PNG API)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(storefrontUrl)}`;

  function handleCopy() {
    navigator.clipboard.writeText(storefrontUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)'
        }}
      >
        {/* Modal Header Controls (Hidden during print) */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card-hover)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🖨️</span>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-heading)' }}>Counter Standee QR Card</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '8px' }}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Standee Card Body */}
        <div style={{ padding: '24px' }}>
          <div
            id="printable-counter-standee"
            style={{
              background: '#ffffff',
              color: '#090a0f',
              borderRadius: '20px',
              padding: '32px 24px',
              textAlign: 'center',
              border: '3px solid #10b981',
              boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
              position: 'relative'
            }}
          >
            {/* Top Branding Pill */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '4px 14px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '14px' }}>
              <span>🌿</span> Verified Neighborhood Partner
            </div>

            {/* Shop Header */}
            <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#090a0f', margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {shop.name}
            </h2>
            <div style={{ fontSize: '0.88rem', color: '#4b5563', fontWeight: 600, marginBottom: '8px' }}>
              📍 {shop.area}{shop.city ? `, ${shop.city}` : ''}
            </div>

            {/* Rating Pill */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#92400e', padding: '2px 10px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 800, marginBottom: '20px' }}>
              ⭐ {Number(shop.rating || 5.0).toFixed(1)} / 5.0 Verified Local Rating
            </div>

            {/* QR Code Container */}
            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '16px', display: 'inline-block', border: '2px dashed #d1d5db', marginBottom: '16px' }}>
              <img
                src={qrCodeUrl}
                alt={`QR Code for ${shop.name}`}
                style={{ width: '210px', height: '210px', display: 'block', margin: '0 auto', borderRadius: '8px' }}
              />
            </div>

            {/* Scan Instructions Callout */}
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '12px 16px', marginBottom: '18px' }}>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
                📸 Scan with Any Phone Camera
              </div>
              <div style={{ fontSize: '0.82rem', color: '#15803d', lineHeight: 1.4 }}>
                Browse our price list, exclusive flash deals, and order directly on WhatsApp with instant home delivery!
              </div>
            </div>

            {/* Footer Contact Bar */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 700, color: '#1f2937' }}>
              <span style={{ color: '#25D366', fontSize: '1.1rem' }}>💬</span>
              <span>WhatsApp / Orders: <strong>+91 {shop.whatsapp || shop.phone}</strong></span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden during print) */}
        <div className="no-print" style={{ padding: '16px 24px', background: 'var(--bg-card-hover)', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCopy}
            style={{ fontSize: '0.88rem' }}
          >
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4" style={{ color: '#22c55e' }} />
                Copied Link!
              </>
            ) : (
              '📋 Copy Storefront Link'
            )}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
            style={{ fontSize: '0.88rem', padding: '10px 20px' }}
          >
            🖨️ Print Standee (A4 / Card)
          </button>
        </div>
      </div>
    </div>
  );
}
