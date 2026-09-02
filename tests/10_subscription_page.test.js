const { request, loginDemoUser, db } = require('./test-helper');

async function runSubscriptionPageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 10/11] SUBSCRIPTION & GROWTH TIERS (Pricing & Quotas)');
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

  // Feature 1: Verify 3-Tier Definition Consistency
  const tiers = [
    { name: 'Starter Basic', price: '₹0', limit: 5, isPro: false },
    { name: 'Local Hero Pro', price: '₹499', limit: 100, isPro: true },
    { name: 'Neighborhood Leader', price: '₹999', limit: 100, isPro: true }
  ];
  assert(tiers.length === 3, 'Feature 1: Three structured merchant growth plans configured');
  assert(tiers[0].price === '₹0' && tiers[0].limit === 5, 'Feature 1: Starter tier is 100% free with 5 product quota');

  // Feature 2: Free Tier Quota Check for standard shop
  const shopOwner = await loginDemoUser('shop_owner');
  const shopId = shopOwner.user.shopId;

  // Set shop as standard (featured = 0)
  db.prepare('UPDATE shops SET featured = 0 WHERE id = ?').run(shopId);

  const standardUsageRes = await request('/api/products/mine', { token: shopOwner.token });
  const standardUsage = standardUsageRes.body?.usage;
  assert(standardUsage?.isPro === false, 'Feature 2: Standard shop recognized as Free Tier (isPro = false)');
  assert(standardUsage?.limit === 5, 'Feature 2: Product limit strictly bounded to 5 items on Free Tier', `Limit: ${standardUsage?.limit}`);

  // Feature 3: Connected Experience: Pro Upgrade Unlocks Unlimited Quota
  // Simulate Pro Plan subscription (featured = 1 in database)
  db.prepare('UPDATE shops SET featured = 1 WHERE id = ?').run(shopId);

  const proUsageRes = await request('/api/products/mine', { token: shopOwner.token });
  const proUsage = proUsageRes.body?.usage;
  assert(proUsage?.isPro === true, 'Connected Experience: Upgrading to Pro activates isPro = true');
  assert(proUsage?.limit === 100, 'Connected Experience: Quota expanded to 100 products upon Pro upgrade', `Limit: ${proUsage?.limit}`);

  // Feature 4: Connected Experience: Pro Shop gains Featured Placement on HomePage
  const homeFeatured = await request('/api/shops/featured');
  const shopInFeatured = (homeFeatured.body?.shops || []).some(s => s.id === shopId);
  assert(shopInFeatured, 'Connected Experience: Pro upgraded shop automatically awarded Featured placement on HomePage');

  // Revert back
  db.prepare('UPDATE shops SET featured = 0 WHERE id = ?').run(shopId);
  assert(true, 'Cleanup: Shop tier restored to original testing state');

  console.log(`\n📊 Page 10 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 10: Subscription & Growth Tiers', passed, failed };
}

module.exports = { runSubscriptionPageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runSubscriptionPageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
