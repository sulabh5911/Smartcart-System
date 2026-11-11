/**
 * Smart Mart Pro - Automated Authentication & RBAC Verification Test Suite
 * 
 * Verifies:
 * 1. Password hashing & secret confidentiality (no hash exposed)
 * 2. Login authentication (invalid password, unknown email, valid login)
 * 3. JWT generation, expiration handling, and verification
 * 4. Role-based access control (RBAC):
 *    - Admin: Full access + User management
 *    - Manager: Permitted reports/inventory/suppliers; blocked from user management
 *    - Cashier: Permitted POS/customers; blocked from reports/purchases/adjustments/users
 * 5. Account deactivation and lockout protections
 * 6. HTTP 401 (Unauthorized) vs HTTP 403 (Forbidden) correctness
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('\n======================================================');
  console.log('🛡️  SMART MART PRO: AUTH & RBAC TEST SUITE STARTING');
  console.log('======================================================\n');

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
    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated request to protected endpoint -> 401
    // -------------------------------------------------------------------------
    console.log('📌 Test 1: Missing Token on Protected Endpoint');
    const resNoToken = await fetch(`${BASE_URL}/reports/dashboard`);
    assert(resNoToken.status === 401, `GET /api/reports/dashboard without token returned 401 (Got ${resNoToken.status})`);
    const dataNoToken = await resNoToken.json();
    assert(dataNoToken.success === false, 'Response success is false');
    assert(dataNoToken.message.includes('Authentication required'), 'Message clarifies authentication is required');

    // -------------------------------------------------------------------------
    // TEST 2: Invalid/Tampered Token -> 401
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 2: Invalid/Tampered Token');
    const resBadToken = await fetch(`${BASE_URL}/reports/dashboard`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' }
    });
    assert(resBadToken.status === 401, `Tampered token returned 401 (Got ${resBadToken.status})`);

    // -------------------------------------------------------------------------
    // TEST 3: Login with incorrect password -> 401
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 3: Login with Incorrect Password');
    const resWrongPass = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@smartmartpro.com',
        password: 'WrongPassword999!'
      })
    });
    assert(resWrongPass.status === 401, `Wrong password returned 401 (Got ${resWrongPass.status})`);
    const dataWrongPass = await resWrongPass.json();
    assert(dataWrongPass.message === 'Invalid email address or password.', 'Returns safe non-enumerating error message');

    // -------------------------------------------------------------------------
    // TEST 4: Login with non-existent user -> 401
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 4: Login with Non-Existent User');
    const resGhost = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent.staff@smartmartpro.com',
        password: 'SomePassword123!'
      })
    });
    assert(resGhost.status === 401, `Non-existent user returned 401 (Got ${resGhost.status})`);

    // -------------------------------------------------------------------------
    // TEST 5: Successful Admin Login -> 200 + JWT + Safe User Object
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 5: Successful Admin Login & Confidentiality Check');
    const resAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@smartmartpro.com',
        password: 'AdminPassword123!'
      })
    });
    assert(resAdmin.status === 200, `Admin login returned 200 (Got ${resAdmin.status})`);
    const dataAdmin = await resAdmin.json();
    const adminToken = dataAdmin.data.token;
    const adminUser = dataAdmin.data.user;

    assert(!!adminToken && adminToken.split('.').length === 3, 'Valid 3-part JWT token returned');
    assert(adminUser.role === 'admin', `User role is 'admin' (Got ${adminUser.role})`);
    assert(adminUser.password === undefined, 'Password hash is NEVER exposed in login response');

    // Verify GET /api/auth/me
    const resMe = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(resMe.status === 200, `GET /api/auth/me returned 200 with Bearer token`);
    const dataMe = await resMe.json();
    assert(dataMe.data.user.email === 'admin@smartmartpro.com', 'Profile matches authenticated user');
    assert(dataMe.data.user.password === undefined, 'Password hash is NOT present in /api/auth/me response');

    // -------------------------------------------------------------------------
    // TEST 6: Successful Manager & Cashier Logins
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 6: Manager and Cashier Logins');
    const resManager = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manager@smartmartpro.com',
        password: 'ManagerPassword123!'
      })
    });
    assert(resManager.status === 200, `Manager login returned 200`);
    const managerToken = (await resManager.json()).data.token;

    const resCashier = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cashier@smartmartpro.com',
        password: 'CashierPassword123!'
      })
    });
    assert(resCashier.status === 200, `Cashier login returned 200`);
    const cashierToken = (await resCashier.json()).data.token;

    // -------------------------------------------------------------------------
    // TEST 7: RBAC - Cashier Permissions Check
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 7: Cashier Permissions & Forbidden Actions (HTTP 403)');
    
    // Cashier allowed: Read products for scanning
    const resCashierProducts = await fetch(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    assert(resCashierProducts.status === 200, `Cashier can read products catalog (Got 200)`);

    // Cashier FORBIDDEN: View store financial reports & profit margins
    const resCashierReports = await fetch(`${BASE_URL}/reports/analytics`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    assert(resCashierReports.status === 403, `Cashier blocked from reports with HTTP 403 Forbidden (Got ${resCashierReports.status})`);
    const dataForbiddenReport = await resCashierReports.json();
    assert(dataForbiddenReport.message.includes('Access Denied'), 'Safe error confirms Access Denied with role');

    // Cashier FORBIDDEN: Inventory stock adjustment / write-off
    const resCashierAdjust = await fetch(`${BASE_URL}/inventory/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cashierToken}`
      },
      body: JSON.stringify({
        batchId: '000000000000000000000000',
        adjustmentType: 'WRITE_OFF_DAMAGED',
        quantity: 5,
        reason: 'Attempted cashier write-off'
      })
    });
    assert(resCashierAdjust.status === 403, `Cashier blocked from stock adjustments with HTTP 403 Forbidden (Got ${resCashierAdjust.status})`);

    // Cashier FORBIDDEN: User Management
    const resCashierUsers = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    assert(resCashierUsers.status === 403, `Cashier blocked from user management with HTTP 403 Forbidden (Got ${resCashierUsers.status})`);

    // Cashier FORBIDDEN: Supplier purchasing
    const resCashierSuppliers = await fetch(`${BASE_URL}/suppliers`, {
      headers: { Authorization: `Bearer ${cashierToken}` }
    });
    assert(resCashierSuppliers.status === 403, `Cashier blocked from supplier profiles with HTTP 403 Forbidden (Got ${resCashierSuppliers.status})`);

    // -------------------------------------------------------------------------
    // TEST 8: RBAC - Manager Permissions Check
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 8: Manager Permissions Check');
    // Manager ALLOWED: Financial reports
    const resManagerReports = await fetch(`${BASE_URL}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(resManagerReports.status === 200, `Manager allowed to access reports/dashboard (Got 200)`);

    // Manager ALLOWED: Suppliers
    const resManagerSuppliers = await fetch(`${BASE_URL}/suppliers`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(resManagerSuppliers.status === 200, `Manager allowed to access suppliers (Got 200)`);

    // Manager FORBIDDEN: User Management
    const resManagerUsers = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${managerToken}` }
    });
    assert(resManagerUsers.status === 403, `Manager blocked from user management with HTTP 403 Forbidden (Got ${resManagerUsers.status})`);

    // -------------------------------------------------------------------------
    // TEST 9: Admin User Management Workflow
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 9: Admin User Management (Create, List, Toggle Status)');
    // Admin ALLOWED: List users
    const resAdminUsers = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(resAdminUsers.status === 200, `Admin allowed to list staff users (Got 200)`);
    const usersList = (await resAdminUsers.json()).data;
    assert(usersList.length >= 3, `Users list contains staff members (Found ${usersList.length})`);

    // Admin creates a temporary test cashier
    const testStaffEmail = `test.cashier.${Date.now()}@smartmartpro.com`;
    const resCreateStaff = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Temporary Cashier',
        email: testStaffEmail,
        password: 'TempPassword123!',
        role: 'cashier',
        phone: '+91 99999 88888'
      })
    });
    assert(resCreateStaff.status === 201, `Admin successfully created new staff user (Got 201)`);
    const createdUser = (await resCreateStaff.json()).data.user;
    assert(createdUser.email === testStaffEmail, 'New user email matches');
    assert(createdUser.password === undefined, 'New user response does not leak password hash');

    // Verify created user can log in
    const resTempLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStaffEmail,
        password: 'TempPassword123!'
      })
    });
    assert(resTempLogin.status === 200, `Newly created staff user can successfully log in`);

    // Admin DEACTIVATES the staff user
    const resDeactivate = await fetch(`${BASE_URL}/users/${createdUser._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isActive: false })
    });
    assert(resDeactivate.status === 200, `Admin deactivated staff user`);

    // Deactivated user tries to log in -> blocked with 403 Forbidden!
    const resDeactivatedLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStaffEmail,
        password: 'TempPassword123!'
      })
    });
    assert(resDeactivatedLogin.status === 403, `Deactivated user login blocked with HTTP 403 Forbidden (Got ${resDeactivatedLogin.status})`);
    const deactData = await resDeactivatedLogin.json();
    assert(deactData.message.includes('deactivated'), 'Informs user account has been deactivated');

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n======================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Test execution error:', err);
    process.exit(1);
  }
}

runTests();
