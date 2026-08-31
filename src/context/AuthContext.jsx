import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('demo'); // 'demo', 'otp', 'email'

  // Load session on startup
  useEffect(() => {
    refreshSession();
  }, []);

  async function refreshSession() {
    try {
      const data = await api('/auth/me');
      setUser(data.user);
      setShop(data.shop);
    } catch {
      setUser(null);
      setShop(null);
    } finally {
      setLoading(false);
    }
  }

  // 1-Click Fast Demo Login
  async function demoLogin(role = 'customer') {
    const res = await api('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role })
    });
    if (res.token) localStorage.setItem('l4v_token', res.token);
    setUser(res.user);
    await refreshSession();
    setAuthModalOpen(false);
    return res;
  }

  // Request Local Free OTP
  async function sendOtp(phone) {
    return await api('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  }

  // Verify Free OTP
  async function verifyOtp(phone, code, name, accountType) {
    const res = await api('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code, name, accountType })
    });
    if (res.token) localStorage.setItem('l4v_token', res.token);
    setUser(res.user);
    await refreshSession();
    setAuthModalOpen(false);
    return res;
  }

  // Email / Password Login
  async function loginWithPassword(emailOrPhone, password) {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password })
    });
    if (res.token) localStorage.setItem('l4v_token', res.token);
    setUser(res.user);
    await refreshSession();
    setAuthModalOpen(false);
    return res;
  }

  // Register
  async function registerUser(userData) {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.token) localStorage.setItem('l4v_token', res.token);
    setUser(res.user);
    await refreshSession();
    setAuthModalOpen(false);
    return res;
  }

  // Logout
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('l4v_token');
      setUser(null);
      setShop(null);
    }
  }

  const openAuthModal = (tab = 'demo') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      shop,
      loading,
      authModalOpen,
      authModalTab,
      setAuthModalOpen,
      setAuthModalTab,
      openAuthModal,
      demoLogin,
      sendOtp,
      verifyOtp,
      loginWithPassword,
      registerUser,
      logout,
      refreshSession
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
