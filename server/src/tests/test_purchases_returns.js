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
  console.log('🧪 SMART MART PRO — SUPPLIERS, PURCHASES & RETURNS TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. Health check
    const health = await (await fetch(`${API_BASE}/health`)).json();
    console.log('✅ Health check:', health.message);

    // Fetch existing catalog products
    const prodRes = await fetch(`${API_BASE}/products?limit=20`);
    const products = (await prodRes.json()).data;
    const targetProduct = products[0];
    console.log(`📦 Using product: "${targetProduct.name}" (${targetProduct.sku}), Initial Stock: ${targetProduct.stock}`);

    // Fetch suppliers
    const supRes = await fetch(`${API_BASE}/suppliers`);
    const suppliers = (await supRes.json()).data;
    console.log(`🏢 Loaded ${suppliers.length} FMCG suppliers.`);
    const targetSupplier = suppliers[0];
    console.log(`   Selected Supplier: ${targetSupplier.companyName} (${targetSupplier.category})`);

    // -------------------------------------------------------------
    // TEST 1: INWARD STOCK RECEIPT / PURCHASE ORDER
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 1: Purchase Order & Inward Stock Receipt');
    console.log('-------------------------------------------------------------');

    const newBatchNumber = `PO-BATCH-${Date.now().toString().slice(-4)}`;
    const inwardQty = 25;
    const purchaseCost = 45.50;
    const expiryDate = '2028-06-30';

    const poPayload = {
      supplierId: targetSupplier._id,
      supplierName: targetSupplier.companyName,
      invoiceReference: `SUP-INV-${Date.now().toString().slice(-4)}`,
      items: [
        {
          productId: targetProduct._id,
          batchNumber: newBatchNumber,
          expiryDate,
          purchasePrice: purchaseCost,
          quantity: inwardQty
        }
      ],
      paymentStatus: 'Paid',
      idempotencyKey: `PO-IDEMP-${Date.now()}`
    };

    const poRes = await fetch(`${API_BASE}/purchases/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poPayload)
    });
    const poData = await poRes.json();
    if (!poRes.ok) throw new Error(`PO Receipt Failed: ${JSON.stringify(poData)}`);

    const po = poData.data.purchase;
    console.log(`✅ Inward Stock Received: ${po.poNumber}`);
    console.log(`   Supplier: ${po.supplierName}, Total Quantity: ${po.totalQuantity}, Grand Total: ₹${po.grandTotal}`);

    // Verify batch was created and product stock increased
    const updatedProdRes = await fetch(`${API_BASE}/products/${targetProduct._id}`);
    const updatedProduct = (await updatedProdRes.json()).data;
    console.log(`   Product Stock Before: ${targetProduct.stock} -> After Receipt: ${updatedProduct.stock} (Increased by exactly ${inwardQty})`);

    if (updatedProduct.stock !== targetProduct.stock + inwardQty) {
      throw new Error(`❌ Stock increment verification failed! Expected ${targetProduct.stock + inwardQty}, got ${updatedProduct.stock}`);
    }

    // -------------------------------------------------------------
    // TEST 2: DUPLICATE STOCK RECEIPT PROTECTION (IDEMPOTENCY)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 2: Duplicate Stock Receipt Protection (Idempotency)');
    console.log('-------------------------------------------------------------');

    const fixedPOKey = `PO-FIXED-IDEMP-${Date.now()}`;
    const idempPOPayload = {
      supplierId: targetSupplier._id,
      supplierName: targetSupplier.companyName,
      invoiceReference: 'SUP-RETRY-001',
      items: [
        {
          productId: targetProduct._id,
          batchNumber: `IDEMP-B-${Date.now().toString().slice(-4)}`,
          expiryDate: '2028-12-31',
          purchasePrice: 50,
          quantity: 10
        }
      ],
      idempotencyKey: fixedPOKey
    };

    // First call
    const call1 = await fetch(`${API_BASE}/purchases/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(idempPOPayload)
    });
    const dataCall1 = await call1.json();
    const originalPO = dataCall1.data.purchase.poNumber;
    console.log(`First PO Call: ${originalPO}, isDuplicate: ${dataCall1.data.isDuplicate}`);

    const stockAfterCall1 = (await (await fetch(`${API_BASE}/products/${targetProduct._id}`)).json()).data.stock;

    // Second call with IDENTICAL idempotencyKey
    const call2 = await fetch(`${API_BASE}/purchases/receive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(idempPOPayload)
    });
    const dataCall2 = await call2.json();
    const secondPO = dataCall2.data.purchase.poNumber;
    console.log(`Second PO Call: ${secondPO}, isDuplicate: ${dataCall2.data.isDuplicate}`);

    const stockAfterCall2 = (await (await fetch(`${API_BASE}/products/${targetProduct._id}`)).json()).data.stock;

    if (originalPO === secondPO && dataCall2.data.isDuplicate === true && stockAfterCall1 === stockAfterCall2) {
      console.log('✅ Duplicate Stock Receipt Protection PASSED: Same PO returned, 0 duplicate stock added!');
    } else {
      throw new Error('❌ Duplicate Stock Receipt Protection FAILED!');
    }

    // -------------------------------------------------------------
    // TEST 3: CUSTOMER PROFILE, EDIT & PURCHASE HISTORY LINKAGE
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 3: Customer Profile, Edit & Purchase History');
    console.log('-------------------------------------------------------------');

    // Create a new registered customer
    const newCustPayload = {
      name: `Kavita Sen ${Date.now().toString().slice(-4)}`,
      phone: `9899${Date.now().toString().slice(-6)}`,
      email: 'kavita.sen@example.com'
    };

    const custCreateRes = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustPayload)
    });
    const customer = (await custCreateRes.json()).data;
    console.log(`Created Customer: "${customer.name}", Phone: ${customer.phone}`);

    // Edit customer profile
    const editCustRes = await fetch(`${API_BASE}/customers/${customer._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${customer.name} (VIP Member)` })
    });
    const editedCust = (await editCustRes.json()).data;
    console.log(`Edited Customer: "${editedCust.name}"`);

    // Perform POS Checkout for this customer
    const salePayload = {
      customerId: customer._id,
      customerName: editedCust.name,
      customerPhone: editedCust.phone,
      items: [{ productId: targetProduct._id, quantity: 4 }],
      discountPercent: 0,
      paymentMethod: 'UPI',
      idempotencyKey: `SALE-FOR-CUST-${Date.now()}`
    };

    const saleRes = await fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload)
    });
    const saleData = await saleRes.json();
    const sale = saleData.data.sale;
    console.log(`Processed POS Sale: Invoice #${sale.invoiceNumber}, Total: ₹${sale.totalAmount}`);

    // Verify customer's purchase history and invoices endpoint
    const historyRes = await fetch(`${API_BASE}/customers/${customer._id}/invoices`);
    const historyData = await historyRes.json();
    const custProfile = historyData.data;

    console.log(`Customer Invoices Found: ${custProfile.totalPurchasesCount}, Total Spent in DB: ₹${custProfile.totalSpent}`);
    const foundInvoice = custProfile.invoices.find(inv => inv.invoiceNumber === sale.invoiceNumber);

    if (foundInvoice && custProfile.totalSpent === sale.totalAmount) {
      console.log('✅ Customer Purchase History PASSED: Invoices accurately linked through customer ObjectId reference!');
    } else {
      throw new Error('❌ Customer Purchase History Linkage FAILED!');
    }

    // -------------------------------------------------------------
    // TEST 4: PARTIAL RETURN (RESELLABLE) & INVENTORY RESTOCK
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 4: Partial Return (Resellable Condition) & Restock');
    console.log('-------------------------------------------------------------');

    const stockBeforeReturn = (await (await fetch(`${API_BASE}/products/${targetProduct._id}`)).json()).data.stock;

    // Customer returns 2 of the 4 units in 'Resellable' condition
    const returnPayload1 = {
      saleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      items: [
        {
          productId: targetProduct._id,
          returnQuantity: 2,
          condition: 'Resellable',
          reason: 'Customer bought extra'
        }
      ],
      refundMethod: 'UPI',
      idempotencyKey: `RET-IDEMP-01-${Date.now()}`
    };

    const returnRes1 = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(returnPayload1)
    });
    const retData1 = await returnRes1.json();
    if (!returnRes1.ok) throw new Error(`Return 1 Failed: ${JSON.stringify(retData1)}`);

    const ret1 = retData1.data.saleReturn;
    console.log(`✅ Return Processed: ${ret1.returnNumber}`);
    console.log(`   Refund Amount: ₹${ret1.refundAmount}, Method: ${ret1.refundMethod}`);
    console.log(`   Item Restocked: ${ret1.items[0].restocked} (Condition: ${ret1.items[0].condition})`);

    // Verify stock was restored by 2 units
    const stockAfterReturn = (await (await fetch(`${API_BASE}/products/${targetProduct._id}`)).json()).data.stock;
    console.log(`   Stock Before Return: ${stockBeforeReturn} -> After Return: ${stockAfterReturn} (Restored by exactly 2)`);

    // Verify original sale returnStatus
    const updatedSale1 = (await (await fetch(`${API_BASE}/sales/invoice/${sale.invoiceNumber}`)).json()).data;
    console.log(`   Original Sale Status: ${updatedSale1.status}, ReturnStatus: ${updatedSale1.returnStatus}, Total Refunded: ₹${updatedSale1.totalRefunded}`);

    if (stockAfterReturn === stockBeforeReturn + 2 && updatedSale1.returnStatus === 'Partial') {
      console.log('✅ Partial Resellable Return PASSED: Stock restocked, original sale audit preserved as Partial return!');
    } else {
      throw new Error('❌ Partial Return Test FAILED!');
    }

    // -------------------------------------------------------------
    // TEST 5: INVALID RETURN QUANTITY VALIDATION
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 5: Excess Return Quantity Validation');
    console.log('-------------------------------------------------------------');

    // Customer originally bought 4, already returned 2. Remaining eligible = 2.
    // Attempting to return 3 units must FAIL with HTTP 400!
    const excessiveReturnPayload = {
      saleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      items: [
        {
          productId: targetProduct._id,
          returnQuantity: 3, // Only 2 are eligible!
          condition: 'Resellable'
        }
      ],
      idempotencyKey: `EXCESS-RET-${Date.now()}`
    };

    const excessRes = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(excessiveReturnPayload)
    });
    const excessData = await excessRes.json();

    console.log(`Server Status: ${excessRes.status}`);
    console.log(`Server Message: "${excessData.message}"`);

    if (excessRes.status === 400 && excessData.message.includes('Cannot return 3 units')) {
      console.log('✅ Return Quantity Validation PASSED: Server rejected excess return quantity!');
    } else {
      throw new Error('❌ Excess Return Quantity Validation FAILED!');
    }

    // -------------------------------------------------------------
    // TEST 6: DAMAGED RETURN (DO NOT RESTOCK AVAILABLE STOCK)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 6: Damaged Goods Return (Refunded but Quarantined)');
    console.log('-------------------------------------------------------------');

    const stockBeforeDamaged = (await (await fetch(`${API_BASE}/products/${targetProduct._id}`)).json()).data.stock;

    // Return remaining 2 units as 'Damaged' (Seal broken / damaged in transit)
    const damagedPayload = {
      saleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      items: [
        {
          productId: targetProduct._id,
          returnQuantity: 2,
          condition: 'Damaged',
          reason: 'Packaging arrived torn'
        }
      ],
      refundMethod: 'Cash',
      idempotencyKey: `DAMAGED-RET-${Date.now()}`
    };

    const damagedRes = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(damagedPayload)
    });
    const damagedData = await damagedRes.json();
    const ret2 = damagedData.data.saleReturn;

    console.log(`✅ Return Processed: ${ret2.returnNumber}`);
    console.log(`   Condition: ${ret2.items[0].condition}, Restocked: ${ret2.items[0].restocked}`);

    // Verify stock was NOT added to healthy inventory!
    const stockAfterDamaged = (await (await fetch(`${API_BASE}/products/${targetProduct._id}`)).json()).data.stock;
    console.log(`   Stock Before: ${stockBeforeDamaged} -> Stock After: ${stockAfterDamaged} (Untouched)`);

    // Verify original sale is now 'Full' returned
    const finalSale = (await (await fetch(`${API_BASE}/sales/invoice/${sale.invoiceNumber}`)).json()).data;
    console.log(`   Original Sale Status: ${finalSale.status}, ReturnStatus: ${finalSale.returnStatus}, Total Refunded: ₹${finalSale.totalRefunded}`);

    if (stockAfterDamaged === stockBeforeDamaged && ret2.items[0].restocked === false && finalSale.returnStatus === 'Full') {
      console.log('✅ Damaged Return PASSED: Customer received refund, stock quarantined, and invoice marked Full return!');
    } else {
      throw new Error('❌ Damaged Return Test FAILED!');
    }

    // -------------------------------------------------------------
    // TEST 7: DUPLICATE REFUND PROTECTION (IDEMPOTENCY)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST 7: Duplicate Refund Protection (Idempotency Key)');
    console.log('-------------------------------------------------------------');

    const retRetryRes = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(damagedPayload)
    });
    const retRetryData = await retRetryRes.json();
    console.log(`Re-sent identical refund request:`);
    console.log(`  Return Number: ${retRetryData.data.saleReturn.returnNumber}`);
    console.log(`  isDuplicate: ${retRetryData.data.isDuplicate}`);

    if (retRetryData.data.saleReturn.returnNumber === ret2.returnNumber && retRetryData.data.isDuplicate === true) {
      console.log('✅ Duplicate Refund Protection PASSED: Same return receipt returned without double-refunding!');
    } else {
      throw new Error('❌ Duplicate Refund Protection FAILED!');
    }

    console.log('\n================================================================');
    console.log('🎉 ALL 7 PURCHASING, SUPPLIER & RETURNS TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Test Suite Aborted with Error:', err);
    process.exit(1);
  }
}

runTests();
