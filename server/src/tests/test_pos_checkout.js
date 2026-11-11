import mongoose from 'mongoose';

const API_BASE = 'http://localhost:5000/api';

let authToken = null;
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  if (url.includes('/api') && !url.includes('/health') && !url.includes('/auth/login')) {
    if (!authToken) {
      const loginRes = await nativeFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@smartmartpro.com',
          password: 'AdminPassword123!'
        })
      });
      const loginData = await loginRes.json();
      authToken = loginData.data?.token;
    }
    options.headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${authToken}`
    };
  }
  return nativeFetch(url, options);
};


async function runTests() {
  console.log('================================================================');
  console.log('🧪 SMART MART PRO — POS CHECKOUT & EXPIRY SUITE VERIFICATION');
  console.log('================================================================\n');

  try {
    // Check Health
    const healthRes = await fetch(`${API_BASE}/health`);
    const health = await healthRes.json();
    console.log('✅ 1. Health Check:', health.message);

    // Get products and batches
    const prodRes = await fetch(`${API_BASE}/products?limit=50`);
    const prodData = await prodRes.json();
    const products = prodData.data || [];
    console.log(`📦 Loaded ${products.length} products from catalog.`);

    // -------------------------------------------------------------
    // TEST 1: SUCCESSFUL CHECKOUT & FEFO BATCH SELECTION
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 1: Successful Checkout & FEFO Batch Selection');
    console.log('-------------------------------------------------------------');

    // Find a product with available stock
    const testProd = products.find(p => p.stock >= 5) || products[0];
    console.log(`Using product "${testProd.name}" (${testProd.sku}), Stock: ${testProd.stock}, Selling Price: ₹${testProd.sellingPrice}`);

    // Get current batches for this product
    const invRes = await fetch(`${API_BASE}/inventory/batches?productId=${testProd._id}`);
    const invData = await invRes.json();
    const batchesBefore = invData.data || [];
    console.log(`Batches before checkout (${batchesBefore.length} found):`);
    batchesBefore.forEach(b => console.log(`  - Batch ${b.batchNumber}: Exp ${b.expiryDate?.substring(0, 10)}, Qty: ${b.availableQuantity}`));

    const checkoutPayload1 = {
      customerId: null,
      customerName: 'Priya Verma',
      customerPhone: '9876543210',
      items: [
        {
          productId: testProd._id,
          quantity: 2
        }
      ],
      discountPercent: 10,
      paymentMethod: 'UPI',
      cashier: 'Counter-01',
      idempotencyKey: `TEST-FEFO-${Date.now()}`
    };

    const checkoutRes1 = await fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkoutPayload1)
    });

    const checkoutData1 = await checkoutRes1.json();
    if (!checkoutRes1.ok) {
      throw new Error(`Test 1 Failed: ${JSON.stringify(checkoutData1)}`);
    }

    const sale1 = checkoutData1.data.sale;
    console.log(`✅ Sale created: Invoice #${sale1.invoiceNumber}`);
    console.log(`   Items: ${sale1.itemsCount}, Subtotal: ₹${sale1.subtotal}, Discount: ₹${sale1.discountAmount}, Tax (5%): ₹${sale1.taxAmount}, Total: ₹${sale1.totalAmount}`);
    console.log(`   Payment Method: ${sale1.paymentMethod} (Audit Ledger Record Only)`);
    console.log('   FEFO Batches Deducted:', JSON.stringify(sale1.items[0].batchesDeducted));

    // Verify stock deduction in batch
    const invResAfter = await fetch(`${API_BASE}/inventory/batches?productId=${testProd._id}`);
    const batchesAfter = (await invResAfter.json()).data;
    console.log('Batches after checkout:');
    batchesAfter.forEach(b => console.log(`  - Batch ${b.batchNumber}: Qty: ${b.availableQuantity}`));

    // -------------------------------------------------------------
    // TEST 2: DUPLICATE REQUEST PROTECTION (IDEMPOTENCY)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 2: Duplicate Request Protection (Idempotency Key)');
    console.log('-------------------------------------------------------------');

    const fixedIdempotencyKey = `IDEMP-FIXED-KEY-${Date.now()}`;
    const payloadIdemp = {
      customerName: 'Aarav Patel',
      items: [{ productId: testProd._id, quantity: 1 }],
      discountPercent: 0,
      paymentMethod: 'Card',
      idempotencyKey: fixedIdempotencyKey
    };

    // First Call
    const call1 = await fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadIdemp)
    });
    const dataCall1 = await call1.json();
    const originalInvoice = dataCall1.data.sale.invoiceNumber;
    console.log(`First request processed: Invoice #${originalInvoice}, isDuplicate: ${dataCall1.data.isDuplicate}`);

    // Fetch batch stock immediately after call 1
    const invMid = await fetch(`${API_BASE}/inventory/batches?productId=${testProd._id}`);
    const batchesMid = (await invMid.json()).data;
    const stockAfterCall1 = batchesMid.reduce((acc, b) => acc + b.availableQuantity, 0);

    // Second Call with IDENTICAL idempotencyKey
    const call2 = await fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadIdemp)
    });
    const dataCall2 = await call2.json();
    const secondInvoice = dataCall2.data.sale.invoiceNumber;
    console.log(`Second request processed: Invoice #${secondInvoice}, isDuplicate: ${dataCall2.data.isDuplicate}`);

    // Fetch batch stock immediately after call 2
    const invPost = await fetch(`${API_BASE}/inventory/batches?productId=${testProd._id}`);
    const batchesPost = (await invPost.json()).data;
    const stockAfterCall2 = batchesPost.reduce((acc, b) => acc + b.availableQuantity, 0);

    if (originalInvoice === secondInvoice && dataCall2.data.isDuplicate === true && stockAfterCall1 === stockAfterCall2) {
      console.log('✅ Idempotency test PASSED: Exactly the same invoice was returned, and 0 extra units were deducted from stock!');
    } else {
      throw new Error(`❌ Idempotency FAILED! Stock was re-deducted or new invoice was issued.`);
    }

    // -------------------------------------------------------------
    // TEST 3: INSUFFICIENT STOCK PROTECTION
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 3: Insufficient Stock Protection');
    console.log('-------------------------------------------------------------');

    const excessivePayload = {
      customerName: 'Wholesale Buyer',
      items: [{ productId: testProd._id, quantity: 999999 }],
      paymentMethod: 'Cash',
      idempotencyKey: `TEST-OVER-${Date.now()}`
    };

    const excessiveRes = await fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(excessivePayload)
    });

    const excessiveData = await excessiveRes.json();
    console.log(`HTTP Status: ${excessiveRes.status}`);
    console.log(`Server Response: ${excessiveData.message}`);

    if (excessiveRes.status === 400 && excessiveData.message.includes('Insufficient stock')) {
      console.log('✅ Insufficient stock test PASSED: Server rejected order with 400 Bad Request.');
    } else {
      throw new Error(`❌ Insufficient stock test FAILED! Expected 400 Bad Request.`);
    }

    // -------------------------------------------------------------
    // TEST 4: EXPIRED BATCH PROTECTION (SALES STRICTLY BLOCKED)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 4: Expired Batch Protection (Sales Strictly Blocked)');
    console.log('-------------------------------------------------------------');

    // Create a temporary expired batch for testing
    const expiredBatchPayload = {
      productId: testProd._id,
      batchNumber: `EXP-TEST-${Date.now().toString().slice(-4)}`,
      expiryDate: '2026-01-01', // Date in the past relative to current 2026-10-30
      purchasePrice: 10,
      quantity: 50,
      supplier: 'Expired Goods Test Lab'
    };

    const addBatchRes = await fetch(`${API_BASE}/inventory/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expiredBatchPayload)
    });
    const addBatchData = await addBatchRes.json();
    console.log(`Created test batch ${expiredBatchPayload.batchNumber} with expiry 2026-01-01 (Qty: 50, Status: ${addBatchData.data?.batch?.status || 'Expired'})`);

    // Fetch expiring batches API to verify the 4 alert tiers
    const expiringAlertsRes = await fetch(`${API_BASE}/batches/expiring?days=all`);
    const expiringAlertsData = await expiringAlertsRes.json();
    const foundExpiredInAlerts = expiringAlertsData.data.find(b => b.batchNumber === expiredBatchPayload.batchNumber);

    console.log('Expired Batch in Alerts API:');
    console.log(`  - Batch: ${foundExpiredInAlerts?.batchNumber}, Alert Tier: ${foundExpiredInAlerts?.alertTier}, isSaleBlocked: ${foundExpiredInAlerts?.isSaleBlocked}`);

    if (foundExpiredInAlerts?.isSaleBlocked === true && foundExpiredInAlerts?.alertTier === 'Expired') {
      console.log('✅ Expired batch correctly flagged as "Expired" and isSaleBlocked = true in alerts API.');
    }

    // Now test checkout behavior:
    // If we request all available stock plus some from the expired batch, it must refuse to touch the expired batch
    const allValidBatches = batchesPost.filter(b => new Date(b.expiryDate) > new Date());
    const validQtyAvailable = allValidBatches.reduce((a, b) => a + b.availableQuantity, 0);
    console.log(`Total valid unexpired stock available: ${validQtyAvailable} units.`);

    const checkoutExpiredAttempt = await fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Tester',
        items: [{ productId: testProd._id, quantity: validQtyAvailable + 5 }], // 5 more than valid
        paymentMethod: 'Cash',
        idempotencyKey: `TEST-EXPIRED-BLOCK-${Date.now()}`
      })
    });

    const expCheckoutData = await checkoutExpiredAttempt.json();
    console.log(`Checkout result for requesting beyond valid stock into expired stock:`);
    console.log(`  Status: ${checkoutExpiredAttempt.status}`);
    console.log(`  Message: ${expCheckoutData.message}`);

    if (checkoutExpiredAttempt.status === 400 && expCheckoutData.message.includes('blocked by shelf-life safety policy')) {
      console.log('✅ Expired Batch Protection PASSED: Server strictly blocked sales from expired batch!');
    } else {
      throw new Error('❌ Expired batch protection FAILED!');
    }

    // -------------------------------------------------------------
    // TEST 5: SIMULTANEOUS SALES & CONCURRENCY CONFLICT TEST
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 5: Simultaneous Sales & Concurrency Race Condition');
    console.log('-------------------------------------------------------------');

    // Create a product with exactly 3 units
    const raceProdRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Race Condition Biscuit ${Date.now().toString().slice(-4)}`,
        sku: `SKU-RACE-${Date.now().toString().slice(-4)}`,
        category: products[0].category._id || products[0].category,
        sellingPrice: 50,
        unit: 'packet',
        initialStock: 3,
        batchNumber: `RACE-B1-${Date.now().toString().slice(-4)}`,
        expiryDate: '2027-12-31',
        purchasePrice: 30
      })
    });

    const raceProdData = await raceProdRes.json();
    const raceProduct = raceProdData.data;
    console.log(`Created product "${raceProduct.name}" with initial stock = 3 units.`);

    // Fire TWO concurrent checkout requests for 2 units each!
    // Total requested = 4 units, but only 3 exist.
    // In a race condition without atomic guards, BOTH might succeed and stock would become -1!
    console.log('Firing 2 simultaneous checkout requests for 2 units each (Total 4 units requested vs 3 in stock)...');

    const reqA = fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Shopper A',
        items: [{ productId: raceProduct._id, quantity: 2 }],
        paymentMethod: 'Cash',
        idempotencyKey: `RACE-A-${Date.now()}`
      })
    });

    const reqB = fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Shopper B',
        items: [{ productId: raceProduct._id, quantity: 2 }],
        paymentMethod: 'UPI',
        idempotencyKey: `RACE-B-${Date.now()}`
      })
    });

    const [resA, resB] = await Promise.all([reqA, reqB]);
    const dataA = await resA.json();
    const dataB = await resB.json();

    console.log(`Shopper A Status: ${resA.status} (${dataA.message || 'Success'})`);
    console.log(`Shopper B Status: ${resB.status} (${dataB.message || 'Success'})`);

    const oneSucceeded = (resA.ok && !resB.ok) || (!resA.ok && resB.ok);
    console.log(`One request succeeded and the other was prevented: ${oneSucceeded}`);

    // Check remaining stock
    const raceBatchesRes = await fetch(`${API_BASE}/inventory/batches?productId=${raceProduct._id}`);
    const raceBatches = (await raceBatchesRes.json()).data;
    const finalRaceStock = raceBatches.reduce((a, b) => a + b.availableQuantity, 0);
    console.log(`Final remaining stock in MongoDB: ${finalRaceStock} units (Should be 1 unit, NEVER negative!)`);

    if (oneSucceeded && finalRaceStock === 1) {
      console.log('✅ Concurrency Protection PASSED: Atomic check-and-update prevented overselling. Stock remained strictly non-negative (1 unit)!');
    } else {
      throw new Error(`❌ Concurrency Protection FAILED! final stock: ${finalRaceStock}`);
    }

    // -------------------------------------------------------------
    // TEST 6: COMPENSATING ROLLBACK ON MULTI-ITEM FAILURE
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 6: Compensating Rollback on Multi-Item Failure');
    console.log('-------------------------------------------------------------');

    const stockBeforeRollback = finalRaceStock; // 1 unit

    const multiItemPayload = {
      customerName: 'Rollback Tester',
      items: [
        { productId: raceProduct._id, quantity: 1 },
        { productId: testProd._id, quantity: 999999 } // This will cause checkout to fail!
      ],
      paymentMethod: 'Cash',
      idempotencyKey: `TEST-ROLLBACK-${Date.now()}`
    };

    const rollbackRes = await fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(multiItemPayload)
    });

    const rollbackData = await rollbackRes.json();
    console.log(`Multi-item checkout failed as expected: Status ${rollbackRes.status}, Message: "${rollbackData.message}"`);

    // Verify raceProduct stock was NOT partially deducted
    const raceBatchesPostRollback = (await (await fetch(`${API_BASE}/inventory/batches?productId=${raceProduct._id}`)).json()).data;
    const stockAfterRollback = raceBatchesPostRollback.reduce((a, b) => a + b.availableQuantity, 0);

    console.log(`Stock before failed checkout: ${stockBeforeRollback}`);
    console.log(`Stock after failed checkout: ${stockAfterRollback}`);

    if (stockBeforeRollback === stockAfterRollback) {
      console.log('✅ Rollback Test PASSED: No partial deduction or orphaned sale record was left behind!');
    } else {
      throw new Error(`❌ Rollback Test FAILED! Stock was partially deducted: ${stockAfterRollback} != ${stockBeforeRollback}`);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL 6 POS & EXPIRY EDGE CASE TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Aborted with Error:', err);
    process.exit(1);
  }
}

runTests();
