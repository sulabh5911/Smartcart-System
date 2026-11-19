import api from './api';

export const storeSettingsService = {
  get: async () => await api.get('/settings'),
  update: async (settings) => await api.put('/settings', settings)
};
