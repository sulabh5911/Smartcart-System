import api from './api';

/**
 * Sale & POS API Service
 * Handles server-authoritative checkout, invoices, and sales audit history
 */
export const saleService = {
  // POST /api/sales/checkout
  checkout: async (saleData) => {
    return await api.post('/sales/checkout', saleData);
  },

  // GET /api/sales (params: page, limit, search, paymentMethod, startDate, endDate)
  getAll: async (params = {}) => {
    return await api.get('/sales', { params });
  },

  // GET /api/sales/invoice/:invoiceNumber
  getByInvoice: async (invoiceNumber) => {
    return await api.get(`/sales/invoice/${invoiceNumber}`);
  },

  // GET /api/sales/:id
  getById: async (id) => {
    return await api.get(`/sales/${id}`);
  }
};
