import React, { useState, useEffect, useMemo } from 'react';
import { customerService } from '../services/customerService';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { FormField, Input, Select, Button } from '../components/Form';
import {
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Eye,
  Receipt,
  UserCheck,
  Award,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';

export default function Customers() {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [editFormData, setEditFormData] = useState({ id: '', name: '', phone: '', email: '', tier: 'General' });

  // Customer Profile & Purchase History state
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerService.getAll({ limit: 100 });
      setCustomers(res?.data || []);
    } catch (error) {
      setCustomers([]);
      addToast(error.message || 'Failed to load customers from the API.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Customer name is required', 'warning');
      return;
    }
    try {
      const res = await customerService.create(formData);
      addToast(`Customer "${res.data.name}" registered successfully`, 'success');
      setIsAddModalOpen(false);
      setFormData({ name: '', phone: '', email: '' });
      loadCustomers();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to register customer', 'error');
    }
  };

  const handleOpenEdit = (c) => {
    setEditFormData({
      id: c._id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      tier: c.tier || 'General'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim()) return;
    try {
      await customerService.update(editFormData.id, editFormData);
      addToast(`Customer profile updated`, 'success');
      setIsEditModalOpen(false);
      loadCustomers();
    } catch (err) {
      addToast(err?.response?.data?.message || 'Failed to update customer', 'error');
    }
  };

  const handleViewHistory = async (c) => {
    setIsHistoryModalOpen(true);
    setHistoryCustomer(null);
    setCustomerInvoices([]);
    setLoadingHistory(true);
    try {
      const res = await customerService.getInvoices(c._id);
      if (!res?.data?.customer) {
        setCustomers((current) => current.filter((customer) => customer._id !== c._id));
        throw new Error('Customer record was not found in the API.');
      }
      setHistoryCustomer(res.data.customer);
      setCustomerInvoices(res?.data?.invoices || []);
    } catch (err) {
      setHistoryCustomer(null);
      setCustomerInvoices([]);
      if (err?.statusCode === 404) {
        setCustomers((current) => current.filter((customer) => customer._id !== c._id));
      }
      addToast(err?.message || 'Failed to load customer invoice history from the API.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Customer Directory & Loyalty</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live DB
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered customer profiles, purchase history, loyalty tiers & walk-in counter accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCustomers}
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
            <span>Add Customer</span>
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
            placeholder="Search by customer name, phone or email..."
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
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Loyalty Tier</th>
                <th className="py-3 px-4 text-center">Points</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading customers from MongoDB...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const isWalkIn = c.name.toLowerCase().includes('walk-in');
                  return (
                    <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{c.name}</span>
                          {isWalkIn && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-normal">
                              Default Walk-in
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">{c.phone || '---'}</td>
                      <td className="py-3.5 px-4 text-slate-500">{c.email || '---'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.tier === 'Platinum'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : c.tier === 'Gold'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : c.tier === 'Silver'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-blue-50 text-blue-600 border border-blue-200'
                          }`}
                        >
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">{c.loyaltyPoints || 0}</td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ₹ {c.totalSpent?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewHistory(c)}
                            className="w-7 h-7 rounded border border-blue-200 text-blue-600 hover:bg-blue-50 inline-flex items-center justify-center transition-colors"
                            title="View Purchase History & Invoices"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(c)}
                            disabled={isWalkIn}
                            className={`w-7 h-7 rounded border inline-flex items-center justify-center transition-colors ${
                              isWalkIn
                                ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                            title={isWalkIn ? 'Walk-in cannot be edited' : 'Edit Customer'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Customer"
        subtitle="Customer will be enrolled in supermarket loyalty program"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdd}>
              Save Customer
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-3">
          <FormField label="Full Name" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Chandra"
              autoFocus
            />
          </FormField>
          <FormField label="Mobile Number">
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 00000"
            />
          </FormField>
          <FormField label="Email Address">
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ramesh@example.com"
            />
          </FormField>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer Profile"
        subtitle={editFormData.name}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditSubmit}>
              Update Profile
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <FormField label="Full Name" required>
            <Input
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            />
          </FormField>
          <FormField label="Mobile Number">
            <Input
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Email Address">
            <Input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
          </FormField>
          <FormField label="Loyalty Tier">
            <Select
              value={editFormData.tier}
              onChange={(e) => setEditFormData({ ...editFormData, tier: e.target.value })}
              options={[
                { value: 'General', label: 'General' },
                { value: 'Silver', label: 'Silver' },
                { value: 'Gold', label: 'Gold' },
                { value: 'Platinum', label: 'Platinum' }
              ]}
            />
          </FormField>
        </form>
      </Modal>

      {/* Customer Purchase History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Customer Purchase History"
        subtitle={historyCustomer?.name}
        footer={
          <Button variant="secondary" onClick={() => setIsHistoryModalOpen(false)}>
            Close
          </Button>
        }
      >
        {loadingHistory ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-500" />
            Loading customer history from the API...
          </div>
        ) : !historyCustomer ? (
          <div role="alert" className="py-6 text-center text-slate-500 text-xs">
            Customer history could not be loaded from the API.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Profile Summary Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-slate-400 text-[11px]">Total Purchases</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">
                  ₹ {historyCustomer.totalSpent?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Loyalty Points</div>
                <div className="text-sm font-black text-blue-600 mt-0.5">
                  {historyCustomer.loyaltyPoints || 0} pts
                </div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Tier Status</div>
                <div className="text-sm font-black text-amber-600 mt-0.5">
                  {historyCustomer.tier}
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div>
              <div className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Invoices & Billing History ({customerInvoices.length})</span>
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {customerInvoices.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-slate-200">
                  No purchase invoices found for this customer yet.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {customerInvoices.map((inv) => (
                    <div key={inv._id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(inv.createdAt).toLocaleString()} | {inv.paymentMethod}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">₹ {inv.totalAmount?.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">
                          {inv.itemsCount} {inv.itemsCount === 1 ? 'item' : 'items'}
                          {inv.returnStatus !== 'None' && (
                            <span className="ml-1 text-rose-600 font-semibold">({inv.returnStatus} Return)</span>
                          )}
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
