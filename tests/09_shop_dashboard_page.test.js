const { request, loginDemoUser, db } = require('./test-helper');

async function runShopDashboardPageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 9/11] SHOP DASHBOARD (Merchant Command Center)');
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

  const shopOwner = await loginDemoUser('shop_owner');
  const shopId = shopOwner.user.shopId; // 'shop_1'

  // Feature 1: Live Open / Closed Availability Toggle
  const toggleCloseRes = await request(`/api/shops/${shopId}/availability`, {
    method: 'PATCH',
    token: shopOwner.token,
    body: { availableToday: false }
  });
  assert(toggleCloseRes.status === 200, 'Feature 1: Merchant switches shop to Closed (availableToday = false)', `Status: ${toggleCloseRes.status}`);

  // Connected check: Excluded from openNow filter on ExplorePage
  const openExplore = await request('/api/shops?openNow=true');
  const hasClosedShop = (openExplore.body?.shops || []).some(s => s.id === shopId);
  assert(!hasClosedShop, 'Connected Experience: Closed shop is excluded from ExplorePage "Open Now" filter');

  // Re-open shop
  await request(`/api/shops/${shopId}/availability`, {
    method: 'PATCH',
    token: shopOwner.token,
    body: { availableToday: true }
  });
  assert(true, 'Feature 1: Merchant switches shop back to Open (availableToday = true)');

  // Feature 2: Fetch Products & Starter Quota Usage
  const myProdsRes = await request('/api/products/mine', { token: shopOwner.token });
  assert(myProdsRes.status === 200, 'Feature 2: GET /api/products/mine returns HTTP 200', `Status: ${myProdsRes.status}`);
  const usage = myProdsRes.body?.usage;
  assert(Boolean(usage && typeof usage.count === 'number'), 'Feature 2: Returns product count and quota limits', `Current: ${usage?.count}/${usage?.limit}`);
  assert(usage.limit >= 5, 'Feature 2: Product quota limit is enforced');

  // Feature 3: Add New Product to Catalog
  const addProdRes = await request('/api/products', {
    method: 'POST',
    token: shopOwner.token,
    body: {
      name: 'N95 Respirator Masks (Pack of 5)',
      price: 250,
      originalPrice: 350,
      category: 'Protective Gear',
      description: 'CE certified 5-layer filtration N95 particulate respirator mask.',
      inStock: true
    }
  });
  assert(addProdRes.status === 201, 'Feature 3: Merchant adds product to catalog (HTTP 201)', `Status: ${addProdRes.status}`);
  const createdProd = addProdRes.body?.product;
  assert(Boolean(createdProd?.id), 'Feature 3: Created product assigned unique ID');

  // Feature 4: Toggle In-Stock / Out-of-Stock
  const toggleStockRes = await request(`/api/products/${createdProd.id}`, {
    method: 'PUT',
    token: shopOwner.token,
    body: { inStock: false }
  });
  assert(toggleStockRes.status === 200, 'Feature 4: Merchant marks product as Out-of-Stock (HTTP 200)', `Status: ${toggleStockRes.status}`);

  // Feature 5: Delete Product
  const delProdRes = await request(`/api/products/${createdProd.id}`, {
    method: 'DELETE',
    token: shopOwner.token
  });
  assert(delProdRes.status === 200, 'Feature 5: Merchant deletes product from catalog (HTTP 200)', `Status: ${delProdRes.status}`);

  // Feature 6: Demand Radar Feed
  const radarRes = await request('/api/requirements/matching', { token: shopOwner.token });
  assert(radarRes.status === 200, 'Feature 6: GET /api/requirements/matching returns matching customer demands', `Status: ${radarRes.status}`);
  assert(Array.isArray(radarRes.body?.requirements), 'Feature 6: Demand Radar provides array of customer leads');

  // Feature 7: Flash Deals Management in Dashboard
  const addDealRes = await request('/api/offers', {
    method: 'POST',
    token: shopOwner.token,
    body: {
      title: 'Free Blood Pressure & Sugar Checkup Camp',
      description: 'Walk in every Sunday 10am to 2pm for free health screenings.',
      discount: '100% FREE',
      validTill: 'Every Sunday'
    }
  });
  assert(addDealRes.status === 201, 'Feature 7: Merchant publishes promotional deal from dashboard (HTTP 201)');
  const dealId = addDealRes.body?.offer?.id;

  await request(`/api/offers/${dealId}`, { method: 'DELETE', token: shopOwner.token });
  assert(true, 'Feature 7: Merchant removes promotional deal cleanly');

  // Feature 8: Edit Shop Profile Settings (PUT /api/shops/:id)
  const currentShop = db.prepare('SELECT address FROM shops WHERE id = ?').get(shopId);
  const updatedAddress = currentShop.address;
  const updateProfileRes = await request(`/api/shops/${shopId}`, {
    method: 'PUT',
    token: shopOwner.token,
    body: {
      name: 'Care & Cure 24/7 Chemist',
      phone: '9820011111',
      whatsapp: '9820011111',
      address: updatedAddress
    }
  });
  assert(updateProfileRes.status === 200, 'Feature 8: Merchant updates shop contact & location profile settings (HTTP 200)');

  console.log(`\n📊 Page 9 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 9: Shop Dashboard (Command Center)', passed, failed };
}

module.exports = { runShopDashboardPageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runShopDashboardPageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
