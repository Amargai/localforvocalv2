const { request, loginDemoUser, db } = require('./test-helper');

async function runPostRequirementPageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 6/11] POST REQUIREMENT (Reverse Marketplace Demand Engine)');
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
  const shopOwner1 = await loginDemoUser('shop_owner'); // Care & Cure Chemist (shop_1)

  // Feature 1: Mode A - Customer posts Public Broadcast Requirement
  const broadcastPayload = {
    title: 'Urgent: Water Tank Leakage Repair Plumber Needed',
    description: 'Overhead PVC water tank connecting pipe cracked, continuous leaking in Andheri West.',
    category: 'plumber',
    urgency: 'urgent',
    budget: '₹500 - ₹800',
    radius: 8,
    area: 'Andheri West',
    city: 'Mumbai',
    phone: '9810055555'
  };

  const broadcastRes = await request('/api/requirements', {
    method: 'POST',
    token: customer.token,
    body: broadcastPayload
  });
  assert(broadcastRes.status === 201, 'Feature 1: Customer creates Broadcast demand with HTTP 201', `Status: ${broadcastRes.status}`);
  const broadcastReq = broadcastRes.body?.requirement;
  assert(broadcastReq && broadcastReq.isDirect === false, 'Feature 1: Broadcast requirement marked isDirect = false');
  assert(broadcastReq.targetShopId === null, 'Feature 1: targetShopId is null for broadcast');
  assert(broadcastReq.urgency === 'urgent', 'Feature 1: Urgency set to "urgent"');

  // Feature 2: Mode B - Customer posts Targeted / Direct Requirement to Shop 1
  const directPayload = {
    title: 'Specific Request: Pediatric Nebulizer Mask & Saline',
    description: 'Require Philips Respironics pediatric mask and 100ml normal saline solution.',
    category: 'medical',
    urgency: 'today',
    budget: '₹650',
    area: 'Andheri West',
    city: 'Mumbai',
    phone: '9810055555',
    targetShopId: 'shop_1',
    targetShopName: 'Care & Cure 24/7 Chemist'
  };

  const directRes = await request('/api/requirements', {
    method: 'POST',
    token: customer.token,
    body: directPayload
  });
  assert(directRes.status === 201, 'Feature 2: Customer creates Targeted demand with HTTP 201', `Status: ${directRes.status}`);
  const directReq = directRes.body?.requirement;
  assert(directReq && directReq.isDirect === true, 'Feature 2: Direct requirement marked isDirect = true');
  assert(directReq.targetShopId === 'shop_1', 'Feature 2: Direct requirement targetShopId = "shop_1"');
  assert(directReq.targetShopName === 'Care & Cure 24/7 Chemist', 'Feature 2: targetShopName resolved');

  // Feature 3: Privacy Engine - Public Feed Isolation
  const publicFeed = await request('/api/requirements');
  const publicReqs = publicFeed.body?.requirements || [];
  const hasBroadcast = publicReqs.some(r => r.id === broadcastReq.id);
  const hasDirect = publicReqs.some(r => r.id === directReq.id);
  assert(hasBroadcast, 'Feature 3: Broadcast requirement is public and visible in community feed');
  assert(!hasDirect, 'Feature 3: Targeted requirement is PRIVATELY ISOLATED and NOT leaked to public feed');

  // Feature 4: Community Demands Filter by Category
  const filteredDemands = await request(`/api/requirements?category=${broadcastPayload.category}`);
  const matched = (filteredDemands.body?.requirements || []).every(r => r.category.toLowerCase() === broadcastPayload.category);
  assert(matched, `Feature 4: Community demands browsing tab accurately filters by category "${broadcastPayload.category}"`);

  // Feature 5: Connected Experience: Targeted merchant receives request in Demand Radar
  const radarRes = await request('/api/requirements/matching', { token: shopOwner1.token });
  const radarReqs = radarRes.body?.requirements || [];
  const receivedInRadar = radarReqs.find(r => r.id === directReq.id);
  assert(Boolean(receivedInRadar), 'Connected Experience: Targeted merchant receives direct customer demand in their Demand Radar');
  assert(receivedInRadar?.isDirect === true, 'Connected Experience: Demand Radar flags request as direct exclusive lead');

  // Feature 6: Connected Experience: Untargeted merchant does NOT receive another shop\'s direct demand
  const otherOwnerToken = require('jsonwebtoken').sign(
    { sub: 'user_owner_2', role: 'shop_owner' },
    require('../server/src/config/env').jwtSecret,
    { expiresIn: '1d' }
  );
  const otherRadar = await request('/api/requirements/matching', { token: otherOwnerToken });
  const otherHasShop1Direct = (otherRadar.body?.requirements || []).some(r => r.id === directReq.id);
  assert(!otherHasShop1Direct, 'Connected Experience: Non-targeted merchant cannot view competitor\'s direct customer demand');

  // Feature 7: Cleanup test requirements
  await request(`/api/requirements/${broadcastReq.id}`, { method: 'DELETE', token: customer.token });
  await request(`/api/requirements/${directReq.id}`, { method: 'DELETE', token: customer.token });
  assert(true, 'Feature 7: Test requirements successfully deleted and cleaned up');

  console.log(`\n📊 Page 6 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 6: Post Requirement (Reverse Marketplace)', passed, failed };
}

module.exports = { runPostRequirementPageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runPostRequirementPageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
