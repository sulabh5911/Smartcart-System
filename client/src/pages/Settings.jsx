import React, { useEffect, useState } from 'react';
import { storeSettingsService } from '../services/storeSettingsService';
import { useToast } from '../context/ToastContext';
import { FormField, Input, Textarea, Button } from '../components/Form';
import { Save, Store, Receipt } from 'lucide-react';

const EMPTY_SETTINGS = {
  storeName: '',
  branch: '',
  gstin: '',
  phone: '',
  email: '',
  address: '',
  receiptFooter: ''
};

function getSettingsFormData(settings = {}) {
  return Object.fromEntries(
    Object.keys(EMPTY_SETTINGS).map((field) => [field, settings[field] || ''])
  );
}

export default function Settings() {
  const { addToast } = useToast();
  const [formData, setFormData] = useState(EMPTY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    storeSettingsService
      .get()
      .then((response) => {
        if (active) {
          setFormData(getSettingsFormData(response?.data || {}));
        }
      })
      .catch((error) => {
        if (active) setLoadFailed(true);
        addToast(error.message || 'Failed to load store settings from the API.', 'error');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [addToast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const response = await storeSettingsService.update(formData);
      setFormData(getSettingsFormData(response?.data || {}));
      addToast('Store settings saved successfully.', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to save store settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Configure store details and POS preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isLoading && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
            Loading store settings from the API...
          </div>
        )}
        {loadFailed && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            Store settings could not be loaded. Reconnect to the API and reload this page before editing.
          </div>
        )}
        {/* Store Profile */}
        <fieldset
          disabled={isLoading || isSaving || loadFailed}
          className="space-y-4 disabled:opacity-70"
        >
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
            <h3 className="font-bold text-slate-900 text-sm">Receipt Parameters</h3>
          </div>

          <FormField label="Receipt Footer Message">
            <Input
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
            />
          </FormField>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon={Save} disabled={isLoading || isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
        </fieldset>
      </form>
    </div>
  );
}
