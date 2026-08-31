import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CATEGORIES, DEFAULT_COORDINATES } from '../utils/constants';
import { ShopCard } from '../components/ShopCard';
import { ShopMapView } from '../components/ShopMapView';
import { SearchIcon, LocationIcon, FilterIcon, ClockIcon } from '../components/Icons';

export function ExplorePage({ selectedCategory, setSelectedCategory, onSelectShop, searchQuery = '', setSearchQuery }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [radiusKm, setRadiusKm] = useState(15);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'rating', 'name'

  // User location coordinates
  const [userLocation, setUserLocation] = useState(DEFAULT_COORDINATES);
  const [locationStatus, setLocationStatus] = useState('Default (Mumbai)');

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    fetchShops();
  }, [selectedCategory, openNowOnly, radiusKm, userLocation, searchQuery]);

  async function fetchShops() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const currentQuery = setSearchQuery ? searchQuery : localSearchQuery;

      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (currentQuery && currentQuery.trim()) {
        params.append('q', currentQuery.trim());
      }
      if (openNowOnly) {
        params.append('openNow', 'true');
      }
      if (userLocation.lat && userLocation.lng) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
        params.append('radiusKm', radiusKm);
      }

      const data = await api(`/shops?${params.toString()}`);
      let list = data.shops || [];

      if (sortBy === 'rating') {
        list.sort((a, b) => b.rating - a.rating);
      } else if (sortBy === 'name') {
        list.sort((a, b) => a.name.localeCompare(b.name));
      }

      setShops(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleDetectLocation() {
    setLocationStatus('Detecting GPS...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            area: 'Current Location',
            city: 'Near You'
          });
          setLocationStatus('GPS Located ✅');
        },
        () => {
          setLocationStatus('GPS Access Denied (Using Default)');
        }
      );
    } else {
      setLocationStatus('Geolocation Not Supported');
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchShops();
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* Header Title */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', gap: '16px' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: '8px' }}>NEIGHBORHOOD DIRECTORY</span>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800 }}>Explore Local Shops & Services</h1>
            <p style={{ color: 'var(--text-muted)' }}>Find verified shops, carpenters, plumbers, bakeries, and more in your neighborhood.</p>
          </div>

          {/* Grid vs Map View Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.88rem',
                background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'grid' ? '#080911' : 'var(--text-muted)',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              🏢 Grid View
            </button>
            <button
              onClick={() => setViewMode('map')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.88rem',
                background: viewMode === 'map' ? 'var(--primary)' : 'transparent',
                color: viewMode === 'map' ? '#080911' : 'var(--text-muted)',
                boxShadow: viewMode === 'map' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              🗺️ Interactive Map (Free)
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <form onSubmit={handleSearch} style={{ flex: 1, minWidth: '240px', display: 'flex', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
              <SearchIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by shop name, item (e.g. Sofa repair, Insulin, Cakes)..."
                value={setSearchQuery ? searchQuery : localSearchQuery}
                onChange={(e) => {
                  if (setSearchQuery) setSearchQuery(e.target.value);
                  else setLocalSearchQuery(e.target.value);
                }}
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '8px 12px', fontSize: '0.95rem', color: 'var(--text-heading)' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.88rem' }}>
                Search
              </button>
            </form>

            <button
              className="btn btn-secondary"
              onClick={handleDetectLocation}
              style={{ fontSize: '0.88rem', padding: '10px 16px' }}
              title="Detect precise GPS location"
            >
              <LocationIcon className="w-4 h-4" />
              {locationStatus}
            </button>
          </div>

          {/* Controls Bar: Distance Radius Slider, Open Now, and Sort Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FilterIcon className="w-4 h-4" />
                Radius: <span style={{ color: 'var(--primary)' }}>{radiusKm} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                style={{ width: '130px', accentColor: 'var(--primary)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={openNowOnly}
                  onChange={(e) => setOpenNowOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                Show Only Open Today
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-heading)', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option value="distance">Proximity (Closest)</option>
                  <option value="rating">Top Rated</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Horizontal Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '16px',
          marginBottom: '28px',
          scrollbarWidth: 'none'
        }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                border: selectedCategory === cat.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: selectedCategory === cat.id ? 'var(--primary)' : 'var(--bg-card)',
                color: selectedCategory === cat.id ? '#080911' : 'var(--text-main)',
                boxShadow: selectedCategory === cat.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Dynamic View: Map vs Grid */}
        {viewMode === 'map' ? (
          <ShopMapView
            shops={shops}
            userLocation={userLocation}
            radiusKm={radiusKm}
            onSelectShop={onSelectShop}
          />
        ) : (
          <>
            <div style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text-main)' }}>{shops.length}</strong> active businesses within {radiusKm} km
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                Finding nearby shops...
              </div>
            ) : shops.length === 0 ? (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '60px 20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏪</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '6px' }}>No shops found in this filter range</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Try increasing your distance radius or selecting "All Categories".
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setRadiusKm(30); }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="shops-grid">
                {shops.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} onSelect={onSelectShop} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
