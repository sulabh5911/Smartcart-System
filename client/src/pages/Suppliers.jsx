import React, { useState, useEffect, useMemo } from 'react';
import { supplierService } from '../services/supplierService';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { FormField, Input, Select, Button } from '../components/Form';
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Eye,
  Building2,
  Phone,
  Mail,
  FileText,
  Truck
} from 'lucide-react';

export default function Suppliers() {
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
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
    category: 'General FMCG',
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
    category: 'General FMCG',
    paymentTerms: 'Immediate',
    balanceDue: '0',
    status: 'Active'
  });

  // Supplier History State
  const [selectedSupplierProfile, setSelectedSupplierProfile] = useState(null);
  const [supplierPOs, setSupplierPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await supplierService.getAll({ limit: 100 });
      setSuppliers(res?.data || []);
    } catch (err) {
      addToast('Failed to load suppliers from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

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
        category: 'General FMCG',
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
      category: s.category || 'General FMCG',
      paymentTerms: s.paymentTerms || 'Immediate',
      balanceDue: s.balanceDue || '0',
      status: s.status || 'Active'
    });
    setIsEditModalOpen(true);
  };

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
      setSupplierPOs(res?.data?.purchases || []);
    } catch (err) {
      addToast('Failed to load supplier purchase history', 'error');
    } finally {
      setLoadingPOs(false);
    }
  };

  const filtered = useMemo(() => {
    return suppliers.filter(
      (s) =>
        s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()))
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
                <th className="py-3 px-4 text-center">Payment Terms</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading suppliers from MongoDB...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
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
                    <td className="py-3.5 px-4 text-slate-600">{s.category}</td>
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
            <Button variant="primary" onClick={handleAdd}>
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
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Dairy Products"
              />
            </FormField>
            <FormField label="Payment Terms">
              <Select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                options={[
                  { value: 'Immediate', label: 'Immediate' },
                  { value: 'Net 15', label: 'Net 15 Days' },
                  { value: 'Net 30', label: 'Net 30 Days' },
                  { value: 'Cash on Delivery', label: 'Cash on Delivery' }
                ]}
              />
            </FormField>
          </div>
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
            <Button variant="primary" onClick={handleEditSubmit}>
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
                  { value: 'Cash on Delivery', label: 'Cash on Delivery' }
                ]}
              />
            </FormField>
          </div>
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
                        <div className="font-bold text-slate-900">₹ {po.grandTotal?.toFixed(2)}</div>
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
