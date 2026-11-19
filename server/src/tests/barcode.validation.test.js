import assert from 'node:assert/strict';
import test from 'node:test';
import { productRepository } from '../repositories/product.repository.js';
import { productService } from '../services/product.service.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { normalizeBarcode } from '../utils/barcode.js';

test('normalizes and preserves common supermarket barcode strings', () => {
  for (const barcode of ['00012345', '012345678905', '4006381333931', 'A-123/XYZ']) {
    assert.equal(normalizeBarcode(` ${barcode} `), barcode);
  }
});

test('allows products without a barcode', () => {
  assert.equal(normalizeBarcode(undefined), undefined);
  assert.equal(normalizeBarcode('   '), undefined);
});

test('stores barcodes as optional strings with a partial unique index', () => {
  assert.equal(Product.schema.path('barcode').instance, 'String');
  const barcodeIndex = Product.schema.indexes().find(([keys]) => keys.barcode === 1);
  assert.ok(barcodeIndex);
  assert.equal(barcodeIndex[1].unique, true);
  assert.deepEqual(barcodeIndex[1].partialFilterExpression, {
    barcode: { $type: 'string', $gt: '' }
  });
});

test('rejects non-string, non-printable, non-ASCII, and overlong barcodes', () => {
  for (const invalid of [12345678, 'abc\n123', '商品コード', 'x'.repeat(65)]) {
    assert.throws(() => normalizeBarcode(invalid), ApiError);
  }
});

test('barcode lookup trims the input and returns active sellable inventory details', async () => {
  const originalFindByBarcode = productRepository.findByBarcode;
  let queriedBarcode;
  const expected = {
    _id: 'product-id',
    barcode: '00012345',
    stock: 3,
    sellableStock: 3,
    availability: { status: 'In Stock', sellableQuantity: 3, batches: [] }
  };
  productRepository.findByBarcode = async (barcode) => {
    queriedBarcode = barcode;
    return expected;
  };

  try {
    assert.equal(await productService.getProductByBarcode(' 00012345 '), expected);
    assert.equal(queriedBarcode, '00012345');
  } finally {
    productRepository.findByBarcode = originalFindByBarcode;
  }
});

test('unknown and malformed barcode lookups return explicit client errors', async () => {
  const originalFindByBarcode = productRepository.findByBarcode;
  productRepository.findByBarcode = async () => null;
  try {
    await assert.rejects(productService.getProductByBarcode('UNKNOWN'), (error) => error.statusCode === 404);
    await assert.rejects(productService.getProductByBarcode('bad\ncode'), (error) => error.statusCode === 400);
    await assert.rejects(productService.getProductByBarcode(''), (error) => error.statusCode === 400);
  } finally {
    productRepository.findByBarcode = originalFindByBarcode;
  }
});

test('duplicate barcode is rejected before a product is created', async () => {
  const originalFindBySku = productRepository.findBySku;
  const originalFindBarcodeCollision = productRepository.findBarcodeCollision;
  productRepository.findBySku = async () => null;
  productRepository.findBarcodeCollision = async () => ({ _id: 'existing-product' });
  try {
    await assert.rejects(
      productService.createProduct({ sku: 'SKU123', barcode: '12345678' }),
      (error) => error.statusCode === 409 && error.message.includes('barcode')
    );
  } finally {
    productRepository.findBySku = originalFindBySku;
    productRepository.findBarcodeCollision = originalFindBarcodeCollision;
  }
});
