import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Trash2
} from 'lucide-react';

function createPurchaseLine() {
  return {
    productId: '',
    batchNumber: '',
    expiryDate: '',
    purchasePrice: '',
    quantity: ''
  };
}

function getReferenceId(value) {
  return String(value?._id || value || '');
}

function getLinkedProductsForSupplier(supplier, products) {
  if (!supplier) return [];

  const linkedProductIds = (supplier.products || []).map(getReferenceId);
  if (linkedProductIds.length) {
    return products.filter((product) => linkedProductIds.includes(product._id));
  }

  const linkedCategoryIds = (supplier.categories || []).map(getReferenceId);
  if (linkedCategoryIds.length) {
    return products.filter((product) =>
      linkedCategoryIds.includes(getReferenceId(product.category))
    );
  }

  const historicalProductIds = (supplier.historicalProducts || []).map(getReferenceId);
  if (historicalProductIds.length) {
    return products.filter((product) => historicalProductIds.includes(product._id));
  }

  return [];
}

function createSupplierPurchaseLines(supplier, products, purchases) {
  const suppliedProducts = getLinkedProductsForSupplier(supplier, products);
  if (!suppliedProducts.length) return [createPurchaseLine()];

  const supplierId = getReferenceId(supplier._id);
  const supplierPurchases = purchases
    .filter((purchase) => {
      const purchaseSupplierId = getReferenceId(purchase.supplier);
      return purchaseSupplierId
        ? purchaseSupplierId === supplierId
        : purchase.supplierName === supplier.companyName;
    })
    .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
  const lastPurchasePrices = new Map();

  for (const purchase of supplierPurchases) {
    for (const item of purchase.items || []) {
      const productId = getReferenceId(item.product);
      if (
        productId &&
        item.purchasePrice != null &&
        !lastPurchasePrices.has(productId) &&
        Number.isFinite(Number(item.purchasePrice))
      ) {
        lastPurchasePrices.set(productId, String(item.purchasePrice));
      }
    }
  }

  return suppliedProducts.map((product) => ({
    ...createPurchaseLine(),
    productId: product._id,
    purchasePrice: lastPurchasePrices.get(product._id) || ''
  }));
}

