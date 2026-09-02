const router = require('express').Router();
const crypto = require('crypto');
const { db, safeJsonParse } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

function getShopForUser(user, shopId = null) {
  if (!user) return null;
  if (shopId) {
    const explicit = db.prepare('SELECT * FROM shops WHERE id = ?').get(String(shopId).trim());
    if (explicit && (explicit.owner_id === user.id || user.account_type === 'admin' || user.accountType === 'admin')) {
      return explicit;
    }
  }
  const userShopId = user.shop_id || user.shopId;
  if (userShopId) {
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(userShopId);
    if (shop) return shop;
  }
  return db.prepare('SELECT * FROM shops WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1').get(user.id);
}

// GET /api/offers - List all active neighborhood deals
router.get('/', (req, res) => {
  try {
    const offers = db.prepare(`
      SELECT o.*, s.name as shop_name, s.category, s.area, s.city, s.phone, s.whatsapp, s.images as shop_images
      FROM offers o
      JOIN shops s ON o.shop_id = s.id
      WHERE s.status = 'active'
      ORDER BY o.created_at DESC
    `).all().map(row => ({
      id: row.id,
      shopId: row.shop_id,
      shopName: row.shop_name,
      category: row.category,
      area: row.area,
      city: row.city,
      phone: row.phone,
      whatsapp: row.whatsapp,
      shopImages: safeJsonParse(row.shop_images, []),
      title: row.title,
      description: row.description,
      discount: row.discount,
      validTill: row.valid_till,
      createdAt: row.created_at
    }));

    return res.json({ offers });
  } catch (err) {
    console.error('Fetch offers error:', err);
    return res.status(500).json({ message: 'Failed to retrieve offers' });
  }
});

// POST /api/offers - Shop owner posts an offer
router.post('/', requireAuth, (req, res) => {
  try {
    const shop = getShopForUser(req.user, req.body.shopId);
    if (!shop) return res.status(403).json({ message: 'Only shop owners can post offers' });

    const { title, description, discount, validTill } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Offer title is required' });

    const id = 'offer_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO offers (id, shop_id, title, description, discount, valid_till, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, shop.id, title.trim(), description ? description.trim() : null, discount ? discount.trim() : 'Special Deal', validTill ? validTill.trim() : 'Limited Period', now);

    const created = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
    return res.status(201).json({ offer: created, message: 'Offer published to neighborhood!' });
  } catch (err) {
    console.error('Create offer error:', err);
    return res.status(500).json({ message: err.message || 'Failed to publish offer' });
  }
});

// DELETE /api/offers/:id
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const shop = db.prepare('SELECT id FROM shops WHERE owner_id = ?').get(req.user.id);
    if ((!shop || shop.id !== offer.shop_id) && req.user.accountType !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    db.prepare('DELETE FROM offers WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Offer removed' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to remove offer' });
  }
});

module.exports = router;

