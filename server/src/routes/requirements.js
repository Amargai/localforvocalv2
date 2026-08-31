const router = require('express').Router();
const crypto = require('crypto');
const { db } = require('../config/db');
const { calculateDistanceKm } = require('../utils/geo');
const { requireAuth } = require('../middleware/auth');

function formatRequirement(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    phone: row.phone,
    title: row.title,
    description: row.description,
    category: row.category,
    urgency: row.urgency,
    budget: row.budget,
    radiusKm: Number(row.radius_km || 10),
    area: row.area,
    city: row.city,
    latitude: row.latitude ? Number(row.latitude) : null,
    longitude: row.longitude ? Number(row.longitude) : null,
    status: row.status,
    responses: JSON.parse(row.responses || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// GET /api/requirements - List active requirements
router.get('/', (req, res) => {
  const { category, status = 'open', lat, lng, radiusKm } = req.query;

  let query = 'SELECT * FROM requirements WHERE 1=1';
  const params = [];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY created_at DESC';

  let reqs = db.prepare(query).all(...params).map(formatRequirement);

  const userLat = Number(lat);
  const userLng = Number(lng);
  if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
    reqs = reqs.map(r => {
      if (r.latitude && r.longitude) {
        const d = calculateDistanceKm(userLat, userLng, r.latitude, r.longitude);
        return { ...r, distanceKm: d };
      }
      return { ...r, distanceKm: null };
    });

    if (radiusKm) {
      reqs = reqs.filter(r => r.distanceKm === null || r.distanceKm <= Number(radiusKm));
    }
  }

  return res.json({ requirements: reqs });
});

// GET /api/requirements/mine - Customer's requirements
router.get('/mine', requireAuth, (req, res) => {
  const reqs = db.prepare('SELECT * FROM requirements WHERE customer_id = ? ORDER BY created_at DESC').all(req.user.id).map(formatRequirement);
  return res.json({ requirements: reqs });
});

// GET /api/requirements/matching - Shop owner: get demands matching shop's category and distance
router.get('/matching', requireAuth, (req, res) => {
  const shop = db.prepare('SELECT * FROM shops WHERE owner_id = ?').get(req.user.id);
  if (!shop) {
    return res.status(404).json({ message: 'No shop associated with your account' });
  }

  const allReqs = db.prepare("SELECT * FROM requirements WHERE status = 'open' AND (category = ? OR category = 'other') ORDER BY created_at DESC").all(shop.category).map(formatRequirement);

  const matching = allReqs.map(r => {
    let distance = null;
    if (r.latitude && r.longitude) {
      distance = calculateDistanceKm(shop.latitude, shop.longitude, r.latitude, r.longitude);
    }
    return { ...r, distanceKm: distance };
  }).filter(r => r.distanceKm === null || r.distanceKm <= Math.max(r.radiusKm, 15));

  return res.json({ shopCategory: shop.category, count: matching.length, requirements: matching });
});

// POST /api/requirements - Post a new requirement
router.post('/', requireAuth, (req, res) => {
  const { title, description, category, urgency = 'today', budget, radius = 10, phone, area, city, latitude, longitude } = req.body;

  if (!title || !category || !phone) {
    return res.status(400).json({ message: 'Title, category, and contact phone are required' });
  }

  const id = 'req_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO requirements (
      id, customer_id, customer_name, phone, title, description, category,
      urgency, budget, radius_km, area, city, latitude, longitude,
      status, responses, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      'open', '[]', ?, ?
    )
  `).run(
    id, req.user.id, req.user.name, phone, title, description || null, category,
    urgency, budget || null, Number(radius) || 10, area || req.user.area || 'Nearby Area', city || req.user.city || 'Local Area',
    latitude ? Number(latitude) : 19.1136,
    longitude ? Number(longitude) : 72.8697,
    now, now
  );

  const created = db.prepare('SELECT * FROM requirements WHERE id = ?').get(id);
  return res.status(201).json({ requirement: formatRequirement(created), message: 'Requirement broadcasted to nearby shops!' });
});

// POST /api/requirements/:id/respond - Shop responds to customer demand
router.post('/:id/respond', requireAuth, (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Response message cannot be empty' });
  }

  const reqItem = db.prepare('SELECT * FROM requirements WHERE id = ?').get(req.params.id);
  if (!reqItem) return res.status(404).json({ message: 'Requirement not found' });

  const shop = db.prepare('SELECT * FROM shops WHERE owner_id = ?').get(req.user.id);
  const shopName = shop ? shop.name : req.user.name;
  const shopPhone = shop ? shop.phone : req.user.phone;

  const responses = JSON.parse(reqItem.responses || '[]');
  const newResponse = {
    id: crypto.randomUUID().slice(0, 6),
    shopId: shop ? shop.id : null,
    shopName,
    shopPhone,
    message: message.trim(),
    at: new Date().toISOString()
  };

  responses.push(newResponse);

  db.prepare('UPDATE requirements SET responses = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(responses),
    new Date().toISOString(),
    req.params.id
  );

  return res.json({ message: 'Response sent to customer!', responses });
});

// PATCH /api/requirements/:id/status - Mark fulfilled or closed
router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const reqItem = db.prepare('SELECT * FROM requirements WHERE id = ?').get(req.params.id);
  if (!reqItem) return res.status(404).json({ message: 'Requirement not found' });

  if (reqItem.customer_id !== req.user.id && req.user.accountType !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  db.prepare('UPDATE requirements SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), req.params.id);
  return res.json({ message: `Requirement marked as ${status}` });
});

module.exports = router;
