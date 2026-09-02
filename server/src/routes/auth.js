const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { jwtSecret, nodeEnv } = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { sendRealSMS } = require('../services/smsService');
const { sendOtpEmail, sendWelcomeEmail } = require('../services/emailService');
const { cleanPhone, isValidPhone, isValidEmail } = require('../utils/validation');

// In-memory store for simulated local OTPs (zero cost, zero external API needed)
const localOtpStore = new Map();

function generateToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.account_type || user.accountType },
    jwtSecret,
    { expiresIn: '30d' }
  );
}

function sendSession(res, user) {
  const token = generateToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      accountType: user.account_type || user.accountType,
      area: user.area,
      city: user.city,
      shopId: user.shop_id || user.shopId,
      photoUrl: user.photo_url || user.photoUrl
    }
  });
}

// 1-Click Demo Login (Guarded for Non-Production / Developer Testing Only)
router.post('/demo-login', (req, res) => {
  try {
    if (nodeEnv === 'production') {
      return res.status(403).json({ message: 'Demo login is disabled in production environments for security.' });
    }

    const { role } = req.body || {};
    let userId;
    if (role === 'admin') userId = 'user_admin';
    else if (role === 'shop_owner') userId = 'user_owner_1';
    else userId = 'user_cust_1';

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ message: 'Demo user not found' });
    return sendSession(res, user);
  } catch (err) {
    console.error('Demo login error:', err);
    return res.status(500).json({ message: err.message || 'Demo login failed' });
  }
});

