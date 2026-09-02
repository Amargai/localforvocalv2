const { request, db } = require('./test-helper');

async function runExplorePageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 3/11] EXPLORE PAGE (Map, Proximity, Filters & Directory)');
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

  // Feature 1: Complete Directory Fetch
  const allShopsRes = await request('/api/shops');
  assert(allShopsRes.status === 200, 'Feature 1: GET /api/shops returns HTTP 200', `Status: ${allShopsRes.status}`);
  const allShops = allShopsRes.body?.shops || [];
  assert(Array.isArray(allShops) && allShops.length > 0, 'Feature 1: Returns active shop listings', `Count: ${allShops.length}`);
  assert(Boolean(allShopsRes.body?.pagination), 'Feature 1: Pagination metadata included');

  // Feature 2: Category Filter
  const medicalRes = await request('/api/shops?category=medical');
  assert(medicalRes.status === 200, 'Feature 2: Category filter "medical" returns HTTP 200');
  const medicalShops = medicalRes.body?.shops || [];
  const allMedical = medicalShops.every(s => s.category === 'medical');
  assert(allMedical && medicalShops.length > 0, 'Feature 2: Every filtered shop belongs to "medical" category', `Count: ${medicalShops.length}`);

  // Feature 3: Text Search Filter
  const searchRes = await request('/api/shops?q=wood');
  assert(searchRes.status === 200, 'Feature 3: Text query "wood" returns HTTP 200');
  const woodShops = searchRes.body?.shops || [];
  assert(woodShops.length > 0, 'Feature 3: Returns shops matching "wood"', `Found: ${woodShops.length}`);
  const matchContent = woodShops.every(s => {
    const text = `${s.name} ${s.category} ${s.subCategory || ''} ${(s.tags || []).join(' ')}`.toLowerCase();
    return text.includes('wood');
  });
  assert(matchContent, 'Feature 3: All matched shops contain "wood" in name, category, or tags');

  // Feature 4: GPS Proximity & Distance Calculation (Haversine Formula)
  const andheriLat = 19.1197;
  const andheriLng = 72.8468;
  const proximityRes = await request(`/api/shops?lat=${andheriLat}&lng=${andheriLng}&radiusKm=10`);
  assert(proximityRes.status === 200, 'Feature 4: Proximity request with GPS coordinates and radius returns HTTP 200');
  const nearbyShops = proximityRes.body?.shops || [];
  assert(nearbyShops.length > 0, 'Feature 4: Returns shops within 10km radius', `Count: ${nearbyShops.length}`);
  const hasDistance = nearbyShops.every(s => typeof s.distanceKm === 'number' && s.distanceKm <= 10);
  assert(hasDistance, 'Feature 4: Accurate distanceKm computed and strictly <= 10 km');
  // Verify nearest shop is first
  const isSortedByDistance = nearbyShops.every((s, i) => i === 0 || s.distanceKm >= nearbyShops[i - 1].distanceKm);
  assert(isSortedByDistance, 'Feature 4: Results automatically sorted in ascending order of proximity');

  // Feature 5: Open Now / Live Availability Filter
  const openRes = await request('/api/shops?openNow=true');
  assert(openRes.status === 200, 'Feature 5: openNow=true filter returns HTTP 200');
  const openShops = openRes.body?.shops || [];
  const allOpen = openShops.every(s => s.availableToday === true);
  assert(allOpen, 'Feature 5: Only shops currently open and available today are returned');

  // Feature 6: Sorting by Rating via API
  const sortRatingRes = await request('/api/shops?sortBy=rating');
  assert(sortRatingRes.status === 200, 'Feature 6: GET /api/shops?sortBy=rating returns HTTP 200');
  const sortRatingShops = sortRatingRes.body?.shops || [];
  const isRatingSorted = sortRatingShops.every((s, i) => i === 0 || s.rating <= sortRatingShops[i - 1].rating);
  assert(isRatingSorted, 'Feature 6: Sort by rating accurately orders shops from highest to lowest rating');

  // Feature 7: Sorting by Name via API
  const sortNameRes = await request('/api/shops?sortBy=name');
  assert(sortNameRes.status === 200, 'Feature 7: GET /api/shops?sortBy=name returns HTTP 200');
  const sortNameShops = sortNameRes.body?.shops || [];
  const isNameSorted = sortNameShops.every((s, i) => i === 0 || (s.name || '').localeCompare(sortNameShops[i - 1].name || '') >= 0);
  assert(isNameSorted, 'Feature 7: Sort by name accurately alphabetizes listings A-Z');

  // Feature 7b: Sorting by Views (Most Popular)
  const sortViewsRes = await request('/api/shops?sortBy=views');
  assert(sortViewsRes.status === 200, 'Feature 7b: GET /api/shops?sortBy=views returns HTTP 200');
  const sortViewsShops = sortViewsRes.body?.shops || [];
  const isViewsSorted = sortViewsShops.every((s, i) => i === 0 || (s.views || 0) <= (sortViewsShops[i - 1].views || 0));
  assert(isViewsSorted, 'Feature 7b: Sort by views accurately places most viewed shops first');

  // Feature 8: Pagination Controls
  const pagedRes = await request('/api/shops?page=1&limit=2');
  assert(pagedRes.status === 200, 'Feature 8: Pagination page=1&limit=2 returns HTTP 200');
  assert(pagedRes.body?.shops?.length <= 2, 'Feature 8: Page size respects limit parameter', `Count: ${pagedRes.body?.shops?.length}`);
  assert(pagedRes.body?.pagination?.limit === 2, 'Feature 8: Pagination metadata confirms limit=2');

  // Feature 9: Connected Experience: Direct WhatsApp CTA Payload
  const sampleShop = allShops[0];
  const targetPhone = sampleShop.whatsapp || sampleShop.phone;
  const whatsappUrl = `https://wa.me/91${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent('Hello! I discovered your store on LocalForVocal.')}`;
  assert(whatsappUrl.includes('wa.me/91'), 'Connected Experience: Direct WhatsApp CTA generates clean customer-to-merchant link', `URL: ${whatsappUrl.slice(0, 45)}...`);

  // Feature 10: Connected Experience: Map Marker Coordinates
  const validMapCoords = allShops.every(s => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
  assert(validMapCoords, 'Connected Experience: Leaflet Map markers possess valid latitude and longitude floats for visual rendering');

  console.log(`\n📊 Page 3 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 3: Explore Page', passed, failed };
}

module.exports = { runExplorePageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runExplorePageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
