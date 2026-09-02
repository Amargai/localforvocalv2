const { startServer, stopServer } = require('./test-helper');
const { runAuthModalTests } = require('./01_auth_modal.test');
const { runHomePageTests } = require('./02_home_page.test');
const { runExplorePageTests } = require('./03_explore_page.test');
const { runPublicShopProfilePageTests } = require('./04_public_shop_profile_page.test');
const { runOffersPageTests } = require('./05_offers_page.test');
const { runPostRequirementPageTests } = require('./06_post_requirement_page.test');
const { runUserProfilePageTests } = require('./07_user_profile_page.test');
const { runRegisterShopPageTests } = require('./08_register_shop_page.test');
const { runShopDashboardPageTests } = require('./09_shop_dashboard_page.test');
const { runSubscriptionPageTests } = require('./10_subscription_page.test');
const { runAdminPageTests } = require('./11_admin_page.test');
const { runConnectedExperienceE2ETests } = require('./12_connected_experience_e2e.test');

async function runAll() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║       🌿 LOCAL FOR VOCAL v2.0 - FULL SYSTEM TEST SUITE         ║');
  console.log('║  Testing Every Entity, Every Feature & Connected Experience    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  await startServer();

  const results = [];

  try {
    // Page 1: Auth & User Session Gateway
    results.push(await runAuthModalTests());

    // Page 2: HomePage
    results.push(await runHomePageTests());

    // Page 3: ExplorePage
    results.push(await runExplorePageTests());

    // Page 4: PublicShopProfilePage
    results.push(await runPublicShopProfilePageTests());

    // Page 5: OffersPage
    results.push(await runOffersPageTests());

    // Page 6: PostRequirementPage
    results.push(await runPostRequirementPageTests());

    // Page 7: UserProfilePage
    results.push(await runUserProfilePageTests());

    // Page 8: RegisterShopPage
    results.push(await runRegisterShopPageTests());

    // Page 9: ShopDashboardPage
    results.push(await runShopDashboardPageTests());

    // Page 10: SubscriptionPage
    results.push(await runSubscriptionPageTests());

    // Page 11: AdminPage
    results.push(await runAdminPageTests());

    // Connected Experience: Full E2E Lifecycle
    results.push(await runConnectedExperienceE2ETests());

  } finally {
    await stopServer();
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalPassed = results.reduce((acc, r) => acc + (r.passed || 0), 0);
  const totalFailed = results.reduce((acc, r) => acc + (r.failed || 0), 0);

  console.log('\n================================================================');
  console.log('🏆 GRAND TOTAL SYSTEM TEST RESULTS');
  console.log('================================================================');
  results.forEach(r => {
    const status = r.failed === 0 ? '✅ ALL PASSED' : `❌ ${r.failed} FAILED`;
    console.log(`  • ${r.page.padEnd(45)} : ${r.passed} passed, ${r.failed} failed [${status}]`);
  });
  console.log('----------------------------------------------------------------');
  console.log(`TOTAL SUITES  : ${results.length}`);
  console.log(`TOTAL PASSED  : ${totalPassed}`);
  console.log(`TOTAL FAILED  : ${totalFailed}`);
  console.log(`EXECUTION TIME: ${durationSec}s`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
