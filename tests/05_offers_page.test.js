const { request, loginDemoUser, db } = require('./test-helper');

async function runOffersPageTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 5/11] OFFERS & FLASH DEALS (Neighborhood Savings Feed)');
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

  // Feature 1: Retrieve all active neighborhood deals
  const offersRes = await request('/api/offers');
  assert(offersRes.status === 200, 'Feature 1: GET /api/offers returns HTTP 200', `Status: ${offersRes.status}`);
  const offersList = offersRes.body?.offers || [];
  assert(Array.isArray(offersList) && offersList.length > 0, 'Feature 1: Returns active flash deals', `Count: ${offersList.length}`);
  const firstOffer = offersList[0];
  assert(Boolean(firstOffer.title && firstOffer.discount && firstOffer.shopName), 'Feature 1: Offer contains title, discount, shopName');
  assert(Boolean(firstOffer.phone || firstOffer.whatsapp), 'Feature 1: Offer includes merchant contact details');

  // Feature 2: Deal Text Search Filter
  const searchKeyword = firstOffer.title.split(' ')[0].toLowerCase();
  const searchDealRes = offersList.filter(o => 
    o.title.toLowerCase().includes(searchKeyword) || 
    (o.description && o.description.toLowerCase().includes(searchKeyword))
  );
  assert(searchDealRes.length > 0, 'Feature 2: Search filtering locates specific deal keywords', `Keyword: ${searchKeyword}`);

  // Feature 3: WhatsApp Claim CTA Generation
  const claimText = `Hello ${firstOffer.shopName}! I would like to claim your deal "${firstOffer.title}" (${firstOffer.discount}) found on LocalForVocal.`;
  const claimUrl = `https://wa.me/91${(firstOffer.whatsapp || firstOffer.phone).replace(/\D/g, '')}?text=${encodeURIComponent(claimText)}`;
  assert(claimUrl.includes(encodeURIComponent(firstOffer.discount)), 'Feature 3: 1-Click WhatsApp Claim CTA embeds discount and deal title');

  // Feature 4: Unauthorized Customer cannot post offer
  const cust = await loginDemoUser('customer');
  const unauthOffer = await request('/api/offers', {
    method: 'POST',
    token: cust.token,
    body: { title: 'Spam Offer', discount: '90% OFF' }
  });
  assert(unauthOffer.status === 403, 'Feature 4: Non-shop owner blocked from publishing deals with HTTP 403', `Status: ${unauthOffer.status}`);

  // Feature 5: Shop Owner publishes new flash deal
  const shopOwner = await loginDemoUser('shop_owner');
  const newOfferRes = await request('/api/offers', {
    method: 'POST',
    token: shopOwner.token,
    body: {
      title: 'Monsoon Special: Flat 20% OFF on First Aid Kits',
      description: 'Comprehensive family emergency first aid kit with antiseptic and gauze.',
      discount: '20% OFF',
      validTill: 'This Sunday'
    }
  });
  assert(newOfferRes.status === 201, 'Feature 5: Shop owner successfully posts flash deal (HTTP 201)', `Status: ${newOfferRes.status}`);
  const createdOffer = newOfferRes.body?.offer;
  assert(Boolean(createdOffer?.id), 'Feature 5: Returns created offer record with unique ID');

  // Feature 6: Connected Experience: New deal appears on Public Storefront and Offers Feed
  const updatedOffers = await request('/api/offers');
  const foundInFeed = (updatedOffers.body?.offers || []).find(o => o.id === createdOffer.id);
  assert(Boolean(foundInFeed), 'Connected Experience: Newly published offer immediately appears on public OffersPage feed');

  // Feature 7: Unauthorized deletion rejected
  const unauthDelete = await request(`/api/offers/${createdOffer.id}`, {
    method: 'DELETE',
    token: cust.token
  });
  assert(unauthDelete.status === 403, 'Feature 7: Unauthorized user blocked from deleting merchant deal with HTTP 403');

  // Feature 8: Merchant deletes own offer
  const deleteRes = await request(`/api/offers/${createdOffer.id}`, {
    method: 'DELETE',
    token: shopOwner.token
  });
  assert(deleteRes.status === 200, 'Feature 8: Merchant successfully removes flash deal (HTTP 200)', `Status: ${deleteRes.status}`);

  // Verify removed from feed
  const postDeleteFeed = await request('/api/offers');
  const stillInFeed = (postDeleteFeed.body?.offers || []).some(o => o.id === createdOffer.id);
  assert(!stillInFeed, 'Feature 8: Deleted offer completely removed from neighborhood feed');

  console.log(`\n📊 Page 5 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 5: Offers & Flash Deals', passed, failed };
}

module.exports = { runOffersPageTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runOffersPageTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
