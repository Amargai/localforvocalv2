const router = require('express').Router();
const { db, safeJsonParse } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// All admin routes require admin role
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/stats - Overview statistics
router.get('/stats', (req, res) => {
  try {
    const totalShops = db.prepare('SELECT COUNT(*) as count FROM shops').get().count;
    const activeShops = db.prepare("SELECT COUNT(*) as count FROM shops WHERE status = 'active'").get().count;
    const pendingShops = db.prepare("SELECT COUNT(*) as count FROM shops WHERE status = 'pending'").get().count;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const openReqs = db.prepare("SELECT COUNT(*) as count FROM requirements WHERE status = 'open'").get().count;
    const totalReviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;

    const categoryBreakdown = db.prepare(`
      SELECT category, COUNT(*) as count FROM shops GROUP BY category ORDER BY count DESC
    `).all();

    return res.json({
      totalShops,
      activeShops,
      pendingShops,
      totalUsers,
      openRequirements: openReqs,
      totalReviews,
      categories: categoryBreakdown
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ message: 'Failed to retrieve admin stats' });
  }
});

// GET /api/admin/shops - All shops with full status
router.get('/shops', (req, res) => {
  try {
    const shops = db.prepare('SELECT * FROM shops ORDER BY created_at DESC').all().map(s => ({
      ...s,
      tags: safeJsonParse(s.tags, []),
      images: safeJsonParse(s.images, []),
      featured: Boolean(s.featured),
      availableToday: Boolean(s.available_today)
    }));
    return res.json({ shops });
  } catch (err) {
    console.error('Admin shops error:', err);
    return res.status(500).json({ message: 'Failed to retrieve shops' });
  }
});

// PATCH /api/admin/shops/:id/status - Approve or reject
router.patch('/shops/:id/status', (req, res) => {
  try {
    const { status } = req.body; // 'active', 'rejected', 'pending'
    if (!['active', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Choose active, rejected, or pending.' });
    }
    db.prepare('UPDATE shops SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), req.params.id);
    return res.json({ message: `Shop status updated to ${status}` });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update shop status' });
  }
});

// PATCH /api/admin/shops/:id/featured - Toggle featured
router.patch('/shops/:id/featured', (req, res) => {
  try {
    const { featured } = req.body;
    db.prepare('UPDATE shops SET featured = ?, updated_at = ? WHERE id = ?').run(featured ? 1 : 0, new Date().toISOString(), req.params.id);
    return res.json({ message: `Shop featured flag set to ${Boolean(featured)}` });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to toggle featured flag' });
  }
});

// GET /api/admin/users - List users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, phone, email, account_type, area, city, created_at FROM users ORDER BY created_at DESC').all();
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to retrieve users' });
  }
});

// GET /api/admin/requirements - All requirements
router.get('/requirements', (req, res) => {
  try {
    const reqs = db.prepare('SELECT * FROM requirements ORDER BY created_at DESC').all().map(r => ({
      ...r,
      responses: safeJsonParse(r.responses, [])
    }));
    return res.json({ requirements: reqs });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to retrieve requirements' });
  }
});

