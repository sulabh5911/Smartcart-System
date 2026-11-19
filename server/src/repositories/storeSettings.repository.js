import { StoreSettings } from '../models/StoreSettings.js';

export class StoreSettingsRepository {
  async find() {
    return await StoreSettings.findOne({ key: 'store' }).lean();
  }

  async update(settings) {
    return await StoreSettings.findOneAndUpdate(
      { key: 'store' },
      { $set: settings, $setOnInsert: { key: 'store' } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();
  }
}

export const storeSettingsRepository = new StoreSettingsRepository();
