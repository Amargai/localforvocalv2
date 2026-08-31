import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { RequirementCard } from '../components/RequirementCard';
import { ShopCard } from '../components/ShopCard';
import { UserIcon, LocationIcon, PhoneIcon, PlusIcon } from '../components/Icons';

export function UserProfilePage({ setActivePage, onSelectShop }) {
  const { user, openAuthModal, logout } = useAuth();
  const [myRequirements, setMyRequirements] = useState([]);
  const [favoriteShops, setFavoriteShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requirements'); // 'requirements', 'favorites'

  useEffect(() => {
    if (!user) return;
    loadProfileData();
  }, [user]);

  async function loadProfileData() {
    try {
      setLoading(true);
      const reqsRes = await api('/requirements/mine');
      setMyRequirements(reqsRes.requirements || []);

      // Load saved shop bookmarks from localStorage
      const savedIds = JSON.parse(localStorage.getItem('l4v_favorites') || '[]');
      if (savedIds.length > 0) {
        const shopsRes = await api('/shops?limit=100');
        const favs = (shopsRes.shops || []).filter(s => savedIds.includes(s.id));
        setFavoriteShops(favs);
      } else {
        setFavoriteShops([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>👤</div>
        <h2>Sign In to View Your Profile</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Access your posted requirements, responses from shops, and bookmarked favorites.</p>
        <button className="btn btn-primary" onClick={() => openAuthModal('demo')}>
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 0 80px' }}>
      <div className="container">
        {/* User Card */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '32px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              fontWeight: 800
            }}>
              {user.name.charAt(0)}
            </div>


            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-heading)' }}>{user.name}</h1>
                <span className="badge badge-green">{user.accountType.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                {user.phone && <span>📱 {user.phone}</span>}
                {user.email && <span>✉️ {user.email}</span>}
                <span>📍 {user.area || 'Neighborhood'}, {user.city || 'Local'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setActivePage('requirements')}>
              <PlusIcon className="w-4 h-4" />
              Post Requirement
            </button>
            <button className="btn btn-secondary" style={{ color: '#ef4444' }} onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '24px' }}>
          <button
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: activeTab === 'requirements' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'requirements' ? 'var(--primary)' : 'var(--text-muted)'
            }}
            onClick={() => setActiveTab('requirements')}
          >
            📢 My Posted Demands ({myRequirements.length})
          </button>
          <button
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              background: activeTab === 'favorites' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'favorites' ? 'var(--primary)' : 'var(--text-muted)'
            }}
            onClick={() => setActiveTab('favorites')}
          >
            ❤️ Saved Favorite Shops ({favoriteShops.length})
          </button>
        </div>

        {/* TAB 1: Requirements */}
        {activeTab === 'requirements' && (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>Loading your requirements...</div>
            ) : myRequirements.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>📢</div>
                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-heading)' }}>You haven't posted any requirements yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Need rare medicines, furniture repairs, or custom services? Broadcast to nearby shops now.</p>
                <button className="btn btn-primary" onClick={() => setActivePage('requirements')}>
                  Post Your First Requirement
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                {myRequirements.map((req) => (
                  <RequirementCard key={req.id} requirement={req} onRefresh={loadProfileData} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Bookmarked Shops */}
        {activeTab === 'favorites' && (
          <div>
            {favoriteShops.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '50px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>❤️</div>
                <h3 style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-heading)' }}>No saved shops yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>Click the heart icon on any shop card in Explore to save your favorite neighborhood spots.</p>
                <button className="btn btn-primary" onClick={() => setActivePage('explore')}>
                  Explore Nearby Businesses
                </button>
              </div>
            ) : (
              <div className="shops-grid">
                {favoriteShops.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} onSelect={onSelectShop} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
