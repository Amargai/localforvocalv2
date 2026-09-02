const router = require('express').Router();
const crypto = require('crypto');
const { db, safeJsonParse } = require('../config/db');
const { calculateDistanceKm } = require('../utils/geo');
const { requireAuth } = require('../middleware/auth');
const { unmaskId } = require('../utils/crypto-id');

function getShopForUser(user, shopId = null) {
  if (!user) return null;
  // 1. If explicit shopId is provided
  if (shopId) {
    const explicit = db.prepare('SELECT * FROM shops WHERE id = ?').get(String(shopId).trim());
    if (explicit && (explicit.owner_id === user.id || user.account_type === 'admin' || user.accountType === 'admin')) {
      return explicit;
    }
  }
  // 2. Check user's active shop_id on user record
  const userShopId = user.shop_id || user.shopId;
  if (userShopId) {
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(userShopId);
    if (shop) return shop;
  }
  // 3. Fallback to latest shop owned by user
  return db.prepare('SELECT * FROM shops WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1').get(user.id);
}

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
    targetShopId: row.target_shop_id || null,
    targetShopName: row.target_shop_name || null,
    isDirect: Boolean(row.target_shop_id),
    status: row.status,
    responses: safeJsonParse(row.responses, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// GET /api/requirements - List active requirements
router.get('/', (req, res) => {
  try {
    const { category, status = 'open', lat, lng, radiusKm, shopCategory, shopId, excludeUser, limit } = req.query;

    let query = 'SELECT * FROM requirements WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (excludeUser) {
      query += ' AND customer_id != ?';
      params.push(String(excludeUser).trim());
    }

    if (shopId) {
      query += ' AND target_shop_id = ?';
      params.push(shopId);
    } else {
      // By default on public feed, show public broadcast requirements or requirements targeted to all
      query += " AND (target_shop_id IS NULL OR target_shop_id = '')";
    }

    const filterCategory = shopCategory || category;
    if (filterCategory && filterCategory !== 'all') {
      query += ' AND LOWER(category) = LOWER(?)';
      params.push(filterCategory.trim());
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

      const numRadius = Number(radiusKm);
      if (radiusKm && radiusKm !== 'all' && Number.isFinite(numRadius) && numRadius > 0) {
        reqs = reqs.filter(r => r.distanceKm === null || r.distanceKm <= numRadius);
      }
    }

    const numLimit = Number(limit);
    if (Number.isFinite(numLimit) && numLimit > 0) {
      reqs = reqs.slice(0, numLimit);
    }

    return res.json({ requirements: reqs });
  } catch (err) {
    console.error('Fetch requirements error:', err);
    return res.status(500).json({ message: 'Failed to retrieve requirements' });
  }
});

// GET /api/requirements/mine - Customer's requirements
router.get('/mine', requireAuth, (req, res) => {
  try {
    const reqs = db.prepare('SELECT * FROM requirements WHERE customer_id = ? ORDER BY created_at DESC').all(req.user.id).map(formatRequirement);
    return res.json({ requirements: reqs });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to retrieve your requirements' });
  }
});

// GET /api/requirements/matching - Shop owner: get demands matching shop's category or sent directly to this shop
router.get('/matching', requireAuth, (req, res) => {
  try {
    const shop = getShopForUser(req.user, req.query.shopId);
    if (!shop) {
      return res.status(404).json({ message: 'No shop associated with your account' });
    }

    // Match either direct requirements for this shop OR public broadcast matching category
    const allReqs = db.prepare(`
      SELECT * FROM requirements 
      WHERE status = 'open' 
        AND (
          target_shop_id = ? 
          OR ((target_shop_id IS NULL OR target_shop_id = '') AND LOWER(category) = LOWER(?))
        )
      ORDER BY 
        CASE WHEN target_shop_id = ? THEN 0 ELSE 1 END,
        created_at DESC
    `).all(shop.id, shop.category.trim(), shop.id).map(formatRequirement);

    const matching = allReqs.map(r => {
      let distance = null;
      if (r.latitude && r.longitude && shop.latitude && shop.longitude) {
        distance = calculateDistanceKm(shop.latitude, shop.longitude, r.latitude, r.longitude);
      }
      return { ...r, distanceKm: distance };
    }).filter(r => r.isDirect || r.distanceKm === null || r.distanceKm <= Math.max(r.radiusKm, 15));

    return res.json({ shopCategory: shop.category, shopId: shop.id, shopName: shop.name, count: matching.length, requirements: matching });
  } catch (err) {
    console.error('Matching requirements error:', err);
    return res.status(500).json({ message: 'Failed to retrieve matching requirements' });
  }
});

