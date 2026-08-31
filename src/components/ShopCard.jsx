import React, { useState, useEffect } from 'react';
import { StarIcon, LocationIcon, WhatsappIcon, PhoneIcon } from './Icons';

export function ShopCard({ shop, onSelect }) {
  const fallbackImage = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80';
  const imgUrl = (shop.images && shop.images.length > 0) ? shop.images[0] : fallbackImage;

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem('l4v_favorites') || '[]');
    setIsFavorite(favs.includes(shop.id));
  }, [shop.id]);

  function toggleFavorite(e) {
    e.stopPropagation();
    let favs = JSON.parse(localStorage.getItem('l4v_favorites') || '[]');
    if (favs.includes(shop.id)) {
      favs = favs.filter(id => id !== shop.id);
      setIsFavorite(false);
    } else {
      favs.push(shop.id);
      setIsFavorite(true);
    }
    localStorage.setItem('l4v_favorites', JSON.stringify(favs));
  }

  return (
    <article className="shop-card" onClick={() => onSelect(shop)}>
      <div className="shop-card-image">
        <img src={imgUrl} alt={shop.name} loading="lazy" />
        
        {/* Top Badges */}
        <div className="shop-card-badges">
          {shop.featured && (
            <span className="badge badge-amber">★ Featured</span>
          )}
          <span className={`badge ${shop.availableToday ? 'badge-green' : 'badge-red'}`}>
            ● {shop.availableToday ? 'Open Today' : 'Closed'}
          </span>
          {shop.distanceKm !== undefined && shop.distanceKm !== null && (
            <span className="badge badge-blue">
              📍 {shop.distanceKm} km
            </span>
          )}
        </div>

        {/* Bookmark Heart Button */}
        <button
          onClick={toggleFavorite}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(15, 16, 29, 0.85)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '15px'
          }}
          title={isFavorite ? 'Remove from favorites' : 'Save shop'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="shop-card-body">
        <div className="shop-card-category">{shop.subCategory || shop.category}</div>
        <h3 className="shop-card-title">{shop.name}</h3>

        <div className="shop-card-location">
          <LocationIcon className="w-4 h-4" />
          <span>{shop.area ? `${shop.area}, ${shop.city}` : shop.city}</span>
        </div>

        {shop.tags && shop.tags.length > 0 && (
          <div className="shop-tags">
            {shop.tags.slice(0, 3).map((tag, idx) => (
              <span className="shop-tag" key={idx}>#{tag}</span>
            ))}
            {shop.tags.length > 3 && (
              <span className="shop-tag" style={{ background: 'transparent', color: 'var(--text-light)' }}>
                +{shop.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="shop-card-footer" onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#eab308', fontWeight: 700, fontSize: '0.95rem' }}>
            <StarIcon className="w-4 h-4" filled />
            <span>{Number(shop.rating || 5.0).toFixed(1)}</span>
            <span style={{ color: 'var(--text-light)', fontSize: '0.75rem', fontWeight: 400 }}>
              ({shop.totalReviews || 0})
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {shop.whatsapp && (
              <a
                href={`https://wa.me/91${shop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${shop.name}, I found your shop on Local for Vocal.`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-whatsapp"
                style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                title="Chat on WhatsApp"
              >
                <WhatsappIcon className="w-4 h-4" />
                WhatsApp
              </a>
            )}

            <a
              href={`tel:${shop.phone}`}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '6px' }}
              title="Call Shop"
            >
              <PhoneIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
