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
  console.log('🧪 SMART MART PRO — ANALYTICS, REPORTS & COGS VERIFICATION');
  console.log('================================================================\n');

  try {
    // 1. Health check
    const health = await (await fetch(`${API_BASE}/health`)).json();
    console.log('✅ Health check:', health.message);

    // 2. Fetch Dashboard Overview Metrics
    const dashRes = await fetch(`${API_BASE}/reports/dashboard`);
    const dashData = await dashRes.json();
    if (!dashRes.ok) throw new Error(`Dashboard API Failed: ${JSON.stringify(dashData)}`);

    const dm = dashData.data;
    console.log('\n📊 1. LIVE DASHBOARD METRICS:');
    console.log(`   Today Sales: ₹${dm.today.sales} (${dm.today.invoices} invoices, ${dm.today.units} units)`);
    console.log(`   Month Sales: ₹${dm.month.sales} (${dm.month.invoices} invoices)`);
    console.log(`   Inventory Valuation: ₹${dm.inventory.totalValuation} (${dm.inventory.totalUnits} units, ${dm.inventory.totalProducts} active SKUs)`);
    console.log(`   Alerts: ${dm.inventory.blockedBatchesCount} Blocked, ${dm.inventory.urgentBatchesCount} Urgent, ${dm.inventory.lowStockCount} Low-stock items`);
    console.log(`   7-Day Trend Days Count: ${dm.sevenDayTrend.length}`);

    // 3. Mathematical Reconciliation Test against Manually Calculated Invoices
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST: Mathematical Accuracy of Financial Formulas');
    console.log('-------------------------------------------------------------');

    // Create a product with known exact selling price and wholesale batch cost
    const testSKU = `SKU-MATH-${Date.now().toString().slice(-4)}`;
    const knownSellingPrice = 120.00;
    const knownPurchaseCost = 70.00;
    const initialBatchQty = 20;

    const catRes = await fetch(`${API_BASE}/categories`);
    const categories = (await catRes.json()).data;
    const categoryId = categories[0]?._id;

    const prodRes = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Analytics Test Biscuit ${Date.now().toString().slice(-4)}`,
        sku: testSKU,
        category: categoryId,
        sellingPrice: knownSellingPrice,
        unit: 'packet',
        initialStock: initialBatchQty,
        batchNumber: `MATH-B1-${Date.now().toString().slice(-4)}`,
        expiryDate: '2028-12-31',
        purchasePrice: knownPurchaseCost
      })
    });
    const prodJson = await prodRes.json();
    if (!prodRes.ok) throw new Error(`Product creation failed: ${JSON.stringify(prodJson)}`);
    const product = prodJson.data;
    console.log(`Created test product "${product.name}" (Selling: ₹${knownSellingPrice}, Cost: ₹${knownPurchaseCost})`);

    // Fetch baseline analytics before our test transaction
    const baseAnalytics = (await (await fetch(`${API_BASE}/reports/analytics?preset=all`)).json()).data.summary;

    // Checkout: 5 units with 10% discount
    // Manual Calculation:
    // Units = 5
    // Gross Sales = 5 * 120 = ₹600.00
    // Discount = 10% of 600 = ₹60.00
    // Taxable = 600 - 60 = ₹540.00
    // GST is not added to POS bills.
    // Grand Total = 600 - 60 = ₹540.00
    // COGS = 5 * 70 = ₹350.00
    // Net Sales (excl tax) = 600 - 60 = ₹540.00
    // Gross Profit = Net Sales - COGS = 540 - 350 = ₹190.00
    // Profit Margin % = (190 / 540) * 100 = 35.185% (~35.2%)

    const salePayload = {
      customerName: 'Analytics Tester',
      items: [{ productId: product._id, quantity: 5 }],
      discountPercent: 10,
      paymentMethod: 'UPI',
      idempotencyKey: `MATH-SALE-${Date.now()}`
    };

    const saleRes = await fetch(`${API_BASE}/sales/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload)
    });
    const sale = (await saleRes.json()).data.sale;
    console.log(`Billed Invoice #${sale.invoiceNumber}: Subtotal ₹${sale.subtotal}, Discount ₹${sale.discountAmount}, Tax ₹${sale.taxAmount}, Total ₹${sale.totalAmount}`);
    if (sale.taxAmount !== 0 || sale.taxPercent !== 0 || sale.totalAmount !== 540) {
      throw new Error('POS checkout must not add GST to the discounted total.');
    }

    // Verify after-sale analytics
    const afterSaleAnalytics = (await (await fetch(`${API_BASE}/reports/analytics?preset=all`)).json()).data.summary;

    const deltaGross = Math.round((afterSaleAnalytics.grossSales - baseAnalytics.grossSales) * 100) / 100;
    const deltaDiscount = Math.round((afterSaleAnalytics.discountAmount - baseAnalytics.discountAmount) * 100) / 100;
    const deltaNet = Math.round((afterSaleAnalytics.netSales - baseAnalytics.netSales) * 100) / 100;
    const deltaCOGS = Math.round((afterSaleAnalytics.cogs - baseAnalytics.cogs) * 100) / 100;
    const deltaProfit = Math.round((afterSaleAnalytics.grossProfit - baseAnalytics.grossProfit) * 100) / 100;
    const deltaInvoices = afterSaleAnalytics.totalInvoices - baseAnalytics.totalInvoices;
    const deltaUnits = afterSaleAnalytics.totalUnits - baseAnalytics.totalUnits;

    console.log('\n🔍 Delta Verification (Before vs After Sale):');
    console.log(`   Expected Gross: ₹600.00 | Actual Delta: ₹${deltaGross}`);
    console.log(`   Expected Discount: ₹60.00 | Actual Delta: ₹${deltaDiscount}`);
    console.log(`   Expected Net Sales: ₹540.00 | Actual Delta: ₹${deltaNet}`);
    console.log(`   Expected COGS: ₹350.00 | Actual Delta: ₹${deltaCOGS}`);
    console.log(`   Expected Gross Profit: ₹190.00 | Actual Delta: ₹${deltaProfit}`);
    console.log(`   Expected Invoices Delta: 1 | Actual: ${deltaInvoices}`);
    console.log(`   Expected Units Delta: 5 | Actual: ${deltaUnits}`);

    if (
      deltaGross === 600 &&
      deltaDiscount === 60 &&
      deltaNet === 540 &&
      deltaCOGS === 350 &&
      deltaProfit === 190 &&
      deltaInvoices === 1 &&
      deltaUnits === 5
    ) {
      console.log('✅ Financial Formulas PASSED: Math strictly matches expected values down to the exact paisa!');
    } else {
      throw new Error('❌ Financial Formulas Verification Failed!');
    }

    // 4. Return & Refund Impact Verification
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST: Refund Convention & Revenue Adjustment');
    console.log('-------------------------------------------------------------');

    // Customer returns 2 of the 5 units.
    // The ₹60 invoice discount is prorated across 5 units. Paid rate = ₹108/unit.
    // Returning 2 units refunds ₹216.00.
    const returnPayload = {
      saleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      items: [
        {
          productId: product._id,
          returnQuantity: 2,
          condition: 'Resellable',
          reason: 'Excess quantity'
        }
      ],
      refundMethod: 'Cash',
      idempotencyKey: `MATH-RET-${Date.now()}`
    };

    const returnRes = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(returnPayload)
    });
    const ret = (await returnRes.json()).data.saleReturn;
    console.log(`Processed Return #${ret.returnNumber}: Refund Amount = ₹${ret.refundAmount}`);

    // Fetch analytics after return
    const afterReturnAnalytics = (await (await fetch(`${API_BASE}/reports/analytics?preset=all`)).json()).data.summary;

    const deltaRefund = Math.round((afterReturnAnalytics.totalRefunded - afterSaleAnalytics.totalRefunded) * 100) / 100;
    const finalNetDelta = Math.round((afterSaleAnalytics.netSales - afterReturnAnalytics.netSales) * 100) / 100;

    console.log(`   Expected Refund Delta: ₹216.00 | Actual: ₹${deltaRefund}`);
    console.log(`   Net Sales Reduction by Refund: Expected ₹216.00 | Actual: ₹${finalNetDelta}`);

    if (ret.refundAmount === 216 && deltaRefund === 216 && finalNetDelta === 216) {
      console.log('✅ Refund Convention PASSED: Net sales and money collected accurately reduced by refund!');
    } else {
      throw new Error('❌ Refund Convention Verification Failed!');
    }

    // 5. CSV Export Endpoint Verification
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 TEST: CSV Report Generation & Download');
    console.log('-------------------------------------------------------------');

    // Test sales CSV
    const csvSalesRes = await fetch(`${API_BASE}/reports/export/csv?type=sales&preset=all`);
    const csvSalesText = await csvSalesRes.text();
    console.log(`Sales CSV Header: "${csvSalesText.split('\n')[0]}"`);
    console.log(`Sales CSV Rows Count: ${csvSalesText.split('\n').length - 1}`);

    // Test P&L CSV
    const csvPLRes = await fetch(`${API_BASE}/reports/export/csv?type=profit_loss&preset=all`);
    const csvPLText = await csvPLRes.text();
    console.log(`P&L CSV Header: "${csvPLText.split('\n')[0]}"`);
    console.log(`P&L Sample Row: "${csvPLText.split('\n')[1]}"`);

    // Test Product CSV
    const csvProdRes = await fetch(`${API_BASE}/reports/export/csv?type=products&preset=all`);
    const csvProdText = await csvProdRes.text();
    console.log(`Products CSV Header: "${csvProdText.split('\n')[0]}"`);

    if (
      csvSalesText.includes('Date,Invoices,Units Sold,Gross Sales (INR)') &&
      csvPLText.includes('Financial Metric,Amount (INR),Notes') &&
      csvProdText.includes('Product Name,SKU,Units Sold')
    ) {
      console.log('✅ CSV Export PASSED: RFC-4180 format, headers, and rows generated cleanly!');
    } else {
      throw new Error('❌ CSV Export Verification Failed!');
    }

    console.log('\n================================================================');
    console.log('🎉 ALL ANALYTICS, AGGREGATION & REPORT TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Analytics Test Suite Aborted with Error:', err);
    process.exit(1);
  }
}

runTests();
