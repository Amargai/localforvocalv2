import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheckIcon, SparklesIcon, CheckIcon } from '../components/Icons';

export function SubscriptionPage({ setActivePage }) {
  const { user, openAuthModal } = useAuth();

  const plans = [
    {
      name: 'Starter Basic',
      price: '₹0',
      period: 'Forever Free',
      description: 'Everything you need to list your neighborhood shop and get discovered.',
      features: [
        'Verified Shop Listing in Search',
        'Direct Phone Call Button',
        'Customer Reviews & Ratings',
        'Standard Distance Radius Search',
        'Local SQLite Security'
      ],
      badge: 'Community',
      btnText: 'Current Active Plan',
      isPopular: false
    },
    {
      name: 'Local Hero Pro',
      price: '₹499',
      period: '/month',
      description: 'Accelerate your local business with verified badge and direct WhatsApp leads.',
      features: [
        'Everything in Starter',
        '🛡️ Verified Green Merchant Badge',
        '💬 1-Click WhatsApp Chat on Listing',
        '📢 Post up to 5 Flash Deals & Discounts',
        '⚡ Instant Alerts on Matching Customer Demands',
        'Store Analytics & Profile Insights'
      ],
      badge: 'Most Popular',
      btnText: 'Upgrade to Pro',
      isPopular: true
    },
    {
      name: 'Neighborhood Leader',
      price: '₹999',
      period: '/month',
      description: 'Maximum exposure across your entire locality and top search ranking.',
      features: [
        'Everything in Local Hero Pro',
        '★ Top Placement in Category Search',
        '🌟 Featured on Home Page Highlights',
        'Unlimited Flash Offers & Promotions',
        'Exclusive Priority Lead Radar',
        'Dedicated Neighborhood Support'
      ],
      badge: 'Maximum Reach',
      btnText: 'Get Featured',
      isPopular: false
    }
  ];

  return (
    <div style={{ padding: '60px 0 100px', background: 'var(--bg-main)' }}>
      <div className="container" style={{ maxWidth: '1100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span className="badge badge-green" style={{ marginBottom: '12px' }}>
            FOR LOCAL SHOPKEEPERS & SERVICE PROVIDERS
          </span>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-heading)' }}>
            Grow Your Neighborhood Footfall & Sales
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
            Choose a plan that fits your business scale. No hidden fees, cancel anytime.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', alignItems: 'stretch' }}>
          {plans.map((p, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-card)',
                border: p.isPopular ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px 28px',
                boxShadow: p.isPopular ? 'var(--shadow-xl)' : 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                transform: p.isPopular ? 'scale(1.03)' : 'none',
                zIndex: p.isPopular ? 2 : 1
              }}
            >
              {p.isPopular && (
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--primary)',
                  color: '#080911',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em'
                }}>
                  ⭐ RECOMMENDED FOR SHOPS
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <span className={`badge ${p.isPopular ? 'badge-green' : 'badge-gray'}`} style={{ marginBottom: '8px' }}>
                  {p.badge}
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px', color: 'var(--text-heading)' }}>{p.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', minHeight: '40px' }}>{p.description}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
                <span style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.03em' }}>{p.price}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>{p.period}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {p.features.map((feat, fIdx) => (
                  <li key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                      ✓
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`btn ${p.isPopular ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700 }}
                onClick={() => {
                  if (!user) openAuthModal('demo');
                  else if (user.accountType !== 'shop_owner') setActivePage('register-shop');
                  else alert(`You have selected the ${p.name} plan! (Demo Mode: Local simulation activated)`);
                }}
              >
                {p.btnText}
              </button>
            </div>
          ))}
        </div>

        {/* Free Local Note */}
        <div style={{ marginTop: '48px', textAlign: 'center', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
          <span style={{ fontWeight: 700, color: '#4ade80' }}>⚡ 100% Free Development Mode:</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
            All features, listings, and leads run on your local computer SQLite database with zero credit card or billing dependencies!
          </span>
        </div>
      </div>
    </div>
  );
}