// Dedicated Secure Admin Gateway Login (Restricted exclusively to account_type = 'admin')
router.post('/admin-login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Admin identifier and master password are required.' });
    }

    const trimmed = String(username).trim().toLowerCase();
    const cleanPhone = trimmed.replace(/\D/g, '').slice(-10);

    // Look for matching user that strictly holds the 'admin' role
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE (LOWER(email) = ? OR phone = ? OR id = ? OR LOWER(name) = ?)
        AND account_type = 'admin'
    `).get(trimmed, cleanPhone || trimmed, trimmed, trimmed);

    if (!user) {
      // Fake compare to prevent timing side-channel attacks
      bcrypt.compareSync(password, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
      return res.status(401).json({ message: 'Invalid administrative credentials or insufficient privileges.' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ message: 'Administrative access requires a configured master password.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid administrative credentials or insufficient privileges.' });
    }

    return sendSession(res, user);
  } catch (err) {
    console.error('Admin login gateway error:', err);
    return res.status(500).json({ message: 'Admin authentication gateway error.' });
  }
});

// Single-User Mode Switcher (For authenticated user e.g. Rajesh toggling between Customer & Merchant mode)
router.post('/switch-mode', requireAuth, (req, res) => {
  try {
    const { mode } = req.body || {}; // 'customer' or 'shop_owner'
    if (!['customer', 'shop_owner'].includes(mode)) {
      return res.status(400).json({ message: 'Invalid mode selection. Choose customer or shop_owner.' });
    }

    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    // Check if user owns a shop
    let userShopId = currentUser.shop_id;
    if (!userShopId) {
      const ownedShop = db.prepare('SELECT id FROM shops WHERE owner_id = ?').get(currentUser.id);
      if (ownedShop) {
        userShopId = ownedShop.id;
        db.prepare('UPDATE users SET shop_id = ? WHERE id = ?').run(userShopId, currentUser.id);
      }
    }

    // Preserve Admin accounts, but allow customer/shop_owner toggle
    if (currentUser.account_type !== 'admin') {
      db.prepare('UPDATE users SET account_type = ?, updated_at = ? WHERE id = ?')
        .run(mode, new Date().toISOString(), currentUser.id);
    }

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUser.id);
    return sendSession(res, updatedUser);
  } catch (err) {
    console.error('Switch mode error:', err);
    return res.status(500).json({ message: err.message || 'Failed to switch mode' });
  }
});

// Fast database lookup to check if a phone number is registered
router.get('/check-phone/:phone', (req, res) => {
  try {
    const cleanPhone = String(req.params.phone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ message: 'Valid 10-digit phone required' });
    }
    const user = db.prepare('SELECT id, name, account_type FROM users WHERE phone = ?').get(cleanPhone);
    return res.json({
      exists: Boolean(user),
      user: user ? { id: user.id, name: user.name, role: user.account_type } : null
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to verify phone in database' });
  }
});

// OTP generation with strict Register vs Login validation
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, purpose = 'login' } = req.body || {};
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit mobile number' });
    }

    const existingUser = db.prepare('SELECT id, name, email, account_type FROM users WHERE phone = ?').get(cleanPhone);

    // 1. Strict Login Check: User MUST be registered already
    if (purpose === 'login' && !existingUser) {
      return res.status(404).json({
        error: 'ACCOUNT_NOT_FOUND',
        message: `No registered account found for +91-${cleanPhone}. Please create an account first.`,
        isNewUser: true
      });
    }

    // 2. Strict Register Check: User MUST NOT be registered already
    if (purpose === 'register' && existingUser) {
      return res.status(409).json({
        error: 'ACCOUNT_ALREADY_EXISTS',
        message: `An account with +91-${cleanPhone} already exists (${existingUser.name}). Please Log In instead.`,
        isExistingUser: true
      });
    }
    
    // Generate secure 6-digit random code
    const code = crypto.randomInt(100000, 999999).toString();
    localOtpStore.set(cleanPhone, { 
      code,
      purpose,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
      attempts: 0 
    });

    // 1. Send real SMS via configured gateway (Fast2SMS / 2Factor / Twilio) or local fallback
    const smsResult = await sendRealSMS(cleanPhone, code);

    // 2. Send real Email via Nodemailer (Gmail / Custom SMTP) if email is associated
    let emailResult = null;
    const recipientEmail = (existingUser && existingUser.email) || (req.body && req.body.email);
    if (recipientEmail && typeof recipientEmail === 'string' && recipientEmail.includes('@')) {
      emailResult = await sendOtpEmail(recipientEmail.trim(), code, purpose, existingUser ? existingUser.name : 'Neighbor');
    }

    const destinations = [`+91-${cleanPhone}`];
    if (emailResult && emailResult.success) {
      destinations.push(recipientEmail.trim());
    }

    return res.json({
      success: true,
      message: `6-digit OTP sent to ${destinations.join(' and ')}!`,
      smsProvider: smsResult.provider,
      emailProvider: emailResult ? emailResult.provider : null,
      purpose,
      existingAccount: existingUser ? { name: existingUser.name, role: existingUser.account_type } : null,
      devOtp: (nodeEnv !== 'production' && smsResult.simulated) ? code : undefined
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(500).json({ message: err.message || 'Failed to send OTP' });
  }
});

// Verify Local OTP
router.post('/verify-otp', (req, res) => {
  try {
    const { phone, code, purpose = 'login', name, accountType = 'customer' } = req.body || {};
    if (!phone || !code) return res.status(400).json({ message: 'Phone and OTP code are required' });

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
    const record = localOtpStore.get(cleanPhone);

    if (!record || record.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'OTP expired or not requested. Please request a new OTP.' });
    }

    // In development mode, allow 123456 as an optional fast dev testing code
    const isDevBypass = nodeEnv !== 'production' && String(code).trim() === '123456';

    if (record.code !== String(code).trim() && !isDevBypass) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 4) {
        localOtpStore.delete(cleanPhone);
        return res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
      }
      return res.status(400).json({ message: 'Invalid OTP code. Please enter the correct code.' });
    }

    // Single-use: clear after verification
    localOtpStore.delete(cleanPhone);

    let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
    const now = new Date().toISOString();

    if (purpose === 'register') {
      if (user) {
        return res.status(409).json({ message: 'An account with this phone number already exists. Please Log In.' });
      }

      const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim() : `User ${cleanPhone.slice(-4)}`;
      const cleanRole = (accountType === 'shop_owner') ? 'shop_owner' : 'customer';
      const id = 'user_' + crypto.randomUUID().slice(0, 8);

      db.prepare(`
        INSERT INTO users (id, name, phone, account_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, cleanName, cleanPhone, cleanRole, now, now);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      // Login flow
      if (!user) {
        return res.status(404).json({ message: 'Account not found. Please register first.' });
      }

      // If user provided a name update during login, persist it
      if (name && typeof name === 'string' && name.trim()) {
        db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), now, user.id);
        user.name = name.trim();
      }
    }

    return sendSession(res, user);
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ message: err.message || 'OTP verification failed' });
  }
});

