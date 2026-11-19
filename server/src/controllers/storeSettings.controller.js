import { storeSettingsService } from '../services/storeSettings.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export class StoreSettingsController {
  get = asyncHandler(async (_req, res) => {
    const settings = await storeSettingsService.get();
    return ApiResponse.success(res, settings, 'Store settings fetched successfully');
  });

  update = asyncHandler(async (req, res) => {
    const settings = await storeSettingsService.update(req.body);
    return ApiResponse.success(res, settings, 'Store settings saved successfully');
  });
}

export const storeSettingsController = new StoreSettingsController();
