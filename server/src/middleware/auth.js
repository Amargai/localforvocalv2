const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const { db } = require('../config/db');

function authMiddleware(req, res, next) {
  let token = null;

  // Check Bearer token header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = db.prepare('SELECT id, name, phone, email, account_type, area, city, shop_id, photo_url FROM users WHERE id = ?').get(payload.sub);
    if (!user) {
      req.user = null;
      return next();
    }
    req.user = { ...user, _id: user.id, accountType: user.account_type, shopId: user.shop_id };
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.accountType !== role) {
      return res.status(403).json({ message: `Forbidden: ${role} access required` });
    }
    next();
  };
}

module.exports = { authMiddleware, requireAuth, requireRole };
