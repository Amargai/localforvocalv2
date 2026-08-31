const router = require('express').Router();
const crypto = require('crypto');
const { db } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

// GET /api/offers - List all active neighborhood deals
router.get('/', (req, res) => {
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
    shopImages: JSON.parse(row.shop_images || '[]'),
    title: row.title,
    description: row.description,
    discount: row.discount,
    validTill: row.valid_till,
    createdAt: row.created_at
  }));

  return res.json({ offers });
});

// POST /api/offers - Shop owner posts an offer
router.post('/', requireAuth, (req, res) => {
  const shop = db.prepare('SELECT id FROM shops WHERE owner_id = ?').get(req.user.id);
  if (!shop) return res.status(403).json({ message: 'Only shop owners can post offers' });

  const { title, description, discount, validTill } = req.body;
  if (!title) return res.status(400).json({ message: 'Offer title is required' });

  const id = 'offer_' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO offers (id, shop_id, title, description, discount, valid_till, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, shop.id, title, description || null, discount || 'Special Deal', validTill || 'Limited Period', now);

  const created = db.prepare('SELECT * FROM offers WHERE id = ?').get(id);
  return res.status(201).json({ offer: created, message: 'Offer published to neighborhood!' });
});

// DELETE /api/offers/:id
router.delete('/:id', requireAuth, (req, res) => {
  const shop = db.prepare('SELECT id FROM shops WHERE owner_id = ?').get(req.user.id);
  if (!shop && req.user.accountType !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  db.prepare('DELETE FROM offers WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Offer removed' });
});

module.exports = router;
