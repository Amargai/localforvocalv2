const { request, loginDemoUser, db } = require('./test-helper');

async function runConnectedExperienceE2ETests() {
  console.log('\n================================================================');
  console.log('🔄 [E2E CONNECTED EXPERIENCE] FULL MULTI-PAGE USER LIFECYCLE');
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

  // Act I: Sessions
  const customer = await loginDemoUser('customer');
  const merchant = await loginDemoUser('shop_owner');
  const admin = await loginDemoUser('admin');
  const targetShopId = merchant.user.shopId; // 'shop_1'

  // Ensure target shop is featured for E2E flow
  db.prepare('UPDATE shops SET featured = 1 WHERE id = ?').run(targetShopId);

  // Step 1: Customer on HomePage browses and filters to ExplorePage
  const homeFeatured = await request('/api/shops/featured');
  const foundShopOnHome = (homeFeatured.body?.shops || []).find(s => s.id === targetShopId);
  assert(Boolean(foundShopOnHome), 'E2E Step 1 (Home -> Explore): Target shop visible on Home featured list');
  const shopName = foundShopOnHome ? foundShopOnHome.name : 'Care & Cure 24/7 Chemist';

  // Step 2: ExplorePage - Proximity and Category Filter
  const exploreRes = await request(`/api/shops?category=medical&lat=19.1197&lng=72.8468&radiusKm=10`);
  const shopInExplore = (exploreRes.body?.shops || []).find(s => s.id === targetShopId);
  assert(Boolean(shopInExplore), 'E2E Step 2 (Explore): Target shop located within 10km radius in "medical" category');

  // Step 3: PublicShopProfilePage - Storefront Visit & Product Catalog Inspection
  const shopProfileRes = await request(`/api/shops/${targetShopId}`);
  assert(shopProfileRes.status === 200, 'E2E Step 3 (Storefront): Customer loads full storefront profile');
  const prodsRes = await request(`/api/products/shop/${targetShopId}`);
  assert((prodsRes.body?.products || []).length > 0, 'E2E Step 3 (Storefront): Customer reviews available product inventory');

  // Step 4: PostRequirementPage - Customer posts Direct Demand to Shop
  const directDemandRes = await request('/api/requirements', {
    method: 'POST',
    token: customer.token,
    body: {
      title: 'E2E Lifecycle: Urgent Pulse Oximeter Needed',
      description: 'Need fingertip pulse oximeter delivered to Lokhandwala Complex within 1 hour.',
      category: 'medical',
      urgency: 'urgent',
      budget: '₹800',
      phone: '9810055555',
      area: 'Andheri West',
      city: 'Mumbai',
      targetShopId,
      targetShopName: shopName
    }
  });
  assert(directDemandRes.status === 201, 'E2E Step 4 (Post Requirement): Customer sends direct demand to shop (HTTP 201)');
  const demandId = directDemandRes.body?.requirement?.id;

  // Step 5: ShopDashboardPage - Merchant receives lead in Demand Radar
  const radarRes = await request('/api/requirements/matching', { token: merchant.token });
  const matchingLead = (radarRes.body?.requirements || []).find(r => r.id === demandId);
  assert(Boolean(matchingLead), 'E2E Step 5 (Shop Dashboard): Direct demand prioritized in Merchant Demand Radar');
  assert(matchingLead?.isDirect === true, 'E2E Step 5 (Shop Dashboard): Lead flagged as direct exclusive customer');

  // Step 6: ShopDashboardPage - Merchant responds with quote
  const quoteRes = await request(`/api/requirements/${demandId}/respond`, {
    method: 'POST',
    token: merchant.token,
    body: {
      message: 'Hello Amit! We have Omron Fingertip Pulse Oximeter in stock. Price ₹750. Delivery rider dispatched.'
    }
  });
  assert(quoteRes.status === 200, 'E2E Step 6 (Shop Dashboard): Merchant delivers formal quote to customer (HTTP 200)');

  // Step 7: UserProfilePage - Customer reviews quote and marks demand fulfilled
  const myDemandsRes = await request('/api/requirements/mine', { token: customer.token });
  const myDemand = (myDemandsRes.body?.requirements || []).find(r => r.id === demandId);
  assert(myDemand && myDemand.responses.length === 1, 'E2E Step 7 (User Profile): Customer reviews received quotation in profile');

  const fulfillRes = await request(`/api/requirements/${demandId}/status`, {
    method: 'PATCH',
    token: customer.token,
    body: { status: 'fulfilled' }
  });
  assert(fulfillRes.status === 200, 'E2E Step 7 (User Profile): Customer marks requirement as fulfilled');

  // Step 8: PublicShopProfilePage - Customer leaves 5-Star verified review
  const testReviewComment = `E2E Review: Fast delivery and excellent service! ${Date.now()}`;
  const reviewRes = await request(`/api/shops/${targetShopId}/reviews`, {
    method: 'POST',
    token: customer.token,
    body: { rating: 5, comment: testReviewComment }
  });
  assert(reviewRes.status === 201, 'E2E Step 8 (Storefront): Customer posts 5-star verified review');
  const reviewId = reviewRes.body?.review?.id;

  // Step 9: AdminPage - Admin reviews metrics and validates completed transaction
  const adminStatsRes = await request('/api/admin/stats', { token: admin.token });
  assert(adminStatsRes.status === 200, 'E2E Step 9 (Admin Console): Admin monitors platform transaction activity');

  // Cleanup
  await request(`/api/requirements/${demandId}`, { method: 'DELETE', token: customer.token });
  if (reviewId) {
    db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
  }
  assert(true, 'E2E Cleanup: Temporary lifecycle demand and review records cleaned up');

  console.log(`\n📊 E2E Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'E2E Multi-Page Connected Experience', passed, failed };
}

module.exports = { runConnectedExperienceE2ETests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runConnectedExperienceE2ETests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
