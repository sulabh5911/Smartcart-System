import React, { useState, useEffect, useMemo } from 'react';
import { purchaseService } from '../services/purchaseService';
import { supplierService } from '../services/supplierService';
import { productService } from '../services/productService';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { FormField, Input, Select, Button } from '../components/Form';
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Truck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function Purchases() {
  const { addToast } = useToast();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Inward Receipt Form
  const [formData, setFormData] = useState({
    supplierId: '',
    invoiceReference: '',
    productId: '',
    batchNumber: '',
    expiryDate: '',
    purchasePrice: '',
    quantity: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [poRes, supRes, prodRes] = await Promise.all([
        purchaseService.getAll({ limit: 100 }),
        supplierService.getAll({ limit: 100 }),
        productService.getAll({ limit: 100 })
      ]);
      setPurchases(poRes?.data || []);
      const sups = supRes?.data || [];
      setSuppliers(sups);
      const prods = prodRes?.data || [];
      setProducts(prods);

      if (sups.length > 0 && !formData.supplierId) {
        setFormData((prev) => ({
          ...prev,
          supplierId: sups[0]._id,
          productId: prods[0]?._id || '',
          expiryDate: '2028-06-30'
        }));
      }
    } catch (err) {
      addToast('Failed to load purchases from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.productId) {
      addToast('Supplier and product are required', 'warning');
      return;
    }
    if (!formData.batchNumber.trim()) {
      addToast('Batch number is required for inward receipt', 'warning');
      return;
    }
    if (!formData.expiryDate) {
      addToast('Expiry date is required for batch tracking', 'warning');
      return;
    }
    const qty = parseInt(formData.quantity, 10);
    const cost = parseFloat(formData.purchasePrice);
    if (isNaN(qty) || qty <= 0) {
      addToast('Quantity must be an integer greater than 0', 'warning');
      return;
    }
    if (isNaN(cost) || cost < 0) {
      addToast('Valid purchase cost is required', 'warning');
      return;
    }

    setIsSubmitting(true);
    const idempotencyKey = `PO-RECEIPT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      const payload = {
        supplierId: formData.supplierId,
        invoiceReference: formData.invoiceReference.trim(),
        items: [
          {
            productId: formData.productId,
            batchNumber: formData.batchNumber.trim().toUpperCase(),
            expiryDate: formData.expiryDate,
            purchasePrice: cost,
            quantity: qty
          }
        ],
        paymentStatus: 'Paid',
        idempotencyKey
      };

      const res = await purchaseService.receiveStock(payload);
      const poRecord = res.data?.purchase || res.data;
      addToast(`Stock receipt ${poRecord.poNumber} created and batches added to inventory!`, 'success');

      setIsModalOpen(false);
      setFormData((prev) => ({
        ...prev,
        batchNumber: '',
        purchasePrice: '',
        quantity: '',
        invoiceReference: ''
      }));
      loadData();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to process inward stock receipt', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenView = (po) => {
    setSelectedPO(po);
    setIsViewModalOpen(true);
  };

  const filtered = useMemo(() => {
    return purchases.filter(
      (p) =>
        p.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.invoiceReference && p.invoiceReference.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [purchases, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Inward Stock & Purchases</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Inventory Inflow
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Procurement purchase orders, vendor invoices, batch creation and stock receiving
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Receive Inward Stock</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
        <div className="relative w-80 max-w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search POs by number, supplier or invoice ref..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Date Received</th>
                <th className="py-3 px-4 text-center">Batches Inward</th>
                <th className="py-3 px-4 text-center">Total Units</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Fetching purchase records from MongoDB...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No purchase receipts recorded yet. Click "Receive Inward Stock" to begin.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {p.poNumber}
                      {p.invoiceReference && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Ref: {p.invoiceReference}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{p.supplierName}</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-700">{p.itemsCount}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 text-[11px]">
                        +{p.totalQuantity} units
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      ₹ {p.grandTotal?.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {p.receivingStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenView(p)}
                        className="w-7 h-7 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center transition-colors"
                        title="View PO Receipt"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Inward Stock Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Receive Inward Stock from Supplier"
        subtitle="Creates authoritative batches, logs stock movements and updates catalog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateReceipt} disabled={isSubmitting}>
              {isSubmitting ? 'Receiving & Creating Batches...' : 'Receive Stock'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateReceipt} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Supplier" required>
              <Select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                options={suppliers.map((s) => ({ value: s._id, label: s.companyName }))}
              />
            </FormField>

            <FormField label="Supplier Bill / Invoice Ref">
              <Input
                value={formData.invoiceReference}
                onChange={(e) => setFormData({ ...formData, invoiceReference: e.target.value })}
                placeholder="e.g. SUP-INV-9921"
              />
            </FormField>
          </div>

          <FormField label="Product" required>
            <Select
              value={formData.productId}
              onChange={(e) => {
                const prod = products.find((p) => p._id === e.target.value);
                setFormData({
                  ...formData,
                  productId: e.target.value,
                  purchasePrice: prod?.purchasePrice || ''
                });
              }}
              options={products.map((p) => ({
                value: p._id,
                label: `${p.name} (${p.sku}) — Current Stock: ${p.stock}`
              }))}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Batch Number" required>
              <Input
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="e.g. B2026-90"
              />
            </FormField>

            <FormField label="Expiry Date" required>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Purchase Cost / Unit (₹)" required>
              <Input
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                placeholder="e.g. 45.00"
              />
            </FormField>

            <FormField label="Received Quantity" required>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g. 50"
              />
            </FormField>
          </div>

          {formData.purchasePrice && formData.quantity && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs flex justify-between font-bold text-blue-900">
              <span>Estimated Inward Valuation:</span>
              <span>
                ₹ {(Number(formData.purchasePrice) * Number(formData.quantity) * 1.05).toFixed(2)} (incl. 5% GST)
              </span>
            </div>
          )}
        </form>
      </Modal>

      {/* View PO Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Purchase Order Receipt"
        subtitle={selectedPO?.poNumber}
        footer={
          <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedPO && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier:</span>
                <strong className="text-slate-900">{selectedPO.supplierName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice Ref:</span>
                <span className="font-mono text-slate-800">{selectedPO.invoiceReference || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date Received:</span>
                <span className="text-slate-800">{new Date(selectedPO.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-900 mb-2">Batches Received</div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {selectedPO.items?.map((it, idx) => (
                  <div key={idx} className="p-3 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{it.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Batch: {it.batchNumber} | Exp: {new Date(it.expiryDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        {it.quantity} units @ ₹{it.purchasePrice?.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">₹{it.lineTotal?.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-sm font-black text-emerald-600">₹ {selectedPO.grandTotal?.toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
