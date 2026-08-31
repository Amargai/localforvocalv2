const router = require('express').Router();
const crypto = require('crypto');
const { db } = require('../config/db');
const { calculateDistanceKm } = require('../utils/geo');
const { requireAuth } = require('../middleware/auth');

function formatShop(row) {
  if (!row) return null;
  return {
    id: row.id,
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
    tags: JSON.parse(row.tags || '[]'),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    businessHours: row.business_hours ? JSON.parse(row.business_hours) : null,
    images: JSON.parse(row.images || '[]'),
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
  const { category, q, lat, lng, radiusKm, openNow, featured, page = 1, limit = 20 } = req.query;

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
  const maxRadius = Number(radiusKm) || 50;

  // Keyword search filter (Name, category, subcategory, area, city, tags)
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    shops = shops.filter(s => {
      const fullText = `${s.name} ${s.category} ${s.subCategory || ''} ${s.area} ${s.city} ${s.tags.join(' ')}`.toLowerCase();
      return fullText.includes(term);
    });
  }

  // Calculate distance & apply radius filter
  if (hasUserLocation) {
    shops = shops.map(s => {
      const distance = calculateDistanceKm(userLat, userLng, s.latitude, s.longitude);
      return { ...s, distanceKm: distance };
    });

    if (radiusKm) {
      shops = shops.filter(s => s.distanceKm !== null && s.distanceKm <= maxRadius);
    }

    // Sort by proximity when user location is provided
    shops.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  } else {
    // Default sort: Featured first, then highest rating
    shops.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating);
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const pageSize = Math.max(1, Math.min(50, parseInt(limit, 10)));
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
});

// GET /api/shops/featured
router.get('/featured', (_, res) => {
  const shops = db.prepare("SELECT * FROM shops WHERE status = 'active' AND featured = 1 LIMIT 6").all().map(formatShop);
  return res.json({ shops });
});

// GET /api/shops/mine - Current shop owner's shop
router.get('/mine', requireAuth, (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE owner_id = ?').get(req.user.id);
  if (!shop) return res.status(404).json({ message: 'No shop found for your account' });
  return res.json({ shop: formatShop(shop) });
});

// GET /api/shops/:id - Single shop details + reviews
router.get('/:id', (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ message: 'Shop not found' });

  // Increment view count
  db.prepare('UPDATE shops SET views = views + 1 WHERE id = ?').run(req.params.id);

  const reviews = db.prepare('SELECT * FROM reviews WHERE shop_id = ? ORDER BY created_at DESC').all(req.params.id);
  return res.json({ shop: formatShop(shop), reviews });
});

// POST /api/shops - Register a new shop
router.post('/', requireAuth, (req, res) => {
  const {
    name, category, subCategory, ownerName, phone, whatsapp,
    address, area, city, pin, tags = [],
    latitude, longitude, businessHours, images = []
  } = req.body;

  if (!name || !category || !phone || !address || !area || !city) {
    return res.status(400).json({ message: 'Missing required shop information' });
  }

  const lat = Number(latitude) || 19.1136; // Default to city center if not provided
  const lng = Number(longitude) || 72.8697;

  const id = 'shop_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO shops (
      id, owner_id, name, category, sub_category, owner_name, phone, whatsapp,
      address, area, city, pin, tags, latitude, longitude, business_hours, images,
      status, featured, available_today, rating, total_reviews, views, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      'active', 0, 1, 5.0, 0, 1, ?, ?
    )
  `).run(
    id, req.user.id, name, category, subCategory || null, ownerName || req.user.name,
    phone, whatsapp || phone, address, area, city, pin || null,
    JSON.stringify(Array.isArray(tags) ? tags : []),
    lat, lng,
    businessHours ? JSON.stringify(businessHours) : null,
    JSON.stringify(Array.isArray(images) ? images : []),
    now, now
  );

  // Update user account type and shop link
  db.prepare("UPDATE users SET account_type = 'shop_owner', shop_id = ? WHERE id = ?").run(id, req.user.id);

  const created = db.prepare('SELECT * FROM shops WHERE id = ?').get(id);
  return res.status(201).json({ shop: formatShop(created), message: 'Shop listed successfully!' });
});

// PUT /api/shops/:id - Update shop profile
router.put('/:id', requireAuth, (req, res) => {
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
    name, category, subCategory, ownerName, phone, whatsapp,
    address, area, city, pin,
    tags !== undefined ? JSON.stringify(tags) : null,
    latitude !== undefined ? Number(latitude) : null,
    longitude !== undefined ? Number(longitude) : null,
    businessHours !== undefined ? JSON.stringify(businessHours) : null,
    images !== undefined ? JSON.stringify(images) : null,
    availableToday !== undefined ? (availableToday ? 1 : 0) : null,
    now, req.params.id
  );

  const updated = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  return res.json({ shop: formatShop(updated), message: 'Shop updated successfully' });
});

// PATCH /api/shops/:id/availability - Quick toggle open/close
router.patch('/:id/availability', requireAuth, (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(req.params.id);
  if (!shop) return res.status(404).json({ message: 'Shop not found' });

  if (shop.owner_id !== req.user.id && req.user.accountType !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const { availableToday } = req.body;
  const isAvailable = availableToday ? 1 : 0;
  db.prepare('UPDATE shops SET available_today = ?, updated_at = ? WHERE id = ?').run(isAvailable, new Date().toISOString(), req.params.id);

  return res.json({ availableToday: Boolean(isAvailable), message: isAvailable ? 'Shop is now Open' : 'Shop marked as Closed' });
});

// POST /api/shops/:id/reviews - Add review
router.post('/:id/reviews', requireAuth, (req, res) => {
  const { rating, comment } = req.body;
  const numRating = Math.max(1, Math.min(5, Number(rating) || 5));

  const reviewId = 'rev_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO reviews (id, shop_id, user_id, user_name, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(reviewId, req.params.id, req.user.id, req.user.name, numRating, comment || '', now);

  // Recalculate average rating
  const avg = db.prepare('SELECT AVG(rating) as avgRating, COUNT(*) as count FROM reviews WHERE shop_id = ?').get(req.params.id);
  const newRating = Math.round((avg.avgRating || 5) * 10) / 10;

  db.prepare('UPDATE shops SET rating = ?, total_reviews = ? WHERE id = ?').run(newRating, avg.count, req.params.id);

  return res.status(201).json({ message: 'Review posted successfully', rating: newRating, totalReviews: avg.count });
});

module.exports = router;
