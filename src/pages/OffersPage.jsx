import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { WhatsappIcon, PhoneIcon, LocationIcon, SparklesIcon, PlusIcon } from '../components/Icons';

export function OffersPage({ onSelectShop }) {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);

  // Post offer form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discount, setDiscount] = useState('');
  const [validTill, setValidTill] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadOffers();
  }, []);

  async function loadOffers() {
    try {
      setLoading(true);
      const data = await api('/offers');
      setOffers(data.offers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePostOffer(e) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setPosting(true);
      await api('/offers', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          discount: discount.trim(),
          validTill: validTill.trim()
        })
      });
      setShowPostModal(false);
      setTitle('');
      setDescription('');
      setDiscount('');
      setValidTill('');
      await loadOffers();
    } catch (err) {
      alert(err.message || 'Failed to post offer');
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteOffer(offerId) {
    if (!confirm('Are you sure you want to remove this offer?')) return;
    try {
      await api(`/offers/${offerId}`, { method: 'DELETE' });
      await loadOffers();
    } catch (err) {
      alert(err.message || 'Failed to delete offer');
    }
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' }}>
          <div>
            <span className="badge badge-amber" style={{ marginBottom: '8px' }}>🔥 NEIGHBORHOOD DISCOUNTS & DEALS</span>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Local Offers & Flash Deals</h1>
            <p style={{ color: 'var(--text-muted)' }}>Exclusive neighborhood savings from shops near your area.</p>
          </div>

          {user?.accountType === 'shop_owner' && (
            <button className="btn btn-primary" onClick={() => setShowPostModal(true)}>
              <PlusIcon className="w-5 h-5" />
              Post a Deal for Your Shop
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>Finding active neighborhood offers...</div>
        ) : offers.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🎁</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-heading)' }}>No active flash deals right now</h3>
            <p style={{ color: 'var(--text-muted)' }}>Check back soon or ask your local shopkeeper to post their promotions on Local for Vocal!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
            {offers.map((offer) => (
              <div
                key={offer.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ background: 'linear-gradient(135deg, #0d2818 0%, #15803d 100%)', color: 'white', padding: '20px 24px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                      {offer.category.toUpperCase()}
                    </span>
                    <div style={{ background: '#fef08a', color: '#854d0e', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.88rem' }}>
                      {offer.discount || 'Special Offer'}
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: '1.3' }}>{offer.title}</h3>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {offer.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '16px' }}>
                      {offer.description}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                      <strong style={{ color: 'var(--text-heading)' }}>{offer.shopName}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>⏳ {offer.validTill || 'Limited Period'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <LocationIcon className="w-3.5 h-3.5" />
                      <span>{offer.area}, {offer.city}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <a
                        href={`https://wa.me/91${(offer.whatsapp || offer.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${offer.shopName}, I want to claim the offer: "${offer.title}" on Local for Vocal.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-whatsapp"
                        style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                      >
                        <WhatsappIcon className="w-4 h-4" />
                        Claim via WhatsApp
                      </a>
                      <a
                        href={`tel:${offer.phone}`}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px' }}
                      >
                        <PhoneIcon className="w-4 h-4" />
                      </a>
                    </div>

                    {((user?.shopId && user?.shopId === offer.shopId) || user?.accountType === 'admin') && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
                        <button
                          onClick={() => handleDeleteOffer(offer.id)}
                          style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}
                        >
                          🗑️ Delete Offer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal to Post Offer */}
        {showPostModal && (
          <div className="modal-overlay" onClick={() => setShowPostModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>Broadcast a Special Offer</h3>
              <form onSubmit={handlePostOffer}>
                <div className="form-group">
                  <label className="form-label">Offer Headline *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 20% OFF on all medicine purchases over ₹500"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Discount Badge Text</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 20% OFF, Buy 1 Get 1, Free Visit"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Validity / Timing</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Valid this Sunday only, Daily 6PM-9PM"
                    value={validTill}
                    onChange={(e) => setValidTill(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Terms / Description</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Provide any details, minimum bill amount, or coupon conditions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPostModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={posting}>
                    {posting ? 'Publishing...' : '🚀 Publish Offer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
