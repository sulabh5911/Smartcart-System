import React, { useState } from 'react';
import { useMockData } from '../context/MockDataContext';
import { useToast } from '../context/ToastContext';
import { FormField, Input, Textarea, Button } from '../components/Form';
import { Save, Store, Receipt } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings } = useMockData();
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    storeName: settings.storeName || '',
    branch: settings.branch || '',
    gstin: settings.gstin || '',
    phone: settings.phone || '',
    email: settings.email || '',
    address: settings.address || '',
    defaultGstRate: String(settings.defaultGstRate || '5'),
    receiptFooter: settings.receiptFooter || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings({
      ...formData,
      defaultGstRate: Number(formData.defaultGstRate)
    });
    addToast('Store configuration saved successfully', 'success');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Configure store details and POS preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Store Profile */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Store className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Store Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Store Name" required>
              <Input
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              />
            </FormField>

            <FormField label="Branch / Outlet">
              <Input
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="GSTIN">
              <Input
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              />
            </FormField>

            <FormField label="Phone">
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </FormField>

            <FormField label="Email">
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Store Address">
            <Textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </FormField>
        </div>

        {/* Billing Parameters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Billing & Receipt Parameters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Default GST Rate (%)">
              <Input
                type="number"
                value={formData.defaultGstRate}
                onChange={(e) => setFormData({ ...formData, defaultGstRate: e.target.value })}
              />
            </FormField>

            <FormField label="Receipt Footer Message">
              <Input
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              />
            </FormField>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon={Save}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
