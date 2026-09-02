const router = require('express').Router();
const crypto = require('crypto');
const { db } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { unmaskId } = require('../utils/crypto-id');

function getShopForUser(user, shopId = null) {
  if (!user) return null;
  if (shopId) {
    const realId = unmaskId(String(shopId).trim());
    const explicit = db.prepare('SELECT * FROM shops WHERE id = ?').get(realId);
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

const FREE_TIER_PRODUCT_LIMIT = 5;

// GET /api/products/shop/:shopId - Public products for a shop (Accepts encrypted publicId or internal ID)
router.get('/shop/:shopId', (req, res) => {
  try {
    const realShopId = unmaskId(req.params.shopId);
    const products = db.prepare('SELECT * FROM products WHERE shop_id = ? ORDER BY created_at DESC').all(realShopId).map(p => ({
      id: p.id,
      shopId: p.shop_id,
      name: p.name,
      price: Number(p.price) || 0,
      originalPrice: p.original_price ? Number(p.original_price) : null,
      description: p.description,
      category: p.category,
      imageUrl: p.image_url,
      inStock: Boolean(p.in_stock),
      createdAt: p.created_at
    }));
    return res.json({ products });
  } catch (err) {
    console.error('Fetch shop products error:', err);
    return res.status(500).json({ message: 'Failed to retrieve products' });
  }
});

// GET /api/products/mine - Shop owner's products
router.get('/mine', requireAuth, (req, res) => {
  try {
    const shop = getShopForUser(req.user, req.query.shopId);
    if (!shop) return res.status(404).json({ message: 'No shop associated with your account' });

    const products = db.prepare('SELECT * FROM products WHERE shop_id = ? ORDER BY created_at DESC').all(shop.id).map(p => ({
      id: p.id,
      shopId: p.shop_id,
      name: p.name,
      price: Number(p.price) || 0,
      originalPrice: p.original_price ? Number(p.original_price) : null,
      description: p.description,
      category: p.category,
      imageUrl: p.image_url,
      inStock: Boolean(p.in_stock),
      createdAt: p.created_at
    }));

    const isPro = Boolean(shop.featured);
    const limit = isPro ? 100 : FREE_TIER_PRODUCT_LIMIT;

    return res.json({
      shopId: shop.id,
      shopName: shop.name,
      products,
      usage: {
        count: products.length,
        limit,
        isPro,
        remaining: Math.max(0, limit - products.length)
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to retrieve your products' });
  }
});

// POST /api/products - Add product with free tier limit check
router.post('/', requireAuth, (req, res) => {
  try {
    const shop = getShopForUser(req.user, req.body.shopId);
    if (!shop) return res.status(403).json({ message: 'Only registered shop owners can add products' });

    // Check product limits
    const currentCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE shop_id = ?').get(shop.id).count;
    const isPro = Boolean(shop.featured);

    if (!isPro && currentCount >= FREE_TIER_PRODUCT_LIMIT) {
      return res.status(403).json({
        message: `Free Tier limit reached (${currentCount}/${FREE_TIER_PRODUCT_LIMIT} products). Upgrade to Pro for unlimited catalog!`,
        limitReached: true
      });
    }

    const { name, price, originalPrice, description, category, imageUrl, inStock = true } = req.body;
    if (!name || price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ message: 'Product name and a valid price are required' });
    }

    const id = 'prod_' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO products (id, shop_id, name, price, original_price, description, category, image_url, in_stock, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, shop.id, name.trim(), Number(price), originalPrice ? Number(originalPrice) : null,
      description ? description.trim() : null, category ? category.trim() : null,
      imageUrl || null, inStock ? 1 : 0, now, now
    );

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.status(201).json({
      product: {
        ...created,
        price: Number(created.price),
        originalPrice: created.original_price ? Number(created.original_price) : null,
        inStock: Boolean(created.in_stock)
      },
      message: 'Product added to your catalog!'
    });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ message: err.message || 'Failed to add product' });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', requireAuth, (req, res) => {
  try {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!prod) return res.status(404).json({ message: 'Product not found' });

    const shop = db.prepare('SELECT id FROM shops WHERE owner_id = ?').get(req.user.id);
    if (!shop || shop.id !== prod.shop_id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { name, price, originalPrice, description, category, imageUrl, inStock } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE products SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        original_price = COALESCE(?, original_price),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        image_url = COALESCE(?, image_url),
        in_stock = COALESCE(?, in_stock),
        updated_at = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : null,
      price !== undefined ? Number(price) : null,
      originalPrice !== undefined ? Number(originalPrice) : null,
      description !== undefined ? description.trim() : null,
      category !== undefined ? category.trim() : null,
      imageUrl !== undefined ? imageUrl : null,
      inStock !== undefined ? (inStock ? 1 : 0) : null,
      now, req.params.id
    );

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    return res.json({ product: updated, message: 'Product updated successfully' });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ message: 'Failed to update product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!prod) return res.status(404).json({ message: 'Product not found' });

    const shop = db.prepare('SELECT id FROM shops WHERE owner_id = ?').get(req.user.id);
    if (!shop || shop.id !== prod.shop_id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Product removed from catalog' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete product' });
  }
});

module.exports = router;