// Email + Password Register
router.post('/register', (req, res) => {
  try {
    const { name, email, phone, password, accountType = 'customer', area, city } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : null;

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? OR (phone = ? AND phone IS NOT NULL)').get(cleanEmail, cleanPhone || '');
    if (existing) {
      return res.status(400).json({ message: 'A user with this email or phone already exists' });
    }

    const id = 'user_' + crypto.randomUUID().slice(0, 8);
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, phone, password_hash, account_type, area, city, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), cleanEmail, cleanPhone, passwordHash, accountType, area || null, city || null, now, now);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (cleanEmail) {
      sendWelcomeEmail(cleanEmail, name.trim(), accountType).catch(err => console.error('Welcome email dispatch error:', err));
    }
    return sendSession(res, user);
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: err.message || 'Registration failed' });
  }
});

// Email + Password Login
router.post('/login', (req, res) => {
  try {
    const { emailOrPhone, password } = req.body || {};
    if (!emailOrPhone || !password) {
      return res.status(400).json({ message: 'Email/Phone and password are required' });
    }

    const trimmed = String(emailOrPhone).trim();
    const cleanPhone = trimmed.replace(/\D/g, '').slice(-10);

    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER(?) 
         OR phone = ? 
         OR (? != '' AND phone = ?)
    `).get(trimmed, trimmed, cleanPhone, cleanPhone);

    if (!user) {
      return res.status(401).json({ message: 'No account found with this email/phone' });
    }

    if (!user.password_hash) {
      return res.status(400).json({ 
        message: 'This account was created via Phone OTP. Please log in using the Phone OTP tab.' 
      });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }

    return sendSession(res, user);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: err.message || 'Login failed' });
  }
});

// Get Current User Profile (Auto-detects associated shop for seamless merchant experience)
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, phone, email, account_type, area, city, shop_id, photo_url FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let shop = null;
    let shopIdToSearch = user.shop_id;

    // If shop_id not set directly, look up shop owned by this user
    if (!shopIdToSearch) {
      const ownedShop = db.prepare('SELECT * FROM shops WHERE owner_id = ?').get(user.id);
      if (ownedShop) {
        shop = ownedShop;
        shopIdToSearch = ownedShop.id;
        db.prepare('UPDATE users SET shop_id = ? WHERE id = ?').run(shopIdToSearch, user.id);
        user.shop_id = shopIdToSearch;
      }
    } else {
      shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopIdToSearch);
    }

    if (shop) {
      try { shop.tags = JSON.parse(shop.tags || '[]'); } catch { shop.tags = []; }
      try { shop.images = JSON.parse(shop.images || '[]'); } catch { shop.images = []; }
      try { shop.businessHours = shop.business_hours ? JSON.parse(shop.business_hours) : null; } catch { shop.businessHours = null; }
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        accountType: user.account_type,
        area: user.area,
        city: user.city,
        shopId: user.shop_id,
        photoUrl: user.photo_url
      },
      shop
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch user profile' });
  }
});

// PUT /api/auth/profile - Update user profile details
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { name, phone, area, city, photoUrl } = req.body;
    const now = new Date().toISOString();

    const cleanPhone = phone ? String(phone).replace(/\D/g, '').slice(-10) : null;

    // If phone changed, verify uniqueness
    if (cleanPhone) {
      const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(cleanPhone, req.user.id);
      if (existingPhone) {
        return res.status(400).json({ message: 'This phone number is already in use by another account' });
      }
    }

    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        area = COALESCE(?, area),
        city = COALESCE(?, city),
        photo_url = COALESCE(?, photo_url),
        updated_at = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      cleanPhone || null,
      area ? area.trim() : null,
      city ? city.trim() : null,
      photoUrl || null,
      now,
      req.user.id
    );

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return res.json({
      message: 'Profile updated successfully!',
      user: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
        accountType: updated.account_type,
        area: updated.area,
        city: updated.city,
        shopId: updated.shop_id,
        photoUrl: updated.photo_url
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update profile' });
  }
});

// Logout
router.post('/logout', (_, res) => {
  try {
    res.clearCookie('token', { path: '/' });
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.json({ message: 'Logged out' });
  }
});

module.exports = router;

