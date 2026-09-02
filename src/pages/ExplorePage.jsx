import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { DEFAULT_COORDINATES } from '../utils/constants';
import { useCategories } from '../context/CategoryContext';
import { ShopCard } from '../components/ShopCard';
import { ShopMapView } from '../components/ShopMapView';
import { 
  SearchIcon, 
  LocationIcon, 
  FilterIcon, 
  XIcon, 
  StarIcon, 
  ClockIcon, 
  SparklesIcon, 
  CheckIcon 
} from '../components/Icons';
import { 
  getUserSavedLocation, 
  setUserSavedLocation, 
  reverseGeocode, 
  getCurrentBrowserPosition 
} from '../utils/geo';

const QUICK_LOCATIONS = [
  { label: '📍 My GPS / Registered', isGps: true },
  { label: '🎯 Karad / Satara', lat: 17.3715, lng: 73.9008, area: 'Karad / Satara', city: 'Satara' },
  { label: '🏙️ Mumbai (Andheri)', lat: 19.1136, lng: 72.8697, area: 'Andheri West', city: 'Mumbai' },
  { label: '🌆 Pune (FC Road)', lat: 18.5204, lng: 73.8567, area: 'Shivajinagar', city: 'Pune' }
];

export function ExplorePage({ selectedCategory, setSelectedCategory, onSelectShop, searchQuery = '', setSearchQuery }) {
  const { categories } = useCategories();
  const [rawShops, setRawShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [radiusKm, setRadiusKm] = useState('all'); // default to 'all' or large radius so no shops are hidden
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const [hasOffersOnly, setHasOffersOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'rating', 'views', 'name', 'newest'
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // User location coordinates - initialize from localStorage if available
  const [userLocation, setUserLocation] = useState(() => {
    const saved = getUserSavedLocation();
    if (saved && saved.lat && saved.lng) {
      return saved;
    }
    return DEFAULT_COORDINATES;
  });

  const [locationStatus, setLocationStatus] = useState(() => {
    const saved = getUserSavedLocation();
    if (saved && saved.area) {
      return `${saved.area}${saved.city ? `, ${saved.city}` : ''}`;
    }
    return 'Mumbai (Default)';
  });

  const radiusPresets = [5, 15, 30, 75, 'all'];

  // Reactive sorting & client-side filtering (Instantly reacts to sort changes with 0ms latency)
  const shops = React.useMemo(() => {
    let list = [...rawShops];

    // Client-side extra filters
    if (topRatedOnly) {
      list = list.filter((s) => Number(s.rating) >= 4.0);
    }
    if (hasOffersOnly) {
      list = list.filter((s) => s.offers && s.offers.length > 0);
    }

    // Dynamic Sorting
    if (sortBy === 'rating') {
      list.sort((a, b) => {
        const ratingDiff = (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (Number(b.totalReviews || b.total_reviews) || 0) - (Number(a.totalReviews || a.total_reviews) || 0);
      });
    } else if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'distance') {
      list.sort((a, b) => {
        const distA = (a.distanceKm !== null && a.distanceKm !== undefined) ? Number(a.distanceKm) : 99999;
        const distB = (b.distanceKm !== null && b.distanceKm !== undefined) ? Number(b.distanceKm) : 99999;
        return distA - distB;
      });
    } else if (sortBy === 'views') {
      list.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
    }

    return list;
  }, [rawShops, topRatedOnly, hasOffersOnly, sortBy]);

  // Listen to cross-app location change events (e.g. from shop registration or dashboard)
  useEffect(() => {
    function handleLocationSync(e) {
      if (e.detail && e.detail.lat && e.detail.lng) {
        setUserLocation(e.detail);
        setLocationStatus(`${e.detail.area || 'Current Location'}${e.detail.city ? `, ${e.detail.city}` : ''}`);
      }
    }
    window.addEventListener('l4v_location_changed', handleLocationSync);
    return () => window.removeEventListener('l4v_location_changed', handleLocationSync);
  }, []);

  // Try auto-detecting user location once on mount if using default
  useEffect(() => {
    const saved = getUserSavedLocation();
    if (!saved || !saved.isCustom) {
      handleDetectLocation(true); // silent passive detect
    }
  }, []);

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
        if (radiusKm && radiusKm !== 'all') {
          params.append('radiusKm', radiusKm);
        }
      }

      const data = await api(`/shops?${params.toString()}`);
      setRawShops(data.shops || []);
    } catch (err) {
      console.error('Fetch shops error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDetectLocation(silent = false) {
    if (!silent) setLocationStatus('Detecting GPS...');
    try {
      const pos = await getCurrentBrowserPosition();
      const newLat = Number(pos.lat);
      const newLng = Number(pos.lng);
      
      const geo = await reverseGeocode(newLat, newLng);
      const newLoc = {
        lat: newLat,
        lng: newLng,
        area: geo?.area || 'Current Location',
        city: geo?.city || 'Near You',
        isCustom: true
      };

      setUserLocation(newLoc);
      setUserSavedLocation(newLoc);
      setLocationStatus(`${newLoc.area}, ${newLoc.city} ✅`);
    } catch (err) {
      if (!silent) {
        setLocationStatus('GPS Access Denied');
      }
    }
  }

  function handleSelectPresetLocation(preset) {
    if (preset.isGps) {
      handleDetectLocation(false);
      return;
    }
    const newLoc = {
      lat: preset.lat,
      lng: preset.lng,
      area: preset.area,
      city: preset.city,
      isCustom: true
    };
    setUserLocation(newLoc);
    setUserSavedLocation(newLoc);
    setLocationStatus(`${preset.area}, ${preset.city}`);
  }

  function handleSearchSubmit(e) {
    if (e) e.preventDefault();
    fetchShops();
  }

  function handleClearSearch() {
    if (setSearchQuery) setSearchQuery('');
    setLocalSearchQuery('');
  }

  function handleResetAll() {
    setSelectedCategory('all');
    if (setSearchQuery) setSearchQuery('');
    setLocalSearchQuery('');
    setRadiusKm('all');
    setOpenNowOnly(false);
    setTopRatedOnly(false);
    setHasOffersOnly(false);
    setSortBy('distance');
  }

  const activeFiltersCount = 
    (selectedCategory !== 'all' ? 1 : 0) +
    (searchQuery?.trim() ? 1 : 0) +
    (openNowOnly ? 1 : 0) +
    (topRatedOnly ? 1 : 0) +
    (hasOffersOnly ? 1 : 0) +
    (radiusKm !== 'all' ? 1 : 0);

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategory);

  return (
    <div style={{ padding: '32px 0 80px' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: '8px' }}>NEIGHBORHOOD DIRECTORY</span>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Explore Local Businesses</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem' }}>
              Find verified shops, carpenters, pharmacies, grocery stores & service providers near you.
            </p>
          </div>

          {/* Mobile Filter Toggle Button */}
          <button 
            className="explore-mobile-filter-trigger"
            onClick={() => setMobileFilterOpen(true)}
          >
            <FilterIcon size={16} />
            <span>Filters & Radius {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="explore-page-layout">
          
          {/* =========================================================================
              LEFT SIDEBAR: Unified Search & Filter Control Center
              ========================================================================= */}
          <aside className={`explore-sidebar ${mobileFilterOpen ? 'mobile-open' : ''}`}>
            {/* Sidebar Header */}
            <div className="explore-sidebar-header">
              <div className="explore-sidebar-title">
                <FilterIcon size={18} style={{ color: 'var(--primary)' }} />
                <span>Search & Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="badge badge-green" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeFiltersCount > 0 && (
                  <button className="explore-reset-btn" onClick={handleResetAll} title="Clear all filters">
                    Reset All
                  </button>
                )}
                {mobileFilterOpen && (
                  <button
                    onClick={() => setMobileFilterOpen(false)}
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-heading)', padding: '6px', borderRadius: '50%', display: 'flex' }}
                  >
                    <XIcon size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* 1. Keyword Search Bar */}
            <div className="explore-sidebar-section">
              <label className="explore-section-label">Keyword Search</label>
              <form onSubmit={handleSearchSubmit}>
                <div className="explore-search-input-wrapper">
                  <SearchIcon size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="explore-search-input"
                    placeholder="Shop, item, or service..."
                    value={setSearchQuery ? searchQuery : localSearchQuery}
                    onChange={(e) => {
                      if (setSearchQuery) setSearchQuery(e.target.value);
                      else setLocalSearchQuery(e.target.value);
                    }}
                  />
                  {(setSearchQuery ? searchQuery : localSearchQuery) && (
                    <button 
                      type="button" 
                      onClick={handleClearSearch}
                      style={{ background: 'transparent', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
                      title="Clear search"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* 2. Proximity GPS Location & Quick Switcher */}
            <div className="explore-sidebar-section">
              <div className="explore-section-label">
                <span>Your Proximity Origin</span>
                <button 
                  type="button" 
                  onClick={() => handleDetectLocation(false)} 
                  style={{ background: 'transparent', color: 'var(--primary)', fontWeight: 700, fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <LocationIcon size={12} /> Detect GPS
                </button>
              </div>

              <div className="explore-location-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <LocationIcon size={15} />
                  </div>
                  <div className="explore-location-text">
                    <span className="explore-location-name">{userLocation.area || 'Current Location'}</span>
                    <span className="explore-location-sub">{locationStatus}</span>
                  </div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '0.72rem', flexShrink: 0 }}
                  onClick={() => handleDetectLocation(false)}
                  title="Detect live GPS location"
                >
                  GPS
                </button>
              </div>

              {/* Quick Area / City Selector Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                {QUICK_LOCATIONS.map((preset, idx) => {
                  const isCurrent = !preset.isGps && Math.abs(userLocation.lat - preset.lat) < 0.01 && Math.abs(userLocation.lng - preset.lng) < 0.01;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPresetLocation(preset)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '0.72rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        border: isCurrent ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                        background: isCurrent ? 'rgba(34, 197, 94, 0.18)' : 'var(--bg-input)',
                        color: isCurrent ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Distance Radius Slider & Presets */}
            <div className="explore-sidebar-section">
              <div className="explore-section-label">
                <span>Distance Radius</span>
                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                  {radiusKm === 'all' ? 'All Locations' : `${radiusKm} km`}
                </span>
              </div>
              <div className="explore-radius-slider-box">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={radiusKm === 'all' ? 100 : radiusKm}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRadiusKm(val >= 100 ? 'all' : val);
                  }}
                  className="explore-radius-slider"
                />
                <div className="explore-radius-presets">
                  {radiusPresets.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`explore-radius-pill ${radiusKm === r ? 'active' : ''}`}
                      onClick={() => setRadiusKm(r)}
                    >
                      {r === 'all' ? 'All' : `${r} km`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Categories Navigation */}
            <div className="explore-sidebar-section">
              <div className="explore-section-label">
                <span>Category</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                  {selectedCategory === 'all' ? 'All' : selectedCategoryObj?.name}
                </span>
              </div>

              <div className="explore-category-list">
                <button
                  type="button"
                  className={`explore-category-item ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✨</span>
                    <span>All Categories</span>
                  </div>
                  {selectedCategory === 'all' && <CheckIcon size={14} />}
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`explore-category-item ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                    {selectedCategory === cat.id && <CheckIcon size={14} />}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Smart Availability & Quality Filters */}
            <div className="explore-sidebar-section" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
              <label className="explore-section-label">Quick Filters</label>
              
              <label className="explore-toggle-option">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClockIcon size={15} style={{ color: '#4ade80' }} />
                  <span>Open Today / Available</span>
                </div>
                <input
                  type="checkbox"
                  checked={openNowOnly}
                  onChange={(e) => setOpenNowOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </label>

              <label className="explore-toggle-option">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StarIcon size={15} filled style={{ color: '#fbbf24' }} />
                  <span>Top Rated (4.0+ Stars)</span>
                </div>
                <input
                  type="checkbox"
                  checked={topRatedOnly}
                  onChange={(e) => setTopRatedOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </label>

              <label className="explore-toggle-option">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SparklesIcon size={15} style={{ color: '#c084fc' }} />
                  <span>Special Offers Available</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasOffersOnly}
                  onChange={(e) => setHasOffersOnly(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </label>
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <label className="explore-section-label" style={{ marginBottom: '6px' }}>Sort Results By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-select"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '0.84rem', background: 'var(--bg-surface)' }}
                >
                  <option value="distance">📍 Proximity (Closest First)</option>
                  <option value="rating">⭐ Top Rated (High to Low)</option>
                  <option value="views">🔥 Most Popular (Most Views)</option>
                  <option value="name">🔤 Name (A to Z)</option>
                  <option value="newest">🆕 Newly Listed</option>
                </select>
              </div>
            </div>

            {mobileFilterOpen && (
              <button 
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '12px' }}
                onClick={() => setMobileFilterOpen(false)}
              >
                Apply Filters ({shops.length} Found)
              </button>
            )}
          </aside>

          {/* =========================================================================
              RIGHT MAIN AREA: Top Control Bar & Dynamic Grid / Map Results
              ========================================================================= */}
          <main className="explore-main-area">
            {/* Top Control Bar: Active Chips, Sort by, and View Switcher */}
            <div className="explore-control-topbar">
              {/* Left: Results Count & Active Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.94rem', color: 'var(--text-heading)', fontWeight: 700 }}>
                  Showing <span style={{ color: 'var(--primary)' }}>{shops.length}</span> {shops.length === 1 ? 'business' : 'businesses'}
                </div>

                {/* Active Filter Chips */}
                {activeFiltersCount > 0 && (
                  <div className="explore-active-filter-chips">
                    {searchQuery?.trim() && (
                      <span className="explore-filter-chip">
                        Search: "{searchQuery.trim()}"
                        <button onClick={handleClearSearch} title="Clear search">✕</button>
                      </span>
                    )}
                    {selectedCategory !== 'all' && (
                      <span className="explore-filter-chip">
                        Category: {selectedCategoryObj?.name}
                        <button onClick={() => setSelectedCategory('all')} title="Clear category">✕</button>
                      </span>
                    )}
                    {radiusKm !== 'all' && (
                      <span className="explore-filter-chip">
                        Radius: {radiusKm}km
                        <button onClick={() => setRadiusKm('all')} title="Show all locations">✕</button>
                      </span>
                    )}
                    {openNowOnly && (
                      <span className="explore-filter-chip">
                        Open Today
                        <button onClick={() => setOpenNowOnly(false)}>✕</button>
                      </span>
                    )}
                    {topRatedOnly && (
                      <span className="explore-filter-chip">
                        ⭐ 4.0+
                        <button onClick={() => setTopRatedOnly(false)}>✕</button>
                      </span>
                    )}
                    {hasOffersOnly && (
                      <span className="explore-filter-chip">
                        🔥 Deals
                        <button onClick={() => setHasOffersOnly(false)}>✕</button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Sort Dropdown & Grid / Map View Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Sort dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-heading)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="distance">📍 Proximity (Closest)</option>
                    <option value="rating">⭐ Top Rated</option>
                    <option value="views">🔥 Most Popular</option>
                    <option value="name">🔤 Name (A-Z)</option>
                    <option value="newest">🆕 Newly Listed</option>
                  </select>
                </div>

                {/* View Switcher: Grid vs Map */}
                <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                      color: viewMode === 'grid' ? '#080911' : 'var(--text-muted)',
                      boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                  >
                    🏢 Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      background: viewMode === 'map' ? 'var(--primary)' : 'transparent',
                      color: viewMode === 'map' ? '#080911' : 'var(--text-muted)',
                      boxShadow: viewMode === 'map' ? 'var(--shadow-sm)' : 'none',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                  >
                    🗺️ Map
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Content Display: Map vs Grid */}
            {viewMode === 'map' ? (
              <ShopMapView
                shops={shops}
                userLocation={userLocation}
                radiusKm={radiusKm}
                onSelectShop={onSelectShop}
              />
            ) : (
              <>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', fontSize: '1.1rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
                    Finding neighborhood shops & services...
                  </div>
                ) : shops.length === 0 ? (
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '50px 20px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏪</div>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '6px' }}>
                      {radiusKm !== 'all' 
                        ? `No shops found within ${radiusKm} km of ${userLocation.area || 'your selected location'}`
                        : 'No shops match your selected filters'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', maxWidth: '480px', margin: '0 auto 20px' }}>
                      {radiusKm !== 'all'
                        ? 'Try expanding to all locations or detecting your live GPS coordinates.'
                        : 'Try clearing search terms or selecting \'All Categories\'.'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {radiusKm !== 'all' && (
                        <button
                          className="btn btn-primary"
                          onClick={() => setRadiusKm('all')}
                        >
                          🌐 Show All Shops Everywhere
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDetectLocation(false)}
                      >
                        📍 Detect My GPS
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={handleResetAll}
                      >
                        Reset All Filters
                      </button>
                    </div>
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
          </main>
        </div>
      </div>
    </div>
  );
}

