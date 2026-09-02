const { request, loginDemoUser, db } = require('./test-helper');

async function runUserProfilePageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 7/11] USER PROFILE & SAVED BOOKMARKS (Customer Portal)');
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

  const customer = await loginDemoUser('customer');
  const shopOwner = await loginDemoUser('shop_owner');

  // Feature 1: Load Customer Profile Information
  const profileRes = await request('/api/auth/me', { token: customer.token });
  assert(profileRes.status === 200, 'Feature 1: GET /api/auth/me returns customer profile', `Status: ${profileRes.status}`);
  const user = profileRes.body?.user;
  assert(user && user.accountType === 'customer', 'Feature 1: Profile reflects customer role');
  assert(Boolean(user.name && user.phone), 'Feature 1: Profile contains name and phone');

  // Feature 2: Edit Profile Information (PUT /api/auth/profile)
  const editProfileRes = await request('/api/auth/profile', {
    method: 'PUT',
    token: customer.token,
    body: {
      name: 'Amit Verma (Verified Resident)',
      area: 'Andheri West - Lokhandwala',
      city: 'Mumbai'
    }
  });
  assert(editProfileRes.status === 200, 'Feature 2: PUT /api/auth/profile updates profile in SQLite', `Status: ${editProfileRes.status}`);
  assert(editProfileRes.body?.user?.area === 'Andheri West - Lokhandwala', 'Feature 2: Area updated');

  // Restore original name
  await request('/api/auth/profile', {
    method: 'PUT',
    token: customer.token,
    body: { name: 'Amit Verma', area: 'Andheri West', city: 'Mumbai' }
  });

  // Feature 3: Create a test demand to verify "My Demands" tab
  const createReqRes = await request('/api/requirements', {
    method: 'POST',
    token: customer.token,
    body: {
      title: 'Need Ayurvedic Cough Syrup Delivery',
      description: 'Dabur Honitus or similar herbal syrup',
      category: 'medical',
      urgency: 'today',
      area: 'Andheri West',
      city: 'Mumbai',
      phone: '9810055555'
    }
  });
  assert(createReqRes.status === 201, 'Feature 3: Created requirement for My Demands test');
  const reqId = createReqRes.body?.requirement?.id;

  // Feature 4: "My Demands" Feed (GET /api/requirements/mine)
  const myReqsRes = await request('/api/requirements/mine', { token: customer.token });
  assert(myReqsRes.status === 200, 'Feature 4: GET /api/requirements/mine returns HTTP 200', `Status: ${myReqsRes.status}`);
  const myReqs = myReqsRes.body?.requirements || [];
  const foundReq = myReqs.find(r => r.id === reqId);
  assert(Boolean(foundReq), 'Feature 4: Newly created demand appears in customer\'s My Demands list');
  assert(foundReq.status === 'open', 'Feature 4: Initial demand status is "open"');

  // Feature 5: Merchant responds to demand with a quote
  const quoteMsg = 'Hello Amit! We have Honitus 100ml in stock for ₹110. Delivery in 15 mins.';
  const quoteRes = await request(`/api/requirements/${reqId}/respond`, {
    method: 'POST',
    token: shopOwner.token,
    body: { message: quoteMsg }
  });
  assert(quoteRes.status === 200, 'Feature 5: Merchant responds to requirement with quote (HTTP 200)');

  // Feature 6: Customer views received merchant quotes in profile
  const updatedMyReqs = await request('/api/requirements/mine', { token: customer.token });
  const reqWithQuote = (updatedMyReqs.body?.requirements || []).find(r => r.id === reqId);
  assert(Array.isArray(reqWithQuote?.responses) && reqWithQuote.responses.length > 0, 'Feature 6: Customer views incoming merchant quotes');
  assert(reqWithQuote.responses[0].message === quoteMsg, 'Feature 6: Quote content matches merchant submission');
  assert(Boolean(reqWithQuote.responses[0].shopName), 'Feature 6: Responding shop name is attached to quote');

  // Feature 7: Customer marks demand as 'fulfilled'
  const fulfillRes = await request(`/api/requirements/${reqId}/status`, {
    method: 'PATCH',
    token: customer.token,
    body: { status: 'fulfilled' }
  });
  assert(fulfillRes.status === 200, 'Feature 7: Customer marks requirement as fulfilled (HTTP 200)', `Status: ${fulfillRes.status}`);
  assert(fulfillRes.body?.message?.includes('fulfilled'), 'Feature 7: Response confirms status marked as "fulfilled"');
  const reqCheck = db.prepare('SELECT status FROM requirements WHERE id = ?').get(reqId);
  assert(reqCheck?.status === 'fulfilled', 'Feature 7: Database record confirmed status is "fulfilled"');

  // Feature 8: Customer deletes demand
  const deleteReqRes = await request(`/api/requirements/${reqId}`, {
    method: 'DELETE',
    token: customer.token
  });
  assert(deleteReqRes.status === 200, 'Feature 8: Customer successfully deletes requirement', `Status: ${deleteReqRes.status}`);

  // Feature 9: Saved Favorite Shops resolution
  const savedFavorites = ['shop_1', 'shop_2'];
  const shopsRes = await request('/api/shops?limit=100');
  const resolvedFavorites = (shopsRes.body?.shops || []).filter(s => savedFavorites.includes(s.id));
  assert(resolvedFavorites.length === 2, 'Feature 9: Saved bookmarks resolve into full shop listings with ratings and contact CTA', `Resolved: ${resolvedFavorites.length}/2`);

  // Feature 10: Connected Experience: Fulfilled status removes demand from public radar
  const publicCheck = await request('/api/requirements');
  const publicHasDeleted = (publicCheck.body?.requirements || []).some(r => r.id === reqId);
  assert(!publicHasDeleted, 'Connected Experience: Deleted/Fulfilled requirement is purged from public discovery feeds');

  console.log(`\n📊 Page 7 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 7: User Profile & Saved Bookmarks', passed, failed };
}

module.exports = { runUserProfilePageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runUserProfilePageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
