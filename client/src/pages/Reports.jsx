import React, { useState, useEffect, useMemo } from 'react';
import { reportService } from '../services/reportService';
import { useToast } from '../context/ToastContext';
import {
  CalendarDays,
  ChevronDown,
  Download,
  RefreshCw,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Percent,
  Banknote,
  Layers,
  ArrowUpRight,
  PieChart,
  FileSpreadsheet
} from 'lucide-react';

export default function Reports() {
  const { addToast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState('this_month');
  const [loading, setLoading] = useState(true);
  const [hoveredBar, setHoveredBar] = useState(null);

  // Analytics data state
  const [analytics, setAnalytics] = useState({
    dateRange: { formattedLabel: 'Loading...' },
    summary: {
      grossSales: 0,
      discountAmount: 0,
      netSales: 0,
      taxAmount: 0,
      totalRefunded: 0,
      totalMoneyCollected: 0,
      cogs: 0,
      grossProfit: 0,
      profitMargin: 0,
      totalInvoices: 0,
      totalUnits: 0,
      averageOrderValue: 0
    },
    dailyTrend: [],
    topProducts: [],
    categoryPerformance: [],
    paymentTenders: []
  });

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await reportService.getAnalytics({ preset: selectedPreset });
      if (res?.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      addToast('Failed to generate report from MongoDB', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedPreset]);

  // Handle CSV Download
  const handleExportCSV = async (type) => {
    try {
      await reportService.downloadCSV(type, { preset: selectedPreset });
      addToast(`Exported ${type.toUpperCase()} report as CSV`, 'success');
    } catch (err) {
      addToast('Failed to export CSV report', 'error');
    }
  };

  // Compute maximum daily sales for bar chart scaling
  const chartMaxVal = useMemo(() => {
    const trend = analytics.dailyTrend || [];
    if (trend.length === 0) return 1000;
    const maxVal = Math.max(...trend.map((d) => d.totalSales), 100);
    return Math.ceil((maxVal * 1.2) / 100) * 100;
  }, [analytics.dailyTrend]);

  const summary = analytics.summary;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Financial & Sales Reports</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              MongoDB Aggregation
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            P&L analysis, cost of goods sold (COGS), profit margins and audit reports for{' '}
            <strong>{analytics.dateRange.formattedLabel}</strong>
          </p>
        </div>

        {/* Date Presets & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-800 font-semibold cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <button
            onClick={loadReport}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* CSV Export Dropdown / Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExportCSV('sales')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              title="Download Sales Breakdown CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sales CSV</span>
            </button>

            <button
              onClick={() => handleExportCSV('profit_loss')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              title="Download P&L Summary CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>P&L CSV</span>
            </button>

            <button
              onClick={() => handleExportCSV('products')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              title="Download Products CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Products CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8 Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Sales */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Gross Sales (Subtotal)</span>
            <ShoppingCart className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            ₹ {summary.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sum of sold line items</div>
        </div>

        {/* Card 2: Net Sales Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Net Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            ₹ {summary.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Excl. discounts & refunds</div>
        </div>

        {/* Card 3: Cost of Goods Sold (COGS) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Cost of Goods Sold (COGS)</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            ₹ {summary.cogs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Authoritative batch cost</div>
        </div>

        {/* Card 4: Gross Profit & Margin */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Gross Profit</span>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {summary.profitMargin}% Margin
            </span>
          </div>
          <div className="text-xl font-black text-emerald-600">
            ₹ {summary.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Net Sales minus COGS</div>
        </div>

        {/* Card 5: Discounts Applied */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Discounts Conceded</span>
          <div className="text-xl font-bold text-rose-600 mt-1">
            - ₹ {summary.discountAmount.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bill promotional discounts</div>
        </div>

        {/* Card 6: Customer Refunds */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Customer Refunds</span>
          <div className="text-xl font-bold text-amber-600 mt-1">
            ₹ {summary.totalRefunded.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Returned merchandise</div>
        </div>

        {/* Card 7: Total Invoices & Units */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Invoices & Units Sold</span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {summary.totalInvoices} Bills / {summary.totalUnits} Units
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Avg Order: ₹{summary.averageOrderValue.toFixed(2)}
          </div>
        </div>

        {/* Card 8: Total Money Collected */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Money Collected</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            ₹ {summary.totalMoneyCollected.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Historical taxes, if applicable: ₹{summary.taxAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Daily Sales Bar Histogram Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Daily Sales Breakdown</h3>
            <p className="text-xs text-slate-500">
              Histogram of daily sales volume computed across the selected date range
            </p>
          </div>
          {hoveredBar && (
            <div className="text-right text-xs">
              <span className="text-slate-400">{hoveredBar.date}:</span>{' '}
              <strong className="text-blue-600">
                ₹{hoveredBar.totalSales.toFixed(2)} ({hoveredBar.invoices} bills, {hoveredBar.units} units)
              </strong>
            </div>
          )}
        </div>

        {analytics.dailyTrend.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No transaction records found for this period.
          </div>
        ) : (
          <div className="relative w-full h-64">
            <svg viewBox="0 0 680 180" className="w-full h-full overflow-visible">
              {/* Grid Horizontal Lines */}
              <line x1="30" y1="20" x2="660" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="55" x2="660" y2="55" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="90" x2="660" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="125" x2="660" y2="125" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="160" x2="660" y2="160" stroke="#e2e8f0" strokeWidth="1" />

              {/* Y Axis text */}
              <text x="0" y="24" className="text-[9px] fill-slate-400 font-sans">
                ₹{chartMaxVal >= 1000 ? `${(chartMaxVal / 1000).toFixed(1)}k` : chartMaxVal}
              </text>
              <text x="0" y="94" className="text-[9px] fill-slate-400 font-sans">
                ₹{chartMaxVal >= 2000 ? `${(chartMaxVal / 2000).toFixed(1)}k` : ''}
              </text>
              <text x="12" y="164" className="text-[9px] fill-slate-400 font-sans">0</text>

              {/* Dynamic Histogram Bars */}
              {analytics.dailyTrend.map((d, idx) => {
                const totalBars = analytics.dailyTrend.length;
                const availableWidth = 620;
                const barSlot = availableWidth / Math.max(1, totalBars);
                const barWidth = Math.min(22, Math.max(8, barSlot * 0.7));
                const xPos = 40 + idx * barSlot + (barSlot - barWidth) / 2;

                const barHeight = Math.min(140, Math.max(3, (d.totalSales / chartMaxVal) * 140));
                const yPos = 160 - barHeight;
                const isHovered = hoveredBar?.date === d.date;

                return (
                  <g key={d.date}>
                    <rect
                      x={xPos}
                      y={yPos}
                      width={barWidth}
                      height={barHeight}
                      rx="3"
                      className={`transition-all duration-150 cursor-pointer ${
                        isHovered ? 'fill-blue-700' : 'fill-blue-500'
                      }`}
                      onMouseEnter={() => setHoveredBar(d)}
                      onMouseLeave={() => setHoveredBar(null)}
                    />
                  </g>
                );
              })}

              {/* X Axis First and Last Labels */}
              <text x="45" y="176" className="text-[9px] fill-slate-400 font-sans" textAnchor="middle">
                {analytics.dailyTrend[0]?.date}
              </text>
              <text x="640" y="176" className="text-[9px] fill-slate-400 font-sans" textAnchor="middle">
                {analytics.dailyTrend[analytics.dailyTrend.length - 1]?.date}
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* Row 3: Product Performance & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top 10 Best-Selling Products Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Product Profitability Breakdown</h3>
              <p className="text-xs text-slate-500">Gross revenue, batch cost and profit margin per product</p>
            </div>
            <button
              onClick={() => handleExportCSV('products')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              <span>Download CSV</span>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto min-h-[260px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 font-mono">SKU</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Gross Revenue</th>
                  <th className="py-2.5 px-3 text-right">COGS Cost</th>
                  <th className="py-2.5 px-3 text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 text-center">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No product sales in this period.
                    </td>
                  </tr>
                ) : (
                  analytics.topProducts.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{p.sku}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {p.unitsSold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                        ₹ {p.grossRevenue.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">
                        ₹ {p.totalCost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                        ₹ {p.grossProfit.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {p.marginPercent}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Performance & Tender Mix */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Category Performance</h3>
            <p className="text-xs text-slate-500">Revenue contribution by merchandise category</p>

            <div className="space-y-3 pt-3">
              {analytics.categoryPerformance.map((c) => (
                <div key={c.category} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-800">{c.category}</span>
                    <span className="text-slate-900 font-bold">₹ {c.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{c.unitsSold} units sold</span>
                    <span>
                      {summary.grossSales > 0
                        ? `${Math.round((c.totalRevenue / summary.grossSales) * 100)}% of sales`
                        : '0%'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{
                        width: `${summary.grossSales > 0 ? (c.totalRevenue / summary.grossSales) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-xs mb-2">Tender Collection Breakdown</h4>
            <div className="space-y-2">
              {analytics.paymentTenders.map((t) => (
                <div key={t.method} className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-700">{t.method}</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₹ {t.amount.toFixed(2)} ({t.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
