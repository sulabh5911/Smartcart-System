import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { categoryService } from '../services/categoryService';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { FormField, Input, Textarea, Button } from '../components/Form';
import { Plus, Search, Edit2, Trash2, RefreshCw, AlertCircle, Inbox } from 'lucide-react';

export default function Categories() {
  const { addToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({ name: '', description: '', color: '#3b82f6' });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch categories from real MongoDB backend
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await categoryService.getAll();
      // response is ApiResponse: { success: true, data: [...] }
      setCategories(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch categories from Express backend.');
      addToast(err.message || 'Cannot connect to backend server', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Form handling
  const resetForm = () => {
    setFormData({ name: '', description: '', color: '#3b82f6' });
    setFormErrors({});
    setEditingCategory(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      color: cat.color || '#3b82f6'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Category name is required';
    else if (formData.name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        // PATCH /api/categories/:id
        const res = await categoryService.update(editingCategory._id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color
        });
        addToast(res.message || `Updated category "${formData.name}"`, 'success');
      } else {
        // POST /api/categories
        const res = await categoryService.create({
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color
        });
        addToast(res.message || `Created category "${formData.name}"`, 'success');
      }

      setIsModalOpen(false);
      resetForm();
      // Refresh list from MongoDB
      await fetchCategories();
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        setFormErrors({ name: err.errors.join(', ') });
      }
      addToast(err.message || 'Error saving category to database', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}" from MongoDB?`)) return;

    try {
      const res = await categoryService.delete(cat._id);
      addToast(res.message || `Deleted category "${cat.name}"`, 'success');
      // Refresh list
      await fetchCategories();
    } catch (err) {
      addToast(err.message || 'Failed to delete category', 'error');
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [categories, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Categories</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              MongoDB Live
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage supermarket departments and item groupings</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            title="Refresh from MongoDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-add-category"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Server Offline / Error Alert */}
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
            onClick={fetchCategories}
            className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] font-semibold hover:bg-rose-700 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
        <div className="relative w-80 max-w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories in MongoDB..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total Categories: <strong className="text-slate-800">{categories.length}</strong>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[360px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Product Count</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Loading Skeleton */}
              {loading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={`cat-skel-${i}`} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-48"></div></td>
                      <td className="py-4 px-4 text-center"><div className="h-4 bg-slate-200 rounded w-10 mx-auto"></div></td>
                      <td className="py-4 px-4 text-center"><div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-200 rounded w-14 ml-auto"></div></td>
                    </tr>
                  ))}
                </>
              )}

              {/* Empty State */}
              {!loading && !error && filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="w-8 h-8 opacity-40" />
                      <p className="text-xs font-medium">
                        {searchTerm ? 'No categories matched your search term.' : 'No categories found in MongoDB database.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!loading &&
                !error &&
                filteredCategories.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.color || '#3b82f6' }}
                        ></span>
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{c.description || '---'}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {c.productCount ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {c.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="w-7 h-7 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
                          title="Edit Category in MongoDB"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="w-7 h-7 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                          title="Delete Category from MongoDB"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
        subtitle={editingCategory ? `Updating ID: ${editingCategory._id}` : 'Will be saved directly to MongoDB'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
              {editingCategory ? 'Save Changes' : 'Create in MongoDB'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="Category Name" required error={formErrors.name}>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Frozen Foods"
              error={!!formErrors.name}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Ice cream, frozen peas, ready-to-eat meals"
              disabled={isSubmitting}
            />
          </FormField>

          <FormField label="Accent Color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                disabled={isSubmitting}
              />
              <span className="font-mono text-xs text-slate-600">{formData.color}</span>
            </div>
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
