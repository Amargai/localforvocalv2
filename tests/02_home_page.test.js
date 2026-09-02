const { request, loginDemoUser, db } = require('./test-helper');

async function runHomePageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 2/11] HOMEPAGE (Neighborhood Discovery & Highlights)');
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

  // Feature 1: Featured Neighborhood Businesses Feed
  const featuredRes = await request('/api/shops/featured');
  assert(featuredRes.status === 200, 'Feature 1: GET /api/shops/featured returns HTTP 200', `Status: ${featuredRes.status}`);
  const featuredShops = featuredRes.body?.shops || [];
  assert(Array.isArray(featuredShops) && featuredShops.length > 0, 'Feature 1: Returns verified featured businesses', `Count: ${featuredShops.length}`);
  const allFeatured = featuredShops.every(s => s.featured === true && s.status === 'active');
  assert(allFeatured, 'Feature 1: Every returned business has active status and featured = true');

  // Verify Shop entity attributes required on HomePage cards
  const firstShop = featuredShops[0];
  assert(Boolean(firstShop.name && firstShop.category && firstShop.phone), 'Feature 1: Shop entity contains name, category, phone');
  assert(typeof firstShop.rating === 'number' && firstShop.rating >= 0, 'Feature 1: Rating is numeric', `Rating: ${firstShop.rating}`);
  assert(Array.isArray(firstShop.tags), 'Feature 1: Shop tags formatted as Array');

  // Feature 2: Service Categories Grid
  const catRes = await request('/api/categories');
  assert(catRes.status === 200, 'Feature 2: GET /api/categories returns HTTP 200', `Status: ${catRes.status}`);
  const categories = catRes.body?.categories || [];
  assert(Array.isArray(categories) && categories.length >= 10, 'Feature 2: Categories loaded for quick exploration grid', `Count: ${categories.length}`);
  const firstCat = categories[0];
  assert(Boolean(firstCat.id && firstCat.name && firstCat.icon), 'Feature 2: Category entity contains id, name, icon');

  // Feature 3: Live Community Demands Feed
  const reqsRes = await request('/api/requirements?limit=10');
  assert(reqsRes.status === 200, 'Feature 3: GET /api/requirements?limit=10 returns HTTP 200', `Status: ${reqsRes.status}`);
  const recentReqs = reqsRes.body?.requirements || [];
  assert(Array.isArray(recentReqs), 'Feature 3: Live neighborhood demands stream returns list');

  // Feature 4: User Demands Privacy Filter (Exclude own demands on HomePage)
  const cust = await loginDemoUser('customer');
  const userReqUrl = `/api/requirements?excludeUser=${encodeURIComponent(cust.user.id)}&limit=10`;
  const filteredReqsRes = await request(userReqUrl);
  assert(filteredReqsRes.status === 200, 'Feature 4: HomePage demand feed with excludeUser returns HTTP 200');
  const filteredReqs = filteredReqsRes.body?.requirements || [];
  const noOwnReqs = filteredReqs.every(r => r.customerId !== cust.user.id);
  assert(noOwnReqs, 'Feature 4: Logged-in customer\'s own posted demands are filtered out from public discovery stream');

  // Feature 5: Hero Search Query Integration
  const searchTestRes = await request('/api/shops?q=Chemist');
  assert(searchTestRes.status === 200, 'Feature 5: Hero search keyword query returns HTTP 200');
  const searchMatches = searchTestRes.body?.shops || [];
  assert(searchMatches.some(s => s.name.toLowerCase().includes('chemist') || s.category.toLowerCase().includes('medical')),
    'Feature 5: Search query "Chemist" correctly returns matching neighborhood shops');

  // Feature 6: Connected Experience: Shop Card Direct Link
  const shopDetailRes = await request(`/api/shops/${firstShop.id}`);
  assert(shopDetailRes.status === 200, 'Connected Experience: Featured shop on HomePage correctly resolves to full Storefront Profile', `Status: ${shopDetailRes.status}`);
  assert(shopDetailRes.body?.shop?.id === firstShop.id, 'Connected Experience: Storefront ID matches selected card');

  console.log(`\n📊 Page 2 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 2: HomePage', passed, failed };
}

module.exports = { runHomePageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runHomePageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
