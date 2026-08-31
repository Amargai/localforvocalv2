import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
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
import { UserProfilePage } from './pages/UserProfilePage';
import { PublicShopProfilePage } from './pages/PublicShopProfilePage';

function AppContent() {
  const [activePage, setActivePage] = useState('home'); // 'home', 'explore', 'offers', 'requirements', 'plans', 'register-shop', 'dashboard', 'admin', 'profile', 'shop-view'
  const [previousPage, setPreviousPage] = useState('explore');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  function handleSelectShop(shop) {
    setSelectedShopId(shop.id);
    setPreviousPage(activePage);
    setActivePage('shop-view');
  }


  if (activePage === 'admin') {
    return (
      <>
        <AdminPage setActivePage={setActivePage} />
        <AuthModal />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      <main style={{ flex: 1 }}>
        {activePage === 'home' && (
          <HomePage
            setActivePage={setActivePage}
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
          />
        )}

        {activePage === 'requirements' && (
          <PostRequirementPage
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'plans' && (
          <SubscriptionPage
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'register-shop' && (
          <RegisterShopPage
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'dashboard' && (
          <ShopDashboardPage
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'profile' && (
          <UserProfilePage
            setActivePage={setActivePage}
            onSelectShop={handleSelectShop}
          />
        )}

        {activePage === 'shop-view' && (
          <PublicShopProfilePage
            shopId={selectedShopId}
            setActivePage={setActivePage}
            onBack={() => setActivePage(previousPage || 'explore')}
          />
        )}
      </main>

      <Footer setActivePage={setActivePage} />

      {/* Global Modals */}
      <AuthModal />
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
