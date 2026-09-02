const { request, loginDemoUser, db } = require('./test-helper');

async function runAuthModalTests() {
  console.log('\n================================================================');
  console.log('📄 [PAGE 1/11] AUTHMODAL & USER SESSION (Global Auth Gateway)');
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

  // Feature 1: Phone OTP generation for existing user (Login Mode)
  const existingPhone = '9810055555'; // Amit Verma
  const otpLoginRes = await request('/api/auth/send-otp', {
    method: 'POST',
    body: { phone: existingPhone, purpose: 'login' }
  });
  assert(otpLoginRes.status === 200, 'Feature 1: Send OTP to registered user in Login mode returns HTTP 200', `Status: ${otpLoginRes.status}`);
  assert(otpLoginRes.body && otpLoginRes.body.success === true, 'Feature 1: Send OTP response indicates success');
  assert(Boolean(otpLoginRes.body?.devOtp || otpLoginRes.body?.message), 'Feature 1: OTP simulated code or SMS message generated');

  // Feature 2: Strict Login Validation - Unregistered phone returns 404
  const unregisteredPhone = '9111122222';
  const unregOtpRes = await request('/api/auth/send-otp', {
    method: 'POST',
    body: { phone: unregisteredPhone, purpose: 'login' }
  });
  assert(unregOtpRes.status === 404, 'Feature 2: Unregistered phone in login mode rejected with HTTP 404 ACCOUNT_NOT_FOUND', `Status: ${unregOtpRes.status}`);

  // Feature 3: Strict Register Validation - Existing phone in register mode returns 409
  const dupRegisterRes = await request('/api/auth/send-otp', {
    method: 'POST',
    body: { phone: existingPhone, purpose: 'register' }
  });
  assert(dupRegisterRes.status === 409, 'Feature 3: Existing phone in register mode rejected with HTTP 409 ACCOUNT_ALREADY_EXISTS', `Status: ${dupRegisterRes.status}`);

  // Feature 4: Phone OTP generation for new user (Register Mode)
  const newPhone = '9820099999';
  // Ensure clean test state
  db.prepare('DELETE FROM users WHERE phone = ?').run(newPhone);

  const otpRegRes = await request('/api/auth/send-otp', {
    method: 'POST',
    body: { phone: newPhone, purpose: 'register' }
  });
  assert(otpRegRes.status === 200, 'Feature 4: Send OTP to new phone in Register mode returns HTTP 200', `Status: ${otpRegRes.status}`);
  const devCode = otpRegRes.body?.devOtp || '123456';

  // Feature 5: Verify OTP with code and register new user
  const verifyRes = await request('/api/auth/verify-otp', {
    method: 'POST',
    body: { phone: newPhone, code: devCode, purpose: 'register', name: 'Verified OTP Resident' }
  });
  assert(verifyRes.status === 200, 'Feature 5: Verify OTP registers new account and creates session', `Status: ${verifyRes.status}`);
  assert(Boolean(verifyRes.body?.token), 'Feature 5: Returns JWT session token');
  assert(verifyRes.body?.user?.name === 'Verified OTP Resident', 'Feature 5: User record created with correct name');
  const otpUserToken = verifyRes.body?.token;
  const otpUserId = verifyRes.body?.user?.id;

  // Feature 6: Phone OTP rejection on wrong code
  await request('/api/auth/send-otp', { method: 'POST', body: { phone: existingPhone, purpose: 'login' } });
  const wrongOtpRes = await request('/api/auth/verify-otp', {
    method: 'POST',
    body: { phone: existingPhone, code: '000000', purpose: 'login' }
  });
  assert(wrongOtpRes.status === 400, 'Feature 6: Reject invalid OTP code with HTTP 400', `Status: ${wrongOtpRes.status}`);

  // Feature 7: 1-Click Demo Login as Customer
  const custLogin = await loginDemoUser('customer');
  assert(Boolean(custLogin.token), 'Feature 7: 1-Click Demo Login as Customer generates token');
  assert(custLogin.user.accountType === 'customer', 'Feature 7: Customer accountType is "customer"', `Got: ${custLogin.user.accountType}`);

  // Feature 8: 1-Click Demo Login as Shop Owner
  const ownerLogin = await loginDemoUser('shop_owner');
  assert(Boolean(ownerLogin.token), 'Feature 8: 1-Click Demo Login as Shop Owner generates token');
  assert(ownerLogin.user.accountType === 'shop_owner', 'Feature 8: Shop Owner accountType is "shop_owner"', `Got: ${ownerLogin.user.accountType}`);
  assert(Boolean(ownerLogin.user.shopId), 'Feature 8: Shop Owner linked to active shop_id in SQLite', `Shop ID: ${ownerLogin.user.shopId}`);

  // Feature 9: 1-Click Demo Login as Admin
  const adminLogin = await loginDemoUser('admin');
  assert(Boolean(adminLogin.token), 'Feature 9: 1-Click Demo Login as Admin generates token');
  assert(adminLogin.user.accountType === 'admin', 'Feature 9: Admin accountType is "admin"', `Got: ${adminLogin.user.accountType}`);

  // Feature 10: Session Me Endpoint (GET /api/auth/me)
  const meRes = await request('/api/auth/me', { token: custLogin.token });
  assert(meRes.status === 200, 'Feature 10: GET /api/auth/me returns authenticated user', `Status: ${meRes.status}`);
  assert(meRes.body?.user?.id === custLogin.user.id, 'Feature 10: Authenticated user ID matches session');

  // Feature 11: Profile Update (PUT /api/auth/profile)
  const updateRes = await request('/api/auth/profile', {
    method: 'PUT',
    token: otpUserToken,
    body: { name: 'Dr. Rahul Verma', area: 'Bandra West', city: 'Mumbai' }
  });
  assert(updateRes.status === 200, 'Feature 11: PUT /api/auth/profile updates user details in SQLite');
  assert(updateRes.body?.user?.name === 'Dr. Rahul Verma', 'Feature 11: Name successfully updated');

  // Feature 12: Connected Experience: Role-based Navigation Guard & Admin Security
  const unauthorizedAdminAccess = await request('/api/admin/stats', { token: custLogin.token });
  assert(unauthorizedAdminAccess.status === 403, 'Connected Experience: Customer token blocked from Admin panel with HTTP 403');

  const authorizedAdminAccess = await request('/api/admin/stats', { token: adminLogin.token });
  assert(authorizedAdminAccess.status === 200, 'Connected Experience: Admin token successfully accesses Admin panel with HTTP 200');

  // Feature 13: Dedicated Admin Gateway Login
  const invalidAdminLogin = await request('/api/auth/admin-login', {
    method: 'POST',
    body: { username: 'admin@localforvocal.com', password: 'wrongpassword' }
  });
  assert(invalidAdminLogin.status === 401, 'Feature 13: Admin Gateway rejects invalid password with HTTP 401');

  const nonAdminLogin = await request('/api/auth/admin-login', {
    method: 'POST',
    body: { username: 'amit.verma@example.com', password: 'pass123' }
  });
  assert(nonAdminLogin.status === 401, 'Feature 13: Non-admin users blocked from Admin Gateway with HTTP 401');

  const validAdminLogin = await request('/api/auth/admin-login', {
    method: 'POST',
    body: { username: 'admin@localforvocal.com', password: 'pass123' }
  });
  assert(validAdminLogin.status === 200, 'Feature 13: Admin Gateway authenticates administrator with HTTP 200');
  assert(validAdminLogin.body?.user?.accountType === 'admin', 'Feature 13: Admin Gateway issues admin role session');

  // Cleanup
  if (otpUserId) {
    db.prepare('DELETE FROM users WHERE id = ?').run(otpUserId);
  }

  console.log(`\n📊 Page 1 Results: ${passed} Passed, ${failed} Failed\n`);
  return { page: 'Page 1: AuthModal & User Session', passed, failed };
}

module.exports = { runAuthModalTests };

if (require.main === module) {
  const { startServer, stopServer } = require('./test-helper');
  (async () => {
    await startServer();
    const res = await runAuthModalTests();
    await stopServer();
    process.exit(res.failed > 0 ? 1 : 0);
  })();
}
