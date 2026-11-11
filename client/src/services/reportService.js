import api from './api';

/**
 * Report & Analytics API Service
 * Handles MongoDB aggregation queries, date range filters, and CSV export downloads
 */
export const reportService = {
  // GET /api/reports/dashboard
  getDashboardMetrics: async () => {
    return await api.get('/reports/dashboard');
  },

  // GET /api/reports/analytics (query: preset, startDate, endDate)
  getAnalytics: async (params = {}) => {
    return await api.get('/reports/analytics', { params });
  },

  // Download CSV report directly
  downloadCSV: async (type = 'sales', params = {}) => {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const queryParams = new URLSearchParams({ type, ...params }).toString();
    const downloadUrl = `${baseURL}/reports/export/csv?${queryParams}`;

    // Create an anchor and trigger browser download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `SmartMartPro_${type}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
