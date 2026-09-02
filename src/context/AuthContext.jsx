import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('otp'); // 'otp', 'email'

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

  // Secure Admin Gateway Login (Restricted exclusively to platform administrators)
  async function loginAdmin(username, password) {
    const res = await api('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.token) localStorage.setItem('l4v_token', res.token);
    setUser(res.user);
    await refreshSession();
    return res;
  }

  // 1-Click Fast Demo Login (Maintained for Developer / CI Testing)
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

  // Request OTP for Login or Registration
  async function sendOtp(phone, purpose = 'login') {
    return await api('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose })
    });
  }

  // Verify OTP for Login or Registration
  async function verifyOtp(phone, code, purpose = 'login', name, accountType) {
    const res = await api('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code, purpose, name, accountType })
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

  // Switch Active Mode for the same authenticated user (Customer <-> Shop Owner)
  async function switchMode(mode) {
    const res = await api('/auth/switch-mode', {
      method: 'POST',
      body: JSON.stringify({ mode })
    });
    if (res.token) localStorage.setItem('l4v_token', res.token);
    setUser(res.user);
    await refreshSession();
    return res;
  }

  const openAuthModal = (tab = 'otp') => {
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
      loginAdmin,
      demoLogin,
      sendOtp,
      verifyOtp,
      loginWithPassword,
      registerUser,
      switchMode,
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
