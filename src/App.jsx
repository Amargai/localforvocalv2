import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CategoryProvider } from './context/CategoryContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { ShopDetailModal } from './components/ShopDetailModal';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { OffersPage } from './pages/OffersPage';
import { PostRequirementPage } from './pages/PostRequirementPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { RegisterShopPage } from './pages/RegisterShopPage';
import { ShopDashboardPage } from './pages/ShopDashboardPage';
import { AdminPage } from './pages/AdminPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { PublicShopProfilePage } from './pages/PublicShopProfilePage';

function AppContent() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState('home'); // 'home', 'explore', 'offers', 'requirements', 'plans', 'register-shop', 'dashboard', 'admin', 'admin-login', 'profile', 'shop-view'
  const [previousPage, setPreviousPage] = useState('explore');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [requirementTargetShop, setRequirementTargetShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Synchronize hash with active page and listen to mobile/browser back & forward buttons
  useEffect(() => {
    function syncFromHash() {
      const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (!rawHash || rawHash === 'home') {
        setActivePage('home');
        return;
      }
      if (rawHash.startsWith('shop/')) {
        const id = rawHash.slice(5).trim();
        if (id) {
          setSelectedShopId(id);
          setActivePage('shop-view');
          return;
        }
      }
      const validPages = ['home', 'explore', 'offers', 'requirements', 'plans', 'register-shop', 'dashboard', 'admin', 'admin-login', 'profile'];
      if (validPages.includes(rawHash)) {
        setActivePage(rawHash);
      }
    }

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  function handleSetActivePage(page) {
    if (page === activePage && page !== 'shop-view') return;
    setPreviousPage(activePage);
    if (page === 'shop-view' && selectedShopId) {
      window.location.hash = `shop/${selectedShopId}`;
    } else {
      window.location.hash = page;
    }
    setActivePage(page);
  }

  function handleSelectShop(shop) {
    if (!shop) return;
    const targetId = shop.publicId || shop.id;
    if (!targetId) return;
    setSelectedShopId(targetId);
    setPreviousPage(activePage);
    window.location.hash = `shop/${targetId}`;
    setActivePage('shop-view');
  }

  function handlePostRequirementForShop(targetShop) {
    setRequirementTargetShop(targetShop);
    setPreviousPage(activePage);
    window.location.hash = 'requirements';
    setActivePage('requirements');
  }

  if (activePage === 'admin-login') {
    return <AdminLoginPage setActivePage={handleSetActivePage} />;
  }

  if (activePage === 'admin') {
    if (!user || user.accountType !== 'admin') {
      return <AdminLoginPage setActivePage={handleSetActivePage} />;
    }
    return (
      <>
        <AdminPage setActivePage={handleSetActivePage} />
        <AuthModal />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar activePage={activePage} setActivePage={handleSetActivePage} />

      <main style={{ flex: 1 }}>
        {activePage === 'home' && (
          <HomePage
            setActivePage={handleSetActivePage}
            setSelectedCategory={setSelectedCategory}
            onSelectShop={handleSelectShop}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activePage === 'explore' && (
          <ExplorePage
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onSelectShop={handleSelectShop}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activePage === 'offers' && (
          <OffersPage
            onSelectShop={handleSelectShop}
            setActivePage={handleSetActivePage}
          />
        )}

        {activePage === 'requirements' && (
          <PostRequirementPage
            setActivePage={handleSetActivePage}
            targetShop={requirementTargetShop}
            onClearTargetShop={() => setRequirementTargetShop(null)}
            onBack={() => {
              if (requirementTargetShop && previousPage === 'shop-view') {
                handleSetActivePage('shop-view');
              } else {
                handleSetActivePage(previousPage || 'explore');
              }
            }}
          />
        )}

        {activePage === 'plans' && (
          <SubscriptionPage
            setActivePage={handleSetActivePage}
          />
        )}

        {activePage === 'register-shop' && (
          <RegisterShopPage
            setActivePage={handleSetActivePage}
          />
        )}

        {activePage === 'dashboard' && (
          <ShopDashboardPage
            setActivePage={handleSetActivePage}
          />
        )}

        {activePage === 'profile' && (
          <UserProfilePage
            setActivePage={handleSetActivePage}
            onSelectShop={handleSelectShop}
          />
        )}

        {activePage === 'shop-view' && (
          <PublicShopProfilePage
            shopId={selectedShopId}
            setActivePage={handleSetActivePage}
            onBack={() => handleSetActivePage(previousPage || 'explore')}
            onPostRequirement={handlePostRequirementForShop}
          />
        )}
      </main>

      <Footer setActivePage={handleSetActivePage} />

      {/* Global Modals */}
      <AuthModal />
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <CategoryProvider>
        <AppContent />
      </CategoryProvider>
    </AuthProvider>
  );
}