// POST /api/requirements - Post a new requirement (Direct to shop or Broadcast)
router.post('/', requireAuth, (req, res) => {
  try {
    const { 
      title, description, category, urgency = 'today', budget, 
      radius = 10, phone, area, city, latitude, longitude,
      targetShopId, targetShopName
    } = req.body;

    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!title || !category || cleanPhone.length !== 10) {
      return res.status(400).json({ message: 'Title, category, and an exact 10-digit contact phone number are required' });
    }

    const id = 'req_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    let cleanTargetShopId = targetShopId && String(targetShopId).trim() ? unmaskId(String(targetShopId).trim()) : null;
    let cleanTargetShopName = targetShopName && String(targetShopName).trim() ? String(targetShopName).trim() : null;

    // Verify target shop existence if specified
    if (cleanTargetShopId) {
      const shopRow = db.prepare('SELECT id, name, category, phone, area, city FROM shops WHERE id = ?').get(cleanTargetShopId);
      if (shopRow) {
        cleanTargetShopName = shopRow.name;
        console.log(`📩 [DIRECT INQUIRY ALERT] New requirement "${title.trim()}" posted directly to ${shopRow.name} (${cleanTargetShopId}) by ${req.user.name}`);
      } else {
        // If the targeted shop id does not exist, fallback to clean null
        cleanTargetShopId = null;
        cleanTargetShopName = null;
      }
    }

    db.prepare(`
      INSERT INTO requirements (
        id, customer_id, customer_name, phone, title, description, category,
        urgency, budget, radius_km, area, city, latitude, longitude,
        target_shop_id, target_shop_name, status, responses, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, 'open', '[]', ?, ?
      )
    `).run(
      id, req.user.id, req.user.name, cleanPhone, title.trim(), description ? description.trim() : null, category.trim().toLowerCase(),
      urgency, budget ? budget.trim() : null, Number(radius) || 10, area || req.user.area || 'Nearby Area', city || req.user.city || 'Local Area',
      latitude ? Number(latitude) : 19.1136,
      longitude ? Number(longitude) : 72.8697,
      cleanTargetShopId,
      cleanTargetShopName,
      now, now
    );

    const created = db.prepare('SELECT * FROM requirements WHERE id = ?').get(id);
    const isDirect = Boolean(cleanTargetShopId);
    const message = isDirect 
      ? `Requirement sent directly to ${cleanTargetShopName || 'the shop'}! The merchant will be notified.`
      : 'Requirement broadcasted to all nearby shops!';

    return res.status(201).json({ requirement: formatRequirement(created), message, isDirect });
  } catch (err) {
    console.error('Post requirement error:', err);
    return res.status(500).json({ message: err.message || 'Failed to post requirement' });
  }
});

