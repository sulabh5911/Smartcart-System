import React, { useState, useEffect, useMemo, useRef } from 'react';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { saleService } from '../services/saleService';
import { getProductImage } from '../utils/productImage';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import BarcodeScanner from '../components/BarcodeScanner';
import { FormField, Input, Button } from '../components/Form';
import {
  Search,
  Trash2,
  Printer,
  Barcode,
  CreditCard,
  Banknote,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Info,
  CheckCircle2,
  Camera
} from 'lucide-react';

export default function POSBilling() {
  const { addToast } = useToast();

  // Data states
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Search & Barcode input
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef(null);
  const barcodeLookupQueueRef = useRef(Promise.resolve());
  const barcodeLookupCountRef = useRef(0);
  const scanBufferRef = useRef('');
  const lastScanKeyAtRef = useRef(0);
  const lookupBarcodeRef = useRef(null);
  const checkoutKeysRef = useRef(new Map());
  const checkoutInProgressRef = useRef(false);
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Cart state: [{ productId, name, sku, price, quantity, stock, image, unit }]
  const [cart, setCart] = useState([]);

  // Billing states
  const [selectedCustomer, setSelectedCustomer] = useState({ id: null, name: 'Walk-in Customer', phone: '---' });
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // Invoice / Receipt Modal
  const [completedSale, setCompletedSale] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Load live products & customers
  const loadData = async () => {
    try {
      setLoadingProducts(true);
      const [prodRes, custRes] = await Promise.all([
        productService.getAll({ limit: 100 }),
        customerService.getAll({ limit: 50 })
      ]);
      setProducts(prodRes?.data || []);
      const custList = custRes?.data || [];
      setCustomers(custList);

      // Default customer: Walk-in
      const walkIn = custList.find((c) => c.name.toLowerCase().includes('walk-in')) || {
        id: null,
        name: 'Walk-in Customer',
        phone: '---'
      };
      setSelectedCustomer(walkIn);
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to load store catalog or customers', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadData();
    barcodeInputRef.current?.focus();
  }, []);
  // Cart operations
  const addToCart = (product) => {
    const availableStock = Number(product.sellableStock ?? product.stock ?? 0);
    if (availableStock <= 0) {
      addToast(`"${product.name}" is out of stock!`, 'warning');
      return;
    }

    const existingItem = cart.find((item) => item.productId === product._id);
    if (existingItem && existingItem.quantity + 1 > availableStock) {
      addToast(`Maximum available stock (${availableStock}) reached for ${product.name}`, 'warning');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product._id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode || '',
          price: product.sellingPrice,
          quantity: 1,
          stock: availableStock,
          unit: product.unit || 'unit',
          image: getProductImage(product.image)
        }
      ];
    });

    addToast(`Added ${product.name} to cart`, 'info', 1200);
  };

  const lookupBarcode = (value) => {
    const code = value.trim();
    if (!code || isSubmitting) return;

    barcodeLookupCountRef.current += 1;
    setBarcodeLookupLoading(true);
    const processScan = async () => {
      try {
        const response = await productService.getByBarcode(code);
        addToCart(response.data);
        setBarcodeInput((current) => (current.trim() === code ? '' : current));
      } catch (error) {
        const message = error?.response?.data?.message || 'Barcode lookup failed. Check your connection and retry.';
        addToast(message, error?.response?.status === 404 ? 'warning' : 'error', 4500);
      } finally {
        barcodeLookupCountRef.current -= 1;
        if (barcodeLookupCountRef.current === 0) setBarcodeLookupLoading(false);
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
      }
    };

    barcodeLookupQueueRef.current = barcodeLookupQueueRef.current.then(processScan, processScan);
    return barcodeLookupQueueRef.current;
  };

  useEffect(() => {
    lookupBarcodeRef.current = lookupBarcode;
  });
  const handleBarcodeKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      lookupBarcode(barcodeInput);
    }
  };

  useEffect(() => {
    const handleUsbScannerInput = (event) => {
      if (
        event.target === barcodeInputRef.current ||
        event.target?.matches?.('input, textarea, select, [contenteditable="true"]') ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isCameraOpen ||
        isCustomerModalOpen ||
        isReceiptOpen
      ) {
        return;
      }

      const now = Date.now();
      if (event.key === 'Enter') {
        const code = scanBufferRef.current;
        scanBufferRef.current = '';
        if (code.length >= 4 && now - lastScanKeyAtRef.current < 1500) {
          event.preventDefault();
          lookupBarcodeRef.current?.(code);
        }
        return;
      }

      if (event.key.length === 1 && /^[\x20-\x7E]$/.test(event.key)) {
        if (now - lastScanKeyAtRef.current > 100) scanBufferRef.current = '';
        scanBufferRef.current += event.key;
        lastScanKeyAtRef.current = now;
      }
    };

    window.addEventListener('keydown', handleUsbScannerInput);
    return () => window.removeEventListener('keydown', handleUsbScannerInput);
  }, [isCameraOpen, isCustomerModalOpen, isReceiptOpen]);

  const updateQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock) {
              addToast(`Cannot exceed available stock of ${item.stock}`, 'warning');
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const setDirectQty = (productId, val) => {
    const qty = parseInt(val, 10);
    if (isNaN(qty) || qty <= 0) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          if (qty > item.stock) {
            addToast(`Cannot exceed available stock of ${item.stock}`, 'warning');
            return { ...item, quantity: item.stock };
          }
          return { ...item, quantity: qty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    addToast('Cart cleared', 'info', 1500);
  };

  // Financial calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountAmount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
  const taxable = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  const grandTotal = taxable;

  // Quick Customer Creation
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      addToast('Customer name is required', 'warning');
      return;
    }
    try {
      const res = await customerService.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || '---',
        email: newCustEmail.trim() || ''
      });
      const created = res.data;
      setCustomers((prev) => [created, ...prev]);
      setSelectedCustomer(created);
      setIsCustomerModalOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      addToast(`Customer "${created.name}" registered and selected!`, 'success');
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to create customer', 'error');
    }
  };

  // Checkout with Server Authoritative Calculation & Idempotency Key
  const handleGenerateBill = async () => {
    if (checkoutInProgressRef.current) return;
    if (cart.length === 0) {
      addToast('Cart is empty. Please add products first.', 'warning');
      return;
    }
    if (barcodeLookupCountRef.current > 0) {
      addToast('Wait for barcode lookups to finish before checking out.', 'warning');
      return;
    }

    checkoutInProgressRef.current = true;
    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer?._id || selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'Walk-in Customer',
        customerPhone: selectedCustomer?.phone || '---',
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        discountPercent,
        paymentMethod,
        cashier: 'Counter-01',
        notes: `POS transaction tender: ${paymentMethod}`
      };
      const requestFingerprint = JSON.stringify(payload);
      let idempotencyKey = checkoutKeysRef.current.get(requestFingerprint);
      if (!idempotencyKey) {
        idempotencyKey = `POS-BILL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        checkoutKeysRef.current.set(requestFingerprint, idempotencyKey);
      }
      payload.idempotencyKey = idempotencyKey;

      const res = await saleService.checkout(payload);
      const saleRecord = res.data?.sale || res.data;

      setCompletedSale(saleRecord);
      setIsReceiptOpen(true);
      setCart([]);
      checkoutKeysRef.current.clear();
      addToast(`Invoice ${saleRecord.invoiceNumber} generated successfully!`, 'success');

      // Refresh product stock in catalog
      loadData();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || 'Checkout failed. Please check stock levels.';
      addToast(errorMsg, 'error', 5000);
    } finally {
      checkoutInProgressRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Filtered products for quick picking
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        (p.category?.name && p.category.name.toLowerCase().includes(q))
    );
  }, [products, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>POS Billing Terminal</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Checkout
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Server-authoritative billing, FEFO batch allocation, and audit receipts
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          title="Reload products"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? 'animate-spin' : ''}`} />
          <span>Refresh Catalog</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Product Search & Table (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          {/* Dual Input: Barcode Scanner & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Barcode scanner input */}
            <div className="flex min-w-0 gap-2">
              <div className="relative min-w-0 flex-1">
                <Barcode className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  disabled={isSubmitting}
                  aria-label="USB barcode scanner input"
                  placeholder={barcodeLookupLoading ? 'Looking up barcode…' : 'Scan / Type Barcode + Enter...'}
                  className="w-full pl-9 pr-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                disabled={isSubmitting}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                aria-label="Open camera barcode scanner"
              >
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Scan Barcode</span>
              </button>
            </div>

            {/* Keyword search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by product name or SKU..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Product List Table */}
          <div className="overflow-x-auto min-h-[420px] max-h-[560px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3 text-center">Stock</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingProducts ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                      Loading catalog from MongoDB...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const availableStock = Number(p.sellableStock ?? p.stock ?? 0);
                    const isOut = availableStock <= 0;
                    return (
                      <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 leading-tight">{p.name}</div>
                          <div className="text-[10px] text-slate-400">{p.category?.name || 'General'}</div>
                          {p.barcode && <div className="text-[10px] text-slate-400 font-mono">{p.barcode}</div>}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{p.sku}</td>
                        <td className="py-2 px-3 text-slate-800 font-semibold whitespace-nowrap">
                          ₹ {p.sellingPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isOut
                                ? 'bg-rose-100 text-rose-700'
                                : p.stock <= 10
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {availableStock} {p.unit}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => addToCart(p)}
                            disabled={isOut}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${
                              isOut
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                            title={isOut ? 'Out of stock' : 'Add to cart'}
                          >
                            +
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Cart Items ({cart.reduce((a, b) => a + b.quantity, 0)})
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Cart is currently empty</p>
                <p className="text-[11px] text-slate-400">Scan a barcode or click + on a product</p>
              </div>
            ) : (
              <div className="overflow-x-auto my-3 max-h-[220px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-medium text-slate-400 border-b border-slate-100 pb-1">
                    <tr>
                      <th className="py-1.5 px-2">Item</th>
                      <th className="py-1.5 px-2">Price</th>
                      <th className="py-1.5 px-2 text-center">Qty</th>
                      <th className="py-1.5 px-2 text-right">Total</th>
                      <th className="py-1.5 px-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <tr key={item.productId}>
                        <td className="py-2 px-2 font-medium text-slate-800">
                          <div className="truncate max-w-[120px] font-semibold" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                          {item.barcode && <div className="text-[10px] text-slate-400 font-mono">{item.barcode}</div>}
                        </td>
                        <td className="py-2 px-2 text-slate-600">₹ {item.price.toFixed(2)}</td>
                        <td className="py-2 px-2 text-center">
                          <div className="inline-flex items-center gap-1 border border-slate-200 rounded px-1 py-0.5 bg-slate-50">
                            <button
                              onClick={() => updateQty(item.productId, -1)}
                              className="text-slate-500 hover:text-slate-900 px-1 font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.stock}
                              value={item.quantity}
                              onChange={(e) => setDirectQty(item.productId, e.target.value)}
                              className="font-bold text-slate-900 w-7 text-center bg-transparent focus:outline-none text-xs"
                            />
                            <button
                              onClick={() => updateQty(item.productId, 1)}
                              className="text-slate-500 hover:text-slate-900 px-1 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-900">
                          ₹ {(item.price * item.quantity).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="w-6 h-6 rounded border border-rose-200 text-rose-500 hover:bg-rose-50 inline-flex items-center justify-center transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Customer Selector */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">Customer</span>
              <div className="flex items-center gap-1.5 flex-1 max-w-[250px]">
                <select
                  value={selectedCustomer?._id || selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    const cust = customers.find((c) => (c._id || c.id) === id) || {
                      id: null,
                      name: 'Walk-in Customer',
                      phone: '---'
                    };
                    setSelectedCustomer(cust);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.name} {c.phone && c.phone !== '---' ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 text-xs font-semibold whitespace-nowrap"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">₹ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span>Discount</span>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 bg-white"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="10">10%</option>
                    <option value="15">15%</option>
                    <option value="20">20%</option>
                  </select>
                </span>
                <span className="font-semibold text-rose-500">- ₹ {discountAmount.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Total Payable</span>
                <span className="text-2xl font-black text-slate-900">
                  ₹ {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector & Generate Bill Button */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Select Payment Tender:</span>
                <span className="text-[10px] text-slate-400 font-normal">Audit Ledger</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { mode: 'Cash', icon: Banknote },
                  { mode: 'UPI', icon: QrCode },
                  { mode: 'Card', icon: CreditCard }
                ].map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMethod(mode)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                      paymentMethod === mode
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mode}</span>
                  </button>
                ))}
              </div>

              {/* Educational Disclaimer */}
              <div className="mt-2 p-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[10.5px] text-amber-800 flex items-start gap-1.5 leading-tight">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Ledger Tender Recording:</strong> Selecting Cash, UPI, or Card records the tender method in the store's audit ledger. It does <em>not</em> trigger real banking payment gateway API transactions.
                </span>
              </div>
            </div>

            <button
              onClick={handleGenerateBill}
              disabled={isSubmitting || cart.length === 0 || barcodeLookupLoading}
              className={`w-full py-3 rounded-lg text-xs font-bold text-white shadow-sm flex items-center justify-center gap-2 transition-colors ${
                isSubmitting || cart.length === 0 || barcodeLookupLoading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout & Deducting FEFO Stock...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate Bill & Checkout (₹ {grandTotal.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      <BarcodeScanner
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={(code) => lookupBarcodeRef.current?.(code)}
      />

      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Register New Customer"
        subtitle="Customer will be linked to POS invoices and loyalty program"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateCustomer}>
              Save & Select
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <FormField label="Full Name" required>
            <Input
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              autoFocus
            />
          </FormField>
          <FormField label="Phone Number">
            <Input
              value={newCustPhone}
              onChange={(e) => setNewCustPhone(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </FormField>
          <FormField label="Email Address">
            <Input
              value={newCustEmail}
              onChange={(e) => setNewCustEmail(e.target.value)}
              placeholder="e.g. ramesh@example.com"
            />
          </FormField>
        </form>
      </Modal>

      {/* Printable Thermal Receipt Modal */}
      <Modal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        title="Sale Completed"
        subtitle={completedSale?.invoiceNumber}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReceiptOpen(false)}>
              New Sale / Close
            </Button>
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>
              Print Receipt
            </Button>
          </>
        }
      >
        {completedSale && (
          <div className="printable-receipt p-5 bg-white border border-slate-200 rounded-lg text-xs font-mono space-y-3 shadow-inner max-w-sm mx-auto">
            {/* Store Branding Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-300">
              <div className="font-extrabold text-base text-slate-900 tracking-tight">SMART MART PRO</div>
              <div className="text-[10px] text-slate-500">Supermarket Inventory & Retail Billing</div>
              <div className="text-[10px] text-slate-500">GSTIN: 07AAAAA0000A1Z5 | Counter #01</div>
            </div>

            {/* Bill Meta */}
            <div className="space-y-0.5 text-[11px] text-slate-700">
              <div className="flex justify-between">
                <span>INVOICE:</span>
                <strong>{completedSale.invoiceNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span>DATE/TIME:</span>
                <span>{new Date(completedSale.createdAt || Date.now()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>CUSTOMER:</span>
                <span className="font-semibold">{completedSale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>PAYMENT MODE:</span>
                <span className="font-bold uppercase">{completedSale.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span>{completedSale.cashier || 'Admin'}</span>
              </div>
            </div>

            {/* Line Items Table with FEFO Batch Breakdown */}
            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-2">
              <div className="flex justify-between font-bold text-[10.5px] text-slate-500 uppercase">
                <span>Item [Batch]</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>

              {completedSale.items?.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span className="truncate max-w-[170px]">{it.name}</span>
                    <span className="text-right">₹{it.itemTotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>
                      {it.quantity} {it.unit} @ ₹{it.unitPrice?.toFixed(2)}
                    </span>
                    {it.batchesDeducted && it.batchesDeducted.length > 0 && (
                      <span className="font-mono text-[9px] text-emerald-700">
                        Batch: {it.batchesDeducted.map((b) => b.batchNumber).join(', ')} (FEFO)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-[11px] text-slate-700 pt-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{completedSale.subtotal?.toFixed(2)}</span>
              </div>
              {completedSale.discountAmount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount ({completedSale.discountPercent}%):</span>
                  <span>- ₹{completedSale.discountAmount?.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-900 flex justify-between items-baseline text-slate-900">
                <span className="font-bold text-sm">GRAND TOTAL:</span>
                <span className="font-black text-lg">₹{completedSale.totalAmount?.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Barcode / Note */}
            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1">
              <div className="font-mono tracking-widest text-[11px] text-slate-800">
                *{completedSale.invoiceNumber}*
              </div>
              <div>Thank you for shopping at Smart Mart Pro!</div>
              <div className="text-[9px] text-slate-400">Goods once sold can be exchanged within 7 days.</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
