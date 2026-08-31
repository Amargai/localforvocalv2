import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { CATEGORIES } from '../utils/constants';
import { ShopCard } from '../components/ShopCard';
import { RequirementCard } from '../components/RequirementCard';
import { SearchIcon, LocationIcon, SparklesIcon, PlusIcon, ChevronRightIcon } from '../components/Icons';

export function HomePage({ setActivePage, setSelectedCategory, onSelectShop, searchQuery, setSearchQuery }) {
  const [featuredShops, setFeaturedShops] = useState([]);
  const [recentRequirements, setRecentRequirements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    try {
      setLoading(true);
      const [shopsRes, reqsRes] = await Promise.all([
        api('/shops/featured'),
        api('/requirements?limit=3')
      ]);
      setFeaturedShops(shopsRes.shops || []);
      setRecentRequirements(reqsRes.requirements ? reqsRes.requirements.slice(0, 3) : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setActivePage('explore');
  }

  return (
    <div>
      {/* HERO SECTION */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <span className="hero-eyebrow">YOUR NEIGHBORHOOD, CONNECTED</span>
            <h1>Find trusted local businesses <em>near you.</em></h1>
            <p>
              Discover local chemists, carpenters, tiffin providers, electronics repairers, and essential neighborhood services right in your area.
            </p>

            <form className="hero-search-box" onSubmit={handleSearchSubmit}>
              <SearchIcon className="w-5 h-5" style={{ color: 'var(--text-muted)', marginLeft: '8px' }} />
              <input
                type="text"
                placeholder="Search shops, services (e.g. Pharmacy, Carpenter, Cake...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '14px' }}>
                Search Local
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section style={{ padding: '60px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em' }}>CATEGORIES</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Explore by Service</h2>
            </div>
            <button
              onClick={() => { setSelectedCategory('all'); setActivePage('explore'); }}
              style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              View all services <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="category-grid">
            {CATEGORIES.slice(1, 13).map((cat) => (
              <div
                key={cat.id}
                className="category-card"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setActivePage('explore');
                }}
              >
                <div className="category-icon">{cat.icon}</div>
                <div className="category-title">{cat.name.split('&')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED SHOPS */}
      <section style={{ padding: '60px 0', background: 'var(--bg-main)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.05em' }}>VERIFIED & POPULAR</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-heading)' }}>Featured Neighborhood Businesses</h2>
            </div>
            <button
              onClick={() => setActivePage('explore')}
              style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem' }}
            >
              Explore all →
            </button>
          </div>

          <div className="shops-grid">
            {featuredShops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} onSelect={onSelectShop} />
            ))}
          </div>
        </div>
      </section>

      {/* REVERSE MARKETPLACE CTA & RECENT DEMANDS */}
      <section style={{ padding: '70px 0' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, #081a10 0%, #0f3d23 60%, #14532d 100%)',
            border: '1px solid #166534',
            borderRadius: 'var(--radius-xl)',
            padding: '48px',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: 'var(--shadow-xl)',
            marginBottom: '50px'
          }}>
            <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '4px 14px', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '16px' }}>
              CAN'T FIND WHAT YOU NEED?
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, maxWidth: '650px', marginBottom: '12px' }}>
              Broadcast your requirement to all nearby shops.
            </h2>
            <p style={{ maxWidth: '540px', color: 'rgba(255,255,255,0.85)', marginBottom: '28px', lineHeight: '1.6' }}>
              Looking for urgent medicines, custom woodwork, emergency plumbing, or specific items? Post a requirement and local owners will respond directly!
            </p>
            <button
              className="btn btn-secondary"
              style={{ padding: '14px 28px', fontSize: '1rem', fontWeight: 700, borderRadius: '12px' }}
              onClick={() => setActivePage('requirements')}
            >
              <PlusIcon className="w-5 h-5" />
              Post a Requirement Now
            </button>
          </div>

          {recentRequirements.length > 0 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.05em' }}>LIVE NEIGHBORHOOD DEMANDS</span>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Recent Requirements Near You</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {recentRequirements.map((req) => (
                  <RequirementCard key={req.id} requirement={req} onRefresh={loadHomeData} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
