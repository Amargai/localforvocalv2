import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function ShopMapView({ shops = [], userLocation, radiusKm = 15, onSelectShop }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerGroupRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  const centerLat = userLocation?.lat || 19.1136;
  const centerLng = userLocation?.lng || 72.8697;

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if container changed
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // 100% Free OpenStreetMap Standard Tiles (Zero API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // Layer group for easy clearing
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersLayer;
    mapInstanceRef.current = map;
    setMapReady(true);

    // Invalidate size immediately and after layout settles
    const timer1 = setTimeout(() => map.invalidateSize(), 50);
    const timer2 = setTimeout(() => map.invalidateSize(), 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Update Markers, User Location & Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerGroupRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();
    map.invalidateSize();

    const boundsPoints = [];

    // Add User Search Location Marker & Radius
    if (centerLat && centerLng) {
      boundsPoints.push([centerLat, centerLng]);

      const userIcon = L.divIcon({
        className: 'user-marker-container',
        html: `
          <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
            <div class="user-pulse-marker" style="position:absolute;width:34px;height:34px;border-radius:50%;background:rgba(34,197,94,0.3);"></div>
            <div style="position:relative;background:#22c55e;color:#080911;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(34,197,94,0.5);font-size:15px;font-weight:900;border:2.5px solid #ffffff;">
              📍
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const userMarker = L.marker([centerLat, centerLng], { icon: userIcon });
      
      const isAllRadius = !radiusKm || radiusKm === 'all';
      const userPopup = document.createElement('div');
      userPopup.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:0.05em;">Your Search Origin</div>
        <h4 style="margin:2px 0 4px;font-size:14px;font-weight:800;color:#ffffff;">${userLocation?.area || 'Current Location'}</h4>
        <div style="font-size:12px;color:#94a3b8;">${isAllRadius ? 'Searching <b>all locations</b> (nearest first)' : `Searching within <b>${radiusKm} km</b> radius`}</div>
      `;
      userMarker.bindPopup(userPopup);
      markersLayer.addLayer(userMarker);

      // Add Radius Circle if not 'all'
      if (!isAllRadius && Number(radiusKm) > 0) {
        const circle = L.circle([centerLat, centerLng], {
          radius: Number(radiusKm) * 1000,
          color: '#22c55e',
          fillColor: '#22c55e',
          fillOpacity: 0.06,
          weight: 1.8,
          dashArray: '5, 6'
        });
        markersLayer.addLayer(circle);
      }
    }

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

    // Add Shop Markers
    shops.forEach((shop) => {
      const lat = Number(shop.latitude);
      const lng = Number(shop.longitude);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      boundsPoints.push([lat, lng]);

      const isOpen = Boolean(shop.availableToday);
      const rating = Number(shop.rating || 0).toFixed(1);
      const safeName = escapeHtml(shop.name || 'Local Business');
      const safeCategory = escapeHtml(shop.category || 'Local Shop');
      const safeArea = escapeHtml(shop.area || '');
      const safeCity = escapeHtml(shop.city || '');
      const safeDealTitle = escapeHtml(shop.dealTitle || '');
      const cleanPhone = (shop.phone || '').replace(/\D/g, '');
      const cleanWhatsapp = (shop.whatsapp || shop.phone || '').replace(/\D/g, '');

      const shopIconHtml = `
        <div class="custom-shop-marker" style="display:inline-flex;align-items:center;gap:5px;background:${isOpen ? 'rgba(15, 23, 42, 0.95)' : 'rgba(30, 41, 59, 0.95)'};color:#ffffff;padding:4px 8px;border-radius:20px;border:1.5px solid ${isOpen ? '#22c55e' : '#64748b'};box-shadow:0 6px 16px rgba(0,0,0,0.5);font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer;">
          <span style="font-size:13px;">${getCategoryEmoji(shop.category)}</span>
          <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;">${safeName}</span>
          ${rating > 0 ? `<span style="background:rgba(251,191,36,0.2);color:#fbbf24;padding:1px 4px;border-radius:4px;font-size:10px;">★${rating}</span>` : ''}
        </div>
      `;

      const shopIcon = L.divIcon({
        className: 'leaflet-custom-shop-pin',
        html: shopIconHtml,
        iconSize: [140, 32],
        iconAnchor: [70, 16]
      });

      const marker = L.marker([lat, lng], { icon: shopIcon });

      // Create Custom Interactive Popup DOM Element
      const popupContainer = document.createElement('div');
      popupContainer.style.minWidth = '220px';
      popupContainer.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:10px;font-weight:800;color:#4ade80;text-transform:uppercase;letter-spacing:0.04em;">
            ${safeCategory}
          </span>
          <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;background:${isOpen ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)'};color:${isOpen ? '#4ade80' : '#94a3b8'};">
            ${isOpen ? '● Open Today' : '○ Closed'}
          </span>
        </div>
        <h4 style="margin:2px 0 4px;font-size:15px;font-weight:800;color:#ffffff;line-height:1.2;">
          ${safeName}
        </h4>
        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#cbd5e1;margin-bottom:6px;">
          <span style="color:#fbbf24;font-weight:700;">★ ${rating}</span>
          <span>•</span>
          <span style="color:#94a3b8;">${safeArea}${safeArea && safeCity ? ', ' : ''}${safeCity}</span>
        </div>
        ${safeDealTitle ? `
          <div style="background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.3);color:#fde047;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:600;margin-bottom:8px;">
            🔥 ${safeDealTitle}
          </div>
        ` : ''}
        <div style="display:flex;gap:6px;margin-top:10px;">
          <button id="view-shop-btn-${escapeHtml(shop.id)}" style="flex:1;background:#22c55e;color:#080911;font-weight:800;font-size:12px;padding:6px 10px;border-radius:6px;border:none;cursor:pointer;">
            View Details →
          </button>
          ${cleanPhone ? `
            <a href="tel:${cleanPhone}" style="background:rgba(255,255,255,0.08);color:#ffffff;font-size:12px;padding:6px 10px;border-radius:6px;text-decoration:none;display:flex;align-items:center;justify-content:center;" title="Call">
              📞
            </a>
          ` : ''}
          ${cleanWhatsapp ? `
            <a href="https://wa.me/91${cleanWhatsapp}" target="_blank" rel="noopener noreferrer" style="background:rgba(37,211,102,0.18);color:#4ade80;font-size:12px;padding:6px 10px;border-radius:6px;text-decoration:none;display:flex;align-items:center;justify-content:center;" title="WhatsApp">
              💬
            </a>
          ` : ''}
        </div>
      `;

      // Attach View Details Click Listener
      const viewBtn = popupContainer.querySelector(`#view-shop-btn-${shop.id}`);
      if (viewBtn && onSelectShop) {
        viewBtn.addEventListener('click', (e) => {
          e.preventDefault();
          onSelectShop(shop);
        });
      }

      marker.bindPopup(popupContainer);
      markersLayer.addLayer(marker);
    });

  }, [shops, centerLat, centerLng, radiusKm, onSelectShop]);

  function handleCenterOnMe() {
    if (mapInstanceRef.current && centerLat && centerLng) {
      mapInstanceRef.current.flyTo([centerLat, centerLng], 14, { duration: 1 });
    }
  }

  function handleFitAll() {
    if (!mapInstanceRef.current) return;
    const points = [[centerLat, centerLng]];
    shops.forEach((s) => {
      if (s.latitude && s.longitude) points.push([Number(s.latitude), Number(s.longitude)]);
    });
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      handleCenterOnMe();
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '560px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
      {/* Leaflet Map Div */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '560px' }} />

      {/* Floating Action Controls */}
      <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 1000, display: 'flex', gap: '8px' }}>
        <button className="map-control-btn" onClick={handleCenterOnMe} title="Center on my location">
          <span>🎯</span>
          <span>My Location</span>
        </button>
        {shops.length > 0 && (
          <button className="map-control-btn" onClick={handleFitAll} title="Fit all shops on screen">
            <span>🔍</span>
            <span>Fit All ({shops.length})</span>
          </button>
        )}
      </div>

      {/* Bottom Floating Legend */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(19, 20, 36, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        fontSize: '0.8rem',
        fontWeight: 600,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
          <span>📍</span>
          <span>Search Origin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80' }}>
          <span>🟢</span>
          <span>Open ({shops.filter(s => s.availableToday).length})</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
          <span>⚪</span>
          <span>Closed ({shops.filter(s => !s.availableToday).length})</span>
        </div>
        <div style={{ color: 'var(--text-light)', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '10px' }}>
          Radius: <b style={{ color: 'var(--primary)' }}>{radiusKm === 'all' ? 'All Locations' : `${radiusKm} km`}</b>
        </div>
      </div>
    </div>
  );
}

// Helper to get category emojis for marker pills
function getCategoryEmoji(cat) {
  if (!cat) return '🏪';
  const c = cat.toLowerCase();
  if (c.includes('groc') || c.includes('kirana') || c.includes('fruit') || c.includes('veg')) return '🥦';
  if (c.includes('pharm') || c.includes('medic') || c.includes('chemist')) return '💊';
  if (c.includes('plumb') || c.includes('electr') || c.includes('carpent') || c.includes('repair')) return '🔧';
  if (c.includes('bake') || c.includes('cake') || c.includes('sweet') || c.includes('restaur')) return '🍰';
  if (c.includes('cloth') || c.includes('fash') || c.includes('tailor') || c.includes('wear')) return '👗';
  if (c.includes('salon') || c.includes('beauty') || c.includes('barber')) return '✂️';
  if (c.includes('hardw') || c.includes('paint') || c.includes('sanitary')) return '🔨';
  if (c.includes('stat') || c.includes('book') || c.includes('xerox')) return '📚';
  return '🏪';
}

