import mongoose from 'mongoose';
import { Sale } from '../models/Sale.js';
import { SaleReturn } from '../models/SaleReturn.js';
import { Product } from '../models/Product.js';
import { Batch } from '../models/Batch.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/ApiError.js';

export class ReportService {
  /**
   * Helper: Resolve start and end dates from preset or custom ISO strings
   */
  resolveDateRange({ preset = 'this_month', startDate, endDate } = {}) {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;

      case 'this_week':
        const dayOfWeek = now.getDay();
        const diffToMonday = (dayOfWeek + 6) % 7; // Monday as day 0
        start.setDate(now.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;

      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'all':
        start = new Date(2020, 0, 1, 0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;

      case 'custom':
      default:
        if (startDate) {
          start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        }
        if (endDate) {
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        } else {
          end.setHours(23, 59, 59, 999);
        }
        break;
    }

    return { start, end, preset };
  }

  /**
   * 1. Dashboard Overview Metrics
   * Single high-performance call that combines today's sales, month-to-date sales,
   * live inventory valuation, and expiry alerts.
   */
  async getDashboardMetrics() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Pipeline A: Today's Summary
    const todayAgg = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart, $lte: todayEnd },
          status: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          todaySales: { $sum: '$totalAmount' },
          todayInvoices: { $sum: 1 },
          todayUnits: { $sum: '$itemsCount' },
          todayRefunds: { $sum: '$totalRefunded' },
          todayCOGS: { $sum: '$cogs' }
        }
      }
    ]);

    // Pipeline B: Month-to-Date Summary
    const monthAgg = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart, $lte: monthEnd },
          status: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          monthSales: { $sum: '$totalAmount' },
          monthInvoices: { $sum: 1 },
          monthUnits: { $sum: '$itemsCount' },
          monthRefunds: { $sum: '$totalRefunded' },
          monthCOGS: { $sum: '$cogs' }
        }
      }
    ]);

    // Pipeline C: Last 7 Days Daily Trend for SVG Chart
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trendAgg = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo, $lte: todayEnd },
          status: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          invoices: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill missing days in 7-day trend
    const sevenDayTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const dateLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const found = trendAgg.find((t) => t._id === dateKey);
      sevenDayTrend.push({
        date: dateKey,
        label: dateLabel,
        sales: found ? Math.round(found.totalSales * 100) / 100 : 0,
        invoices: found ? found.invoices : 0
      });
    }

    // Pipeline D: Inventory Batches & Valuation Summary
    const batchAgg = await Batch.aggregate([
      {
        $group: {
          _id: null,
          totalUnits: { $sum: '$availableQuantity' },
          totalValuation: {
            $sum: { $multiply: ['$availableQuantity', '$purchasePrice'] }
          },
          blockedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Expired'] }, 1, 0] }
          },
          urgentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Urgent'] }, 1, 0] }
          },
          warningCount: {
            $sum: { $cond: [{ $in: ['$status', ['Warning', 'Red Warning']] }, 1, 0] }
          }
        }
      }
    ]);

    // Pipeline E: Product Catalog Counts
    const totalProducts = await Product.countDocuments({ isArchived: { $ne: true } });
    const lowStockCount = await Product.countDocuments({
      isArchived: { $ne: true },
      status: 'Low Stock'
    });

    // Pipeline F: Payment Method Tender Distribution (Month to Date)
    const tenderAgg = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart, $lte: monthEnd },
          status: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const tenderMap = { Cash: 0, UPI: 0, Card: 0 };
    let totalTender = 0;
    tenderAgg.forEach((t) => {
      if (tenderMap[t._id] !== undefined) {
        tenderMap[t._id] = t.amount;
        totalTender += t.amount;
      }
    });

    const tenderBreakdown = Object.keys(tenderMap).map((mode) => ({
      mode,
      amount: Math.round(tenderMap[mode] * 100) / 100,
      percent: totalTender > 0 ? Math.round((tenderMap[mode] / totalTender) * 100) : 0
    }));

    // Pipeline G: Top 5 Best-Selling Products (Month to Date)
    const topProductsAgg = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart, $lte: monthEnd },
          status: { $ne: 'Cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.itemTotal' }
        }
      },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 }
    ]);

    const t = todayAgg[0] || {};
    const m = monthAgg[0] || {};
    const b = batchAgg[0] || {};

    return {
      today: {
        sales: Math.round((t.todaySales || 0) * 100) / 100,
        invoices: t.todayInvoices || 0,
        units: t.todayUnits || 0,
        refunds: Math.round((t.todayRefunds || 0) * 100) / 100
      },
      month: {
        sales: Math.round((m.monthSales || 0) * 100) / 100,
        invoices: m.monthInvoices || 0,
        units: m.monthUnits || 0,
        refunds: Math.round((m.monthRefunds || 0) * 100) / 100
      },
      inventory: {
        totalProducts,
        lowStockCount,
        totalUnits: b.totalUnits || 0,
        totalValuation: Math.round((b.totalValuation || 0) * 100) / 100,
        blockedBatchesCount: b.blockedCount || 0,
        urgentBatchesCount: b.urgentCount || 0,
        warningBatchesCount: b.warningCount || 0
      },
      sevenDayTrend,
      tenderBreakdown,
      topSellingProducts: topProductsAgg
    };
  }

  /**
   * 2. Comprehensive Reports & Analytics
   * Executes multi-stage MongoDB aggregation pipelines filtered by date range.
   * Produces financial metrics, daily trend histograms, top-selling products,
   * category performance, and tender summaries.
   */
  async getDetailedAnalytics(query = {}) {
    const { start, end, preset } = this.resolveDateRange(query);

    const matchStage = {
      $match: {
        createdAt: { $gte: start, $lte: end },
        status: { $ne: 'Cancelled' }
      }
    };

    // Multi-faceted Aggregation Pipeline for O(1) database roundtrip
    const [results] = await Sale.aggregate([
      matchStage,
      {
        $facet: {
          // 1. KPI Financial Summary
          kpi: [
            {
              $group: {
                _id: null,
                grossSales: { $sum: '$subtotal' },
                discountAmount: { $sum: '$discountAmount' },
                taxAmount: { $sum: '$taxAmount' },
                totalAmount: { $sum: '$totalAmount' },
                totalRefunded: { $sum: '$totalRefunded' },
                totalInvoices: { $sum: 1 },
                totalUnits: { $sum: '$itemsCount' },
                totalCOGS: { $sum: '$cogs' }
              }
            }
          ],

          // 2. Daily Sales Trend
          dailyTrend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                grossSales: { $sum: '$subtotal' },
                totalSales: { $sum: '$totalAmount' },
                discountAmount: { $sum: '$discountAmount' },
                refundAmount: { $sum: '$totalRefunded' },
                cogs: { $sum: '$cogs' },
                invoices: { $sum: 1 },
                units: { $sum: '$itemsCount' }
              }
            },
            { $sort: { _id: 1 } }
          ],

          // 3. Top Selling Products
          topProducts: [
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.product',
                name: { $first: '$items.name' },
                sku: { $first: '$items.sku' },
                unitsSold: { $sum: '$items.quantity' },
                grossRevenue: { $sum: '$items.itemTotal' },
                totalCost: { $sum: '$items.itemCost' }
              }
            },
            {
              $addFields: {
                grossProfit: { $subtract: ['$grossRevenue', '$totalCost'] },
                marginPercent: {
                  $cond: [
                    { $gt: ['$grossRevenue', 0] },
                    {
                      $multiply: [
                        { $divide: [{ $subtract: ['$grossRevenue', '$totalCost'] }, '$grossRevenue'] },
                        100
                      ]
                    },
                    0
                  ]
                }
              }
            },
            { $sort: { unitsSold: -1 } },
            { $limit: 10 }
          ],

          // 4. Payment Tender Mix
          paymentTenders: [
            {
              $group: {
                _id: '$paymentMethod',
                amount: { $sum: '$totalAmount' },
                invoicesCount: { $sum: 1 }
              }
            },
            { $sort: { amount: -1 } }
          ]
        }
      }
    ]);

    // Category Performance Aggregation
    const categoryPerformance = await Sale.aggregate([
      matchStage,
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDoc'
        }
      },
      { $unwind: '$productDoc' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productDoc.category',
          foreignField: '_id',
          as: 'categoryDoc'
        }
      },
      { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$categoryDoc.name', 'General FMCG'] },
          color: { $first: '$categoryDoc.color' },
          totalRevenue: { $sum: '$items.itemTotal' },
          unitsSold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    const kpiRaw = results.kpi[0] || {};
    const grossSales = Math.round((kpiRaw.grossSales || 0) * 100) / 100;
    const discountAmount = Math.round((kpiRaw.discountAmount || 0) * 100) / 100;
    const totalRefunded = Math.round((kpiRaw.totalRefunded || 0) * 100) / 100;
    const taxAmount = Math.round((kpiRaw.taxAmount || 0) * 100) / 100;
    const totalAmount = Math.round((kpiRaw.totalAmount || 0) * 100) / 100;
    const totalCOGS = Math.round((kpiRaw.totalCOGS || 0) * 100) / 100;
    const totalInvoices = kpiRaw.totalInvoices || 0;
    const totalUnits = kpiRaw.totalUnits || 0;

    // Financial formulas
    // Net Sales (excl. Tax) = Gross Sales - Discounts - Refunds
    const netSales = Math.round(Math.max(0, grossSales - discountAmount - totalRefunded) * 100) / 100;
    // Total Money Collected = (Gross Sales - Discounts + Taxes) - Refunds
    const totalMoneyCollected = Math.round(Math.max(0, totalAmount - totalRefunded) * 100) / 100;
    // Gross Profit = Net Sales - COGS
    const grossProfit = Math.round((netSales - totalCOGS) * 100) / 100;
    // Profit Margin % = (Gross Profit / Net Sales) * 100
    const profitMargin = netSales > 0 ? Math.round(((grossProfit / netSales) * 100) * 10) / 10 : 0;
    // Average Order Value = Net Sales / Invoices
    const averageOrderValue = totalInvoices > 0 ? Math.round((netSales / totalInvoices) * 100) / 100 : 0;

    // Format Daily Trend with Net Sales and Profit
    const dailyTrendFormatted = results.dailyTrend.map((d) => {
      const dayGross = d.grossSales || 0;
      const dayDisc = d.discountAmount || 0;
      const dayRef = d.refundAmount || 0;
      const dayNet = Math.max(0, dayGross - dayDisc - dayRef);
      const dayProfit = dayNet - (d.cogs || 0);

      return {
        date: d._id,
        grossSales: Math.round(dayGross * 100) / 100,
        netSales: Math.round(dayNet * 100) / 100,
        totalSales: Math.round(d.totalSales * 100) / 100,
        discounts: Math.round(dayDisc * 100) / 100,
        refunds: Math.round(dayRef * 100) / 100,
        cogs: Math.round((d.cogs || 0) * 100) / 100,
        grossProfit: Math.round(dayProfit * 100) / 100,
        invoices: d.invoices,
        units: d.units
      };
    });

    return {
      dateRange: {
        preset,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        formattedLabel: `${start.toLocaleDateString('en-GB')} - ${end.toLocaleDateString('en-GB')}`
      },
      summary: {
        grossSales,
        discountAmount,
        netSales,
        taxAmount,
        totalRefunded,
        totalMoneyCollected,
        cogs: totalCOGS,
        grossProfit,
        profitMargin,
        totalInvoices,
        totalUnits,
        averageOrderValue
      },
      dailyTrend: dailyTrendFormatted,
      topProducts: results.topProducts.map((p) => ({
        ...p,
        grossRevenue: Math.round(p.grossRevenue * 100) / 100,
        totalCost: Math.round(p.totalCost * 100) / 100,
        grossProfit: Math.round(p.grossProfit * 100) / 100,
        marginPercent: Math.round(p.marginPercent * 10) / 10
      })),
      categoryPerformance: categoryPerformance.map((c) => ({
        category: c._id,
        color: c.color || '#3b82f6',
        totalRevenue: Math.round(c.totalRevenue * 100) / 100,
        unitsSold: c.unitsSold
      })),
      paymentTenders: results.paymentTenders.map((t) => ({
        method: t._id,
        amount: Math.round(t.amount * 100) / 100,
        invoicesCount: t.invoicesCount,
        percent: totalAmount > 0 ? Math.round((t.amount / totalAmount) * 100) : 0
      }))
    };
  }

  /**
   * 3. Export Reports to CSV
   */
  async generateCSVReport(type = 'sales', query = {}) {
    const analytics = await this.getDetailedAnalytics(query);

    let csvContent = '';

    if (type === 'products') {
      // Product Performance CSV
      csvContent = 'Product Name,SKU,Units Sold,Gross Revenue (INR),COGS (INR),Gross Profit (INR),Margin (%)\n';
      analytics.topProducts.forEach((p) => {
        csvContent += `"${p.name.replace(/"/g, '""')}",${p.sku},${p.unitsSold},${p.grossRevenue},${p.totalCost},${p.grossProfit},${p.marginPercent}%\n`;
      });
    } else if (type === 'profit_loss') {
      // P&L CSV
      csvContent = 'Financial Metric,Amount (INR),Notes\n';
      csvContent += `Gross Sales,${analytics.summary.grossSales},Sum of all sold line item totals\n`;
      csvContent += `Discounts,${analytics.summary.discountAmount},Promotional and bill discounts applied\n`;
      csvContent += `Refunds,${analytics.summary.totalRefunded},Total customer refunds and credit notes issued\n`;
      csvContent += `Net Sales Revenue,${analytics.summary.netSales},Recognized merchandise revenue (excl. GST)\n`;
      csvContent += `Cost of Goods Sold (COGS),${analytics.summary.cogs},Authoritative wholesale purchase cost of depleted batches\n`;
      csvContent += `Gross Profit,${analytics.summary.grossProfit},Net Sales minus COGS\n`;
      csvContent += `Gross Profit Margin,${analytics.summary.profitMargin}%,Percentage of net revenue retained as profit\n`;
      csvContent += `GST Taxes Collected (5%),${analytics.summary.taxAmount},Tax collected on behalf of government\n`;
      csvContent += `Total Money Collected,${analytics.summary.totalMoneyCollected},Actual cashflow received across Cash/UPI/Card\n`;
    } else {
      // Daily Sales Breakdown CSV
      csvContent = 'Date,Invoices,Units Sold,Gross Sales (INR),Discounts (INR),Refunds (INR),Net Sales (INR),COGS (INR),Gross Profit (INR)\n';
      analytics.dailyTrend.forEach((d) => {
        csvContent += `${d.date},${d.invoices},${d.units},${d.grossSales},${d.discounts},${d.refunds},${d.netSales},${d.cogs},${d.grossProfit}\n`;
      });
    }

    return {
      fileName: `SmartMartPro_${type}_Report_${new Date().toISOString().slice(0, 10)}.csv`,
      csvContent
    };
  }
}

export const reportService = new ReportService();
