import React, { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { FormField, Input, Select, Button } from '../components/Form';
import {
  Download,
  Upload,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Inbox
} from 'lucide-react';

export default function Products() {
  const { addToast } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, total: 0, totalPages: 1 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    sellingPrice: '',
    initialStock: '',
    unit: 'packet',
    description: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // 1. Fetch categories for filters and modal dropdowns
  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryService.getAll();
      setCategories(res.data || []);
      if (!formData.category && res.data?.length > 0) {
        setFormData((prev) => ({ ...prev, category: res.data[0]._id }));
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, [formData.category]);

  // 2. Fetch products from real Express + MongoDB backend
  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getAll({
        page,
        limit: 8,
        search: searchTerm,
        category: selectedCategory,
        status: selectedStatus
      });

      setProducts(res.data || []);
      if (res.meta) {
        setPagination(res.meta);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch products from MongoDB backend.');
      addToast(err.message || 'Server connection error', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedStatus, addToast]);

  // Initial load
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      category: categories[0]?._id || '',
      sellingPrice: '',
      initialStock: '',
      unit: 'packet',
      description: ''
    });
    setFormErrors({});
    setEditingProduct(null);
  };

  const openAddModal = () => {
    resetForm();
    if (categories.length > 0) {
      setFormData((prev) => ({ ...prev, category: categories[0]._id }));
    }
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      category: p.category?._id || p.category || '',
      sellingPrice: String(p.sellingPrice || p.price || ''),
      initialStock: String(p.stock || 0),
      unit: p.unit || 'packet',
      description: p.description || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Product name is required';
    if (!formData.sku.trim()) errs.sku = 'SKU is required';
    if (!formData.category) errs.category = 'Category selection is required';

    const price = Number(formData.sellingPrice);
    if (!formData.sellingPrice || isNaN(price) || price <= 0) {
      errs.sellingPrice = 'Valid price > 0 required';
    }

    if (!editingProduct && formData.initialStock !== '') {
      const stock = Number(formData.initialStock);
      if (isNaN(stock) || stock < 0) {
        errs.initialStock = 'Stock must be 0 or greater';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        // PATCH /api/products/:id
        const res = await productService.update(editingProduct._id, {
          name: formData.name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          barcode: formData.barcode.trim(),
          category: formData.category,
          sellingPrice: Number(formData.sellingPrice),
          unit: formData.unit,
          description: formData.description.trim()
        });
        addToast(res.message || `Updated product "${formData.name}" in MongoDB`, 'success');
      } else {
        // POST /api/products
        const res = await productService.create({
          name: formData.name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          barcode: formData.barcode.trim(),
          category: formData.category,
          sellingPrice: Number(formData.sellingPrice),
          initialStock: Number(formData.initialStock) || 0,
          unit: formData.unit,
          description: formData.description.trim()
        });
        addToast(res.message || `Created product "${formData.name}" in MongoDB`, 'success');
      }

      setIsModalOpen(false);
      resetForm();
      await fetchProducts(pagination.page);
    } catch (err) {
      // Backend error response handling
      if (err.errors && err.errors.length > 0) {
        const msg = err.errors.join(', ');
        if (msg.toLowerCase().includes('sku')) {
          setFormErrors({ sku: msg });
        } else {
          setFormErrors({ general: msg });
        }
      }
      addToast(err.message || 'Error saving product to MongoDB', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Archive "${p.name}" (SKU: ${p.sku})?\n\nThis will soft-delete the product from the active catalog while safely preserving all batch history and sales audit logs.`)) return;

    try {
      const res = await productService.delete(p._id);
      addToast(res.message || `Archived "${p.name}". Audit history preserved.`, 'success');
      await fetchProducts(pagination.page);
    } catch (err) {
      addToast(err.message || 'Failed to archive product', 'error');
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(products.map((p) => p._id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Products</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              MongoDB Live
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage your supermarket inventory catalog and stock</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchProducts(pagination.page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            title="Refresh from MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => addToast('Exporting active products catalog to CSV...', 'info')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            id="btn-add-product"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Backend Offline / Connection Error Alert */}
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
            onClick={() => fetchProducts(1)}
            className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] font-semibold hover:bg-rose-700 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, SKU or barcode in MongoDB..."
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
            <option value="">All Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="Archived">Archived (Soft-Deleted)</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[380px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-8">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    onChange={toggleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === products.length}
                  />
                </th>
                <th className="py-3 px-3 w-14">Image</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Price (₹)</th>
                <th className="py-3 px-4 text-center">Live Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Loading Skeleton */}
              {loading && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <tr key={`prod-skel-${i}`} className="animate-pulse">
                      <td className="py-4 px-3"><div className="w-4 h-4 bg-slate-200 rounded"></div></td>
                      <td className="py-4 px-3"><div className="w-10 h-10 bg-slate-200 rounded-lg"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-14 ml-auto"></div></td>
                      <td className="py-4 px-4 text-center"><div className="h-4 bg-slate-200 rounded w-12 mx-auto"></div></td>
                      <td className="py-4 px-4 text-center"><div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-14 ml-auto"></div></td>
                    </tr>
                  ))}
                </>
              )}

              {/* Empty State */}
              {!loading && !error && products.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="w-8 h-8 opacity-40" />
                      <p className="text-xs font-medium">
                        {searchTerm || selectedCategory || selectedStatus
                          ? 'No products matched your search or filters.'
                          : 'No products found in MongoDB. Click "+ Add Product" to create one.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!loading &&
                !error &&
                products.map((p) => {
                  const isSelected = selectedIds.includes(p._id);
                  const price = p.sellingPrice ?? p.price ?? 0;
                  const categoryName = p.category?.name || p.category || 'General';

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(p._id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 bg-slate-50"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&auto=format&fit=crop&q=80';
                          }}
                        />
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{p.sku}</td>
                      <td className="py-3 px-4 text-slate-600">{categoryName}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {Number(price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-800">
                        {p.stock ?? 0} {p.unit || 'packets'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'In Stock'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : p.status === 'Low Stock'
                              ? 'bg-amber-50 text-amber-600 border border-amber-200'
                              : 'bg-rose-50 text-rose-600 border border-rose-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="w-7 h-7 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
                            title="Edit Product in MongoDB"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="w-7 h-7 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                            title="Delete Product from MongoDB"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar */}
        {!loading && !error && pagination.total > 0 && (
          <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              Showing <strong className="text-slate-800">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
              <strong className="text-slate-800">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong> of{' '}
              <strong className="text-slate-800">{pagination.total}</strong> products in MongoDB
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchProducts(pagination.page - 1)}
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
                    onClick={() => fetchProducts(pageNum)}
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
                onClick={() => fetchProducts(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Supermarket Product'}
        subtitle={editingProduct ? `Updating ID: ${editingProduct._id}` : 'Product & initial batch will be saved to MongoDB'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleFormSubmit} loading={isSubmitting}>
              {editingProduct ? 'Save Changes' : 'Create in MongoDB'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-3">
          {formErrors.general && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-600">
              {formErrors.general}
            </div>
          )}

          <FormField label="Product Name" required error={formErrors.name}>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Amul Milk"
              error={!!formErrors.name}
              disabled={isSubmitting}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="SKU (Unique)" required error={formErrors.sku}>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="SKU010"
                error={!!formErrors.sku}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="Category" required error={formErrors.category}>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={categories.map((c) => ({ value: c._id, label: c.name }))}
                disabled={isSubmitting}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Selling Price (₹)" required error={formErrors.sellingPrice}>
              <Input
                type="number"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="60.00"
                error={!!formErrors.sellingPrice}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="Barcode (Optional)">
              <Input
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="890123456010"
                disabled={isSubmitting}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!editingProduct && (
              <FormField label="Initial Batch Stock (Units)" error={formErrors.initialStock}>
                <Input
                  type="number"
                  value={formData.initialStock}
                  onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                  placeholder="50"
                  error={!!formErrors.initialStock}
                  disabled={isSubmitting}
                />
              </FormField>
            )}

            <FormField label="Unit of Measurement">
              <Select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                options={[
                  { value: 'packet', label: 'packet' },
                  { value: 'pack', label: 'pack' },
                  { value: 'can', label: 'can' },
                  { value: 'bottle', label: 'bottle' },
                  { value: 'bar', label: 'bar' },
                  { value: 'tube', label: 'tube' },
                  { value: 'bag', label: 'bag' },
                  { value: 'kg', label: 'kg' }
                ]}
                disabled={isSubmitting}
              />
            </FormField>
          </div>

          <FormField label="Description">
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. 1L Toned Milk Fresh Pack"
              disabled={isSubmitting}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
