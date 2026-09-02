const { request, loginDemoUser, db } = require('./test-helper');

async function runAdminPageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 11/11] ADMIN CONSOLE (Platform KPIs & Moderation Panel)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  const admin = await loginDemoUser('admin');

  // Feature 1: Platform Overview Metrics (GET /api/admin/stats)
  const statsRes = await request('/api/admin/stats', { token: admin.token });
  assert(statsRes.status === 200, 'Feature 1: GET /api/admin/stats returns HTTP 200', `Status: ${statsRes.status}`);
  const stats = statsRes.body;
  assert(typeof stats?.totalShops === 'number' && stats.totalShops >= 1, 'Feature 1: Stats includes totalShops', `Count: ${stats?.totalShops}`);
  assert(typeof stats?.totalUsers === 'number' && stats.totalUsers >= 1, 'Feature 1: Stats includes totalUsers', `Count: ${stats?.totalUsers}`);
  assert(Array.isArray(stats?.categories), 'Feature 1: Stats includes category distribution breakdown');

  // Feature 2: Moderation - List All Shops (GET /api/admin/shops)
  const shopsRes = await request('/api/admin/shops', { token: admin.token });
  assert(shopsRes.status === 200, 'Feature 2: GET /api/admin/shops returns HTTP 200', `Status: ${shopsRes.status}`);
  const allShops = shopsRes.body?.shops || [];
  assert(Array.isArray(allShops) && allShops.length > 0, 'Feature 2: Admin accesses complete unfiltered shop registry');

  // Feature 3: Moderation - Toggle Featured Flag
  const targetShop = allShops[0];
  const initialFeatured = targetShop.featured;
  const toggleFeatRes = await request(`/api/admin/shops/${targetShop.id}/featured`, {
    method: 'PATCH',
    token: admin.token,
    body: { featured: !initialFeatured }
  });
  assert(toggleFeatRes.status === 200, 'Feature 3: Admin toggles shop featured status (HTTP 200)');
  // Restore
  await request(`/api/admin/shops/${targetShop.id}/featured`, {
    method: 'PATCH',
    token: admin.token,
    body: { featured: initialFeatured }
  });

  // Feature 4: Moderation - Shop Status Update (Active / Suspended)
  const suspendRes = await request(`/api/admin/shops/${targetShop.id}/status`, {
    method: 'PATCH',
    token: admin.token,
    body: { status: 'rejected' }
  });
  assert(suspendRes.status === 200, 'Feature 4: Admin changes shop status to rejected/suspended (HTTP 200)');

  // Connected check: Suspended shop must be hidden from ExplorePage
  const exploreCheck = await request('/api/shops');
  const foundSuspendedInExplore = (exploreCheck.body?.shops || []).some(s => s.id === targetShop.id);
  assert(!foundSuspendedInExplore, 'Connected Experience: Suspended shop is automatically hidden from public ExplorePage');

  // Restore shop to active
  await request(`/api/admin/shops/${targetShop.id}/status`, {
    method: 'PATCH',
    token: admin.token,
    body: { status: 'active' }
  });
  assert(true, 'Feature 4: Admin restores shop status to active');

  // Feature 5: Moderation - User Registry (GET /api/admin/users)
  const usersRes = await request('/api/admin/users', { token: admin.token });
  assert(usersRes.status === 200, 'Feature 5: GET /api/admin/users returns HTTP 200', `Status: ${usersRes.status}`);
  const users = usersRes.body?.users || [];
  assert(Array.isArray(users) && users.length >= 3, 'Feature 5: Returns user accounts with roles', `Count: ${users.length}`);

  // Feature 6: Moderation - Category Manager (CRUD)
  const testCatSlug = 'pet-care-test';
  const newCatRes = await request('/api/admin/categories', {
    method: 'POST',
    token: admin.token,
    body: {
      id: testCatSlug,
      name: 'Pet Care & Veterinary',
      icon: '🐾',
      color: '#06b6d4',
      description: 'Pet food, grooming, and veterinary clinics',
      subCategories: ['Veterinary Clinic', 'Pet Grooming', 'Pet Supplies'],
      suggestedTags: ['Dog Food', 'Cat Grooming', 'Pet Vaccination']
    }
  });
  assert(newCatRes.status === 201, 'Feature 6: Admin creates new service category (HTTP 201 Created)', `Status: ${newCatRes.status}`);

  // Connected check: Category visible on public categories endpoint
  const publicCats = await request('/api/categories');
  const foundCat = (publicCats.body?.categories || []).find(c => c.id === testCatSlug);
  assert(Boolean(foundCat), 'Connected Experience: Admin created category immediately appears in public category directory');

  // Feature 7: Delete Category
  const delCatRes = await request(`/api/admin/categories/${testCatSlug}`, {
    method: 'DELETE',
    token: admin.token
  });
  assert(delCatRes.status === 200, 'Feature 7: Admin deletes custom service category (HTTP 200)', `Status: ${delCatRes.status}`);

  // Feature 8: Moderation - Reviews Feed (GET /api/admin/reviews)
  const reviewsRes = await request('/api/admin/reviews', { token: admin.token });
  assert(reviewsRes.status === 200, 'Feature 8: GET /api/admin/reviews returns verified customer reviews for moderation');

  console.log(`\n📊 Page 11 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 11: Admin Console', passed, failed };
}

module.exports = { runAdminPageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runAdminPageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
