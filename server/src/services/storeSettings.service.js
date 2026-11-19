import { storeSettingsRepository } from '../repositories/storeSettings.repository.js';
import { ApiError } from '../utils/ApiError.js';

const TEXT_FIELDS = ['storeName', 'branch', 'gstin', 'phone', 'email', 'address', 'receiptFooter'];

export class StoreSettingsService {
  async get() {
    return await storeSettingsRepository.find();
  }

  async update(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw ApiError.badRequest('Store settings must be provided as an object.');
    }

    const settings = {};
    for (const field of TEXT_FIELDS) {
      if (data[field] !== undefined) {
        if (typeof data[field] !== 'string') {
          throw ApiError.badRequest(`${field} must be a string.`);
        }
        settings[field] = data[field].trim();
      }
    }

    if (!settings.storeName) {
      throw ApiError.badRequest('Store name is required.');
    }
    if (settings.storeName.length > 120) {
      throw ApiError.badRequest('Store name cannot exceed 120 characters.');
    }
    if (
      settings.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)
    ) {
      throw ApiError.badRequest('Enter a valid store email address.');
    }

    return await storeSettingsRepository.update(settings);
  }
}

export const storeSettingsService = new StoreSettingsService();