function getLocalDateInputValue(date = new Date()) {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

function getPurchaseTotal(purchase) {
  const subtotal = Number(purchase.subtotal);
  if (purchase.subtotal != null && Number.isFinite(subtotal)) return subtotal;
  return Math.max(0, (Number(purchase.grandTotal) || 0) - (Number(purchase.taxAmount) || 0));
}

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
    items: [createPurchaseLine()],
    paymentStatus: 'Paid'
  });
  const receiptIdempotencyKey = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [poRes, supRes, firstProdRes] = await Promise.all([
        purchaseService.getAll({ limit: 100 }),
        supplierService.getAll({ status: 'Active', limit: 100 }),
        productService.getAll({ page: 1, limit: 100 })
      ]);
      const purchaseRecords = poRes?.data || [];
      setPurchases(purchaseRecords);
      const sups = (supRes?.data || []).filter((supplier) => supplier.status === 'Active');
      setSuppliers(sups);
      const remainingPages = await Promise.all(
        Array.from({ length: (firstProdRes.meta?.totalPages || 1) - 1 }, (_, index) =>
          productService.getAll({ page: index + 2, limit: 100 })
        )
      );
      const prods = [
        ...(firstProdRes?.data || []),
        ...remainingPages.flatMap((response) => response.data || [])
      ];
      setProducts(prods);

      if (sups.length > 0) {
        setFormData((prev) =>
          prev.supplierId
            ? prev
            : {
                ...prev,
                supplierId: sups[0]._id,
                items: createSupplierPurchaseLines(sups[0], prods, purchaseRecords)
              }
        );
      }
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to load purchases from database', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getProductsForSupplier = (supplierId) => {
    const supplier = suppliers.find((item) => item._id === supplierId);
    if (!supplier) return [];

    const linkedProducts = getLinkedProductsForSupplier(supplier, products);
    return supplier.products?.length || supplier.categories?.length || supplier.historicalProducts?.length
      ? linkedProducts
      : products;
  };

  const updatePurchaseLine = (index, field, value) => {
    setFormData((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find((item) => item._id === supplierId);
    setFormData((current) => ({
      ...current,
      supplierId,
      items: createSupplierPurchaseLines(supplier, products, purchases)
    }));

    if (supplier && !getLinkedProductsForSupplier(supplier, products).length) {
      addToast('No products are linked to this supplier yet. Choose products manually or link them in Suppliers.', 'info');
    }
  };

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (!formData.supplierId || formData.items.some((item) => !item.productId)) {
      addToast('Choose a supplier and a product for every purchase line', 'warning');
      return;
    }
    const today = getLocalDateInputValue();
    for (const [index, item] of formData.items.entries()) {
      if (!item.batchNumber.trim()) {
        addToast(`Batch number is required for purchase line ${index + 1}`, 'warning');
        return;
      }
      if (!item.expiryDate || item.expiryDate <= today) {
        addToast(`Enter a future expiry date for purchase line ${index + 1}`, 'warning');
        return;
      }
      const quantity = Number(item.quantity);
      const purchasePrice = Number(item.purchasePrice);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        addToast(`Quantity must be a whole number greater than 0 on line ${index + 1}`, 'warning');
        return;
      }
      if (item.purchasePrice.trim() === '' || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
        addToast(`Enter a valid purchase cost on line ${index + 1}`, 'warning');
        return;
      }
    }

    setIsSubmitting(true);
    if (!receiptIdempotencyKey.current) {
      receiptIdempotencyKey.current = `PO-RECEIPT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    try {
      const payload = {
        supplierId: formData.supplierId,
        invoiceReference: formData.invoiceReference.trim(),
        items: formData.items.map((item) => ({
          productId: item.productId,
          batchNumber: item.batchNumber.trim().toUpperCase(),
          expiryDate: item.expiryDate,
          purchasePrice: Number(item.purchasePrice),
          quantity: Number(item.quantity)
        })),
        paymentStatus: formData.paymentStatus,
        idempotencyKey: receiptIdempotencyKey.current
      };

      const res = await purchaseService.receiveStock(payload);
      const poRecord = res.data?.purchase || res.data;
      addToast(
        res.data?.isDuplicate
          ? `Stock receipt ${poRecord.poNumber} was already processed; inventory was not added again.`
          : `Stock receipt ${poRecord.poNumber} created and batches added to inventory!`,
        'success'
      );

      setIsModalOpen(false);
      receiptIdempotencyKey.current = null;
      setFormData((prev) => ({
        ...prev,
        supplierId: '',
        items: [createPurchaseLine()],
        paymentStatus: 'Paid',
        invoiceReference: ''
      }));
      await loadData();
    } catch (err) {
      addToast(err?.message || 'Failed to process inward stock receipt', 'error');
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

  const estimatedSubtotal = formData.items.reduce(
    (total, item) =>
      total + Math.round((Number(item.purchasePrice) || 0) * (Number(item.quantity) || 0) * 100) / 100,
    0
  );
  const availableProducts = getProductsForSupplier(formData.supplierId);
  const selectedSupplier = suppliers.find((supplier) => supplier._id === formData.supplierId);
  const supplierHasLinkedProducts = getLinkedProductsForSupplier(selectedSupplier, products).length > 0;

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
                      ₹ {getPurchaseTotal(p).toFixed(2)}
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
                onChange={(e) => handleSupplierChange(e.target.value)}
                options={suppliers.map((s) => ({ value: s._id, label: s.companyName }))}
                placeholder={suppliers.length ? 'Select supplier...' : 'No active suppliers available'}
                disabled={suppliers.length === 0}
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
          {formData.supplierId && (
            <p className="text-[11px] text-slate-500">
              {supplierHasLinkedProducts
                ? 'Linked products and their latest purchase costs are prefilled. Enter the batch, expiry, quantity and invoice details for this delivery.'
                : 'No linked products found. Choose products manually; batch, expiry and quantity must match this delivery.'}
            </p>
          )}

          {formData.items.map((item, index) => (
            <div key={index} className="p-3 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800">Purchase Line {index + 1}</div>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((current) => ({
                        ...current,
                        items: current.items.filter((_, itemIndex) => itemIndex !== index)
                      }))
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                    aria-label={`Remove purchase line ${index + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
              <FormField label="Product" required>
                <Select
                  value={item.productId}
                  onChange={(event) => updatePurchaseLine(index, 'productId', event.target.value)}
                  options={availableProducts.map((product) => ({
                    value: product._id,
                    label: `${product.name} (${product.sku}) — Stock: ${product.stock || 0}`
                  }))}
                  placeholder={availableProducts.length ? 'Select product...' : 'No products linked to this supplier'}
                  disabled={!formData.supplierId || availableProducts.length === 0}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Batch Number" required>
                  <Input
                    value={item.batchNumber}
                    onChange={(event) => updatePurchaseLine(index, 'batchNumber', event.target.value)}
                    placeholder="e.g. B2026-90"
                  />
                </FormField>
                <FormField label="Expiry Date" required>
                  <Input
                    type="date"
                    min={getLocalDateInputValue()}
                    value={item.expiryDate}
                    onChange={(event) => updatePurchaseLine(index, 'expiryDate', event.target.value)}
                  />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Purchase Cost / Unit (₹)" required>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.purchasePrice}
                    onChange={(event) => updatePurchaseLine(index, 'purchasePrice', event.target.value)}
                    placeholder="e.g. 45.00"
                  />
                </FormField>
                <FormField label="Received Quantity" required>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updatePurchaseLine(index, 'quantity', event.target.value)}
                    placeholder="e.g. 50"
                  />
                </FormField>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            icon={Plus}
            disabled={!formData.supplierId}
            onClick={() => setFormData((current) => ({ ...current, items: [...current.items, createPurchaseLine()] }))}
          >
            Add another product
          </Button>

          <div className="grid grid-cols-1 gap-3">
            <FormField label="Payment Status" required>
              <Select
                value={formData.paymentStatus}
                onChange={(event) => setFormData({ ...formData, paymentStatus: event.target.value })}
                options={[
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Pending', label: 'Pending' }
                ]}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="self-end p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between gap-4 text-slate-700">
                <span>Subtotal</span><strong>₹ {estimatedSubtotal.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between gap-4 border-t border-blue-200 pt-1 font-bold text-blue-900">
                <span>Estimated Total</span><span>₹ {estimatedSubtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
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
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal:</span>
                <span className="text-slate-800">₹ {selectedPO.subtotal?.toFixed(2)}</span>
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
              <span className="text-sm font-black text-emerald-600">₹ {getPurchaseTotal(selectedPO).toFixed(2)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
