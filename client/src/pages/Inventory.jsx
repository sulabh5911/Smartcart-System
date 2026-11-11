import React, { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../services/inventoryService';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { FormField, Input, Select, Button, Textarea } from '../components/Form';
import {
  Search,
  PackagePlus,
  SlidersHorizontal,
  History,
  AlertTriangle,
  TrendingUp,
  Boxes,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';

export default function Inventory() {
  const { addToast } = useToast();

  // Active Tab: 'batches' | 'movements'
  const [activeTab, setActiveTab] = useState('batches');

  // Summary Metrics State
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalUnits: 0,
    totalValuation: 0,
    lowStockCount: 0,
    urgentBatchesCount: 0
  });

  // Batches State
  const [batches, setBatches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, totalPages: 1 });

  // Movements Audit State
  const [movements, setMovements] = useState([]);
  const [movementsPagination, setMovementsPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [movementFilterType, setMovementFilterType] = useState('');

  // 1. Stock Receiving Modal State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    productId: '',
    batchNumber: '',
    purchasePrice: '',
    quantity: '',
    mfgDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    reference: '',
    reason: 'Purchase order inward receipt',
    performedBy: 'Store Manager'
  });
  const [receiveErrors, setReceiveErrors] = useState({});
  const [isReceivingSubmitting, setIsReceivingSubmitting] = useState(false);

  // 2. Stock Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    adjustmentType: 'SUBTRACT',
    quantity: '',
    reason: 'Damaged packaging during shelf stocking',
    reference: '',
    performedBy: 'Store Supervisor'
  });
  const [adjustErrors, setAdjustErrors] = useState({});
  const [isAdjustSubmitting, setIsAdjustSubmitting] = useState(false);

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await inventoryService.getSummary();
      setSummary(res.data || {});
    } catch (err) {
      console.error('Error fetching inventory summary:', err);
    }
  }, []);

  // Fetch Categories & Products for Dropdowns
  const fetchDropdownData = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        categoryService.getAll(),
        productService.getAll({ limit: 100 })
      ]);
      setCategories(catRes.data || []);
      setProductsList(prodRes.data || []);
      if (!receiveForm.productId && prodRes.data?.length > 0) {
        setReceiveForm((prev) => ({ ...prev, productId: prodRes.data[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching dropdown references:', err);
    }
  }, [receiveForm.productId]);

  // Fetch Batches
  const fetchBatches = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const res = await inventoryService.getBatches({
          page,
          limit: 8,
          search: searchTerm,
          category: selectedCategory,
          status: selectedStatus,
          sortBy: 'expiryDate',
          sortOrder: 'asc'
        });
        setBatches(res.data || []);
        if (res.meta) setPagination(res.meta);
      } catch (err) {
        setError(err.message || 'Failed to connect to Express backend.');
        addToast(err.message || 'Cannot load inventory batches', 'error');
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, selectedCategory, selectedStatus, addToast]
  );

  // Fetch Movements Audit Log
  const fetchMovements = useCallback(
    async (page = 1) => {
      setMovementsLoading(true);
      try {
        const res = await inventoryService.getMovements({
          page,
          limit: 10,
          movementType: movementFilterType
        });
        setMovements(res.data || []);
        if (res.meta) setMovementsPagination(res.meta);
      } catch (err) {
        console.error('Error fetching stock movements:', err);
      } finally {
        setMovementsLoading(false);
      }
    },
    [movementFilterType]
  );

  useEffect(() => {
    fetchSummary();
    fetchDropdownData();
  }, [fetchSummary, fetchDropdownData]);

  useEffect(() => {
    if (activeTab === 'batches') {
      fetchBatches(1);
    } else {
      fetchMovements(1);
    }
  }, [activeTab, fetchBatches, fetchMovements]);

  // Handle Receive Stock Submission
  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!receiveForm.productId) errs.productId = 'Product selection is required';
    if (!receiveForm.batchNumber.trim()) errs.batchNumber = 'Batch number is required';
    const price = parseFloat(receiveForm.purchasePrice);
    if (isNaN(price) || price < 0) errs.purchasePrice = 'Valid cost price required';
    const qty = parseInt(receiveForm.quantity, 10);
    if (isNaN(qty) || qty <= 0) errs.quantity = 'Quantity must be > 0';
    if (!receiveForm.expiryDate) errs.expiryDate = 'Expiry date is required';

    if (Object.keys(errs).length > 0) {
      setReceiveErrors(errs);
      return;
    }

    setIsReceivingSubmitting(true);
    try {
      const res = await inventoryService.receiveStock({
        productId: receiveForm.productId,
        batchNumber: receiveForm.batchNumber.trim().toUpperCase(),
        purchasePrice: price,
        quantity: qty,
        mfgDate: receiveForm.mfgDate,
        expiryDate: receiveForm.expiryDate,
        reference: receiveForm.reference.trim() || 'PO-MANUAL',
        reason: receiveForm.reason.trim(),
        performedBy: receiveForm.performedBy.trim()
      });

      addToast(res.message || 'Stock received and logged to audit trail!', 'success');
      setIsReceiveModalOpen(false);
      setReceiveForm({
        productId: productsList[0]?._id || '',
        batchNumber: '',
        purchasePrice: '',
        quantity: '',
        mfgDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        reference: '',
        reason: 'Purchase order inward receipt',
        performedBy: 'Store Manager'
      });
      setReceiveErrors({});
      // Refresh inventory batches and summary metrics
      await Promise.all([fetchBatches(pagination.page), fetchSummary()]);
    } catch (err) {
      addToast(err.message || 'Error receiving stock', 'error');
    } finally {
      setIsReceivingSubmitting(false);
    }
  };

  // Open Adjustment Modal
  const openAdjust = (batch) => {
    setSelectedBatch(batch);
    setAdjustForm({
      adjustmentType: 'SUBTRACT',
      quantity: '',
      reason: 'Damaged packaging during shelf stocking',
      reference: '',
      performedBy: 'Store Supervisor'
    });
    setAdjustErrors({});
    setIsAdjustModalOpen(true);
  };

  // Handle Adjustment Submission
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    const qty = parseInt(adjustForm.quantity, 10);
    if (isNaN(qty) || qty < 0) errs.quantity = 'Valid quantity is required';
    if (!adjustForm.reason.trim() || adjustForm.reason.trim().length < 3) {
      errs.reason = 'Audit reason is mandatory (min 3 chars)';
    }

    // Client-side negative stock validation preview
    if (selectedBatch && adjustForm.adjustmentType === 'SUBTRACT') {
      if (selectedBatch.availableQuantity - qty < 0) {
        errs.quantity = `Cannot reduce ${qty} units. Only ${selectedBatch.availableQuantity} available!`;
      }
    }

    if (Object.keys(errs).length > 0) {
      setAdjustErrors(errs);
      return;
    }

    setIsAdjustSubmitting(true);
    try {
      const res = await inventoryService.adjustStock({
        batchId: selectedBatch._id,
        adjustmentType: adjustForm.adjustmentType,
        quantity: qty,
        reason: adjustForm.reason.trim(),
        reference: adjustForm.reference.trim() || 'ADJ-MANUAL',
        performedBy: adjustForm.performedBy.trim()
      });

      addToast(res.message || 'Stock adjustment recorded with audit log!', 'success');
      setIsAdjustModalOpen(false);
      setSelectedBatch(null);
      setAdjustErrors({});
      await Promise.all([fetchBatches(pagination.page), fetchSummary()]);
    } catch (err) {
      addToast(err.message || 'Error adjusting stock', 'error');
      if (err.message && err.message.includes('Insufficient stock')) {
        setAdjustErrors({ quantity: err.message });
      }
    } finally {
      setIsAdjustSubmitting(false);
    }
  };

  // Switch to movements tab and filter by product
  const viewAuditHistory = (batch) => {
    setActiveTab('movements');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Inventory & Batches</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              MongoDB Authoritative
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Shelf-life batch management, inward goods receipt, stock valuation and audit trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchSummary();
              if (activeTab === 'batches') fetchBatches(pagination.page);
              else fetchMovements(movementsPagination.page);
            }}
            disabled={loading || movementsLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            title="Refresh from MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || movementsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-receive-stock"
            onClick={() => setIsReceiveModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Receive Inward Stock</span>
          </button>
        </div>
      </div>

      {/* Backend Offline / Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <strong className="font-bold">Backend Connection Error:</strong> {error}
              <div className="text-[11px] text-slate-500 mt-0.5">
                Ensure Express backend server is running on port 5000: <code>cd server && npm run dev</code>
              </div>
            </div>
          </div>
          <button
            onClick={() => fetchBatches(1)}
            className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] font-semibold hover:bg-rose-700 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary KPI Cards Grid (Calculated via MongoDB Aggregation Pipeline) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Catalog Items</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{summary.totalProducts}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Active Products in Store</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total In Stock</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{summary.totalUnits.toLocaleString()}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Physical Units Across Batches</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Stock Valuation</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              ₹ {summary.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sum of (Qty × Cost Price)</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Urgent / Expired</div>
            <div className="text-xl font-bold text-rose-600 mt-0.5">{summary.urgentBatchesCount}</div>
            <div className="text-[10px] text-rose-500 mt-0.5">Expiring ≤ 30 days or past date</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('batches')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'batches'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Batches & Stock</span>
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'movements'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Movement Trail</span>
        </button>
      </div>

      {/* TAB 1: BATCHES VIEW */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name, SKU or batch number..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Categories ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Expiry Status</option>
                <option value="Normal">Normal (&gt; 30 days)</option>
                <option value="Warning">Warning (≤ 30 days)</option>
                <option value="Urgent">Urgent (≤ 7 days)</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Batches Table Card */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto min-h-[380px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3">Batch No</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">MFG Date</th>
                    <th className="py-3 px-3">Expiry Date</th>
                    <th className="py-3 px-3 text-right">Cost Price (₹)</th>
                    <th className="py-3 px-3 text-center">Available Stock</th>
                    <th className="py-3 px-3 text-right">Valuation (₹)</th>
                    <th className="py-3 px-3 text-center">Expiry Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Loading Skeleton */}
                  {loading && (
                    <>
                      {[...Array(6)].map((_, i) => (
                        <tr key={`batch-skel-${i}`} className="animate-pulse">
                          <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                          <td className="py-4 px-3"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                          <td className="py-4 px-3"><div className="h-4 bg-slate-200 rounded w-14"></div></td>
                          <td className="py-4 px-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                          <td className="py-4 px-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                          <td className="py-4 px-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                          <td className="py-4 px-3 text-right"><div className="h-4 bg-slate-200 rounded w-12 ml-auto"></div></td>
                          <td className="py-4 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-12 mx-auto"></div></td>
                          <td className="py-4 px-3 text-right"><div className="h-4 bg-slate-200 rounded w-14 ml-auto"></div></td>
                          <td className="py-4 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
                          <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-14 ml-auto"></div></td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Empty State */}
                  {!loading && !error && batches.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Inbox className="w-8 h-8 opacity-40" />
                          <p className="text-xs font-medium">
                            {searchTerm || selectedCategory || selectedStatus
                              ? 'No inventory batches matched your filters.'
                              : 'No inventory batches found in MongoDB. Click "Receive Inward Stock" to add inventory.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Batch Rows */}
                  {!loading &&
                    !error &&
                    batches.map((b) => {
                      const prod = b.product || {};
                      const cat = prod.category || {};
                      const expDateStr = new Date(b.expiryDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      });
                      const mfgDateStr = new Date(b.mfgDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      });

                      return (
                        <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">{prod.name || 'Unknown'}</td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{prod.sku || '---'}</td>
                          <td className="py-3 px-3 font-mono font-semibold text-blue-600 text-xs">
                            {b.batchNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: cat.color || '#94a3b8' }}
                              ></span>
                              <span>{cat.name || 'General'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 text-[11px]">{mfgDateStr}</td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            <div>{expDateStr}</div>
                            <div className="text-[10px] text-slate-400">
                              {b.daysToExpiry < 0
                                ? 'Expired'
                                : `${b.daysToExpiry} day${b.daysToExpiry === 1 ? '' : 's'} left`}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800">
                            ₹ {Number(b.purchasePrice).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`font-bold text-xs ${
                                b.availableQuantity <= 0
                                  ? 'text-rose-600'
                                  : b.availableQuantity <= (prod.minStockAlert || 20)
                                  ? 'text-amber-600'
                                  : 'text-slate-900'
                              }`}
                            >
                              {b.availableQuantity} {prod.unit || 'units'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            ₹ {Number(b.valuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                b.status === 'Urgent'
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : b.status === 'Warning'
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : b.status === 'Expired'
                                  ? 'bg-red-200 text-red-900 border border-red-300'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openAdjust(b)}
                                className="w-7 h-7 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
                                title="Adjust Stock (Damage / Discrepancy / Audit)"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => viewAuditHistory(b)}
                                className="w-7 h-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors"
                                title="View Stock Movement Audit History"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && !error && pagination.total > 0 && (
              <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                <div>
                  Showing <strong className="text-slate-800">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
                  <strong className="text-slate-800">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </strong> of{' '}
                  <strong className="text-slate-800">{pagination.total}</strong> batches in MongoDB
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchBatches(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchBatches(pageNum)}
                        className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => fetchBatches(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT MOVEMENT TRAIL */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          {/* Movement Type Filter */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Filter Event Type:</span>
              <select
                value={movementFilterType}
                onChange={(e) => setMovementFilterType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="">All Movement Types</option>
                <option value="RECEIPT">Stock Receipts (Inward)</option>
                <option value="DAMAGE_WRITE_OFF">Damage / Spoilage Write-Off</option>
                <option value="THEFT_LOSS">Theft / Discrepancy Loss</option>
                <option value="ADJUSTMENT_ADD">Audit Additions</option>
                <option value="ADJUSTMENT_SUBTRACT">Audit Reductions</option>
                <option value="ARCHIVE">Product Archived</option>
                <option value="UNARCHIVE">Product Unarchived</option>
              </select>
            </div>

            <div className="text-xs text-slate-500">
              Total Recorded Logs: <strong className="text-slate-800">{movementsPagination.total}</strong>
            </div>
          </div>

          {/* Audit Trail Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto min-h-[380px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-3">Batch</th>
                    <th className="py-3 px-3 text-center">Movement Type</th>
                    <th className="py-3 px-3 text-right">Change (Qty)</th>
                    <th className="py-3 px-3 text-center">Stock Transition</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-3">Reference #</th>
                    <th className="py-3 px-4">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movementsLoading && (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <tr key={`mov-skel-${i}`} className="animate-pulse">
                          <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                          <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                          <td className="py-4 px-3"><div className="h-4 bg-slate-200 rounded w-14"></div></td>
                          <td className="py-4 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-20 mx-auto"></div></td>
                          <td className="py-4 px-3 text-right"><div className="h-4 bg-slate-200 rounded w-12 ml-auto"></div></td>
                          <td className="py-4 px-3 text-center"><div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
                          <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-40"></div></td>
                          <td className="py-4 px-3"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                          <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                        </tr>
                      ))}
                    </>
                  )}

                  {!movementsLoading && movements.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Inbox className="w-8 h-8 opacity-40" />
                          <p className="text-xs font-medium">No stock audit movements found in database.</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!movementsLoading &&
                    movements.map((m) => {
                      const isPositive = m.quantity > 0;
                      const isNegative = m.quantity < 0;
                      const dateFormatted = new Date(m.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={m._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{dateFormatted}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{m.product?.name || '---'}</td>
                          <td className="py-3 px-3 font-mono text-blue-600 font-medium">
                            {m.batch?.batchNumber || 'Catalog'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                m.movementType === 'RECEIPT'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : m.movementType === 'DAMAGE_WRITE_OFF'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : m.movementType === 'THEFT_LOSS'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : m.movementType === 'ARCHIVE'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {m.movementType}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`font-mono font-bold text-xs inline-flex items-center gap-0.5 ${
                                isPositive
                                  ? 'text-emerald-600'
                                  : isNegative
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}
                            >
                              {isPositive && <ArrowUpRight className="w-3.5 h-3.5" />}
                              {isNegative && <ArrowDownRight className="w-3.5 h-3.5" />}
                              {isPositive ? `+${m.quantity}` : m.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-600">
                            {m.previousStock} &rarr; <strong className="text-slate-900">{m.newStock}</strong>
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={m.reason}>
                            {m.reason}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{m.reference || '---'}</td>
                          <td className="py-3 px-4 text-slate-600 font-medium">{m.performedBy || 'Admin'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination for movements */}
            {!movementsLoading && movementsPagination.total > 0 && (
              <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
                <div>
                  Showing <strong className="text-slate-800">{(movementsPagination.page - 1) * movementsPagination.limit + 1}</strong> to{' '}
                  <strong className="text-slate-800">
                    {Math.min(movementsPagination.page * movementsPagination.limit, movementsPagination.total)}
                  </strong> of{' '}
                  <strong className="text-slate-800">{movementsPagination.total}</strong> audit logs
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchMovements(movementsPagination.page - 1)}
                    disabled={!movementsPagination.hasPrevPage}
                    className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {[...Array(movementsPagination.totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => fetchMovements(pageNum)}
                        className={`w-7 h-7 rounded text-xs font-semibold transition-colors ${
                          movementsPagination.page === pageNum
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => fetchMovements(movementsPagination.page + 1)}
                    disabled={!movementsPagination.hasNextPage}
                    className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: RECEIVE INWARD STOCK */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title="Receive Inward Stock (Goods Receipt)"
        subtitle="Adds new inventory batch and logs immutable stock receipt audit entry"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReceiveModalOpen(false)} disabled={isReceivingSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReceiveSubmit} loading={isReceivingSubmitting}>
              Receive & Record in MongoDB
            </Button>
          </>
        }
      >
        <form onSubmit={handleReceiveSubmit} className="space-y-3">
          <FormField label="Product" required error={receiveErrors.productId}>
            <Select
              value={receiveForm.productId}
              onChange={(e) => setReceiveForm({ ...receiveForm, productId: e.target.value })}
              options={productsList.map((p) => ({
                value: p._id,
                label: `${p.name} (SKU: ${p.sku})`
              }))}
              disabled={isReceivingSubmitting}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Batch Number" required error={receiveErrors.batchNumber}>
              <Input
                value={receiveForm.batchNumber}
                onChange={(e) => setReceiveForm({ ...receiveForm, batchNumber: e.target.value.toUpperCase() })}
                placeholder="e.g. B105"
                error={!!receiveErrors.batchNumber}
                disabled={isReceivingSubmitting}
              />
            </FormField>

            <FormField label="Purchase / Cost Price (₹)" required error={receiveErrors.purchasePrice}>
              <Input
                type="number"
                step="0.01"
                value={receiveForm.purchasePrice}
                onChange={(e) => setReceiveForm({ ...receiveForm, purchasePrice: e.target.value })}
                placeholder="45.00"
                error={!!receiveErrors.purchasePrice}
                disabled={isReceivingSubmitting}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Received Quantity (Units)" required error={receiveErrors.quantity}>
              <Input
                type="number"
                value={receiveForm.quantity}
                onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })}
                placeholder="50"
                error={!!receiveErrors.quantity}
                disabled={isReceivingSubmitting}
              />
            </FormField>

            <FormField label="Expiry Date" required error={receiveErrors.expiryDate}>
              <Input
                type="date"
                value={receiveForm.expiryDate}
                onChange={(e) => setReceiveForm({ ...receiveForm, expiryDate: e.target.value })}
                error={!!receiveErrors.expiryDate}
                disabled={isReceivingSubmitting}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Reference (PO # / Invoice #)">
              <Input
                value={receiveForm.reference}
                onChange={(e) => setReceiveForm({ ...receiveForm, reference: e.target.value })}
                placeholder="e.g. PO-2026-104"
                disabled={isReceivingSubmitting}
              />
            </FormField>

            <FormField label="Authorized By">
              <Input
                value={receiveForm.performedBy}
                onChange={(e) => setReceiveForm({ ...receiveForm, performedBy: e.target.value })}
                placeholder="e.g. Store Manager"
                disabled={isReceivingSubmitting}
              />
            </FormField>
          </div>

          <FormField label="Receiving Reason / Notes">
            <Input
              value={receiveForm.reason}
              onChange={(e) => setReceiveForm({ ...receiveForm, reason: e.target.value })}
              placeholder="e.g. Weekly stock replenishment from supplier"
              disabled={isReceivingSubmitting}
            />
          </FormField>
        </form>
      </Modal>

      {/* MODAL 2: AUTHORIZED STOCK ADJUSTMENT */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Authorized Stock Adjustment"
        subtitle={
          selectedBatch
            ? `${selectedBatch.product?.name} (Batch: ${selectedBatch.batchNumber} | Current Stock: ${selectedBatch.availableQuantity})`
            : ''
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAdjustModalOpen(false)} disabled={isAdjustSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdjustSubmit} loading={isAdjustSubmitting}>
              Save Authorized Adjustment
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Current Batch Quantity:</span>{' '}
              <strong className="text-slate-900 font-bold">{selectedBatch?.availableQuantity ?? 0} units</strong>
            </div>
            <div>
              <span className="text-slate-500">Unit Cost:</span>{' '}
              <strong className="text-slate-900 font-bold">₹ {Number(selectedBatch?.purchasePrice || 0).toFixed(2)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Adjustment Action" required>
              <Select
                value={adjustForm.adjustmentType}
                onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentType: e.target.value })}
                options={[
                  { value: 'SUBTRACT', label: 'Subtract Stock (Damage / Loss)' },
                  { value: 'ADD', label: 'Add Stock (Audit Found)' },
                  { value: 'SET', label: 'Set Exact Stock Count' }
                ]}
                disabled={isAdjustSubmitting}
              />
            </FormField>

            <FormField label="Adjustment Quantity" required error={adjustErrors.quantity}>
              <Input
                type="number"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                placeholder="Units to change"
                error={!!adjustErrors.quantity}
                disabled={isAdjustSubmitting}
              />
            </FormField>
          </div>

          <FormField label="Audit Reason (Mandatory)" required error={adjustErrors.reason}>
            <Select
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              options={[
                { value: 'Damaged packaging during shelf stocking', label: 'Damaged packaging during shelf stocking' },
                { value: 'Spoiled or past shelf-life expiry', label: 'Spoiled or past shelf-life expiry' },
                { value: 'Theft / Unaccounted inventory shrinkage', label: 'Theft / Unaccounted inventory shrinkage' },
                { value: 'Routine physical count audit correction', label: 'Routine physical count audit correction' },
                { value: 'Customer return accepted to inventory', label: 'Customer return accepted to inventory' }
              ]}
              disabled={isAdjustSubmitting}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Reference Note">
              <Input
                value={adjustForm.reference}
                onChange={(e) => setAdjustForm({ ...adjustForm, reference: e.target.value })}
                placeholder="e.g. AUDIT-2026-OCT"
                disabled={isAdjustSubmitting}
              />
            </FormField>

            <FormField label="Authorized Supervisor">
              <Input
                value={adjustForm.performedBy}
                onChange={(e) => setAdjustForm({ ...adjustForm, performedBy: e.target.value })}
                placeholder="e.g. Senior Supervisor"
                disabled={isAdjustSubmitting}
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
