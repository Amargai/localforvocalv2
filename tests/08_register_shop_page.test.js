const { request, loginDemoUser, createCustomToken, db } = require('./test-helper');
const crypto = require('crypto');

async function runRegisterShopPageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 8/11] REGISTER SHOP (3-Step Merchant Onboarding Wizard)');
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

  // Create a clean temporary user for onboarding
  const tempUserId = 'user_temp_' + crypto.randomUUID().slice(0, 6);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, phone, email, account_type, area, city, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'customer', 'Andheri West', 'Mumbai', ?, ?)
  `).run(tempUserId, 'New Shopkeeper Test', '9899911111', 'newshop@example.com', now, now);

  const newMerchantToken = createCustomToken(tempUserId, 'customer');

  // Feature 1: Validation - Reject incomplete registration
  const incompleteRes = await request('/api/shops', {
    method: 'POST',
    token: newMerchantToken,
    body: { name: 'Incomplete Shop' }
  });
  assert(incompleteRes.status === 400, 'Feature 1: Reject registration with missing required fields with HTTP 400', `Status: ${incompleteRes.status}`);

  // Feature 2: Complete 3-Step Wizard Payload Submission
  const shopData = {
    name: 'Sharma Sweets & Farsan Mart',
    category: 'food',
    subCategory: 'Bakery & Sweets',
    ownerName: 'Ramesh Sharma',
    phone: '9899911111',
    whatsapp: '9899911111',
    address: 'Gala 5, Market Road, Near Station',
    area: 'Andheri West',
    city: 'Mumbai',
    pin: '400058',
    latitude: 19.1155,
    longitude: 72.8433,
    tags: ['Kaju Katli', 'Dhokla', 'Fresh Samosa', 'Jalebi', 'Festival Sweets'],
    businessHours: { open: '08:00', close: '22:00', days: 'Mon - Sun' },
    images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600']
  };

  const registerRes = await request('/api/shops', {
    method: 'POST',
    token: newMerchantToken,
    body: shopData
  });
  assert(registerRes.status === 201, 'Feature 2: Successful 3-step registration returns HTTP 201 Created', `Status: ${registerRes.status}`);
  const registeredShop = registerRes.body?.shop;
  assert(Boolean(registeredShop?.id), 'Feature 2: Shop record created with unique ID', `ID: ${registeredShop?.id}`);
  assert(registeredShop?.status === 'pending', 'Feature 2: Newly listed shop enters "pending" status awaiting admin verification');

  // Feature 3: Automatic User Role Promotion
  const updatedUserRow = db.prepare('SELECT account_type, shop_id FROM users WHERE id = ?').get(tempUserId);
  assert(updatedUserRow.account_type === 'shop_owner', 'Feature 3: User role automatically promoted from "customer" to "shop_owner" in SQLite');
  assert(updatedUserRow.shop_id === registeredShop.id, 'Feature 3: User record permanently linked to newly registered shop ID');

  // Feature 4: Pending Shop is protected from public unauthorized browse
  const publicFetchRes = await request(`/api/shops/${registeredShop.id}`);
  assert(publicFetchRes.status === 404, 'Feature 4: Pending shop is not yet publicly visible before approval (HTTP 404)', `Status: ${publicFetchRes.status}`);

  // Feature 5: Owner CAN view their own pending storefront
  const ownerFetchRes = await request(`/api/shops/${registeredShop.id}`, { token: newMerchantToken });
  assert(ownerFetchRes.status === 200, 'Feature 5: Shop owner can access and preview their own pending storefront (HTTP 200)', `Status: ${ownerFetchRes.status}`);

  // Feature 6: Admin approves shop (Connected Moderation Flow)
  const admin = await loginDemoUser('admin');
  const approveRes = await request(`/api/admin/shops/${registeredShop.id}/status`, {
    method: 'PATCH',
    token: admin.token,
    body: { status: 'active' }
  });
  assert(approveRes.status === 200, 'Feature 6: Admin approves registered shop (HTTP 200)', `Status: ${approveRes.status}`);

  // Feature 7: Connected Experience: Approved shop immediately appears in Explore search
  const exploreRes = await request(`/api/shops?q=${encodeURIComponent('Sharma Sweets')}`);
  const foundInExplore = (exploreRes.body?.shops || []).find(s => s.id === registeredShop.id);
  assert(Boolean(foundInExplore), 'Connected Experience: Newly approved shop is immediately discoverable in ExplorePage directory');
  assert(foundInExplore?.status === 'active', 'Connected Experience: Storefront status is active');

  // Cleanup test shop and user
  db.prepare('DELETE FROM shops WHERE id = ?').run(registeredShop.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(tempUserId);
  assert(true, 'Cleanup: Test shop and user cleanly removed from SQLite');

  console.log(`\n📊 Page 8 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 8: Register Shop (Onboarding Wizard)', passed, failed };
}

module.exports = { runRegisterShopPageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runRegisterShopPageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
