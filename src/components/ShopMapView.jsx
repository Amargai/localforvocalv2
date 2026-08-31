import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function ShopMapView({ shops, userLocation, radiusKm, onSelectShop }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const centerLat = userLocation?.lat || 19.1136;
    const centerLng = userLocation?.lng || 72.8697;

    // Initialize Leaflet map if not exists
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([centerLat, centerLng], 13);
    }

    const map = mapInstanceRef.current;

    // Clear existing dynamic layers (except tileLayer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Add User Location Marker & Radius Circle
    if (centerLat && centerLng) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `<div style="background:#2563eb;color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 6px rgba(37,99,235,0.25);font-size:16px;border:2px solid white;">📍</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      L.marker([centerLat, centerLng], { icon: userIcon })
        .addTo(map)
        .bindPopup(`<b>Your Search Location</b><br/>${userLocation.area || 'Active Location'}`);

      if (radiusKm) {
        L.circle([centerLat, centerLng], {
          radius: radiusKm * 1000,
          color: '#16a34a',
          fillColor: '#22c55e',
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: '6, 6'
        }).addTo(map);
      }
    }

    // Add Shop Markers
    shops.forEach((shop) => {
      if (!shop.latitude || !shop.longitude) return;

      const shopIcon = L.divIcon({
        className: 'custom-shop-marker',
        html: `
          <div style="background:${shop.availableToday ? '#16a34a' : '#64748b'};color:white;padding:5px 9px;border-radius:18px;font-weight:700;font-size:12px;display:flex;align-items:center;gap:4px;box-shadow:0 4px 10px rgba(0,0,0,0.25);border:2px solid white;white-space:nowrap;cursor:pointer;">
            <span>🏪</span>
            <span>${shop.name.length > 16 ? shop.name.slice(0, 14) + '…' : shop.name}</span>
          </div>
        `,
        iconSize: [120, 30],
        iconAnchor: [60, 15]
      });

      const marker = L.marker([shop.latitude, shop.longitude], { icon: shopIcon }).addTo(map);

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '200px';
      popupContent.innerHTML = `
        <div style="font-size:11px;color:#16a34a;font-weight:800;text-transform:uppercase;">${shop.category}</div>
        <h4 style="margin:2px 0 6px;font-size:15px;font-weight:700;">${shop.name}</h4>
        <div style="font-size:12px;color:#64748b;margin-bottom:8px;">${shop.area}, ${shop.city}</div>
        <div style="display:flex;gap:6px;">
          <a href="tel:${shop.phone}" style="background:#16a34a;color:white;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">📞 Call</a>
          <a href="https://wa.me/91${(shop.whatsapp || shop.phone).replace(/\D/g, '')}" target="_blank" style="background:#25d366;color:white;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">💬 WhatsApp</a>
        </div>
      `;

      marker.bindPopup(popupContent);
    });

  }, [shops, userLocation, radiusKm]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '520px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', marginBottom: '32px' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '8px 14px', borderRadius: '8px', boxShadow: 'var(--shadow-md)', fontSize: '0.8rem', fontWeight: 600, zIndex: 1000, display: 'flex', gap: '12px' }}>
        <span>📍 Search Center</span>
        <span style={{ color: '#16a34a' }}>🟢 Open Today ({shops.filter(s => s.availableToday).length})</span>
        <span style={{ color: '#64748b' }}>⚪ Closed ({shops.filter(s => !s.availableToday).length})</span>
      </div>
    </div>
  );
}
