import React, { useState, useEffect, useMemo } from 'react';
import { inventoryService } from '../services/inventoryService';
import { useToast } from '../context/ToastContext';
import {
  Search,
  AlertTriangle,
  ShieldAlert,
  ShieldX,
  AlertOctagon,
  Clock,
  RefreshCw,
  Lock,
  Package,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export default function ExpiryAlerts() {
  const { addToast } = useToast();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedRange, setSelectedRange] = useState('all');

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getExpiringBatches(selectedRange);
      setBatches(res?.data || []);
    } catch (err) {
      addToast('Failed to load batch expiry alerts from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [selectedRange]);

  // Filtered batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const prodName = b.product?.name || '';
      const sku = b.product?.sku || '';
      const batchNo = b.batchNumber || '';
      const matchSearch =
        prodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batchNo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTier = !selectedTier || b.alertTier === selectedTier;
      return matchSearch && matchTier;
    });
  }, [batches, searchTerm, selectedTier]);

  // Aggregate counts for tier cards
  const tierCounts = useMemo(() => {
    const counts = {
      Expired: 0,
      'Urgent Warning': 0,
      'Red Warning': 0,
      Warning: 0,
      Normal: 0
    };
    batches.forEach((b) => {
      if (counts[b.alertTier] !== undefined) {
        counts[b.alertTier]++;
      }
    });
    return counts;
  }, [batches]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Batch Expiry Alerts</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Shelf-Life Guard
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            FEFO batch monitoring: 4-tier alert system with automated POS sales blocking for expired stock
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* 4 Alert Tiers Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tier 1: Expired (Blocked) */}
        <div
          onClick={() => setSelectedTier(selectedTier === 'Expired' ? '' : 'Expired')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            selectedTier === 'Expired'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Expired (Blocked)
            </span>
            <ShieldX className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-900">{tierCounts.Expired}</div>
          <div className="text-[11px] text-rose-600 mt-0.5 font-medium">Sales strictly blocked in POS</div>
        </div>

        {/* Tier 2: Urgent Warning (1-7 days) */}
        <div
          onClick={() => setSelectedTier(selectedTier === 'Urgent Warning' ? '' : 'Urgent Warning')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            selectedTier === 'Urgent Warning'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5" />
              Urgent (1–7 Days)
            </span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{tierCounts['Urgent Warning']}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Critical clearance needed</div>
        </div>

        {/* Tier 3: Red Warning (8-15 days) */}
        <div
          onClick={() => setSelectedTier(selectedTier === 'Red Warning' ? '' : 'Red Warning')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            selectedTier === 'Red Warning'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Red Warning (8–15 Days)
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{tierCounts['Red Warning']}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Prioritize on shelves</div>
        </div>

        {/* Tier 4: Warning (16-30 days) */}
        <div
          onClick={() => setSelectedTier(selectedTier === 'Warning' ? '' : 'Warning')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            selectedTier === 'Warning'
              ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Warning (16–30 Days)
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{tierCounts.Warning}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Normal FEFO rotation</div>
        </div>
      </div>

      {/* Expiry Safety Notice */}
      <div className="p-3 bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200/80 rounded-xl flex items-center gap-3 text-xs text-rose-900">
        <Lock className="w-5 h-5 text-rose-600 shrink-0" />
        <div className="leading-snug">
          <strong>Shelf-Life Safety Compliance:</strong> Smart Mart Pro automatically blocks sales from any batch where the expiry date is today or in the past. If a cashier attempts to bill an expired batch at the POS counter, the server strictly rejects the transaction.
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="">All Alert Tiers ({batches.length})</option>
            <option value="Expired">Expired (Sales Blocked) ({tierCounts.Expired})</option>
            <option value="Urgent Warning">Urgent Warning (1-7 Days) ({tierCounts['Urgent Warning']})</option>
            <option value="Red Warning">Red Warning (8-15 Days) ({tierCounts['Red Warning']})</option>
            <option value="Warning">Warning (16-30 Days) ({tierCounts.Warning})</option>
            <option value="Normal">Normal (&gt; 30 Days) ({tierCounts.Normal})</option>
          </select>

          <select
            value={selectedRange}
            onChange={(e) => setSelectedRange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Full Store Catalog</option>
            <option value="7">Expiring Within 7 Days</option>
            <option value="15">Expiring Within 15 Days</option>
            <option value="30">Expiring Within 30 Days</option>
            <option value="60">Expiring Within 60 Days</option>
          </select>
        </div>

        <div className="relative w-72 max-w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product, SKU or batch..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Batch No</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Days Remaining</th>
                <th className="py-3 px-4 text-center">Batch Stock</th>
                <th className="py-3 px-4 text-center">Alert Tier</th>
                <th className="py-3 px-4 text-center">POS Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Fetching batches from MongoDB...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No batches match the selected expiry criteria.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{b.product?.name || 'Unnamed Product'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {b.product?.category?.name || 'General'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {b.product?.sku || '---'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      {b.batchNumber}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(b.expiryDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${b.daysColor}`}>
                        {b.daysLeft <= 0 ? `${Math.abs(b.daysLeft)} days ago` : `${b.daysLeft} days`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {b.availableQuantity} {b.product?.unit || 'units'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${b.statusColor}`}>
                        {b.alertTier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {b.isSaleBlocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                          <Lock className="w-3 h-3" />
                          Sales Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Eligible
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
