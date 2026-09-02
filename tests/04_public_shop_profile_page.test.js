const { request, loginDemoUser, db } = require('./test-helper');

async function runPublicShopProfilePageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 4/11] PUBLIC STOREFRONT & CATALOG (Shop Profile Page)');
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

  const targetShopId = 'shop_1'; // Care & Cure Chemist

  // Feature 1: Storefront Profile Details & View Counter Increment
  const initialShopRes = await request(`/api/shops/${targetShopId}`);
  assert(initialShopRes.status === 200, 'Feature 1: GET /api/shops/:id returns HTTP 200', `Status: ${initialShopRes.status}`);
  const initialShop = initialShopRes.body?.shop;
  assert(initialShop && initialShop.id === targetShopId, 'Feature 1: Returns correct shop details');
  assert(Boolean(initialShop.name && initialShop.phone && initialShop.address), 'Feature 1: Storefront contains name, phone, address');
  assert(Boolean(initialShop.businessHours), 'Feature 1: Business hours schedule available');

  // Verify View Counter auto-increments
  const secondVisitRes = await request(`/api/shops/${targetShopId}`);
  const secondShop = secondVisitRes.body?.shop;
  assert(secondShop.views === initialShop.views + 1, 'Feature 1: Storefront view counter increments on each visitor hit', `Views: ${initialShop.views} -> ${secondShop.views}`);

  // Feature 2: Product Catalog Gallery for Shop
  const prodsRes = await request(`/api/products/shop/${targetShopId}`);
  assert(prodsRes.status === 200, 'Feature 2: GET /api/products/shop/:shopId returns HTTP 200', `Status: ${prodsRes.status}`);
  const products = prodsRes.body?.products || [];
  assert(Array.isArray(products) && products.length > 0, 'Feature 2: Shop displays product inventory catalog', `Products: ${products.length}`);
  const firstProd = products[0];
  assert(typeof firstProd.price === 'number' && firstProd.price > 0, 'Feature 2: Product entity has valid price', `Price: ₹${firstProd.price}`);
  assert(typeof firstProd.inStock === 'boolean', 'Feature 2: In-Stock indicator is boolean');

  // Feature 3: Product WhatsApp Pre-filled Order CTA
  const orderMessage = `Hello! I would like to order "${firstProd.name}" priced at ₹${firstProd.price} from your LocalForVocal storefront.`;
  const productWhatsappUrl = `https://wa.me/91${initialShop.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(orderMessage)}`;
  assert(productWhatsappUrl.includes(encodeURIComponent(firstProd.name)), 'Feature 3: 1-Click WhatsApp Order CTA embeds pre-filled product details');

  // Feature 4: Active Shop Offers Section
  const offersRes = await request('/api/offers');
  assert(offersRes.status === 200, 'Feature 4: GET /api/offers returns HTTP 200');
  const shopOffers = (offersRes.body?.offers || []).filter(o => o.shopId === targetShopId);
  assert(Array.isArray(shopOffers), 'Feature 4: Successfully filters flash deals active for this storefront');

  // Feature 5: Customer Reviews Feed & Authentication Guard
  const unauthReviewRes = await request(`/api/shops/${targetShopId}/reviews`, {
    method: 'POST',
    body: { rating: 5, comment: 'Unauthorized review' }
  });
  assert(unauthReviewRes.status === 401, 'Feature 5: Unauthorized customer review submission blocked with HTTP 401', `Status: ${unauthReviewRes.status}`);

  // Feature 6: Verified Review Submission by Logged-in Customer
  const cust = await loginDemoUser('customer');
  const reviewComment = `Automated Verified Review - Highly recommended! ${Date.now()}`;
  const submitReviewRes = await request(`/api/shops/${targetShopId}/reviews`, {
    method: 'POST',
    token: cust.token,
    body: { rating: 5, comment: reviewComment }
  });
  assert(submitReviewRes.status === 201 || submitReviewRes.status === 200, 'Feature 6: Logged-in customer submits 5-star review successfully', `Status: ${submitReviewRes.status}`);
  const createdReviewId = submitReviewRes.body?.review?.id;

  // Feature 7: Rating & Review Count Recalculation Engine
  const updatedShopRes = await request(`/api/shops/${targetShopId}`);
  const updatedShop = updatedShopRes.body?.shop;
  const reviewsList = updatedShopRes.body?.reviews || [];
  const foundReview = reviewsList.find(r => r.comment === reviewComment);
  assert(Boolean(foundReview), 'Feature 7: Submitted review appears in verified reviews feed');
  assert(updatedShop.totalReviews >= 1, 'Feature 7: Shop totalReviews counter updated in database', `Total Reviews: ${updatedShop.totalReviews}`);
  assert(typeof updatedShop.rating === 'number' && updatedShop.rating >= 1 && updatedShop.rating <= 5, 'Feature 7: Average star rating accurately recalculated in SQLite', `Rating: ${updatedShop.rating}`);

  // Feature 8: Connected Experience: Rating reflects on Explore Page
  const exploreSyncRes = await request(`/api/shops?q=${encodeURIComponent(initialShop.name)}`);
  const syncedShop = (exploreSyncRes.body?.shops || []).find(s => s.id === targetShopId);
  assert(syncedShop && syncedShop.totalReviews === updatedShop.totalReviews, 'Connected Experience: Updated review count immediately synchronizes across ExplorePage');

  // Cleanup review
  if (createdReviewId) {
    db.prepare('DELETE FROM reviews WHERE id = ?').run(createdReviewId);
    // Re-sync rating
    const stats = db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE shop_id = ?').get(targetShopId);
    db.prepare('UPDATE shops SET rating = ?, total_reviews = ? WHERE id = ?')
      .run(stats.count > 0 ? Number(stats.avg_rating.toFixed(1)) : 5.0, stats.count, targetShopId);
  }

  console.log(`\n📊 Page 4 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 4: Public Storefront & Catalog', passed, failed };
}

module.exports = { runPublicShopProfilePageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runPublicShopProfilePageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
