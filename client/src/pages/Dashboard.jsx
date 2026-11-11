import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import StatCard from '../components/StatCard';
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  Calendar,
  CalendarDays,
  Lock,
  ArrowRight,
  RefreshCw,
  Clock,
  TrendingUp,
  Receipt,
  Layers,
  Banknote,
  QrCode,
  CreditCard
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    today: { sales: 0, invoices: 0, units: 0, refunds: 0 },
    month: { sales: 0, invoices: 0, units: 0, refunds: 0 },
    inventory: {
      totalProducts: 0,
      lowStockCount: 0,
      totalUnits: 0,
      totalValuation: 0,
      blockedBatchesCount: 0,
      urgentBatchesCount: 0,
      warningBatchesCount: 0
    },
    sevenDayTrend: [],
    tenderBreakdown: [],
    topSellingProducts: []
  });

  const [activeChartPoint, setActiveChartPoint] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const res = await reportService.getDashboardMetrics();
      if (res?.data) {
        setMetrics(res.data);
        if (res.data.sevenDayTrend?.length > 0) {
          setActiveChartPoint(res.data.sevenDayTrend[res.data.sevenDayTrend.length - 1]);
        }
      }
    } catch (err) {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute SVG coordinates dynamically from real 7-day trend values
  const chartCoordinates = useMemo(() => {
    const trend = metrics.sevenDayTrend || [];
    if (trend.length === 0) return { pathD: '', areaD: '', points: [], maxY: 1000 };

    const maxSales = Math.max(...trend.map((t) => t.sales), 100);
    const maxY = Math.ceil((maxSales * 1.25) / 100) * 100; // 25% padding headroom

    const width = 500;
    const height = 130;
    const paddingX = 25;
    const baseY = 150;

    const points = trend.map((t, idx) => {
      const x = paddingX + (idx / Math.max(1, trend.length - 1)) * (width - paddingX * 2);
      const y = baseY - (t.sales / maxY) * height;
      return { ...t, x, y };
    });

    // Build smooth cubic bezier curve
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      pathD += ` C ${midX} ${curr.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;

    return { pathD, areaD, points, maxY };
  }, [metrics.sevenDayTrend]);

  return (
    <div className="space-y-4">
      {/* Shelf-Life Safety Banner: Blocked Batches */}
      {metrics.inventory.blockedBatchesCount > 0 && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-900 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <span className="font-bold">Shelf-Life Compliance Alert:</span>{' '}
              {metrics.inventory.blockedBatchesCount} batch(es) have reached or passed expiry and are{' '}
              <strong>strictly blocked from POS billing</strong>.
            </div>
          </div>
          <button
            onClick={() => navigate('/expiry-alerts')}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1 shadow-sm transition-colors"
          >
            <span>Review Blocked Batches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Urgent Expiry Clearance Banner */}
      {metrics.inventory.urgentBatchesCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="font-bold">Urgent Shelf Clearance:</span>{' '}
              {metrics.inventory.urgentBatchesCount} batch(es) expire within <strong>1–7 days</strong>. FEFO priority active at counter.
            </div>
          </div>
          <button
            onClick={() => navigate('/expiry-alerts')}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1 shadow-sm transition-colors"
          >
            <span>View Alerts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Store Dashboard</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live MongoDB Analytics
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time supermarket metrics, inventory valuation, and sales performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Metrics</span>
          </button>

          <button
            onClick={() => navigate('/pos')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Open POS Terminal</span>
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={`₹ ${metrics.today.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={ShoppingCart}
          trendLabel={`${metrics.today.invoices} bills | ${metrics.today.units} units`}
          color="emerald"
        />
        <StatCard
          title="Month-to-Date Revenue"
          value={`₹ ${metrics.month.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trendLabel={`${metrics.month.invoices} completed invoices`}
          color="blue"
        />
        <StatCard
          title="Inventory Valuation"
          value={`₹ ${metrics.inventory.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={Package}
          trendLabel={`${metrics.inventory.totalUnits} units in warehouse`}
          color="purple"
        />
        <StatCard
          title="Stock & Expiry Attention"
          value={metrics.inventory.lowStockCount + metrics.inventory.urgentBatchesCount + metrics.inventory.blockedBatchesCount}
          icon={AlertTriangle}
          trendLabel={`${metrics.inventory.lowStockCount} low stock | ${metrics.inventory.blockedBatchesCount} blocked`}
          color="amber"
        />
      </div>

      {/* Row 2: Live Sales Trend Chart & Tender Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Real 7-Day Sales Trend Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Sales Trend (Last 7 Days)</h3>
              <p className="text-[11px] text-slate-400">Aggregated daily sales computed via MongoDB pipeline</p>
            </div>
            {activeChartPoint && (
              <div className="text-right">
                <div className="text-[11px] text-slate-400">{activeChartPoint.label}</div>
                <div className="text-sm font-black text-blue-600">
                  ₹ {activeChartPoint.sales.toFixed(2)} ({activeChartPoint.invoices} bills)
                </div>
              </div>
            )}
          </div>

          <div className="relative w-full h-52">
            <svg viewBox="0 0 520 170" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="liveSalesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="20" y1="70" x2="500" y2="70" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="20" y1="110" x2="500" y2="110" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="20" y1="150" x2="500" y2="150" stroke="#e2e8f0" strokeWidth="1" />

              {/* Y Axis Max Label */}
              <text x="5" y="34" className="text-[9px] fill-slate-400 font-sans">
                ₹{chartCoordinates.maxY >= 1000 ? `${(chartCoordinates.maxY / 1000).toFixed(1)}k` : chartCoordinates.maxY}
              </text>
              <text x="5" y="94" className="text-[9px] fill-slate-400 font-sans">
                ₹{chartCoordinates.maxY >= 2000 ? `${(chartCoordinates.maxY / 2000).toFixed(1)}k` : ''}
              </text>
              <text x="12" y="154" className="text-[9px] fill-slate-400 font-sans">0</text>

              {/* Area Fill */}
              {chartCoordinates.areaD && (
                <path d={chartCoordinates.areaD} fill="url(#liveSalesGrad)" />
              )}

              {/* Line Stroke */}
              {chartCoordinates.pathD && (
                <path
                  d={chartCoordinates.pathD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Point Markers */}
              {chartCoordinates.points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={activeChartPoint?.date === p.date ? 5.5 : 4}
                    className="fill-white stroke-blue-600 cursor-pointer transition-all"
                    strokeWidth="2.5"
                    onMouseEnter={() => setActiveChartPoint(p)}
                  />
                  <text
                    x={p.x}
                    y="166"
                    className="text-[9px] fill-slate-400 font-sans"
                    textAnchor="middle"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Counter Tender Mix */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Counter Tender Mix</h3>
            <p className="text-xs text-slate-500">Live payment method distribution for this month</p>

            <div className="space-y-3 pt-3">
              {metrics.tenderBreakdown.map((t) => (
                <div key={t.mode}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-700">
                      {t.mode === 'UPI' ? (
                        <QrCode className="w-3.5 h-3.5 text-purple-600" />
                      ) : t.mode === 'Cash' ? (
                        <Banknote className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>{t.mode}</span>
                    </span>
                    <span className="text-slate-900 font-bold">
                      ₹ {t.amount.toFixed(2)} ({t.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        t.mode === 'UPI'
                          ? 'bg-purple-600'
                          : t.mode === 'Cash'
                          ? 'bg-blue-600'
                          : 'bg-amber-600'
                      }`}
                      style={{ width: `${t.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/reports')}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Open Detailed Financial Analytics</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Row 3: Top Selling Products & Inventory Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Selling Products */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-sm">Best Selling Products</h3>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View Analytics
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.topSellingProducts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-400">
                      No sales recorded this month yet.
                    </td>
                  </tr>
                ) : (
                  metrics.topSellingProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{p.sku}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {p.unitsSold} units
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        ₹ {p.revenue?.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Inventory Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Warehouse Stock Summary</h3>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Manage Inventory
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 text-[11px]">Total Active SKUs</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {metrics.inventory.totalProducts}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 text-[11px]">Total Stock Units</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {metrics.inventory.totalUnits}
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-emerald-700 text-[11px] font-medium">Stock Asset Valuation</span>
              <div className="text-xl font-black text-emerald-900 mt-0.5">
                ₹ {metrics.inventory.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-rose-700 text-[11px] font-medium">Shelf Expiry Watchlist</span>
              <div className="text-xl font-black text-rose-900 mt-0.5">
                {metrics.inventory.blockedBatchesCount + metrics.inventory.urgentBatchesCount} batches
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
