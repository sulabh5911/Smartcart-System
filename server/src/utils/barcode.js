import { ApiError } from './ApiError.js';

const BARCODE_PATTERN = /^[\x20-\x7E]{1,64}$/;

export function normalizeBarcode(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw ApiError.badRequest('Barcode must be provided as text.');
  }

  const barcode = value.trim();
  if (!barcode) return undefined;
  if (!BARCODE_PATTERN.test(barcode)) {
    throw ApiError.badRequest(
      'Barcode must contain 1-64 printable ASCII characters (EAN/UPC or Code 128).'
    );
  }

  return barcode;
}
