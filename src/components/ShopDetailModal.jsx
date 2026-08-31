import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { XIcon, StarIcon, LocationIcon, WhatsappIcon, PhoneIcon, ClockIcon } from './Icons';

export function ShopDetailModal({ shopId, onClose, onReviewAdded }) {
  const { user, openAuthModal } = useAuth();
  const [shop, setShop] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!shopId) return;
    loadShopDetails();
  }, [shopId]);

  async function loadShopDetails() {
    try {
      setLoading(true);
      const [shopData, prodsData] = await Promise.all([
        api(`/shops/${shopId}`),
        api(`/products/shop/${shopId}`).catch(() => ({ products: [] }))
      ]);
      setShop(shopData.shop);
      setReviews(shopData.reviews || []);
      setProducts(prodsData.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }


  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!user) {
      openAuthModal('demo');
      return;
    }

    try {
      setSubmittingReview(true);
      await api(`/shops/${shopId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment })
      });
      setComment('');
      await loadShopDetails();
      if (onReviewAdded) onReviewAdded();
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (!shopId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: '#f1f5f9', padding: '6px', borderRadius: '50%' }}
        >
          <XIcon className="w-5 h-5" />
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>Loading details...</div>
        ) : !shop ? (
          <div>Shop not found.</div>
        ) : (
          <div>
            {shop.images && shop.images.length > 0 && (
              <div style={{ height: '240px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '20px', background: '#f1f5f9' }}>
                <img src={shop.images[0]} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-green">{shop.category.toUpperCase()}</span>
              {shop.subCategory && <span className="badge badge-gray">{shop.subCategory}</span>}
              <span className={`badge ${shop.availableToday ? 'badge-green' : 'badge-red'}`}>
                ● {shop.availableToday ? 'Open Today' : 'Closed'}
              </span>
            </div>

            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>{shop.name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '16px' }}>
              <LocationIcon className="w-4 h-4" />
              <span>{shop.address}, {shop.area}, {shop.city} {shop.pin ? `- ${shop.pin}` : ''}</span>
            </div>

            {/* Timings & Owner Info */}
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  Owner / Contact Person
                </div>
                <div style={{ fontWeight: 600 }}>{shop.ownerName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{shop.phone}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                  Business Hours
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
                  <ClockIcon className="w-4 h-4" />
                  <span>{shop.businessHours?.days || 'Mon - Sun'}: {shop.businessHours?.open || '09:00'} - {shop.businessHours?.close || '21:00'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {shop.whatsapp && (
                <a
                  href={`https://wa.me/91${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${shop.name}, I found your listing on Local for Vocal.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-whatsapp"
                  style={{ flex: 1, padding: '12px' }}
                >
                  <WhatsappIcon className="w-5 h-5" />
                  Chat on WhatsApp
                </a>
              )}

              <a
                href={`tel:${shop.phone}`}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px' }}
              >
                <PhoneIcon className="w-5 h-5" />
                Call {shop.phone}
              </a>
            </div>

            {/* Tags */}
            {shop.tags && shop.tags.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>Services & Items Offered</h4>
                <div className="shop-tags">
                  {shop.tags.map((tag, idx) => (
                    <span className="shop-tag" key={idx}>#{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Products & Price List Catalog */}
            {products && products.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800 }}>📦 Products & Price List</h4>
                  <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>{products.length} Items</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {products.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      {p.imageUrl && (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          style={{ width: '100%', height: '110px', objectFit: 'cover' }}
                        />
                      )}
                      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px' }}>{p.name}</div>
                        {p.category && <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '6px' }}>{p.category}</div>}
                        
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>₹{p.price}</span>
                          {p.originalPrice && <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', textDecoration: 'line-through' }}>₹{p.originalPrice}</span>}
                        </div>

                        {shop.whatsapp && (
                          <a
                            href={`https://wa.me/91${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${shop.name}, I am interested in ordering/inquiring about "${p.name}" (₹${p.price}) seen on Local for Vocal.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-whatsapp"
                            style={{ padding: '6px 8px', fontSize: '0.75rem', justifyContent: 'center' }}
                          >
                            <WhatsappIcon size={14} /> Order / Inquire
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Ratings & Reviews</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#eab308', fontWeight: 800, fontSize: '1.1rem' }}>
                  <StarIcon className="w-5 h-5" filled />
                  <span>{Number(shop.rating || 5.0).toFixed(1)}</span>
                  <span style={{ color: 'var(--text-light)', fontSize: '0.85rem', fontWeight: 400 }}>({reviews.length} reviews)</span>
                </div>
              </div>

              {/* Add Review Form */}
              <form onSubmit={handleSubmitReview} style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>Leave a review</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setRating(num)}
                      style={{ color: num <= rating ? '#eab308' : '#cbd5e1' }}
                    >
                      <StarIcon className="w-6 h-6" filled={num <= rating} />
                    </button>
                  ))}
                </div>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Write your experience with this shop..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ marginBottom: '10px' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </form>

              {/* Reviews List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviews.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No reviews yet. Be the first to review!</div>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rev.user_name}</span>
                        <div style={{ display: 'flex', color: '#eab308' }}>
                          {[...Array(rev.rating)].map((_, i) => (
                            <StarIcon className="w-3.5 h-3.5" filled key={i} />
                          ))}
                        </div>
                      </div>
                      {rev.comment && <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{rev.comment}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
