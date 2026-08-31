const router = require('express').Router();
const { db } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

// All admin routes require admin role
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/stats - Overview statistics
router.get('/stats', (req, res) => {
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
});

// GET /api/admin/shops - All shops with full status
router.get('/shops', (req, res) => {
  const shops = db.prepare('SELECT * FROM shops ORDER BY created_at DESC').all().map(s => ({
    ...s,
    tags: JSON.parse(s.tags || '[]'),
    images: JSON.parse(s.images || '[]'),
    featured: Boolean(s.featured),
    availableToday: Boolean(s.available_today)
  }));
  return res.json({ shops });
});

// PATCH /api/admin/shops/:id/status - Approve or reject
router.patch('/shops/:id/status', (req, res) => {
  const { status } = req.body; // 'active', 'rejected', 'pending'
  db.prepare('UPDATE shops SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), req.params.id);
  return res.json({ message: `Shop status updated to ${status}` });
});

// PATCH /api/admin/shops/:id/featured - Toggle featured
router.patch('/shops/:id/featured', (req, res) => {
  const { featured } = req.body;
  db.prepare('UPDATE shops SET featured = ?, updated_at = ? WHERE id = ?').run(featured ? 1 : 0, new Date().toISOString(), req.params.id);
  return res.json({ message: `Shop featured flag set to ${Boolean(featured)}` });
});

// GET /api/admin/users - List users
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id, name, phone, email, account_type, area, city, created_at FROM users ORDER BY created_at DESC').all();
  return res.json({ users });
});

// GET /api/admin/requirements - All requirements
router.get('/requirements', (req, res) => {
  const reqs = db.prepare('SELECT * FROM requirements ORDER BY created_at DESC').all().map(r => ({
    ...r,
    responses: JSON.parse(r.responses || '[]')
  }));
  return res.json({ requirements: reqs });
});

// GET /api/admin/reviews - All reviews with shop details
router.get('/reviews', (req, res) => {
  const reviews = db.prepare(`
    SELECT r.*, s.name as shop_name, s.category as shop_category
    FROM reviews r
    JOIN shops s ON r.shop_id = s.id
    ORDER BY r.created_at DESC
  `).all();
  return res.json({ reviews });
});

// DELETE /api/admin/reviews/:id - Remove review
router.delete('/reviews/:id', (req, res) => {
  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Review deleted successfully' });
});

// DELETE /api/admin/shops/:id - Delete shop
router.delete('/shops/:id', (req, res) => {
  db.prepare('DELETE FROM shops WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Shop deleted successfully' });
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
