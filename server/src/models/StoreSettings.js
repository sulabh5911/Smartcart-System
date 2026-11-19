import mongoose from 'mongoose';

const storeSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      immutable: true
    },
    storeName: { type: String, default: '', trim: true, maxlength: 120 },
    branch: { type: String, default: '', trim: true, maxlength: 120 },
    gstin: { type: String, default: '', trim: true, maxlength: 20 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    email: { type: String, default: '', trim: true, maxlength: 254 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    receiptFooter: { type: String, default: '', trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

export const StoreSettings =
  mongoose.models.StoreSettings || mongoose.model('StoreSettings', storeSettingsSchema);
