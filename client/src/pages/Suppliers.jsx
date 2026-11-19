import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supplierService } from '../services/supplierService';
import { categoryService } from '../services/categoryService';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { purchaseService } from '../services/purchaseService';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { FormField, Input, Select, Button } from '../components/Form';
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Eye,
  Truck
} from 'lucide-react';

function getId(value) {
  return value?._id || value;
}

function getLocalDateInputValue(date = new Date()) {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().slice(0, 10);
}

function ReferencePicker({ label, options, selectedIds, onToggle, emptyMessage }) {
  const [search, setSearch] = useState('');
  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.description || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FormField label={`${label} (${selectedIds.length} selected)`}>
      <div className="rounded-lg border border-slate-200">
        {options.length > 0 && (
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${label.toLowerCase()}...`}
            aria-label={`Search ${label.toLowerCase()}`}
            className="w-full px-3 py-2 text-xs border-b border-slate-200 focus:outline-none focus:border-blue-500"
          />
        )}
        {options.length === 0 ? (
          <div className="p-3 text-xs text-slate-400">{emptyMessage}</div>
        ) : filteredOptions.length === 0 ? (
          <div className="p-3 text-xs text-slate-400">No matching options.</div>
        ) : (
          <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
          {filteredOptions.map((option) => (
            <label
              key={option.id}
              className="flex items-start gap-2.5 px-3 py-2 text-xs hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(option.id)}
                onChange={() => onToggle(option.id)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="min-w-0">
                <span className="block font-medium text-slate-800">{option.label}</span>
                {option.description && <span className="block text-[10px] text-slate-400">{option.description}</span>}
              </span>
            </label>
          ))}
          </div>
        )}
      </div>
    </FormField>
  );
}

export default function Suppliers() {
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [quickCreate, setQuickCreate] = useState(null);
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);
  const [quickCategoryForm, setQuickCategoryForm] = useState({ name: '', description: '' });
  const [quickProductForm, setQuickProductForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    sellingPrice: '',
    initialStock: '0',
    batchNumber: '',
    purchasePrice: '',
    expiryDate: '',
    unit: 'piece'
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Forms
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    categories: [],
    products: [],
    paymentTerms: 'Immediate',
    balanceDue: '0'
  });

  const [editFormData, setEditFormData] = useState({
    id: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    categories: [],
    products: [],
    paymentTerms: 'Immediate',
    balanceDue: '0',
    status: 'Active'
  });

  // Supplier History State
  const [selectedSupplierProfile, setSelectedSupplierProfile] = useState(null);
  const [supplierPOs, setSupplierPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierService.getAll({ limit: 100 });
      setSuppliers(res?.data || []);
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to load suppliers from database', 'error');
    } finally {
      setLoading(false);
    }

    try {
      const historyRes = await purchaseService.getAll({ limit: 100 });
      setPurchaseHistory(historyRes?.data || []);
    } catch (err) {
      setPurchaseHistory([]);
      addToast(err?.message || 'Could not load supplier purchase history', 'warning');
    }
  }, [addToast]);

  const loadCatalog = useCallback(async () => {
    try {
      setLoadingCatalog(true);
      setCatalogError('');
      const [categoryRes, firstProductRes] = await Promise.all([
        categoryService.getAll(),
        productService.getAll({ page: 1, limit: 100 })
      ]);
      const totalPages = firstProductRes.meta?.totalPages || 1;
      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          productService.getAll({ page: index + 2, limit: 100 })
        )
      );
      setCategories(categoryRes.data || []);
      setProducts([
        ...(firstProductRes.data || []),
        ...remainingPages.flatMap((response) => response.data || [])
      ]);
    } catch (err) {
      setCatalogError('Could not load categories and products. Refresh and try again.');
      addToast(err?.response?.data?.message || 'Failed to load category and product options', 'error');
    } finally {
      setLoadingCatalog(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadSuppliers();
    loadCatalog();
  }, [loadSuppliers, loadCatalog]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim() || !formData.phone.trim()) {
      addToast('Company name and phone number are required', 'warning');
      return;
    }
    try {
      await supplierService.create({
        ...formData,
        balanceDue: Number(formData.balanceDue) || 0
      });
      addToast(`Supplier "${formData.companyName}" registered successfully`, 'success');
      setIsAddModalOpen(false);
      setFormData({
        companyName: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        categories: [],
        products: [],
        paymentTerms: 'Immediate',
        balanceDue: '0'
      });
      loadSuppliers();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to register supplier', 'error');
    }
  };

  const handleOpenEdit = (s) => {
    setEditFormData({
      id: s._id,
      companyName: s.companyName,
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      gstin: s.gstin || '',
      categories: getSupplierCategoryIds(s),
      products: (s.products || []).map(getId),
      paymentTerms: s.paymentTerms || 'Immediate',
      balanceDue: s.balanceDue || '0',
      status: s.status || 'Active'
    });
    setIsEditModalOpen(true);
  };

  const getSupplierCategoryIds = (supplier) => {
    const linked = (supplier.categories || []).map(getId);
    if (linked.length) return linked;
    const legacyNames = (supplier.category || '').split(',').map((name) => name.trim().toLowerCase());
    return categories.filter((category) => legacyNames.includes(category.name.toLowerCase())).map((category) => category._id);
  };

  const getProductsSupplied = (supplier) => {
    const linkedProducts = (supplier.products || []).filter((product) => product && typeof product === 'object');
    const supplierName = supplier.companyName?.trim().toLowerCase();
    const receiptProducts = purchaseHistory
      .filter((purchase) => {
        const purchaseSupplierId = getId(purchase.supplier)?.toString();
        const purchaseSupplierName = (purchase.supplierName || purchase.supplier?.companyName || '')
          .trim()
          .toLowerCase();
        return purchaseSupplierId === supplier._id.toString() || purchaseSupplierName === supplierName;
      })
      .flatMap((purchase) =>
        (purchase.items || []).map((item) => ({
          _id: getId(item.product) || `${item.name}-${item.sku}`,
          name: item.name || item.product?.name,
          sku: item.sku || item.product?.sku || ''
        }))
      )
      .filter((product) => product.name);
    const historicalProducts = [...(supplier.historicalProducts || []), ...receiptProducts];
    const knownProducts = new Map();
    for (const product of [...linkedProducts, ...historicalProducts]) {
      const productId = getId(product)?.toString() || `${product.name}-${product.sku}`;
      if (product.name) knownProducts.set(productId, product);
    }
    if (knownProducts.size > 0) return [...knownProducts.values()];

    const categoryIds = getSupplierCategoryIds(supplier);
    if (categoryIds.length === 0) return [];
    return products.filter((product) => categoryIds.includes(getId(product.category)));
  };

  const toggleCategory = (setData, categoryId) => {
    setData((current) => {
      const categories = current.categories.includes(categoryId)
        ? current.categories.filter((id) => id !== categoryId)
        : [...current.categories, categoryId];
      const products = current.products.filter((productId) => {
        const product = productsCatalog.find((item) => item._id === productId);
        const productCategoryId = getId(product?.category);
        return !productCategoryId || categories.includes(productCategoryId);
      });
      return { ...current, categories, products };
    });
  };

  const toggleProduct = (setData, productId) => {
    const product = productsCatalog.find((item) => item._id === productId);
    const categoryId = getId(product?.category);
    setData((current) => {
      const products = current.products.includes(productId)
        ? current.products.filter((id) => id !== productId)
        : [...current.products, productId];
      const categories = categoryId && !current.categories.includes(categoryId)
        ? [...current.categories, categoryId]
        : current.categories;
      return { ...current, categories, products };
    });
  };

  const openQuickCreate = (type, target) => {
    const targetData = target === 'add' ? formData : editFormData;
    setQuickCreate({ type, target });
    setQuickCategoryForm({ name: '', description: '' });
    setQuickProductForm({
      name: '',
      sku: '',
      barcode: '',
      category: targetData.categories[0] || categories[0]?._id || '',
      sellingPrice: '',
      initialStock: '0',
      batchNumber: '',
      purchasePrice: '',
      expiryDate: '',
      unit: 'piece'
    });
  };

  const handleQuickCategoryCreate = async () => {
    const name = quickCategoryForm.name.trim();
    if (name.length < 2) {
      addToast('Category name must be at least 2 characters', 'warning');
      return;
    }

    setQuickCreateLoading(true);
    try {
      const response = await categoryService.create({
        name,
        description: quickCategoryForm.description.trim()
      });
      const category = response.data;
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)));
      const setData = quickCreate.target === 'add' ? setFormData : setEditFormData;
      setData((current) => ({
        ...current,
        categories: [...new Set([...current.categories, category._id])]
      }));
      setQuickCreate(null);
      addToast(`Category "${category.name}" created and selected`, 'success');
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to create category', 'error');
    } finally {
      setQuickCreateLoading(false);
    }
  };

  const handleQuickProductCreate = async () => {
    const name = quickProductForm.name.trim();
    const sku = quickProductForm.sku.trim().toUpperCase();
    const sellingPrice = Number(quickProductForm.sellingPrice);
    const initialStock = Number(quickProductForm.initialStock);
    if (name.length < 2 || !sku || !quickProductForm.category || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      addToast('Enter a product name, SKU, category and selling price greater than 0', 'warning');
      return;
    }
    if (!Number.isInteger(initialStock) || initialStock < 0) {
      addToast('Initial stock must be a whole number of 0 or greater', 'warning');
      return;
    }
    if (initialStock > 0) {
      const purchasePrice = Number(quickProductForm.purchasePrice);
      if (!quickProductForm.batchNumber.trim()) {
        addToast('Enter a batch number when receiving initial stock', 'warning');
        return;
      }
      if (quickProductForm.purchasePrice.trim() === '' || !Number.isFinite(purchasePrice) || purchasePrice < 0) {
        addToast('Enter a valid purchase/cost price for initial stock', 'warning');
        return;
      }
      if (!quickProductForm.expiryDate || quickProductForm.expiryDate <= getLocalDateInputValue()) {
        addToast('Initial stock expiry date must be after today', 'warning');
        return;
      }
    }

    setQuickCreateLoading(true);
    try {
      const response = await productService.create({
        name,
        sku,
        barcode: quickProductForm.barcode.trim(),
        category: quickProductForm.category,
        sellingPrice,
        initialStock: 0,
        unit: quickProductForm.unit
      });
      const product = response.data;
      const categoryId = getId(product.category) || quickProductForm.category;
      setProducts((current) => [product, ...current.filter((item) => item._id !== product._id)]);
      const setData = quickCreate.target === 'add' ? setFormData : setEditFormData;
      setData((current) => ({
        ...current,
        categories: [...new Set([...current.categories, categoryId])],
        products: [...new Set([...current.products, product._id])]
      }));
      setQuickCreate(null);
      if (initialStock > 0) {
        try {
          await inventoryService.receiveStock({
            productId: product._id,
            batchNumber: quickProductForm.batchNumber.trim().toUpperCase(),
            purchasePrice: Number(quickProductForm.purchasePrice),
            quantity: initialStock,
            expiryDate: quickProductForm.expiryDate,
            reason: `Initial stock received for product ${sku}`,
            reference: 'SUPPLIER-PRODUCT'
          });
          addToast(`Product "${product.name}" created and ${initialStock} initial units received`, 'success');
        } catch (stockError) {
          addToast(
            `Product "${product.name}" was created and linked, but its stock receipt failed: ${stockError.message || 'Inventory API error'}. Retry from Inventory.`,
            'error',
            7000
          );
        }
      } else {
        addToast(`Product "${product.name}" created, categorized and selected`, 'success');
      }
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to create product', 'error');
    } finally {
      setQuickCreateLoading(false);
    }
  };

  const renderQuickCreatePanel = (target) => {
    if (!quickCreate || quickCreate.target !== target) return null;

    return (
      <div
        className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-3"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.target.tagName === 'INPUT') event.preventDefault();
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800">
            {quickCreate.type === 'category' ? 'Add Category' : 'Add Product'}
          </div>
          <button type="button" onClick={() => setQuickCreate(null)} className="text-xs text-slate-500 hover:text-slate-800">
            Cancel
          </button>
        </div>
        {quickCreate.type === 'category' ? (
          <>
            <FormField label="Category Name" required>
              <Input
                value={quickCategoryForm.name}
                onChange={(event) => setQuickCategoryForm({ ...quickCategoryForm, name: event.target.value })}
                placeholder="e.g. Dairy"
                maxLength={50}
              />
            </FormField>
            <FormField label="Description">
              <Input
                value={quickCategoryForm.description}
                onChange={(event) => setQuickCategoryForm({ ...quickCategoryForm, description: event.target.value })}
                placeholder="Optional"
                maxLength={200}
              />
            </FormField>
            <Button type="button" variant="primary" loading={quickCreateLoading} onClick={handleQuickCategoryCreate}>
              Save Category
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Product Name" required>
                <Input
                  value={quickProductForm.name}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, name: event.target.value })}
                  placeholder="Product name"
                  maxLength={100}
                />
              </FormField>
              <FormField label="SKU" required>
                <Input
                  value={quickProductForm.sku}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, sku: event.target.value.toUpperCase() })}
                  placeholder="e.g. DAIRY-001"
                  maxLength={20}
                />
              </FormField>
              <FormField label="Category" required>
                <Select
                  value={quickProductForm.category}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, category: event.target.value })}
                  options={categories.map((category) => ({ value: category._id, label: category.name }))}
                  placeholder={categories.length ? 'Select category...' : 'Create a category first'}
                  disabled={categories.length === 0}
                />
              </FormField>
              <FormField label="Selling Price (₹)" required>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quickProductForm.sellingPrice}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, sellingPrice: event.target.value })}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label="Initial Stock (Units)">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={quickProductForm.initialStock}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, initialStock: event.target.value })}
                  placeholder="0"
                  disabled={quickCreateLoading}
                />
              </FormField>
              <FormField label="Batch Number" helperText="Required when initial stock is greater than 0">
                <Input
                  value={quickProductForm.batchNumber}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, batchNumber: event.target.value.toUpperCase() })}
                  placeholder="e.g. B105"
                  disabled={quickCreateLoading}
                />
              </FormField>
              <FormField label="Purchase / Cost Price (₹)" helperText="Required when initial stock is greater than 0">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickProductForm.purchasePrice}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, purchasePrice: event.target.value })}
                  placeholder="0.00"
                  disabled={quickCreateLoading}
                />
              </FormField>
              <FormField label="Expiry Date" helperText="Required when initial stock is greater than 0">
                <Input
                  type="date"
                  min={getLocalDateInputValue()}
                  value={quickProductForm.expiryDate}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, expiryDate: event.target.value })}
                  disabled={quickCreateLoading}
                />
              </FormField>
              <FormField label="Barcode">
                <Input
                  value={quickProductForm.barcode}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, barcode: event.target.value })}
                  placeholder="Optional"
                  maxLength={64}
                />
              </FormField>
              <FormField label="Unit" required>
                <Select
                  value={quickProductForm.unit}
                  onChange={(event) => setQuickProductForm({ ...quickProductForm, unit: event.target.value })}
                  options={['packet', 'pack', 'kg', 'g', 'can', 'bottle', 'bar', 'tube', 'bag', 'piece', 'loaf'].map((unit) => ({
                    value: unit,
                    label: unit
                  }))}
                  placeholder=""
                />
              </FormField>
            </div>
            <Button type="button" variant="primary" loading={quickCreateLoading} onClick={handleQuickProductCreate}>
              Save Product
            </Button>
          </>
        )}
      </div>
    );
  };

  const productsCatalog = products;
  const categoryOptions = categories.map((category) => ({
    id: category._id,
    label: category.name,
    description: [category.description, category.status === 'Inactive' ? 'Inactive' : ''].filter(Boolean).join(' | ')
  }));
  const productOptions = products.map((product) => ({
    id: product._id,
    label: `${product.name} (${product.sku})`,
    description: product.category?.name || 'Uncategorized'
  }));

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.companyName.trim()) return;
    try {
      await supplierService.update(editFormData.id, {
        ...editFormData,
        balanceDue: Number(editFormData.balanceDue) || 0
      });
      addToast('Supplier profile updated successfully', 'success');
      setIsEditModalOpen(false);
      loadSuppliers();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to update supplier', 'error');
    }
  };

  const handleViewSupplier = async (s) => {
    setSelectedSupplierProfile(s);
    setIsHistoryModalOpen(true);
    try {
      setLoadingPOs(true);
      const res = await supplierService.getById(s._id);
      setSelectedSupplierProfile(res?.data?.supplier || s);
      setSupplierPOs(res?.data?.purchases || []);
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to load supplier purchase history', 'error');
    } finally {
      setLoadingPOs(false);
    }
  };

  const filtered = useMemo(() => {
    return suppliers.filter(
      (s) =>
        s.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.categories || []).some((category) => category.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.products || []).some((product) => product.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.historicalProducts || []).some((product) => product.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [suppliers, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Suppliers & Vendors</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Procurement
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage FMCG manufacturers, distributors, procurement history and credit terms
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSuppliers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Supplier</span>
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
            placeholder="Search suppliers by company, person or phone..."
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
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Products Supplied</th>
                <th className="py-3 px-4 text-center">Payment Terms</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading suppliers from MongoDB...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No suppliers found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{s.companyName}</div>
                      <div className="text-[10px] text-slate-400">{s.gstin ? `GST: ${s.gstin}` : 'GST: N/A'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{s.contactPerson || '---'}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{s.phone}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {(s.categories || []).length
                        ? s.categories.map((category) => category.name).join(', ')
                        : s.category || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {getProductsSupplied(s).length
                        ? (
                          <div className="flex flex-wrap gap-1">
                            {getProductsSupplied(s).slice(0, 3).map((product) => (
                              <span key={getId(product)} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">
                                {product.name}
                              </span>
                            ))}
                            {getProductsSupplied(s).length > 3 && (
                              <span className="text-[10px] text-slate-500">
                                +{getProductsSupplied(s).length - 3} more
                              </span>
                            )}
                          </div>
                        )
                        : <span className="text-[10px] text-slate-400">No products linked</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.paymentTerms}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      ₹ {s.balanceDue ? s.balanceDue.toFixed(2) : '0.00'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewSupplier(s)}
                          className="w-7 h-7 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center transition-colors"
                          title="View Profile & Inward Receipts"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="w-7 h-7 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center justify-center transition-colors"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add FMCG Supplier"
        subtitle="Register vendor for purchasing and stock inward receipts"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={quickCreateLoading} onClick={handleAdd}>
              Save Supplier
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-3">
          <FormField label="Company Name" required>
            <Input
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Nestlé India Ltd"
              autoFocus
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Contact Person">
              <Input
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Rajat Kapoor"
              />
            </FormField>
            <FormField label="Phone" required>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98000 00000"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email Address">
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="supply@vendor.com"
              />
            </FormField>
            <FormField label="GSTIN Number">
              <Input
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="07AAAAA0000A1Z5"
              />
            </FormField>
          </div>
          <FormField label="Address">
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Supplier address"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <ReferencePicker
                label="Categories Supplied"
                options={categoryOptions}
                selectedIds={formData.categories}
                onToggle={(id) => toggleCategory(setFormData, id)}
                emptyMessage={loadingCatalog ? 'Loading categories...' : 'No categories found.'}
              />
              <button
                type="button"
                onClick={() => openQuickCreate('category', 'add')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                + Add category
              </button>
            </div>
            <FormField label="Payment Terms">
              <Select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                options={[
                  { value: 'Immediate', label: 'Immediate' },
                  { value: 'Net 15', label: 'Net 15 Days' },
                  { value: 'Net 30', label: 'Net 30 Days' },
                  { value: 'Net 45', label: 'Net 45 Days' },
                  { value: 'Cash on Delivery', label: 'Cash on Delivery' }
                ]}
              />
            </FormField>
          </div>
          <FormField label="Opening Balance Due (₹)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.balanceDue}
              onChange={(e) => setFormData({ ...formData, balanceDue: e.target.value })}
              placeholder="0.00"
            />
          </FormField>
          <div className="space-y-2">
            <ReferencePicker
              label="Products Supplied"
              options={productOptions}
              selectedIds={formData.products}
              onToggle={(id) => toggleProduct(setFormData, id)}
              emptyMessage={loadingCatalog ? 'Loading products...' : 'No products found.'}
            />
            <button
              type="button"
              onClick={() => openQuickCreate('product', 'add')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              + Add product
            </button>
          </div>
          {renderQuickCreatePanel('add')}
          {catalogError && (
            <div className="flex items-center justify-between gap-3 text-xs text-rose-600">
              <span>{catalogError}</span>
              <button type="button" onClick={loadCatalog} className="font-semibold underline">Retry</button>
            </div>
          )}
        </form>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Supplier Profile"
        subtitle={editFormData.companyName}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={quickCreateLoading} onClick={handleEditSubmit}>
              Update Supplier
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <FormField label="Company Name" required>
            <Input
              value={editFormData.companyName}
              onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Contact Person">
              <Input
                value={editFormData.contactPerson}
                onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
              />
            </FormField>
            <FormField label="Phone" required>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </FormField>
            <FormField label="Payment Terms">
              <Select
                value={editFormData.paymentTerms}
                onChange={(e) => setEditFormData({ ...editFormData, paymentTerms: e.target.value })}
                options={[
                  { value: 'Immediate', label: 'Immediate' },
                  { value: 'Net 15', label: 'Net 15' },
                  { value: 'Net 30', label: 'Net 30' },
                  { value: 'Net 45', label: 'Net 45' },
                  { value: 'Cash on Delivery', label: 'Cash on Delivery' }
                ]}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="GSTIN Number">
              <Input
                value={editFormData.gstin}
                onChange={(e) => setEditFormData({ ...editFormData, gstin: e.target.value })}
                placeholder="Optional"
              />
            </FormField>
            <FormField label="Balance Due (₹)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editFormData.balanceDue}
                onChange={(e) => setEditFormData({ ...editFormData, balanceDue: e.target.value })}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Address">
              <Input
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                placeholder="Supplier address"
              />
            </FormField>
            <FormField label="Status">
              <Select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' }
                ]}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <ReferencePicker
                label="Categories Supplied"
                options={categoryOptions}
                selectedIds={editFormData.categories}
                onToggle={(id) => toggleCategory(setEditFormData, id)}
                emptyMessage={loadingCatalog ? 'Loading categories...' : 'No categories found.'}
              />
              <button
                type="button"
                onClick={() => openQuickCreate('category', 'edit')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                + Add category
              </button>
            </div>
            <div className="space-y-2">
              <ReferencePicker
                label="Products Supplied"
                options={productOptions}
                selectedIds={editFormData.products}
                onToggle={(id) => toggleProduct(setEditFormData, id)}
                emptyMessage={loadingCatalog ? 'Loading products...' : 'No products found.'}
              />
              <button
                type="button"
                onClick={() => openQuickCreate('product', 'edit')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                + Add product
              </button>
            </div>
          </div>
          {renderQuickCreatePanel('edit')}
          {catalogError && (
            <div className="flex items-center justify-between gap-3 text-xs text-rose-600">
              <span>{catalogError}</span>
              <button type="button" onClick={loadCatalog} className="font-semibold underline">Retry</button>
            </div>
          )}
        </form>
      </Modal>

      {/* Supplier Profile & PO History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Supplier Profile & Procurement History"
        subtitle={selectedSupplierProfile?.companyName}
        footer={
          <Button variant="secondary" onClick={() => setIsHistoryModalOpen(false)}>
            Close
          </Button>
        }
      >
        {selectedSupplierProfile && (
          <div className="space-y-4">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 mb-1">Categories Supplied</div>
                  <div className="text-slate-600">
                    {(selectedSupplierProfile.categories || []).length
                      ? selectedSupplierProfile.categories.map((category) => category.name).join(', ')
                      : selectedSupplierProfile.category || 'No categories linked'}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-slate-900 mb-1">
                    Products Supplied ({getProductsSupplied(selectedSupplierProfile).length})
                  </div>
                  {getProductsSupplied(selectedSupplierProfile).length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {getProductsSupplied(selectedSupplierProfile).map((product) => (
                        <span key={getId(product)} className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                          {product.name} <span className="text-blue-500">({product.sku})</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500">No products linked.</div>
                  )}
                </div>
              </div>
            {/* Supplier Quick Details */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div>
                  <span className="text-slate-400">Contact:</span>{' '}
                  <strong className="text-slate-800">{selectedSupplierProfile.contactPerson}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Phone:</span>{' '}
                  <strong className="font-mono text-slate-800">{selectedSupplierProfile.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-400">GSTIN:</span>{' '}
                  <strong className="font-mono text-slate-800">{selectedSupplierProfile.gstin || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Terms:</span>{' '}
                  <strong className="text-slate-800">{selectedSupplierProfile.paymentTerms}</strong>
                </div>
              </div>
            </div>

            {/* Inward Purchase Orders List */}
            <div>
              <div className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Inward Stock Receipts ({supplierPOs.length})</span>
                <Truck className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {loadingPOs ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-500" />
                  Loading procurement records...
                </div>
              ) : supplierPOs.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-slate-200">
                  No inward stock orders recorded from this supplier yet.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {supplierPOs.map((po) => (
                    <div key={po._id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-mono font-bold text-slate-900">{po.poNumber}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(po.createdAt).toLocaleString()} | Ref: {po.invoiceReference || 'None'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          ₹ {Number(po.subtotal ?? Math.max(0, (po.grandTotal || 0) - (po.taxAmount || 0))).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          {po.totalQuantity} units received
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