// GET /api/admin/reviews - All reviews with shop details
router.get('/reviews', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, s.name as shop_name, s.category as shop_category
      FROM reviews r
      JOIN shops s ON r.shop_id = s.id
      ORDER BY r.created_at DESC
    `).all();
    return res.json({ reviews });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to retrieve reviews' });
  }
});

// DELETE /api/admin/reviews/:id - Remove review
router.delete('/reviews/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete review' });
  }
});

// DELETE /api/admin/shops/:id - Delete shop
router.delete('/shops/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM shops WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Shop deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete shop' });
  }
});

// GET /api/admin/categories - All categories with full shop & requirement stats
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*,

        (SELECT COUNT(*) FROM shops s WHERE s.category = c.id) as total_shops,
        (SELECT COUNT(*) FROM shops s WHERE s.category = c.id AND s.status = 'active') as active_shops,
        (SELECT COUNT(*) FROM requirements r WHERE r.category = c.id) as requirement_count
      FROM categories c
      ORDER BY c.display_order ASC, c.name ASC
    `).all().map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon || '🏷️',
      color: c.color || '#10b981',
      description: c.description || '',
      desc: c.description || '',
      subCategories: JSON.parse(c.sub_categories || '[]'),
      suggestedTags: JSON.parse(c.suggested_tags || '[]'),
      isActive: Boolean(c.is_active),
      displayOrder: Number(c.display_order || 0),
      totalShops: Number(c.total_shops || 0),
      activeShops: Number(c.active_shops || 0),
      shopCount: Number(c.active_shops || 0),
      requirementCount: Number(c.requirement_count || 0),
      createdAt: c.created_at,
      updatedAt: c.updated_at
    }));

    return res.json({ categories });
  } catch (err) {
    console.error('Error fetching admin categories:', err);
    return res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// POST /api/admin/categories - Create new category
router.post('/categories', (req, res) => {
  try {
    const { id, name, icon, color, description, subCategories, suggestedTags } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Generate or sanitize slug
    let slug = id ? id.trim().toLowerCase() : name.trim().toLowerCase();
    slug = slug.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    if (!slug) {
      slug = 'cat-' + Math.random().toString(36).substring(2, 8);
    }

    // Check if ID already exists
    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(slug);
    if (existing) {
      return res.status(400).json({ message: `A category with identifier "${slug}" already exists. Please choose a different name or ID.` });
    }

    let parsedSubs = [];
    if (Array.isArray(subCategories)) {
      parsedSubs = subCategories.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof subCategories === 'string') {
      parsedSubs = subCategories.split(',').map(s => s.trim()).filter(Boolean);
    }

    let parsedTags = [];
    if (Array.isArray(suggestedTags)) {
      parsedTags = suggestedTags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof suggestedTags === 'string') {
      parsedTags = suggestedTags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const maxOrderRow = db.prepare('SELECT MAX(display_order) as maxOrder FROM categories').get();
    const nextOrder = (maxOrderRow && maxOrderRow.maxOrder !== null) ? Number(maxOrderRow.maxOrder) + 1 : 1;

    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO categories (id, name, icon, color, description, sub_categories, suggested_tags, is_active, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      slug,
      name.trim(),
      (icon && icon.trim()) || '🏷️',
      (color && color.trim()) || '#10b981',
      (description && description.trim()) || null,
      JSON.stringify(parsedSubs),
      JSON.stringify(parsedTags),
      nextOrder,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(slug);
    return res.status(201).json({
      message: `Category "${name.trim()}" created successfully!`,
      category: {
        id: created.id,
        name: created.name,
        icon: created.icon,
        color: created.color,
        description: created.description || '',
        desc: created.description || '',
        subCategories: JSON.parse(created.sub_categories || '[]'),
        suggestedTags: JSON.parse(created.suggested_tags || '[]'),
        isActive: Boolean(created.is_active),
        displayOrder: Number(created.display_order),
        shopCount: 0,
        createdAt: created.created_at,
        updatedAt: created.updated_at
      }
    });
  } catch (err) {
    console.error('Error creating category:', err);
    return res.status(500).json({ message: 'Failed to create category' });
  }
});

// PUT /api/admin/categories/:id - Update category
router.put('/categories/:id', (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const { name, icon, color, description, subCategories, suggestedTags, isActive, displayOrder } = req.body;

    let parsedSubs = undefined;
    if (subCategories !== undefined) {
      if (Array.isArray(subCategories)) {
        parsedSubs = JSON.stringify(subCategories.map(s => String(s).trim()).filter(Boolean));
      } else if (typeof subCategories === 'string') {
        parsedSubs = JSON.stringify(subCategories.split(',').map(s => s.trim()).filter(Boolean));
      }
    }

    let parsedTags = undefined;
    if (suggestedTags !== undefined) {
      if (Array.isArray(suggestedTags)) {
        parsedTags = JSON.stringify(suggestedTags.map(t => String(t).trim()).filter(Boolean));
      } else if (typeof suggestedTags === 'string') {
        parsedTags = JSON.stringify(suggestedTags.split(',').map(t => t.trim()).filter(Boolean));
      }
    }

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        icon = COALESCE(?, icon),
        color = COALESCE(?, color),
        description = COALESCE(?, description),
        sub_categories = COALESCE(?, sub_categories),
        suggested_tags = COALESCE(?, suggested_tags),
        is_active = COALESCE(?, is_active),
        display_order = COALESCE(?, display_order),
        updated_at = ?
      WHERE id = ?
    `).run(
      name !== undefined ? name.trim() : null,
      icon !== undefined ? icon.trim() : null,
      color !== undefined ? color.trim() : null,
      description !== undefined ? description.trim() : null,
      parsedSubs !== undefined ? parsedSubs : null,
      parsedTags !== undefined ? parsedTags : null,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      displayOrder !== undefined ? Number(displayOrder) : null,
      now,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    return res.json({
      message: 'Category updated successfully',
      category: {
        id: updated.id,
        name: updated.name,
        icon: updated.icon,
        color: updated.color,
        description: updated.description || '',
        desc: updated.description || '',
        subCategories: JSON.parse(updated.sub_categories || '[]'),
        suggestedTags: JSON.parse(updated.suggested_tags || '[]'),
        isActive: Boolean(updated.is_active),
        displayOrder: Number(updated.display_order),
        updatedAt: updated.updated_at
      }
    });
  } catch (err) {
    console.error('Error updating category:', err);
    return res.status(500).json({ message: 'Failed to update category' });
  }
});

// DELETE /api/admin/categories/:id - Delete category
router.delete('/categories/:id', (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const shopCount = db.prepare('SELECT COUNT(*) as count FROM shops WHERE category = ?').get(req.params.id).count;
    if (shopCount > 0) {
      db.prepare("UPDATE shops SET category = 'other' WHERE category = ?").run(req.params.id);
      db.prepare("UPDATE requirements SET category = 'other' WHERE category = ?").run(req.params.id);
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    return res.json({ message: `Category "${category.name}" deleted successfully${shopCount > 0 ? ` (${shopCount} shops reassigned to Other)` : ''}` });
  } catch (err) {
    console.error('Error deleting category:', err);
    return res.status(500).json({ message: 'Failed to delete category' });
  }
});

// GET /api/admin/activity - Recent activity stream
router.get('/activity', (req, res) => {
  const recentShops = db.prepare('SELECT id, name, category, status, created_at FROM shops ORDER BY created_at DESC LIMIT 5').all().map(s => ({
    type: 'shop',
    title: `New shop registered — ${s.name}`,
    time: s.created_at,
    status: s.status,
    badge: s.status === 'pending' ? 'Pending' : 'Active'
  }));

  const recentUsers = db.prepare('SELECT id, name, account_type, created_at FROM users ORDER BY created_at DESC LIMIT 5').all().map(u => ({
    type: 'user',
    title: `New user joined — ${u.name}`,
    time: u.created_at,
    badge: u.account_type
  }));

  const recentReqs = db.prepare('SELECT id, title, category, created_at FROM requirements ORDER BY created_at DESC LIMIT 5').all().map(r => ({
    type: 'requirement',
    title: `Requirement posted — ${r.title}`,
    time: r.created_at,
    badge: r.category
  }));

  const activities = [...recentShops, ...recentUsers, ...recentReqs]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);

  return res.json({ activities });
});

module.exports = router;

