const router = require('express').Router();
const crypto = require('crypto');
const { db, safeJsonParse, withTransaction } = require('../config/db');
const { calculateDistanceKm } = require('../utils/geo');
const { requireAuth } = require('../middleware/auth');
const { maskId, unmaskId } = require('../utils/crypto-id');

function formatShop(row) {
  if (!row) return null;
  return {
    id: row.id,
    publicId: maskId(row.id),
    ownerId: row.owner_id,
    name: row.name,
    category: row.category,
    subCategory: row.sub_category,
    ownerName: row.owner_name,
    phone: row.phone,
    whatsapp: row.whatsapp || row.phone,
    address: row.address,
    area: row.area,
    city: row.city,
    pin: row.pin,
    tags: safeJsonParse(row.tags, []),
    latitude: Number(row.latitude) || 19.1136,
    longitude: Number(row.longitude) || 72.8697,
    businessHours: safeJsonParse(row.business_hours, null),
    images: safeJsonParse(row.images, []),
    status: row.status,
    featured: Boolean(row.featured),
    availableToday: Boolean(row.available_today),
    rating: Number(row.rating || 5.0),
    totalReviews: Number(row.total_reviews || 0),
    views: Number(row.views || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// GET /api/shops - Explore & search shops
router.get('/', (req, res) => {
  try {
    const { category, q, lat, lng, radiusKm, openNow, featured, sortBy = 'distance', page = 1, limit = 20 } = req.query;

    let query = "SELECT * FROM shops WHERE status = 'active'";
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (openNow === 'true') {
      query += ' AND available_today = 1';
    }

    if (featured === 'true') {
      query += ' AND featured = 1';
    }

    let shops = db.prepare(query).all(...params).map(formatShop);

    const userLat = Number(lat);
    const userLng = Number(lng);
    const hasUserLocation = Number.isFinite(userLat) && Number.isFinite(userLng);
    const numericRadius = Number(radiusKm);
    const shouldFilterRadius = radiusKm && radiusKm !== 'all' && Number.isFinite(numericRadius) && numericRadius > 0;

    // Keyword search filter (Name, category, subcategory, area, city, tags)
    if (q && q.trim()) {
      const term = q.trim().toLowerCase();
      shops = shops.filter(s => {
        const fullText = `${s.name} ${s.category} ${s.subCategory || ''} ${s.area} ${s.city} ${(s.tags || []).join(' ')}`.toLowerCase();
        return fullText.includes(term);
      });
    }

    // Calculate distance & apply radius filter
    if (hasUserLocation) {
      shops = shops.map(s => {
        const distance = calculateDistanceKm(userLat, userLng, s.latitude, s.longitude);
        return { ...s, distanceKm: distance };
      });

      if (shouldFilterRadius) {
        shops = shops.filter(s => s.distanceKm !== null && s.distanceKm <= numericRadius);
      }
    }

    // Sorting logic
    if (sortBy === 'rating') {
      shops.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || (Number(b.totalReviews) || 0) - (Number(a.totalReviews) || 0));
    } else if (sortBy === 'name') {
      shops.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'views') {
      shops.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
    } else if (sortBy === 'newest') {
      shops.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (hasUserLocation) {
      shops.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else {
      // Default sort: Featured first, then highest rating
      shops.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(limit, 10) || 20));
    const total = shops.length;
    const paginated = shops.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    return res.json({
      shops: paginated,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error('Explore shops error:', err);
    return res.status(500).json({ message: 'Failed to retrieve shops' });
  }
});

// GET /api/shops/featured
router.get('/featured', (_, res) => {
  try {
    const shops = db.prepare("SELECT * FROM shops WHERE status = 'active' AND featured = 1 LIMIT 6").all().map(formatShop);
    return res.json({ shops });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to retrieve featured shops' });
  }
});

// GET /api/shops/mine - Current shop owner's shop
router.get('/mine', requireAuth, (req, res) => {
  try {
    const shop = db.prepare('SELECT * FROM shops WHERE owner_id = ?').get(req.user.id);
    if (!shop) return res.status(404).json({ message: 'No shop found for your account' });
    return res.json({ shop: formatShop(shop) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to retrieve shop' });
  }
});

// GET /api/shops/:id - Single shop details + reviews (Accepts encrypted publicId or internal ID)
router.get('/:id', (req, res) => {
  try {
    const shopId = unmaskId(req.params.id);
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    // If shop is not active, verify if user has permission (owner or admin)
    if (shop.status !== 'active') {
      const authHeader = req.headers.authorization;
      const cookieToken = req.cookies?.token;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;
      let isAuthorized = false;
      if (token) {
        try {
          const { jwtSecret } = require('../config/env');
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, jwtSecret);
          if (decoded.sub === shop.owner_id || decoded.role === 'admin') {
            isAuthorized = true;
          }
        } catch (e) {}
      }
      if (!isAuthorized) {
        return res.status(404).json({ message: 'This shop is currently pending verification and is not yet publicly visible.' });
      }
    }

    // Increment view count safely
    try {
      db.prepare('UPDATE shops SET views = views + 1 WHERE id = ?').run(shop.id);
    } catch (e) {
      // Non-critical
    }

    const reviews = db.prepare('SELECT * FROM reviews WHERE shop_id = ? ORDER BY created_at DESC').all(shop.id);
    return res.json({ shop: formatShop(shop), reviews });
  } catch (err) {
    console.error('Fetch shop error:', err);
    return res.status(500).json({ message: 'Failed to fetch shop details' });
  }
});

// POST /api/shops - Register a new shop (Requires Admin Approval)
router.post('/', requireAuth, (req, res) => {
  try {
    const {
      name, category, subCategory, ownerName, phone, whatsapp,
      address, area, city, pin, tags = [],
      latitude, longitude, businessHours, images = []
    } = req.body;

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!name || !category || cleanPhone.length !== 10 || !address || !area || !city) {
      return res.status(400).json({ message: 'Missing required shop information: name, category, 10-digit phone, address, area, and city are required.' });
    }

    const cleanWa = whatsapp ? String(whatsapp).replace(/\D/g, '').slice(-10) : cleanPhone;
    const cleanPin = pin ? String(pin).replace(/\D/g, '').slice(0, 6) : null;

    const lat = Number(latitude) || 19.1136;
    const lng = Number(longitude) || 72.8697;

    const id = 'shop_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    const created = withTransaction(() => {
      db.prepare(`
        INSERT INTO shops (
          id, owner_id, name, category, sub_category, owner_name, phone, whatsapp,
          address, area, city, pin, tags, latitude, longitude, business_hours, images,
          status, featured, available_today, rating, total_reviews, views, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          'pending', 0, 1, 5.0, 0, 0, ?, ?
        )
      `).run(
        id, req.user.id, name.trim(), category.trim(), subCategory ? subCategory.trim() : null, ownerName ? ownerName.trim() : req.user.name,
        cleanPhone, cleanWa, address.trim(), area.trim(), city.trim(), cleanPin,
        JSON.stringify(Array.isArray(tags) ? tags : []),
        lat, lng,
        businessHours ? JSON.stringify(businessHours) : null,
        JSON.stringify(Array.isArray(images) ? images : []),
        now, now
      );

      // Update user account type and shop link atomically
      db.prepare("UPDATE users SET account_type = 'shop_owner', shop_id = ?, updated_at = ? WHERE id = ?").run(id, now, req.user.id);

      return db.prepare('SELECT * FROM shops WHERE id = ?').get(id);
    });

    return res.status(201).json({ 
      shop: formatShop(created), 
      message: 'Shop registration submitted successfully! It is currently under review and will appear on Explore once approved by an administrator.' 
    });
  } catch (err) {
    console.error('Create shop error:', err);
    return res.status(500).json({ message: err.message || 'Failed to list shop' });
  }
});

// PUT /api/shops/:id - Update shop profile
router.put('/:id', requireAuth, (req, res) => {
  try {
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    // Only owner or admin can update
    if (shop.owner_id !== req.user.id && req.user.accountType !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to modify this shop' });
    }

    const {
      name, category, subCategory, ownerName, phone, whatsapp,
      address, area, city, pin, tags,
      latitude, longitude, businessHours, images, availableToday
    } = req.body;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE shops SET
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        sub_category = COALESCE(?, sub_category),
        owner_name = COALESCE(?, owner_name),
        phone = COALESCE(?, phone),
        whatsapp = COALESCE(?, whatsapp),
        address = COALESCE(?, address),
        area = COALESCE(?, area),
        city = COALESCE(?, city),
        pin = COALESCE(?, pin),
        tags = COALESCE(?, tags),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        business_hours = COALESCE(?, business_hours),
        images = COALESCE(?, images),
        available_today = COALESCE(?, available_today),
        updated_at = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : null,
      category !== undefined ? category.trim() : null,
      subCategory !== undefined ? subCategory.trim() : null,
      ownerName !== undefined ? ownerName.trim() : null,
      phone !== undefined ? String(phone).replace(/\D/g, '').slice(-10) : null,
      whatsapp !== undefined ? String(whatsapp).replace(/\D/g, '').slice(-10) : null,
      address !== undefined ? address.trim() : null,
      area !== undefined ? area.trim() : null,
      city !== undefined ? city.trim() : null,
      pin !== undefined ? String(pin).replace(/\D/g, '').slice(0, 6) : null,
      tags !== undefined ? JSON.stringify(Array.isArray(tags) ? tags : []) : null,
      latitude !== undefined ? Number(latitude) : null,
      longitude !== undefined ? Number(longitude) : null,
      businessHours !== undefined ? JSON.stringify(businessHours) : null,
      images !== undefined ? JSON.stringify(Array.isArray(images) ? images : []) : null,
      availableToday !== undefined ? (availableToday ? 1 : 0) : null,
      now, req.params.id
    );

    const updated = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
    return res.json({ shop: formatShop(updated), message: 'Shop updated successfully' });
  } catch (err) {
    console.error('Update shop error:', err);
    return res.status(500).json({ message: err.message || 'Failed to update shop' });
  }
});

// PATCH /api/shops/:id/availability - Quick toggle open/close
router.patch('/:id/availability', requireAuth, (req, res) => {
  try {
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    if (shop.owner_id !== req.user.id && req.user.accountType !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { availableToday } = req.body;
    const isAvailable = availableToday ? 1 : 0;
    db.prepare('UPDATE shops SET available_today = ?, updated_at = ? WHERE id = ?').run(isAvailable, new Date().toISOString(), req.params.id);

    return res.json({ availableToday: Boolean(isAvailable), message: isAvailable ? 'Shop is now Open' : 'Shop marked as Closed' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update availability' });
  }
});

// POST /api/shops/:id/reviews - Add review
router.post('/:id/reviews', requireAuth, (req, res) => {
  try {
    const { rating, comment } = req.body;
    const numRating = Math.max(1, Math.min(5, Number(rating) || 5));

    const realShopId = unmaskId(req.params.id);
    const shop = db.prepare('SELECT id FROM shops WHERE id = ?').get(realShopId);
    if (!shop) return res.status(404).json({ message: 'Shop not found' });

    const reviewId = 'rev_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    const { newRating, totalReviews } = withTransaction(() => {
      db.prepare(`
        INSERT INTO reviews (id, shop_id, user_id, user_name, rating, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(reviewId, shop.id, req.user.id, req.user.name, numRating, (comment || '').trim(), now);

      // Recalculate average rating atomically
      const avg = db.prepare('SELECT AVG(rating) as avgRating, COUNT(*) as count FROM reviews WHERE shop_id = ?').get(shop.id);
      const computedRating = Math.round((avg.avgRating || 5) * 10) / 10;

      db.prepare('UPDATE shops SET rating = ?, total_reviews = ?, updated_at = ? WHERE id = ?').run(computedRating, avg.count, now, shop.id);

      return { newRating: computedRating, totalReviews: avg.count };
    });

    return res.status(201).json({ message: 'Review posted successfully', rating: newRating, totalReviews });
  } catch (err) {
    console.error('Post review error:', err);
    return res.status(500).json({ message: err.message || 'Failed to post review' });
  }
});

module.exports = router;

