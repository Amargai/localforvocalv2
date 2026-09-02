const router = require('express').Router();
const { db } = require('../config/db');

function formatCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || '🏷️',
    color: row.color || '#10b981',
    desc: row.description || '',
    description: row.description || '',
    subCategories: JSON.parse(row.sub_categories || '[]'),
    suggestedTags: JSON.parse(row.suggested_tags || '[]'),
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order || 0),
    shopCount: Number(row.shop_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// GET /api/categories - List active categories
router.get('/', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM shops s WHERE s.category = c.id AND s.status = 'active') as shop_count
      FROM categories c
      WHERE c.is_active = 1
      ORDER BY c.display_order ASC, c.name ASC
    `).all().map(formatCategory);

    return res.json({ categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

// GET /api/categories/:id - Single category details
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM shops s WHERE s.category = c.id AND s.status = 'active') as shop_count
      FROM categories c
      WHERE c.id = ?
    `).get(req.params.id);

    if (!row) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.json({ category: formatCategory(row) });
  } catch (err) {
    console.error('Error fetching category:', err);
    return res.status(500).json({ message: 'Failed to fetch category' });
  }
});

module.exports = router;
