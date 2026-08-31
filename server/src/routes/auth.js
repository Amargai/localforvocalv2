const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { jwtSecret, nodeEnv } = require('../config/env');
const { requireAuth } = require('../middleware/auth');

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

// 1-Click Demo Login (Fast testing for Customer, Shop Owner, Admin)
router.post('/demo-login', (req, res) => {
  const { role } = req.body;
  let userId;
  if (role === 'admin') userId = 'user_admin';
  else if (role === 'shop_owner') userId = 'user_owner_1';
  else userId = 'user_cust_1';

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ message: 'Demo user not found' });
  return sendSession(res, user);
});

// Local zero-cost OTP generation
router.post('/send-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone || String(phone).replace(/\D/g, '').length < 10) {
    return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
  }

  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  // Fixed simulated OTP 123456 or random 6-digit code
  const code = '123456';
  localOtpStore.set(cleanPhone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  console.log(`📲 [LOCAL OTP SERVICE] Phone: +91-${cleanPhone} => Code: ${code}`);

  return res.json({
    success: true,
    message: 'OTP sent successfully to your device!',
    simulatedCode: code // Returned for quick convenience in development
  });
});

// Verify Local OTP
router.post('/verify-otp', (req, res) => {
  const { phone, code, name, accountType = 'customer' } = req.body;
  if (!phone || !code) return res.status(400).json({ message: 'Phone and OTP code are required' });

  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  const record = localOtpStore.get(cleanPhone);

  // Accept valid stored OTP or '123456' default
  if (code !== '123456' && (!record || record.code !== code || record.expiresAt < Date.now())) {
    return res.status(400).json({ message: 'Invalid or expired OTP code. Use 123456 for instant testing.' });
  }

  localOtpStore.delete(cleanPhone);

  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
  const now = new Date().toISOString();

  if (!user) {
    // Auto-create user on first login with OTP
    const id = 'user_' + crypto.randomUUID().slice(0, 8);
    const userName = name || `User ${cleanPhone.slice(-4)}`;
    db.prepare(`
      INSERT INTO users (id, name, phone, account_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userName, cleanPhone, accountType, now, now);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  return sendSession(res, user);
});

// Email + Password Register
router.post('/register', (req, res) => {
  const { name, email, phone, password, accountType = 'customer', area, city } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR (phone = ? AND phone IS NOT NULL)').get(email, phone || '');
  if (existing) {
    return res.status(400).json({ message: 'A user with this email or phone already exists' });
  }

  const id = 'user_' + crypto.randomUUID().slice(0, 8);
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, account_type, area, city, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, email.toLowerCase(), phone || null, passwordHash, accountType, area || null, city || null, now, now);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return sendSession(res, user);
});

// Email + Password Login
router.post('/login', (req, res) => {
  const { emailOrPhone, password } = req.body;
  if (!emailOrPhone || !password) {
    return res.status(400).json({ message: 'Email/Phone and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? OR phone = ?').get(emailOrPhone.toLowerCase(), emailOrPhone);
  if (!user || !user.password_hash) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return sendSession(res, user);
});

// Get Current User Profile
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, phone, email, account_type, area, city, shop_id, photo_url FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  let shop = null;
  if (user.shop_id) {
    shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(user.shop_id);
    if (shop) {
      shop.tags = JSON.parse(shop.tags || '[]');
      shop.images = JSON.parse(shop.images || '[]');
      shop.businessHours = shop.business_hours ? JSON.parse(shop.business_hours) : null;
    }
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
});

// Logout
router.post('/logout', (_, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
});

module.exports = router;