// POST /api/requirements/:id/respond - Only registered shops matching category can respond
router.post('/:id/respond', requireAuth, (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Response message cannot be empty' });
    }

    const reqItem = db.prepare('SELECT * FROM requirements WHERE id = ?').get(req.params.id);
    if (!reqItem) return res.status(404).json({ message: 'Requirement not found' });

    // 1. Role Enforcement: Must be a shop owner or admin
    const isAdmin = req.user.account_type === 'admin' || req.user.accountType === 'admin';
    let shop = null;

    if (reqItem.target_shop_id) {
      // Direct requirement: Check if the user owns the targeted shop
      const targetedShop = db.prepare('SELECT * FROM shops WHERE id = ?').get(reqItem.target_shop_id);
      if (targetedShop && (targetedShop.owner_id === req.user.id || isAdmin)) {
        shop = targetedShop;
      }
    }

    if (!shop) {
      shop = getShopForUser(req.user, req.body.shopId);
    }

    if (!shop && !isAdmin) {
      return res.status(403).json({
        message: 'Access Denied: Only registered local businesses can submit quotes. Normal users cannot respond to other buyers\' demands as a shop.'
      });
    }

    // 2. Prevent replying to own demand
    if (reqItem.customer_id === req.user.id) {
      return res.status(400).json({ message: 'You cannot reply to your own requirement as a shop.' });
    }

    // 3. Direct Shop Targeting vs Category Matching Enforcement
    if (shop && !isAdmin) {
      if (reqItem.target_shop_id) {
        // Direct requirement: ONLY the targeted shop can respond
        if (reqItem.target_shop_id !== shop.id) {
          return res.status(403).json({
            message: `This requirement was sent directly and exclusively to "${reqItem.target_shop_name || 'another shop'}". Only the targeted merchant can submit quotes.`
          });
        }
      } else {
        // Broadcast requirement: Shop category must match requirement category
        const reqCategory = (reqItem.category || '').trim().toLowerCase();
        const shopCategory = (shop.category || '').trim().toLowerCase();

        if (reqCategory !== shopCategory && reqCategory !== 'all' && reqCategory !== 'general' && reqCategory !== 'other') {
          return res.status(403).json({
            message: `Category Mismatch: Only shops registered under "${reqItem.category.toUpperCase()}" can respond to this requirement. Your shop "${shop.name}" is in the "${shop.category.toUpperCase()}" category.`
          });
        }
      }
    }

    const responses = safeJsonParse(reqItem.responses, []);
    const existingIndex = shop ? responses.findIndex(r => r.shopId === shop.id) : -1;

    const responseObj = {
      id: existingIndex >= 0 ? responses[existingIndex].id : crypto.randomUUID().slice(0, 6),
      shopId: shop ? shop.id : 'admin',
      shopName: shop ? shop.name : (req.user.name + ' (Admin)'),
      shopCategory: shop ? shop.category : reqItem.category,
      shopOwner: shop ? shop.owner_name : req.user.name,
      shopPhone: shop ? shop.phone : (req.user.phone || '9999900000'),
      shopArea: shop ? `${shop.area}${shop.city ? ', ' + shop.city : ''}` : (req.user.area || 'Neighborhood'),
      shopRating: shop ? (shop.rating || 5.0) : 5.0,
      message: message.trim(),
      at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      responses[existingIndex] = responseObj;
    } else {
      responses.push(responseObj);
    }

    db.prepare('UPDATE requirements SET responses = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(responses),
      new Date().toISOString(),
      req.params.id
    );

    return res.json({ 
      message: existingIndex >= 0 ? 'Your response has been updated!' : 'Response sent to customer!',
      responses 
    });
  } catch (err) {
    console.error('Respond requirement error:', err);
    return res.status(500).json({ message: err.message || 'Failed to send response' });
  }
});

// PATCH /api/requirements/:id/status - Mark fulfilled or closed
router.patch('/:id/status', requireAuth, (req, res) => {
  try {
    const { status } = req.body;
    const reqItem = db.prepare('SELECT * FROM requirements WHERE id = ?').get(req.params.id);
    if (!reqItem) return res.status(404).json({ message: 'Requirement not found' });

    if (reqItem.customer_id !== req.user.id && req.user.account_type !== 'admin' && req.user.accountType !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    db.prepare('UPDATE requirements SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), req.params.id);
    return res.json({ message: `Requirement marked as ${status}` });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update requirement status' });
  }
});

// DELETE /api/requirements/:id - Delete requirement
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const reqItem = db.prepare('SELECT * FROM requirements WHERE id = ?').get(req.params.id);
    if (!reqItem) return res.status(404).json({ message: 'Requirement not found' });

    if (reqItem.customer_id !== req.user.id && req.user.account_type !== 'admin' && req.user.accountType !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    db.prepare('DELETE FROM requirements WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Requirement deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete requirement' });
  }
});

module.exports = router;

