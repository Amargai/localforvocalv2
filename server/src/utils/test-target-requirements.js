/**
 * Automated Verification & Test Suite for Specific/Targeted Shop Requirements
 */
const http = require('http');
const app = require('../server');

let server;
let port;

function startServer() {
  return new Promise((resolve) => {
    // Listen on port 0 for an ephemeral test port
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      console.log(`🚀 Test server listening on http://127.0.0.1:${port}`);
      resolve(port);
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: raw });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function loginUser(role) {
  const res = await makeRequest('/api/auth/demo-login', 'POST', { role });
  if (!res.body || !res.body.token) {
    throw new Error(`Failed to login demo user for role ${role}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

async function runTests() {
  console.log('🧪 Starting Targeted Shop Requirement Feature Test Suite...\n');
  await startServer();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Sessions
    console.log('[Step 1] Logging in test users...');
    const customer = await loginUser('customer');
    const shopOwner1 = await loginUser('shop_owner'); // owner of shop_1 (Care & Cure Chemist, category 'medical')

    const jwt = require('jsonwebtoken');
    const { jwtSecret } = require('../config/env');
    const tokenOwner2 = jwt.sign({ sub: 'user_owner_2', role: 'shop_owner' }, jwtSecret, { expiresIn: '1d' });
    const shopOwner2 = { token: tokenOwner2 };

    console.log(`  Customer: ${customer.user.name} (${customer.user.id})`);
    console.log(`  Shop Owner 1: ${shopOwner1.user.name} (${shopOwner1.user.id})`);

    // 2. Post a Public Broadcast Requirement
    console.log('\n[Step 2] Customer posts a Public Broadcast Requirement (Medical)...');
    const broadcastRes = await makeRequest('/api/requirements', 'POST', {
      title: 'Need BP Monitor & Sugar Strips Urgently',
      description: 'Accu-Chek active strips packet of 50',
      category: 'medical',
      urgency: 'urgent',
      budget: '₹800',
      phone: '9810055555',
      area: 'Andheri West',
      city: 'Mumbai',
      radius: 10
    }, { 'Authorization': `Bearer ${customer.token}` });

    assert(broadcastRes.status === 201, `Broadcast created with HTTP 201 (got ${broadcastRes.status})`);
    assert(broadcastRes.body.isDirect === false, 'Broadcast requirement is marked isDirect = false');
    assert(broadcastRes.body.requirement.targetShopId === null, 'Broadcast requirement targetShopId is null');
    const broadcastId = broadcastRes.body.requirement.id;

    // 3. Post a Specific / Targeted Requirement to Shop 1
    console.log('\n[Step 3] Customer posts a DIRECT Requirement targeted to Shop 1 (Care & Cure 24/7 Chemist)...');
    const directRes = await makeRequest('/api/requirements', 'POST', {
      title: 'Direct Request: Rare Asthma Inhaler Delivery',
      description: 'Need Seroflo 250 Inhaler delivered to Flat 402, Sunrise Apts',
      category: 'medical',
      urgency: 'today',
      budget: '₹600',
      phone: '9810055555',
      area: 'Andheri West',
      city: 'Mumbai',
      targetShopId: 'shop_1',
      targetShopName: 'Care & Cure 24/7 Chemist'
    }, { 'Authorization': `Bearer ${customer.token}` });

    assert(directRes.status === 201, `Direct requirement created with HTTP 201 (got ${directRes.status})`);
    assert(directRes.body.isDirect === true, 'Direct requirement is marked isDirect = true');
    assert(directRes.body.requirement.targetShopId === 'shop_1', 'Direct requirement has targetShopId = "shop_1"');
    assert(directRes.body.requirement.targetShopName === 'Care & Cure 24/7 Chemist', 'Direct requirement has targetShopName resolved');
    const directId = directRes.body.requirement.id;

    // 4. Verify Public Feed Privacy
    console.log('\n[Step 4] Checking Public Requirements Feed privacy (GET /api/requirements)...');
    const publicFeed = await makeRequest('/api/requirements');
    const publicReqs = publicFeed.body.requirements || [];
    const containsBroadcast = publicReqs.some(r => r.id === broadcastId);
    const containsDirect = publicReqs.some(r => r.id === directId);
    assert(containsBroadcast === true, 'Public feed includes the broadcast requirement');
    assert(containsDirect === false, 'Public feed does NOT leak the direct targeted requirement');

    // 5. Verify Customer\'s "My Demands" (GET /api/requirements/mine)
    console.log('\n[Step 5] Checking Customer profile demands (GET /api/requirements/mine)...');
    const myReqsRes = await makeRequest('/api/requirements/mine', 'GET', null, { 'Authorization': `Bearer ${customer.token}` });
    const myReqs = myReqsRes.body.requirements || [];
    const myBroadcast = myReqs.find(r => r.id === broadcastId);
    const myDirect = myReqs.find(r => r.id === directId);
    assert(Boolean(myBroadcast), 'Customer sees their broadcast demand');
    assert(Boolean(myDirect), 'Customer sees their direct targeted demand');
    assert(myDirect && myDirect.isDirect === true && myDirect.targetShopId === 'shop_1', 'Direct demand displays correct target store info');

    // 6. Verify Shop 1 (Targeted Shop) Demand Radar (GET /api/requirements/matching)
    console.log('\n[Step 6] Checking Shop 1 matching radar (GET /api/requirements/matching)...');
    const shop1Matching = await makeRequest('/api/requirements/matching', 'GET', null, { 'Authorization': `Bearer ${shopOwner1.token}` });
    const shop1Reqs = shop1Matching.body.requirements || [];
    const shop1HasDirect = shop1Reqs.some(r => r.id === directId);
    const shop1HasBroadcast = shop1Reqs.some(r => r.id === broadcastId);
    assert(shop1HasDirect === true, 'Shop 1 receives the direct requirement in its radar');
    assert(shop1HasBroadcast === true, 'Shop 1 also receives category matching broadcast requirements');
    const firstReq = shop1Reqs[0];
    assert(firstReq && firstReq.id === directId, 'Shop 1 sees direct requirement prioritized at top of list');

    // 7. Verify Shop 2 (Different Shop - Carpenter) Demand Radar
    console.log('\n[Step 7] Checking Shop 2 matching radar (Patil Wood Works)...');
    const shop2Matching = await makeRequest('/api/requirements/matching', 'GET', null, { 'Authorization': `Bearer ${shopOwner2.token}` });
    const shop2Reqs = shop2Matching.body.requirements || [];
    const shop2HasShop1Direct = shop2Reqs.some(r => r.id === directId);
    assert(shop2HasShop1Direct === false, 'Shop 2 does NOT see the direct requirement targeted to Shop 1');

    // 8. Test Response Permissions & Exclusivity (POST /api/requirements/:id/respond)
    console.log('\n[Step 8] Testing Response Permissions & Direct Exclusivity...');

    // 8a. Targeted Shop 1 responds to its direct requirement -> SHOULD SUCCEED
    const shop1QuoteRes = await makeRequest(`/api/requirements/${directId}/respond`, 'POST', {
      message: 'Hello Amit! We have Seroflo 250 in stock. We can deliver in 20 minutes via our delivery boy. Total: ₹580.'
    }, { 'Authorization': `Bearer ${shopOwner1.token}` });
    assert(shop1QuoteRes.status === 200, `Targeted Shop 1 successfully submits quote (HTTP 200)`);
    assert(Array.isArray(shop1QuoteRes.body.responses) && shop1QuoteRes.body.responses.length === 1, 'Quote was added to requirement responses');
    assert(shop1QuoteRes.body.responses[0].shopId === 'shop_1', 'Quote is stamped with shop_1 ID');

    // 8b. Shop 2 tries to respond to Shop 1\'s direct requirement -> MUST BE REJECTED (403)
    const shop2QuoteRes = await makeRequest(`/api/requirements/${directId}/respond`, 'POST', {
      message: 'Shop 2 attempting to reply to Shop 1 direct request'
    }, { 'Authorization': `Bearer ${shopOwner2.token}` });
    assert(shop2QuoteRes.status === 403, `Unauthorized Shop 2 is rejected with 403 Forbidden (got ${shop2QuoteRes.status})`);

    // 8c. Normal customer tries to respond -> MUST BE REJECTED (403)
    const custQuoteRes = await makeRequest(`/api/requirements/${broadcastId}/respond`, 'POST', {
      message: 'Random customer trying to quote'
    }, { 'Authorization': `Bearer ${customer.token}` });
    assert(custQuoteRes.status === 403 || custQuoteRes.status === 400, `Customer cannot respond as a shop (got ${custQuoteRes.status})`);

    // 9. Customer views updated responses
    console.log('\n[Step 9] Customer reviews received quote from targeted merchant...');
    const updatedMyReqs = await makeRequest('/api/requirements/mine', 'GET', null, { 'Authorization': `Bearer ${customer.token}` });
    const verifiedDirect = (updatedMyReqs.body.requirements || []).find(r => r.id === directId);
    assert(verifiedDirect && verifiedDirect.responses.length === 1, 'Customer sees the quote received from Care & Cure Chemist');
    assert(verifiedDirect && verifiedDirect.responses[0].shopName === 'Care & Cure 24/7 Chemist', 'Merchant shop name is accurately presented');

    // 10. Status toggle and cleanup
    console.log('\n[Step 10] Testing Status toggle and deletion...');
    const statusRes = await makeRequest(`/api/requirements/${directId}/status`, 'PATCH', { status: 'fulfilled' }, { 'Authorization': `Bearer ${customer.token}` });
    assert(statusRes.status === 200, 'Customer marks requirement as fulfilled');

    const delBroadcast = await makeRequest(`/api/requirements/${broadcastId}`, 'DELETE', null, { 'Authorization': `Bearer ${customer.token}` });
    const delDirect = await makeRequest(`/api/requirements/${directId}`, 'DELETE', null, { 'Authorization': `Bearer ${customer.token}` });
    assert(delBroadcast.status === 200 && delDirect.status === 200, 'Cleaned up test requirements');

    console.log('\n========================================');
    console.log(`🎯 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('========================================\n');

  } finally {
    await stopServer();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
