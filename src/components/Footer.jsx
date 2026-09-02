import React from 'react';

export function Footer({ setActivePage }) {
  return (
    <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '60px 0 30px', marginTop: 'auto' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px', marginBottom: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '16px' }}>
              <span>🌿</span>
              <span>Local<span style={{ color: '#4ade80' }}>4</span>Vocal</span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '16px' }}>
              Empowering local neighborhood shopkeepers and connecting residents with nearby essential services.
            </p>
            <div className="badge badge-green" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
              ⚡ 100% Free & Local-First
            </div>
          </div>

          <div>
            <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Explore</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <a href="#explore" onClick={(e) => { e.preventDefault(); setActivePage('explore'); }}>Browse Nearby Shops</a>
              <a href="#post" onClick={(e) => { e.preventDefault(); setActivePage('requirements'); }}>Post a Requirement</a>
              <a href="#register" onClick={(e) => { e.preventDefault(); setActivePage('register-shop'); }}>List Your Business</a>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Popular Categories</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <span>🏥 Chemist & Clinics</span>
              <span>🍲 Tiffin & Food Service</span>
              <span>🪚 Carpentry & Woodworks</span>
              <span>📱 Mobile & Electronics Repair</span>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'white', fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Zero Cloud Costs</h4>
            <p style={{ fontSize: '0.88rem', lineHeight: '1.6' }}>
              Built to run entirely on your personal machine with SQLite, local image storage, and simulated OTP verification.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.85rem' }}>
          <div>© {new Date().getFullYear()} Local for Vocal v2. All rights reserved.</div>
          <a
            href="#admin-login"
            onClick={(e) => { e.preventDefault(); setActivePage('admin-login'); }}
            style={{ color: '#475569', fontSize: '0.78rem', textDecoration: 'none', transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Platform Administration Portal"
            onMouseOver={(e) => e.currentTarget.style.color = '#94a3b8'}
            onMouseOut={(e) => e.currentTarget.style.color = '#475569'}
          >
            <span>🔒</span>
            <span>Staff Gateway</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
